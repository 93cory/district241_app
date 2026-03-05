"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";

import type { OperateurGeoPoint } from "../../../lib/api";

import "leaflet/dist/leaflet.css";

const SECTEUR_COLORS: Record<string, string> = {
  bois: "#16a34a",
  mines: "#d97706",
  agroalimentaire: "#059669",
  btp: "#2563eb",
  petrole: "#7c3aed",
  services: "#0284c7",
};

const SECTEUR_LABELS: Record<string, string> = {
  bois: "Bois & Foret",
  mines: "Mines",
  agroalimentaire: "Agro-alimentaire",
  btp: "BTP",
  petrole: "Petrole",
  services: "Services",
};

const STATUT_COLORS: Record<string, string> = {
  soumis: "#f59e0b",
  en_instruction: "#3b82f6",
  en_validation: "#8b5cf6",
  approuve: "#10b981",
  rejete: "#ef4444",
  expire: "#9ca3af",
};

const getDotIcon = (secteur: string) => {
  const color = SECTEUR_COLORS[secteur] ?? "#6b7280";
  return L.divIcon({
    className: "",
    html: `<span style="display:inline-block;width:14px;height:14px;border-radius:999px;background:${color};border:2.5px solid #fff;box-shadow:0 0 0 1.5px ${color},0 2px 6px rgba(0,0,0,0.25);"></span>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
};

interface Props {
  operateurs: OperateurGeoPoint[];
}

const CarteOperateurs = ({ operateurs }: Props) => {
  useEffect(() => {
    L.Marker.prototype.options.icon = L.icon({
      iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.10.0/images/marker-icon.png",
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.10.0/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
    });
  }, []);

  const markers = useMemo(
    () =>
      operateurs.filter(
        (op): op is OperateurGeoPoint & { latitude: number; longitude: number } =>
          op.latitude != null && op.longitude != null
      ),
    [operateurs]
  );

  const legende = useMemo(() => {
    const secteurs = [...new Set(markers.map((m) => m.secteur))];
    return secteurs.map((s) => ({ secteur: s, color: SECTEUR_COLORS[s] ?? "#6b7280", label: SECTEUR_LABELS[s] ?? s }));
  }, [markers]);

  return (
    <div>
      <div style={{ height: "400px", borderRadius: "10px", overflow: "hidden", border: "1px solid #e5e7eb" }}>
        <MapContainer center={[-0.5, 11.5]} zoom={6} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />
          {markers.map((op) => (
            <Marker
              key={op.id}
              position={[op.latitude, op.longitude]}
              icon={getDotIcon(op.secteur)}
            >
              <Popup>
                <div style={{ minWidth: "180px" }}>
                  <strong style={{ color: "#003F8F" }}>{op.raison_sociale}</strong>
                  <div style={{ marginTop: "0.4rem", fontSize: "0.85rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
                      <span style={{ color: "#6b7280" }}>Secteur</span>
                      <span style={{ color: SECTEUR_COLORS[op.secteur] ?? "#374151", fontWeight: 600 }}>
                        {SECTEUR_LABELS[op.secteur] ?? op.secteur}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", marginTop: "0.2rem" }}>
                      <span style={{ color: "#6b7280" }}>Province</span>
                      <span>{op.province.replace("_", " ")}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", marginTop: "0.2rem" }}>
                      <span style={{ color: "#6b7280" }}>ATIs actifs</span>
                      <strong>{op.nb_atis_actifs}</strong>
                    </div>
                    {op.statut_dernier_ati && (
                      <div style={{ marginTop: "0.4rem" }}>
                        <span
                          style={{
                            padding: "0.15rem 0.5rem",
                            borderRadius: "999px",
                            background: `${STATUT_COLORS[op.statut_dernier_ati] ?? "#6b7280"}20`,
                            color: STATUT_COLORS[op.statut_dernier_ati] ?? "#6b7280",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                          }}
                        >
                          {op.statut_dernier_ati.replace("_", " ")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
      {legende.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginTop: "0.75rem" }}>
          {legende.map((l) => (
            <div key={l.secteur} style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.8rem", color: "#374151" }}>
              <span style={{ width: "10px", height: "10px", borderRadius: "999px", background: l.color, display: "inline-block", border: "1.5px solid #fff", boxShadow: `0 0 0 1px ${l.color}` }} />
              {l.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CarteOperateurs;
