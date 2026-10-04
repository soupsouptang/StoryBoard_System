"""Serialize a Legacy project bundle into the versioned VNext file bridge."""

PORTABLE_FORMAT = "frameforge.portable-project"
PORTABLE_VERSION = 1


def export_portable_project(bundle: dict) -> dict:
    project = bundle.get("project")
    if not isinstance(project, dict):
        raise ValueError("project bundle is missing its project")

    sequences = bundle.get("sequences", [])
    shots = bundle.get("shots", [])
    if not isinstance(sequences, list) or not isinstance(shots, list):
        raise ValueError("project bundle sequences and shots must be arrays")

    sequence_ids: dict[str, str] = {}
    portable_sequences = []
    for index, sequence in enumerate(sequences):
        if not isinstance(sequence, dict):
            continue
        source_id = str(sequence.get("id", ""))
        portable_id = f"sequence-{index + 1:04d}"
        if source_id:
            sequence_ids[source_id] = portable_id
        portable_sequences.append({
            "id": portable_id,
            "name": str(sequence.get("name") or f"Sequence {index + 1}"),
            "position": index,
        })

    portable_shots = []
    for index, shot in enumerate(shots):
        if not isinstance(shot, dict):
            continue
        portable_shots.append({
            "id": f"shot-{index + 1:06d}",
            "sequence_id": sequence_ids.get(str(shot.get("sequence_id", ""))),
            "number": str(shot.get("display_number") or f"{index + 1:03d}"),
            "title": str(shot.get("name") or ""),
            "description": str(shot.get("description") or ""),
            "voice_over": str(shot.get("voice_over") or ""),
            "duration_frames": int(shot.get("duration_frames") or 0),
            "shot_size": str(shot.get("shot_size") or ""),
        })

    return {
        "format": PORTABLE_FORMAT,
        "version": PORTABLE_VERSION,
        "project": {
            "name": str(project.get("name") or "Untitled project"),
            "frame_rate": float(project.get("fps") or 24),
            "drop_frame": bool(project.get("is_drop_frame", False)),
            "start_timecode": str(project.get("start_tc") or "00:00:00:00"),
        },
        "sequences": portable_sequences,
        "shots": portable_shots,
    }
