#!/usr/bin/env python3
"""Build Squarespace full Code Block HTML from modular CSS + JS."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CSS = (ROOT / "css" / "desx-catalog.css").read_text(encoding="utf-8")
JS = (ROOT / "js" / "desx-catalog.js").read_text(encoding="utf-8")
OUT = ROOT / "squarespace"

CATALOG_URL = (
    "https://raw.githubusercontent.com/justinrburton4/desx-catalog/main/catalog/desx-catalog.json"
)

# Research and tools full pastes have extra UX (year range, result count,
# color badges) that is NOT in js/desx-catalog.js. Never overwrite those
# files from this script.
KINDS = {
    "course": {
        "file": "courses-code-block-full.html",
        "comment": "DesX Learn / Courses Catalog: paste into a Squarespace Code Block on /desx-courses.",
    },
}


def build(kind: str) -> str:
    meta = KINDS[kind]
    return (
        f"<!-- {meta['comment']}\n"
        f"     Self-contained: CSS + mount + JS. data-kind={kind}. -->\n"
        f"<style>\n{CSS}\n</style>\n\n"
        f'<div\n  id="desx-catalog"\n  data-kind="{kind}"\n'
        f'  data-catalog-url="{CATALOG_URL}"\n></div>\n\n'
        f"<script>\n{JS}\n</script>\n"
    )


def main() -> None:
    for kind, meta in KINDS.items():
        path = OUT / meta["file"]
        path.write_text(build(kind), encoding="utf-8")
        print("Wrote", path.name, path.stat().st_size, "bytes")


if __name__ == "__main__":
    main()
