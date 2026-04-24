"use client";
import { useState } from "react";
import { useToast } from "../../components/Toast";

export default function NewsletterPage() {
  const { showToast } = useToast();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState("all");
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!subject || !body) { showToast("Sujet et contenu requis", "warning"); return; }
    setSending(true);
    // Simulate sending
    await new Promise(r => setTimeout(r, 1500));
    showToast(`Newsletter envoyee a l'audience "${audience}"`, "success");
    setSubject(""); setBody("");
    setSending(false);
  };

  const templates = [
    { name: "Rapport mensuel", subject: "PNPI · Rapport d'activite mensuel", body: "Chers utilisateurs,\n\nVoici le resume des activites PNPI du mois ecoul\u00e9 :\n\n- [X] nouveaux ATI soumis\n- [X] ATI approuves\n- [X] inspections realisees\n\nCordialement,\nL'equipe PNPI" },
    { name: "Maintenance", subject: "PNPI · Maintenance planifiee", body: "Chers utilisateurs,\n\nUne maintenance est prevue le [DATE] de [HEURE] a [HEURE].\nLa plateforme sera temporairement indisponible.\n\nNous vous remercions de votre comprehension.\n\nL'equipe PNPI" },
    { name: "Nouvelle fonctionnalite", subject: "PNPI · Nouvelle fonctionnalite disponible", body: "Chers utilisateurs,\n\nNous avons le plaisir de vous annoncer la disponibilite de [FONCTIONNALITE].\n\n[DESCRIPTION]\n\nDecouvrez-la des maintenant sur pnpi-gabon.ga.\n\nL'equipe PNPI" },
  ];

  return (
    <div style={{ padding: "24px 32px", maxWidth: 700, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 20px" }}>Newsletter</h1>

      {/* Templates */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {templates.map(t => (
          <button key={t.name} onClick={() => { setSubject(t.subject); setBody(t.body); }} style={{
            padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600,
            border: "1px dashed var(--line)", background: "transparent", cursor: "pointer",
          }}>{t.name}</button>
        ))}
      </div>

      <div className="chart-card" style={{ padding: 20 }}>
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Audience</label>
          <select value={audience} onChange={e => setAudience(e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 13 }}>
            <option value="all">Tous les utilisateurs</option>
            <option value="operateurs">Operateurs uniquement</option>
            <option value="instructeurs">Instructeurs uniquement</option>
            <option value="directeurs">Direction (ministre + directeur)</option>
            <option value="inspecteurs">Inspecteurs uniquement</option>
          </select>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Sujet</label>
          <input value={subject} onChange={e => setSubject(e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 13 }} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Contenu</label>
          <textarea value={body} onChange={e => setBody(e.target.value)} rows={10} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid var(--line)", fontSize: 13, resize: "vertical", fontFamily: "monospace" }} />
        </div>
        <button onClick={send} disabled={sending} style={{
          padding: "10px 24px", borderRadius: 12, border: "none", background: "#006233", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", opacity: sending ? 0.6 : 1,
        }}>{sending ? "Envoi en cours..." : "Envoyer la newsletter"}</button>
      </div>
    </div>
  );
}
