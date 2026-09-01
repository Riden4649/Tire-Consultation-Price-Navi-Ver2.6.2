(() => {
  "use strict";

  const FITMENT_URL = "https://raw.githubusercontent.com/Riden4649/tire-wheel-price-integration/main/app/data/vehicles_2012_2026.json";
  const SEARCH_URL = "https://raw.githubusercontent.com/Riden4649/tire-wheel-price-integration/main/app/data/jp_vehicle_search_master_2000_2026_v1.json";
  const SERVICE_URL = "https://raw.githubusercontent.com/Riden4649/tire-wheel-price-integration/main/app/data/vehicle_service_specs.json";
  const CACHE_KEY = "tire-navi-shared-vehicle-master-v2";
  const MAX_RESULTS = 14;

  let fitment = [];
  let searchOnly = [];
  let serviceSpecs = [];

  const text = value => String(value ?? "").trim();
  const normalize = value => text(value).normalize("NFKC").toLowerCase().replace(/[\s　\-_/・]/g, "");
  const esc = value => text(value).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));

  function injectStylesheet() {
    if (document.querySelector('link[data-vehicle-quick-spec]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "css/vehicle-quick-spec.css?v=20260901-v264-size-filter";
    link.dataset.vehicleQuickSpec = "1";
    document.head.appendChild(link);
  }

  function makePanel() {
    const finder = document.querySelector(".finder");
    if (!finder || document.querySelector("#vehicleQuickPanel")) return null;

    const section = document.createElement("section");
    section.className = "vehicle-quick-panel";
    section.id = "vehicleQuickPanel";
    section.innerHTML = `
      <div class="vehicle-quick-search">
        <label for="vehicleQuickSearch">車種名検索</label>
        <div class="vehicle-quick-input-row">
          <input id="vehicleQuickSearch" type="search" autocomplete="off" inputmode="search" placeholder="例：シビック、ハリアー、アクア">
          <button id="vehicleQuickClear" type="button">クリア</button>
        </div>
        <small id="vehicleQuickStatus">車種DBを読み込んでいます…</small>
        <div class="vehicle-quick-results" id="vehicleQuickResults" hidden></div>
      </div>
      <div class="vehicle-quick-spec" id="vehicleQuickSpec" aria-live="polite">
        <span class="vehicle-quick-spec-empty">車両データ：未選択</span>
      </div>`;
    finder.parentNode.insertBefore(section, finder);
    return section;
  }

  function statusLabel() {
    const searchCount = searchOnly.length;
    const fitmentCount = fitment.length;
    if (searchCount && fitmentCount) return `車種検索 ${searchCount}件 / 詳細適合 ${fitmentCount}件`;
    if (searchCount) return `車種検索 ${searchCount}件`;
    if (fitmentCount) return `詳細適合 ${fitmentCount}件`;
    return "車種DBを取得できません";
  }

  function loadCache() {
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
      if (!cached) return false;
      fitment = Array.isArray(cached.fitment) ? cached.fitment : [];
      searchOnly = Array.isArray(cached.searchOnly) ? cached.searchOnly : [];
      serviceSpecs = Array.isArray(cached.serviceSpecs) ? cached.serviceSpecs : [];
      return fitment.length > 0 || searchOnly.length > 0;
    } catch {
      return false;
    }
  }

  async function refreshData(status) {
    try {
      const [fitmentResponse, searchResponse, serviceResponse] = await Promise.all([
        fetch(FITMENT_URL, { cache: "no-store" }),
        fetch(SEARCH_URL, { cache: "no-store" }),
        fetch(SERVICE_URL, { cache: "no-store" })
      ]);
      if (!fitmentResponse.ok || !searchResponse.ok) throw new Error("shared master fetch failed");
      const fitmentPayload = await fitmentResponse.json();
      const searchPayload = await searchResponse.json();
      const servicePayload = serviceResponse.ok ? await serviceResponse.json() : { records: [] };
      fitment = Array.isArray(fitmentPayload) ? fitmentPayload : (fitmentPayload.vehicles || []);
      searchOnly = Array.isArray(searchPayload) ? searchPayload : (searchPayload.vehicles || []);
      serviceSpecs = Array.isArray(servicePayload) ? servicePayload : (servicePayload.records || []);
      localStorage.setItem(CACHE_KEY, JSON.stringify({ fitment, searchOnly, serviceSpecs, updatedAt: new Date().toISOString() }));
      if (status) status.textContent = statusLabel();
    } catch {
      if (status) status.textContent = fitment.length || searchOnly.length ? `${statusLabel()}（端末保存）` : "車種DBを取得できません。オンライン時に再度開いてください";
    }
  }

  function vehicleLabel(vehicle) {
    return `${text(vehicle.maker)} ${text(vehicle.model)}${text(vehicle.generation) ? ` / ${text(vehicle.generation)}` : ""}`;
  }

  function searchRecords(query) {
    const q = normalize(query);
    if (!q) return [];
    const verified = fitment.filter(vehicle => {
      const haystack = [vehicle.maker, vehicle.model, vehicle.generation, ...(vehicle.aliases || []), ...(vehicle.model_codes || [])].map(normalize).join(" ");
      return haystack.includes(q);
    }).map(vehicle => ({ type: "verified", key: vehicle.vehicle_id, vehicle }));

    const verifiedNames = new Set(verified.map(item => `${normalize(item.vehicle.maker)}:${normalize(item.vehicle.model)}`));
    const fallback = searchOnly.filter(record => {
      const haystack = [record.maker, record.model, ...(record.aliases || [])].map(normalize).join(" ");
      return haystack.includes(q) && !verifiedNames.has(`${normalize(record.maker)}:${normalize(record.model)}`);
    }).map(record => ({ type: "search", key: record.search_id, vehicle: record }));
    return [...verified, ...fallback].slice(0, MAX_RESULTS);
  }

  function matchingTorque(vehicle) {
    const maker = normalize(vehicle.maker);
    const model = normalize(vehicle.model);
    const generation = normalize(vehicle.generation);
    return serviceSpecs.find(spec => {
      if (normalize(spec.maker) !== maker || normalize(spec.model) !== model) return false;
      const specGen = normalize(spec.generation);
      return !specGen || !generation || generation.includes(specGen) || specGen.includes(generation);
    }) || serviceSpecs.find(spec => normalize(spec.maker) === maker && normalize(spec.model) === model) || null;
  }

  function fastenerLabel(vehicle) {
    const details = vehicle.fastener_details || {};
    const thread = text(details.thread_diameter || vehicle.thread_diameter);
    const pitch = details.thread_pitch ?? details.pitch ?? vehicle.thread_pitch ?? vehicle.pitch;
    const parsed = text(vehicle.fastener);
    if (thread && pitch != null && text(pitch)) return `${thread}×P${pitch}`;
    return parsed || "未確認";
  }

  function torqueLabel(vehicle) {
    const service = matchingTorque(vehicle);
    if (!service) return "未確認";
    if (service.torque_label) return text(service.torque_label);
    if (service.wheel_torque_nm != null) return `${service.wheel_torque_nm} N・m`;
    if (service.wheel_torque_nm_min != null && service.wheel_torque_nm_max != null) return `${service.wheel_torque_nm_min}～${service.wheel_torque_nm_max} N・m`;
    return "未確認";
  }

  function splitSizes(value) {
    return text(value).split(/[;,、\n]+/).map(item => item.trim()).filter(item => /^\d{3}\/\d{2,3}R\d{2}$/i.test(item));
  }

  function vehicleTireSizes(vehicle) {
    const sizes = new Set(splitSizes(vehicle.oem_tire));
    (vehicle.variants || []).forEach(variant => {
      [variant.oem_tire, variant.front_tires, variant.rear_tires].forEach(value => splitSizes(value).forEach(size => sizes.add(size)));
    });
    return [...sizes];
  }

  function sizeInch(size) {
    const match = text(size).match(/R(\d{2})$/i);
    return match ? match[1] : "";
  }

  function choiceByValue(container, value) {
    if (!container) return null;
    return [...container.querySelectorAll(".choice")].find(button => normalize(button.dataset.value) === normalize(value)) || null;
  }

  function chooseSizeInPriceBook(size, status) {
    const inch = sizeInch(size);
    const inchContainer = document.querySelector("#inchChoices");
    const sizeContainer = document.querySelector("#sizeChoices");
    if (!inchContainer || !sizeContainer) return false;

    const inchButton = choiceByValue(inchContainer, inch);
    if (!inchButton) {
      if (status) status.textContent = `純正 ${size}：現在の価格表に${inch}インチがありません`;
      return false;
    }
    if (!inchButton.classList.contains("selected")) inchButton.click();

    window.setTimeout(() => {
      const sizeButton = choiceByValue(sizeContainer, size);
      if (!sizeButton) {
        if (status) status.textContent = `純正 ${size}：現在の価格表に該当サイズがありません`;
        return;
      }
      if (!sizeButton.classList.contains("selected")) sizeButton.click();
      document.querySelector("#searchButton")?.click();
      if (status) status.textContent = `純正 ${size} でタイヤを表示中`;
    }, 0);
    return true;
  }

  function renderVerified(vehicle, spec, status) {
    const sizes = vehicleTireSizes(vehicle);
    const sizeButtons = sizes.length
      ? `<div class="vehicle-quick-sizes"><span>純正サイズ</span>${sizes.map(size => `<button type="button" data-oem-size="${esc(size)}">${esc(size)}</button>`).join("")}</div>`
      : `<div class="vehicle-quick-sizes"><span>純正サイズ</span><em>未確認</em></div>`;
    spec.innerHTML = `
      <div class="vehicle-quick-spec-name">${esc(vehicleLabel(vehicle))}</div>
      <div class="vehicle-quick-spec-data">
        <span>PCD <b>${esc(vehicle.pcd ?? "―")}</b></span>
        <span>${esc(vehicle.holes ?? "―")}穴</span>
        <span>ハブ <b>${esc(vehicle.hub_bore != null ? `${vehicle.hub_bore}mm` : "未確認")}</b></span>
        <span>取付 <b>${esc(fastenerLabel(vehicle))}</b></span>
        <span class="torque">締付 <b>${esc(torqueLabel(vehicle))}</b></span>
      </div>
      ${sizeButtons}`;

    spec.querySelectorAll("[data-oem-size]").forEach(button => {
      button.addEventListener("click", () => chooseSizeInPriceBook(button.dataset.oemSize, status));
    });
    if (sizes.length === 1) chooseSizeInPriceBook(sizes[0], status);
    else if (sizes.length > 1 && status) status.textContent = `${statusLabel()} / 純正サイズを選択してください`;
  }

  function renderSearchOnly(vehicle, spec, status) {
    spec.innerHTML = `
      <div class="vehicle-quick-spec-name">${esc(text(vehicle.maker))} ${esc(text(vehicle.model))}</div>
      <div class="vehicle-quick-spec-data vehicle-quick-unverified"><span>車種登録済み</span><span>サイズ・PCD・ハブ・締付トルクは詳細確認前</span></div>`;
    if (status) status.textContent = `${statusLabel()} / この車種は検索登録のみ`;
  }

  function initPanel() {
    injectStylesheet();
    const panel = makePanel();
    if (!panel) return;
    const input = panel.querySelector("#vehicleQuickSearch");
    const clear = panel.querySelector("#vehicleQuickClear");
    const results = panel.querySelector("#vehicleQuickResults");
    const spec = panel.querySelector("#vehicleQuickSpec");
    const status = panel.querySelector("#vehicleQuickStatus");

    const hadCache = loadCache();
    if (hadCache) status.textContent = `${statusLabel()}（端末保存）`;
    if (navigator.onLine) refreshData(status);

    function closeResults() {
      results.hidden = true;
      results.innerHTML = "";
    }

    function showResults() {
      const query = input.value;
      const matches = searchRecords(query);
      if (!normalize(query)) {
        closeResults();
        return;
      }
      if (!matches.length) {
        results.hidden = false;
        results.innerHTML = `<div class="vehicle-quick-no-result">該当車種がありません</div>`;
        return;
      }
      results.hidden = false;
      results.innerHTML = matches.map((item, index) => {
        const vehicle = item.vehicle;
        const sub = item.type === "verified"
          ? `${text(vehicle.year_from).slice(0, 7)}～${text(vehicle.year_to).slice(0, 7)} / ${vehicleTireSizes(vehicle).join("・") || "サイズ未確認"}`
          : "車種名のみ登録・詳細適合は要確認";
        return `<button type="button" data-vehicle-result="${index}"><strong>${esc(vehicleLabel(vehicle))}</strong><small>${esc(sub)}</small></button>`;
      }).join("");
      results.querySelectorAll("[data-vehicle-result]").forEach(button => button.addEventListener("click", () => {
        const selected = matches[Number(button.dataset.vehicleResult)];
        input.value = vehicleLabel(selected.vehicle);
        if (selected.type === "verified") renderVerified(selected.vehicle, spec, status);
        else renderSearchOnly(selected.vehicle, spec, status);
        closeResults();
      }));
    }

    input.addEventListener("input", showResults);
    input.addEventListener("focus", showResults);
    clear.addEventListener("click", () => {
      input.value = "";
      spec.innerHTML = `<span class="vehicle-quick-spec-empty">車両データ：未選択</span>`;
      status.textContent = statusLabel();
      closeResults();
      input.focus();
    });
    document.addEventListener("click", event => {
      if (!panel.contains(event.target)) closeResults();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initPanel, { once: true });
  else initPanel();
})();
