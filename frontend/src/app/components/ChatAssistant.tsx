"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "bot";
  text: string;
}

const FAQ: { q: string[]; a: string }[] = [
  {
    q: ["comment soumettre", "soumettre ati", "creer ati", "nouveau dossier"],
    a: "Pour soumettre un ATI, rendez-vous dans 'Mon espace' > 'Soumettre un ATI'. Remplissez le formulaire ou utilisez un modele pre-rempli. Vous pouvez aussi utiliser le raccourci clavier 'g a' pour acceder aux ATIs.",
  },
  {
    q: ["statut ati", "ou en est", "suivre dossier", "etat dossier"],
    a: "Consultez votre dossier dans 'Mes ATI' ou utilisez la recherche (raccourci 'g s'). La page detail affiche le statut, la timeline, le SLA et l'historique complet.",
  },
  {
    q: ["renouveler", "renouvellement", "expire", "expiration"],
    a: "Allez dans 'Renouvellements' pour voir les ATI proches de l'expiration. Cliquez 'Renouveler' pour creer un dossier pre-rempli a partir de l'ancien.",
  },
  {
    q: ["certificat", "telecharger certificat", "pdf ati"],
    a: "Le certificat PDF est disponible dans la page detail d'un ATI approuve. Cliquez 'Telecharger le certificat'. Il inclut un QR code de verification.",
  },
  {
    q: ["inspection", "resultat inspection", "conformite"],
    a: "Les inspections sont visibles dans 'Inspections'. Chaque inspection a un rapport PDF telechargeable et un statut de conformite (conforme/partiel/non conforme).",
  },
  {
    q: ["notification", "alerte", "cloche"],
    a: "Les notifications apparaissent via la cloche en haut. Configurez vos preferences dans 'Mon profil' > 'Preferences de notification'. Activez les notifications push pour les alertes temps reel.",
  },
  {
    q: ["dark mode", "theme sombre", "mode nuit"],
    a: "Cliquez sur le bouton de theme dans la barre de navigation (soleil/lune/ecran). Vous pouvez choisir clair, sombre ou automatique (suit le systeme).",
  },
  {
    q: ["raccourci", "clavier", "shortcut"],
    a: "Appuyez sur '?' pour voir tous les raccourcis. Par exemple : 'g d' = Dashboard, 'g a' = ATI, 'g m' = Messages, 'g k' = Kanban.",
  },
  {
    q: ["message", "messagerie", "contacter", "ecrire"],
    a: "La messagerie interne est accessible via 'Messages'. Vous pouvez aussi cliquer 'Message' a cote d'un nom dans l'annuaire.",
  },
  {
    q: ["kanban", "pipeline", "tableau"],
    a: "Le Kanban est accessible via 'Kanban'. Glissez-deposez les cartes ATI entre les colonnes pour changer leur statut.",
  },
  {
    q: ["export", "excel", "pdf", "powerpoint"],
    a: "Les exports sont disponibles dans chaque section : Excel (.xlsx), PDF, PowerPoint (.pptx) pour les briefings, ZIP pour les documents, GeoJSON pour les cartes.",
  },
  {
    q: ["calendrier", "echeance", "date"],
    a: "Le calendrier ('Calendrier') affiche toutes les echeances : soumissions ATI, decisions, expirations et inspections planifiees.",
  },
  {
    q: ["score", "scoring", "note operateur"],
    a: "Le scoring operateur (0-100) est visible sur la page detail de chaque operateur. Il combine 5 piliers : ATI, inspections, documents, SLA et activite.",
  },
  {
    q: ["2fa", "deux facteurs", "securite", "biometrie"],
    a: "Configurez la 2FA dans 'Mon profil' > 'Securite'. L'app mobile supporte aussi la connexion biometrique (empreinte/Face ID).",
  },
  {
    q: ["aide", "help", "support", "probleme"],
    a: "La page 'Aide' contient des FAQ detaillees. Pour un probleme technique, contactez l'administrateur via la messagerie interne.",
  },
  {
    q: ["sondage", "poll", "vote"],
    a: "Les sondages sont dans 'Sondages'. Les directeurs et admins peuvent creer des sondages. Chaque utilisateur peut voter une fois.",
  },
  {
    q: ["badge", "gamification", "recompense"],
    a: "Vos badges sont visibles dans 'Mon profil'. Vous debloquez des badges en traitant des ATI, realisant des inspections et en etant actif sur la plateforme.",
  },
];

function findAnswer(input: string): string {
  const normalized = input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  let bestMatch = "";
  let bestScore = 0;

  for (const faq of FAQ) {
    for (const q of faq.q) {
      const words = q.split(" ");
      const matchCount = words.filter((w) => normalized.includes(w)).length;
      const score = matchCount / words.length;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = faq.a;
      }
    }
  }

  if (bestScore >= 0.5) return bestMatch;
  return "Je n'ai pas trouve de reponse precise. Essayez de reformuler votre question ou consultez la page 'Aide' pour plus d'informations.";
}

export function ChatAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "bot",
      text: "Bonjour ! Je suis l'assistant PNPI. Posez-moi une question sur la plateforme.",
    },
  ]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [aiEnabled, setAiEnabled] = useState<boolean | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Detection capacite IA (une fois a l'ouverture)
  useEffect(() => {
    if (!open || aiEnabled !== null) return;
    fetch("/api/chat/status")
      .then((r) => (r.ok ? r.json() : { enabled: false }))
      .then((d) => setAiEnabled(Boolean(d.enabled)))
      .catch(() => setAiEnabled(false));
  }, [open, aiEnabled]);

  const askBackend = async (question: string): Promise<string> => {
    try {
      const res = await fetch("/api/chat/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      if (data?.fallback || !data?.answer) return findAnswer(question);
      return data.answer;
    } catch {
      // fallback FAQ statique en cas d'erreur reseau / 5xx
      return findAnswer(question);
    }
  };

  const send = async () => {
    if (!input.trim() || pending) return;
    const question = input;
    const userMsg: Message = { role: "user", text: question };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    // Si l'IA est explicitement desactivee, FAQ direct (zero latence)
    if (aiEnabled === false) {
      setMessages((prev) => [...prev, { role: "bot", text: findAnswer(question) }]);
      return;
    }

    setPending(true);
    const answer = await askBackend(question);
    setPending(false);
    setMessages((prev) => [...prev, { role: "bot", text: answer }]);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          zIndex: 9997,
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #006233, #0c7eb4)",
          color: "#fff",
          border: "none",
          cursor: "pointer",
          boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
          fontSize: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        aria-label="Ouvrir l'assistant"
        title="Assistant PNPI"
      >
        {"💬"}
      </button>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        zIndex: 9997,
        width: 360,
        height: 480,
        borderRadius: 20,
        background: "var(--bg-layer, #fff)",
        boxShadow: "0 12px 48px rgba(0,0,0,0.2)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        animation: "reveal-up 250ms ease-out",
        border: "1px solid var(--line, #dce4ef)",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px 16px",
          background: "linear-gradient(135deg, #006233, #0c7eb4)",
          color: "#fff",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Assistant PNPI</div>
          <div style={{ fontSize: 10, opacity: 0.8 }}>Aide et FAQ en temps reel</div>
        </div>
        <button
          onClick={() => setOpen(false)}
          style={{
            background: "none",
            border: "none",
            color: "#fff",
            fontSize: 20,
            cursor: "pointer",
          }}
        >
          {"\u00d7"}
        </button>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: "12px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "85%",
              padding: "8px 12px",
              borderRadius: 12,
              background: m.role === "user" ? "#006233" : "var(--bg-base, #f4f8fb)",
              color: m.role === "user" ? "#fff" : "var(--text-main)",
              fontSize: 13,
              lineHeight: 1.5,
              whiteSpace: "pre-wrap",
            }}
          >
            {m.text}
          </div>
        ))}
        {pending && (
          <div
            style={{
              alignSelf: "flex-start",
              padding: "8px 12px",
              borderRadius: 12,
              background: "var(--bg-base, #f4f8fb)",
              color: "var(--text-soft, #526175)",
              fontSize: 13,
              fontStyle: "italic",
            }}
          >
            L'assistant reflechit...
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div
        style={{
          padding: "10px 12px",
          borderTop: "1px solid var(--line, #dce4ef)",
          display: "flex",
          gap: 8,
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Posez votre question..."
          style={{
            flex: 1,
            padding: "8px 12px",
            borderRadius: 10,
            border: "1.5px solid var(--line, #dce4ef)",
            fontSize: 13,
            outline: "none",
          }}
        />
        <button
          onClick={send}
          style={{
            padding: "8px 14px",
            borderRadius: 10,
            border: "none",
            background: "#006233",
            color: "#fff",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          {"\u2192"}
        </button>
      </div>
    </div>
  );
}
