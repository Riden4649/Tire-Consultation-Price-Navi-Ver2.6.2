(() => {
  "use strict";
  const VERSION = "2.6.7";
  const UPDATED_AT = "2026/09/01";

  function apply() {
    const button = document.querySelector("#versionButton");
    if (button && button.textContent !== `商談ナビ Ver ${VERSION}`) button.textContent = `商談ナビ Ver ${VERSION}`;
    const number = document.querySelector("#versionNumber");
    if (number && number.textContent !== `Ver ${VERSION}`) number.textContent = `Ver ${VERSION}`;
    const date = document.querySelector("#versionUpdatedAt");
    if (date && date.textContent !== UPDATED_AT) date.textContent = UPDATED_AT;
    const offline = document.querySelector("#offlineVersion");
    if (offline && offline.textContent !== `Ver ${VERSION}`) offline.textContent = `Ver ${VERSION}`;
  }

  apply();
  const roots = [document.querySelector("#versionDialog"), document.querySelector("#offlinePanel"), document.querySelector(".topbar")].filter(Boolean);
  roots.forEach(root => new MutationObserver(apply).observe(root, { childList: true, subtree: true, characterData: true }));
  window.addEventListener("app-cache-ready", apply);
  window.addEventListener("app-update-available", apply);
  document.querySelector("#versionButton")?.addEventListener("click", () => queueMicrotask(apply));
})();
