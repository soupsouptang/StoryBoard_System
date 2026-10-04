"""AI router exposing capabilities, proposal generation, and human review."""

from __future__ import annotations

import sqlite3
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi_app.dependencies import get_current_user, get_db_connection
from fastapi_app.schemas import ScriptBreakdownAPIRequest, VisualSuggestionAPIRequest
from ai_system.contracts import ScriptBreakdownRequest, VisualSuggestionRequest
from ai_system.service import AIService

router = APIRouter(prefix="/api/ai", tags=["ai"])


def get_ai_service(conn: sqlite3.Connection = Depends(get_db_connection)) -> AIService:
    return AIService(conn)


@router.get("/capabilities")
def get_capabilities(
    service: AIService = Depends(get_ai_service),
    current_user: sqlite3.Row = Depends(get_current_user),
):
    caps = service.get_capabilities()
    return {
        "status": "ok",
        "capabilities": caps.to_dict(),
        "endpoints": {
            "script_breakdown": "/api/ai/script-breakdown",
            "visual_suggestions": "/api/ai/visual-suggestions",
        },
    }


@router.post("/script-breakdown")
def script_breakdown(
    payload: ScriptBreakdownAPIRequest,
    service: AIService = Depends(get_ai_service),
    current_user: sqlite3.Row = Depends(get_current_user),
):
    try:
        req = ScriptBreakdownRequest(
            project_id=payload.project_id,
            script_text=payload.script_text,
            target_fps=payload.target_fps,
        )
        proposal = service.request_script_breakdown(req, user_id=current_user["id"])
        return proposal.to_dict()
    except RuntimeError as err:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(err))


@router.post("/visual-suggestions")
def visual_suggestions(
    payload: VisualSuggestionAPIRequest,
    service: AIService = Depends(get_ai_service),
    current_user: sqlite3.Row = Depends(get_current_user),
):
    try:
        req = VisualSuggestionRequest(
            project_id=payload.project_id,
            shot_id=payload.shot_id,
            current_action=payload.current_action,
            current_dialogue=payload.current_dialogue,
            current_shot_size=payload.current_shot_size,
        )
        proposal = service.request_visual_suggestions(req, user_id=current_user["id"])
        return proposal.to_dict()
    except RuntimeError as err:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(err))


@router.get("/projects/{project_id}/proposals")
def list_proposals(
    project_id: str,
    status_filter: Optional[str] = None,
    service: AIService = Depends(get_ai_service),
    current_user: sqlite3.Row = Depends(get_current_user),
):
    return service.list_proposals(project_id, status=status_filter)


@router.post("/proposals/{proposal_id}/accept")
def accept_proposal(
    proposal_id: str,
    conn: sqlite3.Connection = Depends(get_db_connection),
    service: AIService = Depends(get_ai_service),
    current_user: sqlite3.Row = Depends(get_current_user),
):
    try:
        res = service.accept_proposal(proposal_id, reviewer_user_id=current_user["id"])
        conn.commit()
        return res
    except KeyError as err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(err))
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(err))


@router.post("/proposals/{proposal_id}/reject")
def reject_proposal(
    proposal_id: str,
    conn: sqlite3.Connection = Depends(get_db_connection),
    service: AIService = Depends(get_ai_service),
    current_user: sqlite3.Row = Depends(get_current_user),
):
    try:
        res = service.reject_proposal(proposal_id, reviewer_user_id=current_user["id"])
        conn.commit()
        return {"ok": True, "proposal_id": proposal_id, "status": "rejected"}
    except KeyError as err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(err))
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(err))
