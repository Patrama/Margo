/** @format */

function initTypewriter(el, options) {
  if (!el) return null;

  var opts = options || {};
  var phrases = opts.phrases || ["Hello"];
  var typeSpeed = opts.typeSpeed || 95;
  var deleteSpeed = opts.deleteSpeed || 45;
  var holdDelay = opts.holdDelay || 1800;
  var pauseDelay = opts.pauseDelay || 2000;

  if (!phrases.length) return null;

  // Inputs/textareas render typed text via the placeholder attribute,
  // not textContent (which they don't have).
  var isFormField = el.tagName === "INPUT" || el.tagName === "TEXTAREA";
  var basePlaceholder = isFormField ? el.getAttribute("placeholder") || "" : "";
  var prefix =
    opts.placeholderPrefix !== undefined
      ? opts.placeholderPrefix
      : basePlaceholder;

  function render(text) {
    if (isFormField) {
      el.placeholder = prefix ? prefix + text : text;
    } else {
      el.textContent = text;
    }
  }

  var phraseIndex = 0;
  var charIndex = 0;
  var isDeleting = false;
  var timerId = null;
  var isHidden = false;

  function tick() {
    // Skip rendering while the tab is hidden (efficiency mode), saving
    // CPU/battery, and resume right where it left off when visible again.
    if (isHidden) {
      timerId = window.setTimeout(tick, 250);
      return;
    }

    var current = phrases[phraseIndex];
    charIndex += isDeleting ? -1 : 1;
    render(current.substring(0, charIndex));

    var delay = isDeleting ? deleteSpeed : typeSpeed;

    if (!isDeleting && charIndex === current.length) {
      delay = holdDelay;
      isDeleting = true;
    } else if (isDeleting && charIndex === 0) {
      isDeleting = false;
      phraseIndex = (phraseIndex + 1) % phrases.length;
      delay = pauseDelay;
    }

    timerId = window.setTimeout(tick, delay);
  }

  function onVisibilityChange() {
    isHidden = document.hidden;
  }

  var efficiency = opts.efficiency !== false;
  if (efficiency) {
    document.addEventListener("visibilitychange", onVisibilityChange);
    isHidden = document.hidden;
  }

  tick();

  return {
    stop: function () {
      if (timerId) window.clearTimeout(timerId);
      if (efficiency) {
        document.removeEventListener("visibilitychange", onVisibilityChange);
      }
    },
  };
}

(function autoInit() {
  if (typeof document === "undefined") return;

  document.querySelectorAll(".js-typewriter").forEach(function (el) {
    var phrases = [];
    try {
      phrases = JSON.parse(el.getAttribute("data-phrases") || "[]");
    } catch (e) {
      phrases = [];
    }
    if (!phrases.length) return;

    initTypewriter(el, {
      phrases: phrases,
      typeSpeed: Number(el.getAttribute("data-type-speed")) || undefined,
      deleteSpeed: Number(el.getAttribute("data-delete-speed")) || undefined,
      holdDelay: Number(el.getAttribute("data-hold")) || undefined,
      pauseDelay: Number(el.getAttribute("data-pause")) || undefined,
    });
  });
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = { initTypewriter: initTypewriter };
}
