"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";

const STATUTS = ["", "soumis", "en_instruction", "en_validation", "approuve", "rejete", "expire"];
const STATUT_LABELS: Record<string, string> = { "": "Tous les statuts", soumis: "Soumis", en_instruction: "En instruction", en_validation: "En validation", approuve: "Approuve", rejete: "Rejete", expire: "Expire" };
const SECTEURS = ["", "bois", "mines", "agroalimentaire", "btp", "petrole", "services"];
const SECTEUR_LABELS: Record<string, string> = { "": "Tous secteurs", bois: "Bois & Foret", mines: "Mines", agroalimentaire: "Agro-alimentaire", btp: "BTP", petrole: "Petrole", services: "Services" };
const PROVINCES = ["", "estuaire", "haut_ogooue", "ogooue_maritime", "ngounie", "nyanga", "moyen_ogooue", "ogooue_lolo", "ogooue_ivindo", "woleu_ntem"];

const selectStyle = { padding: "0.4rem 0.6rem", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "0.8rem", background: "#fff", cursor: "pointer", minWidth: "130px" };

export function ATIFiltersClient({ statut, secteur, province }: { statut: string; secteur: string; province: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const updateFilter = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value); else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }, [pathname, router, searchParams]);

  return (
    <div style={{ display: "flex", gap: "0.625rem", flexWrap: "wrap", alignItems: "center" }}>
      <select value={statut} onChange={(e) => updateFilter("statut", e.target.value)} style={selectStyle}>
        {STATUTS.map((s) => <option key={s} value={s}>{STATUT_LABELS[s] ?? s}</option>)}
      </select>
      <select value={secteur} onChange={(e) => updateFilter("secteur", e.target.value)} style={selectStyle}>
        {SECTEURS.map((s) => <option key={s} value={s}>{SECTEUR_LABELS[s] ?? s}</option>)}
      </select>
      <select value={province} onChange={(e) => updateFilter("province", e.target.value)} style={selectStyle}>
        <option value="">Toutes provinces</option>
        {PROVINCES.slice(1).map((p) => <option key={p} value={p}>{p.replace(/_/g, " ")}</option>)}
      </select>
    </div>
  );
}
