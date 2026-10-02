"""Real PostgreSQL checks on an explicitly disposable, already migrated database.

ENVIRONMENT=test DATABASE_URL=postgresql+asyncpg://.../frameforge_ci_rehearsal
SECRET_KEY=<synthetic 32+ characters> python tools/postgres_rehearsal.py --disposable
"""
import argparse
import asyncio
from datetime import datetime, timedelta, timezone
from pathlib import Path
import sys

from sqlalchemy import DateTime, func, inspect, select, text
from sqlalchemy.exc import IntegrityError

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "apps/api"))
from app.core.config import settings
from app.core.database import AsyncSessionLocal, Base, async_engine, sync_engine
from app.core.exceptions import ConflictError
from app.models import Production, Role, Shot, User
from app.models.collaboration import AuditLog, Comment, CommentEvent
from app.models.command import OutboxEvent
from app.models.field import ProjectColumn, ShotColumnValue
from app.schemas.review import ReviewCommentCreate
from app.services.production_revision_service import ProductionRevisionService, ProductionRevisions
from app.services.review_service import ReviewService

TOKENS = ProductionRevisions(1, 1, 1, 1, 0)


def schema_check():
    from sqlalchemy.engine import make_url
    target = make_url(settings.DATABASE_URL)
    if (settings.ENVIRONMENT != "test" or target.drivername != "postgresql+asyncpg"
            or not (target.database or "").endswith("_rehearsal")
            or target.host not in ("127.0.0.1", "localhost")):
        raise SystemExit("Requires test mode and a loopback PostgreSQL *_rehearsal database")
    with sync_engine.connect() as db:
        from alembic.config import Config
        from alembic.script import ScriptDirectory
        config = Config(str(Path(__file__).resolve().parents[1] / "apps/api/alembic.ini"))
        config.set_main_option("script_location", str(Path(__file__).resolve().parents[1] / "apps/api/alembic"))
        assert db.scalar(text("SELECT version_num FROM alembic_version")) == ScriptDirectory.from_config(config).get_current_head()
        inspector = inspect(db)
        assert set(Base.metadata.tables) <= set(inspector.get_table_names())
        for table in Base.metadata.tables.values():
            actual = {column["name"]: column["type"] for column in inspector.get_columns(table.name)}
            for column in table.columns:
                if isinstance(column.type, DateTime):
                    assert column.type.timezone and actual[column.name].timezone, (table.name, column.name)
        print("PASS: migrated tables and all ORM timestamps agree with PostgreSQL")


async def persisted_check():
    async with AsyncSessionLocal() as db:
        project = await db.get(Production, "pg-rehearsal-a")
        assert project is not None and project.revision == project.content_revision == 2
        assert project.created_at == datetime(2026, 1, 2, 3, 4, 5, tzinfo=timezone.utc)
        assert await db.scalar(select(func.count(Comment.id))) == 1
        assert await db.scalar(select(func.count(CommentEvent.id))) == 1
        assert await db.scalar(select(func.count(OutboxEvent.id))) == 1
        assert await db.scalar(select(func.count(AuditLog.id))) == 1
        reader = await db.get(User, "pg-reader")
        assert (await ReviewService.read_state(db, "pg-shot-a", reader))["unread_count"] == 0
    print("PASS: committed revisions, UTC instant, events and personal read state survived")


async def exercise():
    async with AsyncSessionLocal.begin() as db:
        assert await db.scalar(select(func.count(Production.id))) == 0, "Requires an empty synthetic fixture"
        role = Role(id="pg-role", name="PG synthetic role", permissions={"*": True})
        db.add(role)
        await db.flush()
        db.add_all([User(id=identity, email=identity+"@example.invalid", password_hash="synthetic-only", role_id=role.id)
                    for identity in ("pg-author", "pg-reader")])
        db.add_all([Production(id="pg-rehearsal-a", name="Synthetic A",
            created_at=datetime(2026, 1, 2, 11, 4, 5, tzinfo=timezone(timedelta(hours=8)))),
            Production(id="pg-rehearsal-b", name="Synthetic B")])
        await db.flush()
        db.add_all([Shot(id="pg-shot-a", production_id="pg-rehearsal-a"),
                    Shot(id="pg-shot-b", production_id="pg-rehearsal-b")])
        db.add(ProjectColumn(id="pg-column", production_id="pg-rehearsal-a", key="fixture", label="Synthetic"))

    async with AsyncSessionLocal() as db:
        db.add(ShotColumnValue(production_id="pg-rehearsal-a", shot_id="pg-shot-b", column_id="pg-column", value="fixture"))
        try:
            await db.flush()
        except IntegrityError as error:
            assert error.orig.sqlstate == "23503"
            await db.rollback()
        else:
            raise AssertionError("Cross-project value was accepted")
    print("PASS: composite foreign key rejects a cross-project value")

    locked, release = asyncio.Event(), asyncio.Event()
    async def first_writer():
        async with AsyncSessionLocal.begin() as db:
            await ProductionRevisionService.advance(db, "pg-rehearsal-a", TOKENS)
            locked.set()
            await release.wait()
    async def stale_writer():
        await locked.wait()
        async with AsyncSessionLocal.begin() as db:
            await ProductionRevisionService.advance(db, "pg-rehearsal-a", TOKENS)
    first = asyncio.create_task(first_writer())
    second = asyncio.create_task(stale_writer())
    try:
        await asyncio.wait_for(locked.wait(), 10)
        assert not (await asyncio.wait([second], timeout=0.15))[0], "Root lock did not block the competing writer"
    finally:
        release.set()
    await asyncio.wait_for(first, 10)
    try:
        await asyncio.wait_for(second, 10)
    except ConflictError:
        pass
    else:
        raise AssertionError("Stale writer did not conflict")
    print("PASS: real root row lock serializes writers and stale tokens conflict")

    async with AsyncSessionLocal.begin() as db:
        author = await db.get(User, "pg-author")
        await ReviewService.create_comment(db, "pg-shot-a", ReviewCommentCreate(body="Synthetic comment"), author)
    async with AsyncSessionLocal.begin() as db:
        reader = await db.get(User, "pg-reader")
        assert (await ReviewService.read_state(db, "pg-shot-a", reader))["unread_count"] == 1
        await ReviewService.read_state(db, "pg-shot-a", reader, through_seq=1)
        author = await db.get(User, "pg-author")
        assert (await ReviewService.read_state(db, "pg-shot-a", author))["unread_count"] == 1
    async with AsyncSessionLocal() as db:
        author = await db.get(User, "pg-author")
        await ReviewService.create_comment(db, "pg-shot-a", ReviewCommentCreate(body="Rolled back fixture"), author)
        await db.rollback()
    await persisted_check()
    print("PASS: rollback removed comment, sequence increment, audit and outbox atomically")


async def main(restored: bool):
    try:
        schema_check()
        await (persisted_check() if restored else exercise())
    finally:
        await async_engine.dispose()
        sync_engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--disposable", required=True, action="store_true")
    parser.add_argument("--verify-restored", action="store_true")
    arguments = parser.parse_args()
    asyncio.run(main(arguments.verify_restored))
