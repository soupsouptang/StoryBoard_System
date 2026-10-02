"""Isolate test configuration from developer and CI environment variables."""

import os

os.environ["ENVIRONMENT"] = "test"
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"
os.environ["DATABASE_SYNC_URL"] = "sqlite:///:memory:"
os.environ["SECRET_KEY"] = "frameforge-isolated-test-secret-key-only"
os.environ["INITIAL_ADMIN_PASSWORD"] = "isolated-test-admin-password"
