# Architecture cible 12 mois — PNPI

> **Document interne** · Architecture PNPI · Version 1.0 — Avril 2026
> Auteur : Jean Baptiste MBA NDONG (Architecte)

---

## 1. Cap fixé

À horizon **avril 2027** (T+12 mois), la PNPI devra être :

1. **Opérationnelle en production** au Ministère de l'Industrie du Gabon,
   utilisée par 6 profils utilisateurs (~150 à 250 utilisateurs nominaux).
2. **Industrialisée** : équipe de 3 à 4 personnes, processus DevOps
   matures, capacité à déployer sans le concepteur initial.
3. **Conforme** : pentest externe validé, signature électronique avancée
   en place, hébergement souverain ANINF documenté.
4. **Prête au passage CEMAC** : un premier tenant pilote (Cameroun ou
   Congo) en pré-production, *country pack* validé.
5. **Mobile** : application inspecteur Flutter en production, mode hors
   ligne fiabilisé.
6. **Intégrée** au système d'information de l'État (RCCM, DGI) via 2 à
   3 connecteurs.

## 2. État actuel (T0)

```
┌─────────────────────────────────────────────────────────────┐
│              UTILISATEURS (Gabon uniquement)                │
│  Cabinet · Direction · Instructeurs · Inspecteurs · Opér.   │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS
                ┌──────────▼──────────┐
                │   Next.js 14 (SSR)  │  ← Proxy /api → backend
                │   Frontend SPA      │
                └──────────┬──────────┘
                           │ Bearer JWT (cookie httpOnly)
                ┌──────────▼──────────┐
                │  FastAPI 0.11x      │  ← 40 routers, ~250 endpoints
                │  Python 3.12        │
                └─┬─────────┬───────┬─┘
                  │         │       │
         ┌────────▼─┐  ┌────▼──┐ ┌──▼─────────────┐
         │PostgreSQL│  │ Redis │ │ Filesystem     │
         │+PostGIS  │  │       │ │ uploads/ati    │
         └──────────┘  └───────┘ └────────────────┘
                  │
         ┌────────▼─────────────────────┐
         │ Prometheus / Grafana (dev)   │
         └──────────────────────────────┘
```

**Caractéristiques** :
- 1 instance applicative (mono-machine).
- 1 base PostgreSQL (sans réplique synchrone).
- Pas de CDN, pas de WAF.
- Stockage documents sur filesystem local.
- Mobile Flutter présent mais non déployé en stores.
- Équipe : 1 développeur (le concepteur).

## 3. État cible (T+12 mois)

```
                    INTERNET / 4G inspecteurs
                            │
                  ┌─────────▼──────────┐
                  │  WAF + CDN ANINF   │
                  └─────────┬──────────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
        ┌─────▼────┐  ┌─────▼────┐  ┌─────▼─────┐
        │ Next.js  │  │ Next.js  │  │  Flutter  │
        │  inst-A  │  │  inst-B  │  │   stores  │
        └──────┬───┘  └─────┬────┘  └─────┬─────┘
               │ load balancer ANINF       │
               └────────┬──────────────────┘
                        │ Bearer JWT (RS256)
                ┌───────▼────────────────┐
                │  Gateway / Rate limit  │
                └───────┬────────────────┘
                        │
            ┌───────────┼───────────────────┐
            │           │                   │
      ┌─────▼────┐ ┌────▼─────┐    ┌────────▼─────────┐
      │FastAPI   │ │FastAPI   │    │  GraphQL API     │
      │ replica1 │ │ replica2 │    │  (intégrateurs)  │
      └─────┬────┘ └────┬─────┘    └────────┬─────────┘
            │           │                   │
            └─────┬─────┴─────┬─────────────┘
                  │           │
        ┌─────────▼───┐ ┌─────▼──────┐ ┌─────────────┐
        │ PostgreSQL  │ │ PostgreSQL │ │ Redis HA    │
        │ primary +TDE│◄┤ replica RO │ │ Sentinel    │
        └─────────────┘ └────────────┘ └─────────────┘
                  │
        ┌─────────▼─────────┐ ┌─────────────────┐
        │ MinIO (3 nodes)   │ │ Vault / KMS     │
        │ documents ATI     │ │ secrets         │
        └───────────────────┘ └─────────────────┘
                  │
        ┌─────────▼──────────┐
        │ Backup hors-site   │
        │ (ANINF AZ-B)       │
        └────────────────────┘

  Intégrations externes (sortie via gateway sécurisée) :
   ► RCCM (registre commerce) — vérification opérateur
   ► DGI (impôts) — NIF + situation fiscale
   ► ARCEP (signature qualifiée — phase 2)

  Observabilité :
   ► Prometheus + Grafana + Loki + Tempo (full stack)
   ► Glitchtip (erreurs)
   ► Audit interne PNPI (table audit_events)
```

## 4. Cinq axes de transformation

### Axe 1 — Industrialisation infrastructure

**Cible** : provisionnement reproductible, scalabilité horizontale, RTO 4h /
RPO 1h.

Actions :
- Terraform pour provisionner un environnement complet (dev / staging / prod)
  en <2 heures.
- Ansible pour configurer les hôtes ANINF.
- CI/CD GitHub Actions complète : build → tests → image Docker signée →
  déploiement staging auto → prod manuel.
- Vault pour les secrets (cf. dette D-012).
- Réplique PostgreSQL synchrone + bascule testée trimestriellement.

**Effort** : 35 j-h. **Livrable** : `infra/terraform/`, runbook bascule.

### Axe 2 — Sécurité et conformité régalienne

**Cible** : pentest externe annuel validé, chiffrement au repos, signature
électronique avancée opérationnelle.

Actions :
- Pentest externe à T+15 jours (cf. plan J0-J+90).
- TDE PostgreSQL + chiffrement de colonne sur NIF, effectif déclaré.
- Mise en place de la signature avancée (ADR-005 phase 1).
- Dépôt CNPDCP du traitement.
- Audit ISO 27001 *gap analysis* (sans certification immédiate).
- Certificate Pinning sur l'app mobile.

**Effort** : 40 j-h (hors prestataire pentest). **Livrable** : rapport
pentest + remédiation, registre de traitement CNPDCP.

### Axe 3 — Couverture fonctionnelle finale et UX

**Cible** : zéro friction sur le parcours ATI bout en bout, parcours
inspecteur mobile fluide, exports institutionnels riches.

Actions :
- Refactor du design system frontend (cf. dette D-017).
- Améliorations UX issues du retour utilisateurs T+30 (formation 6 profils).
- Tableau de bord ministre avec scoring de santé global.
- Module appels (`appeals.py` — déjà en place, à enrichir).
- Génération PDF d'arrêté avec signature embarquée (PAdES).
- Exports « format ARSI » (futurs autorités CEMAC).
- App Flutter : ajout du mode strict offline (sync différée robuste).

**Effort** : 45 j-h. **Livrable** : v2.0 fonctionnelle.

### Axe 4 — Observabilité et exploitabilité

**Cible** : capacité à exploiter sans le concepteur initial, MTTR <30 min
sur incidents niveau 1.

Actions :
- Stack Prometheus + Loki + Grafana + Tempo en production.
- Glitchtip pour les erreurs applicatives.
- Tableaux de bord opérationnels (latence p95, erreurs 5xx, taux saturation
  Redis, lag réplication, occupation MinIO).
- Alerting (PagerDuty-like local ou Telegram bot dédié).
- Runbooks d'incident (top 10 scénarios).
- Documentation OpenAPI versionnée publiquement.

**Effort** : 25 j-h. **Livrable** : `docs/architecture/runbooks/`, dashboards
Grafana.

### Axe 5 — Multi-tenant CEMAC (étape 1)

**Cible** : POC tenant Cameroun en pré-production, *country pack* validé.

Actions :
- Implémentation des *country packs* (cf. ADR-004 et `multi-tenant-cemac.md`).
- i18n backend (cf. dette D-018).
- Provisioning automatisé d'un nouveau tenant (Terraform).
- Adaptations métier : nomenclatures locales, devises, langues.
- Convention de partenariat type signée avec un État pilote.

**Effort** : 30 j-h (sans le déploiement officiel). **Livrable** :
infrastructure tenant Cameroun en *standby*.

## 5. Migrations clés

### Migrations data
- Migration TDE PostgreSQL (downtime ~1h, prévoir fenêtre de nuit).
- Migration filesystem → MinIO (downtime 0 si script de bascule
  incrémentale).
- Re-jeu complet des 36 migrations Alembic sur une base de prod-like (test).

### Migrations code
- HS512 → RS256 sur les JWT (ADR-001 suivi T3).
- Ajout colonne `tenant_id` sur les tables critiques (préparation CEMAC,
  même si chaque tenant a sa base — pour les futures tables de référence
  partagées).
- Refactor `Role` enum complet (cf. dette D-005).
- Frontend : passage à `strict: true` sur tout TypeScript.

## 6. Risques majeurs et mitigations

| Risque | Mitigation principale |
|---|---|
| Dépendance solo developer (bus factor 1) | Recrutement T+1 mois, *handover* documenté, jumelage ANINF (cf. R-022 dans `risk-register.md`) |
| Datacenter ANINF indisponible | Réplique synchrone + plan de bascule, étude site secondaire 2027 |
| ARCEP retard agrément PSCo | Phase 1 signature avancée (ADR-005) suffisante 12 mois |
| Budget non reconduit | Forfait pluriannuel 3 ans dans la convention |
| Sécurité : faille critique post-prod | Pentest annuel + bug bounty interne |
| Adoption inspecteurs (refus mobile) | Formation J+30 + UX simplifié |

## 7. Indicateurs de succès cibles à T+12

| KPI | T0 (avril 26) | T+12 (avril 27) |
|---|---|---|
| Disponibilité applicative | indéterminée | ≥ 99,5 % |
| Couverture tests backend | ~50 % | ≥ 75 % |
| Délai instruction ATI (jours) | n/a (papier) | ≤ 15 j |
| Utilisateurs actifs / mois | 0 | 200 |
| Tenants en service | 1 (Gabon) | 1 + 1 POC |
| Équipe technique | 1 | 3-4 |
| Incidents critiques (P1) / mois | n/a | < 1 |
| Score audit ISO 27001 | non audité | gap analysis OK |

## 8. Ce que la cible 12 mois ne couvre PAS

- Ouverture officielle multi-pays CEMAC (cible 24 mois).
- Signature qualifiée production (cible 18-24 mois, ADR-005 phase 2).
- Module IA / scoring prédictif (vision technique 24+ mois).
- Open data publique (étudié séparément).

---

*Fin du document.*
