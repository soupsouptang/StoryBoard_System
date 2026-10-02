"""Crop coordinates are normalized in the rotated source image."""
from pydantic import BaseModel, Field
from typing import Literal


class CropRectangle(BaseModel):
    x: float = Field(ge=0, lt=1, allow_inf_nan=False)
    y: float = Field(ge=0, lt=1, allow_inf_nan=False)
    width: float = Field(gt=0, le=1, allow_inf_nan=False)
    height: float = Field(gt=0, le=1, allow_inf_nan=False)

class ImageCropRequest(BaseModel):
    revision: int = Field(ge=1)
    source_version_id: str
    crop: CropRectangle
    rotation: Literal[0, 90, 180, 270] = 0
    aspect_ratio: str = Field(pattern=r"^[1-9][0-9]{0,3}:[1-9][0-9]{0,3}$")
    output_width: int = Field(default=1920, ge=64, le=3840)
