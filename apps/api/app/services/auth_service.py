"""Authentication and public account registration rules."""
from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import DomainError
from app.core.security import get_password_hash, password_needs_rehash, verify_password
from app.models.user import Role, User
from app.schemas.auth import RegisterRequest


class AuthService:
    @staticmethod
    async def authenticate(db: AsyncSession, email: str, password: str) -> User:
        user = (await db.execute(select(User).where(User.email == email.lower()))).scalar_one_or_none()
        if user is None or not verify_password(password, user.password_hash):
            raise DomainError("邮箱或密码错误", code="UNAUTHORIZED")
        if not user.is_active:
            raise DomainError("账号已被停用", code="FORBIDDEN")
        if password_needs_rehash(user.password_hash):
            user.password_hash = get_password_hash(password)
            await db.flush()
        return user

    @staticmethod
    async def register(db: AsyncSession, req: RegisterRequest) -> User:
        email = req.email.lower()
        if (await db.execute(select(User.id).where(User.email == email))).scalar_one_or_none():
            raise DomainError("该邮箱已注册", code="VALIDATION_ERROR")

        # Public registration cannot choose permissions. Role requests are
        # accepted for existing clients but never used to grant access.
        role = (await db.execute(select(Role).where(Role.name == "readonly"))).scalar_one_or_none()
        if role is None:
            raise DomainError("注册角色尚未配置", code="SERVICE_UNAVAILABLE")

        user = User(
            id=str(uuid.uuid4()),
            email=email,
            display_name=req.display_name or email.split("@")[0],
            password_hash=get_password_hash(req.password),
            role_id=role.id,
            is_active=True,
        )
        db.add(user)
        await db.flush()
        user.role = role
        return user
