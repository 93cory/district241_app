"""Input sanitization to prevent XSS and injection attacks.

Usage:
    from app.core.sanitize import sanitize_html, SanitizedStr

    # In Pydantic models:
    class MyModel(BaseModel):
        name: SanitizedStr
        description: SanitizedStr

    # Direct usage:
    clean = sanitize_html(user_input)
"""

from __future__ import annotations

import html
import re
from typing import Annotated

from pydantic import AfterValidator

# Patterns that indicate script injection attempts
_DANGEROUS_PATTERNS = [
    re.compile(r"<\s*script", re.IGNORECASE),
    re.compile(r"javascript\s*:", re.IGNORECASE),
    re.compile(r"on\w+\s*=", re.IGNORECASE),  # onclick=, onerror=, etc.
    re.compile(r"<\s*iframe", re.IGNORECASE),
    re.compile(r"<\s*object", re.IGNORECASE),
    re.compile(r"<\s*embed", re.IGNORECASE),
    re.compile(r"<\s*form", re.IGNORECASE),
    re.compile(r"data\s*:\s*text/html", re.IGNORECASE),
]

# Simple HTML tag stripper (keeps text content)
_HTML_TAG_RE = re.compile(r"<[^>]+>")


def sanitize_html(value: str) -> str:
    """Strip HTML tags and escape dangerous patterns from user input."""
    if not value:
        return value

    # Strip HTML tags
    cleaned = _HTML_TAG_RE.sub("", value)

    # Escape any remaining HTML entities
    cleaned = html.escape(cleaned, quote=True)

    # Unescape safe entities back (common in French text)
    cleaned = cleaned.replace("&amp;", "&").replace("&#x27;", "'")

    return cleaned.strip()


def is_safe_input(value: str) -> bool:
    """Check if input contains potentially dangerous patterns."""
    return all(not pattern.search(value) for pattern in _DANGEROUS_PATTERNS)


def _validate_sanitized(value: str) -> str:
    """Pydantic validator that sanitizes string fields."""
    return sanitize_html(value)


# Annotated type for Pydantic models · auto-sanitizes on input
SanitizedStr = Annotated[str, AfterValidator(_validate_sanitized)]
