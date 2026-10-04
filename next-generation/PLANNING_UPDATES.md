# 下一代规划更新记录

本记录只跟踪 `next-generation/` 的文档储备，不是当前版本工作包或应用实施进度。设计参数未定稿，重构未启动。

## 2026-10-05：锁定知识分类最大四级

在243个共享Topic、13个Formula、135个A–H Component和83/83专业Domain已经实际展开后，分类深度不再保持未决。当前规则锁定为 `KnowledgeLibrary → KnowledgeDomain → KnowledgeComponent → 可选 KnowledgeSubcomponent`，含Library最多四级、不含Library最多三级。

KnowledgeTopic、EquipmentModel、SoftwareProduct、FormatDefinition、FormulaDefinition全部保持独立实体，不作为第五级目录。Focal Length、F-number、T-stop、FOV、Focus等是并列Topic/Specification，通过typed relation和Formula关联，明确禁止形成“摄影→镜头→焦段→光圈”这类错误树。品牌、型号、Variant使用结构化字段/Facet检索；超过Subcomponent后继续组织内容时使用Topic、Tag、Relation、Facet或SpecificationDefinition，而不是第五/第六层目录。

Subcomponent只在稳定维护边界、独立查询/输入输出、岗位只需部分内容或组件内容量确实过大时建立。同步更新知识基础合同1.3、知识总纲2.7、A–H组件1.2以及KL-35/36验收；Seed/Topic Catalog和README中的旧“层级未锁定”当前口径已清理。历史规划记录保留当时状态，不作为当前规则。

## 2026-10-05：展开制作常识正文与A–H组件

在已确认的制作常识/Seed合同之上继续推进，不新增产品范围。新增 [制作常识 Topic Catalog](requirements/PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md) 1.1，把原条目清单展开为243个唯一共享Topic与13个FormulaDefinition，覆盖镜头语言、Camera Angle/FOV/Perspective、光学、五类放大/运镜、曝光/帧率、灯光、色彩数据流、声音、媒体/格式、二维合成、三维/实时、制作工作流、接口兼容和时间校准。FOV/透视/摄影角度继续独立；F-number/T-stop和特殊光学公式边界保持。

新增 [A–H知识小库组件](requirements/AH_KNOWLEDGE_LIBRARY_COMPONENTS_2026-10-05.md) 1.1，建立135个唯一专业Component和首批跨组件INPUT/OUTPUT/HANDOFF/SUPPORT关系。A–H组件只保存专业增量，共享FOV/DOF/Timecode/Alpha/Task等常识统一引用PC-* Topic，不复制正文。明确内容→实拍、分镜/预演→3D/VFX、实拍素材→后期、CG→合成→后期、现场声音→声音后期、表演/造型→连续性的知识链。

补充83/83 KA–KH专业知识域到已定义KLC Component的显式映射，使139个JOB_CATALOG岗位可按 RoleKnowledgeBinding → ProfessionalKnowledgeDomain → Component → Common Topic 路径检索，不再按名称猜归属。最终Domain最大层级仍未锁定；只有真实内容量、独立查询/生命周期或岗位只需部分内容时才拆Subcomponent，禁止把焦段→光圈等独立概念误做树状父子数据。

知识需求更新到2.6、基础合同到1.2、岗位知识目录到1.4，知识验收扩展到KL-35。机械检查确认243 Topic ID与13 Formula ID唯一，135个Component定义唯一，83/83专业知识域均有有效Component目标。本轮仍只修改下一代规划文档，没有创建实际知识数据库、接口、索引或UI。

## 2026-10-05：建立制作常识库与首批官方 Seed

用户完成多轮知识模型确认并授权开始统一写入。本轮新增 [制作常识与 Seed Catalog](requirements/PRODUCTION_COMMONS_AND_REFERENCE_SEEDS_2026-10-05.md)，要求知识建设顺序从“制作常识 Topic → 公式/关系 → 基础大类知识 → 器材/软件/格式能力映射”开始，后续才继续 A–H 小库内部组件和最终层级深度。

常识首批覆盖镜头语言、Camera Angle、FOV、Perspective、焦段、F/T-stop、景深/对焦、Anamorphic、构图、Pan/Tilt/Dolly/Orbit等运镜，以及 Spatial Push、Optical Zoom、Mixed/Dolly Zoom、机内Digital Zoom和Post Reframe的前后期拆分；加入曝光、帧率、灯光、色彩、声音、格式、媒体交接、二维/VFX、三维/实时和结构化 FormulaDefinition。FOV优先厂商官方值；计算值标CALCULATED并读取实际SensorRecordingMode。F-number/T-stop、Shutter Angle/Time、ISO/EI/Gain只在已确认映射下转换。

细化基础对象为 KnowledgeTopic/Revision/Alias/Source、Formula、Equipment ProductFamily/Model/Variant、ImagingDevice/EmbeddedImagingModule、SensorRecordingMode、Interface/Support/CompatibilityPath、SoftwareCapability、FormatRelation和CalibrationTarget。固定镜头机型锁定内置镜头；Mavic 4 Pro作为一个机型选择三个内置模组；多机位逐Body独立计算镜头/转接路径，项目卡口偏好只排序。Compatibility以接口推导为主、厂商型号级断言override；自动路径硬限制两个intermediate components。

首批Reference Seed固定为：RED KOMODO原版、ZEISS CP.3完整10焦段、DJI Osmo Pocket 4/Mavic 4 Pro/RS 5/Focus Pro/Transmission/SDR、Nanlite Forza 200/旧Forza 300B/FC-120B/FC-300B/PavoTube II 15C及官方附件、Aputure STORM 1200x及官方附件、Tiffen 4×5.65 Pro-Mist与Black Pro-Mist全部官方Density；通用灯架/C-Stand/三脚架/快拆先建Category/Interface。软件首批为Blender、UE5、AE；格式加入MOV/MP4/MXF、R3D/BRAW/ARRIRAW/CinemaDNG、ProRes/DNxHR/H.264/H.265、EXR/DPX/TIFF/PNG/JPEG、WAV、SRT、OTIO/EDL/XML。

FC-120B已替代用户先前误写的FC-200B。官方Nanlite资料确认FC-120B原生FM Mount并随附Bowens Mount Adapter，因此知识模型不能把Bowens写成其原生Mount。官方规格只写SpecificationValue，人工Note不限内容但不覆盖官方值；来源不保存网页证据快照。

知识需求更新到2.5、基础合同到1.1、岗位知识目录到1.3，验收扩到KL-31。本轮仍只写下一代规划文档，没有建立实际数据库、API、知识条目索引或维护UI；“首批Seed”表示实现时必须从对应厂商官方规格/手册全量结构化录入，不表示这些参数已经存在运行库。

## 2026-10-05：确认并发布用户、团队、Agency与权限规则

用户对完整审阅稿1.1作出“没问题了，可以上传”的最终许可。基础提交：`420f6028b42c1fe1fff5cff6d2de8d78232ecea3`；发布分支：`docs/next-generation-plan`。使用干净的独立工作区，未更改master默认分支或原运行工作区的未提交文件。

新增[组织与能力合同](requirements/USER_TEAM_AGENCY_RULES_2026-10-05.md)1.0及[独立权限合同](requirements/PERMISSION_RULES_2026-10-05.md)1.0。统一记录个人能力/团队需求/展示审批、加入与退出、唯一管理员移交、每队200人、Agency触发/不可移交及所属团队管理、项目唯一归属、分工/通知、离队缺口和解散历史。三套人数配置仍为建议，不设成默认模板。

同步工种目录1.1、岗位工作流2.1、知识需求2.4、岗位知识目录1.2及总纲4.1，更新入口/来源索引、AGENTS范围和ORG-01—ORG-09待运行验收规格。旧“J-01—J-08全部待定”、泛化组织不授权和完全禁止归档的表述已按新规则细化；明确拒绝与组织管理员冲突仍标ACL-02待确认，不自行选择优先级。

本包写集仅14份Markdown：两份新增合同、工种目录、岗位工作流、知识需求、岗位知识目录、总纲、验收场景、requirements/README、目录README、已确认需求、AGENTS、来源清单和本记录。不写应用、数据库、部署、master/deprecated、既有知识库基础合同或旧运行交接文件。原个人/项目资料、截图和139项重复快照均不上传。

实际检查：本地Markdown文件链接全部可解析，新增表格列数与差异空白检查通过；139项岗位编号唯一，A10/B16/C18/D20/E15/F18/G24/H18与岗位表正文逐字不变；83个专业域、7个共用域、139/139知识绑定及定义正文未改动；知识贡献范围第2节及最新知识库基础合同逐字保留。上传前重新获取远端确认基础提交未变，采用正常快进推送，不覆盖其他提交。

未实施：应用、身份/鉴权、审批/通知、归档、API及数据库均未启动，未运行浏览器或软件验收。ACL-01—ACL-06、实际部门映射、岗位定义生命周期/版本迁移、默认岗位及类型配置、建议算法、通知/解散过渡态和跨团队整体转移仍待后续确认。发布许可不代替这些问题的答案。

## 2026-10-05：确认知识库基础模型与扩展边界

用户确认知识库直接按 A–H 八大类建立专业知识小库；共用基础知识作为共享基础层，不作为第九个项目部门。新增 `KNOWLEDGE_FOUNDATION_AND_EXTENSIBILITY_2026-10-05.md`，定义 KnowledgeLibrary/Domain/Entry/Revision、EquipmentCategory/Model、SpecificationDefinition/Value、EquipmentNote、CompatibilityRelation、SoftwareProduct/Scope、RoleKnowledgeBinding、ExperienceObservation/EstimateProfile 的职责和扩展边界。

器材结构化参数以厂商官方资料为权威来源，人工备注独立保存且不能覆盖官方规格。新上市镜头通过 Category + SpecificationDefinition 录入焦段、光圈等，不为新品修改主表；兼容关系使用 typed relation，支持直接兼容、需转接、明确不兼容和条件兼容。早期 Forza 200B / 保荣卡口示例已被后续确认取代；正式兼容知识一律按具体型号的原生接口、现实 AdapterModel 与厂商来源核验。

软件知识只记录产品或版本范围适配哪些制作能力，可明确 NOT_SUPPORTED，例如三维软件不作为剪辑系统；不建立功能更新日志、按钮级教程或操作手册。正式知识取消 FAILURE_PATTERN/常见问题库。QA/Experience 只保留 Actual 或必要的粗粒度时间补充，用于 EstimateProfile 校准，不再询问问题原因、设备心得、最佳设置和解决办法。

知识库不建立专用权限角色；Create/Edit/Verify/Publish/Withdraw 等动作统一由系统权限和用户组能力决定。更新知识需求至2.3并把验收扩展到KL-23。本次仍只更新规划合同，没有建立数据库、接口、索引、权限或知识维护页面。

## 2026-10-05：按岗位目录补齐知识范围

依据用户指定的 [JOB_CATALOG_DEFINITIONS_2026-10-05.md](requirements/JOB_CATALOG_DEFINITIONS_2026-10-05.md) 补齐下一代知识体系，仅修改 `next-generation/` 规划文档，不启动应用、数据库、知识索引或页面实现。

本次新增 [岗位驱动知识目录](requirements/ROLE_KNOWLEDGE_CATALOG_2026-10-05.md)，保持 JOB_CATALOG 是岗位名称、制作分工和职责的唯一来源；知识目录只用稳定岗位编号建立专业知识域关联，不复制139行岗位定义。解析并校验 JOB_CATALOG 1.0 共139个可任职岗位：A10、B16、C18、D20、E15、F18、G24、H18；全部至少映射一个专业知识域，无未知岗位编号。

知识目录当前定义7个跨岗位共同知识域和83个A–H专业知识域，覆盖项目/任务/排期/通告/素材版本/审阅/交付/授权/QA，以及策划导演、美术、摄影灯光录音、表演造型、AE/MG/二维、三维/实时/VFX、剪辑声音调色QC交付等职责需要的概念、输入输出、交接、方法原理、失败模式和相关基础参考。软件/器材内容不扩展为逐步操作教程，Checklist不扩展为SOP；不恢复预算、采购、财务、商务合同、行业标准/外部互通、库存或预留。

更新 `VNEXT_KNOWLEDGE_LAYER_REQUIREMENTS.md` 至2.2，引入 `ProfessionalKnowledgeDomain`、`RoleKnowledgeBinding` 与岗位专业知识检索合同；新增KL-12—KL-16，分别验收139岗位覆盖、方案/执行专业分支、检索边界、共享知识去重和JOB_CATALOG版本绑定。J-01—J-08仍未决，尤其J-04未确认前不按岗位名称自动迁移知识绑定。

同步更新业务定义目录索引和 `ACCEPTANCE_SCENARIOS.md` 的知识验收范围为KL-01—KL-16。本次只证明文档覆盖和映射一致性，没有创建知识条目、接口、数据库迁移、索引、页面，也没有运行产品验收。

## 2026-10-05：继续细化参考布局

基础提交：`e8e4330c2a9cf1c50bd3c9561d39fd1a3b265c5c`。执行者：本次UI文档会话。复用已存在、检查时干净的 `docs/next-generation-plan` 工作区；参考聊天在当前版本另做仓库整理，本次只写本目录。

允许写集：`AGENTS.md`、`README.md`、`CONFIRMED_REQUIREMENTS.md`、`UI_PLAN.md`、新增 `UI_LAYOUT_SPEC.md`、`REFERENCE_LAYOUT_STUDY.md`、`EXPORT_DESIGN.md`、`sources/SOURCE_INDEX.md` 和本记录。历史 `requirements/`、原参考图、已有合成SVG、当前应用、根规则和本版本执行文档均不在本包写集。

完成的文档内容：

- 增加布局细则，写明场景字段顺序/宽度、主区高度预算、卡片排列、日分组、工作日表、剧本批注、后期依赖及个人通告。
- 将网页正文调整为14—16px起，按内容和触屏自然加高；个人适配不回写共享视图。
- 补充选择范围、当前方案统计、跨午夜、多次安排、未知、权限、保存和确认回执的呈现。
- 补充A4竖版186mm正文宽、三区页头、七列示例和续页规则，纸张与个人页固定同一发布修订。
- 在本目录明确旧功能黄金基线无效，历史提交仅为需求出处，不恢复旧UI或旧功能约束。

核查来源：重新查看两批用户截图；在线读取Yamdu通告帮助与shadcn表格官方页面。它们辅助排列和工作步骤，项目权限、状态及发布规则仍按已确认需求。未复制原图、头像、地图、电话或旧模板。

实际检查：本目录23份Markdown中的74处本地文件/图片链接均可解析到存在的文件；文档差异空白检查通过。人工核对场景宽度合计756px、正文最低1036px，以及A4正文/列宽合计186mm；这些只是规格计算，不是渲染测量。本包仅9份Markdown，目录外、历史源稿和已有SVG没有差异。没有创建下一代应用，也未运行应用、数据库、浏览器或文件渲染测试。

版本顺序已写入UI规划、布局细则、README与AGENTS：先完成对应新架构、数据、命令和权限基础的重构与验收，再开始该页面UI实施。当前仅文档储备。

## 2026-10-05：精简为独立规划分支

按用户新指令删除本分支继承的旧实现副本及重复方案，保留cfb7f2b中的布局深化和合成参考图。业务定义迁到requirements，修正旧界面/服务复用约束；REQUIREMENT_BASELINE改名CONFIRMED_REQUIREMENTS，避免继续沿用无效功能基线。旧文档需要时从master或来源提交回查，不把本代合回当前执行入口。详细处置和实际检查见[整理记录](BRANCH_CLEANUP_2026-10-05.md)。未启动重构，未改变默认分支。
