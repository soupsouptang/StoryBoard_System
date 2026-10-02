"""Isolated project aggregate/version coverage, with synthetic business records."""
from pathlib import Path
import json
import sys

import pytest
from sqlalchemy import select

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "apps/api"))
from app.core.database import Base, AsyncSessionLocal, async_engine
from app.core.exceptions import ConflictError, DomainError
from app.models import Asset, AssetVersion, Comment, Panel, Production, ProductionStep, ProjectColumn, Role, SavedView, Shot, ShotAssetLink, ShotColumnValue, User
from app.models.command import OutboxEvent
from app.models.project_version import ProjectCommit
from app.schemas.custom_field import CustomFieldPurgeRequest
from app.schemas.project_version import ProjectBranchCreate, ProjectCommitCreate
from app.services.custom_field_service import CustomFieldService
from app.services.project_diff import split_lines
from app.services.project_snapshot import capture_project, content_hash
from app.services.project_version_service import ProjectVersionService as Service


@pytest.fixture(autouse=True)
async def isolated_database():
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield


async def fixture(db):
    role = Role(name="fixture-admin", permissions={"*": True})
    user = User(id="u", email="fixture@example.com", password_hash="not-an-authentication-fixture", role=role)
    db.add_all([role, user, Production(id="p", name="Synthetic project"), Production(id="other", name="Other")])
    await db.flush()
    db.add_all([Shot(id="s", production_id="p", name="First", voice_over="line 1\nline 2"),
        Shot(id="outside", production_id="other", name="Outside"),
        Asset(id="a", production_id="p", filename="fixture.png", display_name="Image", storage_key="synthetic-private-path", hash_sha256="a" * 64),
        ProjectColumn(id="c", production_id="p", key="notes", label="Private fixture column", default_value="synthetic deleted default"),
        SavedView(id="shared", production_id="p", name="Shared", is_shared=True, config={"visible_columns": ["name", "custom:notes"]}),
        SavedView(id="private", production_id="p", name="Private", is_shared=False, config={"private": "not in project versions"})])
    await db.flush()
    db.add_all([Panel(id="panel", shot_id="s", asset_id="a"),
        ProductionStep(id="step", shot_id="s", notes="Step", input_asset_id="a"),
        ShotAssetLink(id="link", shot_id="s", asset_id="a"),
        AssetVersion(id="av", asset_id="a", version_number=1, storage_key="synthetic-private-version-path", mime_type="image/png", hash_sha256="a" * 64),
        ShotColumnValue(id="v", production_id="p", shot_id="s", column_id="c", value=None),
        Comment(id="comment", production_id="p", shot_id="s", user_id="u", body="Comment", quote_field="custom:notes", quote_text="synthetic deleted quote")])
    await db.flush()
    return user


async def commit(db, user, head=None, branch="main"):
    state = await Service.working_state(db, "p", user)
    return await Service.create_commit(db, "p", ProjectCommitCreate(message="Fixture commit", branch_name=branch,
        expected_head_id=head, expected_state_hash=state["state_hash"]), user)


@pytest.mark.asyncio
async def test_project_capture_commit_branch_diff_scope_noop_and_conflicts():
    async with AsyncSessionLocal() as db:
        user = await fixture(db)
        first = await commit(db, user)
        snapshot = first.snapshot["sections"]
        assert set(snapshot["shots"]) == {"s"}
        assert snapshot["values"]["v"]["value"] is None
        assert snapshot["shots"]["s"]["camera_movement"] == {}
        assert snapshot["shots"]["s"]["timing_locked"] is False
        assert {"panels", "steps", "comments", "assets", "asset_versions", "asset_links", "views"} <= snapshot.keys()
        assert set(snapshot["views"]) == {"shared"}
        assert "synthetic-private" not in json.dumps(snapshot)
        assert "moodboard" not in snapshot
        assert await commit(db, user, first.id) is first
        branch = await Service.create_branch(db, "p", ProjectBranchCreate(name="camera", from_commit_id=first.id), user)
        assert branch.head_id == first.id
        stale = (await Service.working_state(db, "p", user))["state_hash"]
        shot = await db.get(Shot, "s")
        shot.name = "Second"
        panel = await db.get(Panel, "panel")
        panel.description = "Reframed"
        comment = await db.get(Comment, "comment")
        comment.body = "New comment"
        await db.flush()
        with pytest.raises(ConflictError):
            await Service.create_commit(db, "p", ProjectCommitCreate(message="stale", expected_head_id=first.id, expected_state_hash=stale), user)
        second = await commit(db, user, first.id)
        assert second.parent_id == first.id
        with pytest.raises(ConflictError):
            await commit(db, user, first.id)
        compared = await Service.compare(db, "p", first.id, user, second.id, "s")
        assert {(row["section"], row["field"]) for row in compared["changes"]} >= {("shots", "name"), ("panels", "description"), ("comments", "body")}
        assert any(row["lines"][0]["kind"] == "replace" for row in compared["changes"])
        graph = await Service.graph(db, "p", user, limit=1)
        assert len(graph["commits"]) == 1 and graph["next_before_id"]
        older = await Service.graph(db, "p", user, limit=1, before_id=graph["next_before_id"])
        assert older["commits"][0].id == first.id
        camera_commit = await commit(db, user, first.id, "camera")
        assert camera_commit.parent_id == first.id
        assert (await Service.graph(db, "p", user))["branches"][0].head_id == camera_commit.id
        assert len(list((await db.execute(select(OutboxEvent).where(OutboxEvent.event_type == "project.version.commit"))).scalars())) == 3
        no_role = User(id="denied", email="denied@example.com", password_hash="synthetic", role=Role(name="denied", permissions={}))
        with pytest.raises(DomainError, match="权限"):
            await Service.working_state(db, "p", no_role)
        with pytest.raises(DomainError, match="不存在"):
            await Service.detail(db, "other", first.id, user)
        await db.commit()


@pytest.mark.asyncio
async def test_permanent_column_purge_redacts_commit_values_defaults_and_quotes():
    async with AsyncSessionLocal() as db:
        user = await fixture(db)
        first = await commit(db, user)
        original_hash = first.content_hash
        column = await db.get(ProjectColumn, "c")
        from datetime import datetime, timezone
        column.state, column.deleted_at = "trashed", datetime.now(timezone.utc)
        await db.flush()
        assert await CustomFieldService.purge_field(db, "p", "c", CustomFieldPurgeRequest(revision=1), user)
        assert first.redaction_revision == 1
        assert first.content_hash != original_hash
        assert "c" not in first.snapshot["sections"]["columns"]
        assert not first.snapshot["sections"]["values"]
        assert first.snapshot["sections"]["comments"]["comment"]["quote_text"] == ""
        assert "synthetic deleted" not in json.dumps(first.snapshot)
        assert first.content_hash == content_hash(first.snapshot)
        working = await capture_project(db, "p")
        assert "c" not in working["sections"]["columns"]
        assert "synthetic deleted" not in json.dumps(working)
        assert (await db.get(Comment, "comment")).revision == 2
        await db.commit()


def test_split_diff_keeps_line_numbers_and_fold_counts():
    old = "\n".join(str(n) for n in range(20))
    new = old.replace("\n10\n", "\nchanged\n")
    lines = split_lines(old, new)
    assert any(row["kind"] == "fold" and row["unchanged_lines"] > 0 for row in lines)
    assert next(row for row in lines if row["kind"] == "replace") == {
        "kind": "replace", "left_line": 11, "right_line": 11, "before": "10", "after": "changed"}
