"use strict";

// ============================================================================
// shared/utils.js
// 纯工具函数，不依赖 chrome API 与 DOM（copyText 除外，其内部已做降级）。
// ============================================================================

// 根据 countryCode 转换为 Unicode Emoji 旗帜，缺失或非法时返回 🌐。
function flagEmoji(countryCode) {
  if (!countryCode || typeof countryCode !== "string") return "🌐";
  const code = countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return "🌐";
  const base = 0x1F1E6; // 区域指示符起始（对应字母 A）
  const first = code.charCodeAt(0) - 65;
  const second = code.charCodeAt(1) - 65;
  if (first < 0 || first > 25 || second < 0 || second > 25) return "🌐";
  return String.fromCodePoint(base + first, base + second);
}

// 格式化 ASN：13335 或 "13335" 或 "AS13335" → "AS13335"；缺失返回空串。
function formatAsn(asn) {
  if (asn === null || asn === undefined || asn === "") return "";
  const str = String(asn).replace(/^as/i, "").trim();
  return str ? "AS" + str : "";
}

// 根据 fraudScore 获取本地视觉风险等级。
// 注意：这是扩展自身的 UI 分级，不代表 IPPure 官方风险等级定义。
function riskLevelForScore(score) {
  if (score === null || score === undefined) return null;
  if (typeof score !== "number" || !isFinite(score)) return null;
  for (let i = 0; i < RISK_LEVELS.length; i++) {
    const level = RISK_LEVELS[i];
    if (score >= level.min && score <= level.max) return level;
  }
  return null;
}

// 掩码 IP 后半部分：IPv4 → 104.28.*.*；IPv6 使用缩略策略。
function maskIp(ip) {
  if (!ip) return "";
  if (ip.indexOf(".") !== -1) {
    const parts = ip.split(".");
    if (parts.length !== 4) return ip;
    return parts[0] + "." + parts[1] + ".*.*";
  }
  if (ip.indexOf(":") !== -1) {
    const groups = ip.split(":").filter(function (g) { return g !== ""; });
    const first = groups[0] || "";
    const second = groups[1] || "";
    return first + ":" + second + "::…";
  }
  return ip;
}

// 紧凑显示 IP（迷你条用）：IPv6 过长时省略中间部分。
function compactIp(ip, mask) {
  if (!ip) return "";
  const shown = mask ? maskIp(ip) : ip;
  if (shown.length <= 24) return shown;
  return shown.slice(0, 17) + "…";
}

// 迷你条用的 IP 展示：先处理掩码，再处理过长 IPv6。
function miniIp(ip, mask) {
  if (!ip) return "";
  if (mask) return maskIp(ip);
  if (ip.length > 24) return compactIp(ip, false);
  return ip;
}

// 十六进制颜色转 rgba（用于风险色浅色背景 / 边框 / 光晕）。
function hexToRgba(hex, alpha) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
  if (!m) return "rgba(148, 163, 184, " + alpha + ")";
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return "rgba(" + r + ", " + g + ", " + b + ", " + alpha + ")";
}

// 复制文本到剪贴板，带降级方案。
function copyText(text) {
  return new Promise(function (resolve) {
    if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () { resolve(true); },
        function () { resolve(fallbackCopy(text)); }
      );
    } else {
      resolve(fallbackCopy(text));
    }
  });
}

function fallbackCopy(text) {
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-1000px";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch (e) {
    return false;
  }
}

// 格式化时间戳为 HH:MM。
function formatTime(timestamp) {
  if (!timestamp) return "";
  const d = new Date(timestamp);
  if (isNaN(d.getTime())) return "";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return hh + ":" + mm;
}

// 确保 UI 文本不出现 undefined / null / NaN / 空串（可给兜底值）。
function safeText(value, fallback) {
  const fb = fallback === undefined ? "" : fallback;
  if (value === undefined || value === null) return fb;
  if (typeof value === "number" && !isFinite(value)) return fb;
  const s = String(value).trim();
  return s || fb;
}

// 拼接非空片段，返回兜底值。
function joinNonEmpty(parts, sep) {
  const filtered = [];
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (p !== undefined && p !== null && String(p).trim() !== "") {
      filtered.push(String(p).trim());
    }
  }
  return filtered.length ? filtered.join(sep) : "—";
}

// isResidential：true=住宅 IP，false=非住宅 IP。不强行断言「机房 IP」。
function describeResidential(value) {
  if (value === true) return "是";
  if (value === false) return "否";
  return "—";
}

// 集中封装 IP 类型字段解释，方便未来 API 变化时修改。
// 若未来提供明确 isDatacenter 字段则优先使用。
function describeIpType(data) {
  if (!data) return "—";
  if (data.isDatacenter === true) return "机房 IP";
  if (data.isBroadcast === true) return "广播 / 非原生 IP";
  if (data.isBroadcast === false) return "原生 IP";
  return "—";
}

