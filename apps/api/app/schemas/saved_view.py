"""Saved view contracts."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class SavedViewCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    view_type: Literal["table", "grid", "wall", "timeline"] = "table"
    is_shared: bool = True
    config: dict[str, Any] = Field(default_factory=dict)


class SavedViewUpdate(BaseModel):
    revision: int = Field(ge=1)
    name: str | None = Field(default=None, min_length=1, max_length=80)
    is_shared: bool | None = None
    config: dict[str, Any] | None = None


class SavedViewOut(BaseModel):
    id: str
    production_id: str
    name: str
    view_type: str
    is_shared: bool
    created_by: str | None = None
    config: dict[str, Any]
    revision: int
    created_at: datetime
    updated_at: datetime