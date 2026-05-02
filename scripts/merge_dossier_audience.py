"""Fusionne les 6 PDFs cles en un seul dossier relie pour l'audience.

Ordre voulu (du plus general au plus technique) :
  1. Pitch + script demo + Q/R + comparatifs
  2. Cadrage strategique (posture C)
  3. Pricing (Option Avancee 28 MFCFA)
  4. Modele financier
  5. Convention / protocole
  6. Audit securite interne preliminaire

Le PDF unifie est destine a etre imprime et relie chez un imprimeur Libreville.
"""

from __future__ import annotations

from pathlib import Path

from pypdf import PdfWriter

ROOT = Path(__file__).resolve().parent.parent
PDF_DIR = ROOT / "docs" / "architecture" / "pdf"

DOCS = [
    "00-pitch-et-questions.pdf",
    "01-cadrage-strategique.pdf",
    "02-pricing-pnpi.pdf",
    "03-modele-financier.pdf",
    "04-convention-protocole.pdf",
    "00-rapport-audit-interne.pdf",
]

OUTPUT_NAME = "PNPI-Dossier-Audience-Ministerielle.pdf"


def main() -> None:
    writer = PdfWriter()
    total_pages = 0

    for name in DOCS:
        path = PDF_DIR / name
        if not path.exists():
            print(f"  ! ABSENT : {path}")
            continue
        writer.append(str(path))
        from pypdf import PdfReader
        n = len(PdfReader(str(path)).pages)
        total_pages += n
        print(f"  [OK] {name} ({n} pages)")

    out_root = ROOT / "docs" / "audience" / OUTPUT_NAME
    out_root.parent.mkdir(parents=True, exist_ok=True)
    with open(out_root, "wb") as f:
        writer.write(f)

    out_desktop = (
        Path.home() / "Desktop" / "PNPI-Audience-USB" / "00-dossier-pdf" / OUTPUT_NAME
    )
    out_desktop.parent.mkdir(parents=True, exist_ok=True)
    with open(out_desktop, "wb") as f:
        writer.write(f)

    size_kb = out_root.stat().st_size / 1024
    print(f"\n== Resultat ==")
    print(f"PDF unifie : {total_pages} pages, {size_kb:.0f} KB")
    print(f"  - {out_root}")
    print(f"  - {out_desktop}")
    print("\nA imprimer en A4, recto-verso, reliure spirale ou dos colle.")


if __name__ == "__main__":
    main()
