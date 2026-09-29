#!/usr/bin/env python3
"""Reject destructive API contract changes relative to a base OpenAPI document."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

METHODS = {"get", "post", "put", "patch", "delete", "options", "head"}
CRITICAL_RESPONSES = {"200", "201", "202", "204", "400", "401", "403", "404", "409", "422"}


def resolve(doc: dict, schema: dict | None) -> dict:
    if not isinstance(schema, dict):
        return {}
    ref = schema.get("$ref")
    if isinstance(ref, str) and ref.startswith("#/"):
        node = doc
        for part in ref[2:].split("/"):
            node = node.get(part, {})
        return node if isinstance(node, dict) else {}
    return schema


def request_shape(doc: dict, op: dict) -> tuple[set[str], dict[str, str]]:
    body = op.get("requestBody", {})
    content = body.get("content", {}) if isinstance(body, dict) else {}
    media = content.get("application/json") or next(iter(content.values()), {})
    schema = resolve(doc, media.get("schema", {}) if isinstance(media, dict) else {})
    required = set(schema.get("required", []) if isinstance(schema, dict) else [])
    props = schema.get("properties", {}) if isinstance(schema, dict) else {}
    sig: dict[str, str] = {}
    for name, prop in props.items():
        prop = prop if isinstance(prop, dict) else {}
        resolved = resolve(doc, prop)
        sig[name] = str(resolved.get("type") or prop.get("$ref") or resolved.get("format") or "unknown")
    return required, sig


def operations(doc: dict) -> dict[tuple[str, str], dict]:
    out = {}
    for path, item in doc.get("paths", {}).items():
        if not isinstance(item, dict):
            continue
        for method, op in item.items():
            if method.lower() in METHODS and isinstance(op, dict):
                out[(path, method.lower())] = op
    return out


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", required=True)
    parser.add_argument("--head", required=True)
    args = parser.parse_args()

    base = json.loads(Path(args.base).read_text(encoding="utf-8"))
    head = json.loads(Path(args.head).read_text(encoding="utf-8"))
    old_ops, new_ops = operations(base), operations(head)
    errors: list[str] = []

    for key, old in sorted(old_ops.items()):
        if key not in new_ops:
            errors.append(f"removed operation: {key[1].upper()} {key[0]}")
            continue
        new = new_ops[key]

        if old.get("security") and not new.get("security"):
            errors.append(f"security requirement removed: {key[1].upper()} {key[0]}")

        old_responses = set((old.get("responses") or {}).keys()) & CRITICAL_RESPONSES
        new_responses = set((new.get("responses") or {}).keys())
        missing_responses = sorted(old_responses - new_responses)
        if missing_responses:
            errors.append(f"response contracts removed from {key[1].upper()} {key[0]}: {missing_responses}")

        old_required, old_props = request_shape(base, old)
        new_required, new_props = request_shape(head, new)
        for name, old_type in old_props.items():
            if name not in new_props:
                errors.append(f"request property removed from {key[1].upper()} {key[0]}: {name}")
            elif new_props[name] != old_type:
                errors.append(
                    f"request property type changed in {key[1].upper()} {key[0]}: "
                    f"{name} {old_type} -> {new_props[name]}"
                )
        added_required = sorted(new_required - old_required)
        if added_required:
            errors.append(f"new required request fields in {key[1].upper()} {key[0]}: {added_required}")

    if errors:
        print("OpenAPI compatibility guard FAILED:", file=sys.stderr)
        for error in errors:
            print(f" - {error}", file=sys.stderr)
        return 1

    print(f"PASS: {len(old_ops)} existing operations remain compatible at guarded boundaries")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
