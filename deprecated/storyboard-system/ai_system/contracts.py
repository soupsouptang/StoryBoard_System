"""AI System contracts and domain data structures for FrameForge.

Strictly enforces ARCHITECTURE_MIGRATION.md Section 35.5 & 35.6:
1. Default disabled: Zero outbound calls when disabled
2. Strict permission & context filtering: No DB session or secrets passed to LLMs
3. Proposals, not direct mutations: AI outputs must be accepted by a human before
   being committed through the standard shot command pipeline.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional


class ProposalStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    DISCARDED = "discarded"


@dataclass
class AICapabilities:
    script_breakdown: bool = False
    visual_suggestions: bool = False
    timing_assist: bool = False
    description_expansion: bool = False

    def to_dict(self) -> Dict[str, bool]:
        return {
            "script_breakdown": self.script_breakdown,
            "visual_suggestions": self.visual_suggestions,
            "timing_assist": self.timing_assist,
            "description_expansion": self.description_expansion,
        }


@dataclass
class AIProposal:
    id: str
    project_id: str
    capability: str
    status: ProposalStatus = ProposalStatus.PENDING
    model: str = "mock-model"
    prompt_summary: str = ""
    # Structured proposed changes (e.g. list of shot patches or new shot drafts)
    changes: List[Dict[str, Any]] = field(default_factory=list)
    created_by_user_id: Optional[str] = None
    reviewed_by_user_id: Optional[str] = None
    reviewed_at: Optional[str] = None
    created_at: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "project_id": self.project_id,
            "capability": self.capability,
            "status": self.status.value,
            "model": self.model,
            "prompt_summary": self.prompt_summary,
            "changes": self.changes,
            "created_by_user_id": self.created_by_user_id,
            "reviewed_by_user_id": self.reviewed_by_user_id,
            "reviewed_at": self.reviewed_at,
            "created_at": self.created_at,
        }


@dataclass
class ScriptBreakdownRequest:
    project_id: str
    script_text: str
    target_fps: float = 25.0
    scene_filter: Optional[str] = None


@dataclass
class VisualSuggestionRequest:
    project_id: str
    shot_id: str
    current_action: str
    current_dialogue: str = ""
    current_shot_size: str = "全景"
    style_preference: str = "cinematic"
