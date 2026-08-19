# IP Pure Monitor

一个轻量、克制的 Chromium 浏览器扩展（Manifest V3）。**仅在 ChatGPT 网页（`chatgpt.com`）**右上角显示一个半透明悬浮 HUD，实时展示当前浏览器网络出口 / 代理 IP、[IPPure](https://my.ippure.com/v1/info) 风险信息，以及**到 ChatGPT 的延迟（毫秒）**。

视觉上像 ChatGPT 自带的网络状态组件，但技术上完全独立（Shadow DOM 隔离），可拖动、可吸边、位置自动保存。

---

## 功能

- **仅服务 ChatGPT**：只在 `https://chatgpt.com/*`（兼容 `https://chat.openai.com/*`）注入，不申请全站页面注入权限。
- **迷你状态条**：默认显示 `⋮⋮ 国旗 · IP · 风险圆点 · 风险分 · GPT 延迟 · 刷新`，细长低调，不遮挡视线。
- **ChatGPT 延迟**：由后台 Service Worker 测量到 `chatgpt.com` 的响应时间（TTFB），迷你条显示 `GPT 168ms`，详情显示 `168 ms`。
- **展开详情**：悬停约 250ms 或点击展开，展示国家、完整 IP、风险分、ChatGPT 延迟、住宅 IP、IP 类型、ASN、组织、位置、时区与更新时间。
- **可拖动 + 自动吸边**：按住 HUD 空白区域或左侧 `⋮⋮` 手柄拖动，松开后自动吸附到最近边缘（边距 12px），Y 方向保持拖动位置。
- **位置持久化**：拖动后的位置保存到 `chrome.storage.local`，刷新页面 / 重启浏览器后恢复。
- **双击复位**：双击左侧手柄恢复默认位置（`top: 72px; right: 12px`），并短暂提示「位置已重置」。
- **锁定位置**：设置中开启后禁止拖动、隐藏拖动手势光标，防止误拖。
- **深浅色自适应**：根据 ChatGPT 页面实际背景亮度 + `prefers-color-scheme` 自动切换深色 / 浅色半透明样式。
- **风险可视化**：`fraudScore` 数值越高风险越高；扩展内部做本地视觉分级（软绿 → 青 → 琥珀 → 橙 → 软红），并明确标注为「扩展本地分级」，不代表 IPPure 官方等级。
- **代理切换提醒**：检测到出口 IP 变化时，悬浮条边框轻微亮起 1 秒，详情区显示「IP 已更新」约 3 秒，不使用系统通知。
- **一键复制 IP**：点击 IP（迷你条或详情）复制，原位短暂显示「已复制」。
- **多标签共享缓存**：后台统一请求并缓存，避免多标签页重复请求。

---

## 安装

### Chrome

1. 打开 `chrome://extensions/`
2. 打开右上角「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择本项目目录

### Edge

1. 打开 `edge://extensions/`
2. 打开左下角「开发人员模式」
3. 点击「加载解压缩的扩展」
4. 选择本项目目录

加载后打开 `https://chatgpt.com/`，右上角即出现状态条。

---

## API

IP 数据来源：

```text
IPPure
https://my.ippure.com/v1/info
```

请求方式：

```http
GET https://my.ippure.com/v1/info
```

> ⚠️ IPPure API 当前处于测试阶段，接口字段可能调整。本扩展将所有字段均按「可选字段」处理，单个字段缺失、为 null 或类型异常不会导致 UI 崩溃。

风险分语义：**`fraudScore` 数值越高表示风险越高**。当 `fraudScore` 缺失、为 null 或无法解析时，UI 显示「暂无评分」（`—`），**绝不会被当成 0**。

> 本扩展不会把 `100 - fraudScore` 宣称为 IPPure 官方的「纯净度分数」。UI 中展示的风险等级是扩展自身的本地视觉分级，与 IPPure 官方等级定义无关。

ChatGPT 延迟由后台 Service Worker 对 `https://chatgpt.com/` 发起轻量请求并测量 TTFB（响应头到达即计时，不读取 body），带 60 秒级缓存与 5 秒超时，避免频繁请求。

---

## 权限

| 权限 | 用途 |
| --- | --- |
| `storage` | 保存设置（`chrome.storage.sync`）与 HUD 位置（`chrome.storage.local`） |
| `https://my.ippure.com/*` | 仅允许后台请求固定的 IPPure API |
| `https://chatgpt.com/*` | 后台测量到 ChatGPT 的延迟 |

### 关于注入范围

`content_scripts` 的 `matches` 仅为 `https://chatgpt.com/*` 与 `https://chat.openai.com/*`，**不申请** `<all_urls>`。`chrome://`、`edge://`、Chrome Web Store 等页面天然不注入。

本扩展**不会**收集浏览历史、Cookie、当前页面内容、表单、用户账号或页面 URL；仅关心 IPPure 返回的网络出口信息与到 ChatGPT 的延迟。

---

## 架构

```text
ip-pure-monitor/
├── manifest.json          # Manifest V3 配置
├── background.js          # Service Worker：请求固定 API + 延迟测量 + 全局缓存
├── shared/                # 跨上下文共用
│   ├── constants.js       # 常量、默认设置、默认位置
│   ├── normalize.js       # API 数据规范化（可选字段容错）
│   ├── settings.js        # 设置读写 + 位置读写（local）
│   └── utils.js           # 旗帜、掩码、风险分级、复制等纯函数
├── content/               # 内容脚本（按职责拆分）
│   ├── constants.js
│   ├── styles.js          # Shadow DOM 内样式（深浅色 + 拖动 + 延迟）
│   ├── ui.js              # HUD 控制器：DOM、渲染、拖动/吸边、交互
│   └── main.js            # 入口：消息通信、轮询、生命周期
├── popup.html / popup.js / popup.css    # 工具栏 Popup
├── options.html / options.js / options.css  # 设置页
├── icons/                 # 扩展图标
├── tools/                 # 图标生成 / 校验脚本（可选）
└── README.md
```

### 请求链路

```text
Content Script
      ↓  chrome.runtime.sendMessage()
Background Service Worker
      ↓  fetch（URL 全部写死，不接受任意 URL）
https://my.ippure.com/v1/info   （IP）
https://chatgpt.com/            （延迟）
```

- 请求超时：IP 8 秒，延迟 5 秒。
- 失败时保留旧数据并标记「更新失败」，不弹窗、不产生页面级错误。
- 缓存默认跟随刷新间隔（默认 60 秒），多标签共享 + 请求去重。

---

## 设置项

- 在网页中显示 IP 状态悬浮条
- 自动刷新时间：30 秒 / 60 秒 / 2 分钟 / 5 分钟
- 默认显示：完整 IP / 隐藏 IP 后半部分（如 `104.28.*.*`，仅影响迷你条）
- 悬浮条透明度：60% ~ 100%（默认约 82%）
- 鼠标悬停展开详情：开启 / 关闭
- 锁定 HUD 位置：开启 / 关闭（默认关闭）

设置即时生效并保存到 `chrome.storage.sync`；HUD 位置独立保存到 `chrome.storage.local`。

---

## 交互说明

- **拖动**：按住左侧 `⋮⋮` 手柄或卡片空白区域（非 IP / 刷新按钮等控件）拖动；松开自动吸边（左半屏→左边缘，右半屏→右边缘，边距 12px）。
- **双击复位**：双击手柄恢复默认位置 `top:72px; right:12px`。
- **展开**：悬停约 250ms（可关闭），或点击状态条固定展开；右侧吸附时向左扩展，左侧吸附时向右扩展，不会超出视口。
- **收起**：鼠标离开约 650ms 自动收起；固定展开后再次点击 / 点击页面其他位置 / 按 `Esc` 收起。
- **刷新**：点击刷新图标强制刷新（跳过缓存），期间图标旋转，不清空当前信息。
- **复制**：点击 IP 复制，原位显示「已复制」约 1 秒。

---

## 安全说明

- 不使用 `eval()` / `new Function()`。
- 不使用内联 JavaScript、不远程加载 JS/CSS。
- 动态 API 内容一律通过 `textContent` 赋值；`innerHTML` 仅用于扩展自身的静态模板结构。
- 不依赖 ChatGPT 易变化的 DOM class；HUD 挂载到 `document.body` + 独立 Shadow DOM。
- 遵循最小权限原则。
