"""Validated VNext API settings."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import make_url

BASE_DIR = Path(__file__).resolve().parents[4]


def resolve_sync_database_url(async_url: str, sync_url: str | None) -> str:
    async_target = make_url(async_url)
    sync_driver = {
        "sqlite+aiosqlite": "sqlite",
        "postgresql+asyncpg": "postgresql+psycopg",
    }.get(async_target.drivername)
    if sync_driver is None:
        raise ValueError(f"Unsupported async database driver: {async_target.drivername}")

    expected = async_target.set(drivername=sync_driver)
    if sync_url is None:
        return expected.render_as_string(hide_password=False)

    actual = make_url(sync_url)
    target_fields = ("username", "password", "host", "port", "database")
    if actual.drivername != sync_driver or any(
        getattr(actual, field) != getattr(expected, field) for field in target_fields
    ):
        raise ValueError("DATABASE_SYNC_URL must target the same database as DATABASE_URL")
    return sync_url


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    API_V1_PREFIX: str = "/api/v1"
    ENVIRONMENT: Literal["development", "test", "staging", "production"] = "development"
    LOG_LEVEL: str = "info"
    SECRET_KEY: str = Field(min_length=32)
    ALGORITHM: Literal["HS256"] = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 14

    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]

    DATABASE_URL: str
    DATABASE_SYNC_URL: str | None = None

    REDIS_URL: str = "redis://localhost:6379/0"

    S3_ENDPOINT: str = "http://localhost:9000"
    S3_ACCESS_KEY: str | None = None
    S3_SECRET_KEY: str | None = None
    S3_BUCKET: str = "frameforge-media"
    S3_USE_SSL: bool = False

    INITIAL_ADMIN_EMAIL: str = "admin@company.internal"
    INITIAL_ADMIN_PASSWORD: str | None = None
    INITIAL_ADMIN_NAME: str = "系统超级管理员"
    DEMO_SEED_ENABLED: bool = False
    AI_ENABLED: bool = False

    def validate_runtime(self) -> None:
        database = make_url(self.DATABASE_URL)
        if self.ENVIRONMENT == "test":
            if database.drivername not in {"sqlite+aiosqlite", "postgresql+asyncpg"}:
                raise ValueError("Tests may use only isolated SQLite or PostgreSQL databases")
        elif database.drivername != "postgresql+asyncpg":
            raise ValueError("PostgreSQL is required outside isolated test mode")

        if bool(self.S3_ACCESS_KEY) != bool(self.S3_SECRET_KEY):
            raise ValueError("S3_ACCESS_KEY and S3_SECRET_KEY must be configured together")
        if self.ENVIRONMENT == "production" and self.DEMO_SEED_ENABLED:
            raise ValueError("DEMO_SEED_ENABLED is forbidden in production")


settings = Settings()
settings.validate_runtime()
settings.DATABASE_SYNC_URL = resolve_sync_database_url(settings.DATABASE_URL, settings.DATABASE_SYNC_URL)
