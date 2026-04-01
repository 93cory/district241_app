"""Lightweight API analytics — tracks endpoint usage patterns in memory.

Exposes aggregated stats via /admin/api-analytics endpoint.
For production, consider flushing to DB or Redis periodically.
"""
from __future__ import annotations

import time
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Dict, List


@dataclass
class EndpointStats:
    hits: int = 0
    errors: int = 0
    total_ms: float = 0.0
    last_called: float = 0.0

    @property
    def avg_ms(self) -> float:
        return round(self.total_ms / self.hits, 1) if self.hits > 0 else 0

    def record(self, duration_ms: float, is_error: bool) -> None:
        self.hits += 1
        self.total_ms += duration_ms
        self.last_called = time.time()
        if is_error:
            self.errors += 1


class APIAnalytics:
    """In-memory API usage analytics."""

    def __init__(self) -> None:
        self._endpoints: Dict[str, EndpointStats] = defaultdict(EndpointStats)
        self._status_codes: Dict[int, int] = defaultdict(int)
        self._hourly_hits: Dict[str, int] = defaultdict(int)
        self._started_at = time.time()

    def record(self, method: str, path: str, status_code: int, duration_ms: float) -> None:
        """Record a request."""
        key = f"{method} {path}"
        is_error = status_code >= 400
        self._endpoints[key].record(duration_ms, is_error)
        self._status_codes[status_code] += 1

        hour = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:00")
        self._hourly_hits[hour] += 1

    def get_summary(self) -> dict:
        """Return analytics summary."""
        total_hits = sum(s.hits for s in self._endpoints.values())
        total_errors = sum(s.errors for s in self._endpoints.values())

        # Top 20 endpoints by hits
        top_endpoints = sorted(
            self._endpoints.items(),
            key=lambda x: x[1].hits,
            reverse=True,
        )[:20]

        # Slowest 10 endpoints
        slowest = sorted(
            [(k, v) for k, v in self._endpoints.items() if v.hits >= 3],
            key=lambda x: x[1].avg_ms,
            reverse=True,
        )[:10]

        return {
            "uptime_hours": round((time.time() - self._started_at) / 3600, 1),
            "total_requests": total_hits,
            "total_errors": total_errors,
            "error_rate_pct": round(total_errors / total_hits * 100, 2) if total_hits > 0 else 0,
            "unique_endpoints": len(self._endpoints),
            "top_endpoints": [
                {"endpoint": k, "hits": v.hits, "errors": v.errors, "avg_ms": v.avg_ms}
                for k, v in top_endpoints
            ],
            "slowest_endpoints": [
                {"endpoint": k, "avg_ms": v.avg_ms, "hits": v.hits}
                for k, v in slowest
            ],
            "status_codes": dict(sorted(self._status_codes.items())),
            "hourly_traffic": dict(sorted(self._hourly_hits.items())[-24:]),
        }


analytics = APIAnalytics()
