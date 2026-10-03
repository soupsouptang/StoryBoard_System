# FrameForge VNext 最大化扩展性需求总纲

版本：2.0，2026-10-04。状态：**需求合同，实施与验收按工作包分别记录**。

本次按用户要求重写全文，移除重复目标、含糊的建议和已失效的待选规则。本文定义产品范围、数据归属、行为与接受条件；代码现状只由实际代码、[owner台账](CANONICAL_OWNER_MATRIX.md)、[工作簿](ACTIVE_WORKSTREAMS.md)及验证证据认定。文档存在不代表能力已实现。

## 1. 文档职责、依据与边界

功能黄金基线为 `5e86a0bb11a20ecd631d9c2af66260a73d7c92e7`，用于核对哪些功能必须保留。用户后续明确删除、改变的行为优先于黄金基线。视觉遵循 [shadcn/ui基线](SHADCN_UI_BASELINE.md)，既有UI以用户明确要求与GitHub用户 `montblanc08` 的最新已接受修改为准。

文档分工：

| 文档 | 唯一职责 |
| --- | --- |
| 本文 | 产品与架构总合同，已确认决定和仍待确认的产品选择 |
| [岗位工作流需求](ROLE_WORKFLOW_REQUIREMENTS_2026-10-03.md) | 工种、场景/镜头、演职人员、视图与交付场景 |
| [实施计划](EXTENSIBILITY_IMPLEMENTATION_PLAN_2026-10-04.md) | 源码盘点、域拆分、迁移批次和FX验收fixtures |
| [执行标准](EXTENSIBILITY_EXECUTION_STANDARD_2026-10-04.md) | 命令、约束、失败、迁移与验证的实际执行协议 |
| [机器执行清单](extensibility_execution_plan_2026-10-04.json) | 工作包依赖、允许/排除写集、门槛与实际证据 |
| [知识层需求](VNEXT_KNOWLEDGE_LAYER_REQUIREMENTS.md) | 影视/设备知识、经验采集、统计校准和受控建议 |
| [列模型需求](COLUMN_MODEL_REQUIREMENTS_2026-10-02.md) | 9内置、20预设、N自定义的字段目录和生命周期 |
| [后端衔接账本](BACKEND_FRONTEND_HANDOFF_2026-10-04.md) | 后端改变产生的前端缺口与协作边界 |

优先级：最新用户明确决定 → 适用AGENTS → 对应问题的最新canonical合同 → 历史计划。实施文件与本文冲突时修订对应合同，不复制另一套产品规则。本文明确标记为“实施默认”的项是实现细化，不冒充用户亲自确认。

本轮只改文档；不改变已有UI、运行服务、生产数据库或服务器部署。长期范围是制作、场景/分镜、人员资源、工作流、排期、审阅、交付、协作与知识。预算、报价、采购/商务合同、费用、收付款、利润和财务结算不纳入本计划。

## 2. 产品决定登记

### 2.1 已确认

| ID | 最终规则 |
| --- | --- |
| D-01 项目独立授权 | Work/Episode只组织项目，不继承项目权限；显式拒绝优先。新项目创建者登记管理权，已有项目由管理员明确授予成员；岗位名称不授予权限 |
| D-02 可选系列层级 | standalone Production合法；启用系列时仅Work → Episode → Production，不直挂Work，不创建任意嵌套Folder |
| D-03 多场景镜头 | Scene↔Shot为0..N多对多，主场景可不设、最多一个，仅用于默认展示；镜头篇章独立，跨篇章关系提示差异，不自动改镜头篇章 |
| D-04 三种身份 | User是登录账号，Person是项目内现实人员，Character是叙事角色；同名不合并，账号/跨项目身份关联须显式确认 |
| D-05 任务与交接 | 一名主责、多名协作；固定产物版本交接；需要独立审片的任务不得自确认；跳过要管理权限、理由且仍满足下游输入，项目可加严 |
| D-06 时间 | 默认北京时间，IANA标识Asia/Shanghai；可更改个人偏好或新项目默认，不隐式移动既有排期UTC时刻 |
| D-07 留存 | 正式来源/产物保留至明确删除；临时预览24小时、可重建下载工件7天，项目可缩短临时留存 |
| D-08 历史分类 | 创作内容采用整个项目版本，保留镜头级比较；共享视图与Moodboard不进入创作版本。Review/批注、执行和发布属于独立历史域；Moodboard仍支持undo/redo |
| D-09 列删除 | 内置列可删除到回收站/恢复，禁止永久删除；预设、自定义列可确认后永久删除当前数据和受控历史正文；保留不可见内部字段 |
| D-10 共享视图 | 同一共享视图内的列显示/顺序/宽度、行高、筛选/排序/分组实时同步；个人选择、光标与未提交草稿独立 |
| D-11 跨项目资源 | 显式关联团队共享人员/设备/场地身份后跨项目校验冲突；只展示授权允许的冲突摘要，不按姓名猜身份 |
| D-12 知识贡献 | 团队内项目经验默认贡献；原始记录仍受项目权限隔离，不跨团队共享 |
| D-13 主动经验采集 | 收工/阶段结束集中提示，每账号跨项目每天最多3个主题，可跳过/稍后，不中断编辑 |
| D-14 AI知识 | AI内容停在候选区；附独立资料或实际记录并经人工核验后，才进入正式知识 |
| D-15 Take | 当前不建Take表/API/UI空壳；保留未来拍摄实例、圈选、多机位和媒体关联的扩展位置 |
| D-16 媒体与交付 | 不可变原图，支持裁剪/重框选/横竖比例、黑填充与缩略图；工程交付内嵌堆叠QR或DM，隐写追溯单独验证 |
| D-17 编辑操作 | 不提供Duplicate操作；Ctrl/Cmd+C/X/V，行菜单向上/向下粘贴，V默认向下；普通删除可恢复，永久删除需确认且不可撤销 |
| D-18 UI与验收 | 保留项目入口整行照片封面及既有已确认UI；只补真正缺失页面。桌面横屏正常缩放先验收；动画可打断，不增加产品Reduced Motion开关 |
| D-19 场景继承 | 镜头动态继承所有关联场景的演员、场地与设备要求，可手动覆盖；场景变更自动影响未覆盖部分 |
| D-20 环境预设 | 地点、内外景、昼夜优先镜头显式值，否则显示主场景值；无主场景或信息冲突时待确认，不猜值 |
| D-21 首次默认列 | 全部9个内置列可见；20个预设列不自动添加，按用户/项目模板明确启用 |
| D-22 继承覆盖粒度 | 逐项增补、排除或替换；其余继承项持续动态更新，可按项恢复继承 |
| D-23 环境差异显示 | 有主场景时显示其地点/内外景/昼夜并提示其他场景差异，允许镜头显式覆盖 |

D-09/10/11为本次重新询问后的明确回答。历史文件中的“所有内置列可Purge”“布局默认个人独立”“只检查单项目资源”不能作为新目标使用。

### 2.2 本次等待确认

| ID | 必须选择的产品行为 | 受影响范围 |
| --- | --- | --- |
| Q-05 多场景资源计量 | 同一物理资源去重且冲突待确认，还是逐场景累加 | 设备数量、互斥要求、任务输入与排期容量 |

该项只暂停多场景同资源的数量/互斥合并规则，不暂停独立身份、权限、关系、命令、导入解析与其他已明确工作包。确认后替换此表，删除另一待选行为，不长期并存两套规则。

## 3. 架构与扩展准入

唯一目标：`apps/web`为Next.js/React Web，`apps/api`为FastAPI/async SQLAlchemy，`apps/worker`消费受控任务；PostgreSQL保存持久业务事实，Alembic拥有schema历史，Redis保存Presence/lease，媒体由Storage adapter管理。Node.js 24、Python 3.12；具体依赖版本以实际锁和已接受升级为准。

根包仅 `packages/ui`、`packages/types`、`packages/contracts`、`packages/timecode`。新域留在应用内；不新增万能common/core/shared包，不要求把已接受服务机械搬目录。

扩展分为：

| 类型 | 负责什么 | 例子 |
| --- | --- | --- |
| Entity | 独立身份、生命周期、权限、业务约束 | Scene、Person、Task、EquipmentUnit |
| Field | 所属实体的属性与类型 | Shot焦段、Scene自定义许可编号 |
| Typed Relation | 两端明确、带scope/FK和关系语义 | SceneShot、CastAssignment、TaskAsset |
| Workflow | 执行动作、依赖、交接、计划与实际 | Task、Dependency、Schedule |
| Presentation | 同一事实的视图和布局 | SharedView、表/卡/墙/时间线、DOOD |
| Provider/Consumer | 解析、渲染、存储、异步投影 | Import/Export Provider、Outbox consumer |
| Knowledge | 经核验参考、项目经验与建议 | ReferenceModel、Observation、EstimateProfile |

实体表保存事实；页面/read model不复制另一套Shot、Scene、人员和资源。Draft Call Sheet、角色看板、Calendar、Stripboard、DOOD、统计是授权投影；发布文档需要冻结时使用明确PublishedRevision。

新增核心字段必须说明稳定业务语义及真实consumer，为什么不能由现有字段、预设、自定义字段或关系承载，并证明约束与迁移成本合理。“需要排序/过滤/校验”本身不构成增加Shot物理字段的理由。自定义字段同样支持校验与查询。

新模块进入实现前必须填写：owner、输入/输出、真实consumer、权限、Command/Query、CAS、事务、Audit/History、事件、引用与Purge闭包、Import/Export需要、配置版本、迁移和接受fixtures。缺少必要项仅暂停该模块，不能用空页面/API掩盖。

禁止：全系统万能Entity/EAV/Relation表、全部JSON化、任意Python/JS规则、运行时代码插件、反射ORM自动生成完整业务、跨域service直接改对方表、AI直写库、前端多PATCH拼假原子操作。优先复用成熟库和已有owner。

### 3.1 Entity从属关系的判定

一级Entity可以拥有真正从属的子Entity。父子关系必须同时明确：**谁拥有子对象、子对象是否独立存在、创建/删除/恢复/Purge如何联动、授权与revision作用域**。业务上有关联不足以建立父子层级；跨独立Entity的连接使用typed relation/link。

| 关系 | 所有权/作用域 | 生命周期行为 |
| --- | --- | --- |
| Production → Shot / Scene / 项目Person | 对象归一个Production，其稳定身份和权限在该项目内 | 项目整体删除处理闭包；单个Scene删除不能连带删除与其关联的独立Shot |
| Shot → Panel | Panel是该镜头下的分镜面板，不单独迁往另一Shot | Shot普通删除保留Panel及历史；Purge按面板/引用闭包清理，Asset原图不因链接消失自动删除 |
| Asset → AssetVersion → 物理component | 版本归该Asset，component归固定版本；版本不可变 | 正式引用/留存期间保留；Asset Purge检查全部引用并清受控正文/组件，共享物理blob按引用图处理 |
| Work → Episode | Episode属于一个Work，跨Work移动是显式组织命令 | 删除Work先处理Episode；Episode关联的Production只解绑或显式另行操作，不cascade销毁项目 |
| Task → 输入/产物绑定记录 | 绑定记录归Task，Asset/Shot/Person本体独立 | Task删除处理绑定与依赖，不能删除已引用资产、镜头或人员 |
| Scene ↔ Shot、Task ↔ Asset、Person ↔ Character | 独立实体之间的typed link，非父子所有权 | 删除一端按影响清/失效关系，不把另一端视为从属对象 |

新关系如不满足这些已定义语义，先向用户确认其独立性、所有权和删除行为，再决定父子/typed link。禁止用“相关所以从属”或泛化禁止层级的句子替代具体合同。

## 4. 项目组织、身份与权限

### 4.1 Work/Episode/Production

Production是独立工作区和项目事实scope，拥有Sequence、Scene、Shot、Asset、Person/Cast、资源、Task、Schedule、Review和Deliverable。

归组/移动是组织关系命令，不复制项目、不合并内容、不改变Shot ID、创作版本、媒体引用、子项目授权。Episode属于一个Work，Production最多一个Episode关联；删除容器先列影响并显式解绑，不能cascade删除项目。独立项目不必填写空Work/Episode。

上层聚合查询逐项目授权，包括计数和摘要。跨项目批量动作提供每项目回执/失败；不能声称多个独立事务全部原子。组织管理员不自动成为所有项目成员。

### 4.2 User/Person/Character

Person在项目内独立；无账号演员/工作人员可存在。姓名没有唯一约束，不按姓名/邮箱匹配身份。User停用/解绑不删除Person、Casting或已经发生的执行事实。

CastAssignment连接Character与Person；确定出演和候选选择分开。ProductionMember表示现实人员的岗位/部门，可链接登录账号；Person没有账号不取得登录权。外部Reviewer/Guest是受限principal，不冒充内部User或Character。

实施默认：同一项目一个Person最多一个当前User link、一个User最多一个当前Person link，历史关联独立记录；跨项目可有各自Person。需要多账号归并时使用新的明确identity命令，不能偷改此约束。

### 4.3 权限

权限使用稳定action/resource，例如shot.read/edit、asset.upload/download、field.manage、review.comment/decide、export.run、task.manage、schedule.manage、member.manage。系统级用户管理与项目内容访问分开；管理授权不等于自动有全部项目正文访问权。

项目grant、用户组策略、显式deny及字段/资源策略由统一Permission owner处理；岗位/工种只决定职责、默认候选工作流和视图，不决定授权。账号加入项目、授权/撤销、成员职责变更均有显式命令和独立审计。

列表、计数、详情、版本/undo、媒体、分享、导出、WebSocket、Job发布使用同一有效权限。授权变化增加policy epoch并使缓存、流连接和未完成产物重新校验。未知或被隐藏对象不返回其存在详情。

审片分享固定范围、允许访问时长、字段allowlist、媒体版本、可见水印与下载/评论能力；到期/撤销立即阻断后续访问。分享开关和项目标题/fps等在已有独立项目设置页编辑，不能重新恢复旧设置弹窗。

## 5. Scene、Shot与演职人员关系

Scene↔Shot必须typed多对多。关系两端同项目复合FK，活跃pair唯一；同Shot主场景最多一个。Scene内顺序与Shot项目全局顺序独立，主场景仅默认显示，不决定镜头篇章、独占身份或排期次数。

首次关系类型为稳定 `related`；主场景用独立is_primary。回忆、交叉叙事等描述可作为来源备注，不用自由文本触发自动化。确需特殊关系行为时再版本化增加类型和fixture。

删除Scene只处理关系及其依赖，不误删其他Scene使用的Shot；0Scene的Shot合法。全局镜头统计/时长按Shot ID去重，场景统计使用明确“引用数”口径，不把二者混加。导入、导出、视图和排期保留多关系及各Scene顺序。

角色/人员关系分为Character、CastAssignment、SceneRequirement、ShotAppearance。Scene要求与Shot确认出演是不同事实；`on_screen/voice/background/stunt`类型明确，角色未选演员不冒充已确定Person。工作人员通过ProductionMember、TaskAssignee和ScheduleItemPerson参与。

镜头有效演员/场地/设备要求由所有关联Scene当前要求＋镜头显式override投影得到。场景改变自动更新未覆盖部分；原始SceneRequirement与镜头override分别保存，effective集合可重建，不复制一套随时互相覆盖的Shot关系正文。每项标来源Scene ID/revision与手动状态，任务固定输入时记录解析版本；变化使相关未完成/过期输入按规则重算，不改已完成实际与已发布旧记录。

继承的是制作要求，不是“已实际出演/已完成”的事实。ShotAppearance的实际出现/对白记录仍需其原owner确认；不能把演员需求自动写为画面已经出现，也不能把设备需求写成已经预约或到场。

覆盖使用逐项ADD/EXCLUDE/REPLACE和恢复继承命令：来源要求以稳定身份定位，追加项只属镜头，排除项阻止该项生效，替换项明确目标与新值；其他来源要求继续动态更新。清除单项override读取场景当前要求，不恢复过期副本。来源项已删除时保留可解释的失效override，不能按同名新项误套；恢复来源同ID或Purge后新ID分别处理。恢复全部继承须显式列影响，不能普通编辑一项就清整组。

**多Scene数量合并等待Q-05。** 缺失/冲突不能自动选第一个Scene或简单数量相加。

地点/内外景/昼夜预设分别保留镜头显式override；未设override时读取当前主Scene的允许字段，无主Scene/必需信息缺失/字段内部冲突显示待确认，不猜另一个Scene。明确“无值/空集合”的override与“未提供override”分开，清除override恢复继承。非主场景环境不同仍显示主场景值并提示来源差异，可显式覆盖；不自动推翻已选择主场景。多Scene正式资源要求仍沿D-19处理，与默认地点列不是同一用途。

对白首版保留现有整段文本owner，新增明确Character引用/未解析来源，避免姓名串当FK。结构化多说话人DialogueSegment需真实编辑/字幕consumer与单独迁移门槛后引入；不为了未来扩展预建空表。旁白、角色对白、镜头片长、实际工序耗时分别管理。

## 6. 字段、列与共享视图

### 6.1 定义与值

复用现有ProjectColumn/Field owner，按实体增加scope：shot、scene、sequence、asset、person、location、equipment、task。唯一键为project/scope/key，使用稳定definition ID；已绑定核心或typed关系的字段不另外写custom值表。

自定义值按真实实体建立ShotFieldValue、SceneFieldValue等typed ownership和FK，不用entity_type/entity_id/value JSON作为全系统万能值表。类型、默认值、required、options、binding、schema_version、lifecycle和revision显式。

数值0、boolean false、空值和未提供值分开；非法类型拒绝，不静默截断/回填。默认值不回写已存在历史。类型变更先预览失败行和转换规则，再CAS原子提交；无法转换保持未解决。

计算字段只读，受限DSL允许算术、IF/ROUND/COALESCE、比较、常量、同实体字段及受控fps变量。确定性、无副作用、依赖环拒绝；除0/缺失/类型错误有明确状态，不当成0。无任意脚本、网络或跨项目查询。

### 6.2 列生命周期

| 操作 | 含义 |
| --- | --- |
| 隐藏 | 改共享视图呈现，不改数据和定义生命周期 |
| 删除 | 项目列进入回收站、退出普通编辑和新列型交付；保留值/历史，可同ID恢复 |
| 永久删除 | 仅预设/自定义项目实例；确认影响后清值和受控历史正文，保留内部删除标记 |
| 重新添加 | 内置恢复原身份；已Purge预设/自定义创建新实例ID，不复活旧值 |

9内置定义随项目建立，20预设catalog按需实例化，导入未知列归自定义并保留来源。隐藏/默认可见集合与类别解耦，改名不能改类别或绕过Purge保护。所有可见业务列可从交付中排除，格式强制技术字段另列，不混入普通业务列目录。

新项目初始共享视图显示全部9个内置列：镜号、分镜画面、时码、时长、镜头标题、篇章、画面描述、制作方式、状态。其后用户隐藏/删除按view与生命周期分别处理；20预设不自动添加。未映射预设保持pending，不能用自由文本或自定义值伪装已接通关系。每个binding写明读写owner、来源、转换/空值、CAS、Purge、Import/Export。

### 6.3 共享视图

表格中的审阅标记/评论入口是Review投影，不添加另一套批注正文列。当前授权范围没有审阅标记时隐藏该评论列；有标记时按有效视图与权限显示。隐藏不删除Review历史，不因读取一次页面制造活动。

SavedView的项目共享配置是同一共享视图布局的唯一持久owner，包括列显隐/顺序/宽度、行高、筛选/排序/分组、换行与自动尺寸策略。WorkspaceLayout只保留个人面板、当前视图选择等确属个人的呈现偏好；不能再同时权威保存同一共享列布局。

选择哪个共享视图是个人导航状态；进入同一共享视图的成员同步该配置，不能强制所有人跳到同一页面。临时拖拽/输入在本地预览，松手/确认后提交带config revision的命令，ACK后广播同一revision。并发修改409保留草稿，不用最后写入赢；重连先取权威配置。

列宽和行高支持手动尺寸与自动模式；没有“列高”配置。自动模式持久保存规则，不按每人的窗口/字体各写一套像素。用户可手动重置自动，手动覆盖按稳定列/行ID保存，行删除清对应尺寸引用；宽度、排序和筛选不能改变内容版本hash。

自动测量实施默认：由共享view配置的稳定测量规则与内容vector生成尺寸结果，再同revision广播；测量算法、上限/换行策略记录版本。具体尺寸沿已接受UI token，不自行改工作台几何。列删除从所有view去引用，恢复不猜旧已Purge实例。

岗位视图是共享视图的显式模板/实例，工作流、导出Profile分别拥有自己的配置；不是创建一套导演数据、一套摄影数据。多人共享布局与字段权限同时生效，无权字段不通过配置名称/值/计数泄露。

现有个人布局实现不是新目标已完成的证明。该合同的后端差异与前端接入交给现有UI owner；本轮不重写已接受表格。

## 7. 工种工作流、任务与数据看板

ProductionStep只表示Shot制作工艺，如Shoot/Edit/MG/VFX/Color；Task表示独立执行动作，如场地确认、准备、镜头集合拍摄、素材备份、后期或返工。Task不能把ProductionStep/Review状态再存一份当权威。

WorkflowTemplate发布后固定版本；Task实例固定所用版本，模板新版本不重写在途任务。首版支持用户明确建立节点和DAG，不因尚无岗位默认模板停住结构实现，也不从岗位名字猜必需节点。

任务有主责、协作、部门、优先级、输入/产物、计划估时与实际耗时、typed目标关系、生命周期和revision。草稿可未派人，Start前必须主责/必需输入就绪。Submit固定产物AssetVersion和提交者；交接核验接收人、版本与任务策略。

完成、取消、跳过、返工、更正分别有语义。独立审阅不得自确认，管理员跳过也不得伪造审片批准或放过下游必需产物。已完成实际/交接不通过undo抹成未发生；撤回/更正保留事实并让依赖失效。

TaskDependency首版finish_to_start，同项目、非自身、活跃edge唯一。并发新增边须在同一DAG锁范围校验环，不能两个各自无环的请求合成环。ready/blocked/stale是派生状态，不手存第二套boolean；删除Task预览依赖闭包，不留下虚假ready。

角色看板由同一Task/Scene/Shot/Resource/Review query派生：摄影看镜头/灯光/器材，演员看出演/到场，制片看依赖/资源/拍摄日，剪辑与后期看固定输入/版本/交接，审阅者看其可授权对象。视图不能绕过权限。

指标必须写清分母、状态、去重单位和下钻ID。共享Task被多个Shot引用算一次执行；AE与VFX等重叠制作方式不得相加冒充总镜头数；取消排除、过期另列、0分母显示无数据。新权重/人员评分不能偷偷加入现有四项概览。

## 8. 资源与正式排期

### 8.1 项目资源及团队身份关联

设备型号参考属于Knowledge，实际EquipmentUnit/Kit、数量、维修、租借/预约属于Resource；型号存在不表示库存可用。Location、Equipment、Person的项目资料仍归各自域，不放进Shot字符串。

团队共享身份是显式identity link，不是跨项目复制整份Person档案，也不是Work/Episode权限继承。一个项目Person/EquipmentUnit/Location仅在有权且确认同一物理对象后链接共享身份；同型号两设备是不同unit，不能按型号合并。

跨项目冲突查询基于已授权共享身份与Booking/Availability，验证资源占用事实；共享身份管理、预约和读取摘要权限分开。无授权不得返回他项目名称、人员联系、日期详情或总数；已授权free/busy摘要可以只返回必要忙闲，不泄露正文。

链接/解绑要预览重叠占用和后续校验影响，不移动现有预约、不修改历史project identity。无法核实身份/权限/档期时输出UNKNOWN，不能为了“无冲突”跳过未配置事实。跨项目资源接受需要真实两个项目的并发预约fixture。

### 8.2 时间和方案

存储UTC瞬间＋项目IANA时区，区间半开[start,end)。时区优先：既有项目值 → 创建明确选择 → 创建者新项目默认 → Asia/Shanghai。个人显示偏好不改项目拍摄日；项目时区改变先预览，移动实际时间是另一命令。夏令时不存在/重复时间要求明确offset。

项目配置拍摄日分界、工作/休息窗口、资源容量与可用性；未配置标待配置，不推定人员/设备可用。AVAILABLE/UNAVAILABLE/TENTATIVE/UNKNOWN保留区别，不能把TENTATIVE当已确认。

SchedulePlan有DRAFT、CURRENT及SUPERSEDED修订；同项目/明确Unit scope最多一个CURRENT。SUPERSEDED仅表示已被新方案替代的历史修订，没有“归档”产品操作。普通删除/恢复与确认Purge沿统一生命周期。

ScheduleItem通过typed关系引用Scene/Shot/Person/Location/Resource，一个Shot可跨日/多Unit/多次补拍；内容duration_frames不等于拍摄时段。SHOOT/REHEARSAL/MAKEUP/FITTING/TRAVEL/COMPANY_MOVE/PREP/MEAL/WRAP有明确类型和单位。

Company Move是ScheduleItem，需要责任/确认/完成时可关联Task；拆收、装卸、行驶、重搭时长由Schedule owner管理，不能重复计入Task与时间线两个总量。

### 8.3 约束、通告与联动

基础约束是人员/资源可用性、容量/排他、依赖、工作窗口、锁定时间、昼夜条件和转场。Locked不自动解锁。首版做确定性校验与可解释冲突；优化求解器在同一输入/输出边界后续接入，不保证自动找到所有最优方案。

Draft Call Sheet实时投影ShootDay/Schedule/Cast/Crew/Location/CallTime；发布固定source vectors、发送范围、发布时间/人和immutable revision。修改产生新修订，旧版不随当前事实漂移；重要变化重新确认不能伪造旧接收方已知。

正常制作联动按已授权规则自动推进可成立的未来计划/准备/交接/预测；冲突、锁定、缺授权/输入的目标显式进入需要处理状态。源Command先成功，后续失败显示原因/负责人和重试，不回滚源事实或改已发生Actual/已发布旧通告。

## 9. 创作版本、独立历史与撤销重做

| 内容 | 项目创作提交 | 历史/补偿规则 |
| --- | --- | --- |
| Shot、Scene/Sequence、SceneShot、字段定义/业务值、Panel/构图、Lighting内容 | 是 | 普通内容命令可undo/redo，稳定ID与引用、镜头级比较 |
| Character、Casting选择、Scene要求/Shot出演 | 是 | 保存创作选择，不复制完整Person私人档案 |
| Person资料/账号链接、Membership/授权 | 否 | 独立受权审计；普通资料可补偿，撤销授权不能由undo恢复 |
| Review/批注/审片决定 | 否 | 独立revision/events，绑定受审媒体/内容版本 |
| Task执行/交接、排期/发布 | 否 | 计划操作可补偿，已发生实际和发布用显式更正/撤回 |
| 共享视图/个人布局/交付Profile | 否 | 独立配置命令历史，不改变创作hash |
| Moodboard | 否 | 仍接canonical HistoryService的undo/redo |
| 缩略图/proxy/cache/Job/Presence | 否 | 派生物可重建，Job活动独立、Presence TTL |

整个项目提交固定允许的创作集合，hash/parent/作者/时间/消息、稳定引用可用于Git式提交列表、结构化diff和三方merge；镜头比较只是过滤项目diff，不建平行镜头提交owner。删除/新增/修改和未变内容区分，文本可并排、长段折叠，图片按固定presentation版本比较。

Restore/merge先预览稳定ID、当前/目标token、依赖及Purge缺项，再命令原子应用并创建新版本；不直接覆盖所有表，不倒退revision，不重放权限、已完成执行或Review批准。不同非空冲突须明确解决；未知codec不可静默跳过当成功。

HistoryService是唯一持久命令journal/cursor。用户＋项目最近100步、刷新保留；复合操作一条，同事务提交，不接第二套模块游标。客户端不传inverse；各域显式codec声明capture/validate/restore/依赖/引用/授权/CAS/Purge策略。

undo/redo是新补偿命令，重验当前授权、对象revision和引用；冲突409整步零写、cursor不移动，成功revision继续递增。新命令分叉清该用户redo。输入/IME/裁剪等未确认草稿保留本地undo，不抢项目快捷键。

全员共享布局撤销不得擦掉他人的后来修改。权限敏感、不可逆外发/永久删除不纳普通undo；普通删除保留快照，永久删除清受控历史并建立Purge barrier，旧commit、undo、ImportPlan、缓存和worker不能复活正文。

2D/3D灯光对象/坐标/属性属于内容；viewport相机导航、选择、面板和zoom属于呈现。Moodboard不创作版本不等于可跳过数据约束、媒体pin或删除清理。

## 10. 命令、Query与并发协议

写链：鉴权/权限 → 域Command → revision检查 → 域service → Audit/适用History/Outbox/receipt → 同一事务 → commit后ACK。router仅HTTP/schema/依赖/错误映射，不拥有跨域SQL业务。

新增命令使用稳定command_id、schema_version、payload及明确expected tokens；actor/权限/inverse由服务端生成。项目五向量、对象revision、policy/purge epoch按真实依赖检查，不能用一个Shot revision代替项目向量。原有consumer逐个适配，不一次破坏现有接口。

Receipt以scope/actor/command_id唯一并固定request digest。相同ID/相同payload重试只应用一次；不同payload409。已成功回执重放不因旧expected自然过期而失败，但当前授权/Purge仍重验。no-op可留最小技术回执，不能推进revision/updated_at/Audit/History/Outbox。

锁序为项目根再稳定ID的对象；跨项目资源占用按统一稳定资源锁序，不持一个项目锁再任意追别项目形成死锁。同事务失败DB/History/outbox及自建staging回滚。只有commit成功回执可称已保存。

客户端保留dirty/saving/acknowledged/failed/conflict；refetch不覆盖dirty草稿，网络失败可同ID重试，409要刷新/重预览而不是盲重试。命令部分完成只在明确定义的跨项目批量协议返回，单项目复合写不得半成功。

Query在数据库/投影阶段过滤scope、字段、计数；cursor稳定排序，带source vectors、policy epoch、as_of和口径版本。缓存key含权限范围、过滤digest、内容/config版本和Purge epoch，可从事实重建；Redis/cache失效不是丢正文。

沿现有错误detail结构友好映射：401登录、403权限、404隐藏/不存在、409冲突/旧计划、422非法输入、503暂不可用。提示说明可重试/重预览/联系授权者等实际下一步，保留草稿；不向产品显示SQL/堆栈/凭据，也不新增免责声明标注。

## 11. Import、OCR与来源追踪

复用一个ImportService，解析Provider按XLSX/CSV/DOCX/PDF/Image/portable project划分；probe/parse/extract_assets/normalize输出版本化中间模型，merge逻辑不依赖文件SDK。能复用成熟解析/OCR库就复用。

每次按内容解析，不保存客户/导演模板或Import Recipe。处理多行表头、原始列、源行/页/Sheet、嵌图、空值、单位/时间码、alias、数据分布和相似度；阈值通过合成误匹配fixture校准。高置信预选仍进预览，中置信警示，低置信/同名关系待确认，不静默绑定Person/Scene。

同一canonical字段可有多个source列；同值/空值按类型安全合并，文本只有明确合并策略才拼接，enum/number非空不同为冲突。主/辅制作方式以原owner解析，relation保留候选。未知列可成为自定义并保存原来源，不能覆盖技术身份。

已有项目支持添加、更新/覆盖和替换，均先预览。字段决策为FILL_EMPTY、KEEP_EQUAL、USE_INCOMING、KEEP_CURRENT、UNRESOLVED；非空差异默认UNRESOLVED，只有明确选择才覆盖。0/false有效。媒体也逐项决策，不以新文件带图就替换旧图。

Preview只读，分类CREATE/MERGE/UNCHANGED/CONFLICT/AMBIGUOUS，显示范围、字段/关系、媒体、冲突及预期删除。Replace显式确认删除范围，普通删除仍可恢复；不清整个项目或无关资源。

冻结Plan包括source hash、parser/catalog版本、mapping/merge决定、target IDs/revisions、policy/purge epoch、媒体manifest和digest。Commit执行这份计划，不重新模糊识别；源/目标改变409新预览，故障在最后一行/图片也整步回滚。

正式Provenance记录ImportSession、hash、filename、sheet/page/row/column、识别语义、mapping/merge、目标值来源revision；不是长期模板。临时解析TTL与正式来源留存分开。二次导入依明确来源或用户确认匹配，不拿显示镜号当不可变ID。

OCR批处理通过Job/Provider，实际源文本/识别置信与原图可核对；无输出标无法识别，不编造字段。PDF表格/纯文本/扫描件走同一预览，页数/容量限制明确失败；不能截断后称全量成功。

Legacy只允许便携工程文件导出 → 版本化文件合同 → VNext provider映射。旧数据库不迁移、不兼容旧API/session、不恢复Legacy runtime依赖。

## 12. 资产图片、画板与旁白

Asset独立于Shot附件，可被Panel/Scene/Task/Review/Deliverable/Board引用。不可变original → AssetVersion → MediaPresentation → typed references；master/proxy/preview/thumbnail是同一版本的物理component，不各造作品版本。

资产库后端支持独立上传、命名/分类、授权搜索、引用明细、删除/恢复、裁剪调整和受控下载。原图/版本不可变，裁剪由现有ImageCrop/MediaPresentation owner服务，资产库和镜头入口使用同一构图能力；不是复制一个编辑器后端。

图片支持横/竖、21:9/16:9等预设及自定义比例，旋转/翻转/重框选，内容不拉伸；按接受构图适配后黑填充。缩略图上传后异步生成，有真实状态/失败重试，未完成不伪造加载完成。新建与建立后可选择竖版分镜表，图框同步目标比例，不改原图片。

2D/3D Lighting共享同一Board对象数据，不保存两套坐标事实；2D、3D、分屏投影与工具相互映射，选中/移动/旋转/灯光参数、关联镜头、保存/冲突/undo明确。库对象型号参考与实际设备预约分开，3D外观不冒称已验证工程光学精度。

Moodboard持久Board/items支持图片、便签、色卡、链接、排序/移动、关联镜头；权限、原图引用、同事务CAS和undo完整，退出创作版本范围。临时拖拽仍本地，不每一帧发持久写。

旁白自动计时区分预计朗读、用户锁定时长与实际TTS音频时长；语速滑杆及可播放样例用统一TTS Provider/Job，滑杆拖动不每帧发请求。样例按文本/语言/voice/provider/speed缓存，结果带版本/时长；无provider输出明确不可用，不用假的播放按钮。

## 13. Export、工程码、水印与分享

一个授权Export投影供render/preview/文件附件/工程JSON/QR/ZIP，格式Provider只渲染，不拥有另一路写权限。Profile包括format/version、范围、选字段/顺序、布局、纸张/方向、图像比例/质量、header/footer、watermark、filename、schema_version和revision，独立于当前表格显示。

交付至少覆盖横/竖分镜表PDF、横版画面分镜、九宫格、单镜详情、好莱坞式剧本、制作分镜，以及可编辑Word、工程PDF/便携包；CSV/XLSX、EDL/OTIO/FCPXML、SRT/VTT沿各协议实际能力接受。字体/中文提取、长文不丢、分页和图片比例逐格式回读。

用户可选择字段/范围，不用“当前可见列”隐式替代明确选择；无权、已删除/已Purge字段不进入新导出。协议必需技术字段声明用途，内部ID/权限/联系人不默认夹带。导出Profile不是Import Recipe。

工程PDF内嵌堆叠QR或DM分片。使用成熟编码/解码库，payload含format/schema、package ID、序号/总数、分片/整包校验、允许实体与关系、固定媒体manifest；必要时用附件/ZIP带原图。码不能包含私有凭据、实际服务器配置或权限授权令牌。

接受必须从实际渲染PDF像素扫码、乱序/重复重组、整包校验，再走同一staging/preview/ImportCommand。少码、混包、冲突/未知版本、容量不足明确失败；无原图bytes仅报告缺失媒体，不能冒称图片恢复。

可见水印支持增删改查、布局/内容/透明度等有效配置，与分享/交付Profile绑定。不可见追溯使用真正隐写标识，QR、文件hash、metadata不能冒充隐写。抗裁剪/截图必须按执行标准真实样本及无水印控制测试，不提前保证能力；失败保持未接受。

纯文本/图片/PDF页/Word中的追溯方式分别说明实际能力。所有产品标注不得写免责声明，用真实状态、问题和待完成记录表达限制。已下载外部副本无法由撤销链接技术命令抹除，不把链接失效记作外部副本擦除。

分享/下载重验当前权限、到期、撤销和Purge；Job工件已有URL不是永久授权。更新时间为服务器确认UTC，刷新提示区分数据更新/本地草稿/冲突；不因打开页面或no-op写“刚更新”。

## 14. Outbox、异步Job、自动化与Provider

全站耗时操作异步，允许本地先编辑再提交；需要事务ACK的关键写不能伪装已完成。Import大文档、OCR、批量Export、TTS、代理/缩略图、打包、搜索索引通过持久Job。

OutboxEvent与业务同事务，commit后consumer发布；事件版本化、最小stable IDs/immutable facts，不复制大正文。发布/消费可重投、consumer receipt去重，失败不丢事件；队列ACK不等于业务成功。consumer改业务仍走Command。

Job固定owner/project、type、source vectors/digest、provider/config版本、幂等key、policy/purge epoch、progress、retry/cancel、lease/fencing和stage/output references。取消/权限撤销/来源改变/Purge阻断迟到发布；旧worker不能覆盖新租约。只清自己创建且无引用的staged文件。

Queue/Storage/AI/OCR/TTS/ImageGeneration/Search使用adapter/provider，复用已有RQ等成熟实现，不自造队列。Domain不长期依赖磁盘Path或单厂商SDK；Local/S3兼容实现保持统一storage key/stream/delete/metadata合同。

Automation使用Event → versioned Rule → Condition → Command，受控DSL/白名单动作、因果ID、幂等、防自激/深度上限。PostgreSQL trigger只约束integrity，不因Scene/Task变化跨域改排期。

Change/Impact解释AUTO_APPLIED/CONFLICT/LOCKED/REQUIRES_USER，显示原因、目标、负责人和重试。不是第二审计日志；需确认/冻结/异步的影响才持久化，普通可推导状态可重建。

AI默认无外发。Provider → Proposal → 人工或明确已授权规则接受 → 标准Command，不直接写库。知识核验与接受项目建议是不同操作，不能通过一次点击同时完成。

## 15. 协作、配置与UI扩展

Presence只保存online/session、当前workspace、选中Shot、focused field、cursor及edit lease，Redis TTL/pubsub、多worker收敛；身份/用户颜色由服务器分配并授权广播，不信任客户端声明姓名或用户ID。正文/批注/canonical数据不写Redis。

协作编辑开始获取明确对象/字段scope的短lease，续租/释放/重连有状态；同一表单框显示用户色和光标。该交互写命令受理时服务器验证当前lease身份/token/scope，并同时检查权限与CAS；没有有效lease只保留本地草稿、显示占用/不可用，不假装已锁定或已上传。Redis故障不能悄悄绕过“先锁定后修改”要求。lease是临时协作所有权，不代替SQL事务/revision。Import/已授权后台规则等独立业务命令仍走自身Command/CAS，不伪造在线编辑lease。

Capability Registry是编译期模块清单，声明routes、permissions、commands/events、entity scopes、Provider、导航/Inspector/菜单/Review/交付贡献及feature availability。没有任意运行时插件、用户代码或schema动态执行。

UI contribution有稳定ID、排序/权限，复用packages/ui的shadcn primitives、公共Command/Query。不每个模块复制Dialog/Toast/Modal、不改巨大shell加特例。当前已接受工作台不为实现registry而重写。

右键贡献按模块/命中对象/当前选择/权限产生真实可用动作：行与列、单元格、资产、画板对象、Review、任务/排期各自归域；不拿同一菜单填空能力。上述目标通过现有UI owner接入，本轮不改已有菜单布局。行上下粘贴与V向下保留，列方向操作沿独立列合同。

状态分Server canonical、Draft UI、Derived projection。配置schema_version与业务revision分开；SavedView/WorkspaceLayout/Profile/AutomationRule/ImportPlan/Provider/Registry配置由集中纯migrator处理。未知新版本拒绝写并保留原记录，不在React散落兼容if。

首页项目入口必须保留**横向整行照片封面、暗色可读覆盖、左侧标题/项目摘要、右侧更新时间/人员/编辑与打开入口**。不自行换成小方卡格子或纯列表。管理员用户/组/颜色与授权管理是有权限才显示的独立能力，不能对普通成员露入口或依岗位名开放。

只补完全缺失且API接受后的Scene/People/Casting/Resources/Task/Schedule/Knowledge等界面，每页先独立工作包。现有工作台、设置、表/卡/墙/时间线、详情卡片和放大图片跟随montblanc08接受版本；不全站冻结，也不覆盖其他agent修改。

新增UI只在桌面横屏1440×900及1920×1080正常缩放验收，明暗主题、键盘/选择/菜单、保存失败/409、刷新/真实回读和动画入场/切换/退场可打断。窄屏/缩放是后续范围，不把历史五宽度门槛重新加回本轮。

## 16. Knowledge Layer

影视概念/方法、设备型号参考、实际库存/预约、项目事实、单次经验观察、统计Aggregate及AI建议分属不同owner。Knowledge不能推定资源可用，不修改实际执行，不因生成答案进入事实库。

来源类型、verification_state、derivation_method分开；单位/条件/型号/来源revision明确。官方资料可冲突，AI不是独立事实源。QA在此指经验采集，不是CI测试或用户检索问答。

同一团队的项目经验默认贡献去标识汇总，原始回答按项目和答者权限隔离；明确团队scope缺失仅项目使用。贡献可撤回，团队聚合可见不等于原始资料可读，不能跨团队自动共享。人物自动评分/排名不加入此层。

收工/阶段结束集中提示，跨项目每日最多3个主题，跳过/稍后不阻塞保存或完成；source event/题目version/scope去重。实测、自报、推测分开，未知原因不填0，多工种回答同一setup不计多个实测样本。

Aggregate保存独立执行单位/项目/样本数、缺失与来源、P50/P75、统计方法版本、范围和validity。P75不是75%置信度，样本多不自动标高可信。成熟统计库、项目/时间holdout、误差/覆盖率回测；不足返回INSUFFICIENT_DATA。

Recommendation固定project vectors、knowledge/profile revisions、来源digest、适用条件/缺项和expiration；只受权检索，接受改计划走正常Command。来源修正/撤回/Purge使建议失效并重算，不继续使用旧有效cache。

QuestionPolicy初版使用人工发布的问题池和可解释排序，不超预算、不默认外部训练；先离线回放对比固定策略再更新排序。题干/选项/范围改变需发布，AI问题仍候选。知识Graph只在域内typed概念关系满足真实检索需求后建，不把全项目变万能Graph。

实施参数（并非用户手工指定）：团队汇总最低独立样本/项目阈值、最小延误差额、自愿追问数、分位数算法等见知识层合同；需合成数据/偏差回测后接受，不能把默认数值当效果保证。

## 17. 生命周期、Purge、迁移与恢复

所有域明确active/trashed/purged及适用发布状态；不增加“归档”产品操作。普通删除保留历史与引用，恢复同ID。永久删除先确认impact、expected tokens及digest；不由后台TTL代替用户确认正式内容删除。

Purge闭包包括当前值/定义、创作snapshot和独立历史正文、所有用户undo、ImportPlan/lineage正文、共享view/Profile、Review绑定、Board pin、Job stage/output、搜索/vector/cache、受控分享/下载及物理组件。依赖共享原图不误删；引用检查、GC claim和epoch防并发新pin被删。

事务先使正文不可读并建立无正文内部标记/epoch；物理清理可重试，分别返回logical_complete/storage_pending/storage_complete。无正文标记不保存姓名、原值、原图或联系人。不能以只清当前表称全闭包已擦除。

正式来源和固定产物不套24小时/7天TTL；只清未被正式引用的临时预览/可重建下载。缩短临时留存实施默认只影响新工件，清旧项要影响预览。Purge优先于留存期限，旧backup恢复先补删除账再开放访问。

新域迁移先核对唯一实际Alembic head，集成者独占链；expand、合成VNext数据转换、约束/codec核对、单owner切换、旧consumer退出后contract。不修改已发布旧migration，不编造parent SHA。

SceneShot转换保留Shot ID，旧单scene引用仅转primary，兼容写不丢additional links；已有多关系后禁止单FKdowngrade。旧配置/history格式按显式decoder迁移，未知格式不可restore/merge。

接受数据库须真实PG空库/上一接受head合成副本升级、FK/unique/check、并发/锁序、失败回滚、backup/restore＋Purge账。SQLite单元测试不替代PG。已经接受新写入后forward-fix或停新入口，不降级删表丢数据。

Legacy数据库/旧项目不回填；生产数据库、服务器和已有预览服务本轮不操作。真实媒体、私有凭据/IP、未脱敏截图不入Git；原始截图固定本地保存，不删除，公开证据仅合成或脱敏版本。

## 18. 工作包、依赖与可复用验收

工作包清单是执行入口，每包独立owner、依赖、允许/排除写集、实际基础SHA、合同/迁移、门槛、回退和证据。not_started/in_progress/blocked/accepted不是canonical迁移状态；accepted不得只凭文件存在或脚本结构通过。

| 顺序 | 工作包 | 可交付结果 |
| --- | --- | --- |
| B0 | Board、Import、Export各自未完成接受项 | 核对真实已推代码和未提交草稿，补PG/consumer/文件回读，不重做既有UI |
| E0 | receipt、history codec、config migrator | 同事务幂等/no-op/CAS、唯一历史owner、旧格式可读 |
| E1 | identity、policy | 项目Person与Character、成员独立授权、deny/撤销和全入口一致 |
| E2 | organization、SceneShot、Casting、Resource、共享资源identity | 独立组织与typed关系、跨项目受权冲突身份基础 |
| E3 | entity fields、shared view | typed值/转换/Purge、同view布局与配置同步；已接受表格前端交接 |
| E4 | Task/Workflow/DAG | 单主责、多协作、固定产物、独立审片、依赖与过期 |
| E5 | Outbox/Job/Storage adapters | 可重投、租约fence、迟到取消、持久状态/回执 |
| E6 | Schedule/CallSheet | 正式方案、跨项目占用约束、UTC/时区、发布修订 |
| E7 | Import/Export providers | 冻结计划/来源/冲突、真实多格式/工程码回读 |
| E8 | Automation/Impact | 正常未来计划联动、例外解释、不改Actual/旧发布 |
| E9 | 真正缺失UI | 已接受API上的独立新页，现有UI只由指定owner衔接 |
| K0–K5 | 知识参考、经验、校准、建议、自适应与新consumer | 来源核验、频率/权限、统计回测、接受命令/Purge闭环 |

共享注册/路由总入口、models导出、Alembic、History/snapshot接入和台账由Integrator串行整合。域agent只写分配文件；完工先fetch检查他人增量，不用整文件旧稿覆盖。后端新接口、缺前端consumer、允许写集/保护文件、验收责任必须记衔接账本。

### 18.1 必须覆盖的实际场景

| 场景 | 必须证明 |
| --- | --- |
| 120镜头商业项目 | 多制作方式、XLSX嵌图/复杂表头、角色视图、任务/交接、Review、多交付范围，统计口径不重复 |
| 多Scene剧情项目 | 零Scene、多Scene、可选primary、独立篇章/顺序、Character/Person分离，删除一Scene不删共享Shot |
| 多项目团队资源 | 显式共享身份、同型号多unit、无权项目、并发占用、未知档期、受限摘要，无姓名猜合并 |
| 共享视图 | 两用户同view实时同步宽/高/筛选/排序/分组，不共享光标/草稿；CAS409、断线重连、undo不抹后来修改 |
| 删除闭包 | 内置Purge拒绝；预设/custom清正文；所有用户history/旧版本/旧Job/缓存/backup不能复活 |
| 二次Import | 空值安全补、相同no-op、非空冲突确认、目标改后409，最后一行失败全回滚 |
| 交付回读 | 横/竖PDF/Word/剧本/工程码、中文/图片/长文/字段allowlist、actual raster扫码，不夹私密正文 |
| 媒体/画板/旁白 | 原图不改、横竖不拉伸/黑填充、缩略图状态、2D3D共源、Moodboard undo、真实TTS播放 |
| 制作联动 | 两Scene/六Shot/摄影灯光制片后期、两日共享资源、日期变更、锁/缺授权、故障/重复event，正常项自动且实际不改 |
| 知识闭环 | 真实执行→QA→受权贡献→独立样本聚合→解释建议→Command接受→来源修正/Purge使旧建议失效 |

详细FX-01..17及KL-01..10沿配套标准执行，新增共享view/资源门槛补入同一清单，不制造另一平行QA制度。浏览器只对实际授权新consumer验收；后端PASS不能替代UI证据。

### 18.2 发布与完成

每个接受包保存实际基础commit、dirty diff digest、执行时间/命令、断言、结果/退出码、脱敏证据路径及未通过项。固定截图目录见执行标准，截图原件本地保留。校验工具仅检查文档/依赖/证据结构，不认证产品行为。

完成一包即更新对应合同/台账、显式暂存、diff与适用guard、commit/push并核对远端回执，不等全部大计划写完；未验收代码/用户文件不混入文档提交。不能声称CI/PG/视觉通过而没有实际结果。

总纲“可执行”要求每一产品分支明确、owner/Command/Query/约束/生命周期/依赖/门槛齐；“功能已完成”还要求真实注册和consumer、迁移、权限/并发/故障/Purge、对应文件/浏览器证据。本文重写只完成合同，不把现有后端缺口、UI缺口或知识层计划提升为CUT_OVER。
