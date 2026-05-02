"""Bundle hors-ligne pour l'audience ministerielle.

Cree un dossier `Desktop/PNPI-Audience-USB/` pret a copier sur cle USB :
  - PDFs presentation + 5 docs strategie + audit securite + 16 docs architecture
  - Video MP4 40s
  - DB seedee (pnpi.db) + script de boot offline
  - Snapshot du repo (tar.gz) sans node_modules / .venv / .next
  - README expliquant comment lancer la demo si le wifi tombe
"""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
import tarfile
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DESKTOP = Path(os.environ["USERPROFILE"]) / "Desktop"
BUNDLE = DESKTOP / "PNPI-Audience-USB"

PDF_SOURCES = [
    "docs/presentation-ministerielle.html",
    "docs/architecture/pdf",
    "docs/audit-securite-interne",
    "docs/strategie",
]

# Fichiers atomiques a inclure
EXTRA_FILES = [
    ("docs/charte-graphique.html", "01-design/charte-graphique.html"),
    ("docs/glossaire-ati.html", "01-design/glossaire-ati.html"),
    ("Desktop/PNPI-presentation.mp4", "02-video/PNPI-presentation.mp4"),
    ("backend/pnpi.db", "03-demo-offline/pnpi.db"),
    ("frontend/public/pnpi-logo.svg", "01-design/pnpi-logo.svg"),
]

# Exclusions pour le snapshot tar.gz
EXCLUDE_DIRS = {
    "node_modules", ".venv", ".venv312", ".venv-1", ".next", ".dart_tool",
    "build", "out", "__pycache__", ".pytest_cache", ".ruff_cache",
    ".playwright-mcp", ".github", ".idea", ".vscode", ".history",
}
EXCLUDE_GLOBS = {".db", ".db.backup", ".log", ".tsbuildinfo"}


def copy_pdfs() -> None:
    target_pdfs = BUNDLE / "00-dossier-pdf"
    target_pdfs.mkdir(parents=True, exist_ok=True)

    for src in PDF_SOURCES:
        path = ROOT / src
        if not path.exists():
            print(f"  ! absent : {src}")
            continue
        if path.is_file() and path.suffix in {".pdf", ".html"}:
            shutil.copy2(path, target_pdfs / path.name)
            print(f"  [OK] {src}")
        elif path.is_dir():
            for f in path.glob("*.pdf"):
                shutil.copy2(f, target_pdfs / f.name)
                print(f"  [OK] {f.relative_to(ROOT)}")


def copy_extras() -> None:
    desktop_root = Path(os.environ["USERPROFILE"]) / "Desktop"
    for src, dst in EXTRA_FILES:
        if src.startswith("Desktop/"):
            source = desktop_root / src.replace("Desktop/", "", 1)
        else:
            source = ROOT / src
        if not source.exists():
            print(f"  ! absent : {src}")
            continue
        target = BUNDLE / dst
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
        print(f"  [OK] {src} -> {dst}")


def write_readme() -> None:
    readme = BUNDLE / "LISEZ-MOI.md"
    readme.write_text(
        f"""# PNPI - Bundle audience USB

Genere le {datetime.now().strftime('%Y-%m-%d %H:%M')} pour l'audience au Ministere
de l'Industrie du Gabon (semaine du 5-10 mai 2026).

## Contenu

```
PNPI-Audience-USB/
  00-dossier-pdf/        Presentation + 5 docs strategie + audit + 16 architecture
  01-design/             Charte graphique, glossaire ATI, logo
  02-video/              Video Remotion 40s (MP4 1920x1080)
  03-demo-offline/       Base SQLite seedee + script de boot
  04-snapshot-code/      Code source complet (tar.gz, sans node_modules)
  LISEZ-MOI.md           Ce fichier
```

## En cas de panne wifi pendant l'audience

### Plan A - Demo live habituelle (necessite internet)
1. Demarrer backend  : cd backend && python -m uvicorn app.main:app --port 8000
2. Demarrer frontend : cd frontend && npm run dev
3. Ouvrir            : http://localhost:3000

### Plan B - Demo offline depuis cette cle
1. Copier `03-demo-offline/pnpi.db` vers `backend/pnpi.db`
2. Backend boot offline (deja teste, fastapi 0.136.1 + python-jose 3.5.0)
3. Frontend pre-build dans `04-snapshot-code/` (`npm run build && npm start`)

### Plan C - Pas de laptop, juste la cle
1. Ouvrir les PDFs du dossier `00-dossier-pdf/` directement
2. Lire la **presentation-ministerielle** en premier
3. Lancer la **video** depuis `02-video/`

## Comptes de demonstration

Tous les mots de passe : `<Role>@PNPI2026!`
- admin / Admin@PNPI2026!
- ministre / Ministre@PNPI2026!
- directeur / Directeur@PNPI2026!
- instructeur / Instructeur@PNPI2026!
- inspecteur / Inspecteur@PNPI2026!
- operateur / Operateur@PNPI2026!

## Contacts

Jean Baptiste MBA NDONG, concepteur PNPI
- Email : corymba0@gmail.com
- Tel   : (a completer)
- GitHub: https://github.com/93cory/pnpi-gabon
""",
        encoding="utf-8",
    )
    print(f"  [OK] LISEZ-MOI.md")


def make_snapshot() -> None:
    target = BUNDLE / "04-snapshot-code" / f"pnpi-source-{datetime.now():%Y%m%d}.tar.gz"
    target.parent.mkdir(parents=True, exist_ok=True)

    def filter_fn(tarinfo: tarfile.TarInfo) -> tarfile.TarInfo | None:
        parts = tarinfo.name.split("/")
        if any(p in EXCLUDE_DIRS for p in parts):
            return None
        if any(tarinfo.name.endswith(ext) for ext in EXCLUDE_GLOBS):
            return None
        return tarinfo

    print(f"  Snapshot vers {target.name}...")
    with tarfile.open(target, "w:gz", compresslevel=6) as tar:
        for item in ROOT.iterdir():
            if item.name in EXCLUDE_DIRS or item.name.startswith("."):
                continue
            tar.add(item, arcname=item.name, filter=filter_fn)
    size_mb = target.stat().st_size / (1024 * 1024)
    print(f"  [OK] tar.gz : {size_mb:.1f} MB")


def main() -> None:
    if BUNDLE.exists():
        print(f"Suppression de l'ancien bundle : {BUNDLE}")
        shutil.rmtree(BUNDLE)
    BUNDLE.mkdir(parents=True)
    print(f"Bundle vers : {BUNDLE}\n")

    print("== PDFs ==")
    copy_pdfs()
    print("\n== Extras ==")
    copy_extras()
    print("\n== README ==")
    write_readme()
    print("\n== Snapshot tar.gz ==")
    make_snapshot()

    total_size = sum(f.stat().st_size for f in BUNDLE.rglob("*") if f.is_file())
    print(f"\n== Resultat ==")
    print(f"Bundle taille totale : {total_size / (1024 * 1024):.1f} MB")
    print(f"Pret a copier sur cle USB : {BUNDLE}")


if __name__ == "__main__":
    main()
