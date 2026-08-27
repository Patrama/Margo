/** @format */

// ============================================================
// ship-check-app.js — "Shipment Price Check" modal
// ============================================================

(function () {
  // ============================================================
  // 1. Shop Location State & Search Logic
  // ============================================================
  let selectedShopLocation = null; // Single selection: { name, postal }
  let shopLocations = []; // Populated from CSV or Config

  function filterShopLocations(query) {
    if (!query) return [];
    const q = query.toLowerCase();
    return shopLocations.filter(
      (loc) => loc.name.toLowerCase().includes(q) || loc.postal.includes(q),
    );
  }

  function selectShopLocation(loc) {
    selectedShopLocation = loc;
    renderShopLocationChip();

    // Automatically update the input value if present
    const originInput = document.getElementById("ship-origin");
    if (originInput && loc) {
      originInput.value = loc.postal;
    }
  }

  window.removeShopLocation = function () {
    selectedShopLocation = null;
    renderShopLocationChip();
  };

  function renderShopLocationChip() {
    const container = document.getElementById("shop-location-chip-container");
    if (!container) return;

    if (!selectedShopLocation) {
      container.innerHTML = "";
      return;
    }

    container.innerHTML = `
      <span class="chip single-chip">
        📍 ${escapeHtmlLocal(selectedShopLocation.name)} (${escapeHtmlLocal(selectedShopLocation.postal)})
        <button type="button" class="chip-remove" onclick="window.removeShopLocation()">&times;</button>
      </span>
    `;
  }

  // ============================================================
  // 2. Courier Chips State & Search Logic
  // ============================================================
  let selectedCouriers = []; // Stores selected courier objects [{code, label}]
  let availableCouriers = []; // Populated from CSV or Config

  function filterCouriers(query) {
    if (!query) return [];
    const q = query.toLowerCase();
    return availableCouriers.filter(
      (c) =>
        c.label.toLowerCase().startsWith(q) ||
        c.code.toLowerCase().startsWith(q),
    );
  }

  function selectCourier(courier) {
    const maxLimit =
      window.CONFIG && CONFIG.MAX_COURIER_PICK === "max"
        ? Infinity
        : (window.CONFIG && CONFIG.MAX_COURIER_PICK) || Infinity;

    if (selectedCouriers.length >= maxLimit) {
      alert(`Maximum limit of ${maxLimit} couriers reached.`);
      return;
    }

    if (!selectedCouriers.some((c) => c.code === courier.code)) {
      selectedCouriers.push(courier);
      renderCourierChips();
    }
  }

  window.removeCourier = function (code) {
    selectedCouriers = selectedCouriers.filter((c) => c.code !== code);
    renderCourierChips();
  };

  function renderCourierChips() {
    const container = document.getElementById("courier-chips-container");
    if (!container) return;

    container.innerHTML = selectedCouriers
      .map(
        (c) => `
      <span class="chip">
        ${escapeHtmlLocal(c.label)}
        <button type="button" class="chip-remove" onclick="window.removeCourier('${escapeAttr(c.code)}')">&times;</button>
      </span>
    `,
      )
      .join("");
  }

  // ============================================================
  // 3. UI Helpers & Internationalization
  // ============================================================
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

    const originLabel = document.querySelector('label[for="ship-origin"]');
    if (originLabel && t.shipCheckOriginLabel)
      originLabel.textContent = t.shipCheckOriginLabel;

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

    const originInput = document.getElementById("ship-origin");
    if (
      originInput &&
      window.CONFIG &&
      CONFIG.shipCheck &&
      CONFIG.shipCheck.defaultOriginPostalCode
    ) {
      originInput.value = CONFIG.shipCheck.defaultOriginPostalCode;
    }
  }

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

  // ============================================================
  // 4. Form Submission Logic
  // ============================================================
  async function handleSubmit(e) {
    e.preventDefault();

    const t = (window.CONFIG && CONFIG.texts) || {};
    const destInput = document.getElementById("ship-dest");
    const weightInput = document.getElementById("ship-weight");
    const originInput = document.getElementById("ship-origin");
    const submitBtn = document.querySelector(".ship-check-submit");
    const results = document.getElementById("ship-check-results");

    const destination_postal_code = (destInput.value || "").trim();
    const weight = Number(weightInput.value);

    // Use selected shop location chip postal code if available, else fall back to input field
    const origin_postal_code = selectedShopLocation
      ? selectedShopLocation.postal
      : originInput
        ? (originInput.value || "").trim()
        : "";

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

    if (origin_postal_code && !/^\d{4,10}$/.test(origin_postal_code)) {
      setStatus(
        t.shipCheckInvalidOrigin || "Enter a valid shop postal code",
        true,
      );
      if (originInput) originInput.focus();
      return;
    }

    // Collect courier selections from chips or fallback checkboxes
    const checked = selectedCouriers.length
      ? selectedCouriers.map((c) => c.code)
      : Array.from(
          document.querySelectorAll('input[name="ship-courier"]:checked'),
        ).map((cb) => cb.value);

    if (results) results.innerHTML = "";
    setStatus(t.shipCheckLoading || "Checking rates… 🚚");
    if (submitBtn) submitBtn.disabled = true;

    try {
      const payload = {
        destination_postal_code,
        weight,
        couriers: checked.length ? checked.join(",") : undefined,
      };

      if (origin_postal_code) {
        payload.origin_postal_code = origin_postal_code;
      }

      const res = await fetch("/api/rates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
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

  // ============================================================
  // 5. App Initialization
  // ============================================================
  function init() {
    const form = document.getElementById("ship-check-form");
    if (!form) return;

    if (
      window.CONFIG &&
      CONFIG.shipCheck &&
      Array.isArray(CONFIG.shipCheck.couriers)
    ) {
      availableCouriers = CONFIG.shipCheck.couriers;
      selectedCouriers = [...CONFIG.shipCheck.couriers];
    }

    renderShopLocationChip();
    renderCourierChips();
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
