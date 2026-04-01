"""Tests for the in-memory cache module."""
import pytest
from app.core.cache import _InMemoryCache


@pytest.fixture
def mem_cache():
    return _InMemoryCache()


@pytest.mark.asyncio
async def test_set_and_get(mem_cache):
    await mem_cache.set("key1", {"value": 42}, ttl=60)
    result = await mem_cache.get("key1")
    assert result == {"value": 42}


@pytest.mark.asyncio
async def test_get_missing_key(mem_cache):
    result = await mem_cache.get("nonexistent")
    assert result is None


@pytest.mark.asyncio
async def test_delete(mem_cache):
    await mem_cache.set("key1", "data", ttl=60)
    await mem_cache.delete("key1")
    assert await mem_cache.get("key1") is None


@pytest.mark.asyncio
async def test_flush_pattern(mem_cache):
    await mem_cache.set("dashboard:kpis:global", 1, ttl=60)
    await mem_cache.set("dashboard:kpis:estuaire", 2, ttl=60)
    await mem_cache.set("other:key", 3, ttl=60)

    flushed = await mem_cache.flush_pattern("dashboard:*")
    assert flushed == 2
    assert await mem_cache.get("other:key") == 3


@pytest.mark.asyncio
async def test_expired_key(mem_cache):
    await mem_cache.set("expiring", "value", ttl=0)
    # TTL=0 means expires_at = time.time() + 0 = now, so immediate expiry
    import time
    time.sleep(0.01)
    result = await mem_cache.get("expiring")
    assert result is None
