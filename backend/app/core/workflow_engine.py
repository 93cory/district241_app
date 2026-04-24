"""PNPI · Moteur de regles de workflow personnalisables.

Permet aux admins de definir des regles declenchees automatiquement
lors des transitions ATI. Exemples :
- Quand statut = rejete ET secteur = bois → notifier directeur_bois
- Quand age > SLA * 0.8 → envoyer alerte SLA
- Quand statut = approuve → generer certificat
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum
from typing import Any


class RuleTrigger(StrEnum):
    ON_SUBMIT = "on_submit"
    ON_TRANSITION = "on_transition"
    ON_APPROVE = "on_approve"
    ON_REJECT = "on_reject"
    ON_SLA_WARNING = "on_sla_warning"
    ON_SLA_BREACH = "on_sla_breach"
    ON_INSPECTION_COMPLETE = "on_inspection_complete"


class RuleAction(StrEnum):
    NOTIFY_USER = "notify_user"
    NOTIFY_ROLE = "notify_role"
    SEND_EMAIL = "send_email"
    AUTO_ASSIGN = "auto_assign"
    ADD_TAG = "add_tag"
    CREATE_ALERT = "create_alert"
    LOG_AUDIT = "log_audit"


@dataclass
class WorkflowCondition:
    field: str  # e.g. "secteur", "statut", "age_jours", "province"
    operator: str  # "eq", "ne", "gt", "lt", "gte", "lte", "in", "contains"
    value: Any


@dataclass
class WorkflowRule:
    id: str
    name: str
    description: str
    trigger: RuleTrigger
    conditions: list[WorkflowCondition]
    action: RuleAction
    action_params: dict[str, Any]
    is_active: bool = True
    priority: int = 0


# Built-in default rules
DEFAULT_RULES: list[WorkflowRule] = [
    WorkflowRule(
        id="rule-sla-80pct",
        name="Alerte SLA 80%",
        description="Notifier l'instructeur quand un ATI atteint 80% du SLA",
        trigger=RuleTrigger.ON_SLA_WARNING,
        conditions=[
            WorkflowCondition("sla_pct", "gte", 80),
            WorkflowCondition("statut", "ne", "approuve"),
            WorkflowCondition("statut", "ne", "rejete"),
        ],
        action=RuleAction.NOTIFY_USER,
        action_params={"target": "instructeur_assigne", "severity": "high"},
    ),
    WorkflowRule(
        id="rule-sla-breach",
        name="Escalade SLA depasse",
        description="Notifier le directeur quand un ATI depasse le SLA",
        trigger=RuleTrigger.ON_SLA_BREACH,
        conditions=[
            WorkflowCondition("sla_pct", "gte", 100),
        ],
        action=RuleAction.NOTIFY_ROLE,
        action_params={"role": "directeur", "severity": "critical"},
    ),
    WorkflowRule(
        id="rule-approve-cert",
        name="Certificat auto",
        description="Generer automatiquement le certificat a l'approbation",
        trigger=RuleTrigger.ON_APPROVE,
        conditions=[],
        action=RuleAction.LOG_AUDIT,
        action_params={"message": "Certificat ATI disponible au telechargement"},
    ),
    WorkflowRule(
        id="rule-reject-notify-op",
        name="Notification operateur rejet",
        description="Notifier l'operateur par email en cas de rejet",
        trigger=RuleTrigger.ON_REJECT,
        conditions=[],
        action=RuleAction.SEND_EMAIL,
        action_params={"template": "ati_rejected", "target": "operateur"},
    ),
    WorkflowRule(
        id="rule-bois-assign",
        name="Auto-assign bois",
        description="Assigner automatiquement les ATI bois a l'instructeur specialise",
        trigger=RuleTrigger.ON_SUBMIT,
        conditions=[
            WorkflowCondition("secteur", "eq", "bois"),
        ],
        action=RuleAction.AUTO_ASSIGN,
        action_params={"instructeur": "instructeur_bois"},
        priority=10,
    ),
    WorkflowRule(
        id="rule-mines-tag",
        name="Tag prioritaire mines",
        description="Ajouter un tag 'Prioritaire' aux ATI miniers",
        trigger=RuleTrigger.ON_SUBMIT,
        conditions=[
            WorkflowCondition("secteur", "eq", "mines"),
        ],
        action=RuleAction.ADD_TAG,
        action_params={"label": "Prioritaire", "color": "#b42318"},
    ),
    WorkflowRule(
        id="rule-inspection-nonconf",
        name="Alerte non-conformite",
        description="Creer une alerte quand une inspection est non conforme",
        trigger=RuleTrigger.ON_INSPECTION_COMPLETE,
        conditions=[
            WorkflowCondition("statut_conformite", "eq", "non_conforme"),
        ],
        action=RuleAction.CREATE_ALERT,
        action_params={"severity": "high", "message": "Inspection non conforme detectee"},
    ),
]


def evaluate_condition(condition: WorkflowCondition, context: dict) -> bool:
    """Evaluate a single condition against a context dict."""
    field_value = context.get(condition.field)
    target_value = condition.value

    match condition.operator:
        case "eq":
            return field_value == target_value
        case "ne":
            return field_value != target_value
        case "gt":
            return field_value is not None and field_value > target_value
        case "lt":
            return field_value is not None and field_value < target_value
        case "gte":
            return field_value is not None and field_value >= target_value
        case "lte":
            return field_value is not None and field_value <= target_value
        case "in":
            return field_value in target_value
        case "contains":
            return target_value in (field_value or "")
        case _:
            return False


def evaluate_rules(trigger: RuleTrigger, context: dict) -> list[WorkflowRule]:
    """Find all active rules matching a trigger and context."""
    matched = []
    for rule in sorted(DEFAULT_RULES, key=lambda r: -r.priority):
        if not rule.is_active:
            continue
        if rule.trigger != trigger:
            continue
        if all(evaluate_condition(c, context) for c in rule.conditions):
            matched.append(rule)
    return matched


def get_all_rules() -> list[dict]:
    """Return all rules as serializable dicts."""
    return [
        {
            "id": r.id,
            "name": r.name,
            "description": r.description,
            "trigger": r.trigger.value,
            "conditions": [{"field": c.field, "operator": c.operator, "value": c.value} for c in r.conditions],
            "action": r.action.value,
            "action_params": r.action_params,
            "is_active": r.is_active,
            "priority": r.priority,
        }
        for r in DEFAULT_RULES
    ]
