"use client";

import { useEffect, useState, useRef, useCallback, DragEvent } from "react";

interface Photo {
  id: string;
  inspection_id: string;
  nom_fichier: string;
  taille_octets: number;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  captured_at: string | null;
  uploaded_at: string;
  uploaded_by: string;
}

interface Props {
  inspectionId: string;
  canEdit: boolean;
}

const ACCEPT = ".jpg,.jpeg,.png,.webp";
const MAX_SIZE_MB = 10;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

export function InspectionPhotoUpload({ inspectionId, canEdit }: Props) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geoStatus, setGeoStatus] = useState<
    "unknown" | "requesting" | "granted" | "denied" | "unavailable"
  >("unknown");
  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

  const loadPhotos = useCallback(async () => {
    try {
      const res = await fetch(`/api/pnpi/inspections/${inspectionId}/photos`, {
        cache: "no-store",
      });
      if (res.ok) setPhotos((await res.json()) as Photo[]);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [inspectionId]);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  // Capture GPS au chargement, en arriere-plan
  useEffect(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setGeoStatus("unavailable");
      return;
    }
    setGeoStatus("requesting");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setGeoStatus("granted");
      },
      () => setGeoStatus("denied"),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }, []);

  const refreshLocation = () => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setGeoStatus("unavailable");
      return;
    }
    setGeoStatus("requesting");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setGeoStatus("granted");
      },
      () => setGeoStatus("denied"),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  const uploadFiles = async (files: FileList | File[]) => {
    setError(null);
    for (const file of Array.from(files)) {
      const ext = "." + (file.name.split(".").pop() ?? "").toLowerCase();
      if (!ACCEPT.split(",").includes(ext)) {
        setError(`"${file.name}" : type non autorise (${ACCEPT})`);
        continue;
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setError(`"${file.name}" : depasse ${MAX_SIZE_MB} Mo`);
        continue;
      }
      setBusy(true);
      try {
        const form = new FormData();
        form.append("file", file);
        if (coords) {
          form.append("latitude", String(coords.lat));
          form.append("longitude", String(coords.lng));
        }
        form.append("captured_at", new Date().toISOString());

        const res = await fetch(`/api/pnpi/inspections/${inspectionId}/photos`, {
          method: "POST",
          body: form,
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.detail ?? `Erreur ${res.status}`);
          continue;
        }
        const newPhoto = (await res.json()) as Photo;
        setPhotos((prev) => [newPhoto, ...prev]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur reseau");
      } finally {
        setBusy(false);
      }
    }
  };

  const handleDrag = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter") {
      dragCounter.current += 1;
      if (e.dataTransfer?.items?.length) setIsDragging(true);
    } else if (e.type === "dragleave") {
      dragCounter.current -= 1;
      if (dragCounter.current === 0) setIsDragging(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    setIsDragging(false);
    dragCounter.current = 0;
    if (e.dataTransfer?.files?.length) {
      uploadFiles(e.dataTransfer.files);
    }
  };

  const handleDelete = async (photoId: string, nom: string) => {
    if (!confirm(`Supprimer "${nom}" ?`)) return;
    try {
      const res = await fetch(`/api/pnpi/inspections/${inspectionId}/photos/${photoId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur suppression");
    }
  };

  const geoBadge = (() => {
    switch (geoStatus) {
      case "granted":
        return coords
          ? `Position : ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)} (±${Math.round(coords.accuracy)} m)`
          : "Position capturee";
      case "requesting":
        return "Localisation en cours...";
      case "denied":
        return "Geolocalisation refusee";
      case "unavailable":
        return "Geolocalisation non disponible";
      default:
        return "Position inconnue";
    }
  })();

  return (
    <div className="photo-upload">
      <div className="photo-upload-head">
        <div>
          <h3 className="pnpi-card-subtitle">Photos d&apos;inspection ({photos.length})</h3>
          <div className={`photo-upload-geo photo-upload-geo--${geoStatus}`}>
            <span className="photo-upload-geo-dot" aria-hidden="true" />
            <span>{geoBadge}</span>
            {(geoStatus === "denied" || geoStatus === "unknown") && (
              <button type="button" onClick={refreshLocation} className="photo-upload-geo-retry">
                reessayer
              </button>
            )}
          </div>
        </div>
      </div>

      {canEdit && (
        <label
          className={`docupload-drop ${isDragging ? "is-dragging" : ""}`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileRef}
            type="file"
            multiple
            accept={ACCEPT}
            capture="environment"
            onChange={(e) => e.target.files && uploadFiles(e.target.files)}
            className="docupload-input"
            aria-label="Prendre ou selectionner une photo"
          />
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
          <div className="docupload-text">
            <strong>{isDragging ? "Relachez pour ajouter" : "Prendre ou deposer une photo"}</strong>
            <span className="docupload-hint">
              Ouvre la camera sur mobile &middot; {ACCEPT} &middot; max {MAX_SIZE_MB} Mo
              {coords && " · coordonnees GPS capturees automatiquement"}
            </span>
          </div>
        </label>
      )}

      {error && (
        <div className="pnpi-form-alert pnpi-form-alert--error docupload-error" role="alert">
          {error}
        </div>
      )}
      {busy && <div className="photo-upload-busy">Envoi en cours...</div>}

      {loading ? (
        <div className="photo-upload-empty">Chargement des photos...</div>
      ) : photos.length === 0 ? (
        <div className="photo-upload-empty">Aucune photo pour l&apos;instant.</div>
      ) : (
        <ul className="photo-upload-grid">
          {photos.map((p) => (
            <li key={p.id} className="photo-upload-card">
              <a
                href={`${BACKEND}/pnpi/inspections/${inspectionId}/photos/${p.id}/file`}
                target="_blank"
                rel="noopener noreferrer"
                className="photo-upload-thumb"
                aria-label={`Voir ${p.nom_fichier}`}
              >
                <img
                  src={`${BACKEND}/pnpi/inspections/${inspectionId}/photos/${p.id}/file`}
                  alt={p.description || p.nom_fichier}
                  loading="lazy"
                />
              </a>
              <div className="photo-upload-meta">
                <div className="photo-upload-name" title={p.nom_fichier}>
                  {p.nom_fichier}
                </div>
                <div className="photo-upload-sub">
                  {formatSize(p.taille_octets)} &middot;{" "}
                  {new Date(p.uploaded_at).toLocaleDateString("fr-FR")}
                </div>
                {p.latitude !== null && p.longitude !== null && (
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${p.latitude}&mlon=${p.longitude}#map=16/${p.latitude}/${p.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="photo-upload-geo-link"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    {p.latitude.toFixed(4)}, {p.longitude.toFixed(4)}
                  </a>
                )}
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => handleDelete(p.id, p.nom_fichier)}
                  className="photo-upload-delete"
                  aria-label={`Supprimer ${p.nom_fichier}`}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
