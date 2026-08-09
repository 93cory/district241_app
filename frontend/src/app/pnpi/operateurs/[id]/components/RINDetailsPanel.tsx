"use client";

import { useRouter } from "next/navigation";
import type {
  RINInvestissement,
  RINProduit,
  RINProfile,
  RINRepresentant,
  RINRessource,
  RINSite,
} from "../../../../../lib/api";
import { RINQuickAddForm } from "./RINQuickAddForm";

type RINItem = RINRepresentant | RINSite | RINProduit | RINRessource | RINInvestissement;
type Kind = "representants" | "sites" | "produits" | "ressources" | "investissements";

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  brouillon: { label: "Brouillon", color: "#526175", bg: "#f8fafc" },
  soumis: { label: "Soumis", color: "#0c7eb4", bg: "#eff6ff" },
  verifie: { label: "Vérifié", color: "#7c3aed", bg: "#f5f3ff" },
  valide: { label: "Validé", color: "#006233", bg: "#ecfdf3" },
  archive: { label: "Archivé", color: "#9ca3af", bg: "#f3f4f6" },
};

const GROUPS: Array<{ kind: Kind; title: string; empty: string }> = [
  { kind: "representants", title: "Représentants", empty: "Aucun représentant renseigné." },
  { kind: "sites", title: "Sites industriels", empty: "Aucun site industriel renseigné." },
  { kind: "produits", title: "Produits & capacités", empty: "Aucun produit renseigné." },
  { kind: "ressources", title: "Ressources / énergie", empty: "Aucune ressource renseignée." },
  { kind: "investissements", title: "Investissements", empty: "Aucun investissement renseigné." },
];

function primaryLabel(kind: Kind, item: RINItem): string {
  if (kind === "representants") return (item as RINRepresentant).nom_complet;
  if (kind === "sites") return (item as RINSite).nom_site;
  if (kind === "produits") return (item as RINProduit).nom_produit;
  if (kind === "ressources") return (item as RINRessource).libelle;
  return (item as RINInvestissement).intitule;
}

function patchField(kind: Kind): string {
  if (kind === "representants") return "nom_complet";
  if (kind === "sites") return "nom_site";
  if (kind === "produits") return "nom_produit";
  if (kind === "ressources") return "libelle";
  return "intitule";
}

function details(kind: Kind, item: RINItem): string {
  if (kind === "representants") {
    const r = item as RINRepresentant;
    return [r.fonction, r.email, r.telephone].filter(Boolean).join(" · ");
  }
  if (kind === "sites") {
    const s = item as RINSite;
    return [s.type_site, s.ville, s.province, s.superficie_ha ? `${s.superficie_ha} ha` : null]
      .filter(Boolean)
      .join(" · ");
  }
  if (kind === "produits") {
    const p = item as RINProduit;
    return [
      p.categorie,
      p.capacite_annuelle ? `capacité ${p.capacite_annuelle.toLocaleString("fr-FR")} ${p.unite}/an` : null,
      p.production_annuelle ? `production ${p.production_annuelle.toLocaleString("fr-FR")} ${p.unite}/an` : null,
      p.certification,
    ]
      .filter(Boolean)
      .join(" · ");
  }
  if (kind === "ressources") {
    const r = item as RINRessource;
    return [
      r.type_ressource.replace(/_/g, " "),
      r.origine,
      r.consommation_annuelle ? `${r.consommation_annuelle.toLocaleString("fr-FR")} ${r.unite ?? ""}/an` : null,
      r.dependance_import ? "dépendance import" : null,
    ]
      .filter(Boolean)
      .join(" · ");
  }
  const i = item as RINInvestissement;
  return [
    i.statut,
    i.annee,
    i.montant_fcfa ? `${i.montant_fcfa.toLocaleString("fr-FR")} FCFA` : null,
    i.emplois_prevus ? `${i.emplois_prevus} emplois prévus` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function itemsFor(profile: RINProfile, kind: Kind): RINItem[] {
  return profile[kind] as RINItem[];
}

export function RINDetailsPanel({
  operateurId,
  profile,
  canEdit,
  canValidate,
}: {
  operateurId: string;
  profile: RINProfile | null;
  canEdit: boolean;
  canValidate: boolean;
}) {
  const router = useRouter();

  const call = async (url: string, init: RequestInit) => {
    const res = await fetch(url, {
      ...init,
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail ?? `Erreur ${res.status}`);
    router.refresh();
  };

  const archiveItem = async (kind: Kind, item: RINItem) => {
    if (!window.confirm(`Archiver "${primaryLabel(kind, item)}" ?`)) return;
    await call(`/api/pnpi/rin/${kind}/${item.id}`, { method: "DELETE" });
  };

  const validateItem = async (kind: Kind, item: RINItem) => {
    await call(`/api/pnpi/rin/${kind}/${item.id}/transition`, {
      method: "POST",
      body: JSON.stringify({ statut_validation: "valide", note: "Validation depuis la fiche opérateur" }),
    });
  };

  const editItem = async (kind: Kind, item: RINItem) => {
    const current = primaryLabel(kind, item);
    const next = window.prompt("Modifier le libellé principal", current);
    if (!next || next.trim() === current) return;
    await call(`/api/pnpi/rin/${kind}/${item.id}`, {
      method: "PATCH",
      body: JSON.stringify({ [patchField(kind)]: next.trim() }),
    });
  };

  return (
    <div className="chart-card" style={{ padding: "1.25rem", marginBottom: "1.25rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "1rem",
          flexWrap: "wrap",
          alignItems: "flex-start",
          marginBottom: "1rem",
        }}
      >
        <div>
          <h3 style={{ margin: 0, color: "#003F8F", fontSize: "1rem" }}>Données détaillées RIN</h3>
          <p style={{ margin: "0.25rem 0 0", color: "#6b7280", fontSize: "0.82rem" }}>
            Consultation, correction, validation métier et archivage des sous-fiches industrielles.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <a href={`/api/pnpi/rin/operateurs/${operateurId}/export.csv`} className="btn-secondary">
            Export CSV
          </a>
          <a href={`/api/pnpi/rin/operateurs/${operateurId}/export.json`} className="btn-secondary">
            Export JSON
          </a>
          <button type="button" className="btn-secondary" onClick={() => window.print()}>
            Imprimer
          </button>
        </div>
      </div>

      {profile ? (
        <>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
            {Object.entries(profile.workflow_counts ?? {}).map(([key, value]) => {
              const meta = STATUS[key] ?? STATUS.brouillon;
              return (
                <span
                  key={key}
                  style={{
                    padding: "0.35rem 0.6rem",
                    borderRadius: 999,
                    background: meta.bg,
                    color: meta.color,
                    fontWeight: 800,
                    fontSize: "0.74rem",
                  }}
                >
                  {meta.label} · {value}
                </span>
              );
            })}
          </div>

          <div style={{ display: "grid", gap: "1rem" }}>
            {GROUPS.map((group) => {
              const items = itemsFor(profile, group.kind);
              return (
                <section key={group.kind} style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: "0.9rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.55rem" }}>
                    <strong style={{ color: "#1f2937" }}>{group.title}</strong>
                    <span style={{ color: "#6b7280", fontSize: "0.78rem" }}>{items.length} élément(s)</span>
                  </div>
                  {items.length === 0 ? (
                    <p style={{ margin: 0, color: "#9ca3af", fontSize: "0.8rem" }}>{group.empty}</p>
                  ) : (
                    <div style={{ display: "grid", gap: "0.5rem" }}>
                      {items.map((item) => {
                        const meta = STATUS[item.statut_validation] ?? STATUS.brouillon;
                        return (
                          <div
                            key={item.id}
                            style={{
                              display: "grid",
                              gridTemplateColumns: "minmax(0,1fr) auto",
                              gap: "0.75rem",
                              alignItems: "center",
                              padding: "0.65rem",
                              borderRadius: 12,
                              background: "#f8fafc",
                            }}
                          >
                            <div>
                              <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap", alignItems: "center" }}>
                                <strong style={{ color: "#003F8F", fontSize: "0.84rem" }}>
                                  {primaryLabel(group.kind, item)}
                                </strong>
                                <span
                                  style={{
                                    padding: "0.12rem 0.45rem",
                                    borderRadius: 999,
                                    background: meta.bg,
                                    color: meta.color,
                                    fontSize: "0.68rem",
                                    fontWeight: 900,
                                  }}
                                >
                                  {meta.label}
                                </span>
                              </div>
                              <div style={{ color: "#526175", fontSize: "0.74rem", marginTop: 3 }}>
                                {details(group.kind, item) || "Détail non renseigné"}
                              </div>
                              {item.validated_by && (
                                <div style={{ color: "#006233", fontSize: "0.7rem", marginTop: 2 }}>
                                  Validé par {item.validated_by}
                                </div>
                              )}
                            </div>
                            {(canEdit || canValidate) && (
                              <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
                                {canEdit && (
                                  <button type="button" className="btn-secondary" onClick={() => editItem(group.kind, item)}>
                                    Modifier
                                  </button>
                                )}
                                {canValidate && item.statut_validation !== "valide" && (
                                  <button type="button" className="btn-secondary" onClick={() => validateItem(group.kind, item)}>
                                    Valider
                                  </button>
                                )}
                                {canEdit && (
                                  <button type="button" className="btn-secondary" onClick={() => archiveItem(group.kind, item)}>
                                    Archiver
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>

          {canEdit && <RINQuickAddForm operateurId={operateurId} />}
        </>
      ) : (
        <p style={{ margin: 0, color: "#6b7280", fontSize: "0.82rem" }}>
          Le profil RIN structuré sera disponible après application de la migration backend.
        </p>
      )}
    </div>
  );
}
