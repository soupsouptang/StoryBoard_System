"""Canonical review comments and decision workflow."""
from __future__ import annotations

from datetime import datetime, timezone
import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import aliased
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, DomainError, NotFoundError
from app.models.collaboration import AuditLog, Comment, CommentEvent, CommentReadState, ReviewDecision, ShotVersion
from app.models.command import OutboxEvent
from app.models.production import Production
from app.models.shot import Shot
from app.models.user import User
from app.schemas.review import (
    ReviewCommentCreate,
    ReviewCommentResolve,
    ReviewCommentUpdate,
    ReviewDecisionCreate,
)
from app.schemas.shot import ShotPatch
from app.services.shot_service import ShotService


class ReviewService:
    DECISION_STATES = {
        "submit": ("review", "提交意见"),
        "withdraw": ("draft", "撤回意见"),
        "approve": ("approved", "同意意见"),
        "request_changes": ("changes_requested", "驳回意见"),
    }
    ALLOWED_ACTIONS_BY_STATUS = {
        "draft": {"submit"},
        "in_progress": {"submit"},
        "changes_requested": {"submit"},
        "review": {"withdraw", "approve", "request_changes"},
        "approved": set(),
        "locked": set(),
    }

    @staticmethod
    def _has_permission(user: User, permission: str) -> bool:
        permissions = getattr(getattr(user, "role", None), "permissions", None) or {}
        return bool(permissions.get("*") or permissions.get(permission))

    @staticmethod
    async def _active_shot(db: AsyncSession, shot_id: str, *, for_update: bool = False) -> Shot:
        scope = (await db.execute(select(Shot.production_id).where(Shot.id == shot_id, Shot.deleted_at.is_(None)))).scalar_one_or_none()
        if scope is None:
            raise NotFoundError("镜头不存在")
        project_query = select(Production.id).where(Production.id == scope, Production.deleted_at.is_(None))
        if for_update:
            project_query = project_query.with_for_update()
        if (await db.execute(project_query)).scalar_one_or_none() is None:
            raise NotFoundError("项目不存在")
        query = select(Shot).where(Shot.id == shot_id, Shot.deleted_at.is_(None))
        if for_update:
            query = query.with_for_update().execution_options(populate_existing=True)
        result = await db.execute(query)
        shot = result.scalar_one_or_none()
        if not shot:
            raise NotFoundError("镜头不存在")
        return shot

    @staticmethod
    def _require_read(user: User) -> None:
        if not any(ReviewService._has_permission(user, permission) for permission in ("production.read", "production.write", "shot.write", "review.approve")):
            raise DomainError("当前账号没有查看批注的权限", code="FORBIDDEN")

    @staticmethod
    async def _locked_comment(db: AsyncSession, comment_id: str) -> tuple[Comment, Shot]:
        shot_id = (await db.execute(select(Comment.shot_id).where(Comment.id == comment_id))).scalar_one_or_none()
        if not shot_id:
            raise NotFoundError("评论不存在")
        shot = await ReviewService._active_shot(db, shot_id, for_update=True)
        comment = (await db.execute(select(Comment).where(Comment.id == comment_id).with_for_update().execution_options(populate_existing=True))).scalar_one()
        return comment, shot

    @staticmethod
    def _expected_revision(comment: Comment, revision: int) -> None:
        if comment.revision != revision:
            error = ConflictError("批注已被其他用户修改，请刷新后保留草稿重新操作。", details={"server_revision": comment.revision, "comment_id": comment.id})
            error.code = "COMMENT_REVISION_CONFLICT"
            raise error

    @staticmethod
    def _event(db: AsyncSession, shot: Shot, comment: Comment, user: User, action: str) -> None:
        shot.comment_event_seq += 1
        comment.last_activity_seq = shot.comment_event_seq
        comment.last_actor_id = user.id
        if action == "create":
            comment.event_seq = shot.comment_event_seq
        db.add(CommentEvent(production_id=shot.production_id, shot_id=shot.id, comment_id=comment.id,
            seq=shot.comment_event_seq, event_type=action, actor_id=user.id))
        db.add(OutboxEvent(production_id=shot.production_id, command_id=str(uuid.uuid4()),
            event_type="review.comment." + action, revision=comment.revision,
            entity_ids={"shot_id": shot.id, "comment_id": comment.id, "seq": shot.comment_event_seq}))

    @staticmethod
    async def read_state(db: AsyncSession, shot_id: str, user: User, through_seq: int | None = None) -> dict:
        ReviewService._require_read(user)
        shot = await ReviewService._active_shot(db, shot_id, for_update=through_seq is not None)
        if through_seq is not None and through_seq > shot.comment_event_seq:
            raise DomainError("已读位置超过当前批注记录，请刷新后重试。", code="INVALID_READ_WATERMARK")
        state = (await db.execute(select(CommentReadState).where(
            CommentReadState.shot_id == shot.id, CommentReadState.user_id == user.id))).scalar_one_or_none()
        last_read = state.last_read_seq if state else 0
        if through_seq is not None and through_seq > last_read:
            if state is None:
                db.add(CommentReadState(production_id=shot.production_id, shot_id=shot.id,
                    user_id=user.id, last_read_seq=through_seq))
            else:
                state.last_read_seq = through_seq
            last_read = through_seq
            await db.flush()
        unread = (await db.execute(select(func.count(Comment.id)).where(Comment.shot_id == shot.id,
            Comment.deleted_at.is_(None), Comment.last_activity_seq > last_read))).scalar_one()
        return {"shot_id": shot.id, "last_read_seq": last_read, "latest_seq": shot.comment_event_seq, "unread_count": unread}

    @staticmethod
    def _audit(
        db: AsyncSession,
        *,
        user_id: str,
        action: str,
        entity_type: str,
        entity_id: str,
        metadata: dict | None = None,
    ) -> None:
        db.add(AuditLog(
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            metadata_json=metadata or {},
        ))

    @staticmethod
    async def list_comments(db: AsyncSession, shot_id: str, user: User) -> list[dict]:
        ReviewService._require_read(user)
        await ReviewService._active_shot(db, shot_id)
        actor = aliased(User)
        result = await db.execute(
            select(Comment, User, actor)
            .outerjoin(User, Comment.user_id == User.id)
            .outerjoin(actor, Comment.last_actor_id == actor.id)
            .where(
                Comment.shot_id == shot_id,
                Comment.deleted_at.is_(None),
            )
            .order_by(Comment.created_at.asc(), Comment.id.asc())
        )
        rows: list[dict] = []
        for comment, author, last_actor in result.all():
            rows.append({
                "id": comment.id,
                "production_id": comment.production_id,
                "shot_id": comment.shot_id,
                "user_id": comment.user_id,
                "author_name": (author.display_name or author.email) if author else "未知用户",
                "author_color": author.effective_annotation_color if author else "",
                "last_actor_id": comment.last_actor_id,
                "last_actor_color": last_actor.effective_annotation_color if last_actor else "",
                "revision": comment.revision,
                "event_seq": comment.event_seq,
                "last_activity_seq": comment.last_activity_seq,
                "body": comment.body,
                "role": comment.role,
                "timecode": comment.timecode,
                "quote_field": comment.quote_field,
                "quote_text": comment.quote_text,
                "parent_id": comment.parent_id,
                "is_resolved": comment.is_resolved,
                "created_at": comment.created_at,
                "updated_at": comment.updated_at,
            })
        return rows

    @staticmethod
    async def create_comment(
        db: AsyncSession,
        shot_id: str,
        req: ReviewCommentCreate,
        user: User,
    ) -> Comment:
        ReviewService._require_read(user)
        shot = await ReviewService._active_shot(db, shot_id, for_update=True)
        body = req.body.strip()
        if not body:
            raise DomainError("评论内容不能为空", code="VALIDATION_ERROR")

        if req.parent_id:
            parent_result = await db.execute(
                select(Comment).where(
                    Comment.id == req.parent_id,
                    Comment.shot_id == shot_id,
                    Comment.deleted_at.is_(None),
                )
            )
            if not parent_result.scalar_one_or_none():
                raise NotFoundError("父评论不存在")

        quote_field = req.quote_field
        quote_text = req.quote_text.strip()
        if quote_field and not quote_text:
            field_name = {
                "description": "description",
                "voiceover": "voice_over",
                "voice_over": "voice_over",
                "title": "name",
                "name": "name",
            }.get(quote_field)
            if field_name:
                quote_text = str(getattr(shot, field_name, "") or "")[:4000]

        comment = Comment(
            production_id=shot.production_id,
            shot_id=shot.id,
            user_id=user.id,
            role=req.role.strip() or "Director",
            body=body,
            timecode=req.timecode.strip(),
            quote_field=quote_field,
            quote_text=quote_text,
            parent_id=req.parent_id,
            is_resolved=False,
        )
        db.add(comment)
        await db.flush()
        ReviewService._event(db, shot, comment, user, "create")
        ReviewService._audit(
            db,
            user_id=user.id,
            action="review.comment.create",
            entity_type="comment",
            entity_id=comment.id,
            metadata={"shot_id": shot.id},
        )
        await db.flush()
        return comment

    @staticmethod
    async def update_comment(
        db: AsyncSession,
        comment_id: str,
        req: ReviewCommentUpdate,
        user: User,
    ) -> Comment:
        ReviewService._require_read(user)
        comment, shot = await ReviewService._locked_comment(db, comment_id)
        if comment.deleted_at is not None:
            raise NotFoundError("评论不存在")
        if comment.user_id != user.id and not ReviewService._has_permission(user, "review.approve"):
            raise DomainError("无权修改其他用户的评论", code="FORBIDDEN")
        ReviewService._expected_revision(comment, req.revision)

        body = req.body.strip()
        if not body:
            raise DomainError("评论内容不能为空", code="VALIDATION_ERROR")
        if comment.body == body:
            return comment

        comment.body = body
        comment.revision += 1
        ReviewService._event(db, shot, comment, user, "edit")
        comment.updated_at = datetime.now(timezone.utc)
        ReviewService._audit(
            db,
            user_id=user.id,
            action="review.comment.update",
            entity_type="comment",
            entity_id=comment.id,
            metadata={"shot_id": comment.shot_id},
        )
        await db.flush()
        return comment

    @staticmethod
    async def resolve_comment(
        db: AsyncSession,
        comment_id: str,
        req: ReviewCommentResolve,
        user: User,
    ) -> Comment:
        ReviewService._require_read(user)
        comment, shot = await ReviewService._locked_comment(db, comment_id)
        if comment.deleted_at is not None:
            raise NotFoundError("评论不存在")
        ReviewService._expected_revision(comment, req.revision)
        if comment.is_resolved == req.resolved:
            return comment

        comment.is_resolved = req.resolved
        comment.revision += 1
        ReviewService._event(db, shot, comment, user, "resolve" if req.resolved else "reopen")
        comment.updated_at = datetime.now(timezone.utc)
        ReviewService._audit(
            db,
            user_id=user.id,
            action="review.comment.resolve" if req.resolved else "review.comment.reopen",
            entity_type="comment",
            entity_id=comment.id,
            metadata={"shot_id": comment.shot_id},
        )
        await db.flush()
        return comment

    @staticmethod
    async def delete_comment(db: AsyncSession, comment_id: str, user: User, revision: int) -> bool:
        ReviewService._require_read(user)
        comment, shot = await ReviewService._locked_comment(db, comment_id)
        if comment.user_id != user.id and not ReviewService._has_permission(user, "review.approve"):
            raise DomainError("无权删除其他用户的评论", code="FORBIDDEN")
        if comment.deleted_at is not None:
            return False
        ReviewService._expected_revision(comment, revision)

        comment.deleted_at = datetime.now(timezone.utc)
        comment.updated_at = comment.deleted_at
        comment.revision += 1
        ReviewService._event(db, shot, comment, user, "delete")
        ReviewService._audit(
            db,
            user_id=user.id,
            action="review.comment.delete",
            entity_type="comment",
            entity_id=comment.id,
            metadata={"shot_id": comment.shot_id},
        )
        await db.flush()
        return True

    @staticmethod
    async def list_decisions(db: AsyncSession, shot_id: str) -> list[ReviewDecision]:
        await ReviewService._active_shot(db, shot_id)
        result = await db.execute(
            select(ReviewDecision)
            .where(ReviewDecision.shot_id == shot_id)
            .order_by(ReviewDecision.created_at.desc(), ReviewDecision.id.desc())
        )
        return list(result.scalars().all())

    @staticmethod
    async def apply_decision(
        db: AsyncSession,
        shot_id: str,
        req: ReviewDecisionCreate,
        user: User,
    ) -> dict:
        shot = await ReviewService._active_shot(db, shot_id)
        if req.action in {"approve", "request_changes"}:
            if not ReviewService._has_permission(user, "review.approve"):
                raise DomainError("当前账号没有审片决策权限", code="FORBIDDEN")
        elif not ReviewService._has_permission(user, "shot.write"):
            raise DomainError("当前账号没有提交审片状态的权限", code="FORBIDDEN")

        if req.version_id:
            version_result = await db.execute(
                select(ShotVersion).where(
                    ShotVersion.id == req.version_id,
                    ShotVersion.shot_id == shot_id,
                )
            )
            if not version_result.scalar_one_or_none():
                raise DomainError("版本不存在或不属于当前镜头", code="INVALID_REVIEW_VERSION")

        allowed_actions = ReviewService.ALLOWED_ACTIONS_BY_STATUS.get(
            shot.status,
            {"submit"} if shot.status not in {"approved", "locked"} else set(),
        )
        if req.action not in allowed_actions:
            raise DomainError(
                f"当前状态 {shot.status} 不允许执行该审片操作",
                code="INVALID_REVIEW_TRANSITION",
            )

        next_status, action_label = ReviewService.DECISION_STATES[req.action]
        previous_status = shot.status

        patch_review_status = req.action in {"approve", "request_changes"}
        patch_command = ShotService.patch_review_status if patch_review_status else ShotService.patch_shot
        saved = await patch_command(
            db,
            shot_id,
            ShotPatch(revision=req.revision, changes={"status": next_status}),
            user,
        )

        if previous_status == next_status:
            return {
                "changed": False,
                "shot_id": saved.id,
                "revision": saved.revision,
                "status": saved.status,
                "decision": None,
            }

        decision = ReviewDecision(
            shot_id=shot_id,
            version_id=req.version_id,
            previous_status=previous_status,
            next_status=next_status,
            action_label=action_label,
            created_by=user.id,
        )
        db.add(decision)
        await db.flush()

        ReviewService._audit(
            db,
            user_id=user.id,
            action="review.decision",
            entity_type="review_decision",
            entity_id=decision.id,
            metadata={
                "shot_id": shot_id,
                "revision": saved.revision,
                "previous_status": previous_status,
                "next_status": next_status,
                "version_id": req.version_id,
            },
        )
        await db.flush()

        return {
            "changed": True,
            "shot_id": saved.id,
            "revision": saved.revision,
            "status": saved.status,
            "decision": decision,
        }
