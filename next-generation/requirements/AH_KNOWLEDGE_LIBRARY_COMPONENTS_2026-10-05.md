> **下一代业务定义，尚未实施。** 本文件在共享制作常识 Topic Catalog 之上定义 A–H 八个专业知识小库的首批“组件”。组件不是最终树层级，也不是页面；它们是可维护、可跨库引用的专业知识边界。

# FrameForge A–H 专业知识组件

版本：1.5，2026-10-05。状态：组件范围合同。本版保留181个专业组件和83个岗位专业域作为现有资料，取消固定分类层数；目录先按工种大类、知识小类和字段组织，通过案例审核后再重排。

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


9. 主表只列主要直接关联主题；不把整个编号前缀自动当成全量知识关联。其他主题需带原因、方向和条件检索。
10. 岗位A–H大类保持。知识组件按独立维护对象拆分；旧混合编号转向具体组件，不继续存储复合正文。
11. 组件可以消费多个独立输入；这不允许把这些输入的定义或参数混为一个条目。

## 2. A｜项目管理与制片

| 组件编号 | 中文名称（英文术语） | 本组件负责的内容 | 共享主题引用 |
| --- | --- | --- | --- |
| KLC-A02 | 制作组织（Production Organization） | Production、团队、岗位、主责/协作、工作范围组织 | [任务](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-wf-001)、[依赖关系](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-wf-002) |
| KLC-A04 | 排期协调（Schedule Coordination） | SchedulePlan、ShootDay、ScheduleItem、锁定/冲突、Actual重排 | [计划事实](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-wf-004)、[预测事实](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-wf-005)、[实际事实](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-wf-006)、[排期方案](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-wf-007)、[拍摄工作日](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-wf-008)、[排期条目](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-wf-009)、[剧组转场](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-wf-010) |
| KLC-A05 | 通告协调（Call Sheet Coordination） | Draft、Published Revision、个人Call Time、重确认边界 | [通告草稿](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-wf-011)、[已发布通告修订](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-wf-012) |
| KLC-A06 | 外部协作（External Collaboration） | 外协工作包、输入输出、版本固定、回收与验收 | [任务](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-wf-001)、[工作交接](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-wf-003)、[审阅](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-wf-016)、[返工请求](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-wf-020)、[补拍请求](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-wf-021) |
| KLC-A08 | 素材交接协调（Media Handoff Coordination） | 素材正式交接条件、接收状态与后期输入 | [原始素材](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-med-005)、[元数据](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-med-009)、[完整性校验](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-med-011)、[备份验证](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-med-012)、[正式素材交接](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-med-013)、[工作交接](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-wf-003) |
| KLC-A09 | 制作时间校准（Production Time Calibration） | 通告/排期/制作表 planned vs Actual 的粗粒度校准 | [计划时长](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-time-001)、[实际时长](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-time-002)、[时长范围](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-time-003)、[镜头总工时汇总](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-time-004)、[场景总工时汇总](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-time-005)、[拍摄日总工时汇总](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-time-006) |
| KLC-A10 | 制作文档（Production Documentation） | 项目范围内版本、说明、发布资料和历史引用 | [元数据](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-med-009)、[计划事实](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-wf-004)、[预测事实](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-wf-005)、[实际事实](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-wf-006) |
| KLC-A11 | 项目接收（Project Intake） | 项目初始资料的接收范围、完整性和来源；需求确认另列。 | [任务](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-wf-001) |
| KLC-A12 | 需求协调（Requirement Coordination） | 需求澄清、反馈归并及确认对象；不混入报价合同。 | [计划事实](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-wf-004)、[预测事实](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-wf-005)、[实际事实](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-wf-006) |
| KLC-A13 | 任务协调（Task Coordination） | 主责、协作、输入输出及状态的协调；依赖边单独维护。 | [任务](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-wf-001)、[工作交接](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-wf-003)、[可开始条件](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-wf-013) |
| KLC-A14 | 依赖协调（Dependency Coordination） | 前后置关系、输入过期和跨任务影响；不复制任务事实。 | [依赖关系](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-wf-002)、[可开始条件](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-wf-013) |
| KLC-A15 | 审阅协调（Review Coordination） | 审阅对象、反馈、确认及返工回流；交付事实单独维护。 | [审阅](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-wf-016)、[返工请求](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-wf-020)、[补拍请求](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-wf-021) |
| KLC-A16 | 交付协调（Delivery Coordination） | 交付范围、产物版本、接收和验收事实。 | [交付物](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-wf-018)、[交付事实](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-wf-019)、[质量检查](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-med-015)、[交付变体](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-med-016) |

## 3. B｜策划、内容与导演

| 组件编号 | 中文名称（英文术语） | 本组件负责的内容 | 共享主题引用 |
| --- | --- | --- | --- |
| KLC-B01 | 创意方向（Creative Direction） | 创意目标、语气、受众表达、内容方向 | [场景](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-nar-001)、[镜头](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-nar-002)、[建立镜头](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-nar-003)、[主观镜头](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-nar-009)、[构图](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-cam-023) |
| KLC-B04 | 采访设计（Interview Design） | 采访目标、对象、提纲、问题结构与内容回收 | [人物调度](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-nar-021)、[机位调度](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-nar-022)、[排练](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-nar-011) |
| KLC-B06 | 镜头覆盖策略设计（Coverage Design） | 建立、Master、Coverage、Insert、Reaction、OTS、POV | [建立镜头](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-nar-003)、[主镜头](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-nar-004)、[镜头覆盖策略](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-nar-005)、[插入镜头](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-nar-006)、[反应镜头](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-nar-007)、[过肩镜头](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-nar-008)、[主观镜头](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-nar-009) |
| KLC-B08 | 实拍分镜（Live-action Storyboard） | 面向实拍的构图、角度、运镜、焦段意图和时长 | [构图](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-cam-023)、[景别](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-cam-024)、[机位位置](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-cam-001)、[摄影角度](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-cam-003)、[运镜](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-mov-018)、[项目基准帧率](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-exp-011) |
| KLC-B09 | 视效分镜（VFX Storyboard） | 面向数字后期/特效输入的镜头拆解和前后景关系 | [构图](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-cam-023)、[遮罩](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-2d-002)、[数字合成](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-2d-007)、[三维镜头布局](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-3d-007)、[虚拟摄影机](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-3d-008)、[渲染分层输出](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-3d-014) |
| KLC-B10 | 动态分镜（Animatic） | 分镜序列、节奏、粗时长、声音参考 | [项目基准帧率](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-exp-011)、[预览产物](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-med-007)、[对白](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-aud-012)、[音乐](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-aud-014) |
| KLC-B11 | 通用预演（General Previs） | 与具体3D执行解耦的镜头/空间/时长预演 | [机位位置](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-cam-001)、[摄影角度](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-cam-003)、[视场角](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-cam-009)、[透视](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-cam-013)、[构图](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-cam-023)、[运镜](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-mov-018)、[计划事实](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-wf-004) |
| KLC-B12 | 后期内容结构（Post Story Structure） | 依据已有素材重新组织结构、节奏与信息 | [原始素材](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-med-005)、[代理素材](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-med-006)、[预览产物](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-med-007)、[母版](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-med-008)、[套底](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-med-014) |
| KLC-B13 | 剧本结构（Script Structure） | 剧本文本、段落和对白的组织；场景对象通过关系引用。 | [场景](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-nar-001)、[镜头](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-nar-002) |
| KLC-B14 | 场景结构（Scene Structure） | 场景单元、叙事上下文及镜头关系，不将镜头归为场景从属。 | [场景](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-nar-001)、[镜头](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-nar-002) |
| KLC-B15 | 内容研究（Content Research） | 研究问题、事实判断和结论范围；来源证据另列。 | [来源核验](KNOWLEDGE_FOUNDATION_AND_EXTENSIBILITY_2026-10-05.md#reference-sources) |
| KLC-B16 | 来源证据（Source Evidence） | 引用定位、资料修订、核验状态和不确定性。 | [来源核验](KNOWLEDGE_FOUNDATION_AND_EXTENSIBILITY_2026-10-05.md#reference-sources) |
| KLC-B17 | 导演意图（Directorial Intent） | 镜头表达目标及对下游方案的约束；不收纳调度参数。 | [建立镜头](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-nar-003)、[主镜头](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-nar-004)、[插入镜头](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-nar-006)、[反应镜头](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-nar-007)、[过肩镜头](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-nar-008)、[主观镜头](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-nar-009) |
| KLC-B18 | 人物调度设计（Actor Blocking Design） | 人物站位、行动、表演时机及连续性输入。 | [人物调度](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-nar-021) |
| KLC-B19 | 机位调度设计（Camera Blocking Design） | 摄影机站位、朝向、运动时机及人物行动协同。 | [机位调度](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-nar-022)、[机位位置](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-cam-001)、[摄影角度](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-cam-003)、[运镜](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-mov-018) |
| KLC-B20 | 连续性判断（Continuity Assessment） | 轴线、屏幕方向、视线和动作的独立判断依据。 | [动作轴线](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-nar-023)、[180度规则](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-nar-024)、[屏幕方向](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-nar-017)、[视线匹配](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-nar-018)、[30度规则](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-nar-019)、[动作匹配](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-nar-020) |
| KLC-B21 | 场记记录（Script Supervision Records） | 场次、镜头及实际拍摄事实的记录结构；不新增空的Take业务表。 | [镜头](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-nar-002)、[实际事实](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-wf-006) |

## 4. C｜视觉设计与美术

| 组件编号 | 中文名称（英文术语） | 本组件负责的内容 | 共享主题引用 |
| --- | --- | --- | --- |
| KLC-C01 | 视觉方向（Visual Direction） | 整体视觉语言、质感、色彩、形式一致性 | [构图](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-cam-023)、[色彩空间](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-col-002)、[传递函数](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-col-003)、[颜色查找表](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-col-007) |
| KLC-C02 | 实拍美术方向（Live-action Art Direction） | 实拍美术总体方案、空间、材质、场景状态 | [透视](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-cam-013)、[画面空间层次](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-cam-014)、[纵深构图](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-cam-020)、[硬光](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-lgt-004)、[软光](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-lgt-005)、[入射光方向](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-lgt-007) |
| KLC-C04 | 道具设计（Prop Design） | 道具造型、尺寸、状态、连续性和镜头需求 | [复位](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-nar-014)、[动作匹配](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-nar-020) |
| KLC-C05 | 实拍平面内容（Live-action Graphic） | 实拍中出现的平面、包装、标识、屏幕内容等 | [构图](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-cam-023)、[色彩空间](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-col-002)、[图像序列](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-med-003) |
| KLC-C06 | 数字视觉设计（Digital Visual Design） | 后期数字画面的版式、风格和图形方案 | [构图](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-cam-023)、[透明通道](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-2d-001)、[遮罩](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-2d-002)、[动态图形](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-2d-008)、[色彩空间](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-col-002) |
| KLC-C07 | 概念美术（Concept Art） | 人物/场景/镜头视觉概念与参考 | [构图](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-cam-023)、[透视](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-cam-013)、[色彩空间](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-col-002) |
| KLC-C08 | 插画（Illustration） | 插画风格、构图、输出与后续动画/合成输入 | [构图](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-cam-023)、[透明通道](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-2d-001)、[遮罩](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-2d-002)、[图像序列](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-med-003) |
| KLC-C09 | 人物视觉开发（Character Visual Development） | 动画/数字人物造型、形态和视觉连续性 | [构图](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-cam-023)、[二维动画](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-2d-010)、[绑定控制系统](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-3d-006)、[三维动画](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-3d-009)、[人物调度](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-nar-021) |
| KLC-C11 | 信息图形（Information Graphics） | 信息结构、视觉层级、静态/动态信息图方案 | [动态图形](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-2d-008) |
| KLC-C12 | 产品造型（Product Styling） | 产品画面状态、摆位、反射、连续性 | [画面空间层次](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-cam-014)、[构图](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-cam-023)、[硬光](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-lgt-004)、[软光](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-lgt-005)、[入射光方向](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-lgt-007)、[复位](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-nar-014) |
| KLC-C13 | 食品造型（Food Styling） | 食品画面状态、连续性、镜头与灯光协同 | [画面空间层次](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-cam-014)、[构图](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-cam-023)、[硬光](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-lgt-004)、[软光](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-lgt-005)、[入射光方向](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-lgt-007)、[复位](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-nar-014) |
| KLC-C14 | 布景设计（Set Design） | 为实际布景提供空间方案和制作输入。 | [透视](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-cam-013)、[画面空间层次](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-cam-014) |
| KLC-C15 | 环境视觉设计（Environment Visual Design） | 环境形态和空间背景方案；数字执行通过对应专业关系连接。 | [透视](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-cam-013)、[纵深构图](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-cam-020) |
| KLC-C16 | 字体设计（Typography Design） | 字体形态、文字层级和可读性方案。 | [文字动画](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-2d-009) |
| KLC-C17 | 标题设计（Title Design） | 标题内容的画面组织和视觉身份，不复制字体定义。 | [文字动画](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-2d-009) |

## 5. D｜摄影、灯光、录音与现场

| 组件编号 | 中文名称（英文术语） | 本组件负责的内容 | 共享主题引用 |
| --- | --- | --- | --- |
| KLC-D03 | 镜头光学（Lens Optics） | 焦距、F/T-stop、coverage、focus、anamorphic、官方AoV | [物理焦距](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-opt-001)、[镜头像场覆盖](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-opt-004)、[几何光圈F值](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-opt-007)、[透光光圈T值](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-opt-008)、[对焦距离](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-opt-011)、[景深](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-opt-015)、[变形成像镜头](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-opt-022)、[视场角](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-cam-009) |
| KLC-D04 | 焦点控制（Focus） | 对焦目标、MFD、Rack Focus、DOF、Focus Control | [对焦距离](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-opt-011)、[最近对焦距离](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-opt-012)、[焦点转移](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-opt-013)、[呼吸效应](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-opt-014)、[景深](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-opt-015)、[超焦距](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-opt-016)、[弥散圆](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-opt-017) |
| KLC-D05 | 摄影机运动（Camera Movement） | 摄影机旋转、平移、升降和环绕的轨迹；摇臂、稳定器及光学变焦分别引用，不混成运动类型。 | [运镜](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-mov-018)、[水平摇摄](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-mov-001)、[俯仰摇摄](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-mov-002)、[滚转](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-mov-003)、[升降移动](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-mov-004)、[横向移机](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-mov-005)、[纵向移机](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-mov-006)、[环绕移机](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-mov-007) |
| KLC-D06 | 摄影机支撑（Camera Support） | 三脚架、云台、底座、导管、快拆的承托和连接条件；稳定器、跟焦、遮光斗、滤镜承载系统各有独立组件。 | [机械安装接口](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-if-002)、[快拆接口](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-if-007)、[直接兼容](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-if-008)、[有条件兼容](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-if-010)、[明确不兼容](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-if-011)、[兼容路径](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-if-012) |
| KLC-D07 | 航拍成像（Aerial Imaging） | Drone内置模组、航拍机位和素材能力 | [无人机移动摄影](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-mov-012)、[内置成像模组](EQUIPMENT_REFERENCE_FIELD_CONTRACT_2026-10-05.md#equipment-fields-3) |
| KLC-D09 | 灯光设计（Lighting Design） | Key/Fill/Back、光质、方向、反差 | [主光](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-lgt-001)、[补光](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-lgt-002)、[背光](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-lgt-018)、[轮廓光](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-lgt-019)、[硬光](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-lgt-004)、[软光](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-lgt-005)、[入射光方向](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-lgt-007)、[反差比](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-lgt-009) |
| KLC-D10 | 灯具（Lighting Fixture） | 灯具输出、CCT、控制、原生modifier接口、附件 | [光源表观尺寸](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-lgt-006)、[入射光方向](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-lgt-007)、[照度平方反比规律](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-lgt-010)、[相关色温](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-lgt-011)、[机械安装接口](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-if-002)、[供电接口](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-if-003)、[控制接口](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-if-006) |
| KLC-D11 | 控光附件（Lighting Modifier） | Softbox、Fresnel、Projection、Grid等及兼容路径 | [控光附件](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-lgt-013)、[菲涅耳透镜](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-lgt-014)、[柔光箱](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-lgt-015)、[控光格栅](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-lgt-016)、[投影附件](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-lgt-017)、[机械安装接口](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-if-002)、[有条件兼容](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-if-010)、[兼容路径](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-if-012) |
| KLC-D12 | 灯光支撑（Lighting Support） | Light Stand、C-Stand、Boom、Pin/Receiver等 | [机械安装接口](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-if-002)、[直接兼容](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-if-008)、[有条件兼容](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-if-010)、[明确不兼容](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-if-011) |
| KLC-D14 | 现场录音（Production Sound） | 现场录音、话筒类型、Boom/Lav、信号级别 | [话筒类型](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-aud-001)、[拾音指向性](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-aud-002)、[挑杆收音](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-aud-003)、[领夹话筒](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-aud-004)、[话筒电平](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-aud-005)、[线路电平](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-aud-006)、[音频采样率](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-aud-007)、[音频位深](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-aud-008) |
| KLC-D17 | 现场影像技术（DIT） | 现场监看、录制解释和色彩处理的技术判断；素材完整性、备份、交接各有独立组件。 | [摄影机记录色彩数据流](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-col-021)、[色彩空间](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-col-002)、[传递函数](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-col-003)、[颜色查找表](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-col-007)、[元数据](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-med-009) |
| KLC-D20 | 多机位协调（Multi-camera Coordination） | 多Body独立镜头/adapter路径、同步和素材身份 | [同步](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-aud-010)、CompatibilityPath |
| KLC-D21 | 提词系统（Teleprompter） | 提词内容、位置、反射/机位和表演配合 | camera support commons |
| KLC-D23 | 构图设计（Composition Design） | 画面主体、层次、留白和平衡；摄影角度另列。 | [构图](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-cam-023)、[画面空间层次](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-cam-014)、[头顶留白](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-cam-015)、[运动方向留白](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-cam-021)、[视线方向留白](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-cam-022)、[三分构图](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-cam-017)、[对称构图](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-cam-018)、[纵深构图](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-cam-020) |
| KLC-D24 | 摄影角度设计（Camera Angle Design） | 观察朝向和角度表达，不把视场角作为观察角度。 | [摄影角度](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-cam-003)、[平视](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-cam-004)、[俯拍](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-cam-005)、[仰拍](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-cam-006)、[顶拍](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-cam-007) |
| KLC-D25 | 机位设计（Camera Position Design） | 摄影机空间位置和高度；运动时机引用机位调度。 | [机位位置](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-cam-001)、[机位高度](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-cam-002) |
| KLC-D26 | 视场判断（Field-of-view Assessment） | 基于有效区域、镜头投影和官方视角判断覆盖范围。 | [视场角](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-cam-009)、[水平视场角](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-cam-010)、[垂直视场角](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-cam-011)、[对角视场角](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-cam-012) |
| KLC-D27 | 透视判断（Perspective Assessment） | 依据机位和主体空间关系判断透视。 | [透视](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-cam-013) |
| KLC-D28 | 摄影机资料（Camera Reference） | 型号身份、原生能力和独立内置成像模组；录制模式另列。 | [有效成像区域](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-opt-002)、[连接接口](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-if-001) |
| KLC-D29 | 录制模式（Recording Mode） | 模式下的有效区域、分辨率、帧率、格式和色彩能力；每项参数单独查询。 | [帧率](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-exp-010)、[项目基准帧率](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-exp-011)、[拍摄帧率](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-exp-012)、[回放帧率](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-exp-013)、[摄影机记录色彩数据流](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-col-021)、[媒体容器](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-med-001)、[编解码器](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-med-002) |
| KLC-D30 | 产品摄影（Product Photography） | 产品呈现、反射和细节表达；近距离光学限制另列。 | [构图](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-cam-023)、[硬光](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-lgt-004)、[软光](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-lgt-005)、[入射光方向](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-lgt-007) |
| KLC-D31 | 微距摄影（Macro Photography） | 放大比例、对焦距离和景深限制；不假定所有产品摄影均为微距。 | [对焦距离](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-opt-011)、[最近对焦距离](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-opt-012)、[景深](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-opt-015) |
| KLC-D32 | 供电（Power Supply） | 供电能力、输入条件和供电关系。 | [供电接口](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-if-003) |
| KLC-D33 | 配电（Power Distribution） | 分路负载和配电连接的基础判断，不写现场操作教程。 | [供电接口](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-if-003) |
| KLC-D34 | 无线音频（Wireless Audio） | 无线发射、接收和音频链路能力。 | [话筒电平](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-aud-005)、[线路电平](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-aud-006) |
| KLC-D35 | 音频接口（Audio Interface） | 音频输入输出、电平和连接条件；不混入摄影视频接口。 | [话筒电平](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-aud-005)、[线路电平](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-aud-006)、[数据接口](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-if-005) |
| KLC-D36 | 时间码（Timecode） | 时间码表示、基准和标识边界。 | [时间码](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-aud-009) |
| KLC-D37 | 同步（Synchronization） | 设备或音画时间对齐的条件；有时间码不等同已同步。 | [同步](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-aud-010) |
| KLC-D38 | 素材完整性（Media Integrity） | 文件集合和校验结果；不代表已有独立备份。 | [完整性校验](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-med-011) |
| KLC-D39 | 备份验证（Backup Verification） | 备份目标和验证结果；不代表已完成交接。 | [备份验证](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-med-012) |
| KLC-D40 | 素材交接（Media Handoff） | 固定版本、接收对象及交接条件。 | [正式素材交接](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-med-013) |
| KLC-D41 | 场地协调（Location Coordination） | 场地信息和使用时段，不将场地归为镜头从属。 | [场景](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-nar-001)、[排期条目](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-wf-009) |
| KLC-D42 | 现场协调（Set Coordination） | 现场活动顺序和人员协同；场地资料通过关系引用。 | [排练](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-nar-011)、[拍摄准备](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-nar-012)、[拍摄执行](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-nar-013)、[复位](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-nar-014)、[撤场](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-nar-015) |
| KLC-D43 | 花絮拍摄（Behind-the-scenes Capture） | 主拍摄之外的制作过程记录。 | [镜头](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-nar-002) |
| KLC-D44 | 剧照摄影（Still Photography） | 静态影像资料的画面需求和产物身份。 | [构图](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-cam-023)、[原始素材](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-med-005) |
| KLC-D45 | 稳定器（Gimbal） | 平衡、空间、承重和控制功能；不是摄影机运动轨迹。 | [电控稳定器移动摄影](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-mov-010)、[机械稳定系统移动摄影](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-mov-011)、[快拆接口](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-if-007) |
| KLC-D46 | 滤镜（Filter） | 滤镜作用和安装条件；密度不是任意ND档数。 | [中性密度减光](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-exp-007)、[机械安装接口](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-if-002) |
| KLC-D47 | 遮光斗（Matte Box） | 遮光作用、安装方式、槽位和遮挡条件。 | [机械安装接口](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-if-002) |
| KLC-D48 | 滤镜架（Filter Holder） | 滤镜承载、连接端点和旋转锁紧条件。 | [机械安装接口](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-if-002) |
| KLC-D49 | 滤镜托盘（Filter Tray） | 片幅、厚度、方向、防脱和承载条件。 | [机械安装接口](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-if-002) |
| KLC-D50 | 镜头连接环（Lens Connection Ring） | 镜头前端和安装系统的连接条件，不替代镜头卡口。 | [机械安装接口](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-if-002) |
| KLC-D51 | 光学附件（Optical Attachment） | 附加光学作用及明确宿主范围，禁止按类别自动适配。 | [物理焦距](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-opt-001)、[镜头像场覆盖](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-opt-004)、[视场角](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-cam-009) |
| KLC-D52 | 监看（Monitoring） | 显示能力、视频输入和色彩解释。 | [标准动态范围](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-col-010)、[高动态范围](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-col-011)、[视频接口](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-if-004) |
| KLC-D53 | 视频传输（Video Transmission） | 发送接收方向、信号能力和协议条件。 | [视频接口](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-if-004)、[数据接口](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-if-005) |

## 6. E｜出镜、表演与造型

| 组件编号 | 中文名称（英文术语） | 本组件负责的内容 | 共享主题引用 |
| --- | --- | --- | --- |
| KLC-E01 | 选角（Casting） | Character↔Person、候选、确认、档期、出镜需求 | identity/workflow commons |
| KLC-E02 | 表演（Acting） | 角色目标、表演状态、镜头覆盖和连续性 | [人物调度](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-nar-021)、[排练](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-nar-011)、[动作匹配](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-nar-020)、[景别](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-cam-024) |
| KLC-E03 | 群演（Extras / Crowd） | 群演组织、画面分布、连续性 | blocking/coverage |
| KLC-E04 | 模特表演（Model Performance） | 产品/人物展示、动作、镜头与造型配合 | camera/lighting commons |
| KLC-E06 | 采访表演（Interview Performance） | 采访对象/主持互动、视线和收声 | [人物调度](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-nar-021)、[排练](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-nar-011)、[对白](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-aud-012)、[景别](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-cam-024) |
| KLC-E07 | 声音表演（Voice Performance） | 旁白/配音文本版本、表演意图和录制输入 | [对白](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-aud-012)、[现场录音](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-aud-011)、[音频采样率](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-aud-007)、[音频位深](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-aud-008) |
| KLC-E08 | 表演指导（Performance Direction） | 动作、情绪、节奏和导演协同 | KLC-B05 |
| KLC-E11 | 服装（Costume） | 服装造型、Scene/Shot连续性和状态 | continuity commons |
| KLC-E12 | 化妆（Makeup） | 化妆状态、连续性、灯光/摄影影响 | continuity/color commons |
| KLC-E13 | 发型（Hair） | 发型状态、连续性和镜头关系 | continuity commons |
| KLC-E14 | 人物整体造型（Character Styling） | 服装/妆发/配饰整体人物状态 | KLC-E11—E13 |
| KLC-E15 | 主持（Hosting） | 串联内容、互动和主持表达。 | [人物调度](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-nar-021) |
| KLC-E16 | 口播（Presentation to Camera） | 面向镜头表达口头内容，文本和表演意图单独引用。 | [人物调度](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-nar-021)、[对白](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-aud-012) |
| KLC-E17 | 特技表演（Stunt Performance） | 特技表演目标、拍摄协同和风险提示。 | [人物调度](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-nar-021) |
| KLC-E18 | 动作设计（Action Design） | 动作结构和镜头协同，不将所有动作等同特技。 | [人物调度](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-nar-021)、[动作匹配](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-nar-020) |
| KLC-E19 | 舞蹈表演（Dance Performance） | 舞蹈动作表达和执行需求。 | [人物调度](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-nar-021) |
| KLC-E20 | 舞蹈编排（Choreography） | 舞蹈段落和人员位置设计。 | [人物调度](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-nar-021) |

## 7. F｜AE、MG、二维动画与合成

| 组件编号 | 中文名称（英文术语） | 本组件负责的内容 | 共享主题引用 |
| --- | --- | --- | --- |
| KLC-F01 | 动画指导（Animation Direction） | 动画风格、节奏、审阅与跨工种输入输出 | [动态图形](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-2d-008)、[文字动画](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-2d-009)、[二维动画](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-2d-010)、[审阅](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-wf-016) |
| KLC-F02 | 动态图形设计（Motion Graphics Design） | MG方案、版式、运动逻辑和信息层级 | [动态图形](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-2d-008) |
| KLC-F03 | 动态图形制作（Motion Graphics Production） | 已确认MG方案的动画实现和版本 | [动态图形](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-2d-008) |
| KLC-F04 | AE图像制作（AE-based Image Production） | 合成/图层/文字/动画类AE工作输入输出 | [透明通道](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-2d-001)、[遮罩](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-2d-002)、[数字合成](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-2d-007)、[合成色彩数据流](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-col-022) |
| KLC-F05 | 逐帧二维动画（Frame-by-frame 2D） | 逐帧二维动画资产和镜头输出 | [二维动画](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-2d-010) |
| KLC-F06 | 二维绑定（2D Rigging） | 二维角色控制/变形结构 | animation commons |
| KLC-F07 | 二维角色动画（2D Character Animation） | 二维角色动作、表情和镜头输出 | [二维动画](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-2d-010) |
| KLC-F08 | 视觉包装设计（Package Design） | 包装/栏目视觉方案 | [动态图形](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-2d-008)、[文字动画](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-2d-009) |
| KLC-F09 | 视觉包装动画（Package Animation） | 已确认包装方案的动画执行 | [动态图形](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-2d-008)、[二维动画](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-2d-010) |
| KLC-F10 | 文字运动设计（Typography Motion Design） | 字效方案 | [文字动画](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-2d-009) |
| KLC-F11 | 文字动画制作（Typography Animation） | 字效动画执行 | [文字动画](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-2d-009) |
| KLC-F12 | 数字合成（Digital Compositing） | Plate/CG/graphics整合、Alpha/Matte与色彩数据流 | [透明通道](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-2d-001)、[遮罩](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-2d-002)、[数字合成](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-2d-007)、[合成色彩数据流](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-col-022) |
| KLC-F15 | 二维跟踪（2D Tracking） | 点/平面/对象等二维跟踪结果与下游输入 | [跟踪](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-2d-005) |
| KLC-F16 | 数字绘景（Matte Painting） | 数字绘景、分层和合成输入 | [透视](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-cam-013)、[画面空间层次](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-cam-014)、[透明通道](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-2d-001)、[遮罩](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-2d-002)、[数字合成](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-2d-007) |
| KLC-F17 | 二维特效（2D Effects） | 二维特效元素与合成输入输出 | [透明通道](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-2d-001)、[遮罩](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-2d-002)、[跟踪](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-2d-005)、[数字合成](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-2d-007) |
| KLC-F18 | 合成色彩数据流（Composite Color Pipeline） | 合成工作空间、输入/输出和格式关系 | [合成色彩数据流](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-col-022)、FormatRelation |
| KLC-F19 | 抠像（Keying） | 基于颜色等条件分离主体。 | [抠像](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-2d-003) |
| KLC-F20 | 转描遮罩（Rotoscope Matte） | 逐帧描绘分离区域，输入输出不与抠像合并。 | [逐帧描绘遮罩](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-2d-004) |
| KLC-F21 | 画面擦除（Object Removal） | 明确擦除目标和结果边界。 | [画面擦除](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-2d-011) |
| KLC-F22 | 画面修补（Image Repair） | 参考区域、恢复目标和结果检查。 | [画面修补](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-2d-012) |

## 8. G｜三维制作与三维视效

| 组件编号 | 中文名称（英文术语） | 本组件负责的内容 | 共享主题引用 |
| --- | --- | --- | --- |
| KLC-G01 | 三维制作统筹（CG Supervision） | 三维/VFX整体制作目标、审阅和跨环节协调 | [三维镜头布局](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-3d-007)、[三维动画](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-3d-009)、[模拟](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-3d-010)、[渲染](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-3d-013)、[工作交接](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-wf-003)、[审阅](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-wf-016) |
| KLC-G02 | 三维制作流程（CG Pipeline） | Asset/Shot、版本、cache、render、handoff | [网格](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-3d-001)、[绑定控制系统](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-3d-006)、[缓存](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-3d-011)、[渲染分层输出](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-3d-014)、[工程交换](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-med-004)、[工作交接](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-wf-003) |
| KLC-G03 | 建模（Modeling） | Mesh、Topology、模型输出 | [网格](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-3d-001)、[拓扑](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-3d-002) |
| KLC-G04 | 数字雕刻（Sculpting） | 高精度形体/细节数字雕刻 | modeling commons |
| KLC-G05 | 三维环境（Environment） | 三维场景/环境资产及镜头使用 | [网格](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-3d-001)、[材质](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-3d-004)、[三维镜头布局](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-3d-007)、[三维灯光](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-3d-012) |
| KLC-G06 | 纹理制作（Texturing） | 纹理输入、UV、贴图输出 | [纹理坐标UV](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-3d-003) |
| KLC-G08 | 绑定（Rigging） | 骨骼/控制/变形结构 | [绑定控制系统](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-3d-006) |
| KLC-G10 | 三维镜头布局（Layout） | 成片制作阶段的场景/角色/相机布局 | [三维镜头布局](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-3d-007) |
| KLC-G11 | 三维动画（3D Animation） | 角色、物体、相机动画 | [三维动画](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-3d-009) |
| KLC-G13 | 特效模拟（FX Simulation） | 粒子、流体、破碎等模拟 | [模拟](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-3d-010)、[缓存](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-3d-011) |
| KLC-G14 | 三维灯光（CG Lighting） | 数字光源、曝光/色彩目标 | [三维灯光](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-3d-012)、lighting/color commons |
| KLC-G15 | 渲染（Rendering） | Render、AOV、输出格式 | [渲染](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-3d-013)、[渲染分层输出](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-3d-014)、FormatRelation |
| KLC-G16 | 渲染色彩数据流（Render Color Pipeline） | Scene-linear、render output、display transform | [渲染色彩数据流](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-col-023) |
| KLC-G17 | 实时技术准备（Realtime Technical Preparation） | 实时制作方案、资产/性能/流程准备 | [实时渲染](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-3d-015)、[虚拟制作](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-3d-016) |
| KLC-G18 | 实时引擎制作（Realtime Engine Production） | 实际实时引擎场景/画面制作 | [实时渲染](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-3d-015)、[虚拟制作](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-3d-016) |
| KLC-G19 | 动作捕捉采集（Mocap Capture） | 动作采集输入/身份/数据 | [动作捕捉](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-3d-017) |
| KLC-G20 | 动捕数据清理（Mocap Cleanup） | 动捕数据清理、修正与动画输入 | [动作捕捉](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-3d-017) |
| KLC-G22 | 三维重建（Reconstruction） | 摄影测量/扫描数据重建为资产 | [摄影测量](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-3d-018) |
| KLC-G23 | 现场视效统筹（VFX On-set Supervision） | 为后期VFX保证现场条件和参考 | camera/lighting/tracking commons |
| KLC-G26 | 材质制作（Material Production） | 表面材质结构和着色输入。 | [材质](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-3d-004)、[着色器](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-3d-005) |
| KLC-G27 | 外观开发（Look Development） | 结合材质、灯光和渲染评估外观；不拥有它们的参数。 | [材质](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-3d-004)、[着色器](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-3d-005)、[三维灯光](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-3d-012)、[渲染](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-3d-013) |
| KLC-G28 | 三维预演（3D Previsualization） | 通过三维执行验证镜头方案和粗时长。 | [三维镜头布局](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-3d-007) |
| KLC-G29 | 虚拟摄影（Virtual Cinematography） | 虚拟摄影机的独立参数和镜头执行。 | [虚拟摄影机](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-3d-008) |
| KLC-G30 | 毛发制作（Groom Production） | 毛发形态、资产和模拟输入。 | [模拟](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-3d-010) |
| KLC-G31 | 布料制作（Cloth Production） | 布料资产、运动条件和模拟输入。 | [模拟](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-3d-010) |
| KLC-G32 | 扫描采集（Scanning Capture） | 扫描原始数据及采集条件。 | [网格](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-3d-001) |
| KLC-G33 | 摄影测量采集（Photogrammetry Capture） | 照片集及重建输入；不与扫描数据默认互换。 | [摄影测量](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-3d-018) |
| KLC-G34 | 视效参考采集（VFX Reference Capture） | 供后期解释现场条件的参考影像。 | [原始素材](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-med-005) |
| KLC-G35 | 现场测量采集（On-set Measurement Capture） | 供空间重建和匹配的测量数据，具体量单独定义。 | [机位位置](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-cam-001)、[虚拟摄影机](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-3d-008) |
| KLC-G36 | 技术美术（Technical Art） | 数字资产的技术约束和专业支持。 | [网格](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-3d-001)、[材质](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-3d-004)、[着色器](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-3d-005) |
| KLC-G37 | 制作流程支持（Pipeline Support） | 跨环节数据结构和工具支持；不复制各环节内容。 | [工作交接](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-wf-003)、[工程交换](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-med-004) |

## 9. H｜剪辑、声音、成片与交付

| 组件编号 | 中文名称（英文术语） | 本组件负责的内容 | 共享主题引用 |
| --- | --- | --- | --- |
| KLC-H01 | 剪辑（Editorial） | 素材选择、时间线、节奏、版本 | [原始素材](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-med-005)、[代理素材](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-med-006)、[套底](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-med-014)、[动作匹配](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-nar-020)、[审阅](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-wf-016) |
| KLC-H02 | 剪辑助理（Assistant Editorial） | ingest/proxy/sync/metadata/project组织 | [元数据](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-med-009)、[完整性校验](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-med-011)、[备份验证](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-med-012)、[正式素材交接](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-med-013)、[套底](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-med-014) |
| KLC-H04 | 素材来源授权（Source Authorization） | 素材授权资料与交付检查 | [制作授权要求](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-wf-015) |
| KLC-H05 | 调色（Color Grading） | 镜头匹配、Look、调色版本 | [色彩空间](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-col-002)、[传递函数](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-col-003)、[颜色查找表](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-col-007)、[学院色彩编码体系ACES](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-col-019)、[后期色彩数据流](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-col-024)、[母版](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-med-008) |
| KLC-H06 | 后期色彩数据流（Post Color Pipeline） | conform→grade→online→master颜色数据流 | [后期色彩数据流](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-col-024) |
| KLC-H07 | 声音设计（Sound Design） | 声音层次、设计和素材关系 | [对白](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-aud-012)、[音效](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-aud-013)、[音乐](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-aud-014)、[混音](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-aud-015) |
| KLC-H08 | 对白编辑（Dialogue Edit） | 对白整理、修复、版本 | [对白](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-aud-012) |
| KLC-H09 | 音效编辑（SFX Edit） | 音效素材和时间线 | [音效](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-aud-013) |
| KLC-H10 | 拟音（Foley） | 拟音录制/编辑及画面同步 | [音效](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-aud-013)、[同步](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-aud-010) |
| KLC-H11 | 配音录制（Voice Recording） | 配音/旁白录制与take/版本 | [音频采样率](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-aud-007)、[音频位深](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-aud-008)、[对白](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-aud-012) |
| KLC-H12 | 音乐制作（Music Production） | 作曲/编曲和音乐版本 | [音乐](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-aud-014) |
| KLC-H14 | 混音（Mix） | Dialogue/Music/SFX整合和输出 | [混音](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-aud-015) |
| KLC-H15 | 字幕（Subtitle） | 字幕文本、时间和版本 | FormatReference |
| KLC-H16 | 本地化（Localization） | 多语言文本/声音/版本 | FormatReference |
| KLC-H17 | 在线套底（Online / Conform） | 原素材回批、成片整理 | [套底](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-med-014) |
| KLC-H18 | 最终质量检查（Final QC） | 画面、声音、文字、格式、授权/Checklist检查 | [质量检查](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-med-015)、[可开始条件](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-wf-013)、[检查清单](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-wf-014)、[制作授权要求](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-wf-015) |
| KLC-H19 | 母版制作（Mastering） | Master与交付变体生成 | [母版](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-med-008)、[交付变体](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-med-016) |
| KLC-H20 | 交付（Delivery） | 输出、提交、送达、确认、验收/退回 | [交付物](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-wf-018)、[交付事实](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-wf-019) |
| KLC-H22 | 素材检索（Source Retrieval） | 按需求查找候选素材。 | [原始素材](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-med-005) |
| KLC-H23 | 素材研究（Source Research） | 评估候选素材内容和事实范围；授权另列。 | [元数据](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-med-009) |
| KLC-H24 | 音乐编辑（Music Editing） | 既定音乐素材的结构和时长编辑。 | [音乐](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-aud-014) |
| KLC-H25 | 选曲（Music Selection） | 依照表达需求选择音乐；权利来源独立引用。 | [音乐](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-aud-014)、[制作授权要求](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-wf-015) |
| KLC-H26 | 格式判断（Format Assessment） | 容器、编码和交换格式的选择条件。 | [媒体容器](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-med-001)、[编解码器](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-med-002)、[图像序列](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-med-003)、[工程交换](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-med-004) |
| KLC-H27 | 转码（Transcoding） | 固定输入版本的编码转换和结果检查。 | [编解码器](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md#pc-med-002) |

## 10. 跨组件知识关系

以下是知识引用或输入输出解释，顺序不创建项目依赖，不强制所有拍摄都经历全部步骤。每条正式关系保存原因、方向、适用条件、来源和两端修订。

| 起点 | 关系 | 终点 | 原因 |
| --- | --- | --- | --- |
| `KLC-B06` | `REFERENCES_COMMON_TOPIC` | `PC-NAR-005` | 镜头覆盖引用共享策略定义 |
| `KLC-B18` | `COORDINATES_WITH` | `KLC-B19` | 人物行动时机需要和摄影机行动协同 |
| `KLC-D23` | `REFERENCES_COMMON_TOPIC` | `PC-CAM-023` | 构图正文只维护一次 |
| `KLC-D05` | `REFERENCES_COMMON_TOPIC` | `PC-MOV-018` | 运镜只引用旋转或位置变化定义 |
| `KLC-D26` | `COORDINATES_WITH` | `KLC-D03` | 视场判断消费镜头光学和有效区域，不能反写型号规格 |
| `KLC-D46` | `COORDINATES_WITH` | `KLC-D48` | 承载条件分别维护，具体安装证据只在真实资料 |
| `KLC-D47` | `COORDINATES_WITH` | `KLC-D06` | 安装条件引用支撑规格，不归支撑所有 |
| `KLC-D38` | `INPUT_TO` | `KLC-D40` | 交接可引用完整性结果，完整性不等于交接 |
| `KLC-D39` | `INPUT_TO` | `KLC-D40` | 备份验证可作为独立交接条件 |
| `KLC-G15` | `OUTPUT_TO` | `KLC-F12` | 渲染产物供合成消费；保留固定产物版本 |
| `KLC-F12` | `OUTPUT_TO` | `KLC-H17` | 合成产物进入套底，格式和色彩条件独立说明 |
| `KLC-D14` | `OUTPUT_TO` | `KLC-H08` | 现场对白素材供后期对白编辑 |
| `KLC-E11` | `COORDINATES_WITH` | `KLC-B20` | 服装状态影响连续性判断 |
| `KLC-H20` | `INPUT_TO` | `KLC-A09` | 交付事实仅作为粗粒度时长的来源，不记录个人效率 |

### 10.1 岗位专业域的独立组件索引

专业域是岗位检索范围；下列组件分别维护，不以域名称合并正文。原139岗位编号和域绑定不变。

| 专业域编号 | 有效组件编号 |
| --- | --- |
| KA-01 | KLC-A11、KLC-A12 |
| KA-02 | KLC-A02、KLC-A13、KLC-A14、KLC-A04、KLC-A05、KLC-A09、KLC-A10 |
| KA-03 | KLC-A15、KLC-A16 |
| KA-04 | KLC-A06、KLC-A15、KLC-A16、KLC-A08 |
| KA-05 | KLC-A06 |
| KB-01 | KLC-B01 |
| KB-02 | KLC-B13、KLC-B14 |
| KB-03 | KLC-B15、KLC-B16 |
| KB-04 | KLC-B04 |
| KB-05 | KLC-B17、KLC-B18、KLC-B19、KLC-B06 |
| KB-06 | KLC-B20、KLC-B21 |
| KB-07 | KLC-B08 |
| KB-08 | KLC-B09 |
| KB-09 | KLC-B10、KLC-B11 |
| KB-10 | KLC-B12 |
| KC-01 | KLC-C01 |
| KC-02 | KLC-C02、KLC-C14、KLC-C15、KLC-C04 |
| KC-03 | KLC-C05、KLC-C07 |
| KC-04 | KLC-C06、KLC-C07 |
| KC-05 | KLC-C06 |
| KC-06 | KLC-C08、KLC-C09 |
| KC-07 | KLC-C14、KLC-C15、KLC-C07 |
| KC-08 | KLC-C16、KLC-C17 |
| KC-09 | KLC-C11 |
| KC-10 | KLC-C12、KLC-C13 |
| KD-01 | KLC-D23、KLC-D24、KLC-D25、KLC-D26、KLC-D27、KLC-D46、KLC-D47、KLC-D48、KLC-D49、KLC-D50、KLC-D51、KLC-D52、KLC-D53、KLC-D03 |
| KD-02 | KLC-D28、KLC-D29、KLC-D06、KLC-D46、KLC-D47、KLC-D48、KLC-D49、KLC-D50、KLC-D51、KLC-D52、KLC-D53、KLC-D03 |
| KD-03 | KLC-D04、KLC-D50、KLC-D51 |
| KD-04 | KLC-D07 |
| KD-05 | KLC-D05、KLC-D06、KLC-D45 |
| KD-06 | KLC-D30、KLC-D31 |
| KD-07 | KLC-D09、KLC-D10、KLC-D11、KLC-D12 |
| KD-08 | KLC-D32、KLC-D33 |
| KD-09 | KLC-D14、KLC-D34、KLC-D35、KLC-D36、KLC-D37 |
| KD-10 | KLC-D17、KLC-D38、KLC-D39、KLC-D40 |
| KD-11 | KLC-D17、KLC-D38、KLC-D39、KLC-D40 |
| KD-12 | KLC-D41、KLC-D42 |
| KD-13 | KLC-D20、KLC-D21、KLC-D43、KLC-D44 |
| KE-01 | KLC-E01 |
| KE-02 | KLC-E02、KLC-E03、KLC-E04 |
| KE-03 | KLC-E15、KLC-E16、KLC-E06 |
| KE-04 | KLC-E07 |
| KE-05 | KLC-E08 |
| KE-06 | KLC-E17、KLC-E18、KLC-E19、KLC-E20 |
| KE-07 | KLC-E11、KLC-E12、KLC-E13、KLC-E14 |
| KF-01 | KLC-F01 |
| KF-02 | KLC-F02、KLC-F03 |
| KF-03 | KLC-F04 |
| KF-04 | KLC-F05、KLC-F06、KLC-F07 |
| KF-05 | KLC-F08、KLC-F09 |
| KF-06 | KLC-F10、KLC-F11 |
| KF-07 | KLC-F12、KLC-F18 |
| KF-08 | KLC-F19、KLC-F20 |
| KF-09 | KLC-F21、KLC-F22 |
| KF-10 | KLC-F15 |
| KF-11 | KLC-F16、KLC-F17 |
| KG-01 | KLC-G01、KLC-G02 |
| KG-02 | KLC-G03、KLC-G04 |
| KG-03 | KLC-G05 |
| KG-04 | KLC-G06、KLC-G26、KLC-G27 |
| KG-05 | KLC-G08 |
| KG-06 | KLC-G28、KLC-G29、KLC-G10 |
| KG-07 | KLC-G11 |
| KG-08 | KLC-G30、KLC-G31 |
| KG-09 | KLC-G13 |
| KG-10 | KLC-G14、KLC-G15、KLC-G16 |
| KG-11 | KLC-G17、KLC-G18 |
| KG-12 | KLC-G19、KLC-G20 |
| KG-13 | KLC-G32、KLC-G33、KLC-G22 |
| KG-14 | KLC-G23、KLC-G34、KLC-G35 |
| KG-15 | KLC-G36、KLC-G37 |
| KH-01 | KLC-H01、KLC-H02 |
| KH-02 | KLC-H22、KLC-H23 |
| KH-03 | KLC-H04 |
| KH-04 | KLC-H05、KLC-H06 |
| KH-05 | KLC-H07、KLC-H08、KLC-H09、KLC-H10 |
| KH-06 | KLC-H11 |
| KH-07 | KLC-H12、KLC-H24、KLC-H25 |
| KH-08 | KLC-H14 |
| KH-09 | KLC-H15、KLC-H16 |
| KH-10 | KLC-H17 |
| KH-11 | KLC-H18 |
| KH-12 | KLC-H19、KLC-H20、KLC-H26、KLC-H27 |

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

## 12. 分类层级按实际总分关系展开

### 12.1 大类的来源

按[工种目录](JOB_CATALOG_DEFINITIONS_2026-10-05.md)的 A–H 建立大类，再展开知识小类、下级类型和字段。原岗位编号、名称和职责不变；制作分工继续独立记录，不与知识层级混为一条分类路径。

### 12.2 按需要细分

取消固定层数限制。不要求分类固定为 Library→Domain→Component→Subcomponent；需要清晰的小类或下级类型时可继续展开，不为凑层数建立空分类。已有组件及主题编号继续作为资料身份，不由这次目录示例自动改号。

景别下面才放远景、中景等下级类型。摄影机可以按本类品牌、型号、资料分项和字段浏览。层级应有明确总分关系，不把类别、实例、字段和值平排。

### 12.3 什么不能当作父子关系

仅因同时使用、相互影响或同岗位会读取，不能建立父子分类。焦距、光圈、视场角分别维护；摄影机、镜头、滤镜、遮光斗和电池各在自己的小类中维护。实际适配用带条件和证据的连接表示。

目录分组不决定业务所有权。KnowledgeTopic、EquipmentModel、SoftwareProduct、FormatDefinition 等仍保持各自身份；同一知识可以由多个岗位引用，不能因此复制成多份正文。

### 12.4 字段与岗位关联

字段先有明确所属小类和对象，再按工种目录的真实职责建立岗位关联，写清用途和适用条件。岗位关联不是字段授权、人员任职、项目任务或器材兼容证据。

### 12.5 先审核案例

[摄影机案例](KNOWLEDGE_CAMERA_CLASS_REVIEW_CASE_2026-10-05.md)、[镜头运动案例](KNOWLEDGE_CAMERA_MOVEMENT_REVIEW_CASE_2026-10-05.md)及[字段—岗位表](KNOWLEDGE_FIELD_ROLE_ASSOCIATIONS_REVIEW_2026-10-05.md)均为待确认提案。其他目录待案例核实后统一修改。取消的留白不作为后续有效内容。

## 13. 首批组件验收

- A–H 每个岗位至少能映射到一个 Component 或 Domain；
- 每个 Component 可追溯到共享 Topic / 专业增量；
- 同一共享 Topic 不在两个 Component 复制正文；
- 通用预演与三维预演保持分开；虚拟摄影也单独维护；
- C 数字视觉方案与 F 实际动画/合成保持分开；
- G 实时技术准备与实际实时制作保持分开；
- D Camera / Lighting / Audio / Support 接口不混树；
- F/G/H 的 Format 与 Color pipeline 可通过跨组件关系连接；
- A Library 只提供知识/协调语义，不复制 Schedule/Task/Delivery 的业务事实 owner；
- 分类层数不固定；工种大类、知识小类、下级类型、字段和值身份明确，合理细分可继续展开，独立内容使用关系连接。


## 14. 原混合组件的转向

旧编号只用于已有文档引用解析，不作为有效组件导入；不得自动将全部引用转成第一个新组件。

| 原混合组件 | 拆成的有效组件 |
| --- | --- |
| `KLC-A01` | `KLC-A11` 项目接收；`KLC-A12` 需求协调 |
| `KLC-A03` | `KLC-A13` 任务协调；`KLC-A14` 依赖协调 |
| `KLC-A07` | `KLC-A15` 审阅协调；`KLC-A16` 交付协调 |
| `KLC-B02` | `KLC-B13` 剧本结构；`KLC-B14` 场景结构 |
| `KLC-B03` | `KLC-B15` 内容研究；`KLC-B16` 来源证据 |
| `KLC-B05` | `KLC-B17` 导演意图；`KLC-B18` 人物调度设计；`KLC-B19` 机位调度设计 |
| `KLC-B07` | `KLC-B20` 连续性判断；`KLC-B21` 场记记录 |
| `KLC-C03` | `KLC-C14` 布景设计；`KLC-C15` 环境视觉设计 |
| `KLC-C10` | `KLC-C16` 字体设计；`KLC-C17` 标题设计 |
| `KLC-D01` | `KLC-D23` 构图设计；`KLC-D24` 摄影角度设计；`KLC-D25` 机位设计；`KLC-D26` 视场判断；`KLC-D27` 透视判断 |
| `KLC-D02` | `KLC-D28` 摄影机资料；`KLC-D29` 录制模式 |
| `KLC-D08` | `KLC-D30` 产品摄影；`KLC-D31` 微距摄影 |
| `KLC-D13` | `KLC-D32` 供电；`KLC-D33` 配电 |
| `KLC-D15` | `KLC-D34` 无线音频；`KLC-D35` 音频接口 |
| `KLC-D16` | `KLC-D36` 时间码；`KLC-D37` 同步 |
| `KLC-D18` | `KLC-D38` 素材完整性；`KLC-D39` 备份验证；`KLC-D40` 素材交接 |
| `KLC-D19` | `KLC-D41` 场地协调；`KLC-D42` 现场协调 |
| `KLC-D22` | `KLC-D43` 花絮拍摄；`KLC-D44` 剧照摄影 |
| `KLC-E05` | `KLC-E15` 主持；`KLC-E16` 口播 |
| `KLC-E09` | `KLC-E17` 特技表演；`KLC-E18` 动作设计 |
| `KLC-E10` | `KLC-E19` 舞蹈表演；`KLC-E20` 舞蹈编排 |
| `KLC-F13` | `KLC-F19` 抠像；`KLC-F20` 转描遮罩 |
| `KLC-F14` | `KLC-F21` 画面擦除；`KLC-F22` 画面修补 |
| `KLC-G07` | `KLC-G26` 材质制作；`KLC-G27` 外观开发 |
| `KLC-G09` | `KLC-G28` 三维预演；`KLC-G29` 虚拟摄影 |
| `KLC-G12` | `KLC-G30` 毛发制作；`KLC-G31` 布料制作 |
| `KLC-G21` | `KLC-G32` 扫描采集；`KLC-G33` 摄影测量采集 |
| `KLC-G24` | `KLC-G34` 视效参考采集；`KLC-G35` 现场测量采集 |
| `KLC-G25` | `KLC-G36` 技术美术；`KLC-G37` 制作流程支持 |
| `KLC-H03` | `KLC-H22` 素材检索；`KLC-H23` 素材研究 |
| `KLC-H13` | `KLC-H24` 音乐编辑；`KLC-H25` 选曲 |
| `KLC-H21` | `KLC-H26` 格式判断；`KLC-H27` 转码 |

## 15. 可读性和维护规则

- 分类、组件和主题都使用中文名称，英文术语只作技术键或检索别名。
- “相关知识”显示两端所属专业、中文名称、原因和条件，禁止仅显示编号。
- 参数一项一行；范围、向量和结构化表作为一种参数时，必须展开其内部字段。
- 固定安装结构、原生能力和项目选择分别维护。
- 真实型号不放在分类表；不得从岗位关系推断器材适配。
