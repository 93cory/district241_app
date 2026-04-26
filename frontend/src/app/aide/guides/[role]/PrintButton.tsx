"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      className="btn btn-primary"
      onClick={() => {
        if (typeof window !== "undefined") window.print();
      }}
    >
      Télécharger en PDF (Imprimer)
    </button>
  );
}
