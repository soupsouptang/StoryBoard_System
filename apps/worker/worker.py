"""Background RQ Worker for Video/Image Proxy Generation and Exports."""
from __future__ import annotations

import os
import logging
import redis
from rq import Queue, Worker

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("frameforge_worker")

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
listen_queues = ["default", "exports", "proxies"]


def run_worker():
    conn = redis.from_url(REDIS_URL)
    queues = [Queue(name, connection=conn) for name in listen_queues]
    worker = Worker(queues, connection=conn)
    logger.info(f"FrameForge Background Worker listening on {listen_queues}...")
    worker.work()


if __name__ == "__main__":
    run_worker()
