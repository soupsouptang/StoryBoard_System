# UI 收敛记录（2026-09-18）

来源：`docs/audits/UI_VISUAL_AUDIT_20260918.md`（子代理 general-purpose-1 审查）
本文件只记录**已实际修改**的项与**未改**的项及原因。

## 一、已修复

### A1 遗留亮蓝拟物按钮（styles.css:3214-3230）
`.btn-primary` 原先是 `linear-gradient(180deg,#3688f5…)` + 双层 `inset` 阴影 + `text-shadow`。
改为扁平：
```css
background: var(--accent,#2563eb);
box-shadow: 0 1px 2px rgba(0,0,0,.16);
:hover → filter: brightness(1.08)
:active → filter: brightness(.94)
:focus-visible → outline: 2px solid var(--accent)
```
注：`--control-radius` 令牌已在 `styles.css` 定义，圆角走令牌而非硬编码 8px。

### B3 面板边框规则冲突（creative-boards.css）
删除了遗留块（原 44-49 行）：`.ff-boards :is(.ff-boards-sidebar,.ff-boards-inspector)` 的
`border:1px solid` + `border-radius:12px` + `background:var(--bg-surface-2)`，以及
`.ff-boards .ff-boards-inspector{width:224px}`。
保留 V7.5 覆写层（现 85 行）为唯一来源：`border:0; border-radius:0; background:var(--bg-surface-1)`，
宽度由 `.ff-boards-layout` 网格（260px / 1fr / 300px）决定。
已确认无副作用：72/75/121/122 行的响应式规则仍独立生效。

### B4 工具栏 gap 冲突
`.ff-boards .ff-boards-toolbar` 的 `gap:6px!important` 与 `workspace-flow.css:120` 的 `gap:8px` 冲突。
改为 `gap:var(--control-gap,8px)`（去掉 `!important`），两处现均为 8px。
`padding:4px 0!important` 保留（画板工具栏本就与顶栏不同规格，属有意差异）。

### B1/B2 控件尺寸与圆角收敛到令牌
- `.ff-boards .ff-boards-button`：`min-height:var(--control-h-default,32px)`、`border-radius:var(--control-radius,6px)`、
  补 `font-size:var(--control-font-size,12px)`、`font-weight:var(--control-font-weight,500)`
- `.ff-boards-view-modes .ff-boards-button`：`min-height:var(--control-h-compact,28px)`、字号走令牌
- `.ff-boards-inspector` 内 input/textarea/select：`min-height` 走 `--control-h-default`、
  `border-radius` 由 4px 改为 `--control-radius(6px)`、字号走令牌

### B5 焦点反馈（键盘可达性）
在 `creative-boards.css` 末尾追加：
- `.ff-boards input/select/textarea:focus-visible` → `outline:2px solid var(--accent); outline-offset:1px`
- `.ff-boards-view-modes/.ff-boards-toolbar` 内按钮 `:focus-visible` → 同上（offset 2px）
- `.ff-boards-view-modes .ff-boards-button:active` → `filter:brightness(.92)`

## 二、刻意未改（及原因）

- **`.ff-boards-view-modes` 内按钮 `border-radius:0`**：这是分段控件（外层容器带 9px 圆角 + 段间 1px 分隔线），
  段内直角是标准分段控件做法，不是"尺寸不一致"。已在 CSS 中加注释标明为有意设计。
- **C2 死代码清理**：`workspace-v73.css` 约 50 条 Tailwind 风格工具类虽确认无引用，
  但该文件是 esbuild/Tailwind 产物（`src/workspace/theme.css` → 构建生成），
  直接删产物会被下次构建覆盖回来，正确做法是改 `src/workspace/theme.css` 后再 build。本轮未动。
- **C1 `.ff-boards-item` 拟物投影**：纯观感项，等 UI 收敛整体回归时一并处理，避免与进行中的灯光改动叠加风险。

## 三、验证方式
上述改动均为 CSS，无 JS 行为变更。回归通过：
`creative_boards_qa` / `lighting_scene_qa` / `lighting_render_qa` / `rich_text_qa` /
`asset_gate_qa` 与 Python `test_creative_boards_contract` + `test_backend_integrity` + `test_lighting_scene_v2_contract`。
视觉最终复核建议：灯光模块 2D/2.5D/3D 各截一张对比改前改后。
