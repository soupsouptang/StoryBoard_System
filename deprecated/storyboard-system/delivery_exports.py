"""SMPTE timecode and editorial delivery formats for FrameForge bundles."""

import re
from xml.etree import ElementTree as ET


def frames_to_tc(total_frames: int, fps: float, is_drop_frame: bool = False) -> str:
    """Convert integer frames to SMPTE Timecode string."""
    total_frames = max(0, int(round(total_frames)))
    nominal_fps = int(round(fps))

    if is_drop_frame and abs(fps - 29.97) < 0.05:
        drop_frames = 2
        frames_per_minute = 1800 - drop_frames
        frames_per_10minutes = 1800 * 10 - drop_frames * 9
        d = total_frames // frames_per_10minutes
        m = total_frames % frames_per_10minutes
        if m > drop_frames:
            total_frames += drop_frames * 9 * d + drop_frames * ((m - drop_frames) // frames_per_minute)
        else:
            total_frames += drop_frames * 9 * d

        ff = total_frames % 30
        ss = (total_frames // 30) % 60
        mm = (total_frames // 1800) % 60
        hh = total_frames // 108000
        return f"{hh:02d}:{mm:02d}:{ss:02d};{ff:02d}"

    ff = total_frames % nominal_fps
    total_seconds = total_frames // nominal_fps
    ss = total_seconds % 60
    mm = (total_seconds // 60) % 60
    hh = total_seconds // 3600
    sep = ";" if is_drop_frame else ":"
    return f"{hh:02d}:{mm:02d}:{ss:02d}{sep}{ff:02d}"


def tc_to_frames(tc_str: str, fps: float) -> int:
    """Convert SMPTE Timecode string to integer frames."""
    if not tc_str or not isinstance(tc_str, str):
        return 0
    parts = re.split(r"[:;.]", tc_str.strip())
    if len(parts) != 4:
        return 0
    try:
        hh, mm, ss, ff = [int(p) for p in parts]
    except ValueError:
        return 0

    nominal_fps = int(round(fps))
    is_df = ";" in tc_str
    if is_df and abs(fps - 29.97) < 0.05:
        total_minutes = 60 * hh + mm
        drop_frames = 2
        total_frames = (108000 * hh + 1800 * mm + 30 * ss + ff) - drop_frames * (total_minutes - total_minutes // 10)
        return max(0, total_frames)
    return max(0, (hh * 3600 + mm * 60 + ss) * nominal_fps + ff)


def generate_cmx3600_edl(bundle: dict) -> str:
    """Generate professional CMX3600 EDL for DaVinci Resolve / Premiere Pro."""
    p = bundle["project"]
    fps = p["fps"]
    title = re.sub(r"[^\w\s-]", "_", p["name"])[:32] or "FRAMEFORGE"
    lines = [f"TITLE: {title}", "FCM: NON-DROP FRAME" if not p["is_drop_frame"] else "FCM: DROP FRAME", ""]

    for i, s in enumerate(bundle["shots"]):
        idx = i + 1
        src_in = "00:00:00:00"
        src_out = frames_to_tc(s["duration_frames"], fps, p["is_drop_frame"])
        lines.append(f"{idx:03d}  {'AX':<8} V     C        {src_in} {src_out} {s['tc_in']} {s['tc_out']}")
        lines.append(f"* FROM CLIP NAME: SHOT_{s['number']}_{s['title']}")
        if s.get("voiceover"):
            lines.append(f"* COMMENT: VO: {s['voiceover'][:60]}")
        lines.append("")
    return "\r\n".join(lines)


def generate_otio_json(bundle: dict) -> dict:
    """Generate OpenTimelineIO JSON structure."""
    p = bundle["project"]
    fps = p["fps"]
    return {
        "OTIO_SCHEMA": "Timeline.1",
        "name": p["name"],
        "global_start_time": {"OTIO_SCHEMA": "RationalTime.1", "rate": fps, "value": tc_to_frames(p["start_tc"], fps)},
        "tracks": {"OTIO_SCHEMA": "Stack.1", "children": [{
            "OTIO_SCHEMA": "Track.1", "name": "Video Track 1", "kind": "Video", "children": [
                {"OTIO_SCHEMA": "Clip.1", "name": f"Shot {s['number']} - {s['title']}",
                 "source_range": {"OTIO_SCHEMA": "TimeRange.1",
                                  "start_time": {"OTIO_SCHEMA": "RationalTime.1", "rate": fps, "value": 0},
                                  "duration": {"OTIO_SCHEMA": "RationalTime.1", "rate": fps, "value": s["duration_frames"]}},
                 "metadata": {"frameforge": {"shot_id": s["id"], "primary_method": s["primary_method"],
                                               "shot_size": s["shot_size"], "lens": s["lens"], "voiceover": s["voiceover"]}}}
                for s in bundle["shots"]]
        }]}
    }


def generate_fcpxml(bundle: dict) -> str:
    """Generate FCPXML 1.9 export."""
    p = bundle["project"]
    fps = int(round(p["fps"]))
    total_f = bundle["total_frames"]
    root = ET.Element("fcpxml", version="1.9")
    resources = ET.SubElement(root, "resources")
    ET.SubElement(resources, "format", id="r1", name=f"FFVideoFormat1080p{fps}", frameDuration=f"1/{fps}s", width="1920", height="1080")
    library = ET.SubElement(root, "library")
    event = ET.SubElement(library, "event", name=p["name"])
    project = ET.SubElement(event, "project", name=p["name"])
    sequence = ET.SubElement(project, "sequence", format="r1", duration=f"{total_f}/{fps}s", tcStart=f"{tc_to_frames(p['start_tc'], fps)}/{fps}s")
    spine = ET.SubElement(sequence, "spine")
    cursor = 0
    for s in bundle["shots"]:
        dur = s["duration_frames"]
        clip = ET.SubElement(spine, "clip", name=f"Shot {s['number']} - {s['title']}", offset=f"{cursor}/{fps}s", duration=f"{dur}/{fps}s", start="0s")
        if s.get("voiceover"):
            ET.SubElement(clip, "note").text = s["voiceover"]
        cursor += dur
    return ET.tostring(root, encoding="utf-8", xml_declaration=True).decode("utf-8")


def generate_srt_subtitles(bundle: dict) -> str:
    """Generate standard SRT subtitle file from voiceover."""
    fps = bundle["project"]["fps"]
    lines = []
    idx = 1
    for s in bundle["shots"]:
        vo = s.get("voiceover", "").strip()
        if not vo:
            continue
        start_tc = s["tc_in"].replace(";", ":")
        end_tc = s["tc_out"].replace(";", ":")
        f_in = s["tc_in_frames"] % int(round(fps))
        f_out = s["tc_out_frames"] % int(round(fps))
        ms_in = int((f_in / fps) * 1000)
        ms_out = int((f_out / fps) * 1000)
        lines.extend((str(idx), f"{start_tc[:8]},{ms_in:03d} --> {end_tc[:8]},{ms_out:03d}", vo, ""))
        idx += 1
    return "\r\n".join(lines)


def generate_vtt_subtitles(bundle: dict) -> str:
    """Generate WebVTT using the same integer-frame timing source as SRT."""
    return "WEBVTT\r\n\r\n" + generate_srt_subtitles(bundle).replace(",", ".")
