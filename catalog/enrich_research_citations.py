#!/usr/bin/env python3
"""Normalize research URLs and refresh citation counts from OpenAlex.

- `url` is kept for on-site slugs only (paths starting with /).
- `publisherUrl` holds the external paper link (usually https://doi.org/...).
- Bare DOI is parsed from publisherUrl at enrich time (not hand-edited).
- `citationCount` is written back from OpenAlex when a DOI is available.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CATALOG_PATH = ROOT / "catalog" / "desx-catalog.json"
PACKS_PATH = ROOT / "squarespace" / "research-landing-packs.json"
MAILTO = "desx-catalog@byu.edu"
DOI_IN_URL = re.compile(r"doi\.org/(10\.[^\s?#]+)", re.IGNORECASE)
DOI_BARE = re.compile(r"^10\.\d{4,9}/\S+$", re.IGNORECASE)


def load_json(path: Path) -> object:
    return json.loads(path.read_text(encoding="utf-8"))


def save_json(path: Path, data: object) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def is_slug(url: str | None) -> bool:
    return bool(url and url.startswith("/"))


def is_doi_url(url: str | None) -> bool:
    return bool(url and "doi.org/" in url.lower())


def normalize_slug(value: str | None) -> str | None:
    if not value:
        return None
    slug = value.strip()
    if not slug:
        return None
    if not slug.startswith("/"):
        slug = "/" + slug
    return slug


def parse_doi(*values: str | None) -> str | None:
    for value in values:
        if not value:
            continue
        text = value.strip()
        match = DOI_IN_URL.search(text)
        if match:
            return match.group(1).rstrip(".,;)")
        if DOI_BARE.match(text):
            return text.rstrip(".,;)")
    return None


def publisher_url_from_pack(pack: dict) -> str | None:
    if pack.get("publisher_url"):
        return str(pack["publisher_url"]).strip()
    doi = pack.get("doi")
    if doi:
        doi = str(doi).strip().removeprefix("https://doi.org/").removeprefix("http://doi.org/")
        if doi.startswith("10."):
            return f"https://doi.org/{doi}"
    return None


def migrate_research_item(item: dict, pack: dict | None) -> dict[str, str | None]:
    """Return {url, publisherUrl} after normalization."""
    current_url = str(item.get("url") or "").strip()
    publisher = str(item.get("publisherUrl") or "").strip() or None
    slug = normalize_slug(current_url) if is_slug(current_url) else None

    pack_publisher = publisher_url_from_pack(pack) if pack else None

    if not publisher:
        if is_doi_url(current_url):
            publisher = current_url
        elif pack_publisher:
            publisher = pack_publisher

    # Only keep on-site slugs that are already in the catalog (live landing pages).
    # Do not auto-assign slugs from landing packs — cards should fall back to
    # publisherUrl until a landing page is explicitly published.
    return {"url": slug, "publisherUrl": publisher}


def openalex_headers() -> dict[str, str]:
    headers = {
        "User-Agent": f"DesXCitationEnricher/1.0 (mailto:{MAILTO})",
        "Accept": "application/json",
    }
    api_key = os.environ.get("OPENALEX_API_KEY", "").strip()
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    return headers


def fetch_openalex_citation_count(doi: str) -> int | None:
    encoded = urllib.parse.quote(doi, safe="")
    url = f"https://api.openalex.org/works/https://doi.org/{encoded}"
    req = urllib.request.Request(url, headers=openalex_headers())
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as err:
        if err.code == 404:
            return None
        raise
    count = payload.get("cited_by_count")
    if count is None:
        return None
    return int(count)


def enrich_catalog(*, fetch: bool, delay: float) -> dict[str, int]:
    catalog = load_json(CATALOG_PATH)
    packs_list = load_json(PACKS_PATH)
    packs = {p["id"]: p for p in packs_list if isinstance(p, dict) and p.get("id")}

    stats = {
        "research": 0,
        "with_slug": 0,
        "with_publisher": 0,
        "with_doi": 0,
        "citations_fetched": 0,
        "citations_missing": 0,
        "citations_skipped": 0,
    }

    today = date.today().isoformat()

    for item in catalog.get("items", []):
        if not isinstance(item, dict) or item.get("kind") != "research":
            continue

        stats["research"] += 1
        pack = packs.get(item["id"])
        migrated = migrate_research_item(item, pack)

        if migrated["url"]:
            item["url"] = migrated["url"]
            stats["with_slug"] += 1
        else:
            item.pop("url", None)

        if migrated["publisherUrl"]:
            item["publisherUrl"] = migrated["publisherUrl"]
            stats["with_publisher"] += 1
        else:
            item.pop("publisherUrl", None)

        if not item.get("url") and not item.get("publisherUrl"):
            print(f"[warn] No link for research item: {item.get('id')}", file=sys.stderr)

        doi = parse_doi(item.get("publisherUrl"))
        if doi:
            stats["with_doi"] += 1
        else:
            item.pop("citationCount", None)
            item.pop("citationSource", None)
            item.pop("citationsUpdatedAt", None)
            stats["citations_skipped"] += 1
            continue

        if not fetch:
            continue

        try:
            count = fetch_openalex_citation_count(doi)
        except Exception as err:  # noqa: BLE001
            print(f"[warn] OpenAlex failed for {item.get('id')} ({doi}): {err}", file=sys.stderr)
            stats["citations_missing"] += 1
            time.sleep(delay)
            continue

        if count is None:
            item.pop("citationCount", None)
            item.pop("citationSource", None)
            item.pop("citationsUpdatedAt", None)
            stats["citations_missing"] += 1
        else:
            item["citationCount"] = count
            item["citationSource"] = "openalex"
            item["citationsUpdatedAt"] = today
            stats["citations_fetched"] += 1

        time.sleep(delay)

    save_json(CATALOG_PATH, catalog)
    return stats


def main() -> None:
    parser = argparse.ArgumentParser(description="Normalize research URLs and refresh OpenAlex citations.")
    parser.add_argument(
        "--skip-fetch",
        action="store_true",
        help="Only migrate url/publisherUrl fields; do not call OpenAlex.",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=0.12,
        help="Seconds between OpenAlex requests (default: 0.12).",
    )
    args = parser.parse_args()
    stats = enrich_catalog(fetch=not args.skip_fetch, delay=args.delay)
    print(json.dumps(stats, indent=2))


if __name__ == "__main__":
    main()
