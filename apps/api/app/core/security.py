"""Password hashing and JWT signing for the VNext API."""

from __future__ import annotations

import base64
import hashlib
import hmac
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError
from jwt import InvalidTokenError

from app.core.config import settings

_password_hasher = PasswordHasher()


def get_password_hash(password: str) -> str:
    """Create new password hashes with Argon2id."""
    return _password_hasher.hash(password)


def _verify_legacy_pbkdf2(password: str, password_hash: str) -> bool:
    """Verify only the explicit PBKDF2 format emitted by the former fallback."""
    try:
        scheme, rounds, salt, expected = password_hash.split("$", 3)
        if scheme != "pbkdf2_sha256":
            return False
        iteration_count = int(rounds)
        if not 1 <= iteration_count <= 10_000_000:
            return False
        salt_bytes = base64.urlsafe_b64decode(salt.encode("ascii"))
        expected_bytes = base64.urlsafe_b64decode(expected.encode("ascii"))
        actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt_bytes, iteration_count)
        return hmac.compare_digest(actual, expected_bytes)
    except (ValueError, UnicodeError, TypeError):
        return False


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify current Argon2id hashes and the explicit pre-migration formats."""
    if hashed_password.startswith("$argon2"):
        try:
            return _password_hasher.verify(hashed_password, plain_password)
        except (InvalidHashError, VerificationError, VerifyMismatchError):
            return False
    if hashed_password.startswith("pbkdf2_sha256$"):
        return _verify_legacy_pbkdf2(plain_password, hashed_password)
    return False


def password_needs_rehash(hashed_password: str) -> bool:
    """Signal successful legacy logins to upgrade to the current Argon2id policy."""
    if not hashed_password.startswith("$argon2"):
        return True
    try:
        return _password_hasher.check_needs_rehash(hashed_password)
    except (InvalidHashError, VerificationError):
        return True


def create_access_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    """Generate a standards-compliant JWT with the configured algorithm."""
    payload = data.copy()
    now = datetime.now(timezone.utc)
    expires_at = now + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    payload.update({"exp": int(expires_at.timestamp()), "iat": int(now.timestamp())})
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any] | None:
    """Decode a JWT using only the configured algorithm; malformed tokens are rejected."""
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except (InvalidTokenError, TypeError, ValueError):
        return None
