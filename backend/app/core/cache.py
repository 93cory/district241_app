"""Lightweight caching layer with Redis (preferred) or in-memory fallback.

Usage:
    from app.core.cache import cache

    @router.get("/expensive")
    async def expensive_endpoint():
        cached = await cache.get("expensive:key")
        if cached:
            return cached
        result = compute_expensive()
        await cache.set("expensive:key", result, ttl=300)
        return result
"""
from __future__ import annotations

import json
import logging
import os
import time
from typing import Any, Optional

logger = logging.getLogger("pnpi.cache")


class _InMemoryCache:
    """Simple TTL-based in-memory cache (single-process fallback)."""

    def __init__(self) -> None:
        self._store: dict[str, tuple[float, Any]] = {}

    async def get(self, key: str) -> Optional[Any]:
        entry = self._store.get(key)
        if entry is None:
            return None
        expires_at, value = entry
        if expires_at and time.time() > expires_at:
            del self._store[key]
            return None
        return value

    async def set(self, key: str, value: Any, ttl: int = 300) -> None:
        expires_at = time.time() + ttl if ttl > 0 else 0
        self._store[key] = (expires_at, value)

    async def delete(self, key: str) -> None:
        self._store.pop(key, None)

    async def flush_pattern(self, pattern: str) -> int:
        """Delete keys matching a prefix (e.g. 'dashboard:*')."""
        prefix = pattern.rstrip("*")
        keys = [k for k in self._store if k.startswith(prefix)]
        for k in keys:
            del self._store[k]
        return len(keys)


class _RedisCache:
    """Async Redis cache using redis-py."""

    def __init__(self, url: str) -> None:
        import redis.asyncio as aioredis
        self._redis = aioredis.from_url(url, decode_responses=True)

    async def get(self, key: str) -> Optional[Any]:
        raw = await self._redis.get(key)
        if raw is None:
            return None
        return json.loads(raw)

    async def set(self, key: str, value: Any, ttl: int = 300) -> None:
        await self._redis.set(key, json.dumps(value, default=str), ex=ttl)

    async def delete(self, key: str) -> None:
        await self._redis.delete(key)

    async def flush_pattern(self, pattern: str) -> int:
        keys = []
        async for key in self._redis.scan_iter(match=pattern):
            keys.append(key)
        if keys:
            await self._redis.delete(*keys)
        return len(keys)


def _create_cache() -> _InMemoryCache | _RedisCache:
    redis_url = os.getenv("PNPI_REDIS_URL")
    if redis_url:
        try:
            return _RedisCache(redis_url)
        except Exception:
            logger.warning("Redis unavailable at %s, falling back to in-memory cache", redis_url)
    logger.info("Using in-memory cache (set PNPI_REDIS_URL for Redis)")
    return _InMemoryCache()


cache = _create_cache()
