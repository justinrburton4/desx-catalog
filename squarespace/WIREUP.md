# Squarespace wire-up — DesX Catalog

After this repo is public on GitHub, replace `OWNER/REPO` below with your real values.

Suggested public URLs (jsDelivr caches GitHub files and is CORS-friendly):

```text
https://cdn.jsdelivr.net/gh/OWNER/REPO@main/catalog/desx-catalog.json
https://cdn.jsdelivr.net/gh/OWNER/REPO@main/js/desx-catalog.js
https://cdn.jsdelivr.net/gh/OWNER/REPO@main/css/desx-catalog.css
```

Raw GitHub also works for public repos:

```text
https://raw.githubusercontent.com/OWNER/REPO/main/catalog/desx-catalog.json
```

The full Code Blocks (`research-code-block-full.html`, `tools-code-block-full.html`) ask GitHub for the latest commit and load that JSON, so you do not bump `?v=` when the catalog changes. Re-paste those blocks only when you change the renderer itself.

---

## 1. Custom CSS (site-wide or page)

Paste the contents of [`../css/desx-catalog.css`](../css/desx-catalog.css) into **Design → Custom CSS**,  
**or** load it from GitHub in **Settings → Advanced → Code Injection → Header**:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/OWNER/REPO@main/css/desx-catalog.css?v=1" />
```

---

## 2. Research page (`/desx-pub-index`)

1. Remove the old hand-written publication Code Block HTML (keep any intro text you still want).
2. Add a **Code** block with:

```html
<div
  id="desx-catalog"
  data-kind="research"
  data-catalog-url="https://cdn.jsdelivr.net/gh/OWNER/REPO@main/catalog/desx-catalog.json?v=1"
></div>
<script src="https://cdn.jsdelivr.net/gh/OWNER/REPO@main/js/desx-catalog.js?v=1" defer></script>
```

3. Remove or hide the Squarespace Search block on that page if you no longer want site-wide search there.

---

## 3. Tools page (`/desx-tools`)

1. Remove the old image-poster grid (or leave it hidden while testing on a copy page).
2. Add a **Code** block with:

```html
<div
  id="desx-catalog"
  data-kind="tool"
  data-catalog-url="https://cdn.jsdelivr.net/gh/OWNER/REPO@main/catalog/desx-catalog.json?v=1"
></div>
<script src="https://cdn.jsdelivr.net/gh/OWNER/REPO@main/js/desx-catalog.js?v=1" defer></script>
```

---

## 4. Test copies first

Duplicate `/desx-pub-index` and `/desx-tools` (like `home-copy-for-test`), wire the Code blocks on the copies, confirm search + arrows + tools grid, then swap production.

---

## 5. After adding catalog items on GitHub

1. Merge the commit to `main`.
2. Hard-refresh the Squarespace page. Catalog JSON updates do not need a Code Block edit.
3. jsDelivr may lag a minute; raw GitHub is usually immediate.

---

## 6. People page (`/people`)

Same fetch pattern as Research/Tools. Data: `catalog/desx-people.json`. Photos: `people/photos/` (missing photos use `placeholder.png`).

1. Keep any intro text you want in Squarespace above the Code Block.
2. Remove the old hand-built member blocks.
3. Add a **Code** block and paste [`people-code-block-full.html`](people-code-block-full.html).
4. Optional: paste [`../css/desx-people.css`](../css/desx-people.css) into Custom CSS instead of relying on the inlined `<style>` if you prefer one site-wide sheet.

Form onboarding (Google Form → GitHub PR): [`../catalog/people-form/SETUP.md`](../catalog/people-form/SETUP.md).

Local preview: [`preview-people.html`](preview-people.html).
