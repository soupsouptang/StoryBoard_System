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
    monkeypatch.setattr('app.api.v1.assets.MEDIA_ROOT', tmp_path)


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


@pytest.mark.asyncio
@pytest.mark.parametrize('ratio,canonical,size', [('16:9','16:9',(160,90)), ('2.35:1','47:20',(235,100))])
async def test_panel_framing_fixed_project_ratio_original_history_and_conflicts(ratio, canonical, size):
    async with AsyncClient(transport=ASGITransport(app=app), base_url='http://test') as client:
        headers, _, _, _ = await setup(client)
        project = (await client.post('/api/v1/productions', headers=headers, json={'name':'Framing synthetic','aspect_ratio':ratio})).json()
        root = '/api/v1/productions/' + project['id']
        shot = (await client.post(root+'/shots',headers=headers,json={'name':'Original'})).json()
        endpoint = f"/api/v1/shots/{shot['id']}/detail"
        upload = await client.post(endpoint,headers=headers,data={'payload':json.dumps({'revision':shot['revision']})},files={'image':('source.png',picture(),'image/png')})
        assert upload.status_code == 200, upload.text
        shot=upload.json();panel=shot['panels'][0];asset=panel['asset_id']
        path=root+'/assets/'+asset;owner={'owner_type':'panel','owner_id':panel['id']}
        pres=(await client.get(path+'/presentation',headers=headers,params=owner)).json()
        source={'asset_id':asset,'panel_id':panel['id'],'presentation_revision':pres['revision'],'source_version_id':pres['source_version_id']}
        source_path=path+'/image-versions/'+source['source_version_id']+'/content'
        original=(await client.get(source_path,headers=headers)).content
        frame_ratio=size[0]/size[1];cw=min(1,frame_ratio/2);ch=min(1,2/frame_ratio)
        transform={'crop':{'x':(1-cw)/2,'y':(1-ch)/2,'width':cw,'height':ch},'aspect_ratio':canonical,'output_width':size[0], 'scale':.5,'translation_x':.1,'translation_y':0}
        request={'revision':shot['revision'],'framing':{'source':source,'transform':transform}}
        before=(await client.get(root+'/history',headers=headers)).json()
        response=await client.post(endpoint,headers=headers,data={'payload':json.dumps(request)})
        assert response.status_code == 200,response.text
        saved=response.json();assert saved['revision']==shot['revision']+1
        after=(await client.get(root+'/history',headers=headers)).json();assert after['undo_count']==before['undo_count']+1
        current=(await client.get(path+'/presentation',headers=headers,params=owner)).json()
        assert current['source_version_id']==source['source_version_id'] and current['transform']['scale']==.5
        rendered=await client.get(path+'/presentation/content',headers=headers,params=owner)
        assert rendered.status_code==200
        with Image.open(BytesIO(rendered.content)) as image:
            assert image.size==size
            assert max(image.convert('RGB').getpixel((0,0)))<10,'Zooming out allows black empty space'
        assert (await client.get(source_path,headers=headers)).content==original
        noop={**request,'revision':saved['revision'],'framing':{'source':{**source,'presentation_revision':current['revision']},'transform':transform}}
        response=await client.post(endpoint,headers=headers,data={'payload':json.dumps(noop)})
        assert response.status_code==200 and response.json()['revision']==saved['revision']
        assert (await client.get(root+'/history',headers=headers)).json()==after
        stale={**request,'revision':saved['revision'],'changes':{'name':'Must not persist'}}
        assert (await client.post(endpoint,headers=headers,data={'payload':json.dumps(stale)})).status_code==409
        wrong={**noop,'changes':{'name':'Must not persist'},'framing':{**noop['framing'],'transform':{**transform,'aspect_ratio':'1:1'}}}
        assert (await client.post(endpoint,headers=headers,data={'payload':json.dumps(wrong)})).status_code==400
        other={**noop,'framing':{**noop['framing'],'source':{**noop['framing']['source'],'panel_id':'other-panel'}}}
        assert (await client.post(endpoint,headers=headers,data={'payload':json.dumps(other)})).status_code==400
        assert (await client.get(root+'/shots',headers=headers)).json()[0]['name']=='Original'
        assert (await client.get(root+'/history',headers=headers)).json()==after
        undo=await client.post(root+'/history/undo',headers=headers,json={'revision':after['revision']})
        assert undo.status_code==200,undo.text
        restored=(await client.get(path+'/presentation',headers=headers,params=owner)).json()
        assert restored['transform']['scale']==1
        redo=await client.post(root+'/history/redo',headers=headers,json={'revision':undo.json()['revision']})
        assert redo.status_code==200,redo.text
        assert (await client.get(path+'/presentation',headers=headers,params=owner)).json()['transform']['scale']==.5
        assert (await client.get(source_path,headers=headers)).content==original


@pytest.mark.asyncio
async def test_uploaded_framing_and_fields_rollback_together():
    async with AsyncClient(transport=ASGITransport(app=app),base_url='http://test') as client:
        headers,root,shot,field=await setup(client)
        endpoint=f"/api/v1/shots/{shot['id']}/detail"
        before=(await client.get(root+'/history',headers=headers)).json()
        req={'revision':shot['revision'],'changes':{'name':'Invalid framing rollback'},'framing':{'source':None,'transform':{'crop':{'x':0,'y':0,'width':1,'height':1},'aspect_ratio':'1:1'}}}
        bad=await client.post(endpoint,headers=headers,data={'payload':json.dumps(req)},files={'image':('source.png',picture(),'image/png')})
        assert bad.status_code==400,bad.text
        assert (await client.get(root+'/history',headers=headers)).json()==before
        restored=(await client.get(root+'/shots',headers=headers)).json()[0]
        assert restored['name']=='Before' and not [p for p in restored['panels'] if p['asset_id'] and not p['deleted_at']]
        req['framing']['transform']['aspect_ratio']='16:9'
        good=await client.post(endpoint,headers=headers,data={'payload':json.dumps(req)},files={'image':('source.png',picture(),'image/png')})
        assert good.status_code==200,good.text
        assert (await client.get(root+'/history',headers=headers)).json()['undo_count']==before['undo_count']+1
