"""FastAPI Dependencies for Authentication & Database."""
from __future__ import annotations

from typing import Optional
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import db_session
from app.core.security import decode_access_token
from app.models.user import User

security_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    request: Request,
    auth_header: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: AsyncSession = db_session
) -> User:
    if not auth_header or not auth_header.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "UNAUTHORIZED", "message": "请先登录"}
        )

    payload = decode_access_token(auth_header.credentials)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "UNAUTHORIZED", "message": "登录凭证无效或已过期"}
        )

    user_id = payload["sub"]
    result = await db.execute(select(User).where(User.id == user_id, User.is_active == True))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "UNAUTHORIZED", "message": "用户不存在或已被禁用"}
        )

    from app.services.history_context import begin_request_history
    from app.core.exceptions import DomainError, NotFoundError
    try:
        await begin_request_history(db, request, user)
    except DomainError as error:
        raise HTTPException(404 if isinstance(error, NotFoundError) else 400,
            detail={"code": error.code, "message": error.message}) from error
    return user
