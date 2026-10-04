#!/usr/bin/env python3
"""Exercise SQLite backup and restore on an offline database copy.

The source is opened read-only. Both backup and restore live in a disposable
temporary directory; the report contains checksums and counts, never rows.
This does not back up media files or authorize a production migration.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sqlite3
import tempfile
from contextlib import closing
from pathlib import Path

if __package__:
    from .schema_inventory import inventory
else:
    from schema_inventory import inventory


def _open_read_only(path: Path) -> sqlite3.Connection:
    return sqlite3.connect(path.resolve(strict=True).as_uri() + "?mode=ro", uri=True)


def _data_digest(db: sqlite3.Connection) -> str:
    digest = hashlib.sha256()
    for statement in db.iterdump():
        digest.update(statement.encode("utf-8"))
        digest.update(b"\n")
    return digest.hexdigest()


def _health(path: Path) -> dict:
    with closing(_open_read_only(path)) as db:
        db.execute("PRAGMA query_only=ON")
        integrity = [row[0] for row in db.execute("PRAGMA integrity_check")]
        foreign_key_errors = sum(1 for _ in db.execute("PRAGMA foreign_key_check"))
        return {
            "integrity_ok": integrity == ["ok"],
            "foreign_key_errors": foreign_key_errors,
            "data_sha256": _data_digest(db),
        }


def rehearse(source: Path) -> dict:
    source = Path(source).resolve(strict=True)
    if not source.is_file():
        raise ValueError(f"not a database file: {source}")
    source_schema = inventory(source, include_counts=True)
    source_health = _health(source)
    with tempfile.TemporaryDirectory(prefix="frameforge-sqlite-rehearsal-") as directory:
        backup_path = Path(directory) / "backup.db"
        restored_path = Path(directory) / "restored.db"
        with closing(_open_read_only(source)) as original, closing(sqlite3.connect(backup_path)) as backup:
            original.backup(backup)
        with closing(_open_read_only(backup_path)) as backup, closing(sqlite3.connect(restored_path)) as restored:
            backup.backup(restored)
        restored_schema = inventory(restored_path, include_counts=True)
        restored_health = _health(restored_path)
    same_counts = {
        name: table["row_count"] for name, table in source_schema["tables"].items()
    } == {
        name: table["row_count"] for name, table in restored_schema["tables"].items()
    }
    return {
        "source": str(source),
        "schema_sha256": source_schema["schema_sha256"],
        "source_data_sha256": source_health["data_sha256"],
        "restored_data_sha256": restored_health["data_sha256"],
        "same_schema": source_schema["schema_sha256"] == restored_schema["schema_sha256"],
        "same_row_counts": same_counts,
        "same_data": source_health["data_sha256"] == restored_health["data_sha256"],
        "source_integrity_ok": source_health["integrity_ok"],
        "restored_integrity_ok": restored_health["integrity_ok"],
        "source_foreign_key_errors": source_health["foreign_key_errors"],
        "restored_foreign_key_errors": restored_health["foreign_key_errors"],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, help="Existing offline SQLite database copy")
    args = parser.parse_args()
    report = rehearse(args.source)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if not all((report["same_schema"], report["same_row_counts"], report["same_data"],
                report["source_integrity_ok"], report["restored_integrity_ok"],
                report["source_foreign_key_errors"] == 0,
                report["restored_foreign_key_errors"] == 0)):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
