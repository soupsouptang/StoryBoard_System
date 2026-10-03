"""Custom field lifecycle and value contracts."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, NonNegativeInt


CustomFieldType = Literal["text", "textarea", "number", "boolean", "date", "url", "select", "multiselect", "json"]
CustomFieldColumnState = Literal["visible", "hidden", "removed"]


class CustomFieldCreate(BaseModel):
    key: str | None = Field(default=None, max_length=80)
    label: str = Field(min_length=1, max_length=80)
    description: str = Field(default="", max_length=1000)
    field_type: CustomFieldType = "text"
    group_name: str = Field(default="Custom", max_length=80)
    options: list[str] = Field(default_factory=list, max_length=100)
    required: bool = False
    default_value: Any = None


class CustomFieldUpdate(BaseModel):
    revision: int = Field(ge=1)
    label: str | None = Field(default=None, min_length=1, max_length=80)
    field_type: CustomFieldType | None = None
    description: str | None = Field(default=None, max_length=1000)
    group_name: str | None = Field(default=None, max_length=80)
    options: list[str] | None = Field(default=None, max_length=100)
    required: bool | None = None
    default_value: Any = None
    default_value_set: bool = False


class CustomFieldStateUpdate(BaseModel):
    revision: int = Field(ge=1)
    state: CustomFieldColumnState


class BuiltinColumnStateUpdate(BaseModel):
    revision: int = Field(ge=0)
    state: Literal['visible', 'removed']


class CustomFieldPurgeRequest(BaseModel):
    revision: int = Field(ge=1)


class CustomFieldOut(BaseModel):
    id: str
    production_id: str
    key: str
    column_key: str
    column_class: str
    origin: str
    label: str
    description: str
    field_type: str
    group_name: str
    options: list[str]
    required: bool
    default_value: Any = None
    sort_index: int
    state: str
    permanently_deleted: bool
    position: int
    width_px: int | None = None
    wrap_text: bool
    revision: int
    created_by: str | None = None
    created_at: datetime
    updated_at: datetime


class CustomFieldValuePatch(BaseModel):
    revision: int = Field(ge=1)
    value: Any = None


class CustomFieldValueResult(BaseModel):
    changed: bool
    shot_id: str
    field_id: str
    value: Any = None
    revision: int


class CustomFieldValueMatrix(BaseModel):
    values: dict[str, dict[str, Any]]


class ColumnPlacement(BaseModel):
    revision: int = Field(ge=0, strict=True)
    config: dict
    reference: str = Field(min_length=1, max_length=120)
    after: bool = True
    columns: list[str] = Field(default_factory=list, max_length=100)


class CustomFieldInsert(BaseModel):
    fields: list[CustomFieldCreate] = Field(default_factory=list, max_length=100)
    restore: dict[str, int] = Field(default_factory=dict, max_length=100)
    restore_columns: dict[str, NonNegativeInt] = Field(default_factory=dict, max_length=100)
    placement: ColumnPlacement | None = None


class ColumnCopyRequest(BaseModel):
    source: str = Field(min_length=1, max_length=120)
    label: str = Field(min_length=1, max_length=80)
    field_revision: int | None = Field(default=None, ge=1)
    shot_revisions: dict[str, int] = Field(max_length=10000)
    width_px: int = Field(default=180, ge=80, le=560)
    wrap_text: bool = False
    existing_labels: list[str] = Field(default_factory=list, max_length=200)
    options: list[str] = Field(default_factory=list, max_length=100)
    placement: ColumnPlacement | None = None


class ColumnCopyResult(BaseModel):
    field: CustomFieldOut
    shot_revisions: dict[str, int]
