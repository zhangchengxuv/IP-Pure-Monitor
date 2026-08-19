"use strict";

// ============================================================================
// content/styles.js — HUD 样式（字符串注入 Shadow DOM）
// 支持：深浅色自适应、拖动手柄、边缘吸附动画、ChatGPT 延迟显示。
// ============================================================================

const HUD_CSS = `
:host {
  all: initial;
  position: fixed !important;
  top: 72px !important;
  right: 12px !important;
  left: auto !important;
  z-index: 2147483647 !important;
  pointer-events: none !important;
  font-family: Inter, "Segoe UI", system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif !important;
  font-size: 12px !important;
  line-height: 1.4 !important;
  box-sizing: border-box !important;
  direction: ltr !important;
  text-align: left !important;
  transition: left 160ms ease, right 160ms ease, top 160ms ease;
}

:host(.dragging) {
  transition: none !important;
}

*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.hud {
  --hud-bg: rgba(30, 32, 37, 0.86);
  --hud-bg-solid: #1e2025;
  --hud-fg: #ececf1;
  --hud-fg-strong: #ffffff;
  --hud-muted: #9d9d9d;
  --hud-border: rgba(255, 255, 255, 0.10);
  --hud-hover: rgba(255, 255, 255, 0.08);
  --hud-meter-bg: rgba(255, 255, 255, 0.12);

  pointer-events: auto;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  min-width: 200px;
  max-width: 320px;
  color: var(--hud-fg);
  background: var(--hud-bg);
  -webkit-backdrop-filter: blur(16px) saturate(140%);
  backdrop-filter: blur(16px) saturate(140%);
  border: 1px solid var(--hud-border);
  border-radius: 13px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.16), 0 1px 3px rgba(0, 0, 0, 0.18);
  overflow: visible;
  user-select: none;
  -webkit-user-select: none;
}

.hud.light {
  --hud-bg: rgba(255, 255, 255, 0.88);
  --hud-bg-solid: #ffffff;
  --hud-fg: #2d2d2d;
  --hud-fg-strong: #111111;
  --hud-muted: #6e6e6e;
  --hud-border: rgba(0, 0, 0, 0.08);
  --hud-hover: rgba(0, 0, 0, 0.05);
  --hud-meter-bg: rgba(0, 0, 0, 0.08);
}

.mini {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 38px;
  padding: 0 10px;
  white-space: nowrap;
  cursor: grab;
}

.hud.dragging .mini {
  cursor: grabbing;
}

.drag-handle {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  opacity: 0.35;
  color: var(--hud-fg);
  transition: opacity 150ms ease;
}

.drag-handle:hover {
  opacity: 0.7;
}

.drag-handle svg {
  display: block;
}

.hud.locked .mini {
  cursor: default;
}

.hud.locked .drag-handle {
  cursor: default;
  opacity: 0.25;
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
  color: var(--hud-fg-strong);
  font: inherit;
  font-size: 12.5px;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.2px;
  cursor: pointer;
  flex: 0 1 auto;
  max-width: 104px;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: left;
  line-height: 1.2;
}

.ip-btn:hover {
  text-decoration: underline;
  text-underline-offset: 2px;
}

.ip-btn:disabled {
  cursor: default;
  text-decoration: none;
  color: var(--hud-muted);
}

.risk {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: default;
  flex: 0 0 auto;
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
  color: var(--hud-muted);
}

.latency {
  flex: 0 0 auto;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: var(--hud-muted);
  white-space: nowrap;
}

.refresh-btn {
  appearance: none;
  -webkit-appearance: none;
  background: none;
  border: none;
  padding: 3px;
  margin: 0;
  color: var(--hud-muted);
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
  color: var(--hud-fg-strong);
  background: var(--hud-hover);
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
  border-top: 1px solid var(--hud-border);
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
  color: var(--hud-fg-strong);
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
  color: var(--hud-fg-strong);
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
  color: var(--hud-muted);
  font-size: 11.5px;
  flex: 0 0 auto;
}

.row .value {
  color: var(--hud-fg);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  text-align: right;
  word-break: break-word;
}

.meter {
  height: 4px;
  border-radius: 999px;
  background: var(--hud-meter-bg);
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
  border-top: 1px solid var(--hud-border);
}

.updated {
  color: var(--hud-muted);
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

.toast {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  padding: 3px 10px;
  font-size: 11px;
  color: var(--hud-fg);
  background: var(--hud-bg-solid);
  border: 1px solid var(--hud-border);
  border-radius: 999px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 160ms ease;
  white-space: nowrap;
  z-index: 5;
}

.toast.show {
  opacity: 1;
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
  :host { transition: none; }
  .detail { animation: none; }
  .refresh-btn.spinning svg { animation: none; }
  .meter-fill { transition: none; }
  .ip-changed { animation: none; }
  .risk-dot { transition: none; }
  .toast { transition: none; }
}
`;

