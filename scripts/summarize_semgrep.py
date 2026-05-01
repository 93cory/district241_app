"""Summarize semgrep results for the internal pentest report."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "docs" / "audit-securite-interne" / "semgrep.json"


def main() -> None:
    d = json.loads(SRC.read_text(encoding="utf-8"))
    results = d.get("results", [])
    errors = d.get("errors", [])
    print("semgrep findings:", len(results))
    print("semgrep errors:", len(errors))

    by_sev: dict[str, int] = {}
    for r in results:
        sev = r.get("extra", {}).get("severity", "INFO")
        by_sev[sev] = by_sev.get(sev, 0) + 1
    print("by severity:", by_sev)

    for sev in ["ERROR", "WARNING", "INFO"]:
        if sev not in by_sev:
            continue
        print(f"\n=== {sev} ===")
        items = [x for x in results if x.get("extra", {}).get("severity") == sev][:10]
        for r in items:
            rule = r.get("check_id", "").split(".")[-1]
            path = r.get("path", "").replace("\\", "/").split("pnpi/")[-1]
            line = r.get("start", {}).get("line")
            msg = r.get("extra", {}).get("message", "")[:120]
            print(f"  {rule} | {path}:{line} | {msg}")


if __name__ == "__main__":
    main()
