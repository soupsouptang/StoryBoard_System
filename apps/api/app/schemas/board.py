"""Bounded native scene objects shared by SVG and Three.js renderers."""
import json
from typing import Annotated, Literal
from urllib.parse import urlsplit
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

Number = Annotated[float, Field(allow_inf_nan=False, ge=-100000, le=100000)]


class BoardObject(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str = Field(min_length=1, max_length=64)
    type: Literal["light", "camera", "person", "shape", "note", "color", "link", "image"]
    x: Number = 0
    y: Number = 0
    z: Number = 0
    rotation: Number = 0
    scale_x: float = Field(default=1, gt=0, le=100, allow_inf_nan=False)
    scale_y: float = Field(default=1, gt=0, le=100, allow_inf_nan=False)
    width: float = Field(default=120, gt=0, le=10000, allow_inf_nan=False)
    height: float = Field(default=80, gt=0, le=10000, allow_inf_nan=False)
    text: str = Field(default="", max_length=10000)
    color: str = Field(default="#64748b", pattern=r"^#[0-9a-fA-F]{6}$")
    url: str = Field(default="", max_length=2048)
    asset_version_id: str | None = Field(default=None, max_length=64)
    locked: bool = False
    properties: dict = Field(default_factory=dict)

    @field_validator("url")
    @classmethod
    def safe_url(cls, value):
        if value:
            parsed = urlsplit(value)
            if parsed.scheme not in ("https", "http") or not parsed.hostname or parsed.username or parsed.password:
                raise ValueError("链接需要有效的 HTTP 或 HTTPS 地址")
        return value

    @field_validator("properties")
    @classmethod
    def finite_properties(cls, value):
        if len(json.dumps(value, allow_nan=False, ensure_ascii=False)) > 8000:
            raise ValueError("对象参数过多")
        return value


class BoardDocument(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=1, max_length=80)
    width: int = Field(default=1600, ge=100, le=10000, strict=True)
    height: int = Field(default=1000, ge=100, le=10000, strict=True)
    objects: list[BoardObject] = Field(default_factory=list, max_length=2000)
    shot_ids: list[Annotated[str, Field(min_length=1, max_length=64)]] = Field(default_factory=list, max_length=10000)

    @model_validator(mode="after")
    def unique_objects(self):
        if not self.name.strip():
            raise ValueError("请填写画板名称")
        if len({obj.id for obj in self.objects}) != len(self.objects) or len(set(self.shot_ids)) != len(self.shot_ids):
            raise ValueError("对象和镜头关联不能重复")
        if len(self.model_dump_json().encode("utf-8")) > 2 * 1024 * 1024:
            raise ValueError("画板超过 2 MB，请拆分画板")
        return self


class BoardCreate(BoardDocument):
    kind: Literal["lighting", "moodboard"]


class BoardPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    revision: int = Field(gt=0, strict=True)
    name: str | None = None
    width: int | None = None
    height: int | None = None
    objects: list[BoardObject] | None = Field(default=None, max_length=2000)
    shot_ids: list[str] | None = Field(default=None, max_length=10000)


class BoardCommand(BaseModel):
    model_config = ConfigDict(extra="forbid")
    revision: int = Field(gt=0, strict=True)


class BoardHistoryCommand(BoardCommand):
    history_revision: int = Field(ge=0, strict=True)
