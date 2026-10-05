> **下一代业务定义，尚未实施。** 本文件定义 FrameForge 知识库的基础类型、A–H 分库、设备/软件扩展模型和维护边界。岗位职责仍以 [JOB_CATALOG](JOB_CATALOG_DEFINITIONS_2026-10-05.md) 为准；岗位到知识的覆盖见 [岗位驱动知识目录](ROLE_KNOWLEDGE_CATALOG_2026-10-05.md)。

# FrameForge 知识库基础内容、类型与扩展合同

版本：1.7，2026-10-05。状态：需求合同，尚未创建运行数据库、知识条目、索引、维护页面或权限规则。本版在常识/组件/层级基线上纳入首批已填 Reference Seed Data，并强化官方来源状态、UNKNOWN语义与固定/多内置成像模组规则。

## 1. 总原则

知识库保存**可复用、可核验、可版本化的知识事实和参考关系**。Project / Scene / Shot / Task / Schedule / Media / Review 等继续保存项目实际事实；知识库不复制项目状态。

本版确认：

- 直接按 JOB_CATALOG 的 A–H 八大类建立八个专业知识小库；
- 共用基础知识先建立为制作常识 Topic / Formula / Relation，再被 A–H 引用，不建立第九个“部门”；
- 软件只记录“适用能力范围”，不建立功能更新日志、操作步骤或软件教程；
- 器材结构化规格以厂商官方资料为权威来源；允许人工备注，但备注不得覆盖官方规格；
- 器材必须支持结构化兼容关系，包括“直接兼容”“需要转接”“明确不兼容”和带条件兼容；
- 不建立常见问题库、故障经验库或 Failure Pattern；
- QA / 项目经验只保留粗粒度时间信息，用于预计时长校准，不采集“遇到了什么问题、为什么、怎么解决”；
- 知识库不建立自己的权限角色或权限矩阵；读写、审核、发布等动作统一交给系统权限和用户组能力；
- 不做 SOP、合同、财务、采购、库存、预留、行业标准/外部互通数据库。

## 2. 知识空间

### 2.1 共享基础层

共享基础层只保存 A–H 都可能复用的知识，例如：

- 制作对象与术语：Scene、Shot、Task、AssetVersion、Review、Deliverable 等；
- 任务、依赖、交接、计划/实际/预测的区别；
- 排期、转场、通告、素材正式交接、版本与审阅概念；
- 制作授权资料类型和 Readiness / Checklist 基础概念；
- 通用设备分类、规格定义、单位和兼容关系类型；
- 通用软件能力分类；
- 粗粒度时间校准数据模型。

共享基础层不是一个项目 Department，也不包含人员、任职或任务。

### 2.2 A–H 八个专业知识小库

| Library ID | 专业知识小库 | 主要范围 |
| --- | --- | --- |
| A | 项目管理与制片 | 需求/反馈、制作组织、进度、交接、外部协作、交付协调 |
| B | 策划、内容与导演 | 创意、剧本、采访、导演、场记、分镜、预演、后期内容组织 |
| C | 视觉设计与美术 | 视觉方向、实拍美术、数字画面方案、图形、插画、场景、字体、信息图、造型 |
| D | 摄影、灯光、录音与现场 | 摄影、镜头、焦点、移动摄影、灯光、供电、录音、DIT、现场数据与场地协同 |
| E | 出镜、表演与造型 | 选角、表演、主持/采访、配音、动作/舞蹈、服装、妆发、造型 |
| F | AE、MG、二维动画与合成 | AE、MG、二维动画、包装、字效、合成、抠像、擦除、跟踪、二维特效 |
| G | 三维制作与三维视效 | 建模、材质、绑定、布局、动画、模拟、灯光、渲染、实时引擎、动捕、扫描、视效现场 |
| H | 剪辑、声音、成片与交付 | 剪辑、素材、调色、声音、配音、音乐、混音、字幕、本地化、在线、QC、交付 |

A–H 是**知识空间**，不等同项目实际 Department。同一 KnowledgeTopic、EquipmentModel、SoftwareProduct 或 FormatDefinition 可以被多个知识小库/Domain 引用，但 canonical 内容只有一个 owner，避免复制正文和规格。

## 2.3 分类层级与知识身份

大类按《工种目录、制作分工与岗位添加定义》的 A–H 建立，再细分知识小类、必要的下级类型和字段。取消固定层数限制；不要求固定四级，也不禁止合理的进一步细分。层级依据清楚的总分关系形成，不按条目数量或预设层数硬拆。

每个概念、型号、字段和来源继续保持稳定身份。字段是某对象的属性，数值是字段值；它们不被混成同级知识类别。独立概念之间用明确关系连接，不能将焦距→光圈→视场角串成虚假的父子关系。

分类用于组织和检索；实体的所有权、生命周期和业务连接按其各自合同判断，不从目录位置推导。共享知识正文只维护一份，跨岗位关联不复制正文。

摄影机和镜头运动先用待确认案例说明新的组织方法，用户审核后才批量重排其他小类。本轮不新增器材参数或重新核验现有数值。

## 2.4 已填 Reference Seed 与来源状态

首批实际填充数据统一见 [首批 Reference Seed Data](REFERENCE_SEED_DATA_2026-10-05.md)。每个结构化字段必须区分 OFFICIAL_VERIFIED / OFFICIAL_PARTIAL / OFFICIAL_CONFLICT / UNKNOWN / DERIVED；没有官方确认的值保持 UNKNOWN，不能用零值、默认值或第三方页面补成官方事实。

固定镜头设备允许一个 ImagingDevice 拥有一个或多个 EmbeddedImagingModule。模组数量由具体厂商官方事实决定：例如多摄无人机或双镜头口袋相机可以在机身内部切换模组，但这些内置镜头仍不能进入独立 Lens Picker。

## 3. 基础知识类型

首版正式类型收敛为：

| Type | 用途 |
| --- | --- |
| `TERM_CONCEPT` | 术语、对象、概念和关系定义 |
| `ROLE_BOUNDARY` | 相邻岗位/专业之间的职责与交接边界 |
| `INPUT_OUTPUT` | 工作输入、输出、固定版本、依赖和交接 |
| `METHOD_PRINCIPLE` | 专业原理、判断维度和方法概念；不写按钮级操作步骤 |
| `EQUIPMENT_MODEL` | 厂商设备型号及官方结构化规格 |
| `SOFTWARE_SCOPE` | 软件或指定版本范围适合/不适合哪些制作能力 |
| `FORMAT_REFERENCE` | 文件、媒体、工程或交付格式的基础属性 |
| `AUTHORIZATION_REFERENCE` | 制作授权资料类型与适用对象，不含合同条款或法律结论 |
| `INTERNAL_QC_REFERENCE` | 团队/项目配置的检查关注点，不声称行业标准 |
| `TIME_CALIBRATION_REFERENCE` | 由项目 Actual 汇总出的粗粒度时间参考 |

明确不建立 `FAILURE_PATTERN`、Troubleshooting、常见问题知识类型。设备/软件“遇到的问题”不进入正式知识；若项目发生异常，其事实留在项目自身记录中，不进入 QA 知识库。

## 4. 基础对象与关系

基础对象不再由一个 KnowledgeEntry 和一个万能 Relation 承担。首版按职责拆成：

### 4.1 常识正文与来源

```text
KnowledgeLibrary
KnowledgeDomain
KnowledgeTopic
KnowledgeRevision
KnowledgeAlias
KnowledgeSource
SourceReference
DomainTopicLink
KnowledgeRelation
FormulaDefinition
```

KnowledgeTopic 是稳定语义身份；KnowledgeRevision 保存不可变正文。Alias 只用于检索，不产生第二个 Topic。SourceReference 只保存来源位置、版本和访问时间，不要求网页证据快照。

### 4.2 器材身份与规格

```text
Manufacturer
EquipmentCategory
EquipmentProductFamily
EquipmentModel
EquipmentVariant
AccessoryModel
AdapterModel
EquipmentBundle
SpecificationDefinition
SpecificationDefinitionRevision
SpecificationValue
SpecificationValueRevision
UnitDefinition
EquipmentNote
```

厂商视为新一代/Mark II/Pro 等独立世代时建立新的 EquipmentModel；卡口、地区、容量等才是 Variant。官方规格写 SpecificationValue；人工备注不限内容但只能进入 EquipmentNote，不能覆盖官方值或参与官方筛选/兼容推导。

### 4.3 成像设备

```text
ImagingDevice
EmbeddedImagingModule
SensorDefinition
SensorRecordingMode
LensModel
LensVariant
```

固定镜头设备以 EmbeddedImagingModule 表达。内置镜头可被镜头/光学知识检索，但不出现在独立 Lens Picker；多内置摄像模组的设备仍保持一个 ImagingDevice，由用户选择具体 EmbeddedImagingModule。

### 4.4 接口、支撑与兼容

```text
InterfaceDefinition
SupportInterfaceDefinition
EquipmentInterfaceLink
SupportComponent
QuickReleaseComponent
CompatibilityRelation
CompatibilityPath
```

接口按知识 Domain 组织，例如 D.Camera.LensMount、D.CameraSupport.QuickRelease、D.Lighting.ModifierMount、D.Audio.AudioConnector。USB-C、HDMI 等可以共享物理 Definition，但各 Domain 保存用途 link。兼容关系以接口推导为主，厂商 model-level compatibility assertion 为 override。

### 4.5 软件、格式与能力

```text
SoftwareVendor
SoftwareProduct
SoftwareVersionScope
CapabilityDefinition
SoftwareCapabilitySupport

FormatDefinition
FormatRelation
```

FormatDefinition 只有一份 canonical identity；D/F/G/H 等通过 PRODUCES / CONSUMES / IMPORTS / EXPORTS / TRANSCODES_TO 关联，不建立独立“格式部门库”。

### 4.6 岗位与时间校准

```text
RoleKnowledgeBinding
ExperienceObservation
CalibrationTargetLink
EstimateProfile
```

RoleKnowledgeBinding 不是权限、任职或 TaskAssignment。ExperienceObservation 只保存 Actual 或粗粒度时间信息；Shot/Scene/ShootDay aggregate 与其 component metric 不得重复计样本。

### 4.7 Relation 不做万能图

至少分开：

- KnowledgeRelation：Topic ↔ Topic；
- DomainTopicLink：Domain ↔ Topic；
- RoleKnowledgeBinding：岗位 ↔ Domain/Topic；
- EquipmentInterfaceLink：设备/Variant ↔ Interface；
- CompatibilityRelation：设备/接口 ↔ 设备/接口；
- SoftwareCapabilitySupport：SoftwareVersionScope ↔ Capability；
- FormatRelation：产品/Domain ↔ Format；
- CalibrationTargetLink：Observation/Profile ↔ Shot/Scene/ShootDay/Task/Move/Post type。

核心身份、类型、来源、revision、状态和关系使用明确字段/表；只有低频、非关键且不参与核心约束的补充属性才能进入带 schema version 的扩展字段。

## 5. 可维护性与 Revision

### 5.1 稳定身份

KnowledgeTopic、EquipmentModel、SpecificationDefinition、SoftwareProduct、FormatDefinition、KnowledgeDomain 都有稳定 ID。显示名称、中文名、英文名、别名改变不改变身份。

### 5.2 修订而不是覆盖历史

正式知识发布后，规格、说明或适用范围变化形成新的 KnowledgeRevision / Specification revision。旧项目若固定引用旧 revision，仍能回查当时内容；新检索默认读取当前有效 revision。

### 5.3 生命周期

首版知识内容至少区分：

```text
DRAFT
VERIFIED
PUBLISHED
DEPRECATED
WITHDRAWN
```

这些只是知识生命周期，不定义谁有权执行动作。具体 Create/Edit/Verify/Publish/Withdraw 权限全部由统一权限和用户组系统提供，知识模块只消费授权结果，不建立 `KnowledgeAdmin`、`KnowledgeEditor` 等专用角色。

<a id="reference-sources"></a>

### 5.4 来源

每条正式知识记录来源类型、引用位置/URL或文件引用、来源版本、访问时间和核验状态。AI 只能辅助整理候选，不能作为自身事实的独立证据。

## 6. 器材知识与可扩展规格

### 6.1 官方规格是权威值

EquipmentModel 的结构化规格只录入厂商官方资料可确认的值。允许人工添加 EquipmentNote，例如团队内部命名、收纳说明或补充文字，但 Note：

- 不覆盖 SpecificationValue；
- 不参与官方规格筛选和兼容计算；
- 明确显示为“人工备注”；
- 可以单独修订/删除，不改变官方规格历史。

如果官方资料未给出某值，保持 UNKNOWN/空值，不以人工猜测补成官方参数。

### 6.2 身份、变体和字段归属

型号保存稳定身份、厂商、可空系列、中英文名称、产品代码、分类和修订。变体是真正从属型号的0到多个官方差异，不是每个型号强制填写的字符串。来源为独立记录及逐字段引用，不在主表只放一个网址。成像模组、传感器和录制模式各自拥有对应参数。

唯一字段字典见[器材字段合同2—4节](EQUIPMENT_REFERENCE_FIELD_CONTRACT_2026-10-05.md)。本篇不再重复维护一套镜头参数表；规格、配件安装链、套装和备注均遵循该合同。

### 6.3 分类规格定义与新产品录入

规格由器材分类和规格定义修订扩展，不为每个新品修改型号主表或Shot结构。新24–70mm F2.8镜头按官方资料填写焦距范围和几何光圈，再分别核验卡口、像场、对焦、接口与功能。不能凭名称补出未公开数据。

定焦50mm可保存范围两端相同，但等效焦距不能自动成为物理焦距。F值与T值分别存储；转换需官方对应关系。视场角优先官方数据，理论计算受投影模型、有效区域和公式条件约束。

新增结构化参数先建规格定义和类型/单位/适用条件；旧产品该值为未知，不批量猜值。完整性要求是适用字段有值或明确未知/不适用，而不是所有设备填同一张万能参数表。

### 6.4 不允许无限自由字段替代规格定义

规格分三级：

```text
Core Identity
→ Category Specification
→ Rare Extension Attribute
```

常用且参与查询、筛选、兼容或自动化的属性必须升级为正式 SpecificationDefinition；只有低频、非关键、不能提前标准化的补充属性才允许进入受版本 schema 约束的扩展字段。

## 7. 器材兼容关系

兼容关系必须结构化，不能只写备注。

首版 relation 至少支持：

| Relation | 含义 |
| --- | --- |
| `DIRECT_COMPATIBLE` | 可直接连接/使用 |
| `REQUIRES_ADAPTER` | 需要明确的转接器/中间件 |
| `INCOMPATIBLE` | 明确不能按该连接方式直接使用 |
| `CONDITIONAL_COMPATIBLE` | 在明确条件满足时可兼容 |

兼容关系的字段和判定流程统一见[器材字段合同5节](EQUIPMENT_REFERENCE_FIELD_CONTRACT_2026-10-05.md)。来源宿主与目标配件按具体型号/变体/模组确定；分类只能帮助检索，不能替代适配证据。专用配件命中明确名单后才继续校验，通用接口仅生成受条件约束的候选。空名单不匹配全部产品。

遮光斗、滤镜架、滤镜托盘、连接环和支撑件必须说明实际安装路径。4×5.65滤镜不能因属于镜头配件就直接关联所有镜头；专用增广镜不能出现在未经官方宿主名单覆盖的独立镜头可用配件列表。套装随附关系、概念引用和可兼容关系分别保存。

类别与字段文档不写真实品牌、型号或直接配对。具体安装结构和证据只在真实数据样例展开，每个端点标明所属大类；原生接口、转接后的结果和功能支持分开，不从标准接口名称反推所有产品兼容。

兼容关系的 revision 独立于设备名称修改。项目选择设备时可查询兼容条件，但知识库不能据此声称项目当前实际拥有转接环或设备可用。

自动推荐 CompatibilityPath 硬性最多 2 个 intermediate components；超过两层只有在厂商资料或真实拍摄案例明确证明时才能作为特殊知识记录，默认组合器不得自动推荐。Adapter/Accessory 的机械连接、电子通信、AF、光圈控制、metadata、stabilization、focus control、power、video/data/control passthrough 分开保存，不能把“能装上”当成全部功能兼容。

## 8. 软件知识

软件知识不做功能百科、版本更新日志或教程，只回答：

> **这个软件 / 版本范围适合哪些制作能力，不适合哪些制作能力。**

SoftwareProduct 至少保存：

```text
vendor
product_name
version_scope (optional)
status
official_source
```

SoftwareScope 使用受控 Capability Domain，例如：

```text
EDITING
COMPOSITING
MOTION_GRAPHICS
TWO_D_ANIMATION
THREE_D_MODELING
THREE_D_ANIMATION
SIMULATION
REALTIME_PRODUCTION
COLOR
AUDIO
SUBTITLE_LOCALIZATION
RENDERING
```

每个软件/版本范围只记录：

```text
capability_domain
support_level = PRIMARY / SUPPORTED / LIMITED / NOT_SUPPORTED
source
revision
```

软件能力必须逐具体产品/版本范围按官方能力录入；不得因为产品被归类为 3D DCC、NLE 或合成软件，就自动推导某 Capability 为 NOT_SUPPORTED。例如具体 3D 软件若官方提供视频编辑能力，应记录其真实 SupportLevel，而不是由类别先验判断。

不记录按钮路径、快捷键、插件操作步骤、版本新功能清单或教程。

## 9. QA 与时间校准

本版不建立常见问题库，也不要求用户回答“哪里出问题、为什么、如何解决”。

QA/经验只用于粗粒度时间校准。优先读取系统已有 Actual；只有 Actual 不足或需要补充粗粒度信息时，才允许询问简短时间问题，例如：

- 这个 Scene / Task / Move 大约实际用了多久；
- Setup / Shoot / Move / Post 大约各用了多久；
- 记录值明显不完整时，请用户选择一个粗时间范围。

首版不采集故障原因、设备心得、最佳设置、解决方案或个人能力评价。

ExperienceObservation 最小只需要：

```text
source_object
source_revision
project
work_type / pattern
planned_duration (optional)
actual_duration_or_range
measurement_quality
captured_at
```

EstimateProfile 只用于更新未来的粗粒度时长参考和计划候选。统计仍要求去重、样本门槛、不可变版本和历史可回查；新统计不改已确认计划、Actual 或已发布通告。

时间校准优先读取 Call Sheet / Schedule / 制作表中的 planned/estimated 与实际 Actual。允许 Shot、Scene、ShootDay 作为 aggregate target，同时保存 Setup / Rehearsal / Shoot / Reset / Strike、Company Move、Task、Post Work 等 component metric；aggregate 与 component 不能重复累计为样本，且绝不按 Person 汇总效率。

## 10. 岗位知识绑定

RoleKnowledgeBinding 只把 JOB_CATALOG stable role ID 连接到 A–H Library / KnowledgeDomain。一个岗位可以关联多个 Domain，一个 Domain 也可以服务多个岗位。

知识绑定不是权限绑定：

```text
RoleKnowledgeBinding != ProjectRole
RoleKnowledgeBinding != Permission
RoleKnowledgeBinding != TaskAssignment
```

J-04 未确认前，JOB_CATALOG 新版本只生成“绑定待复核”；不按岗位显示名称自动迁移。

## 11. 扩展准入

新增知识类型、规格字段或关系类型前必须回答：

1. 为什么现有 KnowledgeTopic/知识类型、SpecificationDefinition 或明确 Relation 不能表达；
2. 是否需要独立查询、筛选、兼容计算或版本生命周期；
3. 是否需要稳定 key 和 typed value；
4. 是否来自官方权威来源，或只是人工备注；
5. 是否会影响 A–H 多个小库；
6. 是否参与项目自动化，若参与则只通过明确受控查询/关系，不直接改项目事实。

新增 EquipmentModel 和 SoftwareProduct 不属于“新增知识类型”，应通过已有扩展点完成。

## 12. 验收原则

基础合同完成后至少验证：

- A–H 八个 KnowledgeLibrary 独立查询、共享基础知识不复制正文；
- 新增一个镜头型号不需要数据库迁移或 Shot schema 修改；
- Lens 新增规格定义后旧型号保持 UNKNOWN，不被自动猜值；
- 官方 SpecificationValue 与人工 EquipmentNote 可同时存在且不会互相覆盖；
- CompatibilityRelation 能表达 direct / adapter / incompatible / conditional，并可追溯官方来源；
- 软件只返回 capability scope，不生成教程或版本功能文章；
- 知识系统中不存在 Failure Pattern / 常见问题库；
- 时间 QA 不采集故障原因，只能形成粗粒度时长观察与校准；
- 知识模块不创建专用权限角色，所有读写动作走统一权限/用户组判定；
- 知识 revision、deprecated/withdrawn、来源更新均不改写历史项目固定引用；
- FOV、Camera Angle、Perspective 是三个不同 Topic，并有可解释 typed relation；
- 固定镜头设备锁定 EmbeddedImagingModule，多模组设备可选内置模组但不能替换内置镜头；
- 多机位逐 Camera Body 独立计算 Lens/Adapter Path，项目卡口偏好只排序；
- 自动 CompatibilityPath 最多两个中间节点；
- F-number/T-stop、Shutter Angle/Time、ISO/EI/Gain 只在已确认适用规则下转换；
- Canonical Format 可被多个 D/F/G/H 数据流引用，颜色基础与具体 Camera/Composite/Render/Post Pipeline 分离；
- 首批常识 Topic、公式、器材/软件/格式 seed 范围以制作常识与 Seed Catalog 为准。

## 13. 本轮分类与字段一致性要求

主题、导航分类、规格字段和项目事实四者分开。运镜、覆盖策略、轴线连续性、人物调度、拍摄准备分别查询；中文名必填，英文术语和字段键供检索/实现。全量目录分组以制作常识规划和主题目录为准。已填参数、安装配件、来源定位、条件和变体覆盖须分别审计，名称齐全不代表数据齐全。

## 14. 按岗位专业类别关联知识

采用知识目录的岗位专业关联节的岗位编号→专业域→组件→所属大类→主题/资料入口，复用现有映射。跨专业连接说明原因、条件、两端修订与来源，正文身份不重复，不把专业关联当作安装适配、权限或任务事实。

## 独立知识分类（2026-10-05本轮确认）

A–H岗位大类保持，知识类别、主题、专业组件独立拆分。构图是构图，运镜是运镜；人物调度和机位调度也独立。各类内部可有真正的类型或单参数子维度，不能以“相关”合成复合正文。

类别和字段规则见[知识目录](KNOWLEDGE_CATALOG_STRUCTURE_2026-10-05.md)、[字段合同](EQUIPMENT_REFERENCE_FIELD_CONTRACT_2026-10-05.md)。现行有效编号和旧编号转向见[共享主题目录](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md)及[专业组件目录](AH_KNOWLEDGE_LIBRARY_COMPONENTS_2026-10-05.md)。拆分不新增业务Entity、岗位身份、权限或任务，不复制运行数据。
