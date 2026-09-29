"""Canonical Shot version snapshot routes."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user
from app.core.database import get_db
from app.core.exceptions import ConflictError, DomainError, NotFoundError
from app.models.user import User
from app.schemas.version import (
    ShotBranchCreate,
    ShotVersionCreate,
    ShotVersionMerge,
    ShotVersionCompareResult,
    ShotVersionDetailOut,
    ShotVersionMergeResult,
    ShotVersionOut,
    ShotVersionRestore,
    ShotVersionRestoreResult,
)
from app.services.version_service import VersionService

router = APIRouter(tags=["Versions"])


def _http(error: DomainError) -> HTTPException:
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


def _version_dict(version) -> dict:
    return {
        "id": version.id,
        "shot_id": version.shot_id,
        "version_number": version.version_number,
        "name": version.name,
        "status": version.status,
        "branch_name": version.branch_name,
        "parent_version_id": version.parent_version_id,
        "merge_parent_id": version.merge_parent_id,
        "is_accepted": version.is_accepted,
        "created_by": version.created_by,
        "created_at": version.created_at,
        "updated_at": version.updated_at,
    }


@router.get("/shots/{shot_id}/versions", response_model=list[ShotVersionOut])
async def list_shot_versions(
    shot_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        versions = await VersionService.list_versions(db, shot_id)
        return [_version_dict(version) for version in versions]
    except DomainError as error:
        raise _http(error)


@router.post(
    "/shots/{shot_id}/versions",
    response_model=ShotVersionOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_shot_version(
    shot_id: str,
    req: ShotVersionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        version = await VersionService.create_version(db, shot_id, req, current_user)
        return _version_dict(version)
    except DomainError as error:
        raise _http(error)


@router.post(
    "/shots/{shot_id}/branches",
    response_model=ShotVersionOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_shot_branch(
    shot_id: str,
    req: ShotBranchCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        version = await VersionService.create_branch(db, shot_id, req, current_user)
        return _version_dict(version)
    except DomainError as error:
        raise _http(error)


@router.get("/versions/{version_id}", response_model=ShotVersionDetailOut)
async def get_shot_version(
    version_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        version = await VersionService.get_version(db, version_id)
        return {
            **_version_dict(version),
            "snapshot": version.snapshot if isinstance(version.snapshot, dict) else {},
        }
    except DomainError as error:
        raise _http(error)


@router.get(
    "/versions/{version_id}/compare",
    response_model=ShotVersionCompareResult,
)
async def compare_shot_version(
    version_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        result = await VersionService.compare_version(db, version_id)
        return {
            **result,
            "version": _version_dict(result["version"]),
        }
    except DomainError as error:
        raise _http(error)


@router.post("/versions/{version_id}/accept", response_model=ShotVersionOut)
async def accept_shot_version(
    version_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        version = await VersionService.accept_version(db, version_id, current_user)
        return _version_dict(version)
    except DomainError as error:
        raise _http(error)


@router.post(
    "/versions/{version_id}/restore",
    response_model=ShotVersionRestoreResult,
)
async def restore_shot_version(
    version_id: str,
    req: ShotVersionRestore,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return await VersionService.restore_version(db, version_id, req, current_user)
    except DomainError as error:
        raise _http(error)

@router.post(
    "/versions/{version_id}/merge",
    response_model=ShotVersionMergeResult,
)
async def merge_shot_version(
    version_id: str,
    req: ShotVersionMerge,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return await VersionService.merge_version(db, version_id, req, current_user)
    except DomainError as error:
        raise _http(error)