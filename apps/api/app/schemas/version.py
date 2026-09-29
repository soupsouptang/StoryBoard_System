"""Shot version snapshot contracts."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


class ShotVersionCreate(BaseModel):
    name: str = Field(default="", max_length=160)
    branch_name: str = Field(default="main", min_length=1, max_length=64)
    parent_version_id: Optional[str] = None


class ShotBranchCreate(BaseModel):
    branch_name: str = Field(min_length=1, max_length=64)
    name: str = Field(default="", max_length=160)
    parent_version_id: Optional[str] = None


class ShotVersionRestore(BaseModel):
    revision: int = Field(ge=1)


class ShotVersionMerge(BaseModel):
    revision: int = Field(ge=1)
    branch_name: str = Field(default="main", min_length=1, max_length=64)


class ShotVersionOut(BaseModel):
    id: str
    shot_id: str
    version_number: int
    name: str
    status: str
    branch_name: str
    parent_version_id: Optional[str] = None
    merge_parent_id: Optional[str] = None
    is_accepted: bool
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime



class ShotVersionDetailOut(ShotVersionOut):
    snapshot: dict[str, Any]


class ShotVersionRestoreResult(BaseModel):
    changed: bool
    shot_id: str
    revision: int
    restored_version_id: str
    backup_version_id: Optional[str] = None

class ShotVersionMergeResult(BaseModel):
    changed: bool
    shot_id: str
    revision: int
    merged_version_id: str
    backup_version_id: Optional[str] = None

class ShotVersionCompareField(BaseModel):
    key: str
    label: str
    before: Any = None
    after: Any = None
    changed: bool


class ShotVersionCompareResult(BaseModel):
    version: ShotVersionOut
    current_revision: int
    changed_count: int
    fields: list[ShotVersionCompareField]