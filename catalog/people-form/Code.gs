/**
 * DesX people form → GitHub pull request.
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

function onFormSubmit(e) {
  var named = (e && e.namedValues) || {};
  var name = first(named["Full name"]);
  if (!name) throw new Error("Full name is required");

  var group = GROUP_FROM_ROLE[first(named["Role"])];
  if (!group) throw new Error("Unknown role: " + first(named["Role"]));

  var status = "current";
  var title = DEFAULT_TITLE[group];
  var personId = slugify(name);

  var owner = prop("GITHUB_OWNER");
  var repo = prop("GITHUB_REPO");
  var base = prop("GITHUB_BASE_BRANCH") || "main";
  var token = prop("GITHUB_TOKEN");

  var baseSha = gitGet(token, "/repos/" + owner + "/" + repo + "/git/ref/heads/" + base).object.sha;
  var jsonFile = gitGet(
    token,
    "/repos/" + owner + "/" + repo + "/contents/" + JSON_PATH + "?ref=" + encodeURIComponent(base)
  );
  var catalog = JSON.parse(Utilities.newBlob(Utilities.base64Decode(jsonFile.content.replace(/\n/g, ""))).getDataAsString());

  var existing = findPerson(catalog.people, personId);
  if (!existing) {
    existing = findPersonByName(catalog.people, name);
  }
  var isUpdate = !!existing;
  if (isUpdate) {
    personId = existing.id;
  } else {
    personId = uniqueId(catalog.people, personId);
  }

  var photoMeta = maybeUploadPhoto_(e, personId);
  var person = existing || {};
  person.id = personId;
  person.name = name;
  person.title = title;
  person.group = group;
  person.status = status;
  person.bio = first(named["Bio"]) || person.bio || "";
  person.links = person.links || {};
  var email = first(named["Email"]);
  if (email) person.links.email = email;
  applyOptionalLink_(person, namedValuesFirst(named, OPTIONAL_LINK_TITLES));
  if (photoMeta) person.photo = photoMeta.filename;
  if (!person.order && !isUpdate) person.order = nextOrder(catalog.people, group, status);

  if (!isUpdate) catalog.people.push(person);

  var branch = "people/" + (isUpdate ? "update" : "add") + "-" + personId + "-" + Date.now();
  gitPost(token, "/repos/" + owner + "/" + repo + "/git/refs", {
    ref: "refs/heads/" + branch,
    sha: baseSha,
  });

  if (photoMeta) {
    var photoPath = PHOTO_DIR + "/" + photoMeta.filename;
    var photoPut = {
      message: (isUpdate ? "Update" : "Add") + " photo for " + name,
      content: photoMeta.base64,
      branch: branch,
    };
    var existingPhoto = gitGetOptional(token, "/repos/" + owner + "/" + repo + "/contents/" + photoPath + "?ref=" + encodeURIComponent(branch));
    if (existingPhoto && existingPhoto.sha) photoPut.sha = existingPhoto.sha;
    gitPut(token, "/repos/" + owner + "/" + repo + "/contents/" + photoPath, photoPut);
  }

  var jsonBody = JSON.stringify(catalog, null, 2) + "\n";
  gitPut(token, "/repos/" + owner + "/" + repo + "/contents/" + JSON_PATH, {
    message: (isUpdate ? "Update" : "Add") + " person: " + name,
    content: Utilities.base64Encode(jsonBody),
    branch: branch,
    sha: jsonFile.sha,
  });

  var pr = gitPost(token, "/repos/" + owner + "/" + repo + "/pulls", {
    title: (isUpdate ? "Update person: " : "Add person: ") + name,
    head: branch,
    base: base,
    body: [
      isUpdate ? "Updates an existing lab member from the people form." : "Adds a lab member from the people form.",
      "",
      "- **Name:** " + name,
      "- **Id:** `" + personId + "`",
      "- **Group:** " + group,
      "- **Title:** " + title + " (auto from Role)",
      "- **Status:** current (alumni are set in desx-people.json)",
      photoMeta ? "- **Photo:** `people/photos/" + photoMeta.filename + "`" : "- **Photo:** placeholder (none uploaded)",
      "",
      "Merge to publish on /people.",
    ].join("\n"),
  });

  Logger.log("Opened PR " + pr.html_url);
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
    if (items[i].getItem().getTitle() === "Photo") return items[i];
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

function namedValuesFirst(named, titles) {
  for (var i = 0; i < titles.length; i++) {
    var v = first(named[titles[i]]);
    if (v) return v;
  }
  // Fallback: title may be a shorter label with the long text as description.
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
