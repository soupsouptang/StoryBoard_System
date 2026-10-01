# FrameForge UI 与迁移问题清单（2026-09-30）

## 2026-10-02 当前优先检查点

本地已同步 `origin/master @ 2fde7c4f6313e7b9c7d07ffeed2083c00045e1a9`，在隔离本地合成数据中完成桌面1440×900现状采集。**结果未通过**：[逐模块问题与13张新截图](DESKTOP_UI_AUDIT_2026-10-02.md)。下面旧版本、测试数量和缺失概括仅保留为历史，不覆盖当前证据。

新规范见 [功能/UI/动画计划](../FEATURE_UI_PLAN_2026-10-02.md)、[数据库/迁移计划](../UI_DATABASE_PLAN_2026-10-02.md)、[工程 PDF QR/DM 协议](../ENGINEERING_PDF_PROTOCOL.md)、[可复用桌面验收流程](../DESKTOP_UI_ACCEPTANCE.md)。计划不等于实施完成。

明确整改：基础列默认、预设手动添加、无批注隐藏整列；取消归档，只保留删除和永久删除，删除保留快照、永久删除确认后清除历史值；自定义/自动列宽与行高，禁止列高选项，共享视图全员同步；保留整行照片项目入口；适用交互均设计动画，不新增 Reduced motion 模式。业务功能/字段不能因换 shadcn 控件而减少。核心缺口仍有镜头右键完整动作、完整Inspector、时间线图片预览、PDF/Word/工程、水印、情绪板/灯光/旁白TTS及协作权限。

此次未改服务器或部署，公开截图仅合成UI，密码/IP/真实工作簿不上传。

镜头剪贴板最新决定：不提供duplicate独立动作；Ctrl/Cmd+C复制，Ctrl/Cmd+V默认向下粘贴；右键菜单分别提供“向上粘贴”和“向下粘贴”。输入框内使用原生文本复制粘贴。此决定覆盖历史菜单方案的复制镜头/剪切条目。

## 2026-10-01 用户 24 图基线追加

最新逐图审计和整改见 [SCREENSHOT_BASELINE_2026-10-01.md](SCREENSHOT_BASELINE_2026-10-01.md)，优先于下方历史概括。本轮只看用户截图，不再操作真实站点，不改服务器/部署，不评测缩放/窄屏。Golden SHA 仍是 `5e86a0bb11a20ecd631d9c2af66260a73d7c92e7`。

重点补齐：主/辅制作方式分组、既有制作概览、完整 Inspector/多画面、六种 PDF 版式与全部交换/备份入口；整改 VNext 素材页固定元数据、占位卡、未接上传和未接分类过滤。Review 应保留图中媒体中心三栏与提交修订入口，服务语义单独映射。24 张原图固定留本地并建立哈希索引；因浏览器书签含本地地址信息，本次不将原图公开。

## 2026-10-01 重新审计更正（优先于下方历史检查点）

完整设计与实施路线见 [shadcn/ui 全量重设计计划](../SHADCN_UI_REDESIGN_ROADMAP_2026-10-01.md)。本轮已同步 master `ae623181d6fb9e5a1ac79c238207c693082f89db`；以下旧 HEAD 与测试数字仅是历史记录。

- 上轮将旧版逐镜头“提交意见 / 同意 / 驳回”无条件列为必须恢复，结论过强：组件总规范 §6 存在后续审批流程限制。确定保留的是评论、版本、差异与逐条接受/拒绝修改；旧审批状态的动作映射待核，不直接新增审批按钮。本更正覆盖下文对应的恢复要求。
- Review 回复/引用已有消费者且已进入 master；项目封面媒体也已接入。不得继续把它们泛称为缺失；真实浏览器对等仍待验收。
- 本轮恢复的新建镜头仍存在 32px 按钮覆盖、场次名称由 ID 拼接、镜号按数量计算与弹窗初始化需核对的问题，只算入口恢复。
- 留存三张图像为 1440×1000；不能作为 1440×900 新版本验收通过证据。此次仅复核旧截图与代码，当前仍 BLOCKED_VISUAL。
- 路线包含全模块控件、动效、数据合同、分阶段门槛；当前仅桌面先行，窄屏/手机继续暂缓。

## 用户确认的方向

当前问题包括功能缺失、设计简陋、偏离原方案和原定文案。必须以原定产品基线及后续明确决定恢复功能、信息层级和样式意图，使用根 @frameforge/ui 中的 shadcn/Radix 重构底层。不能只改色、只补截图，或用自行设计的简化页面替代产品。

参考：5e86a0b 功能基线、FRAMEFORGE_COMPONENT_LIBRARY_CODEX_MASTER.md、SHADCN_UI_BASELINE.md、UI_CONSISTENCY.md。用户最新指令优先于任何对基线的旧解释。已经明确移除的产品概念不得复活。

## 核查基线

远端 master（2026-10-01 拉取后）：`af467cb9f7ba3b02f048d62d9e606b4df4a0078e`。当前集成分支：`integration/ui-backend-check-20261001`；本轮记录前 HEAD：`01732b4e7e2e3aaa6b72d8acbb8976902a595cac`。仓库默认主分支是 `master`。

当前迁移必须同时遵守两条独立基线：

- **功能基线**：`5e86a0bb11a20ecd631d9c2af66260a73d7c92e7`。它决定哪些页面、入口、信息、交互、状态和数据能力必须保留。
- **视觉基线**：shadcn/ui `new-york` + neutral semantic palette，统一 owner 为 repo-root `packages/ui` / `@frameforge/ui`。它决定控件几何、圆角、层级、间距、表单、Card、Dialog、Popover、DropdownMenu、focus 与可访问性表现。

固定规则：`5e86a0b decides WHAT survives; shadcn decides HOW the new UI is presented.` 仅导入 `@frameforge/ui`、仅改色或重新画一个更简化页面，都不能视为 shadcn 重构完成。

本公开清单只记录产品与迁移工作，不包含本地密码、IP、环境文件、用户素材或详细安全审计内容。完整内部审计留本地。

## 当前问题与交付门槛

| 模块 | 当前事实 | 下一步 |
| --- | --- | --- |
| Shell / Projects | 已接共享组件，但原层级、功能入口、文案和移动端仍需逐项对照 | 按原方案恢复，保留真实 API 操作；五尺寸深浅色渲染 |
| Shot Table | 选择/Inspector 分离、行内编辑、列管理、分组、Saved Views 已存在；本轮恢复主工具栏可见的 `新建镜头` shadcn Primary Button，并挂回真实 `NewShotModal` | 继续按功能基线逐项恢复入口与原交互；桌面 1440 先验收表格层级、密度、截断、sticky、工具栏和右侧组织 |
| 菜单与列管理 | 已接共享 Popover/DropdownMenu | 对照原动作清单；窄屏碰撞、关闭、焦点返回；无假回调 |
| 编辑草稿 | changedFields、服务器 revision 和冲突输入保留已实现 | 中文 IME、双窗口、切换/关闭、失败后重试 |
| 自定义列 | 最新远端已有创建/编辑/类型/隐藏/归档/恢复/永久删除和值编辑 | 旧视图/缓存不复活已删列；类型转换与并发验证 |
| Review | 评论与版本/分支/恢复/合并已有消费者，但当前页面被重写成版本中心的大卡片组合；基线要求的逐镜头审阅决策入口缺失 | 恢复逐镜头 `提交意见 / 同意 / 驳回` 审计流程和原审阅阅读层级；全局 approval dashboard 仍保持移除，不能把版本 accept/restore/merge 当成审阅决策替代品 |
| 媒体封面 | API 已有 cover_media_id，前端仍是 monogram fallback | 真实媒体 resolver 与图片消费/失败回退 |
| 上传 | 历史手机有类型不一致报错，具体样本原因未确认 | 复现输入/转码/元数据链，保留合法校验 |
| PDF / 导出 | SRT/EDL/OTIO/CSV 已接真实下载 | 核对现有 VTT PR；PDF/Word/工程往返独立迁移 |
| Canvas / Moodboard / Lighting | Legacy 能力仍在，canonical 未完成 | 保存/加载/触屏/生命周期真实接管后再移除旧 owner |
| 导入 | 目标 preview/commit 不能替代全部旧合同 | XLSX 嵌图、原始列、append/update/replace、原子回滚 |
| Trash | Shot 生命周期已有 service；不能等同 Project Trash | 分别验证项目/镜头范围与真实保留策略 |
| 架构迁移 | 多个旧/新 owner 尚并存 | 明确真实消费者与切换门槛，PostgreSQL 隔离演练 |
| 迁移文档 | Owner/Workstream 的部分状态落后于最新自定义列和分组实现 | 按同一 SHA 同步，禁止仅改文档宣布完成 |
| 自动化 / PR | 已有多个重叠治理 PR 待审 | 保留有效增量，修复冲突，Branch→PR→检查→合并 |

## 本轮已验证与限制

- Shot PATCH/Bulk/Reorder 轻量合同测试 10/10 通过。
- Shot Trash 轻量合同测试 2/2 通过。
- 上述不等于完整数据库、PostgreSQL 并发或真实浏览器验收。
- 未部署，未访问或修改生产数据。
- **2026-10-01 当前视觉验收状态：`BLOCKED_VISUAL / FAIL`。** 不能声明 Visual PASS、Migration Complete、CUT_OVER、CUTOVER_READY 或 Ready to Merge。
- 用户最新门槛为 **桌面优先**：当前先只验收 1440×900 核心页面；1024/768/375/320 的窄屏与移动端 QA 暂后，直到 Shell / Project Hub、Shot Table、Inspector、Review 四个桌面核心面均通过。
- 桌面 1440 已确认问题：Shot Table 的层级、密度、文本截断和右侧组织仍显粗糙；Inspector 必须继续与 selection 分离并维持约 380px 桌面目标；Review 缺少逐镜头 `提交意见 / 同意 / 驳回`，且当前版本中心构图偏离接受的审阅层级。
- 没有 document 横向滚动、构建成功、组件来自 shadcn，均不等于视觉合格。
- 全量重构时，只清理有零消费者证据的旧实现；仍服务真实功能的 Legacy 不是可直接删除的残留。

## 2026-10-01 桌面视觉检查点

当前桌面收敛顺序固定为：

1. Shell / Project Hub
2. Shot Table 主工具栏与表格主体
3. Inspector
4. Review

本轮已落地但尚未宣称通过的代码修改：

- `apps/web/app/(workspace)/production/[id]/shots/page.tsx`
  - 恢复主工具栏可见的 `新建镜头` Primary Button；
  - 使用现有 workspace store 打开真实 `NewShotModal`；
  - 为弹窗提供当前 production、从现有 shots 推导的 sequence 列表和下一镜号。
- `apps/web/app/(workspace)/production/[id]/review/page.tsx`
  - 保留 `getCommentReferences` 的类型收窄修复，避免在未明确元素类型时直接对数组结果 `.filter()` 造成类型问题；该修改不改变产品行为。

当前 1440 视觉证据固定保存在仓库，不删除：

- `storyboard-system/docs/audits/visual-evidence/2026-10-01/productions-1440.png`
- `storyboard-system/docs/audits/visual-evidence/2026-10-01/shots-1440.png`
- `storyboard-system/docs/audits/visual-evidence/2026-10-01/review-1440.png`

这些截图是当前失败/对照证据，不是通过基线。

Review 语义必须按功能基线恢复：`Ready for Review` 对应逐镜头“提交意见”；选中 revision 后可执行“同意 <revision>”或“驳回 <revision>”。历史 `shot_versions.py` 还明确区分 `提交意见 / 撤回意见 / 同意意见 / 驳回意见`。全局审批看板已移除这一产品决定继续有效；两者不能混为一谈。

## 模块推进和 Git 同步规则

每模块先比对原能力/设计与当前实现，明确独占文件；实现并运行受影响检查后立即上传独立分支/PR。协调者审查当前主分支差异和 Actions，合并可接受修改，再同步本地。构建通过不自动等于视觉完成，未验收范围保留准确状态。

六个原协作聊天继续参与：手机布局与 UI 统一、右键菜单与焦点迁移、工程 PDF 二维码、2D/3D 画布交互与触屏、工作目录卫生、并行工作簿。实施使用非 Astra 执行者，主协调负责集成与回归，避免多个执行者改同一文件。
