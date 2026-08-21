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
  defaultActiveTab: "DETAILS",

  // localStorage key used to persist user preferences
  cacheKey: "catalogCache",

  // Batch size for paginated list rendering (keeps DOM small on low-end devices)
  pageSize: 25,

  // Debounce delay (ms) for the search input
  debounceDelay: 250,

  // How long (ms) the cached CSV data is considered fresh before a force refresh
  cacheTTL: 24 * 60 * 60 * 1000, // 24 hours

  // Max time (ms) to wait for a modal image load before showing an error.
  // Prevents an infinite spinner when the URL hangs or is blocked.
  imageLoadTimeout: 20000,

  // Max time (ms) to wait for the CSV fetch before aborting. Prevents the
  // loading spinner from hanging forever on a dead/unreachable network.
  fetchTimeout: 30000,

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
    "HARGA ON": "Normal",
    "GROSS ON": "Grosir",
    "HARGA OFF": "Normal",
    "GROSS OFF": "Grosir",
    // LINK: "Gambar",
  },

  // Tab definitions: label + which CSV columns to display
  tabs: {
    ONLINE_PRICE: {
      label: "Harga Online 💰",
      cols: ["HARGA ON", "GROSS ON"],
    },
    OFFLINE_PRICE: {
      label: "Harga Offline 🏪",
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
    "Try a Nama > BULAT or others",
    "Try a Kategori > CHITOSE or others",
    "Try a Ukuran > M8 or others",
  ],
  searchPlaceholderTiming: {
    typeSpeed: 70,
    deleteSpeed: 35,
    holdDelay: 1600,
    pauseDelay: 400,
    // Pause the typewriter while the tab is hidden (saves CPU/battery).
    // Set to false to keep the animation running at all times.
    efficiency: true,
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

  // ------------------------------------------------------------
  // Effect-quality levels, evaluated by js/fx.js at runtime.
  // Levels per key:
  //   0 = completely off   (flat, no blur / glow / shadow / animation)
  //   1 = fully on         (the exact look of css/styles.css)
  //   2 = eco              (~10% effect, ~90% cheaper; also the
  //                        automatic fallback on slow networks)
  // ------------------------------------------------------------
  fx: {
    // Background
    backgroundFixed: 2, // fixed full-viewport gradient (repaints on scroll)
    backgroundBlobs: 2, // giant blurred blob layers
    blobAnimation: 0, // infinite morph/drift blob animation

    // Frosted glass (backdrop-filter)
    backdropBlurButtons: 0, // header buttons + image open button
    backdropBlurSearch: 2, // search input
    backdropBlurCards: 2, // product cards + expanded body
    backdropBlurModal: 2, // modal backdrop overlay
    panelBlurModal: 2, // modal glass panel

    // Glows / shadows
    glowHover: 0, // colored glow on hover
    glowActive: 0, // glow on selected category / close button
    glowFocus: 0, // teal focus ring + glow
    glowLoadMore: 0, // "Load more" glow
    glowText: 0, // text glow (loading, buttons, active tile)
    shadowDepth: 0, // drop shadows

    // Motion
    entranceAnimations: 0, // card / modal entrance animation
    loadingPulse: 0, // infinite loading pulse
    transitionEase: 0, // hover/expand transition easing

    // Styling the scrollbar
    scrollbarStyle: 1, // 30px gradient bar -> thin flat bar

    // Cheap effects — safe to keep at full strength
    hoverLift: 1, // translateY hover lift (transform only)
    textGradient: 1, // gradient SKU title (background-clip only)
  },
};

// Also expose on window for any code (e.g. js/fx.js) that reads it,
// while remaining a global lexical binding for the rest of the app.
window.CONFIG = CONFIG;
