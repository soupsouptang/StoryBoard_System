"""Monotonic UTC timestamps shared by HTTP and domain services."""

import threading
from datetime import datetime, timedelta, timezone


_clock_lock = threading.Lock()
_last_stamp = datetime.min.replace(tzinfo=timezone.utc)


def now_iso() -> str:
    global _last_stamp
    with _clock_lock:
        _last_stamp = max(datetime.now(timezone.utc), _last_stamp + timedelta(microseconds=1))
        return _last_stamp.isoformat(timespec="microseconds")
