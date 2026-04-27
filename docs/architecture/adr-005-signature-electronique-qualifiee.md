# ADR-005 — Signature électronique qualifiée et autorité de certification

- **Statut** : Proposé (à arbitrer avec le Ministère, l'ANINF et l'ARCEP)
- **Date** : 2026-04-27
- **Auteur** : Jean Baptiste MBA NDONG
- **Décideurs concernés** : Cabinet du Ministère, ANINF, ARCEP Gabon
  (Autorité de Régulation des Communications Électroniques et des Postes)

## Contexte

L'octroi d'un Agrément Technique Industriel (ATI) est une décision
administrative individuelle créatrice de droits. Elle doit, pour être
opposable au tiers, porter la signature **manuscrite ou qualifiée** de
l'autorité compétente (le Ministre ou son délégué).

Aujourd'hui, la PNPI :
- collecte la décision dans un workflow numérique (`workflows.py`,
  `pilotage.py`),
- génère un PDF d'arrêté,
- est imprimée, signée à la main, scannée, ré-importée — boucle papier
  manuelle qui annule 90 % du gain de la dématérialisation.

Le Gabon dispose d'un cadre juridique :
- **Loi 042/2021** sur les transactions électroniques (en vigueur).
- **ARCEP** est l'autorité d'agrément des prestataires de services de
  certification électronique.
- À la date de rédaction (avril 2026), **un seul** prestataire est en cours
  d'agrément — l'écosystème est immature.

Trois niveaux de signature électronique au sens eIDAS / loi gabonaise :
- **Simple** (image de signature, click-to-sign) — valeur juridique
  faible, contestable.
- **Avancée** (clé privée + certificat + lien irrévocable au signataire) —
  valeur juridique solide.
- **Qualifiée** (avancée + certificat délivré par un PSCo qualifié + DSCQ
  matériel ou cloud certifié) — présomption d'authenticité, équivalente à
  la signature manuscrite.

## Décision (proposée)

Nous proposons une **trajectoire en deux temps** :

### Phase 1 (T0 → T+12 mois) — Signature avancée certifiée par horodatage

- Implémentation d'une signature avancée :
  - chaque acte signé est haché (SHA-256) ;
  - le hash est signé avec la clé privée du signataire (générée et stockée
    dans un HSM logiciel ou sur token U2F) ;
  - un horodatage qualifié est ajouté via un service ANINF ou ARCEP ;
  - le PDF final embarque la signature CAdES/PAdES (norme ETSI).
- Le **registre des signatures** (`backend/app/models/signature_log.py` —
  à créer) trace chaque opération : hash document, signataire, certificat,
  horodatage, IP, user-agent.
- L'**autorité de certification** est, en phase 1, **interne PNPI**, mais
  conforme au standard X.509v3 et aux recommandations ARCEP. Les
  certificats des ministres et directeurs sont émis par cette CA interne
  publique.

### Phase 2 (T+12 → T+24 mois) — Signature qualifiée

- Migration vers un **prestataire de services de confiance qualifié**
  agréé par l'ARCEP (à identifier).
- Émission de certificats qualifiés sur **carte à puce** ou **token cloud
  HSM** pour les signataires habilités (ministre, directeur, secrétaire
  général).
- Le code de la PNPI ne change pas — seul le fournisseur du certificat
  change. La couche cryptographique reste identique (CAdES/PAdES).
- La PNPI devient elle-même **horodateur certifié** ou consomme un
  service tiers (ANINF, ARCEP).

## Conséquences

### Positives

- **Suppression de la boucle papier** : gain estimé à **3 jours
  ouvrables** par dossier ATI (calcul : impression + circuit signature +
  scan + re-import).
- **Valeur probante** : un acte signé numériquement avec horodatage
  qualifié vaut original devant un juge gabonais (Loi 042/2021, art. 12).
- **Auditabilité** : chaque acte est cryptographiquement lié à son
  signataire. Aucune répudiation possible.
- **Interopérabilité CEMAC** : les normes ETSI CAdES/PAdES sont reconnues
  internationalement. Préparation au futur déploiement multi-pays.
- **Visibilité** : la PNPI deviendrait l'un des premiers services
  régaliens gabonais à utiliser une signature qualifiée — argument fort
  pour le Cabinet.

### Négatives

- **Coût** : un certificat qualifié coûte ~150 000 à 500 000 FCFA / an /
  signataire selon le prestataire. À budgéter dans le forfait annuel.
- **Opérationnel** : la perte d'un token HSM = perte de la capacité de
  signature jusqu'à réémission (procédure ~5 jours ouvrables).
  Atténuation : 2 signataires habilités par direction (ministre +
  directeur cabinet, etc.).
- **Maturité écosystème** : à ce jour, l'agrément ARCEP des PSCo n'est
  pas finalisé. La phase 2 est conditionnée à cette finalisation.
- **Formation** : les signataires doivent être formés à la manipulation
  des tokens / cartes. À intégrer dans le plan de formation J+30.

### Suivi

- **2026-T2** : choix de l'implémentation cryptographique (CAdES vs
  PAdES) — recommandation : **PAdES** (signature embarquée dans le PDF,
  vérifiable par Acrobat Reader sans outil tiers).
- **2026-T2** : prototype phase 1 sur l'environnement de pré-production.
- **2026-T3** : audit cryptographique externe (à confier à un cabinet
  spécialisé local ou français).
- **2026-T4** : sélection officielle du PSCo qualifié pour la phase 2.
- **2027-T1** : bascule en signature qualifiée pour les actes ministériels
  (acte d'octroi, refus, sanction).

## Alternatives considérées

### Alternative A — Signature simple (image scannée)

- **Pour** : zéro coût, zéro complexité.
- **Contre** : valeur probante quasi nulle, contestation triviale par un
  industriel mécontent. **Rejeté.**

### Alternative B — Signature manuscrite uniquement

- **Pour** : statu quo, aucune adaptation.
- **Contre** : annule 90 % du bénéfice de la PNPI, allonge tous les
  délais d'instruction. **Rejeté.**

### Alternative C — Délégation à France-Connect / DocuSign

- **Pour** : maturité de la solution.
- **Contre** : violation de la souveraineté (cf. ADR-003) — données
  régaliennes traitées par un tiers étranger. **Rejeté.**

## Questions à arbitrer en comité

1. La PNPI peut-elle assumer le rôle d'**autorité d'horodatage** auprès
   de l'ARCEP, ou doit-elle consommer un service tiers ?
2. Qui finance les certificats qualifiés — le forfait annuel
   maintenance/évolution ou un budget dédié du Ministère ?
3. Calendrier d'agrément du premier PSCo qualifié gabonais — est-il
   compatible avec une mise en service phase 2 à T+12 mois ?
4. Politique de conservation des signatures : 10 ans (loi commerciale) ou
   30 ans (durée de vie d'un agrément) ?

## Comparables

- **France** : DocuSign, Universign, Yousign (qualifiés eIDAS) +
  ANSSI/SSL Europa pour l'Administration.
- **Maroc** : Barid eSign (Poste Maroc) — modèle public/privé.
- **Sénégal** : ADIE délivre des certificats qualifiés depuis 2018,
  utilisés dans les actes administratifs.

---

*Fin de l'ADR-005.*
