# People form → GitHub (direct publish)

Students fill a Google Form. Apps Script commits straight to `main` on `justinrburton4/desx-catalog` with:

- an updated `catalog/desx-people.json`
- optional `people/photos/{id}.jpg` (or `.png` / `.webp`)

No pull request. `/people` picks up the change on the next page load (may take a minute). Nobody pastes Squarespace image URLs.

**Defaults (not on the form):** every submission is `status: "current"`. Title is set from Role (`Lab Directors` → `Lab Co-director`, `Ph.D. Students` → `Ph.D. Student`, etc.). Mark someone alumni by editing `desx-people.json` (change `status` to `"alumni"` and optionally the title).

## 1. Create the Google Form

Create a form (lab Google account). Use **these exact question titles**:

| Question title | Type | Required |
|---|---|---|
| Full name | Short answer | Yes |
| Role | Multiple choice: `Lab Directors` / `Ph.D. Students` / `Master's Students` / `Undergraduate Students` | Yes |
| Bio | Paragraph | No |
| Email | Short answer | No |
| Optional link to your LinkedIn or other personal portfolio. Add if you want that link on your profile card on the website. | Short answer | No |
| Photo | File upload (images only, 1 file, max 5 MB) | No |

The optional link question title must match the form **exactly** (including the period). LinkedIn URLs are stored as `links.linkedin`; any other URL as `links.website`.

If someone submits again with the same name, the script **updates** that person instead of creating a duplicate.

Turn on **Collect email addresses** if useful for contact.

In the form description, note that headshots will be stored in a **public** GitHub repo.

## 2. GitHub token

1. GitHub → Settings → Developer settings → Personal access tokens → Fine-grained token.
2. Resource owner: your user. Repository access: **only** `desx-catalog`.
3. Permissions: **Contents** Read and write, **Metadata** Read. (Pull requests not required.)
4. Copy the token. You will store it in Apps Script, never in this repo.

## 3. Bind Apps Script to the form

1. Open the form → ⋮ → **Apps Script**.
2. Paste [`Code.gs`](Code.gs) over the default file. Save.
3. Project Settings → Script properties → add:
   - `GITHUB_TOKEN` = the token from step 2
   - `GITHUB_OWNER` = `justinrburton4`
   - `GITHUB_REPO` = `desx-catalog`
   - `GITHUB_BASE_BRANCH` = `main`
4. Run **`authorizeDesxPeople`** → approve UrlFetch + Drive.
5. Run **`installFormTrigger`** → approve if prompted.

That installs an **installable** trigger on `publishPeopleFromFormSubmit`.

**Do not** manually add a trigger for a function named `onFormSubmit`. That reserved name is a Forms *simple* trigger and **cannot** call GitHub (`UrlFetchApp`) or Drive — which is why editor runs worked but auto-submit did not.

6. Optional: run **`processLatestFormResponse`** to publish the latest response immediately.
7. Submit a new test response. Executions should show **`publishPeopleFromFormSubmit` → Completed** (Type: Trigger).

If BYU Workspace blocks Apps Script from calling `api.github.com`, run the form from a personal Google account that can reach GitHub, or ask IT to allow that destination.

**Important:** Open Apps Script only from the form (**Form → ⋮ → Apps Script**), not a standalone project.

## 4. Test / debug

1. Triggers (clock) should list: function `publishPeopleFromFormSubmit`, event **On form submit**.
2. After a form submit, Executions:
   - **No row** → re-run `installFormTrigger`; confirm the script is form-bound.
   - **Failed** → open the log (often auth or a missing Script property).
   - **Completed** → GitHub gets `Add person: …` on `main` within a few seconds.
3. Temporary workaround: `processLatestFormResponse` after a submit.

## 5. After headshots arrive

Re-submit the form with the **same Full name** and attach the photo, **or** add `people/photos/{id}.jpg` and set `"photo": "{id}.jpg"` on that person in `desx-people.json`.

## 6. Alumni

Edit `catalog/desx-people.json`: set `"status": "alumni"` and usually `"title": "Former Ph.D. Student"` (or Master's / Undergraduate). Commit directly or via the GitHub web editor.
