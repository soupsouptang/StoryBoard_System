"""Repository contracts and domain data transfers for FrameForge storage abstraction.

Follows ARCHITECTURE_MIGRATION.md Section 35.1 (Repository Abstraction):
Application/Domain depends only on Repository interfaces, allowing seamless
switching between SQLite (current) and PostgreSQL (target).
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Protocol


@dataclass
class ProjectDTO:
    id: str
    name: str
    production_type: str = "promo"
    fps: float = 25.0
    start_tc: str = "01:00:00:00"
    target_seconds: float = 270.0
    aspect_ratio: str = "16:9"
    status: str = "development"
    share_token: Optional[str] = None
    is_drop_frame: bool = False
    director: str = ""
    dp: str = ""
    producer: str = ""
    company: str = ""
    custom_template_json: str = "{}"
    deleted_at: Optional[str] = None
    updated_by: str = ""
    updated_by_user_id: Optional[str] = None
    created_at: str = ""
    updated_at: str = ""


@dataclass
class ShotDTO:
    id: str
    project_id: str
    sequence_id: Optional[str] = None
    position: int = 1
    number: str = "1"
    sort_index: int = 0
    title: str = ""
    chapter: str = ""
    scene: str = ""
    panel_frame: str = ""
    description: str = ""
    action: str = ""
    performance: str = ""
    composition: str = ""
    director_notes: str = ""
    notes: str = ""
    duration_frames: int = 75
    locked: bool = False
    handles_head_frames: int = 0
    handles_tail_frames: int = 0
    shot_size: str = "全景"
    lens: str = ""
    lens_source: str = ""
    angle: str = ""
    height: str = ""
    movement: str = "固定"
    equipment: str = ""
    sensor: str = ""
    aperture: str = ""
    shutter: str = ""
    camera_fps: float = 25.0
    voiceover: str = ""
    dialogue: str = ""
    subtitle: str = ""
    music: str = ""
    sound: str = ""
    primary_method: str = "LIVE"
    secondary_methods: str = "[]"
    department: str = "Camera"
    owner: str = ""
    status: str = "Draft"
    approval_version: str = "v001"
    transition: str = ""
    is_deleted: bool = False
    deleted_at: Optional[str] = None
    method_data_json: str = "{}"
    revision: int = 1
    import_columns_json: str = "{}"
    rich_text_json: str = "{}"
    script_character: str = ""
    script_parenthetical: str = ""
    script_scene_type: str = ""
    script_time_of_day: str = ""
    created_at: str = ""
    updated_at: str = ""


@dataclass
class CustomFieldDTO:
    id: str
    project_id: str
    key: str
    label: str
    type: str = "text"
    options_json: str = "[]"
    sort_order: int = 0
    is_required: bool = False
    created_at: str = ""


class ProjectRepository(ABC):
    @abstractmethod
    def get_by_id(self, project_id: str) -> Optional[ProjectDTO]: ...

    @abstractmethod
    def list_active(self) -> List[ProjectDTO]: ...

    @abstractmethod
    def save(self, project: ProjectDTO) -> None: ...

    @abstractmethod
    def soft_delete(self, project_id: str, deleted_at: str) -> bool: ...

    @abstractmethod
    def restore(self, project_id: str) -> bool: ...

    @abstractmethod
    def purge(self, project_id: str) -> bool: ...


class ShotRepository(ABC):
    @abstractmethod
    def get_by_id(self, shot_id: str) -> Optional[ShotDTO]: ...

    @abstractmethod
    def list_by_project(self, project_id: str, include_deleted: bool = False) -> List[ShotDTO]: ...

    @abstractmethod
    def save(self, shot: ShotDTO) -> None: ...

    @abstractmethod
    def update_revision(self, shot_id: str, expected_revision: int, updates: Dict[str, Any]) -> int:
        """Atomic revision increment update. Returns new revision or raises conflict."""
        ...

    @abstractmethod
    def reorder(self, project_id: str, shot_ids: List[str]) -> None: ...

    @abstractmethod
    def delete(self, shot_id: str, soft: bool = True) -> bool: ...


class FieldRepository(ABC):
    @abstractmethod
    def list_by_project(self, project_id: str) -> List[CustomFieldDTO]: ...

    @abstractmethod
    def get_by_key(self, project_id: str, key: str) -> Optional[CustomFieldDTO]: ...

    @abstractmethod
    def save(self, field_def: CustomFieldDTO) -> None: ...

    @abstractmethod
    def purge_field(self, project_id: str, field_id: str) -> bool: ...


class UnitOfWork(ABC):
    @abstractmethod
    def __enter__(self) -> "UnitOfWork": ...

    @abstractmethod
    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None: ...

    @abstractmethod
    def commit(self) -> None: ...

    @abstractmethod
    def rollback(self) -> None: ...

    @property
    @abstractmethod
    def projects(self) -> ProjectRepository: ...

    @property
    @abstractmethod
    def shots(self) -> ShotRepository: ...

    @property
    @abstractmethod
    def fields(self) -> FieldRepository: ...
