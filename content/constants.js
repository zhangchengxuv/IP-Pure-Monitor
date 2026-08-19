"use strict";

// ============================================================================
// content/constants.js
// content script 专用常量。
// ============================================================================

const HOST_ID = "ip-pure-monitor-host";

const HOVER_EXPAND_DELAY_MS = 250;   // hover 展开延迟
const HOVER_COLLAPSE_DELAY_MS = 650; // 鼠标离开后收起延迟
const COPY_FEEDBACK_MS = 1000;       // 复制成功「已复制」反馈时长
const IP_CHANGE_FLASH_MS = 1000;     // IP 变化边框亮起时长
const IP_CHANGE_NOTICE_MS = 3000;    // 「IP 已更新」提示时长

// 拖动 / 吸边
const EDGE_MARGIN = 12;              // 吸附到边缘后的边距
const MIN_VISIBLE_MARGIN = 8;        // 任何情况下保持的最小可见边距
const SNAP_ANIMATION_MS = 160;       // 吸边动画时长（毫秒）
const DRAG_THRESHOLD_PX = 4;         // 超过该位移才视为拖动（避免误触）
const POSITION_RESET_FEEDBACK_MS = 1000; // 「位置已重置」提示时长
