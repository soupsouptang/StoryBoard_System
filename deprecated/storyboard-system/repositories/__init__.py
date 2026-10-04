"""Repository package exports for FrameForge storage abstraction layer."""

from repositories.contracts import (
    CustomFieldDTO,
    FieldRepository,
    ProjectDTO,
    ProjectRepository,
    ShotDTO,
    ShotRepository,
    UnitOfWork,
)
from repositories.sqlite_repo import (
    SQLiteFieldRepository,
    SQLiteProjectRepository,
    SQLiteShotRepository,
    SQLiteUnitOfWork,
)
from repositories.postgres_repo import (
    PostgresFieldRepository,
    PostgresProjectRepository,
    PostgresShotRepository,
)

__all__ = [
    "ProjectDTO",
    "ShotDTO",
    "CustomFieldDTO",
    "ProjectRepository",
    "ShotRepository",
    "FieldRepository",
    "UnitOfWork",
    "SQLiteProjectRepository",
    "SQLiteShotRepository",
    "SQLiteFieldRepository",
    "SQLiteUnitOfWork",
    "PostgresProjectRepository",
    "PostgresShotRepository",
    "PostgresFieldRepository",
]
