"""Canonical review/comment application service.

The service owns review lifecycle semantics so routers and React clients do not
mutate Shot review state directly.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Iterable

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, DomainError, NotFoundError
from app.models.collaboration import AuditLog, Comment, ReviewDecision, ShotVersion
from app.models.shot import Shot
from app.models.user import User
from app.schemas.review import (
    ReviewCommentCreate,
    ReviewCommentResolve,
    ReviewCommentUpdate,
    ReviewDecisionCreate,
)


class ReviewService:
    ACTIONS = {
        "submit": {
            "target": "review",
            "label": "提交意见",
            "from": {"draft", "in_progress", "changes_requested"},
        },
        "withdraw": {
            "target": "draft",
            "label": "撤回意见",
            "from": {"review"},
        },
        "approve": {
            "target": "approved",
            "label": "同意意见",
            "from": {"review"},
        },
        "request_changes": {
            "target": "changes_requested",
            "label": "驳回意见",
            "from": {"review"},
        },
    }

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
    async def _active_shot(db: AsyncSession, shot_id: str) -> Shot:
        result = await db.execute(
            select(Shot).where(Shot.id == shot_id, Shot.deleted_at.is_(None))
        )
        shot = result.scalar_one_or_none()
        if not shot:
            raise NotFoundError("镜头不存在")
        return shot

    @staticmethod
    async def _comment(db: AsyncSession, comment_id: str) -> Comment:
        result = await db.execute(
            select(Comment).where(Comment.id == comment_id, Comment.deleted_at.is_(None))
        )
        comment = result.scalar_one_or_none()
        if not comment:
            raise NotFoundError("批注不存在")
        return comment

    @staticmethod
    async def _author_names(db: AsyncSession, user_ids: Iterable[str | None]) -> dict[str, str]:
        ids = sorted({user_id for user_id in user_ids if user_id})
        if not ids:
            return {}
        result = await db.execute(select(User).where(User.id.in_(ids)))
        return {
            user.id: (user.display_name or user.email)
            for user in result.scalars().all()
        }

    @staticmethod
    def _comment_out(comment: Comment, authors: dict[str, str]) -> dict:
        return {
            "id": comment.id,
            "production_id": comment.production_id,
            "shot_id": comment.shot_id,
            "user_id": comment.user_id,
            "author_name": authors.get(comment.user_id or "", ""),
            "body": comment.body,
            "timecode": comment.timecode or "",
            "quote_field": comment.quote_field or "",
            "quote_text": comment.quote_text or "",
            "parent_id": comment.parent_id,
            "is_resolved": bool(comment.is_resolved),
            "created_at": comment.created_at,
            "updated_at": comment.updated_at,
        }

    @staticmethod
    async def list_comments(db: AsyncSession, shot_id: str) -> list[dict]:
        await ReviewService._active_shot(db, shot_id)
        result = await db.execute(
            select(Comment)
            .where(Comment.shot_id == shot_id, Comment.deleted_at.is_(None))
            .order_by(Comment.created_at.asc(), Comment.id.asc())
        )
        comments = list(result.scalars().all())
        authors = await ReviewService._author_names(db, [comment.user_id for comment in comments])
        return [ReviewService._comment_out(comment, authors) for comment in comments]

    @staticmethod
    async def create_comment(
        db: AsyncSession,
        shot_id: str,
        req: ReviewCommentCreate,
        user: User,
    ) -> dict:
        shot = await ReviewService._active_shot(db, shot_id)

        if req.parent_id:
            parent = await ReviewService._comment(db, req.parent_id)
            if parent.shot_id != shot.id:
                raise DomainError("回复目标不属于当前镜头", code="VALIDATION_ERROR")

        comment = Comment(
            production_id=shot.production_id,
            shot_id=shot.id,
            user_id=user.id,
            body=req.body.strip(),
            timecode=req.timecode.strip(),
            quote_field=req.quote_field,
            quote_text=req.quote_text,
            parent_id=req.parent_id,
            is_resolved=False,
        )
        db.add(comment)
        await db.flush()
        ReviewService._audit(
            db,
            user_id=user.id,
            action="review.comment.create",
            entity_type="comment",
            entity_id=comment.id,
            metadata={"shot_id": shot.id},
        )
        await db.flush()
        return ReviewService._comment_out(comment, {user.id: user.display_name or user.email})

    @staticmethod
    async def update_comment(
        db: AsyncSession,
        comment_id: str,
        req: ReviewCommentUpdate,
        user: User,
    ) -> dict:
        comment = await ReviewService._comment(db, comment_id)
        if comment.user_id != user.id:
            raise DomainError("只能编辑自己的批注", code="FORBIDDEN")

        body = req.body.strip()
        if comment.body != body:
            comment.body = body
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

        return ReviewService._comment_out(comment, {user.id: user.display_name or user.email})

    @staticmethod
    async def resolve_comment(
        db: AsyncSession,
        comment_id: str,
        req: ReviewCommentResolve,
        user: User,
    ) -> dict:
        comment = await ReviewService._comment(db, comment_id)
        if comment.is_resolved != req.resolved:
            comment.is_resolved = req.resolved
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

        authors = await ReviewService._author_names(db, [comment.user_id])
        return ReviewService._comment_out(comment, authors)

    @staticmethod
    async def delete_comment(
        db: AsyncSession,
        comment_id: str,
        user: User,
    ) -> bool:
        comment = await ReviewService._comment(db, comment_id)
        if comment.user_id != user.id:
            raise DomainError("只能删除自己的批注", code="FORBIDDEN")

        now = datetime.now(timezone.utc)
        comment.deleted_at = now
        comment.updated_at = now
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
            .order_by(ReviewDecision.created_at.asc(), ReviewDecision.id.asc())
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

        if shot.revision != req.revision:
            raise ConflictError(
                message="该镜头已被其他用户修改，请刷新后重试。",
                details={
                    "server_revision": shot.revision,
                    "client_revision": req.revision,
                },
            )

        action = ReviewService.ACTIONS[req.action]
        target_status = action["target"]

        if req.version_id:
            version_result = await db.execute(
                select(ShotVersion).where(
                    ShotVersion.id == req.version_id,
                    ShotVersion.shot_id == shot.id,
                )
            )
            if not version_result.scalar_one_or_none():
                raise DomainError("版本不存在或不属于当前镜头", code="VALIDATION_ERROR")

        if shot.status == target_status:
            return {
                "changed": False,
                "shot_id": shot.id,
                "revision": shot.revision,
                "status": shot.status,
                "decision": None,
            }

        if shot.status not in action["from"]:
            raise DomainError(
                f"当前状态 {shot.status} 不能执行此审片动作",
                code="REVIEW_TRANSITION_INVALID",
            )

        previous_status = shot.status
        shot.status = target_status
        shot.approval_status = (
            "approved" if target_status == "approved"
            else "changes_requested" if target_status == "changes_requested"
            else "pending"
        )
        shot.revision += 1
        shot.updated_at = datetime.now(timezone.utc)

        decision = ReviewDecision(
            shot_id=shot.id,
            version_id=req.version_id,
            previous_status=previous_status,
            next_status=target_status,
            action_label=action["label"],
            created_by=user.id,
        )
        db.add(decision)
        await db.flush()

        ReviewService._audit(
            db,
            user_id=user.id,
            action=f"review.decision.{req.action}",
            entity_type="shot",
            entity_id=shot.id,
            metadata={
                "decision_id": decision.id,
                "previous_status": previous_status,
                "next_status": target_status,
                "revision": shot.revision,
                "version_id": req.version_id,
            },
        )
        await db.flush()

        return {
            "changed": True,
            "shot_id": shot.id,
            "revision": shot.revision,
            "status": shot.status,
            "decision": decision,
        }
