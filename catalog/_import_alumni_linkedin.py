#!/usr/bin/env python3
"""Merge LinkedIn URLs from past-group-members into catalog/desx-people.json."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
JSON_PATH = ROOT / "catalog" / "desx-people.json"

# Scraped from https://www.design.byu.edu/past-group-members (2026-09-04)
ALUMNI_LINKEDIN = {
    "jeff-allen": "https://www.linkedin.com/in/jeffreydallen/",
    "stephen-harston": "https://www.linkedin.com/in/sharston/",
    "brad-larson": "https://www.linkedin.com/in/brad-larson-5446b73/",
    "patrick-lewis": "https://www.linkedin.com/in/patrick-lewis-phd-a3172713/",
    "amy-wood": "https://www.linkedin.com/in/amywood552/",
    "hans-ottosson": "https://www.linkedin.com/in/hansottosson/",
    "nikki-anderson": "https://www.linkedin.com/in/nicole-nikki-hill-9151ba8/",
    "travis-anderson": "https://www.linkedin.com/in/travisvanderson/",
    "garrett-barnum": "https://www.linkedin.com/in/garrettbarnum/",
    "eric-bowman": "https://www.linkedin.com/in/k-eric-bowman/",
    "robert-campbell": "https://www.linkedin.com/in/robert-campbell-b8004125/",
    "shane-curtis": "https://www.linkedin.com/in/shane-curtis-4164583b/",
    "neil-haddock": "https://www.linkedin.com/in/ndhaddock/",
    "darren-knight": "https://www.linkedin.com/in/darrenknight/",
    "devin-lebaron": "https://www.linkedin.com/in/devin-lebaron-68630a63/",
    "jacob-morrise": "https://www.linkedin.com/in/jacobmorrise/",
    "andrew-pack": "https://www.linkedin.com/in/andrew-pack/",
    "morgan-tackett": "https://www.linkedin.com/in/tackettm/",
    "kendall-thacker": "https://www.linkedin.com/in/kendall-thacker/",
    "nicholas-wasley": "https://www.linkedin.com/in/nick-w-3a86a864/",
    "jason-watson": "https://www.linkedin.com/in/jaswatson/",
    "jonathon-yearsley": "https://www.linkedin.com/in/jonathan-yearsley/",
    "andy-armstrong": "https://www.linkedin.com/in/andrew-g-armstrong-9970aa153/",
    "dan-richards": "https://www.linkedin.com/in/dcr-richards/",
    "trent-owens": "https://www.linkedin.com/in/trent-owens/",
    "brandon-bryson": "https://www.linkedin.com/in/brandonbryson52/",
    "marin-fisher": "https://www.linkedin.com/in/marin-fisher/",
    "gabrielle-johnson": "https://www.linkedin.com/in/gabrielle-johnson-future-engineer/",
    "joseph-liechty": "https://www.linkedin.com/in/joseph-liechty/",
}


def main() -> None:
    catalog = json.loads(JSON_PATH.read_text(encoding="utf-8"))
    by_id = {p["id"]: p for p in catalog.get("people", [])}
    added = 0
    skipped = 0
    missing = []
    for pid, url in ALUMNI_LINKEDIN.items():
        person = by_id.get(pid)
        if not person:
            missing.append(pid)
            continue
        links = person.setdefault("links", {})
        if links.get("linkedin") == url:
            skipped += 1
            continue
        links["linkedin"] = url
        # Prefer LinkedIn label over a duplicate website URL
        if links.get("website") and "linkedin.com" in str(links["website"]).lower():
            del links["website"]
        added += 1
        print(f"  + {pid}")
    JSON_PATH.write_text(json.dumps(catalog, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Updated {added}, unchanged {skipped}, missing ids {missing}")


if __name__ == "__main__":
    main()
