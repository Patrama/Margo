/** @format */

// ============================================================
// CONFIG.js — all crucial / tunable values for the application
// ============================================================
const CONFIG = {
  // Google Sheets CSV source (published)
  csvUrl:
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vSomjHV5YQROVr9ZJ5U69kOw0F4p_TZgLmvikpNM4CXSGLkRxYsjgyaaHI-onX_uXg7jL7wJuJMj0t1/pub?gid=621905479&single=true&output=csv",

  // Category 4x4 layout mapping
  categoryLayout: { rows: 4, cols: 4 },

  // Height of a single category grid item (px) — used to limit visible rows
  categoryItemHeight: 48,

  // Default active tab shown in the card preview
  defaultActiveTab: "ONLINE_PRICE",

  // localStorage key used to persist user preferences
  cacheKey: "catalogCache",

  // Batch size for paginated list rendering (keeps DOM small on low-end devices)
  pageSize: 50,

  // Debounce delay (ms) for the search input
  debounceDelay: 250,

  // How long (ms) the cached CSV data is considered fresh before a force refresh
  cacheTTL: 24 * 60 * 60 * 1000, // 24 hours

  // Max time (ms) to wait for a modal image load before showing an error.
  // Prevents an infinite spinner when the URL hangs or is blocked.
  imageLoadTimeout: 20000,

  // Wide-screen breakpoint (px) for switching to the multi-column grid
  gridBreakpoint: 900,

  // Container width on large screens
  containerMaxWidth: 1400,

  // Minimum card width inside the multi-column grid
  cardMinWidth: 320,

  // Rename raw CSV column headers for display
  columnRenames: {
    BERAT: "Berat (gr)",
    "MIN PEMBELIAN (PCS)": "Min Buy",
    "MAKS. PEMBELIAN (PCS)": "Max Buy",
    "HARGA ON": "Online Price",
    "GROSS ON": "Online Gross",
    "HARGA OFF": "Offline Price",
    "GROSS OFF": "Offline Gross",
    // LINK: "Gambar",
  },

  // CSS injected into <head> at runtime (keeps layout tuning in CONFIG)
  styles: {
    specGrid: `
.spec-grid {
  display: grid;
  grid-template-columns: auto auto 1fr; /* 1st col wraps label, 2nd col wraps colon, 3rd takes remaining space */
  gap: 4px 12px; /* Row gap and column gap */
  align-items: center;
}
`,
  },

  // Tab definitions: label + which CSV columns to display
  tabs: {
    ONLINE_PRICE: { label: "ONLINE PRICE 💰", cols: ["HARGA ON", "GROSS ON"] },
    OFFLINE_PRICE: {
      label: "OFFLINE PRICE 🏪",
      cols: ["HARGA OFF", "GROSS OFF"],
    },
    DETAILS: {
      label: "DETAILS 📦",
      cols: ["BERAT", "MIN PEMBELIAN (PCS)", "MAKS. PEMBELIAN (PCS)"],
    },
  },

  // Rotating phrases typed into the search box placeholder (typewriter
  // effect). Leave empty ([]) to fall back to the static searchPlaceholder
  // text below with no animation.
  searchPlaceholderPhrases: [
    "Search SKU or others... 🔍",
    "Try a product name...",
    "Try a category...",
    "Try a size in mm...",
  ],
  searchPlaceholderTiming: {
    typeSpeed: 70,
    deleteSpeed: 35,
    holdDelay: 1600,
    pauseDelay: 400,
  },

  // Tunable UI texts
  texts: {
    searchPlaceholder: "Search SKU or others... 🔍",
    loadingMessage: "Loading data... 🌬️",
    loadingError: "Error loading data ❌",
    noLinkAlert: "No link available",
    allCategories: "ALL",
    linkButton: "🖼️",
    tabsButton: "First Tabs ⚙️",
    categoriesButton: "Categories 🍃",
    selectCategoryTitle: "Select Category ✅",
    selectTabTitle: "Select Active Tab ⚙️",
    filterCategoriesPlaceholder: "Filter categories... 🔍",
    loadMore: "Load more…",
    loadingImage: "Loading image…",
    imageLoadError: "Image failed to load ❌",
  },
};
