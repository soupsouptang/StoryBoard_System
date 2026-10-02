"""Canonical custom-field lifecycle routes."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user
from app.core.database import db_session
from app.core.exceptions import ConflictError, DomainError, NotFoundError
from app.models.user import User
from app.schemas.custom_field import (
    CustomFieldCreate,
    CustomFieldOut,
    CustomFieldPurgeRequest,
    CustomFieldStateUpdate,
    CustomFieldUpdate,
    CustomFieldValueMatrix,
    CustomFieldValuePatch,
    CustomFieldValueResult,
    CustomFieldInsert,
    ColumnCopyRequest,
    ColumnCopyResult,
)
from app.services.custom_field_service import CustomFieldService

router = APIRouter(tags=["Custom Fields"])


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
                "code": "CUSTOM_FIELD_REVISION_CONFLICT",
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


@router.get(
    "/productions/{production_id}/custom-fields",
    response_model=list[CustomFieldOut],
)
async def list_custom_fields(
    production_id: str,
    db: AsyncSession = db_session,
    current_user: User = Depends(get_current_user),
):
    try:
        return await CustomFieldService.list_fields(db, production_id)
    except DomainError as error:
        raise _http(error)


@router.post(
    "/productions/{production_id}/custom-fields",
    response_model=CustomFieldOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_custom_field(
    production_id: str,
    req: CustomFieldCreate,
    db: AsyncSession = db_session,
    current_user: User = Depends(get_current_user),
):
    try:
        return await CustomFieldService.create_field(
            db,
            production_id,
            req,
            current_user,
        )
    except DomainError as error:
        raise _http(error)


@router.post("/productions/{production_id}/custom-fields/insert", response_model=list[CustomFieldOut], status_code=201)
async def insert_custom_fields(production_id: str, req: CustomFieldInsert,
    db: AsyncSession = db_session, current_user: User = Depends(get_current_user)):
    try:
        return await CustomFieldService.insert_fields(db, production_id, req, current_user)
    except DomainError as error:
        raise _http(error)


@router.post("/productions/{production_id}/custom-fields/copy-column", response_model=ColumnCopyResult, status_code=201)
async def copy_column(production_id: str, req: ColumnCopyRequest,
    db: AsyncSession = db_session, current_user: User = Depends(get_current_user)):
    try:
        return await CustomFieldService.copy_column(db, production_id, req, current_user)
    except DomainError as error:
        raise _http(error)


@router.patch(
    "/productions/{production_id}/custom-fields/{field_id}",
    response_model=CustomFieldOut,
)
async def update_custom_field(
    production_id: str,
    field_id: str,
    req: CustomFieldUpdate,
    db: AsyncSession = db_session,
    current_user: User = Depends(get_current_user),
):
    try:
        return await CustomFieldService.update_field(
            db,
            production_id,
            field_id,
            req,
            current_user,
        )
    except DomainError as error:
        raise _http(error)


@router.patch(
    "/productions/{production_id}/custom-fields/{field_id}/state",
    response_model=CustomFieldOut,
)
async def set_custom_field_state(
    production_id: str,
    field_id: str,
    req: CustomFieldStateUpdate,
    db: AsyncSession = db_session,
    current_user: User = Depends(get_current_user),
):
    try:
        return await CustomFieldService.set_state(
            db,
            production_id,
            field_id,
            req,
            current_user,
        )
    except DomainError as error:
        raise _http(error)


@router.post(
    "/productions/{production_id}/custom-fields/{field_id}/purge",
    status_code=status.HTTP_200_OK,
)
async def purge_custom_field(
    production_id: str,
    field_id: str,
    req: CustomFieldPurgeRequest,
    db: AsyncSession = db_session,
    current_user: User = Depends(get_current_user),
):
    try:
        purged = await CustomFieldService.purge_field(
            db,
            production_id,
            field_id,
            req,
            current_user,
        )
        return {"ok": True, "purged": purged}
    except DomainError as error:
        raise _http(error)


@router.get(
    "/productions/{production_id}/custom-field-values",
    response_model=CustomFieldValueMatrix,
)
async def get_custom_field_values(
    production_id: str,
    db: AsyncSession = db_session,
    current_user: User = Depends(get_current_user),
):
    try:
        return await CustomFieldService.value_matrix(db, production_id)
    except DomainError as error:
        raise _http(error)


@router.patch(
    "/shots/{shot_id}/custom-fields/{field_id}",
    response_model=CustomFieldValueResult,
)
async def patch_custom_field_value(
    shot_id: str,
    field_id: str,
    req: CustomFieldValuePatch,
    db: AsyncSession = db_session,
    current_user: User = Depends(get_current_user),
):
    try:
        return await CustomFieldService.patch_value(
            db,
            shot_id,
            field_id,
            req,
            current_user,
        )
    except DomainError as error:
        raise _http(error)
