"""Annotation profile writes do not modify authentication or role ownership."""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.exceptions import ConflictError, NotFoundError
from app.models.collaboration import AuditLog
from app.models.user import User, automatic_annotation_color
from app.schemas.user_profile import UserColorUpdate


class UserProfileService:
    @staticmethod
    async def update_color(db: AsyncSession, actor: User, request: UserColorUpdate) -> User:
        user = (await db.execute(select(User).where(User.id == actor.id, User.is_active.is_(True))
            .with_for_update().execution_options(populate_existing=True))).scalar_one_or_none()
        if user is None:
            raise NotFoundError("用户不存在")
        if user.revision != request.revision:
            raise ConflictError("用户颜色已修改，请刷新后重试。", details={"server_revision": user.revision})
        color = request.annotation_color or automatic_annotation_color(user.id)
        if user.effective_annotation_color == color:
            return user
        user.annotation_color = color
        user.revision += 1
        db.add(AuditLog(user_id=user.id, action="user.annotation_color", entity_type="user",
            entity_id=user.id, metadata_json={"revision": user.revision}))
        await db.flush()
        return user
