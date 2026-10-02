"""VNext validation and mapping for versioned Legacy portable project files."""

import json
import math

PORTABLE_FORMAT = "frameforge.portable-project"
PORTABLE_VERSION = 1
MAX_PORTABLE_BYTES = 40 * 1024 * 1024
MAX_PORTABLE_SHOTS = 10_000


def map_portable_project(content: bytes) -> dict:
    if not isinstance(content, bytes) or len(content) > MAX_PORTABLE_BYTES:
        raise ValueError("portable project file is missing or too large")
    try:
        document = json.loads(content.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ValueError("portable project must be UTF-8 JSON") from exc
    if isinstance(document, dict) and "_portable_project" in document:
        document = document["_portable_project"]
    if not isinstance(document, dict) or document.get("format") != PORTABLE_FORMAT:
        raise ValueError("unsupported portable project format")
    if document.get("version") != PORTABLE_VERSION:
        raise ValueError("unsupported portable project version")

    project = document.get("project")
    sequences = document.get("sequences")
    shots = document.get("shots")
    if not isinstance(project, dict) or not isinstance(sequences, list) or not isinstance(shots, list):
        raise ValueError("portable project is missing required sections")
    if len(sequences) > 1_000 or len(shots) > MAX_PORTABLE_SHOTS:
        raise ValueError("portable project exceeds record limits")
    try:
        frame_rate = float(project["frame_rate"])
        if not math.isfinite(frame_rate) or not 1 <= frame_rate <= 240:
            raise ValueError
    except (KeyError, TypeError, ValueError) as exc:
        raise ValueError("portable project frame rate is invalid") from exc

    sequence_ids = set()
    mapped_sequences = []
    for sequence in sequences:
        if not isinstance(sequence, dict):
            raise ValueError("portable sequence record is invalid")
        sequence_id = sequence.get("id")
        if not isinstance(sequence_id, str) or not sequence_id or sequence_id in sequence_ids:
            raise ValueError("portable sequence identifier is invalid")
        sequence_ids.add(sequence_id)
        mapped_sequences.append({"id": sequence_id, "name": str(sequence.get("name") or "")[:255]})

    mapped_shots = []
    seen_shot_ids = set()
    for shot in shots:
        if not isinstance(shot, dict):
            raise ValueError("portable shot record is invalid")
        shot_id = shot.get("id")
        sequence_id = shot.get("sequence_id")
        frames = shot.get("duration_frames")
        if not isinstance(shot_id, str) or not shot_id or shot_id in seen_shot_ids:
            raise ValueError("portable shot identifier is invalid")
        if sequence_id is not None and sequence_id not in sequence_ids:
            raise ValueError("portable shot refers to an unknown sequence")
        if not isinstance(frames, int) or isinstance(frames, bool) or not 1 <= frames <= 2**53 - 1:
            raise ValueError("portable shot duration is invalid")
        seen_shot_ids.add(shot_id)
        mapped_shots.append({
            "source_id": shot_id,
            "sequence_id": sequence_id,
            "number": str(shot.get("number") or "")[:64],
            "name": str(shot.get("title") or "")[:255],
            "description": str(shot.get("description") or ""),
            "voiceover": str(shot.get("voice_over") or ""),
            "duration_frames": frames,
            "shot_size": str(shot.get("shot_size") or ""),
        })

    return {
        "name": str(project.get("name") or "Untitled project")[:255],
        "frame_rate": frame_rate,
        "drop_frame": bool(project.get("drop_frame", False)),
        "start_timecode": str(project.get("start_timecode") or "00:00:00:00")[:32],
        "sequences": mapped_sequences,
        "shots": mapped_shots,
    }
