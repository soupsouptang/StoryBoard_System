"""Bounded, typed input for one explicit detail-card save."""
from typing import Any, Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator


class ShotDetailChanges(BaseModel):
    model_config = ConfigDict(extra='forbid')
    name: str = Field(default='', min_length=1, max_length=1000)
    sequence_id: str | None = None
    duration_frames: int = Field(default=75, ge=1, strict=True)
    timing_locked: bool = False
    shot_size: str | None = None
    lens_mm: float | None = Field(default=None, gt=0)
    camera_angle: str | None = None
    camera_movement: dict[str, Any] = Field(default_factory=dict)
    description: str = Field(default='', max_length=100000)
    voice_over: str = Field(default='', max_length=100000)
    performance: str = Field(default='', max_length=100000)
    dialogue: str = Field(default='', max_length=100000)
    action: str = Field(default='', max_length=100000)
    primary_method: Literal['live','stock','client','archive','still','ae','mg','three_d','vfx','type'] = 'live'
    secondary_methods: list[Literal['live','stock','client','archive','still','ae','mg','three_d','vfx','type']] = Field(default_factory=list, max_length=10)
    department: Literal['camera','director','production','art','stock','editorial','motion','three_d','vfx','sound','color'] | None = None
    owner_id: str | None = None
    status: Literal['draft','in_progress','review','changes_requested','approved','locked'] = 'draft'

    @field_validator('name')
    @classmethod
    def nonblank_name(cls, value):
        if not value.strip():
            raise ValueError('镜头标题不能为空')
        return value



class ShotDetailFieldValue(BaseModel):
    model_config = ConfigDict(extra='forbid')
    field_id: str = Field(min_length=1, max_length=80)
    field_revision: int = Field(ge=1)
    value: Any = None


class ShotDetailSave(BaseModel):
    model_config = ConfigDict(extra='forbid')
    revision: int = Field(ge=1)
    changes: ShotDetailChanges = Field(default_factory=ShotDetailChanges)
    custom_values: list[ShotDetailFieldValue] = Field(default_factory=list, max_length=200)
