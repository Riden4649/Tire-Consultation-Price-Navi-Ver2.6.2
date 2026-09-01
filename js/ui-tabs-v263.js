(() => {
  "use strict";

  function initTabs() {
    const shell = document.querySelector("main.shell");
    const admin = document.querySelector("#adminPanel");
    const dataQuality = document.querySelector("#dataQualityPanel");
    if (!shell || !admin || document.querySelector("#appModeTabs")) return;

    const nav = document.createElement("nav");
    nav.id = "appModeTabs";
    nav.className = "app-mode-tabs";
    nav.setAttribute("aria-label", "画面切替");
    nav.innerHTML = `
      <button type="button" data-app-tab="sales" class="selected">商談</button>
      <button type="button" data-app-tab="management">価格表・設定</button>`;

    const intro = shell.querySelector(".intro");
    const season = shell.querySelector(".season-switcher");
    const anchor = season || shell.firstElementChild;
    shell.insertBefore(nav, anchor);

    // 商談画面は縦スペースを優先するため旧イントロコピーを常時非表示。
    if (intro) intro.hidden = true;
    // データ確認は独立タブを廃止。画面上から非表示にする。
    if (dataQuality) dataQuality.hidden = true;

    const topSections = () => [...shell.children].filter(node => node.tagName === "SECTION");

    function ensurePricebookImportButton() {
      const input = document.querySelector("#fileInput");
      const drop = document.querySelector("#dropZone");
      if (!input || !drop || document.querySelector("#pricebookImportButton")) return;
      const button = document.createElement("button");
      button.id = "pricebookImportButton";
      button.type = "button";
      button.className = "pricebook-import-button";
      button.textContent = "Excel価格表を選択";
      button.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        input.click();
      });
      drop.insertAdjacentElement("afterend", button);
    }

    function showTab(tab) {
      const isSales = tab === "sales";
      nav.querySelectorAll("[data-app-tab]").forEach(button => {
        const selected = button.dataset.appTab === tab;
        button.classList.toggle("selected", selected);
        button.setAttribute("aria-pressed", String(selected));
        if (!selected) button.blur();
      });

      if (season) season.hidden = isSales;
      admin.hidden = isSales;
      if (!admin.hidden) {
        admin.open = true;
        admin.dataset.mode = "management";
        const body = admin.querySelector(".admin-body");
        if (body) [...body.children].forEach(child => { if (child.tagName === "SECTION") child.hidden = false; });
        ensurePricebookImportButton();
      }

      topSections().forEach(section => {
        if (section === intro || section === season || section === dataQuality) return;
        if (section.id === "vehicleQuickPanel") {
          section.hidden = !isSales;
          return;
        }
        if (section.classList.contains("finder") || section.id === "resultsSection" || section.classList.contains("proposal-panel")) {
          section.hidden = !isSales;
          return;
        }
        section.hidden = !isSales;
      });

      if (dataQuality) dataQuality.hidden = true;
      requestAnimationFrame(() => document.activeElement?.blur?.());
      window.scrollTo({ top: 0, behavior: "auto" });
    }

    nav.addEventListener("pointerup", event => {
      const button = event.target.closest("[data-app-tab]");
      if (!button) return;
      event.preventDefault();
      showTab(button.dataset.appTab);
    });
    nav.addEventListener("click", event => {
      const button = event.target.closest("[data-app-tab]");
      if (!button) return;
      if (event.detail === 0) showTab(button.dataset.appTab);
    });

    const observer = new MutationObserver(() => {
      const active = nav.querySelector(".selected")?.dataset.appTab;
      if (active === "sales") {
        const quick = document.querySelector("#vehicleQuickPanel");
        if (quick) quick.hidden = false;
      }
    });
    observer.observe(shell, { childList: true });

    ensurePricebookImportButton();
    showTab("sales");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initTabs, { once: true });
  else initTabs();
})();
