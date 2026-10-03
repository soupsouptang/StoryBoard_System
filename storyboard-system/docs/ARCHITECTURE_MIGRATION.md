# FrameForge VNext 原生重构契约（Legacy 兼容范围收窄）

> 审计/重写日期：2026-10-02（VNext-native rebuild 决策覆盖）
> 文档类型：执行级重构契约  
> 当前状态：VNext 原生重构；生产环境保持现状；用户已暂停部署  
> 当前已配置的 Legacy 服务基线：Python 标准库 HTTP + SQLite + 静态前端/过渡 React；该运行时不再是 VNext 的兼容目标，仅保留为功能参考和临时工程导出桥接
> 关联文档：`ARCHITECTURE.md`、`LIFECYCLE_ARCHITECTURE_PLAN.md`、`VNEXT_MAX_EXTENSIBILITY_REQUIREMENTS.md`  
> 文档职责：本文件只负责**从当前事实重构到 VNext 目标边界的方法、不可变规则、Legacy 工程文件桥接、验证与退役条件**。当前仓库事实以 `ARCHITECTURE.md` 为准；产品/实体生命周期阶段编号以 `LIFECYCLE_ARCHITECTURE_PLAN.md` 为准。
> 统一 owner、并行实现和切换门槛见 [CANONICAL_OWNER_MATRIX.md](CANONICAL_OWNER_MATRIX.md)。下文 2026-09-27 的“当前/尚未开始/占位”审计表述，以该矩阵和本轮状态补核为准，不可读作 2026-09-29 的最新事实。

---

## 0. 2026-10-02 覆盖性决策

以下规则覆盖本文中更早的 Legacy 迁移/cutover 设计：

- **不迁移 Legacy SQLite 数据库，也不迁移旧工程数据。**
- **不兼容 Legacy API、session、路由、客户端或运行时。**
- VNext 直接以 `apps/web` + `apps/api` + PostgreSQL/Alembic 为唯一目标架构；旧系统只作为功能/交互证据。
- 唯一保留的跨版本兼容面是**文件级工程桥接**：Legacy 导出便携工程文件，VNext 按明确 schema/mapping 导入。
- 为实现该文件桥接，可以窄范围修改 Legacy exporter 源码、导出 schema 与对应测试；不得因此恢复双写、旧 API 兼容层或数据库 backfill。
- 本文后续凡涉及 SQLite→PostgreSQL 数据回填、旧 API 路由对等、双 owner cutover、旧项目原地升级的旧设计，均标记为 **RETIRED / DO NOT EXECUTE**；保留文字仅供历史审计。

## 0.1 最大化扩展性覆盖规则

后续 VNext 原生重构不仅要求替换 Legacy owner，还必须为长期扩展保留稳定边界。详见 [最大化扩展性需求总纲](VNEXT_MAX_EXTENSIBILITY_REQUIREMENTS.md)。新增演员、场地、设备、任务、排期、自动化、AI、导入导出等能力时，优先增加 Entity / Typed Relation / Command / Event Consumer / Provider，而不是给 Shot 或现有 Service 增加无边界特殊分支。

其中以下约束视为本迁移契约的一部分：Entity-scoped Fields 但禁止万能 EAV；ProductionStep 与 Task 分离；Task Dependency 为独立 DAG；项目成员权限由 ProductionMember 作用域表达；Import 不保存长期映射模板，采用每次模糊识别/自动合并/冲突预览/Provenance；所有长期 JSON 配置均需 schema_version + migrator；Import/Export/Storage/AI/Queue 以 Provider/Adapter 作为扩展边界；Capability Registry 仅做编译期模块化，不引入任意第三方运行时代码插件。

# 1. 为什么需要这份重构契约

FrameForge 当前不是一个可以通过“一次性重写”安全替换的系统。

当前同时存在：

```text
Legacy 静态前端
+
React / TypeScript Workspace
+
Python server.py 单体入口
+
已经抽出的业务模块
+
SQLite 当前数据库
+
真实 Excel / PDF / Word / 交付流程
```

因此重构的核心不是：

```text
换框架
换目录
换数据库
```

而是：

```text
从 `5e86a0b` 与现有文档提取仍需保留的产品能力
→ 在 VNext 中按新架构原生实现
→ 用 VNext 自身合同/浏览器/文件往返验收
→ 固化 Legacy 便携工程导出 schema 与 VNext mapping
→ 退役 Legacy runtime
→ 继续只维护 VNext
```

本文件的目标是防止以下“伪迁移”：

- 新代码已经写了，但用户仍走旧入口；
- React 页面存在，但 `app.js` 仍在改同一状态；
- 新 Service 存在，但旧 handler 仍有完整业务块；
- 新数据库存在，但实际写入仍依赖 SQLite 专用逻辑；
- 新组件存在，但页面仍各自维护 Modal / Inspector / Focus；
- 新 AI 模块存在，但直接写 Current Project；
- 新目录更整齐，但状态源更多了。

---

# 2. 文档中的四种信息等级

为避免“目标写成事实”或“建议写成强制实现”，本文件所有重要内容按以下四类理解。

---

## 2.1 VERIFIED BASELINE — 已核实基线

表示：

- 当前仓库已有真实实现；
- 当前入口真实使用；
- 当前工具或测试已有证据；
- 或多个现有文档相互印证。

这类内容可以作为迁移起点。

---

## 2.2 ACCEPTED MIGRATION INVARIANT — 已接受迁移不变量

表示：

- 已经由现有架构/生命周期文档明确；
- 或是为解决已知问题已经确定的架构原则；
- Codex / 开发在迁移时必须遵守。

这类内容规定“结果必须满足什么”，但不一定规定唯一实现方式。

---

## 2.3 PROPOSED TARGET CONTRACT — 候选目标契约

表示：

- 推荐的状态结构；
- 推荐的数据字段；
- 推荐的技术机制；
- 推荐的 QA 数值预算；
- 尚需代码 inventory 或实现验证后才能升级为 ACCEPTED。

Codex 不得因为它出现在本文，就直接假定当前代码已经存在这些字段/类型。

---

## 2.4 CUTOVER / VERIFICATION — 切换与验收规则

表示：

- 新路径什么时候可以接管；
- 旧路径什么时候可以关；
- 旧代码什么时候可以删；
- 怎么验证；
- 怎么回滚。

---

# 3. VERIFIED BASELINE — 当前已核实事实

以下事实来自当前仓库记录和现有架构文档。

---

## 3.1 服务/API

当前：

```text
server.py
```

的 `AppHandler` 仍直接承担：

- GET / POST / PUT / DELETE；
- 身份验证；
- SQLite；
- 静态资源；
- 媒体；
- 部分业务流程。

当前已经存在独立模块：

```text
creative_boards.py
field_lifecycle.py
text_format.py
asset_cleanup.py
narration_timing.py
delivery_exports.py
shot_updates.py
shot_bulk_updates.py
shot_versions.py
persistence_helpers.py
runtime_clock.py
import_parsing.py
import_staging.py
schema_migrations.py
```

这些文件的存在证明“业务块已经开始迁出”，但不证明完整 Application / Domain / Infrastructure 分层已经完成。

---

## 3.2 数据

当前运行数据库仍是：

```text
SQLite
```

当前已有：

```text
schema_migrations.py
```

建立 version 1 schema baseline。

已知工具：

```text
tools/schema_inventory.py
tools/sqlite_backup_rehearsal.py
```

当前 SQLite backup → restore 演练已在**合成隔离库**验证：

- schema；
- row count；
- content digest；
- `integrity_check`；
- `foreign_key_check`。

尚未证明：

- 实际业务数据副本完整演练；
- 媒体恢复；
- storage key 恢复；
- 完整权限/分享/版本引用恢复。

### 审计修正

当前可以说：

```text
version 1 是显式、可检查的 schema baseline。
```

当前不应在没有 down migration 代码证据时说：

```text
schema_migrations.py 本身已经“可逆迁移”。
```

当前主要恢复安全来自：

```text
backup / restore rehearsal
```

而不是已经证明存在通用 reverse migration。

---

## 3.3 前端

当前：

```text
static/index.html
```

同时加载：

```text
static/app.js
直接 feature scripts
workspace-v73.js
```

`workspace-v73.js` 来自：

```text
src/workspace/index.tsx
```

因此当前真实状态是：

```text
Legacy + React Workspace 双轨
```

不能写成：

```text
Legacy 已经被 React 替换。
```

---

## 3.4 `packages/ui`

当前唯一明确确认的 npm workspace package：

```text
packages/ui
```

现有边界 Gate：

```text
tools/architecture_boundary_gate.py
tests/test_architecture_boundary_gate.py
```

当前明确检查：

```text
packages/ui/src
```

的：

- import；
- fetch；
- WebSocket；
- localStorage / persistence I/O。

### 审计修正

这道 Gate 当前不能被解释为：

```text
所有 Python 后端模块反向依赖已经被同一个工具验证。
```

如果未来要机器化检查后端 Application / Domain / Infrastructure 边界，应新增或扩展独立规则，并在实际测试存在后再写成 VERIFIED。

---

## 3.5 Shot Update

单条 Shot 更新已经使用：

```text
shot_updates.py
```

真实入口：

```text
PUT /api/shots/{id}
```

批量更新已经使用：

```text
shot_bulk_updates.py
```

真实入口：

```text
PUT /api/projects/{id}/shots
```

旧业务块已经从 handler 中迁出相应部分，但：

- HTTP；
- 鉴权；
- transaction；
- 部分 audit/review workflow；

仍可能由 `server.py` 参与。

当前状态：

```text
PARTIAL APPLICATION MIGRATION
```

不是完整 Command/Event 架构完成。

---

## 3.6 Shot Version

当前：

```text
shot_versions.py
```

已经承载：

- 审核决定的部分实现；
- 精简快照；
- 版本恢复。

`server.py` 仍负责：

- HTTP 状态映射；
- 项目 bundle 查询；
- 部分版本路由。

当前不能声称完整 Revision Domain 已完成。

---

## 3.7 Import

当前真实 Excel 流程存在：

```text
upload
→ preview / mapping
→ validate
→ transaction commit / rollback
```

现有要求继续保留：

- `.xlsx` 嵌图；
- 字段映射；
- 原始列；
- append / update / replace 语义。

---

## 3.8 Export

当前已有：

```text
storyboard-pdf-export.js
storyboard-landscape-export.js
storyboard-word-export.js
storyboard-document-media.js
delivery_exports.py
```

可编辑 Word `.docx` 已经有真实实现，并已记录本地文件与浏览器验收。

因此 Word 当前统一状态：

```text
VERIFIED_LOCALLY
```

它代表：

```text
已实现 + 已本地验证
```

但不自动表示：

```text
RELEASED
```

### 审计修正

迁移文档不再保留：

```text
“本架构切片不声称 Word 已实现”
```

这与当前实际记录冲突。

---

## 3.9 AI

原 2026-09-27 的 Legacy 审计只明确包括：

```text
GET /api/ai/capabilities
```

且只是：

```text
受身份保护的静态能力占位
```

截至 2026-09-29，`storyboard-system/ai_system` 与 `apps/api/app/services/ai_*` 已有局部代码，但未形成真实 V-Web 消费、持久 Job 或标准 Command 接受链。当前仍不存在已核实的：

- AI provider 正式调用；
- AI Job；
- 持久化 Proposal Store；
- 自动拆镜；
- AI 直接写 Project。

---

# 4. ACCEPTED MIGRATION INVARIANTS — 已接受迁移不变量

以下是迁移必须遵守的结果性规则。

---

## 4.1 模块化单体优先

部署边界保持：

```text
模块化单体
```

目标逻辑分层：

```text
Presentation
Application
Domain
Infrastructure
Platform
```

但这表示**逻辑边界**，不是要求立即创建全部目录。

禁止为了目录“漂亮”先制造没有真实消费者的 package。

---

## 4.2 不做 Big Bang Rewrite

禁止一次性：

- 删除 `static/app.js`；
- 删除全部 Legacy CSS；
- 重写整个 `server.py`；
- 同时切 React + FastAPI + PostgreSQL；
- 同时改变 API、DB、前端状态和业务模型。

迁移必须以：

```text
一条真实调用链
```

为基本单位。

---

## 4.3 不允许永久双写

迁移期允许短时间：

```text
old read + new read
```

用于比对。

不允许长期：

```text
old write + new write
```

同一业务实体最终必须只有一个 authoritative write path。

---

## 4.4 Legacy Freeze

### 新增迁移决策：MIG-001

自本契约生效后：

```text
static/app.js
static/*-workspace.js
旧 feature scripts
旧 feature CSS
```

进入迁移冻结。

允许：

- P0/P1 bug fix；
- 明确可删除的 adapter；
- telemetry / assertion；
- 删除旧代码；
- 保持现有契约。

禁止：

- 新增长期 feature；
- 新建第二套全局状态；
- 新建第二套 Save 系统；
- 新建第二套 Inspector / Modal / Presence；
- 用长期 CSS override 延长旧页面架构。

---

## 4.5 当前事实与目标技术栈必须分开

FastAPI、PostgreSQL、Worker、Electron、Redis、CRDT/Yjs、向量检索属于目标或候选能力。

未经真实接管，不得改写成当前运行事实。

---

## 4.6 Entity 与 UI State 分离

Project / Shot / Field / Asset / Revision / Board / Lighting 等实体，不应包含：

- Inspector open；
- selection；
- modal；
- panel width；
- focus；
- 用户显示偏好。

UI state 不应成为业务事实。

---

## 4.7 Selection 与 Inspector 分离

### Decision：MIG-002 — ACCEPTED

已接受不变量：

```text
Selection != Inspector
```

用户单击实体只改变 selection。

Inspector 只能由：

- 双击；
- 显式“详情”动作；
- 明确 inspect route / action；

打开。

禁止：

```text
selectedShot changed
→ 自动 inspector open
```

这条规则用于解决当前已知的：

```text
详情页自己弹出
搜索/卡片/时间线选择导致意外详情
```

---

## 4.8 View 共享同一业务实体

Table / Card / Timeline / Review / Narration / Export 最终应读取相同业务事实。

它们可以拥有自己的显示 adapter，但不能各自保存一份权威 Shot。

---

## 4.9 保存成功必须由服务端确认驱动

当前迁移目标要求：

```text
acknowledged revision
```

成为 saved/clean 的依据。

不能：

```text
按钮点击
或
local object changed
```

就直接显示“已保存”。

---

## 4.10 localStorage 不是真实数据库

localStorage 可以保存：

- 用户偏好；
- 暂时 UI 状态；
- crash recovery draft。

不能成为：

- Project 真相；
- Shot revision 真相；
- Field lifecycle 真相；
- Review Decision 真相。

---

## 4.11 Revision/Review 必须可审计

必须满足：

- Decision 绑定明确 revision；
- 历史 revision 不被静默重写；
- restore 产生新的可审计操作；
- cancel 不产生业务写入；
- 修改者 / 修改内容 / 时间可追踪。

Review 的产品方向是：

```text
内容修订审计
```

不是企业 OA/BPM。

---

## 4.12 AI 不能直接写 Current Project

AI 的最终写入必须经过：

```text
human acceptance
→ normal Command path
```

AI 不能：

- 持有 DB session；
- 绕过 capability；
- 自动 commit 到 Current Project。

---

## 4.13 构建与生产数据隔离

构建、TypeScript 检查、浏览器测试不得修改真实用户数据。

`npm run check` 会写静态 bundle，因此它不是只读操作。

---

## 4.14 RETIRED — Legacy 数据库迁移/备份演练（不再执行）

PostgreSQL 或任何高风险 schema 变更前必须：

```text
实际业务数据副本
→ inventory
→ backup
→ restore rehearsal
→ migration
→ post-check
```

禁止直接在线上数据试迁。

---

# 5. PROPOSED TARGET CONTRACTS — 候选技术契约

本章提供推荐实现，但**这些具体字段/机制在代码 inventory 前不是当前事实**。

Codex 应先核实已有实现，再决定采用、调整或升级为 ACCEPTED。

---

# 6. 候选 Workspace Kernel

### Status：PROPOSED

目标是让全局 UI 状态拥有明确 owner。

候选职责：

```text
Selection
Inspector
View
Modal / Overlay
Layout
Focus
Presence
```

可以实现成：

```text
独立 stores
一个组合 store 的独立 slices
React state + reducer
其他满足相同 ownership 的方式
```

本文不强制必须创建某个特定库或特定文件名。

---

# 7. 候选 Selection Contract

### 必须满足的 ACCEPTED 不变量

- selection 与 Inspector 分离；
- 删除实体清理失效 selection；
- Search / Table / Card / Timeline 使用一致 selection 语义。

### PROPOSED 数据

可以考虑：

```text
selectedEntityIds
anchorEntityId
selectionScope
```

`lastSelectionSource` 等诊断字段只有在实际调用需要时才增加。

禁止为了契约形式提前制造无消费者字段。

---

# 8. 候选 Inspector Contract

### 必须满足的 ACCEPTED 不变量

- 显式打开；
- 不由 selection 隐式打开；
- 实体删除后清理；
- overlay 与 docked 的布局语义不能混乱。

### PROPOSED 数据

可以考虑：

```text
entityType
entityId
mode
pinned
```

如果实际 UI 需要动画状态，可以增加：

```text
opening
open
closing
```

但这是实现细节，不是数据模型前置条件。

---

# 9. 候选 Modal / Overlay Contract

### ACCEPTED

必须统一解决：

- Esc；
- outside click；
- focus trap；
- focus return；
- z-index；
- 销毁；
- 动画结束后的 pointer events。

### PROPOSED

可以采用：

```text
overlay stack
```

每项可以保存：

```text
type
owner
anchor
dismiss policy
focus return target
```

最终字段根据现有组件和调用方确认。

---

# 10. 候选 Save Pipeline

### ACCEPTED

最终必须形成一条可追踪的写入链。

逻辑结构建议：

```text
Editor
→ Draft
→ Flush
→ Normalized Patch
→ Mutation / Command
→ Server
→ Transaction
→ Revision Ack
→ Query / Entity refresh
```

### PROPOSED

可以建立：

```text
flushActiveEditors()
pending operation queue
```

具体函数名不强制。

---

# 11. 候选保存状态机

### ACCEPTED

至少必须能区分：

```text
未修改
有本地修改
保存中
成功
冲突
错误
```

### PROPOSED

可以细化为：

```text
clean
dirty
queued
saving
retrying
conflict
error
offline
reconnecting
```

这些名称是候选词汇。

如果现有系统已有等价状态，应优先统一语义而不是仅改名。

---

# 12. 候选 Request / Command 可靠性

原迁移文档已经明确要求：

- Request/Command ID；
- 幂等；
- revision conflict；
- structured error。

因此这些属于 ACCEPTED。

对于浏览器请求实现：

### PROPOSED

推荐支持：

- timeout；
- cancellation；
- command result reconciliation。

例如可以使用：

```text
AbortController
```

但是否使用此具体 API，应以当前 request wrapper 为准。

核心不变量是：

> 客户端 timeout 不应自动被解释为服务端一定没有 commit。

需要通过：

- command id；
- refetch revision；
- server-side idempotency；

中的适当机制确认结果。

---

# 13. Command Contract

### ACCEPTED TARGET

原迁移文档已经明确 Shot Command 目标应包含：

```text
command_id
actor
project_id
shot_id / entity_id
expected_revision
白名单变更
timestamp
```

actor 至少可以表示：

```text
user
share
system
```

未来 AI 作为 actor 只有在 AI 正式接入后才启用。

---

# 14. Event Contract

### ACCEPTED TARGET

Event 表示：

```text
已经提交的事实
```

Event 不得重新执行同一业务写入。

可用于：

- cache invalidation；
- realtime broadcast；
- audit；
- background side effect。

### PROPOSED Event 字段

可以包含：

```text
event_id
command_id
entity_id
revision
changed_fields
actor
committed_at
```

具体字段应与现有 audit/event 代码核对后确认。

---

# 15. Conflict Contract

### ACCEPTED

写入必须能区分：

```text
accepted
conflict
validation error
forbidden
temporary failure
```

不能 silent last-write-wins。

### PROPOSED Conflict Payload

可以包含：

```text
entity_id
expected_revision
actual_revision
conflicting_fields
```

是否返回完整 server snapshot，应根据 payload 大小、隐私和当前 API 设计决定。

---

# 16. Undo / History

### ACCEPTED

Undo 不能通过数据库“倒退”覆盖其他用户的新修改。

### 目标规则

- 文本编辑可保留浏览器原生 undo；
- entity 写入使用新的补偿操作；
- Moodboard / Lighting 可以拥有局部 history scope；
- Review restore 创建新的 revision。

具体 history 数据结构属于 PROPOSED。

---

# 17. Presence Target

## 17.1 ACCEPTED

Presence 应与持久业务实体分离。

Presence 主要用于表达：

- 谁在线；
- 谁正在看什么；
- 谁正在编辑哪里；
- Canvas 中远端选中/位置。

默认不把：

- 聊天；
- 会议；
- Activity Feed；

作为当前 Presence 基础层。

---

## 17.2 PROPOSED Presence Session

候选模型可以包括：

```text
user identity
session identity
active view
selected entity
editing target
cursor / viewport
last heartbeat
```

这里的：

```text
sessionId
heartbeat
TTL
stale threshold
```

属于候选实时协议，不是当前实现事实。

迁移前必须先审计：

- 当前 Presence 代码是否存在；
- WebSocket/轮询 owner；
- 当前用户/session 模型；
- 是否已有 reconnect 机制。

---

## 17.3 PROPOSED Table Presence

建议：

- row / cell editing indicator；
- avatar；
- soft occupancy。

不建议在数据表中默认显示大量自由鼠标 cursor。

---

## 17.4 PROPOSED Canvas Presence

Moodboard / Lighting 可考虑：

- remote cursor；
- remote selection；
- viewport；
- follow user。

---

# 18. Review Target

## 18.1 ACCEPTED

必须保证：

```text
Decision → 明确 Revision
```

必须可追踪：

- author；
- time；
- changed fields；
- previous/current version；
- decision。

Review 不变成 OA 多级审批。

---

## 18.2 PROPOSED Data Shape

候选：

```text
Revision
  id
  entity_id
  base_revision_id
  actor
  created_at
  changed_fields
  before
  after
  diff
```

以及：

```text
ReviewDecision
  revision_id
  actor
  resolution
  comment
  created_at
```

这些字段不是当前数据库 schema 的事实声明。

迁移前先核对现有：

```text
shot_versions
review_decisions
project_snapshots
audit_log
```

再决定最小变化。

---

# 19. Review UI 与迁移契约的边界

架构迁移只规定：

- Before / After / Diff 必须可访问；
- author / time / revision / decision 必须清晰；
- selection scope 正确。

具体：

```text
左栏 / 中栏 / 右栏
```

属于 UI 设计，不在本迁移文档写成强制布局。

---

# 20. Lighting / Moodboard Target

## 20.1 ACCEPTED

必须：

- 保留当前已存在的数据；
- 保留 revision；
- 不丢未知字段；
- 使用显式 schemaVersion / serializer / upgrader；
- Canvas 生命周期可正确销毁；
- 不把视觉插值值错误写成持久值。

---

## 20.2 审计修正

本文不再假定 Lighting 当前一定存在如下具体字段：

```text
fixtures
camera
set objects
light parameters
annotations
```

这些只有在实际 schema inventory 后才能写入契约。

正确顺序：

```text
inventory current document
→ identify version
→ identify consumers
→ define target DTO
→ write upgrader
→ migrate
```

---

# 21. i18n Target

### ACCEPTED

新组件从迁移开始避免新增不可维护的硬编码 UI 文案。

UI language 与项目内容语言分离。

### PROPOSED

语言文件可以组织为：

```text
zh-CN
en-US
ja-JP
```

具体支持语言范围属于产品决策，不应因为目录示例自动视为全部必须立即完成。

---

# 22. Design System Target

### ACCEPTED

`packages/ui` 应保持：

```text
通用交互 / 通用视觉
```

不拥有：

- Shot 业务；
- Project 业务；
- fetch；
- WebSocket；
- localStorage persistence。

这已经由当前 UI boundary gate 部分机器验证。

### TARGET

应逐步收敛：

- Button；
- Input；
- Modal / Dialog；
- ContextMenu；
- Inspector shell；
- Toast；
- Focus；
- Overlay；
- Motion primitive。

但不能因为目标存在，就写成“全站已经迁移到 `packages/ui`”。

---

# 23. Focus / Visual State Target

### ACCEPTED

必须区分：

```text
hover
selected
focus
disabled
loading
error
```

用户已观察到“奇怪蓝色描边”等问题，因此 focus 与 selected 必须解耦。

推荐：

```text
keyboard focus → :focus-visible
mouse selection → neutral selected state
```

具体颜色和 token 归 Design System。

---

# 24. Motion Target

### ACCEPTED

Motion 是状态反馈，不是纯装饰。

动效不能：

- 遮挡文字；
- 改变真实 hit area；
- 伪造 saving success；
- unmount 后继续运行。

### PROPOSED

可按：

```text
Micro
Component
Workspace
Ambient
```

分层。

这属于组织方式，不要求现有代码一次性照此目录迁移。

---

# 25. 迁移 Track，而不是第二套 Phase

## 审计修正

`LIFECYCLE_ARCHITECTURE_PLAN.md` 已经拥有官方 Phase 0–6。

因此本文**不再创建另一套 Phase 0–9**，避免：

```text
Migration Phase 4
!=
Lifecycle Phase 4
```

本文改用：

```text
Migration Track
```

每个 Track 映射到 Lifecycle Phase。

---

# 26. Lifecycle / Migration Crosswalk

| Migration Track | 主要目标 | 对应 Lifecycle |
| --- | --- | --- |
| Track A — Baseline & Ownership | 入口、DOM、state、write owner、Legacy Freeze | Phase 0 |
| Track B — Workspace Kernel | Selection、Inspector、Overlay、Focus、Motion 基础 | Phase 1 |
| Track C — Persistence & Schema | Save/Command/Field lifecycle/schema/backup | Phase 2 |
| Track D — Core Views | Table/Card/Timeline/Search/Narration | Phase 3 |
| Track E — Review / Presence | Revision Audit、协作临时状态 | Phase 3，横向能力 |
| Track F — Creative Workspace | Moodboard、Lighting、Canvas lifecycle | Phase 4 |
| Track G — Import / Export | Excel、PDF、Word、Delivery | Phase 2/4 |
| Track H — Legacy Retirement | 删除旧路径、CSS、adapter、flag | Phase 5 |
| Track I — AI / Platform / DB Evolution | AI、Electron、PostgreSQL、必要基础设施 | Phase 5 以后 |
| Track J — Release | 隔离验证、生产切换、回滚 | Phase 6 |

Lifecycle 文档负责“阶段”；本文件负责“技术迁移轨道”。

---

# 27. Track A — Baseline & Ownership

### 类型：CUTOVER / VERIFICATION

任何大型修改前，先固定基线。

---

## 27.1 Frontend Entry Inventory

记录：

```text
static/index.html
→ script
→ css
→ load order
→ source/generated/third-party
```

---

## 27.2 DOM Ownership Inventory

至少覆盖：

```text
Project Hub
Global Header
Workspace Header
Nav Rail
Left Panel
Main Stage
Table
Card
Timeline
Inspector
Search
Review
Narration
Moodboard
Lighting
Import
Export
Modal
Toast
ContextMenu
```

每个区域回答：

```text
谁创建？
谁更新？
谁监听？
谁销毁？
谁控制 visibility？
谁控制 geometry？
```

---

## 27.3 State Ownership Inventory

搜索和登记实际存在的：

```text
selectedShot
currentShot
activeView
currentProject
inspectorOpen
selectedRevision
modal state
save state
dirty/pending state
column preference
presence state
```

状态来源可能包括：

```text
window global
module state
React store
DOM dataset
CSS class
localStorage
URL
server response
```

---

## 27.4 Write Path Inventory

对每个业务写入记录：

```text
UI trigger
→ function
→ request builder
→ API
→ handler
→ business module
→ transaction
→ DB
→ response
→ UI acknowledgement
```

优先：

- Shot single update；
- Shot bulk update；
- reorder；
- Field archive/purge；
- Review decision；
- Board save；
- Lighting save；
- Import commit。

---

## 27.5 Track A 完成条件

- 所有核心 feature 有真实入口；
- 所有核心 feature 有 owner；
- 不再靠文件名猜“谁负责”；
- dirty git baseline 已记录；
- 未知文件不删除；
- Legacy Freeze 生效；
- 生产不变。

---

# 28. Track B — Workspace Kernel

### 对应 Lifecycle Phase 1

---

## 28.1 Selection Cutover

迁移顺序：

```text
识别旧 selection 状态
→ 新统一 owner 先读
→ 调用方逐个接入
→ 对照 old/new
→ 新 owner 接管
→ 删除旧 selection write
```

验收：

- Table 单击只 select；
- Card 单击只 select；
- Timeline 单击只 select；
- Search 只 navigate/select；
- 删除实体清理 selection；
- reload 后行为明确。

---

## 28.2 Inspector Cutover

迁移顺序：

```text
列出所有 inspector open 写入点
→ 区分 selection / inspect
→ 接入统一 owner
→ 删除 selected→inspect side effect
→ 统一 close / pin / entity removal
```

验收：

- 连续单击镜头不会意外开详情；
- 双击/详情按钮打开正确实体；
- 切 View 行为符合生命周期规则；
- 删除被 inspect 实体后不残留；
- 关闭后无透明交互层。

---

## 28.3 Overlay / Focus Cutover

迁移：

```text
Modal
ContextMenu
Popover
Drawer
Tooltip
```

逐个迁到共享生命周期。

验收：

- Esc；
- outside click；
- focus trap；
- focus return；
- nested overlay；
- animation exit；
- pointer-events。

---

## 28.4 视觉状态

验收：

- 鼠标 click 不产生错误 keyboard focus ring；
- selected 与 focus 可区分；
- active / error / disabled 不相互覆盖；
- 1440 / 1024 / 窄屏几何一致。

---

# 29. Track C — Persistence & Schema

### 对应 Lifecycle Phase 2

---

## 29.1 Save Path Inventory

迁移前找出所有：

```text
save()
autoSave()
Ctrl/Cmd+S
blur save
cell commit
inspector submit
canvas save
```

确认是否走同一服务器事实。

---

## 29.2 Editor Flush

### ACCEPTED 目标

保存必须包含当前活跃编辑器尚未 blur 的值。

### PROPOSED

可建立统一：

```text
flushActiveEditors()
```

或等价机制。

不强制函数名。

---

## 29.3 Normalized Patch

### ACCEPTED

业务写入不应从 DOM 随机读取后直接 fetch。

应先形成可验证变更。

### PROPOSED

例如：

```json
{
  "entity_id": "...",
  "expected_revision": 19,
  "changes": {}
}
```

---

## 29.4 Single / Bulk Shot Semantic Unification

当前两条写路径已有不同模块。

迁移目标：

- identity 一致；
- capability 一致；
- revision 一致；
- validation 一致；
- conflict 一致；
- transaction 语义清楚；
- audit/event 不重复。

不要求马上合成一个 HTTP endpoint。

---

## 29.5 Field Lifecycle

当前历史语义可能包含：

```text
state='removed'
permanently_deleted
```

目标长期语义可以收敛为：

```text
active
archived
purged
```

### 注意

这些新状态名在真正 migration 前应先核对：

- DB schema；
- server serializers；
- client projection；
- existing tests。

如果已有不同稳定名称，应迁移语义，不为了命名而改数据。

---

## 29.6 Purge 不变量

一旦业务上确认永久删除完成，旧配置不能再将 Field 恢复到活跃表头。

必须检查：

```text
saved view
localStorage
column order
import mapping
default columns
custom values
revision/audit read model
share snapshot
```

审计历史可以只读引用已经 purge 的字段，但不能让它重新成为可编辑活跃字段。

---

# 30. Track D — Core Views

### 对应 Lifecycle Phase 3

---

## 30.1 Query Ownership

目标：

```text
同一 Shot 事实
→ 不同 display adapters
```

Table/Card/Timeline 不拥有三套可写实体。

---

## 30.2 Table

需要迁移：

- row selection；
- cell edit；
- bulk edit；
- column preference；
- custom field；
- reorder；
- asset/image；
- keyboard；
- save acknowledgement。

每个能力迁移后删除对应旧 listener，而不是等整张 Table 重写完再统一删除。

---

## 30.3 Card

Card 只拥有显示状态。

编辑仍走同一 Shot 写路径。

点击只 selection。

详情显式打开 Inspector。

---

## 30.4 Timeline

Timeline 可以拥有：

- zoom；
- scroll；
- playhead；
- visual track state。

Shot duration 事实必须与其他 View 同源。

改变时长后：

```text
write
→ ack
→ query refresh
→ Table/Card 同步
```

---

## 30.5 Search

Search result 应提供定位信息。

默认动作：

```text
navigate
select
focus/scroll
```

不能用“找到一个 Shot”作为自动打开 Inspector 的理由。

---

## 30.6 Narration

现有服务端已有统一计时函数。

迁移时必须防止前端创建第二套算法。

自动计时与手工时长的具体状态字段需根据现有代码核实，但长期要求：

```text
手动锁定不被自动算法静默覆盖
```

---

# 31. Track E — Review / Presence

---

## 31.1 Review Cutover

先 inventory：

```text
shot_versions
review_decisions
project_snapshots
audit_log
现有 Review UI
```

再定义最小 DTO。

不能根据本文候选字段直接新增重复表。

---

## 31.2 Review 验收

必须覆盖：

- revision 为空；
- accept；
- reject；
- cancel；
- reload；
- restore；
- actor；
- previous/current；
- conflict。

---

## 31.3 Presence Cutover

先 inventory：

```text
当前是否已有 websocket
当前 presence state
在线用户来源
selection broadcast
canvas cursor
reconnect
```

然后再决定：

```text
session / heartbeat / TTL
```

的具体协议。

---

# 32. Track F — Creative Workspace

### 对应 Lifecycle Phase 4

---

## 32.1 Moodboard

迁移前 inventory：

- persisted JSON；
- revision；
- serializer；
- asset refs；
- local draft；
- canvas UI state；
- save endpoint。

保留数据语义，不因重构丢未知字段。

---

## 32.2 Lighting

迁移前 inventory 当前真实 schema。

不要先规定新字段。

需要确认：

```text
文档版本
scene/canvas data
asset refs
camera/view state
save format
revision
```

哪些是业务事实，哪些只是 UI 状态。

---

## 32.3 Canvas Lifecycle

### ACCEPTED

必须确保离开或切模式时：

- 停止不再需要的 RAF；
- 移除 listener；
- 清理 overlay；
- 释放无用 WebGL resource；
- 不继续运行不可见 canvas。

---

## 32.4 PROPOSED Canvas Stress Test

可以增加重复：

```text
2D ↔ 3D
```

切换测试。

具体循环次数属于测试预算，不是历史既定需求。

建议在实际性能基线后确定，例如：

```text
10–20 次
```

---

# 33. Track G — Import / Export

---

## 33.1 Import

现有真实流程必须继续工作。

解析与提交继续保持概念分离：

```text
parse / preview
!=
commit
```

Parser 不应因为迁移而直接拥有 Project transaction。

---

## 33.2 Import Impact

对于 replace 等破坏性操作，迁移后的 UI 应清楚显示影响。

具体字段由现有 import contract 决定。

---

## 33.3 Export Source

目标：

```text
同一个 Project/Shot 呈现快照
→ PDF / Word / Delivery
```

当前实现已经从 `app.js` 呈现模型取一致数据。

迁移时逐步把“呈现模型”收敛为更明确的 Query / Document Snapshot，但在真正切换前不能写成当前已完成。

---

## 33.4 Word

当前状态：

```text
VERIFIED_LOCALLY
```

迁移时重点验证：

- editable `.docx`；
- image embedding；
- page flow；
- missing/unsupported image handling；
- current export UI；
- fields/range 与其他 export 同源。

---

# 34. Track H — Legacy Retirement

### 对应 Lifecycle Phase 5 清理部分

旧路径删除不是“重构之后顺手清理”，而是迁移本身的一部分。

---

## 34.1 删除前必须查

### HTML

```text
script/style references
```

### JavaScript

```text
static import
dynamic import
window global
custom events
listeners
```

### DOM

```text
selectors
data attributes
MutationObserver
```

### CSS

```text
class
id
attribute selectors
root state classes
```

### Python / Build

```text
static paths
generated references
build manifest
deployment package
```

### Tests / Docs

```text
browser tests
fixtures
runbook
```

---

## 34.2 Legacy 删除顺序

```text
new path implemented
→ local verification
→ default to new
→ disable old write
→ verify
→ disable old read
→ remove callers
→ remove listeners
→ remove CSS
→ remove adapter
→ remove feature flag
→ remove file
```

不是：

```text
新文件存在
→ 删除旧文件
```

---

# 35. Track I — Repository / PostgreSQL / Platform / AI

---

## 35.1 Repository

已有 `apps/api` SQLAlchemy/AsyncSession/Alembic 与 Legacy raw DB-API 仓储两套 persistence 语义。切换前应先把：

```text
Application / Domain
```

与 SQLite-specific access 分离。

目标逻辑：

```text
Application
   ↓
Repository Protocol
   ↓
SQLAlchemy Repository + AsyncSession/Unit of Work
   ↙        ↘
SQLite dev/test     PostgreSQL target
```

### 审计要求

先核实：

- 哪些独立模块仍直接接收 SQLite connection；
- 哪些 transaction 由 handler 拥有；
- 哪些 helper 隐藏 SQL。

再定义 Repository。

---

## 35.2 PostgreSQL

切换前：

1. actual business copy inventory；
2. SQLite backup/restore；
3. media/storage mapping；
4. Repository behavior test；
5. write freeze plan；
6. last acknowledged revision；
7. offline migration；
8. isolated E2E；
9. human approval。

### 回滚

如果新库没有接受写入，可以切回原 SQLite 快照。

如果已经接受写入：

```text
禁止静默丢弃 PostgreSQL 新写入后直接回旧库
```

必须 reconcile / replay / manual review。

---

## 35.3 FastAPI

FastAPI 是 HTTP 框架迁移，不是业务迁移捷径。

只有在业务逻辑已经逐步脱离 `AppHandler` 后，再迁：

- route；
- request validation；
- auth dependency；
- serialization；
- error mapping。

禁止把新 Domain 逻辑重新塞回 FastAPI route。

---

## 35.4 Electron

未来 Electron 应通过 PlatformAdapter 复用 Workspace。

Platform 层只解决：

- window；
- file picker；
- clipboard；
- local file capability；
- save/download integration。

不创建第二套：

- Shot Table；
- Review；
- Moodboard；
- Lighting。

---

## 35.5 AI

当前 VNext AI = mock/provider/proposal 局部实现；Legacy 还有独立 `ai_system`。没有真实 V-Web 消费、持久 Job 或经过普通 Shot Command 的人工接受链，不得标成 AI 完成。

目标 AI：

```text
permission-filtered context
→ gateway/provider
→ structured result
→ proposal/diff
→ human accept
→ normal command
```

---

## 35.6 PROPOSED AI Job / Proposal

候选 Job：

```text
queued
running
completed
failed
cancelled
```

候选 Proposal 信息：

```text
capability
provider
model
schema version
input/context summary
result/diff
source
created time
```

这些字段在 AI 真正进入实现前仍是 PROPOSED。

---

# 36. Track J — Release

### 对应 Lifecycle Phase 6

当前暂停。

在用户重新明确授权前，不执行：

- 生产部署；
- 生产数据库切换；
- 生产 schema 迁移；
- 生产流量切换。

---

# 37. QA：已接受要求与新增建议分开

---

## 37.1 EXISTING / ACCEPTED QA

现有文档已经明确：

- 1440；
- 1024；
- 窄屏；
- 真实浏览器交互；
- 200 / 500 Shot fixture；
- animation 不残留交互层；
- Canvas/WebGL 生命周期；
- Excel 回归；
- 构建不改变用户数据；
- 发布健康不只是 HTTP 200。

这些可以作为正式要求。

---

## 37.2 PROPOSED Long-session Budget

为了暴露保存锁、listener、RAF、overlay 等问题，建议加入长会话 QA。

候选预算：

```text
15–30 分钟
约 200 次以上编辑动作
```

这是 2026-09-27 新增建议，不是原项目已有历史要求。

在团队确认后可升级为 ACCEPTED。

---

## 37.3 Long-session 建议场景

建议包含：

- 连续 cell / Inspector edit；
- Ctrl/Cmd+S；
- auto-save；
- Table/Card/Timeline 切换；
- Search；
- Inspector 高频开关；
- timeout；
- reconnect；
- conflict；
- Review；
- Moodboard；
- Lighting；
- Import；
- Export。

---

## 37.4 建议结束检查

```text
save lock
pending operations
timers
RAF
listeners
realtime subscriptions
pending requests
hidden overlays
canvas/WebGL
stale selection
stale inspector
```

这些检查项可以先作为诊断 checklist，不要求当前系统已经提供统一 instrumentation。

---

# 38. Browser QA

每个真实迁移切片至少验证：

### 1440

完整桌面工作区。

### 1024

紧凑桌面布局。

### 窄屏

核心浏览/编辑路径不发生严重重叠和不可操作。

Lifecycle 当前对 320px 的要求仍以桌面优先为前提，复杂 2D/3D 不因迁移被强制要求完整手机体验。

---

# 39. Keyboard QA

迁移涉及的组件按实际支持功能检查：

```text
Tab
Shift+Tab
Enter
Space
Esc
Delete
Ctrl/Cmd+S
Ctrl/Cmd+Enter
```

必须特别避免：

- input 中 Delete 误触实体删除；
- textarea Enter 被错误当提交；
- Modal 关闭后 focus 丢失；
- hidden overlay 仍吃键盘。

---

# 40. 数据迁移验证

每次 schema/data migration 至少记录：

```text
migration id
preconditions
source version
forward operation
verification
backup
restore procedure
known irreversible part
```

注意：

> “有 backup/restore”与“每个 migration 都有 down migration”是两个概念。

如果 migration 本身不可逆，应明确写：

```text
rollback = restore known-good backup
```

而不是伪造 reverse SQL。

---

# 41. Feature Flag

Feature flag 仅用于迁移。

每个 flag 记录：

```text
purpose
old path
new path
default
rollback
removal condition
owner
```

验证完成后必须：

```text
new default
→ disable old
→ remove old
→ remove flag
```

不能长期靠 flag 维持双实现。

---

# 42. Logging / Observability

### ACCEPTED TARGET

重要写入需要可关联：

```text
request
command
actor
entity
revision
result
```

### PROPOSED 字段

可以使用：

```text
request_id
command_id
project_id
entity_id
expected_revision
actual_revision
duration
error_code
```

日志字段名应结合现有日志系统确定。

### 禁止

记录：

- password；
- auth token；
- 不必要的完整素材；
- 大段用户脚本正文；
- API key。

---

# 43. Decision Log

本节用来区分“已有事实”“已经接受的新规则”和“仍是候选设计”。

| ID | 状态 | 决策 | 依据/说明 |
| --- | --- | --- | --- |
| MIG-001 | ACCEPTED | Legacy Freeze：旧静态路径停止承载新长期功能 | 双轨不可长期续命；迁移完成需删除旧路径 |
| MIG-002 | ACCEPTED | Selection 与 Inspector 解耦 | 生命周期交互契约已明确 |
| MIG-003 | ACCEPTED | 单一 authoritative write path | 原迁移文档明确禁止两个权威状态源 |
| MIG-004 | ACCEPTED | 保存成功由 acknowledged revision 驱动 | 原迁移文档已明确 |
| MIG-005 | ACCEPTED | AI Proposal 需人工接受后走普通 Command | 原迁移文档与生命周期均明确 |
| MIG-006 | ACCEPTED | `architecture_boundary_gate.py` 当前只证明 `packages/ui/src` 边界 | 本轮审计修正 |
| MIG-007 | ACCEPTED | Word 当前状态为 `VERIFIED_LOCALLY`，不再写“未实现” | Architecture + Lifecycle 已证明本地实现与验收 |
| MIG-008 | ACCEPTED | 本迁移文档不用第二套 Phase 编号，改用 Migration Track | 防止与 Lifecycle Phase 冲突 |
| MIG-009 | PROPOSED | Presence 采用 session + heartbeat + TTL | 需先审计现有 realtime 实现 |
| MIG-010 | PROPOSED | 浏览器请求统一 timeout/cancellation/reconciliation | 需审计现有 request layer |
| MIG-011 | PROPOSED | 长会话 15–30 分钟 / 约 200+ edits | 新增 QA 建议，等待团队确认 |
| MIG-012 | PROPOSED | Review 拆分明确 Revision DTO / Decision DTO | 需先审计现有 DB schema，避免重复表 |
| MIG-013 | PROPOSED | Workspace 使用独立 Selection/Inspector/Modal 等 store/slice | ownership 已接受，具体实现待审计 |
| MIG-014 | PROPOSED | Lighting V2 DTO 的具体字段 | 必须在 schema inventory 后再决定 |

---

# 44. Codex / 开发执行模板

每次迁移任务开始前必须先写：

```text
Feature:
Current real entry:
Current callers:
Current DOM owner:
Current state owner:
Current write owner:
Current API:
Current DB/data touched:

Accepted invariant:
Proposed implementation:
Files to change:
Files explicitly NOT to change:

Cutover plan:
Rollback:
Tests:
Legacy deletion candidates:
Unknowns requiring audit:
```

---

# 45. 每个 Change Set 结束必须回答

```text
1. 哪个真实用户入口已经迁移？
2. 新路径是否真正接管？
3. 旧写路径是否仍存在？
4. 是否产生第二个状态源？
5. API 是否变化？
6. DB/schema 是否变化？
7. 是否有新的 Proposed Contract 被落实？
8. 如果有，Decision Log 是否升级状态？
9. Browser QA 做了什么？
10. 数据/Excel/PDF/Word 回归是否相关？
11. 哪些旧代码已经证明可以删除？
12. 哪些旧代码仍不能删？为什么？
13. 如何回滚？
```

---

# 46. 单个迁移切片 Definition of Done

```text
Feature:
Old Entry:
New Entry:

Baseline Evidence:
Accepted Invariants:

Domain/Data Owner:
UI State Owner:
Read Path:
Write Path:

API Contract:
Revision Rule:
Conflict Rule:

Feature Flag:
Rollback:

Old Write Disabled:
Old Listener Removed:
Old CSS Removed:
Old Adapter Removed:

Python/Contract Tests:
Browser QA:
Data Regression:
Long-session QA (if accepted/applicable):

Status:
```

如果以下任一项未知：

```text
Old Entry
Write Path
Rollback
State Owner
```

不得标记：

```text
VERIFIED_LOCALLY
```

---

# 47. 删除旧代码的机器/人工门槛

旧代码删除前至少核实：

```text
static/index.html
build.mjs
package.json
Python imports
dynamic references
global symbols
custom events
DOM selectors
CSS selectors
browser tests
deployment manifest
docs/runbook
Git status
```

对：

```text
data/
media/
backup/
qa evidence/
```

不能使用“代码无人引用”作为删除依据。

---

# 48. 迁移失败时的处理

如果一个迁移切片出现：

- API 行为不一致；
- 数据丢失风险；
- revision/conflict 行为无法解释；
- 新旧路径同时写；
- 浏览器真实入口仍走旧代码；
- long-session 出现不可恢复状态；
- rollback 不清楚；

则：

```text
不删除旧路径
不扩大迁移范围
先恢复到已知安全状态
```

禁止通过：

- 更多 CSS override；
- 更多 adapter；
- 更多全局变量；

掩盖 ownership 问题。

---

# 49. 当前优先级

## P0

- Baseline / Ownership Inventory；
- Legacy Freeze；
- Selection / Inspector；
- Shot write path；
- acknowledged revision；
- conflict；
- Field lifecycle；
- backup / restore；
- 双写消除。

## P1

- Table / Card / Timeline 同源；
- Review Revision Audit；
- Presence inventory；
- Overlay / Focus；
- Design System；
- Motion；
- i18n runtime；
- browser lifecycle QA。

## P2

- Moodboard / Lighting lifecycle；
- 200/500 Shot 性能；
- thumbnail / worker 等有证据优化；
- richer observability。

## P3

- PostgreSQL；
- FastAPI；
- Electron；
- AI Gateway / Worker / Proposal；
- Redis / CRDT / vector search，仅在需要时。

---

# 50. 推荐近期执行顺序

这不是第二套 Lifecycle Phase，只是当前技术任务顺序。

```text
1. 完成 Frontend Entry / DOM / State / Write Inventory
2. 固化 Legacy Freeze
3. 审计并统一 Selection owner
4. 审计并统一 Inspector owner
5. 删除 selected→inspect 的隐式路径
6. 统一 Overlay / Focus 生命周期
7. 审计所有 Save 入口
8. 收敛 Shot single/bulk revision / capability / error semantics
9. 建立或确认统一 Query refresh
10. Table 接管
11. Card 接管
12. Timeline 接管
13. Search 接管
14. Field lifecycle 完整回归
15. Review schema / UI inventory
16. Presence realtime inventory
17. Moodboard schema / lifecycle inventory
18. Lighting schema / WebGL lifecycle inventory
19. Import / Export 同源收敛
20. 按证据删除 Legacy
21. Repository 抽象
22. 实际业务副本迁移演练
23. 再评估 PostgreSQL / FastAPI / Electron / AI
```

---

# 51. 当前明确禁止

当前阶段禁止：

- 未经授权部署生产；
- 直接改线上数据库测试 schema；
- 一次删除整个 `static/`；
- 直接按本文件候选 DTO 新建重复数据库模型；
- Presence 未审计就假定已有 session/TTL 协议；
- Lighting 未 inventory 就按候选字段重写；
- AI 自动写 Project；
- 同一 Entity 保留两个长期写路径；
- 通过新增第三套状态管理绕过现有 ownership；
- 用更高 CSS specificity 解决状态架构错误；
- 把 `npm run check` 当纯只读检查。

---

# 52. 当前已实现 / 迁移中 / 目标态

## VERIFIED / VERIFIED_LOCALLY

- 当前 Python/SQLite 运行入口；
- 多个后端独立模块存在；
- Shot single/bulk 业务块部分提取；
- Shot version 部分提取；
- import parsing/staging；
- schema version 1；
- schema inventory tool；
- synthetic SQLite backup/restore rehearsal；
- `packages/ui` boundary gate；
- PDF；
- Landscape PDF；
- Word `.docx`；
- document media preflight；
- delivery format logic。

---

## PARTIAL

- Workspace React 化；
- UI ownership；
- Selection / Inspector 分离；
- Save Kernel；
- unified Shot Query；
- Field lifecycle 完整收敛；
- Review Audit；
- Presence；
- Design System 全覆盖；
- Motion 全覆盖；
- Moodboard / Lighting lifecycle；
- i18n 覆盖。

---

## PLANNED

- 完整 Repository abstraction；
- PostgreSQL 正式切换；
- FastAPI 正式切换；
- Worker；
- Electron PlatformAdapter 正式完成；
- AI Gateway；
- Proposal Store；
- Redis / CRDT / vector search（仅在需要时）。

---

# 53. 最终核心架构完成条件

只有当以下条件都有证据，才允许说：

```text
核心架构迁移完成
```

需要：

```text
一个业务事实源
一个 authoritative write path
Selection / Inspector 独立
Modal / Overlay 生命周期统一
保存状态可信
revision / conflict 统一
Field purge 不复活
Table/Card/Timeline 数据一致
Review 可审计
Presence 不污染持久业务数据
Design System 有明确边界
旧 CSS/JS 按证据删除
Import / Export 不回归
实际业务数据恢复可演练
长会话无明显状态泄漏
生产发布有明确授权与回滚证据
```

---

# 54. 本文件和其他文档的最终职责

## `ARCHITECTURE.md`

回答：

```text
现在是什么？
哪些文件真的在运行？
怎么构建？
哪些是源码？
哪些是生成物？
哪些事实已经验证？
```

## `ARCHITECTURE_MIGRATION.md`

回答：

```text
从当前怎么迁？
哪些规则必须保持？
哪些技术方案只是候选？
怎么切换？
怎么验证？
怎么回滚？
什么时候删旧路径？
```

## `LIFECYCLE_ARCHITECTURE_PLAN.md`

回答：

```text
Project / Shot / Field / Asset / Board / Review / AI
在产品生命周期中如何流转？
整个实施阶段如何编号？
```

任何时候三份文件冲突：

```text
先核实代码 / 运行入口 / 测试证据
→ 再更新文档
```

不能让文档之间相互“引用”来证明一个实际并不存在的能力。

---

# 55. 迁移的最终判断标准

判断一次迁移是否有效，不看：

```text
文件是不是更多
目录是不是更现代
框架是不是更新
代码是不是更抽象
```

而看：

```text
真实入口是不是更明确？
状态源是不是更少？
写路径是不是更少？
旧路径是不是实际退出？
数据语义是不是更稳定？
冲突是不是更可解释？
失败是不是更可恢复？
测试是不是覆盖真实用户路径？
候选设计和已实现事实是不是清楚区分？
```

只有这些指标整体改善，才属于有效的 FrameForge 架构迁移。

## 2026-09-28 本地验收状态补充

- 工程 PDF 的服务端导出/导入路由已在隔离本地环境验证：完整 v2 backup 作为 PDF 附件保存，按 SHA-256 校验；页面包含不可见文字水印，约 25 mm QR 仅承载摘要 manifest，完整工程素材仍在附件。导出/导入往返恢复镜头及 PNG 字节。普通 PDF 不包含完整工程数据，不能无损回导。
- 已检查的真实样本普通 PDF 使用矢量字形但没有可提取文本层，当前解析 fallback 为整页图像；这只是该样本的观察结果，不代表所有普通 PDF。
- 真实 Excel 导入已实现，保留 `.xlsx`、字段映射、嵌入图片与原始列能力。
- Review status 版本竞争修复已通过本地验证；2D/3D Split 的 RAF cleanup 已验证。
- MIG-002 Selection / Inspector 切片：VERIFIED_LOCALLY（隔离源码 Playwright 覆盖 1440/320/374/375/390/768；单击选中不改变已打开详情目标，双击/显式详情打开或切换，删除目标/切视图关闭，aria-pressed 同步，刷新重绘目标）。整体 React/Legacy cutover 与旧路径退役仍未完成；未部署。
- 未部署生产。上述均为本地证据，不构成生产发布或整体迁移完成证明。

当前并行会话、代码范围与验收门槛见 [ACTIVE_WORKSTREAMS.md](ACTIVE_WORKSTREAMS.md)。
