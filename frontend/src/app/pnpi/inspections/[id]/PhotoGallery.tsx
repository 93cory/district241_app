"use client";

/* eslint-disable @next/next/no-img-element -- Inspection photos are private API images. */

import { useCallback, useEffect, useRef, useState } from "react";

interface Photo {
  id: string;
  inspection_id: string;
  nom_fichier: string;
  taille_octets: number;
  description: string | null;
  uploaded_at: string;
  uploaded_by: string;
}

export function PhotoGallery({ inspectionId }: { inspectionId: string }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [enlargedPhoto, setEnlargedPhoto] = useState<Photo | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPhotos = useCallback(async () => {
    try {
      const res = await fetch(`/api/pnpi/inspections/${inspectionId}/photos`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setPhotos(data);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [inspectionId]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadProgress(0);

    const totalFiles = files.length;
    let completed = 0;

    for (let i = 0; i < totalFiles; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch(`/api/pnpi/inspections/${inspectionId}/photos`, {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ detail: "Erreur" }));
          alert(`Erreur pour ${file.name}: ${err.detail ?? "Erreur inconnue"}`);
        }
      } catch {
        alert(`Erreur reseau pour ${file.name}`);
      }
      completed++;
      setUploadProgress(Math.round((completed / totalFiles) * 100));
    }

    setUploading(false);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
    fetchPhotos();
  };

  const handleDelete = async (photoId: string) => {
    try {
      const res = await fetch(`/api/pnpi/inspections/${inspectionId}/photos/${photoId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok || res.status === 204) {
        setPhotos((prev) => prev.filter((p) => p.id !== photoId));
        if (enlargedPhoto?.id === photoId) setEnlargedPhoto(null);
      }
    } catch {
      alert("Erreur lors de la suppression");
    }
    setDeleteConfirm(null);
  };

  const photoUrl = (photo: Photo) =>
    `/api/pnpi/inspections/${inspectionId}/photos/${photo.id}/file`;

  return (
    <div className="chart-card" style={{ padding: "1.25rem", marginTop: "1.25rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <h3 style={{ margin: 0, color: "#003F8F", fontSize: "0.95rem" }}>
          Photos de l&apos;inspection ({photos.length})
        </h3>
        <label
          style={{
            padding: "0.4rem 0.75rem",
            background: "#003F8F",
            color: "white",
            borderRadius: "6px",
            fontSize: "0.8rem",
            fontWeight: 600,
            cursor: uploading ? "not-allowed" : "pointer",
            opacity: uploading ? 0.6 : 1,
          }}
        >
          {uploading ? "Upload en cours..." : "+ Ajouter des photos"}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            style={{ display: "none" }}
            disabled={uploading}
            onChange={(e) => handleUpload(e.target.files)}
          />
        </label>
      </div>

      {/* Upload progress */}
      {uploading && (
        <div style={{ marginBottom: "1rem" }}>
          <div
            style={{
              height: "6px",
              background: "#e5e7eb",
              borderRadius: "3px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${uploadProgress}%`,
                background: "#003F8F",
                borderRadius: "3px",
                transition: "width 0.3s ease",
              }}
            />
          </div>
          <p style={{ margin: "0.25rem 0 0", fontSize: "0.75rem", color: "#6b7280" }}>
            Upload : {uploadProgress}%
          </p>
        </div>
      )}

      {loading ? (
        <p style={{ color: "#6b7280", fontSize: "0.875rem", fontStyle: "italic" }}>
          Chargement des photos...
        </p>
      ) : photos.length === 0 ? (
        <div
          style={{
            padding: "2rem",
            textAlign: "center",
            background: "#f9fafb",
            borderRadius: "12px",
            border: "2px dashed #e5e7eb",
          }}
        >
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.875rem" }}>
            Aucune photo pour cette inspection.
          </p>
          <p style={{ margin: "0.25rem 0 0", color: "#4a5568", fontSize: "0.78rem" }}>
            Cliquez sur &quot;Ajouter des photos&quot; pour commencer.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "0.75rem",
          }}
        >
          {photos.map((photo) => (
            <div
              key={photo.id}
              style={{
                position: "relative",
                borderRadius: "10px",
                overflow: "hidden",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                background: "#f9fafb",
                border: "1px solid #e5e7eb",
              }}
            >
              <img
                src={photoUrl(photo)}
                alt={photo.nom_fichier}
                onClick={() => setEnlargedPhoto(photo)}
                style={{
                  width: "100%",
                  height: "160px",
                  objectFit: "cover",
                  cursor: "pointer",
                  display: "block",
                }}
              />
              <div style={{ padding: "0.5rem 0.625rem" }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    color: "#374151",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {photo.nom_fichier}
                </p>
                <p style={{ margin: "0.15rem 0 0", fontSize: "0.68rem", color: "#6b7280" }}>
                  {(photo.taille_octets / 1024).toFixed(0)} Ko &middot;{" "}
                  {new Date(photo.uploaded_at).toLocaleDateString("fr-FR")}
                </p>
                {photo.description && (
                  <p style={{ margin: "0.15rem 0 0", fontSize: "0.68rem", color: "#6b7280" }}>
                    {photo.description}
                  </p>
                )}
              </div>
              {/* Delete button */}
              {deleteConfirm === photo.id ? (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: "rgba(0,0,0,0.7)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                  }}
                >
                  <p style={{ margin: 0, color: "white", fontSize: "0.78rem", fontWeight: 600 }}>
                    Supprimer ?
                  </p>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      onClick={() => handleDelete(photo.id)}
                      style={{
                        padding: "0.3rem 0.75rem",
                        background: "#ef4444",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        fontSize: "0.75rem",
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                    >
                      Oui
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      style={{
                        padding: "0.3rem 0.75rem",
                        background: "white",
                        color: "#374151",
                        border: "none",
                        borderRadius: "6px",
                        fontSize: "0.75rem",
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                    >
                      Non
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setDeleteConfirm(photo.id)}
                  title="Supprimer cette photo"
                  style={{
                    position: "absolute",
                    top: "6px",
                    right: "6px",
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    background: "rgba(0,0,0,0.5)",
                    color: "white",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    lineHeight: 1,
                  }}
                >
                  x
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Enlarged photo modal */}
      {enlargedPhoto && (
        <div
          onClick={() => setEnlargedPhoto(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            cursor: "pointer",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "90vw",
              maxHeight: "90vh",
              position: "relative",
            }}
          >
            <img
              src={photoUrl(enlargedPhoto)}
              alt={enlargedPhoto.nom_fichier}
              style={{
                maxWidth: "90vw",
                maxHeight: "85vh",
                objectFit: "contain",
                borderRadius: "8px",
              }}
            />
            <div
              style={{
                textAlign: "center",
                marginTop: "0.5rem",
                color: "white",
                fontSize: "0.85rem",
              }}
            >
              <strong>{enlargedPhoto.nom_fichier}</strong>
              <span style={{ margin: "0 0.5rem", color: "#6b7280" }}>&middot;</span>
              {(enlargedPhoto.taille_octets / 1024).toFixed(0)} Ko
              <span style={{ margin: "0 0.5rem", color: "#6b7280" }}>&middot;</span>
              {new Date(enlargedPhoto.uploaded_at).toLocaleDateString("fr-FR")}
            </div>
            <button
              onClick={() => setEnlargedPhoto(null)}
              style={{
                position: "absolute",
                top: "-12px",
                right: "-12px",
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "white",
                color: "#374151",
                border: "none",
                cursor: "pointer",
                fontSize: "1rem",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
              }}
            >
              x
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
