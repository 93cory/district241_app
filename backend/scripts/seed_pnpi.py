"""
PNPI · Script de donnees de demonstration (version complete et realiste)
==========================================================================
Genere:
  - 6 utilisateurs PNPI avec roles varies
  - 35 operateurs industriels repartis sur les 9 provinces du Gabon
  - 60 ATIs en etats varies (soumis, en_instruction, en_validation, approuve, rejete)
  - 10 inspections de conformite couvrant plusieurs provinces
  - Transitions d'etat coherentes pour chaque ATI
  - Notification SLA si des ATIs depassent leur delai

Usage:
    python backend/scripts/seed_pnpi.py
"""
from __future__ import annotations

import sys
import uuid
from collections import Counter
from datetime import timedelta
from pathlib import Path

# ---------------------------------------------------------------------------
# Chemin Python
# ---------------------------------------------------------------------------
BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from passlib.context import CryptContext

from app.database import engine, SessionLocal, Base, now_utc
from app.models import UserAccountORM, NotificationORM
from app.models.pnpi import (
    OperateurIndustrielORM,
    AgrementTechniqueIndustrielORM,
    ATITransitionORM,
    InspectionConformiteORM,
    AnnouncementORM,
)

# ---------------------------------------------------------------------------
# Utilitaires
# ---------------------------------------------------------------------------

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def uid(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:10].upper()}"


def days_ago(n: int):
    return now_utc() - timedelta(days=n)


def nif_gabon(digits: str, letter: str) -> str:
    return f"{digits[:8]}{letter.upper()}"


# ---------------------------------------------------------------------------
# 1. UTILISATEURS PNPI
# ---------------------------------------------------------------------------

USERS_DATA = [
    {"username": "admin",            "full_name": "Jean-Baptiste MOUSSAVOU",    "roles_csv": "admin",       "password": "Admin@PNPI2026!",       "email_hint": "admin@pnpi-gabon.ga"},
    {"username": "ministre",         "full_name": "Dr. Euloge NKOGHE BEKALE",   "roles_csv": "ministre",    "password": "Ministre@PNPI2026!",    "email_hint": "ministre@industrie.ga"},
    {"username": "directeur",        "full_name": "Pierre NGUEMA ONDO",         "roles_csv": "directeur",   "password": "Directeur@PNPI2026!",   "email_hint": "directeur@pnpi-gabon.ga"},
    {"username": "instructeur",      "full_name": "Sylvie BONGO ONDO",          "roles_csv": "instructeur", "password": "Instructeur@PNPI2026!", "email_hint": "instructeur@pnpi-gabon.ga"},
    {"username": "instructeur_bois", "full_name": "Anselme NGUEMA MBA",         "roles_csv": "instructeur", "password": "Bois@PNPI2026!",        "email_hint": "a.nguema@pnpi-gabon.ga"},
    {"username": "instructeur_mines","full_name": "Pauline NZENG ONDO",         "roles_csv": "instructeur", "password": "Mines@PNPI2026!",       "email_hint": "p.nzeng@pnpi-gabon.ga"},
    {"username": "inspecteur",       "full_name": "Marie OBAME MVOME",          "roles_csv": "inspecteur",  "password": "Inspecteur@PNPI2026!",  "email_hint": "inspecteur@pnpi-gabon.ga"},
    {"username": "inspecteur_nord",  "full_name": "Fernand EYOGO NGUEMA",       "roles_csv": "inspecteur",  "password": "Nord@PNPI2026!",        "email_hint": "f.eyogo@pnpi-gabon.ga"},
    {"username": "inspecteur_sud",   "full_name": "Josephine NDONG OKOUE",      "roles_csv": "inspecteur",  "password": "Sud@PNPI2026!",         "email_hint": "j.ndong@pnpi-gabon.ga"},
    {"username": "operateur",        "full_name": "Jean-Claude MOUSSAVOU",      "roles_csv": "operateur",   "password": "Operateur@PNPI2026!",   "email_hint": "operateur@pnpi-gabon.ga"},
    {"username": "operateur_bois",   "full_name": "Raymond OYANE ENGOUANG",     "roles_csv": "operateur",   "password": "BoisOp@PNPI2026!",      "email_hint": "r.oyane@entreprise-bois.ga"},
]

# ---------------------------------------------------------------------------
# 2. OPERATEURS INDUSTRIELS (35)
# ---------------------------------------------------------------------------

PROVINCE_COORDS = {
    "estuaire":        ( 0.3924,  9.4536),
    "haut_ogooue":     (-1.6320, 13.5920),
    "ogooue_maritime": (-0.7197,  8.7815),
    "ngounie":         (-1.8650, 11.0610),
    "woleu_ntem":      ( 1.5975, 11.5814),
    "moyen_ogooue":    (-0.6982, 10.2429),
    "nyanga":          (-2.9276, 10.9794),
    "ogooue_lolo":     (-1.1220, 12.4710),
    "ogooue_ivindo":   ( 0.5710, 12.8600),
}

OPERATEURS_DATA = [
    # ESTUAIRE (8)
    {"raison_sociale": "ROUGIER GABON SA",                         "nif": nif_gabon("20190012", "B"), "secteur": "bois",             "province": "estuaire",        "ville": "Libreville",   "effectif": 850,  "email": "contact@rougier-gabon.ga",         "tel": "+241 01 74 32 10", "lat_off": ( 0.012,  0.034)},
    {"raison_sociale": "TRANSGABONAISE BOIS SARL",                 "nif": nif_gabon("20210087", "T"), "secteur": "bois",             "province": "estuaire",        "ville": "Owendo",       "effectif": 310,  "email": "info@transgabonaisebois.ga",        "tel": "+241 01 72 15 60", "lat_off": (-0.030,  0.055)},
    {"raison_sociale": "OLAM PALM GABON SA",                       "nif": nif_gabon("20120011", "A"), "secteur": "agroalimentaire",  "province": "estuaire",        "ville": "Libreville",   "effectif": 1850, "email": "gabon@olampalm.com",               "tel": "+241 01 72 80 00", "lat_off": ( 0.021,  0.012)},
    {"raison_sociale": "BRASSERIES DU GABON (BGN)",                "nif": nif_gabon("20030033", "G"), "secteur": "agroalimentaire",  "province": "estuaire",        "ville": "Libreville",   "effectif": 780,  "email": "bgn@brasseriesgabon.ga",           "tel": "+241 01 76 20 00", "lat_off": ( 0.018, -0.020)},
    {"raison_sociale": "SOGEA-SATOM GABON",                        "nif": nif_gabon("20100011", "S"), "secteur": "btp",              "province": "estuaire",        "ville": "Libreville",   "effectif": 650,  "email": "gabon@sogea-satom.com",            "tel": "+241 01 73 50 00", "lat_off": (-0.005,  0.018)},
    {"raison_sociale": "COLAS GABON SA",                           "nif": nif_gabon("20070033", "C"), "secteur": "btp",              "province": "estuaire",        "ville": "Owendo",       "effectif": 480,  "email": "gabon@colas.com",                  "tel": "+241 01 70 80 00", "lat_off": (-0.028,  0.040)},
    {"raison_sociale": "GABON SPECIAL ECONOMIC ZONE (GSEZ)",       "nif": nif_gabon("20100001", "Z"), "secteur": "services",         "province": "estuaire",        "ville": "Nkok",         "effectif": 215,  "email": "info@gsez.ga",                     "tel": "+241 01 70 55 00", "lat_off": ( 0.045,  0.070)},
    {"raison_sociale": "SETRAG (TRANSGABONAIS)",                   "nif": nif_gabon("20050002", "R"), "secteur": "services",         "province": "estuaire",        "ville": "Libreville",   "effectif": 1350, "email": "contact@setrag.ga",                "tel": "+241 01 74 18 00", "lat_off": (-0.010, -0.015)},
    # HAUT-OGOOUE (5)
    {"raison_sociale": "COMILOG SA (ERAMET GROUP)",                "nif": nif_gabon("20010000", "M"), "secteur": "mines",            "province": "haut_ogooue",     "ville": "Moanda",       "effectif": 3200, "email": "contact@comilog.ga",               "tel": "+241 01 61 50 00", "lat_off": (-0.180,  0.020)},
    {"raison_sociale": "GABON MANGANESE SA",                       "nif": nif_gabon("20180023", "V"), "secteur": "mines",            "province": "haut_ogooue",     "ville": "Franceville",  "effectif": 420,  "email": "info@gabon-manganese.ga",          "tel": "+241 01 67 34 56", "lat_off": ( 0.008,  0.012)},
    {"raison_sociale": "COMPAGNIE MINIERE DE L'OGOOUE (CMO)",      "nif": nif_gabon("20161122", "O"), "secteur": "mines",            "province": "haut_ogooue",     "ville": "Lastoursville","effectif": 280,  "email": "cmo@cmo-gabon.ga",                 "tel": "+241 01 63 44 21", "lat_off": ( 0.350, -0.950)},
    {"raison_sociale": "PERENCO GABON · BLOC HAUT-OGOOUE",         "nif": nif_gabon("20010001", "H"), "secteur": "petrole",          "province": "haut_ogooue",     "ville": "Franceville",  "effectif": 95,   "email": "hog@perenco-gabon.com",            "tel": "+241 01 67 55 10", "lat_off": ( 0.022,  0.030)},
    {"raison_sociale": "GABON PREFAB INDUSTRIES",                  "nif": nif_gabon("20220044", "P"), "secteur": "btp",              "province": "haut_ogooue",     "ville": "Franceville",  "effectif": 85,   "email": "gpi@prefab-gabon.ga",              "tel": "+241 01 67 88 22", "lat_off": (-0.015,  0.025)},
    # OGOOUE-MARITIME (5)
    {"raison_sociale": "GABON OIL COMPANY (GOC)",                  "nif": nif_gabon("20120000", "G"), "secteur": "petrole",          "province": "ogooue_maritime", "ville": "Port-Gentil",  "effectif": 420,  "email": "contact@goc.ga",                   "tel": "+241 01 56 30 00", "lat_off": ( 0.025, -0.020)},
    {"raison_sociale": "PERENCO GABON",                            "nif": nif_gabon("20010002", "Q"), "secteur": "petrole",          "province": "ogooue_maritime", "ville": "Port-Gentil",  "effectif": 1100, "email": "gabon@perenco.com",                "tel": "+241 01 56 40 00", "lat_off": (-0.012,  0.018)},
    {"raison_sociale": "MAUREL & PROM GABON",                      "nif": nif_gabon("20080003", "E"), "secteur": "petrole",          "province": "ogooue_maritime", "ville": "Port-Gentil",  "effectif": 280,  "email": "gabon@maureletprom.com",           "tel": "+241 01 55 20 00", "lat_off": ( 0.005,  0.008)},
    {"raison_sociale": "SGPI (PECHE INDUSTRIELLE)",                "nif": nif_gabon("20140056", "F"), "secteur": "peche",            "province": "ogooue_maritime", "ville": "Port-Gentil",  "effectif": 185,  "email": "sgpi@peche-gabon.ga",              "tel": "+241 01 55 88 40", "lat_off": (-0.030,  0.045)},
    {"raison_sociale": "ATLANTIQUE PECHE SARL",                    "nif": nif_gabon("20190078", "X"), "secteur": "peche",            "province": "ogooue_maritime", "ville": "Port-Gentil",  "effectif": 75,   "email": "atlantique@peche-pg.ga",           "tel": "+241 01 56 12 34", "lat_off": ( 0.040, -0.060)},
    # NGOUNIE (4)
    {"raison_sociale": "BOIS DES AIEUX SARL",                      "nif": nif_gabon("20210056", "N"), "secteur": "bois",             "province": "ngounie",         "ville": "Mouila",       "effectif": 180,  "email": "bda@boisdesaieux.ga",              "tel": "+241 01 62 78 91", "lat_off": ( 0.015,  0.020)},
    {"raison_sociale": "COMPAGNIE FORESTIERE DE LA NGOUNIE (CFN)", "nif": nif_gabon("20150089", "U"), "secteur": "bois",             "province": "ngounie",         "ville": "Ndende",       "effectif": 260,  "email": "cfn@foret-ngounie.ga",             "tel": "+241 01 62 45 00", "lat_off": ( 0.280,  0.010)},
    {"raison_sociale": "SUCAF GABON (GROUPE CASTEL)",              "nif": nif_gabon("20050022", "K"), "secteur": "agroalimentaire",  "province": "ngounie",         "ville": "Mouila",       "effectif": 560,  "email": "sucaf@castel-gabon.ga",            "tel": "+241 01 85 30 00", "lat_off": (-0.010,  0.015)},
    {"raison_sociale": "AGRO-NGOUNIE SARL",                        "nif": nif_gabon("20200067", "L"), "secteur": "agroalimentaire",  "province": "ngounie",         "ville": "Mouila",       "effectif": 120,  "email": "agrongounie@agri-gabon.ga",        "tel": "+241 01 62 33 88", "lat_off": ( 0.025, -0.018)},
    # WOLEU-NTEM (3)
    {"raison_sociale": "GABON BOIS INDUSTRIES (GBI)",              "nif": nif_gabon("20200123", "W"), "secteur": "bois",             "province": "woleu_ntem",      "ville": "Oyem",         "effectif": 340,  "email": "gbi@gabon-bois.ga",                "tel": "+241 01 79 45 23", "lat_off": ( 0.010,  0.015)},
    {"raison_sociale": "PRECIOUS WOODS GABON",                     "nif": nif_gabon("20150045", "D"), "secteur": "bois",             "province": "woleu_ntem",      "ville": "Bitam",        "effectif": 1200, "email": "info@preciouswoods-gabon.ga",      "tel": "+241 01 60 15 88", "lat_off": ( 0.450, -0.130)},
    {"raison_sociale": "NORTH GABON FOREST SA",                    "nif": nif_gabon("20230099", "J"), "secteur": "bois",             "province": "woleu_ntem",      "ville": "Mitzic",       "effectif": 145,  "email": "ngf@northgabon-forest.ga",         "tel": "+241 01 79 88 12", "lat_off": (-0.220,  0.080)},
    # MOYEN-OGOOUE (3)
    {"raison_sociale": "COMPAGNIE FORESTIERE DU GABON (CFG)",      "nif": nif_gabon("20120078", "Y"), "secteur": "bois",             "province": "moyen_ogooue",    "ville": "Lambarene",    "effectif": 620,  "email": "cfg@foret-gabon.ga",               "tel": "+241 01 88 24 50", "lat_off": ( 0.012, -0.018)},
    {"raison_sociale": "MINOTERIE DU GABON SA",                    "nif": nif_gabon("20170066", "I"), "secteur": "agroalimentaire",  "province": "moyen_ogooue",    "ville": "Lambarene",    "effectif": 95,   "email": "minoterie@lambarene-industrie.ga", "tel": "+241 01 89 67 89", "lat_off": (-0.022,  0.030)},
    {"raison_sociale": "SOCIETE GABONAISE DE CACAO SARL",          "nif": nif_gabon("20210055", "Z"), "secteur": "agroalimentaire",  "province": "moyen_ogooue",    "ville": "Lambarene",    "effectif": 120,  "email": "sgc@cacao-gabon.ga",               "tel": "+241 01 89 12 34", "lat_off": ( 0.035,  0.012)},
    # NYANGA (3)
    {"raison_sociale": "SILVEX NYANGA SA",                         "nif": nif_gabon("20180034", "V"), "secteur": "bois",             "province": "nyanga",          "ville": "Tchibanga",    "effectif": 230,  "email": "silvex@nyanga-bois.ga",            "tel": "+241 01 85 45 67", "lat_off": ( 0.018,  0.022)},
    {"raison_sociale": "PECHE DU SUD GABON SARL",                  "nif": nif_gabon("20200055", "A"), "secteur": "peche",            "province": "nyanga",          "ville": "Mayumba",      "effectif": 90,   "email": "peche.sud@psg-gabon.ga",           "tel": "+241 01 85 78 90", "lat_off": (-0.520,  0.030)},
    {"raison_sociale": "AGRO-NYANGA SARL",                         "nif": nif_gabon("20220081", "B"), "secteur": "agroalimentaire",  "province": "nyanga",          "ville": "Tchibanga",    "effectif": 65,   "email": "agronyanga@agri-gabon.ga",         "tel": "+241 01 85 22 10", "lat_off": (-0.015, -0.012)},
    # OGOOUE-LOLO (2)
    {"raison_sociale": "MBALAM MINING GABON SARL",                 "nif": nif_gabon("20220056", "C"), "secteur": "mines",            "province": "ogooue_lolo",     "ville": "Koulamoutou",  "effectif": 90,   "email": "mbalam@miningcorp-gabon.ga",       "tel": "+241 01 54 22 78", "lat_off": ( 0.015,  0.020)},
    {"raison_sociale": "LOLO BOIS INDUSTRIES SARL",                "nif": nif_gabon("20190067", "D"), "secteur": "bois",             "province": "ogooue_lolo",     "ville": "Koulamoutou",  "effectif": 155,  "email": "lbi@lolo-bois.ga",                 "tel": "+241 01 54 55 11", "lat_off": (-0.025, -0.030)},
    # OGOOUE-IVINDO (2)
    {"raison_sociale": "GABON IRON SA",                            "nif": nif_gabon("20230089", "E"), "secteur": "mines",            "province": "ogooue_ivindo",   "ville": "Belinga",      "effectif": 45,   "email": "info@gabon-iron.ga",               "tel": "+241 01 88 90 12", "lat_off": ( 0.880, -0.320)},
    {"raison_sociale": "IVINDO MINING CORPORATION SARL",           "nif": nif_gabon("20200043", "F"), "secteur": "mines",            "province": "ogooue_ivindo",   "ville": "Makokou",      "effectif": 130,  "email": "imc@ivindo-mining.ga",             "tel": "+241 01 88 44 77", "lat_off": (-0.010,  0.018)},
]

# ---------------------------------------------------------------------------
# Types d'activite par secteur
# ---------------------------------------------------------------------------

TYPES_ACTIVITE = {
    "bois":            ["Sciage et transformation primaire du bois", "Derolage et fabrication de contreplaques", "Fabrication de parquets et bois profiles", "Export de bois transformes certifies FSC", "Production de charbon de bois et biomasse"],
    "mines":           ["Extraction et traitement du manganese", "Exploitation et concentration de minerai de fer", "Extraction de mineraux industriels", "Services et logistique miniere", "Traitement hydrometallurgique des minerais"],
    "agroalimentaire": ["Transformation de l'huile de palme brute et raffinage", "Production de sucre de canne et derives", "Fabrication de biere, malt et boissons gazeuses", "Transformation du cacao et produits chocolates", "Minoterie et produits cerealiers", "Production de conserves et aliments transformes"],
    "petrole":         ["Exploration et production d'hydrocarbures en mer", "Raffinage, stockage et distribution de carburants", "Services parapetroliers et maintenance offshore", "Transport et logistique petroliere", "Traitement du gaz naturel associe"],
    "btp":             ["Construction d'ouvrages civils et infrastructures routieres", "Fabrication de materiaux de construction", "Genie civil et terrassement", "Construction industrielle et montage metallique", "Renovation et rehabilitation de batiments"],
    "services":        ["Services aux entreprises en zone economique speciale", "Transport ferroviaire, fret et logistique", "Services portuaires et entreposage", "Maintenance industrielle et inspection technique", "Fourniture d'energie et utilites industrielles"],
    "peche":           ["Peche industrielle hauturiere", "Peche cotiere et aquaculture", "Transformation et conserverie de poissons", "Exportation de produits halieutiques"],
}

# ---------------------------------------------------------------------------
# 3. DEFINITIONS DES 60 ATIs
# (op_idx, type_idx, statut, priorite, soumission_days_ago)
# ---------------------------------------------------------------------------

ATI_DEFINITIONS = [
    # ------------------------------------------------------------
    # SOUMIS (11) — dossiers frais, la plupart dans SLA
    # ------------------------------------------------------------
    ( 0, 0, "soumis",         "normale",   3), ( 3, 2, "soumis", "elevee",    1),
    ( 8, 0, "soumis",         "urgente",   2), (13, 1, "soumis", "normale",   5),
    (16, 0, "soumis",         "elevee",    4), (20, 2, "soumis", "normale",   7),
    (24, 0, "soumis",         "normale",   6), (28, 3, "soumis", "elevee",    2),
    (31, 0, "soumis",         "normale",   3), (34, 1, "soumis", "urgente",   1),
    ( 6, 1, "soumis",         "urgente",   0),  # depose aujourd'hui meme
    # ------------------------------------------------------------
    # EN_INSTRUCTION (17) — y compris quelques OVERDUE visibles
    # ------------------------------------------------------------
    ( 1, 1, "en_instruction", "normale",  12), ( 2, 2, "en_instruction", "elevee",  18),
    ( 5, 0, "en_instruction", "normale",  22), ( 7, 3, "en_instruction", "urgente",  9),
    ( 9, 1, "en_instruction", "normale",  15), (11, 0, "en_instruction", "elevee",  20),
    (14, 2, "en_instruction", "normale",  25), (17, 1, "en_instruction", "urgente",  8),
    (19, 0, "en_instruction", "elevee",   30), (21, 3, "en_instruction", "normale", 10),
    (23, 1, "en_instruction", "normale",  35), (26, 0, "en_instruction", "elevee",  14),
    (29, 2, "en_instruction", "urgente",   6), (32, 0, "en_instruction", "normale", 28),
    (33, 1, "en_instruction", "elevee",   17),
    # dramatique : urgente LARGEMENT OVERDUE (45j / SLA 14j)
    ( 4, 2, "en_instruction", "urgente",  45),
    # normale au bord du SLA (28j / SLA 30j) — alerte proche
    (10, 1, "en_instruction", "normale",  28),
    # ------------------------------------------------------------
    # EN_VALIDATION (11) — plusieurs hors SLA
    # ------------------------------------------------------------
    ( 4, 0, "en_validation",  "normale",  40), ( 6, 2, "en_validation", "elevee",  35),
    (10, 1, "en_validation",  "normale",  50), (12, 0, "en_validation", "urgente", 28),
    (15, 3, "en_validation",  "normale",  45), (18, 2, "en_validation", "elevee",  38),
    (22, 0, "en_validation",  "normale",  55), (25, 1, "en_validation", "elevee",  33),
    (27, 0, "en_validation",  "normale",  42), (30, 2, "en_validation", "urgente", 25),
    # urgente extreme : 60 jours, SLA 14
    ( 9, 3, "en_validation",  "urgente",  60),
    # ------------------------------------------------------------
    # APPROUVE CE MOIS (9) — decisions dans les 30 derniers jours
    # soum_days entre 31 et 55 -> decision_at = 1 a 25 jours -> this month
    # ------------------------------------------------------------
    ( 1, 0, "approuve", "normale",  31),  # decision il y a 1 jour (hier)
    ( 5, 2, "approuve", "elevee",   35),  # decision il y a 5 jours
    (11, 0, "approuve", "normale",  38),  # decision il y a 8 jours
    (14, 2, "approuve", "elevee",   42),  # decision il y a 12 jours
    (17, 3, "approuve", "normale",  45),  # decision il y a 15 jours
    (21, 0, "approuve", "elevee",   48),  # decision il y a 18 jours
    (24, 1, "approuve", "normale",  50),  # decision il y a 20 jours
    (27, 2, "approuve", "elevee",   52),  # decision il y a 22 jours
    (30, 0, "approuve", "normale",  55),  # decision il y a 25 jours
    # ------------------------------------------------------------
    # APPROUVE (20) — historique plus ancien
    # ------------------------------------------------------------
    ( 0, 1, "approuve", "normale",  90), ( 2, 0, "approuve", "elevee",  120),
    ( 3, 3, "approuve", "normale", 200), ( 5, 1, "approuve", "normale", 180),
    ( 6, 0, "approuve", "elevee",  150), ( 8, 2, "approuve", "normale", 365),
    ( 9, 0, "approuve", "elevee",  400), (10, 3, "approuve", "normale", 300),
    (11, 1, "approuve", "normale", 250), (12, 2, "approuve", "elevee",  100),
    (13, 0, "approuve", "normale", 320), (14, 1, "approuve", "elevee",  170),
    (16, 3, "approuve", "normale", 280), (17, 0, "approuve", "elevee",  230),
    (19, 2, "approuve", "normale", 190), (20, 0, "approuve", "elevee",  210),
    (23, 1, "approuve", "normale", 155), (24, 2, "approuve", "normale", 340),
    (26, 0, "approuve", "elevee",  420), (31, 3, "approuve", "normale", 260),
    # ------------------------------------------------------------
    # APPROUVE · EXPIRATION PROCHE (4) — expire dans < 60 jours
    # Duree ATI = 3 ans (1095j). decision = soum_days - 30.
    # Pour expirer dans X jours : soum_days = 1095 + 30 - X = 1125 - X
    # ------------------------------------------------------------
    (22, 1, "approuve", "normale", 1080),  # expire dans ~45j
    (25, 2, "approuve", "elevee",  1095),  # expire dans ~30j
    (28, 0, "approuve", "normale", 1110),  # expire dans ~15j
    (32, 3, "approuve", "elevee",  1125),  # expire aujourd'hui
    # ------------------------------------------------------------
    # REJETE (5)
    # ------------------------------------------------------------
    ( 1, 2, "rejete", "normale",  80), ( 7, 1, "rejete", "elevee",  110),
    (15, 0, "rejete", "normale", 140), (21, 2, "rejete", "elevee",   95),
    (28, 1, "rejete", "normale", 160),
]

MOTIFS_REJET = [
    "Dossier incomplet : pieces techniques manquantes (plan de masse, etude d'impact).",
    "Capacite de production non conforme aux equipements presentes lors de l'instruction.",
    "Non-respect des normes securite incendie NFPA-10 dans le plan de prevention des risques.",
    "Absence de certificat de conformite electrique des installations industrielles.",
    "Etude d'impact environnemental insuffisante : risques de contamination des sols non analyses.",
]

# ---------------------------------------------------------------------------
# 5. ANNONCES OFFICIELLES (visibles en banner)
# ---------------------------------------------------------------------------

ANNOUNCEMENTS_DATA = [
    {
        "title": "Nouvelle reglementation ATI secteur bois en vigueur 1er mai",
        "body": "Le decret 2026-127 instituant le nouveau cahier des charges pour le secteur bois entre en vigueur le 1er mai 2026. Toutes les nouvelles demandes d'agrement devront respecter les nouvelles exigences de tracabilite FSC.",
        "severity": "info",
        "target_roles": "instructeur,directeur,operateur",
        "days_ago_created": 4,
        "days_ago_expires": -30,  # expire dans 30 jours
    },
    {
        "title": "Formation instructeurs · 15 mai 2026 a Libreville",
        "body": "Session de formation continue sur les nouveaux outils d'instruction numerique. Inscription obligatoire avant le 5 mai. Priorite aux instructeurs secteurs bois et mines.",
        "severity": "info",
        "target_roles": "instructeur",
        "days_ago_created": 2,
        "days_ago_expires": -20,
    },
    {
        "title": "Maintenance programmee · dimanche 4 mai 4h-6h",
        "body": "La plateforme PNPI sera indisponible pour maintenance technique. Operations planifiees : migration base de donnees, mise a jour securite. Aucune perte de donnees anticipee.",
        "severity": "warning",
        "target_roles": None,
        "days_ago_created": 1,
        "days_ago_expires": -10,
    },
]

# ---------------------------------------------------------------------------
# 6. NOTIFICATIONS VARIEES (ministre et directeur)
# ---------------------------------------------------------------------------

NOTIFICATIONS_DATA = [
    {"target": "ministre", "title": "ROUGIER GABON · renouvellement ATI approuve",      "severity": "info",     "days_ago":  1, "key": "seed_notif_1"},
    {"target": "ministre", "title": "4 ATI expirent dans les 60 prochains jours",       "severity": "medium",   "days_ago":  2, "key": "seed_notif_2"},
    {"target": "ministre", "title": "Inspection CMO Lastoursville · non-conformite critique", "severity": "high", "days_ago":  2, "key": "seed_notif_3"},
    {"target": "directeur","title": "9 ATI approuves ce mois · rapport mensuel pret",   "severity": "info",     "days_ago":  0, "key": "seed_notif_4"},
    {"target": "directeur","title": "GABON MANGANESE · mesures correctives en retard",  "severity": "high",     "days_ago":  5, "key": "seed_notif_5"},
    {"target": "instructeur","title":"Nouveau dossier ATI secteur bois a instruire",    "severity": "info",     "days_ago":  0, "key": "seed_notif_6"},
]

NUMEROS_REFERENCE = [
    "DEC-MIN-IND/2024/001", "DEC-MIN-IND/2024/015", "DEC-MIN-IND/2024/032",
    "DEC-MIN-IND/2024/048", "DEC-MIN-IND/2024/067", "DEC-MIN-IND/2025/002",
    "DEC-MIN-IND/2025/019", "DEC-MIN-IND/2025/034", "DEC-MIN-IND/2025/051",
    "DEC-MIN-IND/2025/069", "DEC-MIN-IND/2025/084", "DEC-MIN-IND/2025/101",
    "DEC-MIN-IND/2025/118", "DEC-MIN-IND/2025/135", "DEC-MIN-IND/2025/152",
    "DEC-MIN-IND/2025/170", "DEC-MIN-IND/2025/187", "DEC-MIN-IND/2025/204",
    "DEC-MIN-IND/2026/003", "DEC-MIN-IND/2026/018",
]

# ---------------------------------------------------------------------------
# 4. INSPECTIONS (10)
# ---------------------------------------------------------------------------

INSPECTIONS_DATA = [
    # conforme (4)
    {"op_idx":  0, "inspecteur": "inspecteur",      "statut": "conforme",     "days_ago": 45,  "lat_off":  0.012, "lng_off":  0.034, "observations": "ROUGIER GABON SA (Libreville) : equipements de sciage conformes ATI. Systeme gestion dechets forestiers conforme. Registres, certification FSC et licences a jour. Personnel en EPI. Aucun ecart.", "mesures": None},
    {"op_idx":  8, "inspecteur": "inspecteur_nord", "statut": "conforme",     "days_ago": 20,  "lat_off": -0.018, "lng_off":  0.022, "observations": "COMILOG SA (Moanda) : extraction manganese dans les normes ISO 14001. EPI utilises par 100% des operateurs. Bassins de decantation operationnels. Plan HSE a jour.", "mesures": None},
    {"op_idx": 13, "inspecteur": "inspecteur",      "statut": "conforme",     "days_ago": 55,  "lat_off":  0.025, "lng_off": -0.020, "observations": "GABON OIL COMPANY (Port-Gentil) : unite de production conforme standards API et reglementations PNPI. Plan HSE 2025 a jour. Systeme anti-pollution maritime operationnel.", "mesures": None},
    {"op_idx":  4, "inspecteur": "inspecteur",      "statut": "conforme",     "days_ago": 25,  "lat_off": -0.005, "lng_off":  0.018, "observations": "SOGEA-SATOM GABON (Libreville) : equipements certifies et controles periodiquement. Plan PPRP a jour. Zero accident grave sur 12 mois.", "mesures": None},
    # non_conforme (3)
    {"op_idx":  7, "inspecteur": "inspecteur",      "statut": "non_conforme", "days_ago": 120, "lat_off": -0.010, "lng_off": -0.015, "observations": "SETRAG troncon Libreville-Ndjole : maintenance preventive insuffisante. 14 km de rails depassent le seuil reglementaire. 3 passages a niveau sans barriere fonctionnelle. Registre de maintenance non tenu depuis 4 mois.", "mesures": "Maintenance corrective immediate. Remplacement rails sous 60 jours. Remise en etat passages a niveau sous 15 jours. Inspection de controle dans 30 jours."},
    {"op_idx":  9, "inspecteur": "inspecteur_nord", "statut": "non_conforme", "days_ago": 90,  "lat_off":  0.008, "lng_off":  0.012, "observations": "GABON MANGANESE SA (Franceville) : depassement seuil metaux lourds (Mn > 0,5 mg/L vs 0,1 autorise). Absence bassin decantation secondaire. Stock minerais en zone inondable.", "mesures": "Installation bassin decantation sous 90 jours. Relocalisation stock sous 30 jours. Audit environnemental sous 45 jours."},
    {"op_idx": 16, "inspecteur": "inspecteur",      "statut": "non_conforme", "days_ago": 100, "lat_off": -0.012, "lng_off":  0.018, "observations": "PERENCO GABON (Port-Gentil offshore) : concentration hydrocarbures dans rejets > norme MARPOL (35 ppm). Absence registre incidents environnementaux Q4.", "mesures": "Audit environnemental sous 30 jours. Mise a niveau systeme effluents bloc 7 sous 60 jours. Formation HSE obligatoire."},
    # partiel (3)
    {"op_idx":  1, "inspecteur": "inspecteur",      "statut": "partiel",      "days_ago": 30,  "lat_off": -0.030, "lng_off":  0.055, "observations": "TRANSGABONAISE BOIS (Owendo) : chaine de transformation conforme. Ecarts : gestion dechets forestiers inadequate, absence filiere valorisation. 2 extincteurs non a jour.", "mesures": "Plan gestion dechets sous 45 jours. Verification extincteurs sous 15 jours. Rapport conformite dans 60 jours."},
    {"op_idx":  2, "inspecteur": "inspecteur",      "statut": "partiel",      "days_ago": 10,  "lat_off":  0.021, "lng_off":  0.012, "observations": "OLAM PALM GABON (Libreville) : conforme ISO 22000 dans l'ensemble. Ecart : 3 lots janvier 2026 sans fiche tracabilite numerique complete. Systeme effluents palmeraie a ameliorer.", "mesures": "Regularisation fiches tracabilite sous 7 jours. Mise a niveau systeme effluents sous 60 jours."},
    {"op_idx": 20, "inspecteur": "inspecteur_sud",  "statut": "partiel",      "days_ago": 35,  "lat_off": -0.010, "lng_off":  0.015, "observations": "SUCAF GABON (Mouila) : production sucre dans les normes qualite. Ecarts : stockage non conforme (humidite > 75%). Absence HACCP a jour. Maintenance centrifugeuses en retard.", "mesures": "Renovation entrepots sous 60 jours. Formation HACCP avant 30/04/2026. Plan maintenance sous 30 jours."},

    # --- Nouvelles inspections recentes (10-15 jours) pour que la liste ait de la vie ---
    {"op_idx":  3, "inspecteur": "inspecteur",      "statut": "conforme",     "days_ago":  3,  "lat_off":  0.018, "lng_off": -0.020, "observations": "BRASSERIES DU GABON (Libreville) : lignes d'embouteillage a l'aplomb des normes CEMAC. Traitement eaux usees operationnel. Plan HACCP a jour. Tracabilite lots parfaite.", "mesures": None},
    {"op_idx": 22, "inspecteur": "inspecteur",      "statut": "conforme",     "days_ago":  7,  "lat_off":  0.012, "lng_off": -0.018, "observations": "CFG Lambarene : grumes traitees respectant le plan d'amenagement forestier. Certification FSC renouvelee en janvier. Zone de decoupe conforme.", "mesures": None},
    {"op_idx": 25, "inspecteur": "inspecteur_sud",  "statut": "partiel",      "days_ago":  5,  "lat_off":  0.015, "lng_off":  0.022, "observations": "SILVEX NYANGA (Tchibanga) : exploitation globalement conforme. Ecarts : absence registre retrocession aux communautes locales, 2 scieries sans protection acoustique reglementaire.", "mesures": "Regularisation registre sous 15 jours. Protection acoustique avant 30 mai. Rapport sous 30 jours."},
    {"op_idx": 10, "inspecteur": "inspecteur_nord", "statut": "non_conforme", "days_ago":  2,  "lat_off":  0.350, "lng_off": -0.950, "observations": "CMO Lastoursville : exploitation artisanale non declaree sur perimetre agree. Acces zone contaminee non securisee. Absence plan reprise vegetalisation apres exploitation.", "mesures": "Arret immediat exploitation non declaree. Securisation perimetres sous 7 jours. Plan reprise vegetalisation sous 30 jours. Convocation directeur."},
    {"op_idx": 18, "inspecteur": "inspecteur",      "statut": "conforme",     "days_ago": 12,  "lat_off":  0.005, "lng_off":  0.008, "observations": "MAUREL & PROM GABON (Port-Gentil) : puits Ezanga conformes. Systeme anti-pollution testue dernier trimestre. Registre incidents a jour.", "mesures": None},
    {"op_idx": 23, "inspecteur": "inspecteur_nord", "statut": "conforme",     "days_ago": 15,  "lat_off":  0.010, "lng_off":  0.015, "observations": "GBI Oyem : traitement bois a l'adrex conforme. Sciage respectant normes. Certification FSC renouvelee, aucun ecart.", "mesures": None},
]

# ---------------------------------------------------------------------------
# Script principal
# ---------------------------------------------------------------------------

def main() -> None:
    print("=" * 60)
    print("  PNPI · Seed de donnees de demonstration")
    print("=" * 60)

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Nettoyage
        nb_an = db.query(AnnouncementORM).delete()
        nb_i = db.query(InspectionConformiteORM).delete()
        nb_t = db.query(ATITransitionORM).delete()
        nb_a = db.query(AgrementTechniqueIndustrielORM).delete()
        nb_o = db.query(OperateurIndustrielORM).delete()
        db.commit()
        print(f"  [nettoyage] {nb_o} operateurs, {nb_a} ATIs, {nb_t} transitions, {nb_i} inspections, {nb_an} annonces")

        # 1. Utilisateurs
        print("  [1/5] Utilisateurs PNPI...")
        nb_c = nb_u = 0
        for udata in USERS_DATA:
            existing = db.get(UserAccountORM, udata["username"])
            if existing:
                existing.full_name       = udata["full_name"]
                existing.roles_csv       = udata["roles_csv"]
                existing.hashed_password = hash_password(udata["password"])
                existing.is_active       = True
                nb_u += 1
            else:
                db.add(UserAccountORM(
                    username              = udata["username"],
                    full_name             = udata["full_name"],
                    roles_csv             = udata["roles_csv"],
                    hashed_password       = hash_password(udata["password"]),
                    is_active             = True,
                    created_at            = days_ago(730),
                    failed_login_attempts = 0,
                    locked_until          = None,
                    password_updated_at   = days_ago(30),
                ))
                nb_c += 1
        db.flush()
        print(f"       OK : {nb_c} crees, {nb_u} mis a jour")

        # 2. Operateurs
        print("  [2/5] Operateurs industriels (35)...")
        operateurs = []
        for data in OPERATEURS_DATA:
            lat_c, lng_c = PROVINCE_COORDS[data["province"]]
            dlat, dlng   = data["lat_off"]
            op = OperateurIndustrielORM(
                id                = uid("OPI"),
                nif_gabon         = data["nif"],
                raison_sociale    = data["raison_sociale"],
                secteur           = data["secteur"],
                province          = data["province"],
                ville             = data["ville"],
                latitude          = round(lat_c + dlat, 5),
                longitude         = round(lng_c + dlng, 5),
                contact_email     = data["email"],
                contact_telephone = data["tel"],
                effectif_declare  = data["effectif"],
                is_active         = True,
                created_at        = days_ago(365 * 3 + 90),
                created_by        = "admin",
            )
            db.add(op)
            operateurs.append(op)
        db.flush()
        prov_ctr    = Counter(op.province for op in operateurs)
        secteur_ctr = Counter(op.secteur  for op in operateurs)
        print(f"       OK : {len(operateurs)} operateurs crees")

        # 3. ATIs
        print("  [3/5] ATIs (60)...")
        atis    = []
        ref_idx = 0
        for seq, (op_idx, type_idx, statut, priorite, soum_days) in enumerate(ATI_DEFINITIONS, 1):
            op       = operateurs[op_idx]
            types    = TYPES_ACTIVITE[op.secteur]
            type_act = types[type_idx % len(types)]
            sla      = {"normale": 30, "elevee": 21, "urgente": 14}[priorite]
            soumis_at = days_ago(soum_days)

            decision_at = expiration_at = qr_code = motif = num_ref = None
            etape = {"soumis": "reception", "en_instruction": "instruction",
                     "en_validation": "validation"}.get(statut, "decision")

            if statut == "approuve":
                decision_at   = days_ago(max(5, soum_days - 30))
                expiration_at = decision_at + timedelta(days=365 * 3)
                num_ref       = NUMEROS_REFERENCE[ref_idx % len(NUMEROS_REFERENCE)]
                ref_idx      += 1
                qr_code = (
                    f"PNPI|ATI-2026-{seq:04d}|{op.nif_gabon}|"
                    f"{op.raison_sociale[:30]}|APPROUVE|"
                    f"{decision_at.strftime('%Y%m%d')}|EXP:{expiration_at.strftime('%Y%m%d')}"
                )
            elif statut == "rejete":
                decision_at = days_ago(max(5, soum_days - 25))
                motif       = MOTIFS_REJET[(seq - 1) % len(MOTIFS_REJET)]

            ati = AgrementTechniqueIndustrielORM(
                id                        = uid("ATI"),
                numero_ati                = f"ATI-2026-{seq:04d}",
                operateur_id              = op.id,
                type_activite             = type_act,
                secteur                   = op.secteur,
                statut                    = statut,
                etape                     = etape,
                priorite                  = priorite,
                instructeur_username      = "instructeur" if statut != "soumis" else None,
                date_soumission           = soumis_at,
                date_decision             = decision_at,
                date_expiration           = expiration_at,
                sla_jours                 = sla,
                qr_code_data              = qr_code,
                motif_rejet               = motif,
                numero_reference_decision = num_ref,
                observations              = None,
                created_by                = "operateur",
                updated_at                = soumis_at,
            )
            db.add(ati)
            atis.append(ati)
        db.flush()
        statut_ctr = Counter(a.statut for a in atis)
        print(f"       OK : {len(atis)} ATIs")
        for st, cnt in sorted(statut_ctr.items()):
            print(f"         {st:20s} : {cnt}")

        # 4. Transitions
        print("  [4/5] Transitions ATI...")
        nb_transitions = 0
        for ati in atis:
            s = ati.date_soumission
            if ati.statut in ("en_instruction", "en_validation", "approuve", "rejete"):
                db.add(ATITransitionORM(id=uid("TR"), ati_id=ati.id, changed_by="instructeur",
                    previous_statut="soumis",        new_statut="en_instruction",
                    previous_etape="reception",       new_etape="instruction",
                    note="Dossier transmis en instruction technique.",
                    changed_at=s + timedelta(days=2)))
                nb_transitions += 1
            if ati.statut in ("en_validation", "approuve", "rejete"):
                db.add(ATITransitionORM(id=uid("TR"), ati_id=ati.id, changed_by="instructeur",
                    previous_statut="en_instruction", new_statut="en_validation",
                    previous_etape="instruction",      new_etape="validation",
                    note="Instruction terminee. Rapport soumis a la Direction.",
                    changed_at=s + timedelta(days=15)))
                nb_transitions += 1
            if ati.statut in ("approuve", "rejete"):
                note = ("Decision : APPROUVE. Agrement accorde, QR code genere." if ati.statut == "approuve"
                        else f"Decision : REJETE. Motif : {(ati.motif_rejet or '')[:80]}")
                db.add(ATITransitionORM(id=uid("TR"), ati_id=ati.id, changed_by="directeur",
                    previous_statut="en_validation",  new_statut=ati.statut,
                    previous_etape="validation",       new_etape="decision",
                    note=note,
                    changed_at=ati.date_decision or now_utc()))
                nb_transitions += 1
        db.flush()
        print(f"       OK : {nb_transitions} transitions")

        # 5. Inspections
        print("  [5/5] Inspections (10)...")
        nb_inspections = 0
        for idata in INSPECTIONS_DATA:
            op      = operateurs[idata["op_idx"]]
            lat_c, lng_c = PROVINCE_COORDS[op.province]
            ati_id  = next((a.id for a in atis if a.operateur_id == op.id and a.statut == "approuve"), None)
            insp_at = days_ago(idata["days_ago"])
            db.add(InspectionConformiteORM(
                id                  = uid("INS"),
                operateur_id        = op.id,
                ati_id              = ati_id,
                inspecteur_username = idata["inspecteur"],
                date_inspection     = insp_at,
                statut_conformite   = idata["statut"],
                observations        = idata["observations"],
                mesures_correctives = idata["mesures"],
                latitude            = round(lat_c + idata["lat_off"], 5),
                longitude           = round(lng_c + idata["lng_off"], 5),
                created_at          = insp_at,
            ))
            nb_inspections += 1
        db.flush()
        insp_ctr = Counter(i["statut"] for i in INSPECTIONS_DATA)
        print(f"       OK : {nb_inspections} inspections")

        # 6. Annonces officielles
        print("  [6/7] Annonces officielles...")
        nb_annonces = 0
        for a in ANNOUNCEMENTS_DATA:
            db.add(AnnouncementORM(
                id           = uid("ANN"),
                title        = a["title"],
                body         = a["body"],
                severity     = a["severity"],
                target_roles = a["target_roles"],
                is_active    = True,
                created_by   = "admin",
                created_at   = days_ago(a["days_ago_created"]),
                expires_at   = days_ago(a["days_ago_expires"]),
            ))
            nb_annonces += 1
        db.flush()
        print(f"       OK : {nb_annonces} annonces")

        # 7. Notifications variees
        print("  [7/7] Notifications (dashboard)...")
        nb_notifs = 0
        for n in NOTIFICATIONS_DATA:
            if not db.query(NotificationORM).filter(NotificationORM.notification_key == n["key"]).first():
                db.add(NotificationORM(
                    id               = uid("N"),
                    target_role      = n["target"],
                    title            = n["title"],
                    message          = n["title"],
                    severity         = n["severity"],
                    notification_key = n["key"],
                    created_at       = days_ago(n["days_ago"]),
                    is_read          = False,
                ))
                nb_notifs += 1
        db.flush()

        # Notification SLA automatique
        hors_sla = [a for a in atis if a.statut not in ("approuve", "rejete", "expire")
                    and (now_utc() - a.date_soumission).days > a.sla_jours]
        if hors_sla:
            notif_key = "pnpi_sla_alert_seed_2026"
            if not db.query(NotificationORM).filter(NotificationORM.notification_key == notif_key).first():
                db.add(NotificationORM(
                    id               = uid("N"),
                    target_role      = "ministre",
                    title            = f"ALERTE SLA : {len(hors_sla)} ATI(s) hors delai",
                    message          = f"{len(hors_sla)} dossier(s) ATI depassent leur delai SLA.",
                    severity         = "high",
                    notification_key = notif_key,
                    created_at       = now_utc(),
                    is_read          = False,
                ))
                nb_notifs += 1
        print(f"       OK : {nb_notifs} notifications")

        db.commit()

        # Resume
        print()
        print("=" * 60)
        print("  PNPI · Seed termine avec succes")
        print("=" * 60)
        print(f"  Operateurs  : {len(operateurs)} | ATIs : {len(atis)} | Transitions : {nb_transitions} | Inspections : {nb_inspections}")
        print()
        print("  Operateurs par province :")
        for p, cnt in sorted(prov_ctr.items()):
            print(f"    {p:25s} : {cnt}")
        print()
        print("  Operateurs par secteur :")
        for s, cnt in sorted(secteur_ctr.items()):
            print(f"    {s:20s} : {cnt}")
        print()
        print("  Comptes utilisateurs :")
        for u in USERS_DATA:
            print(f"    {u['username']:15s} ({u['roles_csv']:12s}) · pwd: {u['password']}")
        print("=" * 60)

    except Exception as exc:
        db.rollback()
        print(f"  ERREUR : {exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
