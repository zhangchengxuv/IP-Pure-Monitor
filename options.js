"use strict";

// ============================================================================
// options.js — 设置页面
// 读取 / 保存设置（chrome.storage.sync，失败自动降级 local），即时生效。
// ============================================================================

(function () {
  const showHudEl = document.getElementById("showHud");
  const hudOpacityEl = document.getElementById("hudOpacity");
  const hudOpacityVal = document.getElementById("hudOpacityVal");
  const hoverExpandEl = document.getElementById("hoverExpand");
  const lockHudEl = document.getElementById("lockHud");
  const savedEl = document.getElementById("saved");
  const refreshIntervalRadios = document.querySelectorAll('input[name="refreshInterval"]');
  const maskIpRadios = document.querySelectorAll('input[name="maskIp"]');

  let savedTimer = null;

  function showSaved() {
    savedEl.classList.add("show");
    clearTimeout(savedTimer);
    savedTimer = setTimeout(function () {
      savedEl.classList.remove("show");
    }, 1200);
  }

  function render(settings) {
    showHudEl.checked = settings.showHud;
    hoverExpandEl.checked = settings.hoverExpand;
    lockHudEl.checked = settings.lockHud;
    hudOpacityEl.value = String(Math.round(settings.hudOpacity * 100));
    hudOpacityVal.textContent = hudOpacityEl.value + "%";

    refreshIntervalRadios.forEach(function (radio) {
      radio.checked = Number(radio.value) === settings.refreshInterval;
    });
    maskIpRadios.forEach(function (radio) {
      radio.checked = (radio.value === "true") === settings.maskIp;
    });
  }

  function currentSettings() {
    return {
      showHud: showHudEl.checked,
      hoverExpand: hoverExpandEl.checked,
      lockHud: lockHudEl.checked,
      hudOpacity: Number(hudOpacityEl.value) / 100,
      refreshInterval: Number(document.querySelector('input[name="refreshInterval"]:checked').value),
      maskIp: document.querySelector('input[name="maskIp"]:checked').value === "true"
    };
  }

  function persist() {
    saveSettings(currentSettings()).then(function () {
      showSaved();
    });
  }

  function bind() {
    showHudEl.addEventListener("change", persist);
    hoverExpandEl.addEventListener("change", persist);
    lockHudEl.addEventListener("change", persist);
    hudOpacityEl.addEventListener("input", function () {
      hudOpacityVal.textContent = hudOpacityEl.value + "%";
    });
    hudOpacityEl.addEventListener("change", persist);
    refreshIntervalRadios.forEach(function (radio) {
      radio.addEventListener("change", persist);
    });
    maskIpRadios.forEach(function (radio) {
      radio.addEventListener("change", persist);
    });
  }

  loadSettings().then(function (settings) {
    render(settings);
    bind();
  });
})();
