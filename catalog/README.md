# DesX Shared Catalog

JSON databases power **Research**, **Tools**, **Courses**, and **People** on [design.byu.edu](https://www.design.byu.edu/).

To add a paper or tool, follow **[How to add a Research paper or Tool](HOW-TO-ADD.md)**.

## Files

| File | Purpose |
|------|---------|
| [`HOW-TO-ADD.md`](HOW-TO-ADD.md) | How to create and add a research or tool block |
| [`PEOPLE.md`](PEOPLE.md) | People directory (JSON, photos, Google Form → PR) |
| [`desx-catalog.json`](desx-catalog.json) | Live catalog — paste new items at the **top** of `items` |
| [`desx-people.json`](desx-people.json) | Lab members and alumni |
| [`schema.json`](schema.json) | JSON Schema used by CI validation |
| [`schema-people.json`](schema-people.json) | People directory schema |
| [`templates/research.template.json`](templates/research.template.json) | Copy-paste template for a paper |
| [`templates/tool.template.json`](templates/tool.template.json) | Copy-paste template for a tool |

## How to add a paper or tool

1. Open the matching template file and copy the whole object `{ ... }`.
2. Fill in every required field (see below). Keep valid JSON: double quotes, commas between fields, **no trailing comma** after the last field.
3. Open [`desx-catalog.json`](desx-catalog.json).
4. Paste your object as the **first** element inside the `"items"` array (newest / highest priority at the top).
5. Put a comma after your object if another item follows.
6. Commit to GitHub (or open a PR). After merge, refresh the Research or Tools page — they load the latest JSON automatically.

### Research required fields

- `kind`: must be `"research"`
- `id`: unique slug (e.g. `"social-impact-evaluation-analysis"`)
- `title`, `abstract`, `url`, `image`
- `badge`: `"journal"` | `"conference"` | `"whitepaper"`
- `categories`: array of row names; include `"Featured"` to show in the Featured row

Optional: `year`, `authors`

### Tool required fields

- `kind`: must be `"tool"`
- `id`: unique slug
- `title`, `blurb`, `url`, `image`
- `categories`: array (used for grouping/filtering)

### Images

Prefer Squarespace CDN URLs (`images.squarespace-cdn.com/...`). External journal CDN links can expire — re-host on Squarespace when possible.

### Categories (research rows)

Row order is controlled by `categoryOrder` in `desx-catalog.json`. An item can list multiple categories and will appear in each matching row.

## Local preview

Open [`../squarespace/preview-research.html`](../squarespace/preview-research.html) or [`../squarespace/preview-tools.html`](../squarespace/preview-tools.html) with a local static server so `fetch` can load the JSON:

```bash
# from repo root
npx --yes serve .
```

Then visit `/squarespace/preview-research.html` and `/squarespace/preview-tools.html`.

## Squarespace install

See [`../squarespace/WIREUP.md`](../squarespace/WIREUP.md).

## Publish to GitHub

See [`GITHUB.md`](GITHUB.md) for creating the public repo and jsDelivr URLs.
