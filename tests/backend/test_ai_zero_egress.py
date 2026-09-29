"""AI must remain zero-egress while the canonical provider registry is disabled."""

import asyncio
import socket
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "apps" / "api"))

from app.services.ai_provider import provider_registry
from app.services.ai_proposal import generate_proposal


def test_disabled_ai_generation_uses_offline_provider_without_network(monkeypatch):
    attempts = []

    def deny_connect(self, address):
        attempts.append(address)
        raise AssertionError(f"unexpected outbound network attempt: {address}")

    monkeypatch.setattr(socket.socket, "connect", deny_connect)
    provider_registry.disable()
    assert provider_registry.is_enabled is False

    proposal = asyncio.run(generate_proposal(
        db=object(),
        production_id="offline-production",
        capability="voice_alignment",
        parameters={},
        user_id="offline-user",
    ))

    assert proposal["status"] == "pending_review"
    assert proposal["proposed_changes"]["duration_frames"] == 150
    assert attempts == []
