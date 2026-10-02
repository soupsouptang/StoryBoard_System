"""Review comments and decision contracts."""
from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


class ReviewCommentCreate(BaseModel):
    body: str = Field(min_length=1, max_length=1000)
    role: str = Field(default="Director", max_length=64)
    timecode: str = Field(default="", max_length=32)
    quote_field: Literal["", "description", "voiceover", "title", "voice_over", "name"] = ""
    quote_text: str = Field(default="", max_length=4000)
    parent_id: Optional[str] = None


class ReviewCommentUpdate(BaseModel):
    revision: int = Field(ge=1)
    body: str = Field(min_length=1, max_length=1000)


class ReviewCommentResolve(BaseModel):
    revision: int = Field(ge=1)
    resolved: bool


class ReviewCommentOut(BaseModel):
    id: str
    production_id: str
    shot_id: Optional[str] = None
    user_id: Optional[str] = None
    author_name: str = ""
    author_color: str = ""
    last_actor_id: Optional[str] = None
    last_actor_color: str = ""
    revision: int
    event_seq: int
    last_activity_seq: int
    role: str = "Director"
    body: str
    timecode: str = ""
    quote_field: str = ""
    quote_text: str = ""
    parent_id: Optional[str] = None
    is_resolved: bool = False
    created_at: datetime
    updated_at: datetime


class CommentReadRequest(BaseModel):
    through_seq: int = Field(ge=0)


class CommentReadOut(BaseModel):
    shot_id: str
    last_read_seq: int
    latest_seq: int
    unread_count: int


class ReviewDecisionCreate(BaseModel):
    revision: int = Field(ge=1)
    action: Literal["submit", "withdraw", "approve", "request_changes"]
    version_id: Optional[str] = None


class ReviewDecisionOut(BaseModel):
    id: str
    shot_id: str
    version_id: Optional[str] = None
    previous_status: str
    next_status: str
    action_label: str
    created_by: Optional[str] = None
    created_at: datetime


class ReviewDecisionResult(BaseModel):
    changed: bool
    shot_id: str
    revision: int
    status: str
    decision: Optional[ReviewDecisionOut] = None
