"""Convertit les docs Markdown en PDF stylises (drapeau Gabon).

Pipeline : MD -> HTML stylise -> Chrome headless --print-to-pdf -> PDF.

Usage:
    python scripts/md_to_pdf.py                  # tous les docs
    python scripts/md_to_pdf.py docs/architecture/00-index.md
"""

from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

import markdown

REPO = Path(__file__).resolve().parents[1]

CHROME_CANDIDATES = [
    Path("C:/Program Files/Google/Chrome/Application/chrome.exe"),
    Path("C:/Program Files (x86)/Google/Chrome/Application/chrome.exe"),
    Path("C:/Program Files/Microsoft/Edge/Application/msedge.exe"),
]


def find_chrome() -> Path | None:
    for c in CHROME_CANDIDATES:
        if c.exists():
            return c
    for cmd in ("chrome", "google-chrome", "msedge"):
        path = shutil.which(cmd)
        if path:
            return Path(path)
    return None


CSS = """
@page { size: A4; margin: 18mm 16mm; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: "Inter", system-ui, sans-serif; color: #051B36; background: #FAF8F4; line-height: 1.65; font-size: 14px; }
.page { max-width: 880px; margin: 0 auto; padding: 50px 40px; }
.flag-bar { display: flex; height: 4px; margin-bottom: 28px; }
.flag-bar span { flex: 1; }
.flag-bar span:nth-child(1) { background: #009E60; }
.flag-bar span:nth-child(2) { background: #FCD116; }
.flag-bar span:nth-child(3) { background: #003DA5; }
.meta { font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; color: #526175; margin-bottom: 12px; }
h1 { font-family: "Playfair Display", Georgia, serif; font-size: 36px; font-weight: 800; letter-spacing: -0.015em; line-height: 1.1; margin: 0 0 18px; color: #051B36; }
h2 { font-family: "Playfair Display", Georgia, serif; font-size: 24px; font-weight: 700; margin: 44px 0 16px; padding-bottom: 8px; border-bottom: 2px solid #009E60; color: #051B36; page-break-after: avoid; }
h3 { font-size: 17px; font-weight: 700; margin: 26px 0 10px; color: #051B36; page-break-after: avoid; }
h4 { font-size: 14px; font-weight: 700; margin: 18px 0 8px; color: #003DA5; }
p { font-size: 14px; line-height: 1.7; margin: 10px 0; }
strong { color: #051B36; font-weight: 700; }
em { font-family: "Cormorant Garamond", Georgia, serif; font-style: italic; font-weight: 600; }
ul, ol { padding-left: 22px; margin: 10px 0; }
li { font-size: 14px; line-height: 1.7; margin: 4px 0; }
blockquote { border-left: 4px solid #FCD116; background: rgba(252,209,22,0.08); padding: 14px 22px; margin: 18px 0; font-family: "Cormorant Garamond", serif; font-style: italic; font-size: 16px; }
blockquote p { margin: 4px 0; }
code { font-family: "JetBrains Mono", Consolas, monospace; background: #F4F1EA; padding: 1px 6px; border-radius: 4px; font-size: 12px; color: #051B36; }
pre { background: #051B36; color: #e2e8f0; padding: 16px 18px; border-radius: 8px; font-size: 12px; line-height: 1.55; overflow-x: auto; margin: 14px 0; page-break-inside: avoid; }
pre code { background: transparent; color: inherit; padding: 0; }
table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); border-radius: 8px; overflow: hidden; background: #fff; page-break-inside: avoid; }
th { background: #051B36; color: #fff; text-align: left; padding: 10px 14px; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; }
td { padding: 9px 14px; border-bottom: 1px solid #E2DDD2; vertical-align: top; }
tr:last-child td { border-bottom: none; }
tr:nth-child(even) td { background: rgba(0,158,96,0.03); }
hr { border: 0; height: 1px; background: #E2DDD2; margin: 32px 0; }
a { color: #003DA5; text-decoration: none; }
a:hover { text-decoration: underline; }
.footer { margin-top: 56px; padding-top: 18px; border-top: 1px solid #E2DDD2; font-size: 10px; color: #526175; text-align: center; letter-spacing: 0.04em; }
"""

HTML_TEMPLATE = """<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>{title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500;1,600&family=Inter:wght@300;400;500;600;700;800&family=Playfair+Display:wght@600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap" />
<style>{css}</style>
</head>
<body>
<div class="page">
<div class="flag-bar"><span></span><span></span><span></span></div>
<div class="meta">{meta}</div>
{body}
<div class="footer">PNPI · Plateforme Nationale de Pilotage Industriel · Ministère de l'Industrie et de la Transformation Locale · République Gabonaise</div>
</div>
</body>
</html>
"""


def md_to_html(md_path: Path) -> tuple[str, str]:
    text = md_path.read_text(encoding="utf-8")
    md = markdown.Markdown(
        extensions=["tables", "fenced_code", "toc", "attr_list", "sane_lists", "footnotes"],
        extension_configs={"toc": {"permalink": False}},
    )
    body_html = md.convert(text)

    # Extraire le 1er <h1> comme titre, sinon nom de fichier
    title = md_path.stem.replace("-", " ").replace("_", " ").title()
    if "<h1>" in body_html:
        start = body_html.index("<h1>") + 4
        end = body_html.index("</h1>", start)
        title = body_html[start:end]

    meta_dir = md_path.parent.name.upper()
    meta = f"PNPI · {meta_dir} · {md_path.name}"

    return title, HTML_TEMPLATE.format(title=title, css=CSS, body=body_html, meta=meta)


def html_to_pdf(chrome: Path, html_path: Path, pdf_path: Path) -> bool:
    pdf_path.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        str(chrome),
        "--headless=new",
        "--disable-gpu",
        "--no-pdf-header-footer",
        f"--print-to-pdf={pdf_path}",
        f"file:///{html_path.resolve().as_posix()}",
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, timeout=60)
        return pdf_path.exists() and pdf_path.stat().st_size > 1000
    except subprocess.TimeoutExpired:
        return False


def main() -> int:
    chrome = find_chrome()
    if not chrome:
        print("ERREUR : Chrome / Edge introuvable. Installation requise pour generer les PDFs.")
        return 1
    print(f"Chrome trouve : {chrome}")

    args = sys.argv[1:]
    if args:
        sources = [Path(a) for a in args]
    else:
        sources = sorted(
            list((REPO / "docs" / "architecture").glob("*.md"))
            + [REPO / "docs" / "deployment-guide.md"]
        )

    out_dir = REPO / "docs" / "architecture" / "pdf"
    out_dir.mkdir(parents=True, exist_ok=True)

    ok, fail = 0, 0
    for md in sources:
        if not md.exists():
            print(f"  [SKIP] {md} introuvable")
            continue
        try:
            title, html = md_to_html(md)
            html_path = out_dir / f"{md.stem}.html"
            html_path.write_text(html, encoding="utf-8")
            pdf_path = out_dir / f"{md.stem}.pdf"
            if html_to_pdf(chrome, html_path, pdf_path):
                size_kb = pdf_path.stat().st_size // 1024
                print(f"  [OK]  {md.name} -> {pdf_path.name} ({size_kb} KB)")
                ok += 1
            else:
                print(f"  [FAIL] {md.name} -> Chrome echec")
                fail += 1
        except Exception as e:
            print(f"  [EXC] {md.name} -> {e}")
            fail += 1

    print(f"\n=== Resultat : {ok} PDFs generes, {fail} echecs ===")
    print(f"Dossier de sortie : {out_dir}")
    return 0 if fail == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
