"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";

const STATUTS = ["", "soumis", "en_instruction", "en_validation", "approuve", "rejete", "expire"];
const STATUT_LABELS: Record<string, string> = { "": "Tous les statuts", soumis: "Soumis", en_instruction: "En instruction", en_validation: "En validation", approuve: "Approuve", rejete: "Rejete", expire: "Expire" };
const SECTEURS = ["", "bois", "mines", "agroalimentaire", "btp", "petrole", "services"];
const SECTEUR_LABELS: Record<string, string> = { "": "Tous secteurs", bois: "Bois & Foret", mines: "Mines", agroalimentaire: "Agro-alimentaire", btp: "BTP", petrole: "Petrole", services: "Services" };
const PROVINCES = ["", "estuaire", "haut_ogooue", "ogooue_maritime", "ngounie", "nyanga", "moyen_ogooue", "ogooue_lolo", "ogooue_ivindo", "woleu_ntem"];
const PRIORITES = ["", "normale", "elevee", "urgente"];
const PRIORITE_LABELS: Record<string, string> = { "": "Toutes priorites", normale: "Normale", elevee: "Elevee", urgente: "Urgente" };

const selectStyle: React.CSSProperties = { padding: "0.4rem 0.6rem", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "0.8rem", background: "#fff", cursor: "pointer", minWidth: "130px" };
const dateInputStyle: React.CSSProperties = { padding: "0.4rem 0.6rem", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "0.8rem", background: "#fff", cursor: "pointer", minWidth: "120px" };

interface ATIFiltersClientProps {
  statut: string;
  secteur: string;
  province: string;
  priorite?: string;
  date_from?: string;
  date_to?: string;
}

export function ATIFiltersClient({ statut, secteur, province, priorite = "", date_from = "", date_to = "" }: ATIFiltersClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const updateFilter = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value); else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }, [pathname, router, searchParams]);

  const hasFilters = statut || secteur || province || priorite || date_from || date_to;

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
        {PROVINCES.slice(1).map((p) => <option key={p} value={p}>{p.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</option>)}
      </select>
      <select value={priorite} onChange={(e) => updateFilter("priorite", e.target.value)} style={selectStyle}>
        {PRIORITES.map((p) => <option key={p} value={p}>{PRIORITE_LABELS[p] ?? p}</option>)}
      </select>
      <div style={{ display: "flex", gap: "0.375rem", alignItems: "center" }}>
        <label style={{ fontSize: "0.75rem", color: "#6b7280", whiteSpace: "nowrap" }}>Du</label>
        <input
          type="date"
          value={date_from}
          onChange={(e) => updateFilter("date_from", e.target.value)}
          style={dateInputStyle}
        />
      </div>
      <div style={{ display: "flex", gap: "0.375rem", alignItems: "center" }}>
        <label style={{ fontSize: "0.75rem", color: "#6b7280", whiteSpace: "nowrap" }}>Au</label>
        <input
          type="date"
          value={date_to}
          onChange={(e) => updateFilter("date_to", e.target.value)}
          style={dateInputStyle}
        />
      </div>
      {hasFilters && (
        <button
          onClick={() => router.push(pathname)}
          style={{ padding: "0.4rem 0.7rem", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "0.78rem", background: "#fef2f2", color: "#b42318", cursor: "pointer", fontWeight: 600 }}
        >
          Reinitialiser
        </button>
      )}
    </div>
  );
}
