"""Pure narration timing estimates shared by the server and UI-facing API."""

import math
import re


def _round_positive(value: float) -> int:
    """Round non-negative values like JavaScript Math.round for shared timing."""
    return int(math.floor(float(value) + 0.5))


def estimate_narration_frames(text: str, fps: float, speech_rate: float = 1.0) -> int:
    """Estimate speech duration using the existing language and pause rates."""
    value = str(text or "").strip()
    frame_rate = max(1.0, float(fps or 25))
    rate = float(speech_rate)
    chinese_chars = len(re.findall(r"[\u3400-\u9fff]", value))
    english_words = len(re.findall(r"[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*", value))
    comma_pauses = len(re.findall(r"[，,、]", value)) * 0.16
    sentence_pauses = len(re.findall(r"[。！？.!?；;]", value)) * 0.28
    speech_seconds = chinese_chars / 4.4 + english_words / 2.8
    duration_seconds = speech_seconds / rate + comma_pauses + sentence_pauses
    return max(_round_positive(frame_rate * 0.6), _round_positive(duration_seconds * frame_rate))


def compute_auto_timing(shots: list[dict], target_seconds: float, fps: float, speech_rate: float = 1.0) -> list[dict]:
    """Time unlocked shots from narration while preserving manual durations.

    target_seconds remains in the signature for existing callers, but is not a
    budget for this operation. The project target metadata is never modified.
    """
    del target_seconds
    rate = float(speech_rate)
    if not math.isfinite(rate) or not 0.5 <= rate <= 2.0:
        raise ValueError("speech_rate must be between 0.5 and 2.0")
    for shot in shots:
        if shot.get("locked"):
            continue
        narration = str(shot.get("voiceover") or "").strip() or str(shot.get("dialogue") or "").strip()
        if narration:
            shot["duration_frames"] = estimate_narration_frames(narration, fps, rate)
    return shots
