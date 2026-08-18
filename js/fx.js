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

  const fx = (window.CONFIG && CONFIG.fx) || {};

  // Keys that are cheap no matter what — ignored by the slow-network
  // auto-downgrade (they only react to an explicit level 0).
  const CHEAP_KEYS = { hoverLift: 1, textGradient: 1 };

  const readLevel = (key, fallback) => {
    const v = fx[key];
    return v === 0 || v === 1 || v === 2 ? v : fallback;
  };

  // Auto-eco: heavy effects downgrade to level 2 on constrained networks
  const conn =
    navigator.connection ||
    navigator.mozConnection ||
    navigator.webkitConnection;
  const slowNetwork =
    !!conn &&
    (conn.saveData === true ||
      (conn.effectiveType && /^(slow-2g|2g|3g)$/.test(conn.effectiveType)));

  const level = (key, fallback) => {
    const l = readLevel(key, fallback);
    if (slowNetwork && !(key in CHEAP_KEYS)) return l === 0 ? 0 : 2;
    return l;
  };

  // ------------------------------------------------------------
  // Level 0 rules — completely flat (no blur, glow, shadow, motion)
  // ------------------------------------------------------------
  const LEVEL0 = {
    backgroundFixed: "body{background:#0b1020;background-attachment:scroll}",
    backgroundBlobs: "body::before,body::after{display:none}",
    blobAnimation: "body::before,body::after{animation:none}",
    backdropBlurButtons:
      ".btn,.btn-link{backdrop-filter:none;-webkit-backdrop-filter:none;background:#1a223f}",
    backdropBlurSearch:
      ".search-box input{backdrop-filter:none;-webkit-backdrop-filter:none;background:#1a223f}",
    backdropBlurCards:
      ".card{background:#182040;backdrop-filter:none;-webkit-backdrop-filter:none}.card-body{background:#10172f;backdrop-filter:none;-webkit-backdrop-filter:none}",
    backdropBlurModal:
      ".modal{backdrop-filter:none;-webkit-backdrop-filter:none;background:rgba(6,9,20,.95)}",
    panelBlurModal:
      ".modal-content{backdrop-filter:none;-webkit-backdrop-filter:none;background:#1a2245}",
    glowHover:
      ".btn:hover,.btn-link:hover,.card:hover,.cat-item:hover:not(.active),.radio-label:hover{box-shadow:none;filter:none}",
    glowActive:
      ".cat-item.active,.close-btn,.close-btn:hover{box-shadow:none;filter:none}",
    glowFocus:
      ".search-box input:focus,.cat-search:focus{border-color:var(--lg-teal);box-shadow:inset 0 1px 0 rgba(255,255,255,.2)}",
    glowLoadMore: ".load-more,.load-more:hover{box-shadow:none;filter:none}",
    glowText: "#loading,.btn,.load-more,.cat-item.active{text-shadow:none}",
    shadowDepth:
      ".btn,.search-box input,.card,.card-body,.btn-link,.load-more,.modal-content,.cat-item,.close-btn{box-shadow:none}",
    entranceAnimations: ".card,.modal-content{animation:none}",
    loadingPulse: "#loading{animation:none}",
    transitionEase:
      ".btn,.search-box input,.card,.card-body,.card-header,.btn-link,.load-more,.close-btn,.cat-search,.cat-item,.radio-label{transition:none}",
    scrollbarStyle:
      "::-webkit-scrollbar{width:8px !important;height:8px !important}::-webkit-scrollbar-thumb{background:#4ecdc4;border:2px solid transparent;background-clip:padding-box;border-radius:999px}::-webkit-scrollbar-track{background:rgba(255,255,255,.06);box-shadow:none}*{scrollbar-width:thin;scrollbar-color:#4ecdc4 rgba(255,255,255,.06)}",
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
      ".btn,.btn-link{backdrop-filter:none;-webkit-backdrop-filter:none;background:rgba(255,255,255,.15)}",
    backdropBlurSearch:
      ".search-box input{backdrop-filter:none;-webkit-backdrop-filter:none;background:rgba(255,255,255,.13)}",
    backdropBlurCards:
      ".card{background:rgba(255,255,255,.1);backdrop-filter:none;-webkit-backdrop-filter:none}.card-body{background:rgba(8,12,26,.55);backdrop-filter:none;-webkit-backdrop-filter:none}",
    backdropBlurModal:
      ".modal{backdrop-filter:none;-webkit-backdrop-filter:none;background:rgba(10,14,30,.82)}",
    panelBlurModal:
      ".modal-content{backdrop-filter:none;-webkit-backdrop-filter:none;background:linear-gradient(135deg,rgba(255,255,255,.22),rgba(255,255,255,.11))}",
    glowHover:
      ".btn:hover,.btn-link:hover{box-shadow:0 8px 20px rgba(0,0,0,.3);filter:none}.card:hover{box-shadow:0 12px 28px rgba(0,0,0,.4);filter:none}.cat-item:hover:not(.active),.radio-label:hover{box-shadow:0 4px 12px rgba(0,0,0,.25);filter:none}",
    glowActive:
      ".cat-item.active{box-shadow:0 4px 12px rgba(0,0,0,.3);filter:none}.close-btn:hover{box-shadow:none;filter:none}",
    glowFocus:
      ".search-box input:focus,.cat-search:focus{box-shadow:0 0 0 1px rgba(78,205,196,.7),inset 0 1px 0 rgba(255,255,255,.2)}",
    glowLoadMore:
      ".load-more{box-shadow:0 6px 20px rgba(0,0,0,.3);filter:none}.load-more:hover{filter:none;box-shadow:0 8px 24px rgba(0,0,0,.35)}",
    glowText: "#loading,.btn,.load-more,.cat-item.active{text-shadow:none}",
    shadowDepth:
      ".btn{box-shadow:0 4px 14px rgba(0,0,0,.22)}.search-box input{box-shadow:0 4px 16px rgba(0,0,0,.22)}.card{box-shadow:0 4px 16px rgba(0,0,0,.3)}.modal-content{box-shadow:0 12px 32px rgba(0,0,0,.45)}",
    entranceAnimations: ".card,.modal-content{animation:none}",
    loadingPulse: "#loading{animation:none}",
    transitionEase:
      ".btn{transition:transform .2s ease,background-color .2s ease,border-color .2s ease}.search-box input{transition:border-color .2s ease,background-color .2s ease}.card{transition:transform .2s ease,border-color .2s ease}.card-body{transition:grid-template-rows .2s ease}.card-header{transition:background-color .2s ease}.btn-link{transition:background-color .2s ease,border-color .2s ease,transform .2s ease}.load-more{transition:transform .2s ease}.close-btn{transition:background-color .2s ease,border-color .2s ease,transform .2s ease}.cat-search{transition:border-color .2s ease,background-color .2s ease}.cat-item,.radio-label{transition:background-color .2s ease,border-color .2s ease,transform .2s ease}",
    scrollbarStyle:
      "::-webkit-scrollbar{width:8px !important;height:8px !important}::-webkit-scrollbar-thumb{background:#4ecdc4;border:2px solid transparent;background-clip:padding-box;border-radius:999px}::-webkit-scrollbar-track{background:rgba(255,255,255,.06);box-shadow:none}*{scrollbar-width:thin;scrollbar-color:#4ecdc4 rgba(255,255,255,.06)}",
  };

  // Cheap effects — full at 1 (default), off only when set to 0
  const CHEAP = {
    hoverLift:
      ".btn:hover,.card:hover,.btn-link:hover,.load-more:hover,.cat-item:hover:not(.active),.radio-label:hover{transform:none}",
    textGradient:
      ".sku-title{background:none;-webkit-background-clip:initial;background-clip:initial;-webkit-text-fill-color:#fff;color:#fff;text-shadow:none}",
  };

  // ------------------------------------------------------------
  // Assemble the override stylesheet (level 1 = write nothing,
  // the baseline styles.css already delivers the full effect)
  // ------------------------------------------------------------
  let css = "/* fx-runtime — generated from CONFIG.fx */\n";

  const HEAVY_KEYS = Object.keys(LEVEL2);
  for (const key of HEAVY_KEYS) {
    const l = level(key, 2);
    if (l === 0 && LEVEL0[key]) css += LEVEL0[key] + "\n";
    else if (l === 2 && LEVEL2[key]) css += LEVEL2[key] + "\n";
  }
  for (const key of Object.keys(CHEAP)) {
    if (level(key, 1) === 0) css += CHEAP[key] + "\n";
  }

  const style = document.createElement("style");
  style.id = "fx-runtime";
  style.textContent = css;
  document.head.appendChild(style);
})();