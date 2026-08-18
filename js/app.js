/** @format */

// ============================================================
// app.js — application logic (state, rendering, CSV parsing)
// Depends on: CONFIG (CONFIG.js must be loaded first)
//
// Performance features:
//  - localStorage cache with stale-while-revalidate (low bandwidth)
//  - Precomputed lowercase search index (fast search)
//  - Debounced search input
//  - Paginated batch rendering (small DOM on low-end devices)
//  - Single delegated click listener (no per-card closures)
//  - Batched innerHTML rendering (no createElement per card)
// ============================================================

const state = {
  data: [],
  searchIndex: [], // precomputed lowercase strings, aligned with data
  categories: [],
  selectedCategory: "",
  activeTab: CONFIG.defaultActiveTab,
  visibleCount: 0, // how many filtered cards are currently rendered
  lastFiltered: [], // filtered result of the last render (for click lookup)
  searchTimer: null,
};

let imgLoadTimer = null; // timeout handle for the modal image load

// ------------------------------------------------------------
// Init
// ------------------------------------------------------------
function init() {
  injectConfigStyles();
  applyTexts();
  loadCache();
  renderOptions();
  bindSearch();
  bindListClick();
  bindCategoryGrid();
  bindLoadMore();

  const cached = readDataCache();
  if (cached) {
    // Instant first paint from cache, then refresh in background (SWR)
    setData(cached.data, cached.categories);
    document.getElementById("loading").style.display = "none";
    renderAll();
    fetchCSV(true);
  } else {
    fetchCSV(false);
  }
}

// ------------------------------------------------------------
// Config styles (injected from CONFIG.js into <head>)
// ------------------------------------------------------------
function injectConfigStyles() {
  const styles = CONFIG.styles;
  if (!styles) return;
  let cssText = "";
  Object.values(styles).forEach((css) => {
    cssText += css + "\n";
  });
  if (cssText) {
    const styleEl = document.createElement("style");
    styleEl.textContent = cssText;
    document.head.appendChild(styleEl);
  }
}

// ------------------------------------------------------------
// Texts
// ------------------------------------------------------------
function applyTexts() {
  const buttons = document.querySelectorAll(".header-controls .btn");
  if (buttons[0]) buttons[0].textContent = CONFIG.texts.categoriesButton;
  if (buttons[1]) buttons[1].textContent = CONFIG.texts.tabsButton;

  const search = document.getElementById("search-input");
  if (search) {
    const phrases = CONFIG.searchPlaceholderPhrases;
    if (
      Array.isArray(phrases) &&
      phrases.length &&
      typeof initTypewriter === "function"
    ) {
      // Rotating placeholder. initTypewriter writes to el.placeholder for
      // <input>/<textarea> elements automatically.
      const timing = CONFIG.searchPlaceholderTiming || {};
      initTypewriter(search, {
        phrases,
        placeholderPrefix: "", // phrases are full strings, no static prefix
        typeSpeed: timing.typeSpeed,
        deleteSpeed: timing.deleteSpeed,
        holdDelay: timing.holdDelay,
        pauseDelay: timing.pauseDelay,
      });
    } else {
      search.placeholder = CONFIG.texts.searchPlaceholder;
    }
  }

  const catSearch = document.querySelector(".cat-search");
  if (catSearch)
    catSearch.placeholder = CONFIG.texts.filterCategoriesPlaceholder;

  const catTitle = document.querySelector("#cat-modal .modal-header h3");
  if (catTitle) catTitle.textContent = CONFIG.texts.selectCategoryTitle;

  const optTitle = document.querySelector("#opt-modal .modal-header h3");
  if (optTitle) optTitle.textContent = CONFIG.texts.selectTabTitle;

  const loading = document.getElementById("loading");
  if (loading) loading.textContent = CONFIG.texts.loadingMessage;

  const loadMoreBtn = document.getElementById("load-more");
  if (loadMoreBtn) loadMoreBtn.textContent = CONFIG.texts.loadMore;

  const imgLoading = document.getElementById("img-loading");
  if (imgLoading) imgLoading.textContent = CONFIG.texts.loadingImage;
}

// ------------------------------------------------------------
// Preferences cache (tab + category)
// ------------------------------------------------------------
function loadCache() {
  try {
    const cache = JSON.parse(localStorage.getItem(CONFIG.cacheKey) || "{}");
    if (cache.selectedCategory !== undefined)
      state.selectedCategory = cache.selectedCategory;
    if (cache.activeTab && CONFIG.tabs[cache.activeTab])
      state.activeTab = cache.activeTab;
  } catch (e) {}
}

function saveCache() {
  localStorage.setItem(
    CONFIG.cacheKey,
    JSON.stringify({
      selectedCategory: state.selectedCategory,
      activeTab: state.activeTab,
    }),
  );
}

// ------------------------------------------------------------
// CSV data cache (stale-while-revalidate, low bandwidth)
// ------------------------------------------------------------
const DATA_CACHE_KEY = "catalogDataCache";

function readDataCache() {
  try {
    const raw = localStorage.getItem(DATA_CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (!cached || !Array.isArray(cached.data) || cached.data.length === 0)
      return null;
    return cached;
  } catch (e) {
    return null;
  }
}

function writeDataCache(data, categories) {
  try {
    localStorage.setItem(
      DATA_CACHE_KEY,
      JSON.stringify({
        data,
        categories,
        timestamp: Date.now(),
      }),
    );
  } catch (e) {
    // Quota exceeded or storage unavailable — cache is optional
  }
}

// ------------------------------------------------------------
// Data handling
// ------------------------------------------------------------
function setData(data, categories) {
  state.data = data;
  state.categories = categories;
  // Precompute lowercase search strings once (single pass)
  state.searchIndex = data.map((item) =>
    Object.values(item).join(" ").toLowerCase(),
  );
}

async function fetchCSV(fromCache) {
  try {
    const res = await fetch(CONFIG.csvUrl, { cache: "force-cache" });
    const text = await res.text();
    const { data, categories } = parseCSV(text);

    const cached = readDataCache();
    if (
      !fromCache ||
      !cached ||
      cached.timestamp > Date.now() - CONFIG.cacheTTL
    ) {
      setData(data, categories);
      writeDataCache(data, categories);
      document.getElementById("loading").style.display = "none";
      renderAll();
    }
    // If we started from cache and the background fetch succeeded,
    // only refresh the UI when the fetched data actually changed
    // or when the cache has expired (handled above).
  } catch (err) {
    if (!fromCache) {
      document.getElementById("loading").innerHTML = CONFIG.texts.loadingError;
    }
  }
}

function parseCSV(str) {
  const arr = [];
  let quote = false;
  let row = 0,
    col = 0;
  for (let c = 0; c < str.length; c++) {
    let cc = str[c],
      nc = str[c + 1];
    arr[row] = arr[row] || [];
    arr[row][col] = arr[row][col] || "";
    if (cc === '"' && quote && nc === '"') {
      arr[row][col] += cc;
      ++c;
      continue;
    }
    if (cc === '"') {
      quote = !quote;
      continue;
    }
    if (cc === "," && !quote) {
      ++col;
      continue;
    }
    if (cc === "\r" && nc === "\n" && !quote) {
      ++row;
      col = 0;
      ++c;
      continue;
    }
    if (cc === "\n" && !quote) {
      ++row;
      col = 0;
      continue;
    }
    if (cc === "\r" && !quote) {
      ++row;
      col = 0;
      continue;
    }
    arr[row][col] += cc;
  }
  const headers = arr[0].map((h) => h.trim());
  const data = [];
  for (let i = 1; i < arr.length; i++) {
    if (arr[i].length === 1 && !arr[i][0]) continue;
    let obj = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = arr[i][j] ? arr[i][j].trim() : "";
    }
    data.push(obj);
  }
  const catSet = new Set();
  data.forEach((item) => {
    if (item["CATEGORY"]) catSet.add(item["CATEGORY"]);
  });
  return {
    data,
    categories: Array.from(catSet).sort(),
  };
}

// ------------------------------------------------------------
// Filtering (uses precomputed search index)
// ------------------------------------------------------------
function getFiltered() {
  const query = document
    .getElementById("search-input")
    .value.toLowerCase()
    .trim();

  const filtered = [];
  for (let i = 0; i < state.data.length; i++) {
    const item = state.data[i];
    if (state.selectedCategory && item["CATEGORY"] !== state.selectedCategory)
      continue;
    if (query && !state.searchIndex[i].includes(query)) continue;
    filtered.push(item);
  }

  if (query) {
    // SKU matches float to top (stable)
    filtered.sort((a, b) => {
      const aSku = String(a["SKU"] || "")
        .toLowerCase()
        .includes(query)
        ? 1
        : 0;
      const bSku = String(b["SKU"] || "")
        .toLowerCase()
        .includes(query)
        ? 1
        : 0;
      return bSku - aSku;
    });
  }
  return filtered;
}

// ------------------------------------------------------------
// Rendering
// ------------------------------------------------------------
function renderList() {
  // Called on: search, category change, tab change — reset pagination
  const container = document.getElementById("data-list");
  container.innerHTML = "";
  state.visibleCount = 0;

  const filtered = getFiltered();
  state.lastFiltered = filtered;
  const loadMoreBtn = document.getElementById("load-more");
  if (filtered.length === 0) {
    if (loadMoreBtn) loadMoreBtn.style.display = "none";
    return;
  }
  renderBatch(filtered, 0);
  updateLoadMore(filtered.length);
}

function renderBatch(filtered, start) {
  const container = document.getElementById("data-list");
  // Build one large HTML string, assign once — minimal layout thrash
  let html = "";
  const end = Math.min(start + CONFIG.pageSize, filtered.length);
  for (let i = start; i < end; i++) {
    html += createCardHTML(filtered[i], i);
  }
  container.insertAdjacentHTML("beforeend", html);
  state.visibleCount = end;
}

function updateLoadMore(total) {
  const btn = document.getElementById("load-more");
  if (!btn) return;
  if (state.visibleCount < total) {
    btn.style.display = "block";
    btn.dataset.offset = state.visibleCount;
  } else {
    btn.style.display = "none";
  }
}

function bindLoadMore() {
  const btn = document.getElementById("load-more");
  if (!btn) return;
  btn.addEventListener("click", () => {
    const offset = parseInt(btn.dataset.offset || "0", 10);
    const filtered = getFiltered();
    state.lastFiltered = filtered;
    renderBatch(filtered, offset);
    updateLoadMore(filtered.length);
  });
}

// Card HTML builder — no closures, no createElement per card
function createCardHTML(item, index) {
  let html = `<div class="card" data-index="${index}">`;
  html += `<div class="card-header">`;
  html += `<div class="card-info">`;
  html += `<div class="sku-title">${escapeHtml(item["SKU"] || "-")}</div>`;
  html += `<div class="tab-preview">`;
  const activeTabInfo = CONFIG.tabs[state.activeTab];
  html += `<div class="spec-grid">`;
  activeTabInfo.cols.forEach((col) => {
    const name = CONFIG.columnRenames[col] || col;
    html += `<span class="label">${escapeHtml(name)}</span>`;
    html += `<span class="colon">:</span>`;
    html += `<span class="value">${escapeHtml(item[col] || "-")}</span>`;
  });
  html += `</div>`;
  html += `</div>`;
  html += `</div>`;
  html += `<button class="btn-link">${escapeHtml(CONFIG.texts.linkButton)}</button>`;
  html += `</div>`;

  // Body (Inactive Tabs) — wrapped in .card-body-inner for the cheap
  // grid-rows accordion (animates only the track, no full-list reflow)
  html += `<div class="card-body"><div class="card-body-inner">`;
  Object.keys(CONFIG.tabs).forEach((key) => {
    if (key === state.activeTab) return;
    const t = CONFIG.tabs[key];
    html += `<div class="group"><div class="group-title">${escapeHtml(t.label)}</div>`;
    html += `<div class="spec-grid">`;
    t.cols.forEach((col) => {
      const name = CONFIG.columnRenames[col] || col;
      html += `<span class="label">${escapeHtml(name)}</span>`;
      html += `<span class="colon">:</span>`;
      html += `<span class="value">${escapeHtml(item[col] || "-")}</span>`;
    });
    html += `</div>`;
    html += `</div>`;
  });
  html += `</div></div>`;
  html += `</div>`;
  return html;
}

// ------------------------------------------------------------
// Delegated events — one listener for the whole list
// ------------------------------------------------------------
function bindListClick() {
  const container = document.getElementById("data-list");
  container.addEventListener("click", (e) => {
    const linkBtn = e.target.closest(".btn-link");
    if (linkBtn) {
      e.stopPropagation();
      const card = e.target.closest(".card");
      const item = (state.lastFiltered || getFiltered())[
        parseInt(card.dataset.index, 10)
      ];
      if (!item) return;
      const url = item["LINK"];
      if (url) {
        openImageModal(url);
      } else {
        alert(CONFIG.texts.noLinkAlert);
      }
      return;
    }

    const header = e.target.closest(".card-header");
    if (header) {
      header.parentElement.classList.toggle("expanded");
    }
  });
}

// Google Drive share links are HTML pages — an <img> cannot render them.
// Normalize known share/uc formats into a direct image URL.
function normalizeImageUrl(url) {
  if (!url) return url;
  // drive.google.com/file/d/<ID>/view?usp=sharing
  let m = url.match(/drive\.google\.com\/file\/d\/([^/?#]+)/);
  if (m) return `https://drive.google.com/uc?export=view&id=${m[1]}`;
  // docs.google.com/uc?export=open&id=<ID>
  m = url.match(/docs\.google\.com\/uc\?(?:.*&)?id=([^&#]+)/);
  if (m) return `https://drive.google.com/uc?export=view&id=${m[1]}`;
  // Route insecure http:// images through a free HTTPS image proxy so the
  // page (served over HTTPS) never hits a mixed-content block.
  if (url.startsWith("http://")) {
    return (
      "https://images.weserv.nl/?url=" +
      encodeURIComponent(url.replace(/^https?:\/\//, ""))
    );
  }
  return url;
}

function openImageModal(url) {
  const img = document.getElementById("modal-image");
  const loading = document.getElementById("img-loading");

  // Cancel any previous load attempt — stale handlers/events must not fire
  clearTimeout(imgLoadTimer);
  img.onload = null;
  img.onerror = null;
  img.removeAttribute("src");

  // Reset spinner state
  loading.style.display = "block";
  loading.textContent = CONFIG.texts.loadingImage;
  img.style.display = "none";

  // Show the modal FIRST so the image is in the layout tree when the
  // browser begins fetching (no lazy-load deferral).
  openModal("img-modal");

  const finalUrl = normalizeImageUrl(url);
  img.onload = () => {
    clearTimeout(imgLoadTimer);
    loading.style.display = "none";
    img.style.display = "block";
  };
  img.onerror = () => {
    clearTimeout(imgLoadTimer);
    loading.textContent = CONFIG.texts.imageLoadError;
  };

  // If the URL hangs (blocked host, dead link, offline), stop the spinner
  // instead of loading forever.
  imgLoadTimer = setTimeout(() => {
    if (!img.complete) {
      loading.textContent = CONFIG.texts.imageLoadError;
    }
  }, CONFIG.imageLoadTimeout);

  img.src = finalUrl;
}

// ------------------------------------------------------------
// Category
// ------------------------------------------------------------
function extractCategories() {
  const set = new Set();
  state.data.forEach((item) => {
    if (item["CATEGORY"]) set.add(item["CATEGORY"]);
  });
  state.categories = Array.from(set).sort();
}

function renderCategories(filterText) {
  const grid = document.getElementById("cat-grid");
  grid.style.gridTemplateColumns = `repeat(${CONFIG.categoryLayout.cols}, 1fr)`;
  grid.style.maxHeight = `${CONFIG.categoryLayout.rows * CONFIG.categoryItemHeight}px`;
  grid.innerHTML = "";

  const term = (filterText || "").toLowerCase();
  const filtered = state.categories.filter((c) =>
    c.toLowerCase().includes(term),
  );

  let html = `<div class="cat-item ${state.selectedCategory === "" ? "active" : ""}" data-cat="">${escapeHtml(CONFIG.texts.allCategories)}</div>`;
  filtered.forEach((cat) => {
    html += `<div class="cat-item ${state.selectedCategory === cat ? "active" : ""}" data-cat="${escapeHtml(cat)}" title="${escapeHtml(cat)}">${escapeHtml(cat)}</div>`;
  });
  grid.innerHTML = html;
}

function bindCategoryGrid() {
  const grid = document.getElementById("cat-grid");
  grid.addEventListener("click", (e) => {
    const item = e.target.closest(".cat-item");
    if (!item) return;
    selectCategory(item.dataset.cat || "");
    closeModal(null, "cat-modal");
  });
}

function selectCategory(cat) {
  state.selectedCategory = cat;
  saveCache();
  renderCategories(document.querySelector(".cat-search").value);
  renderList();
}

// ------------------------------------------------------------
// Tabs
// ------------------------------------------------------------
function renderOptions() {
  const group = document.getElementById("opt-group");
  group.innerHTML = "";
  Object.keys(CONFIG.tabs).forEach((key) => {
    const label = document.createElement("label");
    label.className = "radio-label";

    const input = document.createElement("input");
    input.type = "radio";
    input.name = "activeTab";
    input.value = key;
    if (state.activeTab === key) input.checked = true;

    input.onchange = () => {
      state.activeTab = key;
      saveCache();
      renderList();
      closeModal(null, "opt-modal");
    };

    label.appendChild(input);
    label.appendChild(document.createTextNode(CONFIG.tabs[key].label));
    group.appendChild(label);
  });
}

// ------------------------------------------------------------
// Search (debounced)
// ------------------------------------------------------------
function bindSearch() {
  const input = document.getElementById("search-input");
  input.addEventListener("input", () => {
    clearTimeout(state.searchTimer);
    state.searchTimer = setTimeout(renderList, CONFIG.debounceDelay);
  });
  // Debounce also the category filter input
  const catSearch = document.querySelector(".cat-search");
  if (catSearch) {
    catSearch.addEventListener("input", () => {
      clearTimeout(state.catTimer);
      state.catTimer = setTimeout(
        () => renderCategories(catSearch.value),
        CONFIG.debounceDelay,
      );
    });
  }
}

function renderAll() {
  renderCategories(document.querySelector(".cat-search").value || "");
  renderList();
}

// ------------------------------------------------------------
// Modal Utils
// ------------------------------------------------------------
function openModal(id) {
  document.getElementById(id).classList.add("active");
}
function closeModal(e, id) {
  if (e && e.target !== e.currentTarget) return;
  document.getElementById(id).classList.remove("active");
  if (id === "img-modal") {
    // Cancelled by the user — stop the timeout so it can't flip UI later
    clearTimeout(imgLoadTimer);
  }
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => "&#" + c.charCodeAt(0) + ";");
}
