"""Projects router for FastAPI."""

from __future__ import annotations

import sqlite3
import uuid
from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi_app.dependencies import get_current_user, get_db_connection, get_uow
from fastapi_app.schemas import ProjectCreateRequest, ProjectResponse, ProjectUpdateRequest
from repositories.contracts import ProjectDTO, UnitOfWork
from runtime_clock import now_iso

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("", response_model=List[ProjectResponse])
def list_projects(
    uow: UnitOfWork = Depends(get_uow),
    current_user: sqlite3.Row = Depends(get_current_user),
):
    projects = uow.projects.list_active()
    return [
        ProjectResponse(
            id=p.id,
            name=p.name,
            production_type=p.production_type,
            fps=p.fps,
            start_tc=p.start_tc,
            target_seconds=p.target_seconds,
            aspect_ratio=p.aspect_ratio,
            status=p.status,
            share_token=p.share_token,
            director=p.director,
            dp=p.dp,
            producer=p.producer,
            company=p.company,
            created_at=p.created_at,
            updated_at=p.updated_at,
        )
        for p in projects
    ]


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    payload: ProjectCreateRequest,
    uow: UnitOfWork = Depends(get_uow),
    current_user: sqlite3.Row = Depends(get_current_user),
):
    p_id = f"proj-{uuid.uuid4().hex[:12]}"
    now = now_iso()
    dto = ProjectDTO(
        id=p_id,
        name=payload.name,
        production_type=payload.production_type,
        fps=payload.fps,
        aspect_ratio=payload.aspect_ratio,
        target_seconds=payload.target_seconds,
        director=payload.director,
        dp=payload.dp,
        producer=payload.producer,
        company=payload.company,
        created_at=now,
        updated_at=now,
        updated_by=current_user["display_name"],
        updated_by_user_id=current_user["id"],
    )
    with uow:
        uow.projects.save(dto)

    return ProjectResponse(
        id=dto.id,
        name=dto.name,
        production_type=dto.production_type,
        fps=dto.fps,
        start_tc=dto.start_tc,
        target_seconds=dto.target_seconds,
        aspect_ratio=dto.aspect_ratio,
        status=dto.status,
        share_token=dto.share_token,
        director=dto.director,
        dp=dto.dp,
        producer=dto.producer,
        company=dto.company,
        created_at=dto.created_at,
        updated_at=dto.updated_at,
    )


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: str,
    uow: UnitOfWork = Depends(get_uow),
    current_user: sqlite3.Row = Depends(get_current_user),
):
    project = uow.projects.get_by_id(project_id)
    if not project or project.deleted_at:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    return ProjectResponse(
        id=project.id,
        name=project.name,
        production_type=project.production_type,
        fps=project.fps,
        start_tc=project.start_tc,
        target_seconds=project.target_seconds,
        aspect_ratio=project.aspect_ratio,
        status=project.status,
        share_token=project.share_token,
        director=project.director,
        dp=project.dp,
        producer=project.producer,
        company=project.company,
        created_at=project.created_at,
        updated_at=project.updated_at,
    )


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: str,
    uow: UnitOfWork = Depends(get_uow),
    current_user: sqlite3.Row = Depends(get_current_user),
):
    with uow:
        deleted = uow.projects.soft_delete(project_id, now_iso())
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
