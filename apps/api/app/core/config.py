import json
import os
from pathlib import Path
from typing import List
from sqlalchemy.engine import make_url

API_DIR = Path(__file__).resolve().parents[2]
BASE_DIR = Path(__file__).resolve().parents[4]
DB_FILE = API_DIR / "frameforge.db"

DEFAULT_SECRET_KEY = "frameforge-secret-key-production-ready-2026"
DEFAULT_ADMIN_PW = "FrameForge2026!Admin"


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

try:
    from pydantic_settings import BaseSettings, SettingsConfigDict

    class Settings(BaseSettings):
        model_config = SettingsConfigDict(
            env_file=str(BASE_DIR / ".env"),
            env_file_encoding="utf-8",
            extra="ignore"
        )

        API_HOST: str = "0.0.0.0"
        API_PORT: int = 8000
        API_V1_PREFIX: str = "/api/v1"
        ENVIRONMENT: str = "development"
        LOG_LEVEL: str = "info"
        SECRET_KEY: str = DEFAULT_SECRET_KEY
        ALGORITHM: str = "HS256"
        ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 14  # 14 days

        # CORS Origins - configurable per environment, never wildcard in prod
        CORS_ORIGINS: List[str] = [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:8000",
            "http://127.0.0.1:8000",
        ]

        # Database
        DATABASE_URL: str = os.environ.get(
            "DATABASE_URL",
            f"sqlite+aiosqlite:///{DB_FILE.as_posix()}"
        )
        DATABASE_SYNC_URL: str | None = None

        # Redis
        REDIS_URL: str = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

        # Object Storage (S3 / MinIO)
        S3_ENDPOINT: str = "http://localhost:9000"
        S3_ACCESS_KEY: str = "minioadmin"
        S3_SECRET_KEY: str = "minioadmin"
        S3_BUCKET: str = "frameforge-media"
        S3_USE_SSL: bool = False

        # Seed Admin Credentials. Product/demo data is opt-in so normal
        # development and visual QA do not silently acquire a sample project.
        INITIAL_ADMIN_EMAIL: str = "admin@company.internal"
        INITIAL_ADMIN_PASSWORD: str = DEFAULT_ADMIN_PW
        INITIAL_ADMIN_NAME: str = "系统超级管理员"
        DEMO_SEED_ENABLED: bool = False

        # AI Configuration (Section 19: AI default disabled)
        AI_ENABLED: bool = False

        def validate_production(self) -> None:
            """Fail closed in production mode if production secrets are unconfigured."""
            if self.ENVIRONMENT == "production":
                if self.SECRET_KEY == DEFAULT_SECRET_KEY:
                    raise ValueError(
                        "CRITICAL SECURITY: In production mode, SECRET_KEY must be explicitly set "
                        "via environment variables and cannot use the development default."
                    )
                if self.INITIAL_ADMIN_PASSWORD == DEFAULT_ADMIN_PW:
                    raise ValueError(
                        "CRITICAL SECURITY: In production mode, INITIAL_ADMIN_PASSWORD must be explicitly set "
                        "and cannot use the default placeholder password."
                    )

    settings = Settings()
    settings.validate_production()

except ImportError:
    class Settings:
        API_HOST: str = os.environ.get("API_HOST", "0.0.0.0")
        API_PORT: int = int(os.environ.get("API_PORT", "8000"))
        API_V1_PREFIX: str = os.environ.get("API_V1_PREFIX", "/api/v1")
        ENVIRONMENT: str = os.environ.get("ENVIRONMENT", "development")
        LOG_LEVEL: str = os.environ.get("LOG_LEVEL", "info")
        SECRET_KEY: str = os.environ.get("SECRET_KEY", DEFAULT_SECRET_KEY)
        ALGORITHM: str = "HS256"
        ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 14

        CORS_ORIGINS: List[str] = [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:8000",
            "http://127.0.0.1:8000",
        ]

        DATABASE_URL: str = os.environ.get(
            "DATABASE_URL",
            f"sqlite+aiosqlite:///{DB_FILE.as_posix()}"
        )
        DATABASE_SYNC_URL: str | None = os.environ.get("DATABASE_SYNC_URL")

        REDIS_URL: str = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
        S3_ENDPOINT: str = os.environ.get("S3_ENDPOINT", "http://localhost:9000")
        S3_ACCESS_KEY: str = os.environ.get("S3_ACCESS_KEY", "minioadmin")
        S3_SECRET_KEY: str = os.environ.get("S3_SECRET_KEY", "minioadmin")
        S3_BUCKET: str = os.environ.get("S3_BUCKET", "frameforge-media")
        S3_USE_SSL: bool = False

        INITIAL_ADMIN_EMAIL: str = os.environ.get("INITIAL_ADMIN_EMAIL", "admin@company.internal")
        INITIAL_ADMIN_PASSWORD: str = os.environ.get("INITIAL_ADMIN_PASSWORD", DEFAULT_ADMIN_PW)
        INITIAL_ADMIN_NAME: str = os.environ.get("INITIAL_ADMIN_NAME", "系统超级管理员")
        DEMO_SEED_ENABLED: bool = os.environ.get("DEMO_SEED_ENABLED", "").strip().lower() in {"1", "true", "yes", "on"}
        AI_ENABLED: bool = False

        def validate_production(self) -> None:
            if self.ENVIRONMENT == "production":
                if self.SECRET_KEY == DEFAULT_SECRET_KEY:
                    raise ValueError(
                        "CRITICAL SECURITY: In production mode, SECRET_KEY must be set."
                    )
                if self.INITIAL_ADMIN_PASSWORD == DEFAULT_ADMIN_PW:
                    raise ValueError(
                        "CRITICAL SECURITY: In production mode, INITIAL_ADMIN_PASSWORD must be set."
                    )

    settings = Settings()
    settings.validate_production()

settings.DATABASE_SYNC_URL = resolve_sync_database_url(settings.DATABASE_URL, settings.DATABASE_SYNC_URL)
