"""Saved view contracts."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class ViewRowLayoutInput(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)
    shot_id: str = Field(min_length=1)
    height_mode: Literal["manual", "auto"] = "manual"
    manual_height_px: int | None = Field(default=None, gt=0, le=10000)

    @model_validator(mode="after")
    def validate_manual_height(self):
        if self.height_mode == "manual" and self.manual_height_px is None:
            raise ValueError("手动行高必须提供像素值")
        if self.height_mode == "auto" and self.manual_height_px is not None:
            raise ValueError("自动行高不能携带手动覆盖")
        return self


class SavedViewCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    view_type: Literal["table", "grid", "wall", "timeline"] = "table"
    is_shared: bool = True
    config: dict[str, Any] = Field(default_factory=dict)
    row_height_mode: Literal["manual", "auto"] = "auto"
    manual_row_height_px: int | None = Field(default=None, gt=0, le=10000)
    row_layouts: list[ViewRowLayoutInput] = Field(default_factory=list, max_length=10000)


class SavedViewUpdate(BaseModel):
    revision: int = Field(ge=1)
    name: str | None = Field(default=None, min_length=1, max_length=80)
    is_shared: bool | None = None
    config: dict[str, Any] | None = None
    row_height_mode: Literal["manual", "auto"] | None = None
    manual_row_height_px: int | None = Field(default=None, gt=0, le=10000)
    row_layouts: list[ViewRowLayoutInput] | None = Field(default=None, max_length=10000)


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
    schema_version: int = 1
    row_height_mode: str = "auto"
    manual_row_height_px: int | None = None
    measurement_generation: int = 0
    row_layouts: list[ViewRowLayoutInput] = Field(default_factory=list)
