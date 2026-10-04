"""Exports router for delivery and roundtrip formats."""

from __future__ import annotations

import sqlite3
from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi_app.dependencies import get_current_user, get_db_connection
from delivery_exports import (
    generate_cmx3600_edl,
    generate_fcpxml,
    generate_otio_json,
    generate_srt_subtitles,
    generate_vtt_subtitles,
)

router = APIRouter(prefix="/api/projects/{project_id}/export", tags=["exports"])


def _fetch_project_and_shots(conn: sqlite3.Connection, project_id: str):
    cur = conn.execute("SELECT id, name, fps FROM projects WHERE id = ?", (project_id,))
    proj = cur.fetchone()
    if not proj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    cur = conn.execute(
        """
        SELECT id, number, title, description, action, dialogue, voiceover, duration_frames
        FROM shots WHERE project_id = ? AND is_deleted = 0 AND deleted_at IS NULL
        ORDER BY sort_index ASC, position ASC
        """,
        (project_id,),
    )
    shots = [dict(r) for r in cur.fetchall()]
    return dict(proj), shots


@router.get("/edl")
def export_edl(
    project_id: str,
    conn: sqlite3.Connection = Depends(get_db_connection),
    current_user: sqlite3.Row = Depends(get_current_user),
):
    proj, shots = _fetch_project_and_shots(conn, project_id)
    edl_text = generate_cmx3600_edl(shots, fps=proj["fps"], title=proj["name"])
    return Response(
        content=edl_text,
        media_type="text/plain",
        headers={"Content-Disposition": f'attachment; filename="{proj["name"]}.edl"'},
    )


@router.get("/srt")
def export_srt(
    project_id: str,
    conn: sqlite3.Connection = Depends(get_db_connection),
    current_user: sqlite3.Row = Depends(get_current_user),
):
    proj, shots = _fetch_project_and_shots(conn, project_id)
    srt_text = generate_srt_subtitles(shots, fps=proj["fps"])
    return Response(
        content=srt_text,
        media_type="application/x-subrip",
        headers={"Content-Disposition": f'attachment; filename="{proj["name"]}.srt"'},
    )


@router.get("/otio")
def export_otio(
    project_id: str,
    conn: sqlite3.Connection = Depends(get_db_connection),
    current_user: sqlite3.Row = Depends(get_current_user),
):
    proj, shots = _fetch_project_and_shots(conn, project_id)
    otio_json = generate_otio_json(shots, fps=proj["fps"], title=proj["name"])
    return Response(
        content=otio_json,
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{proj["name"]}.otio"'},
    )
