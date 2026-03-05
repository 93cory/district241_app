"use client";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

const SECTEURS = ["bois", "mines", "agroalimentaire", "btp", "petrole", "services"];
const PROVINCES = ["estuaire", "haut_ogooue", "ogooue_maritime", "woleu_ntem", "moyen_ogooue", "ngounie", "nyanga", "ogooue_ivindo", "ogooue_lolo"];
const SECTEUR_LABELS: Record<string, string> = { bois: "Bois & Forêt", mines: "Mines", agroalimentaire: "Agro-alimentaire", btp: "BTP", petrole: "Pétrole", services: "Services" };
const PROVINCE_LABELS: Record<string, string> = { estuaire: "Estuaire", haut_ogooue: "Haut-Ogooué", ogooue_maritime: "Ogooué-Maritime", woleu_ntem: "Woleu-Ntem", moyen_ogooue: "Moyen-Ogooué", ngounie: "Ngounié", nyanga: "Nyanga", ogooue_ivindo: "Ogooué-Ivindo", ogooue_lolo: "Ogooué-Lolo" };

const inputStyle: React.CSSProperties = {
  width: "100%", border: "1px solid #d1d5db", borderRadius: "6px",
  padding: "0.5rem 0.75rem", fontSize: "0.875rem", boxSizing: "border-box",
  background: "#fafafa", outline: "none",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem",
};
const selectStyle: React.CSSProperties = { ...inputStyle, background: "white" };

export function OperateurCreateForm({ onCreated }: { onCreated?: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  const [nif, setNif] = useState("");
  const [raison, setRaison] = useState("");
  const [secteur, setSecteur] = useState("");
  const [province, setProvince] = useState("");
  const [ville, setVille] = useState("");
  const [effectif, setEffectif] = useState("");
  const [email, setEmail] = useState("");
  const [tel, setTel] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");

  const reset = () => {
    setNif(""); setRaison(""); setSecteur(""); setProvince(""); setVille("");
    setEffectif(""); setEmail(""); setTel(""); setLat(""); setLng("");
    setError(null); setSuccess(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null); setSuccess(null);
    try {
      const res = await fetch(`${BACKEND}/pnpi/operateurs`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nif_gabon: nif, raison_sociale: raison, secteur, province, ville,
          effectif_declare: effectif ? parseInt(effectif) : null,
          contact_email: email || null, contact_telephone: tel || null,
          latitude: lat ? parseFloat(lat) : null, longitude: lng ? parseFloat(lng) : null,
          is_active: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail ?? `Erreur ${res.status}`); return; }
      setSuccess(`Opérateur "${raison}" enregistré (${data.id}).`);
      reset();
      onCreated?.();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau");
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{ padding: "0.4rem 0.875rem", background: "#009440", color: "white", border: "none", borderRadius: "6px", fontWeight: 600, fontSize: "0.82rem", cursor: "pointer" }}
      >
        + Nouvel opérateur
      </button>
    );
  }

  return (
    <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "1.25rem", marginBottom: "1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h3 style={{ margin: 0, color: "#009440", fontSize: "1rem" }}>Enregistrer un opérateur industriel</h3>
        <button onClick={() => { setOpen(false); reset(); }} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: "1.1rem" }}>✕</button>
      </div>

      {error && <div style={{ padding: "0.625rem", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "6px", color: "#b42318", fontSize: "0.82rem", marginBottom: "1rem" }}>{error}</div>}
      {success && <div style={{ padding: "0.625rem", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "6px", color: "#166534", fontSize: "0.82rem", marginBottom: "1rem" }}>{success}</div>}

      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
          <div>
            <label style={labelStyle}>NIF Gabon *</label>
            <input value={nif} onChange={e => setNif(e.target.value)} required placeholder="ex: TF-2024-01234" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Raison sociale *</label>
            <input value={raison} onChange={e => setRaison(e.target.value)} required placeholder="Nom de l'entreprise" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Secteur *</label>
            <select value={secteur} onChange={e => setSecteur(e.target.value)} required style={selectStyle}>
              <option value="">— Choisir —</option>
              {SECTEURS.map(s => <option key={s} value={s}>{SECTEUR_LABELS[s]}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Province *</label>
            <select value={province} onChange={e => setProvince(e.target.value)} required style={selectStyle}>
              <option value="">— Choisir —</option>
              {PROVINCES.map(p => <option key={p} value={p}>{PROVINCE_LABELS[p]}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Ville *</label>
            <input value={ville} onChange={e => setVille(e.target.value)} required placeholder="ex: Libreville" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Effectif déclaré</label>
            <input value={effectif} onChange={e => setEffectif(e.target.value)} type="number" min="0" placeholder="Nombre d'employés" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Email de contact</label>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="contact@entreprise.ga" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Téléphone</label>
            <input value={tel} onChange={e => setTel(e.target.value)} placeholder="+241 01 XX XX XX" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Latitude GPS</label>
            <input value={lat} onChange={e => setLat(e.target.value)} type="number" step="0.00001" placeholder="ex: -0.72345" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Longitude GPS</label>
            <input value={lng} onChange={e => setLng(e.target.value)} type="number" step="0.00001" placeholder="ex: 9.45678" style={inputStyle} />
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button type="submit" disabled={busy} style={{ flex: 1, padding: "0.6rem", background: busy ? "#9ca3af" : "#009440", color: "white", border: "none", borderRadius: "6px", fontWeight: 700, fontSize: "0.875rem", cursor: busy ? "not-allowed" : "pointer" }}>
            {busy ? "Enregistrement..." : "Enregistrer l'opérateur"}
          </button>
          <button type="button" onClick={() => { setOpen(false); reset(); }} style={{ padding: "0.6rem 1rem", background: "#f9fafb", border: "1px solid #e5e7eb", color: "#374151", borderRadius: "6px", fontWeight: 600, fontSize: "0.875rem", cursor: "pointer" }}>
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
}
