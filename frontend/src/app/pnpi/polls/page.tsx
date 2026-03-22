"use client";
import { useState, useEffect } from "react";
import { useToast } from "../../components/Toast";

export default function PollsPage() {
  const { showToast } = useToast();
  const [polls, setPolls] = useState<any[]>([]);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);

  const load = () => { fetch("/api/polls/active").then(r => r.json()).then(d => setPolls(d.polls || [])).catch(() => {}); };
  useEffect(() => { load(); }, []);

  const create = async () => {
    const validOpts = options.filter(o => o.trim());
    if (!question.trim() || validOpts.length < 2) { showToast("Question + 2 options min.", "warning"); return; }
    const res = await fetch("/api/polls/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question, options: validOpts }) });
    if (res.ok) { showToast("Sondage cree", "success"); setQuestion(""); setOptions(["", ""]); load(); }
    else showToast("Erreur", "error");
  };

  const vote = async (pollId: string, idx: number) => {
    const res = await fetch(`/api/polls/${pollId}/vote`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ option_index: idx }) });
    if (res.ok) { showToast("Vote enregistre", "success"); load(); }
    else { const d = await res.json(); showToast(d.detail || "Erreur", "warning"); }
  };

  return (
    <div style={{ padding: "24px 32px", maxWidth: 700, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 20px" }}>Sondages</h1>

      <div className="chart-card" style={{ padding: 20, marginBottom: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 10px" }}>Nouveau sondage</h3>
        <input value={question} onChange={e => setQuestion(e.target.value)} placeholder="Question..." style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 13, marginBottom: 8 }} />
        {options.map((opt, i) => (
          <input key={i} value={opt} onChange={e => { const n = [...options]; n[i] = e.target.value; setOptions(n); }} placeholder={`Option ${i + 1}`} style={{ width: "100%", padding: "6px 12px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 12, marginBottom: 4 }} />
        ))}
        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
          <button onClick={() => setOptions([...options, ""])} style={{ fontSize: 12, background: "none", border: "1px dashed var(--line)", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>+ Option</button>
          <button onClick={create} style={{ padding: "6px 16px", borderRadius: 8, border: "none", background: "#006233", color: "#fff", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>Publier</button>
        </div>
      </div>

      {polls.map(poll => {
        const maxVotes = Math.max(...poll.vote_counts, 1);
        return (
          <div key={poll.id} className="chart-card" style={{ padding: 20, marginBottom: 12 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>{poll.question}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {poll.options.map((opt: string, i: number) => {
                const pct = poll.total_votes ? Math.round(poll.vote_counts[i] / poll.total_votes * 100) : 0;
                const voted = poll.my_vote === i;
                return (
                  <button key={i} onClick={() => poll.my_vote == null && vote(poll.id, i)} disabled={poll.my_vote != null} style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 10, border: `1.5px solid ${voted ? "#006233" : "var(--line, #dce4ef)"}`, background: voted ? "rgba(0,98,51,0.06)" : "transparent", cursor: poll.my_vote == null ? "pointer" : "default", textAlign: "left", width: "100%",
                  }}>
                    <div style={{ flex: 1, position: "relative" }}>
                      <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: `${pct}%`, background: "rgba(0,98,51,0.08)", borderRadius: 6 }} />
                      <span style={{ position: "relative", fontSize: 13, fontWeight: voted ? 700 : 400 }}>{opt}</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-soft)", minWidth: 40, textAlign: "right" }}>{pct}%</span>
                    <span style={{ fontSize: 10, color: "var(--text-soft, #9ca3af)" }}>{poll.vote_counts[i]}</span>
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-soft, #9ca3af)", marginTop: 6 }}>{poll.total_votes} vote(s) — par {poll.created_by}</div>
          </div>
        );
      })}
    </div>
  );
}
