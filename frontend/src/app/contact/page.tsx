"use client";
import { useState } from "react";

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ nom: "", email: "", objet: "", message: "" });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <div style={{ minHeight: "100vh", fontFamily: "Manrope, system-ui, sans-serif" }}>
      <div style={{ background: "linear-gradient(135deg, #051B36, #006233)", color: "#fff", padding: "50px 32px", textAlign: "center" }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, margin: "0 0 8px" }}>Nous contacter</h1>
        <p style={{ fontSize: 15, opacity: 0.8 }}>Ministere de l'Industrie et de la Transformation Locale</p>
      </div>

      <div style={{ maxWidth: 600, margin: "-20px auto 40px", padding: "0 24px" }}>
        {sent ? (
          <div style={{ padding: 40, borderRadius: 20, background: "#fff", boxShadow: "0 8px 32px rgba(0,0,0,0.08)", textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>&#x2705;</div>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Message envoye</h2>
            <p style={{ color: "#526175", fontSize: 14 }}>Nous vous repondrons dans les meilleurs delais.</p>
            <button onClick={() => { setSent(false); setForm({ nom: "", email: "", objet: "", message: "" }); }} style={{
              marginTop: 12, padding: "8px 20px", borderRadius: 10, border: "none", background: "#006233", color: "#fff", fontWeight: 600, cursor: "pointer",
            }}>Envoyer un autre message</button>
          </div>
        ) : (
          <form onSubmit={submit} style={{ padding: "32px 28px", borderRadius: 20, background: "#fff", boxShadow: "0 8px 32px rgba(0,0,0,0.08)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Nom complet *</label>
                <input required value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid #dce4ef", fontSize: 13 }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Email *</label>
                <input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid #dce4ef", fontSize: 13 }} />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Objet *</label>
              <select required value={form.objet} onChange={e => setForm({ ...form, objet: e.target.value })} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid #dce4ef", fontSize: 13 }}>
                <option value="">Selectionnez...</option>
                <option value="information">Demande d'information</option>
                <option value="ati">Question sur un ATI</option>
                <option value="technique">Probleme technique</option>
                <option value="partenariat">Proposition de partenariat</option>
                <option value="investissement">Investissement industriel</option>
                <option value="autre">Autre</option>
              </select>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Message *</label>
              <textarea required rows={6} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid #dce4ef", fontSize: 13, resize: "vertical" }} />
            </div>
            <button type="submit" style={{ width: "100%", padding: "12px", borderRadius: 12, border: "none", background: "#006233", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>Envoyer</button>
          </form>
        )}

        {/* Contact info */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 24 }}>
          {[
            { icon: "\ud83d\udccd", label: "Adresse", value: "BP 3903, Libreville, Gabon" },
            { icon: "\ud83d\udcde", label: "Telephone", value: "+241 01 76 XX XX" },
            { icon: "\ud83d\udce7", label: "Email", value: "contact@pnpi-gabon.ga" },
          ].map(c => (
            <div key={c.label} style={{ padding: "16px", borderRadius: 14, background: "#fff", border: "1px solid #dce4ef", textAlign: "center" }}>
              <div style={{ fontSize: 24, marginBottom: 4 }}>{c.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 2 }}>{c.label}</div>
              <div style={{ fontSize: 11, color: "#526175" }}>{c.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: "#051B36", color: "rgba(255,255,255,0.6)", padding: "16px", textAlign: "center", fontSize: 10 }}>
        Ministere de l'Industrie et de la Transformation Locale · PNPI {new Date().getFullYear()}
      </div>
    </div>
  );
}
