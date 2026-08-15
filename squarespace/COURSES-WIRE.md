# Wire Learn (`/desx-courses`) to the catalog

**Label:** Learn · **URL:** `/desx-courses` (keep both).

## On the page

1. Short intro (one promise line + one supporting sentence). Do not stack duplicate course posters.
2. Paste [`courses-code-block-full.html`](courses-code-block-full.html) into a **Code Block**.
3. Below the catalog (optional): **More ways** with Engineering Design Club → `edx.byu.edu` (Club is **not** a catalog card).
4. Retire `/desx-courses-copy` and any home/nav links that still point at `-copy`.

## After catalog or renderer changes

1. Edit `catalog/desx-catalog.json` (and/or `js` / `css`).
2. Run `python squarespace/build_code_blocks.py`.
3. Re-paste the three full Code Blocks on Research, Tools, and Learn if JS/CSS changed.
4. Push the catalog repo so `raw.githubusercontent.com/.../desx-catalog.json` updates.

## Local preview

Serve the repo root, then open [`preview-courses.html`](preview-courses.html).

## Landing pages

Every course card already uses an on-site slug. Create those Squarespace pages if they don’t exist yet — checklist: [`LANDING-PAGES.md`](LANDING-PAGES.md).
