"""Application command composing existing owners in one request transaction."""
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.core.exceptions import ConflictError, DomainError
from app.models.shot import Shot
from app.schemas.shot import ShotPatch
from app.schemas.custom_field import CustomFieldValuePatch
from app.services.shot_service import ShotService
from app.services.custom_field_service import CustomFieldService
from app.services.panel_media_service import PanelMediaService


class ShotDetailService:
    @staticmethod
    async def save(db, shot_id, req, user, *, image=None, filename='panel-image', media_root=None):
        ShotService._require_write(user)
        shot = await PanelMediaService.get_upload_shot(db, shot_id=shot_id, revision=req.revision)
        seen = set()
        # Validate definition revisions before any owner mutates the aggregate.
        for item in req.custom_values:
            if item.field_id in seen:
                raise DomainError('同一列不能重复提交', code='DUPLICATE_FIELD')
            seen.add(item.field_id)
            field = await CustomFieldService._field(db, shot.production_id, item.field_id, for_update=True)
            if field.revision != item.field_revision:
                raise ConflictError('列定义已变化，请刷新并核对', details={'field_id': field.id, 'server_revision': field.revision, 'client_revision': item.field_revision})
        changes = req.changes.model_dump(exclude_unset=True)
        if 'sequence_id' in changes and changes['sequence_id']:
            from app.models.production import Sequence
            sequence = await db.scalar(select(Sequence).where(Sequence.id == changes['sequence_id'], Sequence.production_id == shot.production_id, Sequence.deleted_at.is_(None)))
            if sequence is None:
                raise DomainError('篇章不属于当前项目', code='INVALID_SEQUENCE')
        if changes.get('owner_id'):
            from app.models.user import User
            if await db.get(User, changes['owner_id']) is None:
                raise DomainError('负责人不存在，请核对账号', code='INVALID_OWNER')
        shot = await ShotService.patch_shot(db, shot_id, ShotPatch(revision=shot.revision, changes=changes), user)
        for item in req.custom_values:
            await CustomFieldService.patch_value(db, shot_id, item.field_id, CustomFieldValuePatch(revision=shot.revision, value=item.value), user)
        if image is not None:
            permissions = getattr(getattr(user, 'role', None), 'permissions', None) or {}
            if not (permissions.get('*') or permissions.get('production.write')):
                raise DomainError('当前账号没有上传分镜画面的权限', code='FORBIDDEN')
            await PanelMediaService.save_panel_image(db, shot=shot, data=image, filename=filename, user_id=user.id, media_root=media_root)
        await db.flush()
        return (await db.execute(select(Shot).where(Shot.id == shot_id).options(selectinload(Shot.panels)).execution_options(populate_existing=True))).scalar_one()
