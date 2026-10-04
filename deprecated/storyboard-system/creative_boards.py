"""Creative boards storage. No HTTP/auth dependencies and no schema side effects on import.

Integration: execute SCHEMA during migration (foreign_keys=ON). After the parent's
project read/write authorization and CSRF checks, route GET/PUT
/api/projects/{pid}/creative-boards to handle_creative_boards. Map ValueError to
400, LookupError to 404, and CreativeBoardsConflict to 409 with exc.current.
PUT body is {revision, boards}; both methods return {revision, boards}.
Helpers use a savepoint, preserving any caller transaction; parent owns commit.
Maximum 50 boards / 500 items TOTAL per project. Dimensions are canvas units.
Item z is height above the floor in centimetres and applies to lighting objects only;
moodboard items must not carry spatial fields. Light rotation is its orientation
(0 points right); preview is illustrative only.
"""

import json
import math
import re
from datetime import datetime, timezone
from urllib.parse import urlsplit

SCHEMA = """
CREATE TABLE IF NOT EXISTS project_creative_boards (
    project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
    revision INTEGER NOT NULL DEFAULT 0 CHECK(revision >= 0),
    data_json TEXT NOT NULL DEFAULT '[]',
    updated_at TEXT NOT NULL,
    updated_by TEXT NOT NULL DEFAULT ''
);
"""
CREATIVE_BOARDS_SCHEMA = SCHEMA
MAX_BOARDS, MAX_ITEMS = 50, 500
MOOD_TYPES = frozenset({'note', 'color', 'link', 'image'})
LIGHT_TYPES = frozenset({'table', 'chair', 'sofa', 'bed', 'cabinet', 'door',
                         'window', 'actor', 'camera', 'tripod', 'light',
                         'softbox', 'diffuser', 'wall', 'arrow'})
LIGHT_V2_OBJECT_TYPES = frozenset({
    'actor', 'camera', 'light', 'modifier', 'grip',
    'furniture', 'architecture', 'practical', 'annotation'
})
BOARD_KEYS_V1 = frozenset({'id', 'kind', 'name', 'width', 'height', 'shot_ids', 'items'})
BOARD_KEYS_V2 = frozenset({'id', 'kind', 'name', 'width', 'height', 'shot_ids', 'items',
                          'schemaVersion', 'version', 'settings', 'environment', 'objects', 'scene'})
ATTACHMENTS = {
    'naked': 90, 'softbox': 100, 'grid': 40, 'umbrella': 120, 'barndoors': 55,
    'CF12 Fresnel': 45, 'fresnel': 25, 'reflector': 60, 'lantern': 180, 'cone': 30
}
ID_RE = re.compile(r'[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}\Z')
COLOR_RE = re.compile(r'#[0-9a-fA-F]{6}\Z')


class CreativeBoardsConflict(Exception):
    status = 409

    def __init__(self, current):
        super().__init__('创意板已被其他协作者修改，请保留草稿并重新载入。')
        self.current = current


def _text(value, field, limit, nonempty=False):
    if not isinstance(value, str) or len(value) > limit:
        raise ValueError(f'{field}: expected text up to {limit} characters')
    if any(ord(c) < 32 and c not in '\n\t' for c in value):
        raise ValueError(f'{field}: invalid control character')
    if nonempty and not value.strip():
        raise ValueError(f'{field}: required')
    return value


def _id(value, field):
    if not isinstance(value, str) or not ID_RE.fullmatch(value):
        raise ValueError(f'{field}: invalid ID')
    return value


def _number(value, field, low, high):
    if type(value) not in (int, float) or not math.isfinite(value) or not low <= value <= high:
        raise ValueError(f'{field}: expected finite number in [{low}, {high}]')
    return value


def _bool(value, field):
    if type(value) is not bool:
        raise ValueError(f'{field}: expected boolean')
    return value


def _keys(value, allowed, field):
    if not isinstance(value, dict) or set(value) - allowed:
        raise ValueError(f'{field}: invalid object or unknown fields')


def _link(value):
    value = _text(value, 'url', 2048, True)
    if re.search(r'\s|[\\\x00-\x1f\x7f]', value):
        raise ValueError('url: whitespace and backslashes are not allowed')
    try:
        parsed = urlsplit(value)
        if parsed.scheme.lower() not in ('http', 'https') or not parsed.hostname or parsed.username is not None or parsed.password is not None:
            raise ValueError('url: expected absolute http/https URL without credentials')
        parsed.port  # Validate malformed / out-of-range ports as well.
    except (ValueError, UnicodeError) as exc:
        raise ValueError('url: invalid http/https URL') from exc
    return value


def normalize_v2_object(obj, canvas_w, canvas_h, assets):
    _keys(obj, {'id', 'type', 'subtype', 'name', 'label', 'transform',
                'visible', 'locked', 'metadata', 'properties', 'asset_id'}, 'object')
    oid = _id(obj.get('id'), 'object.id')
    typ = _text(obj.get('type'), 'object.type', 50, True)
    if typ not in LIGHT_V2_OBJECT_TYPES:
        raise ValueError(f'object.type: not allowed for lighting scene: {typ}')
    subtype = _text(str(obj.get('subtype', typ)), 'object.subtype', 100)
    name = _text(str(obj.get('name', subtype)), 'object.name', 200)
    label = _text(str(obj.get('label', '')), 'object.label', 200)

    raw_tf = obj.get('transform', {})
    if not isinstance(raw_tf, dict):
        raise ValueError('object.transform: expected object')
    pos = raw_tf.get('position', {})
    rot = raw_tf.get('rotation', {})
    scale = raw_tf.get('scale', {})
    transform = {
        'position': {
            'x': _number(pos.get('x', 0), 'transform.position.x', -50000, 100000),
            'y': _number(pos.get('y', 0), 'transform.position.y', -50000, 100000),
            'z': _number(pos.get('z', 0), 'transform.position.z', -2000, 20000),
        },
        'rotation': {
            'x': _number(rot.get('x', 0), 'transform.rotation.x', -360, 360),
            'y': _number(rot.get('y', 0), 'transform.rotation.y', -360, 360),
            'z': _number(rot.get('z', 0), 'transform.rotation.z', -360, 360),
        },
        'scale': {
            'x': _number(scale.get('x', 100), 'transform.scale.x', 0.1, 100000),
            'y': _number(scale.get('y', 100), 'transform.scale.y', 0.1, 100000),
            'z': _number(scale.get('z', 1), 'transform.scale.z', 0.01, 100000),
        }
    }
    visible = _bool(obj.get('visible', True), 'object.visible')
    locked = _bool(obj.get('locked', False), 'object.locked')
    raw_meta = obj.get('metadata', {})
    metadata = dict(raw_meta) if isinstance(raw_meta, dict) else {}

    raw_props = obj.get('properties', {})
    if not isinstance(raw_props, dict):
        raise ValueError('object.properties: expected object')
    properties = {}
    for k, v in raw_props.items():
        if isinstance(v, str):
            properties[k] = _text(v, f'properties.{k}', 1000)
        elif isinstance(v, bool):
            properties[k] = v
        elif isinstance(v, (int, float)) and math.isfinite(v):
            properties[k] = v
        elif v is None:
            properties[k] = None

    res = {
        'id': oid,
        'type': typ,
        'subtype': subtype,
        'name': name,
        'label': label,
        'transform': transform,
        'visible': visible,
        'locked': locked,
        'metadata': metadata,
        'properties': properties,
    }
    if 'asset_id' in obj:
        aid = _id(obj['asset_id'], 'object.asset_id')
        if aid not in assets:
            raise ValueError('object.asset_id: asset does not belong to project')
        res['asset_id'] = aid
    return res


def normalize_boards(value, allowed_shot_ids, allowed_asset_ids):
    """Validate an untrusted JSON list and return fresh canonical dictionaries.

    References are strictly project scoped. Caller supplies active project shot
    IDs and existing project asset IDs. URLs are stored only for link cards;
    image URLs are never accepted, only an asset_id resolved by the client.
    Supports both V1 boards and versioned Lighting Scene V2 models.
    """
    if not isinstance(value, list) or len(value) > MAX_BOARDS:
        raise ValueError('boards: expected list with at most 50 boards')
    shots, assets = set(allowed_shot_ids), set(allowed_asset_ids)
    seen_boards, seen_items, result = set(), set(), []
    for board in value:
        kind = board.get('kind')
        if kind not in ('moodboard', 'lighting'):
            raise ValueError('board.kind: expected moodboard or lighting')

        is_v2 = (kind == 'lighting' and (
            board.get('schemaVersion') == 2 or
            board.get('version') == 2 or
            'objects' in board or
            'scene' in board or
            any('subtype' in item for item in board.get('items', []) if isinstance(item, dict))
        ))

        allowed_keys = BOARD_KEYS_V2 if is_v2 else BOARD_KEYS_V1
        _keys(board, allowed_keys, 'board')
        bid = _id(board.get('id'), 'board.id')
        if bid in seen_boards:
            raise ValueError('board.id: duplicate')
        seen_boards.add(bid)

        out = {'id': bid, 'kind': kind, 'name': _text(board.get('name'), 'name', 120, True),
               'width': _number(board.get('width', 1600), 'board.width', 320, 100000),
               'height': _number(board.get('height', 1000), 'board.height', 320, 100000)}
        refs = board.get('shot_ids', [])
        if not isinstance(refs, list) or len(refs) > 1000:
            raise ValueError('shot_ids: expected list up to 1000 IDs')
        for ref in refs:
            if _id(ref, 'shot_id') not in shots:
                raise ValueError('shot_ids: shot does not belong to active project')
        if len(set(refs)) != len(refs):
            raise ValueError('shot_ids: duplicate')
        out['shot_ids'] = list(refs)

        if is_v2:
            out['schemaVersion'] = 2
            out['version'] = 2
            raw_scene = board.get('scene') if isinstance(board.get('scene'), dict) else {}

            raw_settings = board.get('settings') or raw_scene.get('settings') or {}
            out['settings'] = {
                'unit': _text(raw_settings.get('unit', 'cm'), 'settings.unit', 10) if isinstance(raw_settings, dict) else 'cm',
                'gridSize': _number(raw_settings.get('gridSize', 100), 'settings.gridSize', 1, 10000) if isinstance(raw_settings, dict) else 100,
                'snapEnabled': _bool(raw_settings.get('snapEnabled', True), 'settings.snapEnabled') if isinstance(raw_settings, dict) else True,
                'showGrid': _bool(raw_settings.get('showGrid', True), 'settings.showGrid') if isinstance(raw_settings, dict) else True,
                # 2.5D 等轴视图已移除（2026-09-18），立体摆位统一默认 3D
                'defaultView': _text(raw_settings.get('defaultView', '3d'), 'settings.defaultView', 20) if isinstance(raw_settings, dict) else '3d',
            }
            raw_env = board.get('environment') or raw_scene.get('environment') or {}
            out['environment'] = {
                'roomWidth': _number(raw_env.get('roomWidth', out['width']), 'environment.roomWidth', 100, 100000) if isinstance(raw_env, dict) else out['width'],
                'roomDepth': _number(raw_env.get('roomDepth', out['height']), 'environment.roomDepth', 100, 100000) if isinstance(raw_env, dict) else out['height'],
            }
            if isinstance(raw_env, dict) and 'wallHeight' in raw_env:
                out['environment']['wallHeight'] = _number(raw_env['wallHeight'], 'environment.wallHeight', 10, 20000)

            raw_objects = board.get('objects')
            if raw_objects is None and 'objects' in raw_scene:
                raw_objects = raw_scene.get('objects')
            if raw_objects is None:
                raw_objects = []
            if not isinstance(raw_objects, list) or len(seen_items) + len(raw_objects) > MAX_ITEMS:
                raise ValueError('objects: at most 500 items per project')

            out['objects'] = []
            for obj in raw_objects:
                norm_obj = normalize_v2_object(obj, out['width'], out['height'], assets)
                if norm_obj['id'] in seen_items:
                    raise ValueError('object.id: duplicate across project')
                seen_items.add(norm_obj['id'])
                out['objects'].append(norm_obj)

            # Keep items for V1 backward-compatibility if supplied
            raw_items = board.get('items', [])
            out['items'] = []
            if isinstance(raw_items, list):
                for item in raw_items:
                    if not isinstance(item, dict):
                        continue
                    iid = item.get('id')
                    if not iid or not ID_RE.fullmatch(iid) or iid in seen_items:
                        continue
                    ityp = item.get('type')
                    if ityp not in LIGHT_TYPES:
                        ityp = 'light' if ityp in ('cob', 'fresnel', 'par', 'led_panel', 'hmi', 'tungsten') else 'camera' if 'camera' in str(ityp) else 'actor' if 'actor' in str(ityp) else 'table' if 'table' in str(ityp) else 'arrow'
                    seen_items.add(iid)
                    out['items'].append({
                        'id': iid, 'type': ityp,
                        'x': _number(item.get('x', 80), 'x', -50000, 100000),
                        'y': _number(item.get('y', 80), 'y', -50000, 100000),
                        'width': _number(item.get('width', 100), 'width', 16, 10000),
                        'height': _number(item.get('height', 100), 'height', 16, 1000),
                        'rotation': _number(item.get('rotation', 0), 'rotation', -360, 360),
                        'z': _number(item.get('z', 0), 'z', 0, 5000),
                        'label': _text(item.get('label', ''), 'label', 200)
                    })
            result.append(out)
            continue

        out['items'] = []
        items = board.get('items', [])
        if not isinstance(items, list) or len(seen_items) + len(items) > MAX_ITEMS:
            raise ValueError('items: at most 500 items per project')
        for item in items:
            _keys(item, {'id', 'type', 'subtype', 'x', 'y', 'width', 'height', 'rotation', 'z', 'label',
                         'text', 'color', 'url', 'asset_id', 'attachment', 'beam_spread',
                         'beam_custom', 'beam_length', 'intensity', 'temperature', 'show_coverage',
                         'aim_tilt', 'focal_length', 'sensor_width', 'actor_height', 'actor_facing',
                         'v2_identity', 'manufacturer', 'model', 'mount', 'powerW', 'optic'}, 'item')
            iid = _id(item.get('id'), 'item.id')
            if iid in seen_items:
                raise ValueError('item.id: duplicate across project')
            seen_items.add(iid)
            typ = item.get('type')
            if not isinstance(typ, str) or typ not in (MOOD_TYPES if kind == 'moodboard' else LIGHT_TYPES):
                raise ValueError('item.type: not allowed for board kind')
            obj = {'id': iid, 'type': typ,
                   'x': _number(item.get('x'), 'x', 0, out['width']),
                   'y': _number(item.get('y'), 'y', 0, out['height']),
                   'width': _number(item.get('width'), 'width', 16, min(4000, out['width'])),
                   'height': _number(item.get('height'), 'height', 16, min(4000, out['height'])),
                   'rotation': _number(item.get('rotation', 0), 'rotation', -360, 360),
                   'label': _text(item.get('label', ''), 'label', 200)}
            if obj['x'] + obj['width'] > out['width'] or obj['y'] + obj['height'] > out['height']:
                raise ValueError('item: bounds exceed canvas')
            # Height above the floor belongs to spatial lighting objects only. Storing
            # the default also migrates boards saved before the field existed.
            if typ in LIGHT_TYPES:
                obj['z'] = _number(item.get('z', 0), 'z', 0, 2000)
            extras = set(item) - set(obj)
            permitted = {'note': {'text', 'color'}, 'color': {'color'}, 'link': {'url'},
                         'image': {'asset_id'}}.get(typ, set())
            if typ in LIGHT_TYPES:
                permitted = permitted | {'z', 'subtype', 'v2_identity', 'manufacturer', 'model', 'mount', 'powerW', 'optic'}
            if typ in ('light', 'softbox'):
                permitted = permitted | {'attachment', 'beam_spread', 'beam_custom',
                                         'beam_length', 'intensity', 'temperature',
                                         'show_coverage', 'aim_tilt'}
            if typ == 'camera':
                permitted = permitted | {'focal_length', 'sensor_width'}
            if typ == 'actor':
                permitted = permitted | {'actor_height', 'actor_facing'}
            if extras - permitted:
                raise ValueError('item: fields are not applicable to type')
            if 'subtype' in item:
                obj['subtype'] = _text(str(item['subtype']), 'subtype', 100)
            if 'v2_identity' in item and isinstance(item['v2_identity'], dict):
                obj['v2_identity'] = item['v2_identity']
            if typ == 'note':
                obj['text'] = _text(item.get('text', ''), 'text', 10000)
            if typ in ('note', 'color'):
                color = item.get('color', '#fff2b3' if typ == 'note' else '#64748b')
                if not isinstance(color, str) or not COLOR_RE.fullmatch(color):
                    raise ValueError('color: expected #RRGGBB')
                obj['color'] = color.lower()
            if typ == 'link':
                obj['url'] = _link(item.get('url'))
            if typ == 'image':
                aid = _id(item.get('asset_id'), 'asset_id')
                if aid not in assets:
                    raise ValueError('asset_id: asset does not belong to project')
                obj['asset_id'] = aid
            if typ in ('light', 'softbox'):
                attachment = item.get('attachment', 'softbox' if typ == 'softbox' else 'naked')
                if not isinstance(attachment, str) or attachment not in ATTACHMENTS:
                    raise ValueError('attachment: invalid')
                obj.update(attachment=attachment,
                           beam_spread=_number(item.get('beam_spread', ATTACHMENTS[attachment]), 'beam_spread', 5, 170),
                           beam_custom=_bool(item.get('beam_custom', False), 'beam_custom'),
                           beam_length=_number(item.get('beam_length', 320), 'beam_length', 20, 2000),
                           intensity=_number(item.get('intensity', 60), 'intensity', 0, 100),
                           temperature=_number(item.get('temperature', 5600), 'temperature', 1800, 12000),
                           show_coverage=_bool(item.get('show_coverage', True), 'show_coverage'),
                           aim_tilt=_number(item.get('aim_tilt', 0), 'aim_tilt', -90, 90))
            if typ == 'camera':
                obj.update(focal_length=_number(item.get('focal_length', 35), 'focal_length', 8, 600),
                           sensor_width=_number(item.get('sensor_width', 36), 'sensor_width', 10, 70))
            if typ == 'actor':
                obj.update(actor_height=_number(item.get('actor_height', 170), 'actor_height', 100, 220),
                           actor_facing=_number(item.get('actor_facing', 0), 'actor_facing', -180, 180))
            out['items'].append(obj)
        result.append(out)
    return result


def _project_exists(db, project_id):
    if db.execute('SELECT id FROM projects WHERE id=?', (project_id,)).fetchone() is None:
        raise LookupError('Project not found')


def load_creative_boards(db, project_id):
    _project_exists(db, project_id)
    row = db.execute('SELECT revision, data_json FROM project_creative_boards WHERE project_id=?',
                     (project_id,)).fetchone()
    return {'revision': row[0], 'boards': json.loads(row[1])} if row else {'revision': 0, 'boards': []}


def save_creative_boards(db, project_id, revision, boards, updated_by=''):
    if type(revision) is not int or not 0 <= revision < 9007199254740991:
        raise ValueError('revision: expected nonnegative safe integer')
    updated_by = _text(updated_by, 'updated_by', 200)
    db.execute('SAVEPOINT creative_boards_save')
    try:
        _project_exists(db, project_id)
        # Soft-deleted shots still exist and can be restored from trash.
        shots = {r[0] for r in db.execute('SELECT id FROM shots WHERE project_id=?', (project_id,))}
        assets = {r[0] for r in db.execute('SELECT id FROM assets WHERE project_id=?', (project_id,))}
        normalized = normalize_boards(boards, shots, assets)
        now = datetime.now(timezone.utc).isoformat()
        # A single compare-and-swap statement also protects two first writers.
        cursor = db.execute('''
            INSERT INTO project_creative_boards(project_id, revision, data_json, updated_at, updated_by)
            SELECT ?, 1, ?, ?, ? WHERE ?=0 OR EXISTS
                (SELECT 1 FROM project_creative_boards WHERE project_id=?)
            ON CONFLICT(project_id) DO UPDATE SET
                revision=project_creative_boards.revision+1, data_json=excluded.data_json,
                updated_at=excluded.updated_at, updated_by=excluded.updated_by
            WHERE project_creative_boards.revision=?
        ''', (project_id, json.dumps(normalized, ensure_ascii=False, allow_nan=False),
              now, updated_by, revision, project_id, revision))
        if cursor.rowcount != 1:
            raise CreativeBoardsConflict(load_creative_boards(db, project_id))
        response = {'revision': revision + 1, 'boards': normalized}
        db.execute('RELEASE SAVEPOINT creative_boards_save')
        return response
    except Exception:
        db.execute('ROLLBACK TO SAVEPOINT creative_boards_save')
        db.execute('RELEASE SAVEPOINT creative_boards_save')
        raise


def handle_creative_boards(db, project_id, method, payload=None, updated_by=''):
    """Parent supplies authenticated project scope and owns HTTP status handling."""
    if method == 'GET':
        return load_creative_boards(db, project_id)
    if method != 'PUT':
        raise ValueError('method: expected GET or PUT')
    _keys(payload, {'revision', 'boards'}, 'payload')
    return save_creative_boards(db, project_id, payload.get('revision'), payload.get('boards'), updated_by)
