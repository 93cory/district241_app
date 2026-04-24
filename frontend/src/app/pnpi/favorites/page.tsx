import { backendRequest } from "@/lib/backend";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  let favorites: any[] = [];
  try {
    const res = await backendRequest("/pnpi/ati/favorites");
    if (res.ok) {
      const data = await res.json();
      favorites = data.favorites || [];
    }
  } catch {}

  const STATUS_COLORS: Record<string, string> = {
    approuve: "#006233", rejete: "#b42318", soumis: "#526175",
    en_instruction: "#0c7eb4", valide: "#d97706",
  };

  return (
    <div style={{ padding: "24px 32px", maxWidth: 800, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Mes favoris</h1>
      <p style={{ color: "var(--text-soft, #526175)", fontSize: 13, margin: "0 0 20px" }}>
        ATIs epingles pour un acces rapide ({favorites.length})
      </p>

      {favorites.length === 0 ? (
        <div className="chart-card" style={{ padding: 32, textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>⭐</div>
          <div style={{ fontWeight: 600 }}>Aucun favori</div>
          <div style={{ fontSize: 13, color: "var(--text-soft, #526175)" }}>
            Epinglez des ATIs depuis leur page detail pour les retrouver ici.
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {favorites.map((fav: any) => {
            const color = STATUS_COLORS[fav.statut] || "#526175";
            return (
              <Link
                key={fav.id}
                href={`/pnpi/ati/${fav.ati_id}`}
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "14px 18px", borderRadius: 14,
                  background: "var(--bg-layer, #fff)",
                  border: "1.5px solid var(--line, #dce4ef)",
                  textDecoration: "none", color: "inherit",
                  transition: "border-color 150ms ease",
                }}
              >
                <span style={{ fontSize: 20 }}>⭐</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>
                    {fav.numero_ati || fav.ati_id.slice(0, 12)}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-soft, #526175)" }}>
                    {fav.operateur || "·"}
                  </div>
                </div>
                <span style={{
                  padding: "3px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                  background: `${color}12`, color,
                }}>
                  {fav.statut?.replace(/_/g, " ") || "·"}
                </span>
                <span style={{ fontSize: 11, color: "var(--text-soft, #9ca3af)" }}>
                  {new Date(fav.created_at).toLocaleDateString("fr-FR")}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
