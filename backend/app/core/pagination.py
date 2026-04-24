"""Standardized pagination for list endpoints."""

from __future__ import annotations

from collections.abc import Sequence
from typing import Any, TypeVar

from fastapi import Query
from pydantic import BaseModel

T = TypeVar("T")


class PaginationParams:
    """Reusable dependency for skip/limit pagination."""

    def __init__(
        self,
        page: int = Query(default=1, ge=1, description="Numero de page (commence a 1)"),
        page_size: int = Query(default=25, ge=1, le=200, description="Nombre d'elements par page"),
    ):
        self.page = page
        self.page_size = page_size
        self.skip = (page - 1) * page_size
        self.limit = page_size


class PaginatedResponse(BaseModel):
    """Generic paginated response wrapper."""

    items: list[Any]
    total: int
    page: int
    page_size: int
    total_pages: int

    @classmethod
    def create(cls, items: Sequence[Any], total: int, params: PaginationParams) -> PaginatedResponse:
        return cls(
            items=list(items),
            total=total,
            page=params.page,
            page_size=params.page_size,
            total_pages=max(1, (total + params.page_size - 1) // params.page_size),
        )
