# Publishing this catalog to GitHub

`gh` is not required. Create a **public** repo so Squarespace can `fetch` the JSON.

## Option A — GitHub website

1. Create a new public repository (e.g. `desx-website` or `desx-catalog`).
2. On your machine, from this project root:

```powershell
git remote add origin https://github.com/OWNER/REPO.git
git branch -M main
git push -u origin main
```

3. Confirm these URLs load in a browser (replace OWNER/REPO):

```text
https://raw.githubusercontent.com/OWNER/REPO/main/catalog/desx-catalog.json
https://cdn.jsdelivr.net/gh/OWNER/REPO@main/catalog/desx-catalog.json
https://cdn.jsdelivr.net/gh/OWNER/REPO@main/js/desx-catalog.js
https://cdn.jsdelivr.net/gh/OWNER/REPO@main/css/desx-catalog.css
```

4. Update `OWNER/REPO` in:
   - `squarespace/research-code-block.html`
   - `squarespace/tools-code-block.html`
   - `squarespace/WIREUP.md`

## Option B — Catalog-only repo

If you prefer this prototype site to stay private, copy the `catalog/`, `js/desx-catalog.js`, `css/desx-catalog.css`, and `.github/workflows/validate-catalog.yml` folders into a small public repo and point Squarespace at that repo’s jsDelivr URLs.

## CI

Pushing changes under `catalog/` runs `.github/workflows/validate-catalog.yml` (JSON Schema + duplicate id check).
