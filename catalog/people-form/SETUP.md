# People form → GitHub (direct publish)

Students fill a Google Form. Apps Script commits straight to `main` on `justinrburton4/desx-catalog` with:

- an updated `catalog/desx-people.json`
- optional `people/photos/{id}.jpg` (or `.png` / `.webp`)

No pull request. `/people-in-the-lab` picks up the change on the next page load (may take a minute).

Live form: https://forms.gle/EzdtN5JzjUkUUHBd8

## Update rules (important)

Matching is by **Full Name** (or existing slug id). Then:

| Field | Blank on submit | Filled on submit |
|---|---|---|
| Bio, Email, Personal URL, Photo, Title | Keep existing value | Overwrite |
| Role | Keep existing group (updates only) | Set group from role |
| Current lab member or Alumni | Keep existing (`current` for new people) | Set `current` or `alumni` |
| Hide this profile? | Keep existing (`false` for new people) | Yes → hidden, No → visible |

**Alumni exception:** when status becomes `alumni` (new alumni, or current → alumni) and Title is blank, the title auto-updates to `Former {previous title}` (e.g. `Ph.D. Candidate` → `Former Ph.D. Candidate`). If Title is filled, that custom text is used instead.

**Ph.D. Candidate:** maps to group `phd` (same Ph.D. section) with default title `Ph.D. Candidate`.

## 1. Form questions (match the live form)

| Question title | Type | Required |
|---|---|---|
| Full Name | Short answer | Yes |
| Role | Multiple choice: `Ph.D. Candidate` / `Ph.D. Students` / `Master's Students` / `Undergraduate Students` | Yes for new profiles |
| Title | Short answer (optional; leave blank for role default) | No |
| Photo | File upload (JPG/PNG, under 10 MB) | No |
| Bio | Short answer / paragraph | No |
| Email | Short answer | No |
| Personal URL | Short answer (LinkedIn or portfolio) | No |
| Current lab member or Alumni | Multiple choice: `Current` / `Alumni` | No (default Current) |
| Hide this profile? | Multiple choice: `Yes` / `No` | No (default show) |

Personal URL values with `linkedin.com` → `links.linkedin`; anything else → `links.website`.

Same Full Name → **update** that person (no duplicate).

## 2. GitHub token

1. GitHub → Settings → Developer settings → Personal access tokens → Fine-grained token.
2. Resource owner: your user. Repository access: **only** `desx-catalog`.
3. Permissions: **Contents** Read and write, **Metadata** Read.
4. Copy the token into Apps Script properties (never commit it).

## 3. Bind Apps Script to the form

1. Open the form → ⋮ → **Apps Script**.
2. Paste [`Code.gs`](Code.gs) over the default file. Save.
3. Project Settings → Script properties:
   - `GITHUB_TOKEN`
   - `GITHUB_OWNER` = `justinrburton4`
   - `GITHUB_REPO` = `desx-catalog`
   - `GITHUB_BASE_BRANCH` = `main`
4. Run **`authorizeDesxPeople`** → approve UrlFetch + Drive.
5. Run **`installFormTrigger`**.

Handler must be **`publishPeopleFromFormSubmit`** (not `onFormSubmit`).

6. Optional: **`processLatestFormResponse`** to publish the latest response immediately.

## 4. Test / debug

1. Triggers: function `publishPeopleFromFormSubmit`, event **On form submit**.
2. Example alumni move: Full Name + Role + Alumni → bio/photo/links kept; title becomes `Former …`.
3. Example hide: Full Name + Hide this profile? = Yes → `"hidden": true` (card omitted on the site).

## 5. Photos

Re-submit with the same name and a photo, **or** drop `people/photos/{id}.jpg` / `{id}.png` in the repo. The live page tries those filenames automatically.

## 6. Hide / alumni on the website

- `"hidden": true` → omitted from the people directory renderer.
- `"status": "alumni"` → Alumni section (by group).
- `"status": "current"` → Lab Directors / Ph.D. / Master's / Undergraduate sections.

LinkedIn / website links are labeled by URL (**LinkedIn** vs **Website**).
