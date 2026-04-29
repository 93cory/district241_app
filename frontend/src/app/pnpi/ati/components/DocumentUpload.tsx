"use client";
import { useState, useEffect, useRef, useCallback, DragEvent } from "react";

interface DocumentRead {
  id: string;
  ati_id: string;
  nom_fichier: string;
  type_document: string;
  taille_octets: number;
  uploaded_at: string;
  uploaded_by: string;
}

const TYPE_LABELS: Record<string, string> = {
  statuts: "Statuts",
  bilan: "Bilan financier",
  plan_site: "Plan du site",
  certification: "Certification",
  autre: "Autre document",
};

const ACCEPT = ".pdf,.jpg,.jpeg,.png,.doc,.docx";
const MAX_SIZE_MB = 10;

interface QueueItem {
  id: string;
  file: File;
  typeDoc: string;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
  progress?: number;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

function fileExt(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

export function DocumentUpload({
  atiId,
  initialDocs = [],
}: {
  atiId: string;
  initialDocs?: DocumentRead[];
}) {
  const [docs, setDocs] = useState<DocumentRead[]>(initialDocs);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [defaultType, setDefaultType] = useState("autre");
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");
  const dragCounter = useRef(0);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialDocs.length > 0) return;
    fetch(`/api/ati/${encodeURIComponent(atiId)}/documents`)
      .then((r) => (r.ok ? r.json() : Promise.resolve([])))
      .then((data: DocumentRead[]) => setDocs(data))
      .catch(() => {});
  }, [atiId, initialDocs.length]);

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      setError("");
      const valid: QueueItem[] = [];
      const allowed = ACCEPT.split(",").map((e) => e.replace(".", "").trim());

      for (const f of Array.from(files)) {
        const ext = fileExt(f.name);
        if (!allowed.includes(ext)) {
          setError(`"${f.name}" : type non autorise (autorise : ${ACCEPT})`);
          continue;
        }
        if (f.size > MAX_SIZE_MB * 1024 * 1024) {
          setError(`"${f.name}" : depasse ${MAX_SIZE_MB} Mo`);
          continue;
        }
        valid.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          file: f,
          typeDoc: defaultType,
          status: "pending",
        });
      }
      if (valid.length) setQueue((prev) => [...prev, ...valid]);
    },
    [defaultType],
  );

  const removeQueueItem = (id: string) => setQueue((prev) => prev.filter((q) => q.id !== id));
  const updateQueueItem = (id: string, patch: Partial<QueueItem>) =>
    setQueue((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)));

  const uploadOne = async (item: QueueItem) => {
    updateQueueItem(item.id, { status: "uploading" });
    try {
      const form = new FormData();
      form.append("file", item.file);
      form.append("type_document", item.typeDoc);

      const res = await fetch(`/api/ati/${encodeURIComponent(atiId)}/documents`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}) as { detail?: string });
        throw new Error(body.detail ?? `Erreur ${res.status}`);
      }
      const newDoc = (await res.json()) as DocumentRead;
      setDocs((prev) => [newDoc, ...prev]);
      updateQueueItem(item.id, { status: "done" });
      setTimeout(() => removeQueueItem(item.id), 1500);
    } catch (err) {
      updateQueueItem(item.id, {
        status: "error",
        error: err instanceof Error ? err.message : "Erreur",
      });
    }
  };

  const uploadAll = async () => {
    const pending = queue.filter((q) => q.status === "pending" || q.status === "error");
    for (const it of pending) {
      // eslint-disable-next-line no-await-in-loop
      await uploadOne(it);
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
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;
    if (e.dataTransfer?.files?.length) {
      addFiles(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  };

  const handleDelete = async (docId: string, nomFichier: string) => {
    if (!confirm(`Supprimer "${nomFichier}" ?`)) return;
    try {
      const res = await fetch(
        `/api/ati/${encodeURIComponent(atiId)}/documents?docId=${encodeURIComponent(docId)}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      setDocs((prev) => prev.filter((d) => d.id !== docId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur suppression");
    }
  };

  const pendingCount = queue.filter((q) => q.status === "pending" || q.status === "error").length;

  return (
    <div className="chart-card docupload">
      <h3 className="pnpi-card-subtitle">Documents du dossier ({docs.length})</h3>

      {/* Drop zone (label permet le clic natif sur l'input) */}
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
          onChange={(e) => e.target.files && addFiles(e.target.files)}
          className="docupload-input"
          aria-label="Selectionner des fichiers a joindre"
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
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <div className="docupload-text">
          <strong>
            {isDragging ? "Relachez pour ajouter" : "Deposer un ou plusieurs fichiers ici"}
          </strong>
          <span className="docupload-hint">
            ou cliquer pour parcourir &middot; {ACCEPT} &middot; max {MAX_SIZE_MB} Mo
          </span>
        </div>
      </label>

      <div className="docupload-type-row">
        <label htmlFor="docupload-type" className="pnpi-form-label">
          Type par defaut pour les prochains fichiers
        </label>
        <select
          id="docupload-type"
          className="pnpi-form-select"
          value={defaultType}
          onChange={(e) => setDefaultType(e.target.value)}
        >
          {Object.entries(TYPE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="pnpi-form-alert pnpi-form-alert--error docupload-error" role="alert">
          {error}
        </div>
      )}

      {/* File d'attente upload */}
      {queue.length > 0 && (
        <div className="docupload-queue">
          <div className="docupload-queue-head">
            <strong>Fichiers en attente ({queue.length})</strong>
            {pendingCount > 0 && (
              <button type="button" className="btn-primary" onClick={uploadAll}>
                Envoyer les {pendingCount} fichiers
              </button>
            )}
          </div>
          <ul>
            {queue.map((q) => (
              <li key={q.id} className={`docupload-queue-item status-${q.status}`}>
                <div className="docupload-queue-meta">
                  <div className="docupload-queue-name">{q.file.name}</div>
                  <div className="docupload-queue-sub">
                    {formatSize(q.file.size)} &middot; {fileExt(q.file.name).toUpperCase()}
                  </div>
                </div>
                <select
                  className="pnpi-form-select"
                  value={q.typeDoc}
                  onChange={(e) => updateQueueItem(q.id, { typeDoc: e.target.value })}
                  disabled={q.status === "uploading" || q.status === "done"}
                  aria-label={`Type du document ${q.file.name}`}
                >
                  {Object.entries(TYPE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
                <span className={`docupload-status docupload-status--${q.status}`}>
                  {q.status === "pending" && "en attente"}
                  {q.status === "uploading" && "envoi..."}
                  {q.status === "done" && "ajoute"}
                  {q.status === "error" && (q.error ?? "erreur")}
                </span>
                {q.status !== "uploading" && q.status !== "done" && (
                  <button
                    type="button"
                    className="docupload-remove"
                    onClick={() => removeQueueItem(q.id)}
                    aria-label="Retirer de la file"
                  >
                    &times;
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Liste des documents deja uploades */}
      {docs.length === 0 ? (
        <p className="docupload-empty">Aucun document joint pour l&apos;instant.</p>
      ) : (
        <ul className="docupload-list">
          {docs.map((doc) => (
            <li key={doc.id} className="docupload-item">
              <div className="docupload-item-icon" aria-hidden="true">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <div className="docupload-item-body">
                <div className="docupload-item-name">{doc.nom_fichier}</div>
                <div className="docupload-item-meta">
                  {TYPE_LABELS[doc.type_document] ?? doc.type_document} &middot;{" "}
                  {formatSize(doc.taille_octets)} &middot;{" "}
                  {new Date(doc.uploaded_at).toLocaleDateString("fr-FR")} &middot; {doc.uploaded_by}
                </div>
              </div>
              <a
                href={`/api/pnpi/documents/${doc.id}/download`}
                target="_blank"
                rel="noopener noreferrer"
                className="docupload-dl"
                title="Telecharger"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </a>
              <button
                type="button"
                onClick={() => handleDelete(doc.id, doc.nom_fichier)}
                className="docupload-delete"
                aria-label={`Supprimer ${doc.nom_fichier}`}
                title="Supprimer"
              >
                <svg
                  width="16"
                  height="16"
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
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
