"""HTTP adapter for the independent project version service."""
from fastapi import APIRouter, Depends, HTTPException, Query
from app.api.v1.deps import get_current_user
from app.core.database import db_session
from app.core.exceptions import ConflictError, DomainError, NotFoundError
from app.schemas.project_version import ProjectBranchCreate, ProjectBranchOut, ProjectCommitCreate, ProjectCommitDetail, ProjectCommitOut
from app.services.project_version_service import ProjectVersionService as Service

router = APIRouter(prefix="/productions/{production_id}", tags=["Project versions"])


def _http(error):
    code = 404 if isinstance(error, NotFoundError) else 409 if isinstance(error, ConflictError) else 403 if error.code == "FORBIDDEN" else 400
    return HTTPException(code, detail={"code": "PROJECT_VERSION_CONFLICT" if code == 409 else error.code,
        "message": error.message, "details": getattr(error, "details", {})})


@router.get("/version-state")
async def state(production_id: str, db=db_session, user=Depends(get_current_user)):
    try:
        return await Service.working_state(db, production_id, user)
    except DomainError as error:
        raise _http(error)


@router.get("/version-graph")
async def graph(production_id: str, limit: int = Query(100, ge=1, le=500), before_id: str | None = None,
    db=db_session, user=Depends(get_current_user)):
    try:
        result = await Service.graph(db, production_id, user, limit, before_id)
        return {"commits": [ProjectCommitOut.model_validate(row) for row in result["commits"]],
            "branches": [ProjectBranchOut.model_validate(row) for row in result["branches"]],
            "next_before_id": result["next_before_id"]}
    except DomainError as error:
        raise _http(error)


@router.post("/commits", response_model=ProjectCommitOut, status_code=201)
async def create(production_id: str, req: ProjectCommitCreate, db=db_session, user=Depends(get_current_user)):
    try:
        return await Service.create_commit(db, production_id, req, user)
    except DomainError as error:
        raise _http(error)


@router.post("/version-branches", response_model=ProjectBranchOut, status_code=201)
async def branch(production_id: str, req: ProjectBranchCreate, db=db_session, user=Depends(get_current_user)):
    try:
        return await Service.create_branch(db, production_id, req, user)
    except DomainError as error:
        raise _http(error)


@router.get("/commits/{commit_id}", response_model=ProjectCommitDetail)
async def detail(production_id: str, commit_id: str, db=db_session, user=Depends(get_current_user)):
    try:
        return await Service.detail(db, production_id, commit_id, user)
    except DomainError as error:
        raise _http(error)


@router.get("/commits/{commit_id}/compare")
async def compare(production_id: str, commit_id: str, to_id: str | None = None, shot_id: str | None = None,
    db=db_session, user=Depends(get_current_user)):
    try:
        return await Service.compare(db, production_id, commit_id, user, to_id, shot_id)
    except DomainError as error:
        raise _http(error)
