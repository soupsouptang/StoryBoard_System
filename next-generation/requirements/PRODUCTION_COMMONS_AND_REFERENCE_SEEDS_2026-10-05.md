> **下一代业务定义，尚未实施。** 本文件定义先于 A–H 各专业小库建设的“制作常识库”、基础知识内容模板、基础大类知识、公式/关系模型，以及首批器材、软件和格式 seed。正式实现仍须按对应官方来源重新读取并写入数据库；本文不是运行数据库快照。

# FrameForge 制作常识库、基础大类知识与首批 Seed Catalog

版本：1.2，2026-10-05。状态：已确认规划合同，尚未实施。首批常识正文见 [制作常识 Topic Catalog](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md)，A–H组件与跨组件关系见 [A–H知识小库组件](AH_KNOWLEDGE_LIBRARY_COMPONENTS_2026-10-05.md)，已填官方结构化数据见 [首批 Reference Seed Data](REFERENCE_SEED_DATA_2026-10-05.md)。

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

### 2.1 Concept Topic

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

### 2.2 Method / Principle

最少包含目标、核心原理、适用条件、判断维度、边界和关联 Topic。只解释专业原理，不写按钮路径、快捷键或逐步 SOP。

### 2.3 Equipment Model

最少包含 Manufacturer、Product Family、Model、Variant、EquipmentCategory、官方来源、官方结构化规格、Interface、Compatibility、Accessory/Adapter relation 和人工 Note。官方 SpecificationValue 与 EquipmentNote 必须分离。

### 2.4 Software Scope

最少包含 Vendor、Product、VersionScope、CapabilityDefinition、SupportLevel（PRIMARY / SUPPORTED / LIMITED / NOT_SUPPORTED）和官方来源。软件大类不能自动推出能力事实。

### 2.5 Format Reference

最少包含 canonical format、类别、容器/编码/序列/工程身份、典型 Produces/Consumes/Imports/Exports/Transcodes relations、官方/规范来源和 revision。格式只保存一份 canonical identity，不建立与 A–H 平行的“格式部门库”。

### 2.6 Formula Definition

最少包含稳定 ID、输入量、输入单位、输出量、适用条件、公式/转换规则、来源、精度和禁止条件。项目计算结果不写回知识条目。

### 2.7 Time Calibration

最少包含 source object/revision、planned duration、actual duration/range、work type、aggregate level、measurement quality、project、captured_at。不得记录人员效率、故障原因、设备心得或解决方案。

## 3. 制作常识库首批 Topic

### 3.1 镜头语言与覆盖

- Scene / Shot；
- Establishing / Master / Coverage / Insert / Reaction / OTS / Two Shot / POV；
- Blocking、Rehearsal、Setup、Shoot、Reset、Strike；
- 180° Axis、Screen Direction、Eyeline Match、30° Rule、Match on Action。

### 3.2 摄影角度、视场角与透视必须分离

以下三个 Topic 永远独立：

1. `CAMERA_ANGLE`：摄影角度/机位高度与方向；
2. `FIELD_OF_VIEW`：由光学、有效成像区域及具体镜头数据决定的视场；
3. `PERSPECTIVE`：主要由摄影机与被摄物的空间位置关系决定。

必须建立 typed relation，但不得写成“焦距直接决定透视”。

同一机位、同一有效成像区域下，35mm 与 50mm 首先改变 FOV/取景范围；若为保持相同构图而改变 Camera Position，则 Perspective 随空间关系改变。

对于同标称焦距但光学设计不同的镜头，优先使用厂商官方 Angle of View / projection 数据；没有官方值时只能在适用模型成立时产生 `CALCULATED` 值，不能冒充 `OFFICIAL`。

### 3.3 成像与镜头 Topic

- Physical Focal Length；
- Effective Imaging Area / Sensor Recording Window；
- Image Circle / Coverage；
- Prime / Zoom；
- F-number；
- T-stop；
- Iris；
- Transmission；
- Focus Distance；
- Minimum Focus Distance；
- Rack Focus；
- Focus Breathing；
- Depth of Field；
- Hyperfocal；
- Circle of Confusion；
- Diffraction；
- Rectilinear / Fisheye；
- Spherical / Anamorphic；
- Squeeze Ratio / Desqueeze；
- Horizontal / Vertical / Diagonal FOV。

F-number 与 T-stop 是独立物理量，不能用一个 `aperture` 字段混写。

### 3.4 运镜与“放大”必须拆型

Camera Movement：

- Pan / Tilt / Roll；
- Pedestal；
- Truck / Track；
- Dolly In / Out；
- Arc / Orbit；
- Crane / Jib；
- Handheld / Shoulder / Tripod Head / Gimbal / Steadicam / Drone。

放大/取景变化单独拆为：

| 类型 | 机位 | 焦距/光学 | 阶段 |
| --- | --- | --- | --- |
| Spatial Push / Dolly | 改变 | 不变 | 拍摄 |
| Optical Zoom | 不变 | 改变 | 拍摄 |
| Dolly Zoom / Mixed | 改变 | 改变 | 拍摄 |
| In-camera Digital Crop/Zoom | 不变 | 电子裁切/数字 | 拍摄 |
| Post Reframe / Digital Zoom | 不变 | 后期裁切/缩放 | 后期 |

前期电子放大和后期放大必须是不同 Topic / operation。

### 3.5 曝光与时间

- Exposure；
- ISO；
- EI；
- Gain；
- Shutter Speed / Exposure Time；
- Shutter Angle；
- ND / Stops；
- Exposure Value；
- Frame Rate；
- Project FPS / Capture FPS / Playback FPS；
- Motion Blur；
- Overcrank / Undercrank。

转换规则：

- Shutter Angle ↔ Shutter Time：只有 FPS 已知时自动换算；
- F-number ↔ T-stop：只有厂商提供相应 transmission / 对应官方数据时转换；
- ISO / EI / Gain：只按具体机型、模式的官方 mapping 转换，禁止全局通用换算；
- UI 可以切换默认显示单位/方式，但底层保留原始量、来源与转换依据。

### 3.6 灯光

- Key / Fill / Back；
- Hard / Soft；
- Source Size；
- Direction；
- Distance；
- Contrast Ratio；
- Inverse Square Law；
- CCT / Tint；
- Modifier / Projection / Fresnel / Softbox / Grid；
- Lighting Modifier Interface；
- Lighting Power / Control Interface。

### 3.7 色彩与数据流

共享基础 Topic：

- White Balance；
- Color Space；
- Transfer Function；
- Gamma；
- Log；
- Linear；
- LUT；
- Bit Depth；
- Chroma Sampling；
- SDR / HDR；
- Rec.709；
- Rec.2020；
- sRGB；
- Display P3；
- Gamma 2.4；
- ST2084 / PQ；
- HLG；
- ACES；
- RED IPP2 / Log3G10。

共享 Topic 之外，必须再建立阶段数据流 Domain：

- D.Camera Recording Pipeline；
- F.Composite Color Pipeline；
- G.Render Color Pipeline；
- H.Post / Delivery Color Pipeline。

颜色基础不归 H 独占。

### 3.8 声音与同步

- Microphone Type / Pickup Pattern；
- Boom / Lav；
- Mic Level / Line Level；
- Sample Rate；
- Audio Bit Depth；
- Timecode / Sync；
- Production Sound / Dialogue / Music / SFX / Mix。

### 3.9 媒体、格式与后期

基础概念：

- Container；
- Codec；
- Image Sequence；
- Project Interchange；
- Proxy / Original / Preview / Master；
- Metadata；
- Offload / Integrity / Backup / Formal Handoff；
- Editing / Conform / Compositing / Color / Sound / Online / QC / Delivery；
- Alpha / Matte / Keying / Roto / Tracking / Cleanup；
- Mesh / Topology / UV / Material / Shader / Rig / Animation / Simulation / Cache / Render / AOV；
- Realtime Rendering / Virtual Camera / Virtual Production。

## 4. 基础大类知识

Common Topic 不能直接堆成一张无限列表，先按以下大类建立稳定 Domain；后续 A–H 小库引用这些 Domain，不复制 Topic 正文：

1. Narrative & Coverage；
2. Camera Angle / Composition / Spatial Perspective；
3. Optics / Lens / Imaging Geometry；
4. Camera Movement / Framing Change；
5. Exposure / Capture Time；
6. Lighting / Photometry / Color Temperature；
7. Color Science / Image Pipeline；
8. Production Sound / Sync；
9. Media / Codec / Format / Metadata；
10. Production Workflow / Schedule / Handoff；
11. 2D / Motion / Compositing；
12. 3D / VFX / Realtime；
13. Formula / Unit / Derived Calculation；
14. Equipment Interface / Compatibility；
15. Time Calibration。

这些是“基础知识大类”，不是项目 Department，也不等同 A–H 专业小库。

## 5. 基础对象进一步拆分

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
EquipmentNote
```

新一代 / Mark II / II / Pro 等厂商视为新世代时建立新 `EquipmentModel`；仅卡口、地区、容量、颜色等官方 SKU/配置差异才进入 Variant。

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

Mavic 4 Pro 仍是一个 ImagingDevice；三个内置摄像模组作为三个可选择 EmbeddedImagingModule，各自拥有 sensor / focal / aperture / recording capability。

Osmo Pocket 4 是一个 ImagingDevice + 两个可切换但不可拆换的 EmbeddedImagingModule；当前官方资料确认广角20mm等效f/2.0与中长焦60mm等效f/1.8。选择机身后只能在内置模组间切换，独立 Lens Picker 不可替换镜头。

### 5.4 规格

```text
SpecificationDefinition
SpecificationDefinitionRevision
SpecificationValue
SpecificationValueRevision
UnitDefinition
```

官方规格才进入 SpecificationValue。人工自由备注不限内容，但只能进入 EquipmentNote，不覆盖官方值、不参与官方规格自动筛选/计算。

### 5.5 接口与支撑

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

## 6. Relation 分类

禁止单个万能 relation 表吞掉所有业务语义。至少区分：

- `KnowledgeRelation`：Topic ↔ Topic；
- `DomainTopicLink`：Domain ↔ Topic；
- `RoleKnowledgeBinding`：JOB_CATALOG role ↔ Domain/Topic；
- `EquipmentInterfaceLink`：Equipment/Variant ↔ Interface；
- `CompatibilityRelation`：Equipment/Interface ↔ Equipment/Interface；
- `SoftwareCapabilitySupport`：SoftwareVersionScope ↔ Capability；
- `FormatRelation`：Domain/Product ↔ Format；
- `CalibrationTargetLink`：Observation/Profile ↔ Shot/Scene/ShootDay/Task/Move/Post type。

## 7. 光学与派生值

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

### 7.4 Anamorphic

至少保存：

- physical focal length；
- squeeze ratio；
- sensor/recording window；
- official horizontal/vertical AoV（若有）；
- desqueeze rule。

不使用一个虚假的“等效焦距”覆盖 physical focal length。

## 8. FormulaDefinition 首批

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

## 9. 多机位、镜头选择与项目卡口偏好

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

CompatibilityRelation 至少：

- DIRECT_COMPATIBLE；
- REQUIRES_ADAPTER；
- INCOMPATIBLE；
- CONDITIONAL_COMPATIBLE。

兼容推导以 Interface 为主；厂商明确 Camera/Lens/Accessory Compatibility 作为 model-level assertion / override。

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

## 11. 固定镜头与内置模块

选择固定镜头设备后：

- 自动锁定对应 EmbeddedImagingModule / Lens；
- 独立 Lens Picker 不显示该内置镜头；
- 选择不同内置模组时焦距、光圈、Sensor、FOV、Recording Capability 和附件选项同步变化；
- 内置镜头知识同时可在 Optics/Lens 知识检索出现，但身份仍属于设备内部组件。

## 12. 软件能力

首批 CapabilityDefinition 至少：

- EDITING；
- COMPOSITING；
- MOTION_GRAPHICS；
- TWO_D_ANIMATION；
- THREE_D_MODELING；
- SCULPTING；
- TEXTURING；
- MATERIAL_LOOKDEV；
- RIGGING；
- THREE_D_ANIMATION；
- SIMULATION；
- LIGHTING；
- RENDERING；
- REALTIME_PRODUCTION；
- VIRTUAL_PRODUCTION；
- COLOR；
- AUDIO_EDITING；
- AUDIO_MIXING；
- SUBTITLE_LOCALIZATION；
- IMAGE_EDITING；
- VECTOR_GRAPHICS；
- ASSET_MANAGEMENT；
- PIPELINE_AUTOMATION。

不能因为 Blender 属于 3D DCC 就自动推导 `EDITING = NOT_SUPPORTED`；具体产品按官方能力录入。

## 13. 首批 FormatDefinition

### 13.1 Container

MOV、MP4、MXF。

### 13.2 Camera RAW / Acquisition

R3D、BRAW、ARRIRAW、CinemaDNG。

### 13.3 Codec / Intermediate

ProRes、DNxHR、H.264、H.265。

### 13.4 Image Sequence / Still

EXR、DPX、TIFF、PNG、JPEG。

### 13.5 Audio

WAV。

### 13.6 Subtitle

SRT。

### 13.7 Editorial / Project Interchange

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

## 15. 首批 Reference Seed

原则：实施时必须重新读取官方页面/手册并尽可能全量写入该对象类别可表达的官方参数、接口、附件和兼容关系。本文只固定对象范围和已核实的关键身份，避免规划文档变成过期的手抄规格表。

### 15.1 RED

#### RED KOMODO 6K（仅原版）

Seed 至少包括：

- KOMODO 6K body；
- Super 35 global-shutter sensor；
- active sensor size / recording modes；
- RF mount；
- R3D / ProRes recording capability；
- RED/Canon 官方明确兼容的 RF→PL、RF→EF 等 adapter relation；
- 对 adapter 的电子通信/metadata 等能力按官方资料分别保存；
- RED 官方 KOMODO accessory relation。

官方 seed source：
- https://www.red.com/komodo
- https://www.red.com/komodo-brain-parent
- https://docs.red.com/955-0196/955-0196_V1.7%20Rev-B%20RED%20PS%2C%20KOMODO%20Operation%20Guide%20HTML/Content/A_TechSpecs/Specs_KOMODO_6K.htm

不顺带建立 KOMODO-X。

### 15.2 ZEISS Compact Prime CP.3

完整官方焦段系列建立独立 LensModel：

- 15mm T2.9；
- 18mm T2.9；
- 21mm T2.9；
- 25mm T2.1；
- 28mm T2.1；
- 35mm T2.1；
- 50mm T2.1；
- 85mm T2.1；
- 100mm T2.1 CF；
- 135mm T2.1。

每支镜头保存官方 Close Focus、Length、Front Diameter、Weight，以及 ZEISS 提供的 Full Frame / APS-H / Super 35 / Normal 35 / APS-C / MFT Horizontal Angle of View。Mount Variant 从 ZEISS 官方 mount-change 文档建立，不按名称猜。

官方 seed source：
- https://www.zeiss.com/content/dam/consumer-products/downloads/cinematography/brochures/en/brochure-zeiss-compact-prime-cp3-lenses.pdf

### 15.3 DJI Osmo Pocket 4

一个 ImagingDevice + 两个可切换 EmbeddedImagingModule，镜头均固定在设备内部：

- Wide Module：1-inch CMOS、20mm format equivalent、f/2.0、focus 0.09m–∞；
- Medium-Tele Module：1/1.28-inch CMOS、60mm format equivalent、f/1.8、focus 0.20m–∞；
- 两个内置镜头都不出现在独立 Lens Picker；
- 切换内置模组时 Sensor、Focal、Aperture、FOV/recording capability 与相关附件能力同步变化；
- 完整 ISO / shutter / codec / recording-mode matrix 只从 DJI 官方详细规格继续补，不根据旧 Pocket 型号推断。

官方 seed source：
- https://store.dji.com/ca/product/osmo-pocket-4
- https://store.dji.com/ca/event/dji-osmo-pocket-series

### 15.4 DJI Mavic 4 Pro

一个 ImagingDevice，建立三个可选择 EmbeddedImagingModule。每个模组分别保存官方 Sensor、Lens/Focal、Aperture、FOV/recording capability、codec/color capability 和支持的拍摄模式。机型本身不拆成三个 EquipmentModel。

官方 seed source：
- https://www.dji.com/mavic-4-pro/specs

### 15.5 DJI RS 5

Seed 至少包括：

- gimbal body；
- upper/lower quick-release plate；
- quick-open tripod；
- RSA/NATO；
- 1/4"-20；
- cold shoe；
- USB-C camera control / multifunction；
- official payload；
- Electronic Briefcase Handle；
- Enhanced Intelligent Tracking Module；
- Focus Pro / motor / transmission 等官方 support relations；
- DJI Camera & Lens Compatibility 的 model-level assertions。

Camera/Lens compatibility 以 DJI 官方 Compatibility Search 为 override，不只靠 payload 推断。

官方 seed source：
- https://www.dji.com/rs-5/specs
- https://www.dji.com/support/compatibility

### 15.6 DJI Focus Pro

建立独立组件：

- Focus Pro LiDAR；
- Focus Pro Grip；
- Focus Pro Hand Unit；
- Focus Pro Motor；
- 官方 Combo / AMF system bundle；
- cables / mounts / accessory relations；
- Camera/Lens support assertions。

官方 seed source：
- https://www.dji.com/focus-pro
- https://www.dji.com/focus-pro/downloads

### 15.7 DJI Transmission

建立：

- DJI Video Transmitter；
- DJI Video Receiver；
- DJI High-Bright Remote Monitor；
- Standard Combo；
- High-Bright Monitor Combo；
- WB37 / cable hub / official accessory support。

Combo 是 bundle，不是能力 owner。

官方 seed source：
- https://www.dji.com/transmission
- https://www.dji.com/transmission/downloads

### 15.8 DJI SDR Transmission

建立：

- SDR Transmitter；
- SDR Receiver；
- Combo；
- SDI / HDMI / USB-C / audio / power interfaces；
- Camera compatibility / Ronin support / adapter support。

官方 seed source：
- https://www.dji.com/sdr-transmission/specs
- https://www.dji.com/downloads/products/sdr-transmission

### 15.9 Nanlite

首批具体 EquipmentModel：

- Forza 200（旧款）；
- Forza 300B（旧款）；
- FC-120B；
- FC-300B；
- PavoTube II 15C。

同时录入这些型号官方配套：

- native modifier mount；
- Bowens adapter（如官方提供）；
- reflector / Fresnel / softbox / projection attachment；
- battery/power accessory；
- DMX/RDM / NANLINK 等控制 interface；
- stands/clamps/cases 只在官方明确兼容时建立 support relation。

FC-120B 以官方资料建立：原生 FM Mount，Bowens adapter 为明确中间件；不能把 Bowens 当成 FC-120B 原生 mount。

官方 seed source：
- https://www.nanlite.com/product-forza-200
- Nanlite/Nanlite US Forza 500/300/200 legacy collection / archived official product material
- https://nanliteus.com/products/fc-120b-bi-color-led-spotlight-testing-1
- https://nanliteus.com/brands/FC-Series.html
- https://nanliteus.com/collections/pavotube-ii-c

### 15.10 Aputure

首批：

- STORM 1200x；
- ProLock Bowens / Bowens modifier interface；
- reflector / Fresnel / projection / softbox 等官方兼容附件；
- power/control interfaces；
- DMX / CRMX / Art-Net / sACN 等官方控制能力；
- official support/accessory relations。

官方 seed source：
- https://aputure.com/en-US/products/storm-1200x

### 15.11 Tiffen

首批 Product Family：

- Black Pro-Mist 4×5.65"；
- Pro-Mist 4×5.65"。

保存官方全部 Density Variant，不只常用档。Form Factor 和 Density 分开建模。

官方 seed source：
- https://tiffen.com/products/4-x-5-65-black-pro-mist-filter
- Tiffen 官方 4×5.65 Pro-Mist product catalog / product page。

### 15.12 通用 Camera / Lighting Support 常识

首批只建通用 Category / Topic / Interface，不虚构具体品牌 Model：

- Tripod；
- Fluid Head；
- Quick Release Plate；
- Camera Plate；
- NATO；
- RSA；
- 1/4"-20；
- 3/8"-16；
- Light Stand；
- C-Stand；
- Boom / 三节摇；
- Baby Pin / Junior Receiver 等在正式官方/标准来源确认后逐项进入接口库。

Tilta/铁头三脚架未指定具体型号前不建立具体 EquipmentModel。

## 16. 首批 Software Seed

### Blender

记录具体官方 Capability Scope；不能因其主要是 3D DCC 就自动标记 Editing 不支持。至少覆盖 Modeling、Sculpting、Animation、Simulation、Rendering、Compositing、Video Editing 等官方能力范围。

### Unreal Engine 5

至少覆盖 Realtime Production、Virtual Production、Realtime Rendering、3D scene / animation / simulation 等官方能力范围。

### Adobe After Effects

至少覆盖 Compositing、Motion Graphics、2D Animation、Tracking/Keying 等官方能力范围；不把它声明为完整 NLE。

不建立软件教程或“某版本新增按钮”知识。

## 17. Seed 数据质量规则

1. 具体产品只能以 Manufacturer 官方页面、官方 specs、官方 manual、官方 compatibility list 为结构化规格来源；
2. 官方页面更新时记录新的 source_version/accessed_at，不保存网页证据快照；
3. 没有官方数据的字段保持 UNKNOWN；
4. 不录团队实测规格；
5. 人工 Note 不限内容，但永远不覆盖 SpecificationValue，也不参与官方兼容推导；
6. Interface inference 为主，官方 model compatibility 为 override；
7. 自动兼容路径最多两个 intermediate components；
8. 任何转接推荐必须引用现实存在且已建模的 AdapterModel；
9. 固定镜头/内置模块不能被独立 Lens Picker 替换；
10. Derived 值明确标 OFFICIAL / CALCULATED；
11. 软件 capability 按具体产品/版本范围，不按软件类别猜；
12. Seed 完成的验收不是“名字录进去了”，而是该产品适用的官方规格、接口、附件、兼容和格式能力都被结构化覆盖。
