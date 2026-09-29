#!/usr/bin/env python3
"""Compare base/head PNG visual evidence and emit amplified diff images."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageEnhance

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-dir", required=True)
    parser.add_argument("--head-dir", required=True)
    parser.add_argument("--diff-dir", required=True)
    parser.add_argument("--allow-visual-change", action="store_true")
    parser.add_argument("--threshold", type=float, default=0.005)
    args = parser.parse_args()

    base_dir = Path(args.base_dir)
    head_dir = Path(args.head_dir)
    diff_dir = Path(args.diff_dir)
    diff_dir.mkdir(parents=True, exist_ok=True)

    errors: list[str] = []
    report: dict[str, dict] = {}

    base_images = {p.name: p for p in base_dir.glob("*.png")}
    head_images = {p.name: p for p in head_dir.glob("*.png")}
    names = sorted(set(base_images) | set(head_images))

    if not names:
        errors.append("no visual PNG snapshots found")

    for name in names:
        if name not in base_images or name not in head_images:
            errors.append(f"snapshot set mismatch: {name}")
            continue

        with Image.open(base_images[name]).convert("RGB") as base, Image.open(head_images[name]).convert("RGB") as head:
            if base.size != head.size:
                report[name] = {"base_size": base.size, "head_size": head.size, "changed_fraction": 1.0}
                errors.append(f"{name}: dimensions changed {base.size} -> {head.size}")
                continue

            diff = ImageChops.difference(base, head)
            gray = diff.convert("L")
            histogram = gray.histogram()
            changed = sum(histogram[1:])
            total = base.size[0] * base.size[1]
            fraction = changed / total if total else 0.0
            report[name] = {
                "size": base.size,
                "changed_pixels": changed,
                "total_pixels": total,
                "changed_fraction": fraction,
            }
            ImageEnhance.Contrast(diff).enhance(4.0).save(diff_dir / name)

            if not args.allow_visual_change and fraction > args.threshold:
                errors.append(
                    f"{name}: unexpected visual drift {fraction:.3%} exceeds {args.threshold:.3%}"
                )

    # Layout metric drift is always useful evidence; only block undeclared visual changes.
    for metric in sorted(base_dir.glob("*.json")):
        peer = head_dir / metric.name
        if not peer.exists():
            errors.append(f"layout metric set mismatch: {metric.name}")
            continue
        before = json.loads(metric.read_text(encoding="utf-8"))
        after = json.loads(peer.read_text(encoding="utf-8"))
        if not args.allow_visual_change and before != after:
            errors.append(f"{metric.name}: layout metrics changed without a UI-scope change")

    (diff_dir / "report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")

    if errors:
        print("FRAMEFORGE visual regression guard FAILED:", file=sys.stderr)
        for error in errors:
            print(f" - {error}", file=sys.stderr)
        return 1

    mode = "evidence-only for declared UI change" if args.allow_visual_change else "blocking regression mode"
    print(f"PASS: visual comparison complete ({mode}); {len(report)} images compared")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
