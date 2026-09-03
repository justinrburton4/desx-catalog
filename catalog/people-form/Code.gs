/**
 * DesX people form → commit directly to GitHub main.
 * Paste into a Google Apps Script project bound to the lab's Google Form.
 * See SETUP.md for form question titles and Script Properties.
 *
 * Form submissions always create/update as status "current".
 * Title is set from Role (Lab Directors → Lab Co-director, etc.).
 * Alumni and custom titles are edited in catalog/desx-people.json.
 */

var PHOTO_DIR = "people/photos";
var JSON_PATH = "catalog/desx-people.json";
var MAX_PHOTO_BYTES = 5 * 1024 * 1024;

var GROUP_FROM_ROLE = {
  "Lab Directors": "directors",
  "Ph.D. Students": "phd",
  "Master's Students": "masters",
  "Undergraduate Students": "undergraduate",
};

var DEFAULT_TITLE = {
  directors: "Lab Co-director",
  phd: "Ph.D. Student",
  masters: "Master's Student",
  undergraduate: "Undergraduate Student",
};

// Exact Google Form question titles (try each until one matches).
var OPTIONAL_LINK_TITLES = [
  "Optional link to your LinkedIn or other personal portfolio. Add if you want that link on your profile card on the website.",
  "Optional link to your LinkedIn or other personal portfolio",
  "LinkedIn or website",
  "LinkedIn URL",
  "Website URL",
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
 * Creates an installable On form submit trigger for THIS form-bound project.
 */
function installFormTrigger() {
  var form = FormApp.getActiveForm();
  if (!form) {
    throw new Error(
      "No active form. Open Apps Script from the Google Form (⋮ → Apps Script), not a standalone project."
    );
  }

  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "onFormSubmit") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  ScriptApp.newTrigger("onFormSubmit").forForm(form).onFormSubmit().create();
  Logger.log("Installed onFormSubmit trigger for form: " + form.getTitle() + " (" + form.getId() + ")");
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

function onFormSubmit(e) {
  try {
    handleFormSubmit_(e);
  } catch (err) {
    Logger.log("DESX PEOPLE FORM ERROR: " + err);
    Logger.log(err && err.stack ? err.stack : "");
    throw err;
  }
}

function namedValuesFromResponse_(response) {
  var named = {};
  var items = response.getItemResponses();
  for (var i = 0; i < items.length; i++) {
    var title = items[i].getItem().getTitle();
    var value = items[i].getResponse();
    named[title] = value;
  }
  return named;
}

function handleFormSubmit_(e) {
  if (!e) throw new Error("No event object — use the form submit trigger, not Run from the editor.");

  var named = (e.namedValues) || {};
  logNamedKeys_(named);

  var name = answer(named, ["Full name", "Name"]);
  if (!name) throw new Error("Full name is required. Seen titles: " + Object.keys(named).join(" | "));

  var roleRaw = answer(named, ["Role"]);
  var group = resolveGroup_(roleRaw);
  if (!group) {
    throw new Error(
      'Unknown role: "' +
        roleRaw +
        '". Expected one of: ' +
        Object.keys(GROUP_FROM_ROLE).join(", ")
    );
  }

  var status = "current";
  var title = DEFAULT_TITLE[group];
  var personId = slugify(name);

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

  var existing = findPerson(catalog.people, personId);
  if (!existing) existing = findPersonByName(catalog.people, name);
  var isUpdate = !!existing;
  if (isUpdate) personId = existing.id;
  else personId = uniqueId(catalog.people, personId);

  var photoMeta = null;
  try {
    photoMeta = maybeUploadPhoto_(e, personId);
  } catch (photoErr) {
    // Don't block publishing the profile if Drive/photo fails.
    Logger.log("Photo skipped: " + photoErr);
  }

  var person = existing || {};
  person.id = personId;
  person.name = name;
  person.title = title;
  person.group = group;
  person.status = status;
  person.bio = answer(named, ["Bio"]) || person.bio || "";
  person.links = person.links || {};
  var email = answer(named, ["Email"]);
  if (email) person.links.email = email;
  applyOptionalLink_(person, namedValuesFirst(named, OPTIONAL_LINK_TITLES));
  if (photoMeta) person.photo = photoMeta.filename;
  if (!person.order && !isUpdate) person.order = nextOrder(catalog.people, group, status);

  if (!isUpdate) catalog.people.push(person);

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
      " on " +
      branch +
      " (" +
      ((jsonCommit.commit && jsonCommit.commit.html_url) || "ok") +
      ")"
  );
}

function resolveGroup_(roleRaw) {
  var role = String(roleRaw || "").trim();
  if (GROUP_FROM_ROLE[role]) return GROUP_FROM_ROLE[role];
  var lower = role.toLowerCase().replace(/['’]/g, "'");
  if (lower.indexOf("director") >= 0) return "directors";
  if (lower.indexOf("ph.d") >= 0 || lower.indexOf("phd") >= 0 || lower.indexOf("ph d") >= 0) return "phd";
  if (lower.indexOf("master") >= 0) return "masters";
  if (lower.indexOf("undergrad") >= 0) return "undergraduate";
  return null;
}

function maybeUploadPhoto_(e, personId) {
  var item = e && e.response && findFileItem(e.response);
  if (!item) return null;
  var files = item.getResponse();
  if (!files || !files.length) return null;
  var file = DriveApp.getFileById(files[0]);
  var blob = file.getBlob();
  if (blob.getBytes().length > MAX_PHOTO_BYTES) {
    throw new Error("Photo is larger than 5 MB");
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

function nextOrder(people, group, status) {
  var max = 0;
  for (var i = 0; i < people.length; i++) {
    var p = people[i];
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
  if (Object.prototype.toString.call(value) === "[object Array]") value = value[0];
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
  if (/linkedin\.com/i.test(url)) {
    person.links.linkedin = url;
    delete person.links.website;
  } else {
    person.links.website = url;
    delete person.links.linkedin;
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
