"use strict";

// ============================================================================
// popup.js — 工具栏 Popup
// 展示比悬浮组件稍完整的信息；数据来自 Background（已 normalize）。
// ============================================================================

(function () {
  const flagEl = document.getElementById("flag");
  const countryEl = document.getElementById("country");
  const ipEl = document.getElementById("ip");
  const scoreEl = document.getElementById("score");
  const levelEl = document.getElementById("level");
  const residentialEl = document.getElementById("residential");
  const typeEl = document.getElementById("type");
  const asnEl = document.getElementById("asn");
  const orgEl = document.getElementById("org");
  const statusEl = document.getElementById("status");
  const copyBtn = document.getElementById("copy");
  const refreshBtn = document.getElementById("refresh");
  const settingsBtn = document.getElementById("settings");

  function setStatus(text, isError) {
    statusEl.textContent = text || "";
    statusEl.classList.toggle("error", Boolean(isError));
  }

  function setScore(score) {
    const level = riskLevelForScore(score);
    if (score === null || score === undefined) {
      scoreEl.textContent = "—";
      levelEl.hidden = true;
      levelEl.textContent = "";
      levelEl.style.color = "";
      levelEl.style.background = "";
      levelEl.style.borderColor = "";
      return;
    }
    scoreEl.textContent = String(score);
    const color = level ? level.color : "#94a3b8";
    levelEl.hidden = false;
    levelEl.textContent = level ? level.label : "未知";
    levelEl.style.color = color;
    levelEl.style.background = hexToRgba(color, 0.14);
    levelEl.style.borderColor = hexToRgba(color, 0.4);
  }

  function render(data, meta) {
    if (!data) {
      flagEl.textContent = "🌐";
      countryEl.textContent = "IP 检测失败";
      ipEl.textContent = "—";
      setScore(null);
      residentialEl.textContent = "—";
      typeEl.textContent = "—";
      asnEl.textContent = "—";
      orgEl.textContent = "—";
      setStatus("无法获取 IP 信息", true);
      return;
    }

    flagEl.textContent = flagEmoji(data.countryCode);
    countryEl.textContent = data.country || (data.countryCode ? data.countryCode : "未知地区");
    ipEl.textContent = data.ip || "—";
    ipEl.title = data.ip || "";
    setScore(data.fraudScore);
    residentialEl.textContent = describeResidential(data.isResidential);
    typeEl.textContent = describeIpType(data);
    asnEl.textContent = formatAsn(data.asn) || "—";
    orgEl.textContent = data.organization || "—";

    if (meta && meta.stale) {
      setStatus("更新失败，显示上次数据", true);
    } else if (meta && meta.source === "network") {
      setStatus("已是最新数据");
    } else if (meta && meta.source === "cache") {
      setStatus("来自缓存");
    } else {
      setStatus("");
    }
  }

  function request(forceRefresh) {
    setStatus("检测中…");
    return new Promise(function (resolve) {
      try {
        chrome.runtime.sendMessage(
          { type: "GET_IP_INFO", forceRefresh: Boolean(forceRefresh) },
          function (response) {
            if (chrome.runtime.lastError) {
              render(null, {});
              resolve();
              return;
            }
            render(response && response.data ? response.data : null, response || {});
            resolve();
          }
        );
      } catch (e) {
        render(null, {});
        resolve();
      }
    });
  }

  copyBtn.addEventListener("click", function () {
    const ip = ipEl.textContent;
    if (!ip || ip === "—" || ip === "已复制") return;
    copyText(ip).then(function (ok) {
      if (ok) {
        const original = ip;
        copyBtn.textContent = "已复制";
        setTimeout(function () {
          copyBtn.textContent = "复制";
        }, 1000);
      }
    });
  });

  ipEl.addEventListener("click", function () {
    const ip = ipEl.textContent;
    if (!ip || ip === "—") return;
    copyText(ip).then(function (ok) {
      if (ok) {
        const original = ip;
        ipEl.textContent = "已复制";
        setTimeout(function () {
          ipEl.textContent = original;
        }, 1000);
      }
    });
  });

  refreshBtn.addEventListener("click", function () {
    refreshBtn.disabled = true;
    request(true).finally(function () {
      refreshBtn.disabled = false;
    });
  });

  settingsBtn.addEventListener("click", function () {
    chrome.runtime.openOptionsPage();
  });

  request(false);
})();
