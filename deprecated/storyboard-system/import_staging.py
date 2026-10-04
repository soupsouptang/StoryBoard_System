"""Private import-preview staging and expiry operations.

The caller supplies the configured staging root and TTL so no application
configuration or database access is required here.
"""
from __future__ import annotations

import json
import re
import time
from pathlib import Path

from import_parsing import parse_pdf_storyboard, parse_xlsx_package


def cache_import_parse(staged: Path, rows: list, records: list) -> None:
    """Keep immutable parse results beside the staged source, never in preview JSON."""
    cached = []
    for index, record in enumerate(records):
        item = dict(record)
        raw = item.pop("raw", None)
        if raw is not None:
            binary = staged.with_name(f"{staged.stem}.image-{index}")
            binary.write_bytes(bytes(raw))
            item["raw_file"] = binary.name
        cached.append(item)
    staged.with_suffix(".parsed.json").write_text(json.dumps({"rows": rows, "records": cached}, ensure_ascii=False), encoding="utf-8")


def load_import_parse(staged: Path) -> tuple[list, list]:
    cached = staged.with_suffix(".parsed.json")
    if cached.exists():
        parsed = json.loads(cached.read_text(encoding="utf-8"))
        return parsed["rows"], parsed["records"]
    rows, records = parse_pdf_storyboard(staged) if staged.suffix.lower() == ".pdf" else parse_xlsx_package(staged)
    cache_import_parse(staged, rows, records)
    return load_import_parse(staged)


def staged_image_bytes(staged: Path, record: dict) -> bytes:
    binary = staged.parent / str(record.get("raw_file", ""))
    if (binary.parent != staged.parent
            or not re.fullmatch(re.escape(staged.stem) + r"\.image-\d+", binary.name)
            or binary.resolve().parent != staged.parent.resolve()):
        raise ValueError("无效的预览图片路径")
    return binary.read_bytes()


def cleanup_import_staging(import_root: Path, ttl_seconds: int, now: int | None = None) -> None:
    """Remove abandoned previews without touching committed project media."""
    now = now or int(time.time())
    if not import_root.exists():
        return
    for manifest_path in import_root.glob("*.json"):
        if manifest_path.name.endswith('.parsed.json'):
            continue
        try:
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            if now - int(manifest.get("created_at", 0)) <= ttl_seconds:
                continue
            staged = import_root / str(manifest.get("stored_name", ""))
            if staged.parent == import_root:
                remove_staged_import(staged, import_root)
            manifest_path.unlink()
        except (OSError, ValueError, TypeError, json.JSONDecodeError):
            continue


def remove_staged_import(staged: Path, import_root: Path) -> None:
    if staged.resolve().parent != import_root.resolve() or not re.fullmatch(r'[A-Za-z0-9_-]+', staged.stem):
        return
    targets = [staged, staged.with_suffix('.parsed.json')]
    targets.extend(target for target in staged.parent.glob(staged.stem + '.image-*')
                   if re.fullmatch(re.escape(staged.stem) + r'\.image-\d+', target.name))
    for target in targets:
        if target.is_file() and target.resolve().parent == import_root.resolve():
            target.unlink(missing_ok=True)


