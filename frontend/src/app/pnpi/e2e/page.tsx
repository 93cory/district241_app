"use client";

import { useState } from "react";

const now = new Date().toISOString();

interface ATIMock {
  id: string;
  numero_ati: string;
  operateur: string;
  secteur: string;
  statut: string;
  priorite: string;
  etape: string;
  age_jours: number;
  is_overdue: boolean;
}

interface OperateurMock {
  id: string;
  nif_gabon: string;
  raison_sociale: string;
  secteur: string;
  province: string;
  ville: string;
  is_active: boolean;
}

interface InspectionMock {
  id: string;
  operateur_nom: string;
  inspecteur: string;
  statut_conformite: string;
  date_inspection: string;
  observations: string;
}

const atis: ATIMock[] = [
  { id: "ATI-E2E-001", numero_ati: "ATI-2026-0001", operateur: "Bois Gabon SARL", secteur: "bois", statut: "soumis", priorite: "normale", etape: "reception", age_jours: 5, is_overdue: false },
  { id: "ATI-E2E-002", numero_ati: "ATI-2026-0002", operateur: "Mines du Haut-Ogooue", secteur: "mines", statut: "en_instruction", priorite: "elevee", etape: "instruction", age_jours: 18, is_overdue: false },
  { id: "ATI-E2E-003", numero_ati: "ATI-2026-0003", operateur: "Agro Ngounie SA", secteur: "agroalimentaire", statut: "approuve", priorite: "normale", etape: "decision", age_jours: 45, is_overdue: false },
  { id: "ATI-E2E-004", numero_ati: "ATI-2026-0004", operateur: "Peche Maritime", secteur: "agroalimentaire", statut: "rejete", priorite: "urgente", etape: "decision", age_jours: 60, is_overdue: true },
];

const operateurs: OperateurMock[] = [
  { id: "OP-E2E-001", nif_gabon: "NIF-001", raison_sociale: "Bois Gabon SARL", secteur: "bois", province: "estuaire", ville: "Libreville", is_active: true },
  { id: "OP-E2E-002", nif_gabon: "NIF-002", raison_sociale: "Mines du Haut-Ogooue", secteur: "mines", province: "haut_ogooue", ville: "Franceville", is_active: true },
  { id: "OP-E2E-003", nif_gabon: "NIF-003", raison_sociale: "Agro Ngounie SA", secteur: "agroalimentaire", province: "ngounie", ville: "Mouila", is_active: false },
];

const inspections: InspectionMock[] = [
  { id: "INS-E2E-001", operateur_nom: "Bois Gabon SARL", inspecteur: "inspecteur", statut_conformite: "conforme", date_inspection: "2026-03-01", observations: "RAS" },
  { id: "INS-E2E-002", operateur_nom: "Mines du Haut-Ogooue", inspecteur: "inspecteur", statut_conformite: "non_conforme", date_inspection: "2026-03-02", observations: "Depassement rejets" },
];

const STATUT_COLORS: Record<string, string> = { soumis: "#f59e0b", en_instruction: "#3b82f6", en_validation: "#8b5cf6", approuve: "#10b981", rejete: "#ef4444", expire: "#9ca3af" };
const CONF_COLORS: Record<string, string> = { conforme: "#10b981", non_conforme: "#ef4444", partiel: "#f59e0b" };

export default function PNPIE2EPage() {
  const [statutFilter, setStatutFilter] = useState("");
  const [secteurFilter, setSecteurFilter] = useState("");
  const [searchText, setSearchText] = useState("");

  const filteredATIs = atis.filter((a) => {
    if (statutFilter && a.statut !== statutFilter) return false;
    if (secteurFilter && a.secteur !== secteurFilter) return false;
    if (searchText && !a.operateur.toLowerCase().includes(searchText.toLowerCase()) && !a.numero_ati.toLowerCase().includes(searchText.toLowerCase())) return false;
    return true;
  });

  const filteredOps = operateurs.filter((o) => {
    if (secteurFilter && o.secteur !== secteurFilter) return false;
    if (searchText && !o.raison_sociale.toLowerCase().includes(searchText.toLowerCase())) return false;
    return true;
  });

  return (
    <section style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>PNPI E2E Demo</h1>
      <p>Page de test Playwright pour les flux PNPI (ATI, operateurs, inspections).</p>

      {/* Filters */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        <input placeholder="Recherche" value={searchText} onChange={(e) => setSearchText(e.target.value)} data-testid="search-input" />
        <select value={statutFilter} onChange={(e) => setStatutFilter(e.target.value)} data-testid="statut-filter">
          <option value="">Tous statuts</option>
          <option value="soumis">Soumis</option>
          <option value="en_instruction">En instruction</option>
          <option value="en_validation">En validation</option>
          <option value="approuve">Approuve</option>
          <option value="rejete">Rejete</option>
        </select>
        <select value={secteurFilter} onChange={(e) => setSecteurFilter(e.target.value)} data-testid="secteur-filter">
          <option value="">Tous secteurs</option>
          <option value="bois">Bois</option>
          <option value="mines">Mines</option>
          <option value="agroalimentaire">Agroalimentaire</option>
        </select>
      </div>

      {/* ATI Table */}
      <h2>Dossiers ATI ({filteredATIs.length})</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#f3f4f6" }}>
            <th style={{ padding: "8px", textAlign: "left" }}>N° ATI</th>
            <th style={{ padding: "8px", textAlign: "left" }}>Operateur</th>
            <th style={{ padding: "8px", textAlign: "left" }}>Secteur</th>
            <th style={{ padding: "8px", textAlign: "left" }}>Statut</th>
            <th style={{ padding: "8px", textAlign: "left" }}>Priorite</th>
            <th style={{ padding: "8px", textAlign: "right" }}>Age (j)</th>
          </tr>
        </thead>
        <tbody>
          {filteredATIs.map((a) => (
            <tr key={a.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
              <td style={{ padding: "8px" }}>{a.numero_ati}</td>
              <td style={{ padding: "8px" }}>{a.operateur}</td>
              <td style={{ padding: "8px" }}>{a.secteur}</td>
              <td style={{ padding: "8px" }}><span style={{ color: STATUT_COLORS[a.statut] || "#6b7280", fontWeight: 600 }}>{a.statut}</span></td>
              <td style={{ padding: "8px" }}>{a.priorite}</td>
              <td style={{ padding: "8px", textAlign: "right" }}>{a.age_jours}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Operateurs Table */}
      <h2 style={{ marginTop: "2rem" }}>Operateurs ({filteredOps.length})</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#f3f4f6" }}>
            <th style={{ padding: "8px", textAlign: "left" }}>NIF</th>
            <th style={{ padding: "8px", textAlign: "left" }}>Raison sociale</th>
            <th style={{ padding: "8px", textAlign: "left" }}>Secteur</th>
            <th style={{ padding: "8px", textAlign: "left" }}>Province</th>
            <th style={{ padding: "8px", textAlign: "left" }}>Statut</th>
          </tr>
        </thead>
        <tbody>
          {filteredOps.map((o) => (
            <tr key={o.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
              <td style={{ padding: "8px" }}>{o.nif_gabon}</td>
              <td style={{ padding: "8px" }}>{o.raison_sociale}</td>
              <td style={{ padding: "8px" }}>{o.secteur}</td>
              <td style={{ padding: "8px" }}>{o.province}</td>
              <td style={{ padding: "8px" }}>{o.is_active ? "Actif" : "Inactif"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Inspections Table */}
      <h2 style={{ marginTop: "2rem" }}>Inspections ({inspections.length})</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#f3f4f6" }}>
            <th style={{ padding: "8px", textAlign: "left" }}>ID</th>
            <th style={{ padding: "8px", textAlign: "left" }}>Operateur</th>
            <th style={{ padding: "8px", textAlign: "left" }}>Inspecteur</th>
            <th style={{ padding: "8px", textAlign: "left" }}>Conformite</th>
            <th style={{ padding: "8px", textAlign: "left" }}>Date</th>
          </tr>
        </thead>
        <tbody>
          {inspections.map((i) => (
            <tr key={i.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
              <td style={{ padding: "8px" }}>{i.id}</td>
              <td style={{ padding: "8px" }}>{i.operateur_nom}</td>
              <td style={{ padding: "8px" }}>{i.inspecteur}</td>
              <td style={{ padding: "8px" }}><span style={{ color: CONF_COLORS[i.statut_conformite] || "#6b7280", fontWeight: 600 }}>{i.statut_conformite}</span></td>
              <td style={{ padding: "8px" }}>{i.date_inspection}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pipeline summary */}
      <h2 style={{ marginTop: "2rem" }}>Pipeline ATI</h2>
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }} data-testid="pipeline-summary">
        {Object.entries(
          atis.reduce<Record<string, number>>((acc, a) => { acc[a.statut] = (acc[a.statut] || 0) + 1; return acc; }, {})
        ).map(([statut, count]) => (
          <div key={statut} style={{ padding: "1rem", background: "#f9fafb", borderRadius: "8px", minWidth: "120px", textAlign: "center" }}>
            <div style={{ color: STATUT_COLORS[statut], fontWeight: 700, fontSize: "1.5rem" }}>{count}</div>
            <div style={{ fontSize: "0.85rem", color: "#6b7280" }}>{statut}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
