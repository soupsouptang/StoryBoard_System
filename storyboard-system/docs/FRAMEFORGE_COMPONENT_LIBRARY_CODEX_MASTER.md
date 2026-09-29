# FRAMEFORGE Component Library / Motion / Icon / Graphics Master Specification
## Codex 执行总规范 · shadcn/ui 基线 · 当前实现审计合并版

> Status: ACTIVE UI REFACTORING CONTRACT
> Audit Date: 2026-09-29
> Architecture truth: current `master` + `ARCHITECTURE.md`
> Visual / component baseline: **shadcn/ui**
> Functional / product baseline: **`5e86a0bb11a20ecd631d9c2af66260a73d7c92e7`**
>
> Baseline rule:
> - shadcn/ui decides primitive proportions, radius, spacing, focus, overlay and accessibility behavior.
> - `5e86a0b` decides which existing FRAMEFORGE capabilities and interaction contracts must survive migration.
> - shadcn visual simplification is never permission to remove a capability present at the functional baseline.
> - Legacy CSS/DOM is evidence for behavior, not the visual target to copy pixel-for-pixel.
> - Current explicit user decisions and later accepted removals override `5e86a0b`.
>
> Scope:
> - UI Component Library
> - shadcn/ui Migration
> - Workspace UI
> - Motion
> - Dynamic Icons
> - Technical Graphics
> - Visual QA
> - Codex Modification Rules
>
> 本文不是新增功能规划。
>
> 本文不得被用于：
> - 增加当前不存在的产品功能；
> - 恢复用户已经删除的功能；
> - 改变当前业务流程；
> - 绕过现有保存、Revision、Conflict、Import、Export 或数据合同；
> - 把未来 AI / i18n / Electron 规划误写为当前已经实现。

---

# 0. 文档地位

本文件用于约束 FRAMEFORGE 后续所有：

- Codex UI 修改；
- shadcn/ui 迁移；
- Workspace 重构；
- 组件拆分；
- 图标替换；
- 动效调整；
- Inspector 修复；
- 响应式修复；
- CSS ownership 收敛；
- Visual QA。

涉及当前系统真实运行方式时：

```text
ARCHITECTURE.md
>
ARCHITECTURE_MIGRATION.md
>
本文件
>
旧版 UI 设计文档
>
旧实现中的历史残留
```

涉及用户已经明确修改的产品行为时：

```text
用户最新明确要求
>
任何旧文档
>
任何旧代码
>
任何旧截图
```

---

# 0.1 当前实现审计基线（2026-09-29 核实）

以下为本次审计核实的仓库真实状态，所有后续条目以此为准。

## 当前运行架构

CURRENT / VERIFIED：

```text
Legacy 静态前端 (static/app.js 仍是运行源码)
+
React / TypeScript Workspace (src/workspace/index.tsx → build → static/workspace-v73.js)
+
Python server.py 单体 HTTP 入口 (SQLite)
+
已抽离模块: creative_boards.py, field_lifecycle.py, text_format.py,
  asset_cleanup.py, narration_timing.py, delivery_exports.py,
  shot_updates.py, shot_bulk_updates.py, shot_versions.py,
  persistence_helpers.py, runtime_clock.py, import_parsing.py,
  import_staging.py, schema_migrations.py
```

## Legacy `storyboard-system/packages/ui` 当前真实内容

CURRENT / VERIFIED — `storyboard-system/packages/ui/src/` 有以下两个主要文件；仓库根 `packages/ui` 是另一套同名 package，现有 token/词典与首批基础控件，尚未达到全套 parity：

```text
storyboard-system/packages/ui/src/index.tsx   — 10 KB
  已导出: Button, ToggleButton, IconButton, Input, TextArea,
          Field, Select, Segmented, Checkbox, Popover, Menu,
          Modal, SortableList, UIProvider, Icons, OverlayOpenState
  依赖: radix-ui (Checkbox, Dialog, DropdownMenu, Popover, Select,
        ToggleGroup, Tooltip), lucide-react, @dnd-kit/core+sortable,
        sonner (Toaster/toast), cmdk (Command), motion/react

storyboard-system/packages/ui/src/motion.tsx  — 3.4 KB
  已导出: motionTokens, MotionIcon, WorkspaceTransition, MotionState
  Motion Tokens: feedback 0.16s, viewEnter 0.22s, viewExit 0.16s
  MotionState 类型: 'idle'|'hover'|'active'|'loading'|'success'|'error'|'disabled'
```

## Legacy React Workspace 当前真实文件（`storyboard-system/src/workspace`）

```text
src/workspace/
├── contracts.ts   — 1 KB
├── index.tsx      — 5 KB (主入口)
├── sidebar.tsx    — 3.3 KB
├── store.ts       — 0.6 KB
├── theme.css      — 20.6 KB
└── toolbar.tsx    — 4.6 KB
```

## CSS 加载顺序（CURRENT / VERIFIED）

`static/index.html` 当前加载：

```text
workspace-ux.css
creative-boards.css
workspace-v73.css          ← build.mjs 生成
workspace-v73-views.css
workspace-flow.css
workspace-flow-pages.css
workspace-assets-v75.css
workspace-editor-v75.css
field-system.css
presence-ui.css
admin-center.css
styles.css
```

## 后端测试当前状态

2026-09-29 执行 `python -m unittest discover -s tests -p "test_*.py"`：

```text
98 tests ran, 91 passed, 4 errors, 3 skipped

ERRORS (环境依赖，非代码缺陷):
- test_field_lifecycle_contract: ImportError (包名冲突)
- test_project_pdf_api: ModuleNotFoundError (pypdf)
- test_project_pdf_roundtrip: ModuleNotFoundError (reportlab)
- test_schema_migrations: PermissionError (Windows tempfile)
```

---

# 1. 本次审计后的关键修正

上一版方向基本正确，但以下部分必须修正。

## 1.1 不再建立第二套共享 UI 目录

仓库根与 Legacy 子树各有一个名为 `@frameforge/ui` 的包。过渡 React Workspace 通过 Legacy tsconfig alias 使用 `storyboard-system/packages/ui`；`apps/web` 登录页已消费根包 Button/Input/Field，其他 UI 尚未完成切换。

```text
repo-root/packages/ui → FRAMEFORGE 目标唯一共享 UI 基础
```

不再另建一套 `src/components/ui` 与之竞争。

目标结构（按需渐进创建，不一次建全部空目录）：

```text
repo-root/packages/ui/src/
├── primitives/
├── layout/
├── patterns/
├── feedback/
├── icons/
├── motion/
├── graphics/
└── theme/
```

## 1.2 shadcn 不是第二个 UI 系统

shadcn/ui 应逐渐进入仓库根 `packages/ui`，而不是形成第三套系统。

> shadcn 是仓库根 `packages/ui` 的基础实现来源，而不是平行依赖层。

## 1.3 当前系统不是 React-only

`static/app.js` 仍属真实运行源码。禁止直接认为 Legacy 已经废弃。

## 1.4 生成文件不是正式修改入口

最终 Web 功能优先在 `apps/web` 实施，通用 primitive 迁入仓库根 `packages/ui/src/*`；`storyboard-system/src/workspace` 和 Legacy UI 包仅保留迁移参考、必要修复与兼容适配。

`workspace-v73.js` / `workspace-v73.css` 是构建输出，只用于 debug / inspection / build verification。

## 1.5 CSS Cascade 是当前真实架构问题

多层 ownership 冲突，不是单个 selector 写错。

本轮不能继续"发现问题 → 增加一个 xxx-fix.css"，必须逐步建立 CSS Ownership Map。

参考 `audits/CSS_OWNERSHIP.md`。

---

# 2. 事实等级

Codex 必须区分以下状态。

| 标签 | 含义 |
|---|---|
| **CURRENT / VERIFIED** | 当前真实运行或已核实存在 |
| **CURRENT / PARTIAL** | 已有实现，但 Legacy / New Architecture 仍并存 |
| **INVARIANT** | 迁移过程中不得改变 |
| **TARGET** | 本次组件/UI 迁移目标 |
| **FUTURE** | 只做兼容准备，目前不产生产品功能 |
| **REMOVED** | 已明确移除，不得恢复 |

---

# 3. 产品功能安全原则

UI 重构必须遵守：

```text
不新增功能
不删除功能
不恢复已删除功能
不改变现有业务意义
```

组件库是现有功能的统一表现层，而不是产品功能生成器。

---

# 4. 已明确删除：精简 / 专业模式

REMOVED：

```text
精简 / 专业 / Compact Mode / Professional Mode / Simple Mode
Mode Toggle / Segmented Mode Switch
```

Codex 如果在 Legacy 中看到 `compactMode` / `simpleMode` / `proMode`，不得因为代码仍存在而恢复 UI。确认是否仍有运行依赖；如果只是历史残留，进入后续 Legacy Cleanup。

---

# 5. 不恢复旧 View Switch

旧版本曾经设计 Table / Card / Storyboard Wall / Timeline 作为显式 View Switch。后续产品要求已修改。

不得重新建立 View Tabs、Segmented View Control，不得因为 shadcn Tabs 好看就恢复。

当前已经实际存在的页面或模块继续保留，但"存在页面 ≠ 需要重新增加视图切换器"。

---

# 6. Review 不得重新变成审批系统

保留：Comment, Revision, Version, History, Compare, Word-style Audit, Before/After, Inline Diff, 逐条接受/拒绝修改。

禁止重新增加：全局"同意"/"驳回"、"提交意见"、客户确认、Reviewer Assignment、Multi-step Approval、Approval Dashboard。

Review 定位：媒体审阅 + 修改审计。不是企业审批 OA。

---

# 7–8. 当前 AI 策略

FUTURE：AI 后续会接入。CURRENT：**NO AI UI**。

不得新增 AI Button / Ask AI / AI Chat / AI Sidebar / Prompt / Model Picker / AI Summary / AI Generate / AI Autofill / AI Credits。

只允许非可见兼容准备：稳定 Entity ID、可扩展 metadata、通用异步状态组件、Revision/Diff 可复用、actor/source 接口可扩展、i18n、generic job progress。

---

# 9–10. i18n

新组件应避免硬编码中文，推荐 `{t("shot.create")}`。但本轮不因此增加 Language Switcher。

组件不得依赖"中文刚好 4 个字"来确定尺寸，必须适应 zh-CN / en-US。

---

# 11. shadcn/ui 定位

FRAMEFORGE 主要视觉基线，不是简单"参考"。采用：Card, Button, Input, Textarea, Select, Dialog, AlertDialog, Popover, DropdownMenu, ContextMenu, Tooltip, Checkbox, Switch, Tabs（仅现有业务真正需要时）, Badge, Separator, ScrollArea, Skeleton, Progress。

---

# 12–13. shadcn 不可变量

INVARIANT：

- 不修改 shadcn 基础圆角体系（禁止统一改成 2px/3px/4px/square）
- 不全局修改 Card radius / padding / header-content-footer ratio / title spacing

---

# 14. 专业性不靠压缩空间

FRAMEFORGE 的专业感来源：层级、准确、稳定、一致、媒体表现、空间组织、正确的状态反馈、工具可预测性、技术信息清晰。

不是：按钮更小、字体更小、面板更窄、行更矮、padding 更小。

---

# 15. 视觉关键词

目标：shadcn, dark, neutral, quiet, precise, media-first, spacious, layered, technical, editorial, professional, subtle motion, read-first。

避免：dense-for-density, gaming, neon, skeuomorphic, dashboard, glass-everywhere, marketing SaaS。

---

# 16. FRAMEFORGE 视觉来源

| 来源 | 汲取方向 |
|---|---|
| shadcn | 基础组件视觉语言 |
| Notion | Read-first / Property / 信息层级 |
| Figma | Canvas / Inspector / Layer / Spatial UI |
| Apple | Motion / proportion / material restraint |
| Google Flow | Media-first / 大内容区 |
| Frame.io | Review clarity |
| FRAMEFORGE | 影视制作语义 |

---

# 17. 仓库根 `packages/ui` 最终目标结构

```text
repo-root/packages/ui/src/
├── primitives/    button, icon-button, input, textarea, select, checkbox, switch,
│                  dialog, alert-dialog, dropdown-menu, context-menu, popover,
│                  tooltip, card, badge, separator, scroll-area, skeleton, progress
├── layout/        app-shell, project-hub-shell, workspace-shell, panel, dock,
│                  split-pane, overlay-root
├── patterns/      toolbar, toolbar-group, inspector, inspector-section,
│                  property-field, property-group, media-tile, status-indicator,
│                  search-field, file-drop-zone
├── feedback/      loading-state, empty-state, error-state, save-state, toast
├── icons/         icon, motion-icon, icon-map, domain-icons, README
├── motion/        tokens, fade, slide, presence, layout-transition, reduced-motion
├── graphics/      media-placeholder, empty-graphics, document-preview,
│                  technical-glyphs, scene-symbols
└── theme/         tokens.css, typography.css, globals.css
```

注意：不需要一次创建全部空目录。有真实调用时再建立。

---

# 18. 组件分层

| 层级 | 知道什么 | 示例 |
|---|---|---|
| **Primitive** | 不知道 FRAMEFORGE 业务 | Button, Input, Select, Dialog, Popover, Card |
| **Pattern** | 知道专业软件交互，不知道具体 Shot | Inspector, Toolbar, PropertyField, MediaTile |
| **Domain** | 知道影视领域 | ShotCard, ShotInspector, RevisionDiff, AssetTile, LightingPropertyPanel |
| **Feature** | 负责业务流程、真实数据、权限、保存 | Query, Mutation, Error, Save |

---

# 19–20. 依赖方向

只允许 Feature → Domain → Pattern → Primitive。

Primitive 不允许访问业务 API：只 receive props / emit event。

---

# 21. 当前保存链属于硬边界

组件迁移不得绕过当前已有：app.js state.bundle, api(), adoptServerBundle(), changed_fields, revision, 409 conflict, Active Editor Registry, flush, draft, pending flush, Save & Refresh sequence。

UI 重构不负责重新设计 persistence。

---

# 22. 禁止通过 reload 修同步

禁止 `location.reload()` 作为保存、状态同步或冲突解决方案。

---

# 23–24. Project Hub 与 Project Workspace

INVARIANT：`PROJECT_HUB ≠ PROJECT_WORKSPACE`。

Project Hub 不应出现工程 Sidebar / Shot Inspector / 工程 Toolbar / Shot Selection / Project-specific Dock。

返回"全部工程"必须卸载/清理工程级 Selection、Inspector、Temporary canvas UI state、Project local filters/UI state。

---

# 25–26. Selection 与 Inspector

核心不变量：`Selection ≠ Inspector Open`。

```tsx
// 错误
open={Boolean(selectedShot)}

// 正确 — 两个状态独立
selectedShot     // Selection state
inspector.open   // Inspector visibility state
```

禁止 `display:none` / `setTimeout(closeInspector)` / `querySelector().remove()` 补丁。必须找到 Selection owner / Inspector owner / Legacy event / React effect / route lifecycle 中的真实来源。

---

# 27. Focus / Selected / Active / Hover / Editing

五种独立视觉语言：

| 状态 | 表达 |
|---|---|
| **Focus** | `focus-visible` 键盘焦点 |
| **Selected** | 实体选择：subtle surface + slightly stronger border |
| **Active** | 导航 / 工具当前状态 |
| **Hover** | 预反馈 |
| **Editing** | 编辑模式 |

---

# 28–29. 蓝色描边审计

浏览器自动化外圈蓝边：不是应用 UI → IGNORE。

FRAMEFORGE 内部蓝框：属于真实 UI，需要检查 focus / selected / active 是否混用。

Selected 不使用 Focus Ring，推荐 subtle surface + slightly stronger border + small selection indicator。

---

# 30–31. Theme 与色彩

优先沿用 shadcn semantic tokens：background, foreground, card, popover, primary, secondary, muted, accent, destructive, border, input, ring。

只添加必要 FRAMEFORGE token：media-background, canvas-background, technical-grid, selection-surface。

默认 Neutral。禁止重新出现脏金 / 琥珀主色 / 黄色导航 / 每种制作方式一种高饱和色 / 大面积蓝色 Selection。

---

# 32. 字体

保持当前既定方向：EN/Number → Satoshi，Chinese → 更纱黑体。PDF 也保持一致。组件库不因为 shadcn demo 替换字体。

---

# 33–39. 基础组件规则

**Button**: 直接从 shadcn variant 开始 (default, secondary, outline, ghost, destructive, link)。禁止建立 cinema / pro / compact / lightingBlue 等自定义 variant。

**IconButton**: 所有纯图标按钮必须有 aria-label + tooltip。Legacy `storyboard-system/packages/ui` 有成熟实现；根包已移入首批实现，仍需两端真实消费者的 tooltip/focus 验收 — INTEGRATED_NOT_CUT_OVER。

**Input / Textarea / Select**: 统一 radius, height, border, focus, placeholder, disabled, error。Legacy `storyboard-system/packages/ui` 已有这些控件；根包的 Input/TextArea/Field/Select 已进入首批，登录页已消费 Input/Field/Select。Select 的 320×568 翻转、320/375/1440 点击命中和键盘选项已在本轮浏览器验证；跨主题与旧工作区切换仍需验证。禁止并存第三套。

**Textarea**: `Enter = 换行`。具体保存快捷键沿用当前业务。

**Popover**: 必须解决 flip / shift / collision / portal / viewport clamp。当前 Legacy `storyboard-system/packages/ui` 的 `Popover` 已使用 `collisionPadding: 12`；根包迁移前须核对真实 consumer — CURRENT / VERIFIED。

**Dialog**: 适用于确认 / 删除 / 导出配置 / 创建配置。不能把普通编辑流程全部 Modal 化。当前 Legacy `storyboard-system/packages/ui` 已有 `Modal`，根包尚待迁移 — CURRENT / VERIFIED。

---

# 40. z-index

建立唯一 token：

```text
base → sticky → toolbar → floating → popover → dropdown → dock → dialog-overlay → dialog → toast
```

禁止 9999 / 99999 / 999999 互相竞争。

---

# 41–43. Card / Project Hub / Shot Card

Card 保持 shadcn radius / surface / border / padding / hierarchy。Domain 可以改变内部信息布局。

Project Hub：如果当前实现使用 Card 就向 shadcn Card 靠；如果已经是行式列表就不因为 shadcn Card 好看而改回。真实现状优先。

Shot Card 推荐结构：Media → Shot Identity → Primary Description → Secondary Metadata → Existing Actions。不新增数据。

---

# 44–48. Shot Table

继续作为高频生产表。核心 Read-first，默认 Renderer，编辑 temporary editor，保存后回到 Renderer。

必须保留双击编辑 (Double Click → Inline Edit)，不能退回永久 Input。

禁止超密制造专业感 (20px row / 10px text / 24px button)。优先 scanability / readability / alignment / editing comfort。

Column Resize / Reorder 已有能力必须保留。Shot Reorder 拖动时 subtle elevation + 2px insertion line。

---

# 49–50. Field Lifecycle

当前已存在 `field_lifecycle.py` — CURRENT / VERIFIED。UI 不允许重新制造第二份字段状态。

至少正确处理 active / archived / purged。

核心回归：永久删除的字段不能重新回表头。检查 server state / client state / saved view / local cache / import mapping / default columns。

---

# 51–52. Review UI

推荐组件：RevisionDiff, RevisionItem, AuditChange, CommentThread, VersionHeader, CompareRegion。但不重新设计业务数据。

Diff 图形：删除用 destructive subtle surface，新增用 success subtle surface。禁止高饱和红绿大块。

---

# 53–54. Asset Library

必须统一 thumbnail / placeholder / loading / error / missing / unsupported。不能继续纯黑块。

Asset Placeholder 根据真实媒体类型显示：Image / Video / Audio / Document / 3D / Unknown。不得因此创建当前不存在的媒体功能。

---

# 55–56. Narration

后端已有 `narration_timing.py` — CURRENT / VERIFIED。前端不能重新写一份不一致算法。

Narration UI 解决巨大空白 / 巨大横向 Card / 输入区失衡，但不改成极密表。目标：Shot identity + Text + Timing + Status 关系清晰。

---

# 57–60. Moodboard / Lighting

Moodboard UI 可统一 Asset Tray / Canvas Chrome / Floating Toolbar / Inspector / Menu / Popover，但 Moodboard data 继续独立。

Lighting UI 层统一 Object Library / Toolbar / Inspector / PropertyField / Menu / Popover / Status。WebGL / Scene Renderer 不因 shadcn 重写。

**Lighting 当前重要风险** — CURRENT / PARTIAL：Lighting Scene V2 与 Creative Board V1 persistence 仍存在合同不一致风险，包括 type / subtype / manufacturer / model / power / mount / attachment / camera metadata / Digital Twin metadata。

禁止 UI 掩盖 Lighting 数据问题：不能删掉不认识的字段、全部降成 generic light、隐藏 Save Error。

---

# 61–63. PDF

当前真实支持需继续保护：Storyboard Table / Nine-grid / Single-shot Detail / Landscape Export + Word .docx export — CURRENT / VERIFIED。

PDF Layout Option UI 必须有 Mini Preview + Title + Short Description，不是三个纯文字方块。

PDF Preview 图形：
- Storyboard Table → 显示 columns + thumbnail + text rows
- Nine-grid → 显示 3×3
- Single Shot → 显示 large image + metadata block

图形必须真实表达版式。

---

# 64–65. Import

当前后端已有 header aliases / normalization / exact matching / substring / fuzzy matching — CURRENT / VERIFIED (`import_parsing.py`, `import_staging.py`)。

前端不能重新实现第二套 mapping engine，只消费后端结果。

Import UI 继续 Preview → Mapping → Validation → Commit，正确处理特殊字符 / 重复列 / 未映射 / 错误。

Header 值必须 escape 或 DOM property assignment，避免 `"`, `<`, `>`, `&` 破坏 input value。

---

# 66–74. Motion 总规范

FRAMEFORGE Motion：Quiet, Continuous, Functional, Spatial。

目的：告诉用户发生了什么、内容去了哪里、当前状态、操作是否完成。

**Motion Token（当前 Legacy `storyboard-system/packages/ui` 的基线；目标迁入根包）：**

| Token | 时长 | 备注 |
|---|---|---|
| micro | 100–120ms | |
| quick / feedback | 120–160ms | Legacy `storyboard-system/packages/ui` 当前 `motionTokens.duration.feedback = 0.16s` |
| control | 160–200ms | |
| panel | 180–240ms | |
| dialog | 180–240ms | |
| layout / viewEnter | 220–320ms | Legacy `storyboard-system/packages/ui` 当前 `motionTokens.duration.viewEnter = 0.22s` |

禁止 Motion：Card hover 上浮 10px、Scale 1.05、大量 bounce、整页 blur、一直流动的背景、持续呼吸高亮、空闲 icon 一直转。

呼吸感来自 space / surface / hierarchy / small state transitions / panel motion / content reveal / loading pulse，不是持续动画。

**Inspector Motion**: Main layout + Inspector 同步 transition。不能 Main 先跳 → Inspector 再出来。

**Dialog Motion**: backdrop fade + opacity + 2–6px translate + very small scale。禁止 scale(.8) / bounce。

**Popover Motion**: opacity + 2–4px translate，约 120–160ms。

**Drag Motion**: 拖起 elevation +1 → 移动 neighbours shift → 落下 settle ≤ 160ms。不要明显弹跳。

**Reduced Motion**: 必须支持 `prefers-reduced-motion`。减少 Motion 后业务不可发生任何变化。

---

# 75–92. 动态图标系统

建议：Lucide + FRAMEFORGE Domain SVG + Motion wrapper。

禁止混用多个图标库 (Lucide + Material Icon + Font Awesome + Bootstrap Icon + Emoji + PNG UI Icon)。

**Icon Wrapper**:

```tsx
<Icon name="search" size="md" />           // 通用
<MotionIcon name="sync" state="loading" /> // Legacy UI 包已有；根包尚待迁移
```

Feature 不应到处直接 `import { Search } from "lucide-react"`。

**Icon 尺寸体系**: XS 12–14px, SM 14–16px, MD 16–18px, LG 20px, XL 24px。Toolbar 16–18px，专业 Object Tile 20–24px。

**Stroke**: 统一约 1.75–2，以 shadcn/Lucide 观感为准。禁止无语义混用 1px / 3px / fill / outline。

**Optical Alignment**: 允许 wrapper 做 0.5–1px correction。不要修改整行 padding 补一个 icon。

**MotionIcon 状态**: idle, hover, pressed, active, loading, success, error, disabled — 当前 `storyboard-system/packages/ui/src/motion.tsx` 已定义 variants，CURRENT / VERIFIED；根包尚待迁移。只实现当前真实需要的状态。

各图标状态规范：

| 图标 | 状态动画边界 |
|---|---|
| **Save** | idle → subtle progress → check → idle。禁止整个 floppy icon 无限旋转 |
| **Sync** | clean / syncing(rotate) / success(crossfade→check) / error(alert glyph)。只有 syncing 可持续循环 |
| **Chevron** | 0° ↔ 90° 旋转同一 icon，不替换不同 glyph |
| **Play/Pause** | path morph 或 crossfade，120–160ms |
| **Upload** | Upload → Progress → Done。Arrow 可上 1–2px 一次，禁止一直上下跳 |
| **Delete** | Hover foreground ↑，可轻微 trash lid 1px。禁止 shake / flash / explode |
| **Search** | Focus contrast ↑，不让 magnifier 无限旋转 |
| **Filter** | 有 condition → icon active + small state dot；无 condition → idle |
| **Inspector** | 准确表达 right panel / detail panel，不用 info circle 代替 |
| **Theme** | Dark → Sun（切 Light），Light → Moon（切 Dark）。不要 palette icon |
| **Review** | 使用 Comment / Diff / History / Versions，不用 Check Circle / Approval Stamp |

---

# 93–95. 专业 Domain Icon

通用 UI 用 Lucide。影视专业对象用 FRAMEFORGE 自有 SVG Glyph：Camera, Tripod, Fixture, Softbox, Flag, Bounce, Actor, Grip, Set Object, Marker。

Domain Icon 设计规则：Technical, Recognisable, Consistent, Low-detail, Neutral。统一 perspective / stroke / visual weight / bounding box / baseline。

禁止把品牌 Logo (ARRI/Aputure/Nanlite/Sony/Canon) 当器材图标。适合 technical glyph + manufacturer + model name。

---

# 96–103. 图形系统

除 Icon 外统一：Media Placeholder, Empty Graphic, Document Preview, Technical Glyph, Scene Symbol, Beam Graphic, Selection Marker, Status Glyph, Timeline Shape。

每个图形至少完成一种：识别 / 状态 / 预览 / 分类 / 空间关系 / 结构表达。禁止渐变球 / 大抽象插画 / SaaS Marketing Illustration / 装饰 3D。

**Empty State**: Monochrome, Outline, Small, Technical, Subtle。不能成为页面主角。

**Media Placeholder**: 区分 Image / Video / Audio / Document / 3D / Unknown，统一 glyph + neutral surface。

**Broken Media**: 不要纯黑，应表达：媒体加载失败 + 媒体 identity + 当前已有恢复动作。

**Loading**: 优先 Skeleton → Inline Progress → 最后才 Blocking Spinner。Skeleton 避免很强 shimmer，建议 slow pulse 1400–2200ms。

**PDF Preview 图形**: 必须是真实 layout preview，不能三个模式都一个文件 icon + 不同文字。

---

# 104–112. Scene Planning 技术图形

统一：Grid, Axis, Camera Frustum, Beam, Actor Facing, Measurement, Arrow, Label。

| 图形 | 规范 |
|---|---|
| **Grid** | 低对比，Major/Minor 可区分，Zoom 后保持合理，不抢 object |
| **Camera Frustum** | Technical Outline + Low Opacity Fill。对应真实 Scene 数据变化，不能伪造 |
| **Light Beam** | 默认 Outline，需要时 Subtle Transparent Volume。禁止脏金 / 大黄色半透明锥 / 强 glow |
| **Actor Symbol** | 表现 Position + Direction + Selection，不是卡通人物 |
| **Lighting Fixture Symbol** | 至少表达 Body + Orientation + Beam Direction + Modifier。低缩放允许简化 |
| **2D/2.5D/3D Identity** | 同一对象在 Object Library / 2D / 2.5D / 3D / Inspector 应保持稳定名称 / 分类 / Icon / Selection |
| **图形颜色** | 默认 Neutral。状态才用 Selection / Warning / Error。真实灯光颜色属于 Scene 数据不算 UI Accent |
| **Retina/Zoom** | 技术 SVG/Canvas 需处理 devicePixelRatio / zoom / line width / anti-alias |

---

# 113. Liquid Glass

只用于 Floating Toolbar / Popover / Temporary Overlay / HUD。

不用于全部 Card / Table / Inspector / Sidebar。主体依然是 shadcn surface。

---

# 114–116. 性能

组件重构不能牺牲性能。重点：Shot Table / Inspector / Assets / Review / Moodboard / Lighting。

**Lighting 高频交互**: Pointer move 只更新 Scene transient state，不要每 frame → React full render → Save。结束操作后再走真实 commit 路径。

当前 Lighting 持久化风险不得隐藏。出现 `invalid object` / `unknown fields` / `attachment invalid` 必须显示真实错误，不能 Toast "保存成功" 然后丢字段。

---

# 117–119. 当前已知 UI 问题

**Search**: 当前搜索外观应只有一个 visual container，Input 本身 transparent / borderless。避免外框套内框。

**Sidebar Preference Popover**: 当前 legacy 位置计算存在越界风险。迁移时优先使用已有 Radix collisionPadding / sideOffset / position=popper。

**Theme Toggle**: 旧 palette icon 必须替换为 Sun/Moon，同步 title / aria-label / icon。

---

# 120–121. Import 安全

后端已有 Aliases / Header normalization / Exact / Substring / Fuzzy matching — CURRENT / VERIFIED。

新 UI 只消费结果，不要重写 Mapping Algorithm。Header 值必须 escape 或 DOM property assignment。

---

# 122. Web / Electron

共享 UI 组件不直接依赖 Electron-specific native API。需要平台行为由上层 adapter 提供。

---

# 123–124. Responsive

主要验收：2560×1440, 1920×1080, 1440×900, 1366×768, 1024×768。

375：不崩、不重叠、关键内容可访问，不要求完整桌面工作站体验。

窄屏优先 Collapse / Overlay / Wrap / Overflow / Scroll，不是 Font 10px / Button 24px / Padding 2px。

---

# 125. Accessibility

必须保留 Radix/shadcn：Keyboard, ARIA, Focus Trap, Focus Restore, Escape, Outside Click, Portal。

不能为了"没有蓝框" `outline: none;` 全局取消 focus。

---

# 126–128. QA 清单

**Visual QA 至少覆盖**：Project Hub, Shot Table, Shot Inspector, 当前 Shot Card 页面, 当前 Timeline 页面, Asset Library, Narration, Review Comments, Review Audit, Column Manager, PDF Dialog, Moodboard, Lighting / Scene Planning。不存在的页面不重新创建。

**UI 回归检查**：Inspector 不自己出现, Focus 不与 Selection 混用, 外部浏览器蓝边没被误修, Button 对齐, Input 一致, Popover 不越界, Header 不压内容, Table header 不重叠, Card 圆角未变, Card 比例未压, Sidebar 不溢出, Dialog 层级正确, Scroll ownership 清楚。

**业务回归检查**：Inline Edit, Column Resize, Shot Reorder, Field Archive/Restore/Purge, Purged Field 不复活, Search, Import, PDF Images, Word Export, VO Timing, Review Audit, Comments, Revision, Versions, Moodboard Save/Reload, Lighting Error Handling。

---

# 129–131. Codex 修改流程

每一次 UI 修改：

```text
READ ARCHITECTURE
↓ 确认真实 Runtime
↓ 确认 Legacy / React Owner
↓ 分别搜索根 packages/ui 与 Legacy storyboard-system/packages/ui 的 consumer
↓ 搜索已有 Feature Component
↓ 检查 CSS Ownership
↓ 检查用户已删除功能
↓ 确认业务行为
↓ 修改
↓ Build
↓ Browser QA
↓ Visual QA
```

**创建新组件前必须回答**：shadcn 是否已有？仓库根 `packages/ui` 是否已有？Legacy `storyboard-system/packages/ui` 是否有可迁移实现？Feature 是否已有？是否只需要 Variant / Slot？是否会产生新业务语义？是否恢复 REMOVED 功能？

**禁止重复组件**：不要 FFButton / LightingButton / ReviewButton / NewDialog / DialogV2 / InspectorNew / FinalInspector / CardFinal。基础视觉问题最终修仓库根 `packages/ui`，迁移前保护 Legacy consumer。

---

# 132–135. Legacy / CSS / DOM 规则

新代码不继续 workspace-v76.css / workspace-final.css / workspace-fix2.css。Legacy 可暂时保留，新系统逐渐减少其 ownership。

`!important` 默认禁止，只有临时 Legacy Isolation 才允许，必须注明 LEGACY_COMPAT / owner / remove_when。

新 React 组件不能依赖 querySelector / getElementById 驱动 application state。Legacy Adapter 可临时存在。

**迁移组件必须记录 Ownership**：

```text
Component:
Old DOM Owner:
New DOM Owner:
State Owner:
Event Owner:
CSS Owner:
Legacy Dependency:
Cutover Condition:
Rollback:
Tests:
```

---

# 136–140. QA 规范

**Storybook / Component Lab** 建议建立开发环境，重点展示 Default / Hover / Focus-visible / Selected / Active / Editing / Disabled / Loading / Error / Reduced Motion / Chinese / English。

**shadcn Visual Regression** 特别锁定 Radius / Card Padding / Card Header-Content Ratio / Button Height / Input Height / Dialog Shape / Popover Shape。

**Motion QA**: Panel 不硬切, Dialog 不夸张, Popover 有轻 motion, Drag 有反馈, Selection 连续, Saving 状态明确, Loading 不过度, Idle 基本静止, Reduced Motion 正常, 无动画掉帧。

**Icon QA**: 同一 Toolbar 尺寸一致, Stroke 一致, Optical Alignment 正常, Hover 克制, Loading 才循环, Active ≠ Focus, 16px 仍可识别, 无 Emoji, 无混合 icon library。

**Graphics QA**: PDF Layout Preview 准确, Media Placeholder 明确, Lighting Glyph 可辨认, Beam 非脏金, Grid 不抢内容, Empty Graphic 不像 SaaS, Scene Symbol 技术感统一, Retina 清楚, Zoom 稳定。

---

# 141–143. 当前架构特殊注意

Creative Board z / spatial contract 当前已部分修复，但 Lighting V2 persistence 不能因此认为已完全解决。

UI 迁移必须保持真实字段、保持错误、保持 reload test。

不得借 UI 重构修改 Domain Contract。Lighting Save 失败时正确做法是 UI 保持 + Domain/Persistence 单独修。

当前系统仍是 Hybrid。Codex 不得以"我们已经迁到 shadcn"为理由删除 Legacy。新路径只有满足真实调用接管 + 测试通过 + 旧路径无 consumer + 回滚验证才能删除旧实现。

---

# 144–150. 迁移顺序

不做 Big Bang Rewrite。

```text
Phase 1 (P0) — 不改业务:
  root/Legacy packages/ui consumer audit → shadcn theme → Button → Input → Textarea →
  Select → Dialog → Popover → Tooltip → Dropdown → Icon → MotionIcon

Phase 2 (P0) — 解决详情自己出现 / UI 错位 / 蓝框 / 浮层越界:
  Project Hub lifecycle → Workspace layout ownership →
  Inspector state → Selection state → Focus states →
  Overlay layer → z-index

Phase 3 (P0):
  Shot Table → Column Manager → Inline Editors →
  Drag Feedback → Search UI

Phase 4 (P0):
  Review → Word Audit → PDF → Import

Phase 5 (P1):
  Assets → Narration → Moodboard → Lighting →
  Graphics → Motion Polish → Responsive

Phase 6 (P2 / FUTURE COMPATIBILITY):
  i18n infrastructure → generic async component compatibility →
  generic actor/source metadata → Revision/Diff reusable surface
  不出现新产品入口。
```

---

# 151. Codex 最终汇报模板

每次修改输出：

```text
## Scope

## Current owner audited

DOM:
State:
Event:
CSS:

## Modified

## Preserved

## Legacy removed
仅列真正已被替代且无消费者的内容。

## Not changed

## Tests

Type check:
Build:
Browser QA:
Visual QA:
Regression:

## Product safety

No new product feature added.
No removed feature restored.
No save/revision/conflict path bypassed.
shadcn radius preserved.
shadcn Card proportions preserved.
```

---

# 152. 最终完成标准

| 维度 | 标准 |
|---|---|
| **视觉** | Shadcn 基线明确、Card 比例稳定、圆角稳定、留白自然、无内部奇怪蓝框、无拟物残留、无脏金主视觉 |
| **交互** | Selection 正确、Inspector 正确、Focus 正确、Popover 正确、Dialog 正确、Drag 正确 |
| **业务** | 无新增功能、无丢功能、无恢复已删除功能、Review 不变审批、保存链不变、Import/Export 不变 |
| **工程** | 仓库根 `packages/ui` 成为唯一共享 UI 基础、Legacy ownership 逐步减少、React ownership 明确、CSS Ownership 明确、Generated files 不作为主源码 |
| **动效** | 短、轻、连续、有意义、不掉帧 |
| **图标** | 统一、可识别、状态正确、动态克制 |
| **图形** | 技术准确、服务内容、媒体优先、不装饰化 |

---

# 153. AGENTS.md 核心规则（可直接追加）

```text
FRAMEFORGE UI / COMPONENT RULES

CURRENT ARCHITECTURE
- The app is currently Hybrid Legacy + React/TypeScript.
- static/app.js is still runtime source.
- The repo-root `packages/ui` is the target shared UI package; `storyboard-system/packages/ui` is the current mature Legacy implementation.
- Do not create a parallel shared component library.
- Do not edit generated workspace-v73 files as the primary source.

PRODUCT SAFETY
- Do not add features during UI refactoring.
- Do not remove current product behavior.
- Do not restore removed behavior.
- Compact/Professional mode has been removed. Never recreate it.
- Do not recreate removed view-switch controls.
- Do not introduce new approval/client-review workflows.
- Preserve Word-style audit, comments, revisions, versions and compare.
- Do not add visible AI UI unless explicitly requested.
- i18n may be prepared without adding a language switch UI.

SHADCN
- Use shadcn/ui as the primary visual baseline.
- Preserve shadcn radius.
- Preserve shadcn Card proportions and base spacing.
- Do not compress spacing to simulate professionalism.
- Inspect both UI packages and migrate reusable Legacy primitives into the repo-root `packages/ui` before creating new ones.
- Prefer existing Radix/shadcn overlay behavior.

STATE
- Selection and Inspector are independent.
- Selection must not implicitly reopen Inspector.
- Project Hub must not retain project Inspector/Selection.
- Focus, selected, active, hover and editing are separate states.
- Never use focus ring styling as generic selection styling.

LEGACY
- Audit DOM owner, State owner, Event owner and CSS owner first.
- Do not solve architecture bugs with global CSS.
- Do not add V2/New/Final duplicate components.
- Do not use setTimeout to hide state bugs.
- Do not restore old functionality just because legacy code still exists.

DATA
- UI components must not bypass existing save/revision/conflict behavior.
- Preserve active-editor flush and drafts.
- Preserve 409 conflict semantics.
- Never hide server validation errors.
- Never simplify Lighting data to hide persistence-contract problems.

MOTION
- Motion is short, subtle and functional.
- Idle UI remains mostly still.
- Only loading may loop continuously.
- Respect prefers-reduced-motion.
- Avoid bounce, large scale and full-page blur.

ICONS
- One shared icon system.
- Generic UI uses Lucide-style icons.
- Film/lighting domain objects use FRAMEFORGE technical SVG glyphs.
- Do not mix unrelated icon systems.
- Dynamic icons must reflect real existing state only.

GRAPHICS
- Graphics communicate real media, layout, status or spatial meaning.
- Do not add decorative SaaS illustration.
- Do not draw fake waveform or fake analytical data.
- Technical graphics must stay neutral, precise and readable.

QA
- Distinguish external browser automation overlays from app UI.
- Verify shadcn radius and Card proportions.
- Verify Project Hub, Table, Inspector, Review, Assets,
  Narration, Moodboard, Lighting, Column Manager and PDF.
```

---

# 154. 最终定义

FRAMEFORGE 的组件库不是一组统一的 Button、Card 和 Input。

而是：

> **一套把视觉、状态、焦点、Inspector、浮层、动效、图标、技术图形和 Legacy→React 迁移边界统一起来的 UI 操作系统。**

它最终应该让 Codex 每次修改都能明确回答：

```text
我在改什么？
谁拥有这个 DOM？
谁拥有这个状态？
谁拥有这个事件？
谁拥有这个 CSS？
有没有已有组件？
有没有改变业务？
有没有恢复已删除功能？
有没有绕过保存链？
有没有破坏 shadcn 圆角？
有没有压缩 Card？
有没有错误地把"专业"理解成"更挤"？
这个动态图标对应真实状态吗？
这个图形是否表达真实数据？
```

只有这些问题都有明确答案，修改才算完成。