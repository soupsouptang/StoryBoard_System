"""Revision-bound per-user annotation style; no permission changes."""
from pydantic import BaseModel, Field, field_validator


class UserColorUpdate(BaseModel):
    revision: int = Field(ge=1)
    annotation_color: str | None = Field(default=None, pattern=r"^#[0-9a-fA-F]{6}$")

    @field_validator("annotation_color")
    @classmethod
    def normalize_color(cls, value):
        return value.upper() if value else None
