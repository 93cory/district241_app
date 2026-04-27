# ADR-003 — Hébergement souverain ANINF (et non cloud étranger)

- **Statut** : Accepté
- **Date** : 2026-04-27
- **Auteur** : Jean Baptiste MBA NDONG
- **Décideurs concernés** : Cabinet du Ministère de l'Industrie, Direction
  Générale de l'ANINF (Agence Nationale des Infrastructures Numériques et
  des Fréquences), futur RSSI Ministère
- **Référence code** : `docker-compose.prod.yml`, `docs/deployment-guide.md`,
  `docs/pra_pca.md`

## Contexte

La PNPI traite des données qui touchent à la **souveraineté économique** du
Gabon :

- état exact du tissu industriel national (effectifs, capacité, NIF
  fiscal),
- décisions administratives (octroi/refus d'agrément, sanctions),
- inspections sur site (photos géolocalisées d'unités industrielles),
- correspondances entre l'État et les opérateurs.

Trois options d'hébergement étaient possibles :

1. **Cloud étranger** (AWS Paris/Francfort, Azure Dublin, GCP Bruxelles).
2. **Cloud africain** (CSquared Cameroun, Liquid Cloud Kenya, RawCloud RDC).
3. **Hébergement souverain ANINF** (datacenter Tier-III gabonais, Libreville).

Cadre juridique applicable :
- **Loi gabonaise n° 001/2011 du 25 septembre 2011** sur la protection des
  données personnelles.
- **CEMAC** : règlement n° 06/20-CEMAC-CMTC-CMAC sur les communications
  électroniques.
- **Bonnes pratiques internationales** : Convention de Malabo (UA, 2014),
  RGPD UE (extraterritorialité).

Acteurs locaux :
- **ANINF** opère un datacenter Tier-III à Libreville depuis 2014, hébergeant
  e-Visa, e-Tax, état civil numérique. SLA documenté à 99,5 %.
- Connectivité backbone fibre + redondance satellite.

## Décision

L'environnement de production de la PNPI sera **hébergé exclusivement en
territoire gabonais**, dans le datacenter de l'**ANINF**, avec les modalités
suivantes :

- **Production** : 1 instance applicative + 1 réplique chaude, 1 base de
  données primaire + 1 réplique synchrone, 1 instance Redis, 1 nœud MinIO
  pour les documents.
- **Pré-production** : 1 instance unique, sur la même infrastructure,
  isolée par VLAN.
- **Sauvegardes** : 1 site secondaire ANINF (zone de disponibilité B), +
  copie chiffrée hebdomadaire dans un coffre-fort numérique gabonais
  (encore à identifier — voir suivi).
- **Connectivité** : la PNPI ne fait **aucun appel sortant** vers des
  services hébergés hors Gabon, à l'exception des intégrations CEMAC à
  venir (RCCM, OAPI), validées au cas par cas.
- **Supervision** : Prometheus + Grafana sur infrastructure ANINF.
- **Conformité documentaire** : dépôt préalable du traitement à la CNPDCP
  gabonaise (Commission Nationale pour la Protection des Données à
  Caractère Personnel) — à la charge du Ministère client.

## Conséquences

### Positives

- **Souveraineté** : aucun risque de saisie ou de coopération forcée par
  une juridiction étrangère (Cloud Act US, etc.).
- **Conformité** : alignement avec la doctrine Cabinet et les engagements
  régionaux CEMAC.
- **Image institutionnelle** : argument fort à présenter au Cabinet et aux
  pays CEMAC observateurs (Cameroun, Congo).
- **Maîtrise du coût** : les coûts ANINF sont dégressifs (vs cloud
  hyperscaler dont la facturation à l'usage est imprévisible).
- **Latence** : utilisateurs gabonais → datacenter Libreville = <50 ms.

### Négatives

- **SLA inférieur** au cloud hyperscaler : 99,5 % ANINF vs 99,99 % AWS.
  Conséquence : ~43h d'indisponibilité tolérable par an vs 52 minutes.
  Atténuation : architecture active-passive multi-AZ, tests de bascule
  trimestriels, RTO 4h / RPO 1h cibles.
- **Outillage moins mature** : pas d'équivalent natif à AWS RDS, S3,
  CloudFront. Il faut tout reconstruire (PostgreSQL géré, MinIO sur disque
  local, CDN à mettre en place — cf. dette technique).
- **Compétences locales rares** : peu d'ingénieurs SRE expérimentés Linux +
  PostgreSQL + Docker au Gabon. Risque clé sur la reprise par une équipe
  interne.
- **Dépendance au monopole ANINF** : pas de plan B opérationnel à court
  terme. Un incident majeur sur le datacenter de Libreville bloquerait
  toute la PNPI.

### Suivi

- **2026-T2** : signature de la convention de service avec l'ANINF (SLA,
  RTO/RPO, points de contact 24/7, escalade).
- **2026-T3** : test de bascule complet (chaos engineering supervisé) :
  arrêt simulé de l'instance primaire, mesure RTO réel.
- **2026-T4** : étude d'un site secondaire à **Port-Gentil** ou
  **Franceville** pour redondance géographique nationale.
- **2027** : étude pour adhésion à un peering régional CEMAC (Douala,
  Brazzaville) afin de mutualiser la BCP.

## Alternatives considérées et rejetées

### Cloud étranger (AWS Paris)

- **Pour** : maturité, outillage, SLA 99,99 %.
- **Contre** : violation de la doctrine de souveraineté, exposition au
  Cloud Act, dépendance au paiement en devises.
- **Verdict** : incompatible avec la mission régalienne de la plateforme.

### Cloud africain (CSquared, Liquid)

- **Pour** : compromis souveraineté/performance.
- **Contre** : aucun acteur n'est gabonais, transfert transfrontalier de
  données régaliennes — soumis à autorisation CNPDCP au cas par cas. Coût
  similaire à AWS sans le bénéfice de souveraineté nationale stricte.
- **Verdict** : à reconsidérer pour la stratégie multi-tenant CEMAC
  (ADR-004), mais pas pour le tenant Gabon.

## Comparables

- **France** : DLNUF (Doctrine du Numérique Public) — cloud souverain
  obligatoire pour données sensibles (SecNumCloud).
- **Maroc** : DGSSI impose hébergement national pour services publics
  critiques. Watiqa hébergé chez le Gouvernement.
- **Sénégal** : ADIE héberge tous les services publics — modèle ANINF.
- **Estonia** : X-Road redondé entre 2 datacenters nationaux + ambassade
  numérique au Luxembourg pour BCP régalienne.

---

*Fin de l'ADR-003.*
