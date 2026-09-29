"""Review comments and revision-bound review decisions."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user
from app.core.database import get_db
from app.core.exceptions import ConflictError, DomainError, NotFoundError
from app.models.user import User
from app.schemas.review import (
    ReviewCommentCreate,
    ReviewCommentOut,
    ReviewCommentResolve,
    ReviewCommentUpdate,
    ReviewDecisionCreate,
    ReviewDecisionOut,
    ReviewDecisionResult,
)
from app.services.review_service import ReviewService

router = APIRouter(tags=["Review"])


def _raise_domain(exc: DomainError) -> None:
    if isinstance(exc, NotFoundError):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": exc.code, "message": exc.message},
        )
    if isinstance(exc, ConflictError):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "SHOT_REVISION_CONFLICT", "message": exc.message, "details": exc.details},
        )
    if exc.code == "FORBIDDEN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": exc.code, "message": exc.message},
        )
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail={"code": exc.code, "message": exc.message},
    )


@router.get("/shots/{shot_id}/comments", response_model=list[ReviewCommentOut])
async def list_comments(
    shot_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return await ReviewService.list_comments(db, shot_id)
    except DomainError as exc:
        _raise_domain(exc)


@router.post("/shots/{shot_id}/comments", response_model=ReviewCommentOut, status_code=status.HTTP_201_CREATED)
async def create_comment(
    shot_id: str,
    req: ReviewCommentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return await ReviewService.create_comment(db, shot_id, req, current_user)
    except DomainError as exc:
        _raise_domain(exc)


@router.patch("/comments/{comment_id}", response_model=ReviewCommentOut)
async def update_comment(
    comment_id: str,
    req: ReviewCommentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return await ReviewService.update_comment(db, comment_id, req, current_user)
    except DomainError as exc:
        _raise_domain(exc)


@router.post("/comments/{comment_id}/resolve", response_model=ReviewCommentOut)
async def resolve_comment(
    comment_id: str,
    req: ReviewCommentResolve,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return await ReviewService.resolve_comment(db, comment_id, req, current_user)
    except DomainError as exc:
        _raise_domain(exc)


@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    comment_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        await ReviewService.delete_comment(db, comment_id, current_user)
        return None
    except DomainError as exc:
        _raise_domain(exc)


@router.get("/shots/{shot_id}/review-decisions", response_model=list[ReviewDecisionOut])
async def list_review_decisions(
    shot_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return await ReviewService.list_decisions(db, shot_id)
    except DomainError as exc:
        _raise_domain(exc)


@router.post("/shots/{shot_id}/review-decisions", response_model=ReviewDecisionResult)
async def apply_review_decision(
    shot_id: str,
    req: ReviewDecisionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return await ReviewService.apply_decision(db, shot_id, req, current_user)
    except DomainError as exc:
        _raise_domain(exc)
