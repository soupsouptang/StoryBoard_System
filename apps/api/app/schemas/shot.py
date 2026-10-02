"""Shot schemas exported for v1 API routes."""
from app.schemas.production import (
    BulkTrashShotsRequest,
    BulkUpdateShotsRequest,
    ShotCreate,
    ShotOut,
    ShotPatch,
    ShotReorderItem,
    ShotReorderRequest,
)

__all__ = [
    "ShotCreate",
    "ShotPatch",
    "ShotReorderItem",
    "ShotReorderRequest",
    "BulkTrashShotsRequest",
    "BulkUpdateShotsRequest",
    "ShotOut", "ShotRelativeCommand", "ShotAutoTimingRequest",
]
from typing import Literal
from pydantic import BaseModel, Field

class ShotRelativeCommand(BaseModel):
    action: Literal['insert_before', 'insert_after', 'duplicate', 'paste', 'cut_paste']
    base_order: list[str] = Field(max_length=10000)
    revisions: dict[str, int]
    source_ids: list[str] = Field(default_factory=list, max_length=1000)

class ShotAutoTimingRequest(BaseModel):
    revision: int = Field(ge=1)
    speech_rate: float = Field(default=1.0, ge=0.5, le=2.0)
