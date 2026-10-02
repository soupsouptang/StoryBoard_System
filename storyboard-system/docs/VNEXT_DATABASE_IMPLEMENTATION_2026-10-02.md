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
