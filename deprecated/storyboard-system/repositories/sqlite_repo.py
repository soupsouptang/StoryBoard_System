"""SQLite implementation of FrameForge repository contracts.

Maintains exact transactional and row compatibility with current database.
"""

from __future__ import annotations

import sqlite3
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


class SQLiteProjectRepository(ProjectRepository):
    def __init__(self, conn: sqlite3.Connection):
        self._conn = conn

    def get_by_id(self, project_id: str) -> Optional[ProjectDTO]:
        cur = self._conn.execute(
            """
            SELECT id, name, production_type, fps, start_tc, target_seconds, aspect_ratio,
                   status, share_token, is_drop_frame, director, dp, producer, company,
                   custom_template_json, deleted_at, updated_by, updated_by_user_id,
                   created_at, updated_at
            FROM projects WHERE id = ?
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
            custom_template_json=row[14],
            deleted_at=row[15],
            updated_by=row[16],
            updated_by_user_id=row[17],
            created_at=row[18],
            updated_at=row[19],
        )

    def list_active(self) -> List[ProjectDTO]:
        cur = self._conn.execute(
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
                    custom_template_json=row[14],
                    deleted_at=row[15],
                    updated_by=row[16],
                    updated_by_user_id=row[17],
                    created_at=row[18],
                    updated_at=row[19],
                )
            )
        return res

    def save(self, project: ProjectDTO) -> None:
        self._conn.execute(
            """
            INSERT INTO projects (
                id, name, production_type, fps, start_tc, target_seconds, aspect_ratio,
                status, share_token, is_drop_frame, director, dp, producer, company,
                custom_template_json, deleted_at, updated_by, updated_by_user_id,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                name=excluded.name,
                production_type=excluded.production_type,
                fps=excluded.fps,
                start_tc=excluded.start_tc,
                target_seconds=excluded.target_seconds,
                aspect_ratio=excluded.aspect_ratio,
                status=excluded.status,
                share_token=excluded.share_token,
                is_drop_frame=excluded.is_drop_frame,
                director=excluded.director,
                dp=excluded.dp,
                producer=excluded.producer,
                company=excluded.company,
                custom_template_json=excluded.custom_template_json,
                deleted_at=excluded.deleted_at,
                updated_by=excluded.updated_by,
                updated_by_user_id=excluded.updated_by_user_id,
                updated_at=excluded.updated_at
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
                1 if project.is_drop_frame else 0,
                project.director,
                project.dp,
                project.producer,
                project.company,
                project.custom_template_json,
                project.deleted_at,
                project.updated_by,
                project.updated_by_user_id,
                project.created_at,
                project.updated_at,
            ),
        )

    def soft_delete(self, project_id: str, deleted_at: str) -> bool:
        cur = self._conn.execute("UPDATE projects SET deleted_at = ? WHERE id = ?", (deleted_at, project_id))
        return cur.rowcount > 0

    def restore(self, project_id: str) -> bool:
        cur = self._conn.execute("UPDATE projects SET deleted_at = NULL WHERE id = ?", (project_id,))
        return cur.rowcount > 0

    def purge(self, project_id: str) -> bool:
        cur = self._conn.execute("DELETE FROM projects WHERE id = ?", (project_id,))
        return cur.rowcount > 0


class SQLiteShotRepository(ShotRepository):
    def __init__(self, conn: sqlite3.Connection):
        self._conn = conn

    def get_by_id(self, shot_id: str) -> Optional[ShotDTO]:
        cur = self._conn.execute(
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
            FROM shots WHERE id = ?
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
            FROM shots WHERE project_id = ?
        """
        if not include_deleted:
            sql += " AND is_deleted = 0 AND deleted_at IS NULL"
        sql += " ORDER BY sort_index ASC, position ASC"
        cur = self._conn.execute(sql, (project_id,))
        return [self._map_row(r) for r in cur.fetchall()]

    def _map_row(self, r: tuple) -> ShotDTO:
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
            secondary_methods=r[37],
            department=r[38],
            owner=r[39],
            status=r[40],
            approval_version=r[41],
            transition=r[42],
            is_deleted=bool(r[43]),
            deleted_at=r[44],
            method_data_json=r[45],
            revision=r[46],
            import_columns_json=r[47],
            rich_text_json=r[48],
            script_character=r[49],
            script_parenthetical=r[50],
            script_scene_type=r[51],
            script_time_of_day=r[52],
            created_at=r[53],
            updated_at=r[54],
        )

    def save(self, shot: ShotDTO) -> None:
        self._conn.execute(
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
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?
            )
            ON CONFLICT(id) DO UPDATE SET
                position=excluded.position,
                number=excluded.number,
                sort_index=excluded.sort_index,
                title=excluded.title,
                description=excluded.description,
                action=excluded.action,
                dialogue=excluded.dialogue,
                voiceover=excluded.voiceover,
                duration_frames=excluded.duration_frames,
                shot_size=excluded.shot_size,
                lens=excluded.lens,
                movement=excluded.movement,
                status=excluded.status,
                revision=excluded.revision,
                updated_at=excluded.updated_at
            """,
            (
                shot.id, shot.project_id, shot.sequence_id, shot.position, shot.number, shot.sort_index,
                shot.title, shot.chapter, shot.scene, shot.panel_frame, shot.description, shot.action,
                shot.performance, shot.composition, shot.director_notes, shot.notes, shot.duration_frames,
                1 if shot.locked else 0, shot.handles_head_frames, shot.handles_tail_frames, shot.shot_size,
                shot.lens, shot.lens_source, shot.angle, shot.height, shot.movement, shot.equipment,
                shot.sensor, shot.aperture, shot.shutter, shot.camera_fps, shot.voiceover, shot.dialogue,
                shot.subtitle, shot.music, shot.sound, shot.primary_method, shot.secondary_methods,
                shot.department, shot.owner, shot.status, shot.approval_version, shot.transition,
                1 if shot.is_deleted else 0, shot.deleted_at, shot.method_data_json, shot.revision,
                shot.import_columns_json, shot.rich_text_json, shot.script_character,
                shot.script_parenthetical, shot.script_scene_type, shot.script_time_of_day,
                shot.created_at, shot.updated_at
            ),
        )

    def update_revision(self, shot_id: str, expected_revision: int, updates: Dict[str, Any]) -> int:
        cur = self._conn.execute("SELECT revision FROM shots WHERE id = ?", (shot_id,))
        row = cur.fetchone()
        if not row:
            raise KeyError(f"Shot {shot_id} not found")
        actual_revision = row[0]
        if actual_revision != expected_revision:
            raise ValueError(f"Revision conflict: expected {expected_revision}, actual {actual_revision}")

        new_revision = actual_revision + 1
        set_clauses = ["revision = ?"]
        params: list[Any] = [new_revision]
        for k, v in updates.items():
            set_clauses.append(f"{k} = ?")
            params.append(v)
        params.extend([shot_id, expected_revision])
        res = self._conn.execute(
            f"UPDATE shots SET {', '.join(set_clauses)} WHERE id = ? AND revision = ?",
            params,
        )
        if res.rowcount == 0:
            raise ValueError("Concurrent update detected during write")
        return new_revision

    def reorder(self, project_id: str, shot_ids: List[str]) -> None:
        for idx, s_id in enumerate(shot_ids):
            self._conn.execute(
                "UPDATE shots SET sort_index = ?, position = ? WHERE id = ? AND project_id = ?",
                (idx, idx + 1, s_id, project_id),
            )

    def delete(self, shot_id: str, soft: bool = True) -> bool:
        if soft:
            cur = self._conn.execute("UPDATE shots SET is_deleted = 1 WHERE id = ?", (shot_id,))
        else:
            cur = self._conn.execute("DELETE FROM shots WHERE id = ?", (shot_id,))
        return cur.rowcount > 0


class SQLiteFieldRepository(FieldRepository):
    def __init__(self, conn: sqlite3.Connection):
        self._conn = conn

    def list_by_project(self, project_id: str) -> List[CustomFieldDTO]:
        cur = self._conn.execute(
            """
            SELECT id, project_id, key, label, type, options_json, sort_order, is_required, created_at
            FROM custom_field_definitions WHERE project_id = ? ORDER BY sort_order ASC
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
                options_json=r[5],
                sort_order=r[6],
                is_required=bool(r[7]),
                created_at=r[8],
            )
            for r in cur.fetchall()
        ]

    def get_by_key(self, project_id: str, key: str) -> Optional[CustomFieldDTO]:
        cur = self._conn.execute(
            """
            SELECT id, project_id, key, label, type, options_json, sort_order, is_required, created_at
            FROM custom_field_definitions WHERE project_id = ? AND key = ?
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
            options_json=r[5],
            sort_order=r[6],
            is_required=bool(r[7]),
            created_at=r[8],
        )

    def save(self, field_def: CustomFieldDTO) -> None:
        self._conn.execute(
            """
            INSERT INTO custom_field_definitions (
                id, project_id, key, label, type, options_json, sort_order, is_required, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                label=excluded.label,
                type=excluded.type,
                options_json=excluded.options_json,
                sort_order=excluded.sort_order,
                is_required=excluded.is_required
            """,
            (
                field_def.id,
                field_def.project_id,
                field_def.key,
                field_def.label,
                field_def.type,
                field_def.options_json,
                field_def.sort_order,
                1 if field_def.is_required else 0,
                field_def.created_at,
            ),
        )

    def purge_field(self, project_id: str, field_id: str) -> bool:
        self._conn.execute("DELETE FROM custom_field_values WHERE field_id = ?", (field_id,))
        cur = self._conn.execute(
            "DELETE FROM custom_field_definitions WHERE id = ? AND project_id = ?",
            (field_id, project_id),
        )
        return cur.rowcount > 0


class SQLiteUnitOfWork(UnitOfWork):
    def __init__(self, conn: sqlite3.Connection):
        self._conn = conn
        self._projects = SQLiteProjectRepository(conn)
        self._shots = SQLiteShotRepository(conn)
        self._fields = SQLiteFieldRepository(conn)

    def __enter__(self) -> "SQLiteUnitOfWork":
        return self

    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        if exc_type is not None:
            self.rollback()
        else:
            self.commit()

    def commit(self) -> None:
        self._conn.commit()

    def rollback(self) -> None:
        self._conn.rollback()

    @property
    def projects(self) -> ProjectRepository:
        return self._projects

    @property
    def shots(self) -> ShotRepository:
        return self._shots

    @property
    def fields(self) -> FieldRepository:
        return self._fields
