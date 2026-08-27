/** @format */

// ============================================================
// ship-check-app.js — "Shipment Price Check" modal
// ------------------------------------------------------------
// Separate from app.js/CONFIG.js by design. Talks to /api/rates (a
// Vercel serverless function) instead of Biteship directly, so the
// Biteship API key and the shop's origin postal code never appear in
// client-visible code.
//
// Reuses openModal()/closeModal() from app.js — this script is loaded
// after app.js in index.html, so those globals already exist.
// ============================================================

(function () {
  function applyShipCheckTexts() {
    const t = (window.CONFIG && CONFIG.texts) || {};

    const trigger = document.getElementById("ship-check-trigger");
    if (trigger && t.shipCheckButton) trigger.textContent = t.shipCheckButton;

    const title = document.querySelector("#ship-modal .modal-header h3");
    if (title && t.shipCheckTitle) title.textContent = t.shipCheckTitle;

    const destLabel = document.querySelector('label[for="ship-dest"]');
    if (destLabel && t.shipCheckDestLabel)
      destLabel.textContent = t.shipCheckDestLabel;

    const weightLabel = document.querySelector('label[for="ship-weight"]');
    if (weightLabel && t.shipCheckWeightLabel)
      weightLabel.textContent = t.shipCheckWeightLabel;

    const couriersLabel = document.getElementById("ship-check-couriers-label");
    if (couriersLabel && t.shipCheckCouriersLabel)
      couriersLabel.textContent = t.shipCheckCouriersLabel;

    const submitBtn = document.querySelector(".ship-check-submit");
    if (submitBtn && t.shipCheckSubmit)
      submitBtn.textContent = t.shipCheckSubmit;
  }

  function renderCourierCheckboxes() {
    const container = document.getElementById("ship-check-couriers");
    if (!container) return;

    const couriers =
      (window.CONFIG && CONFIG.shipCheck && CONFIG.shipCheck.couriers) || [];

    container.innerHTML = couriers
      .map(
        (c) => `
        <label class="ship-check-courier-label">
          <input type="checkbox" name="ship-courier" value="${escapeAttr(c.code)}" checked />
          ${escapeHtmlLocal(c.label)}
        </label>
      `,
      )
      .join("");

    const weightInput = document.getElementById("ship-weight");
    if (
      weightInput &&
      window.CONFIG &&
      CONFIG.shipCheck &&
      CONFIG.shipCheck.defaultWeight
    ) {
      weightInput.value = CONFIG.shipCheck.defaultWeight;
    }
  }

  // Local, dependency-free escaping (mirrors app.js's escapeHtml, but this
  // file is meant to work standalone even if app.js's helper changes).
  function escapeHtmlLocal(str) {
    return String(str).replace(/[&<>"']/g, (c) => "&#" + c.charCodeAt(0) + ";");
  }
  function escapeAttr(str) {
    return escapeHtmlLocal(str);
  }

  function setStatus(message, isError) {
    const status = document.getElementById("ship-check-status");
    if (!status) return;
    status.textContent = message || "";
    status.classList.toggle("error", !!isError);
  }

  function formatPrice(price, currency) {
    const n = Number(price) || 0;
    try {
      return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: currency || "IDR",
        maximumFractionDigits: 0,
      }).format(n);
    } catch (err) {
      return `${currency || "IDR"} ${n.toLocaleString("id-ID")}`;
    }
  }

  function renderResults(pricing) {
    const results = document.getElementById("ship-check-results");
    if (!results) return;

    const t = (window.CONFIG && CONFIG.texts) || {};

    if (!pricing || !pricing.length) {
      results.innerHTML = "";
      setStatus(
        t.shipCheckEmpty || "No couriers available for this destination",
      );
      return;
    }

    setStatus("");
    results.innerHTML = pricing
      .map(
        (p) => `
        <div class="ship-check-result">
          <div class="ship-check-result-info">
            <span class="ship-check-result-courier">${escapeHtmlLocal(p.courier_name || "")}</span>
            <span class="ship-check-result-service">${escapeHtmlLocal(
              [p.courier_service_name, p.duration].filter(Boolean).join(" · "),
            )}</span>
          </div>
          <span class="ship-check-result-price">${formatPrice(p.price, p.currency)}</span>
        </div>
      `,
      )
      .join("");
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const t = (window.CONFIG && CONFIG.texts) || {};
    const destInput = document.getElementById("ship-dest");
    const weightInput = document.getElementById("ship-weight");
    const submitBtn = document.querySelector(".ship-check-submit");
    const results = document.getElementById("ship-check-results");

    const destination_postal_code = (destInput.value || "").trim();
    const weight = Number(weightInput.value);

    if (!/^\d{4,10}$/.test(destination_postal_code)) {
      setStatus(
        t.shipCheckInvalidDest || "Enter a valid destination postal code",
        true,
      );
      destInput.focus();
      return;
    }
    if (!Number.isFinite(weight) || weight <= 0) {
      setStatus(t.shipCheckInvalidWeight || "Enter a valid weight", true);
      weightInput.focus();
      return;
    }

    const checked = Array.from(
      document.querySelectorAll('input[name="ship-courier"]:checked'),
    ).map((cb) => cb.value);

    if (results) results.innerHTML = "";
    setStatus(t.shipCheckLoading || "Checking rates… 🚚");
    if (submitBtn) submitBtn.disabled = true;

    try {
      const res = await fetch("/api/rates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          destination_postal_code,
          weight,
          couriers: checked.length ? checked.join(",") : undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setStatus(
          data.error || t.shipCheckError || "Failed to check shipping rates ❌",
          true,
        );
        return;
      }

      renderResults(data.pricing);
    } catch (err) {
      setStatus(t.shipCheckError || "Failed to check shipping rates ❌", true);
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  }

  function init() {
    const form = document.getElementById("ship-check-form");
    if (!form) return; // modal markup not present on this page

    renderCourierCheckboxes();
    applyShipCheckTexts();
    form.addEventListener("submit", handleSubmit);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
