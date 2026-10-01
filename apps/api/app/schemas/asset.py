"""Asset read models returned by the production asset library."""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


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

    model_config = ConfigDict(from_attributes=True)
