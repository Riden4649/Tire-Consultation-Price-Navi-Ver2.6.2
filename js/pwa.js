(() => {
  "use strict";

  const badge = document.querySelector("#connectivityBadge");
  const META_KEY = "tire-consultation-offline-meta-v1";

  function loadVehicleQuickSpec() {
    if (document.querySelector('script[data-vehicle-quick-spec]')) return;
    const script = document.createElement("script");
    script.src = "js/vehicle-quick-spec.js?v=20260901-v263-vehicle-spec";
    script.defer = true;
    script.dataset.vehicleQuickSpec = "1";
    document.head.appendChild(script);
  }

  function updateConnectivity() {
    if (!badge) return;
    const standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
    badge.textContent = navigator.onLine
      ? (standalone ? "APP / ONLINE" : "PWA / ONLINE")
      : "APP / OFFLINE";
    badge.classList.toggle("offline", !navigator.onLine);
  }

  function saveCacheReady() {
    try {
      const meta = JSON.parse(localStorage.getItem(META_KEY) || "{}");
      meta.cacheUpdatedAt = new Date().toLocaleString("ja-JP", { hour12: false });
      meta.workerState = "登録済み";
      localStorage.setItem(META_KEY, JSON.stringify(meta));
    } catch {}
    window.dispatchEvent(new CustomEvent("app-cache-ready"));
  }

  loadVehicleQuickSpec();
  updateConnectivity();
  window.addEventListener("online", updateConnectivity);
  window.addEventListener("offline", updateConnectivity);

  if ("serviceWorker" in navigator && window.isSecureContext) {
    window.addEventListener("load", async () => {
      try {
        const registration = await navigator.serviceWorker.register("./service-worker.js", { scope: "./" });
        if (registration.active) saveCacheReady();
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          worker?.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              window.dispatchEvent(new CustomEvent("app-update-available"));
            }
          });
        });
      } catch (error) {
        console.warn("Service Worker registration failed:", error);
      }
    });

    navigator.serviceWorker.addEventListener("message", event => {
      if (event.data?.type === "CACHE_READY") saveCacheReady();
    });

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      saveCacheReady();
      window.location.reload();
    });
  }
})();
