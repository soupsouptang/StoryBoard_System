"""Permanent deletion exception to immutable project commit content."""
from copy import deepcopy
from sqlalchemy import select
from app.models.collaboration import Comment
from app.models.shot import Shot
from app.models.project_version import ProjectCommit
from app.services.column_lifecycle import sanitize_saved_view_config
from app.services.project_snapshot import content_hash


async def redact_column_history(db, production_id: str, column_id: str, column_key: str):
    commits = (await db.execute(select(ProjectCommit).where(ProjectCommit.production_id == production_id).with_for_update())).scalars()
    for commit in commits:
        snapshot = deepcopy(commit.snapshot)
        sections = snapshot["sections"]
        changed = sections.get("columns", {}).pop(column_id, None) is not None
        for section, key, value in (("values", "column_id", column_id), ("column_preferences", "column_key", column_key)):
            rows = sections.get(section, {})
            for identity in list(rows):
                if rows[identity].get(key) == value:
                    del rows[identity]
                    changed = True
        for row in sections.get("views", {}).values():
            config, cleaned = sanitize_saved_view_config(row.get("config", {}), {column_key})
            if cleaned:
                row["config"] = config
                changed = True
        for row in sections.get("comments", {}).values():
            if row.get("quote_field") in {column_id, column_key, column_key.removeprefix("custom:")}:
                row["quote_field"] = ""
                row["quote_text"] = ""
                changed = True
        if changed:
            commit.snapshot = snapshot
            commit.content_hash = content_hash(snapshot)
            commit.redaction_revision += 1


async def redact_live_column_quotes(db, production_id: str, column_id: str, column_key: str, user):
    """Clear quoted column data too, so later commits cannot capture it again."""
    from app.services.review_service import ReviewService
    keys = {column_id, column_key, column_key.removeprefix("custom:")}
    scopes = (await db.execute(select(Comment.shot_id).where(Comment.production_id == production_id,
        Comment.quote_field.in_(keys)).distinct())).scalars().all()
    shots = {}
    for shot_id in sorted(identity for identity in scopes if identity is not None):
        shots[shot_id] = (await db.execute(select(Shot).where(Shot.id == shot_id).with_for_update()
            .execution_options(populate_existing=True))).scalar_one()
    comments = (await db.execute(select(Comment).where(Comment.production_id == production_id,
        Comment.quote_field.in_(keys)).order_by(Comment.id).with_for_update()
        .execution_options(populate_existing=True))).scalars()
    for comment in comments:
        comment.quote_field = ""
        comment.quote_text = ""
        comment.revision += 1
        if comment.shot_id:
            ReviewService._event(db, shots[comment.shot_id], comment, user, "edit")
