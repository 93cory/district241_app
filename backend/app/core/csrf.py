"""CSRF protection middleware for mutation requests.

For JWT-based APIs, CSRF risk comes from cookie-based auth (httpOnly tokens).
This middleware validates the Origin header on state-changing requests to prevent
cross-origin form submissions.
"""
from __future__ import annotations

import logging
import os
from urllib.parse import urlparse

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

logger = logging.getLogger("pnpi.csrf")

_SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


class CSRFMiddleware(BaseHTTPMiddleware):
    """Reject state-changing requests from unexpected origins."""

    def __init__(self, app, allowed_origins: list[str] | None = None) -> None:
        super().__init__(app)
        raw = os.getenv("PNPI_CORS_ALLOW_ORIGINS", "http://localhost:3000")
        self.allowed_origins: set[str] = set()
        if allowed_origins:
            self.allowed_origins = {o.rstrip("/").lower() for o in allowed_origins}
        else:
            for o in raw.split(","):
                o = o.strip().rstrip("/").lower()
                if o and o != "*":
                    self.allowed_origins.add(o)
        # In dev, allow all if wildcard
        self.allow_all = raw.strip() == "*"

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        if self.allow_all or request.method in _SAFE_METHODS:
            return await call_next(request)

        # Skip for API-key authenticated requests (system integrations)
        if request.headers.get("x-api-key"):
            return await call_next(request)

        origin = request.headers.get("origin")
        referer = request.headers.get("referer")

        # Determine the source origin
        source_origin = None
        if origin:
            source_origin = origin.rstrip("/").lower()
        elif referer:
            parsed = urlparse(referer)
            source_origin = f"{parsed.scheme}://{parsed.netloc}".rstrip("/").lower()

        # Allow requests with no origin (same-origin, curl, mobile apps)
        if source_origin is None:
            return await call_next(request)

        if source_origin not in self.allowed_origins:
            logger.warning("CSRF blocked: origin=%s not in allowed=%s", source_origin, self.allowed_origins)
            return JSONResponse(
                status_code=403,
                content={"error": True, "detail": "Origine non autorisee."},
            )

        return await call_next(request)
