"use strict";

// ============================================================================
// content/styles.js
// HUD 的全部样式，作为字符串注入 Shadow DOM，避免污染网页、也避免被网页污染。
// 视觉方向：现代、克制、半透明 Glassmorphism，偏深色 HUD（在深浅色网页上都稳定）。
// ============================================================================

const HUD_CSS = `
:host {
  all: initial;
  position: fixed !important;
  top: 12px !important;
  right: 12px !important;
  z-index: 2147483647 !important;
  pointer-events: none !important;
  font-family: Inter, "Segoe UI", system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif !important;
  font-size: 12px !important;
  line-height: 1.4 !important;
  box-sizing: border-box !important;
  direction: ltr !important;
  text-align: left !important;
}

*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.hud {
  pointer-events: auto;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  min-width: 190px;
  max-width: 320px;
  color: #e8ecf3;
  background: rgba(19, 23, 33, 0.84);
  -webkit-backdrop-filter: blur(16px) saturate(140%);
  backdrop-filter: blur(16px) saturate(140%);
  border: 1px solid rgba(255, 255, 255, 0.10);
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18), 0 1px 3px rgba(0, 0, 0, 0.20);
  overflow: hidden;
  user-select: none;
  -webkit-user-select: none;
  transition: box-shadow 200ms ease, border-color 200ms ease;
}

.mini {
  display: flex;
  align-items: center;
  gap: 7px;
  height: 38px;
  padding: 0 10px;
  white-space: nowrap;
  cursor: default;
}

.flag {
  font-size: 15px;
  line-height: 1;
  flex: 0 0 auto;
}

.ip-btn {
  appearance: none;
  -webkit-appearance: none;
  background: none;
  border: none;
  padding: 0;
  margin: 0;
  color: #f2f5f9;
  font: inherit;
  font-size: 12.5px;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.2px;
  cursor: pointer;
  flex: 0 1 auto;
  max-width: 126px;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: left;
  line-height: 1.2;
}

.ip-btn:hover {
  color: #ffffff;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.ip-btn:disabled {
  cursor: default;
  text-decoration: none;
  color: #c3cad6;
}

.risk {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: default;
  flex: 0 0 auto;
  margin-left: auto;
}

.risk-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--risk-color, #94a3b8);
  box-shadow: 0 0 6px var(--risk-glow, rgba(148, 163, 184, 0.5));
  transition: background 200ms ease, box-shadow 200ms ease;
}

.risk-num {
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: #cbd5e1;
}

.refresh-btn {
  appearance: none;
  -webkit-appearance: none;
  background: none;
  border: none;
  padding: 3px;
  margin: 0;
  color: #a8b3c4;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  position: relative;
  flex: 0 0 auto;
  transition: color 150ms ease, background 150ms ease;
}

.refresh-btn:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.10);
}

.refresh-btn svg {
  display: block;
}

.refresh-btn.spinning svg {
  animation: hud-spin 0.9s linear infinite;
}

.warn-dot {
  position: absolute;
  top: 1px;
  right: 1px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #fbbf24;
  box-shadow: 0 0 4px rgba(251, 191, 36, 0.85);
  display: none;
}

.refresh-btn.has-warn .warn-dot {
  display: block;
}

.detail {
  display: block;
  padding: 0 12px 11px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  animation: hud-fade-in 180ms ease;
}

.detail[hidden] {
  display: none;
}

.detail-head {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 9px 0 4px;
}

.detail-head .flag {
  font-size: 16px;
}

.country {
  font-size: 13px;
  font-weight: 600;
  color: #f2f5f9;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.risk-badge {
  margin-left: auto;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid var(--risk-border, rgba(148, 163, 184, 0.5));
  color: var(--risk-color, #cbd5e1);
  background: var(--risk-bg, rgba(148, 163, 184, 0.16));
  white-space: nowrap;
}

.detail-ip {
  font-size: 15px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.3px;
  color: #ffffff;
  padding: 3px 0 9px;
  word-break: break-all;
  cursor: pointer;
}

.detail-ip:hover {
  text-decoration: underline;
  text-underline-offset: 2px;
}

.row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 3px 0;
}

.row .label {
  color: #8b96a8;
  font-size: 11.5px;
  flex: 0 0 auto;
}

.row .value {
  color: #e8ecf3;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  text-align: right;
  word-break: break-word;
}

.meter {
  height: 4px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.10);
  overflow: hidden;
  margin: 3px 0 7px;
}

.meter-fill {
  height: 100%;
  width: 0%;
  border-radius: 999px;
  background: var(--risk-color, #94a3b8);
  transition: width 220ms ease;
}

.detail-foot {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 9px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.updated {
  color: #8b96a8;
  font-size: 11px;
}

.ip-changed {
  color: #60a5fa;
  font-size: 11px;
  animation: hud-fade-in 200ms ease;
}

.detail-foot .refresh-btn {
  margin-left: auto;
}

.hud.ip-flash {
  border-color: rgba(96, 165, 250, 0.85);
  box-shadow: 0 0 0 1px rgba(96, 165, 250, 0.35), 0 0 16px rgba(96, 165, 250, 0.28);
}

@keyframes hud-spin {
  to { transform: rotate(360deg); }
}

@keyframes hud-fade-in {
  from { opacity: 0; transform: translateY(-3px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (prefers-reduced-motion: reduce) {
  .hud { transition: none; }
  .detail { animation: none; }
  .refresh-btn.spinning svg { animation: none; }
  .meter-fill { transition: none; }
  .ip-changed { animation: none; }
  .risk-dot { transition: none; }
}
`;

