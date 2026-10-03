"""Real transactions: persistence, atomic compensation, conflict and lifecycle."""
from pathlib import Path
import sys
import pytest
from sqlalchemy import select
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'apps/api'))
from app.core.database import Base, AsyncSessionLocal, async_engine
from app.core.exceptions import ConflictError
from app.models import Production, Shot, User, Role, ProjectColumn, ShotColumnValue
from app.models.history import HistoryEntry
from app.services.history_service import HistoryService as H
from app.services.shot_service import ShotService
from app.schemas.shot import ShotCreate, ShotPatch


@pytest.fixture(autouse=True)
async def database():
    async with async_engine.begin() as connection:
        await connection.run_sync(Base.metadata.drop_all)
        await connection.run_sync(Base.metadata.create_all)
    async with AsyncSessionLocal() as db:
        role = Role(id='r', name='history-test', permissions={'*': True})
        db.add_all([role, User(id='u', email='u@history.test', password_hash='synthetic', role=role),
                    User(id='v', email='v@history.test', password_hash='synthetic', role=role),
                    Production(id='p', name='History'), Production(id='q', name='Other')])
        await db.commit()


async def actor(db, identity='u'): return await db.get(User, identity)


async def edit(db, name, identity='u'):
    user = await actor(db, identity)
    await H.begin(db, 'p', user, '编辑镜头')
    shot = await db.get(Shot, 's')
    if shot is None:
        shot = await ShotService.create_shot(db, 'p', ShotCreate(display_number='001', name=name), user)
        shot.id = 's'
    else:
        await ShotService.patch_shot(db, 's', ShotPatch(revision=shot.revision, changes={'name': name}), user)
    await H.finish(db)
    await db.commit()


async def move(db, direction, identity='u'):
    user = await actor(db, identity)
    state = await H.summary(db, 'p', user)
    result = await H.move(db, 'p', user, direction, state['revision'])
    await db.commit()
    return result


@pytest.mark.asyncio
async def test_create_edit_undo_chain_redo_persists_and_new_branch():
    async with AsyncSessionLocal() as db:
        await edit(db, 'A')
        await edit(db, 'B')
    async with AsyncSessionLocal() as db:
        assert (await H.summary(db, 'p', await actor(db)))['undo_count'] == 2
        await move(db, 'undo')
        assert (await db.get(Shot, 's')).name == 'A'
        await move(db, 'undo')
        assert (await db.get(Shot, 's')).deleted_at is not None
        await move(db, 'redo')
        assert (await db.get(Shot, 's')).deleted_at is None
        await move(db, 'redo')
        assert (await db.get(Shot, 's')).name == 'B'
        await move(db, 'undo')
        await edit(db, 'C')
        assert (await H.summary(db, 'p', await actor(db)))['redo_count'] == 0


@pytest.mark.asyncio
async def test_foreign_edit_conflicts_and_cursor_stays_put():
    async with AsyncSessionLocal() as db:
        await edit(db, 'A')
        await edit(db, 'B')
        await edit(db, 'Other user', 'v')
        before = await H.summary(db, 'p', await actor(db))
        with pytest.raises(ConflictError): await H.move(db, 'p', await actor(db), 'undo', before['revision'])
        await db.rollback()
        assert (await db.get(Shot, 's')).name == 'Other user'
        assert await H.summary(db, 'p', await actor(db)) == before
        assert (await H.summary(db, 'q', await actor(db)))['undo_count'] == 0


@pytest.mark.asyncio
async def test_noop_failure_and_purge_barrier():
    async with AsyncSessionLocal() as db:
        await edit(db, 'A')
        await edit(db, 'A')
        assert (await H.summary(db, 'p', await actor(db)))['undo_count'] == 1
        await H.begin(db, 'p', await actor(db))
        (await db.get(Shot, 's')).name = 'uncommitted'
        await H.finish(db)
        await db.rollback()
        assert (await db.get(Shot, 's')).name == 'A'
        await edit(db, 'B', 'v')
        await H.begin(db, 'p', await actor(db), irreversible=True)
        (await db.get(Production, 'p')).purge_epoch += 1
        await H.finish(db)
        await db.commit()
        for identity in ('u', 'v'): assert (await H.summary(db, 'p', await actor(db, identity)))['undo_count'] == 0


@pytest.mark.asyncio
async def test_personal_layout_history_retention_and_stale_double_undo():
    async with AsyncSessionLocal() as db:
        user = await actor(db)
        for number in range(102):
            await H.begin(db, 'p', user, '调整表格布局')
            old = await H.layout(db, 'p', user)
            await H.layout(db, 'p', user, {'presentation': {'columnWidths': {'name': 100 + number}}}, old['revision'])
            await H.finish(db)
            await db.commit()
        state = await H.summary(db, 'p', user)
        assert state['undo_count'] == 100
        assert (await H.layout(db, 'p', await actor(db, 'v')))['config'] is None
        await H.move(db, 'p', user, 'undo', state['revision'])
        await db.commit()
        with pytest.raises(ConflictError): await H.move(db, 'p', user, 'undo', state['revision'])
        await db.rollback()
        assert (await H.layout(db, 'p', await actor(db)))['config']['presentation']['columnWidths']['name'] == 200


@pytest.mark.asyncio
async def test_real_http_acknowledgement_and_shortcut_history_endpoint():
    from httpx import AsyncClient, ASGITransport
    from app.core.security import create_access_token
    from main import app
    async with AsyncClient(transport=ASGITransport(app=app), base_url='http://history.test', headers={'Authorization':'Bearer '+create_access_token({'sub':'u'})}) as client:
        response = await client.post('/api/v1/productions/p/shots', json={'name':'HTTP history', 'duration_frames':75})
        assert response.status_code == 201, response.text
        shot_id = response.json()['id']
        summary = (await client.get('/api/v1/productions/p/history')).json()
        assert summary['undo_count'] == 1 and summary['can_undo']
        response = await client.post('/api/v1/productions/p/history/undo', json={'revision':summary['revision']})
        assert response.status_code == 200, response.text
        assert response.json()['redo_count'] == 1
        assert not (await client.get('/api/v1/productions/p/shots')).json()
        response = await client.post('/api/v1/productions/p/history/redo', json={'revision':response.json()['revision']})
        assert response.status_code == 200, response.text
        assert (await client.get('/api/v1/productions/p/shots')).json()[0]['id'] == shot_id
        assert (await client.post('/api/v1/productions/p/history/undo', json={'revision':summary['revision']})).status_code == 409


@pytest.mark.asyncio
async def test_foreign_child_creation_blocks_undo_parent_creation():
    from app.models import Comment
    async with AsyncSessionLocal() as db:
        await edit(db, 'A')
        db.add(Comment(production_id='p',shot_id='s',user_id='v',body='Foreign comment'))
        await db.commit()
        state = await H.summary(db,'p',await actor(db))
        with pytest.raises(ConflictError): await H.move(db,'p',await actor(db),'undo',state['revision'])
        await db.rollback()
        assert (await db.get(Shot,'s')).deleted_at is None


@pytest.mark.asyncio
async def test_http_import_copy_values_comments_and_batch_are_atomic():
    from httpx import AsyncClient, ASGITransport
    from app.core.security import create_access_token
    from main import app
    async with AsyncClient(transport=ASGITransport(app=app), base_url='http://history.test', headers={'Authorization':'Bearer '+create_access_token({'sub':'u'})}) as client:
        root = '/api/v1/productions/p'
        async def command(direction):
            state = (await client.get(root+'/history')).json()
            response = await client.post(root+'/history/'+direction,json={'revision':state['revision']})
            assert response.status_code == 200, response.text
            return response.json()
        imported = await client.post(root+'/import-commit',json={'rows':[['First','50'],['Second','75']], 'mapping':{'name':{'col':0},'frames':{'col':1}}})
        assert imported.status_code == 201, imported.text
        assert (await client.get(root+'/history')).json()['undo_count'] == 1
        shots = (await client.get(root+'/shots')).json()
        ids = [row['id'] for row in shots]
        await command('undo')
        assert (await client.get(root+'/shots')).json() == []
        await command('redo')
        shots = (await client.get(root+'/shots')).json()
        assert [row['id'] for row in shots] == ids
        field = (await client.post(root+'/custom-fields',json={'label':'Text'})).json()
        response = await client.patch('/api/v1/shots/'+ids[0]+'/custom-fields/'+field['id'],json={'revision':shots[0]['revision'],'value':'Keep full data'})
        assert response.status_code == 200, response.text
        shots = (await client.get(root+'/shots')).json()
        copied = await client.post(root+'/custom-fields/copy-column',json={'source':field['column_key'],'label':'Text','field_revision':field['revision'],'shot_revisions':{s['id']:s['revision'] for s in shots}})
        assert copied.status_code == 201, copied.text
        copied_id = copied.json()['field']['id']
        await command('undo')
        assert not any(row['id']==copied_id and row['state']=='visible' for row in (await client.get(root+'/custom-fields')).json())
        await command('redo')
        matrix = (await client.get(root+'/custom-field-values')).json()['values']
        assert matrix[ids[0]][copied_id] == 'Keep full data'
        comment = await client.post('/api/v1/shots/'+ids[0]+'/comments',json={'body':'Own comment'})
        assert comment.status_code == 201, comment.text
        await command('undo')
        assert not (await client.get('/api/v1/shots/'+ids[0]+'/comments')).json()
        await command('redo')
        assert (await client.get('/api/v1/shots/'+ids[0]+'/comments')).json()[0]['body']=='Own comment'
        # One batch, one history entry. Every member is restored together.
        shots = (await client.get(root+'/shots')).json()
        before = (await client.get(root+'/history')).json()['undo_count']
        departments = {s['id']:s['department'] for s in shots}
        response = await client.post('/api/v1/shots/bulk-update',json={'shot_ids':ids,'revisions':{s['id']:s['revision'] for s in shots},'updates':{'department':'vfx'}})
        assert response.status_code == 200, response.text
        assert (await client.get(root+'/history')).json()['undo_count'] == before+1
        await command('undo')
        assert all(s['department']==departments[s['id']] for s in (await client.get(root+'/shots')).json())
        await command('redo')
        assert all(s['department']=='vfx' for s in (await client.get(root+'/shots')).json())


@pytest.mark.asyncio
async def test_compound_column_history_layout_conflict_rolls_back():
    from httpx import AsyncClient, ASGITransport
    from app.core.security import create_access_token
    from main import app
    async with AsyncClient(transport=ASGITransport(app=app), base_url='http://history.test', headers={'Authorization':'Bearer '+create_access_token({'sub':'u'})}) as client:
        root = '/api/v1/productions/p'
        config = {'presentation':{'displayOrder':['display_number','name']},'wrappedColumns':[]}
        initialized = await client.put(root+'/workspace-layout',json={'revision':0,'initialize':True,'config':config})
        assert initialized.status_code==200
        payload = {'fields':[{'label':'Atomic'}],'placement':{'revision':initialized.json()['revision'],'config':config,'reference':'name'}}
        response = await client.post(root+'/custom-fields/insert',json=payload)
        assert response.status_code==201,response.text
        column=response.json()[0]
        state=(await client.get(root+'/history')).json()
        assert state['undo_count']==1
        failed=await client.post(root+'/custom-fields/insert',json={**payload,'fields':[{'label':'Must rollback'}]})
        assert failed.status_code==409,failed.text
        assert not any(row['label']=='Must rollback' for row in (await client.get(root+'/custom-fields')).json())
        assert (await client.get(root+'/history')).json()==state
        response=await client.post(root+'/history/undo',json={'revision':state['revision']})
        assert response.status_code==200,response.text
        assert (await client.get(root+'/workspace-layout')).json()['config']==config
        response=await client.post(root+'/history/redo',json={'revision':response.json()['revision']})
        assert response.status_code==200,response.text
        assert (await client.get(root+'/workspace-layout')).json()['config']['presentation']['displayOrder'][-1]==column['column_key']
        rejected=await client.put(root+'/workspace-layout',json={'revision':0,'config':{'presentation':{'filters':{'search':'Not history'}}}})
        assert rejected.status_code==400


@pytest.mark.asyncio
async def test_personal_layout_does_not_advance_shared_project_revision():
    async with AsyncSessionLocal() as db:
        user = await actor(db)
        user.role.permissions={'production.read':True}
        await db.commit()
        await H.begin(db,'p',user,'布局',H.layout_permission(user))
        await H.layout(db,'p',user,{'presentation':{'columnWidths':{'name':200}}},0)
        await H.finish(db)
        await db.commit()
        production=await db.get(Production,'p')
        revision=production.revision
        await move(db,'undo')
        assert production.revision==revision
        await move(db,'redo')
        assert production.revision==revision


@pytest.mark.asyncio
async def test_undo_own_child_then_parent_and_revoked_permission():
    from app.models import Comment
    from app.schemas.review import ReviewCommentCreate
    from app.services.review_service import ReviewService
    from app.core.exceptions import DomainError
    async with AsyncSessionLocal() as db:
        await edit(db,'Parent')
        user = await actor(db)
        await H.begin(db,'p',user,'新增批注','review.comment')
        await ReviewService.create_comment(db,'s',ReviewCommentCreate(body='Child'),user)
        await H.finish(db)
        await db.commit()
        await move(db,'undo')
        await move(db,'undo')
        assert (await db.get(Shot,'s')).deleted_at
        state = await H.summary(db,'p',user)
        user.role.permissions = {'production.read':True}
        await db.commit()
        with pytest.raises(DomainError,match='权限'):
            await H.move(db,'p',user,'redo',state['revision'])


@pytest.mark.asyncio
async def test_media_compensation_appends_and_preserves_original(tmp_path):
    from io import BytesIO
    from PIL import Image
    from app.models import Asset, AssetVersion, MediaPresentation
    from app.schemas.image_crop import ImageCropRequest
    from app.services.asset_mutation_service import AssetMutationService
    from app.services.image_crop_service import ImageCropService
    data = BytesIO()
    Image.new('RGB',(100,50),'red').save(data,format='PNG')
    async with AsyncSessionLocal() as db:
        user = await actor(db)
        uploaded = await AssetMutationService.upload(db,'p',data.getvalue(),'synthetic.png',user,tmp_path)
        asset = await db.get(Asset,uploaded['asset_id'])
        version = await db.scalar(select(AssetVersion).where(AssetVersion.asset_id==asset.id))
        await db.commit()
        await H.begin(db,'p',user,'图片构图','asset.write')
        await ImageCropService.crop(db,'p',asset.id,ImageCropRequest(revision=asset.revision,presentation_revision=0,source_version_id=version.id,crop={'x':0,'y':0,'width':.5,'height':1},rotation=90,output_width=200),user,tmp_path)
        await H.finish(db)
        await db.commit()
        await move(db,'undo')
        assert (await ImageCropService.current(db,'p','asset',asset.id)).transform['rotation']==0
        await move(db,'redo')
        latest = await ImageCropService.current(db,'p','asset',asset.id)
        assert latest.revision==3 and latest.transform['rotation']==90
        assert (tmp_path/version.storage_key).read_bytes()==data.getvalue()


@pytest.mark.asyncio
async def test_foreign_board_link_blocks_undoing_shot_creation():
    from app.schemas.board import BoardCreate
    from app.services.board_service import BoardService
    async with AsyncSessionLocal() as db:
        await edit(db, 'Linked shot')
        await BoardService.create(db, 'p', BoardCreate(kind='lighting', name='Foreign board', shot_ids=['s']), await actor(db, 'v'))
        await H.finish(db)
        await db.commit()
        before = await H.summary(db, 'p', await actor(db))
        with pytest.raises(ConflictError):
            await H.move(db, 'p', await actor(db), 'undo', before['revision'])
        await db.rollback()
        assert (await db.get(Shot, 's')).deleted_at is None
        assert await H.summary(db, 'p', await actor(db)) == before


@pytest.mark.asyncio
async def test_historic_board_pin_blocks_undoing_asset_creation(tmp_path):
    from io import BytesIO
    from PIL import Image
    from app.models import Asset, AssetVersion
    from app.schemas.board import BoardCreate, BoardPatch
    from app.services.asset_mutation_service import AssetMutationService
    from app.services.board_service import BoardService
    image = BytesIO()
    Image.new('RGB', (100, 60), 'blue').save(image, format='PNG')
    async with AsyncSessionLocal() as db:
        user = await actor(db)
        await H.begin(db, 'p', user, 'Upload', 'asset.write')
        uploaded = await AssetMutationService.upload(db, 'p', image.getvalue(), 'pin.png', user, tmp_path)
        await H.finish(db)
        await db.commit()
        version = await db.scalar(select(AssetVersion).where(AssetVersion.asset_id == uploaded['asset_id']))
        foreign = await actor(db, 'v')
        board = await BoardService.create(db, 'p', BoardCreate(kind='moodboard', name='Pinned', objects=[
            {'id': 'photo', 'type': 'image', 'asset_version_id': version.id}]), foreign)
        await H.finish(db)
        await db.commit()
        await BoardService.patch(db, 'p', board['id'], BoardPatch(revision=1, objects=[]), foreign)
        await H.finish(db)
        await db.commit()
        before = await H.summary(db, 'p', user)
        with pytest.raises(ConflictError):
            await H.move(db, 'p', user, 'undo', before['revision'])
        await db.rollback()
        assert (await db.get(Asset, uploaded['asset_id'])).deleted_at is None
        assert await H.summary(db, 'p', await actor(db)) == before
