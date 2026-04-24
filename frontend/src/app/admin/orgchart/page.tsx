export default function OrgChartPage() {
  const roles = [
    {
      id: "ministre",
      label: "Ministre",
      color: "#051B36",
      level: 0,
      permissions: [
        "Voir tous les dashboards",
        "Comparaison periodique",
        "Predictions",
        "Briefing",
        "Presentation",
        "Stats avancees",
      ],
      description: "Vision strategique, decisions de haut niveau",
    },
    {
      id: "directeur",
      label: "Directeur General",
      color: "#006233",
      level: 1,
      permissions: [
        "Valider les ATI",
        "Gerer les workflows",
        "Performance instructeurs",
        "Qualite donnees",
        "Delegations",
        "Rapports",
      ],
      description: "Supervision operationnelle, validation finale",
    },
    {
      id: "instructeur",
      label: "Instructeur",
      color: "#0c7eb4",
      level: 2,
      permissions: [
        "Instruire les ATI",
        "Commenter",
        "Tagger",
        "Assigner",
        "Kanban",
        "Calendrier",
        "Recherche",
        "Delegations",
      ],
      description: "Traitement des dossiers ATI, instruction",
    },
    {
      id: "inspecteur",
      label: "Inspecteur",
      color: "#7c3aed",
      level: 2,
      permissions: [
        "Creer inspections",
        "Photos terrain",
        "Rapport PDF",
        "Calendrier",
        "Heatmap",
        "Delegations",
      ],
      description: "Inspections de conformite sur le terrain",
    },
    {
      id: "operateur",
      label: "Operateur Industriel",
      color: "#d97706",
      level: 3,
      permissions: [
        "Soumettre ATI",
        "Voir mes ATI",
        "Documents",
        "Messages",
        "Guichet",
        "Verification QR",
      ],
      description: "Demandeur d'agrement, operateur industriel",
    },
    {
      id: "admin",
      label: "Administrateur",
      color: "#b42318",
      level: 0,
      permissions: [
        "Toutes les permissions",
        "Gestion utilisateurs",
        "Audit log",
        "Workflows",
        "Import CSV",
        "Backup",
        "Changelog",
      ],
      description: "Administration technique de la plateforme",
    },
  ];

  const levels = [0, 1, 2, 3];
  const levelLabels = ["Direction", "Management", "Operations", "Externes"];

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1000, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Organigramme des roles</h1>
      <p style={{ color: "var(--text-soft, #526175)", fontSize: 13, margin: "0 0 24px" }}>
        Structure hierarchique et permissions par role dans la plateforme PNPI.
      </p>

      {levels.map((level) => {
        const levelRoles = roles.filter((r) => r.level === level);
        if (levelRoles.length === 0) return null;
        return (
          <div key={level} style={{ marginBottom: 24 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "var(--text-soft, #526175)",
                textTransform: "uppercase",
                letterSpacing: 1,
                marginBottom: 10,
                paddingBottom: 4,
                borderBottom: "2px solid var(--line, #dce4ef)",
              }}
            >
              {levelLabels[level]}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${Math.min(levelRoles.length, 3)}, 1fr)`,
                gap: 12,
              }}
            >
              {levelRoles.map((role) => (
                <div
                  key={role.id}
                  style={{
                    padding: "18px 20px",
                    borderRadius: 16,
                    background: "var(--bg-layer, #fff)",
                    borderTop: `4px solid ${role.color}`,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: `${role.color}15`,
                        color: role.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 14,
                        fontWeight: 800,
                      }}
                    >
                      {role.label[0]}
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>{role.label}</div>
                      <div style={{ fontSize: 11, color: "var(--text-soft, #526175)" }}>
                        {role.description}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                    {role.permissions.map((perm) => (
                      <span
                        key={perm}
                        style={{
                          padding: "2px 8px",
                          borderRadius: 6,
                          fontSize: 10,
                          fontWeight: 600,
                          background: `${role.color}10`,
                          color: role.color,
                        }}
                      >
                        {perm}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Connection lines hint */}
      <div
        style={{
          textAlign: "center",
          padding: 16,
          fontSize: 12,
          color: "var(--text-soft, #9ca3af)",
          fontStyle: "italic",
        }}
      >
        Les roles de niveau superieur heritent des permissions de visualisation des niveaux
        inferieurs.
      </div>
    </div>
  );
}
