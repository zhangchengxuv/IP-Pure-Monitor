"use strict";

// ============================================================================
// shared/normalize.js
// 将 IPPure API 返回的原始数据规范化为内部统一结构。
// 所有字段都按「可选字段」处理：缺失、null、undefined、错误数据类型、
// 未来新增字段都不会导致 UI 崩溃。
// ============================================================================

function asString(value) {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && isFinite(value)) return String(value);
  return "";
}

function asNumberOrNull(value) {
  if (value === undefined || value === null) return null;
  if (value === "") return null;
  const n = typeof value === "string" ? Number(value) : value;
  if (typeof n !== "number" || !isFinite(n)) return null;
  return n;
}

function asBooleanOrNull(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (v === "true" || v === "1" || v === "yes") return true;
    if (v === "false" || v === "0" || v === "no") return false;
  }
  return null;
}

// 规范化入口：任何地方拿到原始响应后都先经过这里，UI 不直接依赖原始 Response。
function normalizeIpInfo(raw) {
  if (!raw || typeof raw !== "object") {
    raw = {};
  }

  const fraudScore = asNumberOrNull(raw.fraudScore);

  return {
    ip: asString(raw.ip),
    asn: asNumberOrNull(raw.asn),
    organization: asString(raw.asOrganization !== undefined ? raw.asOrganization : raw.organization),
    country: asString(raw.country),
    countryCode: asString(raw.countryCode).toUpperCase(),
    region: asString(raw.region),
    regionCode: asString(raw.regionCode).toUpperCase(),
    city: asString(raw.city),
    timezone: asString(raw.timezone),
    longitude: asString(raw.longitude),
    latitude: asString(raw.latitude),
    postalCode: asString(raw.postalCode),
    fraudScore: fraudScore,
    isResidential: asBooleanOrNull(raw.isResidential),
    isBroadcast: asBooleanOrNull(raw.isBroadcast),
    // 未来若 API 提供明确机房字段则优先使用；同时兼容大小写。
    isDatacenter: asBooleanOrNull(raw.isDatacenter !== undefined ? raw.isDatacenter : raw.isDataCenter),
    userAgent: asString(raw.userAgent),
    updatedAt: Date.now()
  };
}
