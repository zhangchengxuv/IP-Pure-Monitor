"use strict";

// ============================================================================
// background.js — Service Worker
// 唯一职责：请求固定的 IPPure API 并做全局缓存。
// 不接受 content script 任意指定 URL，API 地址写死在此处。
// ============================================================================

importScripts(
  "shared/constants.js",
  "shared/utils.js",
  "shared/normalize.js",
  "shared/settings.js"
);

// 固定 API 地址
const API_URL = "https://my.ippure.com/v1/info";
const TIMEOUT_MS = REQUEST_TIMEOUT_MS; // 8000ms

// 全局缓存（内存），所有标签页共享；SW 被回收后自动清空，属于可接受行为。
let cache = {
  data: null,   // 已规范化的数据
  fetchedAt: 0  // 上次成功获取时间戳
};

let cacheTtlMs = DEFAULT_CACHE_TTL_MS;
let inflightPromise = null;

// 缓存 TTL 跟随设置中的刷新间隔，并随设置变化更新。
loadSettings().then(function (settings) {
  cacheTtlMs = settings.refreshInterval;
});
watchSettings(function (settings) {
  cacheTtlMs = settings.refreshInterval;
});

function fetchWithTimeout(url, ms) {
  const controller = new AbortController();
  const timer = setTimeout(function () { controller.abort(); }, ms);
  return fetch(url, {
    method: "GET",
    cache: "no-store",
    signal: controller.signal,
    headers: { "Accept": "application/json" }
  }).finally(function () { clearTimeout(timer); });
}

async function fetchIpInfo() {
  let response;
  try {
    response = await fetchWithTimeout(API_URL, TIMEOUT_MS);
  } catch (err) {
    if (err && err.name === "AbortError") {
      const error = new Error("请求超时");
      error.code = "timeout";
      throw error;
    }
    const error = new Error("网络错误");
    error.code = "network";
    throw error;
  }

  if (!response.ok) {
    const error = new Error("HTTP " + response.status);
    error.code = "http_error";
    throw error;
  }

  let json;
  try {
    json = await response.json();
  } catch (err) {
    const error = new Error("JSON 解析失败");
    error.code = "parse_error";
    throw error;
  }

  return normalizeIpInfo(json);
}

function isCacheFresh(now) {
  return cache.data && (now - cache.fetchedAt) < cacheTtlMs;
}

function cachedResult() {
  return { ok: true, data: cache.data, source: "cache", stale: false, error: null };
}

async function doFetchAndCache() {
  try {
    const data = await fetchIpInfo();
    cache.data = data;
    cache.fetchedAt = Date.now();
    return { ok: true, data: data, source: "network", stale: false, error: null };
  } catch (err) {
    if (cache.data) {
      // 失败时保留旧数据，标记 stale，供 UI 显示轻微「更新失败」状态。
      return { ok: false, data: cache.data, source: "cache", stale: true, error: err.code || "error" };
    }
    return { ok: false, data: null, source: null, stale: false, error: err.code || "error" };
  }
}

function getIpInfo(forceRefresh) {
  const now = Date.now();
  if (!forceRefresh && isCacheFresh(now)) {
    return Promise.resolve(cachedResult());
  }
  // 去重：同一时刻多个标签页请求只发一次网络请求（强制刷新除外）。
  if (!forceRefresh && inflightPromise) {
    return inflightPromise;
  }
  inflightPromise = doFetchAndCache().finally(function () {
    inflightPromise = null;
  });
  return inflightPromise;
}

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message && message.type === "GET_IP_INFO") {
    const force = Boolean(message.forceRefresh);
    getIpInfo(force).then(function (result) {
      sendResponse(result);
    });
    // 返回 true 表示将异步调用 sendResponse
    return true;
  }
  return false;
});
