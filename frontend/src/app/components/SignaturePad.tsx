"use client";

import { useEffect, useRef, useState, PointerEvent } from "react";

interface Props {
  /** Nom de la personne qui signe (affiche en haut du pad) */
  signerName?: string;
  /** Libelle du bouton de validation */
  confirmLabel?: string;
  /** Largeur max du pad (defaut responsive) */
  width?: number;
  /** Hauteur du pad */
  height?: number;
  /** Appele avec le data-URL PNG de la signature */
  onConfirm: (dataUrl: string) => void | Promise<void>;
  /** Appele a l'annulation */
  onCancel?: () => void;
}

/**
 * Pad de signature tactile / souris pour que l'operateur signe
 * l'accuse de reception d'une inspection sur tablette.
 * Produit un PNG en base64 (data URL).
 */
export function SignaturePad({
  signerName,
  confirmLabel = "Valider la signature",
  width = 520,
  height = 180,
  onConfirm,
  onCancel,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [hasSignature, setHasSignature] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Scale pour retina / HiDPI
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = "#0A1628";

    // Fond blanc explicite (sans quoi PNG pourra etre transparent)
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
  }, [width, height]);

  const getPoint = (e: PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const start = (e: PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    drawingRef.current = true;
    lastPointRef.current = getPoint(e);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const move = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    const last = lastPointRef.current;
    if (!ctx || !last) return;

    const pt = getPoint(e);
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
    lastPointRef.current = pt;
    if (!hasSignature) setHasSignature(true);
  };

  const end = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastPointRef.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const confirm = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) return;
    setBusy(true);
    try {
      const dataUrl = canvas.toDataURL("image/png");
      await onConfirm(dataUrl);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="signature-pad">
      <div className="signature-pad-head">
        <div>
          <div className="signature-pad-title">Signature electronique</div>
          {signerName && <div className="signature-pad-sub">Signataire : <strong>{signerName}</strong></div>}
        </div>
        <button type="button" onClick={clear} className="pnpi-filter-btn" disabled={!hasSignature}>
          Effacer
        </button>
      </div>

      <canvas
        ref={canvasRef}
        className="signature-pad-canvas"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        onPointerCancel={end}
        aria-label="Zone de signature (dessinez avec le doigt ou la souris)"
      />

      <div className="signature-pad-baseline">
        <span className="signature-pad-hint">
          En signant ci-dessus, vous confirmez avoir pris connaissance du contenu de cette inspection.
        </span>
      </div>

      <div className="pnpi-form-actions">
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-secondary" disabled={busy}>
            Annuler
          </button>
        )}
        <button
          type="button"
          onClick={confirm}
          disabled={!hasSignature || busy}
          className="btn-primary"
        >
          {busy ? "Envoi..." : confirmLabel}
        </button>
      </div>
    </div>
  );
}
