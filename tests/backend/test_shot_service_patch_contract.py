"""Dependency-light runtime contracts for canonical ShotService mutations.

The service class is compiled from its real source so focused revision,
conflict and no-op rules can run without opening a database.
"""

import ast
import asyncio
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace
import unittest


class _Field:
    def __eq__(self, other):
        return True

    def is_(self, other):
        return True

    def is_not(self, other):
        return True

    def in_(self, other):
        return True


class _Shot:
    id = _Field()
    deleted_at = _Field()

    def __init__(self, shot_id="shot-1", revision=3, department="camera"):
        self.id = shot_id
        self.production_id = "production-1"
        self.created_by = "creator-1"
        self.created_at = datetime(2026, 1, 1, tzinfo=timezone.utc)
        self.updated_at = self.created_at
        self.deleted_at = None
        self.sort_index = 1000.0
        self.current_version = 1
        self.revision = revision
        self.name = "Original"
        self.department = department
        self.panels = []


class _Select:
    def where(self, *conditions):
        return self


class _Scalars:
    def __init__(self, shots):
        self._shots = shots

    def all(self):
        return list(self._shots)


class _Result:
    def __init__(self, shots):
        self._shots = shots

    def scalar_one_or_none(self):
        return self._shots[0] if self._shots else None

    def scalars(self):
        return _Scalars(self._shots)


class _Session:
    def __init__(self, shots):
        self.shots = shots if isinstance(shots, list) else [shots]
        self.flush_count = 0
        self.deleted = []

    async def execute(self, statement):
        return _Result(self.shots)

    async def flush(self):
        self.flush_count += 1

    async def delete(self, entity):
        self.deleted.append(entity)


class _DomainError(Exception):
    def __init__(self, message, code="INTERNAL_ERROR"):
        self.message = message
        self.code = code
        super().__init__(message)


class _NotFoundError(_DomainError):
    pass


class _ConflictError(_DomainError):
    def __init__(self, message, details):
        self.details = details
        super().__init__(message, code="CONFLICT")


def _service_class():
    source = Path(__file__).resolve().parents[2] / "apps" / "api" / "app" / "services" / "shot_service.py"
    module = ast.parse(source.read_text(encoding="utf-8"), filename=str(source))
    service_node = next(
        node for node in module.body
        if isinstance(node, ast.ClassDef) and node.name == "ShotService"
    )
    isolated = ast.fix_missing_locations(ast.Module(body=[service_node], type_ignores=[]))
    namespace = {
        "AsyncSession": object,
        "ShotCreate": object,
        "ShotPatch": object,
        "BulkUpdateShotsRequest": object,
        "Shot": _Shot,
        "select": lambda model: _Select(),
        "NotFoundError": _NotFoundError,
        "DomainError": _DomainError,
        "ConflictError": _ConflictError,
        "datetime": datetime,
        "timezone": timezone,
    }
    exec(compile(isolated, str(source), "exec"), namespace)
    return namespace["ShotService"]


class ShotServiceMutationContractTest(unittest.TestCase):
    def test_system_owned_fields_and_relationships_cannot_be_patched(self):
        shot = _Shot()
        db = _Session(shot)
        request = SimpleNamespace(revision=3, changes={
            "id": "other-shot",
            "production_id": "other-production",
            "created_by": "attacker",
            "created_at": datetime(2030, 1, 1, tzinfo=timezone.utc),
            "updated_at": datetime(2030, 1, 1, tzinfo=timezone.utc),
            "deleted_at": datetime(2030, 1, 1, tzinfo=timezone.utc),
            "sort_index": 1.0,
            "current_version": 99,
            "revision": 99,
            "panels": ["forged"],
        })
        result = asyncio.run(_service_class().patch_shot(db, shot.id, request, "editor-1"))
        self.assertIs(result, shot)
        self.assertEqual((shot.id, shot.production_id, shot.created_by),
                         ("shot-1", "production-1", "creator-1"))
        self.assertEqual((shot.revision, shot.current_version, shot.sort_index), (3, 1, 1000.0))
        self.assertIsNone(shot.deleted_at)
        self.assertEqual(shot.panels, [])
        self.assertEqual(db.flush_count, 0)

    def test_noop_patch_does_not_increment_revision(self):
        shot = _Shot()
        db = _Session(shot)
        request = SimpleNamespace(revision=3, changes={"name": "Original"})
        result = asyncio.run(_service_class().patch_shot(db, shot.id, request, "editor-1"))
        self.assertIs(result, shot)
        self.assertEqual(shot.revision, 3)
        self.assertEqual(db.flush_count, 0)

    def test_editable_field_increments_revision_once_and_stale_edit_conflicts(self):
        shot = _Shot()
        db = _Session(shot)
        service = _service_class()
        request = SimpleNamespace(revision=3, changes={"name": "Revised", "created_by": "attacker"})
        result = asyncio.run(service.patch_shot(db, shot.id, request, "editor-1"))
        self.assertIs(result, shot)
        self.assertEqual((shot.name, shot.created_by, shot.revision), ("Revised", "creator-1", 4))
        self.assertEqual(db.flush_count, 1)
        with self.assertRaises(_ConflictError) as conflict:
            asyncio.run(service.patch_shot(db, shot.id, request, "editor-2"))
        self.assertEqual(
            conflict.exception.details,
            {"server_revision": 4, "client_revision": 3},
        )
        self.assertEqual(db.flush_count, 1)

    def test_bulk_requires_revisions_and_noop_is_revision_safe(self):
        shots = [
            _Shot("shot-1", revision=3, department="art"),
            _Shot("shot-2", revision=5, department="art"),
        ]
        db = _Session(shots)
        service = _service_class()

        missing_revisions = SimpleNamespace(
            shot_ids=["shot-1", "shot-2"],
            updates={"department": "art"},
            revisions={},
        )
        with self.assertRaises(_DomainError) as error:
            asyncio.run(service.bulk_update_shots(db, missing_revisions, "editor-1"))
        self.assertEqual(error.exception.code, "BULK_REVISION_REQUIRED")

        request = SimpleNamespace(
            shot_ids=["shot-1", "shot-2"],
            updates={"department": "art"},
            revisions={"shot-1": 3, "shot-2": 5},
        )
        result = asyncio.run(service.bulk_update_shots(db, request, "editor-1"))
        self.assertEqual(result, {"ok": True, "updated_count": 0, "unchanged_count": 2})
        self.assertEqual([shot.revision for shot in shots], [3, 5])
        self.assertEqual(db.flush_count, 0)

    def test_bulk_conflict_is_checked_before_any_mutation(self):
        shots = [
            _Shot("shot-1", revision=3, department="camera"),
            _Shot("shot-2", revision=5, department="camera"),
        ]
        db = _Session(shots)
        request = SimpleNamespace(
            shot_ids=["shot-1", "shot-2"],
            updates={"department": "art"},
            revisions={"shot-1": 3, "shot-2": 4},
        )

        with self.assertRaises(_ConflictError) as conflict:
            asyncio.run(_service_class().bulk_update_shots(db, request, "editor-1"))

        self.assertEqual(
            conflict.exception.details,
            {"shot_id": "shot-2", "server_revision": 5, "client_revision": 4},
        )
        self.assertEqual([shot.department for shot in shots], ["camera", "camera"])
        self.assertEqual([shot.revision for shot in shots], [3, 5])
        self.assertEqual(db.flush_count, 0)

    def test_bulk_changed_rows_increment_once_and_flush_once(self):
        shots = [
            _Shot("shot-1", revision=3, department="camera"),
            _Shot("shot-2", revision=5, department="stock"),
        ]
        db = _Session(shots)
        request = SimpleNamespace(
            shot_ids=["shot-1", "shot-2"],
            updates={"department": "art"},
            revisions={"shot-1": 3, "shot-2": 5},
        )

        result = asyncio.run(_service_class().bulk_update_shots(db, request, "editor-1"))

        self.assertEqual(result, {"ok": True, "updated_count": 2, "unchanged_count": 0})
        self.assertEqual([shot.department for shot in shots], ["art", "art"])
        self.assertEqual([shot.revision for shot in shots], [4, 6])
        self.assertEqual(db.flush_count, 1)


if __name__ == "__main__":
    unittest.main()
