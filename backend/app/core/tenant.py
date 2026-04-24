"""PNPI · Multi-tenant par province.

Permet de filtrer automatiquement les donnees par province pour les
utilisateurs assignes a une province specifique. Les admins et ministres
voient toutes les provinces.
"""
from __future__ import annotations

from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from .auth import User


# Roles that bypass province filtering (see all data)
GLOBAL_ROLES = {"admin", "ministre", "directeur"}


def get_user_province(user: "User") -> Optional[str]:
    """Extract province from the current user's profile.

    Returns None for users with global access (admin, ministre, directeur).
    Returns the province string for province-scoped users.
    """
    if not user:
        return None

    role_values = {r.value if hasattr(r, "value") else str(r) for r in user.roles}
    if role_values & GLOBAL_ROLES:
        return None  # Global access

    return getattr(user, "province", None)


class TenantFilter:
    """Helper to apply province-based filtering to SQLAlchemy queries."""

    def __init__(self, province: Optional[str]):
        self.province = province

    @property
    def is_global(self) -> bool:
        return self.province is None

    def apply(self, query, model_class, province_field: str = "province"):
        """Apply province filter to a query if user is province-scoped."""
        if self.is_global:
            return query

        field = getattr(model_class, province_field, None)
        if field is None:
            return query

        return query.where(field == self.province)

    def filter_list(self, items: list, province_getter=None) -> list:
        """Filter a list of items by province."""
        if self.is_global:
            return items

        if province_getter:
            return [item for item in items if province_getter(item) == self.province]

        return [
            item for item in items
            if getattr(item, "province", None) == self.province
        ]
