# 扩展性实施计划：数据库、命令与接入门槛

日期：2026-10-04。状态：**PLANNED / COMPLEMENTARY EXECUTION PLAN**。

2026-10-04 全量文档审计后，产品规则见[最新总纲](VNEXT_MAX_EXTENSIBILITY_REQUIREMENTS.md)，本计划直接更新实施位置，不再保留失效待选表。配套[执行标准](EXTENSIBILITY_EXECUTION_STANDARD_2026-10-04.md)、[工作包清单](extensibility_execution_plan_2026-10-04.json)、[知识库](VNEXT_KNOWLEDGE_LAYER_REQUIREMENTS.md)、[时间段资源需求](RESOURCE_TIME_REQUIREMENTS_2026-10-04.md)。本文的源码盘点是注明提交的历史证据；本轮审计基点为 0e7de58，远端现有界面增量已快进纳入，本轮没有运行产品验收。

本文件承接 [最大化扩展性需求总纲](VNEXT_MAX_EXTENSIBILITY_REQUIREMENTS.md) 与[岗位需求](ROLE_WORKFLOW_REQUIREMENTS_2026-10-03.md)，给出可拆分执行方案。岗位稿在代理初次检查时尚未跟踪，现由主执行者一并整理上传。表名、接口名和迁移批次为实施细化，除明确引用的已确认决定外，不冒称用户亲自指定。

补充输入：用户指定的 `PRODUCTION_LIFECYCLE_REQUIREMENTS_2026-10-03.md`（需求稿1.0，547行）已完整读取。该文件来自用户提供的另一工作区，检查时不在当前仓库中；本文只引用文件名、章节与R-/AC-编号，不复制私人路径或创建失效的仓库内链接。**用户随后明确排除经营领域，以现有GitHub需求为准、补充细节**：不加入预算、报价、商务合同/采购、费用、真实收付款、利润、财务/收益结算领域，也不把它们列为等待确认的工作。生命周期稿只补充制作、排期、工种、交接、素材、交付及协作验收；不整体升级该稿所有细项为已批准。

源码盘点基点为 `master @ f29143327929ef2d46d4946cc69434ee1ed7aeed`。初次检查父会话正在修改后端并保留前端草稿；下文保留基点事实并标出最终提交状态。推送前已fetch origin/master，核实本地与远端均为 `f7b60ddcf10244a101c05d7607131ddcd99df3b8`，总纲从f291433到该远端没有变更。本轮没有生产访问或应用运行验收。代码存在、测试文件存在、历史记录曾通过，都不等于本轮运行验收。

后续检查时主执行者已提交根协调规则，HEAD为 `23386488bc1fec1d124acf3561564902bf1b02da`，包含 `3aacf18` 与 `2338648` 的并发写集/UI交接规则；本文已读取对应差异。用户最后要求将编写完成的计划推送GitHub，覆盖初始“无提交/无push”边界；只提交本新文档，Git元数据和同步为该动作必要操作，其余dirty保留。最终同步与远端差异核对以本轮实际回执为准，不在文档内预报成功。

初次计划轮仅写本文件；本次全量审计修订相关需求、数据库设计、执行清单与衔接台账。应用代码、界面、依赖、运行数据库与部署不变，已有未提交草稿保留。职责划分表示文件责任，不要求并行开智能体。

## 1. 固定约束与计划边界

已确认决定依最新总纲的组织、场景、权限和字段章节执行：可选 `Work → Episode → Production`，简单项目 standalone，无 `Work → Production` 直挂；SceneShot 为 0..N 多对多；User / Person / Character 分离；Take 延后，只保留真实关系扩展 seam，不建空表、空 API 或页面。当前计划不增加 Work 合并需求。

不保存 Import Recipe、客户模板或长期用户导入映射。导出 Profile 可以持久保存，它和一次 Import Plan 是不同合同。Legacy 只保留便携工程文件桥，不做旧数据库迁移、旧 API 兼容或双写。本文的 backfill 专指新增结构对已有 **VNext 合成/隔离数据** 的转换演练。

制作联动补充按生命周期稿§13：正常变更自动更新可推导的相关未来计划和预测，再通知负责人处理例外，不把逐项确认当正常更新前提。不承诺自动选择全局最优方案，不把更新计划当完成拍摄/交接；锁定项、未知档期/容量、语义歧义形成显式例外，实际事实与原基准保留。Take虽在长期生命周期稿出现，当前GitHub总纲的已确认延期仍保持，现场查看/调度/素材交接可先贯通，Take-specific验收属于未来明确启用阶段，不建空壳填覆盖。OMC外部API的拓展请求在来源稿中仍待目标确认，不擅自提升为当前GitHub计划的必需实现或阻塞。

最新用户规则：**现有 UI 权威/负责人为 GitHub 用户 `montblanc08`，以其最新 UI 提交为准**。这是用户指定的所有权，本文未用远端作者审计推断具体 SHA。保留其现有镜头表、列/行菜单、选择、复制/剪切/相对粘贴、保存反馈及整行照片封面控件。当前轮次无 UI 修改；用户已进一步授权主执行者在不覆盖现有修改的前提下补全真正不存在的页面，之后审查接入，没有全局 UI freeze。不要用新工作台替换原制作概览四项统计或增加已移除的全局审批看板。9 内置 /20 预设 /N 自定义列合同继续适用：内置允许软删除/恢复，禁止 Purge，核心值不因隐藏/普通删除清空。

所有持久业务写入继续进入 `apps/api` 的应用服务与原 SQLAlchemy unit of work；PostgreSQL / Alembic 为持久化与迁移 owner。根共享包只使用现有 ui/types/contracts/timecode。新模块先放所属应用，真正跨 runtime 的稳定合同再进入已有 contracts；不因领域增加顶层 package。

## 2. 当前实现盘点：可复用基础与缺口

以下证据以仓库相对路径和符号定位；HEAD 事实可用 `git show f291433:<path>`复核。路径链接指向当前工作树，涉及父会话变更的行不代表 HEAD 内容。

| 能力 | 当前证据与实际 owner | 本计划需要补的 seam / 状态 |
| --- | --- | --- |
| 项目与修订向量 | [production.py](../../apps/api/app/models/production.py) 的 Production 有 revision/schema_revision/order_revision/content_revision/purge_epoch；[production_revision_service.py](../../apps/api/app/services/production_revision_service.py) 有完整向量 CAS、项目锁、no-op；[production_service.py](../../apps/api/app/services/production_service.py) 有项目 CRUD 与封面查询 | 复用向量服务，逐命令核实真实调用；文件头旧“未接业务 owner”注释不能覆盖工作树 ImportService 已调用的事实。未找到 Work/Episode 模型或成员权限域。 |
| Scene / Shot / 制作步骤 | [production.py](../../apps/api/app/models/production.py) 的 Sequence/Scene；[shot.py](../../apps/api/app/models/shot.py) 的 nullable Shot.scene_id、ProductionStep、Panel | 当前单 FK 不是目标多对多。Scene 缺显式业务 revision；Sequence/Scene 的生命周期与项目约束需服务补齐。ProductionStep.owner_id、输入/输出素材字符串不证明人员或任务关系已经实现。 |
| 字段定义和值 | [field.py](../../apps/api/app/models/field.py) 的 ProjectColumn 是定义/生命周期唯一 owner，ShotColumnValue 带 project/shot/column 复合 FK，value 为 JSON；[custom_field_service.py](../../apps/api/app/services/custom_field_service.py) 有规范化、复制、CAS、删除/Purge | 已是 Shot 专属值表，不应误报成万能 EAV；尚无实体 scope 和多实体值 owner。类型主要由 service 校验。应扩展同一定义 owner，保留稳定列 ID。 |
| 预设语义 | [column_catalog.py](../../apps/api/app/services/column_catalog.py) 的 BUILTIN_BINDINGS / PRESET_KEYS | 10 个 pending：shot_reference、location、int_ext、day_night、dialogue_character、edit_transition、notes、feasibility、replacement、execution_method。不能把文案存在当作绑定完成，也不能统一塞进 Shot 字符串。 |
| 身份与鉴权 | [user.py](../../apps/api/app/models/user.py) 的 User/Role；[deps.py](../../apps/api/app/api/v1/deps.py) 的 get_current_user；各域 service 有全局 permission 检查 | 已有认证账号，未找到 Person、Character、ProductionMember 的持久域。当前全局 Role 不是项目岗位/成员合同，需一个项目 permission service 收口；不是扩展角色名称比较。 |
| 持久 undo/redo | HEAD [history_service.py](../../apps/api/app/services/history_service.py) 的 begin/capture/finish/move/barrier；[history.py](../../apps/api/app/models/history.py)；[database.py](../../apps/api/app/core/database.py) 的 get_db 在 commit 前 finish；[history_context.py](../../apps/api/app/services/history_context.py) 从可信请求解析范围 | **现有实现，非待建基础设施**：用户＋项目 100 步，服务端 allowlist、对象 token/依赖校验、redo 分叉与整步补偿。新增领域扩展它的编解码、权限、依赖和捕获，不建第二套 journal。 |
| 历史真实消费者 | [history API](../../apps/api/app/api/v1/history.py)；[ProjectHistoryControls](../../apps/web/components/app-shell/ProjectHistoryControls.tsx) 查询/调用项目历史；[useWorkspaceLayout](../../apps/web/lib/hooks/useWorkspaceLayout.ts) 消费个人布局 | 路由与 Web 消费已存在。CONTINUE_WORK / PROJECT_HISTORY 记录此前 137 项后端及 PG/浏览器验证，整体 INTEGRATED_NOT_CUT_OVER；本轮未重跑，不把旧通过推广至新领域。 |
| 内容版本、视图与交付选择 | [project_snapshot.py](../../apps/api/app/services/project_snapshot.py) HEAD schema2 allowlist；[project_version.py](../../apps/api/app/models/project_version.py) 的 ProjectCommit/ProjectBranch；[view.py](../../apps/api/app/models/view.py)；[export_template.py](../../apps/api/app/models/export_template.py) | 内容快照不包含共享视图、个人布局或整包 Review 活动。ExportTemplate 当前主要保存字段 IDs，不是完整 DeliverableProfile。角色/任务/排期版本边界不能由新增 ORM 自动决定。 |
| Outbox / worker | [command.py](../../apps/api/app/models/command.py) 的 OutboxEvent 有 command_id/type/IDs/revision/attempt/published_at；多个 service 写事件；[worker.py](../../apps/worker/worker.py) 构造 Redis RQ Worker | 未找到通用发布器、消费者收据、持久 Job、受控自动化规则闭环。RQ 可复用作 adapter；启动 Worker 的源码不是业务任务已消费证明。当前并非所有写命令都已产出统一事件。 |
| AI / Presence | [ai_provider.py](../../apps/api/app/services/ai_provider.py) 是默认 disabled registry＋离线 mock；[ai_proposal.py](../../apps/api/app/services/ai_proposal.py) 是进程内 proposal；[presence.py](../../apps/api/app/services/presence.py) 为进程内状态 | AI Proposal 接受与持久 Job/标准命令的目标链仍需收口，不公开未解决缺陷细节。Presence 的 Redis TTL、多 worker 与受权连接为未来门槛；不得写成已实现。 |
| 普通导入/导出 | HEAD [document_import.py](../../apps/api/app/services/document_import.py)、[importer.py](../../apps/api/app/services/importer.py)、[document_parsing.py](../../apps/api/app/services/document_parsing.py)、[import_service.py](../../apps/api/app/services/import_service.py)；exports/document_export、exporter | 有真实格式解析、嵌图、OCR、普通导出及共享 allowlist。当前应用内已有原生解析文件，旧 handoff 的 legacy_import_adapter 描述不是当前事实。Provider 接口、持久来源链与冻结 Plan 尚未完整。 |
| Purge | CustomFieldService.purge_field 保留清空内容的 tombstone，清 values/版本引用/视图/模板/个人布局并调用 HistoryService.barrier；ShotService.purge_shot 同样清项目历史 | 已有局部闭包和防 redo 机制，不是全领域 PurgeLedger/媒体 GC 已完成。新关系、jobs、导出工件、导入来源、缓存加入闭包之前不能开放其永久删除。 |

### 2.1 父会话增量的接入点与最终检查状态

最初检查下列代码均处于父会话整合中。最终检查确认Board后端已在 `f7b60dd` 提交并推送；用户/父会话回报18项定向通过，本轮未重跑，不推断全站UI、PG或全量cutover完成。Import/Export后端与前端草稿仍有dirty，本计划不抢写、不上传这些增量：

| 增量 | 检查到的代码 | 接受前门槛 |
| --- | --- | --- |
| Lighting / Moodboard | CreativeBoard/BoardAssetReference、BoardService、boards router、Alembic `c14f8a63b920`（parent `a83f02c1d765`）、注册/History/snapshot与Board测试现已在f7b60dd提交 | BoardService.begin_history / history 调用 canonical HistoryService；没有引入 BoardState undo owner。Moodboard 可撤销但不入内容提交，Lighting进入内容快照；18项定向通过为父会话回报，剩余PG/前端/完整消费者门槛按其交接核验。 |
| Import modes | imports.py / ImportService 增加 append/update/replace、preview_plan、explicit Shot ID/revision、replace 确认及 savepoint 补偿；document_import 保留 preamble/row numbers | 未提交的 `test_import_modes.py` 包含 no-op、冲突、替换范围和回滚场景；不等于完整模糊识别、安全 MERGE 或冻结 Plan。当前提交仍会调用 preview_plan 校验，后续要分开确定计划与复验。 |
| 导出版式与工程文件 | document_export/exports 增量、新 engineering_pdf.py 与 test_export_layouts.py；工程文件解析是 read-only staging | 六版式、QR/ZIP/附件、选择字段/范围/媒体及预览消费待父会话验收；哈希/QR 完整性不等于签名或隐写水印。后续 provider 化包裹真实实现，避免平行重写。 |
| 前端草稿 | 新 boards/lighting/moodboard 页面、useBoards 及依赖变更仍在工作树 | 属于父会话草稿，本轮不修改、不构建、不接收为已验收。后续单独分配 UI 接入与浏览器证据。 |

## 3. Owner、写集与依赖分工

owner 是逻辑责任；具体执行人由后续集成安排。本轮所有实现任务均未执行。单会话可顺序完成，禁止多个执行者同时改共享边界。

| Owner | 将来独占职责 / 文件 seam | 对其他 owner 的依赖 |
| --- | --- | --- |
| Integrator / 主执行者 | main.py、models/__init__.py、Alembic 链及运行注册；核对父会话增量；确认合同版本与接受证据 | 最后整合各域增量，只有集成者修改共享注册/迁移链。主执行者正在更新根 AGENTS/衔接账本，本文不抢写；执行时读取其最新记录。 |
| Command / History | 现有 database.py、history_context.py、history_service.py、production_revision_service.py 的小步收口 | 各域提供显式 codec、relation dependencies、权限与 revision 分类；不从 ORM 自动反射持久字段。 |
| Identity / Permission | User owner保持认证；新增 Person、Character、ProductionMember、身份关联与项目 policy service | 先给接口合同，再接每个读写/媒体/历史/导出消费者。岗位不自动赋权。 |
| Organization / Relations | Work/Episode 挂接、SceneShot、Casting/Appearance、Location/Equipment 等 typed link 的业务服务 | 复用权限、事务、History codec；不直接修改 ShotService 内部状态以实现跨域联动。 |
| Fields | 扩展 ProjectColumn 唯一定义 owner与各实体值命令；catalog/binding/derived evaluator | 依赖实体及同项目 FK；将新的值与关系投影提供给 Import/Export/Query。 |
| Workflow / Schedule | Task、模板、DAG；Schedule 区间、资源、scenario 与查询投影 | 依赖 typed relations、membership、标准命令；Review 和 ProductionStep 保留原业务 owner。 |
| Import / Deliverable | 格式 Provider、冻结计划、来源链、Profile、授权投影与工件 | 接受父会话真实实现后再包装；复用标准字段/关系命令、Storage/Job。 |
| Infrastructure | Outbox 发布/消费、RQ adapter、Job、Storage、配置 Migrator、受控规则 | 依赖版本化合同与 permission/purge epoch；不得持有特权直接写域表。 |
| 现有 UI：montblanc08 | 以其最新提交维护已有页面/组件/控件，任何后端合同影响先交接供其审查 | 后端执行者不得用旧前端草稿覆盖其最新 UI；集成前核对最新提交与本地 dirty。 |
| 新缺失页 / Frontend integration：主执行者后续审查 | 在不覆盖现有修改前提下创建真实缺失页面，接 accepted query/mutation、slots、权限/冲突/ack，并提供渲染证据 | 用户已授权此后续范围，本轮仍 deferred/no UI。独立新文件写集；涉及既有 shell/导航/页的接入先协调 montblanc08，由主执行者审查。 |

### 3.1 UI 缺口与后端交接合同

检查 `apps/web/app` 的 page.tsx 清单：已有 productions、shots、storyboard、timeline、methods、overview、review、assets、deliverables、settings、share/login，以及父会话未提交 lighting/moodboard 页面。**这些均不是“完全没有的页面”候选**，本计划不据未验收状态重建或覆盖它们。

本次清单未发现独立 Work/Episode、Scene 管理、Person/Character/Casting/Member、Location/Equipment、Task/岗位工作、Schedule/拍摄日/Call Sheet 页。它们是后续补缺候选，不承诺每个实体必须单独一页；先检查最新 montblanc08 提交和主执行者草稿是否已新增，再按真实用户流程组合。没有页面只是缺口证据，不授权占位 UI；对应 API/权限/empty/error/真实写回未齐时保持未接入。

后端每个接受切片交主执行者及 montblanc08 一份具体合同：新增/改变的 endpoint 与 DTO、稳定 IDs/字段 scope、revision/policy/purge tokens、no-op/403/409及 receipt、History补偿/失效范围、媒体/预览授权、query cache失效/分页、配置版本迁移、现有消费者兼容期、已运行fixture和尚未通过门槛。交接记录在主执行者负责的衔接账本，当前文档轮不修改账本。

前端采用已存在的 query/API client、workspace store、局部表单草稿与根 UI primitives；新贡献点由真实 consumer 驱动。新页最先接只读与可解释无权限/失败状态，再接 authoritative ack命令；新页面代码与旧页面改动分开审查。导航/shell/Inspector/table slots不是自动获准重写的既有页，必须保留 montblanc08 当前设计并协调接入。最终浏览器门槛为 FX-16，后端通过不等于新页验收。

## 4. 标准 Command / Query seam

新增命令使用 server-owned actor/context，输入建议为 `{command_id, schema_version, production_id, expected, payload}`；actor、权限及 inverse 不由客户端提交。expected 精确说明 project vector、对象 revision、policy epoch 和 purge epoch 中哪些相关，禁止靠一个任意 revision 数字替代全部对象保护。

业务流程：鉴权 → 权限与 project scope → lock/check → 校验所有成员 → 域服务 → revision advance → Audit / History / Outbox → 原 get_db commit → authoritative receipt。导入、AI 接受、后台结果发布、undo 均使用这条链。锁序统一为项目根 → 对象，各层按稳定身份排序；跨项目容器批量命令明确逐项目 receipt，不许假装多次请求是单项目原子命令。

拟增加统一命令回执：项目或组织使用真实受控作用域；作用域外键及互斥约束、操作者和 command_id 构成唯一身份，不伪造项目；记录 request digest、result IDs 和 revisions；同 ID 不同 payload 拒绝，同 payload 重试返回同回执。receipt 只含受权最小信息，读取重验权限，Purge 清引用。现有代码并无此通用表，不把随机 event command_id 视为请求幂等保证。真正 no-op 不改业务 revision/updated_at，不新增 Audit/History/Outbox；receipt 是否需要为 no-op 独立保存应保持技术幂等语义，不伪造业务变更记录。

权限失败为 403，revision 冲突为 409，输入/非法关系为可解释 validation error；不存在/不可见遵循统一资源策略。保留当前 API 的错误形状，新增跨 runtime 合同用适配方式逐消费者接入，不一次破坏既有接口。

Query 使用统一 PermissionContext 过滤 SQL、对象/字段与媒体，不先取完整数据再仅隐藏按钮。复杂读模型返回稳定 IDs、source revision vector、policy epoch、计算口径与 cursor；缓存按项目/权限范围隔离，可从 canonical tables 重建。来源 token 变化后重新计算；不把 ready/conflict 写成第二布尔真相。

### 4.1 现有 HistoryService 的扩展方法

第一步为现有 SPECS / dependencies / references / ORDER / PERMISSIONS 建显式 domain codec seam，仍由 HistoryService 管理用户＋项目 cursor、100 步与原子补偿。每个 codec 声明 capture、format version、校验/权限、父子引用、补偿顺序、删除/Purge 规则及 revision 类型。先用现有 Shot/列/布局回归证明等价，再接新领域；不先重写整个历史引擎。

现有请求路径识别继续支撑已有消费者；新增非 HTTP/后台命令在服务入口显式 begin，不依赖 URL 字符串触发。get_db 仍只 finish/commit 一次，复合命令只产生一个历史条目。补偿先验证整步，再调用受控域补偿 adapter，保留正常域服务唯一写规则；不引入客户端 inverse 或第二套 BoardState。

History codec 版本与内容 snapshot codec 分开。迁移字段 scope 或 SceneShot 时，现有 history_entries/ProjectCommit 内的 stable ID 和引用同时可读；不因为新字段就清空已确认历史。旧不可解码条目必须明确拒绝重放并报告，不静默删除。Purge 才使用已有全项目所有用户历史 barrier；后续优化成细粒度清理不是当前必需方案。

权限每次 undo/redo 重验所有受影响对象/字段，而非只验证原角色名。禁止补偿成员撤销、永久删除或已发布外部副本。新增 step/task/relation 内容变更与纯 presentation 变更明确分类；现有 move 对非布局统一推进 content_revision 的路径需按 codec 收口，不让任务分派/共享视图误改内容 hash。

## 5. 数据库与 API 实施切片

以下路由均是 **建议合同，当前不存在的接口不能算实现**，默认前缀 `/api/v1`。新表只随真实命令/查询消费者建立；每批提供 Alembic、合成数据转换、codec 与接受 fixture。

### 5.1 Work / Episode：组织关系不改项目事实

建议 Work、Episode 为独立 container，Episode.work_id 为必填 FK；ProductionEpisodeLink 的 production_id 唯一、episode_id FK，关联有独立 revision。Standalone 表示无 link，不增加 nullable work_id 绕过 Episode。容器/关联有稳定 ID、权限、普通删除与审计；移除容器采用 RESTRICT＋显式解绑，不级联删除项目。

`CreateWork/CreateEpisode/AttachProduction/MoveProduction/DetachProduction` 由 Organization owner 处理；建议 `/works`、`/works/{id}/episodes`、`/productions/{id}/episode-link`。挂接锁组织关系，检查源/目标容器与目标项目权限，CAS 更新 link，不改变子 Production 的现有五个 revision、Shot ID、HistoryState、媒体引用或内部 membership。独立组织审计/事件不冒充项目内容变化；当前不承诺容器专属 undo journal。

Work/Episode 聚合 query 每个项目鉴权后求并集，不能因有容器访问权就透出全部项目。跨项目批量预览返回各项目权限与 expected vector，执行仍进入各项目 Command，返回 succeeded/conflict/denied receipt；重试只处理未完成部分。容器权限继承政策为 H-01，默认实现提案是显式项目授权，不自动授予。

### 5.2 SceneShot：安全迁移单 FK

建议 `scene_shots(id, production_id, scene_id, shot_id, relation_type, is_primary, order_index, revision, deleted_at)`；Scene 增加 `(production_id,id)` 唯一键及 revision，link 两端使用 project 复合 FK。active `(scene_id,shot_id)` 去重；active `is_primary=true` 对 `(production_id,shot_id)`部分唯一索引保证最多一个 primary。首版关系类型固定为 related，活跃同场景同镜头连接唯一，最多一个主场景；未来叙事类型有真实需求时单独扩展，不用自由文本控制逻辑。

`SetShotScenes` 一条命令提交完整 link 差异、link/object revision 与各 Scene order revision；`ReorderSceneShots` 只改某 Scene 内顺序，不改变全项目 Shot 身份/排序。建议 `/productions/{p}/shots/{s}/scene-links` 与 `/productions/{p}/scenes/{s}/shot-order`。Shot 可零 Scene，且额外 Scene 不必 primary；不要自动指定首个 relation 为 primary。

迁移分三步：

1. Expand：建 link /约束/codec；将已有合法非空 shots.scene_id 转为稳定 link，初始 primary，并以各 Scene 内现有 Shot 排序计算 order_index。无 Scene 保留 0 link，跨项目/孤立值报告并停止该转换，绝不猜关系。
2. 切换单 owner：命令/查询只读写 link。旧 VNext DTO 的 scene_id 如仍被消费者使用，只由 primary 派生；旧单场景写接口转译同一 link 命令并保护 additional links，不能暗中删除它们。旧实体 FK 列只作为迁移前事实保留，不继续双写。内容快照/undo/import/export/filter/schedule 同批适配。
3. Contract：所有真实消费者退出单 FK、历史 codec 可读且往返验证后，另批移除旧列。已经接受第二条 Scene link 时，旧二进制或单 FK downgrade 无法无损表示，必须拒绝回退并 forward-fix。

Scene 删除只删除/软删关系，不删除仍存在的 Shot。Scene 内场次统计按 link，项目 Shot 总数 distinct Shot；不因多场景重复增加帧时长。Shot.sequence_id 继续是明确独立事实；其与多 Scene 的冲突/展示规则按 H-02 决定，禁止迁移时默默重写。

### 5.3 Person / Character / Membership / typed resources

首批已确定项目作用域 Person、Character，Character 不存现实联系方式；Person 与 User 使用显式 identity link，不按名字/邮箱自动匹配。项目人员身份独立，跨项目通过明确共享人员关系核对冲突，不复制私人联系授权。此范围已由用户确认，不再作为提案等待。

ProductionMember 以 production_id/person_id 为项目职责上下文，可选 User link，带 status、revision；角色、部门多值采用 membership role/department typed links。Assignment/TaskAssignee 分开表示主责与协作；权限由 membership policy/override owner 计算，不由岗位字符串推断。若 member 同时记录 user_id，必须校验与有效 identity link 一致，禁止两个身份 owner 漂移。

CastAssignment 连接 Character ↔ Person，含候选/确定状态及有效范围；SceneAppearance 与 ShotAppearance 分开。场景要求动态继承为镜头需求，支持按项增补、排除、替换和恢复；实际出演独立记录，不从需求自动推定。Shot 可显式 on-screen/voice/background/替身关系，遵循最新总纲的动态继承和明确对白角色引用合同；匿名群演支持数量/组，不制造假账号。Location/Equipment 有独立查询/权限/生命周期时才建实体，与 Scene/Shot/Task/Schedule 的 link 采用同项目复合 FK。关系删除不级联误删人、角色或素材。

建议 `/productions/{p}/people|characters|members|locations|equipment` 和明确 `/cast-assignments`、`/appearance-links` 命令。停止账号保持业务 Person/履历；解绑账号立即撤销登录上下文。新 membership 切换前必须列项目现有授权，不能用现有全局 Role 为所有项目自动创建成员；新增项目由创建命令明确登记创建者授权，现有 VNext 项目的首批授予方案为 H-01。

统一 PermissionContext 至少含 authenticated principal、active membership、允许 actions、对象/字段 policy、分享 grant、policy revision/epoch 与 purge epoch。普通协作身份、受限联系资料和未来敏感档案分别投影；当前不要求采集合同/证件/薪酬。列表、搜索、计数、历史、Review、WS、媒体、导出预览/工件下载都在相同 scope 上判定。

### 5.4 FieldDefinitions / typed Values / bindings

**扩展 ProjectColumn 现有定义 owner**，逻辑名称可为 ProjectFieldDefinition，但不要再建一张长期并存 definitions 镜像表。首批给 project_columns 增加 entity_scope，已有列标 shot；唯一键从 `(production_id,key)`转为 `(production_id,scope,key)`，binding 唯一范围同时扩展。稳定 IDs 与 `builtin:`/custom keys、生命周期保持，现有 DTO 通过 shot scope adapter 消费。

实体值 ownership：继续 ShotColumnValue；SceneFieldValue、AssetFieldValue、TaskFieldValue 等只在该实体字段的真实命令/query 上线时建立。每表有 project/entity/definition 复合 FK，definition FK 包含 scope/type/binding discriminator，防跨 scope 或将 entity/derived/pending 值误写到 custom 表。强制 `(entity_id,definition_id)`唯一。Sequence/Person/Location/Equipment 同理按消费者增量加入，不一次预建空表。

首批值类型建议 text/textarea、decimal number、boolean、date、single/multi option；如需 frames 使用整数并声明单位。当前 JSON 值可逐步转为各表显式 text/number/bool/date 分支＋类型一致 CHECK，多选关联稳定 option IDs 与 option link；复杂 camera_movement 留在原 canonical owner，不通用化为任意 JSON custom。转换时拒绝 bool-as-number、无效 date/选项，保留隔离转换报告；清空、未填、默认值三者明确，默认值不暗中回写所有历史行。

类型改变是 `ChangeFieldTypePreview/Commit`，列出全部失败行、引用与 expected schema revision；不能普通 PATCH field_type 后默默截断。存在不适合 SQL 转换的值时先在隔离批次显式转换/确认；迁移 source 保留到无损验证后，切换后只有一个值 owner，禁止继续双写。历史 entry/快照里旧 JSON value 由 codec 读取；不清空已有用户历史以完成结构迁移。

建议 `/productions/{p}/field-definitions?scope=...`、`/productions/{p}/{entity}/{id}/field-values`；命令 CreateDefinition/SetValue/ChangeType/Trash/Restore/Purge。canonical binding 的写值路由原域命令，relation binding 路由 typed link 命令，derived/pending 只读；不能把 Person/Scene 关联降级为文字 custom 值。pending 的原始导入文本留来源区，用户确认目标后再建立关系。

Derived evaluator 在 API owner 内解析受控 AST，同实体字段、项目 fps 等变量白名单，禁止 Python/JS。限制表达式规模和依赖深度、检测循环，division-by-zero 返回明确 evaluation error。结果带 definition version/input digest，只有缓存可以重建；普通查询不能写新业务值。schema_version 指编码版本，definition revision 指业务变化；现有 schema_version 在若干写/补偿中递增，迁移前必须明确拆分语义，不能直接当历史编码代号。

### 5.5 Task / DAG / ProductionStep

新增 `tasks` owner 独立于 ProductionStep：revision、生命周期、department/priority、计划/实测 duration 与单位、执行状态；人员/目标/输入输出分别用 TaskAssignee、TaskScene/TaskShot、TaskAssetVersion 等 typed links。共享 Scene 准备任务一个实例连多个 Shot，不生成 N 个镜像完成状态。ProductionStep 继续拥有 Shot 制作工艺；TaskStep link 指向步骤，任务完成不直接改 Shot approval_status，Review 保留独立审阅 owner。

模板由 WorkflowTemplate＋immutable TemplateVersion＋稳定 node keys/edges 表达；实例固定版本，模板更新给出差异，通过受控命令更新未来工作，保留已进行/已完成事实。`InstantiateWorkflow` 一次生成完整节点/link/依赖/history；任何失败整批回滚，重复应用同模板不重复建任务。生命周期R-WORK-02提供待安排/可开始/进行中/待交接/已完成/取消的需求默认，blocked/逾期/input stale为并存标记；这是可采用的细化基线，不需再询问抽象枚举。工种具体必需产物、自交接/提前开始/跳过条件见H-05，不把RW示例模板当所有项目必填。

`task_dependencies(production_id,predecessor_id,successor_id,type,revision)` 首批仅 finish_to_start；同项目两端 FK、禁止 self edge、active pair/type 唯一。加边在同项目锁下检查可达性再写，阻止并发 A→B/B→A 各自通过；不依赖数组顺序或数据库跨域自动化 trigger。删除任务预览入/出边和下游缺输入，不能直接 cascade 边后让下游变 ready。

任务执行状态与 input validity 分开，ready/blocked 由 DAG/input query 派生；“已完成但输入过期”保留完成事实、交接人与旧产物版本。固定输入/output AssetVersion、Review target revision/template version/input digest；无关视图/备注不使全部任务过期。实测耗时不能由估时冒充。

任务来源失效按总纲 D-35 执行：Scene/Shot/Production Method/Requirement/模板版本变化后，只有系统自动生成、尚未 Start、无 Actual、无 output、无 Handoff 的任务可以由 Impact consumer 自动标记为 NOT_REQUIRED / inactive；该状态与人工 Cancel 分开并保留来源和历史。人工创建、已开始、已有输出、已交接或已经参与正式 Review/Delivery 的任务只标“来源不再适用/需负责人处理”，系统不自动取消。下游 readiness 随有效任务和依赖重新计算，但不能通过删边把下游伪装成 Ready。相同稳定来源重新适用时，只允许恢复未执行且未产生事实的自动停用实例；执行过的旧任务不复活。

建议 `/productions/{p}/tasks`、`/task-dependencies`、`/workflow-instances`、`/queries/my-work`；分派/转派/开始/提交/交接/重开/跳过均标准命令＋幂等回执。

### 5.6 Schedule / Scenario / projections

SchedulePlan为独立scenario owner，DRAFT/CURRENT/SUPERSEDED表示草案/当前/被后续修订替代，不提供“归档”操作。同一项目/明确Unit scope最多一个CURRENT（partial unique index），切换CurrentPlan为原子CAS。ShootDay/ScheduleItem用UTC区间、项目IANA时区及duration CHECK，保存拍摄日当地日期；默认Asia/Shanghai，不推定未知工作窗口或容量。

ScheduleItemScene/Shot/Person/Location及ResourceRequirement 是 typed links；同一 Shot 可跨日、多次引用。AvailabilityWindow AVAILABLE/UNAVAILABLE/TENTATIVE/UNKNOWN 共用区间来源，无数据不是“肯定可用”。Company Move 由 ScheduleItem 拥有区间、路线/耗时组件；需要负责人/确认时连 Task，不把时间再复制给 Task 或 Shot。Shot.duration_frames 是镜头内容时长，永不作为日程 start/end 的存储 owner。

首批用 deterministic conflict query 计算资源交叠、availability/dependency/locked/time-window/day-night/move-time。冲突模型返回来源修订和原因；人员、场地使用明确共享身份校验冲突，器材仅统计时间段需求，不建立容量或预留模型。缺信息提示待确认；无权限、无效时间、旧修订及非法依赖拒绝写入。初期不承诺全局最优 solver；未来 Provider 提出方案，用户接受后由 Schedule Command CAS 应用。多方案互不重写；发布/确认后的结果显式冻结，普通 conflicts 不作为手写布尔字段。

`/schedule-plans`、`/shoot-days/{id}/items`、`/queries/shooting-day|availability|resource-conflicts|call-sheet` 是拟议 query seams。Stripboard/Calendar/DOOD/CallSheet draft 从同一事实投影，可缓存重建。CallSheetRevision 固定 source vectors、允许字段与受权 resolved references，发布后改动生成新 revision；发送不在本轮授权范围，任何将来外发须实际授权。旧发布内容的 Purge/撤销例外按 §8 管理，不能宣称既永久不变又可复活已删除隐私。

排期、人员、地点或集合要求变化时只自动重算 CallSheet Draft，并对照最近 Published revision 标出变更和需要重新确认的 Recipient。Automation/Impact consumer 没有发布权，不得自动创建 Published revision，也不得自动发送/外发。Publish 必须由有权限的人显式执行并固定 source vectors；Send/Notify 若后续启用，是发布后的另一个显式受权动作。允许“已发布但尚未发送”，不能用自动通知结果反推已发布。

### 5.7 制作生命周期细化：计划、实际与交接

这些补充落在现有Task/Schedule/Asset/Review/Deliverable seams，不增经营领域或第二套实体镜像。来源为生命周期R-PRE-03/04、R-PROG-01–10、R-AUTO-01–08、R-WORK-01–09、R-SET-06/09、R-POST-01–08、R-DEL-01–04与R-VIEW/EXP/GOV。

| 补充能力 | DB / Command / Query落点 | 验收边界 |
| --- | --- | --- |
| 场景默认与镜头例外 | typed relation/binding声明继承源ID/revision，override具有INHERIT/SET/CLEAR/ADD/EXCLUDE语义；多Scene歧义保留异常。ChangeSceneDefaults触发影响事件，ResolvedShotRequirements是投影 | 没有默认出演时不凭场景关系制造全部演员；已经显式排除/清空的镜头不被重算覆盖。历史显示当时默认与例外。 |
| 基准、当前计划、实际、预测 | 在Task/Schedule明确字段与不可变BaselineRevision，Milestone与Task links随真实query建模；future prediction可重建，baseline仅显式命令新建 | 无工期/容量/依赖返回unknown，禁止伪精确日期；故事、视图和拍摄顺序独立。边拍边剪/分集交付允许并行，不固定线性阶段。 |
| 通告与个人反馈 | CallSheetRevision＋受限Recipient link；Draft由CURRENT计划投影；发布、通知delivery、view、ack、attendance分别有最小活动记录；ack固定revision。计划变化只更新Draft并计算需重确认范围 | 自动联动不得发布或外发；Publish与Send均须权限和显式命令。历史发布文件和旧确认保留；重要变化只把相关Recipient标记需重确认。通知失败可重试，不能标作到场或工作完成。 |
| 素材交接/备份检查 | AssetVersion/physical component、TaskAssetVersion、Review target复用；正式交接consumer需要时增加MediaHandoff/IntegrityCheck/BackupVerification，全部指向固定版本/opaque storage refs；Preview访问单独标识 | Formal Handoff 必须完整性通过并满足项目当前配置要求的BackupVerification；项目未配置的额外备份不凭行业习惯暗加。备份未满足可提供PREPROCESS_ONLY预览供草稿预处理，但不能满足正式input readiness、Final Review或Delivery。 |
| 补拍/返工与交付变体 | ReworkRequest指向源Review/comment/input/output版本和受影响Shot，生成唯一Task需求并发事件；DeliverableItem/Variant与共享Task link随交付query建模，固定规格/语言/比例 | 同来源问题不重复建返工；共享工作算一次，变体差异单列；已完成/已检查/已提交/送达/接收/验收是不同事实，不混成status百分比。Take仍deferred。 |
| 制作指标/期间趋势 | Query返回单位、授权scope、revision、as_of、分子分母与下钻IDs；趋势只读真实期间事件，已有AE+VFX制作标签统计保留 | 来源稿AC-18细化实际Task有效完成率：5项中1有效完成/1过期完成/1受阻且逾期/1待交接/1取消→1/4，过期另列、重叠阻塞去重。无事件不编造7天趋势。 |

这些新增记录仅在相应真实query/command上线时建表，与Schedule、Job、Export所需迁移一起接受。当前检查未证明存在BaselineRevision、CallSheet活动、MediaHandoff或ReworkRequest，不把表名建议当脚手架完成。

### 5.8 闭环独立工作包与最终接受边界

为避免“总纲有闭环、机器清单没有owner”，本轮把之前隐含在 E4/E6/E7/E8 中的三段拆成明确包，并增加一个只负责端到端接受的集成包：

| 包 | 职责 | 依赖与边界 |
| --- | --- | --- |
| E6-MEDIA-HANDOFF | On-set Actual / AssetVersion → IntegrityCheck → BackupVerification → Preview / Formal Handoff → Post input readiness | 依赖 E4-TASK、E5-JOB、E6-SCHEDULE；不重复 AssetVersion owner，不把 Preview 当正式交接 |
| E7-DELIVERY-LOOP | Review → ReworkRequest → 后期返工或补拍待排 → 新 Version → Review；Deliverable/QC/submit/deliver/ack/accept/reject | 依赖 E4-TASK、E6-SCHEDULE、E6-MEDIA-HANDOFF、E5-OUTBOX、E7-EXPORT；不把 Review/Task/Deliverable 混成一个状态 |
| Z0-PRODUCTION-CLOSED-LOOP | 使用总纲 §19.4 从项目/镜头一路跑到经验校准，验证所有包的真实组合而不拥有第二套业务写入 | 依赖 E8-IMPACT、E7-DELIVERY-LOOP、K2-CALIBRATION；只做集成验收和真实消费者证据，任何单包通过都不能替代 |

E4-TASK、E6-SCHEDULE、E8-IMPACT 的职责保持不变；新增包只填原清单没有 owner 的闭环段，不复制现有 Task/Schedule/Review/Asset/Export owner。

## 6. Provider / Event / Job / Config 接入

### 6.1 编译期 Capability 与 Provider

在 API 应用定义编译期 descriptor：stable capability ID、version、commands/queries、permissions、event versions、entity scopes、provider IDs、feature availability、UI contribution IDs。实际注册必须检查 route/service/provider 有真实实现；缺 consumer 的能力标 unavailable，不能用空 endpoint/card 通过。不是运行时上传代码、动态 ORM 或任意包执行机制。

Import Provider 的 probe/parse/extract_assets/normalize，Export Provider 的 supported scopes/selectable vs protocol-required fields/render/validate/preview，都包裹父会话被接受的实现。Provider 只负责格式/算法，不持有域写权。Storage adapter 包裹当前媒体服务的真实文件操作，域 API 只传 opaque storage reference；物理原图不可变，AssetVersion 是作品版本，thumbnail/proxy/rendition 是组件，不能虚增业务版本。

先用当前本地 Storage 和 RQ 做 adapter 实现与 failure fixtures，不因计划换新依赖。OCR 先包装当前 CPU 引擎，耗时工作移 Job；AI/TTS/search 只有真实需求 consumer 才接 Provider。AI 默认零外发，禁用路径无网络，Proposal 接受走正常 Command，mock 结果不表示实际音频/图像或版权结果。

### 6.2 可靠 Outbox 与消费者

扩展现有 OutboxEvent，补 event schema_version、aggregate revision/sequence、causation/correlation、必要 actor/service context、下一次重试/错误分类。payload 保留 IDs＋必要 immutable facts，不存联系人或正文。补足现有命令事件 coverage，不能只给新域发事件而让旧写路径无失效信号。

发布器分短事务 claim pending → 队列确认 → 标 published；采用可恢复 lease 与 PostgreSQL 多 worker claim，进程崩溃允许重复投递。published 表示 transport 已接受，不是每个业务 consumer 成功。consumer receipts 唯一 `(consumer_id,event_id)`，每个 consumer 版本独立幂等；有序处理按 aggregate token，不用墙钟推断顺序。失败指数退避、dead-letter、人工 replay 原 ID；实时广播/索引失败不回滚已确认业务事务。

Consumer 写另一 domain 时生成标准 Command，重验权限和 source revisions，receipt 与该写入同事务；RedisPresence/search/cache consumer 只改自身派生/临时状态。事件留存、replay 与 Purge 元数据边界见 H-08。

### 6.3 持久 Job 与结果发布

建议 `jobs` 保存 type/version、project/requester、source revision vector/input digest、provider/config version、policy epoch/purge epoch、状态/progress、idempotency、retry/lease 与输出 refs；JobRequested 在创建事务写 Outbox，RQ 仅负责传递/执行。API 建 job 后 202 返回 ID，query 暴露 authorized status，不以 enqueue 成功当完成。

worker 抢租约、读取受权输入、写 staged immutable 输出、发送结果。PublishJobResult 是应用命令，验证仍有权限、epoch/source revisions 没变、取消状态与 provider/schema 有效，再登记业务链接/工件。权限撤销、源图更新、Purge 或 cancel 后迟到结果只能 retained-for-review/failed/stale 按政策处理，不能自动覆盖；不宣称已经下载的副本可远程撤回。

取消为 cooperative request＋publication fence，retry 不重复造资产/交付；lease 过期可接管。临时输出失败补偿只清本 job 创建且未被引用的对象，重试采用稳定 output key；GC 与域事务分离，storage 删除失败留 retryable work，不让 DB 成功冒充物理擦除成功。

### 6.4 配置 Migrator 与 Automation

API 应用集中注册按 config kind/version 的纯 migrator；load → version detection → ordered migration → validate/normalize → current DTO。SavedView、WorkspaceLayout、DeliverableProfile、AutomationRule、ImportPlan/session、Provider/Capability settings 各有明确 schema_version，revision 另管业务 CAS。未知新版本明确拒绝编辑；不由 React 内几十个条件分支猜格式。

现有 WorkspaceLayout.config 没有独立格式列，SavedView/ExportTemplate 已有 schema_version 但不等于完整迁移体系。首批无版本配置按已知旧格式映射 v1，并保留审计受控的原样快照/校验摘要；读取迁移可纯计算，持久升级使用带 expected revision 的迁移批次，不在普通 GET 上隐式产生用户 History。

AutomationRule 使用白名单 event/condition/action IDs、DSL version、policy principal、enabled/revision。RuleEvaluation 记录 event/rule/version/command ID 和结果原因；同 event/rule/version 重复只发同 command，限制因果深度，防规则自激循环。自动化不借原事件作者已经撤销的权限执行，也不使用管理员捷径。已选定的正常制作联动在其可靠消费者通过验收后自动启用，不再逐项等待人工确认；发布AI生成规则、无授权外发、交接/跳过完成仍按H-05/H-10具体权限处理。Change/Impact解释AUTO_APPLIED/CONFLICT/LOCKED/REQUIRES_USER，只有需确认/冻结的影响持久化，不复制所有old/new快照。

完整制作联动事务分界：原变更同步commit并写Outbox；后台consumer按因果图重算Schedule/Task/资源需求/后期输入/交付预测，分别走domain Command/CAS，返回整次ImpactRun状态。一个目标失败不会回滚已确认源变更，未成功目标明确例外并可重试；不能只发“成功”隐藏未更新节点。锁定约束保留，相关预测/异常仍更新。ImpactRun合并同源链、按受影响负责人定向通知，无实际变化不重复通知。undo/redo是新的因果变化，重算未来计划而不抹去已经执行的工作和发布历史。

## 7. 无模板 Import 与受权 Export

### 7.1 来源、匹配与冻结 Plan

沿现有 parser/ImportService 增量增加 ImportSession/ImportPlan owner；来源 hash、sanitized filename、provider/parser version、sheet/page/row/column、原字段片段、mapping/merge decision 是 lineage，不是可套用其他文件的模板。大型解析可 Job，session 暂存输出 TTL；committed lineage 另有持久保留策略 H-08，session 到期不能顺带丢来源追踪。

解析器先识别结构、表头和源列，再提供现有对象候选及逐字段合并计划。多个源列可映射同字段，相同值去重、空值按类型处理；不同非空值默认冲突，文本拼接也须明确策略，关系候选须确认。低置信度或歧义不执行，阈值用合成误匹配样例校准。纯导入字符串不要擅自生成同名 Person/Casting。

冻结 Plan 保存 schema_version/source_hash/parse digest、project vectors/object tokens、provider/catalog versions、每行目标 IDs、CREATE/MERGE/UNCHANGED/CONFLICT/AMBIGUOUS、逐字段决策和媒体 manifest。预览只读；用户确认具体决策后锁定 plan digest。Commit 只执行此 plan，重验当前权限/CAS/epoch/文件 hash；不重新跑模糊推断选另一个实体。过期/数据变化为 409＋新预览。

同 source_hash 有可靠来源关联时可优先候选，但不能证明同名行就是同对象；修改后的文件 hash 不同仍用已确认 lineage/candidates 辅助，稳定 Shot ID 优先，镜号不是 identity。已有不同非空值不静默覆盖；父会话 update/replace 为显式模式，不能自动转换为智能 MERGE。replace 的软删除范围/确认和合成回滚证据需先被接受。

值来源使用实际实体 owner 的 typed lineage links，如 ShotFieldLineage/SceneFieldLineage/RelationImportLineage，指向 decision/source-cell；不建万能 value/entity 表。无变化提交不制造业务 Audit/History/Outbox；如果记录一次“用户查看/确认来源”的独立活动，必须明确它不是内容变更且受留存限制。

工程 ZIP/QR/Legacy portable 文件先 verify/stage，再映射 stable ID 命名空间与新项目 owner；文件来源 ID 不授予权限，也不能重放本项目 Purge 过的 ID。Legacy 只在文件 provider 入口出现，不回接 runtime/database。

### 7.2 DeliverableProfile / authorized projection

将 ExportTemplate 字段选择 owner演进为完整 Profile，尽量保留现有 ID 与命令入口；增加 provider/version、字段和 relation IDs/order、layout、纸张/方向、图片质量、水印、header/footer、filename rule、schema_version/revision。旧选择映射成明确兼容 profile，不借 SavedView/config 存交付权限。

一次 ExportPlan 的范围是活动 catalog ∩ caller/field/resource policy ∩ share grant ∩ selected fields/objects；所有正文、媒体、附件、工程 JSON、QR/ZIP、文件名与预览用同一投影。协议必需字段另列必需理由，拒绝无权限生成，不能暗中加回被排除的字段。取消画面同时移除原图和媒体 payload，不能只让 PDF 隐藏。

生成工件固定 source vectors/profile/provider version、projection digest、policy/purge epochs、引用 manifest；长期大工件用 Job。预览来自同一次已渲染成品或相同 frozen plan。发布和每次下载重验权限/epoch，模板引用被 Purge 时规范化并提示缺项。发布成功、下载、接收确认是不同事实。

Purge 后使服务端旧工件 withdrawn/不可下载并清受控缓存；外部已下载副本无法追回。必要隐写追溯是独立交付验收能力，父会话哈希/QR 实现不能代替；水印留存/追踪粒度见 H-08。

## 8. 生命周期、Purge 与真实回退

### 8.1 每个新实体的删除闭包

普通删除保留实体/关系/必要来源并可恢复；真正 Purge 先权限＋revision＋确认＋impact preview，然后项目锁下提升 purge epoch、保留无内容 tombstone/最小删除账、清所有用户 History barrier、清/redact相关内容快照与 Review 引用、清 view/profile/config/lineage refs、撤销 jobs/artifacts、写 Audit/Outbox，原事务原子提交。现有字段 tombstone/清理规则作为基础，新增实体的 Purge 账结构必须明确，仅记录删除 identity/epoch/类型；不是万能业务 graph。

同项目 restore/merge/undo/redo/import、旧 job/cached projection 全部查删除账与最新 epoch，旧快照不能复活。不同项目的合法导入是新 identity，不自动绕过来源/版权/隐私政策；跨项目禁止重用内部联系人授权。内置列始终拒绝 Purge，不能经数据库低层 helper 绕开。

闭包按 entity 显式注册查询：

| 被 Purge 对象 | 必查引用 |
| --- | --- |
| FieldDefinition | 各 typed value/lineage、Review quotes、ProjectCommit/History、SavedView/WorkspaceLayout/Profile、derived dependencies、ImportPlan/Job/artifact manifests、search/cache |
| Scene/Shot | SceneShot/Appearance、Task target/dependencies、ScheduleItem links、boards links、Panel/Asset refs、内容版本/审阅、lineage、交付/缓存；Scene Purge 不删除其他 Scene 或独立 Shot |
| Person/Character/Member | Casting/Appearance/Assignment、availability/schedule、任务分派、identity link/policy、联系人来源、历史/发布文档；撤销账号权限与删除现实人物内容是不同命令 |
| AssetVersion/physical component | Panel/typed domain links、BoardAssetReference、历史/内容版本、Review target、Task input/output、job staged outputs、published/downloadable artifacts、retention；原图引用未清前不得物理 GC |

涉及已发布 snapshot 的不可变性与 Purge redaction 采用已有红线：正常编辑不能重写旧发布；Purge 是显式受审计例外，清敏感内容/失效下载并保留最小 redaction/withdrawal 标记，不能让旧 hash 继续声称原内容未变。具体保留期限及 redaction 范围 H-08 决定。

物理 GC 是 post-commit job：确认当前引用图/retention/epoch，在删除前再次检查 pin 与正在发布的引用，采用受控排他 claim 防 GC 与新关联竞态。失败可重试，不提前删共享媒体；Purge 回执区分逻辑完成与 storage pending。恢复备份前先应用独立保留的删除账，否则旧备份会复活已 Purge 内容；不可回滚 Purge 的含义以受权保留政策为准。

### 8.2 expand / validate / cutover / contract

全部迁移标记 M-ID，不预造真实 Alembic SHA。最初HEAD为 `a83f02c1d765`；最终f7b60dd已提交画板 `c14f8a63b920`，parent为 `a83f02c1d765`。本轮未执行Alembic，Integrator执行时再核验唯一实际head与PG接受证据，后续从该接受链接续；不得重写既有revision/down_revision伪装无冲突。

每批验收：空 PostgreSQL→head、此前 VNext head 的隔离合成副本→head、数据量/ID/引用/hash 对照、constraint/cycle/CAS/锁竞态、事务与存储失败注入、旧配置/history/工件可读、备份恢复演练。create_all/SQLite 仅测试辅助，不替代真实 PG constraints/锁验证。

回退分三类：尚未写新数据的 additive schema 可经验证 downgrade；已经接受新数据的 schema/codec 必须保留，关闭新入口或 forward-fix，不能删表/回旧二进制丢写入；恢复备份必须说明会丢失哪些已确认变更，有精确重放/恢复与 Purge 账策略，生产恢复另需授权。不能用 feature flag 绕开权限或在 schema 不兼容时简单关闭后继续旧写路径。

## 9. 不重叠执行阶段与迁移依赖

执行单位有唯一职责，依赖不是重复建设。各阶段只接受自己的能力；父会话 B0 没有被当前计划自动验收。后续默认单执行者顺序推进，共享文件交 Integrator。

| 阶段 / 对应总纲 | 独占交付、迁移批次与 owner | 前置 / 完成门槛 | 无损回退界限 |
| --- | --- | --- | --- |
| B0 现有增量接受 | Board后端f7b60dd已提交推送，18项定向通过为父会话回报；Integrator核对剩余PG/消费者门槛，继续接受dirty import modes/export layouts | 不重做已提交Board实现；核验HistoryService与迁移链，明确前端尚未验收处；不是本轮实现任务 | 有 acknowledged board/import 数据时拒绝删表降级；不丢未提交草稿 |
| E0 合同基础（A） | Command/History：receipt/context/codec seam；Infrastructure：Capability descriptor、ConfigMigrator；M0 格式版本与收据 additive | 基于 HEAD 行为等价；FX-01/02/10；真实 consumer 注册，非空壳 | 旧客户端仍可受控使用现有 API；新 journal 编码产生后旧 reader 禁止写 |
| E1 身份/项目授权（A/B） | Identity/Permission：Person/Character/Member/identity、policy epoch；M1 表/FK/权限切换 | E0；H-01/03；FX-04/05/12。先列现有授权，再统一切换所有 read/write/media/history/export | 回退保留已建立成员事实，不放宽到全局 Role；未准备好时保持新功能关闭 |
| E2 组织/基础关系（B） | Organization/Relations：Work/Episode links、SceneShot、Appearance、Location/Equipment；M2组织、M3场景关系、M4演员/资源链接 | E1，H-02/04；FX-03/04/06；同项目约束/历史 codec/旧 DTO 受控投影 | 多 Scene 已写入后拒绝单 FK downgrade；挂接事实保留，不改子项目 revision/history |
| E3 实体字段（B） | Fields：扩展 project_columns scope/type、typed values/bindings/derived；M5 定义、M6 每个实际实体值转换 | E0/E1；对应实体依 E2；H-11；FX-02/07/14 | 非 Shot 值或新类型已写入后不能回旧模型；保留 IDs/source 与迁移 codec |
| E4 任务/DAG（B） | Workflow：Task、模板固定版本、依赖、交接；M7 | E2，任务 custom 字段依 E3；H-05/07；FX-08/09 | 暂停自动推进，保留 task/edge/产物，不把它们塞回 ProductionStep |
| E5 基础设施闭环（D） | Infrastructure：Outbox publisher/receipts、RQ Job、Storage adapter、provider包装；M8/M9 | E0/E1，包装 B0 被接受实现；FX-10/11/12。权限/Purge publication fence 必需 | 暂停调度与发布，已提交事件/job 保留可重放；不丢确认内容 |
| E6 排期/发布投影（B 扩展） | Schedule：scenario/items/availability/资源、CallSheetRevision；M10 | E2/E4，耗时 job 依 E5；H-06/07/08；FX-06/09/13 | 保留 scenarios/current 唯一事实；已发布 revision 显式撤回，不能静默改旧文件 |
| E7 数据入口/出口（C） | Import/Deliverable：Provider、冻结 Plan、typed lineage、Profile、artifacts；M11/M12 | B0/E2/E3/E5；H-08/09；FX-07/11/12/14/15 | 保留来源/receipt，旧端只能用兼容 profile；新多实体工程文件不能降成丢数据旧文件 |
| E8 自动联动/索引（E） | Infrastructure：Rule DSL/causation、ImpactRun、正常制作联动/例外通知、search consumers；M13（随真实consumer建模） | E4/E5/E6；H-10具体执行权限；FX-10/11/14/17；正常联动自动更新、AI proposal受控 | 故障暂缓consumer并显式显示未完成/例外，保留可重放事件和事实；恢复后补算，不把人工逐项批准改成产品默认 |
| E9 前端补缺/集成（已授权，主执行者后续审查） | 只创建真正缺失页并接真实 API；现有 UI 以 montblanc08 最新提交为准，无本轮 UI 写入 | 按已接受 E1–E8 各 slice 接入，遵循§3.1交接与写集；FX-16；保留 explicit frontend gap | 停用新 contribution，保留 montblanc08 最新表/封面与服务端事实；不能退到弱权限/假保存 |

早期不需等待所有长期域才能验证基础 seam：以一个 Equipment 实体从 E2/E3 到 query/permission/import/export/job/event 做贯穿 fixture，FX-14 失败即修该 seam，不能靠“目录建齐”通过。Presence Redis 与真实 AI/TTS 的接入可以后续独立排期，不是本轮文档完成条件，也不能因此声称总纲基础全部完成。

## 10. 有意义的验收 fixtures

全部使用新建的隔离合成 PostgreSQL/临时 Storage，不复制用户数据。每项保存请求/回执、前后 DB/引用/文件摘要和失败状态；下列是 **未来要实现并运行的验收**，本轮没有生成fixture文件或运行测试。已有test_command_history/test_production_revisions/test_import_commit/test_document_formats等为可复用起点；Board测试已随f7b60dd提交，父会话test_import_modes/test_export_layouts仍未提交，不给本轮PASS。

| ID / 覆盖 | 合成输入与注入 | 必须观察的结果 |
| --- | --- | --- |
| FX-01 现有历史等价 | A/B 同项目，连续创建/编辑/列复制＋布局；刷新；A redo 分叉；B 新建子引用；101步；late commit failure | 用户 cursor 隔离/最多100步；复合操作一条；失败/409 整步零写且 cursor不移动；本地输入 undo不抢项目历史。复用 test_command_history，不清旧条目。 |
| FX-02 no-op/CAS/codec | 同 command 重试、不同 payload 同 ID；业务字段不变；两事务相同 revision；旧 history JSON/无版本 config；未知未来版本 | 相同请求同 receipt；不同请求拒绝；no-op 的 revisions/updated_at/Audit/History/Outbox 不变；仅一 CAS 成功；旧条目可读，未知格式拒绝写。 |
| FX-03 Work/Episode | standalone P0；W1/E1/E2；将 P1/P2移入/移出；试直挂Work；P2当前无权；故障在第二项目批量写 | 直挂拒绝；独立不必填层级；每个项目权限过滤；归组前后 Shot IDs、五向量、History与媒体一致；逐项目 receipt显示真实部分完成，不伪造跨项目原子成功。 |
| FX-04 身份/岗位 | 无账号演员、同名两 Person、一人兼摄影/灯光、一人饰两 Character、受限 guest、停用/解绑 User | 不猜 identity或Casting；岗位不授管理权；Person保留、登录权限撤销；跨项目联系人不透出。对应 RW-01，加入最新 User/Person/Character已确认合同。 |
| FX-05 权限变更 | A普通成员、B只读、C另一项目；列表/计数/详情/历史/媒体/导出/WS；授权后撤销，运行中job与旧下载 | 所有入口同 scope；统计不暴露无权总数；失去权限后 undo、job publish和download受控，私密字段不入正文/日志/附件。 |
| FX-06 多 Scene | S1/S2共同引用Shot1，Shot2零Scene；各自重排；primary竞态；跨项目link；删除S1；旧DTO写primary | 各Scene顺序正确，最多一个primary，Shot1保留且全局总时长不重复；旧接口保留additional links；单FK回退被拒绝。Schedule/导出保留多关系。 |
| FX-07 字段/来源 | 同 key 在 shot/scene，numeric 0/false/null，日期/非法选项，required/default，text→number失败；pending对白/地点 | FK/type拒绝跨scope；不吞非法值；转换预览精确失败行；default不回写历史；关系候选不静默绑定；列IDs/旧view/profile/历史可读。 |
| FX-08 DAG并发 | A→B→D、A→C→D，共享Scene任务被三Shot引用；并发B→A/ A→B；模板v2发布 | 不形成环；共享任务计一次；汇合依赖全齐才ready；v1实例不改；故障不留半套任务；完成不改Review批准事实。 |
| FX-09 过期/指标 | 固定输入图v1/对白/灯光；完成后只改相关图v2；无关视图变化；AE+VFX双方式、取消任务、0分母 | 只相关分支失效，原交接保留；old result不覆盖；既有AE+VFX口径不改；新指标分子/分母/下钻IDs一致，0分母不显示100%。 |
| FX-10 Outbox/规则 | commit前失败；commit后队列失败；enqueue后标published前崩溃；重复/乱序event；consumer失败；规则自激 | 回滚无事件；已提交事件不丢；可重投且命令只一次；消费者状态独立；不回滚原业务；因果链可解释，循环受限。 |
| FX-11 Job/Storage | 导出/OCR大输入、staged文件后失败、lease接管、取消、权限/源revision/purge epoch变化 | 可查询真实progress/失败；取消阻断发布；迟到输出不入当前事实；重复worker不造重复asset；只清自建无引用staged文件，存储失败可重试。 |
| FX-12 Purge闭包 | A/B各有history、版本、视图、profile、来源、缓存；board pin与job输出；Purge自定义列/Scene/Person/Asset；旧artifact/restore/import/redo | 内置拒绝；普通删除可恢复；Purge清/撤销闭包并防复活，全用户cursor失效；其他Scene/Shot与共享原图不误删；GC竞态不能删除新pin。旧已下载副本不被称为撤回成功。 |
| FX-13 排期 | 两plans、同一Shot跨日/多Unit；UTC跨当地午夜/夏令时；UNAVAILABLE/TENTATIVE/UNKNOWN；转场不足；CURRENT竞态 | 正确时间语义与明确冲突；Shot内容时长不改；只有一个CURRENT；CallSheet draft更新、published旧revision不随正常编辑变。 |
| FX-14 新域插入 | Equipment实体＋设备许可custom字段＋Shot/Task/Schedule链接＋授权query＋import/export＋audit/event | 不新增Shot核心字段，不改巨大UI shell/万能graph；使用既定seams。迁移后历史/字段/Purge覆盖；有真实贯穿consumer，不只registry描述。 |
| FX-15 二次导入/交付 | 120镜头合成XLSX多行表头、嵌图、同字段多列、enum冲突、同名人；改文件重导；不同非空值；预览后并发改；PDF/ZIP排除人联系和图片 | CREATE/MERGE/UNCHANGED/CONFLICT/AMBIGUOUS明确；仅安全空值填充；plan commit不重猜；unchanged无假变更；成品/预览/附件/QR/JSON都符合allowlist；工程文件回读保持typed多Scene关系与namespace。 |
| FX-16 前端（deferred） | 对被接受slice真浏览器读写、403/409、保存失败/重试、dirty draft与refetch、keyboard/IME/localundo、明暗、1440×900和1920×1080桌面横屏/正常缩放 | 只server ack为saved；query/server/draft/derived分层；失效不覆盖草稿；稳定slot权限；表格菜单/选中/列控件及整行照片封面不退化；focus/关闭/动画可打断。按最新用户范围不新增窄屏/缩放验收或产品Reduced Motion开关，不用build代替视觉PASS。 |
| FX-17 制作联动闭环 | 两Scene/六Shot/两Person、摄影/灯光/制片/剪辑、两拍摄日、一共享设备、一外协Task、一交付变体。将周三计划移至周五：一人不可用、设备时间锁定、交付目标固定；正常链中途故障、重复event与undo | 未来人员/资源准备/通告当前修订/素材交接/后期/交付预测自动更新，可成立项不等确认；三个例外各有原因/负责人，原基准与已完成事实不改。旧通告/确认保留、新重要变化需重确认；失败目标显示并重试，不重复任务/通知。仅制作闭环，不包含费用、付款、合同经营或Take。 |
| FX-18 同一共享视图 | A/B同view，C另一view；并发改宽/高/筛选/排序/分组；断线重连、列删除、自动尺寸、undo与第三方后来写 | 配置同revision同步，选择/光标/草稿独立；冲突保留草稿；个人布局不双写共享配置；自动尺寸同结果，no-op不增版本，内容hash不变；已接受表格UI接入另由指定owner验收 |
| FX-19 跨项目身份 | 两项目同名Person、独立场地、显式共享身份、时间冲突、解绑、无权项目及并发排期 | 未关联不猜合并；授权后按共享人员/场地身份发现冲突；摘要不透出无权项目正文/计数，未知不假可用；器材不建立库存身份或预留 |
| FX-20 动态继承/环境 | S1/S2共同Shot；增补/排除/替换一个来源项，修改Scene、清override、删除/恢复来源；主Scene外日、另一Scene内夜；显式地点与无主场景 | 未覆盖要求动态更新，来源/override可解释；恢复取当前来源，来源新ID不套旧override；实际出演/Actual不被推定；环境显式值优先、主值附差异、无主待确认；资源计量按总纲确认规则测试 |

## 11. 已确认决定与真正前置条件

总纲、岗位、知识库与资源文档直接保存最终行为。旧 H-01/02/03/04/05/06/07/08/11 和 Q-05 的产品选择已经解决，不再逐项重复询问。

| 决定 | 实施含义 |
| --- | --- |
| 项目独立授权、人员项目内身份 | 组织仅分类；无账号人员可登记，同名不合并，账号明确关联 |
| 多场景、动态要求和逐项覆盖 | 主场景可无，镜头篇章独立；实际出演不从要求推定；环境明确值优先，主值显示差异 |
| 单主责与固定产物交接 | 独立审片不自确认，跳过须管理权限与理由且检查下游输入 |
| 九个初始列及共享配置 | 预设按需添加；内置不永久删除；SavedView 是共享配置唯一负责人 |
| 器材知识与需求 | 取消库房；知识仅型号与基础知识，不写使用方法；来源识别生成需求候选，时段清单不承诺实际可用 |
| 时间与数量 | 独立需求相加，明确共用一次；按已有排期关联，未排期另列，来源、型号、单位和时间可追溯 |
| 经验贡献 | 复用用户组团队归类，新经验固定采集时成员全部团队；换组只影响之后经验，原始回答隔离 |
| 图片与帧率 | 默认构图只影响未专用当前引用，版本固定有效构图；修改FPS自动保留秒数重算帧数 |
| 留存与删除 | 正式来源到明确删除；临时预览24小时、可重建下载7天，永久删除确认并清受控正文 |

实际人员名单、账号关联、需求数量、工作窗口和外发渠道是用户或管理员配置的数据，不能由智能体编造。没有配置不阻塞接口与结构实现，但对应业务不能显示已就绪。默认工种模板可后续提供，用户创建真实节点和依赖的基础工作流可以先实施。

技术验收由实施者完成：实际迁移链、外键和同项目约束、锁序、请求重试、权限收回、构图固定、删除闭包、作业发布、真实格式回读及新页读写。用户确认方案不能替代这些测试。

## 12. 资源、图片与帧率增量批次

原29包加需求、构图、帧率三个服务增量，再把需求新页从场景新页拆成独立包形成33包；本轮闭环审计再增加 E6-MEDIA-HANDOFF、E7-DELIVERY-LOOP、Z0-PRODUCTION-CLOSED-LOOP 三包，共36包。机器清单保存准确依赖和允许文件。新增包全部未开始，无虚构通过证据。已取消的库房和预留不再作为工作包。

| 包 | 依赖 | 独立交付 |
| --- | --- | --- |
| E2-DEMAND | E2-RESOURCE、E2-CAST、E3-FIELD、E5-JOB、E7-IMPORT | 复用源字段及导入结果生成需求候选，来源去重、缺值、明确共用、时段查询；不登记库存 |
| E3-MEDIA-PRESENTATION | E0-RECEIPT、E0-CODEC、E1-POLICY | 默认与专用构图优先级，固定历史有效构图及缓存失效，复用现有媒体服务 |
| E3-FPS | E0-RECEIPT、E0-CODEC | 保留秒数重算帧数、统一舍入和时码、影响预览；不修改音频及拍摄时间 |
| E6-SCHEDULE | 原依赖，加E2-DEMAND | 排期负责时间匹配，人员和场地冲突；器材清单只表达需要什么 |
| K3-RECOMMENDATION | 原依赖，加E2-DEMAND | 知识只提供型号和基础知识，不生成使用方法、不猜库存或自动改需求 |
| E9-DEMAND-UI | E2-DEMAND、E6-SCHEDULE | 仅补仍缺失的需求页面、组件和hook；与场景新页分开领取，保留现有UI |
| E6-MEDIA-HANDOFF | E4-TASK、E5-JOB、E6-SCHEDULE | 正式素材交接的完整性/备份门槛、Preview与Formal分离、后期输入readiness |
| E7-DELIVERY-LOOP | E4-TASK、E6-SCHEDULE、E6-MEDIA-HANDOFF、E5-OUTBOX、E7-EXPORT | Review返工/补拍回流、Deliverable/QC/提交/送达/验收/退回分离 |
| Z0-PRODUCTION-CLOSED-LOOP | E8-IMPACT、E7-DELIVERY-LOOP、K2-CALIBRATION | 只做端到端闭环接受；必须真实组合运行，不创建第二套业务owner |

需求由resource_demand_service负责；构图继续由ImageCropService/MediaPresentation负责；帧率由现有项目、镜头服务编排唯一时码算法。三包不写进同一个万能服务，不新造解析器、队列、权限或历史基础。公共模型注册、路由、迁移链及内容快照由集成者独占处理。

场景要求和镜头覆盖是持久事实，有效时段需求是可重建投影。人员、场地可以显式关联共享身份；器材型号是知识参考，不是实物身份。不新增库存、预留、库房作用域或库房操作历史。

## 13. 实施和接受顺序

先复核 B0 已有画板、导入和导出实际增量；E0 回执、历史编解码、配置可以独立推进。依赖满足后做身份与项目权限、场景与人员、字段、资源、任务和异步基础，再接时段需求与排期；随后完成正式素材交接、Review/返工/补拍/交付闭环，再接全局联动与知识校准；最后由 Z0 组合验证整条制作主链。

缺失页面按逐域已接受接口接入；已有分镜工作台、详情卡、图片预览、项目封面和设置由 montblanc08 当前界面负责，不因后端缺口重写。任何改变先记录 DTO、版本、错误、缓存、历史、权限、允许文件与真实证据，交接给对应负责人。

一包完成后拉取并核对他人增量，定向检查，更新文档，显式暂存、提交、推送并核对远端。不能以旧整份文件覆盖协作者，也不能把未提交或未运行结果写成远端通过。

## 14. 本轮交付与未完成范围

本轮完成需求访谈和文档修订。FX-01至FX-30、KL-01至KL-11是待执行门槛；新增任务失效边界、通告发布边界、正式素材交接、Review/返工/补拍/交付闭环、时段需求、默认构图继承、帧率重算、知识及相关接口仍保留未开始状态。既有实施记录只说明各自提交当时的证据，不推广到新增模块。

下一步按清单实施独立工作包。缺真实PostgreSQL、来源解析、构图历史、工程扫码、水印样本或桌面读写证据时，准确记录未验收项，不以“文档可执行”宣称功能已落地。
