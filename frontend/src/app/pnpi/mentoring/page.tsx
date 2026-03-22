"use client";
import { useState } from "react";
import { useToast } from "../../components/Toast";

const MENTORS = [
  { id: "m1", name: "Jean-Pierre Obame", role: "Expert forestier", secteur: "bois", experience: "20 ans", specialite: "Certification FSC, transformation secondaire", disponible: true },
  { id: "m2", name: "Marie Nguema", role: "Consultante agroalimentaire", secteur: "agroalimentaire", experience: "15 ans", specialite: "Normes HACCP, export CEMAC", disponible: true },
  { id: "m3", name: "Paul Ondo", role: "Ingenieur minier", secteur: "mines", experience: "25 ans", specialite: "Enrichissement manganese, rehabilitation sites", disponible: false },
  { id: "m4", name: "Sylvie Mba", role: "Directrice qualite", secteur: "chimie", experience: "12 ans", specialite: "ISO 9001/14001, gestion des dechets", disponible: true },
  { id: "m5", name: "Franck Essono", role: "Architecte industriel", secteur: "btp", experience: "18 ans", specialite: "Cimenteries, prefabrication, normes CEMAC", disponible: true },
  { id: "m6", name: "Claire Mintsa", role: "Experte halieutique", secteur: "peche", experience: "10 ans", specialite: "Conserveries, tracabilite, export UE", disponible: true },
];

export default function MentoringPage() {
  const { showToast } = useToast();
  const [filter, setFilter] = useState("");
  const [selectedMentor, setSelectedMentor] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const filtered = filter ? MENTORS.filter(m => m.secteur === filter) : MENTORS;
  const sectors = [...new Set(MENTORS.map(m => m.secteur))];

  const requestMentoring = () => {
    if (!selectedMentor || !message.trim()) { showToast("Selectionnez un mentor et redigez un message", "warning"); return; }
    showToast("Demande de parrainage envoyee !", "success");
    setSelectedMentor(null);
    setMessage("");
  };

  return (
    <div style={{ padding: "24px 32px", maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Parrainage operateur</h1>
      <p style={{ color: "var(--text-soft)", fontSize: 13, margin: "0 0 20px" }}>
        Nos experts accompagnent les nouveaux operateurs dans leurs demarches industrielles.
      </p>

      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        <button onClick={() => setFilter("")} style={{ padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600, border: "none", cursor: "pointer", background: !filter ? "#006233" : "var(--bg-base)", color: !filter ? "#fff" : "var(--text-soft)" }}>Tous</button>
        {sectors.map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{ padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600, border: "none", cursor: "pointer", background: filter === s ? "#006233" : "var(--bg-base)", color: filter === s ? "#fff" : "var(--text-soft)", textTransform: "capitalize" }}>{s}</button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12, marginBottom: 20 }}>
        {filtered.map(m => (
          <div key={m.id} className="chart-card" style={{ padding: "18px 20px", opacity: m.disponible ? 1 : 0.5 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(0,98,51,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "#006233" }}>
                {m.name[0]}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{m.name}</div>
                <div style={{ fontSize: 11, color: "var(--text-soft)" }}>{m.role}</div>
              </div>
            </div>
            <div style={{ fontSize: 12, color: "var(--text-soft)", marginBottom: 6 }}>
              <div><strong>Experience :</strong> {m.experience}</div>
              <div><strong>Specialite :</strong> {m.specialite}</div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700, background: m.disponible ? "#dcfce7" : "#f3f4f6", color: m.disponible ? "#006233" : "#526175" }}>
                {m.disponible ? "Disponible" : "Indisponible"}
              </span>
              {m.disponible && (
                <button onClick={() => setSelectedMentor(m.id)} style={{ padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600, border: "none", background: selectedMentor === m.id ? "#006233" : "var(--bg-base)", color: selectedMentor === m.id ? "#fff" : "#006233", cursor: "pointer" }}>
                  {selectedMentor === m.id ? "Selectionne" : "Choisir"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {selectedMentor && (
        <div className="chart-card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 10px" }}>Demande de parrainage</h3>
          <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4} placeholder="Decrivez votre projet et vos besoins d'accompagnement..."
            style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid var(--line)", fontSize: 13, resize: "vertical", marginBottom: 10 }} />
          <button onClick={requestMentoring} style={{ padding: "8px 20px", borderRadius: 10, border: "none", background: "#006233", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Envoyer la demande</button>
        </div>
      )}
    </div>
  );
}
