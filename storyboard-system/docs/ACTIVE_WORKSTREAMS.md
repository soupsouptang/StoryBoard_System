# FrameForge 并行迁移工作簿

更新：2026-09-29。Git 根目录为 `referenced-chatgpt-conversation-this-is-an`；`storyboard-system` 仍是 Legacy 运行/迁移源，`apps/api`、`apps/web`、根 `packages/*` 是目标 owner。此表为当前协调账本，旧切片“本地验收”不代表目标架构 cutover。唯一 owner 和逐项门槛见 [CANONICAL_OWNER_MATRIX.md](CANONICAL_OWNER_MATRIX.md)。
| 轨道 | 会话 / 执行者 | 独占范围 | 本轮完成门槛 | 状态 |
| --- | --- | --- | --- | --- |
| Track B1：表格右键菜单 Overlay/Focus | fork `01a0e755-3e35-7583-8818-ebc16162fea7` | `#tableContextMenu` 的表头/单元格入口、owner、Escape/外点/焦点返回及对应 UI 测试；不改后端、PDF | 旧入口与重复关闭路径退出；1440/320/375 实际菜单打开、命中、滚动、关闭、焦点与层级通过 | BLOCKED；上轮 fork 失败，320px 聚焦/滚动竞态尚未通过浏览器验收 |
| Track A：目录整理 | fork `01a0e756-a1c3-7ac3-b379-b6caf148127d` | 引用与发布清单核查、`docs/WORKSPACE_HYGIENE.md`；只处理证据充分的废弃文件 | 对每个删除候选给出引用、数据归属、Git 状态和恢复依据；发布清单无遗漏 | 本轮审计完成；无安全删除项 |
| Track G：工程 PDF 小二维码 | fork `01a0e756-6e02-7723-9080-d1bb7962f712` | `project_pdf_roundtrip.py`、相关 PDF 回归；不改 UI/Shot 写入 | 长项目名不覆盖约 25 mm QR；合成 70 镜头完整 PDF 在 150/200/300 dpi 可解码；附件往返和哈希仍通过 | 本轮切片已本地验收 |
| Track C：批量 Shot 写入 | 本会话 Sol 子代理 | `shot_bulk_updates.py`、对应服务端错误映射与合同测试；不改 UI/PDF | 无效版本/字段结构化拒绝、无变化无虚假 revision；保留排序、自定义列、Panel、真实 409 与非重叠合并 | 本轮切片已本地验收 |
| Track B2：Selection / Inspector 与移动 UI | `01a0cd72-505a-7dd2-9b4f-34523054b1a2` | 详情状态、项目卡片、手机标题操作行与横滑 | 隔离源码浏览器覆盖 1440/320/374/375/390/768；最终报告已给出 | 本轮切片已本地验收 |
| Track F：2D/3D Canvas lifecycle | `01a0cd6f-2587-78d0-8ab2-1efaddb18196` | Split RAF 与卸载清理 | Canvas 浏览器回归通过 | 本轮切片已本地验收 |

并行约束：先看 `AGENTS.md` 与当前 dirty 差异；不得覆盖 `static/workspace-v73.js/css` 等现有生成产物，不用真实 Excel/PDF 测试样本进入发布包，不清理未知素材、数据或备份。各切片自行保留截图、隔离数据与失败证据；主会话在结果回来后更新状态并复核交叉变更。当前用户要求不部署。

集成门槛：核对各 owner 的旧路径是否确实删除；运行受影响的后端合同与浏览器交互测试；核查 1440/320/375 视觉和点击命中；检查发布清单、生成物与 dirty 工作树；然后再决定是否形成可部署候选。整体 React/Legacy 迁移与旧路径退役仍未完成。

## 2026-09-28 已核实的集成证据

- 单镜头与批量 Shot 命令边界：`test_shot_updates` 7/7、`test_backend_integrity` 17/17、`test_system` 8/8；Review 隔离浏览器测试完整通过。无变化不生成虚假 revision/event/snapshot，实际 409 与非重叠合并保留。
- UI 会话在恢复旧版紧凑首页卡片后，双浏览器协作 QA 已跑通保存与合并主流程；Windows IME 真实输入仍未在 headless 环境验证。
- Canvas 未失焦文字的 Ctrl/Cmd+S 已经隔离 Chrome 验证：提交字段后保存 Board，立即刷新内容保留，且不额外触发 Shot PUT。
- 工程 PDF 只读容量审计发现长项目名曾遮挡约 25 mm QR；Track G 已修正版式并完成扫码回归。
- 原目录卫生 fork `01a0e755-c229-7b83-b1e9-3a59d5538eb1` 在继承的协调 turn 中因用量中断，未提交目录改动；已由上表新 fork 接替。

- 工程 PDF 小 QR：合成 70 镜头、9/24/64 汉字与 64 ASCII 项目名在 150/200/300 dpi 的 PDFium + ZXing 实扫均解出 1 码；72B UTF-8 名称预览保持完整标题在正文与附件，`k=FFPDF1` 与 SHA-256 一致。

- 目录卫生复核未发现新的安全删除对象；旧 `frameforge-release-20260926-2213-4b7a7d03.zip` 缺当前工程 PDF 模块，属于过期包，不可作当前发布候选。保留理由与后续门槛见 `docs/WORKSPACE_HYGIENE.md`。
## 2026-09-29 Convergence & Cutover

| 里程碑 | 当前证据 | 状态 | 下一门槛 |
| --- | --- | --- | --- |
| M0 文档事实与根 AGENTS | 根规则从误追加的 Legacy AGENTS 分离；架构/生命周期/组件规范按并行实现与运行 owner 修正 | VERIFIED（本轮文档盘点） | 新增切片持续按 owner 矩阵同步 |
| M1 Canonical Owner Matrix | [矩阵](CANONICAL_OWNER_MATRIX.md) 已覆盖 HTTP、持久化、AI/Presence、Workspace 及 UI | VERIFIED（盘点） | 各切片按真实调用链更新状态 |
| M2 `@frameforge/ui` 收敛 | shadcn/ui 为视觉/primitive 基线；`5e86a0b` 为功能基线。根包已有表单/Card/Checkbox 及 Dialog/Popover/DropdownMenu；项目创建真实消费 shared Dialog，Shot Table Column Manager 消费 shared Popover；Legacy 同名包仍供旧工作区使用 | INTEGRATED_NOT_CUT_OVER | 继续迁真实 Menu/Tooltip/Motion consumers，完成 overlay focus/collision/视觉与双消费者构建后再移除 Legacy 同名包；见 [primitive 表](UI_PRIMITIVE_PARITY.md) |
| M3 API/持久化 | `apps/api` 已有路由/SQLAlchemy；[路由对等表](API_ROUTE_PARITY_MATRIX.md) 已建立；V-Web 已真实消费 SRT、VTT、EDL、OTIO、CSV 导出并有测试覆盖；Legacy `server.py` 仍是服务配置入口，第二 FastAPI 树并存 | IMPLEMENTED_NOT_INTEGRATED（整体；导出子项已集成） | 路由/事务对等、真实 PostgreSQL 隔离集成、旧 owner 退出 |
| M4 Web 视图 | `apps/web` 有部分可挂载视图；Legacy `WorkspaceStage` 未从入口挂载 | IMPLEMENTED_NOT_INTEGRATED | 一个视图完成 render/state/request/mutation/save owner 接管 |
| M5 AI | VNext mock/proposal 为进程内；无持久 Job/真实 Web 消费；接受路径未走普通 Command | BLOCKED | 禁用零外发、provider/job/proposal/人工接受合同 |
| M6 Presence | VNext service 仍为进程内；canonical V-Web consumer 已主动断开，Redis/WS auth 尚未完成 | BLOCKED | authenticated WS、Redis TTL/pubsub、session_id、多 worker 与重连验收后才能重新接 UI |
| M7 PostgreSQL | GitHub Actions 已在隔离 PostgreSQL 16 上验证 empty→Alembic head；本维护分支继续增加 `alembic check` 与 downgrade→re-upgrade 门禁。真实 SQLite 数据副本迁移与业务写切换尚未发生 | IMPLEMENTED_NOT_INTEGRATED | SQLite 副本迁移、事务/业务集成、引用/媒体核验与回滚演练 |

旧 2026-09-29 “完整 AI/Presence/React”等记录属于实现切片的历史笔记，不能作为当前 cutover 证据。`VNEXT_PROGRESS.md` 已将历史“READY FOR RELEASE”撤出当前状态。当前未部署，也未接触生产数据。未完成的路径继续保留 Legacy owner，不删除迁移源。

本轮代码与验证记录见 [VNEXT_PROGRESS.md](worklogs/VNEXT_PROGRESS.md)。M2 只接入了登录页四种根控件；Legacy UI 包未退出，`apps/web` 全站尚未共享控件化。M3 的 SRT/VTT/EDL/OTIO/CSV 已有 V-Web 真实下载入口，但 Legacy 仍为生产服务配置入口；分享与注册是有测试的局部修复，其他路由与持久化收敛仍是下一门槛。


## 2026-09-29 Regression Stabilization

Current implementation target: `master`. Product behavior reference: `5e86a0b`, overridden by later explicit user decisions.

| Slice | Current evidence | Status | Next gate |
| --- | --- | --- | --- |
| Shot PATCH contract | V-Web sends changed fields; server revision is authoritative; `ShotService` suppresses no-op writes and now emits actor-scoped `AuditLog` rows for real mutations | INTEGRATED_NOT_CUT_OVER | immutable version/history plus Panel/asset/custom-field convergence |
| VNext bulk Shot contract | V-Web now sends per-shot server revisions; V-API validates the whole batch before mutation, rejects stale rows with 409, and suppresses no-op revision bumps | IMPLEMENTED_NOT_INTEGRATED | add the baseline bulk-action UI plus Panel/custom-field/audit semantics before real consumer cutover |
| VNext Shot reorder contract | V-API reorder now requires production scope, the complete active-shot set, exact client base order and all revisions before mutation; V-Web hook sends the same contract | IMPLEMENTED_NOT_INTEGRATED | wire canonical drag/reorder consumer; add collaboration lease plus snapshot/audit and rendered-browser parity before cutover |
| Inspector draft safety | dirty drafts are preserved per Shot and rebased after a 409 refresh | INTEGRATED_NOT_CUT_OVER | browser regression for switch/refetch/conflict/close on desktop and narrow widths |
| Inline edit | description/voice-over use real V-API PATCH and preserve input on conflict | INTEGRATED_NOT_CUT_OVER | expand field coverage and browser/keyboard conflict QA |
| Mobile Shot table | table owns horizontal scroll, first columns are sticky, Inspector overlays on narrow widths, `100dvh`/safe-area added | BLOCKED_VISUAL | real 1440/1024/768/375/320 rendered inspection |
| Presence | V-Web TopBar consumer disconnected again | BLOCKED | authenticated WS + Redis TTL/pubsub + multi-worker before reconnecting UI |
| Project entry | unauthorized feature-card overview replaced by redirect to selected Shot workspace | VERIFIED | keep IA aligned while recovering remaining baseline capabilities |
| Project cover | deterministic monogram/gradient fallback only; no fake media URL | INTEGRATED_NOT_CUT_OVER | canonical cover media read model + media resolver |
| Shot Trash | soft delete/list/restore/purge flow through `ShotService`; trash/restore advance revision, lifecycle mutations emit audit rows, and UI keeps purge explicitly irreversible | INTEGRATED_NOT_CUT_OVER | immutable history and any real retention policy before further promotion |
| Visual warning state | shared warning tokens and Tailwind mapping restored | IMPLEMENTED_NOT_INTEGRATED | verify conflict/dirty states in light/dark browser renders |

Do not begin Narration, Moodboard, Lighting, or wider product recovery until this stabilization slice has passed CI and the Shot workspace has fresh rendered-browser QA.

## 2026-09-29 V-Web UI parity recovery

| Slice | Current evidence | Status | Next gate |
| --- | --- | --- | --- |
| Project Hub hierarchy | Real deterministic cover fallback remains; mobile/desktop cards now preserve compact cover hierarchy and accessible open affordance | INTEGRATED_NOT_CUT_OVER | real cover-media resolver plus fresh dark/light browser comparison |
| Brand / utility controls | Login, Hub and Workspace now share the Film mark plus Lucide Sun/Moon theme semantics; locale controls use the same target-language labels | INTEGRATED_NOT_CUT_OVER | rendered dark/light verification; do not treat source parity as visual acceptance |
| Shot selection + table toolbar | Selection stays separate from Inspector; Shift range, Ctrl/Cmd toggle, explicit Details action, real search/filter/sort and atomic bulk toolbar coexist on the canonical page | INTEGRATED_NOT_CUT_OVER | browser keyboard/pointer regression and conflict-path QA |
| Column visibility | Root `@frameforge/ui` now exports a Radix Popover consumed by a real Shot Table column manager; visibility persists per production/browser | INTEGRATED_NOT_CUT_OVER | resize/reorder, server saved-view semantics, archived/purged custom-field lifecycle and context menus remain |
| Mobile workspace navigation | Horizontal rail now exposes an overflow fade while retaining route access | BLOCKED_VISUAL | inspect 375/320 with recovered full IA before accepting the mobile navigation model |

No UI slice in this section is visually complete until real rendered-browser evidence covers the relevant desktop/narrow widths. The current screenshots remain regression/failure evidence where product parity is still missing.