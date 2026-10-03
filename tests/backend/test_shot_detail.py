"""The registered detail command acknowledges one atomic, undoable save."""
from io import BytesIO
from pathlib import Path
import json
import sys
import pytest
from httpx import ASGITransport, AsyncClient
from PIL import Image
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'apps/api'))
from main import app
from app.core.config import settings
from app.core.database import Base, AsyncSessionLocal, async_engine
from app.services.seed import seed_database


@pytest.fixture(autouse=True)
async def database(monkeypatch, tmp_path):
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    async with AsyncSessionLocal() as db:
        await seed_database(db)
        await db.commit()
    monkeypatch.setattr('app.services.panel_media_service.MEDIA_ROOT', tmp_path)


async def setup(client):
    auth = await client.post('/api/v1/auth/login', json={'email': settings.INITIAL_ADMIN_EMAIL, 'password': settings.INITIAL_ADMIN_PASSWORD})
    headers = {'Authorization': 'Bearer ' + auth.json()['access_token']}
    project = (await client.post('/api/v1/productions', headers=headers, json={'name': 'Detail command synthetic'})).json()
    root = '/api/v1/productions/' + project['id']
    shot = (await client.post(root + '/shots', headers=headers, json={'name': 'Before'})).json()
    field = (await client.post(root + '/custom-fields', headers=headers, json={'label': 'Required choice', 'field_type': 'select', 'options': ['A','B'], 'required': True, 'default_value': 'A'})).json()
    return headers, root, shot, field


def picture():
    output = BytesIO(); Image.new('RGB', (80, 40), 'red').save(output, 'PNG'); return output.getvalue()


@pytest.mark.asyncio
async def test_atomic_detail_save_image_custom_values_and_one_history_step():
    async with AsyncClient(transport=ASGITransport(app=app), base_url='http://test') as client:
        headers, root, shot, field = await setup(client)
        before = (await client.get(root + '/history', headers=headers)).json()
        req = {'revision': shot['revision'], 'changes': {'name': 'After', 'duration_frames': 120}, 'custom_values': [{'field_id': field['id'], 'field_revision': field['revision'], 'value': 'B'}]}
        endpoint = f"/api/v1/shots/{shot['id']}/detail"
        response = await client.post(endpoint, headers=headers, data={'payload': json.dumps(req)}, files={'image': ('synthetic.png', picture(), 'image/png')})
        assert response.status_code == 200, response.text
        saved = response.json(); assert saved['name'] == 'After' and saved['duration_frames'] == 120
        assert len(saved['panels']) == 1 and saved['panels'][0]['asset_id']
        history = (await client.get(root + '/history', headers=headers)).json()
        assert history['undo_count'] == before['undo_count'] + 1 and history['undo_label'] == '编辑镜头详情'
        undo = await client.post(root + '/history/undo', headers=headers, json={'revision': history['revision']}); assert undo.status_code == 200, undo.text
        restored = (await client.get(root + '/shots', headers=headers)).json()[0]
        assert restored['name'] == 'Before' and restored['duration_frames'] == shot['duration_frames']
        assert not [panel for panel in restored['panels'] if not panel['deleted_at'] and panel['asset_id']]
        redo = await client.post(root + '/history/redo', headers=headers, json={'revision': undo.json()['revision']}); assert redo.status_code == 200, redo.text
        restored = (await client.get(root + '/shots', headers=headers)).json()[0]
        assert restored['name'] == 'After' and restored['panels'][0]['asset_id'] == saved['panels'][0]['asset_id']
        matrix = (await client.get(root + '/custom-field-values', headers=headers)).json()['values']
        assert matrix[shot['id']][field['id']] == 'B'


@pytest.mark.asyncio
async def test_detail_noop_cas_validation_and_late_image_failure_rollback(tmp_path):
    async with AsyncClient(transport=ASGITransport(app=app), base_url='http://test') as client:
        headers, root, shot, field = await setup(client)
        endpoint = f"/api/v1/shots/{shot['id']}/detail"
        async def send(req, image=None):
            return await client.post(endpoint, headers=headers, data={'payload': json.dumps(req)}, files={'image': ('invalid.png', image, 'image/png')} if image else None)
        history = (await client.get(root + '/history', headers=headers)).json()
        noop = await send({'revision': shot['revision'], 'changes': {'name': shot['name']}, 'custom_values': [{'field_id': field['id'], 'field_revision': field['revision'], 'value': 'A'}]})
        assert noop.status_code == 200 and noop.json()['revision'] == shot['revision']
        assert noop.json()['updated_at'].rstrip('Z') == shot['updated_at'].rstrip('Z')
        assert (await client.get(root + '/history', headers=headers)).json() == history
        for changes in [{'duration_frames': -1}, {'revision': 99}, {'name': ' '}, {'display_number': '999'}, {'primary_method': 'unknown'}]:
            bad = await send({'revision': shot['revision'], 'changes': changes}); assert bad.status_code == 422, bad.text
        req = {'revision': shot['revision'], 'changes': {'name': 'Must roll back'}, 'custom_values': [{'field_id': field['id'], 'field_revision': field['revision'], 'value': 'B'}]}
        failed = await send(req, b'not an image'); assert failed.status_code == 400, failed.text
        assert (await client.get(root + '/shots', headers=headers)).json()[0]['name'] == 'Before'
        assert (await client.get(root + '/history', headers=headers)).json() == history
        assert not list(tmp_path.glob('*'))
        failed = await send({**req, 'revision': shot['revision'] + 1}); assert failed.status_code == 409
        failed = await send({**req, 'custom_values': [{**req['custom_values'][0], 'field_revision': field['revision'] + 1}]}); assert failed.status_code == 409
        failed = await send({**req, 'custom_values': [{**req['custom_values'][0], 'value': ''}]}); assert failed.status_code == 400
        assert (await client.get(root + '/history', headers=headers)).json() == history
        denied = await client.post(endpoint, data={'payload': json.dumps(req)}); assert denied.status_code == 401
