"""Pydantic V2 request and response schemas for FastAPI endpoints."""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# --- Auth & User Schemas ---
class UserResponse(BaseModel):
    id: str
    email: str
    display_name: str
    role: str
    status: str
    user_color: str = ""
    avatar_url: Optional[str] = None


class LoginRequest(BaseModel):
    email: str
    password: str


# --- Project Schemas ---
class ProjectCreateRequest(BaseModel):
    name: str
    production_type: str = "promo"
    fps: float = 25.0
    aspect_ratio: str = "16:9"
    target_seconds: float = 270.0
    director: str = ""
    dp: str = ""
    producer: str = ""
    company: str = ""


class ProjectUpdateRequest(BaseModel):
    name: Optional[str] = None
    production_type: Optional[str] = None
    fps: Optional[float] = None
    aspect_ratio: Optional[str] = None
    target_seconds: Optional[float] = None
    director: Optional[str] = None
    dp: Optional[str] = None
    producer: Optional[str] = None
    company: Optional[str] = None
    status: Optional[str] = None


class ProjectResponse(BaseModel):
    id: str
    name: str
    production_type: str
    fps: float
    start_tc: str
    target_seconds: float
    aspect_ratio: str
    status: str
    share_token: Optional[str] = None
    director: str = ""
    dp: str = ""
    producer: str = ""
    company: str = ""
    created_at: str
    updated_at: str


# --- Shot Schemas ---
class SingleShotUpdateRequest(BaseModel):
    expected_revision: int
    title: Optional[str] = None
    description: Optional[str] = None
    action: Optional[str] = None
    dialogue: Optional[str] = None
    voiceover: Optional[str] = None
    duration_frames: Optional[int] = None
    shot_size: Optional[str] = None
    lens: Optional[str] = None
    movement: Optional[str] = None
    status: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None


class BulkShotUpdateRequest(BaseModel):
    shots: List[Dict[str, Any]]


# --- Custom Field Schemas ---
class CustomFieldCreateRequest(BaseModel):
    key: str
    label: str
    type: str = "text"
    options: List[str] = Field(default_factory=list)
    is_required: bool = False


# --- Presence Schemas ---
class PresenceHeartbeatRequest(BaseModel):
    production_id: str
    user_id: str
    display_name: str
    workspace: str = "table"
    module: str = ""
    shot_id: Optional[str] = None
    field: Optional[str] = None
    cursor_x: Optional[float] = None
    cursor_y: Optional[float] = None
    cursor_visible: bool = False
    color: str = ""
    avatar_url: str = ""
    presence_state: str = "viewing"
    session_id: Optional[str] = None


class PresenceLeaveRequest(BaseModel):
    production_id: str
    user_id: str


# --- AI Schemas ---
class ScriptBreakdownAPIRequest(BaseModel):
    project_id: str
    script_text: str
    target_fps: float = 25.0


class VisualSuggestionAPIRequest(BaseModel):
    project_id: str
    shot_id: str
    current_action: str
    current_dialogue: str = ""
    current_shot_size: str = "全景"
