# VNext 数据库实施记录（2026-10-02）

本轮按最新需求完善 `apps/api` 数据库，源提交 `f4ea6f1`。不连接或迁移 Legacy 数据库，不执行生产 DDL，不操作部署。设计合同见 [数据库计划](UI_DATABASE_PLAN_2026-10-02.md)，本文只记录实际实现与证据。

## 1. 列定义和值：第一段

Alembic `e18c4a7d92b0` 接在合并 head `d72a81e5c409` 后：

- 将 **VNext 自身** `custom_field_definitions` / `shot_custom_field_values` 收敛为 `project_columns` / `shot_column_values`，保留已有 ID/key/value。不是 Legacy SQLite backfill。
- 列定义持有 origin、binding kind/key、schema version、bigint revision，以及 active/trashed/purging/purged 生命周期。显示/隐藏仍是布局配置；回收站使用 trashed，不新增 archive 状态。
- 值表持有 production ID；复合 FK 同时约束 Shot 与列属于同项目。值表固定 custom binding，与定义 binding 联合校验，禁止把 builtin/entity/derived 业务值复制成第二份 EAV。
- 永久删除定义保留技术身份，清除名称、描述、分组、选项和默认值；旧 key 不能重新创建。默认值与显式 JSON null 区分，清空单元格不再错误恢复默认内容。
- 新增、编辑、整列复制、镜头粘贴、导入、文档导出、SavedView tombstone 过滤均消费同一 ORM owner；没有新增平行列存储或双写。
- VNext 已有 removed 偏好转为 trashed 定义 + hidden 展示；is_active/is_purged 生命周期布尔列退出。现有 HTTP removed 值仅为 Web 回收站 DTO，审计操作使用当前命令的 delete 命名。

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

## 5. 批注个人水位与用户颜色：第三段

Alembic `a36d9b21f807` 接在第二段后，新增 CommentEvent、CommentReadState、批注 revision/event seq/last actor 与 User annotation color/revision。复合 FK 拒绝跨项目/镜头父批注和事件；个人水位唯一 `(user,shot)`，不会使用全局 is_read。

- create/edit/resolve/reopen/delete 锁项目→镜头→批注，事件序号独立于镜头内容 revision。无变化无事件，失败事务不留下 outbox；事件只含身份/操作/序号，不含正文。
- GET/PATCH `/shots/{id}/comments/read-state` 返回个人 last_read_seq/latest_seq/unread_count；只推进当前用户水位，拒绝未来序号，不倒退；解决批注不标记任何用户已读。
- 用户自动分配持久色值；GET 登录/me 与批注读模型返回作者和最后操作用户色。PATCH `/auth/me/style` 仅修改本人颜色，规范化 #RRGGBB、revision 冲突保护；角色/密码 owner 不混入颜色 service。
- 编辑/解决/删除必须提交批注 revision；现有 Review Web 保留开始编辑/确认删除时的 revision，避免后台刷新自动覆盖草稿的基准。未增加已读 UI 或协作指针，接口存在不代表这些视觉能力完成。
- 已有 VNext 批注按创建顺序生成 bootstrap 事件；无法推断历史编辑者，last actor 保留未知。不是 Legacy 数据迁移。降级拒绝丢弃新事件、个人已读或颜色编辑。

隔离批注 API 2项、迁移/bootstrap/FK/颜色/降级再升级及 PostgreSQL 离线 SQL 2项通过；先前数据库迁移/config/既有 Review 9项通过。重建本地 UI 类型产物后 Web TypeScript 通过。没有连接真实数据库；本机 PostgreSQL 在线并发、通知分发和完整权限范围尚未验证。

## 6. 最新版本与后端范围（用户已确认）

项目级提交快照，保留镜头级比较入口。情绪板不进入版本；其他基于镜头的组件均须纳入版本。Git 式提交/分支/父版本/合并图与左右红删绿增差异，折叠未变化内容。版本不得仅保存 Shot 核心字段；画面/制作步骤/自定义列值/素材关联及灯光组件需有明确 owner。快照媒体保留 immutable 版本引用，不重写源文件。

全要素撤销重做单独 command/history service：持久回执、expected revision、原子应用、失败不移动游标、分支后清 redo；永久删除不可撤销，必须应用 tombstone/清理 ledger，旧版本不能复活已删内容。情绪板不版本化不等于不支持撤销重做。

图片资产管理另由 AssetService/媒体 owner 承接：独立上传、文件验证、缩略图、改名、分类/搜索、引用明细、删除/恢复与安全清理；裁剪/画框为独立元数据，原图不可拉伸或覆盖。后续各模块单独提交，不把待办状态写成已实现。
