# FrameForge VNext 最大化扩展性需求总纲

> 日期：2026-10-04  
> 文档类型：长期产品/架构需求合同  
> 状态：**PLANNED / REQUIREMENTS**。本文定义目标边界和验收要求，不表示对应代码已经实现。  
> 适用范围：VNext 原生架构（`apps/web`、`apps/api`、`apps/worker`、根 `packages/*`）。  
> 优先级：最新明确用户指令 > 本文 > 旧架构计划/历史工作记录。  
> Legacy 原则：旧数据库不迁移、旧 API/session/runtime 不兼容；Legacy 仅作为产品行为参考和便携工程文件导出桥。  
> Import 原则：**不保存客户模板/Import Recipe**；每次基于文件内容重新模糊识别、自动合并、冲突预览后提交。

---

## 1. 总目标

FrameForge 的长期目标不是“把 Shot 表做得越来越大”，而是形成一个可持续扩展的影视制作 Domain Platform：

```text
Strong Core
+
Explicit Extension Points
+
Typed Domain Relations
+
Stable Commands / Events
+
Versioned Contracts
```

未来增加演员、场地、设备、排期、任务、资产授权、知识库、自动估时、AI、OCR、TTS、第三方导入导出或新交付格式时，应优先通过：

```text
新增 Entity
新增 Relation
新增 Command / Query
新增 Event Consumer
新增 Provider
新增 UI Contribution
```

完成，而不是：

```text
继续给 Shot 加字段
在页面里堆 if/else
在 Service 里写跨模块特殊分支
新增第二套状态 owner
新增万能 JSON/EAV
```

### 1.1 最大化扩展性的定义

“最大化”不等于“所有东西动态化”。本项目追求：

- 核心业务保持强类型、可约束、可审计；
- 扩展点稳定、明确、可版本化；
- 新领域可以增量接入，而不破坏已有 owner；
- 新模块不需要绕过 Command / Revision / Audit / History；
- 用户配置可以灵活，但不能牺牲业务语义；
- 允许未来替换存储、AI、队列、导入导出实现，而不影响 Domain；
- 保持 monorepo 边界有限，不通过无限增加 package 追求形式上的“模块化”。

### 1.2 Canonical Facts → Projections

数据库保存可复用的业务事实，页面、时间轴、Stripboard、DOOD、Calendar、Call Sheet、统计页等应尽量是同一组 canonical domain data 的不同 Projection / Read Model，而不是各自复制一套 Scene/Shot/Person/Location 数据。

长期规则：

```text
Canonical Facts
↓
Domain Queries / Read Models
↓
Table / Board / Wall / Timeline / Calendar / Call Sheet
```

因此：

- Schedule 不复制 Scene/Shot 内容；它表达“何时执行哪些内容”；
- Draft Call Sheet 不成为第二套 Cast/Crew/Location 真相；
- People/Equipment/Location 页面不得各自维护 Shot 的镜像字段；
- Projection 可以缓存，但必须能够从 canonical data 重建；
- 需要历史冻结的已发布文档使用显式 revision/snapshot，而不是把所有 Projection 都持久化成第二事实源。

---

## 2. VNext 长期分层

目标分为六层：

```text
① Core Domain
Work / Episode / Production / Sequence / Scene / Shot / Panel / Asset
User / Person / Character / Member

② Extension
Preset Field / Custom Field / Derived Field

③ Relations
Person / Cast / Location / Equipment / Asset / Shot / Task links

④ Workflow
ProductionStep / Task / Dependency / Schedule

⑤ Presentation
Saved View / Workspace Layout / Deliverable Profile

⑥ Automation
Domain Event → Rule → Command
```

底层基础设施：

```text
PostgreSQL     durable business state
Redis          ephemeral realtime/presence/lease
Media Storage  original media / versions / exports
Worker/Queue   long-running jobs
```

任何层都不得绕过下层明确 owner 直接写另一领域的数据。

---

## 3. Work / Episode / Production：可选上层组织 + 独立项目工作区

`Production` 继续作为**单个项目的 canonical 工作区与业务聚合范围**；`Work` / `Episode` 纳入其上层，负责系列、剧集、栏目或多项目的组织与聚合管理，而不是复制项目数据。

目标层级：

```text
Work (optional top-level container)
├─ Episode (optional)
│  ├─ Production
│  └─ Production
├─ Production            # 允许不经过 Episode
└─ Episode
   └─ Production

Standalone Production    # 允许完全不使用 Work / Episode
```

建立项目时通过 Project Preset / Project Type 决定是否显示或启用 Work / Episode 能力：

- 广告、单支短片、简单分镜项目：可以直接创建 standalone Production，默认不暴露多集功能；
- 剧集、栏目、系列内容：可以先建 Work / Episode，再创建或挂接 Production；
- 已存在的多个 Production 可以后续归组到 Episode / Work，实现“多项目合并为剧集文件夹后统一管理”；
- **支持 Work 合并**：多个既有 Work 可以通过显式 Merge 操作合并到一个目标 Work；
- Work Merge 的本质是**重归属/聚合**：把源 Work 下的 Episode 与直接挂载的 Production 迁移到目标 Work，不复制 Production canonical 数据；
- 合并后源 Work 默认进入 archived/merged 状态并保留可追溯记录，不允许静默硬删除；
- 归组与 Work Merge 都不得物理复制、合并或改写各 Production 的 canonical 数据、Revision、History 和权限 owner；
- 上层容器允许提供跨 Production 的聚合查询、人员冲突、场次统计、资产汇总、排期概览和批量管理，但所有写操作仍进入目标 Production 的正常 Command 边界。

`Production` 内部继续拥有：

```text
Production
├─ Sequence
├─ Scene
├─ Shot
├─ Asset
├─ Person / Cast
├─ Location
├─ Equipment
├─ Task
├─ Schedule
├─ Review
└─ Deliverable
```

要求：

1. 新一级业务对象不得默认挂到 `Shot` 下。
2. 每个 Entity 必须有明确 owner、生命周期、权限、revision/并发策略。
3. 跨 Entity 的连接应由 typed relation/link table 表达。
4. Production 负责单项目 scope 和跨对象一致性边界，但不应成为存放任意业务 JSON 的万能表。
5. Work / Episode 是可选 container/aggregation scope，不成为第二套 Production 数据库。
6. 新实体进入系统前必须说明：
   - 为什么不能作为现有 Entity 的字段；
   - 是否需要单独查询/权限/生命周期；
   - 是否参与 Import/Export/History/Automation；
   - 与哪些 Entity 建立关系。

### 3.1 Work Merge 合同

固定层级继续保持：

```text
Work → Episode → Production
```

不增加任意嵌套 Collection/Folder。为了支持系列重组、项目归档整合和后期管理，Work 必须支持合并。

建议业务动作：

```text
MergeWorkCommand
source_work_ids[]
target_work_id
expected_revisions
conflict_decisions
```

合并流程：

```text
Preview
↓
权限 / Revision 检查
↓
检测 Episode / Production 冲突
↓
重归属到 target Work
↓
写 Audit / History / Outbox
↓
源 Work 标记 MERGED / ARCHIVED
↓
COMMIT
```

必须满足：

- 至少 2 个 Work 才允许进入 Merge；
- 目标 Work 必须明确指定，不能靠名称猜测；
- Episode 与 Production 保持原 ID，不创建复制品；
- Production 的 Revision、History、Asset、Review、Task、Schedule、权限 owner 不因 Work Merge 被重写；
- 若源 Work 中存在直接挂载 Production，可保持直接挂载到目标 Work，也可由用户在 Preview 中选择放入某 Episode，但不得自动猜；
- Episode 重名不等于同一 Episode，默认只重归属，不自动做 Episode Merge；
- 如未来需要 Episode Merge，应作为独立 Command/Preview，不隐含在 Work Merge 中；
- 跨 Work 的成员、权限、Preset、Provider 配置若存在冲突，必须在 Preview 中明确展示，禁止静默覆盖；
- 合并为原子事务；任一关键冲突未解决时不得产生半完成状态；
- 合并完成后，所有旧链接/引用若指向源 Work，应能解析到 merged state，并提供目标 Work 的可追溯跳转；
- 源 Work 默认保留 tombstone/merged record，用于 Audit、历史链接和恢复/排错，不进行即时硬删除；
- Work Merge 事件可触发索引、聚合视图、缓存和统计重算，但这些作为 Event Consumer 执行，不扩大主事务。

Work Merge 是“容器级重组”，不是“把多个 Production 变成一个 Production”。如果用户想把两个 Production 的 Shot/Scene/Asset 真正合并成一个项目，应走另一套显式 Project Merge/Import 流程，不能借 Work Merge 偷偷完成。

---

## 4. Core Domain 与扩展字段的边界

### 4.1 核心字段进入 Entity 模型的标准

只有满足以下至少一项的字段，才允许进入核心 ORM 模型：

- 跨绝大多数影视项目都具有稳定语义；
- 需要强约束/FK/索引；
- 需要参与 Command、权限、Revision、业务规则；
- 需要被大量查询、排序、过滤；
- 其值不是仅对某个客户/项目有效的临时业务属性。

例如 `Shot.duration_frames`、`Shot.primary_method` 属于核心；Shot 与 Scene 的归属由 `SceneShot` typed relation 表达，不再以单一 `Shot.scene_id` 作为长期目标。 “客户 SKU”“无人机许可编号”“服装备注2”默认不属于核心。

### 4.2 禁止 Shot 无限膨胀

禁止通过不断新增 Shot 列满足项目差异。新增属性优先级：

```text
已有 canonical field
→ preset field
→ custom field
→ 新 Entity / Relation
→ 最后才考虑新的 canonical field
```

---

## 5. Entity-scoped Field System

当前 Shot 自定义列能力必须扩展成“实体作用域字段系统”，但不做万能 EAV。

### 5.1 Field Definition

统一定义层应支持：

```text
ProjectFieldDefinition
├─ production_id
├─ scope
├─ key
├─ label
├─ field_type
├─ options
├─ required
├─ default_value
├─ class/origin
├─ binding
├─ schema_version
├─ lifecycle
└─ revision
```

`scope` 至少预留：

- shot
- scene
- sequence
- asset
- person
- location
- equipment
- task

未来可以新增 scope，但必须通过迁移和合同版本管理。

### 5.2 Value Ownership

不允许使用：

```text
entity_type + entity_id + field_id + value JSON
```

作为全系统万能值表。

优先采用 typed value ownership，例如：

```text
ShotFieldValue
SceneFieldValue
AssetFieldValue
TaskFieldValue
...
```

共用 Field Definition 和生命周期规则，但保留数据库 FK、约束、索引和明确 owner。

### 5.3 Derived Field

应支持只读计算字段，但使用安全 DSL，不允许执行用户 JavaScript/Python。

首批表达式能力可限于：

- `+` `-` `*` `/`
- IF
- ROUND
- COALESCE
- 比较
- 常量
- 同一实体字段引用
- 受控项目变量（例如 fps）

Derived Field 必须：

- deterministic；
- 无副作用；
- read-only；
- 不直接写持久业务值；
- 有 schema/version；
- 错误时显示明确失败状态，不静默返回错误值。

---

## 6. Typed Relation Layer

长期扩展的核心是“关系”，不是“更多字符串字段”。

### 6.1 必须一等建模的关系

示例：

```text
SceneShot
ShotCast
ShotLocation
ShotEquipment
ShotAsset
SceneLocation
CastAssignment
TaskAssignee
TaskAsset
TaskShot
TaskLocation
ProductionMember
```

Relation 可以带自己的业务属性。

### 6.1.1 Scene ↔ Shot 已确认采用 0..N 多对多

一个 Shot 可以：

- 暂时不属于任何 Scene；
- 属于一个 Scene；
- 同时归属于多个 Scene，例如回忆、交叉叙事、跨场景复用或其他明确叙事关系。

长期目标：

```text
SceneShot
├─ scene_id
├─ shot_id
├─ relation_type
├─ is_primary / role semantics
└─ order_index
```

要求：

- 不再把单一 nullable `shots.scene_id` 视为最终 cardinality；
- 同一 Shot 可有 0..N 个 Scene 关系；
- `order_index` 表示 Shot 在具体 Scene 内的顺序，不等同于 Shot 全局身份；
- `relation_type` / primary 语义必须使用稳定、版本化合同，不能用自由文本决定业务逻辑；
- 若一个 Shot 有“主要所属场景”，允许最多一个 primary；回忆/引用/跨场景等作为 additional relation；
- 删除 Scene 不得误删仍被其他 Scene 引用的 Shot；
- Import / Export / Saved View / Schedule 必须能够处理多 Scene Shot。

### 6.1.2 User / Person / Character 已确认彻底分离

三个概念不得再混用：

```text
User
= 登录账号 / authentication principal

Person
= 现实世界中的人
  导演 / 摄影 / 演员 / 客户 / 工作人员等

Character
= 作品中的叙事角色
```

演员关系：

```text
Character
    ↓ CastAssignment
Person
```

项目成员关系：

```text
Production
    ↓ ProductionMember
Person
    ↕ optional authenticated account link
User
```

要求：

- Person 可以存在而没有 User，例如未登录演员、场务、临时联系人；
- User 不等于演员/工作人员资料本身；
- 同一 Person 在同一或不同 Production 中可以拥有多个 project role / department；
- 同一 Person 可以通过 CastAssignment 扮演一个或多个 Character；
- Character 不承担登录、联系方式、可用时间等现实人员属性；
- ProductionMember 负责项目成员、角色、部门和权限上下文；
- 账号与 Person 的连接使用明确 typed identity link/字段，不通过姓名或邮箱字符串猜测；
- External Reviewer/Guest 仍由受限 authenticated principal + membership/policy 控制，不把 Character 或未登录 Person 冒充 User。

例如 Shot 需要演员时，优先关系应是 Shot ↔ Character / CastAssignment，再解析到具体 Person；工作人员则直接通过 ProductionMember / TaskAssignee / ScheduleItemPerson 等关系参与执行。

其他 Relation 同样可以带业务属性，例如：

```text
ShotCast
├─ shot_id
├─ character_id / cast_assignment_id
├─ required
└─ notes
```

### 6.2 禁止把关系降级成文本

以下模式只能用于临时导入/展示，不能成为长期 canonical owner：

```text
shot.actor = "张三"
shot.location = "天津文化中心"
shot.equipment = "300B"
```

如果系统需要回答：

- 某演员涉及哪些 Shot；
- 某场地在哪些拍摄日被使用；
- 某设备在哪些镜头冲突；
- 某 Asset 被哪些镜头/Review/Task 引用；

则必须建立真实 relation。

### 6.3 不做万能 Graph Table

不采用一个 `EntityRelation(source_type, target_type, payload_json)` 承担全部核心业务。

可以在非核心/实验能力中使用通用关系索引，但 authoritative domain relationship 优先 typed link tables。

---

## 7. ProductionStep、Task、Dependency 分离

### 7.1 ProductionStep

`ProductionStep` 的长期职责限定为：

> 一个 Shot 的制作工艺/生产步骤。

示例：

```text
Shoot → Edit → MG → VFX → Color
```

不得继续无限增加任务管理字段，把它演变成通用项目任务。

### 7.2 Task

新增独立 `Task` Domain，负责项目执行动作，例如：

- 场地确认；
- 演员到场；
- 灯光测试；
- 设备领取；
- 拍摄 Shot 集合；
- Company Move；
- 素材备份；
- 后期交付；
- 补拍/返工。

Task 应支持：

- owner/assignee；
- department；
- status；
- priority；
- estimated duration；
- actual duration；
- schedule window；
- related shots/scenes/assets/locations；
- lifecycle；
- revision；
- audit/history。

### 7.3 Dependency DAG

建立 `TaskDependency` 为一等 Domain。

第一阶段至少支持：

```text
finish_to_start
```

后续可扩展：

- start_to_start；
- finish_to_finish；
- lag/lead。

必须：

- 禁止形成非法环；
- 提供 dependency traversal；
- 支持“blocked / ready”派生状态；
- 自动推进必须通过正常 Command；
- 删除/归档 Task 时处理依赖闭包。

Task Dependency 将作为未来排期、知识库经验反馈、补拍/返工、自动推进的基础。

### 7.4 Schedule 是独立执行域，不写回 Shot 时间字段

拍摄排期、演职人员排期、转场、化妆、排练、旅行、准备、用餐、收工等统一建模为“时间区间 + 业务对象 + 资源约束”，不在 Shot 上直接增加 `shoot_date/start_time` 之类字段。

建议目标模型：

```text
SchedulePlan
├─ DRAFT
├─ CURRENT   # 同一作用域最多一个当前正式方案
└─ ARCHIVED

ShootDay
└─ ScheduleItem
   ├─ SHOOT
   ├─ REHEARSAL
   ├─ MAKEUP
   ├─ FITTING
   ├─ TRAVEL
   ├─ COMPANY_MOVE
   ├─ PREP
   ├─ MEAL
   └─ WRAP
```

`ScheduleItem` 通过 typed relations 关联 Scene / Shot / Person / Location / Resource，而不是复制名称文本。一个 Shot 可以被多个 ScheduleItem 引用，以支持补拍、跨日、多 Unit 和多次调整。

人员可用性统一使用 `AvailabilityWindow`（AVAILABLE / UNAVAILABLE / TENTATIVE / UNKNOWN），演员、工作人员、化妆、排练、旅行不分别建立互不兼容的日历真相。

**Company Move 主要属于 ScheduleItem，而不是普通 Task。** 如果转场本身需要责任人、确认、完成状态，可再关联一个 Task；时间轴上的转场时长仍由 Schedule owner 管理。可进一步拆分 strike/load/travel/unload/setup 等时长，但不得只存成备注文本。

### 7.5 Schedule Scenario 与 Constraint Scheduling

排期阶段允许多个方案共存，不使用项目内容版本或 Git 式版本替代 Schedule Scenario：

```text
Plan A (CURRENT)
Plan B (DRAFT)
Plan C (ARCHIVED)
```

排期引擎按独立实体局部计算，而不是维护一个“大排期 JSON”。基础输入至少包括：

```text
ScheduleItem.duration
Requires: People / Location / Resource
Constraints: Availability / Dependency / TimeWindow / LockedTime / DayNight / MoveTime
```

输出包括：

```text
start_at
end_at
conflicts[]
```

`conflicts`、`ready`、`blocked` 等应优先作为 Derived State；只有需要审计/确认/冻结的结果才进入持久业务记录。

---

## 8. Project Membership 与权限扩展

全局 `User → Role` 不足以表达真实剧组。

必须增加项目作用域，并以 Person 作为现实成员身份、User 作为可选登录身份：

```text
ProductionMember
├─ production_id
├─ person_id
├─ user_id?              # 有登录权限时关联；不是 Person 的替代品
├─ project_role(s)
├─ department(s)
├─ permission overrides
├─ status
└─ revision
```

要求同一个 Person / User 可以：

```text
项目 A = 摄影指导
项目 B = 导演
项目 C = 客户审片
```

一个 Person 在同一项目内也可以同时承担多个职务；权限与职责不得被压缩成单个全局 role。

权限计算至少考虑：

```text
System Permission
+
Production Membership
+
Resource Policy
```

权限命名使用稳定 action/resource，例如：

- shot.read / shot.edit
- asset.read / asset.upload / asset.download
- review.comment / review.decide
- export.run
- field.manage
- task.manage
- schedule.manage
- member.manage

外部 Reviewer/Guest 必须是受限 project principal，不得通过伪造普通内部用户解决。

---

## 9. Command Boundary

所有有业务含义的写入必须从“用户意图”进入 Command，而不是 UI 连续 PATCH 多个模块。

标准链：

```text
Request
↓
Authentication / Authorization
↓
Application Command
↓
Project/Entity Revision Check
↓
Domain Services
↓
Audit
History
Outbox
↓
One Atomic Transaction
↓
Authoritative Response
```

### 9.1 Command 必须满足

- 明确输入；
- 明确权限；
- 明确 revision/CAS；
- 明确 no-op；
- 明确事务边界；
- 明确 Audit；
- 明确 History（若属于用户可撤销业务操作）；
- 明确 Outbox events；
- 明确失败回滚；
- 不允许路由直接写 ORM；
- 不允许 UI 通过多次独立 API 请求拼出本应原子的业务动作。

### 9.2 No-op

真正 no-op 必须保证：

- revision 不变；
- updated_at 不变；
- Audit 不新增；
- History 不新增；
- Outbox 不新增。

---

## 10. Domain Event / Outbox

`OutboxEvent` 作为长期扩展总线基础。

标准：

```text
Command
↓
Domain Transaction
↓
Domain Event
↓
Outbox
↓
Post-commit Consumers
```

未来 Consumer 包括：

- Realtime；
- Automation；
- Job Worker；
- Search/Index；
- Knowledge feedback；
- Notification；
- External integration。

要求：

1. Consumer 不得成为原事务成功的前置条件，除非业务明确要求同步一致性。
2. Event 必须版本化。
3. Event payload 不应复制大量可变业务快照；使用稳定 IDs + 必要 immutable facts。
4. Consumer 必须支持 idempotency。
5. Outbox 发布失败必须可重试，不得丢事件。
6. 业务数据库值仍由 Domain owner 管理，Consumer 不可绕过 Command 随意修改另一 Domain。

---

## 11. Automation：Event → Rule → Command

自动化不得写成散落在 Service 的隐式 `if`。

统一模型：

```text
Domain Event
↓
Automation Rule
↓
Condition Evaluation
↓
Command
```

示例：

```text
ShotMethodChanged: live → vfx
↓
规则：确保 VFX ProductionStep 存在
↓
EnsureProductionStepCommand
```

或：

```text
TaskCompleted
↓
所有 predecessors 完成
↓
MarkDependentTaskReadyCommand
```

要求：

- 每次自动动作有来源 event/rule/command ID；
- Audit 可解释“为什么自动发生”；
- 规则失败不得半写；
- 默认不支持 arbitrary Python/JavaScript；
- 第一阶段规则配置使用受控 DSL/结构化条件；
- AI 只能提出 Rule/Command proposal，不能直接写 DB。

### 11.1 禁止用数据库 Trigger 承担业务自动化

PostgreSQL Trigger 仅用于数据库级 integrity / constraint / 必要审计辅助等窄职责。禁止 Trigger 因 Scene/Shot/Task 变化直接修改 Schedule、Person、Call Sheet 或其他 Domain。

跨域业务联动必须保持可解释链路：

```text
Domain Event
→ Automation Rule
→ Command
→ Audit / History / Outbox
```

### 11.2 Change / Impact 是自动化的解释层

对会产生连锁影响的高价值操作，允许建立独立 Change/Impact read model 或持久影响记录，用于回答“这次修改影响了什么”。例如 Scene 日期变化可能产生：

```text
CAST_SCHEDULE
CREW_SCHEDULE
RESOURCE
COMPANY_MOVE
CALL_SHEET
POST_TASK
```

影响状态至少预留：

```text
AUTO_APPLIED
CONFLICT
LOCKED
REQUIRES_USER
```

Change/Impact 不取代 Audit 或 Domain Event；它是面向用户的影响解释和冲突处理层。能够从 Event/Command 推导的普通影响不必永久复制全部 old/new payload，只有需要审计、确认、冻结或异步处理的影响才持久化。

---

## 12. Import 最大化扩展方案

### 12.1 不保存模板

明确禁止产品路线：

- 客户 A 模板；
- 导演模板；
- Import Recipe；
- 用户维护长期映射模板。

每次导入重新根据当前文件分析。

### 12.2 Provider 架构

Import 解析层应逐步收敛为 Provider：

```text
XlsxImportProvider
CsvImportProvider
DocxImportProvider
PdfImportProvider
ImageImportProvider
LegacyProjectImportProvider
```

共同能力：

```text
probe()
parse()
extract_assets()
normalize()
```

统一输出中间模型，不让后续 Merge 逻辑依赖具体文件格式。

### 12.3 智能分析链

```text
Document Parser
↓
Structure Detector
↓
Header Detector
↓
Column Fingerprinter
↓
Semantic Matcher
↓
Semantic Column Grouper
↓
Merge Planner
↓
Existing Entity Matcher
↓
Conflict Detector
↓
Preview
↓
Explicit Confirm
↓
Import Command
```

### 12.4 模糊识别

识别应综合：

- canonical/alias exact match；
- normalized match；
- token similarity；
- substring；
- edit distance；
- 列数据分布；
- 邻接列；
- 多行表头；
- 枚举命中率；
- 数值/时间码/帧数/焦段模式。

按置信度分层：

```text
高置信度 → 自动映射
中置信度 → 自动映射 + Preview 警示
低置信度 → 不强猜，Custom Field / 用户确认
```

### 12.5 自动合并列

一个 canonical field 必须允许多个 source columns。

策略按字段类型定义：

- text：去重 + merge_nonempty；
- enum：一致则自动，不一致 conflict；
- number：一致/空值安全合并，不一致 conflict；
- production method：允许推导 primary + secondary methods；
- relation：解析到实体候选，低置信度必须确认。

### 12.6 Import 不覆盖已有项目数据

针对已有项目再次导入，Preview 至少分类：

- CREATE
- MERGE
- UNCHANGED
- CONFLICT
- AMBIGUOUS

安全规则：

- 当前为空、导入非空：可 safe merge；
- 两边相同：unchanged；
- 两边不同：conflict；
- 模糊匹配 existing entity 只能建议，不静默覆盖。

### 12.7 Provenance / Lineage

不保存“模板”，但必须保存来源追踪：

```text
ImportSession
source_hash
source_filename
source_sheet/page
source_row
source_column
detected_semantics
mapping decision
merge decision
```

对于可追踪字段/实体，应能够回答“这个值来自哪次导入的哪一行/列”。

Provenance 用于：

- 二次导入可靠匹配；
- 冲突解释；
- 审计；
- Import regression。

### 12.8 Preview 与 Commit 分离

原则：

```text
Preview = 理解与计划
Commit  = 执行已确认计划
```

Commit 不允许重新做一套不同推断。

Import Session 可以 TTL 暂存解析结果，但不是长期用户模板。

---

## 13. Export / Deliverables Provider

当前多种格式最终应统一成 Provider 接口，而不是无限增长单一路由/Service。

目标：

```text
CSVProvider
ExcelProvider
DOCXProvider
PDFProvider
EDLProvider
OTIOProvider
SRTProvider
FCPXMLProvider
...
```

Provider 至少声明：

- provider/version；
- supported scopes；
- selectable fields；
- required protocol fields；
- render/validate；
- media capability；
- preview capability。

### 13.1 Deliverable Profile

从“仅字段模板”升级为完整 Deliverable Profile：

- format/provider；
- selected fields；
- field order；
- layout；
- paper/orientation；
- image size/quality；
- watermark；
- header/footer；
- internal-field visibility；
- filename rule；
- schema_version；
- revision。

Table layout 与 Export profile 必须继续解耦。

---

## 14. Media / Storage Adapter

Domain 不应依赖具体文件系统路径。

定义稳定 MediaStorage contract：

```text
put
get
stream
exists
delete
metadata
```

实现可以包括：

- Local/TrueNAS；
- S3；
- MinIO；
- 其他兼容对象存储。

业务层不得直接依赖某个具体 `Path` 作为长期合同。

### 14.1 Asset 独立性

Asset 不等于 Shot attachment。

一个 Asset 可被：

- 多个 Shot；
- Scene；
- Task；
- Review；
- Deliverable；

共同引用。

应继续保持：

```text
immutable original
→ AssetVersion
→ MediaPresentation
→ typed references
```

同一 `AssetVersion` 允许拥有多个物理 rendition/component，例如 master、preview/proxy、thumbnail；这些文件不是新的业务作品版本。Storage owner 负责 physical file/component，AssetVersion owner 负责业务版本身份。

Review comment/decision 若针对具体媒体修改，必须绑定明确的 AssetVersion / ShotVersion / presentation revision（按实际 Review owner 选择稳定对象），不能只挂到“当前 Shot”后随版本漂移。

物理 GC 只能在引用图、版本保留、retention 全部满足后执行。

---

## 15. AI / OCR / TTS / Search Provider

业务 Service 禁止直接绑定单一厂商 SDK。

至少预留：

```text
AIProvider
OCRProvider
TTSProvider
ImageGenerationProvider
AssetSearchProvider
```

业务能力用领域动作表达：

- SuggestShotBreakdown
- SuggestImportMapping
- EstimateShotDuration
- AnalyzeScript
- GenerateStoryboardProposal

AI 输出默认是 Proposal。

接受 Proposal 时仍进入正常 Command：

```text
AI Proposal
↓
Human/Policy Accept
↓
Command
↓
Revision / Audit / History
```

AI 不直接写 PostgreSQL。

---

## 16. Job / Worker 扩展接口

以下操作不应长期依赖一个 HTTP request 阻塞完成：

- 大型 Import；
- PDF/大文档；
- 大批量 Export；
- 视频代理；
- 缩略图；
- OCR 批处理；
- AI 分析；
- TTS；
- 项目打包；
- 搜索索引。

标准：

```text
Command / Request
↓
JobRequested Event
↓
Outbox
↓
Queue
↓
Worker
↓
Job Result Event
```

当前不强制绑定 Celery/RQ/SQS/RabbitMQ；Queue/Worker 必须有 adapter boundary。

Job 至少需要：

- id；
- type；
- owner/project；
- status；
- progress；
- idempotency；
- retry；
- failure reason；
- cancellation policy；
- output references。

---

## 17. Presence / Realtime

Presence 只保存 ephemeral state：

- user/session online state；
- current workspace；
- selected shot；
- focused field；
- cursor；
- soft lock/lease。

Redis 不保存 Shot 正文、Comment 正文、Project canonical data。

目标：

```text
Authenticated WebSocket
↓
Server derives identity
↓
Redis TTL
↓
Pub/Sub
↓
Multi-worker convergence
```

要求：

- 客户端不得声明可信 user_id/user_name；
- Redis 故障时业务编辑仍可通过 PostgreSQL revision/CAS 工作；
- Presence 属于 UX enhancement，不是唯一并发一致性保障。

---

## 18. Capability Registry：编译期模块化，不做运行时插件

需要稳定的 Capability Registry，描述模块提供什么能力，但**不建立任意第三方运行时代码插件系统**。

Capability 可声明：

- id；
- routes；
- navigation；
- permissions；
- commands；
- events；
- entity support；
- import/export providers；
- UI contributions；
- feature availability。

用途：

- 统一导航；
- 权限注册；
- feature discovery；
- 测试覆盖；
- 将来组织内部模块开关。

明确不做：

- 用户上传 Python/JS 插件；
- 任意动态执行第三方包；
- 未签名脚本；
- 运行时篡改 ORM schema。

---

## 19. UI Extension Slots

避免每新增模块就直接修改巨大 Sidebar/Inspector/Context Menu。

至少定义稳定贡献点：

```text
WorkspaceNavigationContribution
ShotInspectorSection
EntityInspectorSection
TableColumnProvider
ContextMenuContribution
ReviewPanelContribution
DeliverableContribution
```

要求：

- Contribution 只能调用公共 Command/Query，不直接绕过 Domain；
- Contribution 有稳定 id；
- 顺序/可见性可配置；
- 权限统一判定；
- 不允许每个模块复制一套 Modal/Dialog/Toast primitives。

---

### 19.1 前端状态必须分层

新增功能必须明确区分三类状态：

```text
Server Canonical State
= FastAPI/PostgreSQL 的业务事实

Draft UI State
= 拖拽中、选中项、未提交输入、临时面板状态等

Derived State
= Shot Ready? / Person Conflict? / Schedule Conflict? / Task Blocked? 等规则推导结果
```

Draft UI State 默认不进入业务数据库；Derived State 默认不让用户手动保存成另一套布尔真相。只有跨设备需要持久的用户布局/偏好，才进入已有 WorkspaceLayout/SavedView 等明确 presentation owner。

---

## 20. 持久配置统一 schema_version + Migrator

任何长期保存的 JSON 配置必须带 schema_version，并且集中迁移。

适用：

- SavedView.config；
- WorkspaceLayout.config；
- DeliverableProfile.config；
- AutomationRule.config；
- Import Session/Plan（若跨版本保留）；
- AI/Provider settings；
- Capability config。

读取过程：

```text
load
↓
detect schema_version
↓
step migration
↓
normalize
↓
current schema
```

禁止把十几代兼容 `if oldConfig...` 分散在 React 组件中。

---

## 21. Contracts 与 packages 边界

继续保持根 `packages/` 封闭集合：

```text
packages/ui
packages/types
packages/contracts
packages/timecode
```

不得因为新增 Domain 就创建：

```text
packages/review
packages/assets
packages/task
packages/schedule
packages/common
packages/core
packages/shared
packages/utils
```

推荐组织：

```text
apps/api/app/domains/*
apps/api/app/application/*
apps/api/app/infrastructure/*
apps/web/features/*
```

`@frameforge/contracts` 负责真正稳定的跨 runtime 合同，例如：

- Command contract；
- Event contract；
- Import/Export intermediate contract；
- revision vector；
- capability descriptors；
- stable IDs/types。

---

## 22. Query / Read Model

扩展性不仅是写入。

当 Task、Schedule、Relation、Asset 增长后，不允许前端通过几十个 API 拼装复杂视图。

应允许针对真实工作流建立 read model/query service，例如：

- ShootingDayOverview；
- CastAvailabilityView；
- EquipmentConflictView；
- ShotProductionStatusView；
- ReviewQueueView。

Read model 可以派生/缓存，但 canonical business truth 仍属于 Domain tables。

### 22.1 Call Sheet：Draft Projection + Published Revision

Call Sheet 不作为独立事实孤岛。

Draft 状态实时投影：

```text
ShootDay
+ Schedule
+ Cast/Crew
+ Location
+ Call Time
→ CallSheetView
```

发布后必须冻结为显式 revision/snapshot，以保证历史通告不随当前项目事实变化：

```text
CallSheetRevision
├─ revision
├─ published_at
├─ published_by
├─ source revisions
└─ immutable snapshot / resolved references
```

修订后生成新 revision，旧发布版继续可追溯。Snapshot 只用于“发布历史不可变”这一需求，不能反过来成为 Scene/Person/Location 的新 canonical owner。

---

## 23. 搜索与索引扩展

未来全文搜索、素材搜索、项目级快速检索应作为 Consumer/Index 层，不直接成为 canonical owner。

最低要求：

```text
Domain Event
↓
Search Index Consumer
↓
Index
```

索引丢失必须能够从 PostgreSQL/Storage 重建。

---

## 24. 可观测性与可解释性

最大化扩展必须同时最大化故障可解释性。

新增 Command/Job/Automation/Provider 时必须能追踪：

```text
request_id
command_id
event_id
job_id
user/project
entity ids
revision
provider
duration
result/failure
```

不能在日志中写敏感凭据或完整私密媒体正文。

---

## 25. 扩展功能准入合同

任何新 Domain/模块在合并前，必须回答：

1. canonical owner 是谁？
2. 是 Entity、Field、Relation、Workflow 还是 Presentation？
3. 为什么现有 Domain 不能承载？
4. Command 是什么？
5. Query 是什么？
6. Revision/CAS 怎么处理？
7. Audit/History 是否需要？
8. Event 是什么？
9. 权限是什么？
10. Import/Export 是否需要支持？
11. 配置是否有 schema_version？
12. 是否需要 Worker/Job？
13. UI Contribution 挂在哪个 slot？
14. Legacy 是否只是参考，还是错误地重新成为 runtime dependency？
15. 失败时是否会留下半写状态？

如果回答不清楚，不允许通过“先加字段/先加页面以后再整理”的方式进入 canonical VNext。

### 25.1 已确认的四个高影响产品决定（2026-10-04）

以下已由产品确认，后续设计不得再按“待确认”处理：

1. **Scene ↔ Shot：采用 typed many-to-many。** 一个 Shot 允许归属于多个 Scene，例如回忆、跨场景或其他叙事关系；目标为 `SceneShot` 关系，支持 0..N Scene，并定义 relation_type / primary / order 的稳定语义。
2. **User / Person / Character：彻底分开。** User=登录身份，Person=现实中的人，Character=叙事角色；`CastAssignment` 连接 Character ↔ Person；`ProductionMember` 负责 Person 在项目中的职责与权限，并可选关联 User。
3. **Work / Episode：纳入 Production 上层，并支持 Work Merge。** 固定层级为 `Work → Episode → Production`，不增加任意嵌套 Collection/Folder；简单项目可通过创建预设隐藏/跳过，剧集/系列项目可启用。已有多个 Production 可以后续归组到 Episode / Work；多个 Work 也可以通过显式 Merge 合并到目标 Work。Work Merge 只做容器级重归属/聚合，不复制或物理合并 Production canonical 数据。
4. **Take：当前不实现，只保留扩展 seam。** 当前产品聚焦前期制作，以及拍摄中期的分镜查看、人员/场次调度。现在不新建 Take ORM/table/API/UI 空壳；未来进入现场场记、多机位实拍、Take 圈选、Take→Media 链路时，再按独立 Domain 正式引入。

### 25.2 Take 的未来扩展合同

为了避免当前实现阻断未来 Take，现阶段只要求：

- Shot/Asset/Media 的关系不要假定“一个 Shot 只能有一个拍摄实例”；
- Asset/Media typed reference 应能未来增加 `Take` target，而不需要破坏既有 AssetVersion；
- ScheduleItem 可关联 Shot，但不得冒充未来 Take；
- 不为未知需求预建无消费者字段、表或页面；
- 当现场场记成为真实 consumer 时，再定义 `Take` 的 identity、camera/unit、roll/clip、circled/NG、timecode、media links、revision 和 review 边界。

---

## 26. 明确禁止的伪扩展性

长期禁止默认采用：

- 万能 Entity 表；
- 万能 EAV value 表；
- 所有业务数据 JSON 化；
- 一个万能 Relation graph table 承担全部权威业务；
- 万能 workflow engine；
- arbitrary Python/JavaScript automation；
- 运行时第三方代码插件；
- 每个 feature 新建 npm package；
- Service 之间随意直接改对方 ORM；
- AI 直接写数据库；
- Import 静默覆盖已有非空 canonical 数据；
- UI 连续多 PATCH 伪装成一个原子业务动作。

核心原则：

> **Strong Core + Explicit Extension Points，而不是 Everything Dynamic。**

---

## 27. 实施优先级

### Phase A — 扩展合同先行

1. 固化本文；
2. 定义 Entity/Relation/Command/Event/Provider naming；
3. 规定所有新持久 JSON 的 schema_version；
4. 建 Capability Registry 最小合同；
5. 定义 Project Membership/Permission contract。

### Phase B — 关键 Domain 扩展

1. Entity-scoped Field Definition；
2. Typed Relations；
3. Task；
4. TaskDependency；
5. ProductionMember；
6. ProductionStep 与 Task 边界收口。

### Phase C — 数据入口/出口

1. Import Provider；
2. 模糊识别；
3. 自动合并；
4. Provenance；
5. Existing Entity Match；
6. Deliverable Profile；
7. Export Provider。

### Phase D — 基础设施 Adapter

1. MediaStorage；
2. Queue/Job；
3. AI/OCR/TTS Providers；
4. Redis Presence；
5. Search Index Consumer。

### Phase E — Automation / Knowledge

1. Event → Rule → Command；
2. 实际耗时反馈；
3. 估时经验；
4. 依赖自动推进；
5. AI Proposal；
6. 用户可解释的自动化历史。

每个 Phase 可以并行局部开发，但不得跳过 owner/contract 定义直接制造第二套实现。

---

## 28. 真实场景验收

扩展性不能只通过单元测试证明。至少需要以下场景。

### 28.1 商业广告

- 100+ Shots；
- 多制作方式；
- 客户 Excel Import；
- 摄影/导演/制片不同 Saved View；
- VFX/后期步骤；
- 客户 Review；
- 多格式 Deliverable。

### 28.2 剧情短片 / 拍摄中期现场

- Scene/Location/Cast；
- 一个 Shot 同时属于多个 Scene（例如回忆）并保持各 Scene 内顺序正确；
- Shot/Panel；
- 场地与演员关系；
- Person / Character / User 身份不串线；
- Task/Dependency；
- Shooting day；
- 人员可用性、人员/场次调度；
- 手机上/现场端快速查看当前 Scene/Shot 分镜与人员信息；
- 不依赖 Take 模块也能完成当前前期和拍摄中期工作；
- Review/version；
- EDL/OTIO。

### 28.2.1 Work / Episode 聚合管理

验收至少覆盖：

- 创建 standalone Production 时完全不要求填写 Work / Episode；
- 通过系列/剧集预设创建 Work → Episode → Production；
- 将多个既有 Production 后续归组到同一个 Episode / Work；
- 将 Work A + Work B 合并到 Work C，并保持所有 Episode / Production 原 ID；
- Work Merge 前可 Preview Episode 重名、直接挂载 Production、权限/配置冲突；
- 未解决冲突时 Merge 不产生半完成状态；
- Merge 后源 Work 进入 merged/archived，可从历史链接追溯到目标 Work；
- Episode 同名默认不自动合并；
- 上层聚合查看跨项目人员、场次、资产和进度；
- 归组/Work Merge 不修改子 Production 的 Shot ID、Revision、History、媒体引用或内部权限 owner；
- 从 Episode / Work 发起批量操作时，最终写入仍逐个经过目标 Production 的权限与 Command 边界。

### 28.3 二次 Import

同一 Excel 修改后再次导入：

- 正确识别来源；
- 自动合并安全字段；
- 非空冲突不静默覆盖；
- 未变化不制造 revision/audit/history。

### 28.4 新 Domain 插入测试

模拟新增 `Equipment` 或 `Cast`：

要求不修改核心 Shot 表即可实现：

- Entity；
- Relation；
- Custom Fields；
- permissions；
- import；
- saved/query view；
- task/schedule relation；
- export；
- audit/event。

若为了新增该 Domain 必须大改 ShotService/Shot schema/UI shell，则扩展合同失败。

---

## 29. Legacy 边界

继续执行 Clean Break：

```text
Legacy database       不迁
Legacy API            不兼容
Legacy session        不兼容
Legacy runtime        最终退出
```

唯一桥：

```text
Legacy portable export
↓
versioned file contract
↓
VNext Import Provider
↓
new canonical project
```

不得为了扩展性重新引入 Legacy runtime adapter 作为长期 Domain 依赖。

---

## 30. 完成定义

本需求不是要求一次实现全部能力。

“最大化扩展性基础完成”至少意味着：

- Work / Episode 可以作为可选上层容器组织多个 Production，而 standalone Production 不受影响；
- 多个 Work 可以通过显式 Work Merge 重组到目标 Work，且不会复制或合并子 Production 的 canonical 数据；
- 一个 Shot 可以通过 SceneShot 关系稳定归属 0..N 个 Scene；
- User / Person / Character 身份与职责边界彻底分离；
- 当前不实现 Take，但未来加入 Take 不需要推翻 Shot / Asset / Media 核心；
- 新业务实体无需修改 Shot 核心即可加入；
- Custom Field 可以按 Entity scope 扩展；
- 核心跨实体关系使用 typed relations；
- ProductionStep 与 Task 分离；
- Task Dependency 可建立 DAG；
- Project Membership/Permission 可按项目变化；
- 写入走 Command / Revision / Audit / History / Outbox；
- Event consumer 可新增而不修改核心事务；
- Import 每次智能识别、无模板、可追踪 provenance；
- Import/Export/Storage/AI/Queue 有明确 Provider/Adapter boundary；
- 持久 JSON 全部版本化迁移；
- UI 通过稳定 Contribution slots 扩展；
- `packages/*` 不无限增长；
- Legacy 不重新成为 runtime dependency；
- 新模块可以通过既定准入合同接入，而不是依赖临时特殊分支。

最终架构原则：

> **FrameForge 的扩展应优先表现为“新增 Entity / Relation / Command / Consumer / Provider”，而不是“给 Shot 加字段、给页面加 if、给 Service 加例外”。**
