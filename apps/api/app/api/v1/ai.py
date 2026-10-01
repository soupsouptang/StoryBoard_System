"""AI & Automation API Routes for Human-In-The-Loop Workflow."""
from __future__ import annotations

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user
from app.core.database import db_session
from app.models.user import User
from app.schemas.ai import (
    AIProposalOut,
    AIStatusResponse,
    ProposalGenerateRequest,
    ProposalReviewRequest,
)
from app.services.ai_proposal import generate_proposal, proposal_store, review_proposal
from app.services.ai_provider import provider_registry

router = APIRouter(prefix="/ai", tags=["AI Automation"])


@router.get("/status", response_model=AIStatusResponse)
async def get_ai_status(current_user: User = Depends(get_current_user)):
    """Check AI engine availability and supported capabilities."""
    provider = provider_registry.get("mock-provider-offline")
    caps = provider.supported_capabilities if provider else []
    return {
        "is_enabled": provider_registry.is_enabled,
        "active_provider": provider.name if provider else "none",
        "supported_capabilities": caps,
    }


@router.post("/proposals/generate", response_model=AIProposalOut, status_code=status.HTTP_201_CREATED)
async def create_ai_proposal(
    req: ProposalGenerateRequest,
    db: AsyncSession = db_session,
    current_user: User = Depends(get_current_user),
):
    """Generate candidate proposal for human review. Zero mutation occurs until accepted."""
    try:
        proposal = await generate_proposal(
            db=db,
            production_id=req.production_id,
            capability=req.capability,
            target_shot_id=req.target_shot_id,
            parameters=req.parameters,
            user_id=current_user.id,
        )
        return proposal
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "AI_GENERATION_FAILED", "message": str(e)},
        )


@router.get("/proposals", response_model=List[AIProposalOut])
async def list_ai_proposals(
    production_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
):
    """List pending or reviewed candidate proposals."""
    return proposal_store.list(production_id=production_id, status=status)


@router.get("/proposals/{proposal_id}", response_model=AIProposalOut)
async def get_ai_proposal(
    proposal_id: str,
    current_user: User = Depends(get_current_user),
):
    """Retrieve detailed proposal and change diffs."""
    proposal = proposal_store.get(proposal_id)
    if not proposal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "PROPOSAL_NOT_FOUND", "message": "Proposal not found"},
        )
    return proposal


@router.post("/proposals/{proposal_id}/review", response_model=AIProposalOut)
async def review_ai_proposal(
    proposal_id: str,
    req: ProposalReviewRequest,
    db: AsyncSession = db_session,
    current_user: User = Depends(get_current_user),
):
    """Human-In-The-Loop review: accept or reject candidate proposal."""
    if req.action not in ("accept", "reject"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVALID_ACTION", "message": "Action must be 'accept' or 'reject'"},
        )
    try:
        result = await review_proposal(
            db=db,
            proposal_id=proposal_id,
            action=req.action,
            user_id=current_user.id,
            review_notes=req.review_notes,
        )
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "REVIEW_FAILED", "message": str(e)},
        )
