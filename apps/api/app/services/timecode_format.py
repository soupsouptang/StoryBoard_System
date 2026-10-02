"""Timecode formatting used by API-generated document exports."""


def frames_to_tc(total_frames: int, fps: float, is_drop_frame: bool = False) -> str:
    """Convert integer frames to an SMPTE timecode string."""
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
    separator = ";" if is_drop_frame else ":"
    return f"{hh:02d}:{mm:02d}:{ss:02d}{separator}{ff:02d}"
