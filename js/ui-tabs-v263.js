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
      <button type="button" data-app-tab="pricebook">価格表</button>
      <button type="button" data-app-tab="data">データ確認</button>
      <button type="button" data-app-tab="settings">設定</button>`;

    const intro = shell.querySelector(".intro");
    const season = shell.querySelector(".season-switcher");
    const anchor = season || shell.firstElementChild;
    shell.insertBefore(nav, anchor);

    // 商談画面の縦スペースを優先。旧イントロコピーは常時非表示。
    if (intro) intro.hidden = true;

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

    function setAdminMode(mode) {
      const body = admin.querySelector(".admin-body");
      if (!body) return;
      const sections = [...body.children].filter(node => node.tagName === "SECTION");
      const second = sections[1];
      if (second) second.hidden = mode !== "settings";
      admin.dataset.mode = mode;
      if (mode === "pricebook") ensurePricebookImportButton();
    }

    function showTab(tab) {
      nav.querySelectorAll("[data-app-tab]").forEach(button => {
        const selected = button.dataset.appTab === tab;
        button.classList.toggle("selected", selected);
        button.setAttribute("aria-pressed", String(selected));
        if (!selected) button.blur();
      });

      if (season) season.hidden = !(tab === "sales" || tab === "pricebook");
      admin.hidden = !(tab === "pricebook" || tab === "settings");
      if (!admin.hidden) admin.open = true;
      setAdminMode(tab === "settings" ? "settings" : "pricebook");

      topSections().forEach(section => {
        if (section === intro || section === season || section === dataQuality) return;
        if (section.id === "vehicleQuickPanel") {
          section.hidden = tab !== "sales";
          return;
        }
        if (section.classList.contains("finder") || section.id === "resultsSection" || section.classList.contains("proposal-panel")) {
          section.hidden = tab !== "sales";
          return;
        }
        section.hidden = tab !== "sales";
      });

      if (dataQuality) dataQuality.hidden = tab !== "data";

      // iPad Safariのタップ後ハイライト/フォーカス残りを消す。
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
