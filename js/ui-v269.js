(() => {
  "use strict";

  const VERSION = "2.6.9";
  let queued = false;

  function decorateTabs() {
    const sales = document.querySelector('[data-app-tab="sales"]');
    const management = document.querySelector('[data-app-tab="management"]');
    if (sales && sales.textContent !== "タイヤ") sales.textContent = "タイヤ";
    if (management && management.textContent !== "管理") management.textContent = "管理";
    sales?.setAttribute("aria-label", "タイヤ商談");
    management?.setAttribute("aria-label", "管理・設定");
  }

  function keepVehicleAreaAtTop() {
    const shell = document.querySelector("main.shell");
    const vehicle = document.querySelector("#vehicleQuickPanel");
    const finder = document.querySelector(".finder");
    if (!shell || !vehicle || !finder) return;
    if (vehicle.parentElement === shell && vehicle.nextElementSibling !== finder) {
      shell.insertBefore(vehicle, finder);
    }
  }

  function refineManualSearch() {
    const panel = document.querySelector("#manualSizeFlow");
    if (!panel) return;
    const small = panel.querySelector(".manual-size-head small");
    const strong = panel.querySelector(".manual-size-head strong");
    if (small && small.textContent !== "車種検索と併用できます") small.textContent = "車種検索と併用できます";
    if (strong && strong.textContent !== "タイヤサイズを直接選択") strong.textContent = "タイヤサイズを直接選択";
  }

  function exposeInstalledTotal() {
    document.querySelectorAll("#resultGrid .result-card").forEach(card => {
      const total = card.querySelector(".labor-total");
      if (!total) return;
      const label = total.querySelector("span");
      if (label && !/工賃込み|総額/.test(label.textContent || "")) label.textContent = "工賃込み総額";
    });
  }

  function setVersion() {
    const button = document.querySelector("#versionButton");
    if (button && button.textContent !== `商談ナビ Ver ${VERSION}`) button.textContent = `商談ナビ Ver ${VERSION}`;
    const number = document.querySelector("#versionNumber");
    if (number && number.textContent !== `Ver ${VERSION}`) number.textContent = `Ver ${VERSION}`;
    const offline = document.querySelector("#offlineVersion");
    if (offline && offline.textContent !== `Ver ${VERSION}`) offline.textContent = `Ver ${VERSION}`;
  }

  function apply() {
    queued = false;
    decorateTabs();
    keepVehicleAreaAtTop();
    refineManualSearch();
    exposeInstalledTotal();
    setVersion();
  }

  function scheduleApply() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(apply);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", scheduleApply, { once: true });
  else scheduleApply();

  const observer = new MutationObserver(scheduleApply);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener("click", event => {
    if (event.target.closest("[data-app-tab], #vehicleQuickPanel, #manualSizeFlow, #resultGrid")) scheduleApply();
  });
  window.addEventListener("app-cache-ready", scheduleApply);
})();
