/** @format */

// ============================================================
// app-optimized.js — Production Ready Application Logic
// Optimized Unified Single-File Engine
// Depends on: CONFIG (CONFIG.js must be loaded first)
// ============================================================

// ============================================================
// 1. STATE MANAGEMENT
// ============================================================
const state = {
  data: [],
  searchIndex: [], // Lightweight lowercase tokens (SKU + CATEGORY + NAME/TITLE)
  categories: [],
  selectedCategory: "",
  activeTab: CONFIG.defaultActiveTab,
  visibleCount: 0,
  lastFiltered: [],
  searchTimer: null,
  catTimer: null,
};

let imgLoadTimer = null;
let linkHoldTimer = null;
let linkHoldTriggered = false;

// ============================================================
// 2. CORE INITIALIZATION
// ============================================================
function init() {
  initTheme();
  applyTexts();
  loadCache();
  renderOptions();
  bindSearch();
  bindListClick();
  bindCategoryGrid();
  bindLoadMore();

  const cached = readDataCache();
  if (cached) {
    setData(cached.data, cached.categories);
    const loadingEl = document.getElementById("loading");
    if (loadingEl) loadingEl.style.display = "none";
    renderAll();
    fetchCSV(true); // SWR Refresh background
  } else {
    fetchCSV(false);
  }
}

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
      const timing = CONFIG.searchPlaceholderTiming || {};
      initTypewriter(search, {
        phrases,
        placeholderPrefix: "",
        typeSpeed: timing.typeSpeed,
        deleteSpeed: timing.deleteSpeed,
        holdDelay: timing.holdDelay,
        pauseDelay: timing.pauseDelay,
        efficiency: timing.efficiency,
      });
    } else {
      search.placeholder = CONFIG.texts.searchPlaceholder;
    }
  }

  const catSearch = document.querySelector(".cat-search");
  if (catSearch) {
    const catPhrases = CONFIG.filterCategoriesPlaceholderPhrases;
    if (
      Array.isArray(catPhrases) &&
      catPhrases.length &&
      typeof initTypewriter === "function"
    ) {
      const timing = CONFIG.searchPlaceholderTiming || {};
      initTypewriter(catSearch, {
        phrases: catPhrases,
        placeholderPrefix: "",
        typeSpeed: timing.typeSpeed,
        deleteSpeed: timing.deleteSpeed,
        holdDelay: timing.holdDelay,
        pauseDelay: timing.pauseDelay,
        efficiency: timing.efficiency,
      });
    } else {
      catSearch.placeholder = CONFIG.texts.filterCategoriesPlaceholder;
    }
  }

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

// ============================================================
// 3. STORAGE & CACHE CONTROLLER
// ============================================================
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
  } catch (e) {}
}

// ============================================================
// 4. DATA PIPELINE & COMPACT INDEXING
// ============================================================
function setData(data, categories) {
  state.data = data;
  state.categories = categories;

  state.searchIndex = data.map((item) => {
    let searchableStr = "";
    if (item["SKU"]) searchableStr += item["SKU"] + " ";
    if (item["CATEGORY"]) searchableStr += item["CATEGORY"] + " ";
    if (item["NAME"]) searchableStr += item["NAME"] + " ";
    if (item["TITLE"]) searchableStr += item["TITLE"] + " ";

    if (!searchableStr) {
      searchableStr = Object.values(item)
        .filter((v) => typeof v === "string" && !v.startsWith("http"))
        .join(" ");
    }
    return searchableStr.toLowerCase();
  });
}

async function fetchCSV(fromCache) {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    CONFIG.fetchTimeout || 30000,
  );
  try {
    const res = await fetch(CONFIG.csvUrl, {
      cache: "force-cache",
      signal: controller.signal,
    });
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
      const loadingEl = document.getElementById("loading");
      if (loadingEl) loadingEl.style.display = "none";
      renderAll();
    }
  } catch (err) {
    const loadingEl = document.getElementById("loading");
    if (loadingEl && !fromCache) {
      loadingEl.textContent = CONFIG.texts.loadingError;
    }
  } finally {
    clearTimeout(timeout);
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
    if ((cc === "\n" || cc === "\r") && !quote) {
      ++row;
      col = 0;
      continue;
    }
    arr[row][col] += cc;
  }

  if (arr.length === 0) return { data: [], categories: [] };

  const headers = arr[0].map((h) => h.trim());
  const data = [];
  const catSet = new Set();

  for (let i = 1; i < arr.length; i++) {
    if (arr[i].length === 1 && !arr[i][0]) continue;
    let obj = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = arr[i][j] ? arr[i][j].trim() : "";
    }
    data.push(obj);
    if (obj["CATEGORY"]) catSet.add(obj["CATEGORY"]);
  }

  return { data, categories: Array.from(catSet).sort() };
}

// ============================================================
// 5. QUERY FILTER ROUTER
// ============================================================
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

// ============================================================
// 6. HIGH-PERFORMANCE DOM RENDERING LAYER
// ============================================================
function renderList() {
  const container = document.getElementById("data-list");
  if (!container) return;
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
  if (!container) return;
  const end = Math.min(start + CONFIG.pageSize, filtered.length);

  const fragment = document.createDocumentFragment();

  const activeTabKey = state.activeTab;
  const activeTabInfo = CONFIG.tabs[activeTabKey];
  const inactiveTabs = Object.keys(CONFIG.tabs)
    .filter((key) => key !== activeTabKey)
    .map((key) => ({
      key,
      label: CONFIG.tabs[key].label,
      cols: CONFIG.tabs[key].cols,
    }));

  for (let i = start; i < end; i++) {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = createCardHTML(
      filtered[i],
      i,
      activeTabInfo,
      inactiveTabs,
    );
    fragment.appendChild(wrapper.firstElementChild);
  }

  container.appendChild(fragment);
  state.visibleCount = end;
}

function createCardHTML(item, index, activeTabInfo, inactiveTabs) {
  let html = `<div class="card" data-index="${index}">`;
  html += `<div class="card-header">`;
  html += `<div class="card-info">`;
  html += `<div class="sku-title">${escapeHtml(item["SKU"] || "-")}</div>`;
  html += `<div class="tab-preview"><div class="spec-grid">`;

  if (activeTabInfo && activeTabInfo.cols) {
    for (let j = 0; j < activeTabInfo.cols.length; j++) {
      const col = activeTabInfo.cols[j];
      const name = CONFIG.columnRenames[col] || col;
      html += `<span class="label">${escapeHtml(name)}</span>`;
      html += `<span class="colon">:</span>`;
      html += `<span class="value">${escapeHtml(item[col] || "-")}</span>`;
    }
  }

  html += `</div></div></div>`;
  html += `<button class="btn-link">${escapeHtml(CONFIG.texts.linkButton)}</button>`;
  html += `</div>`;

  html += `<div class="card-body"><div class="card-body-inner">`;
  for (let k = 0; k < inactiveTabs.length; k++) {
    const t = inactiveTabs[k];
    html += `<div class="group"><div class="group-title">${escapeHtml(t.label)}</div>`;
    html += `<div class="spec-grid">`;
    for (let j = 0; j < t.cols.length; j++) {
      const col = t.cols[j];
      const name = CONFIG.columnRenames[col] || col;
      html += `<span class="label">${escapeHtml(name)}</span>`;
      html += `<span class="colon">:</span>`;
      html += `<span class="value">${escapeHtml(item[col] || "-")}</span>`;
    }
    html += `</div></div>`;
  }
  html += `</div></div></div>`;

  return html;
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

// ============================================================
// 7. DECOUPLED GESTURE & INTERACTION CONTROLLER
// ============================================================
function cancelLinkHold() {
  clearTimeout(linkHoldTimer);
  linkHoldTimer = null;
}

function getHoldColumn() {
  return CONFIG.swapButtonActions ? "CANVA" : "LINK";
}

function getReleaseColumn() {
  return CONFIG.swapButtonActions ? "LINK" : "CANVA";
}

function getItemForBtn(btn) {
  const card = btn.closest(".card");
  if (!card) return null;
  return (state.lastFiltered || getFiltered())[
    parseInt(card.dataset.index, 10)
  ];
}

function performLinkColumnAction(column, item) {
  if (!item) return;
  const url = item[column];
  if (!url) {
    alert(
      column === "LINK" ? CONFIG.texts.noLinkAlert : CONFIG.texts.noCanvaAlert,
    );
    return;
  }
  if (column === "LINK") {
    openImageModal(url);
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

function bindListClick() {
  const container = document.getElementById("data-list");
  if (!container) return;

  container.addEventListener("pointerdown", (e) => {
    const linkBtn = e.target.closest(".btn-link");
    if (!linkBtn || (e.button !== undefined && e.button !== 0)) return;

    linkHoldTriggered = false;
    cancelLinkHold();

    if (linkBtn.setPointerCapture) {
      try {
        linkBtn.setPointerCapture(e.pointerId);
      } catch (err) {}
    }

    linkBtn.classList.add("holding");
    linkHoldTimer = setTimeout(() => {
      linkHoldTriggered = true;
      linkBtn.classList.remove("holding");
      performLinkColumnAction(getHoldColumn(), getItemForBtn(linkBtn));
    }, CONFIG.linkHoldDelay || 1000);
  });

  const releaseHold = (e) => {
    const linkBtn = e.target.closest(".btn-link");
    if (linkBtn) linkBtn.classList.remove("holding");
    cancelLinkHold();
  };

  container.addEventListener("pointerup", releaseHold);
  container.addEventListener("pointercancel", releaseHold);
  container.addEventListener("contextmenu", (e) => {
    if (e.target.closest(".btn-link")) e.preventDefault();
  });

  container.addEventListener("click", (e) => {
    const linkBtn = e.target.closest(".btn-link");
    if (linkBtn) {
      e.stopPropagation();
      e.preventDefault();

      if (linkHoldTriggered) {
        linkHoldTriggered = false;
        return;
      }
      cancelLinkHold();
      linkBtn.classList.remove("holding");
      performLinkColumnAction(getReleaseColumn(), getItemForBtn(linkBtn));
      return;
    }

    const header = e.target.closest(".card-header");
    if (header) {
      header.parentElement.classList.toggle("expanded");
    }
  });
}

// ============================================================
// 8. ASYNC IMAGE NORMALIZATION
// ============================================================
function normalizeImageUrl(url) {
  if (!url) return url;

  let m = url.match(/drive\.google\.com\/file\/d\/([^/?#]+)/);
  if (m) return `https://drive.google.com/uc?export=view&id=${m[1]}`;

  m = url.match(/docs\.google\.com\/uc\?(?:.*&)?id=([^&#]+)/);
  if (m) return `https://drive.google.com/uc?export=view&id=${m[1]}`;

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
  if (!img || !loading) return;

  clearTimeout(imgLoadTimer);
  img.onload = null;
  img.onerror = null;
  img.removeAttribute("src");

  loading.style.display = "block";
  loading.textContent = CONFIG.texts.loadingImage;
  img.style.display = "none";

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

  imgLoadTimer = setTimeout(() => {
    if (!img.complete) {
      loading.textContent = CONFIG.texts.imageLoadError;
    }
  }, CONFIG.imageLoadTimeout || 15000);

  img.src = finalUrl;
}

// ============================================================
// 9. MODERN UI FILTER PANELS (Categories & Options)
// ============================================================
function renderCategories(filterText) {
  const grid = document.getElementById("cat-grid");
  if (!grid) return;
  grid.style.gridTemplateColumns = `repeat(${CONFIG.categoryLayout.cols}, 1fr)`;
  grid.style.maxHeight = `${CONFIG.categoryLayout.rows * CONFIG.categoryItemHeight}px`;

  const term = (filterText || "").toLowerCase();
  const filtered = state.categories.filter((c) =>
    c.toLowerCase().includes(term),
  );

  let html = `<div class="cat-item ${state.selectedCategory === "" ? "active" : ""}" data-cat="">${escapeHtml(CONFIG.texts.allCategories)}</div>`;
  for (let i = 0; i < filtered.length; i++) {
    const cat = filtered[i];
    html += `<div class="cat-item ${state.selectedCategory === cat ? "active" : ""}" data-cat="${escapeHtml(cat)}" title="${escapeHtml(cat)}">${escapeHtml(cat)}</div>`;
  }
  grid.innerHTML = html;
}

function bindCategoryGrid() {
  const grid = document.getElementById("cat-grid");
  if (!grid) return;
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
  const catSearch = document.querySelector(".cat-search");
  renderCategories(catSearch ? catSearch.value : "");
  renderList();
}

function renderOptions() {
  const group = document.getElementById("opt-group");
  if (!group) return;
  group.innerHTML = "";

  const keys = Object.keys(CONFIG.tabs);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
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
  }
}

// ============================================================
// 10. SYSTEM UTILITIES
// ============================================================

// Floating Toast Notification
let toastTimer = null;

function showToast(message) {
  const toast = document.getElementById("toast-banner");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

// Global Alert Override
// Replaces standard browser alert() everywhere without modifying existing function calls
window.alert = function (message) {
  showToast(message);
};

function bindSearch() {
  const input = document.getElementById("search-input");
  if (input) {
    input.addEventListener("input", () => {
      clearTimeout(state.searchTimer);
      state.searchTimer = setTimeout(renderList, CONFIG.debounceDelay || 150);
    });
  }

  const catSearch = document.querySelector(".cat-search");
  if (catSearch) {
    catSearch.addEventListener("input", () => {
      clearTimeout(state.catTimer);
      state.catTimer = setTimeout(
        () => renderCategories(catSearch.value),
        CONFIG.debounceDelay || 150,
      );
    });
  }
}

function renderAll() {
  const catSearch = document.querySelector(".cat-search");
  renderCategories(catSearch ? catSearch.value : "");
  renderList();
}

function initTheme() {
  const saved = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = saved || (prefersDark ? "dark" : "light");
  document.documentElement.setAttribute("data-theme", theme);
  updateThemeIcon(theme);
}

function toggleTheme() {
  const current =
    document.documentElement.getAttribute("data-theme") || "light";
  const next = current === "light" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);
  updateThemeIcon(next);
}

function updateThemeIcon(theme) {
  const btn = document.getElementById("theme-toggle");
  if (btn) btn.textContent = theme === "light" ? "🌙" : "☀️";
}

function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add("active");
}

function closeModal(e, id) {
  if (e && e.target !== e.currentTarget) return;
  const el = document.getElementById(id);
  if (el) el.classList.remove("active");
  if (id === "img-modal") {
    clearTimeout(imgLoadTimer);
  }
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => "&#" + c.charCodeAt(0) + ";");
}

// Bootstrap Application Safely
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
