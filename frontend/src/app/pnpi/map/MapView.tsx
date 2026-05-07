"use client";

import { useEffect, useRef } from "react";

const PROVINCE_COORDS: Record<string, [number, number]> = {
  estuaire: [0.4, 9.45],
  haut_ogooue: [-1.6, 13.95],
  moyen_ogooue: [-0.45, 10.75],
  ngounie: [-1.5, 11.4],
  nyanga: [-2.85, 11.15],
  ogooue_ivindo: [0.8, 12.0],
  ogooue_lolo: [-0.85, 12.65],
  ogooue_maritime: [-1.6, 9.7],
  woleu_ntem: [2.15, 11.75],
};

const SECTOR_COLORS: Record<string, string> = {
  bois: "#006233",
  mines: "#b42318",
  agroalimentaire: "#d97706",
  peche: "#0c7eb4",
  chimie: "#7c3aed",
  btp: "#059669",
  energie: "#f97316",
  textile: "#ec4899",
};

interface Props {
  operators: any[];
}

export default function MapView({ operators }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || typeof window === "undefined") return;

    // Dynamic import of Leaflet
    import("leaflet").then((L) => {
      // Import CSS
      if (!document.querySelector('link[href*="leaflet"]')) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      if (mapInstance.current) {
        mapInstance.current.remove();
      }

      const map = L.map(mapRef.current!, { zoomControl: true }).setView([0.0, 11.5], 6);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap | PNPI Gabon",
      }).addTo(map);

      // Add operator markers
      operators.forEach((op) => {
        const province = op.province || "";
        const coords = PROVINCE_COORDS[province];
        if (!coords) return;

        // Decalage deterministe (hash sur op.id) pour eviter que les markers
        // sautent a chaque re-render quand l'utilisateur filtre par secteur.
        const seed = (op.id || op.nif_gabon || op.raison_sociale || "").split("").reduce(
          (h, c) => ((h * 31 + c.charCodeAt(0)) | 0),
          0,
        );
        const offLat = ((Math.abs(seed) % 1000) / 1000 - 0.5) * 0.3;
        const offLng = ((Math.abs(seed >> 8) % 1000) / 1000 - 0.5) * 0.3;
        const lat = coords[0] + offLat;
        const lng = coords[1] + offLng;
        const color = SECTOR_COLORS[op.secteur] || "#526175";

        const icon = L.divIcon({
          className: "",
          html: `<div style="width:12px;height:12px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div>`,
          iconSize: [12, 12],
          iconAnchor: [6, 6],
        });

        L.marker([lat, lng], { icon }).addTo(map).bindPopup(`
            <div style="font-family:system-ui;min-width:180px">
              <div style="font-weight:700;font-size:13px;margin-bottom:4px">${op.raison_sociale || op.nom || "?"}</div>
              <div style="font-size:11px;color:#526175">
                <div>Secteur: <b style="text-transform:capitalize">${op.secteur || "?"}</b></div>
                <div>Province: ${(province || "").replace(/_/g, " ")}</div>
                ${op.nif_gabon ? `<div>NIF: ${op.nif_gabon}</div>` : ""}
              </div>
              <a href="/pnpi/operateurs/${op.id}" style="display:inline-block;margin-top:6px;font-size:11px;color:#006233;font-weight:600">Voir le detail →</a>
            </div>
          `);
      });

      mapInstance.current = map;

      // Fix map size after render
      setTimeout(() => map.invalidateSize(), 100);
    });

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [operators]);

  return <div ref={mapRef} style={{ height: 500, width: "100%" }} />;
}
