/** @format */

// ============================================================
// fx.js — runtime effect-quality layer for the Liquid Glass UI.
//
// Reads CONFIG.fx (per effect: 0 = off, 1 = full, 2 = eco) and
// injects a single <style id="fx-runtime"> of !important CSS
// overrides so css/styles.css stays untouched as the level-1
// (full strength) reference.
//
// It is pure CSS policy — it never touches the DOM, app logic,
// timers, or the typewriter effect. On slow connections
// (slow-2g / 2g / 3g or saveData) heavy effects are forced to
// eco level (2), unless the user set them to 0 (off).
// ============================================================
(function () {
  "use strict";

  if (window.__FX_INJECTED__) return;
  window.__FX_INJECTED__ = true;

  const fx = (typeof CONFIG !== "undefined" && CONFIG.fx) || {};

  // Keys that are cheap no matter what — ignored by the slow-network
  // auto-downgrade (they only react to an explicit level 0).
  const CHEAP_KEYS = { hoverLift: 1, textGradient: 1 };

  const readLevel = (key, fallback) => {
    const v = fx[key];
    return v === 0 || v === 1 || v === 2 ? v : fallback;
  };

  // Auto-eco: heavy effects downgrade to level 2 on constrained networks.
  // Forced to level 0 (OFF) on extremely slow 2G connections.
  const conn =
    navigator.connection ||
    navigator.mozConnection ||
    navigator.webkitConnection;
  const effectiveType = conn ? conn.effectiveType || "" : "";
  const slowNetwork =
    !!conn && (conn.saveData === true || /^(slow-2g|2g|3g)$/.test(effectiveType));
  const verySlowNetwork = /^(slow-2g|2g)$/.test(effectiveType);

  const level = (key, fallback) => {
    const l = readLevel(key, fallback);
    if (verySlowNetwork && !(key in CHEAP_KEYS)) return 0;
    if (slowNetwork && !(key in CHEAP_KEYS)) return l === 0 ? 0 : 2;
    return l;
  };

  // Helper: add !important to all CSS declarations in a rule string
  const addImportant = (css) =>
    css.replace(/([^;{}]+):([^;{}]+);?/g, (m, p, v) => {
      const tp = p.trim(), tv = v.trim();
      if (!tp || tp.startsWith("/*") || tv.includes("!important")) return m;
      return `${tp}: ${tv} !important;`;
    });

  // Helper: replace hardcoded colors with CSS variables where applicable
  const themeAware = (css) =>
    css
      .replace(/background:#0b1020/g, "background:var(--lg-ink)")
      .replace(/background:#1a223f/g, "background:var(--lg-glass)")
      .replace(/background:#182040/g, "background:var(--lg-glass-strong)")
      .replace(/background:#10172f/g, "background:var(--lg-ink-panel)")
      .replace(/background:rgba\(6,9,20,0\.95\)/g, "background:var(--lg-ink)")
      .replace(/background:#1a2245/g, "background:var(--lg-glass-strong)")
      .replace(/background:rgba\(255,255,255,0\.15\)/g, "background:var(--lg-glass)")
      .replace(/background:rgba\(255,255,255,0\.13\)/g, "background:var(--lg-glass)")
      .replace(/background:rgba\(255,255,255,0\.1\)/g, "background:var(--lg-glass)")
      .replace(/background:rgba\(8,12,26,0\.55\)/g, "background:var(--lg-ink-panel)")
      .replace(/background:rgba\(10,14,30,0\.82\)/g, "background:var(--lg-ink)")
      .replace(
        /background:linear-gradient\(135deg,rgba\(255,255,255,0\.22\),rgba\(255,255,255,0\.11\)\)/g,
        "background:linear-gradient(135deg,var(--lg-glass),var(--lg-glass-strong))"
      )
      .replace(/rgba\(78,205,196,0\.7\)/g, "var(--lg-teal)")
      .replace(/#4ecdc4/g, "var(--lg-teal)")
      .replace(/rgba\(255,255,255,0\.06\)/g, "var(--lg-ink-2)")
      .replace(/-webkit-text-fill-color:#fff/g, "-webkit-text-fill-color:var(--lg-text)")
      .replace(/color:#fff/g, "color:var(--lg-text)");

  // ------------------------------------------------------------
  // Level 0 rules — completely flat (no blur, glow, shadow, motion)
  // ------------------------------------------------------------
  const LEVEL0 = {
    backgroundFixed: "body{background:var(--lg-ink);background-attachment:scroll}",
    backgroundBlobs: "body::before,body::after{display:none}",
    blobAnimation: "body::before,body::after{animation:none}",
    backdropBlurButtons: ".btn,.btn-link{backdrop-filter:none;-webkit-backdrop-filter:none;background:var(--lg-glass)}",
    backdropBlurSearch: ".search-box input{backdrop-filter:none;-webkit-backdrop-filter:none;background:var(--lg-glass)}",
    backdropBlurCards: ".card{background:var(--lg-glass-strong);backdrop-filter:none;-webkit-backdrop-filter:none}.card-body{background:var(--lg-ink-panel);backdrop-filter:none;-webkit-backdrop-filter:none}",
    backdropBlurModal: ".modal{backdrop-filter:none;-webkit-backdrop-filter:none;background:var(--lg-ink)}",
    panelBlurModal: ".modal-content{backdrop-filter:none;-webkit-backdrop-filter:none;background:var(--lg-glass-strong)}",
    glowHover: ".btn:hover,.btn-link:hover,.card:hover,.cat-item:hover:not(.active),.radio-label:hover{box-shadow:none;filter:none}",
    glowActive: ".cat-item.active,.close-btn,.close-btn:hover{box-shadow:none;filter:none}",
    glowFocus: ".search-box input:focus,.cat-search:focus{border-color:var(--lg-teal);box-shadow:inset 0 1px 0 rgba(255,255,255,.2)}",
    glowLoadMore: ".load-more,.load-more:hover{box-shadow:none;filter:none}",
    shadowDepth: ".btn,.search-box input,.card,.card-body,.btn-link,.load-more,.modal-content,.cat-item,.close-btn{box-shadow:none}",
    entranceAnimations: ".card,.modal-content{animation:none}",
    loadingPulse: "#loading{animation:none}",
    transitionEase: ".btn,.search-box input,.card,.card-body,.card-header,.btn-link,.load-more,.close-btn,.cat-search,.cat-item,.radio-label{transition:none}",
    scrollbarStyle: "::-webkit-scrollbar{width:8px;height:8px}::-webkit-scrollbar-thumb{background:var(--lg-teal);border:2px solid transparent;background-clip:padding-box;border-radius:999px}::-webkit-scrollbar-track{background:var(--lg-ink-2);box-shadow:none}*{scrollbar-width:thin;scrollbar-color:var(--lg-teal) var(--lg-ink-2)}",
  };

  // ------------------------------------------------------------
  // Level 2 rules — eco: ~10% of the effect, ~90% cheaper
  // (blur removed + more opaque panels, tiny/no glows, no
  // infinite animation, no shadow-transition repaints)
  // ------------------------------------------------------------
  const LEVEL2 = {
    backgroundFixed: "body{background-attachment:scroll}",
    backgroundBlobs:
      "body::before,body::after{width:34vw;height:34vw;max-width:360px;max-height:360px;filter:blur(8px);opacity:.14}",
    blobAnimation: "body::before,body::after{animation:none}",
    backdropBlurButtons:
      ".btn,.btn-link{backdrop-filter:none;-webkit-backdrop-filter:none;background:var(--lg-glass)}",
    backdropBlurSearch:
      ".search-box input{backdrop-filter:none;-webkit-backdrop-filter:none;background:var(--lg-glass)}",
    backdropBlurCards:
      ".card{background:var(--lg-glass);backdrop-filter:none;-webkit-backdrop-filter:none}.card-body{background:var(--lg-ink-panel);backdrop-filter:none;-webkit-backdrop-filter:none}",
    backdropBlurModal:
      ".modal{backdrop-filter:none;-webkit-backdrop-filter:none;background:var(--lg-ink)}",
    panelBlurModal:
      ".modal-content{backdrop-filter:none;-webkit-backdrop-filter:none;background:linear-gradient(135deg,var(--lg-glass),var(--lg-glass-strong))}",
    glowHover:
      ".btn:hover,.btn-link:hover{box-shadow:var(--lg-shadow-hover);filter:none}.card:hover{box-shadow:var(--lg-shadow-hover);filter:none}.cat-item:hover:not(.active),.radio-label:hover{box-shadow:var(--lg-shadow-hover);filter:none}",
    glowActive:
      ".cat-item.active{box-shadow:var(--lg-shadow-hover);filter:none}.close-btn:hover{box-shadow:none;filter:none}",
    glowFocus:
      ".search-box input:focus,.cat-search:focus{box-shadow:0 0 0 1px var(--lg-teal),inset 0 1px 0 rgba(255,255,255,.2)}",
    glowLoadMore:
      ".load-more{box-shadow:var(--lg-shadow-hover);filter:none}.load-more:hover{filter:none;box-shadow:var(--lg-shadow-hover)}",
    shadowDepth:
      ".btn{box-shadow:var(--lg-shadow)}.search-box input{box-shadow:var(--lg-shadow-search)}.card{box-shadow:var(--lg-shadow)}.modal-content{box-shadow:var(--lg-shadow-strong)}",
    transitionEase:
      ".btn{transition:transform .2s ease,background-color .2s ease,border-color .2s ease}.search-box input{transition:border-color .2s ease,background-color .2s ease}.card{transition:transform .2s ease,border-color .2s ease}.card-body{transition:grid-template-rows .2s ease}.card-header{transition:background-color .2s ease}.btn-link{transition:background-color .2s ease,border-color .2s ease,transform .2s ease}.load-more{transition:transform .2s ease}.close-btn{transition:background-color .2s ease,border-color .2s ease,transform .2s ease}.cat-search{transition:border-color .2s ease,background-color .2s ease}.cat-item,.radio-label{transition:background-color .2s ease,border-color .2s ease,transform .2s ease}",
  };

  // Shared rules (same in LEVEL0 and LEVEL2) - defined once
  const SHARED = {
    entranceAnimations: ".card,.modal-content{animation:none}",
    loadingPulse: "#loading{animation:none}",
    scrollbarStyle:
      "::-webkit-scrollbar{width:8px;height:8px}::-webkit-scrollbar-thumb{background:var(--lg-teal);border:2px solid transparent;background-clip:padding-box;border-radius:999px}::-webkit-scrollbar-track{background:var(--lg-ink-2);box-shadow:none}*{scrollbar-width:thin;scrollbar-color:var(--lg-teal) var(--lg-ink-2)}",
  };

  // Cheap effects — full at 1 (default), off only when set to 0
  const CHEAP = {
    hoverLift:
      ".btn:hover,.card:hover,.btn-link:hover,.load-more:hover,.cat-item:hover:not(.active),.radio-label:hover{transform:none}",
    textGradient:
      ".sku-title{background:none;-webkit-background-clip:initial;background-clip:initial;-webkit-text-fill-color:var(--lg-text);color:var(--lg-text);text-shadow:none}",
  };

  // ------------------------------------------------------------
  // Assemble the override stylesheet (level 1 = write nothing,
  // the baseline styles.css already delivers the full effect)
  // ------------------------------------------------------------
  let css = "/* fx-runtime — generated from CONFIG.fx */\n";

  const HEAVY_KEYS = Object.keys(LEVEL2);
  for (const key of HEAVY_KEYS) {
    const l = level(key, 2);
    let rule = "";
    if (l === 0 && LEVEL0[key]) rule = LEVEL0[key];
    else if (l === 2 && LEVEL2[key]) rule = LEVEL2[key];
    // Level 1 = no override (baseline styles.css applies)
    if (rule) css += themeAware(addImportant(rule)) + "\n";
  }

  // Process shared keys (same at level 0 and 2)
  for (const key of Object.keys(SHARED)) {
    const l = level(key, 2);
    if (l === 0 || l === 2) {
      css += themeAware(addImportant(SHARED[key])) + "\n";
    }
  }

  // Process cheap keys (only react to explicit level 0)
  for (const key of Object.keys(CHEAP)) {
    if (level(key, 1) === 0) {
      css += themeAware(addImportant(CHEAP[key])) + "\n";
    }
  }

  const style = document.createElement("style");
  style.id = "fx-runtime";
  style.textContent = css;
  document.head.appendChild(style);
})();