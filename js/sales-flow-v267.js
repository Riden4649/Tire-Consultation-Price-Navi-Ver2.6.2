(() => {
  "use strict";

  const VERSION = "2.6.7";
  const UPDATED_AT = "2026/09/01";
  const SETTINGS_KEY = "tire-sales-flow-v267";
  const TAGLINE_KEY = "tire-sales-taglines-v1";
  const MAX_COMPARE = 4;

  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const text = value => String(value ?? "").trim();
  const norm = value => text(value).normalize("NFKC").toUpperCase().replace(/[\s　\-_/・]/g, "");

  let vehicleMode = false;
  let manualSize = "";
  let sizeIndex = [];
  let rebuildingSizes = false;
  let resultObserver = null;
  let compareObserver = null;

  const flowSettings = loadJson(SETTINGS_KEY, {
    showBrand: false,
    showProduct: false,
    showInch: false
  });
  const taglines = loadJson(TAGLINE_KEY, {});

  function loadJson(key, fallback) {
    try {
      return { ...fallback, ...(JSON.parse(localStorage.getItem(key) || "{}") || {}) };
    } catch {
      return { ...fallback };
    }
  }

  function saveFlowSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(flowSettings));
  }

  function saveTaglines() {
    localStorage.setItem(TAGLINE_KEY, JSON.stringify(taglines));
  }

  function setVersionDisplay() {
    const versionButton = $("#versionButton");
    if (versionButton) versionButton.textContent = `商談ナビ Ver ${VERSION}`;
    const versionNumber = $("#versionNumber");
    if (versionNumber) versionNumber.textContent = `Ver ${VERSION}`;
    const updatedAt = $("#versionUpdatedAt");
    if (updatedAt) updatedAt.textContent = UPDATED_AT;
    const offlineVersion = $("#offlineVersion");
    if (offlineVersion) offlineVersion.textContent = `Ver ${VERSION}`;
    const history = $(".version-history ul");
    if (history && !history.querySelector("[data-v267-history]")) {
      const li = document.createElement("li");
      li.dataset.v267History = "1";
      li.textContent = "Ver2.6.7：車種→指定サイズ→価格順パターンの最短商談フロー、サイズ直接検索、4商品比較UIを追加";
      history.prepend(li);
    }
  }

  function makeManualSizePanel() {
    const finder = $(".finder");
    if (!finder || $("#manualSizeFlow")) return;
    const head = finder.querySelector(".finder-head");
    const panel = document.createElement("section");
    panel.id = "manualSizeFlow";
    panel.className = "manual-size-flow";
    panel.innerHTML = `
      <div class="manual-size-head">
        <div><small>車種が見つからない場合</small><strong>タイヤサイズから探す</strong></div>
        <span id="manualSizeStatus">価格表からサイズを準備しています</span>
      </div>
      <div class="manual-size-input-row">
        <input id="manualSizeInput" type="search" inputmode="search" autocomplete="off" placeholder="例：155/65R14">
        <button id="manualSizeClear" type="button">クリア</button>
      </div>
      <div class="manual-size-results" id="manualSizeResults" hidden></div>`;
    head?.insertAdjacentElement("afterend", panel);

    const input = $("#manualSizeInput");
    input?.addEventListener("input", renderManualMatches);
    input?.addEventListener("focus", renderManualMatches);
    $("#manualSizeClear")?.addEventListener("click", () => {
      manualSize = "";
      if (input) input.value = "";
      $("#manualSizeResults")?.setAttribute("hidden", "");
      document.body.classList.remove("manual-size-selected");
      input?.focus();
    });
  }

  function makeFlowSettings() {
    const adminBody = $("#adminPanel .admin-body");
    const target = adminBody?.querySelectorAll(":scope > section")?.[1] || adminBody?.lastElementChild;
    if (!target || $("#salesFlowSettings")) return;
    const section = document.createElement("div");
    section.id = "salesFlowSettings";
    section.className = "sales-flow-settings";
    section.innerHTML = `
      <div class="sales-flow-settings-head">
        <div><strong>商談検索の表示項目</strong><small>通常は「サイズ → パターン」の最短表示です。必要な項目だけ追加できます。</small></div>
      </div>
      <div class="sales-flow-checks">
        <label><input type="checkbox" data-flow-setting="showBrand">ブランド</label>
        <label><input type="checkbox" data-flow-setting="showProduct">パターン絞り込み</label>
        <label><input type="checkbox" data-flow-setting="showInch">インチ</label>
      </div>
      <details class="tagline-settings">
        <summary>商品一言コメントを変更</summary>
        <p>比較カードに小さく表示する一言です。商品が検索結果に出ると編集欄が追加されます。</p>
        <div id="taglineSettingRows"></div>
      </details>`;
    target.append(section);
    section.querySelectorAll("[data-flow-setting]").forEach(input => {
      const key = input.dataset.flowSetting;
      input.checked = Boolean(flowSettings[key]);
      input.addEventListener("change", () => {
        flowSettings[key] = input.checked;
        saveFlowSettings();
        applyFilterVisibility();
      });
    });
  }

  function applyFilterVisibility() {
    const finder = $(".finder");
    if (!finder) return;
    const steps = {
      brand: finder.querySelector('.filter-step[data-step="brand"]'),
      subbrand: finder.querySelector('.filter-step[data-step="subbrand"]'),
      inch: finder.querySelector('.filter-step[data-step="inch"]'),
      size: finder.querySelector('.filter-step[data-step="size"]')
    };
    if (steps.brand) steps.brand.hidden = !flowSettings.showBrand;
    if (steps.subbrand) steps.subbrand.hidden = !flowSettings.showProduct;
    if (steps.inch) steps.inch.hidden = !flowSettings.showInch;
    if (steps.size) steps.size.hidden = true;
    const summary = $("#selectionSummary");
    if (summary) summary.hidden = true;
    const search = $("#searchButton");
    if (search) search.hidden = true;
    finder.classList.toggle("has-advanced-fields", flowSettings.showBrand || flowSettings.showProduct || flowSettings.showInch);
  }

  function collectSizes() {
    if (rebuildingSizes) return;
    const inchContainer = $("#inchChoices");
    const sizeContainer = $("#sizeChoices");
    if (!inchContainer || !sizeContainer) return;
    const inchButtons = [...inchContainer.querySelectorAll(".choice")];
    if (!inchButtons.length) {
      sizeIndex = [];
      updateManualStatus();
      return;
    }

    rebuildingSizes = true;
    const selectedInch = inchContainer.querySelector(".choice.selected")?.dataset.value || "";
    const selectedSize = sizeContainer.querySelector(".choice.selected")?.dataset.value || "";
    const found = new Map();

    inchButtons.forEach(inchButton => {
      inchButton.click();
      [...sizeContainer.querySelectorAll(".choice")].forEach(sizeButton => {
        const value = text(sizeButton.dataset.value);
        if (!value) return;
        found.set(norm(value), { size: value, inch: text(inchButton.dataset.value) });
      });
    });

    if (selectedInch) {
      const restoreInch = [...inchContainer.querySelectorAll(".choice")].find(button => text(button.dataset.value) === selectedInch);
      restoreInch?.click();
      if (selectedSize) {
        const restoreSize = [...sizeContainer.querySelectorAll(".choice")].find(button => norm(button.dataset.value) === norm(selectedSize));
        restoreSize?.click();
      }
    }

    sizeIndex = [...found.values()].sort((a, b) => tireSizeSort(a.size, b.size));
    rebuildingSizes = false;
    updateManualStatus();
    renderManualMatches();
  }

  function tireSizeSort(a, b) {
    const parse = value => {
      const m = text(value).match(/(\d{3})\/(\d{2,3})R(\d{2})/i);
      return m ? [Number(m[3]), Number(m[1]), Number(m[2])] : [999, 999, 999];
    };
    const aa = parse(a), bb = parse(b);
    return aa[0] - bb[0] || aa[1] - bb[1] || aa[2] - bb[2] || text(a).localeCompare(text(b), "ja");
  }

  function updateManualStatus() {
    const status = $("#manualSizeStatus");
    if (!status) return;
    status.textContent = sizeIndex.length ? `${sizeIndex.length}サイズ` : "価格表を読み込むと使用できます";
  }

  function renderManualMatches() {
    const input = $("#manualSizeInput");
    const box = $("#manualSizeResults");
    if (!input || !box) return;
    const q = norm(input.value);
    if (!q || !sizeIndex.length) {
      box.hidden = true;
      box.replaceChildren();
      return;
    }
    const matches = sizeIndex.filter(item => norm(item.size).includes(q)).slice(0, 16);
    box.hidden = false;
    if (!matches.length) {
      box.innerHTML = '<p class="manual-size-empty">該当サイズがありません</p>';
      return;
    }
    box.innerHTML = matches.map(item => `<button type="button" data-manual-size="${escapeHtml(item.size)}" data-manual-inch="${escapeHtml(item.inch)}"><strong>${escapeHtml(item.size)}</strong><small>${escapeHtml(item.inch)}インチ</small></button>`).join("");
    box.querySelectorAll("[data-manual-size]").forEach(button => button.addEventListener("click", () => chooseManualSize(button.dataset.manualSize, button.dataset.manualInch)));
  }

  function chooseManualSize(size, inch) {
    vehicleMode = false;
    manualSize = size;
    document.body.classList.remove("vehicle-fitment-mode");
    document.body.classList.add("manual-size-selected");
    const input = $("#manualSizeInput");
    if (input) input.value = size;
    const box = $("#manualSizeResults");
    if (box) box.hidden = true;

    const inchButton = [...$("#inchChoices")?.querySelectorAll(".choice") || []].find(button => text(button.dataset.value) === text(inch));
    inchButton?.click();
    queueMicrotask(() => {
      const sizeButton = [...$("#sizeChoices")?.querySelectorAll(".choice") || []].find(button => norm(button.dataset.value) === norm(size));
      sizeButton?.click();
      $("#searchButton")?.click();
    });
  }

  function defaultTagline(name) {
    const n = norm(name);
    if (/REGNO|GRX|GRVII|GRV2|GR-X|GRV/.test(n)) return "静かで上質な乗り心地";
    if (/PLAYZ|PX/.test(n)) return "疲れにくさと安定感を重視";
    if (/ECOPIA|NH200|EP150|EP300/.test(n)) return "低燃費と長持ちのバランス";
    if (/NEWNO/.test(n)) return "毎日の走りにバランスよく対応";
    if (/ALENZA|DUELER/.test(n)) return "SUVの安定感と快適性を重視";
    if (/BLIZZAK|VRX|DM-V|VL10|WZ/.test(n)) return "冬道での安心感を重視";
    if (/SEIBERLING|DAYTON/.test(n)) return "価格を抑えた実用重視";
    if (/POTENZA/.test(n)) return "走行性能と応答性を重視";
    return "価格と性能のバランス重視";
  }

  function taglineFor(name) {
    return text(taglines[name]) || defaultTagline(name);
  }

  function enhanceResults() {
    const grid = $("#resultGrid");
    if (!grid) return;
    const cards = [...grid.querySelectorAll(".result-card")];
    if (!cards.length) return;

    const active = document.activeElement;
    cards.sort((a, b) => priceValue(a.querySelector(".single-price")?.textContent) - priceValue(b.querySelector(".single-price")?.textContent));
    cards.forEach(card => grid.append(card));

    cards.forEach(card => {
      const name = text(card.querySelector(".product-name")?.textContent);
      if (name && !(name in taglines)) taglines[name] = defaultTagline(name);
      let line = card.querySelector(".salesflow-tagline");
      if (!line) {
        line = document.createElement("p");
        line.className = "salesflow-tagline";
        card.querySelector(".product-name")?.insertAdjacentElement("afterend", line);
      }
      line.textContent = taglineFor(name);
      const checkbox = card.querySelector(".proposal-checkbox");
      card.classList.toggle("selected-proposal", Boolean(checkbox?.checked));
      const proposalLabel = card.querySelector(".proposal-check span");
      if (proposalLabel) proposalLabel.textContent = checkbox?.checked ? "選択中" : "比較に追加";
    });
    saveTaglines();
    renderTaglineSettings();
    if (active && document.contains(active)) active.focus?.({ preventScroll: true });
  }

  function priceValue(value) {
    const n = Number(text(value).replace(/[^0-9.-]/g, ""));
    return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
  }

  function selectedProposalCount() {
    const count = parseInt(text($("#proposalCount")?.textContent), 10);
    return Number.isFinite(count) ? count : $$("#resultGrid .proposal-checkbox:checked").length;
  }

  function showCompareLimit() {
    let note = $("#compareLimitNotice");
    if (!note) {
      note = document.createElement("div");
      note.id = "compareLimitNotice";
      note.className = "compare-limit-notice";
      note.textContent = "比較は最大4商品までです";
      document.body.append(note);
    }
    note.classList.add("show");
    clearTimeout(showCompareLimit.timer);
    showCompareLimit.timer = setTimeout(() => note.classList.remove("show"), 1800);
  }

  function bindResultInteraction() {
    const grid = $("#resultGrid");
    if (!grid || grid.dataset.salesFlowBound) return;
    grid.dataset.salesFlowBound = "1";

    grid.addEventListener("click", event => {
      const card = event.target.closest(".result-card");
      if (!card) return;
      const checkbox = card.querySelector(".proposal-checkbox");
      if (!checkbox) return;

      const proposalControl = event.target.closest(".proposal-check");
      if (proposalControl && !checkbox.checked && selectedProposalCount() >= MAX_COMPARE) {
        event.preventDefault();
        event.stopImmediatePropagation();
        showCompareLimit();
        return;
      }

      if (event.target.closest("button,input,label,a")) return;
      if (!checkbox.checked && selectedProposalCount() >= MAX_COMPARE) {
        showCompareLimit();
        return;
      }
      checkbox.click();
    }, true);

    grid.addEventListener("change", event => {
      const checkbox = event.target.closest(".proposal-checkbox");
      if (!checkbox) return;
      queueMicrotask(enhanceResults);
    });
  }

  function enhanceProposalList() {
    const list = $("#proposalList");
    if (!list) return;
    list.querySelectorAll(".proposal-item").forEach(item => {
      item.querySelector(".proposal-recommend")?.setAttribute("hidden", "");
      item.querySelector(".proposal-actions")?.setAttribute("hidden", "");
      const info = item.querySelector(".proposal-info");
      const strong = info?.querySelector("strong");
      if (!info || !strong || info.querySelector(".proposal-tagline")) return;
      const full = text(strong.textContent);
      const productName = full.split(/\s+/).slice(1).join(" ") || full;
      const line = document.createElement("small");
      line.className = "proposal-tagline";
      line.textContent = taglineFor(productName);
      info.append(line);
    });
    const button = $("#openCompareProposal");
    if (button) button.textContent = "比較・見積を確認";
  }

  function enhanceCompare() {
    $$(".compare-card").forEach(card => {
      card.querySelector(".compare-recommend")?.remove();
      const h3 = card.querySelector("h3");
      if (!h3 || card.querySelector(".compare-tagline")) return;
      const parts = text(h3.innerText || h3.textContent).split(/\n+/).map(v => v.trim()).filter(Boolean);
      const productName = parts.slice(1).join(" ") || parts[0] || "";
      const line = document.createElement("p");
      line.className = "compare-tagline";
      line.textContent = taglineFor(productName);
      h3.insertAdjacentElement("afterend", line);
    });
    $("#quoteRecommendBadge")?.setAttribute("hidden", "");
  }

  function renderTaglineSettings() {
    const rows = $("#taglineSettingRows");
    if (!rows) return;
    const names = [...new Set($$("#resultGrid .product-name").map(node => text(node.textContent)).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ja"));
    if (!names.length) {
      rows.innerHTML = '<p class="tagline-empty">商品を検索すると編集できます。</p>';
      return;
    }
    rows.innerHTML = names.map(name => `<label><span>${escapeHtml(name)}</span><input type="text" data-tagline-name="${escapeHtml(name)}" value="${escapeHtml(taglineFor(name))}" maxlength="32"></label>`).join("");
    rows.querySelectorAll("[data-tagline-name]").forEach(input => input.addEventListener("change", () => {
      taglines[input.dataset.taglineName] = text(input.value) || defaultTagline(input.dataset.taglineName);
      saveTaglines();
      enhanceResults();
      enhanceCompare();
    }));
  }

  function bindVehicleMode() {
    const results = $("#vehicleQuickResults");
    const clear = $("#vehicleQuickClear");
    if (results && !results.dataset.salesFlowBound) {
      results.dataset.salesFlowBound = "1";
      results.addEventListener("click", event => {
        const button = event.target.closest("[data-vehicle-result]");
        if (!button) return;
        const searchOnly = /詳細適合は要確認|車種名のみ登録/.test(text(button.textContent));
        setTimeout(() => {
          vehicleMode = !searchOnly;
          document.body.classList.toggle("vehicle-fitment-mode", vehicleMode);
          if (searchOnly) {
            $("#manualSizeInput")?.focus();
          }
        }, 0);
      });
    }
    if (clear && !clear.dataset.salesFlowBound) {
      clear.dataset.salesFlowBound = "1";
      clear.addEventListener("click", () => {
        vehicleMode = false;
        document.body.classList.remove("vehicle-fitment-mode");
      });
    }
  }

  function observe() {
    const inchChoices = $("#inchChoices");
    if (inchChoices) {
      new MutationObserver(() => {
        if (!rebuildingSizes) requestAnimationFrame(collectSizes);
      }).observe(inchChoices, { childList: true });
    }

    const grid = $("#resultGrid");
    if (grid) {
      resultObserver = new MutationObserver(() => requestAnimationFrame(() => {
        resultObserver.disconnect();
        enhanceResults();
        enhanceProposalList();
        resultObserver.observe(grid, { childList: true, subtree: true, attributes: true, attributeFilter: ["checked", "class"] });
      }));
      resultObserver.observe(grid, { childList: true, subtree: true, attributes: true, attributeFilter: ["checked", "class"] });
    }

    const proposalList = $("#proposalList");
    proposalList && new MutationObserver(() => requestAnimationFrame(enhanceProposalList)).observe(proposalList, { childList: true, subtree: true });

    const comparePages = $("#comparePages");
    if (comparePages) {
      compareObserver = new MutationObserver(() => requestAnimationFrame(enhanceCompare));
      compareObserver.observe(comparePages, { childList: true, subtree: true });
    }
  }

  function escapeHtml(value) {
    return text(value).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  }

  function init() {
    setVersionDisplay();
    makeManualSizePanel();
    makeFlowSettings();
    applyFilterVisibility();
    bindResultInteraction();
    bindVehicleMode();
    observe();
    requestAnimationFrame(() => {
      collectSizes();
      enhanceResults();
      enhanceProposalList();
      enhanceCompare();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
