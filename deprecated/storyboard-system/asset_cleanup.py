"""Read-only asset reference classification used by cleanup previews."""

import sqlite3
import time


def asset_usage_reasons(db: sqlite3.Connection, project_id: str, asset_id: str) -> list[str]:
    """Return durable references that make an asset unsafe to delete."""
    reasons: list[str] = []

    if db.execute("""
        SELECT 1
        FROM panels p JOIN shots s ON s.id=p.shot_id
        WHERE s.project_id=? AND p.media_id=?
        LIMIT 1
    """, (project_id, asset_id)).fetchone():
        reasons.append("panel")

    if db.execute("""
        SELECT 1
        FROM shot_asset_links l JOIN shots s ON s.id=l.shot_id
        WHERE s.project_id=? AND l.asset_id=?
          AND (
              l.role<>'Reference'
              OR EXISTS (
                  SELECT 1 FROM panels p
                  WHERE p.shot_id=l.shot_id AND p.media_id=l.asset_id
              )
          )
        LIMIT 1
    """, (project_id, asset_id)).fetchone():
        reasons.append("shot_link")

    if db.execute("""
        SELECT 1
        FROM production_steps ps JOIN shots s ON s.id=ps.shot_id
        WHERE s.project_id=? AND (ps.input_asset=? OR ps.output_asset=?)
        LIMIT 1
    """, (project_id, asset_id, asset_id)).fetchone():
        reasons.append("production_step")

    if db.execute("""
        SELECT 1 FROM project_creative_boards
        WHERE project_id=? AND instr(data_json,?)>0
        LIMIT 1
    """, (project_id, asset_id)).fetchone():
        reasons.append("creative_board")

    if db.execute("""
        SELECT 1
        FROM shot_versions sv JOIN shots s ON s.id=sv.shot_id
        WHERE s.project_id=?
          AND (sv.asset_id=? OR instr(sv.snapshot_json,?)>0)
        LIMIT 1
    """, (project_id, asset_id, asset_id)).fetchone():
        reasons.append("shot_version")

    if db.execute("""
        SELECT 1 FROM project_snapshots
        WHERE project_id=? AND instr(snapshot_json,?)>0
        LIMIT 1
    """, (project_id, asset_id)).fetchone():
        reasons.append("project_snapshot")

    # An asset can also be the source for another asset's derived metadata.
    # Keep this consistent with orphan cleanup, which protects such links.
    if db.execute("""
        SELECT 1 FROM assets
        WHERE id<>? AND instr(metadata_json,?)>0
        LIMIT 1
    """, (asset_id, asset_id)).fetchone():
        reasons.append("asset_metadata")

    now_epoch = int(time.time())
    if db.execute("""
        SELECT 1 FROM share_links
        WHERE project_id=?
          AND revoked_at IS NULL
          AND (expires_at IS NULL OR expires_at>=?)
          AND instr(snapshot_json,?)>0
        LIMIT 1
    """, (project_id, now_epoch, asset_id)).fetchone():
        reasons.append("active_share")

    return reasons


def project_asset_cleanup_plan(db: sqlite3.Connection, project_id: str) -> dict:
    """Classify assets with the same protection rules used by permanent cleanup.

    This function is read-only. Legacy Reference links that cleanup will prune
    are ignored here so a preview predicts the following DELETE exactly.
    """
    assets = db.execute(
        "SELECT id, filename, mime, size, created_at FROM assets WHERE project_id=? ORDER BY created_at, id",
        (project_id,),
    ).fetchall()
    deletable = []
    protected = []
    for row in assets:
        item = {"id": row["id"], "filename": row["filename"], "mime": row["mime"], "size": int(row["size"] or 0)}
        reasons = asset_usage_reasons(db, project_id, row["id"])
        if reasons:
            protected.append({**item, "reasons": reasons})
        else:
            deletable.append(item)
    stale_links = int(db.execute("""
        SELECT COUNT(*) AS n
        FROM shot_asset_links l JOIN shots s ON s.id=l.shot_id
        WHERE s.project_id=? AND l.role='Reference'
          AND NOT EXISTS (
              SELECT 1 FROM panels p
              WHERE p.shot_id=l.shot_id AND p.media_id=l.asset_id
          )
    """, (project_id,)).fetchone()["n"] or 0)
    return {
        "total": len(assets),
        "deletable_count": len(deletable),
        "protected_count": len(protected),
        "stale_links_to_prune": stale_links,
        "deletable": deletable,
        "protected": protected,
    }
