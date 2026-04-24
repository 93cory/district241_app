"use client";

import { useState, useEffect } from "react";
import { useToast } from "../../components/Toast";

const STARS = [1, 2, 3, 4, 5];
const CATEGORIES = [
  { id: "general", label: "General" },
  { id: "delai", label: "Delai de traitement" },
  { id: "communication", label: "Communication" },
  { id: "interface", label: "Interface utilisateur" },
  { id: "support", label: "Support technique" },
];

export default function FeedbackPage() {
  const { showToast } = useToast();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [category, setCategory] = useState("general");
  const [sending, setSending] = useState(false);
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    fetch("/api/feedback/summary")
      .then((r) => (r.ok ? r.json() : null))
      .then(setSummary)
      .catch(() => {});
  }, []);

  const submit = async () => {
    if (rating === 0) {
      showToast("Selectionnez une note", "warning");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/feedback/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment, category }),
      });
      if (res.ok) {
        showToast("Merci pour votre retour !", "success");
        setRating(0);
        setComment("");
      } else showToast("Erreur", "error");
    } catch {
      showToast("Erreur", "error");
    }
    setSending(false);
  };

  return (
    <div style={{ padding: "24px 32px", maxWidth: 800, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 20px" }}>Feedback & Satisfaction</h1>

      {/* Submit form */}
      <div className="chart-card" style={{ padding: 24, marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 12px" }}>Donnez votre avis</h3>

        <div style={{ display: "flex", gap: 6, marginBottom: 14, justifyContent: "center" }}>
          {STARS.map((s) => (
            <button
              key={s}
              onMouseEnter={() => setHover(s)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(s)}
              style={{
                fontSize: 32,
                background: "none",
                border: "none",
                cursor: "pointer",
                color: s <= (hover || rating) ? "#f2b800" : "var(--line, #dce4ef)",
                transform: s <= (hover || rating) ? "scale(1.1)" : "scale(1)",
                transition: "all 150ms ease",
              }}
            >
              &#9733;
            </button>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            gap: 6,
            justifyContent: "center",
            marginBottom: 14,
            flexWrap: "wrap",
          }}
        >
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              style={{
                padding: "4px 12px",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                background: category === c.id ? "#006233" : "var(--bg-base, #f4f8fb)",
                color: category === c.id ? "#fff" : "var(--text-soft, #526175)",
              }}
            >
              {c.label}
            </button>
          ))}
        </div>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Commentaire optionnel..."
          rows={3}
          style={{
            width: "100%",
            padding: "10px 14px",
            borderRadius: 10,
            border: "1.5px solid var(--line, #dce4ef)",
            fontSize: 13,
            resize: "vertical",
            marginBottom: 12,
          }}
        />

        <button
          onClick={submit}
          disabled={sending}
          style={{
            padding: "10px 24px",
            borderRadius: 12,
            border: "none",
            background: "#006233",
            color: "#fff",
            fontWeight: 700,
            cursor: "pointer",
            opacity: sending ? 0.6 : 1,
            display: "block",
            margin: "0 auto",
          }}
        >
          {sending ? "Envoi..." : "Envoyer"}
        </button>
      </div>

      {/* Summary (visible to admins) */}
      {summary && summary.count > 0 && (
        <div className="chart-card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 14px" }}>
            Resume ({summary.count} avis)
          </h3>

          <div style={{ display: "flex", gap: 20, alignItems: "center", marginBottom: 16 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 40, fontWeight: 800, color: "#f2b800" }}>
                {summary.average}
              </div>
              <div style={{ fontSize: 20, color: "#f2b800" }}>
                {"★".repeat(Math.round(summary.average))}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              {[5, 4, 3, 2, 1].map((n) => {
                const count = summary.distribution[n] || 0;
                const pct = summary.count ? (count / summary.count) * 100 : 0;
                return (
                  <div
                    key={n}
                    style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}
                  >
                    <span style={{ width: 16, fontSize: 12, fontWeight: 600 }}>{n}★</span>
                    <div
                      style={{
                        flex: 1,
                        height: 8,
                        borderRadius: 4,
                        background: "var(--line, #e5e7eb)",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          borderRadius: 4,
                          background: "#f2b800",
                          width: `${pct}%`,
                        }}
                      />
                    </div>
                    <span
                      style={{
                        width: 30,
                        fontSize: 11,
                        textAlign: "right",
                        color: "var(--text-soft)",
                      }}
                    >
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {summary.recent.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {summary.recent.slice(0, 8).map((fb: any) => (
                <div
                  key={fb.id}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 10,
                    background: "var(--bg-base, #f4f8fb)",
                    fontSize: 12,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>
                      {"★".repeat(fb.rating)} <strong>{fb.username}</strong>
                    </span>
                    <span style={{ color: "var(--text-soft, #9ca3af)", fontSize: 11 }}>
                      {new Date(fb.created_at).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                  {fb.comment && (
                    <div style={{ marginTop: 2, color: "var(--text-soft, #526175)" }}>
                      {fb.comment}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
