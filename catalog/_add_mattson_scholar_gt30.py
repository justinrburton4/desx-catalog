#!/usr/bin/env python3
"""Add Mattson Scholar papers (>30 cites) missing from desx-catalog + landing packs."""
from __future__ import annotations

import json
import re
import sys
import time
import unicodedata
import urllib.parse
from difflib import SequenceMatcher
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "catalog"))

import generate_research_landing_packs as packs_mod  # noqa: E402

CATALOG = ROOT / "catalog" / "desx-catalog.json"
PACKS = ROOT / "squarespace" / "research-landing-packs.json"
SCHOLAR = ROOT / "catalog" / "_mattson_scholar_gt30.json"
MATCH_THRESHOLD = 0.75


def norm(t: str) -> str:
    t = unicodedata.normalize("NFKD", t or "")
    t = "".join(c for c in t if not unicodedata.combining(c))
    t = t.lower()
    t = re.sub(r"[^a-z0-9]+", " ", t)
    return re.sub(r"\s+", " ", t).strip()


def slugify(title: str) -> str:
    s = norm(title).replace(" ", "-")
    s = re.sub(r"-+", "-", s).strip("-")
    return s[:90].rstrip("-")


def best_match(title: str, research: list[dict]):
    n = norm(title)
    best, best_s = None, 0.0
    for item in research:
        cn = norm(item["title"])
        s = SequenceMatcher(None, n, cn).ratio()
        if n in cn or cn in n:
            s = max(s, 0.92)
        if s > best_s:
            best_s, best = s, item
    return best, best_s


def guess_category(title: str, venue: str) -> str:
    hay = f"{title} {venue}".lower()
    if any(
        k in hay
        for k in (
            "cookstove",
            "developing world",
            "social impact",
            "poverty",
            "ethnography",
            "sustainability space",
            "personification",
            "sustainable development",
        )
    ):
        if "cookstove" in hay and "redesign" in hay:
            return "Engineering For Global Health"
        return "Social impact modeling"
    if "product development: principles" in hay or "springer" in hay and "product development" in hay:
        return "Other"
    return "Systems & Product Architecture"


def is_book(title: str, venue: str, msg: dict | None) -> bool:
    typ = ((msg or {}).get("type") or "").lower()
    if "book" in typ or "monograph" in typ:
        return True
    hay = f"{title} {venue}".lower()
    return "principles and tools for creating desirable" in hay


def guess_badge(msg: dict | None, venue: str) -> str:
    typ = ((msg or {}).get("type") or "").lower()
    if "book" in typ or "monograph" in typ:
        return "whitepaper"
    if "proceeding" in typ or "conference" in typ:
        return "conference"
    v = (venue or "").lower()
    if any(k in v for k in ("conference", "symposium", "congress", "aiaa", "asme", "ghtc", "idet")):
        if "journal" not in v:
            return "conference"
    if "springer nature" in v and "journal" not in v:
        return "whitepaper"
    return "journal"


def catalog_authors_from_crossref(authors: list[dict]) -> list[str]:
    out = []
    for a in authors:
        fam = (a.get("family") or "").strip()
        giv = (a.get("given") or "").strip()
        if not fam:
            continue
        if giv:
            # Compress given names to initials style when long
            parts = giv.replace(".", " ").split()
            inits = " ".join((p[0] + ".") for p in parts if p)
            out.append(f"{fam}, {inits}")
        else:
            out.append(fam)
    return out


def catalog_authors_from_scholar(s: str) -> list[str]:
    # "CA Mattson, AE Wood" -> ["Mattson, C. A.", "Wood, A. E."]
    out = []
    for chunk in re.split(r",\s*|\sand\s+", s):
        chunk = chunk.strip().rstrip(".")
        if not chunk or chunk.lower() in ("et al", "et al."):
            continue
        parts = chunk.split()
        if len(parts) == 1:
            out.append(parts[0])
            continue
        # last token is surname; earlier are initials/names
        fam = parts[-1]
        giv_bits = parts[:-1]
        inits = []
        for g in giv_bits:
            g = g.replace(".", "")
            if not g:
                continue
            # CA -> C. A.
            if len(g) <= 3 and g.isupper():
                inits.extend(c + "." for c in g)
            else:
                inits.append(g[0].upper() + ".")
        out.append(f"{fam}, {' '.join(inits)}".strip())
    return out


def short_abstract(title: str, cr_abs: str) -> str:
    if cr_abs and len(cr_abs) > 40:
        # Keep a short card blurb (~1–2 sentences)
        parts = re.split(r"(?<=[.!?])\s+", cr_abs.strip())
        blurb = " ".join(parts[:2]).strip()
        if len(blurb) > 320:
            blurb = blurb[:297].rsplit(" ", 1)[0] + "…"
        return blurb
    return f"Presents research on {title[0].lower() + title[1:] if title else 'this topic'}."


def crossref_search_title(title: str) -> dict | None:
    q = urllib.parse.urlencode(
        {
            "query.bibliographic": title,
            "rows": "5",
            "select": "DOI,title,author,container-title,published-print,published-online,published,issued,volume,issue,page,abstract,type,publisher,URL",
        }
    )
    url = "https://api.crossref.org/works?" + q
    try:
        data = json.loads(packs_mod.fetch(url).decode("utf-8"))
    except Exception as e:
        print("  crossref search fail:", e)
        return None
    items = (data.get("message") or {}).get("items") or []
    if not items:
        return None
    nt = norm(title)
    best, best_s = None, 0.0
    for it in items:
        it_title = ((it.get("title") or [""])[0]) or ""
        s = SequenceMatcher(None, nt, norm(it_title)).ratio()
        if s > best_s:
            best_s, best = s, it
    if best and best_s >= 0.55:
        print(f"  Crossref match {best_s:.2f}: {(best.get('title') or [''])[0][:70]}")
        return best
    print("  No confident Crossref match")
    return None


def unique_id(base: str, existing: set[str]) -> str:
    if base not in existing:
        return base
    n = 2
    while f"{base}-{n}" in existing:
        n += 1
    return f"{base}-{n}"


def main() -> None:
    scholar = json.loads(SCHOLAR.read_text(encoding="utf-8"))
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    packs = json.loads(PACKS.read_text(encoding="utf-8"))
    research = [i for i in catalog["items"] if i.get("kind") == "research"]
    pack_ids = {p["id"] for p in packs}
    existing_ids = {i["id"] for i in catalog["items"]}

    missing = []
    for p in scholar:
        m, s = best_match(p["title"], research)
        if s < MATCH_THRESHOLD:
            missing.append(p)
        elif m and m["id"] not in pack_ids:
            print(f"WARN matched but no pack: {m['id']}")

    print(f"Missing from catalog: {len(missing)}")
    new_items = []
    new_packs = []

    for idx, p in enumerate(missing, 1):
        print(f"\n[{idx}/{len(missing)}] {p['title'][:80]}")
        if is_book(p["title"], p.get("venue") or "", None):
            print("  skip book")
            continue
        msg = crossref_search_title(p["title"])
        time.sleep(0.35)
        if is_book(p["title"], p.get("venue") or "", msg):
            print("  skip book (Crossref type)")
            continue
        doi = (msg or {}).get("DOI")
        if doi:
            # Prefer full work record
            full = packs_mod.crossref_work(doi)
            if full:
                msg = full
            time.sleep(0.2)

        title = ((msg or {}).get("title") or [None])[0] or p["title"]
        authors_cr = packs_mod.authors_from_crossref(msg) if msg else []
        authors_cat = (
            catalog_authors_from_crossref(authors_cr)
            if authors_cr
            else catalog_authors_from_scholar(p.get("authors") or "")
        )
        year = packs_mod.published_year(msg, p.get("year")) if msg else p.get("year")
        venue = packs_mod.container_title(msg) if msg else (p.get("venue") or "")
        badge = guess_badge(msg, venue or p.get("venue") or "")
        category = guess_category(title, venue or p.get("venue") or "")
        cr_abs = packs_mod.clean_html((msg or {}).get("abstract") or "")
        abstract = short_abstract(title, cr_abs)
        publisher_url = f"https://doi.org/{doi}" if doi else ""
        if not publisher_url and msg and msg.get("URL"):
            publisher_url = msg["URL"]

        base_id = slugify(title)
        item_id = unique_id(base_id, existing_ids)
        existing_ids.add(item_id)

        item = {
            "kind": "research",
            "id": item_id,
            "title": title,
            "abstract": abstract,
            "badge": badge,
            "categories": [category],
            "year": int(year) if year else None,
            "authors": authors_cat,
            "hidden": False,
            "citationCount": int(p.get("cited") or 0),
            "citationSource": "google-scholar",
            "citationsUpdatedAt": "2026-09-08",
        }
        if publisher_url:
            item["publisherUrl"] = publisher_url
        # Drop None year
        if item["year"] is None:
            del item["year"]

        # Build pack using shared citation builder
        cites = packs_mod.build_citations(item, msg, doi, publisher_url or "https://scholar.google.com")
        pack_abstract = cr_abs if len(cr_abs) > len(abstract) + 40 else abstract
        pack = {
            "id": item_id,
            "slug": "/" + item_id,
            "title": cites["resolved_title"],
            "catalog_title": title,
            "abstract": pack_abstract,
            "abstract_source": "crossref" if pack_abstract == cr_abs and cr_abs else "catalog",
            "publisher_url": publisher_url or "",
            "badge": badge,
            "categories": [category],
            "hidden": False,
            "scholar_citations": int(p.get("cited") or 0),
            **cites,
        }
        if not publisher_url:
            pack["notes"] = (pack.get("notes") or []) + [
                "No DOI found — set publisher_url manually before publishing the landing page."
            ]

        new_items.append(item)
        new_packs.append(pack)
        print(f"  -> id={item_id} badge={badge} cat={category} doi={doi}")

    if not new_items:
        print("Nothing to add.")
        return

    # Prepend new research items at the start of items[]
    catalog["items"] = new_items + catalog["items"]
    packs = new_packs + packs

    CATALOG.write_text(json.dumps(catalog, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    PACKS.write_text(json.dumps(packs, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"\nWrote {len(new_items)} catalog items and packs.")


if __name__ == "__main__":
    main()
