(function () {
  "use strict";

  var OWNER_REPO = "justinrburton4/desx-catalog";
  var DEFAULT_JSON =
    "https://raw.githubusercontent.com/" + OWNER_REPO + "/main/catalog/desx-people.json";
  var DEFAULT_PLACEHOLDER = "placeholder.png";

  function qs(root, sel) {
    return root.querySelector(sel);
  }

  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function slugifyName(name) {
    return String(name || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function parseGithubRaw(url) {
    var m = String(url).match(
      /^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/?#]+)\/([^?#]+)/
    );
    if (!m) return null;
    return { owner: m[1], repo: m[2], ref: m[3], path: m[4] };
  }

  function withCacheBust(url) {
    var sep = String(url).indexOf("?") >= 0 ? "&" : "?";
    return url + sep + "_=" + Date.now();
  }

  function fetchJson(url) {
    return fetch(url, { credentials: "omit", cache: "no-store" }).then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status + " for " + url);
      return res.json();
    });
  }

  function fetchPeopleJson(url) {
    var gh = parseGithubRaw(url);
    if (!gh) {
      return fetchJson(withCacheBust(url)).then(function (data) {
        return { data: data, version: "direct-" + Date.now(), assetBase: assetBaseFromUrl(url) };
      });
    }

    var api =
      "https://api.github.com/repos/" +
      gh.owner +
      "/" +
      gh.repo +
      "/commits?path=" +
      encodeURIComponent(gh.path) +
      "&sha=" +
      encodeURIComponent(gh.ref) +
      "&per_page=1";

    return fetch(api, {
      credentials: "omit",
      cache: "no-store",
      headers: { Accept: "application/vnd.github+json" },
    })
      .then(function (res) {
        if (!res.ok) throw new Error("GitHub API " + res.status);
        return res.json();
      })
      .then(function (commits) {
        var sha = commits && commits[0] && commits[0].sha;
        if (!sha) throw new Error("No commit SHA");
        var raw =
          "https://raw.githubusercontent.com/" +
          gh.owner +
          "/" +
          gh.repo +
          "/" +
          sha +
          "/" +
          gh.path;
        var assetBase =
          "https://raw.githubusercontent.com/" + gh.owner + "/" + gh.repo + "/" + sha;
        return fetchJson(raw).then(function (data) {
          return { data: data, version: sha, assetBase: assetBase };
        });
      })
      .catch(function () {
        return fetchJson(withCacheBust(url)).then(function (data) {
          return {
            data: data,
            version: "fallback-" + Date.now(),
            assetBase: assetBaseFromUrl(url),
          };
        });
      });
  }

  function assetBaseFromUrl(url) {
    var gh = parseGithubRaw(url);
    if (gh) {
      return "https://raw.githubusercontent.com/" + gh.owner + "/" + gh.repo + "/" + gh.ref;
    }
    try {
      var u = new URL(url, window.location.href);
      var parts = u.pathname.split("/");
      var catalogIdx = parts.lastIndexOf("catalog");
      if (catalogIdx > 0) {
        return u.origin + parts.slice(0, catalogIdx).join("/");
      }
      return u.origin;
    } catch (e) {
      return "";
    }
  }

  function photoBase(assetBase) {
    return String(assetBase || "").replace(/\/$/, "") + "/people/photos/";
  }

  function placeholderUrl(data, assetBase) {
    var placeholder = (data && data.placeholder) || DEFAULT_PLACEHOLDER;
    return photoBase(assetBase) + placeholder;
  }

  /** Prefer JSON photo, then {id}.jpg / {id}.png, then placeholder — no JSON edit needed for new files. */
  function photoCandidates(person, data, assetBase) {
    var base = photoBase(assetBase);
    var placeholder = (data && data.placeholder) || DEFAULT_PLACEHOLDER;
    var id = person && person.id ? String(person.id).replace(/^\/+/, "") : "";
    var seen = {};
    var out = [];
    function push(name) {
      var n = String(name || "").replace(/^\/+/, "");
      if (!n || seen[n]) return;
      seen[n] = true;
      out.push(base + n);
    }
    if (person && person.photo) push(person.photo);
    if (id) {
      push(id + ".jpg");
      push(id + ".png");
    }
    push(placeholder);
    return out;
  }

  function photoUrl(person, data, assetBase) {
    return photoCandidates(person, data, assetBase)[0];
  }

  function visiblePeople(data) {
    return (data.people || []).filter(function (p) {
      return p && !p.hidden;
    });
  }

  function sortPeople(list) {
    return list.slice().sort(function (a, b) {
      var ao = typeof a.order === "number" ? a.order : 9999;
      var bo = typeof b.order === "number" ? b.order : 9999;
      if (ao !== bo) return ao - bo;
      return String(a.name).localeCompare(String(b.name));
    });
  }

  function matchesQuery(person, q) {
    if (!q) return true;
    var hay = [person.name, person.title, person.bio, person.group, person.status]
      .join(" ")
      .toLowerCase();
    return hay.indexOf(q) !== -1;
  }

  function isLinkedInUrl(url) {
    return /linkedin\.com/i.test(String(url || ""));
  }

  function linkList(person) {
    var links = (person && person.links) || {};
    var bits = [];
    if (links.email) {
      bits.push(
        '<a href="mailto:' +
          escapeHtml(links.email) +
          '" onclick="event.stopPropagation()">' +
          "Email</a>"
      );
    }
    var urls = [];
    var seen = {};
    function addUrl(raw) {
      var url = String(raw || "").trim();
      if (!url || seen[url]) return;
      seen[url] = true;
      urls.push(url);
    }
    addUrl(links.linkedin);
    addUrl(links.website);
    urls.forEach(function (url) {
      var label = isLinkedInUrl(url) ? "LinkedIn" : "Website";
      bits.push(
        '<a href="' +
          escapeHtml(url) +
          '" target="_blank" rel="noopener" onclick="event.stopPropagation()">' +
          label +
          "</a>"
      );
    });
    if (!bits.length) return "";
    return '<div class="desx-person-links">' + bits.join("") + "</div>";
  }

  function personCardHtml(person, data, assetBase) {
    var candidates = photoCandidates(person, data, assetBase);
    return (
      '<button type="button" class="desx-person-card" data-person-id="' +
      escapeHtml(person.id) +
      '" aria-label="' +
      escapeHtml(person.name) +
      '">' +
      '<div class="desx-person-photo">' +
      '<img src="' +
      escapeHtml(candidates[0]) +
      '" alt="" loading="lazy" data-photo-fallbacks="' +
      escapeHtml(candidates.slice(1).join("|")) +
      '" />' +
      "</div>" +
      '<h3 class="desx-person-name">' +
      escapeHtml(person.name) +
      "</h3>" +
      '<p class="desx-person-title">' +
      escapeHtml(person.title) +
      "</p>" +
      linkList(person) +
      "</button>"
    );
  }

  function renderSection(title, intro, people, data, assetBase) {
    if (!people.length) return "";
    var cards = people
      .map(function (p) {
        return personCardHtml(p, data, assetBase);
      })
      .join("");
    return (
      '<section class="desx-people-section">' +
      '<h2 class="desx-people-section-title">' +
      escapeHtml(title) +
      "</h2>" +
      (intro
        ? '<p class="desx-people-section-intro">' + escapeHtml(intro) + "</p>"
        : "") +
      '<div class="desx-people-grid">' +
      cards +
      "</div></section>"
    );
  }

  function groupMeta(data, key) {
    return (data.groups && data.groups[key]) || { label: key };
  }

  function renderDirectory(data, query, assetBase) {
    var q = String(query || "").trim().toLowerCase();
    var people = visiblePeople(data).filter(function (p) {
      return matchesQuery(p, q);
    });
    var html = "";
    var i;
    var key;
    var currentOrder = data.groupOrder || [];
    var alumniOrder = data.alumniGroupOrder || [];

    for (i = 0; i < currentOrder.length; i++) {
      key = currentOrder[i];
      html += renderSection(
        groupMeta(data, key).label,
        groupMeta(data, key).intro,
        sortPeople(
          people.filter(function (p) {
            return p.status === "current" && p.group === key;
          })
        ),
        data,
        assetBase
      );
    }

    var alumni = people.filter(function (p) {
      return p.status === "alumni";
    });
    if (alumni.length) {
      html +=
        '<section class="desx-people-section">' +
        '<h2 class="desx-people-section-title">Alumni</h2>' +
        '<p class="desx-people-section-intro">Former lab members who have graduated and moved on to new roles and opportunities.</p>';
      for (i = 0; i < alumniOrder.length; i++) {
        key = alumniOrder[i];
        var subset = sortPeople(
          alumni.filter(function (p) {
            return p.group === key;
          })
        );
        if (!subset.length) continue;
        html +=
          '<h3 class="desx-people-subsection-title">' +
          escapeHtml(groupMeta(data, key).alumniLabel || "Former " + groupMeta(data, key).label) +
          "</h3>" +
          '<div class="desx-people-grid" style="margin-bottom:36px">' +
          subset
            .map(function (p) {
              return personCardHtml(p, data, assetBase);
            })
            .join("") +
          "</div>";
      }
      html += "</section>";
    }

    if (!html) {
      html = '<p class="desx-people-empty">No matching lab members.</p>';
    }
    return html;
  }

  function bindFallbacks(root) {
    var imgs = root.querySelectorAll("img[data-photo-fallbacks], img[data-fallback]");
    Array.prototype.forEach.call(imgs, function (img) {
      if (img.getAttribute("data-photo-bound")) return;
      img.setAttribute("data-photo-bound", "1");
      img.addEventListener("error", function () {
        var chain = (img.getAttribute("data-photo-fallbacks") || "").split("|").filter(Boolean);
        var legacy = img.getAttribute("data-fallback");
        if (legacy) chain.push(legacy);
        while (chain.length) {
          var next = chain.shift();
          img.setAttribute("data-photo-fallbacks", chain.join("|"));
          if (next && img.src !== next) {
            img.src = next;
            return;
          }
        }
      });
    });
  }

  function openModal(ui, person, data, assetBase) {
    var modal = qs(ui, ".desx-people-modal");
    if (!modal || !person) return;
    qs(modal, ".desx-people-modal-name").textContent = person.name;
    qs(modal, ".desx-people-modal-title").textContent = person.title;
    qs(modal, ".desx-people-modal-bio").textContent = person.bio || "";
    var img = qs(modal, ".desx-people-modal-photo img");
    var candidates = photoCandidates(person, data, assetBase);
    img.removeAttribute("data-photo-bound");
    img.src = candidates[0];
    img.setAttribute("data-photo-fallbacks", candidates.slice(1).join("|"));
    img.removeAttribute("data-fallback");
    bindFallbacks(modal);
    qs(modal, ".desx-people-modal-links").innerHTML = linkList(person);
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    try {
      var url = new URL(window.location.href);
      url.searchParams.set("p", person.id);
      window.history.replaceState({}, "", url);
    } catch (e) {
      /* ignore */
    }
  }

  function closeModal(ui) {
    var modal = qs(ui, ".desx-people-modal");
    if (!modal) return;
    modal.hidden = true;
    document.body.style.overflow = "";
    try {
      var url = new URL(window.location.href);
      url.searchParams.delete("p");
      window.history.replaceState({}, "", url);
    } catch (e) {
      /* ignore */
    }
  }

  function mount(el) {
    var jsonUrl = el.getAttribute("data-people-url") || window.DESX_PEOPLE_URL || DEFAULT_JSON;
    el.innerHTML =
      '<div class="desx-people-ui">' +
      '<input class="desx-people-search" type="search" placeholder="Search lab members" aria-label="Search lab members" />' +
      '<div class="desx-people-results" aria-live="polite"><p class="desx-people-empty">Loading lab members…</p></div>' +
      '<div class="desx-people-modal" hidden>' +
      '<div class="desx-people-modal-backdrop" data-close="1"></div>' +
      '<div class="desx-people-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="desx-people-modal-name">' +
      '<button type="button" class="desx-people-modal-close" aria-label="Close" data-close="1">&times;</button>' +
      '<div class="desx-people-modal-layout">' +
      '<div class="desx-people-modal-photo"><img alt="" /></div>' +
      "<div>" +
      '<h3 class="desx-people-modal-name" id="desx-people-modal-name"></h3>' +
      '<p class="desx-people-modal-title"></p>' +
      '<div class="desx-people-modal-links"></div>' +
      '<p class="desx-people-modal-bio"></p>' +
      "</div></div></div></div></div>";

    var ui = qs(el, ".desx-people-ui");
    var results = qs(ui, ".desx-people-results");
    var search = qs(ui, ".desx-people-search");
    var state = { data: null, assetBase: "", peopleById: {} };

    function paint() {
      if (!state.data) return;
      results.innerHTML = renderDirectory(state.data, search.value, state.assetBase);
      bindFallbacks(results);
    }

    search.addEventListener("input", paint);

    ui.addEventListener("click", function (ev) {
      var closeEl = ev.target.closest("[data-close]");
      if (closeEl) {
        closeModal(ui);
        return;
      }
      var card = ev.target.closest(".desx-person-card");
      if (!card) return;
      var person = state.peopleById[card.getAttribute("data-person-id")];
      openModal(ui, person, state.data, state.assetBase);
    });

    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape") closeModal(ui);
    });

    fetchPeopleJson(jsonUrl)
      .then(function (payload) {
        state.data = payload.data;
        state.assetBase = el.getAttribute("data-asset-base") || payload.assetBase;
        state.peopleById = {};
        visiblePeople(state.data).forEach(function (p) {
          state.peopleById[p.id] = p;
        });
        paint();
        try {
          var wanted = new URL(window.location.href).searchParams.get("p");
          if (wanted && state.peopleById[wanted]) {
            openModal(ui, state.peopleById[wanted], state.data, state.assetBase);
          }
        } catch (e) {
          /* ignore */
        }
      })
      .catch(function (err) {
        results.innerHTML =
          '<p class="desx-people-error">Could not load the people directory.</p>';
        console.error("[DesX People]", err);
      });
  }

  function boot() {
    var nodes = document.querySelectorAll("#desx-people, [data-desx-people]");
    Array.prototype.forEach.call(nodes, mount);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  window.DesxPeople = { slugifyName: slugifyName, mount: mount };
})();
