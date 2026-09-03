# DesX People Directory

The `/people` page is a Squarespace Code Block that fetches [`desx-people.json`](desx-people.json) from GitHub — the same pattern as Research and Tools.

Headshots live in [`people/photos/`](../people/photos/). If a person has no `photo` field, the page shows [`people/photos/placeholder.png`](../people/photos/placeholder.png).

## Page layout

One page, Frost Lab–style sections:

1. Lab Directors
2. Ph.D. Students
3. Master's Students
4. Undergraduate Students (seniors and other undergrads together)
5. Alumni, with subsections for former Ph.D., Master's, and undergraduate members

Click a card to open a bio. Shareable link: `/people?p=tevin-dickerson`.

## Add someone by form (preferred)

See [`people-form/SETUP.md`](people-form/SETUP.md). A Google Form submit commits the JSON row and optional photo straight to `main`. No PR to merge.

## Add or edit someone by hand

1. Copy [`templates/person.template.json`](templates/person.template.json).
2. Set `id` to a unique kebab-case slug (`first-last`). That slug is also the photo filename stem.
3. Set `group` to `directors` | `phd` | `masters` | `undergraduate`.
4. Set `status` to `current` or `alumni`.
5. Paste the object into the `people` array in `desx-people.json`.
6. Optional: add `people/photos/{id}.jpg` and set `"photo": "{id}.jpg"`.
7. Commit or open a PR. After merge, refresh `/people`.

Do not commit `placeholder.png` under a person's id. Omit `photo` until a real headshot is ready.

## Alumni

The form always adds people as `current`. To move someone to alumni, edit `desx-people.json`: set `"status": "alumni"` and update `title` (for example `Former Ph.D. Student`). They leave the current sections and appear under Alumni on the same page.

## Local preview

```bash
npx --yes serve .
```

Then open `/squarespace/preview-people.html`.
