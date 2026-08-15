#!/usr/bin/env python3
"""Generate Squarespace landing-page inventory from desx-catalog.json."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CATALOG = ROOT / "desx-catalog.json"
OUT = ROOT.parent / "squarespace" / "LANDING-PAGES.md"


def suggested_slug(item: dict) -> str:
    return "/" + item["id"]


def status(url: str) -> str:
    u = (url or "").strip()
    if not u or u == "#":
        return "MISSING"
    if u.startswith("http"):
        return "EXTERNAL — replace with on-site slug"
    if u.startswith("/"):
        return "ON-SITE path (verify page exists + content)"
    return "CHECK"


def main() -> None:
    data = json.loads(CATALOG.read_text(encoding="utf-8"))
    lines = [
        "# Landing page inventory (launch requirement)",
        "",
        "Every catalog card must open an **on-site Squarespace page**.",
        "",
        "## Your workflow (per item)",
        "",
        "1. Create a Squarespace page; set URL slug to the **Suggested slug** (or choose another and update JSON).",
        "2. For **research**: put title, authors, year, abstract, and citation / DOI link on the page.",
        "3. For **tools**: put title, what it does, how to use it, and download/access instructions.",
        "4. For **courses**: put title, type (course/workshop/guidebook/tutorial), blurb, and materials/links.",
        "5. Update `catalog/desx-catalog.json` → that item’s `url` to `/your-slug`.",
        "6. Commit / push catalog; refresh the live catalog page.",
        "",
        "## Summary",
        "",
    ]

    by_kind: dict[str, list] = {"research": [], "tool": [], "course": []}
    for item in data["items"]:
        by_kind.setdefault(item.get("kind", "?"), []).append(item)

    for kind in ("research", "tool", "course"):
        items = by_kind.get(kind) or []
        ext = sum(
            1
            for i in items
            if status(i.get("url", "")).startswith("EXTERNAL")
            or status(i.get("url", "")) == "MISSING"
        )
        lines.append(
            f"- **{kind}**: {len(items)} cards — **{ext}** still need a new on-site page (or URL swap)"
        )

    lines += ["", "---", ""]

    for kind in ("research", "tool", "course"):
        items = by_kind.get(kind) or []
        lines.append(f"## {kind.title()} ({len(items)})")
        lines.append("")
        lines.append(
            "| Done | Suggested slug | Title | Current url | Status |"
        )
        lines.append("|---|---|---|---|---|")
        for i in sorted(items, key=lambda x: x["id"]):
            slug = suggested_slug(i)
            title = (i.get("title") or "").replace("|", "/")
            cur = (i.get("url") or "").replace("|", "/")
            st = status(i.get("url", ""))
            lines.append(f"| [ ] | `{slug}` | {title} | `{cur}` | {st} |")
        lines.append("")

    lines += [
        "---",
        "",
        "## Squarespace page tips",
        "",
        "- Keep slugs **lowercase kebab-case**, matching `id` when possible.",
        "- Research pages: H1 = paper title; body = abstract + citation; optional PDF embed/link.",
        "- Tool pages: H1 = tool name; short how-to; link to file/app if needed.",
        "- Course pages: H1 = course name; type label; one-paragraph description; start link/materials.",
        "- After creating pages in bulk, batch-update JSON `url` fields in one commit.",
        "",
    ]

    OUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
