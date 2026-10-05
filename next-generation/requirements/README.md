# 下一代业务定义

这些文档保留有效的业务语义、数据字典和待运行验收场景，已去掉旧功能基线、旧封面保护、旧代码复用、旧机器进度和旧数据迁移约束。它们不是实现结果；未知规则继续询问用户。

**目录结构先审案例：**大类读取工种目录，逐层细分小类和字段；固定四级限制已取消。两个案例及岗位关联待用户确认，其他目录暂不批量重排。

| 文档 | 用途 |
| --- | --- |
| [摄影机结构案例](KNOWLEDGE_CAMERA_CLASS_REVIEW_CASE_2026-10-05.md) | 工种大类→摄影机→品牌→型号→资料分项→字段；仅重排现有参数，待审核 |
| [镜头运动结构案例](KNOWLEDGE_CAMERA_MOVEMENT_REVIEW_CASE_2026-10-05.md) | 工种大类→镜头运动→转动/位移→具体类型→字段；相关小类另建关联，待审核 |
| [字段—岗位关联审核表](KNOWLEDGE_FIELD_ROLE_ASSOCIATIONS_REVIEW_2026-10-05.md) | 两个案例逐字段的岗位、用途和适用条件，不授予权限 |
| [总纲](VNEXT_MAX_EXTENSIBILITY_REQUIREMENTS.md) | 项目到交付与经验的完整闭环、对象关系及字段标准 |
| [岗位工作流](ROLE_WORKFLOW_REQUIREMENTS_2026-10-03.md) | 账号、人员、岗位、任务、看板及交接 |
| [时段需求](RESOURCE_TIME_REQUIREMENTS_2026-10-04.md) | 器材道具的来源、缺值、动态继承和分时汇总 |
| [知识体系](VNEXT_KNOWLEDGE_LAYER_REQUIREMENTS.md) | A–H专业知识、官方型号/兼容关系、软件能力范围及粗粒度时间校准 |
| [知识库基础合同](KNOWLEDGE_FOUNDATION_AND_EXTENSIBILITY_2026-10-05.md) | 知识类型、A–H分库、Revision、细化对象/Relation、可扩展设备规格、兼容关系、软件范围与维护边界 |
| [制作常识与 Seed Catalog](PRODUCTION_COMMONS_AND_REFERENCE_SEEDS_2026-10-05.md) | 制作常识建设顺序、基础大类、对象/关系及首批官方器材、软件和格式 seed 范围 |
| [知识目录与岗位专业关联](KNOWLEDGE_CATALOG_STRUCTURE_2026-10-05.md) | 按大类、对应项、字段和子项展开；A–H岗位专业之间的知识关联、原因及检索边界 |
| [器材字段与配件合同](EQUIPMENT_REFERENCE_FIELD_CONTRACT_2026-10-05.md) | 型号/变体/模组/模式的字段归属、中文参数字典、专用配件名单、遮光斗滤镜安装链及逐字段来源 |
| [首批 Reference Seed Data](REFERENCE_SEED_DATA_2026-10-05.md) | 已填官方结构化种子：设备规格/模组/接口/兼容、软件Capability、格式identity及字段级来源状态；未知值明确保留UNKNOWN |
| [制作常识 Topic Catalog](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md) | 251个有效共享制作常识主题、13个FormulaDefinition及其定义/边界/typed relations |
| [A–H知识小库组件](AH_KNOWLEDGE_LIBRARY_COMPONENTS_2026-10-05.md) | 181个有效独立专业组件、83/83专业知识域映射及内容→实拍→后期等跨组件关系；分类按总分关系继续细分，不设固定层数 |
| [工种定义](JOB_CATALOG_DEFINITIONS_2026-10-05.md) | 139项岗位详细表及J系列已确认/未决状态 |
| [用户、团队与Agency](USER_TEAM_AGENCY_RULES_2026-10-05.md) | 组织与能力规则、200人上限、管理权、Agency条件、项目唯一归属及历史 |
| [权限规则](PERMISSION_RULES_2026-10-05.md) | 已确认访问和管理范围；ACL-01—ACL-06等待细化 |
| [岗位驱动知识目录](ROLE_KNOWLEDGE_CATALOG_2026-10-05.md) | 139个岗位所需的跨岗位共同知识、A–H专业知识域及稳定岗位编号映射 |
| [本轮知识核对记录](KNOWLEDGE_RECONCILIATION_AUDIT_2026-10-05.md) | 已修正分类和字段、实际文档检查、官方资料复核范围与待补资料 |
| [技术接受要求](TECHNICAL_ACCEPTANCE.md) | 本代命令、权限、历史、导入导出、媒体及空库要求 |
| [验收场景](ACCEPTANCE_SCENARIOS.md) | FX-01—FX-32及其他业务场景，全部未运行 |

最新决定与[已确认需求](../CONFIRMED_REQUIREMENTS.md)优先；UI与导出细则分别维护，不在每个模块复制一份。旧资料需要时定向回查[来源清单](../sources/SOURCE_INDEX.md)，不恢复整套旧项目。
