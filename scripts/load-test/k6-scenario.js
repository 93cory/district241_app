// PNPI · Scenario de test de charge k6 (dette D-004).
//
// Contexte : aucun test de charge n'avait ete execute. Les hypotheses de
// capacite du cahier des charges (1000 utilisateurs concurrents, 100 ATI/jour)
// n'etaient pas validees.
//
// IMPORTANT — portee de ce scenario :
// Execute contre l'environnement de DEV local (1 instance, machine de
// developpement), PAS un environnement iso-prod. Les chiffres absolus
// (latence, throughput max) ne sont donc PAS directement transposables a la
// capacite reelle de production — seule une execution contre un
// environnement iso-prod (meme dimensionnement CPU/RAM/DB que la prod)
// validerait vraiment l'hypothese "1000 utilisateurs concurrents". Ce script
// sert a :
//   1. Etablir un outillage reexecutable (avant chaque mise en prod, apres
//      chaque changement de schema perf-sensible).
//   2. Detecter des regressions grossieres (endpoint qui degenere en O(n^2),
//      absence d'index, etc.) des maintenant, sur donnees realistes.
//   3. Fournir une methode a rejouer sur un vrai environnement iso-prod le
//      jour ou il existe (cf blocage documente dans dette-technique.md D-004).
//
// Usage :
//   docker run --rm -i --network pnpi_default \
//     -e BASE_URL=http://pnpi-backend:8000 \
//     grafana/k6 run - < scripts/load-test/k6-scenario.js
//
// Scenarios inclus :
//   - read_heavy  : parcours de lecture typique d'un agent ministere
//     (dashboard, liste ATI, liste operateurs, recherche).
//   - write_light : creation d'un operateur + d'un ATI (parcours instructeur).

import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Trend } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:8000";

const authFailures = new Counter("auth_failures");
const readLatency = new Trend("read_endpoint_duration", true);
const writeLatency = new Trend("write_endpoint_duration", true);

// Comptes de dev (cf CLAUDE.md / seed_pnpi.py). A adapter si les mots de
// passe sont surcharges via PNPI_*_PASSWORD.
const CREDENTIALS = {
  ministre: __ENV.PNPI_MINISTRE_PASSWORD || "ministre-dev-password",
  instructeur: __ENV.PNPI_INSTRUCTEUR_PASSWORD || "instructeur-dev-password",
};

// IMPORTANT — toutes les VUs k6 partagent la meme IP source (le conteneur
// k6). Le rate limiter applicatif (core/rate_limiter.py, cf
// main.py:enforce_rate_limit) est keye par **chemin exact + IP**
// (`path:{path}:{client_ip}`) : chaque route /pnpi/* a son propre budget
// de PNPI_SENSITIVE_RATE_LIMIT_MAX_REQUESTS (60 par defaut) requetes par
// PNPI_RATE_LIMIT_WINDOW_SECONDS (60s par defaut) — PAS un budget global
// partage entre routes. Depuis une seule IP, ca plafonne le trafic soutenu
// vers UNE route donnee a ~1 req/s tous VUs confondus. Depasser ce seuil
// declenche des 429 en masse : pas une lenteur du backend, une protection
// anti-abus qui fonctionne comme prevu — mais qui revele un vrai risque
// architectural (cf note en bas de fichier) si de nombreux utilisateurs
// legitimes partagent une IP de sortie (NAT ministeriel).
//
// Les niveaux de charge ci-dessous sont volontairement bas (quelques VUs,
// pauses longues) pour rester sous ce seuil per-route et mesurer la
// latence reelle des endpoints sans faux positifs 429. Valider
// l'hypothese "1000 utilisateurs concurrents" du cahier des charges
// necessite soit de tester depuis plusieurs IP sources (repartition
// realiste d'utilisateurs geographiquement distribues), soit d'executer
// ce script avec PNPI_SENSITIVE_RATE_LIMIT_MAX_REQUESTS releve pour la
// duree du test uniquement.
export const options = {
  scenarios: {
    read_heavy: {
      executor: "ramping-vus",
      exec: "readHeavy",
      startVUs: 0,
      stages: [
        { duration: "20s", target: 3 },
        { duration: "30s", target: 3 },
        { duration: "10s", target: 0 },
      ],
    },
    write_light: {
      executor: "ramping-vus",
      exec: "writeLight",
      startVUs: 0,
      stages: [
        { duration: "20s", target: 1 },
        { duration: "30s", target: 1 },
        { duration: "10s", target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.02"], // < 2% d'erreurs toutes routes confondues
    read_endpoint_duration: ["p(95)<800"], // lecture : p95 sous 800ms
    write_endpoint_duration: ["p(95)<1500"], // ecriture : p95 sous 1.5s
    auth_failures: ["count<1"],
  },
};

function login(username, password) {
  // Corps construit explicitement en application/x-www-form-urlencoded :
  // passer un objet JS a http.post() avec un header Content-Type deja
  // fixe desactive la serialisation forms automatique de k6 (le corps part
  // alors en JSON malgre le header), d'ou un 401 systematique cote FastAPI
  // (qui attend un corps forms sur /auth/token).
  const body = `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
  const res = http.post(`${BASE_URL}/auth/token`, body, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  if (res.status !== 200) {
    authFailures.add(1);
    return null;
  }
  return res.json("access_token");
}

// setup() s'execute UNE FOIS avant le test (hors des VUs), son retour est
// passe a chaque iteration de chaque VU. Un seul login par role, reutilise
// par tous les VUs : c'est le premier resultat concret de ce script — le
// scenario naif (un login par VU par iteration) se prenait lui-meme pour
// une attaque brute-force et declenchait le rate limiter de /auth/token
// (429 systematique). Un token partage est aussi plus realiste : un agent
// reste connecte des heures, il ne se reconnecte pas a chaque clic.
export function setup() {
  const ministreToken = login("ministre", CREDENTIALS.ministre);
  const instructeurToken = login("instructeur", CREDENTIALS.instructeur);
  if (!ministreToken || !instructeurToken) {
    throw new Error("Authentification setup() echouee — verifier les identifiants (PNPI_*_PASSWORD).");
  }
  return { ministreToken, instructeurToken };
}

export function readHeavy(data) {
  const token = data.ministreToken;
  const headers = { Authorization: `Bearer ${token}` };

  const endpoints = [
    "/dashboard/indicators",
    "/pnpi/ati?limit=20",
    "/pnpi/operateurs?limit=20",
    "/pnpi/dashboard/kpis",
  ];

  for (const ep of endpoints) {
    const res = http.get(`${BASE_URL}${ep}`, { headers });
    readLatency.add(res.timings.duration);
    check(res, { [`${ep} -> 2xx`]: (r) => r.status >= 200 && r.status < 300 });
    sleep(1);
  }

  const searchRes = http.get(`${BASE_URL}/search/global?q=bois`, { headers });
  readLatency.add(searchRes.timings.duration);
  check(searchRes, { "search -> 2xx": (r) => r.status >= 200 && r.status < 300 });

  // Pause longue : avec 3 VUs partageant une IP, chaque route /pnpi/* a un
  // budget de ~1 req/s tous VUs confondus (cf note plus haut) — un cycle
  // trop rapide declenche des 429 qui ne refletent aucune lenteur reelle.
  sleep(5);
}

export function writeLight(data) {
  const token = data.instructeurToken;
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const nif = `K6-LOAD-${__VU}-${__ITER}-${Date.now()}`;
  const opPayload = JSON.stringify({
    nif_gabon: nif,
    raison_sociale: `Charge Test SARL ${__VU}-${__ITER}`,
    secteur: "bois",
    province: "estuaire",
    ville: "Libreville",
  });
  const opRes = http.post(`${BASE_URL}/pnpi/operateurs`, opPayload, { headers });
  writeLatency.add(opRes.timings.duration);
  const opOk = check(opRes, { "create operateur -> 201": (r) => r.status === 201 });

  if (opOk) {
    const opId = opRes.json("id");
    const atiPayload = JSON.stringify({
      operateur_id: opId,
      type_activite: "Scierie (test charge)",
      secteur: "bois",
      province: "estuaire",
    });
    const atiRes = http.post(`${BASE_URL}/pnpi/ati`, atiPayload, { headers });
    writeLatency.add(atiRes.timings.duration);
    check(atiRes, { "create ati -> 2xx": (r) => r.status >= 200 && r.status < 300 });
  }

  sleep(5);
}
