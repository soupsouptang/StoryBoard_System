"""Transactional live-project field lifecycle. Caller owns auth and transaction.

System identifiers/time calculations remain internal when their presentation
column is removed. Immutable historical snapshots are not rewritten here.
"""
import json

ALIASES = {'methods': ('primary_method', 'secondary_methods'), 'thumb': ('panels',)}
COMPUTED = {'number', 'tc', 'duration'}


def column_preferences(db, project_id):
    """Read the project schema's lifecycle plus its table presentation."""
    return [dict(row) for row in db.execute(
        'SELECT column_key,state,permanently_deleted,position,width_px,wrap_text,updated_by,updated_at '
        'FROM project_column_preferences WHERE project_id=? ORDER BY position,column_key', (project_id,))]


def write_column_preferences(db, project_id, preferences, core_fields, actor, at):
    """Archive/restore and presentation command; only purge_columns can tombstone.

    Validate the whole request before writing. Existing tombstones are immutable,
    including when an older client submits a saved view containing those keys.
    """
    if not isinstance(preferences, list) or len(preferences) > 500:
        raise ValueError('列配置格式不正确')
    tombstones = purged_fields(db, project_id)
    allowed = set(core_fields) | tombstones
    allowed.update(f"custom:{r['key']}" for r in db.execute(
        'SELECT key FROM custom_field_definitions WHERE project_id=? AND is_active=1', (project_id,)))
    for row in db.execute('SELECT import_columns_json FROM shots WHERE project_id=?', (project_id,)):
        imported = json.loads(row['import_columns_json'] or '{}')
        if isinstance(imported, dict):
            allowed.update(f'import:{key}' for key in imported)
    normalized = []
    for index, item in enumerate(preferences):
        if not isinstance(item, dict):
            raise ValueError('列配置格式不正确')
        key = str(item.get('column_key', ''))[:120]
        if key not in allowed:
            raise ValueError(f'未知列：{key}')
        if key in tombstones:
            continue
        if item.get('permanently_deleted') not in (None, False, 0, '0'):
            raise ValueError('永久删除必须通过归档列删除操作')
        state = str(item.get('state', 'visible'))
        if state not in {'visible', 'hidden', 'removed'}:
            raise ValueError('列状态无效')
        if key in {'select', 'actions'} and state != 'visible':
            raise ValueError('固定操作列不可隐藏或归档')
        try:
            position = max(0, min(int(item.get('position', index)), 10000))
        except (TypeError, ValueError):
            position = index
        try:
            width = max(1, min(int(item.get('width_px')), 5000))
        except (TypeError, ValueError):
            width = None
        normalized.append((key, state, position, width, 1 if item.get('wrap_text') else 0))
    for key, state, position, width, wrap in normalized:
        db.execute('''INSERT INTO project_column_preferences
            (project_id,column_key,state,permanently_deleted,position,width_px,wrap_text,updated_by,updated_at)
            VALUES (?,?,?,0,?,?,?,?,?) ON CONFLICT(project_id,column_key) DO UPDATE SET
            state=excluded.state,position=excluded.position,width_px=excluded.width_px,
            wrap_text=excluded.wrap_text,updated_by=excluded.updated_by,updated_at=excluded.updated_at
            WHERE project_column_preferences.permanently_deleted=0''',
            (project_id, key, state, position, width, wrap, actor, at))
    return column_preferences(db, project_id)


def purged_fields(db, project_id):
    return {r['column_key'] for r in db.execute(
        'SELECT column_key FROM project_column_preferences WHERE project_id=? AND permanently_deleted=1', (project_id,))}


def purge_columns(db, project_id, fields, allowed, actor, at):
    if not isinstance(fields, list) or not fields or len(fields) > 500 or any(not isinstance(f, str) for f in fields):
        raise ValueError('请选择要永久删除的归档列')
    fields = list(dict.fromkeys(fields))
    preferences = {r['column_key']: dict(r) for r in db.execute(
        'SELECT column_key,state,permanently_deleted FROM project_column_preferences WHERE project_id=?', (project_id,))}
    for field in fields:
        pref = preferences.get(field)
        if field in {'select', 'actions'} or not pref or pref['state'] != 'removed':
            raise ValueError('只能永久删除已归档的数据列')
        if field not in allowed and not field.startswith(('custom:', 'import:')):
            raise ValueError('未知列')
    shot_columns = {r['name'] for r in db.execute('PRAGMA table_info(shots)')}
    for field in fields:
        if preferences[field]['permanently_deleted']:
            continue
        if field.startswith('custom:'):
            key = field[7:]
            ids = [r['id'] for r in db.execute('SELECT id FROM custom_field_definitions WHERE project_id=? AND key=?', (project_id, key))]
            for cid in ids:
                db.execute('DELETE FROM shot_custom_field_values WHERE field_definition_id=?', (cid,))
                db.execute('DELETE FROM custom_field_definitions WHERE id=? AND project_id=?', (cid, project_id))
        elif field.startswith('import:'):
            for row in db.execute('SELECT id,import_columns_json FROM shots WHERE project_id=?', (project_id,)).fetchall():
                value = json.loads(row['import_columns_json'] or '{}')
                if field[7:] in value:
                    value.pop(field[7:])
                    db.execute('UPDATE shots SET import_columns_json=?,revision=revision+1,updated_at=? WHERE id=?', (json.dumps(value, ensure_ascii=False), at, row['id']))
        elif field == 'thumb':
            db.execute('UPDATE panels SET media_id=NULL WHERE shot_id IN (SELECT id FROM shots WHERE project_id=?)', (project_id,))
            db.execute("DELETE FROM shot_asset_links WHERE role='Reference' AND shot_id IN (SELECT id FROM shots WHERE project_id=?)", (project_id,))
        elif field not in COMPUTED:
            for key in ALIASES.get(field, (field,)):
                if key not in shot_columns:
                    raise ValueError('此字段没有可删除的数据映射')
                # Identifier comes only from the server whitelist above.
                db.execute(f'UPDATE shots SET "{key}"=?,revision=revision+1,updated_at=? WHERE project_id=?', ('[]' if key == 'secondary_methods' else '', at, project_id))
            if 'rich_text_json' in shot_columns:
                for row in db.execute('SELECT id,rich_text_json FROM shots WHERE project_id=?', (project_id,)).fetchall():
                    rich = json.loads(row['rich_text_json'] or '{}')
                    if field in rich:
                        rich.pop(field)
                        db.execute('UPDATE shots SET rich_text_json=? WHERE id=?', (json.dumps(rich, ensure_ascii=False), row['id']))
        db.execute("UPDATE project_column_preferences SET permanently_deleted=1,state='removed',updated_by=?,updated_at=? WHERE project_id=? AND column_key=?", (actor, at, project_id, field))
    return fields
