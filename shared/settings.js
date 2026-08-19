"use strict";

// ============================================================================
// shared/settings.js
// 设置读写：优先 chrome.storage.sync，不可用时降级到 chrome.storage.local，
// 再降级到内存。所有使用者（content / popup / options / background）共用。
// ============================================================================

let memoryStore = {};

function storageArea() {
  try {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync) {
      return chrome.storage.sync;
    }
  } catch (e) { /* ignore */ }
  try {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      return chrome.storage.local;
    }
  } catch (e) { /* ignore */ }
  return null;
}

// 校验并合并设置，防止脏数据。
function sanitizeSettings(settings) {
  const s = {};
  const keys = Object.keys(DEFAULT_SETTINGS);
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    s[k] = settings && settings[k] !== undefined ? settings[k] : DEFAULT_SETTINGS[k];
  }

  if (typeof s.showHud !== "boolean") s.showHud = DEFAULT_SETTINGS.showHud;
  if (typeof s.maskIp !== "boolean") s.maskIp = DEFAULT_SETTINGS.maskIp;
  if (typeof s.hoverExpand !== "boolean") s.hoverExpand = DEFAULT_SETTINGS.hoverExpand;

  let validInterval = false;
  for (let i = 0; i < REFRESH_OPTIONS.length; i++) {
    if (s.refreshInterval === REFRESH_OPTIONS[i].value) validInterval = true;
  }
  if (!validInterval) s.refreshInterval = DEFAULT_SETTINGS.refreshInterval;

  const opacity = Number(s.hudOpacity);
  if (!isFinite(opacity) || opacity < 0.6 || opacity > 1) {
    s.hudOpacity = DEFAULT_SETTINGS.hudOpacity;
  } else {
    s.hudOpacity = opacity;
  }
  return s;
}

function loadSettings() {
  const area = storageArea();
  if (!area) {
    return Promise.resolve(sanitizeSettings(memoryStore));
  }
  return new Promise(function (resolve) {
    try {
      area.get(DEFAULT_SETTINGS, function (result) {
        if (chrome.runtime && chrome.runtime.lastError) {
          resolve(sanitizeSettings(memoryStore));
          return;
        }
        resolve(sanitizeSettings(result || {}));
      });
    } catch (e) {
      resolve(sanitizeSettings(memoryStore));
    }
  });
}

function saveSettings(partial) {
  memoryStore = sanitizeSettings(Object.assign({}, memoryStore, partial));
  const area = storageArea();
  if (!area) return Promise.resolve(memoryStore);

  return new Promise(function (resolve) {
    try {
      area.set(partial, function () {
        if (chrome.runtime && chrome.runtime.lastError) {
          // sync 失败降级 local
          saveToLocal(partial).then(function () { resolve(memoryStore); });
        } else {
          resolve(memoryStore);
        }
      });
    } catch (e) {
      saveToLocal(partial).then(function () { resolve(memoryStore); });
    }
  });
}

function saveToLocal(partial) {
  return new Promise(function (resolve) {
    try {
      if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.set(partial, function () { resolve(); });
      } else {
        resolve();
      }
    } catch (e) {
      resolve();
    }
  });
}

// 监听设置变化：任何相关键变化时，重新加载完整设置并回调。
function watchSettings(callback) {
  try {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener(function (changes, areaName) {
        if (areaName !== "sync" && areaName !== "local") return;
        const keys = Object.keys(DEFAULT_SETTINGS);
        let relevant = false;
        for (let i = 0; i < keys.length; i++) {
          if (changes[keys[i]]) { relevant = true; break; }
        }
        if (relevant) {
          loadSettings().then(function (settings) {
            if (typeof callback === "function") callback(settings);
          });
        }
      });
    }
  } catch (e) { /* ignore */ }
}
