"""Project commit contracts; clients send commands, never untrusted snapshots."""
from datetime import datetime
from typing import Annotated, Any
from pydantic import BaseModel, ConfigDict, Field, StringConstraints


class ProjectCommitCreate(BaseModel):
    message: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=2000)]
    branch_name: str = Field(default="main", pattern=r"^[a-zA-Z0-9][a-zA-Z0-9._/-]{0,63}$")
    expected_head_id: str | None = None
    expected_state_hash: str = Field(pattern=r"^[0-9a-f]{64}$")

class ProjectBranchCreate(BaseModel):
    name: str = Field(pattern=r"^[a-zA-Z0-9][a-zA-Z0-9._/-]{0,63}$")
    from_commit_id: str


class ProjectCommitOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    production_id: str
    message: str
    branch_name: str
    parent_id: str | None
    merge_parent_id: str | None
    content_hash: str
    schema_version: int
    redaction_revision: int
    created_by: str | None
    created_at: datetime


class ProjectCommitDetail(ProjectCommitOut):
    snapshot: dict[str, Any]


class ProjectBranchOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    production_id: str
    name: str
    head_id: str | None
    revision: int
