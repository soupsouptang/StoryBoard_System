"""Crop coordinates are normalized in the rotated source image."""
from pydantic import BaseModel, ConfigDict, Field
from typing import Literal


class CropRectangle(BaseModel):
    x: float = Field(ge=0, lt=1, allow_inf_nan=False)
    y: float = Field(ge=0, lt=1, allow_inf_nan=False)
    width: float = Field(gt=0, le=1, allow_inf_nan=False)
    height: float = Field(gt=0, le=1, allow_inf_nan=False)

class MediaTransform(BaseModel):
    model_config = ConfigDict(extra="forbid")
    crop: CropRectangle
    rotation: Literal[0, 90, 180, 270] = 0
    aspect_ratio: str | None = Field(default=None, pattern=r"^[1-9][0-9]{0,3}:[1-9][0-9]{0,3}$")
    output_width: int = Field(default=1920, ge=64, le=3840)
    scale: float = Field(default=1, ge=0.5, le=10, allow_inf_nan=False)
    translation_x: float = Field(default=0, ge=-1, le=1, allow_inf_nan=False)
    translation_y: float = Field(default=0, ge=-1, le=1, allow_inf_nan=False)
    straighten_degrees: float = Field(default=0, ge=-45, le=45, allow_inf_nan=False)
    perspective_horizontal: float = Field(default=0, ge=-30, le=30, allow_inf_nan=False)
    perspective_vertical: float = Field(default=0, ge=-30, le=30, allow_inf_nan=False)
    flip_horizontal: bool = False
    flip_vertical: bool = False


class ImageCropRequest(MediaTransform):
    revision: int = Field(ge=1)
    presentation_revision: int = Field(ge=0)
    source_version_id: str = Field(min_length=1)
    owner_type: Literal["asset", "panel", "production"] = "asset"
    owner_id: str | None = None
