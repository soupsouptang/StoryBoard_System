"""Focused compatibility tests for password migration and JWT handling."""

import base64
import hashlib
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "apps" / "api"))

from app.core.security import (
    create_access_token,
    decode_access_token,
    get_password_hash,
    password_needs_rehash,
    verify_password,
)


def test_new_password_hashes_use_argon2_and_verify():
    password = "synthetic-test-password"
    encoded = get_password_hash(password)

    assert encoded.startswith("$argon2id$")
    assert verify_password(password, encoded)
    assert not verify_password("wrong-synthetic-password", encoded)
    assert not password_needs_rehash(encoded)


def test_previous_pbkdf2_fallback_verifies_and_requests_upgrade():
    password = "synthetic-legacy-password"
    salt = b"synthetic-test-salt"
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 50_000)
    encoded = "pbkdf2_sha256$50000${}${}".format(
        base64.urlsafe_b64encode(salt).decode(),
        base64.urlsafe_b64encode(digest).decode(),
    )

    assert verify_password(password, encoded)
    assert not verify_password("wrong-synthetic-password", encoded)
    assert password_needs_rehash(encoded)


def test_jwt_round_trip_and_rejects_tampering():
    token = create_access_token({"sub": "synthetic-user-id"})

    assert decode_access_token(token)["sub"] == "synthetic-user-id"
    assert decode_access_token(token[:-1] + ("a" if token[-1] != "a" else "b")) is None
