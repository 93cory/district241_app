"""Middleware that assigns a correlation ID to each request for log tracing."""

from __future__ import annotations

import logging
import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from .logging_config import correlation_id

logger = logging.getLogger("pnpi.http")


class CorrelationMiddleware(BaseHTTPMiddleware):
    """Attach a unique correlation ID to each request and log request metrics."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Use incoming header or generate new ID
        req_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex[:12]
        token = correlation_id.set(req_id)

        start = time.perf_counter()
        try:
            response = await call_next(request)
            elapsed_ms = round((time.perf_counter() - start) * 1000, 1)

            logger.info(
                "%s %s -> %s (%sms)",
                request.method,
                request.url.path,
                response.status_code,
                elapsed_ms,
            )
            response.headers["X-Request-ID"] = req_id
            return response
        except Exception:
            elapsed_ms = round((time.perf_counter() - start) * 1000, 1)
            logger.exception(
                "%s %s -> 500 (%sms)",
                request.method,
                request.url.path,
                elapsed_ms,
            )
            raise
        finally:
            correlation_id.reset(token)
