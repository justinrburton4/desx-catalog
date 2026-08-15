# Adding papers, tools, and courses to the catalog

The Research, Tools, and Learn pages on [design.byu.edu](https://www.design.byu.edu/) are built from one file: `catalog/desx-catalog.json`. Add a block to that file and a card shows up.

**Landing pages (required):** Every card `url` must be an **on-site Squarespace path** like `/my-page`. Create the page in Squarespace first (papers: abstract + citations), then set `url` to that slug. See [`squarespace/LANDING-PAGES.md`](../squarespace/LANDING-PAGES.md).

---

## Don’t want to mess with JSON?

Fill this out in plain English, paste it into ChatGPT (or whatever you use) **along with the prompt under it**, and it’ll hand you a block you can copy. Then drop that block into the catalog — see “Where it goes” below.

### Fill this out

```
Title:

Is this a paper, a tool, or a course/workshop?

If it’s a paper: journal, conference, or white paper?
If it’s a course: course / workshop / guidebook / tutorial?

One or two sentences on what it’s about / what it does:

On-site Squarespace path (must start with / — create the page first):

Year (papers only):

Authors (papers only, however you’d normally list them):

Format / duration (courses only, if known):

Picture URL if you have one (Squarespace image link is best; otherwise leave blank):

Which row should it sit in?
  Papers: Social impact modeling / Systems & Product Architecture / Engineering For Global Health / Other
  Tools: Decision support / Ideation / Simulation
  Courses: Courses / Workshops / Guidebooks / Tutorials

Should it also show under Featured? (only if Chris or John said so):
```

### Prompt to paste into the AI

Copy everything in the box below, then paste your filled-out answers under it.

```
You are writing one catalog entry for the BYU Design Exploration (DesX) website.

Turn the notes below into a single JSON object for catalog/desx-catalog.json. Output only that object, then a comma after the closing brace, because it will be pasted as the first item in an array. No markdown fences, no commentary.

Rules:
- kind is "research" for a paper/white paper, "tool" for something people can use, or "course" for a Learn item (course, workshop, guidebook, tutorial). Never use course for Engineering Design Club — Club is a “More ways” link only.
- id: lowercase kebab-case from the title, letters/numbers/hyphens only. Unique-looking, not generic.
- title: the full title from the notes.
- Research only: abstract (1–2 sentences, core contribution), url, badge ("journal" | "conference" | "whitepaper"), categories, and if given: year as a number (not a string), authors as an array of "Last, F. M." strings, image.
- Tool only: blurb (one sentence), url, categories, and image if given. Do not include badge, abstract, year, or authors.
- Course only: blurb (one sentence), url, type ("course" | "workshop" | "guidebook" | "tutorial"), categories, and if given: format, duration, image. Do not include badge, abstract, year, or authors.
- url: MUST be an on-site path starting with / (the Squarespace landing page). Do not use external DOIs or https as the card url.
- categories must be copied exactly from this list, including capitals. Papers: "Featured", "Social impact modeling", "Systems & Product Architecture", "Engineering For Global Health", "Other". Tools: "Decision support", "Ideation", "Simulation". Courses: "Featured", "Courses", "Workshops", "Guidebooks", "Tutorials". Pick the best fit; use "Other" (papers only) if nothing else works. Include "Featured" only if the notes say Chris or John asked for it.
- Do not invent fields. Do not wrap the object in an array. Straight double quotes only.
- If a picture URL is missing, omit image.

Notes:
```

### Where it goes

Open [`catalog/desx-catalog.json`](desx-catalog.json) (on GitHub: [desx-catalog](https://github.com/justinrburton4/desx-catalog/blob/main/catalog/desx-catalog.json)). Find this near the top:

```json
  "items": [
```

Paste the AI’s block **right after that `[`**, so it’s the first item. The old first item stays; there should be a comma between them.

```json
  "items": [
    { ...the new block... },
    { ...whatever was already first... },
```

Glance at it: straight quotes, comma after your block, no extra comma inside it. Then save/commit. Give GitHub a few seconds, then refresh the matching hub page — the new card should be there. You still need a Squarespace landing page for the `url` slug.

The rest of this page is if you’d rather write the JSON yourself.

---

Live pages: [Research](https://www.design.byu.edu/desx-pub-index) · [Tools](https://www.design.byu.edu/desx-tools) · [Learn](https://www.design.byu.edu/desx-courses)

Blank templates: [`templates/research.template.json`](templates/research.template.json) · [`templates/tool.template.json`](templates/tool.template.json) · [`templates/course.template.json`](templates/course.template.json)

---



## Paper, tool, or course?

**Research** = a journal paper, conference paper, or white paper. The card opens its **on-site** landing page (abstract + citations live there; you can still link out to the DOI from that page).

**Tool** = something people can actually use: a canvas, matrix, prompt set, simulation, decision-support page, etc.

**Course** = a Learn hub item: semester course, workshop, guidebook, or tutorial. Engineering Design Club is **not** a catalog course — link it under “More ways” on Learn only.

If you wrote a paper *about* a tool, that’s still research. The tool itself is a separate block with a different `id`. Don’t list the same thing twice, and don’t make two cards for the conference and journal versions of one paper unless someone asks you to.

Skip anything that doesn’t have a real title, a short description, and a working on-site path.

---



## JSON (the parts that usually go wrong)

- Use straight quotes `"like this"`, not the curly ones Word and Google Docs insert.
- Comma after every field **except the last one** inside the `{ }`.
- Comma after your whole block, because another item always follows when you paste at the top.
- Don’t add fields that aren’t in the examples. Extra keys get rejected.
- `id` is lowercase letters, numbers, and hyphens only: `my-paper-name`. No spaces, no caps, no underscores. Search the file first so you aren’t reusing one.

This ending is fine (comma after the block):

```json
      "categories": [
        "Other"
      ]
    },
```

This one isn’t (comma after the last field):

```json
      "categories": [
        "Other"
      ],
    },
```

If you want a sanity check, paste this into [jsonlint.com](https://jsonlint.com):

```json
{ "items": [ YOUR_BLOCK_HERE ] }
```

---



## Research block

```json
{
  "kind": "research",
  "id": "axiom-based-aggregation-functions-for-ideation-metrics",
  "title": "Axiom-based aggregation functions for calculating variety, novelty, quality and quantity of ideation results",
  "abstract": "Proposes axioms and matching functions for principled aggregation of quality, quantity, novelty, and variety scores.",
  "url": "/axiom-based-aggregation-functions-for-ideation-metrics",
  "image": "https://images.squarespace-cdn.com/content/5c7ee75b92441b465f176f7f/1596559556145-XTZEC1VK1GFU1GGLWS0X/DesignExLogoFavicon.png?content-type=image%2Fpng",
  "badge": "journal",
  "categories": [
    "Other"
  ],
  "year": 2026,
  "authors": [
    "Sorensen, C. D.",
    "Ashworth, T. J.",
    "Stapleton, T.",
    "Mattson, C. A.",
    "Anderson, M. L."
  ]
}
```

`kind` has to be `"research"`.

`id` should be a short version of the title. It has to be unique in the file.

`title` is the full paper title.

`abstract` is one or two sentences on what the paper actually contributes — that’s what people read on the card, not the publisher’s full abstract.

`url` is where the card goes. Use an on-site path like `/some-landing-page` (create that Squarespace page with abstract + citations first). Put the DOI as a link *on* that page, not as the card `url`.

`badge` is one of `"journal"`, `"conference"`, or `"whitepaper"`. Nothing else.

`categories` is a list of row names. Spelling has to match the list below, including capitals. Pick the best fit; use `"Other"` if nothing else works. Don’t make up a new name. `"Featured"` is only if Chris or John want it on that row.

You can put a paper in more than one row:

```json
"categories": [
  "Featured",
  "Social impact modeling"
]
```

`image` is optional. Leave it off and the card uses the lab logo. If you have a figure, host it on Squarespace and paste that URL (journal image links tend to die).

`year` and `authors` aren’t strictly required, but add them. Year is a number, not a string: `2026`, not `"2026"`. Authors look like `"Last, F. M."`.

### Research rows

- `"Featured"` — only if asked
- `"Social impact modeling"` — measuring or predicting social impact of products
- `"Systems & Product Architecture"` — architecture, systems design, PASE, modularity
- `"Engineering For Global Health"` — global development / global health work
- `"Other"` — everything else (design theory, ideation metrics, optimization, …)

---



## Tool block

```json
{
  "kind": "tool",
  "id": "random-prompts-ideation-tool",
  "title": "Random Prompts Ideation tool",
  "blurb": "A tool focused on aiding designers ideate more broadly throughout the design space",
  "url": "/random-prompts-method",
  "image": "https://images.squarespace-cdn.com/content/v1/5c7ee75b92441b465f176f7f/0880d561-0db6-4f87-833a-d1e87e38530c/Screenshot+2026-08-04+113344.png",
  "categories": [
    "Ideation"
  ]
}
```

`kind` is `"tool"`. Don’t copy `badge`, `abstract`, `year`, or `authors` onto a tool — those are research-only.

`title` is the short name on the card. `blurb` is one sentence about what it does. `url` is the on-site tool landing page (`/random-prompts-method`).

`image` is optional but a screenshot looks a lot better than the logo.

### Tool rows

- `"Decision support"` — canvases, matrices, checklists, scoring
- `"Ideation"` — generating or broadening concepts
- `"Simulation"` — running a model

Talk to someone before adding a new tool category.

---



## Course block

```json
{
  "kind": "course",
  "id": "learn-to-sketch",
  "title": "Learn to Sketch",
  "blurb": "Free self-guided short course — practice 10 minutes a day for 8 weeks.",
  "url": "/learn-to-sketch",
  "type": "tutorial",
  "categories": [
    "Tutorials"
  ],
  "format": "Self-paced",
  "duration": "8 weeks"
}
```

`kind` is `"course"`. Don’t copy research-only fields (`badge`, `abstract`, `year`, `authors`).

`type` is one of `"course"`, `"workshop"`, `"guidebook"`, or `"tutorial"`. That drives the badge on the card.

`blurb` is one sentence. `url` is the Learn landing page path. `format` and `duration` are optional chips on the card.

`hidden` is `false` for normal cards. Set `"hidden": true` to keep the item in the JSON but hide it on the site.

### Course rows

- `"Featured"` — only if asked (e.g. guidebook start-here)
- `"Courses"` — semester / structured courses
- `"Workshops"` — workshop kits or by-request sessions
- `"Guidebooks"` — books / guidebooks
- `"Tutorials"` — short self-paced tutorials

Do **not** add Engineering Design Club as a course card.

---



## Putting it in the file

You need access to the [desx-catalog](https://github.com/justinrburton4/desx-catalog) repo.

1. Open `catalog/desx-catalog.json` and hit edit.
2. Find `"items": [` near the top.
3. Paste your `{ ... },` block right after that `[` so it’s the first item. Leave the old first item in place, with a comma between them.
4. Search the file for your `id` and make sure it only appears once. Don’t delete the opening `[`.
5. Commit with a message like `Add catalog item: your-id-here` (or open a PR if that’s how this repo is set up).
6. Wait a few seconds, then refresh [Research](https://www.design.byu.edu/desx-pub-index), [Tools](https://www.design.byu.edu/desx-tools), or [Learn](https://www.design.byu.edu/desx-courses). The pages load the latest catalog on their own.

---



## Quick check before you commit

- `kind` is `"research"`, `"tool"`, or `"course"`
- `id` is unique and lowercase-with-hyphens
- Research has `abstract`, `badge`, and `url`. Tool has `blurb` and `url`, and no `badge`. Course has `blurb`, `type`, and `url`
- `hidden` is `false` unless you mean to hide the card (`true`)
- `url` starts with `/` and the Squarespace page exists
- Category names match the lists above, character for character
- Straight quotes; comma after your block; no extra comma inside it
- Leave `version` and `categoryOrder` alone unless you’re adding a new category row with lab approval

If the whole page dies, the JSON is broken — run the file through jsonlint. If everything else is fine but your card is missing, the block probably failed validation (wrong field, duplicate `id`). In the browser, F12 → Console and look for `[DesX Catalog] Skipping invalid item`. Wrong row almost always means the category string doesn’t match (e.g. `"Social Impact Modeling"` instead of `"Social impact modeling"`).