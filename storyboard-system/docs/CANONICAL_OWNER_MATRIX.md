# FRAMEFORGE canonical owner matrix

首次核对基线：2026-09-29，`7b3a24c`；首批收敛提交 `0826adf` 已推送到 `StoryBoard_System/master`。本表记录仓库中的入口、调用链和迁移门槛；未在本轮探测生产服务。仓库配置仍以 `storyboard-system/server.py` 为 Legacy 服务入口，`apps/api` 和 `apps/web` 是目标 owner。文件存在或局部测试通过不代表运行权已切换。

状态：`VERIFIED` 表示当前入口已核实；`IMPLEMENTED_NOT_INTEGRATED` 表示目标代码存在但未接通真实消费链；`INTEGRATED_NOT_CUT_OVER` 表示目标入口可消费但 Legacy 仍权威；`CUTOVER_READY` 要求对等、回归和回滚演练；`CUT_OVER` 要求真实入口切换；`LEGACY_RETIRED` 要求旧 owner 无消费者；`BLOCKED` 说明当前门槛未满足。

简写：`L-API` = `storyboard-system/server.py`；`L-Web` = `storyboard-system/static/*` 及其挂载的 `src/workspace`；`V-API` = `apps/api`；`V-Web` = `apps/web`；`UI-root` = 仓库根 `packages/ui`。测试列是**应执行的门槛**，不表示本轮已运行。

| Capability | Current Runtime Owner | Parallel Implementation | Target Canonical Owner | State Owner | Persistence Owner | Tests | Cutover Gate | Legacy Removal Gate | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| HTTP API | L-API（服务配置） | `V-API/main.py`；Legacy `fastapi_app` | V-API | API application | SQLAlchemy UoW | 路由对等、错误映射、鉴权 E2E | 所有真实客户端请求改到 V-API，含缺失路由 | L-API 不再服务业务 API；Legacy FastAPI 无独有路由 | IMPLEMENTED_NOT_INTEGRATED |
| Authentication | L-API | `V-API/app/api/v1/auth.py` | V-API | 认证 service/session | V-API DB | 登录、续期、权限、401 | 旧 session/角色语义对等且 V-Web 使用 | Legacy 认证端点无消费 | IMPLEMENTED_NOT_INTEGRATED |
| Production | L-API 的项目模型 | `V-API/app/api/v1/productions.py` | V-API | production application | SQLAlchemy UoW | CRUD、归档、权限、事务 | 项目/production ID 与生命周期对等 | 旧项目写入口无消费 | IMPLEMENTED_NOT_INTEGRATED |
| Shot CRUD | L-API + `shot_updates.py` | `V-API/app/api/v1/shots.py` | V-API | Shot command | SQLAlchemy UoW | revision、409、审计、资产引用 | 端点与现有 Shot 命令语义对等，V-Web 写入 | 旧 Shot 写入口无消费 | IMPLEMENTED_NOT_INTEGRATED |
| Bulk Shot | L-API + `shot_bulk_updates.py` | V-API bulk route | V-API | Bulk Shot command | SQLAlchemy UoW | 排序、字段、Panel、409、no-op | 批量命令与单镜头版本规则一致 | Legacy bulk 写入口无消费 | IMPLEMENTED_NOT_INTEGRATED |
| Fields | L-API + `field_lifecycle.py` | Legacy `fastapi_app/routers/fields.py` | V-API | Field lifecycle service | SQLAlchemy UoW | archive/purge、列管理、导入映射 | V-API 实现字段全生命周期并有消费方 | Legacy 字段 handler 无消费 | BLOCKED |
| Import | L-API + `import_parsing.py`/`import_staging.py` | `V-API/app/api/v1/imports.py` | V-API | Import command | SQLAlchemy UoW + media store | 真实 XLSX、映射、嵌图、回滚 | append/update/replace、图片与原始列对等 | Legacy import handler 无消费 | IMPLEMENTED_NOT_INTEGRATED |
| Export | L-API + `delivery_exports.py`/PDF/Word | `V-API/app/api/v1/exports.py`；V-Web 交付页已消费 SRT、VTT、EDL、OTIO、CSV | V-API | Export application | Shot/asset read model | SRT/VTT/EDL/OTIO/CSV 内容及下载头有合同测试 | 真实客户端/字节/失败路径对等，其余格式逐项接入 | Legacy export handler 无消费 | INTEGRATED_NOT_CUT_OVER（SRT/VTT/EDL/OTIO/CSV） |
| Review | L-API + L-Web | — | V-API + V-Web | Review workflow | SQLAlchemy UoW | 决策绑定 revision、权限、取消无写入 | Review 命令、视图及权限均接通 | Legacy Review 写/读入口无消费 | BLOCKED |
| Revision | L-API + `shot_versions.py` | V-API Shot revision 字段 | V-API | Revision command | SQLAlchemy UoW | 历史、快照、冲突、恢复 | 审计/历史与 Legacy 语义对等 | 旧 revision handler 无消费 | IMPLEMENTED_NOT_INTEGRATED |
| Assets | L-API + `asset_cleanup.py` | V-API 基础媒体引用待核 | V-API | Asset service | SQLAlchemy UoW + media store | 引用计数、上传、清理、失败回滚 | 媒体字节和引用迁移演练 | Legacy 媒体路径无消费、无孤儿 | BLOCKED |
| PostgreSQL persistence | L-API SQLite `storyboard.db` | V-API SQLAlchemy + Alembic；GitHub Actions 已证明空 PostgreSQL 16 可升级到 head | PostgreSQL + Alembic | V-API application/service | PostgreSQL | empty→head、Alembic drift、复制数据完整性、事务/409 | 完成隔离 SQLite→PostgreSQL 数据副本迁移与回滚演练后才可切运行时 | Legacy SQLite 不再承载权威业务写入且备份/回滚路径验证 | IMPLEMENTED_NOT_INTEGRATED |
| AI | Legacy `ai_system` 为并行实现；当前产品默认关闭 | V-API mock/provider/proposal；无 V-Web 入口 | V-API application + V-Web action | Job/Proposal service | V-API proposal/audit | 禁用零外发、权限、人工接受 | provider→proposal→人工接受→标准命令；持久 job | Legacy `ai_system` 无独有责任 | BLOCKED |
| Presence | L-API `CollaborationManager` + L-Web | V-API 进程内 service；Legacy `presence_system` | V-API realtime + V-Web client | Presence backend/client | Redis TTL/pubsub；无业务库心跳 | 多 tab、多 worker、重连、锁 TTL | Redis 后端和真实 V-Web WebSocket 消费 | 旧协作 manager/HTTP 心跳无权威写入 | IMPLEMENTED_NOT_INTEGRATED |
| Workspace shell | L-Web；过渡 React toolbar/sidebar | V-Web app routes | V-Web | Workspace store | 无；实体由 V-API | 1440/1024/768/375/320 布局 | 导航、状态、请求都由 V-Web 接管 | `static/index.html` shell 无消费 | INTEGRATED_NOT_CUT_OVER |
| Table | L-Web `static/app.js` | V-Web StoryboardGrid；未挂载的 Legacy WorkspaceStage | V-Web feature | Table view + Selection | V-API Shot | 列/行、编辑、菜单、键盘、冲突 | 数据和写路径同一 owner，视觉交互对等 | 旧表格 DOM/handler 无消费 | IMPLEMENTED_NOT_INTEGRATED |
| Card | L-Web | V-Web Wall/Card；未挂载的 Legacy ShotCardView | V-Web feature | Card view + Selection | V-API Shot | 卡片比例、详情、排序、窄屏 | V-Web 卡片成为真实入口 | 旧卡片渲染无消费 | IMPLEMENTED_NOT_INTEGRATED |
| Timeline | L-Web | 未挂载的 Legacy TimelineView；V-Web 覆盖待核 | V-Web feature | Timeline view | V-API Shot/timecode | 时长映射、拖动、撤销、保存 | V-Web 可操作时间线并走标准命令 | Legacy 时间线无消费 | BLOCKED |
| Inspector | L-Web `static/app.js` | V-Web ShotInspector；未挂载的 Legacy WorkspaceStage | V-Web feature | Inspector target 独立 store | V-API Shot | 单击选择/双击详情、删除、切视图 | V-Web target 与 selection 分离且持久写对等 | 旧 Inspector owner 无消费 | IMPLEMENTED_NOT_INTEGRATED |
| Selection | L-Web `state.selection` | V-Web `useWorkspaceStore` | V-Web workspace store | Selection store | 不持久化；Shot ID 由 V-API | 表/卡/时间线/搜索同步 | 所有视图使用一个选择 owner | 旧 selection 全局状态无消费 | IMPLEMENTED_NOT_INTEGRATED |
| UI components | Legacy `storyboard-system/packages/ui` + 手写控件 | UI-root 已有 Button/IconButton/Input/TextArea/Field/Select/NativeSelect/Card/Badge/Checkbox，V-Web 登录/项目大厅/交付页已消费其中多种；同名包仍并存 | UI-root | Primitive/overlay controller | 无 | API、视觉、focus、浏览器命中 | 根包 primitive parity，V-Web 和 Legacy 双消费者通过 | Legacy 同名包无 imports 后删除 | INTEGRATED_NOT_CUT_OVER（已消费控件） |
| Motion | Legacy `packages/ui/src/motion.tsx` + CSS | UI-root tokens 待迁 | UI-root | Motion token/state | 无 | 状态动效、布局稳定、可访问性 | 两端同一 token、图标反馈无双重 owner | Legacy motion 实现无 imports | IMPLEMENTED_NOT_INTEGRATED |
| i18n | Legacy 文案；V-Web 字典消费 | `apps/web/lib/i18n.ts` | `apps/web` i18n 层 | Locale store | 用户偏好持久化待定 | 切换、回退、动态文案、SSR | 词典与语言状态由应用层独占，不污染根 UI primitive 包 | Legacy 硬编码文案无必要消费 | INTEGRATED_NOT_CUT_OVER |

## 本轮优先切片

1. 先修文档事实与同名 UI 包的所有权。根 UI 包先迁 Button/Input/TextArea/Field，选择一个 V-Web 表单做真实消费；Overlay/Menu/Modal 在碰撞、焦点和样式契约齐备后再迁。
2. V-API 先建立 Legacy→VNext 路由对等清单，以合成数据从一个导出或 Shot 命令切入；不得把 Legacy Raw DB-API 仓储与 SQLAlchemy 长期并列为两个事务权威。
3. AI/Presence 维持默认关闭或开发环境状态。OpenAI-compatible provider、Redis、多 worker、PostgreSQL 数据副本迁移均需独立集成证据。

相关现状：[ACTIVE_WORKSTREAMS.md](ACTIVE_WORKSTREAMS.md)、[UI_PRIMITIVE_PARITY.md](UI_PRIMITIVE_PARITY.md)、[API_ROUTE_PARITY_MATRIX.md](API_ROUTE_PARITY_MATRIX.md)、[ARCHITECTURE.md](ARCHITECTURE.md)、[ARCHITECTURE_MIGRATION.md](ARCHITECTURE_MIGRATION.md)。本轮没有生产部署或生产数据验证。
