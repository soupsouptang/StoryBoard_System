#!/usr/bin/env python3
"""Read-only SQLite schema inventory for offline migration rehearsals.

This tool never runs migrations or writes to the inspected database. It can
compare a before/after copy without exposing application row contents.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sqlite3
from contextlib import closing
from pathlib import Path


def _quoted(name: str) -> str:
    return '"' + name.replace('"', '""') + '"'


def inventory(database: Path, *, include_counts: bool = False) -> dict:
    database = Path(database).resolve(strict=True)
    if not database.is_file():
        raise ValueError(f"not a database file: {database}")
    with closing(sqlite3.connect(database.as_uri() + "?mode=ro", uri=True)) as db:
        db.execute("PRAGMA query_only=ON")
        objects = [
            {"type": row[0], "name": row[1], "table": row[2],
             "sql_sha256": hashlib.sha256((row[3] or "").encode()).hexdigest()}
            for row in db.execute(
                "SELECT type, name, tbl_name, sql FROM sqlite_master "
                "WHERE name NOT LIKE 'sqlite_%' ORDER BY type, name"
            )
        ]
        tables = {}
        for obj in objects:
            if obj["type"] != "table":
                continue
            name = obj["name"]
            columns = [
                {"name": row[1], "type": row[2], "not_null": bool(row[3]),
                 "default": row[4], "primary_key": row[5], "hidden": row[6]}
                for row in db.execute(f"PRAGMA table_xinfo({_quoted(name)})")
            ]
            foreign_keys = [list(row) for row in db.execute(f"PRAGMA foreign_key_list({_quoted(name)})")]
            indexes = [row[1] for row in db.execute(f"PRAGMA index_list({_quoted(name)})")]
            entry = {"columns": columns, "foreign_keys": foreign_keys, "indexes": sorted(indexes)}
            if include_counts:
                entry["row_count"] = db.execute(f"SELECT COUNT(*) FROM {_quoted(name)}").fetchone()[0]
            tables[name] = entry
        version = None
        if "schema_migrations" in tables:
            version = db.execute("SELECT MAX(version) FROM schema_migrations").fetchone()[0]
        definition = {"objects": objects, "tables": tables, "schema_version": version}
        fingerprint_input = {
            "objects": objects,
            "tables": {name: {key: value for key, value in entry.items() if key != "row_count"}
                       for name, entry in tables.items()},
            "schema_version": version,
        }
        definition["schema_sha256"] = hashlib.sha256(
            json.dumps(fingerprint_input, sort_keys=True, ensure_ascii=False).encode()
        ).hexdigest()
        return definition


def compare(before: dict, after: dict) -> dict:
    old_tables, new_tables = before["tables"], after["tables"]
    shared = old_tables.keys() & new_tables.keys()
    return {
        "same_schema": before["schema_sha256"] == after["schema_sha256"],
        "added_tables": sorted(new_tables.keys() - old_tables.keys()),
        "removed_tables": sorted(old_tables.keys() - new_tables.keys()),
        "changed_tables": sorted(name for name in shared if
                                 {key: value for key, value in old_tables[name].items() if key != "row_count"} !=
                                 {key: value for key, value in new_tables[name].items() if key != "row_count"}),
        "row_count_changes": {name: [old_tables[name]["row_count"], new_tables[name]["row_count"]]
                              for name in sorted(shared)
                              if "row_count" in old_tables[name] and "row_count" in new_tables[name]
                              and old_tables[name]["row_count"] != new_tables[name]["row_count"]},
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("database", type=Path, help="Existing offline SQLite database or copy")
    parser.add_argument("--compare", type=Path, help="Existing after-migration database copy")
    parser.add_argument("--counts", action="store_true", help="Include table row counts, never row contents")
    args = parser.parse_args()
    before = inventory(args.database, include_counts=args.counts)
    result = {"database": str(args.database.resolve()), "inventory": before}
    if args.compare:
        after = inventory(args.compare, include_counts=args.counts)
        result["compare_database"] = str(args.compare.resolve())
        result["comparison"] = compare(before, after)
        result["after_inventory"] = after
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
