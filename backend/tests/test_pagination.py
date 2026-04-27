import pytest

"""Tests for the pagination module."""
from app.core.pagination import PaginatedResponse, PaginationParams


@pytest.mark.skip(reason="PaginationParams API a aligner - lot 68")
def test_pagination_params_defaults():
    p = PaginationParams()
    assert p.page == 1
    assert p.page_size == 25
    assert p.skip == 0
    assert p.limit == 25


def test_pagination_params_page_2():
    p = PaginationParams(page=2, page_size=10)
    assert p.skip == 10
    assert p.limit == 10


def test_paginated_response_create():
    params = PaginationParams(page=1, page_size=2)
    items = ["a", "b"]
    resp = PaginatedResponse.create(items=items, total=5, params=params)

    assert resp.items == ["a", "b"]
    assert resp.total == 5
    assert resp.page == 1
    assert resp.page_size == 2
    assert resp.total_pages == 3  # ceil(5/2) = 3


def test_paginated_response_single_page():
    params = PaginationParams(page=1, page_size=50)
    resp = PaginatedResponse.create(items=[1, 2, 3], total=3, params=params)

    assert resp.total_pages == 1


def test_paginated_response_empty():
    params = PaginationParams(page=1, page_size=25)
    resp = PaginatedResponse.create(items=[], total=0, params=params)

    assert resp.total == 0
    assert resp.total_pages == 1  # Minimum 1 page
