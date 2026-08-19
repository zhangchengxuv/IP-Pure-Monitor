# IP Pure Monitor

一个轻量、克制的 Chromium 浏览器扩展（Manifest V3）。在浏览网页时，始终于网页右上角以一个半透明悬浮 HUD 显示当前浏览器网络出口 / 代理 IP，以及 [IPPure](https://my.ippure.com/v1/info) 提供的 IP 风险信息。

---

## 功能

- **迷你状态条**：默认仅显示「国旗 · IP · 风险圆点 · 风险分」的细长状态条，不遮挡视线。
- **展开详情**：鼠标悬停约 250ms 或点击状态条展开，展示国家、完整 IP、风险分、住宅 IP、IP 类型、ASN、组织、位置、时区与更新时间。
- **风险可视化**：`fraudScore` 数值越高风险越高，扩展内部做本地视觉分级（软绿 → 青 → 琥珀 → 橙 → 软红），并明确标注为「扩展本地分级」，不代表 IPPure 官方等级。
- **代理切换提醒**：检测到出口 IP 变化时，悬浮条边框轻微亮起 1 秒，详情区显示「IP 已更新」约 3 秒，不使用系统通知。
- **一键复制 IP**：点击 IP（迷你条或详情）即可复制，原位短暂显示「已复制」。
- **手动 / 自动刷新**：SVG 刷新图标，强制刷新跳过缓存；自动刷新间隔可在设置中调整。
- **多标签共享缓存**：由后台 Service Worker 统一请求并缓存，避免多标签页重复请求 API。
- **Shadow DOM 隔离**：UI 与样式完全隔离，不污染网页、也不被网页 CSS 污染。
- **最小权限**：仅请求 `storage` 与 `https://my.ippure.com/*`，不读取浏览历史、Cookie、页面内容或 URL。

---

## 安装

### Chrome

1. 打开 `chrome://extensions/`
2. 打开右上角「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择本项目目录（即包含 `manifest.json` 的文件夹）

### Edge

1. 打开 `edge://extensions/`
2. 打开左下角「开发人员模式」
3. 点击「加载解压缩的扩展」
4. 选择本项目目录

### 其他 Chromium 浏览器

任何支持 Manifest V3 的 Chromium 内核浏览器（Brave、Vivaldi、Opera 等）通常均可通过类似的「加载已解压的扩展」方式加载。

---

## API

数据来源：

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

> 本扩展不会把 `100 - fraudScore` 宣称为 IPPure 官方的「纯净度分数」。UI 中展示的风险等级（低风险 / 较低风险 / 中等风险 / 高风险 / 很高风险）是扩展自身用于视觉呈现的本地分级，与 IPPure 官方等级定义无关。

---

## 权限

| 权限 | 用途 |
| --- | --- |
| `storage` | 保存用户设置（显示开关、刷新间隔、IP 掩码、透明度、Hover 展开等），优先使用 `chrome.storage.sync`，不可用时自动降级 `chrome.storage.local` |
| `https://my.ippure.com/*` | 仅允许后台 Service Worker 请求固定的 IPPure API 地址 |

### 关于网页注入权限

悬浮条需要在普通网页上显示，因此 `content_scripts` 的 `matches` 声明为 `http://*/*` 与 `https://*/*`（即「读取和更改您在所有网站上的数据」这一能力）。这是实现「所有网页右上角显示 HUD」所必需的最小范围：仅限 HTTP/HTTPS 页面，不包含 `file://`、`chrome://`、`edge://`、`chrome-extension://` 以及 Chrome Web Store 等受限制页面（这些页面浏览器禁止注入，扩展会自然跳过且不产生报错）。

本扩展**不会**收集浏览历史、Cookie、当前页面内容、表单、用户账号或页面 URL；仅关心 IPPure API 返回的网络出口信息。

---

## 架构

```text
ip-pure-monitor/
├── manifest.json          # Manifest V3 配置
├── background.js          # Service Worker：请求固定 API + 全局缓存
├── shared/                # 跨上下文共用（content / popup / options / background）
│   ├── constants.js       # 常量与默认设置
│   ├── normalize.js       # API 数据规范化（可选字段容错）
│   ├── settings.js        # 设置读写（sync → local 降级）
│   └── utils.js           # 旗帜、掩码、风险分级、复制等纯函数
├── content/               # 内容脚本（按职责拆分）
│   ├── constants.js
│   ├── styles.js          # Shadow DOM 内样式（字符串注入）
│   ├── ui.js              # HUD 控制器：DOM、渲染、交互
│   └── main.js            # 入口：消息通信、轮询、生命周期
├── popup.html / popup.js / popup.css    # 工具栏 Popup
├── options.html / options.js / options.css  # 设置页
├── icons/                 # 扩展图标（16/32/48/128）
├── tools/generate-icons.ps1  # 图标生成脚本（可选，便于重新生成）
└── README.md
```

### 请求链路

```text
Content Script
      ↓  chrome.runtime.sendMessage()
Background Service Worker
      ↓  fetch（API 地址写死，不接受任意 URL）
https://my.ippure.com/v1/info
```

- API 地址写死在 `background.js` 中，Content Script 无法指定任意请求 URL。
- 请求超时 8 秒；失败时保留上一次成功数据并标记「更新失败」，不弹窗、不产生页面级错误。
- 后台缓存默认跟随设置的刷新间隔（默认 60 秒），所有标签页共享；多个标签页同时请求会做去重，只发一次网络请求。

---

## 设置项

- 在网页中显示 IP 状态悬浮条
- 自动刷新时间：30 秒 / 60 秒 / 2 分钟 / 5 分钟
- 默认显示：完整 IP / 隐藏 IP 后半部分（如 `104.28.*.*`，仅影响迷你条，详情始终显示完整地址）
- 悬浮条透明度：60% ~ 100%（默认约 82%）
- 鼠标悬停展开详情：开启 / 关闭

设置即时生效并保存到 `chrome.storage.sync`。

---

## 交互说明

- **展开**：悬停约 250ms（可在设置中关闭），或点击状态条固定展开。
- **收起**：鼠标离开约 650ms 自动收起；固定展开后，再次点击或点击网页其他位置（或按 `Esc`）收起。
- **刷新**：点击刷新图标强制刷新（跳过缓存），期间图标缓慢旋转，不清空当前信息。
- **复制**：点击 IP 复制到剪贴板，原位短暂显示「已复制」约 1 秒。

---

## 安全说明

- 不使用 `eval()` / `new Function()`。
- 不使用内联 JavaScript、不远程加载 JS/CSS。
- 动态 API 内容一律通过 `textContent` 赋值；`innerHTML` 仅用于扩展自身的静态模板结构。
- 遵循最小权限原则。
