"use client";
import { useState } from "react";

interface Listing {
  id: string;
  type: "offre" | "demande";
  operateur: string;
  secteur: string;
  province: string;
  titre: string;
  description: string;
  quantite: string;
  prix: string;
  contact: string;
  date: string;
}

const LISTINGS: Listing[] = [
  {
    id: "l1",
    type: "offre",
    operateur: "SNBG Transformation",
    secteur: "bois",
    province: "Estuaire",
    titre: "Planches de bois exotique (okoume, ozigo)",
    description:
      "Planches sechees au four, dimensions standard et sur mesure. Certification FSC disponible. Capacite 500m3/mois.",
    quantite: "500 m\u00b3/mois",
    prix: "Sur devis",
    contact: "commercial@snbg.ga",
    date: "2026-03-15",
  },
  {
    id: "l2",
    type: "offre",
    operateur: "Cimgabon",
    secteur: "btp",
    province: "Estuaire",
    titre: "Ciment CEM II/B-L 42.5",
    description:
      "Ciment conforme norme CEMAC NF. Livraison en sacs de 50kg ou en vrac. Disponible en quantite industrielle.",
    quantite: "10 000 t/mois",
    prix: "65 000 FCFA/tonne",
    contact: "ventes@cimgabon.ga",
    date: "2026-03-10",
  },
  {
    id: "l3",
    type: "demande",
    operateur: "Gabon Meubles SARL",
    secteur: "bois",
    province: "Ogooue-Maritime",
    titre: "Recherche contreplaque 18mm",
    description:
      "Besoin mensuel de 200 feuilles de contreplaque 18mm pour fabrication de meubles. Qualite export requise.",
    quantite: "200 feuilles/mois",
    prix: "Budget: 5M FCFA/mois",
    contact: "achat@gabonmeubles.ga",
    date: "2026-03-12",
  },
  {
    id: "l4",
    type: "offre",
    operateur: "Olam Palm Gabon",
    secteur: "agroalimentaire",
    province: "Moyen-Ogooue",
    titre: "Huile de palme brute et raffinee",
    description:
      "Huile de palme certifiee RSPO. Disponible en futs de 200L ou en citerne. Prix competitifs pour gros volumes.",
    quantite: "1 000 t/mois",
    prix: "450 000 FCFA/tonne",
    contact: "export@olam-gabon.ga",
    date: "2026-03-18",
  },
  {
    id: "l5",
    type: "demande",
    operateur: "Complexe Industriel de Nkok",
    secteur: "chimie",
    province: "Estuaire",
    titre: "Recherche fournisseur de soude caustique",
    description:
      "Besoin regulier de soude caustique pour process industriel. Qualite technique NaOH 48-50%.",
    quantite: "50 t/trimestre",
    prix: "Budget: 15M FCFA/trimestre",
    contact: "appro@nkok.ga",
    date: "2026-03-20",
  },
  {
    id: "l6",
    type: "offre",
    operateur: "Gabon Mining Services",
    secteur: "mines",
    province: "Haut-Ogooue",
    titre: "Manganese enrichi (44% Mn)",
    description:
      "Minerai de manganese enrichi a 44% minimum. FOB Port-Gentil. Certificat d'origine Gabon.",
    quantite: "50 000 t/an",
    prix: "Sur contrat",
    contact: "trade@gms-gabon.ga",
    date: "2026-03-08",
  },
];

export default function MarketplacePage() {
  const [filter, setFilter] = useState<"all" | "offre" | "demande">("all");
  const [secteur, setSecteur] = useState("");

  const filtered = LISTINGS.filter((l) => {
    if (filter !== "all" && l.type !== filter) return false;
    if (secteur && l.secteur !== secteur) return false;
    return true;
  });

  const sectors = [...new Set(LISTINGS.map((l) => l.secteur))].sort();

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1000, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>
        Place de marche industrielle
      </h1>
      <p style={{ color: "var(--text-soft)", fontSize: 13, margin: "0 0 16px" }}>
        Mettez en relation offres et demandes entre operateurs industriels gabonais.
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {(["all", "offre", "demande"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              background: filter === f ? "#006233" : "var(--bg-base)",
              color: filter === f ? "#fff" : "var(--text-soft)",
            }}
          >
            {f === "all" ? "Tous" : f === "offre" ? "Offres" : "Demandes"}
          </button>
        ))}
        <span style={{ color: "var(--line)", margin: "0 4px" }}>|</span>
        <button
          onClick={() => setSecteur("")}
          style={{
            padding: "5px 10px",
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 600,
            border: "none",
            cursor: "pointer",
            background: !secteur ? "#0c7eb4" : "var(--bg-base)",
            color: !secteur ? "#fff" : "var(--text-soft)",
          }}
        >
          Tous secteurs
        </button>
        {sectors.map((s) => (
          <button
            key={s}
            onClick={() => setSecteur(s)}
            style={{
              padding: "5px 10px",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              background: secteur === s ? "#0c7eb4" : "var(--bg-base)",
              color: secteur === s ? "#fff" : "var(--text-soft)",
              textTransform: "capitalize",
            }}
          >
            {s}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filtered.map((l) => (
          <div
            key={l.id}
            className="chart-card"
            style={{
              padding: "18px 22px",
              borderLeft: `5px solid ${l.type === "offre" ? "#006233" : "#0c7eb4"}`,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 8,
              }}
            >
              <div>
                <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                  <span
                    style={{
                      padding: "2px 10px",
                      borderRadius: 6,
                      fontSize: 10,
                      fontWeight: 700,
                      background: l.type === "offre" ? "#dcfce7" : "#e0f2fe",
                      color: l.type === "offre" ? "#006233" : "#0c7eb4",
                    }}
                  >
                    {l.type === "offre" ? "OFFRE" : "DEMANDE"}
                  </span>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: 6,
                      fontSize: 10,
                      fontWeight: 600,
                      background: "var(--bg-base)",
                      textTransform: "capitalize",
                    }}
                  >
                    {l.secteur}
                  </span>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: 6,
                      fontSize: 10,
                      fontWeight: 600,
                      background: "var(--bg-base)",
                    }}
                  >
                    {l.province}
                  </span>
                </div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{l.titre}</div>
                <div style={{ fontSize: 12, color: "#006233", fontWeight: 600 }}>{l.operateur}</div>
              </div>
            </div>
            <p
              style={{
                fontSize: 13,
                lineHeight: 1.5,
                color: "var(--text-main)",
                margin: "6px 0 10px",
              }}
            >
              {l.description}
            </p>
            <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
              <span>
                <strong>Quantite :</strong> {l.quantite}
              </span>
              <span>
                <strong>Prix :</strong> {l.prix}
              </span>
              <span>
                <strong>Contact :</strong>{" "}
                <a href={`mailto:${l.contact}`} style={{ color: "#006233" }}>
                  {l.contact}
                </a>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
