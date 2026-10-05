> **下一代业务定义，尚未实施。** 本文件把“制作常识库”从条目清单展开为首批可实施 Topic Catalog。Topic 是稳定语义身份；正文进入 KnowledgeRevision。器材、软件和格式只能引用这些 Topic/Domain，不反向定义常识。

# FrameForge 制作常识主题目录

版本：1.5，2026-10-05。状态：首批常识正文合同，尚未建立运行知识条目。本版整理247个有效共享主题；原混合编号只保留拆分转向，13个公式定义保持。

配套：[制作常识与 Seed Catalog](PRODUCTION_COMMONS_AND_REFERENCE_SEEDS_2026-10-05.md)、[知识库基础合同](KNOWLEDGE_FOUNDATION_AND_EXTENSIBILITY_2026-10-05.md)、[知识体系](VNEXT_KNOWLEDGE_LAYER_REQUIREMENTS.md)。

## 1. 知识主题内容合同

每个主题至少有稳定ID、中文名称、英文术语及别名。中文名称不可缺失，英文缩写不单独作为可读标题。下列技术键供实现引用：

每个 Topic 至少有：

- stable topic id；
- canonical name、中文名、英文名、aliases；
- type：TERM_CONCEPT / METHOD_PRINCIPLE / INPUT_OUTPUT / INTERNAL_QC_REFERENCE；
- concise definition；
- scope / exclusions；
- key relations；
- formula links（如适用）；
- base domains；
- revision / source policy。

本文件维护常识语义和稳定主题身份。分类不设固定层数，先按工种大类细分知识小类，再按实际总分关系展开；主题正文可被多个分类入口引用，不因此复制。用户已确认案例，本轮按工种大类重排；类型与字段层级见各知识分册，不把清单的行序当作分类层级。

## 2. 关系词汇

首批 KnowledgeRelation 使用受控 relation，不允许自由字符串承担核心语义：

- `IS_A`：概念分类；
- `PART_OF`：组成关系；
- `AFFECTS`：会影响但不等于决定；
- `DETERMINES`：在明确条件下决定；
- `DEPENDS_ON`：计算/判断需要；
- `CONSTRAINS`：限制可选范围；
- `CHANGES`：动作改变某物理/画面量；
- `PRESERVES`：动作保持某量不变；
- `CONTRASTS_WITH`：概念对照；
- `DERIVED_BY`：由 FormulaDefinition 派生；
- `MEASURED_AS`：对应测量量；
- `PRODUCES` / `CONSUMES`：产生/消费；
- `PRECEDES` / `FOLLOWS`：流程前后；
- `REQUIRES`：成立/执行必需条件；
- `REFERENCES`：知识引用，不代表业务拥有。

## 3. 工种大类下的常识定义

本节按[总目录](KNOWLEDGE_CATALOG_STRUCTURE_2026-10-05.md)组织，各类的类型与字段由分册展开。只有真实总分关系才作下级类型，独立主题之间保持具名关联。C、E 类的专业知识通过其组件与分册维护，不复制其他工种的共享主题定义。

### A．项目管理与制片

逐层字段入口：[A 类分册](knowledge/A_KNOWLEDGE_HIERARCHY_2026-10-05.md)。

#### 任务


<a id="pc-wf-001"></a>

范围：可分派、执行、交接的工作单元

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-WF-001 | 任务（Task） | 可分派、执行、交接的工作单元 | 依赖 `DEPENDS_ON` inputs/dependencies |

#### 依赖关系


<a id="pc-wf-002"></a>

范围：一个工作单元对另一个工作/输入的先后/准备关系

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-WF-002 | 依赖关系（Dependency） | 一个工作单元对另一个工作/输入的先后/准备关系 | 约束 `CONSTRAINS` readiness |

#### 工作交接


<a id="pc-wf-003"></a>

范围：固定输出版本交给下游的业务动作

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-WF-003 | 工作交接（Handoff） | 固定输出版本交给下游的业务动作 | 产生 `PRODUCES` downstream input |

#### 计划事实


<a id="pc-wf-004"></a>

范围：已确认/候选计划中的预期事实

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-WF-004 | 计划事实（Planned） | 已确认/候选计划中的预期事实 | 区别于 `CONTRASTS_WITH` Forecast/Actual |

#### 预测事实


<a id="pc-wf-005"></a>

范围：基于当前信息推算的未来事实

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-WF-005 | 预测事实（Forecast） | 基于当前信息推算的未来事实 | 由公式派生 `DERIVED_BY` current facts |

#### 实际事实


<a id="pc-wf-006"></a>

范围：已发生并记录的实际事实

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-WF-006 | 实际事实（Actual） | 已发生并记录的实际事实 | 不被Forecast覆盖 |

#### 排期方案


<a id="pc-wf-007"></a>

范围：一套可比较的排期方案

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-WF-007 | 排期方案（SchedulePlan） | 一套可比较的排期方案 | CONTAINS ShootDay/ScheduleItem |

#### 拍摄工作日


<a id="pc-wf-008"></a>

范围：某拍摄工作日范围

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-WF-008 | 拍摄工作日（ShootDay） | 某拍摄工作日范围 | CONTAINS schedule items |

#### 排期条目


<a id="pc-wf-009"></a>

范围：在时间轴上安排或记录实际执行的工作条目

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-WF-009 | 排期条目（ScheduleItem） | 在时间轴上安排或记录实际执行的工作条目 | 引用 `REFERENCES` Scene/Shot/Task/Person/Location |

#### 剧组转场


<a id="pc-wf-010"></a>

范围：转场/移动工作，属于 ScheduleItem 类型

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-WF-010 | 剧组转场（Company Move） | 转场/移动工作，属于 ScheduleItem 类型 | 改变 `CHANGES` location/time availability |

#### 通告草稿


<a id="pc-wf-011"></a>

范围：从当前排期与项目事实投影出的通告草稿

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-WF-011 | 通告草稿（Call Sheet Draft） | 从当前排期与项目事实投影出的通告草稿 | 由公式派生 `DERIVED_BY` current schedule |

#### 已发布通告修订


<a id="pc-wf-012"></a>

范围：发布后固定的通告修订

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-WF-012 | 已发布通告修订（CallSheetRevision） | 发布后固定的通告修订 | 不随排期自动漂移 |

#### 可开始条件


<a id="pc-wf-013"></a>

范围：由 Task/Input/Checklist/Authorization 等事实派生的可开始状态

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-WF-013 | 可开始条件（Readiness） | 由 Task/Input/Checklist/Authorization 等事实派生的可开始状态 | 由公式派生 `DERIVED_BY` authoritative facts |

#### 检查清单


<a id="pc-wf-014"></a>

范围：检查是否满足条件的结构化检查，不是SOP

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-WF-014 | 检查清单（Checklist） | 检查是否满足条件的结构化检查，不是SOP | 影响 `AFFECTS` Readiness if required |

#### 制作授权要求


<a id="pc-wf-015"></a>

范围：项目要求的制作授权条件

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-WF-015 | 制作授权要求（Authorization Requirement） | 项目要求的制作授权条件 | 影响 `AFFECTS` Readiness/QC when hard |

#### 审阅


<a id="pc-wf-016"></a>

范围：对固定版本/修订进行审阅的业务过程

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-WF-016 | 审阅（Review） | 对固定版本/修订进行审阅的业务过程 | 引用 `REFERENCES` immutable target |

#### 返工请求


<a id="pc-wf-020"></a>

范围：要求修改现有制作产物的业务请求；知识主题不自动生成项目任务。

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-WF-020 | 返工请求（Rework Request） | 要求修改现有制作产物的业务请求；知识主题不自动生成项目任务。 | 引用审阅反馈、固定产物版本；回流相应制作任务 |

#### 补拍请求


<a id="pc-wf-021"></a>

范围：要求重新进入拍摄安排以获取素材的业务请求；不是所有返工的必经步骤。

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-WF-021 | 补拍请求（Reshoot Request） | 要求重新进入拍摄安排以获取素材的业务请求；不是所有返工的必经步骤。 | 引用镜头和拍摄事实；回流拍摄排期 |

#### 计划时长


<a id="pc-time-001"></a>

范围：排期/制作表中的预估工作时长

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-TIME-001 | 计划时长（Planned Duration） | 排期/制作表中的预估工作时长 | 关联原因、方向和条件需按知识关系单独记录 |

#### 实际时长


<a id="pc-time-002"></a>

范围：已发生工作的实际时长

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-TIME-002 | 实际时长（Actual Duration） | 已发生工作的实际时长 | 关联原因、方向和条件需按知识关系单独记录 |

#### 时长范围


<a id="pc-time-003"></a>

范围：只能粗略确认时使用的时长范围

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-TIME-003 | 时长范围（Duration Range） | 只能粗略确认时使用的时长范围 | 关联原因、方向和条件需按知识关系单独记录 |

#### 镜头总工时汇总


<a id="pc-time-004"></a>

范围：Shot总时长聚合目标，不与组成阶段重复计样本

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-TIME-004 | 镜头总工时汇总（Shot Aggregate） | Shot总时长聚合目标，不与组成阶段重复计样本 | 关联原因、方向和条件需按知识关系单独记录 |

#### 场景总工时汇总


<a id="pc-time-005"></a>

范围：Scene总时长聚合目标

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-TIME-005 | 场景总工时汇总（Scene Aggregate） | Scene总时长聚合目标 | 关联原因、方向和条件需按知识关系单独记录 |

#### 拍摄日总工时汇总


<a id="pc-time-006"></a>

范围：ShootDay总时长聚合目标

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-TIME-006 | 拍摄日总工时汇总（ShootDay Aggregate） | ShootDay总时长聚合目标 | 关联原因、方向和条件需按知识关系单独记录 |

#### 拍摄准备时长


<a id="pc-time-007"></a>

范围：拍摄准备活动的工作时长

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-TIME-007 | 拍摄准备时长（Setup Duration） | 拍摄准备活动的工作时长 | 关联原因、方向和条件需按知识关系单独记录 |

#### 排练时长


<a id="pc-time-008"></a>

范围：排练活动的工作时长

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-TIME-008 | 排练时长（Rehearsal Duration） | 排练活动的工作时长 | 关联原因、方向和条件需按知识关系单独记录 |

#### 拍摄执行时长


<a id="pc-time-009"></a>

范围：拍摄执行活动的工作时长

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-TIME-009 | 拍摄执行时长（Shoot Duration） | 拍摄执行活动的工作时长 | 关联原因、方向和条件需按知识关系单独记录 |

#### 复位时长


<a id="pc-time-010"></a>

范围：复位活动的工作时长

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-TIME-010 | 复位时长（Reset Duration） | 复位活动的工作时长 | 关联原因、方向和条件需按知识关系单独记录 |

#### 撤场时长


<a id="pc-time-011"></a>

范围：撤场活动的工作时长

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-TIME-011 | 撤场时长（Strike Duration） | 撤场活动的工作时长 | 关联原因、方向和条件需按知识关系单独记录 |

#### 转场时长


<a id="pc-time-012"></a>

范围：转场 component metric

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-TIME-012 | 转场时长（Company Move Duration） | 转场 component metric | 关联原因、方向和条件需按知识关系单独记录 |

#### 任务时长


<a id="pc-time-013"></a>

范围：一般Task component metric

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-TIME-013 | 任务时长（Task Duration） | 一般Task component metric | 关联原因、方向和条件需按知识关系单独记录 |

#### 后期工作时长


<a id="pc-time-014"></a>

范围：后期工作 component metric

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-TIME-014 | 后期工作时长（Post Work Duration） | 后期工作 component metric | 关联原因、方向和条件需按知识关系单独记录 |

### B．策划、内容与导演

逐层字段入口：[B 类分册](knowledge/B_KNOWLEDGE_HIERARCHY_2026-10-05.md)。

#### 人物调度


<a id="pc-nar-021"></a>

范围：只维护人物站位、行动和表演时机。

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-NAR-021 | 人物调度（Actor Blocking） | 人物站位、行动路径和表演时机的安排；不包含摄影机支撑或光学参数。 | 影响镜头覆盖；关联机位调度，但不拥有机位调度 |

#### 机位调度


<a id="pc-nar-022"></a>

范围：只维护摄影机站位、朝向和运动时机。

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-NAR-022 | 机位调度（Camera Blocking） | 摄影机站位、朝向和运动时机的安排；以人物行动和拍摄目标为输入。 | 关联人物调度；引用机位、摄影角度、运镜 |

#### 动作轴线


<a id="pc-nar-023"></a>

范围：只维护参考线定义。

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-NAR-023 | 动作轴线（Axis of Action） | 描述人物相互关系或行动方向的空间参考线；轴线是参考对象，不是运镜类型。 | 供180度规则引用；关联屏幕方向 |

#### 180度规则


<a id="pc-nar-024"></a>

范围：只维护围绕动作轴线的连续性约定。

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-NAR-024 | 180度规则（180-degree Rule） | 围绕动作轴线维持画面方向关系的连续性约定；不把轴线本身当成规则。 | 引用动作轴线；影响屏幕方向；不强制自动纠正创作选择 |

#### 屏幕方向


<a id="pc-nar-017"></a>

范围：主体在画面内的左右方向关系

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-NAR-017 | 屏幕方向（Screen Direction） | 主体在画面内的左右方向关系 | 依赖 `DEPENDS_ON` camera position/axis |

#### 视线匹配


<a id="pc-nar-018"></a>

范围：剪辑中保持人物视线方向与被看对象空间关系的连续性

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-NAR-018 | 视线匹配（Eyeline Match） | 剪辑中保持人物视线方向与被看对象空间关系的连续性 | 影响 `AFFECTS` continuity |

#### 30度规则


<a id="pc-nar-019"></a>

范围：同一主体连续镜头中避免过小机位角度变化造成跳切感的传统剪辑/覆盖经验

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-NAR-019 | 30度规则（30° Rule） | 同一主体连续镜头中避免过小机位角度变化造成跳切感的传统剪辑/覆盖经验 | 影响 `AFFECTS` coverage choice；不是硬性物理定律 |

#### 动作匹配


<a id="pc-nar-020"></a>

范围：跨镜头保持动作时间和运动连续性的剪辑原则

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-NAR-020 | 动作匹配（Match on Action） | 跨镜头保持动作时间和运动连续性的剪辑原则 | 需要 `REQUIRES` coverage continuity |

#### 场景


<a id="pc-nar-001"></a>

范围：叙事或制作语境中的场景单元；在 FrameForge 中不是 Shot 的父对象，Scene↔Shot 可多对多

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-NAR-001 | 场景（Scene） | 叙事或制作语境中的场景单元；在 FrameForge 中不是 Shot 的父对象，Scene↔Shot 可多对多 | 引用 `REFERENCES` Shot；约束 `CONSTRAINS` requirement/context |

#### 镜头


<a id="pc-nar-002"></a>

范围：一个可独立描述、制作、排期、审阅的镜头身份；不等同一次 Take

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-NAR-002 | 镜头（Shot） | 一个可独立描述、制作、排期、审阅的镜头身份；不等同一次 Take | 引用 `REFERENCES` Scene；组成 `PART_OF` coverage |

#### 镜头用途


<a id="pc-nar-003"></a>
<a id="pc-nar-004"></a>
<a id="pc-nar-006"></a>
<a id="pc-nar-007"></a>
<a id="pc-nar-008"></a>
<a id="pc-nar-009"></a>

范围：各项按用途单独定义；一个镜头可关联多种用途，分类不强制互斥。

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-NAR-003 | 建立镜头（Establishing Shot） | 用于建立空间、人物关系或环境信息的镜头用途 | 属于 `IS_A` Shot purpose；影响 `AFFECTS` spatial comprehension |
| PC-NAR-004 | 主镜头（Master Shot） | 覆盖一个表演/场景主要动作范围的连续镜头用途 | 属于 `IS_A` coverage strategy |
| PC-NAR-006 | 插入镜头（Insert） | 强调物体、动作细节或信息的补充镜头 | 属于 `IS_A` coverage shot |
| PC-NAR-007 | 反应镜头（Reaction Shot） | 以人物对事件/对白的反应为主要信息的镜头 | 属于 `IS_A` coverage shot |
| PC-NAR-008 | 过肩镜头（OTS） | 以前景人物肩部/头部作为空间关系参照的构图用途 | 影响 `AFFECTS` screen relation |
| PC-NAR-009 | 主观镜头（POV） | 画面视点被定义为某角色/主体观察位置 | 依赖 `DEPENDS_ON` narrative viewpoint |

#### 镜头覆盖策略


<a id="pc-nar-005"></a>

范围：为剪辑提供镜头选择的拍摄策略，不是镜头像场覆盖。

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-NAR-005 | 镜头覆盖策略（Coverage） | 通过多个镜头为同一动作/场景提供剪辑选择的拍摄策略 | 组成 `PART_OF` shooting strategy；消费 `CONSUMES` Shot |

### C．视觉设计与美术

逐层字段入口：[C 类分册](knowledge/C_KNOWLEDGE_HIERARCHY_2026-10-05.md)。

### D．实拍：摄影、灯光、录音与现场

逐层字段入口：[D 类分册](knowledge/D_KNOWLEDGE_HIERARCHY_2026-10-05.md)。

#### 构图


<a id="pc-cam-023"></a>
<a id="pc-cam-008"></a>
<a id="pc-cam-014"></a>
<a id="pc-cam-015"></a>
<a id="pc-cam-021"></a>
<a id="pc-cam-022"></a>
<a id="pc-cam-017"></a>
<a id="pc-cam-018"></a>
<a id="pc-cam-019"></a>
<a id="pc-cam-020"></a>

范围：画面内的组织方式；机位、运镜、视场角、透视分别引用。

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-CAM-023 | 构图（Composition） | 在画面边界内组织主体、空间层次和视觉重心的概念；不等同机位、运镜或视场角。 | 引用景别、透视、视场角；不合并它们的定义 |
| PC-CAM-008 | 倾斜构图（Dutch Angle） | 摄影机 Roll 使画面水平线倾斜 | 依赖 `DEPENDS_ON` Roll |
| PC-CAM-014 | 画面空间层次（Spatial Layers） | 按相机空间深度划分的前/中/后景关系 | 组成 `PART_OF` spatial composition |
| PC-CAM-017 | 三分构图（Rule of Thirds） | 用三等分参考线组织视觉重心的方法 | 属于 `IS_A` composition principle |
| PC-CAM-018 | 对称构图（Symmetry） | 围绕画面轴线组织视觉元素的构图方式 | 属于 `IS_A` composition principle |
| PC-CAM-020 | 纵深构图（Depth Composition） | 利用不同深度层次组织画面的构图方法 | 依赖 `DEPENDS_ON` spatial relation/Perspective |

#### 镜头运动


<a id="pc-mov-018"></a>
<a id="pc-mov-001"></a>
<a id="pc-mov-002"></a>
<a id="pc-mov-003"></a>
<a id="pc-mov-004"></a>
<a id="pc-mov-005"></a>
<a id="pc-mov-006"></a>
<a id="pc-mov-007"></a>
<a id="pc-mov-013"></a>

范围：按摄影机旋转或位移组织下级类型；承托设备和焦距变化不混入轨迹类型。

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-MOV-018 | 运镜（Camera Movement） | 拍摄期间摄影机位置或朝向随时间变化的镜头设计；运动轨迹独立于承托设备。 | 包含旋转、平移、复合轨迹；引用机位调度 |
| PC-MOV-001 | 水平摇摄（Pan） | 摄影机位置基本不变，绕垂直轴旋转 | 改变 `CHANGES` orientation；保持 `PRESERVES` position |
| PC-MOV-002 | 俯仰摇摄（Tilt） | 摄影机位置基本不变，绕水平轴上下旋转 | 改变 `CHANGES` orientation |
| PC-MOV-003 | 滚转（Roll） | 绕光轴旋转 | 改变 `CHANGES` horizon/Dutch angle |
| PC-MOV-004 | 升降移动（Pedestal） | 摄影机整体上下平移 | 改变 `CHANGES` Camera Position；保持 `PRESERVES` focal length if lens unchanged |
| PC-MOV-005 | 横向移机（Truck / Track） | 摄影机整体横向/沿轨迹平移 | 改变 `CHANGES` Camera Position/Perspective |
| PC-MOV-006 | 纵向移机（Dolly In / Out） | 摄影机向主体靠近/远离 | 改变 `CHANGES` position, framing and perspective |
| PC-MOV-007 | 环绕移机（Arc / Orbit） | 摄影机绕主体弧形移动 | 改变 `CHANGES` position/orientation/perspective |
| PC-MOV-013 | 固定焦距的空间推进（Spatial Push） | 焦距保持，摄影机靠近主体造成主体画面占比增大 | 改变 `CHANGES` position/perspective；保持 `PRESERVES` focal length |

#### 景别


<a id="pc-cam-024"></a>

范围：按画面内主体呈现范围分类，不以焦距替代。

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-CAM-024 | 景别（Shot Size） | 主体在画面中的呈现范围；景别不等同物理焦距。 | 关联构图、主体距离和取景范围 |

#### 机位


<a id="pc-cam-001"></a>
<a id="pc-cam-002"></a>

范围：位置和高度是同一空间位置的量，不包含画面构图。

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-CAM-001 | 机位位置（Camera Position） | 摄影机光学中心在空间中的位置 | 决定 `DETERMINES` perspective with subject geometry；影响 `AFFECTS` framing |
| PC-CAM-002 | 机位高度（Camera Height） | 相对主体/地面的摄影机高度 | 组成 `PART_OF` Camera Position；影响 `AFFECTS` Camera Angle |

#### 摄影角度


<a id="pc-cam-003"></a>
<a id="pc-cam-004"></a>
<a id="pc-cam-005"></a>
<a id="pc-cam-006"></a>
<a id="pc-cam-007"></a>

范围：按观察朝向分类；画面滚转造成的倾斜构图另列。

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-CAM-003 | 摄影角度（Camera Angle） | 摄影机朝向相对主体/水平面的观察角度，如平视、俯视、仰视 | 依赖 `DEPENDS_ON` position/orientation；区别于 `CONTRASTS_WITH` FOV |
| PC-CAM-004 | 平视（Eye Level） | 光轴与主体常规视线高度接近的摄影角度 | 属于 `IS_A` Camera Angle |
| PC-CAM-005 | 俯拍（High Angle） | 摄影机从较高位置向下观察主体 | 属于 `IS_A` Camera Angle |
| PC-CAM-006 | 仰拍（Low Angle） | 摄影机从较低位置向上观察主体 | 属于 `IS_A` Camera Angle |
| PC-CAM-007 | 顶拍（Top Shot） | 接近垂直向下的摄影角度 | 属于 `IS_A` Camera Angle |

#### 视场角


<a id="pc-cam-009"></a>
<a id="pc-cam-010"></a>
<a id="pc-cam-011"></a>
<a id="pc-cam-012"></a>

范围：水平、垂直、对角是同一测量概念的方向，不与摄影角度合并。

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-CAM-009 | 视场角（Field of View） | 成像系统在给定有效成像区域内覆盖的角度范围 | 依赖 `DEPENDS_ON` lens projection、official AoV、active area；区别于 `CONTRASTS_WITH` Camera Angle/Perspective |
| PC-CAM-010 | 水平视场角（Horizontal FOV） | 水平方向覆盖角 | 属于 `IS_A` Field of View |
| PC-CAM-011 | 垂直视场角（Vertical FOV） | 垂直方向覆盖角 | 属于 `IS_A` Field of View |
| PC-CAM-012 | 对角视场角（Diagonal FOV） | 对角线方向覆盖角 | 属于 `IS_A` Field of View |

#### 透视


<a id="pc-cam-013"></a>

范围：描述场景空间的成像关系，不以焦距数值代替。

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-CAM-013 | 透视（Perspective） | 空间中不同距离物体在成像中的相对大小与汇聚关系 | 由此决定 `DETERMINED_BY` Camera Position relative to scene；Focal Length only affects framing/FOV at fixed position |

#### 排练


<a id="pc-nar-011"></a>

范围：现场活动单独维护；活动时长通过对应时间主题关联，不与活动身份合并。

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-NAR-011 | 排练（Rehearsal） | 正式记录前验证表演、调度、技术协同的活动 | 先于 `PRECEDES` Shoot；影响 `AFFECTS` estimate |

#### 拍摄准备


<a id="pc-nar-012"></a>

范围：现场活动单独维护；活动时长通过对应时间主题关联，不与活动身份合并。

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-NAR-012 | 拍摄准备（Setup） | 为某拍摄配置机位、灯光、收声、支撑等准备活动 | 先于 `PRECEDES` Shoot；测量为 `MEASURED_AS` duration |

#### 拍摄执行


<a id="pc-nar-013"></a>

范围：现场活动单独维护；活动时长通过对应时间主题关联，不与活动身份合并。

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-NAR-013 | 拍摄执行（Shoot） | 实际记录画面/声音的执行阶段 | 产生 `PRODUCES` media/Actual |

#### 复位


<a id="pc-nar-014"></a>

范围：现场活动单独维护；活动时长通过对应时间主题关联，不与活动身份合并。

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-NAR-014 | 复位（Reset） | 为下一次执行恢复表演、道具、设备或场景状态 | 后于 `FOLLOWS` Shoot；先于 `PRECEDES` next Shoot |

#### 撤场


<a id="pc-nar-015"></a>

范围：现场活动单独维护；活动时长通过对应时间主题关联，不与活动身份合并。

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-NAR-015 | 撤场（Strike） | 某配置或工作段结束后拆除/收整设备与布置 | 后于 `FOLLOWS` Shoot；测量为 `MEASURED_AS` duration |

#### 物理焦距


<a id="pc-opt-001"></a>

范围：只维护焦距定义；型号的实际数值归器材规格。

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-OPT-001 | 物理焦距（Physical Focal Length） | 镜头光学系统的标称/实际焦距参数；不等于画幅等效焦距 | 影响 `AFFECTS` FOV；测量为 `MEASURED_AS` mm |

#### 焦距机制


<a id="pc-opt-005"></a>
<a id="pc-opt-006"></a>

范围：定焦、变焦是同一焦距机制维度的类型，不包含投影模型。

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-OPT-005 | 定焦镜头（Prime Lens） | 拍摄时焦距固定的镜头 | 区别于 `CONTRASTS_WITH` Zoom Lens |
| PC-OPT-006 | 变焦镜头（Zoom Lens） | 允许连续/离散改变物理焦距的镜头 | 改变 `CHANGES` Focal Length |

#### 成像类型


<a id="pc-opt-021"></a>
<a id="pc-opt-022"></a>

范围：非变形、变形分别定义，不与焦距机制合成互斥枚举。

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-OPT-021 | 非变形成像镜头（Spherical Lens） | 水平/垂直不采用 anamorphic squeeze 的常规成像体系 | 区别于 `CONTRASTS_WITH` Anamorphic |
| PC-OPT-022 | 变形成像镜头（Anamorphic Lens） | 在至少一个方向进行光学压缩的成像体系 | 需要 `REQUIRES` squeeze/desqueeze |

#### 有效成像区域


<a id="pc-opt-002"></a>

范围：当前 SensorRecordingMode 实际参与成像的宽高区域

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-OPT-002 | 有效成像区域（Effective Imaging Area） | 当前 SensorRecordingMode 实际参与成像的宽高区域 | 影响 `AFFECTS` FOV/crop；组成 `PART_OF` SensorRecordingMode |

#### 像场


<a id="pc-opt-003"></a>

范围：镜头可覆盖的成像圆范围

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-OPT-003 | 像场（Image Circle） | 镜头可覆盖的成像圆范围 | 约束 `CONSTRAINS` sensor coverage |

#### 镜头像场覆盖


<a id="pc-opt-004"></a>

范围：镜头像场对特定有效成像区域的覆盖关系

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-OPT-004 | 镜头像场覆盖（Lens Coverage） | 镜头像场对特定有效成像区域的覆盖关系 | 依赖 `DEPENDS_ON` Image Circle + active area |

#### 几何光圈F值


<a id="pc-opt-007"></a>

范围：焦距与有效入瞳直径之比的几何光圈量

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-OPT-007 | 几何光圈F值（F-number） | 焦距与有效入瞳直径之比的几何光圈量 | 影响 `AFFECTS` exposure/DOF；区别于 `CONTRASTS_WITH` T-stop |

#### 透光光圈T值


<a id="pc-opt-008"></a>

范围：将镜头实际透光损失计入后的曝光标度

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-OPT-008 | 透光光圈T值（T-stop） | 将镜头实际透光损失计入后的曝光标度 | 影响 `AFFECTS` exposure；conversion requires official transmission relation |

#### 光圈机构


<a id="pc-opt-009"></a>

范围：改变有效孔径的镜头机构

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-OPT-009 | 光圈机构（Iris） | 改变有效孔径的镜头机构 | 改变 `CHANGES` F-number/T-stop where supported |

#### 透光率


<a id="pc-opt-010"></a>

范围：光学系统实际传输光量的比例/损失关系

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-OPT-010 | 透光率（Transmission） | 光学系统实际传输光量的比例/损失关系 | LINKS F-number to T-stop when known |

#### 对焦距离


<a id="pc-opt-011"></a>

范围：对焦平面对应的主体距离

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-OPT-011 | 对焦距离（Focus Distance） | 对焦平面对应的主体距离 | 影响 `AFFECTS` DOF |

#### 最近对焦距离


<a id="pc-opt-012"></a>

范围：镜头可正常合焦的最近距离

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-OPT-012 | 最近对焦距离（Minimum Focus Distance） | 镜头可正常合焦的最近距离 | 约束 `CONSTRAINS` Focus Distance |

#### 焦点转移


<a id="pc-opt-013"></a>

范围：拍摄过程中从一个对焦目标改变到另一个目标

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-OPT-013 | 焦点转移（Rack Focus） | 拍摄过程中从一个对焦目标改变到另一个目标 | 改变 `CHANGES` Focus Distance；不等于 camera movement |

#### 呼吸效应


<a id="pc-opt-014"></a>

范围：对焦变化伴随的视场/放大率变化

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-OPT-014 | 呼吸效应（Focus Breathing） | 对焦变化伴随的视场/放大率变化 | 影响 `AFFECTS` framing/FOV；镜头特性 |

#### 景深


<a id="pc-opt-015"></a>

范围：在给定观察/成像条件下可接受清晰范围

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-OPT-015 | 景深（Depth of Field） | 在给定观察/成像条件下可接受清晰范围 | 依赖 `DEPENDS_ON` aperture、focus distance、focal length、CoC/model |

#### 超焦距


<a id="pc-opt-016"></a>

范围：在指定 CoC/焦距/光圈模型下，使远端延伸至无穷远的对焦距离

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-OPT-016 | 超焦距（Hyperfocal Distance） | 在指定 CoC/焦距/光圈模型下，使远端延伸至无穷远的对焦距离 | 由公式派生 `DERIVED_BY` FORM-DOF-002 |

#### 弥散圆


<a id="pc-opt-017"></a>

范围：景深模型中的允许弥散圆参数

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-OPT-017 | 弥散圆（Circle of Confusion） | 景深模型中的允许弥散圆参数 | INPUT_TO DOF model；不是固定普适值 |

#### 衍射


<a id="pc-opt-018"></a>

范围：小孔径下波动光学导致细节扩散的现象

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-OPT-018 | 衍射（Diffraction） | 小孔径下波动光学导致细节扩散的现象 | 影响 `AFFECTS` resolution/sharpness |

#### 投影模型


<a id="pc-opt-019"></a>
<a id="pc-opt-020"></a>

范围：直线投影和鱼眼投影分别定义；只在模型成立时使用相应公式。

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-OPT-019 | 直线投影（Rectilinear Projection） | 尽量保持直线为直线的常见镜头投影模型 | ENABLES standard rectilinear FOV formula |
| PC-OPT-020 | 鱼眼投影（Fisheye Projection） | 非直线投影的超广角镜头模型集合 | 需要 `REQUIRES` manufacturer/projection model；禁止套普通FOV公式 |

#### 挤压倍率


<a id="pc-opt-023"></a>

范围：Anamorphic 水平等方向的光学压缩倍率

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-OPT-023 | 挤压倍率（Squeeze Ratio） | Anamorphic 水平等方向的光学压缩倍率 | 影响 `AFFECTS` desqueezed FOV/aspect |

#### 去挤压


<a id="pc-opt-024"></a>

范围：将 anamorphic 压缩画面恢复显示比例的变换

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-OPT-024 | 去挤压（Desqueeze） | 将 anamorphic 压缩画面恢复显示比例的变换 | 依赖 `DEPENDS_ON` Squeeze Ratio |

#### 等效视场比较


<a id="pc-opt-025"></a>

范围：用不同有效成像区域比较取景范围的表达

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-OPT-025 | 等效视场比较（Equivalent Field-of-view Comparison） | 用不同有效成像区域比较取景范围的表达 | 由公式派生 `DERIVED_BY` active area + focal length；不覆盖 physical focal length |

#### 固定机位的光学变焦


<a id="pc-mov-014"></a>

范围：机位保持，改变镜头焦距造成取景范围改变

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-MOV-014 | 固定机位的光学变焦（Optical Zoom） | 机位保持，改变镜头焦距造成取景范围改变 | 改变 `CHANGES` focal length/FOV；保持 `PRESERVES` position |

#### 推拉变焦


<a id="pc-mov-015"></a>

范围：同时改变摄影机位置和光学焦距的复合镜头方法；分别保存位置变化和焦距变化，不把两者写成单个物理参数。

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-MOV-015 | 推拉变焦（Dolly Zoom） | 同时改变摄影机位置和光学焦距的复合镜头方法；分别保存位置变化和焦距变化，不把两者写成单个物理参数。 | 改变 `CHANGES` position+focal length；可用于保持特定主体画面比例 |

#### 机内电子裁切


<a id="pc-mov-016"></a>

范围：录制阶段对传感器读取区域或记录画面进行电子裁切；不是光学变焦。

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-MOV-016 | 机内电子裁切（In-camera Crop） | 录制阶段对传感器读取区域或记录画面进行电子裁切；不是光学变焦。 | 改变 `CHANGES` recorded framing；不改变光学 perspective |

#### 摇臂摄影


<a id="pc-mov-008"></a>

范围：使用摇臂承托摄影机完成拍摄的方式；具体升降、平移或弧线轨迹另引用运镜主题。

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-MOV-008 | 摇臂摄影（Crane / Jib Photography） | 使用摇臂承托摄影机完成拍摄的方式；具体升降、平移或弧线轨迹另引用运镜主题。 | 改变 `CHANGES` Camera Position |

#### 手持摄影


<a id="pc-mov-009"></a>

范围：由操作者直接承托产生的机位/姿态变化方式

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-MOV-009 | 手持摄影（Handheld） | 由操作者直接承托产生的机位/姿态变化方式 | 属于 `IS_A` support/movement mode |

#### 电控稳定器移动摄影


<a id="pc-mov-010"></a>

范围：由电控稳定器辅助的移动摄影

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-MOV-010 | 电控稳定器移动摄影（Gimbal Movement） | 由电控稳定器辅助的移动摄影 | 需要 `REQUIRES` compatible support |

#### 机械稳定系统移动摄影


<a id="pc-mov-011"></a>

范围：由机械稳定系统辅助的移动摄影

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-MOV-011 | 机械稳定系统移动摄影（Steadicam Movement） | 由机械稳定系统辅助的移动摄影 | 需要 `REQUIRES` compatible support |

#### 无人机移动摄影


<a id="pc-mov-012"></a>

范围：由飞行平台实现三维空间移动摄影

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-MOV-012 | 无人机移动摄影（Drone Movement） | 由飞行平台实现三维空间移动摄影 | 需要 `REQUIRES` aerial imaging device |

#### 曝光


<a id="pc-exp-001"></a>

范围：传感器/胶片接收到的有效光量及记录结果

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-EXP-001 | 曝光（Exposure） | 传感器/胶片接收到的有效光量及记录结果 | 依赖 `DEPENDS_ON` aperture、exposure time、scene luminance、sensitivity model |

#### 感光度ISO


<a id="pc-exp-002"></a>

范围：设备/标准定义的感光标度；具体意义依相机实现

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-EXP-002 | 感光度ISO（ISO） | 设备/标准定义的感光标度；具体意义依相机实现 | 不与EI/Gain全局互换 |

#### 曝光指数EI


<a id="pc-exp-003"></a>

范围：作为曝光/处理参考的指数，可能不等于传感器物理增益

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-EXP-003 | 曝光指数EI（Exposure Index / EI） | 作为曝光/处理参考的指数，可能不等于传感器物理增益 | model-specific |

#### 信号增益


<a id="pc-exp-004"></a>

范围：电子/数字信号增益表达

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-EXP-004 | 信号增益（Gain） | 电子/数字信号增益表达 | model-specific；可用dB等 |

#### 曝光时间


<a id="pc-exp-005"></a>

范围：每帧的曝光持续时间；以秒保存。快门速度是常用表达别名，倒数表达须换算，不与快门角度共用数值。

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-EXP-005 | 曝光时间（Exposure Time） | 每帧的曝光持续时间；以秒保存。快门速度是常用表达别名，倒数表达须换算，不与快门角度共用数值。 | DERIVED_WITH Shutter Angle + FPS where applicable |

#### 快门角度


<a id="pc-exp-006"></a>

范围：用一圈周期角度表达曝光占比的电影摄影参数

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-EXP-006 | 快门角度（Shutter Angle） | 用一圈周期角度表达曝光占比的电影摄影参数 | DERIVED_WITH exposure time + FPS |

#### 中性密度减光


<a id="pc-exp-007"></a>

范围：降低进入系统光量的滤镜/机制

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-EXP-007 | 中性密度减光（Neutral Density / ND） | 降低进入系统光量的滤镜/机制 | 测量为 `MEASURED_AS` optical density/stops |

#### 曝光档级


<a id="pc-exp-008"></a>

范围：以2倍/1/2光量为一级的曝光变化单位

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-EXP-008 | 曝光档级（Stop） | 以2倍/1/2光量为一级的曝光变化单位 | 组成 `PART_OF` exposure relationships |

#### 曝光值EV


<a id="pc-exp-009"></a>

范围：在指定定义下组合光圈与曝光时间的曝光参数

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-EXP-009 | 曝光值EV（Exposure Value / EV） | 在指定定义下组合光圈与曝光时间的曝光参数 | 由公式派生 `DERIVED_BY` FORM-EXP-001 |

#### 帧率


<a id="pc-exp-010"></a>

范围：单位时间记录/播放的帧数

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-EXP-010 | 帧率（Frame Rate） | 单位时间记录/播放的帧数 | 影响 `AFFECTS` motion/time calculations |

#### 项目基准帧率


<a id="pc-exp-011"></a>

范围：项目/时间线基准帧率

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-EXP-011 | 项目基准帧率（Project FPS） | 项目/时间线基准帧率 | 约束 `CONSTRAINS` timecode/playback |

#### 拍摄帧率


<a id="pc-exp-012"></a>

范围：实际拍摄记录帧率

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-EXP-012 | 拍摄帧率（Capture FPS） | 实际拍摄记录帧率 | 影响 `AFFECTS` slow/fast motion |

#### 回放帧率


<a id="pc-exp-013"></a>

范围：回放帧率

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-EXP-013 | 回放帧率（Playback FPS） | 回放帧率 | with Capture FPS 决定 `DETERMINES` speed ratio |

#### 运动模糊


<a id="pc-exp-014"></a>

范围：曝光期间运动在图像中的时间积分模糊

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-EXP-014 | 运动模糊（Motion Blur） | 曝光期间运动在图像中的时间积分模糊 | AFFECTED_BY exposure time + motion |

#### 升格拍摄


<a id="pc-exp-015"></a>

范围：Capture FPS 高于目标 Playback FPS 形成慢动作

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-EXP-015 | 升格拍摄（Overcrank） | Capture FPS 高于目标 Playback FPS 形成慢动作 | 依赖 `DEPENDS_ON` capture/playback ratio |

#### 降格拍摄


<a id="pc-exp-016"></a>

范围：Capture FPS 低于目标 Playback FPS 形成快动作

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-EXP-016 | 降格拍摄（Undercrank） | Capture FPS 低于目标 Playback FPS 形成快动作 | 依赖 `DEPENDS_ON` capture/playback ratio |

#### 主光


<a id="pc-lgt-001"></a>

范围：画面中承担主要塑形/方向作用的光源角色

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-LGT-001 | 主光（Key Light） | 画面中承担主要塑形/方向作用的光源角色 | 属于 `IS_A` lighting role |

#### 补光


<a id="pc-lgt-002"></a>

范围：调节阴影亮度/反差的光源角色

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-LGT-002 | 补光（Fill Light） | 调节阴影亮度/反差的光源角色 | 影响 `AFFECTS` contrast ratio |

#### 硬光


<a id="pc-lgt-004"></a>

范围：相对明显锐利阴影边缘的光质

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-LGT-004 | 硬光（Hard Light） | 相对明显锐利阴影边缘的光质 | AFFECTED_BY apparent source size/distance |

#### 软光


<a id="pc-lgt-005"></a>

范围：相对柔和阴影过渡的光质

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-LGT-005 | 软光（Soft Light） | 相对柔和阴影过渡的光质 | AFFECTED_BY apparent source size/distance |

#### 光源表观尺寸


<a id="pc-lgt-006"></a>

范围：从主体视角看到的光源角尺寸

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-LGT-006 | 光源表观尺寸（Apparent Source Size） | 从主体视角看到的光源角尺寸 | 影响 `AFFECTS` shadow softness |

#### 入射光方向


<a id="pc-lgt-007"></a>

范围：光相对主体的入射方向

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-LGT-007 | 入射光方向（Light Direction） | 光相对主体的入射方向 | 影响 `AFFECTS` shape/texture |

#### 光源距离


<a id="pc-lgt-008"></a>

范围：光源与受光面的距离

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-LGT-008 | 光源距离（Light Distance） | 光源与受光面的距离 | 影响 `AFFECTS` illuminance and apparent size |

#### 反差比


<a id="pc-lgt-009"></a>

范围：画面指定区域亮度/曝光关系的比较

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-LGT-009 | 反差比（Contrast Ratio） | 画面指定区域亮度/曝光关系的比较 | 依赖 `DEPENDS_ON` measurement definition |

#### 照度平方反比规律


<a id="pc-lgt-010"></a>

范围：理想点光源下照度随距离平方反比变化

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-LGT-010 | 照度平方反比规律（Inverse Square Law） | 理想点光源下照度随距离平方反比变化 | 由公式派生 `DERIVED_BY` FORM-LGT-001；实际大面积光源近场需注明限制 |

#### 相关色温


<a id="pc-lgt-011"></a>

范围：用相关色温描述近似白光色度的量

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-LGT-011 | 相关色温（CCT） | 用相关色温描述近似白光色度的量 | 测量为 `MEASURED_AS` kelvin |

#### 绿洋红偏移


<a id="pc-lgt-012"></a>

范围：与色温轴不同的绿-洋红偏移描述

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-LGT-012 | 绿洋红偏移（Tint / Green-Magenta） | 与色温轴不同的绿-洋红偏移描述 | 区别于 `CONTRASTS_WITH` CCT |

#### 控光附件


<a id="pc-lgt-013"></a>

范围：改变光束形状、扩散、聚光或质感的附件类别

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-LGT-013 | 控光附件（Modifier） | 改变光束形状、扩散、聚光或质感的附件类别 | 需要 `REQUIRES` compatible interface |

#### 菲涅耳透镜


<a id="pc-lgt-014"></a>

范围：利用菲涅耳光学改变光束的灯光附件/光学结构

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-LGT-014 | 菲涅耳透镜（Fresnel） | 利用菲涅耳光学改变光束的灯光附件/光学结构 | 属于 `IS_A` Modifier |

#### 柔光箱


<a id="pc-lgt-015"></a>

范围：扩大/扩散发光面的柔光附件

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-LGT-015 | 柔光箱（Softbox） | 扩大/扩散发光面的柔光附件 | 属于 `IS_A` Modifier |

#### 控光格栅


<a id="pc-lgt-016"></a>

范围：限制扩散角/控制溢光的附件

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-LGT-016 | 控光格栅（Grid） | 限制扩散角/控制溢光的附件 | 属于 `IS_A` Modifier |

#### 投影附件


<a id="pc-lgt-017"></a>

范围：投射图案/切光/聚焦的光学附件

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-LGT-017 | 投影附件（Projection Attachment） | 投射图案/切光/聚焦的光学附件 | 属于 `IS_A` Modifier；需要 `REQUIRES` lens/mount compatibility |

#### 背光


<a id="pc-lgt-018"></a>

范围：从主体背面方向照射的布光作用；不自动等同可见轮廓效果。

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-LGT-018 | 背光（Back Light） | 从主体背面方向照射的布光作用；不自动等同可见轮廓效果。 | 属于布光作用；引用入射方向 |

#### 轮廓光


<a id="pc-lgt-019"></a>

范围：以勾勒主体边缘为主要画面作用的光；作用按画面结果记录。

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-LGT-019 | 轮廓光（Rim Light） | 以勾勒主体边缘为主要画面作用的光；作用按画面结果记录。 | 属于布光作用；关联背光，不定义为背光的别名 |

#### 白平衡


<a id="pc-col-001"></a>

范围：对场景中性点/照明色偏进行拍摄或处理基准设定

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-COL-001 | 白平衡（White Balance） | 对场景中性点/照明色偏进行拍摄或处理基准设定 | 影响 `AFFECTS` image transform |

#### 摄影机记录色彩数据流


<a id="pc-col-021"></a>

范围：相机从传感器到记录格式/色彩编码的数据流

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-COL-021 | 摄影机记录色彩数据流（Camera Recording Pipeline） | 相机从传感器到记录格式/色彩编码的数据流 | 产生 `PRODUCES` camera media |

#### 话筒类型


<a id="pc-aud-001"></a>

范围：按换能/用途等分类的话筒概念

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-AUD-001 | 话筒类型（Microphone Type） | 按换能/用途等分类的话筒概念 | 约束 `CONSTRAINS` capture method |

#### 拾音指向性


<a id="pc-aud-002"></a>

范围：话筒对不同方向声音敏感度的空间特性

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-AUD-002 | 拾音指向性（Pickup Pattern） | 话筒对不同方向声音敏感度的空间特性 | 组成 `PART_OF` microphone spec |

#### 挑杆收音


<a id="pc-aud-003"></a>

范围：通过杆件将话筒定位在画面外靠近声源的现场收声方式

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-AUD-003 | 挑杆收音（Boom） | 通过杆件将话筒定位在画面外靠近声源的现场收声方式 | 属于 `IS_A` production sound method |

#### 领夹话筒


<a id="pc-aud-004"></a>

范围：佩戴/隐藏于人物附近的小型话筒使用方式

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-AUD-004 | 领夹话筒（Lavalier / Lav） | 佩戴/隐藏于人物附近的小型话筒使用方式 | 属于 `IS_A` production sound method |

#### 话筒电平


<a id="pc-aud-005"></a>

范围：常见低电平麦克风信号级别类别

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-AUD-005 | 话筒电平（Mic Level） | 常见低电平麦克风信号级别类别 | 区别于 `CONTRASTS_WITH` Line Level |

#### 线路电平


<a id="pc-aud-006"></a>

范围：设备间传输的较高标准信号级别类别

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-AUD-006 | 线路电平（Line Level） | 设备间传输的较高标准信号级别类别 | 区别于 `CONTRASTS_WITH` Mic Level |

#### 音频采样率


<a id="pc-aud-007"></a>

范围：每秒数字音频采样次数

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-AUD-007 | 音频采样率（Sample Rate） | 每秒数字音频采样次数 | 测量为 `MEASURED_AS` Hz |

#### 音频位深


<a id="pc-aud-008"></a>

范围：单个音频样本的量化位深

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-AUD-008 | 音频位深（Audio Bit Depth） | 单个音频样本的量化位深 | 影响 `AFFECTS` quantization/dynamic representation |

#### 时间码


<a id="pc-aud-009"></a>

范围：为媒体建立时间位置标识的计时码体系

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-AUD-009 | 时间码（Timecode） | 为媒体建立时间位置标识的计时码体系 | SUPPORTS sync |

#### 同步


<a id="pc-aud-010"></a>

范围：使画面与声音或多设备时间关系一致

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-AUD-010 | 同步（Sync） | 使画面与声音或多设备时间关系一致 | 依赖 `DEPENDS_ON` timecode/clock/reference/workflow |

#### 现场录音


<a id="pc-aud-011"></a>

范围：拍摄现场记录的声音

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-AUD-011 | 现场录音（Production Sound） | 拍摄现场记录的声音 | 产生 `PRODUCES` media |

#### 原始素材


<a id="pc-med-005"></a>

范围：由拍摄设备产生、作为原始源的媒体

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-MED-005 | 原始素材（Camera Original） | 由拍摄设备产生、作为原始源的媒体 | 先于 `PRECEDES` proxy/conform |

#### 元数据


<a id="pc-med-009"></a>

范围：描述媒体、拍摄、编码或业务信息的数据

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-MED-009 | 元数据（Metadata） | 描述媒体、拍摄、编码或业务信息的数据 | 组成 `PART_OF` media/asset |

#### 素材卸载复制


<a id="pc-med-010"></a>

范围：从采集介质复制素材到目标存储的过程

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-MED-010 | 素材卸载复制（Offload） | 从采集介质复制素材到目标存储的过程 | 先于 `PRECEDES` integrity/backup |

#### 完整性校验


<a id="pc-med-011"></a>

范围：验证文件内容完整性的检查事实

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-MED-011 | 完整性校验（Integrity Check） | 验证文件内容完整性的检查事实 | REQUIRED_BY Formal Handoff |

#### 备份验证


<a id="pc-med-012"></a>

范围：验证项目要求的备份事实

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-MED-012 | 备份验证（Backup Verification） | 验证项目要求的备份事实 | REQUIRED_BY Formal Handoff when configured |

#### 正式素材交接


<a id="pc-med-013"></a>

范围：将固定 AssetVersion 正式交给下游的业务事实

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-MED-013 | 正式素材交接（Formal Handoff） | 将固定 AssetVersion 正式交给下游的业务事实 | 需要 `REQUIRES` integrity + configured backup |

#### 连接接口


<a id="pc-if-001"></a>

范围：设备间机械、电气、数据、控制或光学连接能力的稳定定义

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-IF-001 | 连接接口（Interface） | 设备间机械、电气、数据、控制或光学连接能力的稳定定义 | 关联原因、方向和条件需按知识关系单独记录 |

#### 机械安装接口


<a id="pc-if-002"></a>

范围：机械安装接口，如 lens mount、modifier mount、support mount

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-IF-002 | 机械安装接口（Mechanical Mount） | 机械安装接口，如 lens mount、modifier mount、support mount | 关联原因、方向和条件需按知识关系单独记录 |

#### 供电接口


<a id="pc-if-003"></a>

范围：供电输入/输出接口

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-IF-003 | 供电接口（Power Interface） | 供电输入/输出接口 | 关联原因、方向和条件需按知识关系单独记录 |

#### 视频接口


<a id="pc-if-004"></a>

范围：视频输入/输出接口

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-IF-004 | 视频接口（Video Interface） | 视频输入/输出接口 | 关联原因、方向和条件需按知识关系单独记录 |

#### 数据接口


<a id="pc-if-005"></a>

范围：数据传输接口

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-IF-005 | 数据接口（Data Interface） | 数据传输接口 | 关联原因、方向和条件需按知识关系单独记录 |

#### 控制接口


<a id="pc-if-006"></a>

范围：遥控/协议/电子控制接口

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-IF-006 | 控制接口（Control Interface） | 遥控/协议/电子控制接口 | 关联原因、方向和条件需按知识关系单独记录 |

#### 快拆接口


<a id="pc-if-007"></a>

范围：快拆板、云台、稳定器等支撑系统接口

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-IF-007 | 快拆接口（Quick Release Interface） | 快拆板、云台、稳定器等支撑系统接口 | 关联原因、方向和条件需按知识关系单独记录 |

#### 直接兼容


<a id="pc-if-008"></a>

范围：无中间件即可按目标用途连接/工作

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-IF-008 | 直接兼容（Direct Compatibility） | 无中间件即可按目标用途连接/工作 | 关联原因、方向和条件需按知识关系单独记录 |

#### 需要转接


<a id="pc-if-009"></a>

范围：需要现实存在的 AdapterModel/Accessory 才能连接

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-IF-009 | 需要转接（Adapter Required） | 需要现实存在的 AdapterModel/Accessory 才能连接 | 关联原因、方向和条件需按知识关系单独记录 |

#### 有条件兼容


<a id="pc-if-010"></a>

范围：只有特定模式/固件/功能条件下兼容

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-IF-010 | 有条件兼容（Conditional Compatibility） | 只有特定模式/固件/功能条件下兼容 | 关联原因、方向和条件需按知识关系单独记录 |

#### 明确不兼容


<a id="pc-if-011"></a>

范围：按明确用途/接口无法兼容

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-IF-011 | 明确不兼容（Incompatible） | 按明确用途/接口无法兼容 | 关联原因、方向和条件需按知识关系单独记录 |

#### 兼容路径


<a id="pc-if-012"></a>

范围：由接口和中间件组成的兼容路径；自动推荐最多两个中间节点

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-IF-012 | 兼容路径（Compatibility Path） | 由接口和中间件组成的兼容路径；自动推荐最多两个中间节点 | 关联原因、方向和条件需按知识关系单独记录 |

### E．出镜、表演与造型

逐层字段入口：[E 类分册](knowledge/E_KNOWLEDGE_HIERARCHY_2026-10-05.md)。

### F．AE、MG、二维动画与合成

逐层字段入口：[F 类分册](knowledge/F_KNOWLEDGE_HIERARCHY_2026-10-05.md)。

#### 合成色彩数据流


<a id="pc-col-022"></a>

范围：合成阶段输入、工作空间、输出的颜色数据流

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-COL-022 | 合成色彩数据流（Composite Color Pipeline） | 合成阶段输入、工作空间、输出的颜色数据流 | 消费 `CONSUMES`/产生 `PRODUCES` image formats |

#### 透明通道


<a id="pc-2d-001"></a>

范围：表示像素覆盖/透明关系的通道或概念

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-2D-001 | 透明通道（Alpha） | 表示像素覆盖/透明关系的通道或概念 | USED_BY compositing |

#### 遮罩


<a id="pc-2d-002"></a>

范围：用于限定图像区域的遮罩信息

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-2D-002 | 遮罩（Matte） | 用于限定图像区域的遮罩信息 | USED_BY compositing |

#### 抠像


<a id="pc-2d-003"></a>

范围：基于颜色/亮度等特征分离前景背景的过程

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-2D-003 | 抠像（Keying） | 基于颜色/亮度等特征分离前景背景的过程 | 产生 `PRODUCES` matte/alpha |

#### 逐帧描绘遮罩


<a id="pc-2d-004"></a>

范围：通过逐帧/跟踪方式建立精细遮罩的过程

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-2D-004 | 逐帧描绘遮罩（Rotoscope） | 通过逐帧/跟踪方式建立精细遮罩的过程 | 产生 `PRODUCES` matte |

#### 跟踪


<a id="pc-2d-005"></a>

范围：估计图像中特征/物体/相机运动的过程

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-2D-005 | 跟踪（Tracking） | 估计图像中特征/物体/相机运动的过程 | 产生 `PRODUCES` motion data |

#### 数字合成


<a id="pc-2d-007"></a>

范围：将多层图像/渲染元素整合为目标画面的过程

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-2D-007 | 数字合成（Compositing） | 将多层图像/渲染元素整合为目标画面的过程 | 消费 `CONSUMES` layers/mattes/color pipeline |

#### 动态图形


<a id="pc-2d-008"></a>

范围：以图形、文字和运动设计为核心的动态图像类别

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-2D-008 | 动态图形（Motion Graphics） | 以图形、文字和运动设计为核心的动态图像类别 | 引用 `REFERENCES` typography/animation/composite |

#### 文字动画


<a id="pc-2d-009"></a>

范围：以文字形态、排版和运动为核心的动画类别

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-2D-009 | 文字动画（Typography Animation） | 以文字形态、排版和运动为核心的动画类别 | 属于 `IS_A` Motion Graphics |

#### 二维动画


<a id="pc-2d-010"></a>

范围：二维空间为主要表达体系的动画制作类别

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-2D-010 | 二维动画（2D Animation） | 二维空间为主要表达体系的动画制作类别 | 区别于 `CONTRASTS_WITH` 3D animation |

#### 画面擦除


<a id="pc-2d-011"></a>

范围：去除指定画面元素的制作概念；输入需明确擦除目标。

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-2D-011 | 画面擦除（Object Removal） | 去除指定画面元素的制作概念；输入需明确擦除目标。 | 输出清理结果；可关联画面修补和跟踪 |

#### 画面修补


<a id="pc-2d-012"></a>

范围：恢复缺失或受损画面区域的制作概念；输入需明确参考区域。

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-2D-012 | 画面修补（Image Repair） | 恢复缺失或受损画面区域的制作概念；输入需明确参考区域。 | 可消费擦除留下的区域；不强制先经过擦除 |

### G．三维制作与三维视效

逐层字段入口：[G 类分册](knowledge/G_KNOWLEDGE_HIERARCHY_2026-10-05.md)。

#### 渲染色彩数据流


<a id="pc-col-023"></a>

范围：渲染阶段场景线性/显示变换与输出的颜色数据流

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-COL-023 | 渲染色彩数据流（Render Color Pipeline） | 渲染阶段场景线性/显示变换与输出的颜色数据流 | 产生 `PRODUCES` render formats |

#### 网格


<a id="pc-3d-001"></a>

范围：三维表面几何表示

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-3D-001 | 网格（Mesh） | 三维表面几何表示 | 组成 `PART_OF` 3D asset |

#### 拓扑


<a id="pc-3d-002"></a>

范围：Mesh 顶点/边/面的连接结构

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-3D-002 | 拓扑（Topology） | Mesh 顶点/边/面的连接结构 | 影响 `AFFECTS` deformation/model quality |

#### 纹理坐标UV


<a id="pc-3d-003"></a>

范围：将三维表面映射到二维纹理坐标的结构

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-3D-003 | 纹理坐标UV（UV） | 将三维表面映射到二维纹理坐标的结构 | SUPPORTS texturing |

#### 材质


<a id="pc-3d-004"></a>

范围：定义表面着色属性的资产/描述

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-3D-004 | 材质（Material） | 定义表面着色属性的资产/描述 | 引用 `REFERENCES` shader/textures |

#### 着色器


<a id="pc-3d-005"></a>

范围：计算表面/体积外观的着色程序/模型

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-3D-005 | 着色器（Shader） | 计算表面/体积外观的着色程序/模型 | 组成 `PART_OF` material/rendering |

#### 绑定控制系统


<a id="pc-3d-006"></a>

范围：为模型提供控制、骨骼和变形结构的系统

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-3D-006 | 绑定控制系统（Rig） | 为模型提供控制、骨骼和变形结构的系统 | 先于 `PRECEDES` character/object animation |

#### 三维镜头布局


<a id="pc-3d-007"></a>

范围：在镜头中组织相机、角色和场景元素的阶段/结果

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-3D-007 | 三维镜头布局（Layout） | 在镜头中组织相机、角色和场景元素的阶段/结果 | 先于 `PRECEDES` final animation/render |

#### 虚拟摄影机


<a id="pc-3d-008"></a>

范围：在数字场景中定义摄影机及其运动/光学参数

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-3D-008 | 虚拟摄影机（Virtual Camera） | 在数字场景中定义摄影机及其运动/光学参数 | 引用 `REFERENCES` camera commons |

#### 三维动画


<a id="pc-3d-009"></a>

范围：对三维对象/角色/相机随时间变化进行制作

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-3D-009 | 三维动画（3D Animation） | 对三维对象/角色/相机随时间变化进行制作 | 消费 `CONSUMES` rig/layout |

#### 模拟


<a id="pc-3d-010"></a>

范围：依据规则/物理模型计算随时间变化的效果

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-3D-010 | 模拟（Simulation） | 依据规则/物理模型计算随时间变化的效果 | 产生 `PRODUCES` cache |

#### 缓存


<a id="pc-3d-011"></a>

范围：固化模拟/动画计算结果供下游读取的数据

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-3D-011 | 缓存（Cache） | 固化模拟/动画计算结果供下游读取的数据 | 产生 `PRODUCES`/消费 `CONSUMES` pipeline artifact |

#### 三维灯光


<a id="pc-3d-012"></a>

范围：在三维场景中定义数字光源和照明关系

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-3D-012 | 三维灯光（3D Lighting） | 在三维场景中定义数字光源和照明关系 | 引用 `REFERENCES` lighting/color commons |

#### 渲染


<a id="pc-3d-013"></a>

范围：将数字场景计算为图像/序列的过程

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-3D-013 | 渲染（Rendering） | 将数字场景计算为图像/序列的过程 | 产生 `PRODUCES` image sequence/AOV |

#### 渲染分层输出


<a id="pc-3d-014"></a>

范围：渲染输出中按属性/贡献拆分的辅助图像通道

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-3D-014 | 渲染分层输出（AOV） | 渲染输出中按属性/贡献拆分的辅助图像通道 | 产生 `PRODUCES` compositing inputs |

#### 实时渲染


<a id="pc-3d-015"></a>

范围：以交互速度更新画面的渲染方式

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-3D-015 | 实时渲染（Realtime Rendering） | 以交互速度更新画面的渲染方式 | 组成 `PART_OF` realtime production |

#### 虚拟制作


<a id="pc-3d-016"></a>

范围：将实时数字环境、摄影、跟踪等用于制作现场/预演/拍摄的工作方式集合

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-3D-016 | 虚拟制作（Virtual Production） | 将实时数字环境、摄影、跟踪等用于制作现场/预演/拍摄的工作方式集合 | 引用 `REFERENCES` realtime/camera/tracking |

#### 动作捕捉


<a id="pc-3d-017"></a>

范围：采集现实运动并转换为数字动作数据的过程

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-3D-017 | 动作捕捉（Mocap） | 采集现实运动并转换为数字动作数据的过程 | 产生 `PRODUCES` motion data |

#### 摄影测量


<a id="pc-3d-018"></a>

范围：从多张照片/影像估计三维几何与纹理的重建方法

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-3D-018 | 摄影测量（Photogrammetry） | 从多张照片/影像估计三维几何与纹理的重建方法 | 产生 `PRODUCES` 3D asset/reference |

### H．剪辑、声音、成片与交付

逐层字段入口：[H 类分册](knowledge/H_KNOWLEDGE_HIERARCHY_2026-10-05.md)。

#### 后期重构图


<a id="pc-mov-017"></a>

范围：对已记录画面进行裁切、缩放或位置调整以重新组织画面；不改写原拍摄机位和光学事实。

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-MOV-017 | 后期重构图（Post Reframe） | 对已记录画面进行裁切、缩放或位置调整以重新组织画面；不改写原拍摄机位和光学事实。 | 后于 `FOLLOWS` capture；不改变拍摄时 perspective/FOV |

#### 色彩空间


<a id="pc-col-002"></a>

范围：定义色度坐标、白点等颜色表示范围/体系

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-COL-002 | 色彩空间（Color Space） | 定义色度坐标、白点等颜色表示范围/体系 | 组成 `PART_OF` color pipeline |

#### 传递函数


<a id="pc-col-003"></a>

范围：线性场景/显示信号与编码值之间的映射

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-COL-003 | 传递函数（Transfer Function） | 线性场景/显示信号与编码值之间的映射 | 区别于 `CONTRASTS_WITH` Color Space |

#### 伽马


<a id="pc-col-004"></a>

范围：一类幂函数/近似编码或显示关系的统称，需指明具体定义

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-COL-004 | 伽马（Gamma） | 一类幂函数/近似编码或显示关系的统称，需指明具体定义 | 属于 `IS_A`/RELATED transfer function |

#### 对数编码


<a id="pc-col-005"></a>

范围：为扩大编码动态范围而使用的对数/类对数编码

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-COL-005 | 对数编码（Log Encoding） | 为扩大编码动态范围而使用的对数/类对数编码 | 属于 `IS_A` transfer/encoding family |

#### 线性光


<a id="pc-col-006"></a>

范围：与场景/光能近似线性比例的图像数值域

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-COL-006 | 线性光（Linear Light） | 与场景/光能近似线性比例的图像数值域 | 区别于 `CONTRASTS_WITH` display/log encodings |

#### 颜色查找表


<a id="pc-col-007"></a>

范围：固定输入到输出颜色/数值映射表

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-COL-007 | 颜色查找表（LUT） | 固定输入到输出颜色/数值映射表 | 组成 `PART_OF` transform pipeline；不是完整色彩管理本身 |

#### 位深


<a id="pc-col-008"></a>

范围：每通道可表示的离散数值精度

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-COL-008 | 位深（Bit Depth） | 每通道可表示的离散数值精度 | 影响 `AFFECTS` quantization headroom |

#### 色度采样


<a id="pc-col-009"></a>

范围：色度相对亮度的采样结构，如4:4:4/4:2:2等

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-COL-009 | 色度采样（Chroma Sampling） | 色度相对亮度的采样结构，如4:4:4/4:2:2等 | 影响 `AFFECTS` chroma detail |

#### 标准动态范围


<a id="pc-col-010"></a>

范围：标准动态范围显示/交付类别

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-COL-010 | 标准动态范围（SDR） | 标准动态范围显示/交付类别 | 区别于 `CONTRASTS_WITH` HDR |

#### 高动态范围


<a id="pc-col-011"></a>

范围：高动态范围显示/交付类别

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-COL-011 | 高动态范围（HDR） | 高动态范围显示/交付类别 | 需要 `REQUIRES` transfer/display metadata context |

#### 高清色彩体系Rec.709


<a id="pc-col-012"></a>

范围：常见HD视频颜色/信号推荐体系；使用时需区分色域/传递函数具体上下文

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-COL-012 | 高清色彩体系Rec.709（Rec.709） | 常见HD视频颜色/信号推荐体系；使用时需区分色域/传递函数具体上下文 | 引用 `REFERENCES` delivery/display |

#### 超高清色彩体系Rec.2020


<a id="pc-col-013"></a>

范围：UHD广色域推荐体系

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-COL-013 | 超高清色彩体系Rec.2020（Rec.2020） | UHD广色域推荐体系 | 引用 `REFERENCES` HDR/UHD workflows |

#### 网络图像色彩空间sRGB


<a id="pc-col-014"></a>

范围：常见计算机/网络图像颜色空间/传递关系

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-COL-014 | 网络图像色彩空间sRGB（sRGB） | 常见计算机/网络图像颜色空间/传递关系 | 引用 `REFERENCES` graphics/stills |

#### 显示色彩空间Display P3


<a id="pc-col-015"></a>

范围：常见广色域显示颜色空间

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-COL-015 | 显示色彩空间Display P3（Display P3） | 常见广色域显示颜色空间 | 引用 `REFERENCES` display pipeline |

#### 显示伽马2.4


<a id="pc-col-016"></a>

范围：常见监看/显示目标之一

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-COL-016 | 显示伽马2.4（Gamma 2.4） | 常见监看/显示目标之一 | 属于 `IS_A` transfer/display setting |

#### 感知量化传递函数PQ


<a id="pc-col-017"></a>

范围：HDR绝对亮度型电光传递函数

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-COL-017 | 感知量化传递函数PQ（ST2084 / PQ） | HDR绝对亮度型电光传递函数 | 属于 `IS_A` transfer function |

#### 混合对数伽马HLG


<a id="pc-col-018"></a>

范围：HDR广播兼容型传递体系

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-COL-018 | 混合对数伽马HLG（HLG） | HDR广播兼容型传递体系 | 属于 `IS_A` transfer function |

#### 学院色彩编码体系ACES


<a id="pc-col-019"></a>

范围：影视色彩管理与交换体系

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-COL-019 | 学院色彩编码体系ACES（ACES） | 影视色彩管理与交换体系 | 组成 `PART_OF` color pipeline |

#### 后期色彩数据流


<a id="pc-col-024"></a>

范围：调色、在线、母版和交付颜色变换链

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-COL-024 | 后期色彩数据流（Post Color Pipeline） | 调色、在线、母版和交付颜色变换链 | 消费 `CONSUMES` camera/render/composite media |

#### 对白


<a id="pc-aud-012"></a>

范围：对白内容类别

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-AUD-012 | 对白（Dialogue） | 对白内容类别 | 组成 `PART_OF` sound edit/mix |

#### 音效


<a id="pc-aud-013"></a>

范围：音效内容类别

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-AUD-013 | 音效（SFX） | 音效内容类别 | 组成 `PART_OF` sound design |

#### 音乐


<a id="pc-aud-014"></a>

范围：音乐内容类别

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-AUD-014 | 音乐（Music） | 音乐内容类别 | 组成 `PART_OF` soundtrack |

#### 混音


<a id="pc-aud-015"></a>

范围：将多个声音元素按目标输出整合的过程

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-AUD-015 | 混音（Mix） | 将多个声音元素按目标输出整合的过程 | 消费 `CONSUMES` dialogue/music/SFX |

#### 媒体容器


<a id="pc-med-001"></a>

范围：封装多种媒体流和metadata的文件结构

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-MED-001 | 媒体容器（Container） | 封装多种媒体流和metadata的文件结构 | CONTAINS codec streams |

#### 编解码器


<a id="pc-med-002"></a>

范围：媒体编码/解码方式

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-MED-002 | 编解码器（Codec） | 媒体编码/解码方式 | USED_IN container/stream |

#### 图像序列


<a id="pc-med-003"></a>

范围：以连续单帧文件组成运动影像的方式

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-MED-003 | 图像序列（Image Sequence） | 以连续单帧文件组成运动影像的方式 | 区别于 `CONTRASTS_WITH` video container |

#### 工程交换


<a id="pc-med-004"></a>

范围：在不同剪辑/后期系统间传递时间线/编辑信息的交换格式类别

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-MED-004 | 工程交换（Project Interchange） | 在不同剪辑/后期系统间传递时间线/编辑信息的交换格式类别 | 引用 `REFERENCES` OTIO/EDL/XML |

#### 代理素材


<a id="pc-med-006"></a>

范围：为性能/协作生成的低负载替代媒体

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-MED-006 | 代理素材（Proxy） | 为性能/协作生成的低负载替代媒体 | 引用 `REFERENCES` original；不得冒充 master |

#### 预览产物


<a id="pc-med-007"></a>

范围：用于预览/草稿流程的媒体

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-MED-007 | 预览产物（Preview） | 用于预览/草稿流程的媒体 | 不等于Formal Handoff/Master |

#### 母版


<a id="pc-med-008"></a>

范围：经过指定制作/验收后的主交付媒体版本

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-MED-008 | 母版（Master） | 经过指定制作/验收后的主交付媒体版本 | 先于 `PRECEDES` variants/delivery |

#### 套底


<a id="pc-med-014"></a>

范围：将离线编辑决策重新连接至高质量/原始媒体的过程

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-MED-014 | 套底（Conform） | 将离线编辑决策重新连接至高质量/原始媒体的过程 | 消费 `CONSUMES` edit decisions + originals |

#### 质量检查


<a id="pc-med-015"></a>

范围：对目标版本按项目要求进行检查的事实/流程

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-MED-015 | 质量检查（QC） | 对目标版本按项目要求进行检查的事实/流程 | 先于 `PRECEDES` delivery where required |

#### 交付变体


<a id="pc-med-016"></a>

范围：同一作品针对不同交付目标生成的版本变体

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-MED-016 | 交付变体（Delivery Variant） | 同一作品针对不同交付目标生成的版本变体 | 组成 `PART_OF` deliverable |

#### 交付物


<a id="pc-wf-018"></a>

范围：对外交付对象/要求

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-WF-018 | 交付物（Deliverable） | 对外交付对象/要求 | 消费 `CONSUMES` approved version/QC |

#### 交付事实


<a id="pc-wf-019"></a>

范围：提交/送达/确认/验收等独立事实集合

| 主题编号 | 中文名称（英文术语） | 定义和边界 | 明确关联 |
| --- | --- | --- | --- |
| PC-WF-019 | 交付事实（Delivery） | 提交/送达/确认/验收等独立事实集合 | 后于 `FOLLOWS` QC/authorization where required |

## 4. 公式定义

首批 FormulaDefinition：

| ID | 中文名称（英文术语） | 输入 | 输出/规则 |
| --- | --- | --- | --- |
| FORM-OPT-001 | 直线投影视场角（Rectilinear FOV） | focal length + effective dimension | `2 * atan(dimension / (2*f))`；仅适用 rectilinear 且无更高优先级官方AoV |
| FORM-OPT-002 | 变形成像去挤压视场角（Anamorphic desqueezed FOV） | official/projection data + squeeze + active area | 按厂商模型；禁止仅用通用倍乘替代特殊官方数据 |
| FORM-DOF-001 | 景深（DOF） | focal length、focus distance、F-number、CoC | 仅在指定几何光学模型下计算 |
| FORM-DOF-002 | 超焦距（Hyperfocal） | focal length、F-number、CoC | 常见薄透镜近似；结果标CALCULATED |
| FORM-TIME-001 | 快门角度换曝光时间（Shutter Angle → Exposure Time） | shutter angle + FPS | `t = angle / (360 * fps)` |
| FORM-TIME-002 | 曝光时间换快门角度（Exposure Time → Shutter Angle） | exposure time + FPS | `angle = t * fps * 360` |
| FORM-TIME-003 | 帧数换片长（Frame Count ↔ Duration） | frames + rational FPS | duration = frames / fps；需遵守项目timecode规则 |
| FORM-DATA-001 | 数据量估算（Bitrate × Duration） | bitrate + duration | 估算数据量；明确bit/byte换算 |
| FORM-LGT-001 | 照度平方反比（Inverse Square） | distance ratio | 理想点光源近似：E ∝ 1/r² |
| FORM-EXP-001 | 曝光值（EV） | F-number + exposure time | 常用ISO100基准形式 `EV = log2(N²/t)`；其他上下文需显式 |
| FORM-EXP-002 | 减光档数（ND Stops） | transmission/optical density | 按定义转换；不能把厂商命名直接当精确测量 |
| FORM-LGT-002 | 照度单位换算（Lux ↔ foot-candle） | illuminance | 1 fc ≈ 10.7639 lux |
| FORM-OPT-003 | 等效视场比较（Crop / Equivalent FOV） | active dimensions + reference dimensions | 只用于视场比较，不覆盖physical focal length |

F-number ↔ T-stop 与 ISO/EI/Gain **不提供全局 FormulaDefinition**；必须由具体镜头/机身官方映射支持。

## 5. 编号拆分转向

旧混合编号不分配给任一新主题，也不再作为有效知识条目；保留此表供已有文档引用解析。转向结果可能有多个，使用方必须选择具体主题，禁止自动挑第一个。此表不是运行数据迁移，不保留旧实现或用户资料。

| 原混合编号 | 现有独立主题 | 处理 |
| --- | --- | --- |
| `PC-NAR-010` | `PC-NAR-021` 人物调度；`PC-NAR-022` 机位调度 | 只作转向，禁止作为有效主题导入 |
| `PC-NAR-016` | `PC-NAR-023` 动作轴线；`PC-NAR-024` 180度规则 | 只作转向，禁止作为有效主题导入 |
| `PC-LGT-003` | `PC-LGT-018` 背光；`PC-LGT-019` 轮廓光 | 只作转向，禁止作为有效主题导入 |
| `PC-2D-006` | `PC-2D-011` 画面擦除；`PC-2D-012` 画面修补 | 只作转向，禁止作为有效主题导入 |
| `PC-WF-017` | `PC-WF-020` 返工请求；`PC-WF-021` 补拍请求 | 只作转向，禁止作为有效主题导入 |
| `PC-COL-020` | `PC-COL-021` 摄影机记录色彩数据流；`PC-COL-005` 对数编码 | 只作转向，禁止作为有效主题导入 |

## 6. 验收标准

- 一个有效编号只有一个中文名称、一份定义和明确边界。
- 岗位大类保持，常识分类和专业组件独立拆分；不创建重复的权威正文。
- 每个有效主题在本目录只有一个直接分类入口；跨类使用通过显式引用。
- 相关性说明原因、方向和条件；不等于权限、任务或器材适配。
- 旧混合编号有完整转向，没有悬空引用；公式和来源政策不因改目录失效。
- 本次只校验规划文档，真实规格和运行验收仍需独立完成。

## 7. 已取消的留白条目

以下身份只用于拒绝旧引用继续导入，不是有效知识类或字段，不转向其他构图主题。

<a id="pc-cam-015"></a>

<a id="pc-cam-019"></a>

<a id="pc-cam-021"></a>

<a id="pc-cam-022"></a>

<a id="pc-cam-016"></a>

| 原编号 | 原名称 | 当前状态 |
| --- | --- | --- |
| `PC-CAM-015` | 头顶留白 | 用户已取消；不得恢复为有效分类 |
| `PC-CAM-019` | 负空间 | 用户已取消；不得恢复为有效分类 |
| `PC-CAM-021` | 运动方向留白 | 用户已取消；不得恢复为有效分类 |
| `PC-CAM-022` | 视线方向留白 | 用户已取消；不得恢复为有效分类 |
| `PC-CAM-016` | 原复合留白入口 | 用户已取消；不得恢复为有效分类 |
