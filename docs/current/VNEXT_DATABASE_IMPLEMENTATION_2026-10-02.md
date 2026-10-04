> **范围：当前版本记录/合同。** 旧功能基线无效；正文中的来源、实现状态及验收仅对应注明提交。下一代不继承旧实现或 UI；当前任务不得按历史待办自动执行。

> 2026-10-04审计更新：本文件保存历史提交的真实数据库和测试证据，不推广为新要求已完成。当前新项目默认全部九内置列，原生项目历史已接通；共享视图、来源关系、默认构图固定和新增域仍以最新执行合同逐项验收。取消库房、预留和器材使用方法；知识贡献范围按采集时固定。不得用历史约七列建议、旧素材源版本方案或未完成项覆盖最新实现。详见[审计](../../deprecated/storyboard-system/docs/EXTENSIBILITY_GRILL_AUDIT_2026-10-04.md)与[执行标准](../../deprecated/storyboard-system/docs/EXTENSIBILITY_EXECUTION_STANDARD_2026-10-04.md)。

# VNext 数据库实施记录（2026-10-02）

本轮按最新需求完善 `apps/api` 数据库，源提交 `f4ea6f1`。不连接或迁移 Legacy 数据库，不执行生产 DDL，不操作部署。设计合同见 [数据库计划](../../deprecated/storyboard-system/docs/UI_DATABASE_PLAN_2026-10-02.md)，本文只记录实际实现与证据。

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

## 7. 项目提交与比较：第四段

Alembic `b47e1c90d628` 新增 ProjectCommit / ProjectBranch；同项目复合 FK 约束父提交、合并父提交与分支 head，保留旧镜头比较入口。项目提交、snapshot codec、差异引擎、历史清理、HTTP adapter 各有独立模块。

- GET `/productions/{id}/version-state` 返回工作内容摘要；POST `/productions/{id}/commits` 要求 expected state hash 与 expected branch head。修改后未刷新或分支推进返回409；无变化复用已有提交，不写重复审计/通知。创建分支从已有同项目提交开始。
- GET `/productions/{id}/version-graph` 返回分页提交和分支；提交详情及 compare 支持两次提交比较或与工作内容比较，也支持 shot_id 过滤。差异提供业务字段、左右行号、insert/delete/replace/equal 与未变化折叠计数，供后续 Git 式 UI 消费。
- 所有段落用单条 UNION 查询捕获同一数据库语句快照，避免多次 SELECT 在并发写入中拼成混合状态。纳入项目、篇章、场景、镜头、画面、制作步骤、列定义/值/偏好、图片元数据/版本摘要/关联、素材请求、批注、审核与共享布局；软删除内容仍可保留历史。
- 情绪板按用户决定不进入项目版本。私人视图、已读水位、Presence、认证/分享密钥、存储路径、递归版本记录不进入快照。媒体目前记录身份和内容摘要；实体文件保留/回收引用闭包尚需资产 owner 完成。
- 自定义列永久删除同事务清理这些项目提交中的定义、默认值、单元格、布局引用及引用原文，重算内容摘要并增加 redaction revision。也清理当前批注引用并推进批注 revision/activity，避免下一次提交重新保存已清除原文。普通删除不触发历史清除。此清理不等于导出产物、分享快照、备份等全闭包已经完成。

隔离项目服务/差异检查3项、迁移同项目 FK/自引用/空库降级再升级1项、PostgreSQL 全历史离线 SQL 1项通过。未执行生产 DDL或部署。并行基础设施正在替换认证依赖，当前旧 QA 环境缺少新 PyJWT，HTTP 集成待该依赖环境就绪后验证。

**未完成项明确保留**：灯光组件原生持久化（version-state 返回 pending_components）；项目全要素恢复、三方合并与冲突解决；全要素 undo/redo journal 及实际命令接入；Git 式版本 UI；资产不可变文件版本保留/缩略图/裁剪及完整永久删除闭包。不能用提交/比较接口声称这些功能已实现。

## 8. 原图、裁剪和素材命令：第五段

Alembic `c58f2d01e739` 为 Asset 增加 revision/category，约束同资产 version_number 唯一且为正数；尚无版本的原生 VNext 资产建立原文件版本引用。路由只适配 HTTP，列表/引用、生命周期命令、图片解码与存储、裁剪各有独立 owner。

- 素材库独立图片上传、改名、分类、字面搜索、引用明细、删除/恢复已落后端。写入锁项目→资产并检查 revision；改名无变化不推进版本。仍有活动镜头引用时拒绝删除，软删除保留文件及版本。未提供会破坏历史引用的假永久删除接口。
- 上传和分镜画面/文档导入共享图片 owner。Pillow 真正解码并验证 PNG/JPEG/GIF/WebP、10 MB/2000万像素边界、EXIF方向；自动生成等比缩略图。替换旧文件头识别和 AST/inert-model 假持久化检查，改为真实 ORM、图片像素及事务文件补偿测试。
- 图片版本读取和裁剪端点在当前项目权限范围内；裁剪归一化坐标在顺时针旋转后的源图上解释，支持 0/90/180/270°、21:9/16:9/4:3/1:1/9:16 和合法自定义比例。显式选区后用 Pillow contain 等比缩放并填黑，生成新文件和 AssetVersion；原文件从不覆盖。版本记录 source_version_id、crop、rotation、比例和尺寸。项目快照明确固定 current_version_id 与裁剪元数据，剔除本地存储路径。
- 当前画面/缩略图响应要求重新验证缓存；源版本文件可缓存。新文件登记在事务补偿队列，事务失败只清除该事务新增文件。图像解码/文件处理在线程池执行。
- 前端已接入 `react-image-crop@11.1.2`、shadcn 与 TanStack Query：素材页上传/改名/分类/引用/删除恢复及裁剪弹窗，失效同资产图片缓存。Web TypeScript 通过；尚未完成浏览器视觉/完整端到端验收。

隔离真实图片/ORM/旋转选区/填黑/原图保留/CAS/跨项目/删除恢复/事务失败3项、版本迁移/bootstrap/约束/拒绝丢弃历史1项，以及既有项目版本3项通过。没有部署或访问生产数据库。统一 AssetReference/对象存储、全引用 GC/永久删除闭包和项目 undo journal 仍待后续基础域，不宣称完成。

最新用户决定：共享布局不版本化，批注/审阅独立历史，全面按新系统重构，不保留旧产品提交兼容目标。第6/7节是已执行阶段记录，其范围将由新的内容版本 owner 收口；当前剩余任务和验收状态见 [重构范围](../../deprecated/storyboard-system/docs/VNEXT_REFACTOR_SCOPE_2026-10-02.md)。


## 9. 非破坏图片、三类列与交付字段：第六段

代码 `095fb7a` 已先行上传。最新合同：[图片/版本重构范围](../../deprecated/storyboard-system/docs/VNEXT_REFACTOR_SCOPE_2026-10-02.md)、[三类列需求](COLUMN_MODEL_REQUIREMENTS_2026-10-02.md)。本节覆盖第7/8节历史方案中的构图生成新AssetVersion/contain填黑及内容快照收录布局、批注、审阅规则。UTC与真实PostgreSQL演练另由已上传 `cf26947` 完成。

### 9.1 实际实现

- `f81c5e20d963` 新增 `media_presentations`，记录owner（asset/panel/production）、来源不可变AssetVersion、revision与变换参数；同资产来源复合FK、同项目asset FK、owner/revision CHECK。构图锁项目→资产，校验asset和presentation双revision；无变化无审计/事件，失败不写入。保存只追加展示记录，原图/源版本文件保持不变，不创建变换后的新源AssetVersion。服务层append-only；直接数据库写入的完整不可变策略仍待完善。
- Pillow/现有Canvas分别消费同一旋转、翻转、拉直、透视、缩放、平移、裁剪元数据；输出按目标比例fit而非拉伸/自动contain黑框。服务器输出权威。极端变换的黑边自动避让尚未实现；客户端预览以960px采样，最终服务器为高质量重采样。当前素材库有完整构图入口；各Panel/项目独立UI入口尚未全部接通。
- Web复用react-image-crop/shadcn/native slider，提供比例、横竖、拖动、滚轮/双指缩放与本地50步Undo/Redo；取消/外点不写入，完成仅一次命令，409保留草稿。当前与历史内容读取通过受权媒体路由，ETag引用source hash/presentation身份；媒体历史引用保留/删除GC全闭包仍待资产owner完成。
- 项目内容提交schema2纳入固定media presentation引用，排除SavedView/偏好与Comment/Approval/ReviewDecision独立历史。不会重写旧提交。差异提供真实Before/After图片而非transform JSON；这不等于全要素恢复/合并/undo journal完成。
- `a92d6f31e074` 显式column_class并约束origin/class、builtin生命周期；PostgreSQL和SQLite trigger禁止改类、builtin key/type/binding identity及builtin hard-delete。9内置新项目即建立稳定实例；20预设独立catalog，10已映射实体可添加，另10 pending禁用添加而不猜权威owner。此迁移只调整VNext现有列分类，未访问Legacy或复制旧库。
- 四区列管理、软删除确认/恢复、镜号列显隐及sticky offsets实际接入。最新三类合同覆盖旧三列禁止普通删除：9内置均可进入回收站，不清Shot等canonical值；恢复同ID，所有内置API/SQL均拒绝Purge。镜号/时码/图片复制剪切限制仍保留。默认9可见，约7高频模板策略待后续。
- CSV/XLSX/DOCX/PDF字段选取独立于表格可见列，服务端只允许当前项目active且已映射定义，所有active内置均可取消。回收站/已Purge列不进入新列型导出；非法/陈旧/空选择400。图像仅选中分镜画面时输出（CSV不含图片）。EDL/OTIO/SRT保持格式必需技术字段并在UI标记。
- PDF预览以相同PDF生成函数的实际字节、已安装PDFium渲染逐页PNG，WebView无需PDF插件；分页与no-store，浏览器可见。PDFium原生调用串行防线程问题，达到并发瓶颈后接队列；每次分页当前重新生成PDF，尚无预览cache/job owner。
- `b03e7a42f185` 新增独立 `export_templates`，持有项目、名称、stable column IDs、schema version与revision，名称项目内唯一。创建/更新使用项目锁、权限/expected revision、同事务audit/outbox；no-op无事件，冲突保留选择草稿。读取过滤失效列，soft-delete恢复同ID可重新引用，自定义Purge清引用并推进模板revision，新同名不同ID不复活旧选择。模板只保存字段选择，不保存格式/布局/profile历史；未新增删除模板UI/API。
- 导出/模板已加角色权限入口，但不宣称完整项目成员、分享scope和字段级授权完成。

### 9.2 实际证据

- 完整后端125项通过；仅1项Starlette弃用warning，未把warning改成虚假全绿。针对新增真实ORM、source文件像素保留、CAS/no-op/owner、媒体diff、class SQL保护、格式字段、PDF字节预览一致性、stable模板ID与Purge清引用均有可运行检查。
- Web TypeScript、packages与Next生产构建实际成功；boundary、Regression Guard及diff检查通过。没有新增package依赖；复用Pillow/PDFium/react-image-crop。Next可用环境distDir隔离QA，默认路径不变；验收生成的临时tsconfig配置已恢复。
- 官方PostgreSQL16隔离loopback55432：空库完整19迁移至 `b03e7a42f185`，32 ORM表/timestamptz与schema一致；跨项目composite FK拒绝、真实project row lock阻塞竞争writer、CAS过期409、批注个人水位、audit/outbox原子回滚、builtin SQL绕过拒绝、soft-delete/restore通过。
- `frameforge_final_rehearsal` pg_dump→新的 `frameforge_finalrestore_rehearsal` pg_restore，revision、UTC瞬间、批注事件/水位、stable export field IDs及schema/内置列保护复核通过。备份 `/private/tmp/frameforge-final-rehearsal.dump` 仅合成数据，未上传。未执行生产DDL，未部署。
- 独立3002/8002真实Web验收：镜号删除/回收站/恢复001原值、官方旁白预设添加、原800×600图保存9:16/翻转后源图与单一AssetVersion仍保留，Review真实Before/After，交付模板“仅标题 QA”保存后刷新读取，字段仅标题PDF可见且1页。额外拖动/缩放草稿取消。裁剪弹窗320/375/768/1024/1440无根横向溢出；非全站完整视觉通过。
- 合成截图留本机：`本机固定证据目录media-before-after-qa.png`、`export-template-pdf-qa.png`。原用户3001服务未改接合成库；本輪API/Web/PG验收进程结束后停止，数据目录和dump保留。

### 9.3 尚未完成，下一次不可忽略

1. 10项pending预设的明确语义/实体映射与类型合同，特别Scene地点与镜头、制作方式/执行方式区别；先定canonical owner，再接schema/导入/编辑消费。
2. 预设Purge依赖审计及受控历史/导出任务产物/cache/媒体引用/undo/tombstone闭包；不能以清当前实体值声称完成永久删除。四区回收站目前只restore；已有自定义manager Purge保留且补模板清理，不等于全新统一PurgeUI完成。
3. 导入catalog稳定ID映射、SavedView所有布局按稳定列ID收口、约7高频默认视图。
4. 全项目undo/redo、restore、三方merge/冲突、灯光原生持久化与组件范围；内容commit/图片草稿Undo不能替代全要素journal。
5. 媒体所有组件构图UI、共享source独立owner显示、历史source授权/保留与引用GC、直接DB不可变策略；极端transform自动避黑边。
6. 完整成员/字段/分享scope权限，列命令统一aggregate revisions/outbox，推送worker/Redis重连。
7. 完整六版式/水印/便携工程附件/交付profile版本/任务队列；本段字段模板不是完整交付配置系统。

后续每次开工先读CONTINUE_WORK及最新远端MD，再选明确切片；所有未完成项继续保留真实状态，不标产品全面完成。

GitHub `095fb7a` 已核实：FRAMEFORGE CI、PostgreSQL Migration Rehearsal、Safety Invariants成功；Regression Guard因裁剪重构未同步两份parity台账失败。后续文档补齐PRODUCT_PARITY_MATRIX和SCREEN_PARITY_MATRIX，必须以完整基线差异重跑guard，并核实新推送结果；不抹除该次失败记录。

补充实际结果：补齐台账后，以 `93c98f4` 为base的完整本地Regression Guard通过；GitHub文档提交 `cd9536d` 的Regression Guard亦已核实成功。代码 `095fb7a` 的构建/PostgreSQL/安全成功证据保持；文档提交的额外FRAMEFORGE CI查询时仍queued。
