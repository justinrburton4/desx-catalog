/**
 * DesX people form → GitHub pull request.
 * Paste into a Google Apps Script project bound to the lab's Google Form.
 * See SETUP.md for form question titles and Script Properties.
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

var ALUMNI_TITLE = {
  directors: "Former Director",
  phd: "Former Ph.D. Student",
  masters: "Former Master's Student",
  undergraduate: "Former Undergraduate Student",
};

function onFormSubmit(e) {
  var named = (e && e.namedValues) || {};
  var name = first(named["Full name"]);
  if (!name) throw new Error("Full name is required");

  var group = GROUP_FROM_ROLE[first(named["Role"])];
  if (!group) throw new Error("Unknown role: " + first(named["Role"]));

  var statusRaw = first(named["Status"]) || "Current member";
  var status = /alumni/i.test(statusRaw) ? "alumni" : "current";
  var title = first(named["Title"]) || (status === "alumni" ? ALUMNI_TITLE[group] : DEFAULT_TITLE[group]);
  var requestedId = slugify(first(named["Existing profile id"])) || slugify(name);

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

  var personId = uniqueId(catalog.people, requestedId, first(named["Existing profile id"]));
  var existing = findPerson(catalog.people, personId);
  var isUpdate = !!existing;

  var photoMeta = maybeUploadPhoto_(e, token, owner, repo, baseSha, personId);
  var person = existing || {};
  person.id = personId;
  person.name = name;
  person.title = title;
  person.group = group;
  person.status = status;
  person.bio = first(named["Bio"]) || person.bio || "";
  person.links = person.links || {};
  var email = first(named["Email"]);
  var linkedin = first(named["LinkedIn URL"]);
  var website = first(named["Website URL"]);
  if (email) person.links.email = email;
  if (linkedin) person.links.linkedin = linkedin;
  if (website) person.links.website = website;
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
      "- **Status:** " + status,
      photoMeta ? "- **Photo:** `people/photos/" + photoMeta.filename + "`" : "- **Photo:** placeholder (none uploaded)",
      "",
      "Merge to publish on /people.",
    ].join("\n"),
  });

  Logger.log("Opened PR " + pr.html_url);
}

function maybeUploadPhoto_(e, token, owner, repo, baseSha, personId) {
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

function uniqueId(people, requestedId, explicitId) {
  if (explicitId) return slugify(explicitId);
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
