# FRAMEFORGE 灯光平面图与表格工作区 — UI 视觉审查报告

审查日期：2026-09-18 ｜ 审查者：general-purpose-1（独立 UI 视觉审查）
范围：运行时（127.0.0.1:18799）+ 代码级静态审查 ｜ 约束：仅审查，未改动任何源码

> 说明：截图因运行环境限制无法由模型肉眼读取，故"错位/间距"类判断主要依据 Playwright 采集的 computed styles 与 CSS 规则文本，视觉最终以人工复核为准。截图四周的蓝色发光边框为浏览器自动化噪声，已忽略。

## 一、运行时取证截图清单（qa-artifacts/ui-audit/）
00-login.png、01-hub.png、02-table.png、03-toolbar-top.png（顶栏特写）、03c-workspace-toolbar.png（画板工具栏特写）、04-lighting-empty.png、05-board-created.png、06-light-added.png、07-mode-2d.png、07-mode-2.5d.png、07-mode-split.png、07-mode-3d.png、08-inspector.png（右侧检查器特写）、08b-boards-toolbar.png。

## 二、死代码核实（重要更正）
用户假设 `body[data-ui-version="7.3"]` 是死代码——**已被证伪**：运行时 `document.body` 实际带 `data-ui-version="7.3"`（由 JS 设置），`static/workspace-flow.css` 与 `workspace-flow-pages.css` 的 v73 层全部生效。另：`src/workspace/*.tsx` 不存在，本项目是 vanilla JS。

死代码扫描（对比 table+lighting 运行时 DOM 与 static/ 源码 class token）原始输出 113 条候选，但**含大量假阳性**——它们由 `app.js`/`creative-boards.js` 在 hub/故事板视图或其他画布模式（2.5D 分屏、选中态）动态生成，本次 DOM 快照未覆盖。已确认存活的假阳性：`.nav-item`(app.js:1630)、`.shot-card`(app.js:4099)、`.wall-item`、`.timeline-clip`、`.context-menu-item`、`.column-settings-item`、`.word-comment-rail`、`.import-section-head`、`.presence-more`(app.js:2118)、`.column-resize-hud`(app.js:3654)、`.card-inline-editor`(app.js:4182)、`.timeline-ruler-track`(app.js:4346)、`.ff-boards-split-preview`(creative-boards.js:660)。

**确属死代码（无 JS 引用、未现任何 DOM）：**
- `static/workspace-v73.css` 整组 Tailwind 风格工具类（约 50 条）：`.flex`/`.grid`/`.relative`/`.absolute`/`.sticky`/`.static`/`.block`/`.inline`/`.inline-flex`/`.truncate`/`.rounded`/`.border`/`.uppercase`/`.underline`/`.shadow`/`.outline`/`.blur`/`.filter`/`.transition`/`.ease-in-out`/`.ease-out`/`.grow`/`.transform`/`.resize`/`.flex-wrap`/`.overflow-hidden`/`.tabular-nums`/`.overline`/`.italic`/`.container`/`.contents`/`.list-item`/`.table`/`.flex-shrink`/`.border-collapse`/`.backdrop-filter`/`.visible`/`.fixed`/`.isolate`。全项目无元素以 class 引用。
- `static/styles.css` 遗留功能孤儿：`.mode-segmented`(:454，已被 `.ffui-segmented`/`.ff-boards-view-modes` 取代)、`.btn-danger-ghost`、`.project-settings-trigger`、`.card-vo-box`、`.pdf-range-hint`/`.pdf-fields-label`/`.pdf-export-scope`、`.asset-list`/`.asset-row`/`.asset-kind`/`.asset-info`、`.review-withdraw`、`.inspector-review-links`、`.word-comment-empty`、`.import-diagnostics`/`.diagnostic-*`、`.modal-hint`、`.timing-shot-head`/`.timing-segment-text`、`.column-settings-icon`。

## 三、A 档（必须改）
**A1 — 遗留亮蓝拟物按钮。** `static/styles.css:3214-3230` `.btn-primary` 使用 `linear-gradient(180deg,#3688f5…)` + `inset 0 1px 0 rgba(255,255,255,.3)` 厚重内阴影 + `text-shadow`，`:hover`/`:active` 仍为渐变。与 v73 层扁平 `.ffui-button` 风格冲突，且正是用户抱怨的"亮蓝渐变按钮/厚重外框"。改法：改为 `background:var(--accent); color:#fff`，hover 仅微调明度，删除所有 `linear-gradient`/`inset` shadow/`text-shadow`。

## 四、B 档（应该改）
**B1 — 控件尺寸三套标准并存。** `.ff-boards .ff-boards-button`(creative-boards.css:85) `min-height:32px/radius:6px/padding:5px 8px`；`.ff-boards-view-modes .ff-boards-button`(:219) `min-height:28px/radius:0/padding:5px 10px/font-size:12px`；inspector 输入(:254) `font-size:13px/padding:5px 8px/radius:7px`。高度/圆角/字号各自为政。改法：抽取 `--control-h`、`--radius` 变量统一三处。
**B2 — 圆角体系杂乱。** 全局 6/7/8/9/10/12/14px 并存（V7.5按钮6、inspector输入7、view-modes9、global-search9、btn-primary8、ffui-button10、legacy面板12、boards-toolbar14）。改法：定义 `--radius-sm/md/lg` 收敛。
**B3 — 面板边框规则冲突。** `creative-boards.css:44-48` 给 sidebar/inspector 设 `border:1px solid var(--border-strong);border-radius:12px`，而 V7.5 层 `:89` 覆写为 `border:0;border-radius:0`，同一元素两套矛盾规则。改法：删除遗留 `:44-48`，以 V7.5 层为准。
**B4 — 工具栏间距冲突。** `.ff-boards-toolbar`(creative-boards.css:84) `gap:6px!important` 与 v73 层 `workspace-flow.css:117` `gap:8px` 矛盾；顶栏 icon 按钮与画板工具栏 gap 不一致。
**B5 — 反馈态缺失。** inspector 输入(:254) 无 `:focus-visible` 描边环；view-modes 按钮(:219) 仅有 hover 无 focus-visible/active 明显态（global-search 有 focus-within 可作参考）。补 `:focus-visible{outline:2px solid var(--accent)}`。

## 五、C 档（可选优化）
**C1** `.ff-boards-item` `box-shadow:0 2px 5px #0002`(creative-boards.css:54) 拟物投影，可改平。
**C2** 清理第二节死代码（尤其 workspace-v73.css 工具类组），减小样式体积。
**C3** "错位"项（分屏中线与面板边界、搜索图标与输入对齐）computed styles 未现明确偏移证据，建议设计人工据截图复核。

## 六、关于用户 6 项抱怨的回应
①icon间距：view-modes 用 border-right 分隔合理；但 B4 工具栏 gap 冲突属实。②双层描边：`.global-search`/`.ff-boards` 输入已正确 `border:none`（无双层）；仅 B3 面板规则冲突。③尺寸不统一：B1 证实。④错位：computed 无证据，建议人工复核。⑤反馈态：B5 部分缺失。⑥遗留拟物：A1 证实，另有 C1。
