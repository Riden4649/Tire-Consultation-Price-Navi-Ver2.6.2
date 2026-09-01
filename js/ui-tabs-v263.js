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

    const anchor = shell.querySelector(".season-switcher") || shell.firstElementChild;
    shell.insertBefore(nav, anchor);

    const topSections = () => [...shell.children].filter(node => node.tagName === "SECTION");
    const intro = shell.querySelector(".intro");
    const season = shell.querySelector(".season-switcher");

    function setAdminMode(mode) {
      const body = admin.querySelector(".admin-body");
      if (!body) return;
      const sections = [...body.children].filter(node => node.tagName === "SECTION");
      const first = sections[0];
      const second = sections[1];
      if (first) first.classList.toggle("settings-only", mode === "settings");
      if (second) second.hidden = mode !== "settings";
      admin.dataset.mode = mode;
    }

    function showTab(tab) {
      nav.querySelectorAll("[data-app-tab]").forEach(button => {
        const selected = button.dataset.appTab === tab;
        button.classList.toggle("selected", selected);
        button.setAttribute("aria-pressed", String(selected));
      });

      if (intro) intro.hidden = tab !== "sales";
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
        if (section !== dataQuality) section.hidden = tab !== "sales";
      });

      if (dataQuality) {
        if (tab === "data") dataQuality.hidden = false;
        else dataQuality.hidden = true;
      }

      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    nav.addEventListener("click", event => {
      const button = event.target.closest("[data-app-tab]");
      if (button) showTab(button.dataset.appTab);
    });

    const observer = new MutationObserver(() => {
      const active = nav.querySelector(".selected")?.dataset.appTab;
      if (active === "sales") {
        const quick = document.querySelector("#vehicleQuickPanel");
        if (quick) quick.hidden = false;
      }
    });
    observer.observe(shell, { childList: true });

    showTab("sales");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initTabs, { once: true });
  else initTabs();
})();
