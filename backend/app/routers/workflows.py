"""PNPI · Endpoints pour la gestion des regles de workflow."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from ..core.auth import Role, User, require_roles
from ..core.workflow_engine import RuleTrigger, evaluate_rules, get_all_rules

router = APIRouter(prefix="/workflows", tags=["Workflows"])


@router.get("/rules")
async def list_rules(
    _: User = Depends(require_roles(Role.admin, Role.directeur)),
):
    return {"rules": get_all_rules()}


@router.post("/simulate")
async def simulate_rules(
    data: dict,
    _: User = Depends(require_roles(Role.admin)),
):
    """Simulate which rules would fire for a given context."""
    trigger = data.get("trigger", "on_submit")
    context = data.get("context", {})

    try:
        trigger_enum = RuleTrigger(trigger)
    except ValueError:
        return {"error": f"Trigger invalide: {trigger}", "valid_triggers": [t.value for t in RuleTrigger]}

    matched = evaluate_rules(trigger_enum, context)
    return {
        "trigger": trigger,
        "context": context,
        "matched_rules": [
            {"id": r.id, "name": r.name, "action": r.action.value, "action_params": r.action_params} for r in matched
        ],
    }
