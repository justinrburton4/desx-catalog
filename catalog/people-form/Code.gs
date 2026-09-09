/**
 * DesX people form → commit directly to GitHub main.
 * Paste into a Google Apps Script project bound to the lab's Google Form.
 * See SETUP.md for form question titles and Script Properties.
 *
 * Update rules:
 * - Match existing people by name / id.
 * - Filled fields overwrite; blank fields keep the existing profile values.
 * - New profiles default to status "current".
 * - Alumni transition auto-prefixes title with "Former " (unless a custom title is provided).
 * - Ph.D. Candidate → group "phd", default title "Ph.D. Candidate".
 */

var PHOTO_DIR = "people/photos";
var JSON_PATH = "catalog/desx-people.json";
var MAX_PHOTO_BYTES = 10 * 1024 * 1024;

var GROUP_FROM_ROLE = {
  "Lab Directors": "directors",
  // Live form uses "Ph.D." (no spaces). Keep spaced "Ph. D." as a fallback.
  "Ph.D. Students": "phd",
  "Ph.D. Student": "phd",
  "Ph.D. Candidates": "phd",
  "Ph.D. Candidate": "phd",
  "Ph. D. Students": "phd",
  "Ph. D. Student": "phd",
  "Ph. D. Candidates": "phd",
  "Ph. D. Candidate": "phd",
  "Master's Students": "masters",
  "Master's Student": "masters",
  "Undergraduate Students": "undergraduate",
  "Undergraduate Student": "undergraduate",
};

var DEFAULT_TITLE = {
  directors: "Lab Co-director",
  phd: "Ph.D. Student",
  masters: "Master's Student",
  undergraduate: "Undergraduate Student",
};

// Exact Google Form question titles (try each until one matches).
// Current live form: https://forms.gle/EzdtN5JzjUkUUHBd8
var OPTIONAL_LINK_TITLES = [
  "Personal URL",
  "Optional link to your LinkedIn or other personal portfolio. Add if you want that link on your profile card on the website.",
  "Optional link to your LinkedIn or other personal portfolio",
  "LinkedIn or website",
  "LinkedIn URL",
  "Website URL",
];

var TITLE_FIELD_TITLES = [
  "Title",
  "Optional title",
  "Display title",
  "Custom title",
  "Profile title",
  "Title (optional)",
  "Optional title (leave blank to keep the default)",
];

var STATUS_FIELD_TITLES = [
  "Current lab member or Alumni",
  "Status",
  "Profile status",
  "Current or alumni",
  "Member status",
  "Alumni status",
];

var HIDE_FIELD_TITLES = [
  "Hide this profile?",
  "Hide this profile",
  "Hide profile",
  "Hidden",
  "Hide from website",
  "Visibility",
  "Show on website",
];

/**
 * Run this ONCE from the Apps Script editor (Run ▶ authorizeDesxPeople).
 * Approves UrlFetch + Drive, and verifies Script Properties + GitHub access.
 */
function authorizeDesxPeople() {
  var owner = prop("GITHUB_OWNER");
  var repo = prop("GITHUB_REPO");
  var branch = prop("GITHUB_BASE_BRANCH") || "main";
  var token = prop("GITHUB_TOKEN");

  var me = gitGet(token, "/user");
  Logger.log("GitHub user: " + (me.login || "(ok)"));

  var jsonFile = gitGet(
    token,
    "/repos/" + owner + "/" + repo + "/contents/" + JSON_PATH + "?ref=" + encodeURIComponent(branch)
  );
  Logger.log("Loaded " + JSON_PATH + " (" + jsonFile.sha + ")");

  // Touch Drive so photo uploads are authorized.
  DriveApp.getRootFolder().getName();
  Logger.log("Drive access OK. Authorization complete — submit the form again.");
}

/**
 * Run once from the editor after authorizeDesxPeople.
 * Installs an installable On form submit trigger.
 *
 * IMPORTANT: Do NOT name the handler onFormSubmit — that reserved name becomes a
 * Forms *simple* trigger, which cannot call UrlFetchApp (GitHub) or DriveApp.
 */
function installFormTrigger() {
  var form = FormApp.getActiveForm();
  if (!form) {
    throw new Error(
      "No active form. Open Apps Script from the Google Form (⋮ → Apps Script), not a standalone project."
    );
  }

  var handler = "publishPeopleFromFormSubmit";
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    var name = triggers[i].getHandlerFunction();
    if (name === handler || name === "onFormSubmit") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  ScriptApp.newTrigger(handler).forForm(form).onFormSubmit().create();
  Logger.log(
    "Installed installable trigger → " +
      handler +
      " for form: " +
      form.getTitle() +
      " (" +
      form.getId() +
      ")"
  );
  Logger.log(
    "In Triggers UI you should see Event: On form submit, Function: " + handler + " (not onFormSubmit)."
  );
  listTriggers();
}

/** Log every project trigger (run from editor to debug). */
function listTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  if (!triggers.length) {
    Logger.log("No triggers installed.");
    return;
  }
  for (var i = 0; i < triggers.length; i++) {
    var t = triggers[i];
    Logger.log(
      "Trigger #" +
        (i + 1) +
        ": function=" +
        t.getHandlerFunction() +
        " eventType=" +
        t.getEventType() +
        " source=" +
        t.getTriggerSource()
    );
  }
}

/**
 * Process the most recent form response without waiting for a trigger.
 * Run from the editor after a test submit to verify GitHub publish works.
 */
function processLatestFormResponse() {
  var form = FormApp.getActiveForm();
  if (!form) {
    throw new Error(
      "No active form. Open Apps Script from the Google Form (⋮ → Apps Script), not a standalone project."
    );
  }
  var responses = form.getResponses();
  if (!responses.length) throw new Error("This form has no responses yet.");
  var latest = responses[responses.length - 1];
  var fakeEvent = {
    namedValues: namedValuesFromResponse_(latest),
    response: latest,
  };
  Logger.log("Processing latest response from " + latest.getTimestamp());
  handleFormSubmit_(fakeEvent);
}

/**
 * Installable form-submit handler (wired by installFormTrigger).
 * Must not be named onFormSubmit — that name is a restricted simple trigger.
 */
function publishPeopleFromFormSubmit(e) {
  try {
    Logger.log("publishPeopleFromFormSubmit starting…");
    handleFormSubmit_(normalizeFormEvent_(e));
    Logger.log("publishPeopleFromFormSubmit finished OK");
  } catch (err) {
    Logger.log("DESX PEOPLE FORM ERROR: " + err);
    Logger.log(err && err.stack ? err.stack : "");
    throw err;
  }
}

/**
 * Form-bound triggers provide e.response (FormResponse), not e.namedValues
 * (that field is for spreadsheet-linked form triggers).
 */
function normalizeFormEvent_(e) {
  if (!e) throw new Error("No event object — use the form submit trigger, not Run from the editor.");

  if (e.response) {
    return {
      namedValues: namedValuesFromResponse_(e.response),
      response: e.response,
    };
  }

  if (e.namedValues && Object.keys(e.namedValues).length) {
    return e;
  }

  throw new Error(
    "Form event has no response data. Re-run installFormTrigger from the form-bound Apps Script project."
  );
}

function namedValuesFromResponse_(response) {
  var named = {};
  var items = response.getItemResponses();
  for (var i = 0; i < items.length; i++) {
    var title = items[i].getItem().getTitle();
    var value = items[i].getResponse();
    named[title] = value;
  }
  // Collect email if the form setting is on.
  try {
    var respondent = response.getRespondentEmail();
    if (respondent && !named["Email"]) named["Email"] = respondent;
  } catch (ignore) {}
  return named;
}

function handleFormSubmit_(e) {
  if (!e) throw new Error("No event object — use the form submit trigger, not Run from the editor.");

  var named = e.namedValues || {};
  logNamedKeys_(named);

  var name = answer(named, ["Full Name", "Full name", "Name"]);
  if (!name) throw new Error("Full Name is required. Seen titles: " + Object.keys(named).join(" | "));

  var owner = prop("GITHUB_OWNER");
  var repo = prop("GITHUB_REPO");
  var branch = prop("GITHUB_BASE_BRANCH") || "main";
  var token = prop("GITHUB_TOKEN");

  var jsonFile = gitGet(
    token,
    "/repos/" + owner + "/" + repo + "/contents/" + JSON_PATH + "?ref=" + encodeURIComponent(branch)
  );
  var catalog = JSON.parse(
    Utilities.newBlob(Utilities.base64Decode(jsonFile.content.replace(/\n/g, ""))).getDataAsString()
  );

  var personId = slugify(name);
  var existing = findPerson(catalog.people, personId);
  if (!existing) existing = findPersonByName(catalog.people, name);
  var isUpdate = !!existing;
  if (isUpdate) personId = existing.id;
  else personId = uniqueId(catalog.people, personId);

  var roleRaw = answer(named, ["Role"]);
  var group = null;
  if (roleRaw) {
    group = resolveGroup_(roleRaw);
    if (!group) {
      throw new Error(
        'Unknown role: "' +
          roleRaw +
          '". Expected one of: ' +
          Object.keys(GROUP_FROM_ROLE).join(", ")
      );
    }
  } else if (isUpdate) {
    group = existing.group;
  } else {
    throw new Error("Role is required for new profiles.");
  }

  var statusRaw = answer(named, STATUS_FIELD_TITLES) || answerByKeyHint_(named, ["status", "alumni"]);
  var status = resolveStatus_(statusRaw, isUpdate ? existing.status : "current");

  var customTitle = answer(named, TITLE_FIELD_TITLES) || answerByKeyHint_(named, ["optional title", "display title", "custom title"]);
  // Avoid matching the LinkedIn "title-like" question: only accept short title fields.
  if (customTitle && customTitle.length > 80) customTitle = "";

  var photoMeta = null;
  try {
    photoMeta = maybeUploadPhoto_(e, personId);
  } catch (photoErr) {
    Logger.log("Photo skipped: " + photoErr);
  }

  var person = existing ? JSON.parse(JSON.stringify(existing)) : {};
  var prevGroup = existing ? existing.group : null;
  var prevStatus = existing ? existing.status : null;

  person.id = personId;
  person.name = name;
  person.group = group;
  person.status = status;
  person.links = person.links || {};

  // Bio / email / link / photo: only overwrite when provided.
  var bio = answer(named, ["Bio"]);
  if (bio) person.bio = bio;
  else if (!isUpdate) person.bio = person.bio || "";

  var email = answer(named, ["Email"]);
  if (email) person.links.email = email;

  var optionalLink = extractOptionalLink_(e, named);
  if (optionalLink) applyOptionalLink_(person, optionalLink);

  if (photoMeta) person.photo = photoMeta.filename;

  var hideRaw = answer(named, HIDE_FIELD_TITLES) || answerByKeyHint_(named, ["hide", "hidden", "visibility"]);
  var hideResolved = resolveHidden_(hideRaw, isUpdate ? existing.hidden : false);
  if (hideResolved) person.hidden = true;
  else if (hideRaw) person.hidden = false;
  else if (!isUpdate) person.hidden = false;
  // else leave existing.hidden as-is (may be undefined)

  person.title = resolveTitle_({
    customTitle: customTitle,
    roleRaw: roleRaw,
    group: group,
    status: status,
    isUpdate: isUpdate,
    existingTitle: existing ? existing.title : "",
    previousStatus: prevStatus,
  });

  var groupOrStatusChanged =
    !isUpdate || person.group !== prevGroup || person.status !== prevStatus;
  if (groupOrStatusChanged) {
    person.order = nextOrder(catalog.people, person.group, person.status, personId);
  } else if (!person.order) {
    person.order = nextOrder(catalog.people, person.group, person.status, personId);
  }

  if (!isUpdate) catalog.people.push(person);
  else {
    for (var i = 0; i < catalog.people.length; i++) {
      if (catalog.people[i].id === personId) {
        catalog.people[i] = person;
        break;
      }
    }
  }

  if (photoMeta) {
    var photoPath = PHOTO_DIR + "/" + photoMeta.filename;
    var photoPut = {
      message: (isUpdate ? "Update" : "Add") + " photo for " + name,
      content: photoMeta.base64,
      branch: branch,
    };
    var existingPhoto = gitGetOptional(
      token,
      "/repos/" + owner + "/" + repo + "/contents/" + photoPath + "?ref=" + encodeURIComponent(branch)
    );
    if (existingPhoto && existingPhoto.sha) photoPut.sha = existingPhoto.sha;
    gitPut(token, "/repos/" + owner + "/" + repo + "/contents/" + photoPath, photoPut);
  }

  var jsonBody = JSON.stringify(catalog, null, 2) + "\n";
  var jsonCommit = gitPut(token, "/repos/" + owner + "/" + repo + "/contents/" + JSON_PATH, {
    message: (isUpdate ? "Update" : "Add") + " person: " + name,
    content: Utilities.base64Encode(jsonBody),
    branch: branch,
    sha: jsonFile.sha,
  });

  Logger.log(
    (isUpdate ? "Updated" : "Added") +
      " " +
      name +
      " [" +
      person.group +
      "/" +
      person.status +
      "] title=\"" +
      person.title +
      "\"" +
      (person.hidden ? " (hidden)" : "") +
      " on " +
      branch +
      " (" +
      ((jsonCommit.commit && jsonCommit.html_url) ||
        (jsonCommit.commit && jsonCommit.commit.html_url) ||
        "ok") +
      ")"
  );
}

function normalizeRoleKey_(roleRaw) {
  return String(roleRaw || "")
    .toLowerCase()
    .replace(/['’]/g, "'")
    .replace(/\./g, "") // "Ph. D." / "Ph.D." → "ph d" / "phd"
    .replace(/\s+/g, " ")
    .trim();
}

function resolveGroup_(roleRaw) {
  var role = String(roleRaw || "").trim();
  if (GROUP_FROM_ROLE[role]) return GROUP_FROM_ROLE[role];
  var lower = normalizeRoleKey_(role);
  if (lower.indexOf("director") >= 0) return "directors";
  if (lower.indexOf("phd") >= 0 || lower.indexOf("ph d") >= 0) return "phd";
  if (lower.indexOf("master") >= 0) return "masters";
  if (lower.indexOf("undergrad") >= 0) return "undergraduate";
  return null;
}

function defaultTitleForRole_(roleRaw, group) {
  var lower = normalizeRoleKey_(roleRaw);
  if (lower.indexOf("candidate") >= 0) return "Ph.D. Candidate";
  if (lower.indexOf("director") >= 0) return "Lab Co-director";
  return DEFAULT_TITLE[group] || "Lab Member";
}

function toAlumniTitle_(currentTitle, roleRaw, group) {
  var base = String(currentTitle || "").trim();
  if (!base) base = defaultTitleForRole_(roleRaw, group);
  if (!base) base = DEFAULT_TITLE[group] || "Student";
  base = base.replace(/^former\s+/i, "");
  return "Former " + base;
}

/**
 * Title resolution:
 * 1) Custom title field filled → use it
 * 2) Becoming alumni (new alumni or current→alumni) → Former {existing or role default}
 * 3) New profile → role default
 * 4) Update with blank title → keep existing
 */
function resolveTitle_(opts) {
  if (opts.customTitle) return String(opts.customTitle).trim();

  var becomingAlumni =
    opts.status === "alumni" && (!opts.isUpdate || opts.previousStatus !== "alumni");

  if (becomingAlumni) {
    return toAlumniTitle_(opts.existingTitle, opts.roleRaw, opts.group);
  }

  if (!opts.isUpdate) {
    return defaultTitleForRole_(opts.roleRaw, opts.group);
  }

  return opts.existingTitle || defaultTitleForRole_(opts.roleRaw, opts.group);
}

function resolveStatus_(raw, fallback) {
  var v = String(raw || "").trim().toLowerCase();
  if (!v) return fallback || "current";
  if (v.indexOf("alumni") >= 0 || v.indexOf("former") >= 0 || v === "past") return "alumni";
  if (v.indexOf("current") >= 0 || v.indexOf("active") >= 0 || v.indexOf("present") >= 0) {
    return "current";
  }
  return fallback || "current";
}

function resolveHidden_(raw, fallback) {
  var v = String(raw || "").trim().toLowerCase();
  if (!v) return !!fallback;
  if (
    v === "yes" ||
    v === "true" ||
    v === "hide" ||
    v.indexOf("hide") >= 0 ||
    v.indexOf("hidden") >= 0 ||
    v.indexOf("do not show") >= 0 ||
    v.indexOf("don't show") >= 0 ||
    v.indexOf("private") >= 0
  ) {
    return true;
  }
  if (
    v === "no" ||
    v === "false" ||
    v.indexOf("show") >= 0 ||
    v.indexOf("visible") >= 0 ||
    v.indexOf("public") >= 0 ||
    v.indexOf("display") >= 0
  ) {
    return false;
  }
  return !!fallback;
}

function maybeUploadPhoto_(e, personId) {
  var item = e && e.response && findFileItem(e.response);
  if (!item) return null;
  var files = item.getResponse();
  if (!files || !files.length) return null;
  var file = DriveApp.getFileById(files[0]);
  var blob = file.getBlob();
  if (blob.getBytes().length > MAX_PHOTO_BYTES) {
    throw new Error("Photo is larger than 10 MB");
  }
  var ext = extensionFor(blob.getContentType(), file.getName());
  var filename = personId + ext;
  return {
    filename: filename,
    base64: Utilities.base64Encode(blob.getBytes()),
  };
}

function findFileItem(response) {
  var items = response.getItemResponses();
  for (var i = 0; i < items.length; i++) {
    var title = String(items[i].getItem().getTitle() || "").toLowerCase();
    if (title === "photo" || title.indexOf("photo") >= 0 || title.indexOf("headshot") >= 0) {
      return items[i];
    }
  }
  return null;
}

function extensionFor(contentType, name) {
  var t = String(contentType || "").toLowerCase();
  if (t.indexOf("png") >= 0) return ".png";
  if (t.indexOf("webp") >= 0) return ".webp";
  if (t.indexOf("gif") >= 0) return ".gif";
  if (/\.png$/i.test(name)) return ".png";
  if (/\.webp$/i.test(name)) return ".webp";
  return ".jpg";
}

function uniqueId(people, requestedId) {
  var id = requestedId || "person";
  if (!findPerson(people, id)) return id;
  var n = 2;
  while (findPerson(people, id + "-" + n)) n++;
  return id + "-" + n;
}

function findPerson(people, id) {
  for (var i = 0; i < people.length; i++) {
    if (people[i].id === id) return people[i];
  }
  return null;
}

function findPersonByName(people, name) {
  var target = String(name || "").trim().toLowerCase();
  for (var i = 0; i < people.length; i++) {
    if (String(people[i].name || "").trim().toLowerCase() === target) return people[i];
  }
  return null;
}

function nextOrder(people, group, status, excludeId) {
  var max = 0;
  for (var i = 0; i < people.length; i++) {
    var p = people[i];
    if (excludeId && p.id === excludeId) continue;
    if (p.group === group && p.status === status && typeof p.order === "number" && p.order > max) {
      max = p.order;
    }
  }
  return max + 1;
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function first(value) {
  if (value == null) return "";
  if (Object.prototype.toString.call(value) === "[object Array]") {
    // Checkboxes can return multiple strings; join non-empty.
    var parts = [];
    for (var i = 0; i < value.length; i++) {
      var bit = String(value[i] == null ? "" : value[i]).trim();
      if (bit) parts.push(bit);
    }
    return parts.join(", ");
  }
  return String(value || "").trim();
}

function answer(named, titles) {
  for (var i = 0; i < titles.length; i++) {
    var v = first(named[titles[i]]);
    if (v) return v;
  }
  // Case-insensitive / trim fallback
  var keys = Object.keys(named || {});
  for (var t = 0; t < titles.length; t++) {
    var want = String(titles[t]).toLowerCase().trim();
    for (var k = 0; k < keys.length; k++) {
      if (String(keys[k]).toLowerCase().trim() === want) {
        var found = first(named[keys[k]]);
        if (found) return found;
      }
    }
  }
  return "";
}

/** Match a question whose title contains any of the hints (case-insensitive). */
function answerByKeyHint_(named, hints) {
  var keys = Object.keys(named || {});
  for (var h = 0; h < hints.length; h++) {
    var hint = String(hints[h]).toLowerCase();
    for (var k = 0; k < keys.length; k++) {
      var key = String(keys[k] || "");
      var lower = key.toLowerCase();
      if (lower.indexOf(hint) >= 0) {
        // Don't steal the LinkedIn/portfolio question when hunting for "title".
        if (hint.indexOf("title") >= 0 && (lower.indexOf("linkedin") >= 0 || lower.indexOf("portfolio") >= 0 || lower.indexOf("optional link") >= 0)) {
          continue;
        }
        var found = first(named[keys[k]]);
        if (found) return found;
      }
    }
  }
  return "";
}

function namedValuesFirst(named, titles) {
  for (var i = 0; i < titles.length; i++) {
    var v = first(named[titles[i]]);
    if (v) return v;
  }
  var keys = Object.keys(named || {});
  for (var k = 0; k < keys.length; k++) {
    var key = keys[k];
    var lower = key.toLowerCase();
    if (
      lower.indexOf("personal url") >= 0 ||
      lower.indexOf("linkedin") >= 0 ||
      lower.indexOf("portfolio") >= 0 ||
      lower.indexOf("website") >= 0 ||
      lower.indexOf("optional link") >= 0
    ) {
      var found = first(named[key]);
      if (found) return found;
    }
  }
  return "";
}

/**
 * Pull optional LinkedIn/website from namedValues and/or itemResponses.
 * Form titles drift; also accept any answer that looks like a URL.
 */
function extractOptionalLink_(e, named) {
  var fromNamed = namedValuesFirst(named, OPTIONAL_LINK_TITLES);
  if (fromNamed) return fromNamed;

  var keys = Object.keys(named || {});
  for (var k = 0; k < keys.length; k++) {
    var value = first(named[keys[k]]);
    if (looksLikeUrl_(value)) return value;
  }

  try {
    var response = e && e.response;
    if (response && response.getItemResponses) {
      var items = response.getItemResponses();
      for (var i = 0; i < items.length; i++) {
        var title = String(items[i].getItem().getTitle() || "");
        var lower = title.toLowerCase();
        var answerText = first(items[i].getResponse());
        if (!answerText) continue;
        if (
          lower === "email" ||
          lower === "full name" ||
          lower === "bio" ||
          lower === "role" ||
          lower === "title"
        ) {
          continue;
        }
        if (
          lower.indexOf("personal url") >= 0 ||
          lower.indexOf("linkedin") >= 0 ||
          lower.indexOf("portfolio") >= 0 ||
          lower.indexOf("website") >= 0 ||
          lower.indexOf("optional link") >= 0 ||
          looksLikeUrl_(answerText)
        ) {
          return answerText;
        }
      }
    }
  } catch (err) {
    Logger.log("extractOptionalLink_ itemResponses: " + err);
  }
  return "";
}

function looksLikeUrl_(value) {
  var v = String(value || "").trim();
  if (!v || v.length > 300) return false;
  // Whole-field URL only (avoid matching a bio that mentions a site).
  if (/\s/.test(v)) return false;
  if (/linkedin\.com/i.test(v)) return true;
  if (/^https?:\/\//i.test(v)) return true;
  if (/^www\./i.test(v)) return true;
  return false;
}

function logNamedKeys_(named) {
  try {
    Logger.log("Form titles: " + Object.keys(named || {}).join(" | "));
  } catch (ignore) {}
}

/** Store one optional URL as links.linkedin or links.website. */
function applyOptionalLink_(person, rawUrl) {
  var url = normalizeUrl_(rawUrl);
  if (!url) return;
  person.links = person.links || {};
  Logger.log("Optional link captured: " + url);
  if (/linkedin\.com/i.test(url)) {
    person.links.linkedin = url;
    if (person.links.website && /linkedin\.com/i.test(person.links.website)) {
      delete person.links.website;
    }
  } else {
    person.links.website = url;
  }
}

function normalizeUrl_(value) {
  var url = String(value || "").trim();
  if (!url) return "";
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;
  return url;
}

function prop(key) {
  var v = PropertiesService.getScriptProperties().getProperty(key);
  if (!v) throw new Error("Missing script property " + key);
  return v;
}

function gitGet(token, path) {
  return gitFetch(token, path, "get", null);
}

function gitGetOptional(token, path) {
  try {
    return gitFetch(token, path, "get", null);
  } catch (err) {
    if (String(err.message).indexOf(" → 404 ") >= 0) return null;
    throw err;
  }
}

function gitPost(token, path, body) {
  return gitFetch(token, path, "post", body);
}

function gitPut(token, path, body) {
  return gitFetch(token, path, "put", body);
}

function gitFetch(token, path, method, body) {
  var res = UrlFetchApp.fetch("https://api.github.com" + path, {
    method: method,
    muteHttpExceptions: true,
    headers: {
      Authorization: "Bearer " + token,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "desx-people-form",
    },
    contentType: "application/json",
    payload: body ? JSON.stringify(body) : undefined,
  });
  var text = res.getContentText();
  var code = res.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error("GitHub " + method.toUpperCase() + " " + path + " → " + code + " " + text);
  }
  return text ? JSON.parse(text) : {};
}
