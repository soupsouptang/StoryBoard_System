> **下一代业务定义，尚未实施。** 本文件在共享制作常识 Topic Catalog 之上定义 A–H 八个专业知识小库的首批“组件”。组件不是最终树层级，也不是页面；它们是可维护、可跨库引用的专业知识边界。

# FrameForge A–H 专业知识小库组件与跨组件关系

版本：1.3，2026-10-05。状态：组件范围合同。本版基于135个唯一A–H组件和83/83专业知识域的真实规模，锁定知识分类最大深度：Library → Domain → Component → 可选Subcomponent；Topic不作为继续嵌套的分类层。

配套：[制作常识 Topic Catalog](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md)、[岗位驱动知识目录](ROLE_KNOWLEDGE_CATALOG_2026-10-05.md)、[工种目录](JOB_CATALOG_DEFINITIONS_2026-10-05.md)。

## 1. 组件原则

1. A–H 是八个专业 KnowledgeLibrary，不等同项目 Department。
2. 每个 Component 只有自己的专业知识增量；景深、FOV、Timecode、Alpha、Task 等共享常识只引用 PC-* Topic，不复制定义。
3. Component 可跨 Library 互相关联，不要求通过共同父节点才能建立关系。
4. Component 可以被多个岗位绑定；岗位绑定不是权限。
5. 组件间使用明确的 INPUT / OUTPUT / SUPPORT / COORDINATES_WITH / REVIEWS / HANDOFF_TO / REFERENCES relation。
6. 本版只定义组件边界和跨组件关系，不决定 UI 菜单层数和数据库树深。
7. 后续若某组件内容过大，可拆 Subcomponent；拆分不能复制 canonical Topic。
8. 每个组件标题必须有中文名称。知识概念、执行活动、设备及配件资料分别引用，不以“相关”当作同一分类理由。

## 2. A｜项目管理与制片

| ID | Component | 专业内容 | 主要共享常识 |
| --- | --- | --- | --- |
| KLC-A01 | 项目接收与需求协调（Project Intake & Requirement Coordination） | 需求接收、澄清、版本、确认对象、反馈归并 | PC-WF-001/002/004/005/006 |
| KLC-A02 | 制作组织（Production Organization） | Production、团队、岗位、主责/协作、工作范围组织 | PC-WF-001/002 |
| KLC-A03 | 任务与依赖协调（Task & Dependency Coordination） | Task实例、依赖、输入、交接、blocked/stale语义 | PC-WF-001/002/003/013 |
| KLC-A04 | 排期协调（Schedule Coordination） | SchedulePlan、ShootDay、ScheduleItem、锁定/冲突、Actual重排 | PC-WF-004—010 |
| KLC-A05 | 通告协调（Call Sheet Coordination） | Draft、Published Revision、个人Call Time、重确认边界 | PC-WF-011/012 |
| KLC-A06 | 外部协作（External Collaboration） | 外协工作包、输入输出、版本固定、回收与验收 | PC-WF-001/003/016/017 |
| KLC-A07 | 审阅与交付协调（Review & Delivery Coordination） | Review、返工、补拍、QC、Deliverable与交付事实 | PC-WF-016—019、PC-MED-015/016 |
| KLC-A08 | 素材交接协调（Media Handoff Coordination） | 素材正式交接条件、接收状态与后期输入 | PC-MED-005—013 |
| KLC-A09 | 制作时间校准（Production Time Calibration） | 通告/排期/制作表 planned vs Actual 的粗粒度校准 | PC-TIME-* |
| KLC-A10 | 制作文档（Production Documentation） | 项目范围内版本、说明、发布资料和历史引用 | PC-MED-009、PC-WF-004—006 |

## 3. B｜策划、内容与导演

| ID | Component | 专业内容 | 主要共享常识 |
| --- | --- | --- | --- |
| KLC-B01 | 创意方向（Creative Direction） | 创意目标、语气、受众表达、内容方向 | Narrative commons |
| KLC-B02 | 剧本与场景结构（Script & Scene Structure） | 剧本、Scene、人物行动、对白与场景组织 | PC-NAR-001/002 |
| KLC-B03 | 内容研究与来源（Research & Source） | 内容研究、事实来源、引用与不确定性 | KnowledgeSource/SourceReference |
| KLC-B04 | 采访设计（Interview Design） | 采访目标、对象、提纲、问题结构与内容回收 | PC-NAR-010/011 |
| KLC-B05 | 导演与人物调度（Directing & Blocking） | 导演意图、表演调度、机位协同 | PC-NAR-010、PC-CAM-* |
| KLC-B06 | 镜头覆盖策略设计（Coverage Design） | 建立、Master、Coverage、Insert、Reaction、OTS、POV | PC-NAR-003—009 |
| KLC-B07 | 连续性与场记（Continuity & Script Supervision） | 轴线、屏幕方向、视线、动作连续性、实际记录 | PC-NAR-016—020 |
| KLC-B08 | 实拍分镜（Live-action Storyboard） | 面向实拍的构图、角度、运镜、焦段意图和时长 | PC-CAM-*、PC-MOV-* |
| KLC-B09 | 视效分镜（VFX Storyboard） | 面向数字后期/特效输入的镜头拆解和前后景关系 | PC-2D-*、PC-3D-* |
| KLC-B10 | 动态分镜（Animatic） | 分镜序列、节奏、粗时长、声音参考 | PC-EXP-010—013、PC-MED-* |
| KLC-B11 | 通用预演（General Previs） | 与具体3D执行解耦的镜头/空间/时长预演 | PC-CAM-*、PC-MOV-* |
| KLC-B12 | 后期内容结构（Post Story Structure） | 依据已有素材重新组织结构、节奏与信息 | PC-MED-005—008/014 |

## 4. C｜视觉设计与美术

| ID | Component | 专业内容 | 主要共享常识 |
| --- | --- | --- | --- |
| KLC-C01 | 视觉方向（Visual Direction） | 整体视觉语言、质感、色彩、形式一致性 | PC-COL-*、composition commons |
| KLC-C02 | 实拍美术方向（Live-action Art Direction） | 实拍美术总体方案、空间、材质、场景状态 | PC-CAM-014/020、PC-LGT-* |
| KLC-C03 | 布景与环境设计（Set & Environment Design） | 场景/布景/环境视觉方案与制作输入 | spatial perspective commons |
| KLC-C04 | 道具设计（Prop Design） | 道具造型、尺寸、状态、连续性和镜头需求 | PC-NAR-014/020 |
| KLC-C05 | 实拍平面内容（Live-action Graphic） | 实拍中出现的平面、包装、标识、屏幕内容等 | format/color commons |
| KLC-C06 | 数字视觉设计（Digital Visual Design） | 后期数字画面的版式、风格和图形方案 | PC-2D-*、PC-COL-* |
| KLC-C07 | 概念美术（Concept Art） | 人物/场景/镜头视觉概念与参考 | PC-CAM-*、PC-COL-* |
| KLC-C08 | 插画（Illustration） | 插画风格、构图、输出与后续动画/合成输入 | PC-2D-* |
| KLC-C09 | 人物视觉开发（Character Visual Development） | 动画/数字人物造型、形态和视觉连续性 | PC-2D/3D commons |
| KLC-C10 | 字体与标题设计（Typography & Title Design） | 字体、标题、版式和文字视觉 | PC-2D-008/009 |
| KLC-C11 | 信息图形（Information Graphics） | 信息结构、视觉层级、静态/动态信息图方案 | PC-2D-008 |
| KLC-C12 | 产品造型（Product Styling） | 产品画面状态、摆位、反射、连续性 | PC-CAM-*、PC-LGT-* |
| KLC-C13 | 食品造型（Food Styling） | 食品画面状态、连续性、镜头与灯光协同 | PC-CAM-*、PC-LGT-* |

## 5. D｜摄影、灯光、录音与现场

### 5.1 摄影机与光学

| ID | Component | 专业内容 | 主要共享常识 |
| --- | --- | --- | --- |
| KLC-D01 | 摄影构图与观察角度（Camera Composition & Viewing Angle） | 机位、观察角度和构图；不收纳运镜、轴线规则或Setup准备活动 | PC-CAM-* |
| KLC-D02 | 摄影机与录制模式（Camera Body & Recording Mode） | Sensor、active area、frame rate、codec、color pipeline、接口 | PC-OPT-002、PC-EXP-*、PC-COL-021、PC-MED-* |
| KLC-D03 | 镜头与光学系统（Lens & Optical System） | 焦距、F/T-stop、coverage、focus、anamorphic、官方AoV | PC-OPT-* |
| KLC-D04 | 焦点控制（Focus） | 对焦目标、MFD、Rack Focus、DOF、Focus Control | PC-OPT-011—017 |
| KLC-D05 | 摄影机运动（Camera Movement） | Pan/Tilt/Dolly/Track/Orbit/Jib等画面运动 | PC-MOV-001—008、PC-MOV-013/015 |
| KLC-D06 | 摄影机支撑（Camera Support） | 三脚架、液压云台、快拆板、稳定器、遮光斗/滤镜架支撑及安装接口 | PC-IF-* |
| KLC-D07 | 航拍成像（Aerial Imaging） | Drone内置模组、航拍机位和素材能力 | PC-MOV-012、EmbeddedImagingModule |
| KLC-D08 | 产品与微距成像（Product / Macro Imaging） | 产品与近距离成像、MFD/DOF/反射控制 | PC-OPT-*、PC-LGT-* |

### 5.2 灯光与供电

| ID | Component | 专业内容 | 主要共享常识 |
| --- | --- | --- | --- |
| KLC-D09 | 灯光设计（Lighting Design） | Key/Fill/Back、光质、方向、反差 | PC-LGT-001—012 |
| KLC-D10 | 灯具（Lighting Fixture） | 灯具输出、CCT、控制、原生modifier接口、附件 | PC-LGT-*、PC-IF-* |
| KLC-D11 | 控光附件（Lighting Modifier） | Softbox、Fresnel、Projection、Grid等及兼容路径 | PC-LGT-013—017、PC-IF-* |
| KLC-D12 | 灯光支撑（Lighting Support） | Light Stand、C-Stand、Boom、Pin/Receiver等 | PC-IF-* |
| KLC-D13 | 供电与配电（Power & Distribution） | 功率、供电接口、负载、供电关系与风险提示 | Power Interface / Formula |

### 5.3 声音、现场数据与协调

| ID | Component | 专业内容 | 主要共享常识 |
| --- | --- | --- | --- |
| KLC-D14 | 现场录音（Production Sound） | 现场录音、话筒类型、Boom/Lav、信号级别 | PC-AUD-* |
| KLC-D15 | 无线音频与接口（Wireless / Audio Interface） | 无线音频、输入输出、供电和设备兼容 | PC-IF-*、PC-AUD-* |
| KLC-D16 | 时间码与同步（Timecode & Sync） | Camera/Recorder/多机同步和时间码 | PC-AUD-009/010 |
| KLC-D17 | 现场数字影像与数据（DIT & Camera Data） | Camera original、offload、metadata、proxy、色彩参考 | PC-MED-*、PC-COL-021 |
| KLC-D18 | 完整性、备份与素材交接（Integrity / Backup / Media Handoff） | 校验、备份验证、正式交接 | PC-MED-010—013 |
| KLC-D19 | 场地与现场协调（Location & Set Coordination） | 场地、机位、人员、现场执行和限制信息 | PC-WF-* |
| KLC-D20 | 多机位协调（Multi-camera Coordination） | 多Body独立镜头/adapter路径、同步和素材身份 | PC-AUD-010、CompatibilityPath |
| KLC-D21 | 提词系统（Teleprompter） | 提词内容、位置、反射/机位和表演配合 | camera support commons |
| KLC-D22 | 花絮与剧照（BTS / Still Photography） | 花絮/剧照与主拍摄的范围、素材和版本分离 | media commons |

## 6. E｜出镜、表演与造型

| ID | Component | 专业内容 | 主要共享常识 |
| --- | --- | --- | --- |
| KLC-E01 | 选角（Casting） | Character↔Person、候选、确认、档期、出镜需求 | identity/workflow commons |
| KLC-E02 | 表演（Acting） | 角色目标、表演状态、镜头覆盖和连续性 | PC-NAR-* |
| KLC-E03 | 群演（Extras / Crowd） | 群演组织、画面分布、连续性 | blocking/coverage |
| KLC-E04 | 模特与展示（Modeling / Presentation） | 产品/人物展示、动作、镜头与造型配合 | camera/lighting commons |
| KLC-E05 | 主持与口播（Host / Presenter） | 主持串联、口播、机位/提词协同 | PC-NAR-*、KLC-D21 |
| KLC-E06 | 采访表演（Interview Performance） | 采访对象/主持互动、视线和收声 | PC-CAM-*、PC-AUD-* |
| KLC-E07 | 声音表演（Voice Performance） | 旁白/配音文本版本、表演意图和录制输入 | PC-AUD-* |
| KLC-E08 | 表演指导（Performance Direction） | 动作、情绪、节奏和导演协同 | KLC-B05 |
| KLC-E09 | 特技与动作（Stunt / Action） | 动作设计、镜头覆盖、技术配合和风险提示 | KLC-B06、KLC-D05 |
| KLC-E10 | 舞蹈与编排（Dance / Choreography） | 舞蹈/节奏/空间走位与机位协同 | Blocking/Camera Movement |
| KLC-E11 | 服装（Costume） | 服装造型、Scene/Shot连续性和状态 | continuity commons |
| KLC-E12 | 化妆（Makeup） | 化妆状态、连续性、灯光/摄影影响 | continuity/color commons |
| KLC-E13 | 发型（Hair） | 发型状态、连续性和镜头关系 | continuity commons |
| KLC-E14 | 人物整体造型（Character Styling） | 服装/妆发/配饰整体人物状态 | KLC-E11—E13 |

## 7. F｜AE、MG、二维动画与合成

| ID | Component | 专业内容 | 主要共享常识 |
| --- | --- | --- | --- |
| KLC-F01 | 动画指导（Animation Direction） | 动画风格、节奏、审阅与跨工种输入输出 | PC-2D-* |
| KLC-F02 | 动态图形设计（Motion Graphics Design） | MG方案、版式、运动逻辑和信息层级 | PC-2D-008 |
| KLC-F03 | 动态图形制作（Motion Graphics Production） | 已确认MG方案的动画实现和版本 | PC-2D-008 |
| KLC-F04 | AE图像制作（AE-based Image Production） | 合成/图层/文字/动画类AE工作输入输出 | PC-2D-* |
| KLC-F05 | 逐帧二维动画（Frame-by-frame 2D） | 逐帧二维动画资产和镜头输出 | PC-2D-010 |
| KLC-F06 | 二维绑定（2D Rigging） | 二维角色控制/变形结构 | animation commons |
| KLC-F07 | 二维角色动画（2D Character Animation） | 二维角色动作、表情和镜头输出 | PC-2D-010 |
| KLC-F08 | 视觉包装设计（Package Design） | 包装/栏目视觉方案 | PC-2D-008/009 |
| KLC-F09 | 视觉包装动画（Package Animation） | 已确认包装方案的动画执行 | PC-2D-* |
| KLC-F10 | 文字运动设计（Typography Motion Design） | 字效方案 | PC-2D-009 |
| KLC-F11 | 文字动画制作（Typography Animation） | 字效动画执行 | PC-2D-009 |
| KLC-F12 | 数字合成（Digital Compositing） | Plate/CG/graphics整合、Alpha/Matte与色彩数据流 | PC-2D-001—007、PC-COL-022 |
| KLC-F13 | 抠像与描绘遮罩（Keying & Roto） | Key/Matte/Roto输入输出 | PC-2D-001—004 |
| KLC-F14 | 擦除修复（Cleanup） | 擦除、修复、plate/reference | PC-2D-006 |
| KLC-F15 | 二维跟踪（2D Tracking） | 点/平面/对象等二维跟踪结果与下游输入 | PC-2D-005 |
| KLC-F16 | 数字绘景（Matte Painting） | 数字绘景、分层和合成输入 | PC-2D-* |
| KLC-F17 | 二维特效（2D Effects） | 二维特效元素与合成输入输出 | PC-2D-* |
| KLC-F18 | 合成色彩数据流（Composite Color Pipeline） | 合成工作空间、输入/输出和格式关系 | PC-COL-022、FormatRelation |

## 8. G｜三维制作与三维视效

| ID | Component | 专业内容 | 主要共享常识 |
| --- | --- | --- | --- |
| KLC-G01 | 三维制作统筹（CG Supervision） | 三维/VFX整体制作目标、审阅和跨环节协调 | PC-3D-* |
| KLC-G02 | 三维制作流程（CG Pipeline） | Asset/Shot、版本、cache、render、handoff | PC-3D-*、workflow commons |
| KLC-G03 | 建模（Modeling） | Mesh、Topology、模型输出 | PC-3D-001/002 |
| KLC-G04 | 数字雕刻（Sculpting） | 高精度形体/细节数字雕刻 | modeling commons |
| KLC-G05 | 三维环境（Environment） | 三维场景/环境资产及镜头使用 | PC-3D-* |
| KLC-G06 | 纹理制作（Texturing） | 纹理输入、UV、贴图输出 | PC-3D-003 |
| KLC-G07 | 材质与外观开发（Material / Lookdev） | Material、Shader、外观和参考 | PC-3D-004/005 |
| KLC-G08 | 绑定（Rigging） | 骨骼/控制/变形结构 | PC-3D-006 |
| KLC-G09 | 三维预演与虚拟摄影（3D Previs / Virtual Camera） | 三维预演、虚拟机位、镜头时长 | PC-3D-007/008、camera commons |
| KLC-G10 | 三维镜头布局（Layout） | 成片制作阶段的场景/角色/相机布局 | PC-3D-007 |
| KLC-G11 | 三维动画（3D Animation） | 角色、物体、相机动画 | PC-3D-009 |
| KLC-G12 | 毛发与布料（Groom / Cloth） | 毛发、布料及其缓存/版本 | simulation commons |
| KLC-G13 | 特效模拟（FX Simulation） | 粒子、流体、破碎等模拟 | PC-3D-010/011 |
| KLC-G14 | 三维灯光（CG Lighting） | 数字光源、曝光/色彩目标 | PC-3D-012、lighting/color commons |
| KLC-G15 | 渲染（Rendering） | Render、AOV、输出格式 | PC-3D-013/014、FormatRelation |
| KLC-G16 | 渲染色彩数据流（Render Color Pipeline） | Scene-linear、render output、display transform | PC-COL-023 |
| KLC-G17 | 实时技术准备（Realtime Technical Preparation） | 实时制作方案、资产/性能/流程准备 | PC-3D-015/016 |
| KLC-G18 | 实时引擎制作（Realtime Engine Production） | 实际实时引擎场景/画面制作 | PC-3D-015/016 |
| KLC-G19 | 动作捕捉采集（Mocap Capture） | 动作采集输入/身份/数据 | PC-3D-017 |
| KLC-G20 | 动捕数据清理（Mocap Cleanup） | 动捕数据清理、修正与动画输入 | PC-3D-017 |
| KLC-G21 | 扫描与摄影测量采集（Scanning / Photogrammetry Capture） | 图像/扫描采集参考 | PC-3D-018 |
| KLC-G22 | 三维重建（Reconstruction） | 摄影测量/扫描数据重建为资产 | PC-3D-018 |
| KLC-G23 | 现场视效统筹（VFX On-set Supervision） | 为后期VFX保证现场条件和参考 | camera/lighting/tracking commons |
| KLC-G24 | 视效参考与数据采集（VFX Reference / Data Capture） | Lens/grid/HDRI/参考/测量等现场数据交接 | PC-CAM/OPT/COL commons |
| KLC-G25 | 技术美术与流程支持（Technical Art / Pipeline Support） | 工具、数据约束、自动化和跨软件工作流 | software/format commons |

## 9. H｜剪辑、声音、成片与交付

| ID | Component | 专业内容 | 主要共享常识 |
| --- | --- | --- | --- |
| KLC-H01 | 剪辑（Editorial） | 素材选择、时间线、节奏、版本 | PC-MED-* |
| KLC-H02 | 剪辑助理（Assistant Editorial） | ingest/proxy/sync/metadata/project组织 | PC-MED-005—014、PC-AUD-009/010 |
| KLC-H03 | 素材检索与研究（Stock / Source Research） | 外部素材检索、来源、版本、适用范围 | SourceReference |
| KLC-H04 | 素材来源授权（Source Authorization） | 素材授权资料与交付检查 | PC-WF-015 |
| KLC-H05 | 调色（Color Grading） | 镜头匹配、Look、调色版本 | PC-COL-* |
| KLC-H06 | 后期色彩数据流（Post Color Pipeline） | conform→grade→online→master颜色数据流 | PC-COL-024 |
| KLC-H07 | 声音设计（Sound Design） | 声音层次、设计和素材关系 | PC-AUD-* |
| KLC-H08 | 对白编辑（Dialogue Edit） | 对白整理、修复、版本 | PC-AUD-012 |
| KLC-H09 | 音效编辑（SFX Edit） | 音效素材和时间线 | PC-AUD-013 |
| KLC-H10 | 拟音（Foley） | 拟音录制/编辑及画面同步 | PC-AUD-* |
| KLC-H11 | 配音录制（Voice Recording） | 配音/旁白录制与take/版本 | PC-AUD-* |
| KLC-H12 | 音乐制作（Music Production） | 作曲/编曲和音乐版本 | PC-AUD-014 |
| KLC-H13 | 音乐编辑与选曲（Music Edit / Selection） | 选曲、剪辑、结构和授权引用 | PC-AUD-014 |
| KLC-H14 | 混音（Mix） | Dialogue/Music/SFX整合和输出 | PC-AUD-015 |
| KLC-H15 | 字幕（Subtitle） | 字幕文本、时间和版本 | FormatReference |
| KLC-H16 | 本地化（Localization） | 多语言文本/声音/版本 | FormatReference |
| KLC-H17 | 在线套底（Online / Conform） | 原素材回批、成片整理 | PC-MED-014 |
| KLC-H18 | 最终质量检查（Final QC） | 画面、声音、文字、格式、授权/Checklist检查 | PC-MED-015、PC-WF-013—015 |
| KLC-H19 | 母版制作（Mastering） | Master与交付变体生成 | PC-MED-008/016 |
| KLC-H20 | 交付（Delivery） | 输出、提交、送达、确认、验收/退回 | PC-WF-018/019 |
| KLC-H21 | 格式与转码（Format / Transcode） | 编码、容器、转码和目标规格关系 | PC-MED-001—004、FormatRelation |

## 10. 首批跨组件输入输出关系

### 10.1 内容 → 实拍

```text
KLC-B02 剧本与场景结构（Script & Scene Structure）
→ KLC-B05 导演与人物调度（Directing & Blocking）
→ KLC-B06 镜头覆盖策略设计（Coverage Design）
→ KLC-B08 实拍分镜（Live-action Storyboard）
→ KLC-D01 摄影构图与观察角度（Camera Composition & Viewing Angle）
→ KLC-D02 摄影机与录制模式（Camera Body & Recording Mode）
→ KLC-D03 镜头与光学系统（Lens & Optical System）
→ KLC-D09 灯光设计（Lighting Design）
→ KLC-D14 现场录音（Production Sound）
```

### 10.2 分镜 / 预演 → VFX / 3D

```text
KLC-B09 视效分镜（VFX Storyboard）
→ KLC-B11 通用预演（General Previs）
→ KLC-G09 三维预演与虚拟摄影（3D Previs / Virtual Camera）
→ KLC-G10 三维镜头布局（Layout）
→ KLC-G11 三维动画（3D Animation）
→ KLC-G14 三维灯光（CG Lighting）
→ KLC-G15 渲染（Rendering）
→ KLC-F12 数字合成（Digital Compositing）
```

B11 和 G09 仍是两个专业组件：B11 是通用预演需求/镜头方案，G09 是具体三维预演/虚拟摄影执行。

### 10.3 美术 → 实拍 / 后期

```text
KLC-C01 视觉方向（Visual Direction）
├→ KLC-C02 Live-action Art Direction → KLC-D01/D09
├→ KLC-C06 Digital Visual Design → KLC-F02/F12
├→ KLC-C07 Concept Art → KLC-G03/G05/G07
└→ KLC-C10 Typography → KLC-F10/F11
```

### 10.4 实拍素材 → 后期

```text
KLC-D02 摄影机与录制模式（Camera Body & Recording Mode）
+ KLC-D17 现场数字影像与数据（DIT & Camera Data）
+ KLC-D18 完整性、备份与素材交接（Integrity / Backup / Media Handoff）
→ KLC-H02 剪辑助理（Assistant Editorial）
→ KLC-H01 剪辑（Editorial）
→ KLC-H17 在线套底（Online / Conform）
→ KLC-H05 调色（Color Grading）
→ KLC-H19 母版制作（Mastering）
→ KLC-H20 交付（Delivery）
```

### 10.5 VFX / CG → 合成 → 后期

```text
KLC-G03/G05/G07/G08/G11/G13
→ KLC-G14 三维灯光（CG Lighting）
→ KLC-G15 渲染（Rendering）
→ KLC-G16 渲染色彩数据流（Render Color Pipeline）
→ KLC-F12 数字合成（Digital Compositing）
→ KLC-F18 合成色彩数据流（Composite Color Pipeline）
→ KLC-H17 在线套底（Online / Conform）
→ KLC-H05/H06
```

### 10.6 现场声音 → 声音后期

```text
KLC-D14 现场录音（Production Sound）
+ KLC-D16 时间码与同步（Timecode & Sync）
→ KLC-H02 剪辑助理（Assistant Editorial）
→ KLC-H08 对白编辑（Dialogue Edit）
→ KLC-H07 声音设计（Sound Design）
→ KLC-H14 混音（Mix）
→ KLC-H19 母版制作（Mastering）
```

### 10.7 表演 / 造型 → 实拍连续性

```text
KLC-E02 表演（Acting）
+ KLC-E11 服装（Costume）
+ KLC-E12 化妆（Makeup）
+ KLC-E13 发型（Hair）
→ KLC-B07 连续性与场记（Continuity & Script Supervision）
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



## 10.9 专业知识域 → Component 映射

该映射是实现期稳定桥，不按名称猜归属。一个专业知识域可以映射多个 Component，但不得跨库改写岗位定义。

### A

| Domain | Component |
| --- | --- |
| KA-01 | KLC-A01 |
| KA-02 | KLC-A02、KLC-A03、KLC-A04、KLC-A05 |
| KA-03 | KLC-A07 |
| KA-04 | KLC-A06、KLC-A07、KLC-A08 |
| KA-05 | KLC-A06 |

### B

| Domain | Component |
| --- | --- |
| KB-01 | KLC-B01 |
| KB-02 | KLC-B02 |
| KB-03 | KLC-B03 |
| KB-04 | KLC-B04 |
| KB-05 | KLC-B05、KLC-B06 |
| KB-06 | KLC-B07 |
| KB-07 | KLC-B08 |
| KB-08 | KLC-B09 |
| KB-09 | KLC-B10、KLC-B11 |
| KB-10 | KLC-B12 |

### C

| Domain | Component |
| --- | --- |
| KC-01 | KLC-C01 |
| KC-02 | KLC-C02、KLC-C03、KLC-C04 |
| KC-03 | KLC-C05、KLC-C07 |
| KC-04 | KLC-C06、KLC-C07 |
| KC-05 | KLC-C06 |
| KC-06 | KLC-C08、KLC-C09 |
| KC-07 | KLC-C03、KLC-C07 |
| KC-08 | KLC-C10 |
| KC-09 | KLC-C11 |
| KC-10 | KLC-C12、KLC-C13 |

### D

| Domain | Component |
| --- | --- |
| KD-01 | KLC-D01 |
| KD-02 | KLC-D02、KLC-D06 |
| KD-03 | KLC-D04 |
| KD-04 | KLC-D07 |
| KD-05 | KLC-D05、KLC-D06 |
| KD-06 | KLC-D08 |
| KD-07 | KLC-D09、KLC-D10、KLC-D11、KLC-D12 |
| KD-08 | KLC-D13 |
| KD-09 | KLC-D14、KLC-D15、KLC-D16 |
| KD-10 | KLC-D17、KLC-D18 |
| KD-11 | KLC-D17、KLC-D18 |
| KD-12 | KLC-D19 |
| KD-13 | KLC-D20、KLC-D21、KLC-D22 |

### E

| Domain | Component |
| --- | --- |
| KE-01 | KLC-E01 |
| KE-02 | KLC-E02、KLC-E03、KLC-E04 |
| KE-03 | KLC-E05、KLC-E06 |
| KE-04 | KLC-E07 |
| KE-05 | KLC-E08 |
| KE-06 | KLC-E09、KLC-E10 |
| KE-07 | KLC-E11、KLC-E12、KLC-E13、KLC-E14 |

### F

| Domain | Component |
| --- | --- |
| KF-01 | KLC-F01 |
| KF-02 | KLC-F02、KLC-F03 |
| KF-03 | KLC-F04 |
| KF-04 | KLC-F05、KLC-F06、KLC-F07 |
| KF-05 | KLC-F08、KLC-F09 |
| KF-06 | KLC-F10、KLC-F11 |
| KF-07 | KLC-F12、KLC-F18 |
| KF-08 | KLC-F13 |
| KF-09 | KLC-F14 |
| KF-10 | KLC-F15 |
| KF-11 | KLC-F16、KLC-F17 |

### G

| Domain | Component |
| --- | --- |
| KG-01 | KLC-G01、KLC-G02 |
| KG-02 | KLC-G03、KLC-G04 |
| KG-03 | KLC-G05 |
| KG-04 | KLC-G06、KLC-G07 |
| KG-05 | KLC-G08 |
| KG-06 | KLC-G09、KLC-G10 |
| KG-07 | KLC-G11 |
| KG-08 | KLC-G12 |
| KG-09 | KLC-G13 |
| KG-10 | KLC-G14、KLC-G15、KLC-G16 |
| KG-11 | KLC-G17、KLC-G18 |
| KG-12 | KLC-G19、KLC-G20 |
| KG-13 | KLC-G21、KLC-G22 |
| KG-14 | KLC-G23、KLC-G24 |
| KG-15 | KLC-G25 |

### H

| Domain | Component |
| --- | --- |
| KH-01 | KLC-H01、KLC-H02 |
| KH-02 | KLC-H03 |
| KH-03 | KLC-H04 |
| KH-04 | KLC-H05、KLC-H06 |
| KH-05 | KLC-H07、KLC-H08、KLC-H09、KLC-H10 |
| KH-06 | KLC-H11 |
| KH-07 | KLC-H12、KLC-H13 |
| KH-08 | KLC-H14 |
| KH-09 | KLC-H15、KLC-H16 |
| KH-10 | KLC-H17 |
| KH-11 | KLC-H18 |
| KH-12 | KLC-H19、KLC-H20、KLC-H21 |

岗位最终路径是：

```text
JOB_CATALOG role
→ RoleKnowledgeBinding
→ KA–KH ProfessionalKnowledgeDomain
→ KLC Component
→ PC-* shared Topic / 专业增量 Topic
```

这条链只用于知识检索/组织，不授予权限、不创建 Task、不决定项目 Department。

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

## 12. 知识分类最大层级

经过首批243个共享Topic、135个专业Component和83个专业Domain展开后，分类深度已足够确定。

### 12.1 最大分类深度

```text
KnowledgeLibrary
→ KnowledgeDomain
→ KnowledgeComponent
→ KnowledgeSubcomponent (optional)
```

**含 Library 最多四级；不含 Library 最多三级。**

`KnowledgeTopic` 不是第五级分类树。Topic 是独立知识实体，可通过 DomainTopicLink / ComponentTopicLink / KnowledgeRelation 被 Library、Domain、Component 或 Subcomponent 引用。

不允许：

```text
D 摄影
→ 镜头
→ 焦段
→ 35mm
→ 光圈
```

因为 Focal Length、F-number、T-stop、FOV、Focus Distance 是相互关联但不同维度的 Topic/Specification，不是彼此的父子分类。

正确表达可以是：

```text
D
→ Camera / Optics Domain
→ Lens & Optical System Component
   ├─ Optical Geometry Subcomponent (optional)
   ├─ Aperture / Transmission Subcomponent (optional)
   ├─ Focus / DOF Subcomponent (optional)
   └─ Projection / Coverage Subcomponent (optional)

PC-OPT-001 Focal Length
PC-OPT-007 F-number
PC-OPT-008 T-stop
PC-CAM-009 FOV
...
通过relation互联
```

### 12.2 何时允许 Subcomponent

只有出现下列至少一项才拆第四级：

- 一个 Component 内存在明显不同、稳定的维护边界；
- 需要独立查询/过滤/导航；
- 岗位只需要其中一部分知识；
- 一组 Topic 有独立输入输出/格式/器材映射；
- 内容量已经使 Component 无法清晰维护。

### 12.3 何时禁止继续拆层

- 只是某个数值/规格不同；
- 只是品牌/型号不同；
- 只是同一个 Topic 的别名；
- 只是焦段、光圈、FOV等不同知识维度；
- 只是不同格式/软件/器材引用同一 Topic；
- 想用树层替代 typed relation。

超过 Subcomponent 后仍需组织内容时，应使用 Topic、Tag、Relation、Facet、SpecificationDefinition 或查询过滤，而不是增加第五/第六级目录。

### 12.4 器材/软件/格式不占知识分类深度

EquipmentModel、SoftwareProduct、FormatDefinition 是独立参考对象，通过 relation 连接 Domain/Component/Topic，不作为：

```text
Library → Domain → Component → Brand → Model → Variant
```

这样的知识所有权树。器材浏览另按“所属大类 → 该类内的品牌 → 型号 → 字段和子项”展开，是检索导航，不是第五级知识实体；旧文对这类器材导航的禁止取消。具体结构见[知识目录规则](KNOWLEDGE_CATALOG_STRUCTURE_2026-10-05.md)。

### 12.5 Shared Foundation 同样受限

共享基础层可使用：

```text
Shared Foundation
→ Base Domain
→ Component (optional)
→ Subcomponent (optional)
```

但共享Topic仍保持独立 stable identity。

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
- 分类最大深度固定为 Library→Domain→Component→可选Subcomponent；Topic/器材/软件/格式通过relation和facet组织，不继续增加目录深度。

## 14. 本轮拆分的专业边界

| 独立内容 | 专业引用 | 排除内容 |
| --- | --- | --- |
| 镜头覆盖策略 | B06；PC-NAR-003—009 | 运镜、轴线、设备安装和准备工时 |
| 人物与机位调度 | B05；PC-NAR-010 | 自动当作设备承托方式 |
| 空间连续性 | B07；PC-NAR-016—020 | Setup准备活动 |
| 观察角度与构图 | D01；PC-CAM-*分组 | 视场角和透视仅跨主题引用，不混成一个参数 |
| 摄影机空间运动 | D05；PC-MOV-001—008/013/015 | 手持/稳定器的支撑分类、电子裁切、后期重构图 |
| 摄影机承托与安装 | D06；PC-MOV-009—011及接口知识 | 运动轨迹；遮光斗、滤镜架、托盘、连接环以器材合同4.6节维护 |
| 取景范围变化 | D03及D02；PC-MOV-014/016 | 不改变机位的变焦不能写成空间推进 |
| 后期重构图 | H01、F12；PC-MOV-017 | 不改写拍摄光学或透视事实 |
| 拍摄准备及其时长 | D19、A04、A09；PC-NAR-011—015、PC-TIME-007—011 | 镜头覆盖策略、轴线规则和镜头规格 |

这些是知识引用边界，不创建新业务对象或任务。[器材字段合同](EQUIPMENT_REFERENCE_FIELD_CONTRACT_2026-10-05.md)维护配件安装条件。

## 15. 岗位专业关联的可读要求

保留10.9节的稳定岗位域→组件映射和第11节跨专业关系。每个关联必须显示中文名称、所属专业大类、关联原因、方向、条件和修订；纯同品牌或同接口不构成知识关联。各专业引用同一共享主题正文，不复制；入口先展示本专业，再按其他专业分组。具体字段及A–H关联范围见[知识目录第13节](KNOWLEDGE_CATALOG_STRUCTURE_2026-10-05.md)。
