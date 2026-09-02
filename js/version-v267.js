(() => {
  "use strict";
  const VERSION = "2.6.9";
  const UPDATED_AT = "2026/09/02";

  function installPrintFix() {
    if (document.querySelector("#v268PrintContrastFix")) return;
    const style = document.createElement("style");
    style.id = "v268PrintContrastFix";
    style.textContent = `
      .compare-sheet .compare-total,
      #compareDialog .compare-total {
        background:#2f6b57!important;
        border-top-color:#2f6b57!important;
        padding:10px 12px!important;
        border-radius:8px!important;
        -webkit-print-color-adjust:exact;
        print-color-adjust:exact;
      }
      .compare-sheet .compare-total span,
      .compare-sheet .compare-total strong,
      #compareDialog .compare-total span,
      #compareDialog .compare-total strong {
        color:#fff!important;
        -webkit-text-fill-color:#fff!important;
        opacity:1!important;
      }
      @media print {
        .compare-sheet .compare-total,
        #compareDialog .compare-total { background:#2f6b57!important; }
        .compare-sheet .compare-total span,
        .compare-sheet .compare-total strong,
        #compareDialog .compare-total span,
        #compareDialog .compare-total strong {
          color:#fff!important;
          -webkit-text-fill-color:#fff!important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function apply() {
    installPrintFix();
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
