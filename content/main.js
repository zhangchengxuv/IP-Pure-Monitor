"use strict";

// ============================================================================
// content/main.js — 入口与编排
// 负责：初始化、消息通信（Content Script → Background）、轮询与生命周期。
// 数据一律来自 Background（已 normalize），本文件不直接 fetch IPPure。
// ============================================================================

(function () {
  // 避免 SPA 路由跳转 / 重复注入产生多个状态条
  if (document.getElementById(HOST_ID)) {
    return;
  }

  let hud = null;
  let settings = Object.assign({}, DEFAULT_SETTINGS);
  let pollTimer = null;
  let data = null;      // 最近一次成功数据（用于判断 IP 变化）
  let isFetching = false;

  function sleep(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function sendMessageOnce(forceRefresh) {
    return new Promise(function (resolve) {
      try {
        chrome.runtime.sendMessage(
          { type: "GET_IP_INFO", forceRefresh: Boolean(forceRefresh) },
          function (response) {
            if (chrome.runtime.lastError) {
              // Service Worker 暂时不可用等情况
              resolve({ ok: false, data: null, source: null, stale: false, error: "runtime" });
              return;
            }
            resolve(response || { ok: false, data: null, source: null, stale: false, error: "empty" });
          }
        );
      } catch (e) {
        resolve({ ok: false, data: null, source: null, stale: false, error: "runtime" });
      }
    });
  }

  async function requestIpInfo(forceRefresh) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await sendMessageOnce(forceRefresh);
      if (res.ok) return res;
      if (res.error === "runtime" && attempt === 0) {
        await sleep(350); // SW 可能正在启动，稍后重试一次
        continue;
      }
      return res;
    }
    return { ok: false, data: null, source: null, stale: false, error: "runtime" };
  }

  async function refresh(forceRefresh) {
    if (!hud || isFetching) return;
    isFetching = true;
    if (hud) hud.setRefreshing(true);

    const res = await requestIpInfo(forceRefresh);

    isFetching = false;
    if (hud) hud.setRefreshing(false);

    if (res.data) {
      const prevIp = data ? data.ip : null;
      data = res.data;
      const lastError = res.ok ? null : (res.error || null);
      hud.update(data, { stale: res.stale, error: lastError });
      if (prevIp && prevIp !== data.ip) {
        // 代理出口 IP 发生变化，做一次轻微动画提示
        hud.flashIpChange();
      }
    } else {
      data = null;
      hud.update(null, { stale: false, error: res.error || "error" });
    }
  }

  function schedulePoll() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(function () {
      refresh(false);
    }, settings.refreshInterval);
  }

  function attachLifecycle() {
    window.addEventListener("focus", function () {
      refresh(false);
    });
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) {
        refresh(false);
      }
    });
  }

  async function handleSettingsChanged(newSettings) {
    const wasHidden = !settings.showHud;
    settings = newSettings;

    if (!settings.showHud) {
      if (hud) {
        hud.destroy();
        hud = null;
      }
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = null;
      return;
    }

    if (wasHidden) {
      // 重新挂载
      hud = createHudController({ onForceRefresh: function () { refresh(true); } });
      hud.mount();
      hud.setSettings(settings);
      refresh(false);
      schedulePoll();
      return;
    }

    hud.setSettings(settings);
    schedulePoll();
  }

  async function init() {
    settings = await loadSettings();

    attachLifecycle();
    watchSettings(handleSettingsChanged);

    if (!settings.showHud) {
      return;
    }

    hud = createHudController({ onForceRefresh: function () { refresh(true); } });
    hud.mount();
    hud.setSettings(settings);
    hud.setLoading();

    await refresh(false);
    schedulePoll();
  }

  init();
})();
