"""Authentication and User Schemas."""
from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    display_name: str = ""
    role_name: str = "readonly"  # Legacy request field; public registration never grants this role.


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class RoleOut(BaseModel):
    id: str
    name: str
    permissions: dict

    class Config:
        from_attributes = True


class UserOut(BaseModel):
    id: str
    email: str
    display_name: str
    annotation_color: str = Field(validation_alias="effective_annotation_color")
    revision: int
    role_id: Optional[str] = None
    is_active: bool
    role: Optional[RoleOut] = None

    class Config:
        from_attributes = True
