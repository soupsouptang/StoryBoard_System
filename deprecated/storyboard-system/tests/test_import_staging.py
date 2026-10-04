"""Isolated checks for import previews and their private image files."""

import json
import tempfile
import unittest
from pathlib import Path

from import_staging import (
    cache_import_parse,
    cleanup_import_staging,
    load_import_parse,
    remove_staged_import,
    staged_image_bytes,
)


class ImportStagingTest(unittest.TestCase):
    def test_cache_keeps_image_out_of_preview_json_and_loads_it_safely(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            staged = root / "preview.xlsx"
            staged.write_bytes(b"workbook")
            cache_import_parse(staged, [["镜号"], ["001"]], [
                {"data_row": 1, "filename": "panel.png", "raw": b"image-bytes"},
            ])
            rows, records = load_import_parse(staged)
            self.assertEqual(rows[1], ["001"])
            self.assertNotIn("raw", records[0])
            self.assertEqual(staged_image_bytes(staged, records[0]), b"image-bytes")
            self.assertNotIn("image-bytes", staged.with_suffix(".parsed.json").read_text(encoding="utf-8"))
            with self.assertRaisesRegex(ValueError, "无效的预览图片路径"):
                staged_image_bytes(staged, {"raw_file": "../other.image-0"})
            remove_staged_import(staged, root)
            self.assertFalse(staged.exists())
            self.assertFalse(staged.with_suffix(".parsed.json").exists())
            self.assertFalse((root / "preview.image-0").exists())

    def test_expiry_only_removes_owned_preview_files(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            expired = root / "expired.xlsx"
            current = root / "current.xlsx"
            unrelated = root / "unrelated.txt"
            for path in (expired, current, unrelated):
                path.write_bytes(b"keep or remove")
            cache_import_parse(expired, [["镜号"]], [{"raw": b"image"}])
            (root / "expired.json").write_text(json.dumps({"created_at": 100, "stored_name": expired.name}), encoding="utf-8")
            (root / "current.json").write_text(json.dumps({"created_at": 950, "stored_name": current.name}), encoding="utf-8")
            (root / "unsafe.json").write_text(json.dumps({"created_at": 100, "stored_name": "../unrelated.txt"}), encoding="utf-8")
            cleanup_import_staging(root, ttl_seconds=100, now=1000)
            self.assertFalse(expired.exists())
            self.assertFalse((root / "expired.json").exists())
            self.assertFalse((root / "expired.image-0").exists())
            self.assertTrue(current.exists())
            self.assertTrue((root / "current.json").exists())
            self.assertTrue(unrelated.exists())
            self.assertFalse((root / "unsafe.json").exists())
            remove_staged_import(root.parent / "unrelated.txt", root)
            self.assertTrue(unrelated.exists())


if __name__ == "__main__":
    unittest.main()
