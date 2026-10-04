"""PostgreSQL repository implementation for FrameForge target database engine.

Conforms to ARCHITECTURE_MIGRATION.md Section 35.1 / 35.2.
Uses standard DB-API 2.0 cursor interface (e.g. psycopg2 / psycopg3 / asyncpg sync wrapper).
"""

from __future__ import annotations

import json
from typing import Any, Dict, List, Optional
from repositories.contracts import (
    CustomFieldDTO,
    FieldRepository,
    ProjectDTO,
    ProjectRepository,
    ShotDTO,
    ShotRepository,
    UnitOfWork,
)


class PostgresProjectRepository(ProjectRepository):
    def __init__(self, conn: Any):
        self._conn = conn

    def get_by_id(self, project_id: str) -> Optional[ProjectDTO]:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, name, production_type, fps, start_tc, target_seconds, aspect_ratio,
                       status, share_token, is_drop_frame, director, dp, producer, company,
                       custom_template_json, deleted_at, updated_by, updated_by_user_id,
                       created_at, updated_at
                FROM projects WHERE id = %s
                """,
                (project_id,),
            )
            row = cur.fetchone()
            if not row:
                return None
            return ProjectDTO(
                id=row[0],
                name=row[1],
                production_type=row[2],
                fps=row[3],
                start_tc=row[4],
                target_seconds=row[5],
                aspect_ratio=row[6],
                status=row[7],
                share_token=row[8],
                is_drop_frame=bool(row[9]),
                director=row[10],
                dp=row[11],
                producer=row[12],
                company=row[13],
                custom_template_json=json.dumps(row[14]) if isinstance(row[14], dict) else str(row[14]),
                deleted_at=str(row[15]) if row[15] else None,
                updated_by=row[16],
                updated_by_user_id=row[17],
                created_at=str(row[18]),
                updated_at=str(row[19]),
            )

    def list_active(self) -> List[ProjectDTO]:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, name, production_type, fps, start_tc, target_seconds, aspect_ratio,
                       status, share_token, is_drop_frame, director, dp, producer, company,
                       custom_template_json, deleted_at, updated_by, updated_by_user_id,
                       created_at, updated_at
                FROM projects WHERE deleted_at IS NULL ORDER BY updated_at DESC
                """
            )
            res = []
            for row in cur.fetchall():
                res.append(
                    ProjectDTO(
                        id=row[0],
                        name=row[1],
                        production_type=row[2],
                        fps=row[3],
                        start_tc=row[4],
                        target_seconds=row[5],
                        aspect_ratio=row[6],
                        status=row[7],
                        share_token=row[8],
                        is_drop_frame=bool(row[9]),
                        director=row[10],
                        dp=row[11],
                        producer=row[12],
                        company=row[13],
                        custom_template_json=json.dumps(row[14]) if isinstance(row[14], dict) else str(row[14]),
                        deleted_at=str(row[15]) if row[15] else None,
                        updated_by=row[16],
                        updated_by_user_id=row[17],
                        created_at=str(row[18]),
                        updated_at=str(row[19]),
                    )
                )
            return res

    def save(self, project: ProjectDTO) -> None:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO projects (
                    id, name, production_type, fps, start_tc, target_seconds, aspect_ratio,
                    status, share_token, is_drop_frame, director, dp, producer, company,
                    custom_template_json, deleted_at, updated_by, updated_by_user_id,
                    created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s, %s, %s, %s, %s)
                ON CONFLICT(id) DO UPDATE SET
                    name=EXCLUDED.name,
                    production_type=EXCLUDED.production_type,
                    fps=EXCLUDED.fps,
                    start_tc=EXCLUDED.start_tc,
                    target_seconds=EXCLUDED.target_seconds,
                    aspect_ratio=EXCLUDED.aspect_ratio,
                    status=EXCLUDED.status,
                    share_token=EXCLUDED.share_token,
                    is_drop_frame=EXCLUDED.is_drop_frame,
                    director=EXCLUDED.director,
                    dp=EXCLUDED.dp,
                    producer=EXCLUDED.producer,
                    company=EXCLUDED.company,
                    custom_template_json=EXCLUDED.custom_template_json,
                    deleted_at=EXCLUDED.deleted_at,
                    updated_by=EXCLUDED.updated_by,
                    updated_by_user_id=EXCLUDED.updated_by_user_id,
                    updated_at=EXCLUDED.updated_at
                """,
                (
                    project.id,
                    project.name,
                    project.production_type,
                    project.fps,
                    project.start_tc,
                    project.target_seconds,
                    project.aspect_ratio,
                    project.status,
                    project.share_token,
                    project.is_drop_frame,
                    project.director,
                    project.dp,
                    project.producer,
                    project.company,
                    project.custom_template_json or "{}",
                    project.deleted_at,
                    project.updated_by,
                    project.updated_by_user_id,
                    project.created_at,
                    project.updated_at,
                ),
            )

    def soft_delete(self, project_id: str, deleted_at: str) -> bool:
        with self._conn.cursor() as cur:
            cur.execute("UPDATE projects SET deleted_at = %s WHERE id = %s", (deleted_at, project_id))
            return cur.rowcount > 0

    def restore(self, project_id: str) -> bool:
        with self._conn.cursor() as cur:
            cur.execute("UPDATE projects SET deleted_at = NULL WHERE id = %s", (project_id,))
            return cur.rowcount > 0

    def purge(self, project_id: str) -> bool:
        with self._conn.cursor() as cur:
            cur.execute("DELETE FROM projects WHERE id = %s", (project_id,))
            return cur.rowcount > 0


class PostgresShotRepository(ShotRepository):
    def __init__(self, conn: Any):
        self._conn = conn

    def get_by_id(self, shot_id: str) -> Optional[ShotDTO]:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, project_id, sequence_id, position, number, sort_index, title, chapter,
                       scene, panel_frame, description, action, performance, composition,
                       director_notes, notes, duration_frames, locked, handles_head_frames,
                       handles_tail_frames, shot_size, lens, lens_source, angle, height,
                       movement, equipment, sensor, aperture, shutter, camera_fps, voiceover,
                       dialogue, subtitle, music, sound, primary_method, secondary_methods,
                       department, owner, status, approval_version, transition, is_deleted,
                       deleted_at, method_data_json, revision, import_columns_json, rich_text_json,
                       script_character, script_parenthetical, script_scene_type, script_time_of_day,
                       created_at, updated_at
                FROM shots WHERE id = %s
                """,
                (shot_id,),
            )
            row = cur.fetchone()
            if not row:
                return None
            return self._map_row(row)

    def list_by_project(self, project_id: str, include_deleted: bool = False) -> List[ShotDTO]:
        sql = """
            SELECT id, project_id, sequence_id, position, number, sort_index, title, chapter,
                   scene, panel_frame, description, action, performance, composition,
                   director_notes, notes, duration_frames, locked, handles_head_frames,
                   handles_tail_frames, shot_size, lens, lens_source, angle, height,
                   movement, equipment, sensor, aperture, shutter, camera_fps, voiceover,
                   dialogue, subtitle, music, sound, primary_method, secondary_methods,
                   department, owner, status, approval_version, transition, is_deleted,
                   deleted_at, method_data_json, revision, import_columns_json, rich_text_json,
                   script_character, script_parenthetical, script_scene_type, script_time_of_day,
                   created_at, updated_at
            FROM shots WHERE project_id = %s
        """
        if not include_deleted:
            sql += " AND is_deleted = FALSE AND deleted_at IS NULL"
        sql += " ORDER BY sort_index ASC, position ASC"
        with self._conn.cursor() as cur:
            cur.execute(sql, (project_id,))
            return [self._map_row(r) for r in cur.fetchall()]

    def _map_row(self, r: tuple) -> ShotDTO:
        def _to_json(val: Any) -> str:
            if isinstance(val, (dict, list)):
                return json.dumps(val)
            return str(val or "{}")

        return ShotDTO(
            id=r[0],
            project_id=r[1],
            sequence_id=r[2],
            position=r[3],
            number=r[4],
            sort_index=r[5],
            title=r[6],
            chapter=r[7],
            scene=r[8],
            panel_frame=r[9],
            description=r[10],
            action=r[11],
            performance=r[12],
            composition=r[13],
            director_notes=r[14],
            notes=r[15],
            duration_frames=r[16],
            locked=bool(r[17]),
            handles_head_frames=r[18],
            handles_tail_frames=r[19],
            shot_size=r[20],
            lens=r[21],
            lens_source=r[22],
            angle=r[23],
            height=r[24],
            movement=r[25],
            equipment=r[26],
            sensor=r[27],
            aperture=r[28],
            shutter=r[29],
            camera_fps=r[30],
            voiceover=r[31],
            dialogue=r[32],
            subtitle=r[33],
            music=r[34],
            sound=r[35],
            primary_method=r[36],
            secondary_methods=_to_json(r[37]),
            department=r[38],
            owner=r[39],
            status=r[40],
            approval_version=r[41],
            transition=r[42],
            is_deleted=bool(r[43]),
            deleted_at=str(r[44]) if r[44] else None,
            method_data_json=_to_json(r[45]),
            revision=r[46],
            import_columns_json=_to_json(r[47]),
            rich_text_json=_to_json(r[48]),
            script_character=r[49],
            script_parenthetical=r[50],
            script_scene_type=r[51],
            script_time_of_day=r[52],
            created_at=str(r[53]),
            updated_at=str(r[54]),
        )

    def save(self, shot: ShotDTO) -> None:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO shots (
                    id, project_id, sequence_id, position, number, sort_index, title, chapter,
                    scene, panel_frame, description, action, performance, composition,
                    director_notes, notes, duration_frames, locked, handles_head_frames,
                    handles_tail_frames, shot_size, lens, lens_source, angle, height,
                    movement, equipment, sensor, aperture, shutter, camera_fps, voiceover,
                    dialogue, subtitle, music, sound, primary_method, secondary_methods,
                    department, owner, status, approval_version, transition, is_deleted,
                    deleted_at, method_data_json, revision, import_columns_json, rich_text_json,
                    script_character, script_parenthetical, script_scene_type, script_time_of_day,
                    created_at, updated_at
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb,
                    %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s, %s::jsonb, %s::jsonb, %s, %s, %s, %s,
                    %s, %s
                )
                ON CONFLICT(id) DO UPDATE SET
                    position=EXCLUDED.position,
                    number=EXCLUDED.number,
                    sort_index=EXCLUDED.sort_index,
                    title=EXCLUDED.title,
                    description=EXCLUDED.description,
                    action=EXCLUDED.action,
                    dialogue=EXCLUDED.dialogue,
                    voiceover=EXCLUDED.voiceover,
                    duration_frames=EXCLUDED.duration_frames,
                    shot_size=EXCLUDED.shot_size,
                    lens=EXCLUDED.lens,
                    movement=EXCLUDED.movement,
                    status=EXCLUDED.status,
                    revision=EXCLUDED.revision,
                    updated_at=EXCLUDED.updated_at
                """,
                (
                    shot.id, shot.project_id, shot.sequence_id, shot.position, shot.number, shot.sort_index,
                    shot.title, shot.chapter, shot.scene, shot.panel_frame, shot.description, shot.action,
                    shot.performance, shot.composition, shot.director_notes, shot.notes, shot.duration_frames,
                    shot.locked, shot.handles_head_frames, shot.handles_tail_frames, shot.shot_size,
                    shot.lens, shot.lens_source, shot.angle, shot.height, shot.movement, shot.equipment,
                    shot.sensor, shot.aperture, shot.shutter, shot.camera_fps, shot.voiceover, shot.dialogue,
                    shot.subtitle, shot.music, shot.sound, shot.primary_method, shot.secondary_methods or "[]",
                    shot.department, shot.owner, shot.status, shot.approval_version, shot.transition,
                    shot.is_deleted, shot.deleted_at, shot.method_data_json or "{}", shot.revision,
                    shot.import_columns_json or "{}", shot.rich_text_json or "{}", shot.script_character,
                    shot.script_parenthetical, shot.script_scene_type, shot.script_time_of_day,
                    shot.created_at, shot.updated_at
                ),
            )

    def update_revision(self, shot_id: str, expected_revision: int, updates: Dict[str, Any]) -> int:
        with self._conn.cursor() as cur:
            cur.execute("SELECT revision FROM shots WHERE id = %s FOR UPDATE", (shot_id,))
            row = cur.fetchone()
            if not row:
                raise KeyError(f"Shot {shot_id} not found")
            actual_revision = row[0]
            if actual_revision != expected_revision:
                raise ValueError(f"Revision conflict: expected {expected_revision}, actual {actual_revision}")

            new_revision = actual_revision + 1
            set_clauses = ["revision = %s"]
            params: list[Any] = [new_revision]
            for k, v in updates.items():
                if k.endswith("_json"):
                    set_clauses.append(f"{k} = %s::jsonb")
                else:
                    set_clauses.append(f"{k} = %s")
                params.append(v)
            params.extend([shot_id, expected_revision])
            cur.execute(
                f"UPDATE shots SET {', '.join(set_clauses)} WHERE id = %s AND revision = %s",
                params,
            )
            if cur.rowcount == 0:
                raise ValueError("Concurrent update detected during write")
            return new_revision

    def reorder(self, project_id: str, shot_ids: List[str]) -> None:
        with self._conn.cursor() as cur:
            for idx, s_id in enumerate(shot_ids):
                cur.execute(
                    "UPDATE shots SET sort_index = %s, position = %s WHERE id = %s AND project_id = %s",
                    (idx, idx + 1, s_id, project_id),
                )

    def delete(self, shot_id: str, soft: bool = True) -> bool:
        with self._conn.cursor() as cur:
            if soft:
                cur.execute("UPDATE shots SET is_deleted = TRUE WHERE id = %s", (shot_id,))
            else:
                cur.execute("DELETE FROM shots WHERE id = %s", (shot_id,))
            return cur.rowcount > 0


class PostgresFieldRepository(FieldRepository):
    def __init__(self, conn: Any):
        self._conn = conn

    def list_by_project(self, project_id: str) -> List[CustomFieldDTO]:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, project_id, key, label, type, options_json, sort_order, is_required, created_at
                FROM custom_field_definitions WHERE project_id = %s ORDER BY sort_order ASC
                """,
                (project_id,),
            )
            return [
                CustomFieldDTO(
                    id=r[0],
                    project_id=r[1],
                    key=r[2],
                    label=r[3],
                    type=r[4],
                    options_json=json.dumps(r[5]) if isinstance(r[5], (list, dict)) else str(r[5]),
                    sort_order=r[6],
                    is_required=bool(r[7]),
                    created_at=str(r[8]),
                )
                for r in cur.fetchall()
            ]

    def get_by_key(self, project_id: str, key: str) -> Optional[CustomFieldDTO]:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, project_id, key, label, type, options_json, sort_order, is_required, created_at
                FROM custom_field_definitions WHERE project_id = %s AND key = %s
                """,
                (project_id, key),
            )
            r = cur.fetchone()
            if not r:
                return None
            return CustomFieldDTO(
                id=r[0],
                project_id=r[1],
                key=r[2],
                label=r[3],
                type=r[4],
                options_json=json.dumps(r[5]) if isinstance(r[5], (list, dict)) else str(r[5]),
                sort_order=r[6],
                is_required=bool(r[7]),
                created_at=str(r[8]),
            )

    def save(self, field_def: CustomFieldDTO) -> None:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO custom_field_definitions (
                    id, project_id, key, label, type, options_json, sort_order, is_required, created_at
                ) VALUES (%s, %s, %s, %s, %s, %s::jsonb, %s, %s, %s)
                ON CONFLICT(id) DO UPDATE SET
                    label=EXCLUDED.label,
                    type=EXCLUDED.type,
                    options_json=EXCLUDED.options_json,
                    sort_order=EXCLUDED.sort_order,
                    is_required=EXCLUDED.is_required
                """,
                (
                    field_def.id,
                    field_def.project_id,
                    field_def.key,
                    field_def.label,
                    field_def.type,
                    field_def.options_json or "[]",
                    field_def.sort_order,
                    field_def.is_required,
                    field_def.created_at,
                ),
            )

    def purge_field(self, project_id: str, field_id: str) -> bool:
        with self._conn.cursor() as cur:
            cur.execute("DELETE FROM custom_field_values WHERE field_id = %s", (field_id,))
            cur.execute(
                "DELETE FROM custom_field_definitions WHERE id = %s AND project_id = %s",
                (field_id, project_id),
            )
            return cur.rowcount > 0
