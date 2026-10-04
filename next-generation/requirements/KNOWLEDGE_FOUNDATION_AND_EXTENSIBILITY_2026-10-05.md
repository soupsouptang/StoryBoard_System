> **下一代业务定义，尚未实施。** 本文件定义 FrameForge 知识库的基础类型、A–H 分库、设备/软件扩展模型和维护边界。岗位职责仍以 [JOB_CATALOG](JOB_CATALOG_DEFINITIONS_2026-10-05.md) 为准；岗位到知识的覆盖见 [岗位驱动知识目录](ROLE_KNOWLEDGE_CATALOG_2026-10-05.md)。

# FrameForge 知识库基础内容、类型与扩展合同

版本：1.1，2026-10-05。状态：需求合同，尚未创建运行数据库、知识条目、索引、维护页面或权限规则。本版新增制作常识库、细化基础对象/关系及首批 reference seed；详见 [制作常识与 Seed Catalog](PRODUCTION_COMMONS_AND_REFERENCE_SEEDS_2026-10-05.md)。

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

### 6.2 固定身份字段

所有 EquipmentModel 至少包含：

```text
manufacturer
model
variant
equipment_category
region_or_market (optional)
official_source
official_source_version
status
```

### 6.3 分类规格定义

规格由 EquipmentCategory + SpecificationDefinition 扩展，不为每个新品改主表。

例如 Lens 首批规格可以定义：

```text
mount
physical_focal_length_mm / focal_length_min_mm / focal_length_max_mm
f_number_min / f_number_max
t_stop_min / t_stop_max
image_circle / coverage
official_horizontal_aov_by_format
minimum_focus_distance_m
filter_thread_mm / front_diameter_mm
weight_g
length_mm
stabilization
autofocus
spherical_or_anamorphic
squeeze_ratio
```

F-number 与 T-stop 分开保存；只有官方提供对应 transmission/映射时才允许换算。FOV 优先读取厂商官方 Angle of View；特殊镜头按厂商 projection model 处理。

数值保存 typed value + unit；枚举保存受控值；UNKNOWN 不等于 0。

新上市 24–70mm F2.8 镜头只需：

1. 新建 EquipmentModel；
2. Category 选择 Lens；
3. 系统加载当前 Lens SpecificationDefinition；
4. 按官方资料填写 24、70、2.8 等值并固定来源 revision；
5. 添加兼容关系；
6. 如有需要另写人工备注。

不要求为“新镜头上市”新增数据库列或改 Shot schema。

定焦镜头使用同一 schema，例如 50mm 时 `focal_length_min_mm = focal_length_max_mm = 50`。如果未来 Lens 新增一个真正需要结构化查询的属性，则新增 SpecificationDefinition revision；旧型号该值为 UNKNOWN，不能批量猜值。

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

CompatibilityRelation 至少保存：

```text
source_model_or_category
target_model_or_category
relation
required_intermediate_model (optional)
conditions (typed/structured where possible)
official_source
source_revision
status
```

关系应尽量指向 EquipmentModel / EquipmentCategory / InterfaceDefinition，而不是写成一句自然语言。

兼容示例必须使用已核实的真实型号和官方接口。例如 FC-120B 的原生 modifier interface 是 FM Mount，官方随附 Bowens Mount Adapter；因此知识关系应表达“FC-120B → FM Mount”以及“FC-120B + 官方 Bowens Adapter → Bowens modifier ecosystem”，不能把 Bowens 直接写成 FC-120B 原生 mount。具体参数和附件仍以对应厂商官方资料为准。

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
