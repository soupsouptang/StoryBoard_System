"""AIService orchestrating capability checks, proposal generation, and safe execution.

Strictly preserves invariants:
- Cannot write to shots without explicit human acceptance
- Zero network outbound if disabled
- Audited with user id, timestamp, and review status
"""

from __future__ import annotations

import sqlite3
import uuid
from typing import Any, Dict, List, Optional
from ai_system.contracts import (
    AICapabilities,
    AIProposal,
    ProposalStatus,
    ScriptBreakdownRequest,
    VisualSuggestionRequest,
)
from ai_system.providers import AIProviderRegistry, MockAIProvider
from ai_system.proposal_store import ProposalStore
from runtime_clock import now_iso
from persistence_helpers import audit


class AIService:
    def __init__(self, db: sqlite3.Connection, registry: Optional[AIProviderRegistry] = None):
        self._db = db
        self._store = ProposalStore(db)
        if registry is None:
            self._registry = AIProviderRegistry()
            self._registry.register(MockAIProvider())
        else:
            self._registry = registry

    @property
    def registry(self) -> AIProviderRegistry:
        return self._registry

    def get_capabilities(self) -> AICapabilities:
        return self._registry.get_capabilities()

    def request_script_breakdown(
        self, request: ScriptBreakdownRequest, user_id: Optional[str] = None
    ) -> AIProposal:
        if not self._registry.is_enabled():
            raise RuntimeError("AI capabilities are disabled on this instance")

        provider = self._registry.get_active_provider()
        if not provider:
            raise RuntimeError("No active AI provider configured")

        draft_shots = provider.breakdown_script(request)
        proposal_id = f"aip-{uuid.uuid4().hex[:12]}"
        proposal = AIProposal(
            id=proposal_id,
            project_id=request.project_id,
            capability="script_breakdown",
            status=ProposalStatus.PENDING,
            model=provider.name,
            prompt_summary=f"Script breakdown of {len(request.script_text)} characters",
            changes=draft_shots,
            created_by_user_id=user_id,
            created_at=now_iso(),
        )
        self._store.create(proposal)
        audit(self._db, user_id or "anonymous", "ai.proposal.create", proposal_id, "script_breakdown")
        return proposal

    def request_visual_suggestions(
        self, request: VisualSuggestionRequest, user_id: Optional[str] = None
    ) -> AIProposal:
        if not self._registry.is_enabled():
            raise RuntimeError("AI capabilities are disabled on this instance")

        provider = self._registry.get_active_provider()
        if not provider:
            raise RuntimeError("No active AI provider configured")

        suggestions = provider.suggest_visuals(request)
        proposal_id = f"aip-{uuid.uuid4().hex[:12]}"
        proposal = AIProposal(
            id=proposal_id,
            project_id=request.project_id,
            capability="visual_suggestions",
            status=ProposalStatus.PENDING,
            model=provider.name,
            prompt_summary=f"Visual suggestions for shot {request.shot_id}",
            changes=[suggestions],
            created_by_user_id=user_id,
            created_at=now_iso(),
        )
        self._store.create(proposal)
        audit(self._db, user_id or "anonymous", "ai.proposal.create", proposal_id, "visual_suggestions")
        return proposal

    def list_proposals(self, project_id: str, status: Optional[str] = None) -> List[Dict[str, Any]]:
        st = ProposalStatus(status) if status else None
        proposals = self._store.list_by_project(project_id, status=st)
        return [p.to_dict() for p in proposals]

    def get_proposal(self, proposal_id: str) -> Optional[Dict[str, Any]]:
        p = self._store.get_by_id(proposal_id)
        return p.to_dict() if p else None

    def reject_proposal(self, proposal_id: str, reviewer_user_id: Optional[str] = None) -> bool:
        proposal = self._store.get_by_id(proposal_id)
        if not proposal:
            return False
        if proposal.status != ProposalStatus.PENDING:
            raise ValueError(f"Proposal cannot be rejected from status {proposal.status.value}")

        self._store.update_status(
            proposal_id,
            ProposalStatus.REJECTED,
            reviewed_by_user_id=reviewer_user_id,
            reviewed_at=now_iso(),
        )
        audit(self._db, reviewer_user_id or "anonymous", "ai.proposal.reject", proposal_id, "")
        return True

    def accept_proposal(
        self, proposal_id: str, reviewer_user_id: Optional[str] = None, apply_changes: bool = True
    ) -> Dict[str, Any]:
        """Human-in-the-loop: Explicitly accept and commit AI proposals to shots table."""
        proposal = self._store.get_by_id(proposal_id)
        if not proposal:
            raise KeyError(f"Proposal {proposal_id} not found")
        if proposal.status != ProposalStatus.PENDING:
            raise ValueError(f"Proposal cannot be accepted from status {proposal.status.value}")

        now = now_iso()
        applied_count = 0

        if apply_changes:
            if proposal.capability == "visual_suggestions":
                for patch in proposal.changes:
                    shot_id = patch.get("shot_id")
                    if not shot_id:
                        continue
                    # Safely apply visual fields if provided
                    fields_to_update = {}
                    if "suggested_lens" in patch:
                        fields_to_update["lens"] = patch["suggested_lens"]
                    if "suggested_angle" in patch:
                        fields_to_update["angle"] = patch["suggested_angle"]
                    if "director_notes_draft" in patch:
                        fields_to_update["director_notes"] = patch["director_notes_draft"]

                    if fields_to_update:
                        set_parts = [f"{k} = ?" for k in fields_to_update.keys()]
                        vals = list(fields_to_update.values())
                        vals.extend([shot_id, proposal.project_id])
                        self._db.execute(
                            f"UPDATE shots SET {', '.join(set_parts)}, updated_at = ? WHERE id = ? AND project_id = ?",
                            [*list(fields_to_update.values()), now, shot_id, proposal.project_id],
                        )
                        applied_count += 1

            elif proposal.capability == "script_breakdown":
                # Inserts proposed shots
                cur = self._db.execute(
                    "SELECT COALESCE(MAX(position), 0) FROM shots WHERE project_id = ?",
                    (proposal.project_id,),
                )
                base_pos = cur.fetchone()[0]
                for idx, draft in enumerate(proposal.changes, start=1):
                    shot_id = f"shot-{uuid.uuid4().hex[:12]}"
                    pos = base_pos + idx
                    self._db.execute(
                        """
                        INSERT INTO shots (
                            id, project_id, position, number, sort_index, title, description,
                            action, shot_size, movement, duration_frames, created_at, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            shot_id,
                            proposal.project_id,
                            pos,
                            str(pos),
                            pos - 1,
                            draft.get("title", ""),
                            draft.get("description", ""),
                            draft.get("action", ""),
                            draft.get("shot_size", "全景"),
                            draft.get("movement", "固定"),
                            draft.get("duration_frames", 75),
                            now,
                            now,
                        ),
                    )
                    applied_count += 1

        self._store.update_status(
            proposal_id,
            ProposalStatus.ACCEPTED,
            reviewed_by_user_id=reviewer_user_id,
            reviewed_at=now,
        )
        audit(
            self._db,
            reviewer_user_id or "anonymous",
            "ai.proposal.accept",
            proposal_id,
            f"applied_count:{applied_count}",
        )

        return {
            "proposal_id": proposal_id,
            "status": "accepted",
            "applied_count": applied_count,
            "reviewed_at": now,
        }
