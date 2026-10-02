"""Export template commands; allowlists always resolve current column identities."""
from sqlalchemy import select
from app.core.exceptions import ConflictError, DomainError, NotFoundError
from app.models.export_template import ExportTemplate
from app.models.collaboration import AuditLog
from app.models.command import OutboxEvent
from app.services.custom_field_service import CustomFieldService
from app.services.document_export import export_fields


def projection(row, available):
    valid = {item['column_id']: item['key'] for item in available}
    return {'id': row.id, 'name': row.name, 'revision': row.revision,
        'field_ids': [identity for identity in row.field_ids if identity in valid],
        'fields': [valid[identity] for identity in row.field_ids if identity in valid]}


async def list_templates(db, production_id, user):
    available = await export_fields(db, production_id, user)
    rows = await db.scalars(select(ExportTemplate).where(ExportTemplate.production_id == production_id).order_by(ExportTemplate.name, ExportTemplate.id))
    return [projection(row, available) for row in rows]


async def save_template(db, production_id, req, user, template_id=None):
    permissions = getattr(getattr(user, 'role', None), 'permissions', None) or {}
    if not (permissions.get('*') or permissions.get('production.write') or permissions.get('export.create')):
        raise DomainError('当前账号没有保存交付模板的权限', code='FORBIDDEN')
    await CustomFieldService._production(db, production_id, for_update=True)
    available = await export_fields(db, production_id, user)
    allowed = {item['column_id'] for item in available if item['column_id']}
    selected = list(dict.fromkeys(req.field_ids))
    if not selected or not set(selected) <= allowed:
        raise DomainError('模板字段为空、已删除或不属于当前项目，请刷新后重试。', code='INVALID_EXPORT_FIELDS')
    duplicate = await db.scalar(select(ExportTemplate).where(ExportTemplate.production_id == production_id, ExportTemplate.name == req.name))
    if duplicate and duplicate.id != template_id:
        raise ConflictError('模板名称已存在，请选择已有模板更新或使用新名称。')
    if template_id:
        row = await db.scalar(select(ExportTemplate).where(ExportTemplate.production_id == production_id, ExportTemplate.id == template_id).with_for_update())
        if not row: raise NotFoundError('交付模板不存在')
        if row.revision != req.revision: raise ConflictError('交付模板已被修改，草稿保留，请刷新模板后重试。')
        if row.name == req.name and row.field_ids == selected: return projection(row, available)
        row.name, row.field_ids, row.revision = req.name, selected, row.revision + 1
    else:
        if req.revision is not None: raise DomainError('新模板不能携带已有版本号', code='VALIDATION_ERROR')
        row = ExportTemplate(production_id=production_id, name=req.name, field_ids=selected, created_by=user.id)
        db.add(row)
    await db.flush()
    db.add(AuditLog(user_id=user.id, action='export.template.save', entity_type='export_template', entity_id=row.id,
        metadata_json={'production_id': production_id, 'revision': row.revision}))
    db.add(OutboxEvent(production_id=production_id, command_id=row.id + ':' + str(row.revision), event_type='export.template.save', revision=row.revision,
        entity_ids={'template_id': row.id}))
    await db.flush()
    return projection(row, available)
