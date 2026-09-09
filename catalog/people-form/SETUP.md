# People form → GitHub (direct publish)

Students fill a Google Form. Apps Script commits straight to `main` on `justinrburton4/desx-catalog` with:

- an updated `catalog/desx-people.json`
- optional `people/photos/{id}.jpg` (or `.png` / `.webp`)

No pull request. `/people-in-the-lab` picks up the change on the next page load (may take a minute).

## Update rules (important)

Matching is by **Full name** (or existing slug id). Then:

| Field | Blank on submit | Filled on submit |
|---|---|---|
| Bio, Email, Link, Photo, Title | Keep existing value | Overwrite |
| Role | Keep existing group (updates only) | Set group from role |
| Status | Keep existing (`current` for new people) | Set `current` or `alumni` |
| Hide profile | Keep existing (`false` for new people) | Set `hidden` true/false |

**Alumni exception:** when status becomes `alumni` (new alumni, or current → alumni) and Title is blank, the title auto-updates to `Former {previous title}` (e.g. `Ph.D. Candidate` → `Former Ph.D. Candidate`). If Title is filled, that custom text is used instead.

**Ph.D. Candidate:** Role option maps to group `phd` (same Ph.D. section) with default title `Ph.D. Candidate`.

## 1. Create the Google Form

Use these question titles (or close variants — the script also fuzzy-matches):

| Question title | Type | Required |
|---|---|---|
| Full name | Short answer | Yes |
| Role | Multiple choice: `Lab Directors` / `Ph.D. Students` / `Ph.D. Candidate` / `Master's Students` / `Undergraduate Students` | Yes for new profiles |
| Title | Short answer (optional custom display title) | No |
| Status | Multiple choice: `Current` / `Alumni` (optional; default Current) | No |
| Hide profile | Multiple choice or checkbox (Yes/Hide vs No/Show) | No |
| Bio | Paragraph | No |
| Email | Short answer | No |
| Optional link to your LinkedIn or other personal portfolio. Add if you want that link on your profile card on the website. | Short answer | No |
| Photo | File upload (images only, 1 file, max 5 MB) | No |

LinkedIn URLs are stored as `links.linkedin`; any other URL as `links.website`.

Same Full name → **update** that person (no duplicate).

Turn on **Collect email addresses** if useful.

Headshots are stored in a **public** GitHub repo.

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

Open Apps Script only from the form (**Form → ⋮ → Apps Script**).

## 4. Test / debug

1. Triggers: function `publishPeopleFromFormSubmit`, event **On form submit**.
2. After submit, Executions should show Completed.
3. Example alumni move: Full name + Role + Status=`Alumni` → bio/photo/links kept; title becomes `Former …`.

## 5. Photos

Re-submit with the same name and a photo, **or** drop `people/photos/{id}.jpg` / `{id}.png` in the repo. The live page tries those filenames automatically.

## 6. Hide / alumni on the website

- `"hidden": true` → omitted from the people directory renderer.
- `"status": "alumni"` → Alumni section (by group).
- `"status": "current"` → Lab Directors / Ph.D. / Master's / Undergraduate sections.

LinkedIn / website links are labeled by URL (**LinkedIn** vs **Website**).
