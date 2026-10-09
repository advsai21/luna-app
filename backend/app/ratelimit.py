import time
from collections import defaultdict

from fastapi import HTTPException, Request

_hits: dict[str, list[float]] = defaultdict(list)
WINDOW = 60
MAX_HITS = 20


def chat_rate_limit(request: Request) -> None:
    ip = (request.headers.get("x-forwarded-for") or (request.client.host if request.client else "unknown")).split(",")[0].strip()
    now = time.time()
    recent = [t for t in _hits[ip] if now - t < WINDOW]
    recent.append(now)
    _hits[ip] = recent
    if len(recent) > MAX_HITS:
        raise HTTPException(429, "Too many requests")
