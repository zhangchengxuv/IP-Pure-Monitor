"use strict";

// ============================================================================
// content/ui.js — HUD UI 控制器
// 负责 Shadow DOM 构建、渲染与交互。
// 动态文本一律通过 textContent 赋值，绝不把 API 返回内容写入 innerHTML；
// innerHTML 仅用于扩展自身的静态模板结构。
// ============================================================================

const SVG_REFRESH = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><polyline points="21 3 21 9 15 9"/></svg>';

function createHudController(options) {
  const opts = options || {};
  const onForceRefresh = typeof opts.onForceRefresh === "function" ? opts.onForceRefresh : function () {};

  let host = null;
  let shadow = null;
  let hudEl = null;
  let nodes = {};
  let settings = Object.assign({}, DEFAULT_SETTINGS);
  let state = {
    data: null,
    loading: false,
    stale: false,
    error: null,
    expanded: false,
    pinned: false,
    refreshing: false,
    copyTimer: null,
    flashTimer: null,
    noticeTimer: null,
    hoverEnterTimer: null,
    hoverLeaveTimer: null
  };
  let docMouseDown = null;
  let docKeyDown = null;

  function buildDom() {
    host = document.createElement("div");
    host.id = HOST_ID;
    host.setAttribute("data-ippure-monitor", "");
    const pos = {
      position: "fixed",
      top: "12px",
      right: "12px",
      zIndex: "2147483647",
      pointerEvents: "none"
    };
    for (const k in pos) {
      if (Object.prototype.hasOwnProperty.call(pos, k)) {
        host.style.setProperty(k, pos[k], "important");
      }
    }

    shadow = host.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = HUD_CSS;
    shadow.appendChild(style);

    const root = document.createElement("div");
    root.className = "hud";
    root.setAttribute("role", "region");
    root.setAttribute("aria-label", "IP Pure Monitor");

    root.innerHTML =
      '<div class="mini">' +
        '<span class="flag" aria-hidden="true"></span>' +
        '<button class="ip-btn" type="button" title="点击复制 IP" aria-label="复制 IP"></button>' +
        '<span class="risk"></span>' +
        '<button class="refresh-btn" type="button" aria-label="刷新 IP 信息" title="刷新 IP 信息">' + SVG_REFRESH + '<span class="warn-dot" aria-hidden="true"></span></button>' +
      '</div>' +
      '<div class="detail" hidden>' +
        '<div class="detail-head">' +
          '<span class="flag" aria-hidden="true"></span>' +
          '<span class="country"></span>' +
          '<span class="risk-badge"></span>' +
        '</div>' +
        '<div class="detail-ip" title="点击复制 IP"></div>' +
        '<div class="row"><span class="label">IPPure 风险分</span><span class="value risk-value"></span></div>' +
        '<div class="meter"><div class="meter-fill"></div></div>' +
        '<div class="row"><span class="label">住宅 IP</span><span class="value res-value"></span></div>' +
        '<div class="row"><span class="label">IP 类型</span><span class="value type-value"></span></div>' +
        '<div class="row"><span class="label">ASN</span><span class="value asn-value"></span></div>' +
        '<div class="row"><span class="label">组织</span><span class="value org-value"></span></div>' +
        '<div class="row"><span class="label">位置</span><span class="value loc-value"></span></div>' +
        '<div class="row"><span class="label">时区</span><span class="value tz-value"></span></div>' +
        '<div class="detail-foot">' +
          '<span class="updated"></span>' +
          '<span class="ip-changed" hidden>IP 已更新</span>' +
          '<button class="refresh-btn" type="button" aria-label="刷新 IP 信息" title="刷新 IP 信息">' + SVG_REFRESH + '<span class="warn-dot" aria-hidden="true"></span></button>' +
        '</div>' +
      '</div>';

    shadow.appendChild(root);
    hudEl = root;

    const riskDot = document.createElement("span");
    riskDot.className = "risk-dot";
    riskDot.setAttribute("aria-hidden", "true");
    const riskNum = document.createElement("span");
    riskNum.className = "risk-num";
    const riskEl = root.querySelector(".mini .risk");
    riskEl.appendChild(riskDot);
    riskEl.appendChild(riskNum);

    nodes = {
      flag: root.querySelector(".mini .flag"),
      ipBtn: root.querySelector(".ip-btn"),
      risk: riskEl,
      riskDot: riskDot,
      riskNum: riskNum,
      refreshBtn: root.querySelector(".mini .refresh-btn"),
      detail: root.querySelector(".detail"),
      dFlag: root.querySelector(".detail-head .flag"),
      dCountry: root.querySelector(".country"),
      dRiskBadge: root.querySelector(".risk-badge"),
      dIp: root.querySelector(".detail-ip"),
      dScore: root.querySelector(".risk-value"),
      dMeter: root.querySelector(".meter-fill"),
      dResidential: root.querySelector(".res-value"),
      dType: root.querySelector(".type-value"),
      dAsn: root.querySelector(".asn-value"),
      dOrg: root.querySelector(".org-value"),
      dLoc: root.querySelector(".loc-value"),
      dTz: root.querySelector(".tz-value"),
      dUpdated: root.querySelector(".updated"),
      dIpChanged: root.querySelector(".ip-changed"),
      dRefresh: root.querySelector(".detail-foot .refresh-btn")
    };

    bindEvents();
  }

  function setLoading() {
    state.loading = true;
    state.data = null;
    nodes.flag.textContent = "🌐";
    nodes.ipBtn.textContent = "正在检测 IP…";
    nodes.ipBtn.disabled = true;
    setRiskLoading();
    nodes.detail.hidden = true;
    state.expanded = false;
    state.pinned = false;
    updateWarn(false);
  }

  function setRiskLoading() {
    nodes.riskDot.style.background = "#94a3b8";
    nodes.riskDot.style.boxShadow = "0 0 6px rgba(148, 163, 184, 0.5)";
    nodes.riskNum.textContent = "…";
    nodes.risk.title = "";
    nodes.risk.removeAttribute("aria-label");
  }

  function setRisk(score) {
    const level = riskLevelForScore(score);
    if (score === null || score === undefined) {
      nodes.riskDot.style.background = "#94a3b8";
      nodes.riskDot.style.boxShadow = "0 0 6px rgba(148, 163, 184, 0.5)";
      nodes.riskNum.textContent = "—";
      nodes.risk.title = "暂无风险评分";
      nodes.risk.setAttribute("aria-label", "暂无风险评分");
      hudEl.style.setProperty("--risk-color", "#94a3b8");
      hudEl.style.setProperty("--risk-bg", "rgba(148, 163, 184, 0.16)");
      hudEl.style.setProperty("--risk-border", "rgba(148, 163, 184, 0.5)");
      hudEl.style.setProperty("--risk-glow", "rgba(148, 163, 184, 0.5)");
      return;
    }
    const color = level ? level.color : "#94a3b8";
    nodes.riskDot.style.background = color;
    nodes.riskDot.style.boxShadow = "0 0 6px " + hexToRgba(color, 0.55);
    nodes.riskNum.textContent = String(score);
    nodes.risk.title = "IPPure 风险分：" + score + " / 100\n数值越低通常代表风险越低";
    nodes.risk.setAttribute("aria-label", "IPPure 风险分 " + score);
    hudEl.style.setProperty("--risk-color", color);
    hudEl.style.setProperty("--risk-bg", hexToRgba(color, 0.16));
    hudEl.style.setProperty("--risk-border", hexToRgba(color, 0.5));
    hudEl.style.setProperty("--risk-glow", hexToRgba(color, 0.55));
  }

  function renderMiniFrom(data) {
    nodes.flag.textContent = flagEmoji(data.countryCode);
    nodes.ipBtn.textContent = data.ip ? miniIp(data.ip, settings.maskIp) : "无 IP";
    nodes.ipBtn.title = data.ip || "";
    nodes.ipBtn.setAttribute("aria-label", data.ip ? ("复制 IP " + data.ip) : "无 IP");
    setRisk(data.fraudScore);
  }

  function renderDetailFrom(data) {
    if (!data) {
      nodes.dFlag.textContent = "🌐";
      nodes.dCountry.textContent = "";
      nodes.dRiskBadge.textContent = "";
      nodes.dIp.textContent = "无数据";
      nodes.dScore.textContent = "暂无评分";
      nodes.dMeter.style.width = "0%";
      nodes.dResidential.textContent = "—";
      nodes.dType.textContent = "—";
      nodes.dAsn.textContent = "—";
      nodes.dOrg.textContent = "—";
      nodes.dLoc.textContent = "—";
      nodes.dTz.textContent = "—";
      nodes.dUpdated.textContent = "更新失败";
      return;
    }

    nodes.dFlag.textContent = flagEmoji(data.countryCode);
    nodes.dCountry.textContent = data.country || (data.countryCode ? data.countryCode : "未知地区");

    const level = riskLevelForScore(data.fraudScore);
    if (data.fraudScore === null || data.fraudScore === undefined) {
      nodes.dRiskBadge.textContent = "暂无评分";
    } else {
      nodes.dRiskBadge.textContent = level ? level.label : "未知";
    }

    nodes.dIp.textContent = data.ip || "无 IP";
    nodes.dIp.title = data.ip || "";

    if (data.fraudScore === null || data.fraudScore === undefined) {
      nodes.dScore.textContent = "暂无评分";
      nodes.dMeter.style.width = "0%";
    } else {
      nodes.dScore.textContent = String(data.fraudScore);
      nodes.dMeter.style.width = Math.max(0, Math.min(100, data.fraudScore)) + "%";
    }

    nodes.dResidential.textContent = describeResidential(data.isResidential);
    nodes.dType.textContent = describeIpType(data);
    nodes.dAsn.textContent = formatAsn(data.asn) || "—";
    nodes.dOrg.textContent = data.organization || "—";
    nodes.dLoc.textContent = joinNonEmpty([data.city, data.region, data.country], " · ");
    nodes.dTz.textContent = data.timezone || "—";
    nodes.dUpdated.textContent = (data.updatedAt ? formatTime(data.updatedAt) : "") + " 更新";
  }

  function update(data, meta) {
    const m = meta || {};
    state.data = data;
    state.stale = Boolean(m.stale);
    state.error = m.error || null;
    state.loading = false;

    if (!data) {
      nodes.flag.textContent = "🌐";
      nodes.ipBtn.textContent = "IP 检测失败";
      nodes.ipBtn.disabled = true;
      setRiskLoading();
      renderDetailFrom(null);
      updateWarn(true);
      return;
    }

    nodes.ipBtn.disabled = false;
    renderMiniFrom(data);
    renderDetailFrom(data);
    updateWarn(Boolean(state.stale || state.error));
  }

  function updateWarn(hasWarn) {
    const flag = Boolean(hasWarn);
    nodes.refreshBtn.classList.toggle("has-warn", flag);
    nodes.dRefresh.classList.toggle("has-warn", flag);
  }

  function setRefreshing(bool) {
    state.refreshing = Boolean(bool);
    nodes.refreshBtn.classList.toggle("spinning", state.refreshing);
    nodes.dRefresh.classList.toggle("spinning", state.refreshing);
  }

  function flashIpChange() {
    hudEl.classList.add("ip-flash");
    nodes.dIpChanged.hidden = false;
    clearTimeout(state.flashTimer);
    clearTimeout(state.noticeTimer);
    state.flashTimer = setTimeout(function () {
      hudEl.classList.remove("ip-flash");
    }, IP_CHANGE_FLASH_MS);
    state.noticeTimer = setTimeout(function () {
      nodes.dIpChanged.hidden = true;
    }, IP_CHANGE_NOTICE_MS);
  }

  function expand() {
    if (state.expanded) return;
    state.expanded = true;
    nodes.detail.hidden = false;
  }

  function collapse() {
    if (state.pinned) return;
    if (!state.expanded) return;
    state.expanded = false;
    nodes.detail.hidden = true;
  }

  function restoreIpText() {
    if (!state.data || !state.data.ip) return;
    nodes.ipBtn.textContent = miniIp(state.data.ip, settings.maskIp);
    nodes.dIp.textContent = state.data.ip;
  }

  function handleCopy(el) {
    if (!state.data || !state.data.ip) return;
    copyText(state.data.ip).then(function (ok) {
      if (!ok) return;
      el.textContent = "已复制";
      clearTimeout(state.copyTimer);
      state.copyTimer = setTimeout(restoreIpText, COPY_FEEDBACK_MS);
    });
  }

  function bindEvents() {
    hudEl.addEventListener("mouseenter", function () {
      if (!settings.hoverExpand) return;
      clearTimeout(state.hoverLeaveTimer);
      clearTimeout(state.hoverEnterTimer);
      state.hoverEnterTimer = setTimeout(function () {
        if (settings.hoverExpand && !state.pinned) expand();
      }, HOVER_EXPAND_DELAY_MS);
    });

    hudEl.addEventListener("mouseleave", function () {
      clearTimeout(state.hoverEnterTimer);
      clearTimeout(state.hoverLeaveTimer);
      state.hoverLeaveTimer = setTimeout(function () {
        collapse();
      }, HOVER_COLLAPSE_DELAY_MS);
    });

    hudEl.querySelector(".mini").addEventListener("click", function () {
      state.pinned = !state.pinned;
      if (state.pinned) {
        expand();
      } else {
        collapse();
      }
    });

    nodes.ipBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      handleCopy(nodes.ipBtn);
    });
    nodes.dIp.addEventListener("click", function (e) {
      e.stopPropagation();
      handleCopy(nodes.dIp);
    });

    function refreshHandler(e) {
      e.stopPropagation();
      onForceRefresh();
    }
    nodes.refreshBtn.addEventListener("click", refreshHandler);
    nodes.dRefresh.addEventListener("click", refreshHandler);

    docMouseDown = function (e) {
      if (host && !host.contains(e.target) && state.pinned) {
        state.pinned = false;
        collapse();
      }
    };
    docKeyDown = function (e) {
      if (e.key === "Escape" && state.pinned) {
        state.pinned = false;
        collapse();
      }
    };
    document.addEventListener("mousedown", docMouseDown, true);
    document.addEventListener("keydown", docKeyDown, true);
  }

  function clearTimers() {
    clearTimeout(state.copyTimer);
    clearTimeout(state.flashTimer);
    clearTimeout(state.noticeTimer);
    clearTimeout(state.hoverEnterTimer);
    clearTimeout(state.hoverLeaveTimer);
  }

  function mount() {
    if (host) return;
    buildDom();
    (document.body || document.documentElement).appendChild(host);
    applySettings(settings);
    setLoading();
  }

  function applySettings(next) {
    settings = sanitizeSettings(next);
    if (hudEl) {
      hudEl.style.opacity = String(settings.hudOpacity);
    }
    if (!settings.hoverExpand && !state.pinned && state.expanded) {
      collapse();
    }
  }

  function destroy() {
    clearTimers();
    if (docMouseDown) document.removeEventListener("mousedown", docMouseDown, true);
    if (docKeyDown) document.removeEventListener("keydown", docKeyDown, true);
    if (host && host.parentNode) host.parentNode.removeChild(host);
    host = null;
    shadow = null;
    hudEl = null;
    nodes = {};
    state.pinned = false;
    state.expanded = false;
  }

  return {
    mount: mount,
    destroy: destroy,
    update: update,
    setLoading: setLoading,
    setRefreshing: setRefreshing,
    setSettings: applySettings,
    flashIpChange: flashIpChange
  };
}


