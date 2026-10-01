"""Canonical review comments and decision routes."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user
from app.core.database import db_session
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


def _domain_http(error: DomainError) -> HTTPException:
    if isinstance(error, NotFoundError):
        return HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": error.code, "message": error.message},
        )
    if isinstance(error, ConflictError):
        return HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "SHOT_REVISION_CONFLICT",
                "message": error.message,
                "details": error.details,
            },
        )
    if error.code == "FORBIDDEN":
        return HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": error.code, "message": error.message},
        )
    return HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail={"code": error.code, "message": error.message},
    )


def _comment_dict(comment, author_name: str = "") -> dict:
    return {
        "id": comment.id,
        "production_id": comment.production_id,
        "shot_id": comment.shot_id,
        "user_id": comment.user_id,
        "author_name": author_name,
        "role": comment.role,
        "body": comment.body,
        "timecode": comment.timecode,
        "quote_field": comment.quote_field,
        "quote_text": comment.quote_text,
        "parent_id": comment.parent_id,
        "is_resolved": comment.is_resolved,
        "created_at": comment.created_at,
        "updated_at": comment.updated_at,
    }


def _decision_dict(decision) -> dict:
    return {
        "id": decision.id,
        "shot_id": decision.shot_id,
        "version_id": decision.version_id,
        "previous_status": decision.previous_status,
        "next_status": decision.next_status,
        "action_label": decision.action_label,
        "created_by": decision.created_by,
        "created_at": decision.created_at,
    }


@router.get("/shots/{shot_id}/comments", response_model=list[ReviewCommentOut])
async def list_shot_comments(
    shot_id: str,
    db: AsyncSession = db_session,
    current_user: User = Depends(get_current_user),
):
    try:
        return await ReviewService.list_comments(db, shot_id)
    except DomainError as error:
        raise _domain_http(error)


@router.post(
    "/shots/{shot_id}/comments",
    response_model=ReviewCommentOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_shot_comment(
    shot_id: str,
    req: ReviewCommentCreate,
    db: AsyncSession = db_session,
    current_user: User = Depends(get_current_user),
):
    try:
        comment = await ReviewService.create_comment(db, shot_id, req, current_user)
        return _comment_dict(
            comment,
            current_user.display_name or current_user.email,
        )
    except DomainError as error:
        raise _domain_http(error)


@router.patch("/comments/{comment_id}", response_model=ReviewCommentOut)
async def update_comment(
    comment_id: str,
    req: ReviewCommentUpdate,
    db: AsyncSession = db_session,
    current_user: User = Depends(get_current_user),
):
    try:
        comment = await ReviewService.update_comment(db, comment_id, req, current_user)
        # Consumers refetch the canonical comment list after mutation; keep the
        # immediate response identity-safe without inventing another author's name.
        author_name = (current_user.display_name or current_user.email) if comment.user_id == current_user.id else ""
        return _comment_dict(comment, author_name)
    except DomainError as error:
        raise _domain_http(error)


@router.post("/comments/{comment_id}/resolve", response_model=ReviewCommentOut)
async def resolve_comment(
    comment_id: str,
    req: ReviewCommentResolve,
    db: AsyncSession = db_session,
    current_user: User = Depends(get_current_user),
):
    try:
        comment = await ReviewService.resolve_comment(db, comment_id, req, current_user)
        author_name = (current_user.display_name or current_user.email) if comment.user_id == current_user.id else ""
        return _comment_dict(comment, author_name)
    except DomainError as error:
        raise _domain_http(error)


@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    comment_id: str,
    db: AsyncSession = db_session,
    current_user: User = Depends(get_current_user),
):
    try:
        await ReviewService.delete_comment(db, comment_id, current_user)
        return None
    except DomainError as error:
        raise _domain_http(error)


@router.get("/shots/{shot_id}/review-decisions", response_model=list[ReviewDecisionOut])
async def list_review_decisions(
    shot_id: str,
    db: AsyncSession = db_session,
    current_user: User = Depends(get_current_user),
):
    try:
        decisions = await ReviewService.list_decisions(db, shot_id)
        return [_decision_dict(decision) for decision in decisions]
    except DomainError as error:
        raise _domain_http(error)


@router.post(
    "/shots/{shot_id}/review-decisions",
    response_model=ReviewDecisionResult,
    status_code=status.HTTP_200_OK,
)
async def apply_review_decision(
    shot_id: str,
    req: ReviewDecisionCreate,
    db: AsyncSession = db_session,
    current_user: User = Depends(get_current_user),
):
    try:
        result = await ReviewService.apply_decision(db, shot_id, req, current_user)
        if result["decision"] is not None:
            result = {**result, "decision": _decision_dict(result["decision"])}
        return result
    except DomainError as error:
        raise _domain_http(error)