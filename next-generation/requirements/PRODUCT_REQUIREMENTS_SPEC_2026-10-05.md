# FrameForge 产品需求说明书（PRD）

版本：0.1  
日期：2026-10-05  
状态：下一代产品规划文档，尚未实施  
适用分支：`docs/next-generation-plan`

> 本文件为**新增汇总文档**，不替代、覆盖或修改仓库内任何现有需求文件。现有已确认合同仍以 `CONFIRMED_REQUIREMENTS.md`、`requirements/PERMISSION_RULES_2026-10-05.md`、`requirements/USER_TEAM_AGENCY_RULES_2026-10-05.md`、`requirements/ROLE_WORKFLOW_REQUIREMENTS_2026-10-03.md`、知识库与资源时间需求等原文件为准。出现冲突时，以用户最新明确要求和对应权威文件为准。

## 1. 产品定位

FrameForge 是面向影视、广告、短片、纪录片、访谈、AE/MG、三维等制作流程的**制作规划与协作系统**。目标不是复制传统制片软件，而是把“创作对象、任务、人员、排期、通告、素材、审阅、交付与经验校准”建立在同一套可追溯数据关系上。

核心价值：

1. **单一事实来源**：Scene、Shot、Task、Person、Schedule、Asset、Review、Delivery 等对象只维护一个权威事实，不因页面或岗位重复保存。
2. **分镜与制作执行贯通**：分镜不只用于展示，还可进入任务、排期、资源需求、通告、实际记录、返工和交付链路。
3. **影视专业对象优先**：明确区分账号 User、现实人员 Person、剧情角色 Character、岗位任职、技能、项目权限。
4. **面向真实协作**：项目成员可查看项目，但编辑权按管理身份、项目授权和本人被分配工作决定；岗位名称本身不授予权限。
5. **经验反馈闭环**：实际执行数据可形成去标识、可追溯的时间经验，用于后续计划校准，而不是把 AI 回答直接变成知识事实。
6. **从零构建下一代**：不迁入旧代码、旧 UI、旧数据库、旧素材与旧工程兼容链；旧系统仅作为历史参考。

## 2. 外部产品参考与取舍

### 2.1 Yamdu

参考点：

- 将剧本导入/拆解、拍摄排期、DOOD、通告、人员、地点、文件与项目日历串为同一生产数据链。
- 剧本拆解允许跨部门协作，并由项目数据自动驱动后续排期和通告。
- 权限可以限制到项目内特定区域，并提供按部门/职责使用的访问模板。
- 通告从排期与人员/地点数据生成，并支持定向发送、确认、提醒与水印。

FrameForge 取舍：

- 借鉴“**数据只录一次，后续模块引用**”和“**排期驱动通告**”。
- 不照搬部门权限模板作为最终权限事实；部门/岗位只是工作组织信息，真正授权仍由统一权限模型决定。
- 不纳入当前已明确取消的预算、工资、库存、采购、通用库房能力。

参考：
- https://www.yamdu.com/
- https://yamdu.com/en/lp/script-breakdown/
- https://yamdu.com/en/lp/call-sheets/
- https://support.yamdu.com/en/articles/34644-managing-access-rights
- https://support.yamdu.com/en/articles/502787-crew-access-management

### 2.2 StudioBinder

参考点：

- Account 层区分 Admin / Member；Member 只进入被分配的项目。
- Project 层再分配具体成员。
- Collaborator 可仅针对具体页面获得 view / comment / edit，而不获得整个项目。
- 通告从排期、人员、地点、天气等数据自动填充，并可个性化展示接收者需要的信息。

FrameForge 取舍：

- 借鉴“**组织/账号 → 项目 → 页面或对象分享**”的多层协作范围。
- FrameForge 需要比 Admin/Member 更细：Team Admin、Agency Admin、Project Member、Assigned Work、外部受权链接分别建模。
- 外部分享必须是显式 Scope + Action 授权，不能因知道链接而自动获得其他项目数据。

参考：
- https://support.studiobinder.com/en/articles/8609670-how-to-adjust-teammate-permissions
- https://support.studiobinder.com/en/articles/7183737-how-to-assign-a-teammate-to-a-project
- https://support.studiobinder.com/en/articles/8895767-plans-for-collaboration
- https://www.studiobinder.com/call-sheet-production/

## 3. 产品边界

### 3.1 本代目标范围

- 账号、个人能力、Team、Agency、项目成员与统一权限
- Work / Episode / Production 组织
- 项目大厅与项目元数据
- 剧本导入、拆解与场景结构
- Scene / Shot / Storyboard / Shot Detail
- Scene–Shot 多对多与动态需求继承
- 人员、演员、剧情角色、选角、项目岗位任职
- Task、任务依赖、工作流模板、交接和实际记录
- 人员档期、拍摄排期、Company Move、Production Calendar
- 资源时间段需求
- Call Sheet / 个人通告 / 发布、确认、提醒
- Asset / Media / 版本 / 构图 / 素材交接
- Review / Comment / Approval / Rework
- Delivery / Export / Share
- 项目版本、镜头比较、命令历史、撤销重做
- Knowledge Library、器材资料、专业知识、经验时间校准
- AI 辅助建议，但始终由用户确认进入标准命令

### 3.2 明确不做

- 旧系统数据自动迁移
- 旧 API 兼容
- 旧 UI / 旧素材 / 旧模板继承
- 预算、报价、工资、财务
- 采购合同
- 通用库房、库存、预留、领用
- 复杂耗材管理
- 把器材知识做成使用教程/SOP
- 用导演、制片、摄影等岗位名称直接推导系统管理权限
- AI 直接绕过权限修改业务事实

## 4. 核心用户与使用情境

| 用户类型 | 核心目标 |
| --- | --- |
| 个人创作者 | 建立个人项目、维护个人能力、规划分镜、任务、排期和交付 |
| 普通团队成员 | 查看自己参与的完整项目，执行和更新本人被分配的工作 |
| 导演/摄影/灯光/后期等项目人员 | 从同一数据源获得符合自身工作的视图，不复制项目事实 |
| 团队管理员 | 管理团队成员、团队项目、项目人员与工作安排 |
| Agency 管理员 | 管理所属团队及其项目、指派团队管理员 |
| 制片/统筹 | 组织场景、人员、任务、排期、转场、通告、实际与交接 |
| 外部协作者/客户 | 在明确授权范围内查看、批注或执行有限动作 |
| 系统管理/知识维护人员 | 维护公共知识定义、岗位目录和受控知识修订，不默认获得全部业务项目正文 |

## 5. 核心对象模型

### 5.1 组织与身份

`User`、`PersonalCapability`、`Team`、`Agency`、`Membership`、`ProjectMembership`、`RoleAssignment`、`PermissionBinding`

原则：

- User ≠ Person ≠ Character。
- Skill/Job ≠ Permission。
- Work/Episode 只组织 Production，不传递权限。
- 项目必须具有唯一归属。
- 一个账号在不同 Team/Project 中可有不同权限范围。

### 5.2 创作对象

`Work → Episode → Production`

Production 内主要包含：

`Script`、`Scene`、`Shot`、`Storyboard Panel`、`Character`、`Casting`、`Person`、`Asset`、`Board`、`Review`、`Delivery`

Scene 与 Shot 为多对多；Shot 最多有一个主 Scene，但可关联多个 Scene。

### 5.3 执行对象

`Task`、`TaskDependency`、`WorkflowTemplateVersion`、`Assignment`、`ScheduleItem`、`Move`、`CallSheet`、`Actual`、`Handoff`

原则：

- 每个 Task 一名主责，可有多个协作人。
- “需要什么”与“实际已安排/已使用/已完成”分开。
- 计划、预测、实际和实际更正分开。
- 已发布通告与已发生 Actual 不随后续预测自动改写。

## 6. 核心业务流程

### 6.1 项目建立

1. 创建个人或团队 Production。
2. 配置项目类型、画幅、帧率、时区、项目成员。
3. 可选绑定 Work / Episode。
4. 选择需要的业务模块，不因未使用功能制造空页面。
5. 初始化 9 个 Built-in Shot 列；Preset 按项目需要添加。

### 6.2 剧本 → Scene → Shot

1. 导入或创建剧本。
2. 识别 Scene、Character、地点等候选。
3. 人工确认后进入正式对象。
4. Scene 拆出 Shot；Shot 可跨 Scene 关联。
5. Storyboard / Shot Table / Timeline 读取同一 Shot 数据。
6. Scene 需求动态继承到 Shot，允许逐项增补、排除、替换、恢复继承。

### 6.3 Shot → Task → Schedule

1. Shot 的制作方式与实际执行 Task 分开。
2. 工作流模板生成版本固定的任务链。
3. 管理者分配主责/协作。
4. 依赖决定可开始/受阻，不允许循环。
5. Task/Scene/人员档期进入排期。
6. Company Move 作为独立排期对象，不靠备注模拟。

### 6.4 Schedule → Call Sheet

1. 选定拍摄日和已排 Scene/Shot。
2. 自动汇总人员、地点、时间、Move、必要资源与安全/备注数据。
3. 生成 Draft。
4. 有权用户审阅并 Publish。
5. 根据接收者权限生成个人化投影。
6. 记录发送、确认、提醒与版本，不用“按钮变色”冒充已送达。

### 6.5 Asset → Review → Rework → Delivery

1. Task 提交固定素材版本。
2. Review 必须引用具体版本。
3. 返工保留原执行与意见历史。
4. 上游固定输入变化时，相关下游标记输入过期。
5. Delivery 只输出本次授权范围与字段选择的交集。

### 6.6 Actual → Knowledge Calibration

1. 优先读取 Task / Schedule / Move / Post 已确认 Actual。
2. Actual 不足时才询问粗粒度时长。
3. Experience 固定来源版本和采集时权限范围。
4. 同一执行事实去重。
5. 达到去标识门槛后生成统计。
6. Estimate 只给建议，不直接改项目计划。

## 7. 功能需求

### FR-01 项目与组织

- 支持个人项目、团队项目。
- 支持项目唯一归属。
- 团队每队最多 200 名正式成员。
- Team Admin 唯一；独立 Team Admin 可移交。
- Agency Admin 为固定最高管理账号；Agency 内 Team Admin 由 Agency Admin 指派。
- 项目从个人转入 Team 必须由目标 Team Admin 接收。

### FR-02 项目大厅

- 默认仅展示用户有权查看的项目。
- “查看全部”可展示同 Team 未参与项目的受限摘要，但不可进入正文。
- 卡片数据必须来自项目事实，不为大厅复制业务值。
- 未参与项目摘要字段由权限规划单独控制。

### FR-03 Scene / Shot / Storyboard

- Scene 与 Shot 多对多。
- Shot 支持项目顺序与 Scene 内顺序。
- 支持 Shot Table、Storyboard、Timeline 等多视图。
- 共享视图同步显示、顺序、宽度、行高、筛选、排序、分组。
- 个人选择、光标、草稿和滚动不共享。
- Built-in / Preset / Custom 三类列遵循既有列合同。

### FR-04 人员、剧情角色与任职

- Person 可无登录账号。
- 同名 Person 不自动合并。
- Character 不等于 Person。
- Casting 候选与确定状态分开。
- 一人可多岗，一岗可多人。
- 项目任职不自动授予系统权限。

### FR-05 Task 与工作流

- 每任务一主责、多协作。
- 工作流模板发布后固定版本。
- 依赖拒绝自身、重复、跨项目与循环。
- 任务开始前检查前置依赖和必需输入。
- 提交产物固定素材版本。
- 跳过需权限与理由。
- 返工不抹除已经发生的执行。

### FR-06 排期

- 支持人员档期、Scene/Task/Shoot 排期、Company Move。
- 冲突依据明确共享身份，不按姓名猜测。
- 自动联动只更新未来可调整计划。
- 已发生 Actual 和已发布 Call Sheet 不被预测改写。
- 默认项目时区为北京时间，可显式配置。

### FR-07 资源时间需求

- 汇总“什么时候需要什么”，不建设库存。
- 同时段独立需求相加；显式共用只算一次。
- 缺型号、数量或排期必须显示未知，不猜。
- 器材知识中的兼容不代表项目实际拥有设备或转接件。

### FR-08 Call Sheet

- 从当前排期、人员、地点、Scene/Shot、Move 等事实生成。
- Draft 与 Published 分开。
- 支持模板、预览、版本、发布记录。
- 支持个人 call time 与按接收者裁剪的信息。
- 支持确认与提醒状态。
- 支持按授权范围输出附件、地图/地点、安全信息和必要联系方式。
- 发布后修订形成新版本，不静默改写旧版。

### FR-09 Asset / Media / Review

- 原文件与显示构图/裁剪元数据分开。
- Review 引用具体 AssetVersion。
- Comment、Approval、ReviewDecision 独立于创作内容版本。
- 无权限时，媒体预览、下载、历史、搜索同样拒绝。

### FR-10 版本与历史

- 项目级创作提交 + 镜头级比较。
- 内容版本、任务执行、审阅、授权、排期历史分开。
- 可撤销命令进入统一 command history。
- 永久删除不可撤销。
- 旧版本、缓存、导入或迟到异步结果不得复活已 Purge 数据。

### FR-11 Knowledge Library

- 影视基础知识、岗位知识、器材型号参考、兼容关系、软件能力范围与经验时间统计分别建模。
- 公共知识保留来源、核验、处理方式和修订。
- AI 内容先进入候选区，不得自证。
- 项目事实不复制到知识正文。
- 原始经验受项目权限保护，团队仅获得满足门槛的去标识汇总。

### FR-12 导入、导出与分享

- 支持 Excel/PDF/OCR 等导入的 preview → mapping → commit。
- 导入不靠中文相似名称猜成 Built-in。
- 导出对象 = 当前授权对象 ∩ 本次选择。
- 导出字段 = 活动字段 ∩ 字段权限 ∩ 本次选择 ∩ 分享限制。
- PDF/Word/XLSX/CSV/工程包等必须复用同一服务端投影规则。
- 分享链接必须有明确对象范围、动作、有效期与撤销能力。

### FR-13 AI

- 默认关闭或显式启用。
- Provider 输出只能形成 Candidate / Proposal。
- 用户确认后通过标准业务命令写入。
- AI 使用与人工操作完全相同的权限、revision、审计和删除规则。
- 不因 AI 便利建立第二套写入路径。

## 8. 权限需求摘要

权限的最终细则见新增的《FrameForge 权限实施规划》及现有 `PERMISSION_RULES_2026-10-05.md`。

硬原则：

- 权限来自身份与关系，不来自影视岗位名称。
- Team/Agency 管理范围与 Project Membership 分开。
- Project Member 默认可查看完整参与项目，但只编辑被授权的工作。
- View、Comment、Edit、Assign、Approve、Publish、Export、Download、Share、Delete、Purge、Manage Settings 分开授权。
- Contact/私人信息单独控制。
- 未参与项目的“列表可见”不等于项目正文可见。
- 所有 API、搜索、计数、媒体、历史、导出与实时连接使用同一权限判定。

## 9. 数据一致性与并发

- 所有正式写入必须经服务端 ACK 后显示已保存。
- 写请求使用 expected revision / CAS。
- 409 冲突保留用户草稿。
- no-op 不产生虚假 revision、history、outbox。
- 一次业务动作使用单事务。
- 后台 Job 必须保存提交时的权限/输入版本，并在发布结果前再次验证有效性。
- Presence / Cursor / Selection / Lease 为临时状态，不写入持久业务事实。

## 10. UX 原则

1. **Read-first**：先看清楚项目事实，再进入编辑。
2. **Context-aware**：Hub 与 Project 内工具栏不同，不展示无上下文动作。
3. **Progressive complexity**：默认只显示当前项目需要的模块，高级能力在需要时出现。
4. **Role-aware view, not role-owned data**：岗位视图是查询和操作入口，不复制数据库。
5. **Draft ≠ Saved ≠ Published**：三个状态必须视觉和数据都不同。
6. **No false completion**：按钮、页面、接口存在都不能代表工作流完成。
7. **Mobile for execution**：移动端优先满足查看个人工作、通告、确认、现场信息；复杂结构编辑以桌面为主。

## 11. 非功能需求

### NFR-01 安全

- 最小权限。
- 敏感字段显式授权。
- 分享 token 可撤销、可到期、可限制动作。
- 权限撤销后旧下载/实时连接/后台任务重新校验。
- 不在日志、URL、文件名泄露不应展示的私人数据。

### NFR-02 审计

高风险动作必须记录 actor、scope、target、action、revision、time、reason（如适用）：

- 成员/管理员变更
- 项目转移
- 权限/分享变更
- Call Sheet 发布
- Approval/Review 决策
- Export/Download 授权
- Delete/Purge
- 知识正式修订

### NFR-03 可扩展性

- 新模块不得创建第二套 User/Person/Project/Permission/History。
- 新业务对象进入系统前先确认唯一 owner、父子关系、权限边界和版本边界。
- 新共享包必须有真实跨应用消费者，不因“以后可能用”无限增长。

### NFR-04 可测试性

每个 P0 业务闭环必须有：

- 权限拒绝测试
- revision 冲突测试
- 事务回滚测试
- no-op 测试
- 多用户/重复请求测试
- 浏览器真实交互验证
- 导出/下载投影验证

## 12. 建议实施阶段

> 这是实施顺序建议，不表示仓库已有功能完成。

### Phase 0：基础

Identity、Team/Agency、Project Ownership、AuthZ、Revision、Command Receipt、Audit、Outbox、Job 基础。

### Phase 1：创作核心

Production、Scene、Shot、Storyboard、三类列、共享视图、Script Import/Breakdown。

### Phase 2：人员与工作

Person、Character、Casting、Project Role Assignment、Task、Dependency、Workflow Template。

### Phase 3：排期与通告

Availability、Schedule、Move、Resource Demand、Call Sheet、确认/提醒。

### Phase 4：素材与审阅

Asset/Version、Handoff、Review、Rework、Delivery、授权分享。

### Phase 5：知识与智能

Knowledge Reference、Equipment、Experience、Calibration、AI Candidate/Recommendation。

## 13. MVP 验收主链

至少完成一条真实闭环：

`创建 Production → 导入/创建 Scene → 建 Shot/Storyboard → 分配 Task → 排入 Shoot Day → 生成并发布 Call Sheet → 成员确认 → 记录 Actual → 提交固定 AssetVersion → Review/返工 → Delivery → Actual 进入受控经验统计`

同时验证：

- 普通成员只能修改本人授权工作；
- 未参与成员不能进入项目正文；
- Team/Agency Admin 按已确认范围管理；
- 外部分享只能访问明确 scope；
- 权限撤销后旧链接/下载/WS/Job 不继续生效；
- 所有关键步骤有 revision、audit 和可追溯版本。

## 14. 未决事项

以下仍以仓库既有未决项为准，不在本 PRD 中擅自确认：

- ACL-01：本人工作究竟落到 Task / Shot / Field 哪一级。
- ACL-02：显式 deny 与 Team/Agency 管理权冲突优先级。
- ACL-03：普通成员的下载、导出、分享、删除、恢复、共享视图和项目设置权限。
- ACL-04：未参与项目在“查看全部”中可看到的具体字段。
- ACL-05：离队与归档项目的重新授权模型。
- ACL-06：Project Membership 与 Team Membership 的增删联动。
- 跨 Team 整体转移和退回个人。
- Agency 解散后的过渡状态。
- 岗位目录停用/拆分后的历史引用迁移。
- 下一代原生工程文件格式。

这些事项在用户确认前只能做数据结构预留与测试设计，不能自动写成正式授权规则。
