"use strict";

// ============================================================================
// content/main.js — 入口与编排
// 仅在 ChatGPT 页面注入。负责：初始化、消息通信、轮询与生命周期。
// 数据一律来自 Background（IP + ChatGPT 延迟）。
// ============================================================================

(function () {
  // 避免 SPA 路由跳转 / 重复注入产生多个状态条（HUD 只创建一次）
  if (document.getElementById(HOST_ID)) {
    return;
  }

  let hud = null;
  let settings = Object.assign({}, DEFAULT_SETTINGS);
  let position = Object.assign({}, DEFAULT_HUD_POSITION);
  let pollTimer = null;
  let data = null;      // 最近一次成功数据（用于判断 IP 变化）
  let isFetching = false;

  function sleep(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function sendMessageOnce(payload) {
    return new Promise(function (resolve) {
      try {
        chrome.runtime.sendMessage(payload, function (response) {
          if (chrome.runtime.lastError) {
            // Service Worker 暂时不可用等情况
            resolve({ ok: false, error: "runtime" });
            return;
          }
          resolve(response || { ok: false, error: "empty" });
        });
      } catch (e) {
        resolve({ ok: false, error: "runtime" });
      }
    });
  }

  async function request(type, forceRefresh) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await sendMessageOnce({ type: type, forceRefresh: Boolean(forceRefresh) });
      if (res && res.ok) return res;
      if (res && res.error === "runtime" && attempt === 0) {
        await sleep(350); // SW 可能正在启动，稍后重试一次
        continue;
      }
      return res || { ok: false, error: "runtime" };
    }
    return { ok: false, error: "runtime" };
  }

  async function refresh(forceRefresh) {
    if (!hud || isFetching) return;
    isFetching = true;
    hud.setRefreshing(true);
    hud.refreshColorScheme();

    const results = await Promise.all([
      request("GET_IP_INFO", forceRefresh),
      request("GET_LATENCY", forceRefresh)
    ]);

    isFetching = false;
    hud.setRefreshing(false);

    const ipRes = results[0] || {};
    const latRes = results[1] || {};
    const ipData = ipRes.data || null;
    const latency = (latRes.ms !== undefined && latRes.ms !== null) ? latRes.ms : null;
    const latencyStale = Boolean(latRes.stale);

    if (ipData) {
      const prevIp = data ? data.ip : null;
      data = ipData;
      const lastError = ipRes.ok ? null : (ipRes.error || null);
      hud.update(data, { stale: ipRes.stale, error: lastError, latency: latency, latencyStale: latencyStale });
      if (prevIp && prevIp !== data.ip) {
        // 代理出口 IP 发生变化，做一次轻微动画提示
        hud.flashIpChange();
      }
    } else {
      data = null;
      hud.update(null, { stale: false, error: ipRes.error || "error", latency: latency, latencyStale: latencyStale });
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
      // 重新挂载（重新读取最新位置）
      position = await loadPosition();
      hud = createHudController({ onForceRefresh: function () { refresh(true); } });
      hud.mount(position);
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
    position = await loadPosition();

    attachLifecycle();
    watchSettings(handleSettingsChanged);

    if (!settings.showHud) {
      return;
    }

    hud = createHudController({ onForceRefresh: function () { refresh(true); } });
    hud.mount(position);
    hud.setSettings(settings);
    hud.setLoading();

    await refresh(false);
    schedulePoll();
  }

  init();
})();

