/**
 * DesX Catalog renderer for Squarespace 7.0 (Bedford)
 * Loads shared GitHub JSON and renders Research rows or Tools grid.
 *
 * Mount:
 *   <div id="desx-catalog"
 *        data-kind="research|tool"
 *        data-catalog-url="https://.../desx-catalog.json">
 *   </div>
 *   <script src="https://.../desx-catalog.js" defer></script>
 */
(function () {
  "use strict";

  var BADGE_LABELS = {
    journal: "Journal paper",
    conference: "Conference paper",
    whitepaper: "White paper",
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

  function isValidResearch(item) {
    return (
      item &&
      item.kind === "research" &&
      item.id &&
      item.title &&
      item.abstract &&
      item.url &&
      item.image &&
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
      item.image &&
      Array.isArray(item.categories) &&
      item.categories.length
    );
  }

  function validateItems(items, kind) {
    var out = [];
    var seen = {};
    (items || []).forEach(function (item, index) {
      if (!item || item.kind !== kind) return;
      var ok = kind === "research" ? isValidResearch(item) : isValidTool(item);
      if (!ok) {
        console.warn("[DesX Catalog] Skipping invalid item at index " + index, item);
        return;
      }
      if (seen[item.id]) {
        console.warn("[DesX Catalog] Duplicate id skipped:", item.id);
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
      BADGE_LABELS[item.badge] || "",
      (item.categories || []).join(" "),
      (item.authors || []).join(" "),
      String(item.year || ""),
    ]
      .join(" ")
      .toLowerCase();
    return hay.indexOf(query) !== -1;
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

  function researchCardHtml(item) {
    var badgeClass = "badge-" + escapeHtml(item.badge);
    var label = BADGE_LABELS[item.badge] || item.badge;
    return (
      '<a href="' +
      escapeHtml(item.url) +
      '" class="pub-card" data-id="' +
      escapeHtml(item.id) +
      '">' +
      '<div class="pub-card-header">' +
      '<img src="' +
      escapeHtml(item.image) +
      '" alt="" loading="lazy" />' +
      '<span class="pub-badge ' +
      badgeClass +
      '">' +
      escapeHtml(label) +
      "</span>" +
      "</div>" +
      '<div class="pub-card-body">' +
      '<h3 class="pub-title">' +
      escapeHtml(item.title) +
      "</h3>" +
      '<p class="pub-abstract">' +
      escapeHtml(item.abstract) +
      "</p>" +
      "</div>" +
      "</a>"
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
      escapeHtml(item.image) +
      '" alt="" loading="lazy" />' +
      "</div>" +
      '<div class="tool-card-body">' +
      '<h3 class="tool-card-title">' +
      escapeHtml(item.title) +
      "</h3>" +
      '<p class="tool-card-blurb">' +
      escapeHtml(item.blurb) +
      "</p>" +
      "</div>" +
      "</a>"
    );
  }

  function bindRowArrows(rowEl) {
    var scroller = qs(rowEl, ".pub-scroll-container");
    var prev = qs(rowEl, ".desx-arrow-prev");
    var next = qs(rowEl, ".desx-arrow-next");
    if (!scroller || !prev || !next) return;

    function cardStep() {
      var card = qs(scroller, ".pub-card");
      if (!card) return 296;
      var style = window.getComputedStyle(scroller);
      var gap = parseFloat(style.columnGap || style.gap) || 16;
      return card.getBoundingClientRect().width + gap;
    }

    function update() {
      var max = scroller.scrollWidth - scroller.clientWidth - 2;
      prev.disabled = scroller.scrollLeft <= 2;
      next.disabled = scroller.scrollLeft >= max;
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

  function renderResearch(mount, catalog, allItems, query) {
    var filtered = allItems.filter(function (item) {
      return matchesQuery(item, query);
    });
    var cats = orderedCategories(catalog, filtered);

    if (!filtered.length) {
      mount.innerHTML =
        '<div class="desx-empty">No publications match your search.</div>';
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
          "</h2>" +
          '<div class="desx-arrows">' +
          '<button type="button" class="desx-arrow desx-arrow-prev" aria-label="Scroll left">&#8249;</button>' +
          '<button type="button" class="desx-arrow desx-arrow-next" aria-label="Scroll right">&#8250;</button>' +
          "</div>" +
          "</div>" +
          '<div class="pub-scroll-container">' +
          cards.map(researchCardHtml).join("") +
          "</div>" +
          "</div>"
        );
      })
      .join("");

    mount.innerHTML = html || '<div class="desx-empty">No publications match your search.</div>';
    qsa(mount, ".pub-row-wrapper").forEach(bindRowArrows);
  }

  function renderTools(mount, catalog, allItems, query) {
    var filtered = allItems.filter(function (item) {
      return matchesQuery(item, query);
    });

    if (!filtered.length) {
      mount.innerHTML = '<div class="desx-empty">No tools match your search.</div>';
      return;
    }

    // Prefer category sections when multiple categories exist among tools
    var cats = orderedCategories(catalog, filtered);
    var useSections = cats.length > 1;

    if (!useSections) {
      mount.innerHTML =
        '<div class="tools-grid">' + filtered.map(toolCardHtml).join("") + "</div>";
      return;
    }

    mount.innerHTML = cats
      .map(function (cat) {
        var cards = filtered.filter(function (item) {
          return (item.categories || []).indexOf(cat) !== -1;
        });
        if (!cards.length) return "";
        return (
          '<div class="tool-section" data-category="' +
          escapeHtml(cat) +
          '">' +
          '<h2 class="tool-section-title">' +
          escapeHtml(cat) +
          "</h2>" +
          '<div class="tools-grid">' +
          cards.map(toolCardHtml).join("") +
          "</div>" +
          "</div>"
        );
      })
      .join("");
  }

  function buildShell(mount, kind) {
    var placeholder = kind === "research" ? "Search publications…" : "Search tools…";
    mount.innerHTML =
      '<div class="desx-catalog-ui">' +
      '<div class="desx-search-wrap">' +
      '<label class="desx-search-label" for="desx-catalog-search">Search</label>' +
      '<input id="desx-catalog-search" class="desx-search-input" type="search" placeholder="' +
      placeholder +
      '" autocomplete="off" />' +
      "</div>" +
      '<div class="desx-catalog-results" aria-live="polite"></div>' +
      "</div>";
    return {
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

  function initMount(mount) {
    var kind = (mount.getAttribute("data-kind") || "research").toLowerCase();
    if (kind !== "research" && kind !== "tool") {
      console.error("[DesX Catalog] data-kind must be research or tool");
      return;
    }

    var shell = buildShell(mount, kind);
    shell.results.innerHTML = '<div class="desx-loading">Loading catalog…</div>';

    var url = resolveCatalogUrl(mount);

    fetch(url, { credentials: "omit", cache: "no-cache" })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status + " for " + url);
        return res.json();
      })
      .then(function (catalog) {
        var items = validateItems(catalog.items || [], kind);
        function paint() {
          var query = normalize(shell.input.value);
          if (kind === "research") renderResearch(shell.results, catalog, items, query);
          else renderTools(shell.results, catalog, items, query);
        }
        shell.input.addEventListener("input", paint);
        paint();
      })
      .catch(function (err) {
        console.error("[DesX Catalog]", err);
        shell.results.innerHTML =
          '<div class="desx-empty">Could not load catalog. Check the JSON URL and that the repo is public.</div>';
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
