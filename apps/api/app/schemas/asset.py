"""Asset read models returned by the production asset library."""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from typing import Annotated
from pydantic import BaseModel, ConfigDict, Field, StringConstraints


class AssetOut(BaseModel):
    id: str
    production_id: str
    filename: str
    display_name: str
    asset_type: str
    source_type: str
    mime_type: str
    width: Optional[int] = None
    height: Optional[int] = None
    file_size: int
    hash_sha256: str
    rights_status: Optional[str] = None
    created_at: datetime
    reference_shot_count: int
    revision: int = 1
    category: str = ""
    has_thumbnail: bool = False
    updated_at: datetime | None = None
    deleted_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class AssetUpdate(BaseModel):
    revision: int = Field(ge=1)
    display_name: Annotated[str | None, StringConstraints(strip_whitespace=True, min_length=1, max_length=255)] = None
    category: Annotated[str | None, StringConstraints(strip_whitespace=True, max_length=64)] = None


class AssetRevision(BaseModel):
    revision: int = Field(ge=1)
