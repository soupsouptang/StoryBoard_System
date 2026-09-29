"""Dependency-light contract for ShotService Trash commands."""

import ast
import asyncio
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace
import unittest


class _Field:
    def __eq__(self, other):
        return True

    def in_(self, values):
        return True

    def is_(self, other):
        return True

    def is_not(self, other):
        return True


class _Shot:
    id = _Field()
    deleted_at = _Field()

    def __init__(self, shot_id, production_id, *, deleted=False):
        self.id = shot_id
        self.production_id = production_id
        self.deleted_at = datetime(2026, 1, 1, tzinfo=timezone.utc) if deleted else None
        self.updated_at = datetime(2026, 1, 1, tzinfo=timezone.utc)
        self.revision = 2


class _Select:
    def where(self, *conditions):
        return self


class _Result:
    def __init__(self, rows):
        self.rows = rows

    def scalar_one_or_none(self):
        return self.rows[0] if self.rows else None

    def scalars(self):
        return SimpleNamespace(all=lambda: self.rows)


class _Session:
    def __init__(self, rows):
        self.rows = rows
        self.flush_count = 0
        self.delete_count = 0

    async def execute(self, statement):
        return _Result(self.rows)

    async def flush(self):
        self.flush_count += 1

    async def delete(self, shot):
        self.delete_count += 1
        self.rows = [row for row in self.rows if row is not shot]


class _DomainError(Exception):
    def __init__(self, message, code="DOMAIN_ERROR"):
        self.code = code
        super().__init__(message)


class _ConflictError(Exception):
    def __init__(self, message, details):
        self.details = details
        super().__init__(message)


def _service_class():
    source = Path(__file__).resolve().parents[2] / "apps" / "api" / "app" / "services" / "shot_service.py"
    module = ast.parse(source.read_text(encoding="utf-8"), filename=str(source))
    service_node = next(node for node in module.body if isinstance(node, ast.ClassDef) and node.name == "ShotService")
    isolated = ast.fix_missing_locations(ast.Module(body=[service_node], type_ignores=[]))
    namespace = {
        "AsyncSession": object,
        "ShotCreate": object,
        "ShotPatch": object,
        "BulkUpdateShotsRequest": object,
        "Shot": _Shot,
        "select": lambda model: _Select(),
        "NotFoundError": LookupError,
        "DomainError": _DomainError,
        "ConflictError": _ConflictError,
        "datetime": datetime,
        "timezone": timezone,
    }
    exec(compile(isolated, str(source), "exec"), namespace)
    return namespace["ShotService"]


class ShotServiceTrashContractTest(unittest.TestCase):
    def test_bulk_trash_is_atomic_scope_checked_and_idempotent(self):
        service = _service_class()
        active = _Shot("shot-a", "production-1")
        already_trashed = _Shot("shot-b", "production-1", deleted=True)
        db = _Session([active, already_trashed])

        result = asyncio.run(
            service.bulk_trash_shots(
                db,
                "production-1",
                ["shot-a", "shot-b", "shot-a"],
                "editor-1",
            )
        )

        self.assertEqual(result["moved_count"], 1)
        self.assertEqual(result["already_trashed_count"], 1)
        self.assertIsNotNone(active.deleted_at)
        self.assertEqual(db.flush_count, 1)

        foreign = _Shot("shot-c", "production-2")
        scoped_db = _Session([active, foreign])
        original_deleted_at = foreign.deleted_at

        with self.assertRaises(_ConflictError):
            asyncio.run(
                service.bulk_trash_shots(
                    scoped_db,
                    "production-1",
                    ["shot-a", "shot-c"],
                    "editor-1",
                )
            )

        self.assertEqual(foreign.deleted_at, original_deleted_at)
        self.assertEqual(scoped_db.flush_count, 0)

    def test_restore_and_purge_have_explicit_trash_semantics(self):
        service = _service_class()
        shot = _Shot("shot-a", "production-1", deleted=True)
        db = _Session([shot])

        restored = asyncio.run(service.restore_shot(db, shot.id, "editor-1"))
        self.assertIs(restored, shot)
        self.assertIsNone(shot.deleted_at)
        self.assertEqual(shot.revision, 3)

        shot.deleted_at = datetime(2026, 1, 2, tzinfo=timezone.utc)
        self.assertTrue(asyncio.run(service.purge_shot(db, shot.id, "editor-1")))
        self.assertEqual(db.delete_count, 1)


if __name__ == "__main__":
    unittest.main()
