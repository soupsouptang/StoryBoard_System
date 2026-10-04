# UI primitive parity ledger

## 2026-10-04 工具栏业务组合

沿用原Button/Input/Icons/Dialog及导航Link，没有增加primitive/依赖。表格compact删除与浅色取消统一100×36px/8px圆角；20px高短竖线两侧各20px。焦点滚入限定当前工具区，确认窗继续由共享Dialog负责Esc/焦点。五宽度真实验收通过。 [实施与验证](SHOT_TOOLBAR_2026-10-04.md)。

## 2026-10-04 图片历史按钮共用

沿用现有Button/icon-sm与Icons.Undo2/Redo2，两个入口只调用ShotImagePreview中的同一组业务控件；没有新增primitive/图标库。Dialog继续负责Esc/外部点击/焦点，历史按钮和快捷键由该业务组件统一分派，五宽度真实可见。[记录](SHOT_FRAMING_2026-10-04.md)。

## 2026-10-04 详情保存状态组合

ShotDetailCard局部状态组合新增aria-hidden绿灯并沿用role=status，颜色/字重按明确用户要求覆盖；删除按钮复用Button/Icons.Trash2，显式普通及dark颜色确保主题一致，几何尺寸不变。未改共享primitive/主题token/依赖；错误Dialog继续拥有关闭/Esc。五宽度真实渲染及保存反馈验证通过。[记录](SHOT_DETAIL_2026-10-04.md)。

## 2026-10-04 载入原图

载入原图复用已导出的Icons.Image及现有Button；Dialog仍独占Esc/窗外/层级，不新增primitive或依赖。业务组合保持居中胶囊及左右同排按钮，五宽度渲染验证通过。 [实施与证据](SHOT_ORIGINAL_FIT_2026-10-04.md)。

## 2026-10-04 构图预览基础组件

packages/ui显式Icons加入Minus/Redo2，复用Plus/Lock/Download/RefreshCw/Undo2。Dialog/Radix继续独占层级、Esc、窗外关闭及焦点返回；Button沿用既有尺寸/variant，胶囊为业务组合，不造第二套primitive。截图及五宽度检查通过；原生drag/wheel实机门槛仍待。[记录](SHOT_FRAMING_2026-10-04.md)。

## 2026-10-04 详情图片缩放图标消费

UI-root仅显式追加Lucide ZoomIn/ZoomOut导出，真实ShotImagePreview通过Icons消费；不新增图标库或业务primitive。详情/预览继续使用既有Button/Input/Select/Checkbox/Dialog，焦点、Esc和reduced-motion沿用共享owner。新增inline卡片是apps/web局部feature，未冒充全站primitive cutover；本轮五宽度、键盘/菜单验收和未取得的文件操作证据见[记录](SHOT_DETAIL_2026-10-04.md)。


更新基线：2026-10-02。**视觉/primitive 基线是 [SHADCN_UI_BASELINE.md](SHADCN_UI_BASELINE.md) 所定义的 shadcn/ui `new-york` + neutral semantic theme；功能/交互基线是 `5e86a0b`，实现目标是当前 `master`。** Legacy primitive 只作行为参考，不要求 VNext API/component 兼容，也不要求旧工作区改为消费根包。VNext 以 shadcn/Radix 的视觉、focus、overlay 和 accessibility 语义原生重建，不复制 Legacy CSS。

| Primitive | Old owner / L 消费数 | New owner / V 消费数 | API compatibility | Visual compatibility | Focus behavior | Accessibility | Tests / evidence | Cutover |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Button | Legacy / 4 | root / 3（登录、项目列表、交付页） | `variant`、button props、默认 type 对齐；shadcn variant 体系 | 语义化 neutral 尺寸、间距、hover/active 已入根 CSS | focus-visible 外边框清晰 | 原生按钮、aria-disabled | V-Web build；320/375/1440 浏览器点击 | INTEGRATED_NOT_CUT_OVER |
| IconButton + Tooltip | Legacy / 3 | root / 0 | `label`、按钮 props；根包 Radix tooltip | 根包 tooltip 基础样式已入 | Radix 触发与关闭待浏览器验证 | aria-label + tooltip | 根 UI build；无 V 消费场景 | IMPLEMENTED_NOT_INTEGRATED |
| Input | Legacy / 3 | root / 2（登录、新建项目） | HTML input props/ref 对齐 | 根包 neutral 边框、填充、禁用、错误、placeholder | focus-visible 可见 | Field 标签关联 | V-Web build；登录/新建项目实测 | INTEGRATED_NOT_CUT_OVER |
| TextArea | Legacy / 1 | root / 0 | HTML textarea props/ref 对齐 | 根包 neutral 样式已入 | focus-visible 代码已入 | 原生 textarea | 根 UI build；待 V 消费场景 | IMPLEMENTED_NOT_INTEGRATED |
| Field | Legacy / 3 | root / 2（登录、新建项目） | `label`/children 对齐 | 根包 grid 与 6px gap | 标签点击进入控件 | label 包裹控件 | 登录与项目表单浏览器 | INTEGRATED_NOT_CUT_OVER |
| Select | Legacy / 1 | root / 多个真实表单与筛选消费者（含 Shot 批量三个控件；历史计数未全量重算） | `label/value/options/onChange/disabled` 对齐 | 根包菜单、选项与 trigger neutral 样式 | Radix 键盘选择、Escape 返回焦点 | combobox、option、disabled | 320×568 翻转、320/375/1440 点击命中 | INTEGRATED_NOT_CUT_OVER |
| NativeSelect | Legacy / 0 | root / 0 | 原生 select 封装 | 统一表单控件样式 | 原生 focus-visible | 原生 select 语义 | 根 UI build | IMPLEMENTED_NOT_INTEGRATED |
| Card | Legacy / 手写 | root / 2（项目大厅、交付卡片） | shadcn Card Header/Title/Content/Footer | 统一 8px 圆角与 neutral 卡片边框 | 容器卡片 | 无独立可访问性障碍 | V-Web build；桌面/移动卡片测试 | INTEGRATED_NOT_CUT_OVER |
| Badge | Legacy / 手写 | root / 1（项目状态、方式） | `variant` (default, secondary, destructive, outline) | neutral 语义化微标 | 静态展示 | 状态文本 | V-Web build；项目大厅测试 | INTEGRATED_NOT_CUT_OVER |
| Checkbox | Legacy / 1 | root / 0 | Radix Checkbox primitive | neutral 边框与勾选态 | 键盘 Tab / Space 切换 | role="checkbox" | 根 UI build；待批量操作消费 | IMPLEMENTED_NOT_INTEGRATED |
| Icons | Legacy 手写 svg | root (lucide-react) / 全站 | Lucide 图标集导出 | 单一图标系统，语义化尺寸 | 无独立焦点 | aria-hidden | V-Web 全站实装 | INTEGRATED_NOT_CUT_OVER |
| Popover / DropdownMenu / Dialog | Legacy / 2 / 1 / 0 | root primitives；V 列管理/表格右键/项目创建/新镜头/废纸篓已真实消费 | Radix portal/collision/controlled open 统一；Dialog/DropdownMenu/Popover 由根包单一 owner 提供 | shadcn `new-york` 比例、neutral surface、默认 radius；不复制 Legacy overlay CSS | Escape、外点、focus return 由 Radix 承担；表格右键显式恢复触发点焦点 | dialog/menu/trigger/content 语义已接入；仍需浏览器无障碍回归 | V-Web 已有三类真实 overlay consumer；代码构建证据已有，1440/375/320 rendered focus/collision 尚待 | INTEGRATED_NOT_CUT_OVER |

Legacy 同名包不再需要迁到根包或保持 API 兼容。根 `packages/ui` 只需满足 VNext 真实消费者、浏览器焦点/可访问性/视觉测试；Legacy runtime 退役时可一并删除旧 UI 包。便携工程 exporter 若不依赖该 UI 包，不构成保留理由。
