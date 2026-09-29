"""Production and Shot Schemas."""
from __future__ import annotations

from typing import Any, Optional
from pydantic import BaseModel, Field


class ProductionCreate(BaseModel):
    name: str
    code: str = ""
    template_type: str = "corporate"
    fps_num: int = 25
    fps_den: int = 1
    drop_frame: bool = False
    start_timecode_frames: int = 90000
    target_duration_frames: Optional[int] = None
    aspect_ratio: str = "16:9"
    width: int = 1920
    height: int = 1080


class ProductionUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    template_type: Optional[str] = None
    fps_num: Optional[int] = None
    fps_den: Optional[int] = None
    drop_frame: Optional[bool] = None
    start_timecode_frames: Optional[int] = None
    target_duration_frames: Optional[int] = None
    aspect_ratio: Optional[str] = None
    status: Optional[str] = None


class ProductionOut(BaseModel):
    id: str
    name: str
    code: str
    template_type: str
    fps_num: int
    fps_den: int
    drop_frame: bool
    start_timecode_frames: int
    target_duration_frames: Optional[int] = None
    aspect_ratio: str
    width: int
    height: int
    status: str
    created_at: Any
    updated_at: Any
    shot_count: Optional[int] = 0
    total_duration_frames: Optional[int] = 0
    cover_media_id: Optional[str] = None

    class Config:
        from_attributes = True


class ShotCreate(BaseModel):
    display_number: str = "001"
    sequence_id: Optional[str] = None
    scene_id: Optional[str] = None
    name: Optional[str] = None
    description: str = ""
    action: str = ""
    performance: str = ""
    composition: str = ""
    director_notes: str = ""
    duration_frames: int = 75
    timing_locked: bool = False
    shot_size: Optional[str] = "全景"
    camera_angle: Optional[str] = None
    camera_height: Optional[str] = None
    lens_mm: Optional[float] = 35.0
    camera: Optional[str] = None
    movement: Optional[str] = "固定"
    camera_movement: Optional[dict] = None
    voice_over: str = ""
    dialogue: str = ""
    primary_method: str = "live"
    secondary_methods: list[str] = []
    department: Optional[str] = "camera"
    owner_id: Optional[str] = None
    status: str = "draft"


class ShotPatch(BaseModel):
    revision: int
    changes: dict[str, Any]


class ShotReorderItem(BaseModel):
    id: str
    sort_index: float
    revision: int


class ShotReorderRequest(BaseModel):
    production_id: str
    # Exact active-shot order observed by the client before the drag. The
    # server rejects stale/partial clients before mutating any row.
    base_order: list[str]
    # The target order must contain the complete current active shot set.
    items: list[ShotReorderItem]


class BulkUpdateShotsRequest(BaseModel):
    shot_ids: list[str]
    updates: dict[str, Any]
    # Expected server revisions for every selected shot. Bulk writes use the
    # same optimistic-concurrency contract as single-shot PATCH.
    revisions: dict[str, int] = Field(default_factory=dict)


class BulkTrashShotsRequest(BaseModel):
    shot_ids: list[str]


class ShotOut(BaseModel):
    id: str
    production_id: str
    sequence_id: Optional[str] = None
    scene_id: Optional[str] = None
    display_number: str
    sort_index: float
    name: Optional[str] = None
    description: str
    action: str
    performance: str
    composition: str
    director_notes: str
    duration_frames: int
    timing_locked: bool
    shot_size: Optional[str] = None
    camera_angle: Optional[str] = None
    camera_height: Optional[str] = None
    lens_mm: Optional[float] = None
    camera: Optional[str] = None
    sensor: Optional[str] = None
    aperture: Optional[str] = None
    shutter: Optional[str] = None
    camera_movement: dict
    dialogue: str
    voice_over: str
    subtitle: str
    music_notes: str
    sfx_notes: str
    primary_method: str
    secondary_methods: list[str]
    department: Optional[str] = None
    owner_id: Optional[str] = None
    status: str
    approval_status: str
    vfx_required: bool
    continuity_notes: str
    risk_notes: str
    current_version: int
    revision: int
    created_at: Any
    updated_at: Any

    class Config:
        from_attributes = True