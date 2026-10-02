"""Run: pytest tests/backend/test_shot_relative_commands.py (isolated SQLite)."""
import sys
from pathlib import Path
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.orm import selectinload
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'apps' / 'api'))
from app.core.database import Base
from app.core.exceptions import ConflictError, DomainError
from app.models.production import Production
from app.models.shot import Shot, Panel
from app.models.user import User, Role
from app.schemas.shot import ShotCreate, ShotRelativeCommand, ShotAutoTimingRequest
from app.services.shot_service import ShotService

@pytest.mark.asyncio
async def test_relative_commands_clone_move_number_and_reject_stale(tmp_path):
    engine = create_async_engine(f"sqlite+aiosqlite:///{tmp_path/'commands.db'}")
    async with engine.begin() as conn: await conn.run_sync(Base.metadata.create_all)
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    async with sessions() as db:
        role = Role(name='writer', permissions={'shot.write': True})
        user = User(email='commands@example.invalid', password_hash='unused', role=role)
        prod = Production(name='Synthetic', fps_num=24, fps_den=1)
        db.add_all([user, prod]); await db.flush()
        first = await ShotService.create_shot(db, prod.id, ShotCreate(display_number='015', name='First', voice_over='A short narration.', duration_frames=120), user)
        second = await ShotService.create_shot(db, prod.id, ShotCreate(display_number='099', name='Second'), user)
        first.panels[0].asset_id = 'stable-asset-id'
        await db.commit()
        async def command(action, target, sources=[]):
            shots = list((await db.execute(select(Shot).options(selectinload(Shot.panels)).order_by(Shot.sort_index,Shot.id))).scalars())
            req = ShotRelativeCommand(action=action, source_ids=sources, base_order=[s.id for s in shots], revisions={s.id:s.revision for s in shots})
            return await ShotService.relative_command(db, target, req, user), req
        result, stale = await command('duplicate', first.id, [first.id]); await db.commit()
        clone = await db.get(Shot, result['shot_ids'][0])
        await db.refresh(clone, ['panels'])
        assert clone.id != first.id and clone.name == first.name
        assert clone.panels[0].asset_id == first.panels[0].asset_id
        assert clone.panels[0].id != first.panels[0].id
        with pytest.raises(ConflictError): await ShotService.relative_command(db, first.id, stale, user)
        await command('cut_paste', second.id, [first.id]); await db.commit()
        shots = list((await db.execute(select(Shot).order_by(Shot.sort_index))).scalars())
        assert [s.id for s in shots] == [clone.id, second.id, first.id]
        assert [s.display_number for s in shots] == ['001','002','003']
        await command('insert_before', second.id); await db.commit()
        shots = list((await db.execute(select(Shot).order_by(Shot.sort_index))).scalars())
        assert shots[1].name == '新镜头' and [s.display_number for s in shots] == ['001','002','003','004']
        await ShotService.auto_time_shot(db, first.id, ShotAutoTimingRequest(revision=first.revision), user)
        assert first.duration_frames > 0 and first.duration_frames != 120
        reader = User(role=Role(permissions={}))
        with pytest.raises(DomainError, match='权限'): await ShotService.relative_command(db, first.id, stale, reader)
    await engine.dispose()

@pytest.mark.asyncio
async def test_automatic_number_is_assigned_by_server_and_explicit_import_number_preserved(tmp_path):
    engine = create_async_engine(f"sqlite+aiosqlite:///{tmp_path/'automatic.db'}")
    async with engine.begin() as conn: await conn.run_sync(Base.metadata.create_all)
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    async with sessions() as db:
        user = User(email='auto@example.invalid', password_hash='unused', role=Role(name='writer',permissions={'shot.write':True}))
        prod = Production(name='Synthetic')
        db.add_all([user,prod]); await db.flush()
        first = await ShotService.create_shot(db,prod.id,ShotCreate(),user)
        second = await ShotService.create_shot(db,prod.id,ShotCreate(),user)
        assert (first.display_number,second.display_number)==('001','002')
        imported = await ShotService.create_shot(db,prod.id,ShotCreate(display_number='015'),user)
        third = await ShotService.create_shot(db,prod.id,ShotCreate(),user)
        assert imported.display_number=='015' and third.display_number=='016'
        assert third.name=='镜头 016' and third.sort_index>imported.sort_index
    await engine.dispose()
