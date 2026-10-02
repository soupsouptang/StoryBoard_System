"""Synthetic revision foundation checks; SQLite is not a row-lock rehearsal."""
from dataclasses import asdict
import importlib.util
from io import StringIO
from pathlib import Path
import sys

import pytest
import sqlalchemy as sa
from alembic.migration import MigrationContext
from alembic.operations import Operations
from alembic.config import Config
from alembic.script import ScriptDirectory
from sqlalchemy.dialects import postgresql
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "apps/api"))
from app.core.database import Base
from app.core.exceptions import ConflictError, NotFoundError
from app.models import Production
from app.services.production_revision_service import ProductionRevisions as Tokens, ProductionRevisionService as Service

INITIAL = Tokens(1, 1, 1, 1, 0)


@pytest.fixture
async def sessions():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory.begin() as db:
        db.add(Production(id="synthetic", name="Synthetic"))
    yield factory
    await engine.dispose()


@pytest.mark.parametrize("field", tuple(asdict(INITIAL)))
@pytest.mark.parametrize("invalid", [None, True, 1.5, "1", -1])
def test_strict_expected_tokens(field, invalid):
    values = asdict(INITIAL) | {field: invalid}
    with pytest.raises(ValueError):
        Tokens(**values)


@pytest.mark.parametrize("field", ["revision", "schema_revision", "order_revision", "content_revision"])
def test_zero_revision_rejected(field):
    with pytest.raises(ValueError):
        Tokens(**(asdict(INITIAL) | {field: 0}))


@pytest.mark.parametrize("flags,expected", [({}, Tokens(2, 1, 1, 2, 0)),
    ({"schema": True}, Tokens(2, 2, 1, 2, 0)),
    ({"order": True}, Tokens(2, 1, 2, 2, 0)),
    ({"purge": True}, Tokens(2, 2, 1, 2, 1)),
    ({"content": False}, Tokens(2, 1, 1, 1, 0)),
    ({"schema": True, "order": True, "purge": True}, Tokens(2, 2, 2, 2, 1))])
async def test_advance_and_stale_cas(sessions, flags, expected):
    async with sessions.begin() as db:
        assert await Service.advance(db, "synthetic", INITIAL, **flags) == expected
    async with sessions() as db:
        with pytest.raises(ConflictError) as error:
            await Service.advance(db, "synthetic", INITIAL)
        assert error.value.details["server_revisions"] == asdict(expected)


async def test_noop_rollback_and_identity_map(sessions):
    async with sessions() as db:
        root = await db.get(Production, "synthetic")
        timestamp = root.updated_at
        assert await Service.advance(db, root.id, INITIAL, changed=False) == INITIAL
        assert root.updated_at == timestamp
        advanced = await Service.advance(db, root.id, INITIAL)
        assert root.revision == advanced.revision
        await db.rollback()
    async with sessions() as db:
        assert await Service.lock_and_check(db, "synthetic", INITIAL) == INITIAL


async def test_root_lock_does_not_overwrite_business_draft(sessions):
    async with sessions.begin() as db:
        root = await db.get(Production, "synthetic")
        root.name = "Pending synthetic change"
        await Service.advance(db, root.id, INITIAL)
        assert root.name == "Pending synthetic change"
    async with sessions() as db:
        root = await db.get(Production, "synthetic")
        assert root.name == "Pending synthetic change"
        assert root.revision == root.content_revision == 2


async def test_missing_deleted_and_epoch_conflict(sessions):
    async with sessions.begin() as db:
        with pytest.raises(NotFoundError):
            await Service.lock_and_check(db, "absent", INITIAL)
        # Simulate a writer changing only the epoch: all five tokens matter.
        await db.execute(sa.update(Production).values(purge_epoch=1))
        with pytest.raises(ConflictError):
            await Service.advance(db, "synthetic", INITIAL, changed=False)
        await db.execute(sa.update(Production).values(deleted_at=sa.func.current_timestamp()))
        with pytest.raises(NotFoundError):
            await Service.lock_and_check(db, "synthetic", Tokens(1, 1, 1, 1, 1))


@pytest.mark.parametrize("field,bad", [("revision", 0), ("schema_revision", 0), ("order_revision", 0), ("content_revision", 0), ("purge_epoch", -1)])
async def test_database_constraints(sessions, field, bad):
    async with sessions() as db:
        with pytest.raises(sa.exc.IntegrityError):
            await db.execute(sa.update(Production).values(**{field: bad}))
        await db.rollback()
        with pytest.raises(sa.exc.IntegrityError):
            await db.execute(sa.update(Production).values(**{field: None}))


async def test_sql_uses_root_lock_and_full_vector_cas(sessions):
    async with sessions() as db:
        statements = []
        original = db.execute
        async def record(statement, *args, **kwargs):
            statements.append(str(statement.compile(dialect=postgresql.dialect())))
            return await original(statement, *args, **kwargs)
        db.execute = record
        await Service.advance(db, "synthetic", INITIAL)
        assert "FOR UPDATE" in statements[0]
        assert "productions.deleted_at IS NULL" in statements[0]
        where = statements[1].split("WHERE", 1)[1]
        for name in asdict(INITIAL):
            assert f"productions.{name} =" in where


async def test_cas_rejects_change_between_check_and_update(sessions):
    async with sessions() as db:
        original = db.execute
        async def interfere(statement, *args, **kwargs):
            if statement.is_update:
                await original(sa.update(Production).where(Production.id == "synthetic").values(purge_epoch=1))
            return await original(statement, *args, **kwargs)
        db.execute = interfere
        with pytest.raises(ConflictError):
            await Service.advance(db, "synthetic", INITIAL)
        await db.rollback()
    async with sessions() as db:
        assert await Service.lock_and_check(db, "synthetic", INITIAL) == INITIAL


def test_migration_upgrade_constraints_and_guarded_downgrade():
    spec = importlib.util.spec_from_file_location("revision_migration", ROOT / "apps/api/alembic/versions/d6a93f08b241_production_revisions.py")
    migration = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(migration)
    assert migration.down_revision == "c58f2d01e739"
    engine = sa.create_engine("sqlite:///:memory:")
    with engine.begin() as conn:
        conn.execute(sa.text("CREATE TABLE productions (id VARCHAR PRIMARY KEY)"))
        conn.execute(sa.text("INSERT INTO productions VALUES ('synthetic')"))
        context = MigrationContext.configure(conn, opts={"target_metadata": Base.metadata})
        with Operations.context(context):
            migration.upgrade()
            row = conn.execute(sa.text("SELECT revision,schema_revision,order_revision,content_revision,purge_epoch FROM productions")).one()
            assert tuple(row) == (1, 1, 1, 1, 0)
            for field in migration.FIELDS:
                bad = -1 if field == "purge_epoch" else 0
                with pytest.raises(sa.exc.IntegrityError):
                    conn.execute(sa.text(f"UPDATE productions SET {field} = {bad}"))
            conn.execute(sa.text("UPDATE productions SET revision = 2"))
            with pytest.raises(RuntimeError, match="Cannot discard"):
                migration.downgrade()
            conn.execute(sa.text("UPDATE productions SET revision = 1"))
            migration.downgrade()
            assert [col["name"] for col in sa.inspect(conn).get_columns("productions")] == ["id"]
    engine.dispose()


def test_migration_chain_and_postgresql_ddl():
    config = Config(str(ROOT / "apps/api/alembic.ini"))
    scripts = ScriptDirectory.from_config(config)
    assert len(scripts.get_heads()) == 1, "Alembic history must have exactly one canonical head"
    assert scripts.get_revision("d6a93f08b241").down_revision == "c58f2d01e739"
    migration = scripts.get_revision("d6a93f08b241").module
    output = StringIO()
    context = MigrationContext.configure(dialect_name="postgresql", opts={"as_sql": True, "output_buffer": output})
    with Operations.context(context):
        migration.upgrade()
        with pytest.raises(RuntimeError, match="online history check"):
            migration.downgrade()
    sql = output.getvalue()
    for field in migration.FIELDS:
        assert f"ADD COLUMN {field} BIGINT" in sql
        assert f"CONSTRAINT ck_productions_{field} CHECK" in sql
