# FRAMEFORGE canonical owner matrix

## 2026-10-04 图片浮窗历史接入

ShotImagePreview独占两入口的浮窗DOM/按钮/快捷键及未锁定调整；详情frameUndo/frameRedo仍由ShotDetailCard拥有，表格已确认历史仍由原HistoryService拥有。useProjectCommandHistory只是从ProjectHistoryControls提取的共享CAS/query/Command客户端，项目菜单和窗口都消费该适配，不新增历史数据库或独立持久owner。[记录](SHOT_FRAMING_2026-10-04.md)。

## 2026-10-04 载入原图

载入原图沿用ShotImagePreview/useShotFraming及既有detail Command；frame_fit=cover|contain仍由MediaPresentation持久化，image_framing权威成品、Canvas草稿/下载，无新owner/DDL。HistoryService记录同次业务命令的Shot token效果以支持连续构图撤销，外部修改精确冲突保护保持。 [实施与证据](SHOT_ORIGINAL_FIT_2026-10-04.md)。

## 2026-10-04 分镜画面构图owner

ShotImagePreview统一小图/详情图预览事件及未锁定构图，useShotFraming读取原panel presentation和immutable source，refetch不覆盖脏预览。小图Lock经useSaveShotDetail提交暂存File及构图；详情由ShotDetailCard拥有锁定草稿/局部undo-redo，原Save一并提交。ShotDetailService编排PanelMediaService→ImageCropService，继续使用项目锁、Shot/presentation CAS、AssetVersion/MediaPresentation、Audit/History/get_db事务；image_framing仍独占权威成品。Web shot-framing复用media-preview，只生成草稿及下载PNG，不另存权威媒体。无DDL/Legacy owner；原生drag/wheel实机仍待，INTEGRATED_NOT_CUT_OVER。[记录](SHOT_FRAMING_2026-10-04.md)。

## 2026-10-04 扩展性新合同owner（PLANNED，不是切换完成）

| 能力 | 当前事实 / 目标owner | 接入与接受边界 |
| --- | --- | --- |
| 同一共享view配置 | 现有SavedView/WorkspaceLayout含个人配置；目标SavedView拥有共享列/行高/筛选/排序/分组，WorkspaceLayout仅个人呈现 | E3-SHARED-VIEW，CAS/ACK广播、无双写、FX-18；前端改动由指定UI owner接入，不直接覆盖表格 |
| 团队资源身份 | 当前无已接受共享身份闭环；目标独立identity link与Resource/Schedule owner | E2-SHARED-RESOURCE＋E6；项目Person独立、显式确认关联，FX-19受权跨项目冲突，UNKNOWN不猜可用 |
| Scene要求继承 | 目标SceneRequirement事实＋Shot逐项override，有效要求为projection；实际出演/预约仍归原域 | E2-CAST/E2-RESOURCE/E3-FIELD；FX-20、当前Q-05计量规则待确认 |
| 知识层 | Knowledge/Experience/Profile/Recommendation分域，复用统一权限、Command、Job和History | K0–K5按[知识合同](VNEXT_KNOWLEDGE_LAYER_REQUIREMENTS.md)，KL-01..10；文档不证明已实现 |

父子Entity的所有权/生命周期/scope按[总纲§3.1](VNEXT_MAX_EXTENSIBILITY_REQUIREMENTS.md#31-entity从属关系的判定)判定；关联关系不是父子。现有Board/History/ShotDetail等已记录owner保持，本段不撤销已有实现证据，也不将上述目标提升为CUT_OVER。

## 2026-10-04 详情命令与显示owner

表格真实consumer改用ShotDetailSlot（纵向占位、可视内容区宽度与末行滚动）、ShotDetailCard（本地字段/文件草稿及dirty guard）；workspace store继续独占选择/详情开关。Card/Wall旧Inspector保留，未全局替换。详情字段贡献为Web应用内封闭adapter，不引入全局万能schema/第二套实体状态。useSaveShotDetail发出一条multipart命令；API ShotDetailService编排既有ShotService、CustomFieldService、PanelMediaService；权限/CAS/审计/outbox/事务ack/项目History继续由原owner负责，媒体源版本不覆盖。HTTP新字段明确allowlist，无DDL。

ShotImagePreview拥有临时zoom与对象URL；当前展示媒体仍通过资产内容端点及Panel presentation owner读取，下载使用同一展示blob。表格已有图片单击预览、空图片上传；详情选图仅暂存，确认才写；旧Inspector明确保留上传模式。Shared Dialog继续拥有模态层/焦点/Esc；inline card补上关闭后的镜头行焦点返回。INTEGRATED_NOT_CUT_OVER；浏览器文件选择/下载收据门槛未完全验证，不更改画板、RBAC或全站cutover状态。[证据](SHOT_DETAIL_2026-10-04.md)。


## 2026-10-04 新模块整合边界

BoardService 拥有画板命令/图片 pin，HistoryService 拥有唯一持久游标/补偿；后端定向 18 项通过，新 UI 消费者尚待接入与桌面验收。新增页面允许写集为 lighting/moodboard 新路由、components/boards、useBoards 与所需依赖；导航仅追加两入口。现有表格/入口/设置和 `montblanc08` 最新修改不替换。

UI 修改以 GitHub 用户 `montblanc08` 的最新提交为准；其他执行者负责后端合同及前端缺口交接，不以旧草稿覆盖 UI。账号归属核对、允许写集及验收责任见衔接账本。

画板服务/模型/迁移为新增后端owner，复用现有HistoryService作为唯一持久命令历史；灯光进入project_snapshot，情绪板不进入内容版本。导入导出继续复用ImportService/document_export，不另建并行owner。本轮仅后端，UI缺口与接手边界记录于 [后端衔接账本](BACKEND_FRONTEND_HANDOFF_2026-10-04.md)；新模块仍在验证，不能依据本段判为cutover。

## 2026-10-03 持久命令历史owner

HistoryService独占确认日志/补偿/游标，get_db原unit of work在commit前finish；正常写入仍归既有域service。history_context仅解析可信路由/项目，客户端不提交inverse。PG三表由Alembic a83f02c1d765拥有；用户＋项目100步、对象revision冲突、purge历史边界。WorkspaceLayout独占确认个人布局，useWorkspaceLayout消费，旧localStorage仅首次初始化；ProjectHistoryControls拥有展示/快捷键/反馈，输入/构图局部草稿保留键盘所有权。权限/AuditLog/OutboxEvent沿用，无revision/源文件回退。现有原生操作已真实接通验证，INTEGRATED_NOT_CUT_OVER；完整成员RBAC/worker/画板/灯光等待办不因此完成。详见[实施记录](PROJECT_HISTORY_2026-10-03.md)。

## 2026-10-03 新增镜头、表格展示与悬浮卡片 owner

本次统计`cc1a213`：ProductionShotSummary拥有项目栏统计展示，ShotViewNavigation拥有导航数量展示；两者只派生React Query现有活动镜头/项目/custom values与workspace filters。Web shot-display独占表/卡片筛选纯函数及整数帧累计，packages/timecode独占HH:MM:SS:FF/drop-frame格式。旧页面内联筛选退出并改用纯函数，保留各视图已有语义；顶部不再另建筛选/累计状态。API ProductionService聚合与Shot列表原有deleted_at过滤继续权威，ShotService及现有hook失效策略拥有写后更新，无新增API/schema/cache owner。针对合成检查与真实消费者/五宽度已验证，整体迁移状态与GitHub授权阻挡不变。

省略镜号由ShotService现有Production锁分配；单位解析由Web shot-display（最新997c7af：新增输入无单位默认秒，f仍帧，提交保持duration_frames；复用现有NewShotModal，未改API/数据库），IN/OUT由原累计计时及packages/timecode；五列名保护由既有表格改名入口。最新卡片要求：NewShotModal独占新增表单草稿，workspace store独占开关，表/卡片入口共用同一create hook；删除NewShotRow，避免两个草稿owner。ShotFeedbackDialog只展示既有命令/排序/剪贴板/批量错误，明确关闭清除源错误；BulkActionToolbar仍负责选中条目的操作，删除确认通过现有Dialog居中呈现。根UI Dialog/Radix负责层级、焦点与键盘，各consumer的pending guard明确放行Esc关闭；服务器请求并不随关闭作虚假撤销。无新状态库、依赖或schema。代码0e12efa；针对检查/真实消费者、构建和Guard通过；整体迁移状态不变，GitHub上传待具体授权。

## 2026-10-02 最新数据库 owner 增量

- `MediaPresentation` / `ImageCropService`：每个 asset/panel/production 的展示 revision，引用不可变 AssetVersion；只追加调整记录，不覆盖源图片、不另造 source-version owner。`image_framing` 为服务端最终渲染，Canvas 仅草稿预览。
- `project_columns.column_class`：9 内置 /20 官方可选 /N 自定义；分类创建后不可变，内置列只允许 active/trashed。列服务/API/SQL 共同拒绝 builtin Purge/hard-delete。10 个 pending 映射仍显式待处理。
- `export_templates` / `export_template_service`：独立项目交付字段选择 owner，使用稳定列 ID 和 revision；不借 SharedView 保存导出设置，不进入内容提交。当前自定义 Purge 同事务清理模板引用；soft-delete 通过导出 allowlist 排除。
- `document_export`：XLSX/DOCX/PDF/CSV 共用所选字段 allowlist；PDF 预览从同一成品 bytes 经现有 PDFium 逐页渲染。所有导出路由使用同一角色权限检查，完整 project membership/RBAC 仍待实施。


## 2026-10-02 Infrastructure ownership update

| Capability | Canonical owner | Change and evidence | Current state |
| --- | --- | --- | --- |
| Runtime/dependencies | `apps/api`, `apps/web`, `infra` | Python 3.12 and Node 24; hashed Python locks; VNext API/worker/Web production images; npm lockfile is monorepo dependency authority | Locally verified builds; Docker image builds delegated to CI |
| Authentication/configuration | `apps/api/app/core/config.py`, `security.py`, auth service | Argon2id and PyJWT; legacy PBKDF2 verification upgrades on successful login; required secrets/database config; no production schema creation at app startup | Backend suite locally passes; production integration not run |
| Persistent schema | `apps/api/alembic` | Alembic owns production schema; PostgreSQL is the deployment target; SQLite is restricted to explicit tests | Empty PostgreSQL rehearsal remains a CI gate |
| Background jobs | `apps/api` worker | RQ Queue/Worker use an explicit Redis connection | Mocked construction checked; live Redis/multi-worker behavior unverified |
| CI/reverse proxy | `.github/workflows/*`, `infra/nginx` | CI checks Python/Web contracts, container builds, Nginx syntax, regression and migration gates; proxy handles WebSocket upgrades and same-origin app routing | `a518ea1` pushed; first CI run surfaced follow-up fixes recorded in ACTIVE_WORKSTREAMS |

These are infrastructure ownership records; they do not imply VNext product cutover or production deployment.

首次核对基线：2026-09-29，`7b3a24c`；2026-10-02 起本表用于记录 Legacy 功能来源与 VNext 实现归属，不再要求 Legacy API/数据库/runtime 对等。仓库配置中旧入口仍可作为当前事实存在，但目标 owner 直接是 `apps/api` / `apps/web`。唯一跨版本兼容门槛是 Legacy 便携工程文件可被 VNext 映射导入。

状态：`VERIFIED` 表示事实已核实；`IMPLEMENTED_NOT_INTEGRATED` 表示 VNext 代码存在但未接通真实消费链；`INTEGRATED_NOT_CUT_OVER` 表示已有真实 VNext 消费但能力尚未完成验收；`CUTOVER_READY` / `CUT_OVER` 只描述 VNext 自身运行准备度，不再要求 Legacy API/DB parity；`LEGACY_RETIRED` 表示旧 runtime 已退出（工程文件 exporter 可按桥接需要临时保留）；`BLOCKED` 说明当前 VNext 门槛未满足。

简写：`L-API` = `storyboard-system/server.py`；`L-Web` = `storyboard-system/static/*` 及其挂载的 `src/workspace`；`V-API` = `apps/api`；`V-Web` = `apps/web`；`UI-root` = 仓库根 `packages/ui`。测试列是**应执行的门槛**，不表示本轮已运行。

| Capability | Current Runtime Owner | Parallel Implementation | Target Canonical Owner | State Owner | Persistence Owner | Tests | Cutover Gate | Legacy Removal Gate | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| HTTP API | L-API（服务配置） | `V-API/main.py`；Legacy `fastapi_app` | V-API | API application | SQLAlchemy UoW | VNext 路由合同、错误映射、鉴权 E2E | V-Web/新客户端只使用 V-API；无需保留旧路由 | L-API 不再服务业务 API；Legacy FastAPI 无独有路由 | IMPLEMENTED_NOT_INTEGRATED |
| Authentication | L-API | `V-API/app/api/v1/auth.py` | V-API | 认证 service/session | V-API DB | 登录、续期、权限、401 | VNext auth/session/RBAC 自身合同通过且 V-Web 使用 | Legacy 认证端点无消费 | IMPLEMENTED_NOT_INTEGRATED |
| Production | L-API 的项目模型 | `V-API/app/api/v1/productions.py` | V-API | production application | SQLAlchemy UoW | CRUD、归档、权限、事务 | VNext Production 生命周期与权限合同通过 | 旧项目写入口无消费 | IMPLEMENTED_NOT_INTEGRATED |
| Shot CRUD | L-API + `shot_updates.py` | `V-API/app/api/v1/shots.py` + `app/services/shot_service.py`；V-Web Inspector/inline edit 已真实写入 | V-API | Shot command | SQLAlchemy UoW | changed-fields、patch whitelist、no-op、409、审计、资产引用 | create/PATCH/Trash/Bulk/Reorder 已走 ShotService 并记录 actor audit；补 immutable ShotVersion/history、Panel/asset/custom-field 对等后再提升 | 旧 Shot 写入口无消费 | INTEGRATED_NOT_CUT_OVER |
| Bulk Shot | L-API + `shot_bulk_updates.py` | V-API revision-aware bulk update + project-scoped bulk-trash commands；V-Web Shot Table mounts the canonical bulk toolbar and sends server revisions | V-API | Bulk Shot command | SQLAlchemy UoW | 409、no-op、字段白名单、项目范围、原子批量；仍需 Panel/自定义列/审计对等 | canonical UI 已真实消费 bulk update 与 atomic trash；补齐基线高级批量语义及视觉回归 | Legacy bulk 写入口无消费 | INTEGRATED_NOT_CUT_OVER |
| Fields | L-API + `field_lifecycle.py`（历史） | V-API `custom_fields.py` + `CustomFieldService`；V-Web 自定义列/表头实际消费 | V-API + V-Web | Field lifecycle service / ColumnPreference | SQLAlchemy UoW | 创建/改名/复制/隐藏/可恢复删除/恢复、revision/审计；普通内置列移除与三列删除保护 | 批注、完整回收站/历史清除与新数据库语义仍待单独确认；PostgreSQL 并发验收未齐 | Legacy 字段 handler 无消费 | INTEGRATED_NOT_CUT_OVER |
| Saved Views | L-API saved_views | V-API `SavedViewService` + V-Web ShotSavedViews | V-API + V-Web | Saved-view command + table apply state | SQLAlchemy UoW | CRUD、no-op revision、409、layout/filter/sort round-trip | 补 grouping/custom-field/column-lifecycle parity与 rendered QA | Legacy Saved View routes 无消费 | INTEGRATED_NOT_CUT_OVER |
| Import | V-Web ImportModal → V-API document_import/ImportService（append） | 临时调用三个 Legacy 纯模块、本地 CPU RapidOCR；不调用旧服务器/DB | V-API | ImportService 标准 Shot/Panel/Field 命令 | SQLAlchemy UoW + media store | XLSX/DOCX/PDF/JPG/PNG、源文本/原图、权限、失败回滚；真实 Excel/PNG 浏览器入库 | VNext update/replace、OCR 队列/持久媒体、便携工程文件 mapping；按新边界将纯解析移入应用 owner，移除动态 Legacy 依赖 | 仅保留必要的便携工程 exporter；不做旧 API/DB parity，不新增共享包 | INTEGRATED_NOT_CUT_OVER（append；临时依赖待收敛） |
| Export | V-Web 交付页 → V-API exports/document_export | 消费 SRT/EDL/OTIO/CSV/XLSX/DOCX/PDF；临时复用 Legacy 纯计时模块 | V-API | Export application | Shot/Panel/asset/custom-field read model | 三格式真实浏览器下载回读；图片、Unicode 字体、公式字符串防护、权限/失败路径 | VNext 六版式/工程文件/字段选取/水印、容器构建、持久媒体；移除动态 Legacy 依赖 | 仅保留便携工程 exporter；不以旧 API/runtime 对等作门槛 | INTEGRATED_NOT_CUT_OVER |
| Review | L-API + L-Web | V-API `review.py` + `ReviewService`; V-Web Review consumes persisted comment lifecycle, read-only decision history and canonical version compare | V-API + V-Web | Review comments/history | SQLAlchemy UoW | 评论 create/edit/delete/resolve/reopen、revision-bound 历史、权限、actor audit；默认 UI 不恢复全局审批看板 | 评论完整基础生命周期、版本与 Compare 已真实消费；继续补 reply/quote authoring、Word-style Audit/inline accept-reject 与真实浏览器验收 | Legacy Review 写/读入口无消费 | INTEGRATED_NOT_CUT_OVER |
| Revision | L-API + `shot_versions.py` | V-API canonical ShotVersion routes/service；V-Web Review 已消费 snapshot/list/detail/accept/restore/branch/merge/canonical compare | V-API | Revision/version command | SQLAlchemy UoW | 历史、不可变快照、冲突、恢复、显式分支/合并 | create/list/detail/accept/restore/branch/merge/current-shot compare 已接通；继续补 Word-style Audit/inline accept-reject 与 Legacy 完整审计语义 | 旧 revision handler 无消费 | INTEGRATED_NOT_CUT_OVER |
| Assets | L-API + `asset_cleanup.py` | V-API `panel_media.py` 解析图片上传/受权字节读取，`PanelMediaService` 承接上传事务与文件回滚，`asset_service.py` 提供范围资产元数据与活动 Shot 引用数；V-Web 表/卡/墙/Inspector/素材库真实消费 | V-API | PanelMediaService / AssetService | SQLAlchemy UoW + 本地媒体目录 | 引用计数、上传、清理、失败回滚 | 内容读取服务收敛、持久对象存储与新系统引用/回滚验收；不复制旧媒体库 | Legacy 媒体路径无消费、无孤儿 | BLOCKED（首 Panel 图片与资产列表读切片已接通；独立上传/清理与持久迁移未齐） |
| AI | Legacy `ai_system` 为并行实现；当前产品默认关闭 | V-API mock/provider/proposal；无 V-Web 入口 | V-API application + V-Web action | Job/Proposal service | V-API proposal/audit | 禁用零外发、权限、人工接受 | provider→proposal→人工接受→标准命令；持久 job | Legacy `ai_system` 无独有责任 | BLOCKED |
| Presence | L-API `CollaborationManager` + L-Web | V-API 进程内 service；V-Web consumer currently disconnected；Legacy `presence_system` | V-API realtime + V-Web client | Presence backend/client | Redis TTL/pubsub；无业务库心跳 | authenticated WS、多 tab、多 worker、重连、锁 TTL | Redis 后端和鉴权完成后才能重新接入 V-Web | 旧协作 manager/HTTP 心跳无权威写入 | BLOCKED |
| Workspace shell | L-Web；过渡 React toolbar/sidebar | V-Web app routes | V-Web | Workspace store | 无；实体由 V-API | 1440/1024/768/375/320 布局 | 导航、状态、请求都由 V-Web 接管 | `static/index.html` shell 无消费 | INTEGRATED_NOT_CUT_OVER |
| Table | L-Web `static/app.js` | V-Web Shot table 已真实读写 V-API，接入图片/文字图框、inline edit、筛选/排序/分组、多选、bulk toolbar、列管理/resize/context menu、项目保存视图、自定义字段与 full-set Shot reorder | V-Web feature | Table view + Selection | V-API Shot/Panel | inline edit、列/行、菜单、键盘、409、移动横滑、reorder 完整集合约束 | 补自定义字段与 Panel 的完整生命周期、reorder lease 与视觉对等 | 旧表格 DOM/handler 无消费 | INTEGRATED_NOT_CUT_OVER |
| Card | L-Web；V-Web 卡片入口已真实消费 V-API | V-Web Wall/Card 通过共用导航挂载，使用受权 Panel 图片、Shot PATCH、可见自定义字段和现有完整集合 reorder；未挂载的 Legacy ShotCardView | V-Web feature | Card view + Selection | V-API Shot/Panel/custom fields | 卡片比例、详情、排序、窄屏；合成排序/导航及类型检查通过，视觉待验收 | 补成组重排/冲突保护与浏览器功能、视觉对等 | 旧卡片渲染无消费 | INTEGRATED_NOT_CUT_OVER |
| Timeline | L-Web | 未挂载的 Legacy TimelineView；V-Web 覆盖待核 | V-Web feature | Timeline view | V-API Shot/timecode | 时长映射、拖动、撤销、保存 | V-Web 可操作时间线并走标准命令 | Legacy 时间线无消费 | BLOCKED |
| Inspector | L-Web `static/app.js` | V-Web ShotInspector 已真实写 V-API；dirty draft/409 rebase 已实现；未挂载 Legacy WorkspaceStage | V-Web feature | Inspector target + local draft | V-API Shot | 单击选择/双击详情、draft、409、删除、切视图、窄屏 overlay | 浏览器/视觉 QA + audit/history/command parity | 旧 Inspector owner 无消费 | INTEGRATED_NOT_CUT_OVER |
| Selection | L-Web `state.selection` | V-Web `useWorkspaceStore` | V-Web workspace store | Selection store | 不持久化；Shot ID 由 V-API | 表/卡/时间线/搜索同步 | 所有视图使用一个选择 owner | 旧 selection 全局状态无消费 | IMPLEMENTED_NOT_INTEGRATED |
| UI components | Legacy `storyboard-system/packages/ui` + 手写控件 | UI-root 已有 Button/IconButton/Input/TextArea/Field/Select/NativeSelect/Card/Badge/Checkbox/Dialog/Popover/DropdownMenu；项目创建/新镜头/废纸篓真实消费 shared Dialog，Shot Table 列管理消费 shared Popover，表格右键菜单消费 shared DropdownMenu；同名 Legacy 包仍并存 | UI-root | Primitive/overlay controller | 无 | shadcn/Radix API、视觉、focus/return、collision、浏览器命中 | 根包 primitive parity，V-Web 真实 overlay consumers 与 Legacy 双消费者构建/视觉通过 | Legacy 同名包无 imports 后删除 | INTEGRATED_NOT_CUT_OVER |
| Motion | Legacy `packages/ui/src/motion.tsx` + CSS | UI-root tokens 待迁 | UI-root | Motion token/state | 无 | 状态动效、布局稳定、可访问性 | 两端同一 token、图标反馈无双重 owner | Legacy motion 实现无 imports | IMPLEMENTED_NOT_INTEGRATED |
| i18n | Legacy 文案；V-Web 字典消费 | `apps/web/lib/i18n.ts` | `apps/web` i18n 层 | Locale store | 用户偏好持久化待定 | 切换、回退、动态文案、SSR | 词典与语言状态由应用层独占，不污染根 UI primitive 包 | Legacy 硬编码文案无必要消费 | INTEGRATED_NOT_CUT_OVER |

## 本轮优先切片

1. 先修文档事实与同名 UI 包的所有权。根 UI 包先迁 Button/Input/TextArea/Field，选择一个 V-Web 表单做真实消费；Overlay/Menu/Modal 在碰撞、焦点和样式契约齐备后再迁。
2. V-API 不再建立 Legacy 路由兼容层；直接按 VNext 产品合同完善缺失能力。Legacy 只作为行为参考，旧客户端/旧 session/旧 route 不构成门槛。
3. AI/Presence 维持默认关闭或开发环境状态。OpenAI-compatible provider、Redis、多 worker需独立集成证据；PostgreSQL 只验证 VNext 空库→Alembic head 与新系统事务，不做 Legacy 数据副本迁移。
4. 单独完成 Legacy 便携工程 exporter → VNext importer 的文件 mapping/fixture/round-trip；必要时允许修改 Legacy exporter，但不引入数据库或 API 兼容。

相关现状：[ACTIVE_WORKSTREAMS.md](ACTIVE_WORKSTREAMS.md)、[UI_PRIMITIVE_PARITY.md](UI_PRIMITIVE_PARITY.md)、[API_ROUTE_PARITY_MATRIX.md](API_ROUTE_PARITY_MATRIX.md)、[ARCHITECTURE.md](ARCHITECTURE.md)、[ARCHITECTURE_MIGRATION.md](ARCHITECTURE_MIGRATION.md)。本轮没有生产部署或生产数据验证。
