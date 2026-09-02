# -*- coding: utf-8 -*-
"""Apply research landing slug overrides to desx-catalog.json and research-landing-packs.json."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OVERRIDES = json.loads(
    (ROOT / "catalog/research-landing-slug-overrides.json").read_text(encoding="utf-8")
)["slugs"]

catalog_path = ROOT / "catalog/desx-catalog.json"
catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
updated = 0
for item in catalog["items"]:
    if item.get("kind") != "research":
        continue
    pid = item["id"]
    if pid not in OVERRIDES:
        continue
    new_url = OVERRIDES[pid]
    if item.get("url") != new_url:
        item["url"] = new_url
        updated += 1
        print(f"catalog: {pid} -> {new_url}")

catalog_path.write_text(json.dumps(catalog, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print(f"Updated {updated} catalog urls")

packs_path = ROOT / "squarespace/research-landing-packs.json"
packs = json.loads(packs_path.read_text(encoding="utf-8"))
pack_updated = 0
for pack in packs:
    pid = pack["id"]
    if pid not in OVERRIDES:
        continue
    new_slug = OVERRIDES[pid]
    if pack.get("slug") != new_slug:
        pack["slug"] = new_slug
        pack_updated += 1
        print(f"pack: {pid} -> {new_slug}")

packs_path.write_text(json.dumps(packs, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print(f"Updated {pack_updated} pack slugs")
