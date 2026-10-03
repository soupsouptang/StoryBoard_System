"""Transactional board commands; no renderer, HTTP or project-commit owner here."""
from copy import deepcopy
from datetime import datetime, timezone
import uuid
from pydantic import ValidationError
from sqlalchemy import delete, func, select, update
from app.core.exceptions import ConflictError, DomainError, NotFoundError
from app.models.asset import Asset, AssetVersion
from app.models.board import BoardAssetReference, CreativeBoard
from app.models.collaboration import AuditLog
from app.models.command import OutboxEvent
from app.models.production import Production
from app.models.shot import Shot
from app.schemas.board import BoardDocument

DOCUMENT_FIELDS = ("name", "width", "height", "objects", "shot_ids")


class BoardService:
    @staticmethod
    def permission(user, write=False):
        permissions = getattr(getattr(user, "role", None), "permissions", None) or {}
        keys = ("board.write", "production.write", "shot.write") if write else (
            "production.read", "production.write", "shot.write", "board.write", "review.approve")
        if not permissions.get("*") and not any(permissions.get(key) for key in keys):
            raise DomainError("当前账号没有画板操作权限", code="FORBIDDEN")

    @staticmethod
    async def project(db, production_id, user, write=False):
        BoardService.permission(user, write)
        query = select(Production).where(Production.id == production_id, Production.deleted_at.is_(None))
        if write:
            query = query.with_for_update()
        if (await db.execute(query)).scalar_one_or_none() is None:
            raise NotFoundError("项目不存在")

    @staticmethod
    async def board(db, production_id, board_id, user, revision=None, *, deleted=False):
        await BoardService.project(db, production_id, user, write=revision is not None)
        query = select(CreativeBoard).where(CreativeBoard.id == board_id, CreativeBoard.production_id == production_id)
        if not deleted:
            query = query.where(CreativeBoard.deleted_at.is_(None))
        if revision is not None:
            query = query.with_for_update().execution_options(populate_existing=True)
        row = (await db.execute(query)).scalar_one_or_none()
        if row is None:
            raise NotFoundError("画板不存在或已删除")
        if revision is not None and row.revision != revision:
            raise ConflictError("画板已被其他用户修改，请刷新后核对草稿", details={"server_revision": row.revision})
        return row

    @staticmethod
    def document(board):
        return {name: deepcopy(getattr(board, name)) for name in DOCUMENT_FIELDS}

    @staticmethod
    async def serialize(db, board):
        return {"id": board.id, "production_id": board.production_id, "kind": board.kind,
            **BoardService.document(board), "revision": board.revision, "deleted_at": board.deleted_at,
            "updated_at": board.updated_at}

    @staticmethod
    async def begin_history(db, production_id, user, label):
        from app.services.history_service import HistoryService, allowed
        permission = next((key for key in ("board.write", "production.write", "shot.write")
            if allowed(user, key)), "board.write")
        await HistoryService.begin(db, production_id, user, label, permission)

    @staticmethod
    async def validate(db, production_id, kind, document):
        try:
            validated = BoardDocument.model_validate(document).model_dump()
        except (ValidationError, ValueError) as exc:
            raise DomainError("画板名称、尺寸或对象参数无效", code="VALIDATION_ERROR") from exc
        allowed = {"light", "camera", "person", "shape", "image"} if kind == "lighting" else {"note", "color", "link", "image", "shape"}
        if any(obj["type"] not in allowed for obj in validated["objects"]):
            raise DomainError("当前画板不支持该对象类型", code="VALIDATION_ERROR")
        shot_ids = set(validated["shot_ids"])
        if shot_ids:
            existing = set((await db.execute(select(Shot.id).where(Shot.production_id == production_id,
                Shot.id.in_(shot_ids), Shot.deleted_at.is_(None)))).scalars())
            if existing != shot_ids:
                raise DomainError("关联镜头不存在、已删除或不属于当前项目", code="INVALID_SHOT_LINK")
        versions = {obj["asset_version_id"] for obj in validated["objects"] if obj["asset_version_id"]}
        if any(obj["type"] == "image" and not obj["asset_version_id"] for obj in validated["objects"]):
            raise DomainError("图片对象需要关联素材版本", code="INVALID_ASSET_LINK")
        if versions:
            existing = set((await db.execute(select(AssetVersion.id).join(Asset, Asset.id == AssetVersion.asset_id)
                .where(Asset.production_id == production_id, Asset.deleted_at.is_(None),
                    AssetVersion.id.in_(versions), AssetVersion.mime_type.like("image/%")))).scalars())
            if existing != versions:
                raise DomainError("图片不存在、已删除或不属于当前项目", code="INVALID_ASSET_LINK")
        return validated

    @staticmethod
    async def pin_media(db, board):
        versions = {obj["asset_version_id"] for obj in board.objects if obj["asset_version_id"]}
        if not versions:
            return
        pinned = set((await db.execute(select(BoardAssetReference.asset_version_id).where(BoardAssetReference.board_id == board.id))).scalars())
        for identity in versions - pinned:
            db.add(BoardAssetReference(board_id=board.id, asset_version_id=identity))

    @staticmethod
    async def event(db, board, user, action):
        db.add(AuditLog(user_id=user.id, action=action, entity_type="board", entity_id=board.id,
            metadata_json={"production_id": board.production_id, "revision": board.revision, "kind": board.kind}))
        db.add(OutboxEvent(production_id=board.production_id, command_id=str(uuid.uuid4()), event_type=action,
            entity_ids={"board_ids": [board.id]}, revision=board.revision))
        # Moodboards deliberately never alter project content revision or commit hashes.
        if board.kind == "lighting":
            await db.execute(update(Production).where(Production.id == board.production_id).values(
                revision=Production.revision + 1, content_revision=Production.content_revision + 1))

    @staticmethod
    async def list(db, production_id, kind, state, user):
        await BoardService.project(db, production_id, user)
        query = select(CreativeBoard).where(CreativeBoard.production_id == production_id)
        if kind:
            query = query.where(CreativeBoard.kind == kind)
        query = query.where(CreativeBoard.deleted_at.is_not(None) if state == "trashed" else CreativeBoard.deleted_at.is_(None))
        rows = (await db.execute(query.order_by(CreativeBoard.created_at, CreativeBoard.id))).scalars()
        return [await BoardService.serialize(db, row) for row in rows]

    @staticmethod
    async def create(db, production_id, req, user):
        await BoardService.project(db, production_id, user, write=True)
        document = await BoardService.validate(db, production_id, req.kind, req.model_dump(exclude={"kind"}))
        await BoardService.begin_history(db, production_id, user, "新增画板")
        board = CreativeBoard(production_id=production_id, kind=req.kind, created_by=user.id, **document)
        db.add(board)
        await db.flush()
        await BoardService.pin_media(db, board)
        await BoardService.event(db, board, user, "board.create")
        await db.flush()
        return await BoardService.serialize(db, board)

    @staticmethod
    async def cas(db, board, revision, values):
        result = await db.execute(update(CreativeBoard).where(CreativeBoard.id == board.id,
            CreativeBoard.revision == revision).values(**values, revision=revision+1, updated_at=datetime.now(timezone.utc))
            .returning(CreativeBoard.id).execution_options(synchronize_session="fetch"))
        if result.scalar_one_or_none() is None:
            raise ConflictError("画板已变化，请重新读取后重试")
        await db.refresh(board)

    @staticmethod
    async def patch(db, production_id, board_id, req, user):
        board = await BoardService.board(db, production_id, board_id, user, req.revision)
        before = BoardService.document(board)
        document = await BoardService.validate(db, production_id, board.kind,
            {**before, **req.model_dump(exclude={"revision"}, exclude_unset=True)})
        after_objects = {obj["id"]: obj for obj in document["objects"]}
        for old in before["objects"]:
            if old["locked"]:
                new = after_objects.get(old["id"])
                if new is None or {**old, "locked": False} != {**new, "locked": False}:
                    raise DomainError("请先解锁对象，再调整或删除", code="OBJECT_LOCKED")
        if document == before:
            return await BoardService.serialize(db, board)
        await BoardService.begin_history(db, production_id, user, "修改画板")
        await BoardService.cas(db, board, req.revision, document)
        await BoardService.pin_media(db, board)
        await BoardService.event(db, board, user, "board.update")
        await db.flush()
        return await BoardService.serialize(db, board)

    @staticmethod
    async def media(db, production_id, board_id, version_id, user):
        await BoardService.board(db, production_id, board_id, user)
        version = (await db.execute(select(AssetVersion).join(Asset, Asset.id == AssetVersion.asset_id)
            .join(BoardAssetReference, BoardAssetReference.asset_version_id == AssetVersion.id)
            .where(BoardAssetReference.board_id == board_id, AssetVersion.id == version_id,
                Asset.production_id == production_id, Asset.deleted_at.is_(None)))).scalar_one_or_none()
        if version is None:
            raise NotFoundError("画板图片不存在")
        from app.services.image_crop_service import media_path
        from app.services.panel_media_service import MEDIA_ROOT
        return media_path(MEDIA_ROOT, version.storage_key), version.mime_type, version.hash_sha256

    @staticmethod
    async def history(db, production_id, board_id, revision, history_revision, direction, user):
        board = await BoardService.board(db, production_id, board_id, user, revision)
        from app.services.history_service import HistoryService
        state = await HistoryService.state(db, production_id, user.id)
        entries = await HistoryService.entries(db, state)
        entry = next((item for item in (reversed(entries) if direction < 0 else entries)
            if item.applied == (direction < 0)), None)
        if entry is None:
            raise DomainError("没有可撤销的修改" if direction < 0 else "没有可重做的修改", code="HISTORY_EMPTY")
        if any(item["section"] != "boards" or item["id"] != board_id for item in entry.changes):
            raise DomainError("最近一次操作属于其他内容，请使用项目撤销入口", code="HISTORY_SCOPE")
        await HistoryService.move(db, production_id, user, "undo" if direction < 0 else "redo", history_revision)
        return await BoardService.serialize(db, board)

    @staticmethod
    async def restore(db, production_id, board_id, revision, user):
        board = await BoardService.board(db, production_id, board_id, user, revision, deleted=True)
        if board.deleted_at is None:
            return await BoardService.serialize(db, board)
        await BoardService.validate(db, production_id, board.kind, BoardService.document(board))
        await BoardService.begin_history(db, production_id, user, "恢复画板")
        await BoardService.cas(db, board, revision, {"deleted_at": None})
        await BoardService.event(db, board, user, "board.restore")
        await db.flush()
        return await BoardService.serialize(db, board)

    @staticmethod
    async def remove(db, production_id, board_id, revision, user, permanent=False, confirm=False):
        board = await BoardService.board(db, production_id, board_id, user, revision, deleted=True)
        if permanent:
            if not confirm or board.deleted_at is None:
                raise DomainError("请先将画板移入废纸篓，并确认永久删除", code="CONFIRM_REQUIRED")
            from app.services.history_service import HistoryService
            await HistoryService.barrier(db, production_id)
            await BoardService.event(db, board, user, "board.purge")
            if board.kind == "lighting":
                from app.models.project_version import ProjectCommit
                from app.services.project_snapshot import content_hash
                commits = (await db.execute(select(ProjectCommit).where(ProjectCommit.production_id == production_id).with_for_update())).scalars()
                for commit in commits:
                    snapshot = deepcopy(commit.snapshot)
                    if snapshot.get("sections", {}).get("lighting_boards", {}).pop(board.id, None) is not None:
                        commit.snapshot = snapshot
                        commit.content_hash = content_hash(snapshot)
            await db.execute(update(Production).where(Production.id == production_id).values(purge_epoch=Production.purge_epoch+1))
            await db.execute(delete(BoardAssetReference).where(BoardAssetReference.board_id == board.id))
            await db.delete(board)
            await db.flush()
            return {"ok": True, "permanently_deleted": True}
        if board.deleted_at is None:
            await BoardService.begin_history(db, production_id, user, "删除画板")
            await BoardService.cas(db, board, revision, {"deleted_at": datetime.now(timezone.utc)})
            await BoardService.event(db, board, user, "board.delete")
            await db.flush()
        return await BoardService.serialize(db, board)
