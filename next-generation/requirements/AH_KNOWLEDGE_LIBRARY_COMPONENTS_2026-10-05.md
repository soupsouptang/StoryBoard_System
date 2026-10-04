> **下一代业务定义，尚未实施。** 本文件在共享制作常识 Topic Catalog 之上定义 A–H 八个专业知识小库的首批“组件”。组件不是最终树层级，也不是页面；它们是可维护、可跨库引用的专业知识边界。

# FrameForge A–H 专业知识小库组件与跨组件关系

版本：1.0，2026-10-05。状态：组件范围合同，尚未锁定最终 Domain 深度。

配套：[制作常识 Topic Catalog](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md)、[岗位驱动知识目录](ROLE_KNOWLEDGE_CATALOG_2026-10-05.md)、[工种目录](JOB_CATALOG_DEFINITIONS_2026-10-05.md)。

## 1. 组件原则

1. A–H 是八个专业 KnowledgeLibrary，不等同项目 Department。
2. 每个 Component 只有自己的专业知识增量；景深、FOV、Timecode、Alpha、Task 等共享常识只引用 PC-* Topic，不复制定义。
3. Component 可跨 Library 互相关联，不要求通过共同父节点才能建立关系。
4. Component 可以被多个岗位绑定；岗位绑定不是权限。
5. 组件间使用明确的 INPUT / OUTPUT / SUPPORT / COORDINATES_WITH / REVIEWS / HANDOFF_TO / REFERENCES relation。
6. 本版只定义组件边界和跨组件关系，不决定 UI 菜单层数和数据库树深。
7. 后续若某组件内容过大，可拆 Subcomponent；拆分不能复制 canonical Topic。

## 2. A｜项目管理与制片

| ID | Component | 专业内容 | 主要共享常识 |
| --- | --- | --- | --- |
| KLC-A01 | Project Intake & Requirement Coordination | 需求接收、澄清、版本、确认对象、反馈归并 | PC-WF-001/002/004/005/006 |
| KLC-A02 | Production Organization | Production、团队、岗位、主责/协作、工作范围组织 | PC-WF-001/002 |
| KLC-A03 | Task & Dependency Coordination | Task实例、依赖、输入、交接、blocked/stale语义 | PC-WF-001/002/003/013 |
| KLC-A04 | Schedule Coordination | SchedulePlan、ShootDay、ScheduleItem、锁定/冲突、Actual重排 | PC-WF-004—010 |
| KLC-A05 | Call Sheet Coordination | Draft、Published Revision、个人Call Time、重确认边界 | PC-WF-011/012 |
| KLC-A06 | External Collaboration | 外协工作包、输入输出、版本固定、回收与验收 | PC-WF-001/003/016/017 |
| KLC-A07 | Review & Delivery Coordination | Review、返工、补拍、QC、Deliverable与交付事实 | PC-WF-016—019、PC-MED-015/016 |
| KLC-A08 | Media Handoff Coordination | 素材正式交接条件、接收状态与后期输入 | PC-MED-005—013 |
| KLC-A09 | Production Time Calibration | 通告/排期/制作表 planned vs Actual 的粗粒度校准 | PC-TIME-* |
| KLC-A10 | Production Documentation | 项目范围内版本、说明、发布资料和历史引用 | PC-MED-009、PC-WF-004—006 |

## 3. B｜策划、内容与导演

| ID | Component | 专业内容 | 主要共享常识 |
| --- | --- | --- | --- |
| KLC-B01 | Creative Direction | 创意目标、语气、受众表达、内容方向 | Narrative commons |
| KLC-B02 | Script & Scene Structure | 剧本、Scene、人物行动、对白与场景组织 | PC-NAR-001/002 |
| KLC-B03 | Research & Source | 内容研究、事实来源、引用与不确定性 | KnowledgeSource/SourceReference |
| KLC-B04 | Interview Design | 采访目标、对象、提纲、问题结构与内容回收 | PC-NAR-010/011 |
| KLC-B05 | Directing & Blocking | 导演意图、表演调度、机位协同 | PC-NAR-010、PC-CAM-* |
| KLC-B06 | Coverage Design | 建立、Master、Coverage、Insert、Reaction、OTS、POV | PC-NAR-003—009 |
| KLC-B07 | Continuity & Script Supervision | 轴线、屏幕方向、视线、动作连续性、实际记录 | PC-NAR-016—020 |
| KLC-B08 | Live-action Storyboard | 面向实拍的构图、角度、运镜、焦段意图和时长 | PC-CAM-*、PC-MOV-* |
| KLC-B09 | VFX Storyboard | 面向数字后期/特效输入的镜头拆解和前后景关系 | PC-2D-*、PC-3D-* |
| KLC-B10 | Animatic | 分镜序列、节奏、粗时长、声音参考 | PC-EXP-010—013、PC-MED-* |
| KLC-B11 | General Previs | 与具体3D执行解耦的镜头/空间/时长预演 | PC-CAM-*、PC-MOV-* |
| KLC-B12 | Post Story Structure | 依据已有素材重新组织结构、节奏与信息 | PC-MED-005—008/014 |

## 4. C｜视觉设计与美术

| ID | Component | 专业内容 | 主要共享常识 |
| --- | --- | --- | --- |
| KLC-C01 | Visual Direction | 整体视觉语言、质感、色彩、形式一致性 | PC-COL-*、composition commons |
| KLC-C02 | Live-action Art Direction | 实拍美术总体方案、空间、材质、场景状态 | PC-CAM-014/020、PC-LGT-* |
| KLC-C03 | Set & Environment Design | 场景/布景/环境视觉方案与制作输入 | spatial perspective commons |
| KLC-C04 | Prop Design | 道具造型、尺寸、状态、连续性和镜头需求 | PC-NAR-014/020 |
| KLC-C05 | Live-action Graphic | 实拍中出现的平面、包装、标识、屏幕内容等 | format/color commons |
| KLC-C06 | Digital Visual Design | 后期数字画面的版式、风格和图形方案 | PC-2D-*、PC-COL-* |
| KLC-C07 | Concept Art | 人物/场景/镜头视觉概念与参考 | PC-CAM-*、PC-COL-* |
| KLC-C08 | Illustration | 插画风格、构图、输出与后续动画/合成输入 | PC-2D-* |
| KLC-C09 | Character Visual Development | 动画/数字人物造型、形态和视觉连续性 | PC-2D/3D commons |
| KLC-C10 | Typography & Title Design | 字体、标题、版式和文字视觉 | PC-2D-008/009 |
| KLC-C11 | Information Graphics | 信息结构、视觉层级、静态/动态信息图方案 | PC-2D-008 |
| KLC-C12 | Product Styling | 产品画面状态、摆位、反射、连续性 | PC-CAM-*、PC-LGT-* |
| KLC-C13 | Food Styling | 食品画面状态、连续性、镜头与灯光协同 | PC-CAM-*、PC-LGT-* |

## 5. D｜摄影、灯光、录音与现场

### 5.1 Camera / Optics

| ID | Component | 专业内容 | 主要共享常识 |
| --- | --- | --- | --- |
| KLC-D01 | Cinematography Language | 摄影语言、机位、构图、视角与画面目标 | PC-CAM-* |
| KLC-D02 | Camera Body & Recording Mode | Sensor、active area、frame rate、codec、color pipeline、接口 | PC-OPT-002、PC-EXP-*、PC-COL-021、PC-MED-* |
| KLC-D03 | Lens & Optical System | 焦距、F/T-stop、coverage、focus、anamorphic、官方AoV | PC-OPT-* |
| KLC-D04 | Focus | 对焦目标、MFD、Rack Focus、DOF、Focus Control | PC-OPT-011—017 |
| KLC-D05 | Camera Movement | Pan/Tilt/Dolly/Track/Orbit/Jib等画面运动 | PC-MOV-* |
| KLC-D06 | Camera Support | Tripod、Fluid Head、Quick Release、NATO/RSA、Gimbal等支撑/接口 | PC-IF-* |
| KLC-D07 | Aerial Imaging | Drone内置模组、航拍机位和素材能力 | PC-MOV-012、EmbeddedImagingModule |
| KLC-D08 | Product / Macro Imaging | 产品与近距离成像、MFD/DOF/反射控制 | PC-OPT-*、PC-LGT-* |

### 5.2 Lighting / Power

| ID | Component | 专业内容 | 主要共享常识 |
| --- | --- | --- | --- |
| KLC-D09 | Lighting Design | Key/Fill/Back、光质、方向、反差 | PC-LGT-001—012 |
| KLC-D10 | Lighting Fixture | 灯具输出、CCT、控制、原生modifier接口、附件 | PC-LGT-*、PC-IF-* |
| KLC-D11 | Lighting Modifier | Softbox、Fresnel、Projection、Grid等及兼容路径 | PC-LGT-013—017、PC-IF-* |
| KLC-D12 | Lighting Support | Light Stand、C-Stand、Boom、Pin/Receiver等 | PC-IF-* |
| KLC-D13 | Power & Distribution | 功率、供电接口、负载、供电关系与风险提示 | Power Interface / Formula |

### 5.3 Sound / DIT / Set

| ID | Component | 专业内容 | 主要共享常识 |
| --- | --- | --- | --- |
| KLC-D14 | Production Sound | 现场录音、话筒类型、Boom/Lav、信号级别 | PC-AUD-* |
| KLC-D15 | Wireless / Audio Interface | 无线音频、输入输出、供电和设备兼容 | PC-IF-*、PC-AUD-* |
| KLC-D16 | Timecode & Sync | Camera/Recorder/多机同步和时间码 | PC-AUD-009/010 |
| KLC-D17 | DIT & Camera Data | Camera original、offload、metadata、proxy、色彩参考 | PC-MED-*、PC-COL-021 |
| KLC-D18 | Integrity / Backup / Media Handoff | 校验、备份验证、正式交接 | PC-MED-010—013 |
| KLC-D19 | Location & Set Coordination | 场地、机位、人员、现场执行和限制信息 | PC-WF-* |
| KLC-D20 | Multi-camera Coordination | 多Body独立镜头/adapter路径、同步和素材身份 | PC-AUD-010、CompatibilityPath |
| KLC-D21 | Teleprompter | 提词内容、位置、反射/机位和表演配合 | camera support commons |
| KLC-D22 | BTS / Still Photography | 花絮/剧照与主拍摄的范围、素材和版本分离 | media commons |

## 6. E｜出镜、表演与造型

| ID | Component | 专业内容 | 主要共享常识 |
| --- | --- | --- | --- |
| KLC-E01 | Casting | Character↔Person、候选、确认、档期、出镜需求 | identity/workflow commons |
| KLC-E02 | Acting | 角色目标、表演状态、镜头覆盖和连续性 | PC-NAR-* |
| KLC-E03 | Extras / Crowd | 群演组织、画面分布、连续性 | blocking/coverage |
| KLC-E04 | Modeling / Presentation | 产品/人物展示、动作、镜头与造型配合 | camera/lighting commons |
| KLC-E05 | Host / Presenter | 主持串联、口播、机位/提词协同 | PC-NAR-*、KLC-D21 |
| KLC-E06 | Interview Performance | 采访对象/主持互动、视线和收声 | PC-CAM-*、PC-AUD-* |
| KLC-E07 | Voice Performance | 旁白/配音文本版本、表演意图和录制输入 | PC-AUD-* |
| KLC-E08 | Performance Direction | 动作、情绪、节奏和导演协同 | KLC-B05 |
| KLC-E09 | Stunt / Action | 动作设计、镜头覆盖、技术配合和风险提示 | KLC-B06、KLC-D05 |
| KLC-E10 | Dance / Choreography | 舞蹈/节奏/空间走位与机位协同 | Blocking/Camera Movement |
| KLC-E11 | Costume | 服装造型、Scene/Shot连续性和状态 | continuity commons |
| KLC-E12 | Makeup | 化妆状态、连续性、灯光/摄影影响 | continuity/color commons |
| KLC-E13 | Hair | 发型状态、连续性和镜头关系 | continuity commons |
| KLC-E14 | Character Styling | 服装/妆发/配饰整体人物状态 | KLC-E11—E13 |

## 7. F｜AE、MG、二维动画与合成

| ID | Component | 专业内容 | 主要共享常识 |
| --- | --- | --- | --- |
| KLC-F01 | Animation Direction | 动画风格、节奏、审阅与跨工种输入输出 | PC-2D-* |
| KLC-F02 | Motion Graphics Design | MG方案、版式、运动逻辑和信息层级 | PC-2D-008 |
| KLC-F03 | Motion Graphics Production | 已确认MG方案的动画实现和版本 | PC-2D-008 |
| KLC-F04 | AE-based Image Production | 合成/图层/文字/动画类AE工作输入输出 | PC-2D-* |
| KLC-F05 | Frame-by-frame 2D | 逐帧二维动画资产和镜头输出 | PC-2D-010 |
| KLC-F06 | 2D Rigging | 二维角色控制/变形结构 | animation commons |
| KLC-F07 | 2D Character Animation | 二维角色动作、表情和镜头输出 | PC-2D-010 |
| KLC-F08 | Package Design | 包装/栏目视觉方案 | PC-2D-008/009 |
| KLC-F09 | Package Animation | 已确认包装方案的动画执行 | PC-2D-* |
| KLC-F10 | Typography Motion Design | 字效方案 | PC-2D-009 |
| KLC-F11 | Typography Animation | 字效动画执行 | PC-2D-009 |
| KLC-F12 | Digital Compositing | Plate/CG/graphics整合、Alpha/Matte与色彩数据流 | PC-2D-001—007、PC-COL-022 |
| KLC-F13 | Keying & Roto | Key/Matte/Roto输入输出 | PC-2D-001—004 |
| KLC-F14 | Cleanup | 擦除、修复、plate/reference | PC-2D-006 |
| KLC-F15 | 2D Tracking | 点/平面/对象等二维跟踪结果与下游输入 | PC-2D-005 |
| KLC-F16 | Matte Painting | 数字绘景、分层和合成输入 | PC-2D-* |
| KLC-F17 | 2D Effects | 二维特效元素与合成输入输出 | PC-2D-* |
| KLC-F18 | Composite Color Pipeline | 合成工作空间、输入/输出和格式关系 | PC-COL-022、FormatRelation |

## 8. G｜三维制作与三维视效

| ID | Component | 专业内容 | 主要共享常识 |
| --- | --- | --- | --- |
| KLC-G01 | CG Supervision | 三维/VFX整体制作目标、审阅和跨环节协调 | PC-3D-* |
| KLC-G02 | CG Pipeline | Asset/Shot、版本、cache、render、handoff | PC-3D-*、workflow commons |
| KLC-G03 | Modeling | Mesh、Topology、模型输出 | PC-3D-001/002 |
| KLC-G04 | Sculpting | 高精度形体/细节数字雕刻 | modeling commons |
| KLC-G05 | Environment | 三维场景/环境资产及镜头使用 | PC-3D-* |
| KLC-G06 | Texturing | 纹理输入、UV、贴图输出 | PC-3D-003 |
| KLC-G07 | Material / Lookdev | Material、Shader、外观和参考 | PC-3D-004/005 |
| KLC-G08 | Rigging | 骨骼/控制/变形结构 | PC-3D-006 |
| KLC-G09 | 3D Previs / Virtual Camera | 三维预演、虚拟机位、镜头时长 | PC-3D-007/008、camera commons |
| KLC-G10 | Layout | 成片制作阶段的场景/角色/相机布局 | PC-3D-007 |
| KLC-G11 | 3D Animation | 角色、物体、相机动画 | PC-3D-009 |
| KLC-G12 | Groom / Cloth | 毛发、布料及其缓存/版本 | simulation commons |
| KLC-G13 | FX Simulation | 粒子、流体、破碎等模拟 | PC-3D-010/011 |
| KLC-G14 | CG Lighting | 数字光源、曝光/色彩目标 | PC-3D-012、lighting/color commons |
| KLC-G15 | Rendering | Render、AOV、输出格式 | PC-3D-013/014、FormatRelation |
| KLC-G16 | Render Color Pipeline | Scene-linear、render output、display transform | PC-COL-023 |
| KLC-G17 | Realtime Technical Preparation | 实时制作方案、资产/性能/流程准备 | PC-3D-015/016 |
| KLC-G18 | Realtime Engine Production | 实际实时引擎场景/画面制作 | PC-3D-015/016 |
| KLC-G19 | Mocap Capture | 动作采集输入/身份/数据 | PC-3D-017 |
| KLC-G20 | Mocap Cleanup | 动捕数据清理、修正与动画输入 | PC-3D-017 |
| KLC-G21 | Scanning / Photogrammetry Capture | 图像/扫描采集参考 | PC-3D-018 |
| KLC-G22 | Reconstruction | 摄影测量/扫描数据重建为资产 | PC-3D-018 |
| KLC-G23 | VFX On-set Supervision | 为后期VFX保证现场条件和参考 | camera/lighting/tracking commons |
| KLC-G24 | VFX Reference / Data Capture | Lens/grid/HDRI/参考/测量等现场数据交接 | PC-CAM/OPT/COL commons |
| KLC-G25 | Technical Art / Pipeline Support | 工具、数据约束、自动化和跨软件工作流 | software/format commons |

## 9. H｜剪辑、声音、成片与交付

| ID | Component | 专业内容 | 主要共享常识 |
| --- | --- | --- | --- |
| KLC-H01 | Editorial | 素材选择、时间线、节奏、版本 | PC-MED-* |
| KLC-H02 | Assistant Editorial | ingest/proxy/sync/metadata/project组织 | PC-MED-005—014、PC-AUD-009/010 |
| KLC-H03 | Stock / Source Research | 外部素材检索、来源、版本、适用范围 | SourceReference |
| KLC-H04 | Source Authorization | 素材授权资料与交付检查 | PC-WF-015 |
| KLC-H05 | Color Grading | 镜头匹配、Look、调色版本 | PC-COL-* |
| KLC-H06 | Post Color Pipeline | conform→grade→online→master颜色数据流 | PC-COL-024 |
| KLC-H07 | Sound Design | 声音层次、设计和素材关系 | PC-AUD-* |
| KLC-H08 | Dialogue Edit | 对白整理、修复、版本 | PC-AUD-012 |
| KLC-H09 | SFX Edit | 音效素材和时间线 | PC-AUD-013 |
| KLC-H10 | Foley | 拟音录制/编辑及画面同步 | PC-AUD-* |
| KLC-H11 | Voice Recording | 配音/旁白录制与take/版本 | PC-AUD-* |
| KLC-H12 | Music Production | 作曲/编曲和音乐版本 | PC-AUD-014 |
| KLC-H13 | Music Edit / Selection | 选曲、剪辑、结构和授权引用 | PC-AUD-014 |
| KLC-H14 | Mix | Dialogue/Music/SFX整合和输出 | PC-AUD-015 |
| KLC-H15 | Subtitle | 字幕文本、时间和版本 | FormatReference |
| KLC-H16 | Localization | 多语言文本/声音/版本 | FormatReference |
| KLC-H17 | Online / Conform | 原素材回批、成片整理 | PC-MED-014 |
| KLC-H18 | Final QC | 画面、声音、文字、格式、授权/Checklist检查 | PC-MED-015、PC-WF-013—015 |
| KLC-H19 | Mastering | Master与交付变体生成 | PC-MED-008/016 |
| KLC-H20 | Delivery | 输出、提交、送达、确认、验收/退回 | PC-WF-018/019 |
| KLC-H21 | Format / Transcode | 编码、容器、转码和目标规格关系 | PC-MED-001—004、FormatRelation |

## 10. 首批跨组件输入输出关系

### 10.1 内容 → 实拍

```text
KLC-B02 Script & Scene
→ KLC-B05 Directing & Blocking
→ KLC-B06 Coverage Design
→ KLC-B08 Live-action Storyboard
→ KLC-D01 Cinematography Language
→ KLC-D02 Camera Body & Recording Mode
→ KLC-D03 Lens & Optical System
→ KLC-D09 Lighting Design
→ KLC-D14 Production Sound
```

### 10.2 分镜 / 预演 → VFX / 3D

```text
KLC-B09 VFX Storyboard
→ KLC-B11 General Previs
→ KLC-G09 3D Previs / Virtual Camera
→ KLC-G10 Layout
→ KLC-G11 3D Animation
→ KLC-G14 CG Lighting
→ KLC-G15 Rendering
→ KLC-F12 Digital Compositing
```

B11 和 G09 仍是两个专业组件：B11 是通用预演需求/镜头方案，G09 是具体三维预演/虚拟摄影执行。

### 10.3 美术 → 实拍 / 后期

```text
KLC-C01 Visual Direction
├→ KLC-C02 Live-action Art Direction → KLC-D01/D09
├→ KLC-C06 Digital Visual Design → KLC-F02/F12
├→ KLC-C07 Concept Art → KLC-G03/G05/G07
└→ KLC-C10 Typography → KLC-F10/F11
```

### 10.4 实拍素材 → 后期

```text
KLC-D02 Camera Body & Recording Mode
+ KLC-D17 DIT & Camera Data
+ KLC-D18 Integrity / Backup / Handoff
→ KLC-H02 Assistant Editorial
→ KLC-H01 Editorial
→ KLC-H17 Online / Conform
→ KLC-H05 Color Grading
→ KLC-H19 Mastering
→ KLC-H20 Delivery
```

### 10.5 VFX / CG → 合成 → 后期

```text
KLC-G03/G05/G07/G08/G11/G13
→ KLC-G14
→ KLC-G15 Rendering
→ KLC-G16 Render Color Pipeline
→ KLC-F12 Digital Compositing
→ KLC-F18 Composite Color Pipeline
→ KLC-H17 Online / Conform
→ KLC-H05/H06
```

### 10.6 现场声音 → 声音后期

```text
KLC-D14 Production Sound
+ KLC-D16 Timecode & Sync
→ KLC-H02 Assistant Editorial
→ KLC-H08 Dialogue Edit
→ KLC-H07 Sound Design
→ KLC-H14 Mix
→ KLC-H19 Mastering
```

### 10.7 表演 / 造型 → 实拍连续性

```text
KLC-E02 Acting
+ KLC-E11 Costume
+ KLC-E12 Makeup
+ KLC-E13 Hair
→ KLC-B07 Continuity
→ KLC-D01/D02
```

### 10.8 制作管理贯穿关系

A Library 不成为业务 owner 的第二份数据，但 A 组件引用所有实际业务对象：

```text
A01/A02/A03
→ A04 Schedule
→ A05 Call Sheet
→ D/E/B/C/F/G/H 执行
→ A08 Media Handoff
→ A07 Review & Delivery
→ A09 Time Calibration
```

## 11. 跨组件 Relation 类型

组件之间首批固定：

- `INPUT_TO`；
- `OUTPUT_TO`；
- `HANDOFF_TO`；
- `SUPPORTS`；
- `COORDINATES_WITH`；
- `REVIEWS`；
- `REFERENCES_COMMON_TOPIC`；
- `SHARES_FORMAT`；
- `SHARES_COLOR_PIPELINE`；
- `SHARES_INTERFACE`。

这类 relation 只说明知识/制作关系，不自动创建项目 Task 或权限。

## 12. 后续拆分与层级规则

现在**仍不规定最大层数**。先用以下判断决定是否拆 Subcomponent：

- 单组件出现明显不同对象生命周期；
- 需要独立型号/格式/公式/输入输出查询；
- 组件内容大到无法清晰维护；
- 与其他组件有大量独立 cross-links；
- 岗位只需要其中一部分，而不是整个组件。

相反，仅因为“看起来可以再分一层”不得拆。比如 D03 Lens & Optical System 内的 Focal Length、F-number、T-stop、FOV 是独立共享 Topic/规格，不应该变成“镜头→焦段→光圈”这样的错误树。

## 13. 首批组件验收

- A–H 每个岗位至少能映射到一个 Component 或 Domain；
- 每个 Component 可追溯到共享 Topic / 专业增量；
- 同一共享 Topic 不在两个 Component 复制正文；
- B11 General Previs 与 G09 3D Previs 保持分开；
- C 数字视觉方案与 F 实际动画/合成保持分开；
- G 实时技术准备与实际实时制作保持分开；
- D Camera / Lighting / Audio / Support 接口不混树；
- F/G/H 的 Format 与 Color pipeline 可通过跨组件关系连接；
- A Library 只提供知识/协调语义，不复制 Schedule/Task/Delivery 的业务事实 owner；
- 最终层级深度保持未锁定，直到真实内容量和导航需求可测。
