"""AI System package for FrameForge."""

from ai_system.contracts import (
    AICapabilities,
    AIProposal,
    ProposalStatus,
    ScriptBreakdownRequest,
    VisualSuggestionRequest,
)
from ai_system.providers import (
    AIProviderRegistry,
    BaseAIProvider,
    MockAIProvider,
    OpenAIProvider,
)
from ai_system.proposal_store import ProposalStore
from ai_system.service import AIService

__all__ = [
    "AICapabilities",
    "AIProposal",
    "ProposalStatus",
    "ScriptBreakdownRequest",
    "VisualSuggestionRequest",
    "BaseAIProvider",
    "MockAIProvider",
    "OpenAIProvider",
    "AIProviderRegistry",
    "ProposalStore",
    "AIService",
]
