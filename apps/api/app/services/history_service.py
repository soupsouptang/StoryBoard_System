"""Canonical compensation commands, recorded inside the API unit of work.

Closed server-owned fields, stable identities, project lock, exact object tokens,
actor-isolated cursor, immutable media revisions, and a project-wide purge barrier.
No client supplies inverse business values or arbitrary model names.
"""
from __future__ import annotations
import copy
import json
from datetime import datetime, timezone
from fastapi.encoders import jsonable_encoder
from sqlalchemy import DateTime, delete, select
from app.core.exceptions import ConflictError, DomainError, NotFoundError
from app.models.asset import Asset, AssetVersion, ShotAssetLink, ClientAssetRequest
from app.models.board import BoardAssetReference, CreativeBoard
from app.models.collaboration import AuditLog, Comment, ReviewDecision
from app.models.command import OutboxEvent
from app.models.export_template import ExportTemplate
from app.models.field import ColumnPreference, ProjectColumn, ShotColumnValue
from app.models.history import HistoryEntry, HistoryState, WorkspaceLayout
from app.models.media import MediaPresentation
from app.models.production import Production, Scene, Sequence
from app.models.shot import Panel, ProductionStep, Shot
from app.models.view import SavedView, ViewRowLayout
from app.services.project_snapshot import FIELDS

# Explicit business allowlists. Source files, credentials, audit/read watermarks,
# event counters, commits and immutable source versions are never rewound.
SPECS = {name: (model, fields.split()) for name, (model, fields) in FIELDS.items()
         if name not in {'asset_versions', 'media_presentations', 'lighting_boards'}}
SPECS['production'][1].append('deleted_at')
for name in SPECS:
    model, fields = SPECS[name]
    if hasattr(model, 'production_id'): fields.append('production_id')
    if hasattr(model, 'created_by'): fields.append('created_by')
SPECS['values'][1].extend(['binding_kind', 'updated_by'])
SPECS['columns'][1].remove('schema_version')
SPECS.update({
    'boards': (CreativeBoard, 'production_id kind name width height objects shot_ids created_by deleted_at'.split()),
    'comments': (Comment, 'production_id shot_id asset_id user_id role body timecode quote_field quote_text parent_id is_resolved deleted_at'.split()),
    'preferences': (ColumnPreference, 'production_id column_key state position width_px wrap_text updated_by'.split()),
    'views': (SavedView, 'production_id name view_type is_shared created_by config row_height_mode manual_row_height_px measurement_context'.split()),
    'view_rows': (ViewRowLayout, 'production_id saved_view_id shot_id height_mode manual_height_px'.split()),
    'templates': (ExportTemplate, 'production_id name field_ids schema_version created_by'.split()),
    'layouts': (WorkspaceLayout, 'production_id user_id config'.split()),
})
SOFT = {'production', 'sequences', 'scenes', 'shots', 'panels', 'steps', 'columns', 'assets', 'comments', 'boards'}
# Parent-before-child restore; reverse order removes dependency rows.
ORDER = list(SPECS)
PERMISSIONS = {'production': 'production.write', 'assets': 'asset.write', 'comments': 'review.comment',
               'templates': 'export.create', 'boards': 'board.write'}


def allowed(user, permission):
    p = getattr(getattr(user, 'role', None), 'permissions', None) or {}
    return bool(p.get('*') or p.get(permission))


def record(row, fields):
    return {'data': jsonable_encoder({key: getattr(row, key) for key in fields}),
            'token': jsonable_encoder({'revision': getattr(row, 'revision', None), 'updated_at': row.updated_at})}


def conflict(details=None):
    error = ConflictError('此操作涉及的内容已发生变化，未撤销任何内容。请查看最新内容后再处理。', details=details)
    error.code = 'HISTORY_CONFLICT'
    return error


def dependencies(section, identity, snapshot):
    """Prevent undoing a creation from hiding another actor's new children."""
    foreign_key = {'shots': 'shot_id', 'columns': 'column_id', 'assets': 'asset_id',
                   'sequences': 'sequence_id', 'scenes': 'scene_id'}.get(section)
    result = {}
    for name, rows in snapshot.items():
        if name == section: continue
        for key, row in rows.items():
            if name == 'boards' and section == 'assets' and identity in row.get('asset_ids', []):
                # Pins also protect trashed boards and earlier undo states.
                result[name + '/' + key] = row
                continue
            if row['data'].get('deleted_at') or row['data'].get('state') in {'trashed', 'purged', 'purging'}: continue
            if name == 'layouts': continue
            if section == 'production' or foreign_key and row['data'].get(foreign_key) == identity or (
                    name == 'boards' and section == 'shots' and identity in row['data']['shot_ids']):
                result[name + '/' + key] = row
    return result


def references(item, snapshot):
    result = {}
    for side in ('before', 'after'):
        data = (item[side] or {}).get('data', {})
        for field, section in [('column_id', 'columns'), ('shot_id', 'shots'), ('asset_id', 'assets')]:
            identity = data.get(field)
            if identity and identity in snapshot[section]: result[section + '/' + identity] = snapshot[section][identity]
        if item['section'] == 'boards':
            for identity in data.get('shot_ids', []):
                if identity in snapshot['shots']: result['shots/' + identity] = snapshot['shots'][identity]
            for identity in (item[side] or {}).get('asset_ids', []):
                if identity in snapshot['assets']: result['assets/' + identity] = snapshot['assets'][identity]
    return result


class HistoryService:
    @staticmethod
    async def lock(db, production_id):
        production = await db.scalar(select(Production).where(Production.id == production_id)
            .with_for_update().execution_options(populate_existing=True))
        if production is None: raise NotFoundError('项目不存在')
        return production

    @staticmethod
    async def capture(db, production_id, user_id):
        shots = select(Shot.id).where(Shot.production_id == production_id)
        output = {}
        for name, (model, fields) in SPECS.items():
            query = select(model)
            if model is Production: query = query.where(model.id == production_id)
            elif hasattr(model, 'production_id'): query = query.where(model.production_id == production_id)
            else: query = query.where(model.shot_id.in_(shots))
            if model is WorkspaceLayout: query = query.where(model.user_id == user_id)
            rows = (await db.scalars(query.execution_options(populate_existing=True))).all()
            output[name] = {row.id: record(row, fields) for row in rows}
        pins = (await db.execute(select(BoardAssetReference.board_id, AssetVersion.asset_id)
            .join(CreativeBoard, CreativeBoard.id == BoardAssetReference.board_id)
            .join(AssetVersion, AssetVersion.id == BoardAssetReference.asset_version_id)
            .where(CreativeBoard.production_id == production_id))).all()
        board_assets = {}
        for board_id, asset_id in pins:
            board_assets.setdefault(board_id, set()).add(asset_id)
        for identity, row in output['boards'].items():
            # Dependency evidence, not business fields to restore.
            row['asset_ids'] = sorted(board_assets.get(identity, set()))
        # Presentations are append-only, keyed by logical owner, not historic row.
        rows = (await db.scalars(select(MediaPresentation).where(MediaPresentation.production_id == production_id)
            .order_by(MediaPresentation.revision))).all()
        output['media'] = {}
        for row in rows:
            output['media'][row.owner_type + ':' + row.owner_id] = record(row,
                ['production_id', 'asset_id', 'source_version_id', 'owner_type', 'owner_id', 'transform'])
        return output

    @staticmethod
    async def begin(db, production_id, user, label='修改项目内容', permission='shot.write', irreversible=False):
        if db.info.get('history_context') or db.info.get('history_replay'): return
        production = await HistoryService.lock(db, production_id)
        db.info['history_context'] = {'production_id': production_id, 'user_id': user.id,
            'label': label, 'permission': permission, 'irreversible': irreversible,
            'purge_epoch': production.purge_epoch, 'before': await HistoryService.capture(db, production_id, user.id)}

    @staticmethod
    async def state(db, production_id, user_id, create=False):
        row = await db.scalar(select(HistoryState).where(HistoryState.production_id == production_id,
            HistoryState.user_id == user_id).with_for_update())
        if row is None and create:
            row = HistoryState(production_id=production_id, user_id=user_id)
            db.add(row)
            await db.flush()
        return row

    @staticmethod
    async def entries(db, state):
        if state is None: return []
        return list((await db.scalars(select(HistoryEntry).where(HistoryEntry.state_id == state.id)
            .order_by(HistoryEntry.sequence))).all())

    @staticmethod
    async def barrier(db, production_id):
        states = list((await db.scalars(select(HistoryState).where(HistoryState.production_id == production_id)
            .with_for_update())).all())
        for state in states:
            await db.execute(delete(HistoryEntry).where(HistoryEntry.state_id == state.id))
            state.revision += 1
        context = db.info.get('history_context')
        if context and context['production_id'] == production_id: context['barrier_applied'] = True

    @staticmethod
    async def finish(db):
        context = db.info.pop('history_context', None)
        if context is None: return
        await db.flush()
        production_id, user_id = context['production_id'], context['user_id']
        after = await HistoryService.capture(db, production_id, user_id)
        before = context['before']
        production = await db.get(Production, production_id)
        purged = (context['irreversible'] and before != after) or production.purge_epoch != context['purge_epoch'] or any(
            row['data'].get('state') in {'purging', 'purged'} and before['columns'].get(identity, {}).get('data', {}).get('state') != row['data']['state']
            for identity, row in after['columns'].items()) or any(
            set(before[name]) - set(after[name]) for name in SOFT)
        if purged:
            if not context.get('barrier_applied'):
                await HistoryService.barrier(db, production_id)
            return
        changes = []
        for name in after:
            for identity in sorted(set(before[name]) | set(after[name])):
                old, new = before[name].get(identity), after[name].get(identity)
                if (old or {}).get('data') == (new or {}).get('data'): continue
                if name == 'media' and old is None:
                    # A first crop compensates back to the original source.
                    from app.schemas.image_crop import MediaTransform
                    old = {'data': {**new['data'], 'transform': MediaTransform(crop={'x': 0, 'y': 0, 'width': 1, 'height': 1}).model_dump()}, 'token': None}
                item = {'section': name, 'id': identity, 'before': old, 'after': new,
                        'expected': new, 'created': old is None}
                item['references'] = references(item, after)
                if item['created'] and name in SOFT: item['dependencies'] = dependencies(name, identity, after)
                changes.append(item)
        if not changes: return
        state = await HistoryService.state(db, production_id, user_id, create=True)
        await db.execute(delete(HistoryEntry).where(HistoryEntry.state_id == state.id, HistoryEntry.applied.is_(False)))
        db.add(HistoryEntry(state_id=state.id, sequence=state.next_sequence, label=context['label'],
            permission=context['permission'], applied=True, changes=changes))
        state.next_sequence += 1
        state.revision += 1
        await db.flush()
        entries = await HistoryService.entries(db, state)
        for item in entries[:-100]: await db.delete(item)
        await db.flush()

    @staticmethod
    async def summary(db, production_id, user):
        if not any(allowed(user, p) for p in ('production.read', 'production.write', 'shot.write', 'asset.write', 'review.comment', 'review.approve', 'export.create', 'board.write')):
            raise DomainError('当前账号没有查看项目操作历史的权限', code='FORBIDDEN')
        if await db.get(Production, production_id) is None: raise NotFoundError('项目不存在')
        state = await HistoryService.state(db, production_id, user.id)
        entries = await HistoryService.entries(db, state)
        undo = next((item for item in reversed(entries) if item.applied), None)
        redo = next((item for item in entries if not item.applied), None)
        return {'revision': state.revision if state else 0, 'undo_count': sum(item.applied for item in entries),
                'redo_count': sum(not item.applied for item in entries),
                'undo_label': undo.label if undo else None, 'redo_label': redo.label if redo else None,
                'can_undo': bool(undo and allowed(user, undo.permission)), 'can_redo': bool(redo and allowed(user, redo.permission))}

    @staticmethod
    async def move(db, production_id, user, direction, expected_revision):
        production = await HistoryService.lock(db, production_id)
        state = await HistoryService.state(db, production_id, user.id)
        if state is None or state.revision != expected_revision: raise conflict()
        entries = await HistoryService.entries(db, state)
        entry = next((item for item in (reversed(entries) if direction == 'undo' else entries)
                      if item.applied == (direction == 'undo')), None)
        if entry is None: raise DomainError('没有可撤销的操作' if direction == 'undo' else '没有可重做的操作', code='HISTORY_EMPTY')
        if not allowed(user, entry.permission): raise DomainError('当前账号没有执行此操作的权限', code='FORBIDDEN')
        snapshot = await HistoryService.capture(db, production_id, user.id)
        changes = copy.deepcopy(entry.changes)
        # Validate every member before writing any member of an atomic command.
        for item in changes:
            current = snapshot[item['section']].get(item['id'])
            if current != item['expected']: raise conflict({'object_id': item['id'], 'action': entry.label})
            if item['section'] == 'columns' and current and current['data']['state'] in {'purged', 'purging'}: raise conflict()
            for key, expected in item.get('references', {}).items():
                section, identity = key.split('/', 1)
                if snapshot[section].get(identity) != expected: raise conflict({'object_id': identity})
            if direction == 'undo' and item.get('dependencies') is not None and dependencies(item['section'], item['id'], snapshot) != item['dependencies']:
                raise conflict({'object_id': item['id']})
        target_key = 'before' if direction == 'undo' else 'after'
        removing = [item for item in changes if item[target_key] is None]
        restoring = [item for item in changes if item[target_key] is not None]
        # New children stay attached to soft-deleted aggregates. Only value/link
        # rows without a lifecycle are removed/recreated, with stable identities.
        ranks = {name: i for i, name in enumerate(ORDER + ['media'])}
        for item in sorted(removing, key=lambda v: ranks[v['section']], reverse=True):
            await HistoryService.apply(db, production_id, user, item, None)
        for item in sorted(restoring, key=lambda v: ranks[v['section']]):
            await HistoryService.apply(db, production_id, user, item, item[target_key]['data'])
        if any(item['section'] not in {'layouts', 'boards'} or item['section'] == 'boards' and
                ((item['after'] or item['before'])['data']['kind'] == 'lighting') for item in changes):
            production.revision += 1
            production.content_revision += 1
        if any(item['section'] == 'columns' for item in changes): production.schema_revision += 1
        if any(item['section'] == 'shots' and (item['before'] is None or item['after'] is None or
                item['before']['data']['sort_index'] != item['after']['data']['sort_index']) for item in changes): production.order_revision += 1
        await db.flush()
        current = await HistoryService.capture(db, production_id, user.id)
        for item in changes:
            item['expected'] = current[item['section']].get(item['id'])
            item['references'] = references(item, current)
            if item.get('dependencies') is not None: item['dependencies'] = dependencies(item['section'], item['id'], current)
        entry.changes, entry.applied = changes, direction == 'redo'
        state.revision += 1
        # Our compensation advanced object tokens. Rebase only matching prior
        # expectations for objects touched here; foreign writes are never rebased.
        touched = {(item['section'], item['id']) for item in changes}
        touched.update((name, identity) for name in current for identity, actual in current[name].items()
                       if actual != snapshot[name].get(identity))
        for other in entries:
            if other.id == entry.id: continue
            rows = copy.deepcopy(other.changes)
            changed = False
            for item in rows:
                actual = current[item['section']].get(item['id'])
                if (item['section'], item['id']) in touched and (actual or {}).get('data') == (item['expected'] or {}).get('data'):
                    item['expected'] = actual
                    changed = True
                for guard in ('references', 'dependencies'):
                    for key, expected in item.get(guard, {}).items():
                        section, identity = key.split('/', 1)
                        actual = current[section].get(identity)
                        if (section, identity) in touched and (actual or {}).get('data') == (expected or {}).get('data'):
                            item[guard][key] = actual
                            changed = True
            if changed: other.changes = rows
        db.add(AuditLog(user_id=user.id, action='history.' + direction, entity_type='production', entity_id=production_id,
            metadata_json={'history_id': entry.id, 'action': entry.label}))
        db.add(OutboxEvent(production_id=production_id, command_id=entry.id + ':' + str(state.revision),
            event_type='history.' + direction, revision=production.revision, entity_ids={'history_id': entry.id}))
        await db.flush()
        return await HistoryService.summary(db, production_id, user)

    @staticmethod
    async def apply(db, production_id, user, item, data):
        name, identity = item['section'], item['id']
        if name == 'media':
            from app.services.image_crop_service import ImageCropService
            latest = await ImageCropService.current(db, production_id, data['owner_type'], data['owner_id'])
            if await db.get(AssetVersion, data['source_version_id']) is None: raise conflict()
            db.add(MediaPresentation(**data, revision=latest.revision + 1 if latest else 1, created_by=user.id))
            return
        model, fields = SPECS[name]
        row = await db.get(model, identity)
        if data is None and name in SOFT:
            if row is None: raise conflict()
            row.deleted_at = datetime.now(timezone.utc)
            if name == 'columns': row.state = 'trashed'
        elif data is None:
            if row is not None: await db.delete(row)
            await db.flush()
            return
        else:
            if name == 'boards':
                from app.services.board_service import BoardService
                document = await BoardService.validate(db, production_id, data['kind'],
                    {key: data[key] for key in ('name', 'width', 'height', 'objects', 'shot_ids')})
                data = {**data, **document}
            if row is None:
                row = model(id=identity)
                db.add(row)
            for key in fields:
                value = data[key]
                if value is not None and isinstance(model.__table__.c[key].type, DateTime): value = datetime.fromisoformat(value)
                setattr(row, key, value)
            if name == 'columns' and (row.state in {'purged', 'purging'} or row.purged_at): raise conflict()
        if hasattr(row, 'revision'): row.revision = (row.revision or 0) + 1
        if name == 'columns': row.schema_version = (row.schema_version or 0) + 1
        if name == 'views':
            row.schema_version = (row.schema_version or 0) + 1
            row.measurement_generation = (row.measurement_generation or 0) + 1
        row.updated_at = datetime.now(timezone.utc)
        if name == 'boards':
            from app.services.board_service import BoardService
            await BoardService.pin_media(db, row)
        if name == 'comments':
            from app.services.review_service import ReviewService
            shot = await db.get(Shot, row.shot_id)
            if shot is None: raise conflict()
            ReviewService._event(db, shot, row, user, 'delete' if row.deleted_at else 'edit')
        await db.flush()

    @staticmethod
    async def place_columns(db, production_id, user, placement, columns, source=None, width=None):
        """Column creation and its personal placement share one acknowledged command."""
        config = copy.deepcopy(placement.config)
        HistoryService.validate_layout(config)
        presentation = config.get('presentation', {})
        order = presentation.get('displayOrder', [])
        if not isinstance(order, list) or any(not isinstance(key, str) for key in order) or placement.reference not in order:
            raise DomainError('列位置已变化，请刷新后重试。', code='INVALID_LAYOUT')
        columns = list(dict.fromkeys([*placement.columns, *columns]))
        order = [key for key in order if key not in columns]
        if placement.reference not in order: raise DomainError('不能在同一列粘贴。', code='INVALID_LAYOUT')
        index = order.index(placement.reference) + int(placement.after)
        order[max(1, index):max(1, index)] = columns
        presentation['displayOrder'] = order
        presentation['hiddenColumns'] = [key for key in presentation.get('hiddenColumns', []) if key not in columns]
        if source and columns:
            presentation.setdefault('columnWidths', {})[columns[-1]] = width
            presentation.setdefault('columnFormats', {})[columns[-1]] = presentation.get('columnFormats', {}).get(source, source)
        config['presentation'] = presentation
        return await HistoryService.layout(db, production_id, user, config, placement.revision)

    @staticmethod
    def layout_permission(user):
        permission = next((p for p in ('production.read', 'shot.write', 'production.write', 'asset.write', 'review.approve', 'export.create') if allowed(user,p)), None)
        if permission is None: raise DomainError('当前账号没有修改个人表格布局的权限', code='FORBIDDEN')
        return permission

    @staticmethod
    def validate_layout(config):
        from app.services.saved_view_service import SavedViewService
        SavedViewService._validate_config(config)
        if set(config) - {'presentation', 'wrappedColumns'}: raise DomainError('布局内容无效', code='INVALID_LAYOUT')
        p = config.get('presentation', {})
        if set(p) - {'version', 'columnOrder', 'hiddenColumns', 'columnWidths', 'displayOrder', 'columnLabels', 'columnFormats', 'rowHeight'}:
            raise DomainError('布局不能包含筛选或选择状态。', code='INVALID_LAYOUT')
        for items in [config.get('wrappedColumns', []), *(p.get(key, []) for key in ('columnOrder', 'hiddenColumns', 'displayOrder'))]:
            if not isinstance(items, list) or len(items)>1000 or any(not isinstance(v,str) or len(v)>120 for v in items):
                raise DomainError('布局列配置无效。', code='INVALID_LAYOUT')
        for key in ('columnLabels', 'columnFormats'):
            values = p.get(key, {})
            if not isinstance(values, dict) or any(not isinstance(v,str) or len(v)>120 for v in values.values()):
                raise DomainError('布局名称配置无效。', code='INVALID_LAYOUT')
        if 'rowHeight' in p and p['rowHeight'] not in {'compact','standard','comfortable','auto'}:
            raise DomainError('行高配置无效。', code='INVALID_LAYOUT')

    @staticmethod
    async def layout(db, production_id, user, config=None, revision=None):
        if config is not None:
            HistoryService.layout_permission(user)
            # Reuse the existing closed width/layout validators, not a second
            # arbitrary server snapshot input. Filters/selection never enter it.
            HistoryService.validate_layout(config)
        row = await db.scalar(select(WorkspaceLayout).where(WorkspaceLayout.production_id == production_id,
            WorkspaceLayout.user_id == user.id))
        if config is not None:
            if revision != (row.revision if row else 0): raise conflict()
            if row is None:
                row = WorkspaceLayout(production_id=production_id, user_id=user.id, config=config)
                db.add(row)
            elif row.config != config:
                row.config, row.revision = config, row.revision + 1
            await db.flush()
        return {'revision': row.revision if row else 0, 'config': row.config if row else None}
