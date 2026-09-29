#!/usr/bin/env python3
"""Runtime zero-egress check for the default FRAMEFORGE AI path."""

from __future__ import annotations
import asyncio
import socket
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
API = ROOT / "apps" / "api"
sys.path.insert(0, str(API))

from app.services.ai_provider import provider_registry
from app.services.ai_proposal import generate_proposal


class NetworkForbidden(RuntimeError):
    pass


def blocked_connect(*args, **kwargs):
    raise NetworkForbidden("outbound network attempted while AI is default-off")


async def exercise() -> None:
    if provider_registry.is_enabled:
        raise AssertionError("provider registry must be disabled by default")
    proposal = await generate_proposal(
        db=None,
        production_id="ci-offline-production",
        capability="screenplay_breakdown",
        parameters={"script": "offline contract test"},
        user_id="ci-user",
    )
    if proposal.get("status") != "pending_review":
        raise AssertionError("AI generation must produce a human-review proposal")


def main() -> int:
    original = socket.socket.connect
    socket.socket.connect = blocked_connect
    try:
        asyncio.run(exercise())
    finally:
        socket.socket.connect = original
    print("PASS: default AI proposal path performed zero outbound network access")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
