# 扩展性执行标准与逐批验收合同

日期：2026-10-04（Asia/Shanghai）。状态：**执行合同已成文；实现按每个工作包的证据独立验收**。本文承接 [实施计划](EXTENSIBILITY_IMPLEMENTATION_PLAN_2026-10-04.md) 和 [岗位需求](ROLE_WORKFLOW_REQUIREMENTS_2026-10-03.md)，补足实际执行所需的决定、写集、协议、迁移、失败条件和验收入口。不能凭本文或状态校验脚本宣称功能已经完成。

## 1. 最新决定：已确认，不再重复询问

| 决定 | 执行规则 | 来源 / 性质 |
| --- | --- | --- |
| H-01 项目权限 | Work/Episode 只组织项目，不向 Production 继承权限。项目显式 grant，显式 deny 优先，岗位不赋权。新项目创建者登记项目管理权；已有项目由管理员明确授予成员，不从全局 Role 批量推定 | 用户本轮明确选择 |
| H-02 多 Scene | 0..N 多对多；可没有主场景，最多一个主场景。主场景只供默认展示。镜头篇章独立，跨篇章关联只提示差异，不自动改归属 | 用户本轮明确选择 |
| H-03 Person | 项目内独立身份；同名不合并。账号关联显式，跨项目复制或授权关联需确认。不因改名、解绑或停用账号改变 Person 稳定 ID | 用户本轮明确选择 |
| H-05 任务协议 | 一名主责、多名协作；交接固定产物版本。需要独立审片的任务禁止自确认。跳过须有理由、管理权限且仍满足下游输入；项目可配置更严格规则 | 用户本轮明确选择 |
| H-06 时区 | 默认北京时间，持久标识 `Asia/Shanghai`；可更改偏好或新项目默认。既有项目时区显式保存，不随查看者偏好隐式改变；工作窗口、拍摄日分界和人员场地安排可配置，缺值不推定可用 | 用户明确默认北京时间及可更改；其余为可解释的技术细化 |
| H-08 留存 | 正式来源追踪与产物版本保留到明确删除；临时预览24小时，可重新生成的下载工件7天；项目可缩短临时留存。永久删除清关联内容，只留无正文的内部删除标记 | 用户本轮明确选择 |
| 内容历史 | Character 定义、Casting 选择、Scene/Shot 出演关系、镜头和 Lighting 等创作内容进入内容版本。Person 身份/联系方式、成员授权、任务执行/交接、排期发布和 Review 是各自历史域；共享视图与 Moodboard 不进入创作提交，Moodboard 支持撤销 | 已有用户决定及“有必要的管理”授权下的实施分类，详见§5 |
| UI 写入 | 现有界面以 `montblanc08` 最新修改为准。仅补真正缺失界面；镜头表/菜单/布局、首页整行照片封面和已有设置不覆盖。导航接入只追加获授权入口 | 既有明确要求 |
| 重新确认的产品合同 | 全部9内置列首次可见，内置Purge禁止；同共享view配置同步；显式团队资源身份支持跨项目冲突；Scene要求动态继承并逐项增补/排除/替换；环境镜头显式值优先、主Scene值附差异 | 2026-10-04用户回答，完整登记于[最新总纲](VNEXT_MAX_EXTENSIBILITY_REQUIREMENTS.md#2-产品决定登记) |

原计划 H-01/02/03/05/06/08 已解除抽象决策阻塞。实际项目成员名单、人员账号关联、工作窗口、器材容量和外发渠道属于**具体数据**，通过配置或授权操作提供，不能填猜测值；没有配置不阻塞结构实现，但不得宣称对应业务已就绪。

时区优先级：已有项目 `timezone` → 创建项目时明确选择 → 创建者“新项目默认时区” → `Asia/Shanghai`。个人显示偏好只改变显示标签，不改变存储 UTC、拍摄日所属时区或既有预约。改变项目时区先预览当地日期/通告影响，保留 UTC 时刻；移动时间是另一显式命令。当地时区有夏令时的重复/不存在时刻必须由用户选择 UTC offset，不能猜。

## 2. 一次执行的最小工作包

每包必须包含：稳定任务 ID、职责、依赖、允许写集、排除写集、实际基础 SHA、协议/迁移变更、验证门槛、回退界限和真实证据。机器清单见 [执行清单 JSON](extensibility_execution_plan_2026-10-04.json)，校验器见 [校验工具](../../tools/validate_extensibility_plan.py)。清单描述计划，不是测试结果。

执行顺序：重新 fetch / 核对 dirty → 领取单包写集 → 查看真实 consumer → 小步实现 → 定向测试 → 真实 PG / consumer / 必要桌面浏览器 → 台账与合同 → 显式暂存 → diff / guard → commit / push → 下一包。

集成者独占 `main.py`、`models/__init__.py`、Alembic revision 链、共享 History/snapshot 注册及 canonical 台账。域包先提交域实现和具体接入说明，不能在多个 agent 内各自更改这些文件。新依赖先核对已有库；Python 的 `uv.lock` 与实际 CI/镜像消费的哈希锁同时同步。根包边界不增加新 `common/core/domain` 包。

文档修订只改变新的明确决定及执行合同；用户点名重写的总纲按最新确认重写，历史实施证据保留在各自记录中。每次提交只包含本包文件，不混入未验收的 imports/exports、新画板 UI 或未脱敏审计草稿。

## 3. E0 命令、回执、历史与配置合同

### 3.1 新命令封套（现有接口逐个适配，不一次改掉）

新增受控命令可在域 HTTP 入口接收以下形状；不是建立绕过现有 router/service 的万能 `/execute` 写口：

```json
{
  "command_id": "opaque-client-request-id",
  "schema_version": 1,
  "expected": {
    "project": {"revision": 7, "schema_revision": 2, "order_revision": 3, "content_revision": 6, "purge_epoch": 0},
    "objects": {"stable-object-id": 4},
    "policy_epoch": 2
  },
  "payload": {"name": "Synthetic value"}
}
```

项目 ID 来自已鉴权路由；actor/principal、权限、inverse、revision advance 和审计由服务器产生。ID 复用当前 opaque ID 规范，不强迫已有合成记录变为 UUID；ID 不能作为磁盘路径。revision 严格整数、拒绝 bool/负值；集合按稳定 ID 去重，批量请求必须有明确上限。每条命令 schema 独立限制字段，未知字段不能偷偷写进 ORM。

`expected` 由命令声明精确依赖：同事务修改多对象必须检查每个对象 token；结构/排序命令检查相应向量；所有授权敏感发布检查 policy epoch，所有恢复/导入/补偿检查 purge epoch。不能把用户提供的某个对象 revision 当作项目五向量。现有 API 的弱兼容期有具体 consumer 和退出条件，不能让新命令复用弱写路径。

### 3.2 回执持久化与并发

`command_receipts` 只保存 production/actor/command_id、规范化 request digest、结果 IDs、返回 revisions、结果类别和时间；唯一 `(production_id, actor_id, command_id)`，有项目与账号 FK。只写最小结果，不复制原正文、联系人、图片或客户端 token。组织命令使用合法独立作用域回执，不能伪造 Production ID。扩展同一回执负责人：受控 scope_kind 加项目或组织作用域外键，用约束确保恰有一个合法作用域；唯一键包含作用域、actor、command_id。不是把任意 entity 字符串当权限，也不另建平行回执服务。

项目命令按项目根 → 对象的稳定身份顺序锁定。跨项目组织命令明确逐项目回执，不伪装全项目原子成功。取消库房后不引入全站库存锁。所有服务采用同一锁序，不追加无关的全站锁。拿锁后首先检查当前身份/权限/Purge，再查询相同 command_id：同 digest 返回原受权回执；不同 digest 返回409 `COMMAND_ID_REUSED`。重放成功命令不要求旧 expected 仍等于当前值，否则网络重试会误报冲突；但原结果已被 Purge 或权限撤销时不得返回旧内容。

新请求检查 expected 后进入现有域 service。业务行、receipt、Audit、History、Outbox 同 unit of work 提交，失败全回滚。重复并发同 ID 只发生一次业务变更。no-op 可以保存技术回执，但 production/object revision、updated_at、Audit、History、Outbox 都不变化。失败请求不存成功回执；数据库故障可用原 command_id 重试。可重试与不可重试错误分别声明，不能无限重试409或权限失败。

成功回执至少包含 `command_id/result_kind/object_ids/revisions/history_revision`；`result_kind` 为 `APPLIED` 或 `UNCHANGED`。返回值只在 commit 成功后成为 ACK；router 响应前 flush 不是已保存证明。客户端保留 dirty/saving/acknowledged/failed/conflict 五态，409 保留本地草稿，重新预览后新命令 ID 再提交。

### 3.3 错误和 Query

沿用当前 `detail.code/message/details` 形状并由 API client 适配，不在本包重做提示 UI。401 未登录；403 已知作用域无权限；404 不存在或应隐藏的资源；409 CAS/旧 Plan；422 输入格式不合法；503 暂时 provider/storage 不可用。冲突 `details` 返回可读 token/错误字段，不返回无权对象正文、私密联系资料、SQL、堆栈或真实配置。

Query 在 SQL/权限投影阶段过滤对象、字段和计数，cursor 用稳定排序 tuple，不能用 offset 猜并发边界；响应携带 source vectors、policy epoch、as_of 和口径版本。过滤 digest/权限范围作为 cache key 的一部分。新域无完整权限 query 时不得接新页面或导出。

### 3.4 History codec 与配置迁移

先为现有 `HistoryService` 提取显式 codec seam，每个 codec 声明 type/format_version、capture/validate/restore、permissions、references、dependencies、compensation order、revision category、Purge policy。不从 ORM 自动反射；不增加第二 journal/cursor。新后台入口显式 begin；get_db 同事务 finish 一次。以现有 Shot/列/布局等价 fixture 验证后才接新域。

旧 entry 视为已知 v1，由只读 decoder 转当前 DTO；未知 version 明确拒绝 replay，保留原记录，不清空历史。配置 migrator 是纯转换链；读不能隐式写业务历史。写回须 expected config revision；SavedView、WorkspaceLayout、Profile、ImportPlan 各有格式版本，与业务 CAS 分开。新配置未被旧 consumer 接受前保持入口未接入。

## 4. 按域的数据库约束与命令合同

以下是**待实现合同**，路径是新文件 seam 或现有 owner；不得在 JSON 清单中把拟议接口写成已注册。每包都要 schema、service、router、migration、history/snapshot（适用）、API fixture 一起交付。

| 包 | 持久事实与约束 | 必需命令 / Query；写集核心 |
| --- | --- | --- |
| E1-ID | `people` 项目本地，`characters` 项目本地；每个活跃 Person 最多一个当前 User link，每个 User 在同项目最多一个当前 Person link。姓名无唯一约束；账号解绑/停用不删 Person。联系人不默认采集 | Create/Update/Trash/Restore Person、Link/UnlinkAccount；`services/person_service.py` / `models/person.py` / `schemas/person.py` / `api/v1/people.py` |
| E1-POLICY | ProductionMember 链接明确 Person/User；项目 grant/deny、组策略、policy epoch 为权限 owner。全局管理员只管理授予；任何跨项目汇总逐项目判定。拒绝优先，不用岗位名授权 | Grant/RevokeMember、SetMemberCapabilities、权限上下文 query；`services/project_permission_service.py` / `models/membership.py` / 域 schemas/router |
| E2-ORG | Episode 必须属于 Work；Production 最多一个 Episode link；standalone 为无 link。删 Work/Episode 不 cascade 子项目，先影响预览及显式解绑。组织变化不推进子项目内容向量 | Create/Move/Detach/Trash/Restore，聚合查询逐项目授权；`services/organization_service.py` / `models/organization.py` |
| E2-SCENE | Scene 和 Shot 各有 `(production_id,id)` 唯一键；link 两端同项目复合 FK。活跃 `(scene_id,shot_id)` 唯一、最多一个 primary；初版关系为 `related`，不预造闪回/交叉叙事 enum。Scene 内顺序与全局 Shot 顺序分离 | SetShotScenes/ReorderSceneShots、关系差异 query；`services/scene_relation_service.py` / `models/scene_relation.py`；现有 Scene/Shot codec 由集成者适配 |
| E2-CAST | Character 与 Person 通过 Casting 稳定关系；SceneRequirement 与 ShotAppearance/override 分开，同项目 FK。Shot 的 on_screen/voice/background/stunt 为明确类型。镜头动态继承所有关联场景要求，手动逐项增补/排除/替换，未覆盖项继续随场景更新；保存来源事实与override，不复制有效投影当第二owner | SetCasting/SetSceneRequirements/SetShotOverrides/RestoreInheritance、有效出演/未映射对白来源 query；`services/casting_service.py` / `models/casting.py` |
| E2-RESOURCE | Location/Equipment 只在真实查询/许可/生命周期接入时建；资源与 Shot/Task/Schedule 用 typed links，同项目校验。容量/档期未配置为 UNKNOWN | 资源 CRUD/绑定及 availability query；`services/resource_service.py` / `models/resource.py` |
| E2-SHARED-RESOURCE | 项目内Person/Location保留独立ID；显式关联共享人员或场地身份。人员场地冲突查询分别鉴权，不按姓名猜合并。器材仅需求与型号参考，不建立实物库存身份或预约 | Link/Unlink/PreviewSharedIdentity、受权冲突query；`models/shared_resource_identity.py` / 对应service/schema/router |
| E3-FIELD | 扩展现有 ProjectColumn 的 entity_scope，唯一 `(production_id,scope,key)`；不同实体 typed value 表、复合 FK、唯一 `(entity_id,definition_id)`。binding 非 custom 不进 custom value owner | SetValue/类型转换Preview/Commit、Trash/Restore/Purge；复用 `custom_field_service.py`，按真实实体增值表，不另造万能 EAV |
| E3-SHARED-VIEW | SavedView.config是共享列显示/顺序/宽度、行高、筛选/排序/分组的唯一持久owner；WorkspaceLayout保留个人呈现，不双写共享配置；config revision/CAS与ACK后广播 | UpdateSharedConfig/ResetAutoSize、config/events query；复用现有view/history模型及SavedViewService，前端改动交指定UI owner |
| E4-TASK | 单任务最多一名主责、多协作，显式目标 links；状态事实与 ready/blocked/stale 投影分开。产物固定 AssetVersion，template version 不可变。dependency 同项目/非自身，活跃边去重 | Assign/Start/Submit/Handoff/Reopen/Skip、DAG query；`services/task_service.py`、`workflow_service.py`、`models/task.py`；不复制 ProductionStep/Review 的权威状态 |
| E5-OUTBOX | 原事务事件+发布 lease；receipt 唯一 `(consumer_id,event_id)`；重复、乱序、崩溃可恢复。队列 ACK 不等于 consumer 成功 | claim/publish/consume/replay adapters；扩展现有 OutboxEvent，worker 无特权直写域表 |
| E5-JOB | 持久 Job、source vector/digest、provider version、policy/purge epochs、幂等 key、lease、stage 输出。租约用 fencing generation 阻止旧 worker 发布 | Request/Cancel/Retry/PublishJobResult、authorized status；`services/job_service.py` / `models/job.py` / worker handler |
| E6-SCHEDULE | UTC 区间＋项目 IANA tz；同 project/明确 Unit scope 最多一个 CURRENT Plan；同 Shot 可跨日多引用。未知档期不视为可用，实体容量明确，半开区间 `[start,end)` 相邻不冲突 | CreatePlan/SetCurrent/MoveItems/PublishCallSheet、冲突/DOOD query；`services/schedule_service.py` / `models/schedule.py` |
| E7-IMPORT | 单来源 session/Plan，不保存客户模板。冻结 source/catalog/parser digest、target IDs/tokens、每字段 decision、媒体 manifest。preview 只读，commit 不重跑模糊匹配 | Parse/Preview/Resolve/Freeze/Commit，复用 ImportService；typed lineage 分域，记录原 row/col/page/sheet |
| E7-EXPORT | ExportTemplate 演进 Profile，稳定字段/关系 IDs；正文/预览/附件/QR/ZIP 都同投影。下载重新鉴权；工程文件 verify/stage 后导入不重放内部权限 | Plan/Render/Preview/Download/Withdraw，复用 document_export；provider 不拥有写权 |
| E8-IMPACT | 白名单 rule DSL、因果链、命令回执、ImpactRun 逐目标结果；来源变更提交不因后台失败回滚。实际/发布事实不随预测重算改写 | 自动重算可推导未来项，异常原因/负责人、retry；正常联动默认生效，AI proposal 另受控 |

Entity可以有真正从属的子Entity，但必须先定义所有权、生命周期、作用域和授权/CAS。业务关联不足以构成父子；跨独立Entity使用typed link，删除一端不cascade销毁另一端。从属记录只有在明确的Purge闭包和授权命令下清理，FK cascade不能替代业务影响预览。所有关系scope/FK/CAS在service及适合的PG约束保护；数据库不运行跨域工作流trigger。具体父子合同见总纲§3.1。

任务：未派主责可保存草稿，Start 前必须有主责且所有必需输入就绪；Submit 固定产物与 sender；Handoff 验证接收人权限/任职和指定版本，独立审阅不能自确认。项目更严格配置不得允许跳过必须授权的输入或审片。取消、跳过与完成分开；无变化不造进度事件。

### 4.1 时间段需求、构图与帧率独立工作包

资源规则见[时间段资源需求](RESOURCE_TIME_REQUIREMENTS_2026-10-04.md)。最新第15、16问取消库房、库存、预留和使用方法；仅保留需求、型号和基础知识。原项目权限继续生效，不加拍摄任职资格例外。

| 包 | 持久事实与职责 | 接入边界 |
| --- | --- | --- |
| E2-DEMAND | 复用场景要求、镜头覆盖和导入解析的来源候选；查询指定时段型号、数量和出处 | 不重写解析器；不生成库存或预留；排期负责时间关联，未排期另列 |
| E3-MEDIA-PRESENTATION | 复用ImageCropService和MediaPresentation；默认构图继承、专用构图优先、有效构图固定与缓存失效 | 原图不可变；保留现有镜头预览操作，由UI负责人接入资产库缺口 |
| E3-FPS | 复用项目和镜头服务、统一时码算法；保留秒数自动重算帧数及派生时码 | 不改实测音频秒数或拍摄时间；不另造时码实现，不修改已确认UI |

候选表采用项目与来源的复合外键，唯一来源身份包含版本、原行页位置及字段；数量CHECK非负，件数类型限制整数，待确认允许空值但不能把空值写成零。来源修订和计算版本分别保存，删除/Purge、过期预览及重复确认按原命令/历史合同处理。不为TimeResourceDemand建立第二套可写主表。

同时间独立需求相加，只有明确的共用安排计一次；型号、单位或版本语义不一致不能直接相加。时间区间前闭后开，相邻不重叠；同一来源重复导入不形成第二份需求，多个独立拍摄安排则分别统计。缺数量或时间显示未知，不把片长当拍摄时长，不给出库存缺口或可用量。

| 门槛 | 实际验证要求 |
| --- | --- |
| FX-21 范围与权限 | 未授权查询拒绝；器材知识仅型号和基础知识；接口、模型及页面不产生库存、预留或库房资格 |
| FX-22 来源识别 | 字段及导入重复识别、缺型号或数量、来源修正和删除；同来源候选去重，独立来源不误合并；确认后走原命令 |
| FX-23 分时汇总 | 同时独立相加、明确共用一次、相邻区间、跨日、未排期及来源覆盖；只统计受权数据，不重复汇总同一使用安排 |
| FX-24 默认构图 | 未专用当前引用随默认构图更新；专用保持；历史、审片及导出固定有效构图和原图版本；缓存失效后可复现且不拉伸 |
| FX-25 帧率重算 | 30fps/150帧改60fps为300帧；分数帧率统一舍入、正时长最少一帧、锁秒数保持；累计时码与总量一致，音频与排期不漂移 |
| FX-26 任务适用性失效 | 自动生成任务A未开始无Actual/产物/交接，任务B已开始，任务C已有产物，任务D人工创建；删除对应Scene requirement或Production Method，再恢复同一稳定来源 | A自动进入NOT_REQUIRED/inactive并保留历史，不记人工Cancel；B/C/D保留事实并提示负责人，不自动取消。下游不能因删边伪Ready；同源恢复时仅A可恢复适用，执行过的旧Task不复活 |
| FX-27 通告发布边界 | 已有Published rev1及部分ack；排期改时间/地点/个人Call Time，重复事件并触发Impact；再由有权限人与无权限人分别尝试Publish/Send | 自动化只更新Draft和需重确认Recipient，不产生Published/Send事实；rev1/旧ack不漂移。有权限显式Publish产生rev2，Send另需显式权限；无权限、重复事件和失败不伪发布 |
| FX-28 素材正式交接 | 一个AssetVersion先上传，Integrity通过但项目配置Backup未满足；生成proxy Preview后做草稿预处理，再完成BackupVerification并Formal Handoff；随后源版本变化 | Preview可被明确允许的草稿预处理消费，但正式input仍pending；完整性+配置备份门槛满足后Formal Handoff固定版本并解锁正式Task。源变化只使相关下游stale，旧交接事实保留，不以目录/上传存在判完成 |
| FX-29 Review返工补拍与交付 | 同一Review问题重复投递；一个走AE返工，一个走补拍；生成新Version再Review；Deliverable经历QC、submit、deliver、ack、reject、rework、重新submit、accept | 同来源只一个活动ReworkRequest；后期返工回Task，补拍回Schedule/Media/Post；每次版本固定。交付各事实分开，reject回返工且不抹旧记录，最终accept固定对应Version/授权检查 |
| FX-30 全流程产品闭环 | 使用总纲§19.4合成项目，从Project/Scene/Shot、Task、Person、Schedule/Move、CallSheet、Actual、Media、Post、Review、Rework/Reshoot、Delivery到Experience/Calibration/K3受权接受；中途注入权限撤销、409、consumer失败、重复event | 每环上游可驱动下游、失败可解释重试、历史不漂移；D-35/D-36/D-37边界全部成立；经验校准先形成候选，经K3受权接受后才影响未来estimate/workflow，不改当前Actual/已确认计划。必须有API+真实PG+真实consumer/浏览器+合同证据，单包PASS不能冒充整链闭环 |
| FX-31 授权资料 | Project/Scene/Deliverable各配置一个hard和一个soft授权Requirement；AuthorizationRecord覆盖Person/Location/Asset并固定文件版本；依次测试missing、UNKNOWN、有效、expired、允许N/A、withdrawn、无权限读取、Purge | hard missing/UNKNOWN/expired/withdrawn阻塞对应Readiness/Final QC；soft只提示；允许N/A需显式权限/理由。文件存在不自动判定所有用途合法；不出现合同、金额、付款或法务结论；固定历史引用不随当前记录漂移 |
| FX-32 Checklist/Readiness | Template/Production Method生成required和optional Checklist；Scene/Shot/Task/Deliverable分别实例化；测试complete、UNKNOWN、N/A、来源失效、已完成带证据后来源移除、重复事件、直接尝试写ready=true | Readiness只能由权威事实派生；required未通过阻塞、optional只提示、N/A按定义/权限保存。未确认自动项来源失效可停用，已确认/有证据结果保留并标来源失效；不出现SOP步骤执行器或用自由布尔绕过条件 |

这些是待运行门槛，不是本轮功能测试结果。FX-21至FX-25覆盖资源/构图/帧率增量；FX-26至FX-32覆盖制作闭环新增边界，其中FX-31/32分别覆盖制作授权资料与Checklist/Readiness。各增量分别领取、交付、记录前端缺口，共用已有事务、回执、历史、事件和作业基础。

### 4.2 闭环独立工作包的接受职责

| 包 | 必须证明的业务闭环 | 不得越界 |
| --- | --- | --- |
| E2-AUTHORIZATION | AuthorizationRecord/Requirement、hard/soft、期限/文件/typed links → Readiness/Final QC | 不做合同、费用、法务判断；文件存在不等于全部用途有效 |
| E4-CHECKLIST | ChecklistDefinition/Result → required/optional/N-A → 派生Readiness | 不保存SOP步骤，不允许ready=true旁路写入 |
| E6-MEDIA-HANDOFF | Actual/AssetVersion → Integrity → 项目配置Backup → Preview/Formal Handoff → Post readiness | 不另建Asset owner；Preview不能满足正式输入 |
| E7-DELIVERY-LOOP | Review → ReworkRequest → Task或补拍排期 → 新Version → Review；QC/submit/deliver/ack/accept/reject；Final QC消费required Checklist和hard Authorization | 不改Review历史语义，不用单一status吞并交付事实 |
| Z0-PRODUCTION-CLOSED-LOOP | 组合所有已接受包跑总纲§19.4并通过FX-30/31/32，required Checklist、hard授权和经验候选K3受权接受都必须贯穿 | 不新增业务写模型，不以mock、文档校验或单包测试替代产品闭环 |

E4-TASK负责FX-26的任务失效边界；E6-SCHEDULE负责FX-27的通告草稿/显式发布边界；E6-MEDIA-HANDOFF负责FX-28；E7-DELIVERY-LOOP负责FX-29；E2-AUTHORIZATION负责FX-31；E4-CHECKLIST负责FX-32；E8-IMPACT继续负责跨域传播与FX-17；Z0只有在上述包、授权/Checklist以及K3受权建议/接受链均接受后才运行FX-30。

### 4.3 构图和帧率的事务细则

已核对360d4fb对应代码：ImageCropService.rendered已有panel无专用时回退资产默认的逻辑；presentation读取、production封面、内容快照固定与各消费者一致性仍要逐项核验。MediaPresentation表和不可变AssetVersion已经存在，不重新建表。ProductionService.update_production当前直接改项目字段，没有同步转换镜头帧数；帧率重算仍是待实施增量，不冒称已验收。

构图继续使用已存在的MediaPresentation，不建第二套源文件或裁剪表。当前读取先取同原图版本的专用构图，再取素材默认构图，最后按该消费者既有适配；显式“恢复原图”是专用适配，不能等同“恢复继承”。默认源版本不匹配当前图片时不得套用旧变换。源图替换仍创建AssetVersion，不由构图命令覆盖字节。

内容提交、审阅目标、导出冻结阶段固定实际源版本、有效构图身份/修订和渲染参数；历史读取按固定结果，不重新解析当前默认值。旧原生提交若缺有效构图固定引用，先只读预检其已有数据能否唯一还原，不能用今天的默认值猜历史；无法还原时明确待迁移，不冒称历史比较成功。普通还原创作版本只改对应引用及专用构图，不回退整个资产默认构图。

缩略图和渲染缓存以原图摘要、有效构图修订、目标比例、尺寸、算法版本及授权作用域识别；默认构图变化只使依赖默认的当前引用失效。专用构图与固定历史不会被批量重写；未锁定浏览器草稿继续由原UI负责人保护。前后端对同一合成横图、竖图、黑边和专用覆盖回读实际像素，不能仅比较参数JSON。

帧率用精确分数表示。旧帧数f、旧帧率n₀/d₀、新帧率n₁/d₁：先保留秒数f×d₀/n₀，再将f×d₀×n₁/(n₀×d₁)统一四舍五入为整数，新正时长至少一帧。使用整数或精确有理数，不靠浮点epsilon；跨语言由同一合同向量验证，不自行各选舍入。总时长为转换后镜头帧数之和，不独立舍入总秒数造成矛盾。

项目帧率、镜头时长、锁定时长、明确以帧保存的起始时间/目标时长及派生时码在同一原事务更新；显式标明“帧单位”的业务字段才转换，普通数字、AssetVersion与视频自身帧率/时长、音频实测秒数和拍摄UTC时间保持。先预览逐项变化、取整差异及旧修订，提交校验项目与所有受影响对象；任一冲突整步回滚、保留草稿。一次转换只占一个项目历史步骤，重复请求同回执，真正无变化不推进版本。撤销补偿恢复该次明确字段效果，修订号继续单调递增。

公共快照编解码、迁移节点、既有schema/router及DTO生成由集成者登记写集；构图、帧率和来源包分别交付，不因接入服务端缺口覆盖既有表格或设置页。

## 5. 内容版本、独立活动和撤销矩阵

| 对象 | 项目内容 snapshot / compare / restore | 独立历史与 undo | 边界 |
| --- | --- | --- | --- |
| Shot、Scene/Sequence 创作事实、SceneShot、字段定义/业务值、Panel/图片构图、Lighting | 是；稳定 ID、固定引用、显式 codec | 普通内容命令可 undo/redo | 镜头比较入口过滤整个项目 diff；零 Scene 合法 |
| Character、Casting 选择、SceneRequirement/ShotAppearance | 是；保存角色及选择/出演关系 | 普通命令可 undo/redo | 只用明确公开的创作字段；不把整个 Person 档案复制进内容版本 |
| Person 身份/公开协作资料、联系方式/账号关联 | 不自动进入创作提交 | 独立受权 audit；资料普通编辑可 undo，账号/权限撤销不可通过 undo 恢复授权 | 历史 Character/Casting 引用保存稳定 Person ID；显示标记关系当时的选择。姓名修正不改旧创作内容。人物删除清理内容引用，版本显示已移除，不恢复私密资料 |
| Membership、grant/deny | 否 | 权限审计，显式重新授予；不纳普通内容 undo | 所有版本/媒体/下载都即时重验权限 |
| Task/分派/提交/交接、排期方案/发布 | 否；各自活动/方案修订 | 可补偿未执行的计划操作；已发生的交接/执行/发布保留并显式撤回/更正 | undo 不能伪装事情从未发生；修改未来计划与撤回发布分开 |
| Review/批注/审片决定 | 否，独立 revision/event owner | 按独立审阅命令合同 | 创作提交引用受审对象 revision，不整包复制审片活动 |
| 共享视图、个人布局 | 否 | 现有布局/视图命令历史，不创作版本 | 显示修改不改内容 hash；同步作用域明确 |
| Moodboard | 否 | canonical HistoryService 支持 undo/redo | 不另造独立持久游标；本地草稿撤销不抢全项目快捷键 |
| Job/proxy/thumbnail/cache/Presence | 否 | Job 状态与受控活动；派生物可重建；Presence TTL | 原图不可变，缩略图不产生虚假作品版本 |

项目 restore 是“根据允许内容生成新命令”，不是覆写所有表。Preview 显示受影响实体、当前/目标 tokens、Purge 缺项、资源依赖；Commit 重验并原子应用，生成新内容提交和一条可补偿命令。三方 merge 用共同祖先与当前/来源稳定 ID 对比；不同非空冲突不得选最后写赢。Review/授权/执行事实保持其独立 owner。

## 6. 导入、工程交付、图片与隐写的接受边界

导入每个字段只有 `FILL_EMPTY/KEEP_EQUAL/USE_INCOMING/KEEP_CURRENT/UNRESOLVED`；0 和 false 是非空有效值，空字符串/null 的归一规则按类型。不同非空值默认 UNRESOLVED，用户明确选择覆盖才 USE_INCOMING。CREATE/MERGE/UNCHANGED/CONFLICT/AMBIGUOUS 按整行决策计算；未知关系不猜同名 Person/Scene。目标显示镜号不是 ID。

Commit 绑定 source_hash、parse/catalog versions、frozen plan digest、对象 token 和 epochs。附件/图片也有字段 decision；不能以“有图”静默替换旧图。replace 明确软删除范围和二次确认，仍可恢复；失败在最后一行/最后一张图时 DB/History/新文件全回滚。源文件或目标变化后409，必须新预览而不是旧 Plan 重猜。

工程 PDF/ZIP/码仅传同一允许投影：选字段、镜头范围、固定图片版本和构图，metadata 只保留协议必需且受权项。实际从渲染 PDF 像素扫出完整所有码、乱序去重重组、校验分片及整包；附件 ZIP/原图 hash 回读。少码、冲突码、混包、未知 schema、超容量都明确失败。QR-only 无原图 bytes 时返回缺失媒体清单，不冒称图片已恢复；ZIP/附件恢复经过同一 staging。

普通 PDF 六版式、可编辑 Word、好莱坞剧本与分镜表、工程码恢复分别接受；仅生成出文件不算通过。PDF 中文可提取/逐页渲染，长文不丢；竖图/横图/21:9/16:9 不拉伸，按构图适配后黑填充，原图不改写。图片构图由现有 MediaPresentation 服务生成，素材库修改默认构图，未设专用构图的当前引用继承，已有面板和封面专用构图保留。内容提交和审片固定当时有效构图及默认版本，不能随当前默认值漂移；恢复内容不能改变其他引用的素材默认值。镜头预览保持项目画幅、既有胶囊缩放、锁定和本地草稿撤销界面。帧率改变自动保留秒数重算帧数及派生时码，统一分数帧率及舍入，预览总量差异，不更改实际音频长度或拍摄排期时间。

**隐写追溯单独验收**：二维码/DM、普通hash、文件metadata均不能替代。选成熟库后先测固定种子合成图：原图、四边各裁10%、保留中心70%、1440桌面截图、截图后 JPEG quality80、缩放0.75。每类30个不同 payload＋30个无水印控制；记录成功恢复率/误识别率及不可恢复类型。上述每类30个样本是算法筛查门槛：至少27/30正确恢复、控制0/30误识别，仅用于决定能否进入完整验收。最终接受按功能计划的更严格门槛：每类100个不同追溯标识及100个无水印对照，恢复率至少95%、对照零误识别，包含保留50%面积的裁剪及实际截图链。筛查通过不能降低最终标准；两者都是待运行目标，不提前声称已达到。达不到时保留 BLOCKED，不写免责标注掩盖失败。PDF/Word 中嵌入图与 raster页、工程纯文本 metadata 的可追溯方式分别标明；不能用图片算法承诺纯文本抗截图能力。

## 7. 迁移与恢复操作门槛

所有批次先核验唯一实际 Alembic head，新增 parent 接受后再登记；不预造 SHA、不并发改旧 revision。Expand → 合成/隔离 VNext 数据转换 → 约束/codec核对 → 单 owner切换 → 真实消费者退出 → Contract。

SceneShot 转换保留已有 Shot IDs；旧 scene_id 只派生 primary，兼容写保留 additional links；有第二关系后拒绝单 FK downgrade。字段类型迁移先 Preview/显式转换，失败值留报告不截断；旧 format_version可读，当前 schema_version不能充业务revision。

每批必须真实 PG：空库升级、上个接受 head 的合成副本升级、重复执行无额外变更、FK/唯一/CHECK、两事务CAS与死锁/锁序、失败回滚、backup/restore＋删除账补放。当前 tests/conftest.py 强制 SQLite，运行 pytest 不等于 PG 演练；PG 门槛用隔离 runner。

普通删除保留快照；Purge 明确 confirm/expected/impact digest。同事务清正文、快照引用、全员 History barrier、plan/job/artifact/config 引用并升 epoch。下载撤销、缓存失效和 GC 是后续可重试工作，回执区分 `logical_complete/storage_pending/storage_complete`，不能返回伪物理擦除成功。

无正文删除标记不留姓名、电话、原字段值或原图，只保留内部对象类型/ID、scope、epoch/清理状态。恢复备份先补放删除账，再允许访问；旧备份可读的恢复环境不是上线条件。对包含新确认写入的迁移，只允许 forward-fix 或停新入口，不用降级删表抹数据。

留存计算用服务器 UTC `expires_at`，分页查询授权不受临时 TTL 避让。24小时/7天清理只针对临时预览/可重建下载工件，不删被 Panel/Board/Task/内容版本固定引用的正式资产。项目缩短临时留存只影响新生成项，批量清旧项须影响预览；用户明确 Purge 优先于留存期限。

## 8. 可复用运行入口与证据格式

在仓库根执行，Python3.12/Node24，依赖按锁安装；禁止读取真实 `.env` 当验收配置。文档校验只检查合同和清单结构，不声称应用通过：

```powershell
& apps/api/.venv/Scripts/python.exe tools/validate_extensibility_plan.py
& apps/api/.venv/Scripts/python.exe -m pytest tests/backend/test_command_history.py tests/backend/test_production_revisions.py tests/backend/test_boards_api.py tests/backend/test_board_migration.py -q
```

导入/导出包接受时执行该包新 tests，后续才纳完整 `-m pytest tests/backend -q`。运行前确认对应文件已提交/接入；未提交测试也可开发运行，但结果绑定实际 working diff，不宣称远端该 SHA 已通过。

PG 前置：配置 `ENVIRONMENT=test`、仅验收用 synthetic SECRET_KEY、loopback PostgreSQL `*_rehearsal` 数据库及 async/sync URL；必须是新建空库或验收合成副本，不是用户已有预览数据库。现有 runner 会拒绝生产/非loopback/其他命名数据库。预检环境只输出布尔和数据库验收类型，不输出 URL/凭据。

```powershell
& apps/api/.venv/Scripts/python.exe -m alembic -c apps/api/alembic.ini heads
& apps/api/.venv/Scripts/python.exe -m alembic -c apps/api/alembic.ini upgrade head
& apps/api/.venv/Scripts/python.exe tools/postgres_rehearsal.py --disposable
```

新增域锁/FK/恢复 fixture 加入 PG runner 或独立同安全边界脚本；现有 PG runner 通过不自动覆盖新增域。CI复用 `.github/workflows/postgres-migration.yml` 的真实PG服务/backup步骤。不能把 pytest 配置改成连用户库来“补PG测试”。

前端只对获授权的新 consumer 检查。`npm.cmd exec --workspace=apps/web -- tsc --noEmit`，生产 build 使用独立 `FRAMEFORGE_BUILD_DIR` 避免覆盖正在运行的预览目录；不要重启用户已有3002/3100页面。桌面横屏1440×900与1920×1080、正常缩放、明暗主题，实际读/写/刷新/403/409/失败重试/键盘/右键/图片/2D3D；本轮不加窄屏或缩放产品验收要求。动画验证入场/切换/退场可打断、保存失败不消失草稿，无虚假业务状态；不增加产品 Reduced Motion 开关。

截图固定到 `storyboard-system/docs/visual-evidence/2026-10-04/<package-id>/`，只使用合成内容；浏览器地址/书签、用户真实媒体、私有IP、账号和凭据先脱敏再提交。原始截图另保留固定本地目录，不删除。截图必须记录 viewport/主题/状态/基础SHA；backend PASS 不能升级为 UI PASS。

每次验证保存最小记录：

```json
{
  "package_id": "E0-RECEIPT",
  "commit": "actual-full-commit-sha",
  "working_diff_digest": "sha256-if-dirty",
  "executed_at": "UTC timestamp",
  "gate_id": "FX-02",
  "kind": "api",
  "command": "actual command without credentials",
  "result": "pass|fail|blocked",
  "exit_code": 0,
  "assertions": ["same request returns one receipt", "nonempty conflict preserves draft"],
  "evidence": ["repository-relative sanitized report or screenshot"],
  "remaining": []
}
```

不是写满这个 JSON 就通过：必须有真实执行输出、断言和可核对 artifact。失败有具体命令/错误分类/未通过门槛；既有 unrelated failure 记录实际差异，不伪称全绿。最终 commit 在证据基础 SHA 后产生时记录“源码相同，仅文档状态变化”；代码变化须重跑受影响门槛。

## 9. 可执行完成条件

`not_started`→`in_progress`→`accepted` 是工作包执行状态，不替代 canonical 能力迁移状态。accepted 必须依赖包已接受、所有 required gates 有实际证据、router/consumer/迁移/权限/历史/Purge覆盖（适用）；UI 包含截图与动作回读。blocked 只阻塞该包，不把全文冻结。

每次包接受：合同能由另一执行者按指定文件和命令复现；没有未定的业务必填值被写成猜测；导入/历史/worker没有旁路写权；代码真实注册/使用；必要PG和视觉结果齐；旧owner退出或明确非权威；文档写清未验收范围；独立 commit推送，检查远端回执。缺任一项不能以“基本完成”放行。

下一顺序：B0核对已推送Board后端剩余PG/消费者门槛和未提交import/export → E0 receipt/codec/config各小包 → E1身份/权限 → 各实体关系与字段 → Task/DAG、基础设施 → Schedule → Media Handoff → Review/Rework/Delivery → Import/Export、自动联动与知识校准 → 按已接受 API补缺UI → Z0整链验收。E0可与B0无冲突证据整理并行；长计划不是一次巨大提交。

本文新增的定义、文件seam和验收目标是执行合同；本轮没有据此伪造迁移SHA、测试PASS或全站cutover。已确认人类决定同步到原计划；执行清单保留真实未开始/进行中状态。
