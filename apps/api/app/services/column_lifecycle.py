"""Pure helpers for keeping stale column-layout documents tombstone-safe."""
from __future__ import annotations

import copy

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.field import ColumnPreference, ProjectColumn


async def purged_column_keys(
    db: AsyncSession,
    production_id: str,
) -> set[str]:
    result = await db.execute(
        select(ColumnPreference.column_key).where(
            ColumnPreference.production_id == production_id,
            ColumnPreference.permanently_deleted.is_(True),
        )
    )
    blocked = set(result.scalars().all())
    columns = await db.execute(select(ProjectColumn.key).where(
        ProjectColumn.production_id == production_id, ProjectColumn.state == "purged",
    ))
    blocked.update(f"custom:{key}" for key in columns.scalars())
    return blocked


def sanitize_saved_view_config(
    config: dict,
    blocked_column_keys: set[str],
) -> tuple[dict, bool]:
    """Remove permanently-deleted columns from known Saved View projections.

    This runs on Saved View create/update and again during purge. A stale
    browser may submit an old layout, but the server never persists a purged
    key back into a view.
    """
    blocked_column_keys = blocked_column_keys | {"original_number", "original_description", "panel_frame", "movement_reference"}
    next_config = copy.deepcopy(config)
    changed = False

    def remove_from_list(container: dict, key: str) -> None:
        nonlocal changed
        value = container.get(key)
        if not isinstance(value, list):
            return
        filtered = [item for item in value if item not in blocked_column_keys]
        if filtered != value:
            container[key] = filtered
            changed = True

    def remove_from_map(container: dict, key: str) -> None:
        nonlocal changed
        value = container.get(key)
        if not isinstance(value, dict):
            return
        filtered = {
            item_key: item_value
            for item_key, item_value in value.items()
            if item_key not in blocked_column_keys
        }
        if filtered != value:
            container[key] = filtered
            changed = True

    presentation = next_config.get("presentation")
    if isinstance(presentation, dict):
        for key in ("columnOrder", "displayOrder", "hiddenColumns", "visibleColumns", "columns"):
            remove_from_list(presentation, key)
        for key in ("columnWidths", "columnLabels", "columnFormats", "widths"):
            remove_from_map(presentation, key)

    custom_columns = next_config.get("customColumns")
    if isinstance(custom_columns, dict):
        for key in ("order", "hidden", "visible", "columns"):
            remove_from_list(custom_columns, key)
        for key in ("widths", "columnWidths"):
            remove_from_map(custom_columns, key)

    sort_config = next_config.get("sort")
    if (
        isinstance(sort_config, dict)
        and sort_config.get("key") in blocked_column_keys
    ):
        sort_config = dict(sort_config)
        sort_config["key"] = "default"
        sort_config["direction"] = "asc"
        next_config["sort"] = sort_config
        changed = True

    return next_config, changed
