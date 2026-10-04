from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "apps" / "api"))
sys.path.insert(0, str(ROOT / "storyboard-system"))

from app.services.portable_project import map_portable_project
from portable_project_export import export_portable_project


class PortableProjectContractTests(unittest.TestCase):
    def test_legacy_export_matches_versioned_fixture_and_maps_in_vnext(self):
        legacy_bundle = {
            "project": {"name": "Synthetic Bridge Project", "fps": 24, "is_drop_frame": False, "start_tc": "01:00:00:00"},
            "sequences": [{"id": "legacy-sequence-a", "name": "Opening"}],
            "shots": [{
                "id": "legacy-shot-a", "sequence_id": "legacy-sequence-a", "display_number": "001",
                "name": "Synthetic establishing shot", "description": "A quiet sunrise over an empty studio set.",
                "voice_over": "The day begins.", "duration_frames": 48, "shot_size": "Wide",
            }],
        }
        exported = export_portable_project(legacy_bundle)
        fixture_path = ROOT / "tests" / "fixtures" / "portable-project" / "v1" / "minimal.json"
        fixture = json.loads(fixture_path.read_text(encoding="utf-8"))
        self.assertEqual(exported, fixture)

        mapped = map_portable_project(json.dumps(exported, ensure_ascii=False).encode("utf-8"))
        self.assertEqual(mapped["name"], "Synthetic Bridge Project")
        self.assertEqual(mapped["sequences"], [{"id": "sequence-0001", "name": "Opening"}])
        self.assertEqual(mapped["shots"][0]["sequence_id"], "sequence-0001")
        self.assertEqual(mapped["shots"][0]["duration_frames"], 48)
        self.assertEqual(mapped["shots"][0]["voiceover"], "The day begins.")

    def test_unknown_version_and_broken_sequence_reference_are_rejected(self):
        fixture_path = ROOT / "tests" / "fixtures" / "portable-project" / "v1" / "minimal.json"
        fixture = json.loads(fixture_path.read_text(encoding="utf-8"))
        unknown_version = {**fixture, "version": 2}
        with self.assertRaisesRegex(ValueError, "version"):
            map_portable_project(json.dumps(unknown_version).encode())
        broken_reference = json.loads(json.dumps(fixture))
        broken_reference["shots"][0]["sequence_id"] = "missing"
        with self.assertRaisesRegex(ValueError, "unknown sequence"):
            map_portable_project(json.dumps(broken_reference).encode())


if __name__ == "__main__":
    unittest.main()
