# VNext 数据库实施记录（2026-10-02）

本轮按最新需求完善 `apps/api` 数据库，源提交 `f4ea6f1`。不连接或迁移 Legacy 数据库，不执行生产 DDL，不操作部署。设计合同见 [数据库计划](UI_DATABASE_PLAN_2026-10-02.md)，本文只记录实际实现与证据。

## 1. 列定义和值：第一段

Alembic `e18c4a7d92b0` 接在合并 head `d72a81e5c409` 后：

- 将 **VNext 自身** `custom_field_definitions` / `shot_custom_field_values` 收敛为 `project_columns` / `shot_column_values`，保留已有 ID/key/value。不是 Legacy SQLite backfill。
- 列定义持有 origin、binding kind/key、schema version、bigint revision，以及 active/trashed/purging/purged 生命周期。显示/隐藏仍是布局配置；回收站使用 trashed，不新增 archive 状态。
- 值表持有 production ID；复合 FK 同时约束 Shot 与列属于同项目。值表固定 custom binding，与定义 binding 联合校验，禁止把 builtin/entity/derived 业务值复制成第二份 EAV。
- 永久删除定义保留技术身份，清除名称、描述、分组、选项和默认值；旧 key 不能重新创建。默认值与显式 JSON null 区分，清空单元格不再错误恢复默认内容。
- 新增、编辑、整列复制、镜头粘贴、导入、文档导出、SavedView tombstone 过滤均消费同一 ORM owner；没有新增平行列存储或双写。
- VNext 已有 removed 偏好转为 trashed 定义 + hidden 展示；is_active/is_purged 生命周期布尔列退出。现有 HTTP removed 值仅为 Web 回收站 DTO，审计改为 trash。

已运行：隔离 SQLite 空库→head、旧 VNext 结构→新结构、降级/再升级、ID/显式空值/回收站/tombstone 保留、跨项目 FK 和 entity 值副本拒绝；PostgreSQL 全历史离线 SQL 编译。共 7 项通过。既有 custom fields、SavedView、相对镜头命令 5 项合成检查通过。

**边界**：这是列数据库基础和现有 custom 消费链接入，不代表32预设全部完成、builtin业务列全量删除、历史/媒体/备份永久擦除、自动共享布局或 PostgreSQL 并发验收完成。`ColumnPreference` 尚承接旧展示配置；后续共享视图单写 owner 会取代该展示路径。新系统 PostgreSQL 在线空库/事务/恢复演练仍待运行。

## 2. 后续数据库段落

1. SavedView 规范化共享尺寸策略：列宽 manual/auto，行高 manual/auto，逐行覆盖，测量 generation/context 与 revision；禁止列高。
2. 删除确认预览/最小 ledger、事务 receipt/outbox，历史 redaction 和 artifact/job 依赖闭包；不可用 current-values-only 冒充永久删除完成。
3. 批注个人已读水位、事件序号与用户颜色；随后统一画板、裁剪、队列/导入/导出/水印/TTS 等表及实际服务消费。
4. 空 PostgreSQL 在线迁移、FK/revision/并发/备份恢复演练；没有证据不标记 VERIFIED。

## 3. 共享尺寸与通知：第二段

Alembic `f29b6c8a01d3` 接在第一段后。SavedView 仍为唯一布局 owner：现有 VNext 消费方使用的 `config.presentation.columnWidths` 保留为宽度唯一存储，新增 validated `columnWidthModes`；本段不再创建一套可独立写入的 column_layouts 镜像。设计草案中的列 ID 全量布局切换仍待实际消费者一起接入。

- SavedView 新增 schema version、bigint revision、manual/auto 行高策略、手动像素行高、measurement generation/context；新增 `view_row_layouts` 逐镜头覆盖，同项目 composite FK 和正数 CHECK。
- create/PATCH/list 已实际读写并返回这些字段；auto 明确清除手动行覆盖，no-op 不增 revision/generation。列宽验证正整数；策略验证枚举；禁止列高配置。尺寸变化使测量 generation 失效，但本段没有假装运行字体测量器。
- `outbox_events` 与 SavedView 变更同事务写入，只含身份、revision、共享/owner 范围，不含名称或正文；失败事务/no-op 无事件。尚无发送 worker/Redis/Web 自动订阅，不能称全员实时同步已经完成。
- 内置列删除/恢复也改由 `project_columns` 持有身份和生命周期。仅按已有 VNext ColumnPreference 记录转入，不默认创建全部32预设。builtin:key 与 custom:key 分离，避免同名列误删；未确认语义保留 pending binding。
- 原 private SavedView 不自动公开；已有配置原样保留。降级在存在新宽高/通知/builtin数据时拒绝，不丢弃新系统已确认写入。

实际合成 API 验证：保存/刷新读取、行高覆盖→自动、409、无变化、跨项目目标、失败整体回滚、outbox 原子写入和正文不进入事件。仍需 PostgreSQL 在线并发与通知分发、字体测量、前端拖动接入及完整权限/共享范围验收。

## 4. Node.js 24

根 package engines 与 lock 元数据统一为 `>=24 <25`，`.nvmrc` 为24；两个 CI Node job、artifact workflow 和 Web Docker 基础镜像均改24。本机 Node 24.15.0，Codex bundled runtime 24.19.0；版本与 JSON 元数据一致性已核对。未运行 Docker 构建，未部署服务器。
