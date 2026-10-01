# UI 数据库架构与迁移方案（2026-10-02，仅方案，未实施）

## 1. 范围、依据与最新确认

本文以本地 `master` / `2fde7c4` 的源码阅读为依据，只设计数据结构、契约与迁移。没有据此修改模型/服务、生成 Alembic 文件、实施数据删除或部署；方案稿已交主线程分段上传。下文 DDL、接口、作业和验收均为拟实施设计，不代表功能已完成。

功能基线为 `5e86a0bb11a20ecd631d9c2af66260a73d7c92e7`，保留其 WHAT；当前用户明确修改的行为优先。已阅读根 [AGENTS.md](../../AGENTS.md)、Legacy [AGENTS.md](../AGENTS.md)、[确认需求](CONFIRMED_UI_REQUIREMENTS_2026-10-02.md)、[执行记录](UI_REQUIREMENTS_EXECUTION_2026-10-02.md)、[Owner 矩阵](CANONICAL_OWNER_MATRIX.md)、[当前工作](ACTIVE_WORKSTREAMS.md)、[现状架构](ARCHITECTURE.md)、[迁移契约](ARCHITECTURE_MIGRATION.md) 和 [生命周期](LIFECYCLE_ARCHITECTURE_PLAN.md)。旧文档中的暂缓/归档规则在本文按最新确认覆盖，未改动其他文件。

已确认，不再作为待答复事项：

1. 基础业务列默认显示；预设字段可手动添加；可添加更多自定义列。预设不是第二套字段数据 owner。所有可见业务列都可删除到回收站及永久删除；内部 ID、revision、权限等保留且不作为业务列显示。
2. 列管理已去掉归档：**删除是软删除进入回收站，保留历史快照；永久删除必须经用户确认，清除当前及历史中的该列内容**。可见性属于共享视图设置，不是另一生命周期。不能将业务值改名为“内部字段”留存。
3. 自定义列宽、自动列宽、自定义行高、自动行高，项目共享视图同步给所有用户；**不能自定义列高**。权限、revision、异步保存确认统一。
4. 隐写水印必须实际嵌入、可追溯并验证裁剪/截图；metadata 签名不替代嵌入水印。文字和媒体采用不同载体。
5. TTS 提供可播放语速样例、缓存 audio，用实际音频预估朗读 duration；provider 可配置且默认本地，未经许可不外发用户正文。
6. 工程 PDF 默认多 QR 分片，DataMatrix ECC200 为替代；工程数据/媒体 hash 索引入码，大体积原图使用 PDF 关联 ZIP 附件或另存 portable project 包。

PostgreSQL 是持久化目标，Alembic 是 schema 历史唯一 owner；SQLite 只用于明确隔离的本地兼容/演练，不部署、不触生产。本轮只编写本文件，方案批准不等于数据库实施或生产访问授权。

## 2. 源码证据与差距

| 已读来源 | 当前有的结构/行为 | 目标差距 |
| --- | --- | --- |
| `apps/api/app/core/database.py` | Base 字符串 ID、时间戳；get_db commit/rollback；db_session 为 function scope | HTTP 成功前提交；flush/乐观展示/job 入队不等于业务保存 |
| `models/production.py`、`shot.py` | Production/Sequence/Scene；Shot display_number/sort_index/revision/deleted_at；Panel/ProductionStep | 项目 schema/order revision、可删除核心业务值的 nullable 契约、跨项目 FK |
| `models/field.py`、`services/custom_field_service.py`、`column_lifecycle.py` | Custom 定义/值、ColumnPreference、purged tombstone、SavedView 清洗 | 全业务列生命周期与历史副本删除闭包不足；归档命名须收敛为 trash |
| `services/shot_service.py`、`version_service.py` | 标准单条/批量/排序命令；快照、恢复、分支/合并 | 当前 snapshot 主要是 Shot patch 字段，Panel/custom/import 对等未齐；沿同一 owner 扩展 |
| `models/collaboration.py`、`services/review_service.py` | Comment 引用/回复/解决；Version/ReviewDecision/Share/Export/Audit | 无逐用户 read 水位、稳定版本/列 anchor、完整 comment revision |
| `models/user.py`、`asset.py`、`view.py` | 用户/角色、Asset/AssetVersion/ShotAssetLink、SavedView | 颜色、crop/thumbnail、job/artifact、水印/TTS、共享尺寸策略需补 |
| `api/v1/shares.py` | expiry/revoke、固定 snapshot；token_hash 当前实际存原 token；业务在 router | 哈希 token、项目授权、密码、fieldallowlist、受权 media/export；不能据字段名宣称已有安全实现 |
| `services/import_service.py`、`importer.py` | 表格映射后调用 ShotService 创建；部分无效值会默认 75 帧/live 等 | 全格式识别、更新/替换预览和原子保存未齐；不静默使用默认值掩盖错误 |
| Legacy `server.py`、`schema_migrations.py` | projects/shots/project_snapshots/share_links、原始导入列、富文本、变更事件 | 与目标表名/类型不同；必须逐项映射，不直接照抄旧 DTO |
| Legacy `field_lifecycle.py`，含 golden 源码 | computed number/tc/duration 旧例外；历史快照不改；thumb 解除引用 | 最新永久删除覆盖旧例外；软删除保留历史，purge 显式脱敏历史 |
| Legacy `creative_boards.py` | 项目 JSON 聚合 revision；Moodboard V1/Lighting V2；50 板/500 总对象；Lighting z 高度、cm | 拆实体保留 ID/serializer/限制，2D/3D 不各存一套位置 |
| Legacy `import_parsing.py`、`import_staging.py`、`project_pdf_roundtrip.py` | XLSX/嵌图、私有 staging；工程 PDF backup 附件、摘要 QR、不可见文字来源标记 | 摘要 QR 不等于工程多码，文字来源提示不等于抗截图隐写 |
| `apps/web/lib/shot-table-presentation.ts` | 当前显示列名、pending 集合、默认隐藏负责人 | 有 UI key 不代表确定字段语义/存储；默认全列宽度表不是共享自动尺寸方案 |
| `apps/api/alembic/versions` | 两分支由 d72a81e5c409 合并 | 只证明源码图存在；实施前须核实实际库 schema/head |

## 3. 单一 owner、revision 与提交确认

```mermaid
flowchart LR
  UI[统一查询层 工作区 草稿] --> API[FastAPI 鉴权校验]
  API --> CMD[Application Command]
  JOB[导入导出 TTS Worker] --> CMD
  CMD --> TX[同事务 权限 revision 审计 outbox]
  TX --> PG[PostgreSQL]
  TX --> ACK[commit 后确认]
  ACK --> UI
  OUT[提交后 outbox] --> CACHE[缓存失效 实时通知]
  REDIS[Redis TTL 指针与租约] --> API
```

- Table/Card/Timeline/Inspector/Review/画板共用 canonical API 和 query cache。路由只做 HTTP；import/OCR/TTS/AI/WS/background 不绕过标准 command 改业务。
- 服务端实体属于查询层；选择与工作区 UI 属唯一 workspace store；编辑 draft 单独保存。持久共享视图以服务端 SavedView 为准，localStorage 只是带 revision 的缓存。
- 命令携带 command_id、actor、project、expected_revision；批量带每个 Shot 的 revision map；涉及结构/顺序/视图时带 schema/order/view revision。receipt 唯一 `(project,actor,command_id)`，同 key 不同请求 digest 拒绝。
- 项目→列→Shot ID 的固定锁顺序；核对 project 权限、tombstone、全部目标集合、revision 后变更，写审计/outbox，同 UoW 提交。CAS/行锁覆盖读校验到写入窗口；no-op 不增业务 revision、不伪造变更审计。
- 成功 HTTP 响应只在 commit 成功后确认。外部文件先私有 staging 写完/hash，再 DB 发布引用；不假称对象存储与 DB 有跨系统 ACID。失败文件仅在确认无引用后异步清理。
- job 创建成功只代表排队事务提交；audio/export/symbol artifact 需生成、验证、发布事务成功才可播放/下载。durable WS 修改也遵守同一权限/revision/审计。
- dirty→saving→acknowledged/failed/conflict；异步 cache 允许 optimistic draft，但 pending 不叫 saved。失败保留草稿，refetch 不覆盖 dirty。409 以 base/server/draft 三方 rebase；同字段冲突由用户选择，新 revision 重试，purged 字段不能重放。
- 排序用既有 sort_index；提交完整项目活动 Shot 集合，筛选只决定插入目标，不丢隐藏行。同事务按全顺序重编 001、002……；镜号已永久删除时不再重建该值。ShotID、素材/批注关联不变。version_number 是快照序号，不等于并发 revision。

## 4. 列身份、预设与 32 项映射

统一 project_columns 是业务列的定义、绑定、类型、生命周期 owner；内置绑定已有实体属性/派生规则，custom 值放 shot_column_values。预设仅保存版本化定义模板，手动添加时复用已存在 binding 或新建一个定义，不能复制内置值到另一存储。

column_id 稳定，改名、翻译、列宽、顺序、回收/恢复不变；原 custom definition ID 原样保留。key 项目内固定，purge 后占位不复用，同名新列使用新 ID/key。binding 只能由受审计服务器白名单解释，不能用标签拼 SQL。默认基础列只在初始化时应用；用户已有可见性、顺序和 tombstone 优先，默认列表不能补回删除列。

32 项名称和首次出现顺序为已确认目录。以下“可复用”指源码有明确属性，仍需单位/枚举/空值核对；待定项在确认前不自动创建或写入相似字段。

| 序 | 名称 | 源码属性/候选 binding | 类型/归属与映射决策 |
| --- | --- | --- | --- |
| 1 | 分镜画面 | Panel→AssetVersion | Shot 下多 Panel/媒体，保留全图而非只首图 |
| 2 | 镜头 | UI shot_reference，待定 | 不等于镜号或内部 ShotID，不猜别名 |
| 3 | 时码 TC | tc_in 派生 | rational fps+起始帧+全顺序累计时长；导入原 TC 另辨 |
| 4 | 时长 | Shot.duration_frames | bigint 帧；NULL/0 分开，秒为呈现，业务值可 purge |
| 5 | 镜头标题 | name；Legacy title | text，Shot，可复用 |
| 6 | 篇章 | sequence_id/Sequence；Legacy chapter | 关联/自由文本待分流，重名不凭名称自动 join |
| 7 | 场景/地点 | Scene.location；Legacy shot.scene | Scene 默认/Shot override/场景实体关系待定 |
| 8 | 景别 | shot_size | 枚举/扩展词表，未知保留，不强转全景 |
| 9 | 焦段 | lens_mm；Legacy lens | numeric mm；区间/变焦/型号保留原值，不强转单 float |
| 10 | 运镜 | camera_movement；Legacy movement | 版本化 JSON/来源文本，转换器需确认 |
| 11 | 机位角度 | camera_angle；Legacy angle | text/枚举，与机位高度分开 |
| 12 | 画面描述 | description | text/富文本同字段 owner，不留平行权威副本 |
| 13 | 对应旁白 | voice_over；Legacy voiceover | text，TTS 依赖 column/version，不自动回写 |
| 14 | 制作方式 | primary_method+secondary_methods | 主/辅方法，保留各自语义，不等于执行方式 |
| 15 | 状态 | Shot.status | 业务枚举，与安全权限/审片决策分开 |
| 16 | 责任部门 | department | 业务部门，与 Role 权限分开 |
| 17 | 内外景 | Scene.int_ext | 继承/Shot override 待定，不改无关联 Scene |
| 18 | 日夜 | Scene.day_night | 同上，不等于拍摄时间/TC |
| 19 | 对白角色 | dialogue_character，待定 | text/多值/角色实体待定，不绑负责人/用户 |
| 20 | 表演提示 | performance | text，Shot，可复用，与 action 分开 |
| 21 | 对白 | dialogue | text，Shot，可复用 |
| 22 | 剪辑/转场 | Legacy transition/UI edit_transition | VNext 对应持久属性未定，不写 composition |
| 23 | 备注 | Legacy notes/UI notes | 与 director_notes/continuity/risk 同义未定 |
| 24 | 动作 | action | text，Shot，可复用 |
| 25 | 原镜号 | original_number/原始导入列 | 来源 text，不随排序改，不覆盖 display_number |
| 26 | 可行性 | feasibility/原始导入列 | 等级/评估/text 待定，不猜 bool |
| 27 | 建议替换内容 | replacement/原始导入列 | text/提案待定，不自动替换 description |
| 28 | 原描述 | original_description/原始导入列 | 来源 text，与当前描述/快照分开 |
| 29 | 分镜图框 | panel_frame | 当前为 Shot text，不等于 Panel/图片 crop/ratio |
| 30 | 机位/运镜 | movement_reference/原始导入列 | 组合结构/text 待定，不合并 camera_angle/movement |
| 31 | 镜号 | display_number；Legacy number | 业务显示值，非 row ID；全项目重编、可永久删除 |
| 32 | 执行方式 | execution_method/原始导入列 | 与 production_steps/制作方式关系待定 |

alias 记录 source_format/header/schema_version→column_id+converter_version；仅已确认别名自动映射。名称相近仅作建议；同名 UI 去重不丢源表列号/表头。NULL、空字符串、0、false 分开。负责人为现有可选业务列，适用同一生命周期；复选/批注提示/操作是系统控件，ID/FK/revision/安全字段不放列管理。

## 5. 删除、永久删除与历史内容

### 5.1 生命周期与确认流程

| 操作 | 当前值/历史 | 恢复与保存 |
| --- | --- | --- |
| 共享视图可见性 | 值/历史不变，只改所有用户的显示 | 不是安全权限或归档；视图 commit 后同步 |
| 删除到回收站 | 定义 state=trashed；值保留，停止普通编辑/新导入；历史快照保留 | 可恢复原 ID，恢复有权限/revision；没有 archive 动作 |
| 永久删除 | 当前值、该列历史内容、已登记引用和受控副本清理；最小 tombstone 保留 | 必须明确确认，不支持用版本 restore 撤销；未完成清理不称完成 |

拟定标准流程：PurgePreview(project,column IDs)→统计影响 Shot/版本/项目快照/批注线程/审计 old-new/导出缓存/工程副本/媒体依赖及存储清理→AlertDialog 展示实际范围与数量→用户明确确认→PurgeColumnsCommand。产品不增加关于外部副本/备份的免责声明；技术能力边界只在本方案/内部清理报告记载。

preview 返回短时一次性 confirm_token、preview_digest、expected_project/schema/column revision 和 purge_epoch。token 服务端保存 hash，或签名后配一次性 receipt；绑定 actor、项目、column IDs、删除闭包、计数、内容高水位和有效期（拟 5 分钟），不含 value。仅按权限取得 token 不算确认，最终命令必须从 AlertDialog 明确提交 token 和 expected_revision。

purge 取锁后重验权限、token 未用未过期、scope/digest/revisions/高水位及依赖计数；期间有新增版本/评论/导出/job/copy，必须重新预览确认，不扩大已确认范围。相关命令均锁同项目并推进依赖高水位，避免预览校验之后漏入新副本。token 在业务事务 commit 后消费；相同 command_id 返回 receipt，commit 失败不消耗有效确认。未定 binding 先完成映射，不能猜删除字段。

### 5.2 删除闭包

| 位置 | purge 处理 | 可实现语义 |
| --- | --- | --- |
| 当前/回收 Shot/实体 | builtin 值、custom、已提交 import 原值、rich text、派生物化值 | 全部清理并增 revision，不保留改名内部副本 |
| ShotVersion/ProjectSnapshot/Share snapshot | 嵌套定义/值、图引用、比较差异 | 授权 purge 是历史内容删除例外；移除旧 payload 中该列，不保留可下载旧件 |
| 评论/quote/anchor/回复 | 匹配 column/version 的引用、正文复制、图像/TC anchor 及关联线程内容 | 清正文/quote/anchor，保留技术 ID、作者/事件和 redaction marker；不能保留另一份 quote |
| audit/change events | old/new、diff、metadata 中该列值 | 内容脱敏，保留 actor、ID、时间、操作、数量、结果；不存可反推低熵值的 hash |
| view/mapping/template | 列序/宽度/冻结/筛选/分组/导出默认值 | 清 ID 引用，后续读写都按 tombstone 过滤，防旧客户端/预设复活 |
| cache/index/search/staging | query cache、Redis、搜索索引、OCR/parse/raw 文件、临时导出、缩略图/audio | outbox 失效/清理；下载实时检查 epoch；多字段原件难以可靠局部清理时撤销整件 |
| artifact/工程副本 | PDF/Word/CSV、隐写媒体、TTS、QR chunk/符号、ZIP/portable、受控快照复制 | 清依赖列或撤销并删整件；取消 pending job；worker 发布前重验 epoch，不能写回旧结果 |
| shared media | 同列 Panel/历史/derivative 引用解除，GC 重查全局引用 | 仅无合法其他引用时删 bytes；未删除画板/独立资产/其他项目引用列明原因，不能误删共享原图 |
| 未登记自由文本复制 | 旧无 anchor 评论/描述内可能重复该值 | 先来源/依赖核查并给内部异常清单，不能用猜测保证所有自然语言副本识别 |
| backup/PITR/WAL/历史存储版本 | deletion ledger、期限、访问与擦除策略 | 恢复前重放删除 ledger；未交付物理擦除不说已擦除 |
| 用户已下载/离线/纸面码/截图 | 服务端不能直接删设备文件 | revoke 仅阻断后续受控访问，不能撤回已得到的 bytes；不写入产品免责声明 |

普通历史不可改；purge 明确采用 `purge_exception`、删除清单、redaction marker/content_revision 保留发生过的证据，不能修改 immutable 历史后装作该字段从未存在。内部审计只留最小元数据，不留 value。快照保留版本 ID、拓扑和决策；有效脱敏 payload 重算 hash，旧 digest 如能暴露值也不保留。restore/branch/merge/离线 replay/工程导入先应用当前 ledger，再进入标准 command，不能复活已删列。

状态拟为 planned→logical_committed→cleanup_pending→completed/failed。DB 事务清值/历史/审计内容、写 tombstone/ledger、撤销副本和 outbox；大闭包可分批清理，但逻辑禁用先提交，UI 只报告正在删除。completed 需受控 DB/index/staging/storage 检查通过；备份、外部副本能力记录在内部报告，不能混称全介质已擦除。

### 5.3 核心 NOT NULL 业务列与备份方案

duration/name/status/display_number 等当前非空约束/默认规则须先迁 nullable 或统一 fieldstorage，服务端 schema 能表达 missing。永久删除不以假 0/75 帧/draft/空影子字段留存代替。仅技术 ID、顺序身份、revision、权限、删除元记录获保留。

删除 duration 清 Shot/相关 Panel 同业务副本，派生 TC/总时长不可用，后续未知时码不能当 0；时间线/EDL 对缺值真实校验。删除镜号清当前/历史业务号，排序只更新内部 sort_index。删除 TC 清原始/物化 TC 并禁呈现该列，其他未删帧率/时长可保留但不承诺无法人工推算。删除 status 不生成新 draft 值；安全 authorization 不依赖可删业务状态。默认创建/required 校验在 tombstone 存在时不得重建值。

Scene/Sequence 的共用 binding 需确认继承与 override；purge 清相应业务内容、保留内部 FK，预览关联列/实体影响。同名/相近语义未确认时不共用存储。本方案不宣称现有所有列已支持 purge。

备份采用两条候选路线：可改受控备份重新生成脱敏包并清存储历史版本/副本；不可变备份遵循受限保留期限、ledger 恢复过滤和经批准物理销毁。可研究 per-field crypto erase：每项目/column/purge epoch 独立随机 DEK 包封，当前值/历史/副本/备份不得含明文，销毁相应全部 key 副本后其他字段仍可读。单纯轮换 KEK/签名 key、仍保留旧 DEK、已有明文旧备份或 artifact 都不等于擦除。现有明文不能追溯地自动 crypto erase；密钥与备份恢复实测/审批后才可交付，不承诺本轮已有此能力。

## 6. 项目共享视图与自动宽高

SavedView 为共享布局唯一 owner，所有项目读者看到相同持久配置：column ID 顺序、visibility、width_mode/manual_width/computed_width、wrap、freeze；row_height_mode/manual_height、可选 per-Shot 手动行高覆盖；auto 算法版本、测量 context 与 generation/source revisions。不存在列高设置。每用户选择、指针、横滚位置和临时拖动草稿不作为共享持久布局。

默认项目共享，旧 private view 的迁移需列清单并由拥有者确认再公开，不能自动泄露。`project.view.read/write` 对应实际项目成员权限，schema/delete/purge 另有能力；没有新增权限配置时 fail closed，不默认所有用户可写。列宽/行高拖动仅本地预览，松手或 debounce 后提交一条带 expected_view_revision 的标准命令；其他用户收到 commit 后 outbox 的新 revision 才应用，不广播未提交结果为事实。

自动列宽：基于完整已授权活动行集合、列标题、字体/字号、图标/编辑 padding、换行规则和图像比例计算，按 min/max clamp。大项目可明确使用确定性样本并在 context 记录 sample policy，不能各用户按当前 viewport/筛选结果生成不同共享宽度。文本真实排版测量或经验证的字体测量器，非字符数乘常数假精确；图片宽度按 ratio/列限制取值。

自动行高：用确定后的列宽、可见列的换行文本、行内图片/控件布局计算各行最大需求，含 padding，min/max clamp；virtualized 行未渲染仍有确定策略，结果为派生 cache。列宽/可见性/内容变化使相关测量失效，行高不能反过来修改列高。固定高度溢出采用现有折叠/滚动呈现规则，不能裁掉数据。

手动优先：单列手动宽度和 per-row 手动高度不被自动 job 覆盖；用户显式“恢复自动/重算”才清对应 override。自动重算 job 绑定 view revision、source content/schema revision、字体/renderer 版本、宽度依赖 hash；只更新 mode=auto 且未并发变化的结果，冲突丢弃过时测量并重算，不能强覆盖。正文内容不进入公共尺寸日志。

共享维度使用标准测量 context；窄屏仍横滚/响应适配，viewport 临时 fit 不回写全项目尺寸。字体加载完成再测量，换行/中文/富文本/竖版图纳入验证。缓存 results 提交后通知所有用户刷新；失败保留本地 draft，显示失败；409 rebase 保留当前拖动意图但不能 last-write-wins 擦掉别人的共享配置。

## 7. PostgreSQL DDL 契约

### 7.1 通用约定与既有表调整

以下仅 DDL 设计，不执行 SQL。保留已有 `id text`，不强转历史非 UUID ID；新 ID 服务层生成。时间统一 UTC timestamptz，JSONB 结构有 schema_version。可变实体使用 bigint revision>0；技术演员 actor 与业务 owner_id 不同。跨项目引用用 `(production_id,id)` unique+复合 FK，单 ID FK 不足以约束项目。默认 RESTRICT，只有纯可删除子条目明确 CASCADE；注销用户走匿名化不级联清业务/审计。

| 已有表 | 拟调整字段 | 键/索引/删除规则 |
| --- | --- | --- |
| productions | revision/schema_revision/order_revision/content_revision bigint default 1；purge_epoch bigint default 0 | PK id；revision>0；content_revision 在所有新增历史/评论/副本依赖命令递增，用于 purge preview 高水位 |
| shots | 业务值 nullable/fieldstorage；revision bigint；comment_event_seq bigint default 0 | unique production/id；活动 `(production_id,sort_index,id)`；不以 display_number 为身份 |
| sequences/scenes | 同项目 unique/FK；默认/override 语义确认后扩展 | RESTRICT；删列不硬删技术实体/权限 |
| panels/production_steps | production_id；asset/input/output 版本引用收敛 | Shot/Asset composite FK；历史引用时 RESTRICT，显式硬删流程清依赖 |
| users | annotation_color varchar(7) NULL，revision bigint | CHECK NULL 或规范化 #RRGGBB；只本人/授权管理员可改 |
| comments | revision bigint、event_seq/last_activity_seq bigint、version_id/anchor_column_id NULL、anchor_type、anchor_json、content_deleted_at NULL；body可空 | 同项目/Shot parent/version/column校验；活动 project/shot/last_activity 索引；解决独立于已读 |
| shot_versions | production_id、source_shot_revision、schema_version、content_revision、content_sha256、redacted_at NULL | unique Shot/version_number；parent/merge同Shot；正常不可变，purge_exception脱敏 |
| assets/asset_versions | 同项目 FK、available/revoked 状态；实际 bytes hash/size 校验 | version序号 unique，storage_key unique；hash 约束回填后启用；去重不跨授权泄露 |
| shares | field_allowlist JSONB、policy_revision、purge_epoch、watermark_profile_id NULL；token真正hash | token_hash unique；project/revoked/expiry 索引；expiry/revoke所有字节入口重查 |
| saved_views | project共享 config/version；自动宽高 context/generation；revision | 列ID投影；旧key adapter只读转换；无两套layout同时写 |
| audit_logs | production_id、command_id、purge_event_id NULL、schema_version | project/time/id 与 entity/time 索引；正常append，内容脱敏专用受权路径 |

### 7.2 列与布局关键 SQL 草案

project_columns 接管 custom definitions+ColumnPreference 生命周期；shot_column_values 接管 custom values；existing SavedView 接管项目共享布局。扩展期单写 adapter 明确，contract 后旧表不再 owner。

```sql
CREATE TABLE project_columns (
  id text PRIMARY KEY,
  production_id text NOT NULL REFERENCES productions(id) ON DELETE RESTRICT,
  key text NOT NULL,
  label text NOT NULL,
  origin text NOT NULL CHECK (origin IN ('builtin','preset','custom','import')),
  binding_kind text NOT NULL CHECK (binding_kind IN ('entity','derived','custom','pending')),
  binding_key text,
  field_type text NOT NULL,
  definition_json jsonb NOT NULL DEFAULT '{}',
  schema_version integer NOT NULL DEFAULT 1 CHECK (schema_version > 0),
  state text NOT NULL CHECK (state IN ('active','trashed','purging','purged')),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  deleted_at timestamptz,
  purged_at timestamptz,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  UNIQUE (production_id,key),
  UNIQUE (production_id,id),
  CHECK ((state = 'purged') = (purged_at IS NOT NULL)),
  CHECK (state <> 'trashed' OR deleted_at IS NOT NULL)
);
CREATE UNIQUE INDEX uq_project_columns_live_binding
 ON project_columns(production_id,binding_key)
 WHERE binding_key IS NOT NULL AND binding_kind <> 'pending' AND state <> 'purged';
CREATE INDEX ix_project_columns_state ON project_columns(production_id,state);

CREATE TABLE shot_column_values (
  production_id text NOT NULL,
  shot_id text NOT NULL,
  column_id text NOT NULL,
  value_json jsonb,
  updated_by text REFERENCES users(id) ON DELETE RESTRICT,
  updated_at timestamptz NOT NULL,
  PRIMARY KEY (shot_id,column_id),
  FOREIGN KEY (production_id,shot_id) REFERENCES shots(production_id,id) ON DELETE RESTRICT,
  FOREIGN KEY (production_id,column_id) REFERENCES project_columns(production_id,id) ON DELETE RESTRICT
);
CREATE INDEX ix_column_values_lookup ON shot_column_values(production_id,column_id,shot_id);

CREATE TABLE column_layouts (
  production_id text NOT NULL,
  saved_view_id text NOT NULL,
  column_id text NOT NULL,
  position integer NOT NULL CHECK (position >= 0),
  visible boolean NOT NULL,
  width_mode text NOT NULL CHECK (width_mode IN ('manual','auto')),
  manual_width_px integer CHECK (manual_width_px > 0),
  computed_width_px integer CHECK (computed_width_px > 0),
  wrap_text boolean NOT NULL,
  frozen boolean NOT NULL,
  PRIMARY KEY (saved_view_id,column_id),
  UNIQUE (saved_view_id,position) DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY (production_id,saved_view_id) REFERENCES saved_views(production_id,id) ON DELETE CASCADE,
  FOREIGN KEY (production_id,column_id) REFERENCES project_columns(production_id,id) ON DELETE RESTRICT,
  CHECK (width_mode <> 'manual' OR manual_width_px IS NOT NULL)
);
```

前置 migration 为 shots/saved_views 加对应 composite unique。custom values 仅允许 custom binding，不能给 builtin 写 EAV 第二份值；类型/选项由统一 schema 验证。purged 定义清 label/description/options/default 等含业务内容，保留最小 id/key/binding/type/timestamp/tombstone；label 可为空字符串。JSON 内容和多态 owner 引用不是自动 FK，须显式依赖登记+command 验证。

### 7.3 新增与收敛表字典

拥有 id 的表用 text PK；可变实体有 created_at/updated_at timestamptz、revision bigint>0。下列 NULL 可空，其余 NOT NULL；未列 id 的关联表用指定复合 PK。FK 默认同项目 RESTRICT，下表明确例外。CHECK/unique/FK 在回填验证后启用。

| 表 | 字段/类型 | 键、索引、生命周期 |
| --- | --- | --- |
| view_row_layouts | production_id/view_id/shot_id text、height_mode text、manual_height_px integer NULL | PK(view_id,shot_id)，view删除CASCADE、Shot RESTRICT；height>0；只存手动覆盖/策略，不存列高 |
| view_measurements | id、production_id/view_id text、generation bigint、context_json jsonb、source_content_revision/schema_revision/view_revision bigint、dependency_hash char(64)、result_artifact_id text NULL、status text | unique(view_id,generation)；artifact同项目FK；view/generation索引；computed cache可失效，不与手动值竞争 |
| column_aliases | id、production_id/column_id/source_format/source_header text、source_schema_version/converter_version integer、confirmed_by text | unique(project,format,header,schema_version)；column/user FK；purge清规则 |
| purge_previews | id、production_id/actor_id text、token_hash char(64)、scope/digests/counts JSONB、expected_revisions JSONB、content_revision/purge_epoch bigint、expires_at/consumed_at(NULL) timestamptz | token_hash unique；project/actor/expiry索引；消耗与purge同事务，无value |
| purge_events | id、production_id/actor_id/command_id text、column_ids/scope/counts JSONB、purge_epoch bigint、status text、completed_at NULL、error_code NULL | unique(project,command)；project/epoch/status索引；最小ledger不含value；不cascade删除 |
| snapshot_redactions | id、production_id/purge_event_id/entity_type/entity_id text、column_ids JSONB、content_revision bigint、created_at | unique(event,entity)；purge_event FK；保留purge_exception/删除清单，不存旧正文/hash |
| project_snapshots | id、production_id text、version_number integer、parent_id NULL、schema_version integer、source_revision/content_revision bigint、payload JSONB、sha256 char(64)、redacted_at NULL、created_by | unique(project,version)；parent同项目RESTRICT；project/time索引；正常不可变、受权purge例外 |
| shot_comment_read_states | production_id/user_id/shot_id text、last_read_event_seq bigint default 0、read_at timestamptz | PK(user,shot)；user/Shot FK；seq≥0；project/user/shot索引；本人标读 |
| comment_events | production_id/shot_id/comment_id text、seq bigint、event_type text、actor_id NULL、created_at | PK(shot,seq)；Shot/comment同项目FK；不存正文，purge保留最小事件 |
| creative_boards | id、production_id/kind/name text、schema_version integer、width/height numeric、settings/environment JSONB、deleted_at NULL | unique(project,id)；kind=moodboard/lighting；尺寸>0；project/kind索引；Board revision统一 |
| board_shot_links | production_id/board_id/shot_id text | PK(board,shot)；双composite FK；project/shot索引；Shot软删保留，硬删先解绑 |
| board_objects | id、production_id/board_id/kind text、schema_version integer、sort_index numeric、x/y/z numeric NULL、rotation/scale/properties JSONB、asset_version_id NULL、deleted_at NULL | unique(project,id)、board内原对象ID唯一；board/asset FK；board/order索引；Moodboard z NULL，Lighting有限cm |
| media_crops | id、production_id/asset_version_id text、panel_id/board_object_id NULL、x/y/w/h numeric、ratio_num/den integer、fit_mode text、rotation_degrees numeric | owner恰一个且unique；asset/owner FK；0≤x,y<1，w,h>0，x+w/y+h≤1，ratio>0；crop revision不覆盖原图 |
| provider_profiles | id、production_id NULL、capability/name/provider_kind/model_version text、config JSONB、secret_reference NULL、enabled/local_default boolean | scope/capability/name unique（系统NULL scope需partial unique）；kind local/external；不存secret正文；配置不是外发许可 |
| external_processing_grants | id、production_id/actor_id/provider_profile_id/capability/input_digest text、scope JSONB、expires_at、revoked_at NULL | provider/actor FK；project/provider/expiry索引；绑定已审阅正文范围/版本与目的；撤销阻断queued发送 |
| processing_jobs | id、production_id/kind/actor_id/command_id/input_digest text、input_ref/expected_revisions/checkpoint JSONB、schema_revision/purge_epoch bigint、status text、attempt/max_attempts integer、lease_until/cancelled_at NULL、error_code/grant_id NULL | unique(project,actor,command)，project/id unique；grant FK；status/lease与project/time索引；revision CAS；不把正文放公共日志 |
| artifacts | id、production_id/kind/storage_key/mime_type/sha256/parameters_hash text、job_id/asset_version_id NULL、byte_size bigint、status text、source/schema_revision/purge_epoch bigint、expires_at/revoked_at NULL | storage unique，project/id unique；job/asset FK；size≥0；project/kind/status、expiry索引；staged/active/revoked/deleted，private字节 |
| artifact_dependencies | production_id/artifact_id/entity_type/entity_id text、column_id text NULL、entity_revision bigint NULL | unique artifact/type/id/column，NULL column用明确无列标识或NULLS NOT DISTINCT（版本验证）；column/artifact FK；project/column/entity索引；多态target service核验 |
| asset_references | production_id/asset_version_id/owner_type/owner_id/scope text、column_id NULL | unique asset/owner/scope/column同NULL规则；asset/column FK；asset与project/column索引；当前/历史/板/share/bundle全部登记 |
| import_sessions | id、production_id/actor_id/source_artifact_id/parser_version text、mapping/expected_revisions JSONB、preview_artifact_id/preview_digest NULL、schema_revision/purge_epoch bigint、mode/status text、expires_at、commit_command_id NULL | source/preview FK；mode append/update/replace；actor/status/expiry索引；commit key unique；重复返回receipt |
| export_templates | id、production_id NULL、name/format text、schema_version integer、layout/field_ids JSONB、watermark_profile_id NULL | scope/name/version unique同NULL规则；profile FK；版式/字段/水印独立，新增版本不改历史成品 |
| watermark_profiles | id、production_id NULL、carrier/algorithm_id/algorithm_version/key_id text、parameters JSONB、required boolean | scope/carrier索引；key只引用受控管理；carrier text/render/image/audio；算法待验证 |
| watermark_instances | id、production_id/artifact_id/profile_id/trace_id/key_id/embedded_payload_hash text、embedding_status/verification_status text、verification_report_artifact_id NULL | trace unique；artifact/profile/report FK；映射受限，无正文/凭据；未嵌入不能verified |
| tts_renders | id、production_id/provider_profile_id/input_digest/voice/model/language/pronunciation_version text、rate numeric、shot_id/column_id/version_id/audio_artifact_id NULL、duration_ms/sample_count bigint NULL、sample_rate integer NULL、sample_kind/status text | 缓存唯一键含scope+输入+provider/model/voice/rate/lang/词典；FK同项目；rate>0；project/shot/column索引；真实duration绑定audio |
| command_receipts | production_id/actor_id/command_id/request_digest text、result_ref JSONB、committed_at | PK(project,actor,command)；同事务，无value副本；重试结果按现权限/tombstone再过滤 |
| outbox_events | id、production_id/command_id/event_type text、entity_ids JSONB、revision bigint、published_at NULL、attempt integer | unique(project,command,type)；未发布time索引；同事务写提交后发，不含正文/秘密 |

旧 exports 先引用 job/artifact，消费者迁完后变兼容投影并退出，不能长期两套 export 状态机。全套表不是一次上线要求；具体迁移批次、源数据回填与回滚演练尚待完善，见交接文档。schema 确认后才写 Alembic。

## 8. 分阶段迁移实施设计（新增补充；待环境核实与演练）

本节补充迁移批次、源数据回填、切换和回滚设计。它尚未成为针对某一实际环境验证过的执行手册：数据库类型/schema head、数据量、部署拓扑、实际 revision 文件、映射 manifest、冻结入口与恢复命令仍需落地核实。本轮没有连接数据库、生成 DDL、复制数据或切换生产；不能据此把数据库迁移标为完成。

### 8.1 迁移前置条件与停止点

| 阶段 | 操作 | 必须保存的机器可读证据 | 停止条件 |
| --- | --- | --- | --- |
| M0 环境盘点 | 确认迁移源、目标库类型/版本、连接应用、Alembic heads、存储后端、运行写入者、当前备份策略；只读取元数据，不打印/复制凭据 | 环境类别、schema/head 清单、迁移源与目标表清单、消费者/写入者清单、恢复演练所需资源清单 | 环境归属不明、存在未纳入的写入者、备份来源不明、schema 多 head 无解释时停止 |
| M1 方案锁定 | 将第 4 节 32 项逐一归入 `confirmed_binding`、`raw_source_only` 或 `pending_mapping`；锁定 converter 版本与字段语义；核对现有 FK、唯一约束及 ID 格式 | 带版本的字段映射 CSV/JSON、待确认项表、schema 差异报告、数据字典 | 任一来源列会被静默丢弃、猜测合并或错误地映射到安全字段时停止 |
| M2 恢复基线 | 对隔离副本生成加密备份和校验摘要；在同版本空环境及带数据副本各演练恢复；验证独立于被恢复备份的最新 purge ledger 及重放入口 | 备份标识/摘要、恢复日志、记录数及引用闭包基线、ledger 覆盖高水位/完整性和重放演练 | 仅有“备份完成”而无恢复证据，或最新 ledger 缺失、存在缺口、旧备份恢复会重活已 purge 内容时停止 |

真实生产连接、生产 DDL、数据删除、密钥销毁和部署切换不在本补充授权范围内；需另行按当时有效的用户指令执行。隔离副本演练也须使用脱敏数据或合成数据。

M2 先核实源现有删除记录/tombstone，不假设尚未建立的目标 `purge_events` 已可供恢复。可验证无历史 purge 时才允许空删除账本；无法确定时先形成受审的最小删除范围清单及独立保存机制，未知范围未解决前恢复库不得开放。

### 8.2 Expand：先加目标结构，不改变现有读写 owner

1. 按下表拆分有明确前后置条件的 Alembic revisions；同一依赖闭包内的表/约束作为一个可审阅批次，记录升级及真实可行的降级或向前修复方式。B0–B6 是拟定批次标签，不是已有 Alembic revision ID；FK 拓扑决定最终文件顺序。
2. 新建空表立即建立主键、必需唯一约束及能够满足的 FK/CHECK；不能先回填到无身份约束的目标表。既有大表新增字段先可空；NOT NULL/唯一性在数据清理与核对后收紧。只有数据库支持的 FK/CHECK 可先以未验证约束添加再验证，不能把这一方式套用于 UNIQUE。大表并发索引需独立的非事务步骤、记录失败状态并在重试前核对 invalid index，禁止盲目 drop 现有索引。
3. 变更 `shots`、`saved_views` 等既有表之前先核对实际类型、主键与复合唯一约束。不可因草案 DDL 与模型相似就假定实际库已符合。
4. 目标代码以只读影子查询或隔离演练开始。写入仍由已登记的当前 owner 负责；禁止应用同时向新旧两套表长期双写。若需变更捕获，只能选定一种短期机制（已存在的变更日志/事务 outbox、经验证的 CDC，或受控写入暂停后的最终增量），记录起止 watermark、重放顺序及移除条件。

| 批次 | 依赖与拟交付 | 放行条件 |
| --- | --- | --- |
| B0 身份与恢复基础 | M0–M2 完成；核实项目/用户/Shot/SavedView 身份、复合键、来源映射存储、receipt/outbox 与删除 ledger 的恢复方案 | 主键/跨项目归属明确；最新 ledger 可在恢复隔离库前取得；新增身份无重复 |
| B1 列定义与共享布局 | B0；project_columns、custom values、column/row layouts、列 binding、nullable 业务值的 serializer/command 兼容 | 32 项与自定义列逐项归类；隐藏/删除/永久删除分开；零重复 binding、零悬空引用；手动宽高和共享 revision 保留 |
| B2 历史与媒体依赖 | B1；版本/快照/评论锚点/已读、Panel/Asset/link、crop、asset references 与 redaction | 版本拓扑、原图、共享媒体引用闭包核对；当前/历史源包都纳入 purge 范围，禁止恢复重活 |
| B3 创作画板 | B0–B2；Moodboard/Lighting board/object/Shot/Asset 关联 | 原对象 ID、顺序、坐标/单位可往返；2D/3D 同一数据源，无未知对象被丢弃 |
| B4 作业与输出 | B1–B3 中实际输入依赖；jobs/artifacts、import staging、export templates、水印/TTS，share policy；循环 FK 先建立表身份再加关联约束 | worker 发布前校验 revision/权限/purge epoch；来源附件与导出依赖完整；已有合法分享链接兼容 |
| B5 数据与消费者切换 | B0–B4 中该事务闭包所需项完成；冻结、最终增量、目标单写、API/Web/worker/WS/cache 切换 | 8.4 对账通过；8.5 事务边界一致；隔离回退演练通过 |
| B6 旧结构退出 | B5 的适用单元通过；按 8.8 删除旧字段/适配器/生成入口 | 当前业务消费者为零、观察窗口无旧写入、恢复不会重活 purge 内容；真实文件逐项列名 |

批次可以按真实依赖缩小，不能跳过其前置门槛。业务值转可空与 missing 语义未接通前，所有基础业务列的永久删除入口保持不可用；数据库默认值、导入、版本恢复及自动编号都要同时遵守 tombstone。

### 8.3 Backfill：可重复、可暂停、来源可追踪

迁移按项目分批；Legacy `project_id`→目标 `production_id` 的映射先登记，不能只因名称一致就合并项目。读取一致的源快照，并保存与该快照一致的变更日志起点；若源支持不了一致快照/可靠日志，则采用明确的写入暂停窗口。不能先全量读一遍、再取水位而漏掉期间变更。

每批保存 `migration_run_id`、源/目标计数、摘要、开始/结束 watermark、converter/schema 版本和异常计数；checkpoint 与该批数据/来源映射同事务提交。实体唯一身份为 `(source_system, source_project_id, source_entity_type, source_entity_id)`，事件重放去重以稳定 source event ID 为准；run ID 只追踪尝试，不参与实体身份或事件去重。跨 run 重试、新 converter 修复、分批大小变化均不能生成重复实体/事件。较旧 source revision 不覆盖较新目标状态；相同 source revision 出现不同内容或需重新转换时，进入有前后摘要的修复批次，不默默覆盖。

`source_system` 标识稳定的来源实例，不能仅写“Legacy”而混合多个数据库。源无实体 revision 时，记录来源快照 ID/事务日志位置；没有事件 ID 时使用可验证的日志位置+事务内序号，不虚构递增业务 revision。源与目标 revision 属不同命名空间，比较源更新时看最后应用的源位置，目标 CAS 仍看目标 revision；二者不能直接比数字大小。

| 来源类别 | 目标 | 回填约束与特殊处理 |
| --- | --- | --- |
| Production / Sequence / Scene / Shot | canonical production、sequence、scene、shot | 保留稳定 ID 与完整项目归属；sort 顺序独立于 display number；TC 用原始 FPS、起点与帧数重建并逐镜校验，不从格式化秒数反推帧 |
| builtin 字段 / 32 项预设 / custom definition 与 values | `project_columns`、binding、`shot_column_values` | 内建列绑定现有实体属性，不重复写 EAV；预设目录不会一次创建 32 个显示列；保留原 definition ID/key/类型/选项，冲突先登记映射；重复表头按 source file/sheet/column ordinal 区分；未知项进 pending_mapping，原始 header/value 留受限来源包并登记 purge 依赖 |
| ColumnPreference / SavedView / width、order、visibility、freeze | SavedView、`column_layouts`、`view_row_layouts` | 只迁移有有效用户/项目权限的视图；用户私有视图不得自动公开；manual 尺寸原样，旧自动尺寸作为需重测的缓存而不是权威 |
| Shot/Project snapshot、branch/merge、review/comment/quote | canonical snapshots、comment/event/read state | 保留版本拓扑、revision、作者/时间及有效锚点；纯摘要无法重建的正文引用进入异常队列；read state 按 user+shot 迁移；不能把审阅决策升级成全局审批状态 |
| Panel、Asset、AssetVersion、ShotAssetLink、thumbnail | canonical media owner、asset references、artifacts | 先导入私有 staging，逐件校验 bytes/hash/MIME/尺寸，再发布 DB 引用；原图与 crop 分离；缩略图可重建但源文件不可丢；校验完成前不释放旧存储副本 |
| Moodboard / Lighting 聚合 JSON | `creative_boards`、`board_objects`、`board_shot_links` | JSON schema 按版本解析，保留对象 ID、顺序、引用和单位；未知对象进入隔离报告；2D/3D共享对象身份；不对用户未确认的 cm/坐标做有损转换 |
| Import staging / export / share / job | `import_sessions`、`processing_jobs`、`artifacts`、share owner | 未提交 staging 不变成业务数据；运行中任务按旧 owner 停止/排空后由唯一新 owner 接管，重新校验输入版本/授权；已有合法分享保留 ID/到期/撤销/下载/字段策略，迁移为 digest 查找并保持原 URL 可用，转换不得输出/暂存明文 token；无法兼容列为阻塞，不默认重签或撤销；成品按依赖/权限校验后迁移或列明不能迁移原因 |

值的语义区分 `NULL`、空文本、数值零、`false`、缺列和显式清除；无对应能力时不得填入 0、75 帧、draft 或空字符串作为替代。每个源行都登记 `source_system`、`source_entity_id`、`source_revision`、`migration_run_id` 与 converter 版本；映射索引不允许携带已 purge 的业务正文。

原始来源包、pending_mapping、迁移临时文件、修复报告和目标 shadow 数据都属于受控副本，纳入第 5 节删除闭包。正常回填不产生伪造的用户编辑 revision、审片通知或逐行业务审计；单独记录迁移操作。目标获得权威写入权后，原迁移器停止写入该单元，新的导入仅走标准 command，禁止旧批次覆盖用户新编辑。

### 8.4 对账、增量与并发控制

每个批次完成后执行以下核对；单项失败即暂停该项目后续批次，修正转换器后用新 run ID 重做该批，沿用稳定来源身份和事件去重键，保留不含业务正文的失败报告。放行要求：无未解释的丢失/多出记录、无悬空引用/跨项目越权、无重复身份或日志缺口、无旧 revision 覆盖、无 purge 内容复活；pending mapping 尚未解决的目标能力不能切换。

- 实体逐类计数：源活动/删除/历史数量与目标活动/trashed/purged 数量逐项相等或有具名解释；不把 tombstone 与实体总数混为一项。
- ID 闭包：Shot、Panel、AssetVersion、Comment、Snapshot、Board 对应关系无悬空 FK；共享媒体的全局引用数与项目引用拆开核算。
- 内容摘要：按版本化转换规则比较源的预期目标投影与实际目标，不直接比较两种不同 DTO 的原始 hash；差异逐字段保留计数与来源定位。低熵业务值不以可反推的逐值裸 hash 存长期报告；报告受限，purge 时清内容相关摘要。错误日志只输出技术 ID/错误码，不输出正文。
- 列核对：32 项、custom column 数、重复 key/binding、来源 header、tombstone、列值、布局引用全部可追溯；每个 pending mapping 有负责人和阻塞理由。
- 时码核对：每项目 rational FPS、drop-frame 标志、起始 TC、锁定时长、总帧、完整项目顺序以及每条 Shot in/out/duration_frames；逐镜帧级比较。已 purge/缺失时长维持未知与校验失败，不能补 0；导入原 TC 与派生 TC 按各自语义核对。
- revision/历史核对：版本 parent 图无环，version_number 唯一，revision 不回退；无法复用的 revision 映射以独立 `source_revision` 记录，不能伪造目标已连续变更。
- 附件核对：源/目标 byte size、SHA-256、MIME、thumbnail 派生关系和权限范围；不因相同 hash 跨项目自动公开或共享。
- 幂等核对：同一批作业及跨 run/checkpoint 恢复重复运行后目标计数、摘要、业务 revision、业务审计/通知数不变；只增加运行尝试元记录。

若迁移期间源仍有写入，日志需完整覆盖新建、更新、删除、purge、历史/共享策略和附件依赖；按事务顺序回放，检测日志间隙与过期截断。既有普通 audit/event 是否足够必须实证，不把文件存在视为可靠 CDC。每批先应用最新 purge ledger 再发布目标结果，正在迁移/已迁移的数据也不能重活删除内容。冻结窗口需覆盖所有 API/worker/WS/import/AI/定时写入，等在途事务/任务排空或得到取消确认，保存最终 watermark，重放至该位置后重新全量对账。无法证明冻结或日志完整时停止切换，采用受控写入暂停后的完整一致副本。

### 8.5 Cutover：单写 owner 切换

以“项目范围内共享事务/revision/生命周期的依赖闭包”为切换单元，不仅按页面或模块名分开开关。Shot、列/值、Panel、版本、批注及它们的 purge/audit/receipt/outbox 若参与同一原子命令，必须落到同一持久化 owner 和事务后再一起切换；不能把旧库 Shot 与新库列分别作为权威写入者。只读页面可以逐个接入，独立作业可以在依赖合同齐备后逐项接入。每一单元需准备：

1. 可审阅的消费者表：读路由、写命令、后台 worker、缓存、websocket、导入/导出及管理员工具，各自目标 owner 和回退开关。
2. 同一版本的兼容 API 契约和权限矩阵；目标服务 commit 后才 ack，outbox 在 commit 后通知；缓存 key 包含 owner/revision/purge epoch。
3. 切换前 source/target count、digest、FK、revision 与附件报告全部通过；所有现存 command/job/lease 已排空或按合同暂停。下载/匿名分享/版本恢复也检查新 policy/purge epoch，不能借旧只读路由访问已删内容。
4. 隔离演练中：冻结旧 owner 全部写入口、完成最终增量/对账；更新所有入口与 worker 的 owner generation，旧 generation 写请求必须拒绝；确认没有在途旧事务后启用唯一目标 owner。只读核查后在隔离合成数据提交受审事务，验证 commit/receipt/outbox/冲突和媒体引用。失败按 8.6 回退；合成写入只发生于隔离验收环境。本节不执行生产切换。
5. 保存开关前后时间、schema heads、构建标识、操作者、报告摘要和每项结果。生产切换另需当时有效授权；本文件不会自动授予。

### 8.6 回退与不可逆操作

| 时段 | 回退方式 | 数据保护 |
| --- | --- | --- |
| Expand/Backfill 尚未改变权威写 owner | 停止作业，保持新表不可读写；修正后以新批次续跑。确需移除结构时仅降级无依赖的新 revision | 保留源 owner 与备份；清理迁移临时对象前先确认无引用 |
| 影子读/对账阶段 | 关闭影子读取，回旧读路径；保留目标数据供分析 | 不把影子错误结果写回源；标记报告和代码版本 |
| 单元切换后、无目标写入 | 冻结目标入口/worker 并排空在途事务；从 receipt/业务流水证明没有新提交，再恢复旧 owner 并失效客户端缓存 | 不能仅凭“切换时间短”判断无写入；generation 同步到所有入口后再放行 |
| 目标 owner 已接受新写入 | 冻结双方写入，按审定的反向事件映射/人工冲突清单回放，验证完成后选定唯一 owner | 不可直接重开旧 owner 并丢弃新事务；没有可逆转换时保持冻结并人工决策 |
| 永久删除/purge 已逻辑提交 | 不恢复已删除业务值；恢复任何备份/PITR 时先隔离全部读写/下载与 worker，再取独立保存的最新 deletion ledger，核验连续性并重放，清查受控副本后才开放 | ledger 不能只来自该份旧备份；复制缺口时禁止开放，先从当前权威 ledger 补齐。purge 不可逆；旧 snapshot、离线包或 undo 不得重建 |

每份 runbook 都需包含触发阈值、负责人、冻结入口、恢复步骤与验证命令；真实环境演练前仅能标 `DESIGNED_NOT_TESTED`。若迁移 revision 降级可能丢新写字段或恢复已 purge 内容，禁止提供“安全 downgrade”承诺，应采用向前修复。

purge 的当前数据库事务仍写权威 ledger/outbox；独立恢复日志是该 ledger 的受控复制，不成为第二业务写 owner。复制持久化进度、高水位与完整性要能核验；复制未追上时，恢复后的系统只能保持隔离，不能声明恢复安全。只记录技术身份/删除范围，不携带已删正文或可反推摘要。

### 8.7 交付清单与状态

实施各阶段须分别交付以下证据；前置阶段只要求已有且可核对的设计/盘点，升级、回填、切换、Contract 各自放行前才要求对应演练通过，避免“实施前必须已执行所有实施”的循环：

1. schema/head 差异报告和逐 revision expand/backfill/cutover/contract 顺序；
2. 可机器读取的 source-to-target manifest、converter fixtures 及异常处置清单；
3. 空库升级、脱敏数据副本回填、重复运行、分批中断续跑、最终增量及恢复的记录；
4. FK/唯一性/时码/媒体 hash/权限/历史闭包/幂等的前后对账文件；
5. 按事务闭包划分的单 owner 消费者表、全入口冻结/排空/generation 步骤、回退决定树；
6. purge preview→logical commit→cleanup 的中断重试及备份 ledger 重放结果；
7. Contract 删除候选/退出计划在切换前完成设计；实际删除前取得零消费者、隔离恢复、观察窗口和逐文件引用证据。

当前状态：本节为 **DESIGNED_NOT_TESTED**；没有本轮 Alembic revision、DDL 执行、DB 回填、PostgreSQL 对账、迁移恢复演练或 owner cutover。M0 环境盘点尚未开始；直到获得隔离测试库/脱敏副本并完成恢复证明，所有数据库执行门槛均为 NOT_RUN。任何一项未满足时，应停留在当前 owner，不以“schema 已存在”或“迁移脚本可运行”宣称完成。

### 8.8 Contract：旧结构与适配层退出

切换前建立逐项候选表：旧 table/column/handler/route/build 输入、实际消费者、目标替代、回退依赖、保留理由、删除条件。源备份/运行数据/真实素材不因业务消费者归零自动删除；介质清理另按已确认的生命周期办理。

删除旧结构须同时满足：目标事务单元及桌面核心通过定向验收；所有正式/后台/恢复/导入/下载路径已切换；规定观察窗口内旧读写计数为零且覆盖重启、计划任务和缓存过期；窗口时长依据 M0 发现的最大任务/缓存周期确定并登记，不虚构固定期限。搜索零引用不足以证明动态路由/构建入口无消费，须结合运行证据。

先停旧业务入口并保留受控恢复材料，再逐批退出 adapter/旧读投影/旧写服务，最后按 Alembic contract revision 清旧字段/表；每批记录能否结构回退、是否会丢新写和 purge ledger 要求。删除当前旧 owner 文件前核查引用、Git 状态和恢复依据；不得整目录删 Legacy。环境专用 runbook 要列出明确 revision/文件/命令/责任人，目前这些仍未落地。

### 8.9 文档审计记录（2026-10-02）

受审补充提交为 `bea5b23`。本次修正了前置条件循环、约束建立顺序、跨 run 幂等、一致快照/最终增量缺口、事务单元拆分、已有分享链接兼容、独立 ledger 恢复、缺失 Contract 以及“设计完成”表述。依据为本文件前 1–7 节及仓库 SavedView/Shot/Version/Share/数据库事务代码；没有重新访问生产或重新验收旧交接的进程/浏览器状态。

本轮验证范围仅为文档差异、旧正文保留、相对链接和敏感信息检查。数据库/浏览器/文件往返/回滚演练仍为 NOT_RUN；真实 share digest adapter、generation 拒写、独立 ledger 复制等是拟实现合同，当前源码存在入口不代表这些合同已经实现。
