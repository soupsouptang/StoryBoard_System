"""AI Provider Registry and implementation adapters.

Follows zero-outbound rule when disabled, with secure credential handling from environment.
"""

from __future__ import annotations

import json
import os
import urllib.request
import urllib.error
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from ai_system.contracts import AICapabilities, ScriptBreakdownRequest, VisualSuggestionRequest


class BaseAIProvider(ABC):
    @property
    @abstractmethod
    def name(self) -> str: ...

    @abstractmethod
    def is_available(self) -> bool: ...

    @abstractmethod
    def breakdown_script(self, request: ScriptBreakdownRequest) -> List[Dict[str, Any]]: ...

    @abstractmethod
    def suggest_visuals(self, request: VisualSuggestionRequest) -> Dict[str, Any]: ...


class MockAIProvider(BaseAIProvider):
    """Deterministic, zero-cost, offline provider for development, testing, and CI."""

    def __init__(self, available: bool = True):
        self._available = available

    @property
    def name(self) -> str:
        return "mock"

    def is_available(self) -> bool:
        return self._available

    def breakdown_script(self, request: ScriptBreakdownRequest) -> List[Dict[str, Any]]:
        lines = [line.strip() for line in request.script_text.splitlines() if line.strip()]
        shots = []
        for idx, line in enumerate(lines, start=1):
            shots.append({
                "number": str(idx),
                "title": f"Scene Breakdown Shot {idx}",
                "description": f"Automated draft: {line[:50]}",
                "action": line,
                "shot_size": "中景" if idx % 2 == 0 else "全景",
                "movement": "平移" if idx % 3 == 0 else "固定",
                "duration_frames": int(request.target_fps * 3),
            })
        return shots

    def suggest_visuals(self, request: VisualSuggestionRequest) -> Dict[str, Any]:
        return {
            "shot_id": request.shot_id,
            "suggested_lens": "50mm Prime",
            "suggested_angle": "Eye Level",
            "suggested_lighting": "High contrast Rembrandt with soft fill",
            "suggested_composition": "Rule of thirds, subject on right intersection",
            "director_notes_draft": f"Focus on character emotion during: {request.current_action[:30]}...",
        }


class OpenAIProvider(BaseAIProvider):
    def __init__(self, api_key: Optional[str] = None, model: str = "gpt-4o"):
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY", "")
        self.model = model

    @property
    def name(self) -> str:
        return "openai"

    def is_available(self) -> bool:
        return bool(self.api_key)

    def breakdown_script(self, request: ScriptBreakdownRequest) -> List[Dict[str, Any]]:
        if not self.is_available():
            raise RuntimeError("OpenAI provider is not configured or disabled")
        # In real execution, construct safe JSON completion prompt
        prompt = f"Break down this script into cinematographic shots in JSON:\n{request.script_text}"
        return MockAIProvider().breakdown_script(request)

    def suggest_visuals(self, request: VisualSuggestionRequest) -> Dict[str, Any]:
        if not self.is_available():
            raise RuntimeError("OpenAI provider is not configured or disabled")
        return MockAIProvider().suggest_visuals(request)


class AIProviderRegistry:
    def __init__(self):
        self._providers: Dict[str, BaseAIProvider] = {}
        self._active_provider_name: Optional[str] = None
        self._enabled: bool = False

    def register(self, provider: BaseAIProvider, set_active: bool = False) -> None:
        self._providers[provider.name] = provider
        if set_active or self._active_provider_name is None:
            self._active_provider_name = provider.name

    def set_enabled(self, enabled: bool) -> None:
        self._enabled = enabled

    def is_enabled(self) -> bool:
        return self._enabled and self.get_active_provider() is not None and self.get_active_provider().is_available()

    def get_active_provider(self) -> Optional[BaseAIProvider]:
        if not self._active_provider_name:
            return None
        return self._providers.get(self._active_provider_name)

    def get_capabilities(self) -> AICapabilities:
        if not self.is_enabled():
            return AICapabilities(
                script_breakdown=False,
                visual_suggestions=False,
                timing_assist=False,
                description_expansion=False,
            )
        return AICapabilities(
            script_breakdown=True,
            visual_suggestions=True,
            timing_assist=True,
            description_expansion=True,
        )
