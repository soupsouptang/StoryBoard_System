"""Read-only source inventory and row-count checks for migration rehearsals.

This module does not copy data, verify row contents/references or authorize a
PostgreSQL cutover. Unmapped source tables remain explicit migration blockers.
"""

from __future__ import annotations

import sqlite3
from dataclasses import dataclass
from typing import Any, Dict, List, Tuple


@dataclass
class MigrationSummary:
    tables_checked: int
    rows_migrated: Dict[str, int]
    mismatches: List[Dict[str, Any]]
    success: bool


# Source names from server.SCHEMA and creative_boards.SCHEMA. None means the
# canonical VAPI has no corresponding persistent owner yet; never guess one.
TABLE_NAME_MAP = {
    "users": "users",
    "sessions": None,
    "projects": "productions",
    "sequences": "sequences",
    "shots": "shots",
    "panels": "panels",
    "production_steps": "production_steps",
    "assets": "assets",
    "asset_versions": "asset_versions",
    "shot_asset_links": "shot_asset_links",
    "shot_versions": "shot_versions",
    "project_snapshots": None,
    "comments": "comments",
    "review_decisions": "review_decisions",
    "share_links": "shares",
    "custom_field_definitions": "custom_field_definitions",
    "shot_custom_field_values": "shot_custom_field_values",
    "shot_change_events": None,
    "saved_views": "saved_views",
    "project_column_preferences": "column_preferences",
    "notifications": None,
    "audit_log": "audit_logs",
    "login_attempts": None,
    "project_creative_boards": None,
}
CORE_TABLES = list(TABLE_NAME_MAP)


class MigrationInventoryError(ValueError):
    def __init__(self, missing_tables: List[str]):
        self.details = {"code": "MISSING_SOURCE_TABLES", "missing_tables": missing_tables}
        super().__init__(f"Missing required SQLite tables: {', '.join(missing_tables)}")


def inventory_sqlite(sqlite_conn: sqlite3.Connection) -> Dict[str, int]:
    """Count every non-internal source table; missing required tables fail closed."""
    tables = {row[0] for row in sqlite_conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT GLOB 'sqlite_*'"
    )}
    missing_tables = sorted(set(CORE_TABLES) - tables)
    if missing_tables:
        raise MigrationInventoryError(missing_tables)
    counts: Dict[str, int] = {}
    for table in sorted(tables):
        quoted = '"' + table.replace('"', '""') + '"'
        counts[table] = sqlite_conn.execute(f"SELECT COUNT(*) FROM {quoted}").fetchone()[0]
    return counts


def verify_row_counts(sqlite_counts: Dict[str, int], pg_counts: Dict[str, int]) -> Tuple[bool, List[Dict[str, Any]]]:
    """Check complete source counts against actual VAPI target table names.

    Issues are JSON-serializable dictionaries. Zero rows never stand in for
    missing tables/counts, and unknown source tables cannot disappear silently.
    """
    mismatches = []
    for table in sorted(set(CORE_TABLES) | set(sqlite_counts)):
        target = TABLE_NAME_MAP.get(table)
        context = {"source_table": table, "target_table": target}
        if table not in sqlite_counts:
            mismatches.append({"code": "MISSING_SOURCE_COUNT", **context})
        if target is None:
            mismatches.append({"code": "UNMAPPED_SOURCE_TABLE", **context})
        elif target not in pg_counts:
            mismatches.append({"code": "MISSING_TARGET_COUNT", **context})

        source_count = sqlite_counts.get(table)
        target_count = pg_counts.get(target) if target else None
        for side, count, present in (
            ("source", source_count, table in sqlite_counts),
            ("target", target_count, target in pg_counts),
        ):
            if present and (type(count) is not int or count < 0):
                mismatches.append({"code": "INVALID_ROW_COUNT", "side": side, **context})
        if (type(source_count) is int and source_count >= 0
                and type(target_count) is int and target_count >= 0
                and source_count != target_count):
            mismatches.append({
                "code": "ROW_COUNT_MISMATCH", **context,
                "source_count": source_count, "target_count": target_count,
            })
    return len(mismatches) == 0, mismatches
