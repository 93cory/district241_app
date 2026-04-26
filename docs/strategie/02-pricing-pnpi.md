# Modèle de pricing PNPI — Pour l'audience ministérielle

> Document de cadrage économique · à utiliser comme support à la conversation, pas comme document de signature

---

## 1. Le contexte qui dicte les chiffres

| Variable | Valeur de référence Gabon |
|---|---|
| Salaire ingénieur senior à Libreville | 1.5 – 3 M FCFA / mois |
| TJM consultant IT senior | 200 – 400 K FCFA |
| Coût annuel hébergement souverain ANINF (estimation) | 4 – 8 M FCFA |
| Budget moyen IT Ministère technique | 200 – 800 M FCFA / an |
| Marché public IT Gabon (taille typique) | 30 – 300 M FCFA |

> **Cible psychologique** : un montant qui ne soit **ni dérisoire** (le Cabinet sous-estime alors la valeur) **ni excessif** (rejet immédiat). Zone : **15–40 M FCFA / an**.

---

## 2. Trois lignes d'offre (à présenter)

### Ligne 1 — Cession et droit d'usage perpétuel pour l'État Gabonais

| Item | Montant | Commentaire |
|---|---|---|
| Cession du droit d'usage perpétuel | **0 FCFA (don)** | Le geste fort. Vous offrez la plateforme à l'État. |
| Documentation, code source, transfert | Inclus | Mise en séquestre numérique chez avocat |
| Formation initiale des 6 profils | Inclus (3 jours) | Sessions par groupe métier |

**Valeur perçue** : ~80–120 M FCFA (le coût équivalent si l'État avait passé un marché public pour développer la plateforme).

**Effet** : positionne la générosité civique. Le Cabinet voit que vous n'êtes pas là pour racketter.

### Ligne 2 — Convention pluri-annuelle de maintenance et d'évolution (RECURRENT)

C'est **la ligne qui finance votre vie**. Trois variantes selon ambition :

#### Option Standard — 18 M FCFA / an (1.5 M / mois)

Couvre :
- Hébergement souverain (ANINF ou équivalent) + supervision
- Maintenance correctice (bugs critiques sous 4h, autres sous 48h)
- 2 montées de version mineures par an
- Support utilisateur 8h-17h jours ouvrés
- Hotline directe pour le Cabinet (Ministre, DG, DGA)
- Rapports trimestriels d'usage

#### Option Avancée — 28 M FCFA / an (2.3 M / mois) — **recommandée**

Tout le Standard +
- 1 montée de version majeure par an (nouvelles fonctionnalités stratégiques)
- 1 jour-homme par mois d'évolution sur mesure (24 jours/an)
- Module IA (chat assistant + prédictions) : crédits Anthropic inclus jusqu'à 200 USD/mois
- Backup off-site (S3 chiffré) + plan de continuité d'activité
- Audit pentest externe annuel

#### Option Premium — 42 M FCFA / an (3.5 M / mois)

Tout l'Avancé +
- App mobile inspecteurs (Android + iOS) maintenue
- 3 jours-hommes par mois d'évolution sur mesure
- Intégration Registre du Commerce + DGI (interfaces)
- Signature électronique qualifiée
- Pentest semestriel + audit ISO 27001 préparatoire

### Ligne 3 — Prestations à la demande (HORS FORFAIT)

| Prestation | TJM | Cas d'usage |
|---|---|---|
| Développement nouveau module métier | 350 K FCFA / jour | Ex. module gestion des subventions |
| Audit / conseil stratégique | 400 K FCFA / jour | Études de cadrage |
| Formation supplémentaire | 250 K FCFA / jour | Sessions terrain pour inspecteurs |
| Migration / interconnexion système tiers | 500 K FCFA / jour | API DGI, Trésor, Douanes |

---

## 3. Argumentaire prix vs valeur

> *« Pour mettre en perspective : un consultant IT externe facturerait à l'État 60–120 M FCFA pour développer la plateforme telle qu'elle existe. Je vous l'offre. Je demande seulement les moyens de la maintenir vivante et de la faire évoluer. La maintenance d'un actif numérique vaut typiquement 15–25 % du coût d'investissement par an — c'est précisément la fourchette des 18–28 M FCFA. »*

**Comparables internationaux** :
- France : France-Connect pour Bercy → 6 M€ / an de maintenance
- Maroc : Plateforme RNIE → 15 M MAD / an
- Sénégal : SENELEC e-services → 80 M FCFA / an

→ La PNPI à 18-28 M FCFA est **compétitive et raisonnable** pour un Ministère.

---

## 4. Points de négociation prévisibles

| Le Cabinet pourrait dire | Votre réponse |
|---|---|
| « C'est cher » | « Le coût équivalent en marché public serait 5x supérieur. Nous parlons d'un actif national stratégique, pas d'un site vitrine. » |
| « On peut faire moins ? » | Option Standard à 18 M. Acceptez si vous voyez un autre Ministère adopter dans la foulée. |
| « Comment savoir que vous tenez l'engagement ? » | « Convention assortie de SLA contractuels avec pénalités. Audits trimestriels indépendants. » |
| « Et la souveraineté du code ? » | « Code en escrow chez un notaire, accessible à l'État en cas d'incident. » |
| « Et si vous faites faillite / partez ? » | « Convention de transfert de compétence à un tiers gabonais agréé. Documentation exhaustive prête. » |
| « 28 M c'est trop pour la première année » | Proposez : Standard 18 M année 1, Avancé 28 M dès l'année 2 si KPIs satisfaisants |

---

## 5. La règle d'or à l'audience

**Ne donnez aucun chiffre spontanément**. Si on vous demande, donnez **la fourchette 18–42 M selon le périmètre** et précisez : « Ce sont des ordres de grandeur. Je serai ravi de présenter une proposition détaillée à votre directeur de cabinet ou au DAF dans les 7 jours. »

Cela vous donne :
1. Le temps de calibrer après l'audience selon les signaux reçus
2. La possibilité d'ajuster en fonction du DG pressenti pour piloter le dossier
3. L'aura d'un professionnel qui ne brade pas

---

## 6. Calcul de viabilité personnelle (interne, à ne pas montrer)

**Hypothèse Option Avancée 28 M FCFA / an** :

| Poste | Montant annuel |
|---|---|
| Infra (ANINF/OVH + S3 + monitoring) | 6 M |
| Crédits Anthropic / OpenAI / Claude | 2.5 M |
| Pentest annuel | 3 M |
| Avocat / fiscal / structure | 1 M |
| Marges de manœuvre / formation | 1.5 M |
| **Total charges** | **14 M** |
| **Reste pour rémunération concepteur** | **14 M / an = 1.17 M / mois** |

→ Couvre votre vie + vous laisse la marge pour le développement CEMAC.

**Hypothèse Option Premium 42 M / an** :

Charges similaires +5 M (app mobile, signature qualifiée) = 19 M.
Reste : **23 M / an = 1.9 M / mois**. Confortable + capacité d'embauche.

---

## 7. Si pivot CEMAC (horizon 18 mois)

Si après 12-18 mois la PNPI tourne au Gabon, vous pouvez :
- Démarcher Cameroun / Congo / Tchad / Centrafrique / Guinée éq.
- Modèle SaaS multi-tenant à 12-20 M FCFA / pays / an
- 4 pays = +60 M FCFA récurrents
- Revenu total possible : 90–110 M FCFA / an avec 1 Gabon + 4 CEMAC

→ C'est ce qui justifie la **conservation de la PI** dans la posture C.

---

*Note interne. Préparation audience ministérielle. NE PAS DIFFUSER tel quel.*
