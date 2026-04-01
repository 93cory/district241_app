"""API v1 — All routers mounted under /api/v1 prefix."""
from __future__ import annotations

from fastapi import APIRouter

from .routers.auth import router as auth_router
from .routers.units import router as units_router
from .routers.pilotage import router as pilotage_router
from .routers.admin import router as admin_router
from .routers.health import router as health_router
from .routers.exports import router as exports_router
from .routers.pnpi_dashboard import router as pnpi_dashboard_router
from .routers.ati import router as ati_router
from .routers.operateurs import router as operateurs_router
from .routers.inspections import router as inspections_router
from .routers.notifications import router as notifications_router
from .routers.documents import router as documents_router
from .routers.geo import router as geo_router
from .routers.totp import router as totp_router
from .routers.ws import router as ws_router
from .routers.integration import router as integration_router
from .routers.messages import router as messages_router
from .routers.calendar import router as calendar_router
from .routers.reports import router as reports_router
from .routers.templates import router as templates_router
from .routers.workflows import router as workflows_router
from .routers.heatmap import router as heatmap_router
from .routers.delegations import router as delegations_router
from .routers.reminders import router as reminders_router
from .routers.notes import router as notes_router
from .routers.feedback import router as feedback_router
from .routers.doc_versions import router as doc_versions_router
from .routers.checklists import router as checklists_router
from .routers.announcements import router as announcements_router
from .routers.integration_health import router as integration_health_router
from .routers.scheduled_reports import router as scheduled_reports_router
from .routers.polls import router as polls_router
from .routers.graphql_api import router as graphql_router
from .routers.conventions import router as conventions_router
from .routers.search import router as search_router

v1_router = APIRouter(prefix="/api/v1")

_all_routers = [
    auth_router, units_router, pilotage_router, admin_router,
    health_router, exports_router, pnpi_dashboard_router, ati_router,
    operateurs_router, inspections_router, notifications_router,
    documents_router, geo_router, totp_router, ws_router,
    integration_router, messages_router, calendar_router,
    reports_router, templates_router, workflows_router,
    heatmap_router, delegations_router, reminders_router,
    notes_router, feedback_router, doc_versions_router,
    checklists_router, announcements_router, integration_health_router,
    scheduled_reports_router, polls_router, graphql_router,
    conventions_router, search_router,
]

for r in _all_routers:
    v1_router.include_router(r)
