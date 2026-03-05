"use client";
import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";
const CONF_OPTIONS = [
  { value: "conforme", label: "Conforme", color: "#10b981" },
  { value: "non_conforme", label: "Non conforme", color: "#ef4444" },
  { value: "partiel", label: "Partiel", color: "#f59e0b" },
];

interface InspectionData {
  id: string;
  operateur_id: string;
  ati_id: string | null;
  date_inspection: string;
  statut_conformite: string;
  observations: string;
  mesures_correctives: string | null;
  latitude: number | null;
  longitude: number | null;
}

const inputStyle: React.CSSProperties = {
  width: "100%", border: "1px solid #d1d5db", borderRadius: "6px",
  padding: "0.5rem 0.75rem", fontSize: "0.875rem", boxSizing: "border-box",
  background: "#fafafa", outline: "none",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem",
};

export default function ModifierInspectionPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [data, setData] = useState<InspectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);

  // Form state
  const [statut, setStatut] = useState("");
  const [observations, setObservations] = useState("");
  const [mesures, setMesures] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");

  useEffect(() => {
    fetch(`${BACKEND}/pnpi/inspections/${params.id}`, { credentials: "include" })
      .then(r => {
        if (!r.ok) throw new Error(`Erreur ${r.status}`);
        return r.json();
      })
      .then((d: InspectionData) => {
        setData(d);
        setStatut(d.statut_conformite);
        setObservations(d.observations);
        setMesures(d.mesures_correctives ?? "");
        setLat(d.latitude != null ? String(d.latitude) : "");
        setLng(d.longitude != null ? String(d.longitude) : "");
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [params.id]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!data) return;
    setBusy(true); setError(null);
    try {
      const res = await fetch(`${BACKEND}/pnpi/inspections/${params.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operateur_id: data.operateur_id,
          ati_id: data.ati_id,
          date_inspection: data.date_inspection,
          statut_conformite: statut,
          observations,
          mesures_correctives: mesures || null,
          latitude: lat ? parseFloat(lat) : null,
          longitude: lng ? parseFloat(lng) : null,
        }),
      });
      const payload = await res.json();
      if (!res.ok) { setError(payload.detail ?? `Erreur ${res.status}`); return; }
      setSuccess(true);
      setTimeout(() => router.push(`/pnpi/inspections/${params.id}`), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return (
    <section className="section">
      <div className="chart-card" style={{ padding: "2rem", textAlign: "center", color: "#9ca3af" }}>Chargement...</div>
    </section>
  );

  if (error && !data) return (
    <section className="section">
      <div className="chart-card" style={{ padding: "1.25rem" }}>
        <p style={{ color: "#b42318" }}>{error}</p>
        <Link href="/pnpi/inspections" style={{ color: "#003F8F" }}>← Retour aux inspections</Link>
      </div>
    </section>
  );

  return (
    <section className="section">
      <div style={{ marginBottom: "0.75rem", fontSize: "0.875rem" }}>
        <Link href="/pnpi/inspections" style={{ color: "#6b7280", textDecoration: "none" }}>Inspections</Link>
        <span style={{ color: "#9ca3af", margin: "0 0.5rem" }}>/</span>
        <Link href={`/pnpi/inspections/${params.id}`} style={{ color: "#6b7280", textDecoration: "none", fontFamily: "monospace" }}>{params.id}</Link>
        <span style={{ color: "#9ca3af", margin: "0 0.5rem" }}>/</span>
        <span style={{ color: "#003F8F", fontWeight: 600 }}>Modifier</span>
      </div>

      <div className="chart-card" style={{ padding: "1.5rem", maxWidth: "680px" }}>
        <h2 style={{ margin: "0 0 0.25rem", color: "#003F8F" }}>Modifier le rapport d&apos;inspection</h2>
        <p style={{ margin: "0 0 1.5rem", color: "#6b7280", fontSize: "0.875rem", fontFamily: "monospace" }}>{params.id}</p>

        {error && (
          <div style={{ padding: "0.625rem 0.875rem", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "6px", color: "#b42318", fontSize: "0.82rem", marginBottom: "1rem" }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ padding: "0.625rem 0.875rem", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "6px", color: "#166534", fontSize: "0.82rem", marginBottom: "1rem" }}>
            Rapport mis à jour. Redirection en cours...
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Résultat conformité */}
          <div style={{ marginBottom: "1rem" }}>
            <label style={labelStyle}>Résultat de conformité *</label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {CONF_OPTIONS.map(opt => (
                <button
                  key={opt.value} type="button"
                  onClick={() => setStatut(opt.value)}
                  style={{
                    flex: 1, padding: "0.6rem 0.5rem", borderRadius: "8px", cursor: "pointer",
                    fontWeight: 700, fontSize: "0.82rem", border: "2px solid",
                    background: statut === opt.value ? `${opt.color}18` : "white",
                    color: opt.color,
                    borderColor: statut === opt.value ? opt.color : "#e5e7eb",
                    transition: "all 0.15s",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Observations */}
          <div style={{ marginBottom: "1rem" }}>
            <label style={labelStyle}>Observations *</label>
            <textarea
              value={observations}
              onChange={e => setObservations(e.target.value)}
              required rows={5}
              placeholder="Detaillez les constats de l'inspection..."
              style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
            />
          </div>

          {/* Mesures correctives */}
          <div style={{ marginBottom: "1rem" }}>
            <label style={labelStyle}>Mesures correctives <span style={{ fontWeight: 400, color: "#9ca3af" }}>(optionnel)</span></label>
            <textarea
              value={mesures}
              onChange={e => setMesures(e.target.value)}
              rows={3}
              placeholder="Actions correctives a mettre en place..."
              style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
            />
          </div>

          {/* GPS */}
          <div style={{ marginBottom: "1.25rem" }}>
            <label style={labelStyle}>Coordonnées GPS <span style={{ fontWeight: 400, color: "#9ca3af" }}>(optionnel)</span></label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
              <div>
                <div style={{ fontSize: "0.72rem", color: "#9ca3af", marginBottom: "0.25rem" }}>Latitude</div>
                <input value={lat} onChange={e => setLat(e.target.value)} placeholder="ex: -0.72345" type="number" step="0.00001" style={inputStyle} />
              </div>
              <div>
                <div style={{ fontSize: "0.72rem", color: "#9ca3af", marginBottom: "0.25rem" }}>Longitude</div>
                <input value={lng} onChange={e => setLng(e.target.value)} placeholder="ex: 9.45678" type="number" step="0.00001" style={inputStyle} />
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="submit" disabled={busy || success || !statut}
              style={{
                flex: 1, padding: "0.7rem", background: busy ? "#9ca3af" : "#003F8F",
                color: "white", border: "none", borderRadius: "8px",
                fontWeight: 700, fontSize: "0.875rem", cursor: busy ? "not-allowed" : "pointer",
              }}
            >
              {busy ? "Enregistrement..." : "Enregistrer les modifications"}
            </button>
            <Link
              href={`/pnpi/inspections/${params.id}`}
              style={{
                padding: "0.7rem 1.25rem", background: "#f9fafb", border: "1px solid #e5e7eb",
                color: "#374151", borderRadius: "8px", fontWeight: 600, fontSize: "0.875rem",
                textDecoration: "none", display: "flex", alignItems: "center",
              }}
            >
              Annuler
            </Link>
          </div>
        </form>
      </div>
    </section>
  );
}
