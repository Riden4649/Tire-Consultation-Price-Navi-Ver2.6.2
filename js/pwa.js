(() => {
  "use strict";

  const badge = document.querySelector("#connectivityBadge");
  const META_KEY = "tire-consultation-offline-meta-v1";

  function loadEnhancementStyles() {
    const styles = [
      ["vehicle-quick-spec", "css/vehicle-quick-spec.css?v=20260901-v264-size-filter"],
      ["ui-tabs", "css/ui-tabs-v263.css?v=20260901-v266-management-tab"],
      ["sales-flow", "css/sales-flow-v267.css?v=20260902-v268-print-contrast"],
      ["ui-v269", "css/ui-v269.css?v=20260902-v269-unified-ipad"]
    ];
    styles.forEach(([key, href]) => {
      if (document.querySelector(`link[data-enhancement-style="${key}"]`)) return;
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.dataset.enhancementStyle = key;
      document.head.appendChild(link);
    });
  }

  function loadEnhancementScripts() {
    const scripts = [
      ["vehicle-quick-spec", "js/vehicle-quick-spec.js?v=20260901-v264-size-filter"],
      ["ui-tabs", "js/ui-tabs-v263.js?v=20260901-v266-management-tab"],
      ["sales-flow", "js/sales-flow-v267.js?v=20260901-v267-ai-team"],
      ["version-v267", "js/version-v267.js?v=20260902-v269"],
      ["ui-v269", "js/ui-v269.js?v=20260902-v269-unified-ipad"]
    ];
    scripts.forEach(([key, src]) => {
      if (document.querySelector(`script[data-enhancement-script="${key}"]`)) return;
      const script = document.createElement("script");
      script.src = src;
      script.async = false;
      script.dataset.enhancementScript = key;
      document.head.appendChild(script);
    });
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

  loadEnhancementStyles();
  loadEnhancementScripts();
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
