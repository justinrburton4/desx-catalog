# Squarespace 7.0 build checklist (DesX)

This local site is a **visual prototype** of a layout you can rebuild on Squarespace 7.0 classic (poster image-blocks, banner, folders)—matching [design.byu.edu](https://www.design.byu.edu/).

Do **not** expect custom sticky headers, scroll-reveal animations, numbered tool strips, or app-like filters on the live site.

---

## 1. Navigation (Folders)

Create / reorder folders in this order:

| Nav label | Folder / page type | First item (hub) | Children |
|-----------|-------------------|------------------|----------|
| Home | Page (index) | — | — |
| Research | Folder | **Research** (new page = hub) | Design Theory, Engineering for Global Development, Systems Design, Optimization, Portfolio |
| Tools | Folder | **Tools** (new page = hub) | Developing World Canvas, PASE Matrix, Social Impact Modeling, White Papers, Infographics and Worksheets |
| Learn | Folder | **Learn** (new page = hub) | Workshops, Social Impact Considerations Workshop, Courses, Engineering Design Club |
| Publications | Folder | All Publications | Journal, Conference, Technical Reports and White Papers |
| About | Folder | Mission | Lab Members, Lab Alumni, Contact |

**Team / people stay only under About.** Remove “meet the team” as a homepage tile.

In Squarespace: *Pages → + → Folder*, drag existing pages into folders, set folder display to dropdown. Make each hub page the folder’s index if your template supports “folder landing page”; otherwise link the folder title to the hub page and list children below.

---

## 2. Homepage — block-by-block map

Rebuild the homepage top to bottom. Local mock: `index.html`.

| # | Section (local) | Squarespace block / feature | Notes |
|---|-----------------|----------------------------|--------|
| 1 | Banner hero | **Page banner** or Index intro image | Full-bleed photo. Overlay text: “Impacting People Through” + **Engineering Design**. Keep transparent header if already enabled. |
| 2 | Intro sentence | **Text** block, centered | Existing lab blurb. |
| 3 | Start here — 3 posters | Three **Image** blocks, design: **Poster**, linked | Research → Research hub; Tools → Tools hub; Learn → Learn hub. Uppercase titles only (no hover subcopy—7.0 poster titles are static). |
| 4 | Research heading | **Text** block | Label “RESEARCH” + one sentence from Overview. |
| 5 | Research 2×2 | Four **Image** poster blocks in a **2-column** layout | Link to the four research pages. |
| 6 | Tools heading | **Text** block | Use White Papers intro sentence. |
| 7 | Tools row | Five **Image** poster blocks | On narrow layouts SQ will stack; on desktop use a multi-column section or Index gallery with titles. |
| 8 | Learn heading | **Text** block | Workshops blurb. |
| 9 | Learn row | Three **Image** posters | Workshops larger if your layout allows a wider first column; else three equal posters. |
| 10 | Portfolio heading + 3 projects | **Text** + three **Image** + **Text** pairs (or summary items) | Village Drill, Smart Village Pump Sensor, World Cart. Link images to Portfolio page. |
| 11 | Design Review banner | One wide **Image** block, linked | External: designreview.byu.edu |
| 12 | Funders | **Text** + logo **Images** | “Our Research is Funded by:” + existing logos + McQuinn line. |
| 13 | Footer | Site footer / footer content | Contact, Team Login, Courses, Privacy — keep large uppercase links if your template supports footer nav. |

**Skip “Latest / news”** unless you already have a blog. Empty news rows look unfinished.

---

## 3. Hub pages

### Research hub (`pages/research-hub.html` in the mock)
- **Text**: Overview copy (same as current Research Overview).
- **Four poster image-blocks** → Theory, EGD, Systems, Optimization.
- Optional text link → Portfolio.

### Tools hub (`pages/tools-hub.html`)
- **Text**: White Papers intro + “text here” where tool blurbs are missing.
- **Five poster image-blocks** → each tool page.

### Learn hub (`pages/learn-hub.html` → live `/desx-courses`)
- **Not JSON-driven.** Curated Squarespace page: intro → featured Guidebook → 2×2 resource grid → “More ways to learn.”
- Full block recipe + confirmed URLs: [`squarespace/LEARN-BUILD.md`](squarespace/LEARN-BUILD.md)
- Collection CSS: [`squarespace/custom-css-learn-page.css`](squarespace/custom-css-learn-page.css) (`#collection-6a74efa0f17a197c10e964ce`)
- Home Learn card should link to `/desx-courses` (already wired on `home-copy-for-test`).

Existing deep pages keep their content; only parent folder / nav labels change.

---

## 4. Shared Research / Tools catalog (custom code)

Publication and tool index cards are driven by a GitHub JSON file + renderer:

- Data: [`catalog/desx-catalog.json`](catalog/desx-catalog.json)
- Authoring: [`catalog/README.md`](catalog/README.md) + templates in `catalog/templates/`
- Squarespace install: [`squarespace/WIREUP.md`](squarespace/WIREUP.md)
- Publish repo: [`catalog/GITHUB.md`](catalog/GITHUB.md)

Local preview: `npx serve .` then open `/squarespace/preview-research.html` and `/squarespace/preview-tools.html`.

## 5. What not to attempt in Squarespace (without custom code)

- Sticky header that changes on scroll  
- Scroll-triggered fade-ins  
- Numbered interactive tool lists with slide hover  
- Bespoke project microsites (use Portfolio items + optional extra pages instead)  
- Magazines-style infinite news feeds (unless you commit to a Blog)  
- *(Publication card search / filters are supported via the catalog renderer above.)*

Optional **Custom CSS** (Site Styles → Custom CSS) is fine for spacing/font tweaks you already use—not required for this layout.

---

## 6. Suggested build order

1. Create Research / Tools / Learn hub pages and move pages into folders.  
2. Rebuild homepage sections 1–3 (banner, intro, three paths)—publish and check mobile.  
3. Add research 2×2 and tools posters.  
4. Add learn + portfolio teaser.  
5. Confirm footer + funders still work.  
6. Replace blank image slots with real photos (hero, posters, projects, logos).  
7. Wire the JSON catalog on Research + Tools hubs (see section 4).

---

## 7. Local preview

```bash
cd "DesX Website"
python -m http.server 5000
```

Open http://localhost:5000 — the mock should match what you can assemble with stock 7.0 blocks above.
