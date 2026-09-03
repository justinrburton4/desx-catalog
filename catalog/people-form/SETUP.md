# People form → GitHub pull request

Students fill a Google Form. Apps Script opens a PR on `justinrburton4/desx-catalog` with:

- an updated `catalog/desx-people.json`
- optional `people/photos/{id}.jpg` (or `.png` / `.webp`)

You merge the PR. `/people` updates on the next page load. Nobody pastes Squarespace image URLs.

## 1. Create the Google Form

Create a form (lab Google account). Use **these exact question titles**:

| Question title | Type | Required |
|---|---|---|
| Full name | Short answer | Yes |
| Role | Multiple choice: `Lab Directors` / `Ph.D. Students` / `Master's Students` / `Undergraduate Students` | Yes |
| Status | Multiple choice: `Current member` / `Alumni` | Yes |
| Title | Short answer (e.g. Ph.D. Candidate). Leave blank to use a default. | No |
| Bio | Paragraph | No |
| Email | Short answer | No |
| LinkedIn URL | Short answer | No |
| Website URL | Short answer | No |
| Photo | File upload (images only, 1 file, max 5 MB) | No |
| Existing profile id | Short answer. Only for updates, e.g. `tevin-dickerson`. | No |

Turn on **Collect email addresses** if you want a contact on the PR.

In the form description, note that headshots will be stored in a **public** GitHub repo.

## 2. GitHub token

1. GitHub → Settings → Developer settings → Personal access tokens → Fine-grained token.
2. Resource owner: your user. Repository access: **only** `desx-catalog`.
3. Permissions: **Contents** Read and write, **Pull requests** Read and write, **Metadata** Read.
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
5. Run `onFormSubmit` once from the editor (it will fail without an event) **or** submit a test response so Google prompts you to authorize `UrlFetchApp` and Drive.

If BYU Workspace blocks Apps Script from calling `api.github.com`, run the form from a personal Google account that can reach GitHub, or ask IT to allow that destination.

## 4. Test

1. Submit the form as a fake student, with and without a photo.
2. Confirm a PR appears: `Add person: …` or `Update person: …`.
3. Check the JSON and photo in the PR.
4. Merge. Hard-refresh `/people`.

Until you merge, the live page is unchanged.

## 5. After headshots arrive

Re-submit the form with **Existing profile id** filled in and attach the photo, **or** add `people/photos/{id}.jpg` in a PR and set `"photo": "{id}.jpg"` on that person.
