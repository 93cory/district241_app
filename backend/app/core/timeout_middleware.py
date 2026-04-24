"""Middleware that enforces a maximum request duration."""

from __future__ import annotations

import asyncio
import logging
import os

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

logger = logging.getLogger("pnpi.timeout")

DEFAULT_TIMEOUT_SECONDS = 30


class TimeoutMiddleware(BaseHTTPMiddleware):
    """Return 504 Gateway Timeout if a request takes longer than the configured limit."""

    def __init__(self, app, timeout_seconds: int | None = None) -> None:
        super().__init__(app)
        self.timeout = timeout_seconds or int(os.getenv("PNPI_REQUEST_TIMEOUT_SECONDS", str(DEFAULT_TIMEOUT_SECONDS)))

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Skip timeout for long-running endpoints (exports, uploads, websockets)
        path = request.url.path
        if any(path.startswith(p) for p in ("/ws", "/exports/", "/api/v1/exports/")):
            return await call_next(request)
        if request.headers.get("upgrade", "").lower() == "websocket":
            return await call_next(request)

        try:
            return await asyncio.wait_for(call_next(request), timeout=self.timeout)
        except TimeoutError:
            logger.warning("Request timeout (%ss): %s %s", self.timeout, request.method, path)
            return JSONResponse(
                status_code=504,
                content={
                    "error": True,
                    "status_code": 504,
                    "detail": f"La requete a depasse le delai maximum de {self.timeout} secondes.",
                    "path": path,
                },
            )
