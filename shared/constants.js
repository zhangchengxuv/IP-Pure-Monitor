"use strict";

// ============================================================================
// shared/constants.js
// 纯常量，不依赖 chrome API 与 DOM，供 content script / popup / options /
// background service worker 共用。
// ============================================================================

// 风险等级视觉映射。
// 注意：这是扩展自身用于 UI 展示的分级，不代表 IPPure 官方风险等级定义。
// IPPure 风险分原则：数值越高表示风险越高。
const RISK_LEVELS = [
  { min: 0, max: 20, key: "low", label: "低风险", color: "#34d399" },
  { min: 21, max: 40, key: "lowMid", label: "较低风险", color: "#2dd4bf" },
  { min: 41, max: 60, key: "mid", label: "中等风险", color: "#fbbf24" },
  { min: 61, max: 80, key: "high", label: "高风险", color: "#fb923c" },
  { min: 81, max: 100, key: "veryHigh", label: "很高风险", color: "#f87171" }
];

// 自动刷新时间选项（单位：毫秒）
const REFRESH_OPTIONS = [
  { value: 30000, label: "30 秒" },
  { value: 60000, label: "60 秒" },
  { value: 120000, label: "2 分钟" },
  { value: 300000, label: "5 分钟" }
];

// 默认设置
const DEFAULT_SETTINGS = {
  showHud: true,          // 是否在网页中显示悬浮条
  refreshInterval: 60000, // 自动刷新间隔，默认 60 秒
  maskIp: false,          // 是否隐藏 IP 后半部分
  hudOpacity: 0.82,       // 悬浮条透明度 0.6 ~ 1.0
  hoverExpand: true,      // 鼠标悬停是否展开详情
  lockHud: false          // 是否锁定 HUD 位置（禁止拖动）
};

// 请求超时（毫秒）
const REQUEST_TIMEOUT_MS = 8000;

// 默认缓存时长（毫秒），实际会跟随设置中的刷新间隔
const DEFAULT_CACHE_TTL_MS = 60000;

// HUD 默认位置（ChatGPT 桌面网页右上角，避开顶部按钮）
const DEFAULT_HUD_POSITION = { side: "right", offsetX: 12, offsetY: 72 };
