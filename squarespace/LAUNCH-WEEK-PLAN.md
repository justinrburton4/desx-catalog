## Locked decisions (2026-08-14)

1. **Label / URL:** Keep title **Learn**; URL `/desx-courses`.
2. **Landing pages:** Every **course, tool, and research** card must use an **on-site Squarespace** URL (`/your-slug`). Create the page in Squarespace (abstract + citations for papers), then set catalog `url` to that slug. No external-only card destinations for launch.
3. **Workshops:** Yes — catalog cards (`kind: "course"`, type workshop). **Club:** No — “More ways” link only.
4. **Home:** Goal is promote `home-copy-for-test` content to public `/` by Friday.

See also: [`LANDING-PAGES.md`](LANDING-PAGES.md) for the per-card page checklist.

---

## Success criteria (Definition of Done)

- [ ] Production home (or promoted test home) is the public face
- [ ] Canonical URLs only in nav, footers, and home pillars (no `-copy`, no 404s, no alias sprawl)
- [ ] Zero placeholder / filler blurbs (“text here”, “Short description of…”, test cards)
- [ ] Every Research / Tools / Courses catalog card `url` is an on-site Squarespace slug that loads (abstract + citations on paper pages)
- [ ] Shared `desx-catalog.json` supports `kind: "research" | "tool" | "course"`
- [ ] `/desx-tools`, `/desx-pub-index`, `/desx-courses` each render their kind via Code Block
- [ ] Courses UI related to Tools/Research (search + category rows + cards) but visually distinct
- [ ] Launch smoke-test checklist signed off (mobile + desktop)

---

## Track A — Launch hygiene (must ship)

### A1. URL & link cleanup
| # | Task | Owner | Done when |
|---|---|---|---|
| A1.1 | Inventory all live URLs linked from home, nav, footer, catalogs | Us | Spreadsheet: canonical vs alias vs broken |
| A1.2 | Fix or remove broken links (e.g. former Get Involved class of bugs) | Us + Squarespace | Crawl returns 0 unexpected 404s |
| A1.3 | Retire `-copy` pages; point Learn → `/desx-courses` | Squarespace | Home pillar + nav use canonical |
| A1.4 | Pick one Mission / About URL; 301 or unpublish clones (`/mission-1`, `/des-x-mission`, …) | Squarespace | One About destination |
| A1.5 | Normalize tool deep links (PASE path, Systems Design slug, etc.) | Squarespace | Nav labels match destination titles |

### A2. Content & cards
| # | Task | Owner | Done when |
|---|---|---|---|
| A2.1 | Audit every catalog `url` — open it; replace dead / wrong targets | Us | Checklist per item |
| A2.2 | Rewrite or remove filler blurbs/abstracts in JSON | Us / students | No placeholders in production JSON |
| A2.3 | Cards without a landing page: **create Squarespace page** + set `url` to `/slug`, or **delist** until ready | Lab | No orphan / external-only cards |
| A2.4 | Proofread Learn intro + any remaining Squarespace blocks | Us | No typos / duplicate Onshape blocks |
| A2.5 | Accessible names on home Tools / Research / Learn pillars | Squarespace + CSS/HTML | aria-label or text |

### A3. Nav & IA for launch
| # | Task | Owner | Done when |
|---|---|---|---|
| A3.1 | Expose Tools + Learn (Courses) in global nav | Squarespace | Reachable without home pillars |
| A3.2 | Footer: Contact, Get Involved, Team Login (labeled), Privacy — all valid | Squarespace | Manual click-through |
| A3.3 | Promote / swap production home if still on `home-copy-for-test` | Supervisor call | Public `/` matches approved design |

---

## Track B — Courses in the JSON catalog (must ship)

Same file, third kind — mirrors Research/Tools pipeline.

```
kind: "research" → /desx-pub-index
kind: "tool"     → /desx-tools
kind: "course"   → /desx-courses
```

### B1. Data model
| # | Task | Done when |
|---|---|---|
| B1.1 | Add `courseItem` to `schema.json` (`kind: "course"`) | Schema validates |
| B1.2 | Proposed fields: `id`, `title`, `blurb`, `url`, `categories`, `image?`, `type` (`course` \| `workshop` \| `guidebook` \| `tutorial`), optional `duration` / `format` | Documented in HOW-TO-ADD |
| B1.3 | `categoryOrder` (or `courseCategoryOrder`) for Learn rows e.g. Featured / Courses / Workshops / Guidebooks / Tutorials | JSON + schema |
| B1.4 | Seed initial courses: Guidebook, Onshape CAD, Learn to Sketch, Social Impact Workshop (+ Workshops / Club only if they get cards) | Each has real `url` |
| B1.5 | Update CI validator for draft-2020-12 + course kind | Green CI |
| B1.6 | Update `HOW-TO-ADD.md` + course template | Undergrads can add courses |

### B2. Renderer & Squarespace
| # | Task | Done when |
|---|---|---|
| B2.1 | Extend `desx-catalog.js`: `data-kind="course"`, search placeholder “Search courses…”, type badge on cards | Local preview works |
| B2.2 | Extend `desx-catalog.css`: shared card language + **course-specific** accent (e.g. type chip, slightly different row header) so Learn ≠ Research ≠ Tools at a glance | Side-by-side compare OK |
| B2.3 | New `squarespace/courses-code-block-full.html` + `preview-courses.html` | Paste-ready |
| B2.4 | Rebuild `/desx-courses`: short intro (NN/g-inspired: one promise line) + Code Block; remove duplicate manual posters | Live page clean |
| B2.5 | Push catalog repo + re-paste Code Blocks on Tools/Research if renderer shared | All three pages load latest JS |

### B3. Learn page design notes (NN/g-inspired, DesX-owned)
- **Take:** Clear learning-type bands; cards that answer “what is this + how long / format”; one primary path (“start here”).
- **Don’t take:** Certification funnel, pricing grids, dense promo stacks, looking like NN/g chrome.
- **DesX:** Catalog rows by type; Featured guidebook or workshop as start-here; charcoal CTAs already on site.

---

## Day-by-day (suggested)

| Day | Focus |
|---|---|
| **Mon** | A1 inventory + A2.1 link audit; kick off B1 schema + course fields |
| **Tue** | B1 seed courses + B2 JS/CSS/preview; A2 filler purge in JSON |
| **Wed** | B2.4 wire `/desx-courses`; A1 redirects; A3 nav Tools/Learn |
| **Thu** | Landing pages for any orphan cards; full link crawl; mobile smoke |
| **Fri AM** | Supervisor walkthrough on staging/test URLs |
| **Fri PM** | Promote home / publish; freeze catalog except hotfixes |

---

## Explicit non-goals this week

- Loop11 panel / SUS study (post-launch)
- Learn layout experiments 2–5 on localhost
- Perfect About section redesign
- New research papers dump (unless needed for launch)

---

## Open decisions (confirm before build)

1. **Page name:** keep URL `/desx-courses` with title **Learn**, or rename to **Courses** everywhere?
2. **Landing pages:** Are external destinations (Springer, Design Review, Onshape showcase) OK as card `url`s, or does every course need an on-site Squarespace page first?
3. **Workshops / Club:** Catalog cards, or “More ways” text links only under the course grid?
4. **Home swap:** Launch on `home-copy-for-test` content promoted to `/`, or keep `/` separate until after Friday?

Once you answer those (or say “use your recommendation”), we start with **Track B schema + course renderer** and **Track A link inventory** in parallel.
