# Rapport de test PRA — 10 août 2026

> Réponse à la dette technique D-013 ("plan de bascule jamais exécuté en
> grandeur réelle"). Premier test de restauration supervisé, exécuté et
> documenté.

## 1. Portée et méthode

**Ce qui a été testé** : la procédure de restauration décrite dans
`docs/pra_pca.md` (§ Procédure de restauration, étapes 1 à 4), exécutée
réellement — pas relue, pas simulée sur papier.

**Ce qui n'a PAS été testé** :
- Le script `restore_db.ps1` documenté tel quel n'a pas pu être exécuté :
  il suppose un poste disposant des outils client PostgreSQL
  (`pg_dump`/`pg_restore`/`psql`), absents de la machine utilisée pour ce
  test. Le test a utilisé un équivalent fonctionnel (mêmes commandes
  `pg_dump`/`pg_restore`, exécutées à l'intérieur de conteneurs Docker
  plutôt que depuis l'hôte). **Action** : soit installer les outils client
  PostgreSQL sur le poste d'astreinte réel, soit convertir les scripts
  PowerShell en scripts conteneurisés pour éviter cette dépendance.
- L'étape 5 ("Basculer trafic sur instance restaurée") n'a pas été testée
  : le test a démarré un backend *parallèle* pointé sur l'instance
  restaurée, sans jamais couper ni rediriger le trafic réel. La bascule
  DNS/reverse-proxy réelle (nginx, cf `deploy/nginx.conf`) reste à tester.
- Les facteurs humains/organisationnels du RTO (détection de l'incident,
  décision de déclencher le PRA, communication aux parties prenantes,
  coordination avec l'hébergeur ANINF) ne sont pas mesurables par un test
  technique solo — le chiffre ci-dessous est un **plancher technique**,
  pas le RTO réel attendu en conditions de crise.
- Volume de données : ~110 lignes (35 opérateurs, 77 ATI — état actuel de
  l'environnement de dev). Le comportement à l'échelle de données de
  production réelles (potentiellement bien plus volumineuses) n'est pas
  garanti identique.
- Les fichiers physiques joints (`uploads/ati`, documents/photos) —
  cf section 4 ci-dessous, découverte importante.

**Environnement** : Docker local, isolé de l'instance de développement
primaire (`pnpi-postgres`) à aucun moment modifiée ou arrêtée — toute la
procédure a tourné sur des conteneurs jetables dédiés au test, supprimés
en fin de test.

## 2. Déroulé

| Étape (cf `pra_pca.md`) | Action réelle | Résultat |
|---|---|---|
| Baseline | Comptage des lignes sur 5 tables clés avant le test | 35 opérateurs, 77 ATI, 176 documents, 16 inspections, 584 événements d'audit |
| Sauvegarde | `pg_dump --format=custom` de l'instance source | Dump 258 Ko produit |
| 1. Isoler l'instance | *(non applicable — l'instance source n'a jamais été touchée, cf portée)* | — |
| 2. Provisionner nouvelle base | Nouveau conteneur `postgres:16-3.4` + PostGIS, volume vierge | Démarré, prêt en ~15s (attente de la 2ᵉ occurrence "ready to accept connections" dans les logs — piège classique du double redémarrage d'init déjà rencontré en D-010) |
| 3. Restaurer | `pg_restore --clean --if-exists --no-owner --no-privileges` | Restauration réussie (3 avertissements bénins : schémas PostGIS déjà présents — comportement déjà documenté en D-010) |
| Vérification intégrité DB | Recomptage des 5 tables sur l'instance restaurée | **Identique à la baseline, exact** |
| 4. Vérification applicative | Backend PNPI complet démarré et pointé sur l'instance restaurée (port séparé, jamais exposé au trafic réel) | Démarrage propre, login fonctionnel, endpoints dossiers pilotage / documents / dashboard tous répondent normalement |
| 5. Bascule trafic | *(non testé, cf portée)* | — |

## 3. RTO mesuré

**276 secondes (~4,6 minutes)** entre la sauvegarde et la vérification
applicative complète (fin de l'étape 4).

**Cible documentée** : 4 heures.

Marge très confortable sur le plan strictement technique — mais ce
chiffre exclut délibérément tous les facteurs qui dominent en général un
RTO réel (détection, décision, communication, bascule DNS/trafic,
coordination humaine). Il valide que **la mécanique** de restauration
n'est pas le facteur limitant du RTO à 4h ; il ne prouve pas que 4h serait
tenu en situation réelle de crise.

## 4. Découverte importante : les fichiers physiques ne sont PAS couverts

Le backend de test, démarré sur l'instance restaurée, a signalé
`fichiers_physiques_manquants: 0` pour les 176 documents — en apparence
parfait. En creusant, ce résultat est **trompeur** : le script de seed de
l'environnement de démo (`seed_pnpi.py`) régénère automatiquement des
fichiers PDF de démonstration à chaque démarrage si absents, y compris
sur ce conteneur de test qui n'avait reçu aucun fichier physique restauré.

**Implication réelle** : `pg_dump`/`pg_restore` ne couvre que la base de
données. Les documents ATI physiques (`uploads/ati`, cf dette D-001)
n'ont **aucun mécanisme de sauvegarde/restauration testé ici** — en
production réelle (sans script de seed pour masquer le trou), une perte
du volume de documents ne serait PAS couverte par la procédure PRA
actuelle telle que documentée. C'est exactement le risque déjà identifié
par D-001 (stockage documents non répliqué) et R-003 (registre de
risques) — ce test en apporte une confirmation empirique concrète plutôt
que théorique.

**Action recommandée** : la bascule vers S3/MinIO (D-001,
`scripts/migrate_uploads_to_s3.py`, déjà implémentée et testée en lot 90)
doit être effectuée en production avant qu'un test PRA puisse être
considéré complet — MinIO dispose de mécanismes de réplication propres
qui, eux, couvriraient ce trou.

## 5. Conclusions et actions

1. **La procédure de restauration DB fonctionne** et respecte largement
   le RTO cible sur le plan technique. ✅
2. **Intégrité des données confirmée** : aucune perte, comptages exacts
   avant/après. ✅
3. **Les scripts documentés (`restore_db.ps1`) nécessitent un poste avec
   client PostgreSQL** — à vérifier/provisionner pour l'astreinte réelle,
   ou à conteneuriser. ⚠️
4. **Les fichiers physiques ne sont pas couverts par cette procédure** —
   dépendance forte sur la finalisation de D-001 en production. 🔴
5. **La bascule de trafic réelle (étape 5, nginx) n'a jamais été testée**
   — prochain test PRA à étendre à cette étape. ⚠️
6. **Aucun test à l'échelle de données de production** — à refaire une
   fois des volumes réels disponibles.

**Prochaine revue** : trimestrielle, alignée sur le rythme du registre de
risques (`risk-register.md`), en réutilisant `scripts/test_migration_replay.sh`
comme brique technique commune (dump/restore/vérification déjà
outillés).
