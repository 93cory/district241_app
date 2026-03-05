# PNPI RBAC Matrix

## Roles
- `admin`
- `ministere`
- `inspecteur`
- `industriel`

## Permissions Matrix (principales routes)

| Domaine | Action | admin | ministere | inspecteur | industriel |
|---|---|---|---|---|---|
| Auth | `POST /auth/token` | oui | oui | oui | oui |
| Dashboard | `GET /dashboard/*` | partiel | oui | alertes | oui |
| Unites | `GET /units*` | oui | oui | oui | oui |
| Unites | `POST /units` | non | oui | non | non |
| Declarations | `POST /units/{id}/declarations` | non | non | oui | oui |
| Declarations | `PATCH /declarations/{id}/validate` | non | oui | oui | non |
| Lots | `GET /batches*` | oui | oui | oui | oui |
| Lots | `POST /batches` | non | oui | non | oui |
| Admin users | `GET/POST /admin/users` | oui | oui | non | non |
| Notifications | `GET /admin/notifications` | oui | oui | oui | oui |
| Notifications | `POST /admin/notifications` | oui | oui | non | non |
| Notifications | `PATCH /admin/notifications/{id}/read` | oui | oui | oui (cible) | oui (cible) |
| Workflow | `GET /pilotage/*` | oui | oui | non | non |
| Workflow | `POST/PATCH /pilotage/dossiers*` | oui | oui | non | non |
| Audit | `GET /audit/events` | oui | oui | non | non |
| Exports | `/exports/*` institutionnels | oui | oui | non | non |

## Regles de gouvernance
- Tout changement de role doit etre audite (`actor`, `target`, `before`, `after`).
- Les comptes inactifs ne doivent jamais obtenir de JWT.
- Les actions sensibles (pilotage, admin, exports audit) doivent conserver un event d’audit.
- Les mots de passe doivent respecter la politique de securite (12+, maj/min/chiffre/special).
