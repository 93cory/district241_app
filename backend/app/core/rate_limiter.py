"""Distributed rate limiter using Redis sliding window, with in-memory fallback."""

from __future__ import annotations

import logging
import os
import time
from collections import defaultdict

from fastapi import HTTPException

logger = logging.getLogger("pnpi.ratelimit")


class _InMemoryRateLimiter:
    """Single-process rate limiter (original implementation)."""

    def __init__(self) -> None:
        self._store: dict[str, list[float]] = defaultdict(list)

    async def check(self, key: str, limit: int, window_seconds: int) -> None:
        now = time.time()
        cutoff = now - window_seconds
        bucket = self._store[key]
        bucket[:] = [t for t in bucket if t > cutoff]
        if len(bucket) >= limit:
            raise HTTPException(
                status_code=429,
                detail=f"Trop de requetes. Reessayez dans {window_seconds} secondes.",
            )
        bucket.append(now)


class _RedisRateLimiter:
    """Distributed rate limiter using Redis sorted sets (sliding window log)."""

    def __init__(self, url: str) -> None:
        import redis.asyncio as aioredis

        self._redis = aioredis.from_url(url, decode_responses=True)

    async def check(self, key: str, limit: int, window_seconds: int) -> None:
        now = time.time()
        cutoff = now - window_seconds
        redis_key = f"rl:{key}"

        pipe = self._redis.pipeline()
        pipe.zremrangebyscore(redis_key, 0, cutoff)
        pipe.zcard(redis_key)
        pipe.zadd(redis_key, {str(now): now})
        pipe.expire(redis_key, window_seconds + 1)
        results = await pipe.execute()

        count = results[1]
        if count >= limit:
            raise HTTPException(
                status_code=429,
                detail=f"Trop de requetes. Reessayez dans {window_seconds} secondes.",
            )


def _create_rate_limiter() -> _InMemoryRateLimiter | _RedisRateLimiter:
    redis_url = os.getenv("PNPI_REDIS_URL")
    if redis_url:
        try:
            return _RedisRateLimiter(redis_url)
        except Exception:
            logger.warning("Redis unavailable for rate limiting, using in-memory fallback")
    return _InMemoryRateLimiter()


rate_limiter = _create_rate_limiter()
