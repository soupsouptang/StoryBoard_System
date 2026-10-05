> **下一代业务定义，尚未实施。** 本文件定义先于 A–H 各专业小库建设的“制作常识库”、基础知识内容模板、基础大类知识、公式/关系模型，以及首批器材、软件和格式 seed。正式实现仍须按对应官方来源重新读取并写入数据库；本文不是运行数据库快照。

# FrameForge 制作常识库、基础大类知识与首批 Seed Catalog

版本：1.4，2026-10-05。状态：已确认规划合同，尚未实施。首批常识正文见 [制作常识 Topic Catalog](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md)，A–H组件与跨组件关系见 [A–H知识小库组件](AH_KNOWLEDGE_LIBRARY_COMPONENTS_2026-10-05.md)，已填官方结构化数据见 [首批 Reference Seed Data](REFERENCE_SEED_DATA_2026-10-05.md)。

配套：[知识库基础合同](KNOWLEDGE_FOUNDATION_AND_EXTENSIBILITY_2026-10-05.md)、[知识体系](VNEXT_KNOWLEDGE_LAYER_REQUIREMENTS.md)、[岗位驱动知识目录](ROLE_KNOWLEDGE_CATALOG_2026-10-05.md)。

## 1. 建设顺序

知识体系必须按以下顺序建设，不能从品牌/器材型号反推制作知识：

```text
制作常识 Topic
→ Topic 间 typed relation / FormulaDefinition
→ 基础大类知识
→ Equipment / Software / Format 对常识能力的实现与约束
→ A–H 专业知识小库
→ 小库内部 Component
→ 跨组件 relation
→ KnowledgeLibrary → Domain → Component → 可选Subcomponent（最大分类深度）
```

共享常识、A–H组件和最大分类深度均已形成规划基线。后续只在满足独立维护/查询/岗位部分需求时增加 Subcomponent；Topic、器材、软件、格式继续通过 relation/facet 组织，不再向下增加第五级目录。

## 2. 基础知识内容模板

### 2.1 专业概念主题

最少包含：

- canonical name、中文名、英文名、alias；
- 一句话定义；
- 适用范围；
- 与相邻概念的区别；
- 关键输入量/属性；
- 相关 FormulaDefinition；
- typed relations；
- authoritative sources；
- revision / status。

### 2.2 方法原理

最少包含目标、核心原理、适用条件、判断维度、边界和关联 Topic。只解释专业原理，不写按钮路径、快捷键或逐步 SOP。

### 2.3 器材型号资料（Equipment Model）

本节规定完整资料由哪些对象组成，不把每块资料都塞成型号主表的一列。字段名、类型、单位、缺值、来源和配件匹配以[器材字段合同](EQUIPMENT_REFERENCE_FIELD_CONTRACT_2026-10-05.md)为唯一入口。

| 内容 | 中文对象 / 技术名 | 必填或缺值要求 |
| --- | --- | --- |
| 产品身份 | 厂商Manufacturer、产品系列EquipmentProductFamily、型号EquipmentModel | 稳定身份、中英文名称、官方产品代码、分类、修订；系列可空 |
| 官方差异 | 产品变体EquipmentVariant | 官方卡口、密度、颜色等差异；0到多个，不虚构默认变体 |
| 成像资料 | 成像设备ImagingDevice、内置模组EmbeddedImagingModule、传感器及录制模式 | 归属明确；型号、模组、模式各自参数不得互相覆盖 |
| 官方参数 | 规格定义SpecificationDefinition与规格值SpecificationValue | 类型、单位、适用条件、来源位置及核验状态；未知不冒充0 |
| 连接 | 接口InterfaceDefinition及器材接口连接 | 专业范围、方向、机械/电气/光学/协议约束 |
| 适配 | 兼容关系CompatibilityRelation与路径CompatibilityPath | 宿主范围、必要转接件、条件、功能和官方证据 |
| 配件 | 配件AccessoryModel、转接件AdapterModel、支撑资料SupportComponent | 独立身份；专用配件仅匹配明确宿主，通用配件仍校验安装条件 |
| 套装 | 套装EquipmentBundle及成员关系 | 官方成员与数量；随附不等于全功能兼容 |
| 人工说明 | 独立备注EquipmentNote | 不覆盖官方值、不用于自动兼容判断 |

遮光斗、滤镜架、托盘、镜头连接环和导管支撑必须形成实际安装链。4×5.65黑柔不是可直接拧在镜头前端的圆形滤镜，不能只录滤镜而不交代由谁承载、如何连接及限制条件。

### 2.4 软件能力范围

最少包含 Vendor、Product、VersionScope、CapabilityDefinition、SupportLevel（PRIMARY / SUPPORTED / LIMITED / NOT_SUPPORTED）和官方来源。软件大类不能自动推出能力事实。

### 2.5 格式参考

最少包含 canonical format、类别、容器/编码/序列/工程身份、典型 Produces/Consumes/Imports/Exports/Transcodes relations、官方/规范来源和 revision。格式只保存一份 canonical identity，不建立与 A–H 平行的“格式部门库”。

### 2.6 公式定义

最少包含稳定 ID、输入量、输入单位、输出量、适用条件、公式/转换规则、来源、精度和禁止条件。项目计算结果不写回知识条目。

### 2.7 时间校准

最少包含 source object/revision、planned duration、actual duration/range、work type、aggregate level、measurement quality、project、captured_at。不得记录人员效率、故障原因、设备心得或解决方案。

## 3. 制作常识分类

分类结构由[知识目录](KNOWLEDGE_CATALOG_STRUCTURE_2026-10-05.md)唯一维护，定义由[共享主题目录](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md)唯一维护。本篇不再保留另一套将两项合并的分类表。

构图、运镜、机位、摄影角度、视场角、透视、人物调度、机位调度、动作轴线、180度规则及拍摄准备分别维护；相关知识通过明确关系相连。构图中的留白、运镜中的旋转方向可以在自己的类别下细分，不将独立类别作为另一类的字段包。

独立主题的旧混合编号只作转向，所有使用方选择具体主题；不能把一条旧引用默认为第一个新主题。具体专业增量和组件拆分见[A–H组件目录](AH_KNOWLEDGE_LIBRARY_COMPONENTS_2026-10-05.md)。A–H岗位大类和139个岗位身份保持。

## 4. 分类和引用执行规则

以上是可独立查询的知识维度，具体主题按目录分组。A–H专业库引用同一主题正文，不把全部相关内容复制进“摄影语言”“镜头覆盖”这样的宽泛分类。

分类最大仍为知识库→知识域→专业组件→可选子组件，最多四级；主题不是第五级。器材浏览单独按大类→该类内品牌→型号→资料分组展开；这是检索导航，不增加知识实体深度。变体、数值和单位按结构化字段检索。运镜、空间连续性、现场准备只有关系连接，没有相互的父子关系。

字段是实际数据参数，主题是知识概念，分类是导航组织，三者不得互换。中文名称用于阅读，稳定ID和英文键用于关联；编号前缀不决定主题当前归类。

## 5. 参考对象

### 5.1 知识正文

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

`KnowledgeTopic` 是稳定语义身份；正文进入不可变 `KnowledgeRevision`。Alias 不创建第二个 Topic。

### 5.2 器材身份

```text
Manufacturer
EquipmentCategory
EquipmentProductFamily
EquipmentModel
EquipmentVariant
AccessoryModel
AdapterModel
EquipmentBundle
EquipmentNote
```

厂商明确声明为新的产品世代时建立新 `EquipmentModel`；仅卡口、地区、容量、颜色等官方 SKU/配置差异才进入 Variant。

### 5.3 成像设备

```text
ImagingDevice
EmbeddedImagingModule
SensorDefinition
SensorRecordingMode
LensModel
LensVariant
```

固定镜头设备使用 EmbeddedImagingModule。内置镜头可被 Lens/Optics Knowledge 检索，但不出现在独立 Lens Picker。

多模组设备保持一个成像设备身份，各内置模组分别拥有传感器、光学和录制能力。不可拆换模组不进入独立镜头选择器；真实机型、模组和参数见数据样例。

### 5.4 规格

```text
SpecificationDefinition
SpecificationDefinitionRevision
SpecificationValue
SpecificationValueRevision
UnitDefinition
```

官方规格才进入 SpecificationValue。人工自由备注不限内容，但只能进入 EquipmentNote，不覆盖官方值、不参与官方规格自动筛选/计算。

### 5.5 连接资料

接口按知识 Domain 组织，不建立一个把摄影、灯光、音频所有 mount 混在一起的树：

```text
InterfaceDefinition
EquipmentInterfaceLink
SupportInterfaceDefinition
SupportComponent
QuickReleaseComponent
```

示例 namespace：

- D.Camera.LensMount；
- D.Camera.Video；
- D.Camera.Power；
- D.Camera.Data；
- D.Camera.Control；
- D.CameraSupport.QuickRelease；
- D.CameraSupport.TripodPlate；
- D.CameraSupport.NATO；
- D.CameraSupport.RSA；
- D.Lighting.ModifierMount；
- D.Lighting.Power；
- D.Lighting.Control；
- D.Audio.AudioConnector；
- D.Audio.Power。

USB-C、HDMI 等真实标准可以有一个共享物理 Definition，但每个 Domain 仍保存自己的用途 link。

### 5.6 软件

```text
SoftwareVendor
SoftwareProduct
SoftwareVersionScope
CapabilityDefinition
SoftwareCapabilitySupport
```

具体软件的官方能力优先于“它属于3D/NLE/合成软件”的类别推测。

### 5.7 格式

```text
FormatDefinition
FormatRelation
```

Relation 首批至少：

```text
PRODUCES
CONSUMES
IMPORTS
EXPORTS
TRANSCODES_TO
```

只有一份 canonical FormatDefinition，同时链接 D/F/G/H 等产生或消费它的 Domain。

### 5.8 时间校准

```text
ExperienceObservation
CalibrationTargetLink
EstimateProfile
```

允许 aggregate target：

- Shot total；
- Scene total；
- ShootDay total。

允许 component metric：

- Setup；
- Rehearsal；
- Shoot；
- Reset；
- Strike；
- Company Move；
- Task；
- Post Work。

Aggregate target 与其 component 不得重复作为独立样本相加。

## 6. 关系分类

禁止单个万能 relation 表吞掉所有业务语义。至少区分：

- `KnowledgeRelation`：Topic ↔ Topic；
- `DomainTopicLink`：Domain ↔ Topic；
- `RoleKnowledgeBinding`：JOB_CATALOG role ↔ Domain/Topic；
- `EquipmentInterfaceLink`：Equipment/Variant ↔ Interface；
- `CompatibilityRelation`：Equipment/Interface ↔ Equipment/Interface；
- `SoftwareCapabilitySupport`：SoftwareVersionScope ↔ Capability；
- `FormatRelation`：Domain/Product ↔ Format；
- `CalibrationTargetLink`：Observation/Profile ↔ Shot/Scene/ShootDay/Task/Move/Post type。

## 7. 光学计算

### 7.1 官方值优先

镜头官方 FOV / Angle of View、image circle、T-stop、focus range 等只使用厂商正式资料。禁止保存团队实测值作为官方规格。

### 7.2 公式不是官方事实

查询结果必须带：

```text
value_origin = OFFICIAL | CALCULATED
```

有官方 FOV 时优先显示官方值；没有官方值时，只有适用光学模型、有效成像区域和必要输入齐全才计算。

特殊镜头按厂商定义/投影模型处理，不把 Fisheye、特殊 Anamorphic 强套普通 rectilinear 公式。

### 7.3 有效成像区域

FOV 计算基于当前 Camera Body + SensorRecordingMode 的实际有效成像区域，不只看“Full Frame / S35”营销标签。

### 7.4 变形成像

至少保存：

- physical focal length；
- squeeze ratio；
- sensor/recording window；
- official horizontal/vertical AoV（若有）；
- desqueeze rule。

不使用一个虚假的“等效焦距”覆盖 physical focal length。

## 8. 首批公式定义

- Horizontal / Vertical / Diagonal FOV；
- Anamorphic desqueezed FOV；
- Shutter Angle ↔ Shutter Time；
- Frame Count ↔ Duration；
- Bitrate × Duration → Storage；
- Data Rate；
- DOF；
- Hyperfocal；
- Crop / Equivalent FOV；
- Inverse Square Law；
- Exposure Value；
- ND Stops；
- Lux ↔ foot-candle。

公式只在适用条件满足时执行。

## 9. 项目器材选择

多机位逐 Body 独立计算：

```text
Camera A → Interface/Recording Mode → Lens/Adapter Path A
Camera B → Interface/Recording Mode → Lens/Adapter Path B
```

Project Mount Preference 只影响排序，不改变兼容真相，也不隐藏真实兼容项。

优先级：

```text
Camera Body 实际接口与官方兼容
> 有效 Adapter Path
> Project Mount Preference
```

## 10. 兼容路径

专用配件先校验明确宿主名单，不进入通用接口扩展推导。专用光学配件不得扩展到未被官方名单覆盖的独立镜头。遮光斗、滤镜架、托盘、连接环和支撑件的真实安装路径、条件及超过两层的特例，按[器材字段合同4.29和5节](EQUIPMENT_REFERENCE_FIELD_CONTRACT_2026-10-05.md)完整记录。

CompatibilityRelation 至少：

- DIRECT_COMPATIBLE；
- REQUIRES_ADAPTER；
- INCOMPATIBLE；
- CONDITIONAL_COMPATIBLE。

仅通用接口配件按所属专业范围的接口规则生成候选，厂商明确的型号适配和否定规则优先。专用配件必须命中宿主名单；空名单不是全部兼容。安装、控制、供电与光学功能逐项校验，不能由类别直接推出兼容。

自动推荐路径硬性最多 **2 个 intermediate components**。知识图可以记录经真实拍摄/厂商资料证明的特殊更长路径，但默认组合器不得自动推荐。

Adapter / Accessory 必须保存所有与兼容有关的官方数据，例如：

- mechanical mount；
- electronic communication；
- autofocus；
- aperture control；
- metadata；
- stabilization；
- focus/lens control；
- power；
- video/data/control passthrough。

不能把“机械能装上”等同全部能力兼容。

## 11. 固定镜头设备

选择固定镜头设备后：

- 自动锁定对应 EmbeddedImagingModule / Lens；
- 独立 Lens Picker 不显示该内置镜头；
- 选择不同内置模组时焦距、光圈、Sensor、FOV、Recording Capability 和附件选项同步变化；
- 内置镜头知识同时可在 Optics/Lens 知识检索出现，但身份仍属于设备内部组件。

## 12. 软件能力

首批 CapabilityDefinition 至少：

- 剪辑（`EDITING`）；
- 合成（`COMPOSITING`）；
- 动态图形（`MOTION_GRAPHICS`）；
- 二维动画（`TWO_D_ANIMATION`）；
- 三维建模（`THREE_D_MODELING`）；
- 数字雕刻（`SCULPTING`）；
- 纹理制作（`TEXTURING`）；
- 材质外观开发（`MATERIAL_LOOKDEV`）；
- 绑定（`RIGGING`）；
- 三维动画（`THREE_D_ANIMATION`）；
- 模拟（`SIMULATION`）；
- 灯光（`LIGHTING`）；
- 渲染（`RENDERING`）；
- 实时制作（`REALTIME_PRODUCTION`）；
- 虚拟制作（`VIRTUAL_PRODUCTION`）；
- 调色（`COLOR`）；
- 音频编辑（`AUDIO_EDITING`）；
- 混音（`AUDIO_MIXING`）；
- 字幕本地化（`SUBTITLE_LOCALIZATION`）；
- 图像编辑（`IMAGE_EDITING`）；
- 矢量图形（`VECTOR_GRAPHICS`）；
- 资产管理（`ASSET_MANAGEMENT`）；
- 流程自动化（`PIPELINE_AUTOMATION`）。

不能因为 Blender 属于 3D DCC 就自动推导 `EDITING = NOT_SUPPORTED`；具体产品按官方能力录入。

## 13. 首批格式定义

### 13.1 媒体容器

MOV、MP4、MXF。

### 13.2 摄影原始格式

R3D、BRAW、ARRIRAW、CinemaDNG。

### 13.3 编码格式

ProRes、DNxHR、H.264、H.265。

### 13.4 图像格式

EXR、DPX、TIFF、PNG、JPEG。

### 13.5 音频

WAV。

### 13.6 字幕

SRT。

### 13.7 工程交换格式

OTIO、EDL、XML。

Format 仍只有一份 canonical identity；D/F/G/H 通过 PRODUCES / CONSUMES / IMPORTS / EXPORTS / TRANSCODES_TO 关联。

## 14. 时间校准来源

时间校准首先读取：

1. Call Sheet / Schedule 中的 planned duration；
2. 制作表/Task 的 estimate；
3. ScheduleItem / Task / Production execution Actual。

不按 Person 聚合效率。

```text
ShootDay aggregate
→ Scene aggregate
→ Shot aggregate
→ Setup / Rehearsal / Shoot / Reset / Strike

Company Move

Task
Post Work
```

高层 aggregate 用于排期预测，但不能与组成 component 重复累计为样本。

## 15. 具体器材数据的维护入口

真实品牌、型号、参数与安装组合全部在[真实数据样例](REFERENCE_SEED_DATA_2026-10-05.md)维护；首批范围及尚缺资料也归该篇，不在类别文档重复。每个对象先写所属大类，再展开品牌、型号、变体、字段和子项；连接两端均保留完整所属路径。

类别的字段与支持内容见[知识目录规则](KNOWLEDGE_CATALOG_STRUCTURE_2026-10-05.md)，字段定义见[器材字段合同](EQUIPMENT_REFERENCE_FIELD_CONTRACT_2026-10-05.md)。接口字段复用不等于混建品牌总库。

## 16. 具体软件数据的维护入口

软件真实产品、版本范围、官方能力与证据在数据样例维护。本篇第12节只定义能力分类；能力的产生、消费、导入、导出与转换方向分别核实。设备格式、软件能力和格式定义各自归属，不能相互授予支持。

## 17. Seed 数据质量规则

1. 具体产品只能以 Manufacturer 官方页面、官方 specs、官方 manual、官方 compatibility list 为结构化规格来源；
2. 官方页面更新时记录新的 source_version/accessed_at，不保存网页证据快照；
3. 没有官方数据的字段保持 UNKNOWN；
4. 不录团队实测规格；
5. 人工 Note 不限内容，但永远不覆盖 SpecificationValue，也不参与官方兼容推导；
6. 专用配件先检查明确宿主名单；通用接口只能产生候选，具体型号限制、否定规则和必要条件全部校验后才确认兼容；
7. 自动兼容路径最多两个 intermediate components；
8. 任何转接推荐必须引用现实存在且已建模的 AdapterModel；
9. 固定镜头/内置模块不能被独立 Lens Picker 替换；
10. 官方原值、计算结果、系统分类、人工备注分开；值来源、核验状态、资料完整程度、链接访问状态独立保存；
11. 软件 capability 按具体产品/版本范围，不按软件类别猜；
12. Seed 完成的验收不是“名字录进去了”，而是该产品适用的官方规格、接口、附件、兼容和格式能力都被结构化覆盖。

## 18. 岗位专业知识关联

按[岗位目录](ROLE_KNOWLEDGE_CATALOG_2026-10-05.md)的稳定岗位编号和A–H专业知识域，连接专业组件、所属大类与知识主题。跨专业关联说明输入、输出、交接、支撑、协同或对照原因，不把相关知识合并成父子类。规则与字段见[知识目录的岗位专业关联节](KNOWLEDGE_CATALOG_STRUCTURE_2026-10-05.md)。所有入口引用同一正文修订，不授予权限，也不自动创建任务。
