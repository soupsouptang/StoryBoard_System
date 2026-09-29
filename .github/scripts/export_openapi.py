#!/usr/bin/env python3
"""Generate deterministic FastAPI OpenAPI JSON without starting application lifespan."""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--api-root", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    api_root = Path(args.api_root).resolve()
    output = Path(args.output).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    os.environ.setdefault("ENVIRONMENT", "test")
    sys.path.insert(0, str(api_root))
    os.chdir(api_root)

    from main import app

    output.write_text(
        json.dumps(app.openapi(), ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
