"""Middleware to reject oversized request bodies (DoS prevention)."""
from __future__ import annotations

import logging
import os

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

logger = logging.getLogger("pnpi.request_size")

# Default: 10 MB for regular endpoints
DEFAULT_MAX_BODY_SIZE = int(os.getenv("PNPI_MAX_REQUEST_BODY_MB", "10")) * 1024 * 1024

# Upload endpoints get a larger limit (50 MB)
UPLOAD_MAX_BODY_SIZE = int(os.getenv("PNPI_MAX_UPLOAD_BODY_MB", "50")) * 1024 * 1024

_UPLOAD_PATHS = ("/documents/", "/inspections/", "/photos/", "/import-csv", "/upload")


class RequestSizeLimitMiddleware(BaseHTTPMiddleware):
    """Reject requests with bodies larger than the configured limit."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        content_length = request.headers.get("content-length")
        if content_length is None:
            return await call_next(request)

        try:
            size = int(content_length)
        except ValueError:
            return await call_next(request)

        # Determine limit based on path
        path = request.url.path
        is_upload = any(up in path for up in _UPLOAD_PATHS)
        max_size = UPLOAD_MAX_BODY_SIZE if is_upload else DEFAULT_MAX_BODY_SIZE

        if size > max_size:
            max_mb = round(max_size / (1024 * 1024), 1)
            actual_mb = round(size / (1024 * 1024), 1)
            logger.warning("Request too large: %s %s (%s MB > %s MB)", request.method, path, actual_mb, max_mb)
            return JSONResponse(
                status_code=413,
                content={
                    "error": True,
                    "status_code": 413,
                    "detail": f"Corps de requete trop volumineux: {actual_mb} Mo (max {max_mb} Mo).",
                },
            )

        return await call_next(request)
