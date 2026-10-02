# FrameForge 架构与开发入口（审计增强版）

> 审计日期：2026-09-29（基于本地 `7b3a24c` 与入口/导入盘点）
> 原始基线：`ARCHITECTURE.md`（2026-09-24 之后持续维护版本）  
> 文档定位：**当前仓库事实文档 / 开发入口 / 架构边界说明 / 维护约束**  
> 当前状态：本地重构进行中；生产环境保持现状；用户已暂停部署。  
> 关联文档：`ARCHITECTURE_MIGRATION.md`、`LIFECYCLE_ARCHITECTURE_PLAN.md`、[CANONICAL_OWNER_MATRIX.md](CANONICAL_OWNER_MATRIX.md)
> 重要说明：本文件区分当前已配置的 Legacy 服务入口与仓库中已有的 VNext 实现。目标代码存在、被局部测试或在开发入口挂载，都不等于生产运行权已经切换。本轮未探测生产服务。
>
> **2026-10-02 最新决策：**VNext 采用原生重构，不迁移 Legacy 数据库/旧工程数据，不兼容 Legacy API/session/runtime。Legacy 仅保留为功能参考及临时“工程文件导出桥接”；允许为该导出合同窄范围修改旧源码。下文描述 Legacy 当前运行事实的段落仍是历史/现状证据，但不再构成 VNext 兼容门槛。

---

# 1. 审计结论摘要

当前 FrameForge 的架构状态可以准确描述为：

```text
Legacy 静态前端
+
React / TypeScript Workspace
+
Python 单体 HTTP 入口
+
已经开始抽离的业务模块
+
SQLite 当前持久化
+
独立的导入 / 导出 / schema migration 辅助模块
+
monorepo 中并行存在 apps/api、apps/web、根 packages/*
```

当前还不能描述为：

```text
Legacy 已由完整 React 应用替换
FastAPI 已成为唯一生产 API
PostgreSQL 已成为真实持久化 owner
CRDT 协作系统
AI/Presence 已接通完整产品工作流
Electron 完成版
```

本轮审计确认以下事实：

1. `static/index.html` 仍同时加载 Legacy 与 React Workspace；
2. `static/app.js` 仍属于真实运行源码，而不是已经废弃的历史文件；
3. `src/workspace/index.tsx` 是新的工作区构建入口，但尚未独占所有页面逻辑；
4. `server.py` 仍是 HTTP/API、认证、静态资源、数据库访问与部分业务流程的中心；
5. 多个业务块已经从 `server.py` 提取，但这只是局部拆分；
6. 根 `packages/ui` 与 `storyboard-system/packages/ui` 都命名为 `@frameforge/ui`；前者目前仅有 token/词典，后者拥有成熟控件，尚未收敛；
7. `npm run check` 不是只读检查，会重新构建并写入静态输出；
8. SQLite 仍是当前运行数据库；
9. `schema_migrations.py` 已建立版本 1 基线；
10. PDF / 横版 PDF / Word `.docx` / 文档媒体预检已有真实实现；
11. `architecture_boundary_gate.py` 当前明确验证的是 `packages/ui/src` 的前端共享包边界；
12. 不能扩大解释为“全部后端架构已经机器验证”；
13. `apps/api` 已有 FastAPI/SQLAlchemy/Alembic/asyncpg 代码，`apps/web` 已有 Next/React 页面；AI 和 Presence 亦有并行实现，但路由/业务对等、真实消费者与旧 owner 退出均未完成；
14. 当前未授权生产部署，因此任何架构修改都只能停留在本地/隔离验证阶段。

---

# 2. 事实等级约定

为避免后续文档再次把计划写成事实，本文件使用四级事实标签。

## 2.1 VERIFIED — 已核实

满足至少一种：

- 当前仓库中存在真实文件；
- 当前构建配置直接引用；
- 当前运行入口直接加载；
- 当前测试实际覆盖；
- 当前工具真实可运行；
- 已有文档和代码相互印证。

## 2.2 IMPLEMENTED — 已实现但未完全验证

代码已经存在，但：

- 没有完整浏览器回归；
- 没有长会话测试；
- 没有生产发布证据；
- 或尚未证明是唯一真实入口。

## 2.3 PARTIAL — 部分迁移

存在新实现，但：

- Legacy 仍然在运行；
- 新旧状态可能并存；
- 新路径未完全接管；
- 旧代码不能删除。

## 2.4 PLANNED — 目标或计划

只有：

- 文档设计；
- 目标架构；
- 未来接口；
- 未来目录；
- 尚未真实切入运行路径。

本文件中不得把 PLANNED 写成 VERIFIED。

---

# 3. 运行入口与数据流

当前浏览器入口：

```text
浏览器
  ↓
static/index.html
  ├── static/app.js
  │     └── 旧版 / 通用页面逻辑
  │
  ├── static/*-workspace.js
  │
  ├── static/*system.js
  │
  ├── 其他直接加载的 feature JS / CSS
  │
  └── static/workspace-v73.js
        └── src/workspace/index.tsx
              ├── sidebar.tsx
              ├── toolbar.tsx
              ├── store.ts
              ├── contracts.ts
              └── theme.css
```

服务端数据流：

```text
浏览器
  ↓
HTTP API
  ↓
server.py
  ↓
SQLite
媒体目录
导入暂存目录
```

状态：**VERIFIED**

---

# 4. 当前前端真实状态

## 4.1 Legacy 与新 Workspace 同时运行

当前 `static/index.html` 直接加载：

```text
static/app.js
static/workspace-v73.js
多组 feature JS
多组 feature / workspace / editor CSS
```

因此当前实际架构是：

```text
Legacy runtime
+
React Workspace runtime
```

而不是：

```text
Legacy 已被 React 替换
```

### 直接影响

这意味着任何 UI bug 都可能来自：

- 新 React 组件；
- `app.js`；
- 老 feature script；
- CSS 覆盖；
- 重复事件监听；
- DOM ownership 冲突；
- 两套状态同步不完整。

### 当前风险

特别容易出现：

- 详情页被旧监听器重新打开；
- 搜索点击导致 selection 与 inspector 同时变化；
- React 更新后 Legacy 又重写 DOM；
- 新 CSS 被旧 CSS 覆盖；
- 同一按钮同时触发两个 handler；
- 同一个状态在 localStorage / JS global / React store 中存在多个副本。

状态：**VERIFIED / HIGH RISK**

---

# 5. `static/app.js` 当前定位

`static/app.js` 目前仍是：

```text
真实运行源码
```

不是：

```text
纯历史文件
构建产物
可直接删除文件
```

当前已知它仍参与：

- 页面状态；
- 呈现模型；
- 导出数据；
- 旧通用页面逻辑；
- 若干 feature 连接。

因此：

> 任何删除或大规模改写 `static/app.js` 的操作，都必须先完成真实调用者审计。

### 修改要求

在修改 `app.js` 前必须检查：

```text
static/index.html
全局函数
window.*
custom event
DOM selector
data-*
localStorage key
export renderer consumer
browser QA
```

状态：**VERIFIED**

---

# 6. React / TypeScript Workspace 当前定位

当前源码：

```text
src/workspace/
```

构建入口：

```text
src/workspace/index.tsx
```

当前工作区中已经存在：

```text
sidebar.tsx
toolbar.tsx
store.ts
contracts.ts
theme.css
```

这说明新的工作区已经形成基础架构，但不能据此推断：

- 所有 View 已迁入；
- 所有状态都由 React store 统一；
- 所有 Modal / Inspector 都已迁移；
- 所有业务写操作都来自 Workspace。

状态：**VERIFIED / PARTIAL**

---

# 7. `packages/ui` 当前定位

仓库里有两个同名 npm package，不能再以相对路径混称：

```text
repo-root/packages/ui/                 （目标 owner；当前以 tokens/i18n 为主）
storyboard-system/packages/ui/         （成熟 Legacy primitive 的迁移源）
```

其职责：

```text
共享 React 控件
通用 UI 表现
通用交互能力
```

Legacy TypeScript 配置会检查：

```text
storyboard-system/packages/ui/src
```

`storyboard-system/src/workspace/index.tsx` 通过 path alias 使用 Legacy 包；`apps/web` 目前只从根包使用 token/词典，没有消费其 Button/Input 等 primitive。迁移时必须逐组件证明两端消费与视觉、焦点对等。

### 当前不能声称

不能仅因为 `packages/ui` 存在，就声称：

- 全站 Button 已统一；
- 全站 Input 已统一；
- 全站 Modal 已统一；
- Inspector 已统一；
- Toast 已统一；
- 所有 focus ring 已统一；
- 所有旧 CSS 已淘汰。

这些需要真实调用审计。

状态：**VERIFIED / PARTIAL**

---

# 8. 当前服务端运行入口

根目录：

```text
server.py
```

当前负责：

- Python 标准库 HTTP 服务；
- API 路由；
- 身份验证；
- 静态资源；
- 媒体资源；
- SQLite 访问；
- 事务入口；
- 导入；
- 导出；
- 运行目录；
- 多个尚未迁出的业务流程。

当前 `AppHandler` 仍集中处理：

```text
GET
POST
PUT
DELETE
```

因此不能写成：

```text
server.py 只负责 bootstrap
```

那属于目标态。

状态：**VERIFIED**

---

# 9. 已从 `server.py` 提取的后端模块

当前已经存在并被服务端复用：

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

这些模块说明后端拆分已经开始。

但：

> “独立文件存在”不等于“领域边界已经完成”。

还必须逐模块检查：

```text
是否反向 import server.py
是否直接操作 HTTP
是否直接拼业务响应
是否拥有 transaction
是否拥有 DB connection
是否拥有文件系统副作用
是否复制同一业务逻辑
```

状态：**VERIFIED / PARTIAL**

---

# 10. `asset_cleanup.py`

当前职责：

- 资产引用保护原因；
- 只读清理预览分类。

已知边界：

- 依赖 SQLite connection；
- 不访问文件系统；
- 不直接删除数据。

### 审计结论

这是相对清晰的业务辅助模块。

当前不能扩大为：

```text
完整 Asset Service
```

因为执行删除和文件清理仍可能位于其他路径。

状态：**VERIFIED**

---

# 11. `narration_timing.py`

当前职责：

```text
旁白时长估算
镜头自动计时
```

当前定位：

```text
纯计算模块
```

服务端 API 与 Python 契约复用同一实现。

### 风险

未来如果前端再次实现另一份旁白时长算法，会导致：

```text
Browser duration != Server duration
```

因此当前维护原则：

> 旁白计时公式继续保持单一实现来源。

状态：**VERIFIED**

---

# 12. `delivery_exports.py`

当前职责：

- SMPTE；
- EDL；
- OTIO；
- FCPXML；
- SRT；
- VTT。

当前：

- 格式实现已从 `server.py` 提取；
- API handler 仍在服务入口。

### 审计结论

这是正确的提取方向，但仍不能写成：

```text
Export Application Layer 已完成
```

因为 HTTP、配置、数据查询、文件响应等可能仍分布在其他位置。

状态：**VERIFIED / PARTIAL**

---

# 13. `shot_updates.py`

当前职责：

```text
单镜头更新
字段级冲突
变更事件
```

已知真实入口：

```text
PUT /api/shots/{id}
```

当前旧业务块已经从 `server.py` 删除。

但服务入口仍承担：

- HTTP；
- 鉴权；
- 审核/审计相关编排；
- 状态映射。

### 审计结论

可以写：

```text
单镜头业务更新逻辑已迁出 handler
```

不能写：

```text
Shot Command 架构已完成
```

因为统一 `command_id`、actor、幂等、Event 与 Repository 契约仍属于迁移内容。

状态：**VERIFIED / PARTIAL**

---

# 14. `shot_bulk_updates.py`

当前职责：

```text
项目批量镜头更新
字段级冲突
Panel / 自定义字段
审计
```

真实入口：

```text
PUT /api/projects/{id}/shots
```

当前入口仍保留：

- authentication；
- transaction；
- HTTP mapping。

### 风险

单条更新与批量更新可能存在：

- capability 差异；
- revision 差异；
- error mapping 差异；
- audit 差异；
- partial failure 差异。

因此迁移目标应是统一语义，而不是继续独立演进两套更新模型。

状态：**VERIFIED / PARTIAL**

---

# 15. `shot_versions.py`

当前职责：

- 审核决定；
- 精简镜头快照；
- 版本恢复。

当前旧实现已经从 `server.py` 删除。

入口仍负责：

- HTTP 状态映射；
- 项目 bundle 查询；
- 部分版本路由。

### 当前不能声称

不能写：

```text
完整 Revision Domain 已完成
```

因为：

- Review workflow；
- restore command；
- selected revision scope；
- decision binding；

仍需进一步统一。

状态：**VERIFIED / PARTIAL**

---

# 16. `persistence_helpers.py`

当前职责：

```text
共享 SQLite 写入辅助
```

当前应继续被视为：

```text
Infrastructure helper
```

而不是 Domain。

### 审计关注

后续需检查：

- 是否被太多业务层直接调用；
- 是否形成隐式全局 transaction；
- 是否隐藏业务规则。

状态：**VERIFIED**

---

# 17. `runtime_clock.py`

当前职责：

```text
单调 UTC 时钟
```

目的：

- 避免多个模块自行生成时间；
- 统一事件时间；
- 统一版本时间语义。

状态：**VERIFIED**

---

# 18. `import_parsing.py`

当前职责：

- Excel/PDF 表头识别；
- 嵌入图片解析；
- 原始列定义；
- 解析与映射。

旧解析实现已从 `server.py` 删除。

但：

- staging；
- HTTP；
- transaction commit；

仍在其他路径。

### 维护规则

Parser 不应重新拥有：

- project write；
- transaction；
- UI mapping state。

状态：**VERIFIED / PARTIAL**

---

# 19. `import_staging.py`

当前职责：

- 导入预览缓存；
- 暂存图片；
- TTL；
- 过期清理。

暂存目录和 TTL 由服务端显式传入。

### 审计结论

这是较清楚的基础设施边界。

但完整 Import Workflow 仍未迁成独立 Application 层。

状态：**VERIFIED / PARTIAL**

---

# 20. `schema_migrations.py`

当前职责：

- SQLite 旧列基线升级；
- schema version；
- 漂移校验。

当前：

```text
version 1
```

覆盖原先分散的旧 `ALTER TABLE` 补丁。

### 已核实的重要改进

- 未知未来版本可拒绝启动；
- 已登记版本可以检查列漂移；
- 异常不再被静默吞掉。

### 尚未完成

- 实际业务数据的完整 schema inventory；
- 实际业务副本 backup/restore；
- 媒体映射恢复；
- PostgreSQL migration。

状态：**VERIFIED / PARTIAL**

---

# 21. `creative_boards.py`

当前属于：

```text
服务端复用的画板领域/业务逻辑
```

但仅从文件存在无法准确断言：

```text
Board Domain 已完整独立
```

继续拆分前应审计：

- DB dependency；
- serializer；
- revision；
- HTTP dependency；
- asset reference。

状态：**VERIFIED FILE / BOUNDARY TO AUDIT**

---

# 22. `field_lifecycle.py`

当前用于：

```text
字段生命周期
```

这部分与历史问题高度相关：

```text
归档
恢复
永久删除
旧字段复活
```

当前必须继续检查：

- 服务端 state；
- client projection；
- localStorage；
- saved view；
- import mapping；
- default columns。

状态：**VERIFIED / HIGH RISK**

---

# 23. `text_format.py`

当前属于：

```text
被服务端复用的文本格式逻辑
```

审计重点：

- 是否纯函数；
- 是否存在前端重复实现；
- 是否混入业务状态。

状态：**VERIFIED FILE**

---

# 24. 当前导出架构

## 24.1 普通 PDF

```text
static/storyboard-pdf-export.js
```

当前支持：

- 表格；
- 九宫格；
- 单镜详细。

状态：**VERIFIED**

---

## 24.2 横版 PDF

```text
static/storyboard-landscape-export.js
```

负责：

```text
横版分镜表预览 / 输出
```

状态：**VERIFIED**

---

## 24.3 Word

```text
static/storyboard-word-export.js
```

当前生成：

```text
真正 OOXML .docx
```

当前已知格式：

- 横向 A4；
- 逐镜两列表格；
- 长内容自然跨页。

状态：**IMPLEMENTED / VERIFIED_LOCALLY**

### 审计修正

旧迁移文档曾出现：

```text
“不声称 Word 已实现”
```

与当前实现事实冲突。

本文件统一口径：

```text
Word 已实现并本地验证
```

但：

```text
不能自动等同于生产 RELEASED
```

---

# 25. 文档媒体预检

文件：

```text
static/storyboard-document-media.js
```

当前职责：

- 导出图片预检；
- 图片嵌入前处理；
- 未知格式转换为 JPEG。

### 边界

导出脚本当前从 `app.js` 呈现模型获取：

- project；
- shot range；
- field label；
- value；
- image。

当前不能写成：

```text
已经完全迁到 ShotQuery / Document Snapshot
```

那是目标态。

状态：**VERIFIED / CURRENT MODEL DEPENDENT**

---

# 26. 当前构建入口

根：

```text
package.json
```

当前命令：

## `npm run build`

执行：

```text
build.mjs
```

使用：

- esbuild；
- Tailwind CLI。

当前写入：

```text
static/vendor/material-web.js
static/vendor/material-web LICENSE
static/vendor/three-bundle.js
static/workspace-v73.js
static/workspace-v73.css
```

状态：**VERIFIED**

---

# 27. `npm run check`

当前执行：

```text
tsc --noEmit
↓
npm run build
```

因此它不是：

```text
read-only typecheck
```

而是：

```text
typecheck + build + overwrite generated output
```

### 必须保留的警告

运行前检查：

```text
git status
```

避免覆盖：

- 未提交 bundle；
- 用户修改；
- 临时验证输出。

状态：**VERIFIED / IMPORTANT**

---

# 28. `npm run build:tokens`

当前：

```text
Tailwind CLI
```

写入：

```text
static/workspace-v73.css
```

状态：**VERIFIED**

---

# 29. Python 测试入口

当前 README 声明：

```text
python -m unittest discover -s tests -v
```

测试可能创建：

- 临时文件；
- SQLite DB；
- fixture。

### 安全要求

测试修改前必须确认：

```text
fixture path
data root
STORYBOARD_DATA_ROOT
temp dir
```

不接触真实运行数据。

状态：**VERIFIED**

---

# 30. TypeScript 检查范围

`tsconfig.json` 当前：

```text
strict = enabled
```

include：

```text
src/workspace
packages/ui/src
```

状态：**VERIFIED**

---

# 31. build.mjs 当前入口

当前 esbuild 入口：

```text
src/material-web.js
src/three-bundle.js
src/workspace/index.tsx
```

### 重要边界

```text
static/app.js
```

不由此 build 编译。

所以不能：

- 修改 `src/workspace` 后以为 `app.js` 自动同步；
- 修改 `app.js` 后以为 TypeScript 会检查它。

状态：**VERIFIED**

---

# 32. 当前数据库结构工具

## schema inventory

```text
py -3 tools/schema_inventory.py <数据库副本> --counts
```

当前可：

- 表；
- 列；
- index；
- foreign key；
- optional row count。

---

## compare

```text
py -3 tools/schema_inventory.py <数据库副本> --compare <迁移后副本>
```

用于：

```text
结构与行数对比
```

---

# 33. SQLite backup rehearsal

```text
py -3 tools/sqlite_backup_rehearsal.py <数据库副本>
```

当前已在合成隔离库验证：

```text
backup
restore
schema
row count
content digest
integrity_check
foreign_key_check
```

### 安全边界

已有源文件以只读方式打开。

工具不输出业务行内容。

状态：**VERIFIED ON SYNTHETIC DATA**

---

# 34. 当前数据库演练缺口

尚未证明：

- 真实业务 DB 副本完整演练；
- 媒体同步备份；
- storage key 恢复；
- asset orphan；
- revision chain；
- field tombstone；
- share snapshot；
- permission；
- import raw column。

因此不能写成：

```text
数据库/项目恢复体系已完成
```

状态：**PARTIAL**

---

# 35. 源码与生成物边界

## 35.1 构建输入

当前已确认：

```text
src/workspace/**
src/material-web.js
src/three-bundle.js
```

---

## 35.2 构建输出

当前已确认：

```text
static/workspace-v73.js
static/workspace-v73.css
static/vendor/material-web.js
static/vendor/three-bundle.js
```

---

## 35.3 直接运行源码

当前不能当成纯生成物：

```text
static/app.js
static/styles.css
static/*-workspace.js
其他直接加载 feature JS/CSS
```

状态：**VERIFIED**

---

# 36. `static/` 不能整体清理

`static/` 当前混有：

```text
源码
构建输出
字体
SVG
GLB
第三方资源
license
feature media
```

所以：

```text
rm -rf static/*
```

这类处理绝对错误。

每个文件都必须先判断：

```text
source
generated
third-party
asset
unknown
```

---

# 37. `dist/` 不能仅因 `.gitignore` 自动删除

`.gitignore` 只能说明：

```text
Git 不跟踪
```

不能证明：

```text
内容可重建
内容无人使用
内容无外部消费者
```

清理前必须确认：

- 来源；
- regenerate command；
- deployment dependency；
- external consumer。

---

# 38. 当前 Architecture Boundary Gate

当前工具：

```text
tools/architecture_boundary_gate.py
```

测试：

```text
tests/test_architecture_boundary_gate.py
```

当前明确已验证的是：

```text
packages/ui/src
```

的 import 与 I/O / persistence 边界。

当前共享包禁止：

- 依赖 workspace 业务模块；
- 依赖 static 业务模块；
- `fetch`；
- WebSocket；
- localStorage / persistence。

状态：**VERIFIED**

---

# 39. 对 Boundary Gate 的审计修正

原 `ARCHITECTURE.md` 中曾有表述：

```text
共享 UI 包及从 server.py 可达的后端模块的只读边界检查
```

这句话会造成过度解释。

现有迁移文档明确说明的 Gate 范围主要是：

```text
packages/ui/src
```

因此新版必须改为：

> 当前已核实的 `architecture_boundary_gate.py` 只明确证明共享 UI 包的 import / I/O / persistence 边界被机器检查；后端模块边界必须按实际测试文件另行确认。

不能声称：

```text
所有 Python 后端模块反向依赖都被这道 Gate 覆盖
```

这是本轮审计中的主要事实修正。

---

# 40. 当前前端重复边界

当前存在两条页面逻辑路径：

```text
static/app.js / feature scripts
```

和：

```text
src/workspace → workspace-v73.js
```

### 当前风险

1. 同一 DOM 多 owner；
2. 同一事件多个 listener；
3. selected 状态重复；
4. Inspector 状态重复；
5. CSS 互相覆盖；
6. save 状态重复；
7. localStorage 旧状态反向污染新状态。

状态：**VERIFIED RISK**

---

# 41. DOM Ownership 是当前必须补的审计

仅凭文件名不能判断 ownership。

必须逐 feature 核实：

```text
谁创建 DOM
谁更新 DOM
谁销毁 DOM
谁监听
谁控制 visibility
谁控制 geometry
```

优先审计：

```text
Project Hub
Table
Card
Timeline
Search
Inspector
Review
Narration
Moodboard
Lighting
Import
Export
Modal
ContextMenu
Toast
```

状态：**TO AUDIT**

---

# 42. State Ownership 是当前必须补的审计

需要查找：

```text
selectedShot
currentShot
activeShot
currentProject
activeView
inspectorOpen
selectedRevision
modalOpen
saveInFlight
dirty
pending
columnState
presence
```

来源可能包括：

```text
window global
module variable
React store
DOM dataset
CSS class
localStorage
URL
server response
```

迁移目标是逐步缩减这些重复状态。

状态：**TO AUDIT**

---

# 43. Search / Selection / Inspector 风险

之前已经观察到：

```text
选中
详情打开
搜索跳转
```

可能相互耦合。

当前架构文档应明确：

```text
selection
```

和：

```text
inspector open
```

不是同一状态。

但这条规则目前属于：

```text
目标架构 / 迁移约束
```

不能伪写为：

```text
已经全部实现
```

当前状态：**PARTIAL**

---

# 44. Field Lifecycle 风险

Field 当前可能跨：

```text
server schema
field_lifecycle.py
client projection
table column config
saved view
localStorage
import mapping
```

如果永久删除只改一处，会出现：

```text
重新加载后字段复活
```

因此：

> 字段生命周期是当前数据与 UI 状态交叉风险最高的区域之一。

状态：**HIGH RISK / PARTIAL**

---

# 45. 保存链风险

当前架构中需要特别审计：

```text
Editor DOM
→ local state
→ app state
→ mutation
→ fetch
→ server
→ SQLite
→ response
→ saved state
```

如果任何一层：

- 没 flush；
- saveInFlight 没释放；
- timeout 状态不清；
- request 被重复；
- old handler 还在监听；

都会出现：

```text
UI 看起来还在编辑
但实际上不再可靠保存
```

因此 Save Pipeline 应作为迁移核心，但当前不能写成“已经统一”。

状态：**TO AUDIT / HIGH RISK**

---

# 46. 当前 Review 边界

当前已有：

- review decisions；
- shot versions；
- snapshots。

但产品定义要求：

```text
Word 风格内容修订审计
```

而不是：

```text
企业 OA 多级审批
```

当前架构文档只记录已有实现。

完整：

```text
before
after
diff
author
resolution
```

是否已经在所有真实入口统一，需要浏览器和数据层审计。

状态：**PARTIAL**

---

# 47. 当前 Presence 边界

Presence / 协作状态在原文中被提到分布于：

```text
大文件
独立资源
workspace state
```

当前已有 Legacy CollaborationManager、独立 `presence_system` 和 `apps/api` 的进程内 Presence；`apps/web` 尚无真实 Presence client。当前尚不能声称：

```text
Presence 已是独立 realtime layer
```

应继续审计：

- connection owner；
- session；
- heartbeat；
- stale cleanup；
- selected entity；
- editing target；
- cursor；
- reconnect。

状态：**IMPLEMENTED_NOT_INTEGRATED**（多 worker、Redis、客户端接入待验）

---

# 48. Moodboard / Lighting 边界

当前：

```text
creative board
lighting
```

涉及：

- server data；
- browser canvas；
- asset；
- revision；
- local draft；
- UI state。

不能只按文件拆分。

应分别确认：

```text
domain document
serializer
save owner
canvas state
WebGL lifecycle
```

状态：**PARTIAL / HIGH COMPLEXITY**

---

# 49. CSS 当前风险

当前 `static/` 中存在多套：

```text
workspace
editor
flow
Apple
feature
```

样式。

仅从文件名不能判断重复。

必须结合：

```text
index.html load order
selector specificity
DOM owner
computed style
```

才能删除。

当前不能通过新增更高 specificity CSS 长期覆盖问题。

状态：**VERIFIED RISK**

---

# 50. `transition: all` 与动画

当前生命周期文档已经提出 Motion System，但从本文件的事实定位看：

- 旧 CSS 仍可能存在零散 transition；
- 新 Motion 体系尚未证明全站接管。

因此：

```text
统一 Motion System
```

应保留为迁移目标，而不是当前事实。

状态：**PARTIAL**

---

# 51. i18n 当前状态

迁移文档要求未来新组件使用：

```text
i18n key
```

但原始 `ARCHITECTURE.md` 没有证据证明：

```text
完整 zh-CN / en-US / ja-JP runtime
```

已经实际覆盖系统。

因此当前事实应写：

```text
i18n 为目标架构约束
当前覆盖程度需按实际代码检查
```

状态：**PLANNED / PARTIAL UNKNOWN**

---

# 52. 当前 AI 状态

仓库中已有以下并行实现：

```text
Legacy GET /api/ai/capabilities 占位
storyboard-system/ai_system（提案/人工接受参考实现）
apps/api/app/services/ai_provider.py + ai_proposal.py（VNext mock/进程内提案）
```

VNext AI 尚无 V-Web 消费链；提案未持久化，generate 路径未证明受 enabled 门禁约束，accept 直接改 Shot ORM。

不能声称：

- 已有真实外部模型 provider 和持久 Job；
- Proposal 已接通真实客户端并经过普通 Command；
- 已有可发布的 AI 编辑或自动拆镜。

AI 的 Proposal + Human Accept 已有局部代码；完整权限、Job、持久化和标准命令接入仍是迁移门槛。

状态：**IMPLEMENTED_NOT_INTEGRATED / BLOCKED**

---

# 53. 当前 FastAPI 状态

仓库服务配置仍指向 Legacy `server.py`；本轮未探测生产实例。并行 FastAPI 树已存在：

```text
apps/api/main.py                   （目标 API，/api/v1）
storyboard-system/fastapi_app     （迁移参考/兼容实现）
storyboard-system/server.py       （现有服务配置入口）
```

不能把代码或局部测试等同于 API 对等与生产切换。VNext 缺部分 Legacy 路由，Shot/bulk 版本及事件语义也不同。

状态：**IMPLEMENTED_NOT_INTEGRATED**

---

# 54. 当前 PostgreSQL 状态

现有服务配置和 Legacy 应用仍使用：

```text
SQLite
```

VNext 已有 SQLAlchemy、Alembic 和 asyncpg 配置；Legacy `repositories/postgres_repo.py` 是另一套 DB-API 风格实现。尚无本轮真实 PostgreSQL 升级/集成、SQLite 数据副本迁移或回滚验证，因此 PostgreSQL 仍是目标持久化 owner，未 cut over。

在：

- Repository；
- schema inventory；
- backup/restore；
- 实际数据副本演练；

完成前，不应切换。

状态：**IMPLEMENTED_NOT_INTEGRATED / BLOCKED**

---

# 55. 当前 Electron 状态

原始架构文件只记录：

```text
Web 当前运行
Electron 为未来 Platform 方向
```

没有证据说明：

```text
完整 Electron 平台已经与 Web 共用同一前端
```

因此：

状态：**PLANNED / OUTSIDE CURRENT RUNTIME**

---

# 56. 目录级清理安全规则

以下目录默认都不能“按名字清理”：

```text
data/
.qa-data/
.qa-live/
qa-artifacts/
scratch/
node_modules/
.npm-cache/
dist/
vendor/
static/
```

必须先分：

```text
runtime data
test evidence
cache
dependency
generated
third-party
source
unknown
```

其中：

```text
unknown
```

默认不删。

---

# 57. `scripts/` 审计规则

`scripts/` 可能同时包含：

- 构建脚本；
- 部署脚本；
- 字体脚本；
- 临时包；
- 历史归档。

删除前要确认：

```text
README reference
package.json reference
deployment reference
manual runbook
external use
```

---

# 58. `tools/` 审计规则

`tools/` 应与运行应用隔离。

但工具是否“只读”必须逐个确认。

例如：

```text
schema_inventory.py
```

明确按只读方式设计。

其他工具不能因为位于 `tools/` 就自动假设安全。

---

# 59. `tests/` 审计规则

测试可能：

- 创建 SQLite；
- 写临时文件；
- 启动浏览器；
- 使用 mock data；
- 使用 `.qa-*`。

必须确认：

```text
data root
fixture
teardown
temp path
```

特别防止：

```text
test accidentally points to STORYBOARD_DATA_ROOT
```

---

# 60. `deployments/` / `systemd/`

这两个目录属于：

```text
部署和服务配置
```

它们不属于当前本地架构重构的自动执行范围。

用户暂停部署期间：

```text
禁止因本地测试自动触发远程修改
```

状态：**VERIFIED POLICY**

---

# 61. 当前推荐的安全开发顺序

每次修改一个真实 feature：

## 第一步

确认真实入口：

```text
HTML
JS
React
route
API
```

## 第二步

确认 owner：

```text
DOM
state
write
CSS
```

## 第三步

确认数据：

```text
server truth
local draft
localStorage
cache
```

## 第四步

补回归。

## 第五步

迁移一个真实调用链。

## 第六步

验证新旧行为一致。

## 第七步

新路径接管。

## 第八步

删除旧消费者。

## 第九步

删除旧 CSS / listener。

## 第十步

再次浏览器验证。

---

# 62. 修改 `src/workspace/**` 时

必须：

1. 检查 `git status`；
2. 修改源码；
3. TypeScript 检查；
4. 重新 build；
5. 确认生成物差异；
6. 浏览器验证真实 bundle。

不能只改源码不重建然后判断运行结果。

---

# 63. 修改 `packages/ui/**` 时

必须检查：

- 是否仍保持通用；
- 是否引入业务 import；
- 是否引入 fetch；
- 是否引入 WebSocket；
- 是否引入 localStorage；
- 是否通过 boundary gate。

共享 UI 包不应变成：

```text
第二个业务层
```

---

# 64. 修改 `server.py` 时

原则：

> 已经存在独立业务模块的逻辑，不要再复制回 handler。

修改 handler 主要限于：

- HTTP；
- authentication；
- routing；
- mapping；
- wiring。

如果要新增大量业务分支，应优先问：

```text
是否应该进入独立模块？
```

---

# 65. 修改 schema 时

禁止：

```text
直接改线上 DB
```

必须：

```text
副本
→ inventory
→ migration
→ verification
→ backup/restore
```

后续 schema 变化必须新增独立 migration version。

---

# 66. 删除文件时

删除前至少执行概念上的消费者审查：

```text
index.html
build.mjs
package.json
Python import
dynamic import
global symbol
DOM selector
CSS selector
test
deployment package
docs/runbook
```

只有确认无消费者后才能删。

---

# 67. 当前推荐的前端审计重点

优先顺序：

1. `static/index.html` 加载顺序；
2. `app.js` 全局 state；
3. Workspace store；
4. Inspector；
5. Search；
6. Table；
7. Card；
8. Timeline；
9. column lifecycle；
10. Modal/Overlay；
11. save state；
12. localStorage；
13. Presence；
14. Moodboard；
15. Lighting。

---

# 68. 当前推荐的后端审计重点

优先：

1. `AppHandler` 路由表；
2. Shot single/bulk 更新；
3. field lifecycle；
4. review/version；
5. import commit；
6. asset cleanup；
7. creative board；
8. persistence helper；
9. schema migration；
10. authentication / capability。

---

# 69. 当前推荐的数据审计重点

重点实体：

```text
projects
shots
custom fields
assets
asset_versions
shot_asset_links
project_snapshots
shot_versions
review_decisions
audit_log
project_creative_boards
```

检查：

- PK；
- FK；
- orphan；
- revision；
- lifecycle state；
- delete semantics。

---

# 70. 当前不能写成事实的目标内容

除非代码和真实入口已经变化，否则以下内容只能留在 `ARCHITECTURE_MIGRATION.md`：

```text
FastAPI 已经上线
PostgreSQL 已经上线
Redis 已经接入
CRDT 已经接入
Yjs 已经接入
AI Gateway 已经工作
AI Proposal 已经工作
Electron 已经共用完整业务层
Presence 已完全统一
所有 Modal 已迁移到 packages/ui
所有 Inspector 已统一
所有 CSS 已收敛
所有状态已迁入 React
```

---

# 71. 原始 ARCHITECTURE 中应继续保留的信息

以下内容是原文有价值且本版必须保留的：

- 运行入口与数据流；
- `server.py` 当前职责；
- 当前直接导入模块；
- PDF / Word / media export；
- 目录职责；
- build/check 行为；
- `tsconfig` 范围；
- schema inventory；
- backup rehearsal；
- 源码 / 生成物边界；
- 重复边界风险；
- 推荐拆分顺序。

本次审计不是删掉这些内容，而是给它们增加：

```text
事实等级
边界
风险
不能过度解释的地方
```

---

# 72. 原始文档中需要修正的表述

## 修正 1：Architecture Boundary Gate

原表述范围过大。

新表述：

```text
当前明确验证 packages/ui/src 边界
```

后端边界按实际测试另行确认。

---

## 修正 2：Word 状态

原架构文档与迁移文档曾出现口径不一致。

新口径：

```text
Word .docx 已实现
已本地验证
不自动等同生产已发布
```

---

## 修正 3：领域模块提取 != 架构完成

所有：

```text
shot_updates.py
shot_versions.py
import_parsing.py
...
```

都必须描述为：

```text
已提取真实业务块
```

而不是：

```text
完整领域层已完成
```

---

## 修正 4：Workspace bundle 存在 != Legacy 已失效

必须保留双轨事实。

---

## 修正 5：Build 输出 != static 全目录

只把明确的 build target 当生成物。

---

# 73. 原始文档中需要补充的内容

本轮新增：

1. 事实等级；
2. Legacy / React 双轨风险；
3. DOM ownership 审计；
4. State ownership 审计；
5. 保存链风险；
6. Field lifecycle 风险；
7. Review 当前边界；
8. Presence 当前边界；
9. Moodboard/Lighting 当前复杂度；
10. Boundary Gate 限定；
11. AI/FastAPI/PostgreSQL/Electron 的事实状态；
12. 清理安全规则；
13. 修改前审查顺序；
14. 当前不能声称的事项。

---

# 74. 当前推荐的“最小改动原则”

在当前双轨阶段，一个修复如果可以通过：

```text
修正唯一 owner
删除重复 listener
删除错误 state mirror
修复 contract
```

解决，就不要新增：

```text
第三套状态
更高 CSS specificity
另一个 polling
另一个 localStorage key
另一个 adapter
```

新代码应减少系统熵，而不是掩盖旧冲突。

---

# 75. 当前推荐的“新功能准入”

在 Legacy Freeze 生效后，新功能原则上只能进入：

```text
src/workspace/**
```

或：

```text
明确后端业务模块
```

例外只有：

```text
修复现有 Legacy P0/P1
短期迁移 adapter
```

任何向 `app.js` 新增长期大型 feature 的改动都应被视为架构倒退。

---

# 76. 当前推荐的“旧代码退出条件”

旧实现可以退出，至少需要：

```text
真实入口已切换
新状态 owner 唯一
旧 listener 无消费者
旧 CSS 无消费者
API 行为通过
刷新通过
浏览器 QA 通过
回滚方式明确
```

不能因为：

```text
新文件已经创建
```

就删除旧实现。

---

# 77. 当前推荐的测试层级

## Python

用于：

- domain helper；
- schema；
- parser；
- formatter；
- update logic；
- migration。

## Browser

用于：

- DOM；
- interaction；
- focus；
- Inspector；
- Modal；
- import UI；
- export UI。

## Long-session

用于：

- state leakage；
- save lock；
- listener；
- RAF；
- WebSocket；
- hidden overlay。

---

# 78. 当前 Browser QA 不能只截图

截图只能证明：

```text
某一刻长得对
```

不能证明：

```text
交互生命周期正确
```

必须额外检查：

- click；
- double click；
- keyboard；
- focus return；
- Esc；
- outside click；
- repeated open/close；
- view switch；
- reload。

---

# 79. 当前长会话风险

尤其要查：

```text
saveInFlight
pending request
stale listener
orphan timer
orphan RAF
hidden overlay
duplicate WebSocket
stale selected entity
stale Inspector
```

这些问题不会通过单张截图暴露。

---

# 80. 当前总体架构结论

当前 FrameForge 已经从“全部逻辑堆在一个入口”开始向模块化方向演进，并已经形成若干真实的拆分成果。

但它仍然处于：

```text
Legacy 静态系统
+
React Workspace
+
Python 单体入口
+
局部业务模块
+
SQLite
```

的迁移阶段。

当前最重要的工程目标不是继续创建更多“看起来现代”的目录，而是逐次减少：

```text
重复状态
重复写路径
重复 DOM owner
重复 CSS owner
重复业务实现
不明确的生成物
不可证明可删除的 Legacy
```

这才是判断后续重构是否有效的核心标准。

---

# 81. 与迁移文档的职责边界

本文件负责：

```text
现在是什么
现在有哪些文件
现在怎么构建
现在谁仍在运行
现在有哪些风险
哪些东西不能删
哪些东西不能误写成已完成
```

`ARCHITECTURE_MIGRATION.md` 负责：

```text
下一步迁什么
迁到哪里
如何切换
如何验收
什么时候删除旧路径
如何回滚
未来技术栈如何进入
```

两份文档必须始终保持：

```text
Current Facts
!=
Target Architecture
```

如果两份文件对同一功能状态不一致，应优先重新核实代码和真实入口，而不是用文档互相覆盖。


## 2026-09-28 本地验收状态补充

- 工程 PDF 的服务端导出/导入路由已在隔离本地环境验证：完整 v2 backup 作为 PDF 附件保存，按 SHA-256 校验；页面包含不可见文字水印，约 25 mm QR 仅承载摘要 manifest，完整工程素材仍在附件。导出/导入往返恢复镜头及 PNG 字节。普通 PDF 不包含完整工程数据，不能无损回导。
- 已检查的真实样本普通 PDF 使用矢量字形但没有可提取文本层，当前解析 fallback 为整页图像；这只是该样本的观察结果，不代表所有普通 PDF。
- 真实 Excel 导入已实现，保留 `.xlsx`、字段映射、嵌入图片与原始列能力。
- Review status 版本竞争修复已通过本地验证；2D/3D Split 的 RAF cleanup 已验证。
- MIG-002 Selection / Inspector 切片：VERIFIED_LOCALLY（隔离源码 Playwright 覆盖 1440/320/374/375/390/768；单击选中不改变已打开详情目标，双击/显式详情打开或切换，删除目标/切视图关闭，aria-pressed 同步，刷新重绘目标）。整体 React/Legacy cutover 与旧路径退役仍未完成；未部署。
- 未部署生产。上述均为本地证据，不构成生产发布或整体迁移完成证明。
