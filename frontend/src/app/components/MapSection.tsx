"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";

import type { FieldReport, IndustrialUnit } from "../../lib/api";

// leaflet.css is imported at root level in app/layout.tsx (required by Next.js App Router)

const defaultIcon = L.icon({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.10.0/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.10.0/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const severityColors: Record<string, string> = {
  low: "#1570ef",
  info: "#1570ef",
  medium: "#f79009",
  high: "#d92d20",
  critical: "#b42318",
};

const getDotIcon = (color: string) =>
  L.divIcon({
    className: "field-dot-wrapper",
    html: `<span style="display:inline-block;width:14px;height:14px;border-radius:999px;background:${color};border:2px solid #fff;box-shadow:0 0 0 2px ${color};"></span>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

const locationCoords: Record<string, [number, number]> = {
  "Port-Gentil": [-0.711, 8.782],
  Libreville: [0.392, 9.453],
  Nyanga: [-1.58, 10.793],
  Tchibanga: [-2.933, 10.981],
  "Ogooue-Ivindo": [0.957, 11.425],
};

const normalizeLocation = (raw: string) => raw.trim();

const coordsForLocation = (raw?: string | null): [number, number] | null => {
  if (!raw) return null;
  const normalized = normalizeLocation(raw);
  return locationCoords[normalized] ?? null;
};

interface Props {
  units: IndustrialUnit[];
  fieldReports: FieldReport[];
}

const MapSection = ({ units, fieldReports }: Props) => {
  useEffect(() => {
    L.Marker.prototype.options.icon = defaultIcon;
  }, []);

  const unitMarkers = useMemo(
    () =>
      units
        .map((unit) => {
          const coords = coordsForLocation(unit.location);
          if (!coords) return null;
          return { id: unit.id, name: unit.name, sector: unit.sector, coords };
        })
        .filter((item): item is { id: string; name: string; sector: string; coords: [number, number] } => Boolean(item)),
    [units]
  );

  const reportMarkers = useMemo(
    () =>
      fieldReports
        .map((report) => {
          const coords = coordsForLocation(report.location) ?? null;
          if (!coords) return null;
          return {
            id: report.id,
            title: report.title,
            severity: report.severity.toLowerCase(),
            status: report.status,
            comment: report.comment,
            createdBy: report.created_by,
            coords,
          };
        })
        .filter(
          (
            item
          ): item is {
            id: string;
            title: string;
            severity: string;
            status: string;
            comment: string;
            createdBy: string;
            coords: [number, number];
          } => Boolean(item)
        ),
    [fieldReports]
  );

  return (
    <div className="map-card">
      <h3>Cartographie terrain et zones industrielles</h3>
      <p style={{ marginTop: 0, color: "#5d6674" }}>
        Points terrain inspecteurs (pastilles) superposes aux unites industrielles.
      </p>
      <div className="map-container">
        <MapContainer center={[0.5, 10.0]} zoom={6} scrollWheelZoom style={{ height: "100%" }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          {unitMarkers.map((unit) => (
            <Marker key={unit.id} position={unit.coords}>
              <Popup>
                <strong>{unit.name}</strong>
                <p style={{ margin: 0 }}>{unit.sector}</p>
              </Popup>
            </Marker>
          ))}

          {reportMarkers.map((report) => {
            const color = severityColors[report.severity] ?? "#1570ef";
            return (
              <Marker key={report.id} position={report.coords} icon={getDotIcon(color)}>
                <Popup>
                  <strong>{report.title}</strong>
                  <p style={{ margin: "0.3rem 0" }}>
                    {report.status} - {report.severity}
                  </p>
                  <p style={{ margin: "0.3rem 0" }}>{report.comment}</p>
                  <p style={{ margin: 0, color: "#6c7a8c" }}>Inspecteur: {report.createdBy}</p>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
      <p style={{ marginBottom: 0, color: "#6c7a8c", fontSize: "0.85rem" }}>
        Marqueurs terrain actifs: {reportMarkers.length} - Unites geolocalisees: {unitMarkers.length}
      </p>
    </div>
  );
};

export default MapSection;
