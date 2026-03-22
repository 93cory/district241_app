"""PNPI — Prometheus metrics for monitoring."""
from __future__ import annotations

import time
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.routing import Match


# Simple in-process metrics (no prometheus_client dependency needed)
class Metrics:
    """Lightweight metrics collector compatible with Prometheus text format."""

    def __init__(self):
        self.request_count: dict[str, int] = {}
        self.request_duration: dict[str, list[float]] = {}
        self.error_count: dict[str, int] = {}
        self.active_requests = 0
        self._start_time = time.time()

    def record_request(self, method: str, path: str, status: int, duration: float):
        key = f'{method}:{path}:{status}'
        self.request_count[key] = self.request_count.get(key, 0) + 1

        dur_key = f'{method}:{path}'
        if dur_key not in self.request_duration:
            self.request_duration[dur_key] = []
        self.request_duration[dur_key].append(duration)
        # Keep only last 1000 measurements
        if len(self.request_duration[dur_key]) > 1000:
            self.request_duration[dur_key] = self.request_duration[dur_key][-500:]

        if status >= 400:
            err_key = f'{method}:{path}:{status}'
            self.error_count[err_key] = self.error_count.get(err_key, 0) + 1

    def to_prometheus(self) -> str:
        lines = []
        uptime = time.time() - self._start_time

        lines.append("# HELP pnpi_uptime_seconds Time since server start")
        lines.append("# TYPE pnpi_uptime_seconds gauge")
        lines.append(f"pnpi_uptime_seconds {uptime:.1f}")
        lines.append("")

        lines.append("# HELP pnpi_active_requests Current active requests")
        lines.append("# TYPE pnpi_active_requests gauge")
        lines.append(f"pnpi_active_requests {self.active_requests}")
        lines.append("")

        lines.append("# HELP pnpi_http_requests_total Total HTTP requests")
        lines.append("# TYPE pnpi_http_requests_total counter")
        for key, count in sorted(self.request_count.items()):
            method, path, status = key.split(":", 2)
            lines.append(f'pnpi_http_requests_total{{method="{method}",path="{path}",status="{status}"}} {count}')
        lines.append("")

        lines.append("# HELP pnpi_http_request_duration_seconds Request duration")
        lines.append("# TYPE pnpi_http_request_duration_seconds summary")
        for key, durations in sorted(self.request_duration.items()):
            method, path = key.split(":", 1)
            if durations:
                avg = sum(durations) / len(durations)
                p95 = sorted(durations)[int(len(durations) * 0.95)] if len(durations) > 1 else durations[0]
                lines.append(f'pnpi_http_request_duration_seconds{{method="{method}",path="{path}",quantile="0.5"}} {sorted(durations)[len(durations)//2]:.4f}')
                lines.append(f'pnpi_http_request_duration_seconds{{method="{method}",path="{path}",quantile="0.95"}} {p95:.4f}')
                lines.append(f'pnpi_http_request_duration_seconds_sum{{method="{method}",path="{path}"}} {sum(durations):.4f}')
                lines.append(f'pnpi_http_request_duration_seconds_count{{method="{method}",path="{path}"}} {len(durations)}')
        lines.append("")

        lines.append("# HELP pnpi_http_errors_total Total HTTP errors")
        lines.append("# TYPE pnpi_http_errors_total counter")
        for key, count in sorted(self.error_count.items()):
            method, path, status = key.split(":", 2)
            lines.append(f'pnpi_http_errors_total{{method="{method}",path="{path}",status="{status}"}} {count}')

        return "\n".join(lines) + "\n"


# Global singleton
metrics = Metrics()


class MetricsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        metrics.active_requests += 1
        start = time.time()

        try:
            response = await call_next(request)
        except Exception:
            metrics.active_requests -= 1
            raise

        duration = time.time() - start
        metrics.active_requests -= 1

        # Normalize path to avoid cardinality explosion
        path = self._normalize_path(request)
        metrics.record_request(request.method, path, response.status_code, duration)

        # Add timing header
        response.headers["X-Response-Time"] = f"{duration*1000:.1f}ms"

        return response

    def _normalize_path(self, request: Request) -> str:
        """Replace path params with placeholders."""
        for route in request.app.routes:
            match, _ = route.matches(request.scope)
            if match == Match.FULL:
                return getattr(route, "path", request.url.path)
        return request.url.path
