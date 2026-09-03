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
4. Triggers (clock icon) → Add trigger:
   - Function: `onFormSubmit`
   - Event: From form → **On form submit**
5. In the Apps Script editor, select function **`authorizeDesxPeople`** → **Run**. Approve UrlFetch + Drive when prompted. Check **Executions** / **Logs** for “Authorization complete”.
6. Submit a test form response again.

If BYU Workspace blocks Apps Script from calling `api.github.com`, run the form from a personal Google account that can reach GitHub, or ask IT to allow that destination.

## 4. Test / debug

1. Submit the form as a fake student.
2. Apps Script → **Executions** (left sidebar):
   - **No new row** → the trigger did not fire (wrong project, or trigger missing).
   - **Failed** → open it and read the error (token, missing property, role title, etc.).
   - **Completed** → a commit like `Add person: …` should appear on `main` within a few seconds.
3. Hard-refresh `/people` once the Squarespace Code Block is installed.

Common first-run issue: permissions were never granted. Running **`authorizeDesxPeople`** once fixes that.

## 5. After headshots arrive

Re-submit the form with the **same Full name** and attach the photo, **or** add `people/photos/{id}.jpg` and set `"photo": "{id}.jpg"` on that person in `desx-people.json`.

## 6. Alumni

Edit `catalog/desx-people.json`: set `"status": "alumni"` and usually `"title": "Former Ph.D. Student"` (or Master's / Undergraduate). Commit directly or via the GitHub web editor.
