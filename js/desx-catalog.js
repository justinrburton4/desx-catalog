/**
 * DesX Catalog renderer for Squarespace 7.0 (Bedford)
 * Loads shared GitHub JSON and renders Research, Tools, or Courses (Learn).
 */
(function () {
  "use strict";

  var DEFAULT_IMAGE =
    "https://images.squarespace-cdn.com/content/5c7ee75b92441b465f176f7f/1596559556145-XTZEC1VK1GFU1GGLWS0X/DesignExLogoFavicon.png?content-type=image%2Fpng";

  var BADGE_LABELS = {
    journal: "Journal paper",
    conference: "Conference paper",
    whitepaper: "White paper",
  };

  var COURSE_TYPE_LABELS = {
    course: "Course",
    workshop: "Workshop",
    guidebook: "Guidebook",
    tutorial: "Tutorial",
  };

  function qs(root, sel) {
    return root.querySelector(sel);
  }

  function qsa(root, sel) {
    return Array.prototype.slice.call(root.querySelectorAll(sel));
  }

  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function normalize(str) {
    return String(str || "")
      .toLowerCase()
      .trim();
  }

  function itemImage(item) {
    return item && item.image ? item.image : DEFAULT_IMAGE;
  }

  function isValidResearch(item) {
    return (
      item &&
      item.kind === "research" &&
      item.id &&
      item.title &&
      item.abstract &&
      item.url &&
      item.badge &&
      Array.isArray(item.categories) &&
      item.categories.length
    );
  }

  function isValidTool(item) {
    return (
      item &&
      item.kind === "tool" &&
      item.id &&
      item.title &&
      item.blurb &&
      item.url &&
      Array.isArray(item.categories) &&
      item.categories.length
    );
  }

  function isValidCourse(item) {
    return (
      item &&
      item.kind === "course" &&
      item.id &&
      item.title &&
      item.blurb &&
      item.url &&
      item.type &&
      COURSE_TYPE_LABELS[item.type] &&
      Array.isArray(item.categories) &&
      item.categories.length
    );
  }

  function validateItems(items, kind) {
    var out = [];
    var seen = {};
    (items || []).forEach(function (item, index) {
      if (!item || item.kind !== kind) return;
      var ok =
        kind === "research"
          ? isValidResearch(item)
          : kind === "tool"
            ? isValidTool(item)
            : isValidCourse(item);
      if (!ok) {
        console.warn("[DesX Catalog] Skipping invalid item at index " + index, item);
        return;
      }
      if (seen[item.id]) {
        console.warn("[DesX Catalog] Duplicate id skipped:", item.id);
        return;
      }
      if (item.hidden === true) {
        return;
      }
      seen[item.id] = true;
      out.push(item);
    });
    return out;
  }

  function matchesQuery(item, query) {
    if (!query) return true;
    var hay = [
      item.id,
      item.title,
      item.abstract,
      item.blurb,
      item.url,
      item.badge,
      item.type,
      COURSE_TYPE_LABELS[item.type] || "",
      BADGE_LABELS[item.badge] || "",
      item.format || "",
      item.duration || "",
      (item.categories || []).join(" "),
      (item.authors || []).join(" "),
      String(item.year || ""),
    ]
      .join(" ")
      .toLowerCase();
    return hay.indexOf(query) !== -1;
  }

  function matchesBadgeFilters(item, badges) {
    if (!badges || !badges.length) return true;
    return badges.indexOf(item.badge) !== -1;
  }

  function orderedCategories(catalog, items) {
    var order = Array.isArray(catalog.categoryOrder) ? catalog.categoryOrder.slice() : [];
    var present = {};
    items.forEach(function (item) {
      (item.categories || []).forEach(function (c) {
        present[c] = true;
      });
    });
    var result = order.filter(function (c) {
      return present[c];
    });
    Object.keys(present).forEach(function (c) {
      if (result.indexOf(c) === -1) result.push(c);
    });
    return result;
  }

  function formatAuthors(authors) {
    if (!authors || !authors.length) return "";
    return authors.join(", ");
  }

  function metaHtml(item) {
    var authors = formatAuthors(item.authors);
    var year = item.year ? String(item.year) : "";
    if (!authors && !year) {
      return '<div class="pub-meta pub-meta-empty">Author / year TBD<\/div>';
    }
    var html = '<div class="pub-meta">';
    if (year) {
      html += '<div class="pub-year">' + escapeHtml(year) + "<\/div>";
    }
    if (authors) {
      html += '<div class="pub-authors">' + escapeHtml(authors) + "<\/div>";
    }
    html += "<\/div>";
    return html;
  }

  function researchCardHtml(item, compact) {
    var badgeClass = "badge-" + escapeHtml(item.badge);
    var label = BADGE_LABELS[item.badge] || item.badge;
    var classes = "pub-card" + (compact ? " pub-card-compact" : "");

    var header = compact
      ? ""
      : '<div class="pub-card-header">' +
        '<img src="' +
        escapeHtml(itemImage(item)) +
        '" alt="" loading="lazy" />' +
        '<span class="pub-badge ' +
        badgeClass +
        '">' +
        escapeHtml(label) +
        "<\/span>" +
        "<\/div>";

    var compactBadge = compact
      ? '<span class="pub-badge pub-badge-inline ' +
        badgeClass +
        '">' +
        escapeHtml(label) +
        "<\/span>"
      : "";

    var abstract = compact
      ? ""
      : '<p class="pub-abstract">' + escapeHtml(item.abstract) + "<\/p>";

    return (
      '<a href="' +
      escapeHtml(item.url) +
      '" class="' +
      classes +
      '" data-id="' +
      escapeHtml(item.id) +
      '">' +
      header +
      '<div class="pub-card-body">' +
      compactBadge +
      '<h3 class="pub-title">' +
      escapeHtml(item.title) +
      "<\/h3>" +
      abstract +
      metaHtml(item) +
      "<\/div>" +
      "<\/a>"
    );
  }

  function toolCardHtml(item) {
    return (
      '<a href="' +
      escapeHtml(item.url) +
      '" class="tool-card" data-id="' +
      escapeHtml(item.id) +
      '">' +
      '<div class="tool-card-media">' +
      '<img src="' +
      escapeHtml(itemImage(item)) +
      '" alt="" loading="lazy" />' +
      "<\/div>" +
      '<div class="tool-card-body">' +
      '<h3 class="tool-card-title">' +
      escapeHtml(item.title) +
      "<\/h3>" +
      '<p class="tool-card-blurb">' +
      escapeHtml(item.blurb) +
      "<\/p>" +
      "<\/div>" +
      "<\/a>"
    );
  }

  function courseMetaHtml(item) {
    var bits = [];
    if (Array.isArray(item.tags) && item.tags.length) {
      bits = item.tags.slice();
    } else {
      if (item.format) bits.push(item.format);
      if (item.duration) bits.push(item.duration);
    }
    if (!bits.length) return "";
    return (
      '<ul class="course-card-meta">' +
      bits
        .map(function (b) {
          return "<li>" + escapeHtml(b) + "<\/li>";
        })
        .join("") +
      "<\/ul>"
    );
  }

  function courseCardHtml(item) {
    var typeLabel = COURSE_TYPE_LABELS[item.type] || item.type;
    return (
      '<a href="' +
      escapeHtml(item.url) +
      '" class="tool-card course-card" data-id="' +
      escapeHtml(item.id) +
      '" data-course-type="' +
      escapeHtml(item.type) +
      '">' +
      '<div class="tool-card-media course-card-media">' +
      '<img src="' +
      escapeHtml(itemImage(item)) +
      '" alt="" loading="lazy" />' +
      '<span class="course-type-badge">' +
      escapeHtml(typeLabel) +
      "<\/span>" +
      "<\/div>" +
      '<div class="tool-card-body">' +
      '<h3 class="tool-card-title">' +
      escapeHtml(item.title) +
      "<\/h3>" +
      '<p class="tool-card-blurb">' +
      escapeHtml(item.blurb) +
      "<\/p>" +
      courseMetaHtml(item) +
      "<\/div>" +
      "<\/a>"
    );
  }

  function bindRowArrows(rowEl) {
    var scroller = qs(rowEl, ".pub-scroll-container");
    var arrows = qs(rowEl, ".desx-arrows");
    var prev = qs(rowEl, ".desx-arrow-prev");
    var next = qs(rowEl, ".desx-arrow-next");
    if (!scroller || !prev || !next || !arrows) return;

    function cardStep() {
      var card = qs(scroller, ".pub-card, .tool-card, .course-card");
      if (!card) return 296;
      var style = window.getComputedStyle(scroller);
      var gap = parseFloat(style.columnGap || style.gap) || 16;
      return card.getBoundingClientRect().width + gap;
    }

    function positionArrows() {
      var card = qs(scroller, ".pub-card, .tool-card, .course-card");
      if (!card) return;
      var half = Math.round(card.getBoundingClientRect().width / 2);
      arrows.style.right = half + "px";
    }

    function update() {
      var max = scroller.scrollWidth - scroller.clientWidth - 2;
      var canScroll = max > 2;
      var atStart = scroller.scrollLeft <= 2;
      var atEnd = scroller.scrollLeft >= max;

      prev.classList.toggle("is-hidden", atStart);
      prev.disabled = atStart;
      next.disabled = !canScroll || atEnd;
      next.style.visibility = canScroll ? "visible" : "hidden";
      positionArrows();
    }

    prev.addEventListener("click", function () {
      scroller.scrollBy({ left: -cardStep(), behavior: "smooth" });
    });
    next.addEventListener("click", function () {
      scroller.scrollBy({ left: cardStep(), behavior: "smooth" });
    });
    scroller.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  function renderResearch(mount, catalog, allItems, state) {
    var filtered = allItems.filter(function (item) {
      return matchesQuery(item, state.query) && matchesBadgeFilters(item, state.badges);
    });
    var cats = orderedCategories(catalog, filtered);
    var compact = state.layout === "compact";

    if (!filtered.length) {
      mount.innerHTML =
        '<div class="desx-empty">No publications match your search.<\/div>';
      return;
    }

    var html = cats
      .map(function (cat) {
        var cards = filtered.filter(function (item) {
          return (item.categories || []).indexOf(cat) !== -1;
        });
        if (!cards.length) return "";
        return (
          '<div class="pub-row-wrapper" data-category="' +
          escapeHtml(cat) +
          '">' +
          '<div class="pub-row-header">' +
          '<h2 class="pub-row-title">' +
          escapeHtml(cat) +
          "<\/h2>" +
          "<\/div>" +
          '<div class="pub-scroll-shell">' +
          '<div class="pub-scroll-container' +
          (compact ? " is-compact" : "") +
          '">' +
          cards
            .map(function (item) {
              return researchCardHtml(item, compact);
            })
            .join("") +
          "<\/div>" +
          '<div class="desx-arrows">' +
          '<button type="button" class="desx-arrow desx-arrow-prev is-hidden" aria-label="Scroll left">&#8249;<\/button>' +
          '<button type="button" class="desx-arrow desx-arrow-next" aria-label="Scroll right">&#8250;<\/button>' +
          "<\/div>" +
          "<\/div>" +
          "<\/div>"
        );
      })
      .join("");

    mount.className =
      "desx-catalog-results" + (compact ? " desx-layout-compact" : " desx-layout-detailed");
    mount.innerHTML = html || '<div class="desx-empty">No publications match your search.<\/div>';
    qsa(mount, ".pub-row-wrapper").forEach(bindRowArrows);
  }

  function renderTools(mount, catalog, allItems, query) {
    var filtered = allItems.filter(function (item) {
      return matchesQuery(item, query);
    });

    if (!filtered.length) {
      mount.innerHTML = '<div class="desx-empty">No tools match your search.<\/div>';
      return;
    }

    var cats = orderedCategories(catalog, filtered);
    var html = cats
      .map(function (cat) {
        var cards = filtered.filter(function (item) {
          return (item.categories || []).indexOf(cat) !== -1;
        });
        if (!cards.length) return "";
        return (
          '<div class="pub-row-wrapper tool-section" data-category="' +
          escapeHtml(cat) +
          '">' +
          '<div class="pub-row-header">' +
          '<h2 class="pub-row-title tool-section-title">' +
          escapeHtml(cat) +
          "<\/h2>" +
          "<\/div>" +
          '<div class="pub-scroll-shell">' +
          '<div class="pub-scroll-container tools-grid">' +
          cards.map(toolCardHtml).join("") +
          "<\/div>" +
          '<div class="desx-arrows">' +
          '<button type="button" class="desx-arrow desx-arrow-prev is-hidden" aria-label="Scroll left">&#8249;<\/button>' +
          '<button type="button" class="desx-arrow desx-arrow-next" aria-label="Scroll right">&#8250;<\/button>' +
          "<\/div>" +
          "<\/div>" +
          "<\/div>"
        );
      })
      .join("");

    mount.className = "desx-catalog-results desx-layout-detailed";
    mount.innerHTML = html || '<div class="desx-empty">No tools match your search.<\/div>';
    qsa(mount, ".pub-row-wrapper").forEach(bindRowArrows);
  }

  function courseTypeLabel(item) {
    return COURSE_TYPE_LABELS[item.type] || item.type || "";
  }

  function sortCoursesForGrid(items) {
    return items.slice().sort(function (a, b) {
      var orderA = typeof a.order === "number" ? a.order : 9999;
      var orderB = typeof b.order === "number" ? b.order : 9999;
      if (orderA !== orderB) return orderA - orderB;
      var titleA = normalize(a.title);
      var titleB = normalize(b.title);
      if (titleA < titleB) return -1;
      if (titleA > titleB) return 1;
      return 0;
    });
  }

  function renderCourses(mount, catalog, allItems, query) {
    var filtered = sortCoursesForGrid(
      allItems.filter(function (item) {
        return matchesQuery(item, query);
      })
    );

    if (!filtered.length) {
      mount.innerHTML = '<div class="desx-empty">No courses match your search.<\/div>';
      return;
    }

    mount.className =
      "desx-catalog-results desx-layout-detailed desx-kind-course";
    mount.innerHTML =
      '<div class="course-grid" role="list">' +
      filtered.map(courseCardHtml).join("") +
      "<\/div>";
  }

  function selectedBadges(root) {
    return qsa(root, ".desx-filter-badge.is-active").map(function (btn) {
      return btn.getAttribute("data-badge");
    });
  }

  function buildShell(mount, kind) {
    var placeholder =
      kind === "research"
        ? "Search publications…"
        : kind === "course"
          ? "Search courses…"
          : "Search tools…";
    var ariaSearch =
      kind === "research"
        ? "Search publications"
        : kind === "course"
          ? "Search courses"
          : "Search tools";
    var filters =
      kind === "research"
        ? '<div class="desx-toolbar-controls">' +
          '<div class="desx-control-group">' +
          '<div class="desx-control-label">Filter by paper type<\/div>' +
          '<div class="desx-filters" role="group" aria-label="Filter by paper type">' +
          '<button type="button" class="desx-filter-badge is-active" data-badge="journal">Journal<\/button>' +
          '<button type="button" class="desx-filter-badge is-active" data-badge="conference">Conference<\/button>' +
          '<button type="button" class="desx-filter-badge is-active" data-badge="whitepaper">White paper<\/button>' +
          "<\/div>" +
          "<\/div>" +
          '<div class="desx-control-group">' +
          '<div class="desx-control-label">Layout<\/div>' +
          '<div class="desx-layout-toggle" data-layout="detailed" role="group" aria-label="Layout">' +
          '<span class="desx-layout-thumb" aria-hidden="true"><\/span>' +
          '<button type="button" class="desx-layout-btn is-active" data-layout="detailed">Detailed<\/button>' +
          '<button type="button" class="desx-layout-btn" data-layout="compact">Compact<\/button>' +
          "<\/div>" +
          "<\/div>" +
          "<\/div>"
        : "";

    mount.innerHTML =
      '<div class="desx-catalog-ui' +
      (kind === "course" ? " desx-catalog-ui--course" : "") +
      '">' +
      '<div class="desx-toolbar">' +
      '<div class="desx-search-wrap">' +
      '<input id="desx-catalog-search" class="desx-search-input" type="search" placeholder="' +
      placeholder +
      '" autocomplete="off" aria-label="' +
      ariaSearch +
      '" />' +
      "<\/div>" +
      filters +
      "<\/div>" +
      '<div class="desx-catalog-results desx-layout-detailed" aria-live="polite"><\/div>' +
      "<\/div>";
    return {
      root: qs(mount, ".desx-catalog-ui"),
      input: qs(mount, "#desx-catalog-search"),
      results: qs(mount, ".desx-catalog-results"),
    };
  }

  function resolveCatalogUrl(mount) {
    return (
      mount.getAttribute("data-catalog-url") ||
      window.DESX_CATALOG_URL ||
      "/catalog/desx-catalog.json"
    );
  }

  function withCacheBust(url) {
    var sep = String(url).indexOf("?") >= 0 ? "&" : "?";
    return url + sep + "_=" + Date.now();
  }

  function parseGithubRaw(url) {
    var m = String(url).match(
      /^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/?#]+)\/([^?#]+)/
    );
    if (!m) return null;
    return { owner: m[1], repo: m[2], ref: m[3], path: m[4] };
  }

  function fetchJson(url) {
    return fetch(url, { credentials: "omit", cache: "no-store" }).then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status + " for " + url);
      return res.json();
    });
  }

  // Always load the latest GitHub file. Looks up the current commit SHA so
  // raw.githubusercontent.com cannot serve a stale cached copy of /main/.
  function fetchCatalogJson(url) {
    var gh = parseGithubRaw(url);
    if (!gh) return fetchJson(withCacheBust(url));

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
        return fetchJson(
          "https://raw.githubusercontent.com/" +
            gh.owner +
            "/" +
            gh.repo +
            "/" +
            sha +
            "/" +
            gh.path
        );
      })
      .catch(function () {
        return fetchJson(withCacheBust(url));
      });
  }

  function initMount(mount) {
    var kind = (mount.getAttribute("data-kind") || "research").toLowerCase();
    if (kind !== "research" && kind !== "tool" && kind !== "course") {
      console.error("[DesX Catalog] data-kind must be research, tool, or course");
      return;
    }

    var shell = buildShell(mount, kind);
    shell.results.innerHTML = '<div class="desx-loading">Loading catalog…<\/div>';

    var state = {
      query: "",
      badges: [],
      layout: "detailed",
    };

    fetchCatalogJson(resolveCatalogUrl(mount)).then(function (catalog) {
        var items = validateItems(catalog.items || [], kind);

        function paint() {
          state.query = normalize(shell.input.value);
          state.badges = selectedBadges(shell.root);
          if (kind === "research") renderResearch(shell.results, catalog, items, state);
          else if (kind === "course") renderCourses(shell.results, catalog, items, state.query);
          else renderTools(shell.results, catalog, items, state.query);
        }

        shell.input.addEventListener("input", paint);

        qsa(shell.root, ".desx-filter-badge").forEach(function (btn) {
          btn.addEventListener("click", function () {
            btn.classList.toggle("is-active");
            paint();
          });
        });

        qsa(shell.root, ".desx-layout-btn").forEach(function (btn) {
          btn.addEventListener("click", function () {
            var layout = btn.getAttribute("data-layout") || "detailed";
            var toggle = qs(shell.root, ".desx-layout-toggle");
            qsa(shell.root, ".desx-layout-btn").forEach(function (b) {
              b.classList.toggle("is-active", b === btn);
            });
            if (toggle) toggle.setAttribute("data-layout", layout);
            state.layout = layout;
            paint();
          });
        });

        paint();
      })
      .catch(function (err) {
        console.error("[DesX Catalog]", err);
        shell.results.innerHTML =
          '<div class="desx-empty">Could not load catalog. Check the JSON URL and that the repo is public.<\/div>';
      });
  }

  function boot() {
    qsa(document, "#desx-catalog, [data-desx-catalog]").forEach(initMount);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
