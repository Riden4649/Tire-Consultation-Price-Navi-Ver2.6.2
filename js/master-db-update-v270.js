(() => {
  "use strict";

  const CACHE_KEY = "tire-navi-shared-vehicle-master-v2";
  const META_KEY = "tire-navi-main-master-meta-v1";
  const FITMENT_URL = "https://raw.githubusercontent.com/Riden4649/tire-wheel-price-integration/main/app/data/vehicles_2012_2026.json";
  const SEARCH_URL = "https://raw.githubusercontent.com/Riden4649/tire-wheel-price-integration/main/app/data/jp_vehicle_search_master_2000_2026_v1.json";
  const SERVICE_URL = "https://raw.githubusercontent.com/Riden4649/tire-wheel-price-integration/main/app/data/vehicle_service_specs.json";
  const nativeFetch = window.fetch.bind(window);

  function readCache() {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY) || "null"); }
    catch { return null; }
  }

  function toResponse(value) {
    return new Response(JSON.stringify(value), {
      status: 200,
      headers: { "Content-Type": "application/json", "X-Master-Source": "device-snapshot" }
    });
  }

  window.fetch = function masterAwareFetch(input, init) {
    const url = typeof input === "string" ? input : input?.url || "";
    const cache = readCache();
    if (cache) {
      if (url.split("?")[0] === FITMENT_URL && Array.isArray(cache.fitment)) return Promise.resolve(toResponse(cache.fitment));
      if (url.split("?")[0] === SEARCH_URL && Array.isArray(cache.searchOnly)) return Promise.resolve(toResponse({ vehicles: cache.searchOnly }));
      if (url.split("?")[0] === SERVICE_URL && Array.isArray(cache.serviceSpecs)) return Promise.resolve(toResponse({ records: cache.serviceSpecs }));
    }
    return nativeFetch(input, init);
  };

  function rows(payload, key) {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.[key])) return payload[key];
    return [];
  }

  async function fetchJson(url) {
    const response = await nativeFetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  async function replaceMaster(button, status) {
    if (!navigator.onLine) {
      status.textContent = "オフラインです。現在の端末保存データを使用します。";
      return;
    }
    const original = button.textContent;
    button.disabled = true;
    button.textContent = "更新中…";
    status.textContent = "最新メインデータ一式を取得しています…";
    try {
      const [fitmentPayload, searchPayload, servicePayload] = await Promise.all([
        fetchJson(FITMENT_URL),
        fetchJson(SEARCH_URL),
        fetchJson(SERVICE_URL).catch(() => ({ records: [] }))
      ]);
      const fitment = rows(fitmentPayload, "vehicles");
      const searchOnly = rows(searchPayload, "vehicles");
      const serviceSpecs = rows(servicePayload, "records");
      if (!fitment.length || !searchOnly.length) throw new Error("車両マスターの件数検証に失敗しました");

      const updatedAt = new Date().toISOString();
      const snapshot = { fitment, searchOnly, serviceSpecs, updatedAt };
      const serialized = JSON.stringify(snapshot);
      JSON.parse(serialized);
      localStorage.setItem(CACHE_KEY, serialized);
      localStorage.setItem(META_KEY, JSON.stringify({ updatedAt, fitmentCount: fitment.length, searchCount: searchOnly.length, serviceCount: serviceSpecs.length }));
      status.textContent = `更新完了：詳細適合 ${fitment.length}件 / 車種検索 ${searchOnly.length}件 / 整備情報 ${serviceSpecs.length}件。再読込します。`;
      window.setTimeout(() => location.reload(), 350);
    } catch (error) {
      console.error("main master replacement failed", error);
      status.textContent = `更新失敗：${error.message}。現在の端末データは変更していません。`;
      button.disabled = false;
      button.textContent = original;
    }
  }

  function metaLabel() {
    try {
      const meta = JSON.parse(localStorage.getItem(META_KEY) || "null");
      if (!meta?.updatedAt) return "未更新";
      return `${new Date(meta.updatedAt).toLocaleString("ja-JP", { hour12: false })} / 詳細${meta.fitmentCount || 0}件・検索${meta.searchCount || 0}件`;
    } catch { return "未更新"; }
  }

  function setupUi() {
    const actions = document.querySelector("#offlinePanel .offline-actions");
    if (!actions || document.querySelector("#mainMasterUpdate")) return;

    const oldUpdate = document.querySelector("#checkAppUpdate");
    const rebuild = document.querySelector("#rebuildCache");
    if (oldUpdate) oldUpdate.hidden = true;
    if (rebuild) rebuild.hidden = true;

    const button = document.createElement("button");
    button.id = "mainMasterUpdate";
    button.type = "button";
    button.textContent = "メインデータ更新";
    button.className = "primary";

    const status = document.createElement("p");
    status.id = "mainMasterUpdateStatus";
    status.className = "import-status";
    status.textContent = `GitHubの最新車両メインデータ一式と端末データをそっくり入れ替えます。最終更新：${metaLabel()}`;

    actions.prepend(button);
    actions.parentNode.insertBefore(status, actions.nextSibling);
    button.addEventListener("click", () => replaceMaster(button, status));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setupUi, { once: true });
  else setupUi();
})();
