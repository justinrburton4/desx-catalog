# DesX website — sprint work order

Based on the **Aug 13, 2026 usability re-audit** (Loop11-style tasks from `/home-copy-for-test`).  
Full analysis canvas: `desx-usability-reaudit.canvas.tsx` in the Cursor project canvases folder.

**Status:** No Level-4 criticals remaining after Get Involved fix. Focus shifts to Learn polish, IA alignment, and content quality.

---

## Sprint 1 — Unblock & ship Learn (3–5 days)

| ID | Pri | Ticket | Acceptance criteria |
|---|---|---|---|
| **S1-1** | P0 | Finalize Learn URL and home CTA | Home Learn pillar links to `/desx-courses` only. `/desx-courses-copy` redirected or unpublished after content merge. |
| **S1-2** | P0 | Clean Learn page content | Exactly one of each primary resource (Guidebook, Onshape, Learn to Sketch, Social Impact Workshop). No repeated Onshape blocks. Fix typos (`Additonal`, `GuideBook`) and grammar (`provides a tools` → `provides tools`). Include “More ways”: Workshops + Engineering Design Club. |
| **S1-3** | P0 | Accessible home pillars | Each pillar link has an accessible name (`aria-label` or visible text): Design Tools, Research, Learn. Keyboard focus visible; VoiceOver/NVDA announces name. |
| **S1-4** | P1 | Get Involved v1.1 | Page lists pathways (student / collaborator / workshop request). Mailto CTAs remain. “About” points to canonical `/mission` (not `/des-x-mission`). Optional: Club link `https://edx.byu.edu/`. |

**Exit:** Learn is production-ready from home; Get Involved is a real joining page.

---

## Sprint 2 — Information architecture (1 week)

| ID | Pri | Ticket | Acceptance criteria |
|---|---|---|---|
| **S2-1** | P0 | Align global nav with pillars | Primary nav exposes **Tools** and **Learn** (or rename Resources → Tools and add Learn). Task T7 no longer fails: user can reach Tools/Learn without home pillars. Mobile menu matches. |
| **S2-2** | P1 | Publications dual-path clarity | `/desx-pub-index` = primary browse. `/all-publications-2` = archive. Single consistent CTA label: “See full publication list”. |
| **S2-3** | P1 | Canonical URL map + redirects | Spreadsheet of canonical vs aliases. 301s for `/mission-1`, `/des-x-mission`, `/about-des-x`, Systems Design slug, PASE path, etc. Nav and footers updated. |
| **S2-4** | P2 | Footer IA tweak | Team Login labeled for members. Contact / Get Involved / Privacy order clear. Social links verified. |

**Exit:** Site mental model matches home (Tools · Research · Learn) on every page.

---

## Sprint 3 — Catalog & content quality (1 week)

| ID | Pri | Ticket | Acceptance criteria |
|---|---|---|---|
| **S3-1** | P0 | Catalog blurb QA | No placeholder blurbs on live Tools (e.g. “Short description of Tyson’s work”). All public items meet 10–20 word abstract standard in `HOW-TO-ADD.md`. |
| **S3-2** | P1 | Catalog loading state | Tools/Research show loading message or skeleton until `#desx-catalog` has cards. |
| **S3-3** | P1 | Horizontal row discoverability | Next arrows visible at WCAG contrast; or add “View all in category”. Spot-check Decision Support / Ideation rows. |
| **S3-4** | P2 | Image alt pass | Home posters, team photos, workshop images have descriptive alt (or empty alt if decorative). |

**Exit:** Catalog feels production-complete, not draft.

---

## Sprint 4 — Polish & validate (3–5 days)

| ID | Pri | Ticket | Acceptance criteria |
|---|---|---|---|
| **S4-1** | P1 | Heading hierarchy sitewide | Home, Tools, Research, Learn, Contact, Mission each have one meaningful **H1**. Contact address/phone are not H2. |
| **S4-2** | P1 | Contact accuracy check | Room number, parking address, and map pin confirmed with faculty; text matches diagrams. |
| **S4-3** | P1 | Loop11 live panel | 5–8 external participants run T1–T7. Target ≥6/7 success; T7 passes after nav change. Record SUS + completion %. |
| **S4-4** | P2 | Mobile pass | 390px: home pillars, Tools rows, Learn grid, Contact directions — no overflow; contrast OK. |

**Exit:** Ready to promote `home-copy-for-test` patterns to production home (if not already).

---

## Release gate (definition of done)

1. Home Learn → canonical URL; no duplicate Learn cards; proofread.  
2. Tools + Learn reachable from global nav without home pillars.  
3. Pillar links named for AT; H1s on primary landings.  
4. No placeholder catalog blurbs in production.  
5. Get Involved offers clear pathways (not only mailto).  
6. Loop11 T1–T7: ≥6/7 success with external panel; **T7 no longer fails**.

---

## Suggested owners

| Area | Owner ideas |
|---|---|
| Squarespace pages / nav / Learn | Site editor (you) |
| Catalog JSON blurbs | Lab students via `catalog/HOW-TO-ADD.md` |
| Code Block loading/arrows | Web maintainer (Code Block + Custom CSS) |
| Contact/room accuracy | Mattson / Salmon |
| Loop11 panel | UX lead / Justin |

---

## Out of scope (backlog later)

- Full redesign of old production home (`/`) vs test home  
- Password Team Login UX beyond labeling  
- New Learn layouts 2–5 (keep as local experiments until Learn v1 ships)  
- Building a real application form / CMS for joining
