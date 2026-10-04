# FRAMEFORGE Component Library / Motion / Icon / Graphics Master Specification
## Codex 执行总规范 · shadcn/ui 基线 · 当前实现审计合并版

> Status: ACTIVE UI REFACTORING CONTRACT
> Audit Date: 2026-09-29
> Architecture truth: current `master` + `ARCHITECTURE.md`
> Visual / component baseline: **shadcn/ui**
> Canonical executable visual baseline: **`SHADCN_UI_BASELINE.md`**
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

视觉比例、Shell、颜色、primitive 几何、Table/Inspector 层级与浏览器验收，以 `SHADCN_UI_BASELINE.md` 为直接执行基线；本文件继续负责更完整的组件库、Motion、Icon、Graphics 迁移规则。

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

# 0.1 UI 全量重构执行约束（2026-09-30 用户明确纠正）

**当前 UI 的问题不只是测试不足：还包括功能点缺失、设计简陋、偏离原计划/原样式/既定文字，以及把组件迁移做成自行重写产品。以下规则优先于本文旧审计中的乐观状态与任何相反解释。**

## A. 重构对象与禁止事项

shadcn/Radix 是根 `packages/ui` 的底层实现方式，不授权 Agent 重新决定产品的信息架构、工作流、布局层级或文案。恢复原定 FRAMEFORGE 设计意图；替换技术实现，保留经确认的产品行为。

- 不得以“现代化”“简化”“统一风格”“先搭架子”为理由减少字段、入口、菜单项、媒体表达、版式预览或操作反馈。
- 不得把原工作面替换为通用 dashboard、功能卡片总览、空页面、纯文字占位、假成功提示或另造导航。
- 不得仅完成 token/颜色/圆角/图标替换，就宣称原模块已重构完成。
- 不得因 canonical API 尚缺而直接删除旧能力；记录缺口、保留有效旧 owner，再迁移真实调用链。
- 不得把旧 CSS 全量复制成新页面的覆盖层；也不得借“不复制 CSS”否定原设计的比例、层级、内容、字体、媒体和文案。
- 不恢复已明确移除的精简/专业模式、旧 View Switch、全局审批看板或 AI UI。
- 原定字段名、操作名、顺序、箭头语义与当前状态反馈须有来源，不自行换为泛化营销文案或另一套中英混排。

## B. 每模块必须先建立功能点对照

每个可见模块的改动记录至少包含以下列；一行是一个真实用户任务，不能用“表格”“审阅”等大标签掩盖缺项。

| 功能 ID / 用户任务 | 原入口与设计来源 | 原交互 / 文案 / 布局 | 当前真实 owner / consumer | 本段恢复内容 | 未齐能力 / 依赖 | 证据 / 未验证范围 |
| --- | --- | --- | --- | --- | --- | --- |
| 示例：表头隐藏列 | 原表头菜单与列管理 | 隐藏后可从列管理重新显示，原文案不变 | canonical Table → shared menu → layout owner | 替换为共享组件并保留实际回调 | 不等同归档或永久删除 | 提交与检查状态，未测明确注明 |

覆盖：打开入口、读取数据、编辑/选择/拖动、保存/取消、失败/冲突/重试、键盘/IME、窄屏可达、加载/空/错误、关闭清理、刷新后持久化。被明确删除的功能记录删除依据；未实现项不能静默从表中消失。

## C. 全量模块审计范围

| 模块 | 不得遗漏的原能力与设计关系 |
| --- | --- |
| Shell / Project Hub | 品牌、既定文字、主题/语言语义、紧凑工程行、封面/元数据/状态、真实项目操作、返回全部工程时清理工程态 |
| Shot Table / Toolbar | 镜号/缩略图/时码/内容层级、搜索/筛选/排序/分组、多选、真实批量操作、前后插入/复制等原动作逐项归档，不因无回调直接判不需要 |
| Column Manager / Context Menu | 列宽/顺序/显隐/换行/行高、字段隐藏与归档/永久删除区别、恢复入口、Saved Views、键盘焦点与原动作文字 |
| Inspector / Inline Edit | Selection 与详情分离、原字段分组、只提交修改字段、草稿/冲突/重试、IME、窄屏保存区可达 |
| Storyboard / Timeline | 真实媒体、镜头顺序、时码/时长、播放/定位、现存操作，不恢复已移除的统一 View Switch |
| Review | 原审阅阅读结构、批注/回复/引用、版本历史、Before/After、Word 式差异与逐条处理；不是审批 OA |
| Assets / Media | 真实缩略图、类型、loading/missing/unsupported/failed 状态与恢复；不能用黑块替代媒体能力 |
| Narration | 镜号—文本—时长—状态关系、原对齐/锁定能力，复用原计时合同 |
| Moodboard / Lighting | 原工具库/画布/Inspector/菜单/保存、2D/3D/触控、完整场景字段与生命周期；不因换 UI 重写渲染器或丢对象数据 |
| Import | Preview→Mapping→Validation→Commit、原始列/特殊字符/嵌图/模式与回滚 |
| Export / PDF / Word | 原格式、真实版式缩略预览、导出选项/文件名/下载/工程往返，不用文字方块冒充版式 |
| Share / Trash / Settings | 真实权限与数据范围、恢复/永久删除/保留策略、原设置；已存在后端不等于前端功能已接通 |

## D. 原样式意图与组件边界

保留 Satoshi / 更纱黑体、read-first 表格、媒体优先、工程列表层级、工作面与 Inspector 空间关系、neutral 表面层级和克制动效。共享 Button/Input/Select/Dialog/Popover/Menu 的形态与行为统一，不新建页面专属组件库。原设计层级与 shadcn primitive 的实现冲突时，调整组合方式，不能牺牲功能或自行改产品。

UI 是真实产品面，不向用户展示 migration owner、mutation contract、revision 内部算法等实现说明；只在用户需要判断保存/冲突/覆盖结果时解释具体影响。

## E. 无残留的定义与删除证据

“全量重构不留残留”指已替换模块不再保留竞争性的旧事件、状态、CSS、图标、假入口或无消费者组件；不等于清空 Legacy 目录。

每项删除须记录：原路径、静态/动态消费者、入口与构建/发布引用、替代 owner、替代功能对照、删除条件及恢复方式。运行数据、密码、IP、环境文件、用户媒体与备份不上传、不作为残留清理。替代能力未完整时旧 owner 仍属迁移依赖，必须明确登记；不能同时宣称已退役。

## F. 小段上传与完成状态分离

当前用户要求：每小段改完跳过测试立即上传。执行时完成最小连贯改动与范围核对后立即提交分支/PR，注明“本段未运行测试/构建/浏览器验收”；不把等待测试作为上传前置。后续只有用户授权或要求恢复验证时才重新安排本轮跳过的测试。

该指令不等于“未经验证就是通过”，也不要求删除 GitHub 现有自动化。`INTEGRATED_NOT_CUT_OVER` / `BLOCKED_VISUAL` 等状态保留真实含义；上传、代码合并、功能验收、视觉验收和生产切换分别记录。主协调审查最新主分支差异与重复 PR，避免整分支覆盖已恢复功能。

## G. 防止多聊天反复回退

一个模块指定一个写入者；其他聊天只审阅或在互不重叠文件实施。先同步远端与当前工作区，再读本总规范、最新用户决定和功能对照。交付必须列出具体恢复功能、保留项、删除项、真实消费者、未齐项和提交。不得使用旧工作簿中的 BLOCKED 推翻当前已存在的 canonical 实现。

本总规范记录稳定执行规则；当前缺口与执行分工分别维护于 `audits/CURRENT_UI_MIGRATION_2026-09-30.md`、`audits/UI_RECOVERY_PLAN_2026-09-30.md` 与 `ACTIVE_WORKSTREAMS.md`。

---

# 0.2 历史实现审计快照（2026-09-29，非当前完成声明）

以下保留 2026-09-29 的历史审计上下文；不能用它覆盖后续代码、当前迁移矩阵或用户明确决定。诸如“仅登录页消费”“根 Dialog 尚待迁移”等旧描述须以当前真实消费者核对。

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
