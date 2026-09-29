# UI primitive parity ledger

更新基线：2026-09-29。**视觉/primitive 基线是 [SHADCN_UI_BASELINE.md](SHADCN_UI_BASELINE.md) 所定义的 shadcn/ui `new-york` + neutral semantic theme；功能/交互基线是 `5e86a0b`，实现目标是当前 `master`。** 旧 owner 是 `storyboard-system/packages/ui`；新 owner 是仓库根 `packages/ui`。迁移时保留 `5e86a0b` 的真实能力，但以 shadcn/Radix 的视觉、focus、overlay 和 accessibility 语义重建，不复制 Legacy CSS。消费者数量指直接导入该控件的 TSX 模块数；V = `apps/web`，L = `storyboard-system/src/workspace`。

| Primitive | Old owner / L 消费数 | New owner / V 消费数 | API compatibility | Visual compatibility | Focus behavior | Accessibility | Tests / evidence | Cutover |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Button | Legacy / 4 | root / 3（登录、项目列表、交付页） | `variant`、button props、默认 type 对齐；shadcn variant 体系 | 语义化 neutral 尺寸、间距、hover/active 已入根 CSS | focus-visible 外边框清晰 | 原生按钮、aria-disabled | V-Web build；320/375/1440 浏览器点击 | INTEGRATED_NOT_CUT_OVER |
| IconButton + Tooltip | Legacy / 3 | root / 0 | `label`、按钮 props；根包 Radix tooltip | 根包 tooltip 基础样式已入 | Radix 触发与关闭待浏览器验证 | aria-label + tooltip | 根 UI build；无 V 消费场景 | IMPLEMENTED_NOT_INTEGRATED |
| Input | Legacy / 3 | root / 2（登录、新建项目） | HTML input props/ref 对齐 | 根包 neutral 边框、填充、禁用、错误、placeholder | focus-visible 可见 | Field 标签关联 | V-Web build；登录/新建项目实测 | INTEGRATED_NOT_CUT_OVER |
| TextArea | Legacy / 1 | root / 0 | HTML textarea props/ref 对齐 | 根包 neutral 样式已入 | focus-visible 代码已入 | 原生 textarea | 根 UI build；待 V 消费场景 | IMPLEMENTED_NOT_INTEGRATED |
| Field | Legacy / 3 | root / 2（登录、新建项目） | `label`/children 对齐 | 根包 grid 与 6px gap | 标签点击进入控件 | label 包裹控件 | 登录与项目表单浏览器 | INTEGRATED_NOT_CUT_OVER |
| Select | Legacy / 1 | root / 2（登录角色、项目模版） | `label/value/options/onChange/disabled` 对齐 | 根包菜单、选项与 trigger neutral 样式 | Radix 键盘选择、Escape 返回焦点 | combobox、option、disabled | 320×568 翻转、320/375/1440 点击命中 | INTEGRATED_NOT_CUT_OVER |
| NativeSelect | Legacy / 0 | root / 0 | 原生 select 封装 | 统一表单控件样式 | 原生 focus-visible | 原生 select 语义 | 根 UI build | IMPLEMENTED_NOT_INTEGRATED |
| Card | Legacy / 手写 | root / 2（项目大厅、交付卡片） | shadcn Card Header/Title/Content/Footer | 统一 8px 圆角与 neutral 卡片边框 | 容器卡片 | 无独立可访问性障碍 | V-Web build；桌面/移动卡片测试 | INTEGRATED_NOT_CUT_OVER |
| Badge | Legacy / 手写 | root / 1（项目状态、方式） | `variant` (default, secondary, destructive, outline) | neutral 语义化微标 | 静态展示 | 状态文本 | V-Web build；项目大厅测试 | INTEGRATED_NOT_CUT_OVER |
| Checkbox | Legacy / 1 | root / 0 | Radix Checkbox primitive | neutral 边框与勾选态 | 键盘 Tab / Space 切换 | role="checkbox" | 根 UI build；待批量操作消费 | IMPLEMENTED_NOT_INTEGRATED |
| Icons | Legacy 手写 svg | root (lucide-react) / 全站 | Lucide 图标集导出 | 单一图标系统，语义化尺寸 | 无独立焦点 | aria-hidden | V-Web 全站实装 | INTEGRATED_NOT_CUT_OVER |
| Popover / DropdownMenu / Dialog | Legacy / 2 / 1 / 0 | root primitives；V 列管理/表格右键/项目创建/新镜头/废纸篓已真实消费 | Radix portal/collision/controlled open 统一；Dialog/DropdownMenu/Popover 由根包单一 owner 提供 | shadcn `new-york` 比例、neutral surface、默认 radius；不复制 Legacy overlay CSS | Escape、外点、focus return 由 Radix 承担；表格右键显式恢复触发点焦点 | dialog/menu/trigger/content 语义已接入；仍需浏览器无障碍回归 | V-Web 已有三类真实 overlay consumer；代码构建证据已有，1440/375/320 rendered focus/collision 尚待 | INTEGRATED_NOT_CUT_OVER |

删除 Legacy 同名包前，必须完成根包 primitive parity，旧工作区改为消费根包，并让 `storyboard-system npm run check` 与 `apps/web build`、实际浏览器焦点和视觉测试同时通过。未达到门槛前两个 source tree 保留，禁止宣称 `CUT_OVER`。