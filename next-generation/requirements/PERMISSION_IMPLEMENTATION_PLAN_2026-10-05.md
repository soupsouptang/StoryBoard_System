# FrameForge 权限实施规划

版本：0.1  
日期：2026-10-05  
状态：下一代规划，未实施  
适用分支：`docs/next-generation-plan`

> 本文件是**新增实施规划**，不修改、不替代现有 `requirements/PERMISSION_RULES_2026-10-05.md`。现有权限规则中的“已确认”继续是业务合同；ACL-01—ACL-06 的“待确认”继续保持待确认。本文负责把现有合同整理为可落地的授权架构、动作目录、Scope、校验链与测试方案。

## 1. 目标

建立一套统一权限系统，使 FrameForge 的：

- 页面
- API
- 搜索
- 计数
- 媒体
- 历史
- 实时连接
- 导出
- 下载
- 分享
- 后台 Job
- AI 建议与接受

都使用同一个授权事实，避免“UI 隐藏了按钮但 API 仍可访问”或不同模块各自维护权限列表。

权限模型采用：

**Identity + Role Binding + Scope + Object Relation + Action + Context**

而不是仅靠一个全局角色名称。

## 2. 不变量

1. 影视岗位不是系统角色。Director、Producer、DP、Gaffer、Editor 等不自动授予权限。
2. Skill 不是权限。用户会某项技能，不等于能编辑相关模块。
3. Team Membership 不是全部 Team Project 访问权。
4. Project Membership 不是全部写权限。
5. Work / Episode 不传递权限。
6. Team Admin、Agency Admin 的已确认管理范围必须作为独立授权来源。
7. 私人联系信息、敏感人员字段与普通项目正文分开授权。
8. 所有授权必须可在服务器侧复现和审计。
9. 外部分享链接不是登录身份，不可扩散到链接 scope 之外。
10. 权限撤销后，缓存、WebSocket、旧下载和后台任务必须重新校验。

## 3. Principal

系统中的权限主体：

| Principal | 说明 |
| --- | --- |
| User | 登录账号 |
| Team Admin Binding | User 在某 Team 的唯一管理身份 |
| Agency Admin Binding | User 在某 Agency 的固定管理身份 |
| Project Membership | User 在某 Production 的成员身份 |
| Work Assignment | User 对某 Task/对象的主责或协作关系 |
| System Group Capability | 系统级知识维护等能力，不自动授予项目正文访问 |
| Share Grant | 面向外部或内部的受限授权凭据，不等同 User |

不建立“Knowledge Admin”作为独立影视/组织角色；知识维护通过系统权限/用户组能力表达。

## 4. Scope 层级

从大到小：

`SYSTEM`
→ `AGENCY:{id}`
→ `TEAM:{id}`
→ `PRODUCTION:{id}`
→ `MODULE:{type,id}`
→ `OBJECT:{type,id}`
→ `FIELD:{object_type,field_key}`

其中：

- Work/Episode 仅为组织关系，不作为授权继承父级。
- Scene/Shot/Task/Asset 等对象必须校验所属 Production。
- Share Grant 必须固定最小 scope，不能使用“project=*”之类模糊授权。

## 5. 系统身份

### 5.1 Personal User

默认：

- 管理自己的账号和个人能力。
- 管理自己的个人项目。
- 无权因拥有技能进入别人的 Team Project。

### 5.2 Project Member

已确认：

- 可查看本人参与 Production 的完整项目内容。
- 只编辑分配给自己的工作。

不自动获得：

- 项目设置
- 成员管理
- 项目删除
- Purge
- Export
- Download
- Share
- Publish Call Sheet
- Approval
- Shared View 管理

这些动作按 ACL-03 继续独立确认。

### 5.3 Team Admin

已确认：

- 管理本 Team 成员关系与团队需求。
- 可进入并管理本 Team 全部项目。
- 团队只有一名 Team Admin。
- 独立 Team 可整体移交管理权。

Team Admin 身份不改变其原项目任务责任。

### 5.4 Agency Team Admin

已确认：

- 管理本 Team 内部及本 Team 全部项目。
- 不具备创建/解散 Agency 下属 Team 或主动脱离 Agency 的权力。

### 5.5 Agency Admin

已确认：

- 管理所属所有 Team 及其内部项目。
- 指派/改派 Team Admin。
- 创建/解散所属 Team。
- Agency 管理权不移交。

### 5.6 System Management Capability

用于：

- 公共知识定义
- 岗位目录
- 知识修订
- 系统级配置

不得默认展开为所有业务 Production 的内容访问。

## 6. Action Catalog

动作必须使用稳定 action key，不允许每个 API 自己定义同义词。

### 6.1 Project

- `project.list_summary`
- `project.view`
- `project.create`
- `project.update_metadata`
- `project.manage_settings`
- `project.manage_members`
- `project.transfer`
- `project.archive`
- `project.restore`
- `project.delete`
- `project.purge`

### 6.2 Creative Objects

- `scene.view`
- `scene.create`
- `scene.update`
- `scene.delete`
- `shot.view`
- `shot.create`
- `shot.update`
- `shot.delete`
- `shot.manage_columns`
- `storyboard.update`

### 6.3 Work

- `task.view`
- `task.update_assigned_work`
- `task.assign`
- `task.reassign`
- `task.manage_dependencies`
- `task.skip`
- `task.submit`
- `task.accept_handoff`

### 6.4 Schedule

- `schedule.view`
- `schedule.update`
- `schedule.publish`
- `move.update`
- `availability.update_self`
- `availability.manage_others`

### 6.5 Call Sheet

- `callsheet.view`
- `callsheet.create_draft`
- `callsheet.edit_draft`
- `callsheet.publish`
- `callsheet.send`
- `callsheet.confirm_self`
- `callsheet.view_distribution_report`

### 6.6 Asset / Review

- `asset.view`
- `asset.upload`
- `asset.replace`
- `asset.download`
- `review.comment`
- `review.resolve`
- `review.approve`
- `review.request_rework`

### 6.7 Share / Export

- `export.preview`
- `export.create`
- `export.download`
- `share.create`
- `share.update`
- `share.revoke`

### 6.8 Organization

- `team.view`
- `team.manage_members`
- `team.manage_requirements`
- `team.transfer_admin`
- `agency.manage_teams`
- `agency.assign_team_admin`
- `agency.dissolve`

### 6.9 Knowledge

- `knowledge.view`
- `knowledge.submit_candidate`
- `knowledge.review_candidate`
- `knowledge.publish_revision`
- `knowledge.withdraw_revision`

## 7. Recommended Permission Layers

一次请求按照以下层次解析：

1. **Authentication**：是谁。
2. **Account State**：账号是否 active。
3. **Object Ownership**：目标属于哪个 Production / Team / Agency。
4. **Organization Binding**：是否存在 Team/Agency 管理身份。
5. **Project Membership**：是否为当前项目成员。
6. **Assignment Binding**：是否被分配目标 Task/对象。
7. **Explicit Object/Share Grant**：是否存在单对象或分享授权。
8. **Sensitive Field Filter**：联系人等字段是否允许。
9. **Action-specific Guard**：例如 Publish/Purge 是否需要更高权限。
10. **Revision / Business Preconditions**：权限通过后再检查业务 CAS、状态与依赖。

权限与业务状态分开：
“有权发布”不等于“当前 Draft 已满足发布条件”。

## 8. Permission Decision Result

授权服务不要只返回 true/false，建议返回：

```text
decision: allow | deny | pending_policy
source: personal_owner | project_member | team_admin | agency_admin | assignment | share_grant | system_capability
scope: ...
allowed_actions: [...]
field_projection: [...]
reason_code: ...
policy_revision: ...
```

用途：

- UI 根据 allowed_actions 呈现操作。
- API 仍重新判定，不能信任 UI。
- Export/Call Sheet 使用 field_projection。
- Audit 保存 reason/source，而不是只保存“403”。

## 9. 权限来源矩阵

### 9.1 已确认部分

| 身份 | Team列表 | 未参与项目摘要 | 参与项目正文 | 编辑本人工作 | 管理本Team全部项目 | 管理Agency全部项目 |
| --- | --- | --- | --- | --- | --- | --- |
| 普通Team成员 | 是 | 查看全部模式可列出 | 仅参与项目 | 是 | 否 | 否 |
| Project Member | 按Team关系 | N/A | 是 | 是 | 否 | 否 |
| Team Admin | 是 | 是 | 是 | 是/管理 | 是 | 否 |
| Agency Team Admin | 是 | 是 | 是 | 是/管理 | 本Team是 | 否 |
| Agency Admin | 所属全部Team | 是 | 是 | 是/管理 | 是 | 是 |

### 9.2 仍不得擅自决定

以下不从上表自动推导：

- Download
- Export
- Share
- Delete
- Restore
- Purge
- Shared View 修改
- Project Settings
- Approval
- Call Sheet Publish
- Contact Details

这些动作应逐项进入 ACL-03 确认。

## 10. “本人工作”实施方案

### 10.1 当前业务合同

普通项目成员：
- 可看完整参与项目；
- 仅编辑“分配给自己的工作”。

### 10.2 推荐的最小可实施方案（待 ACL-01 确认）

首版把“本人工作”绑定到 **Task Assignment**，而不是直接绑定整个 Shot。

规则：

1. User 是 Task 的 primary assignee 或 collaborator。
2. Task Template / Task Type 声明该任务允许操作的 business command 集。
3. 用户只能通过这些 command 更新对应对象。
4. 被分配“摄影执行 Task”不等于拥有整个 Shot 的任意字段写权限。
5. 多人负责同 Shot 时，各 Task 的 command capability 独立。
6. 需要共同编辑的字段，通过显式 Project Grant 或共同 Task capability 处理。

这样可以避免：
“同一 Shot 上摄影、灯光、导演都有任务 → 三个人都获得整行 Shot 的所有字段写权”。

若后续需要 Field-level Assignment，再在 Task Capability 下增加字段投影，不重新建立第二套权限系统。

## 11. Explicit Grant / Deny

### 11.1 Grant

可用于：

- 某用户临时管理某模块
- 某外部协作者查看/评论某页面或对象
- 某成员获得特殊 Export / Download 权限

Grant 必须包含：

`principal + scope + actions + expires_at? + granted_by + policy_revision`

### 11.2 Deny

ACL-02 尚未确认。

因此实施前：

- 数据模型可预留 deny。
- Policy Engine 可以支持 deny 运算。
- **不得决定** explicit deny 是否能覆盖 Team/Agency Admin 的已确认管理权。
- 不得在 UI 中提供会改变该优先级的设置，直到用户确认。

推荐讨论选项：

A. System safety deny > Organization admin > Project grant/deny > Membership/Assignment  
B. System safety deny > Explicit project deny > Organization admin > Membership/Assignment

当前只记录选项，不选择。

## 12. External Share Model

参考 StudioBinder 的页面级 Collaborator 思路，但采用 FrameForge 自己的权限事实。

Share Grant 需要：

- target scope
- action: view / comment / edit 中明确子集
- allowed fields
- asset/download policy
- expiry
- optional passcode
- revocable token
- issued_by
- policy revision

建议默认：

- 无登录 guest：view/comment 优先。
- edit 必须限定到明确对象和 command，不给整个项目任意写。
- 不允许 share token 创建新 share token。
- 不允许 share token 管成员、项目设置、权限、Purge。
- 下载与预览分开授权。

## 13. Sensitive Data

下列数据至少独立投影：

- 手机
- 私人邮箱
- 家庭/住址
- 身份证件类资料（若未来存在）
- 合同/薪资（当前不在产品范围）
- 私人备注
- 内部风险/管理备注

Call Sheet / Export / Share 不得因为能查看 Person 名称就自动获得全部联系人。

个人化 Call Sheet 应只输出该接收者需要的信息。

## 14. Project Summary Visibility

ACL-04 待确认。

数据结构建议把项目列表摘要单独形成安全 Projection，而不是先读完整 Project 再在前端隐藏。

可候选字段：

- project id
- title
- project type
- status
- membership marker

待确认字段：

- thumbnail
- duration
- owner / producer
- update time
- participant names

正文、媒体、任务、评论、人员联系方式永远不能因“列表可见”自动返回。

## 15. Team / Project Membership 联动

ACL-06 待确认。

已确认：

- Team Member 不自动进入所有 Team Projects。
- Project Member 可以看参与项目。
- 离队不自动清除历史责任记录。

推荐实现：

- Team membership 与 Project membership 使用不同记录。
- 离开 Team 时，触发 Project Access Review Job。
- 历史 assignment/person/audit 不删除。
- 当前 access 是否撤销、保留到任务结束或需管理员选择，等待 ACL-06。
- 未确认前不要自动“永久保留”或“全部撤销”。

## 16. Archive / Former Member Access

ACL-05 待确认。

已确认：

- 离队用户保留个人历史摘要。
- 摘要不授予项目正文访问。
- 归档项目继续保留内容与历史。

建议采用显式 `former_member_grant`，由当前有效管理员授权：

- view archive
- export selected
- download selected

历史身份本身不自动恢复内容访问。

## 17. Call Sheet 权限

建议至少区分：

| 动作 | 普通接收者 | Project Member | Production Manager Grant | Team/Agency Admin |
| --- | --- | --- | --- | --- |
| 查看本人已发布通告 | 可 | 可 | 可 | 可 |
| 确认本人 | 可 | 可 | 可 | 可 |
| 查看 Draft | 否 | 待确认 | 可 | 可 |
| 编辑 Draft | 否 | 待确认 | 可 | 可 |
| Publish | 否 | 待确认 | 可 | 可 |
| 查看发送报告 | 否 | 待确认 | 可 | 可 |

“Production Manager Grant”是项目级 action grant，不等于影视岗位名称自动授权。

## 18. Export / Download 权限

所有导出先得到 `EffectiveProjection`：

```text
eligible objects
∩ object permissions
∩ field permissions
∩ user selection
∩ share restrictions
= export projection
```

生成 Job 保存：

- requester
- scope
- projection hash
- policy revision
- source revision
- requested_at

下载时再次检查：

- token validity
- requester access
- current revoke state

不允许“生成时有权 → 后来被撤销 → 永久通过旧链接下载”。

## 19. Realtime / Presence

WebSocket 连接建立时授权一次还不够。

要求：

- 订阅 channel 前检查 scope。
- policy revision 变化时重新鉴权。
- 用户移出项目后停止接收后续事件。
- Presence 只能暴露该用户已能看到的对象。
- 禁止通过在线用户列表推断无权看到的成员/项目。

## 20. AI 权限

AI 与普通用户没有特殊捷径。

链路：

`User Permission → Provider Input Projection → Candidate → Human Confirm → Standard Command → Audit`

要求：

- 发给 Provider 的内容先过字段投影。
- Provider response 不是正式事实。
- Accept 时再次检查当前权限和 revision。
- 权限撤销后未完成 AI Job 不得发布结果到不可访问对象。

## 21. Policy Architecture

建议逻辑组件：

### 21.1 Identity Service

管理 User、Team、Agency、Membership、Project Membership。

### 21.2 Authorization Policy Service

统一 `can(actor, action, resource, context)`。

### 21.3 Projection Service

根据权限生成安全字段/对象投影，供：

- list
- search
- export
- call sheet
- share
- AI
- analytics

### 21.4 Audit / Receipt

记录高风险授权决策和变更。

### 21.5 Share Service

负责 Share Grant、token、expiry、revoke。

不要让每个业务模块分别建立自己的 ACL 表和判断函数。

## 22. 概念数据结构

> 仅为实现规划，不冻结实际表名。

```text
User
Team
Agency
TeamMembership
TeamAdminBinding
AgencyAdminBinding
Production
ProjectMembership
WorkAssignment
SystemCapabilityBinding
ObjectGrant
ShareGrant
PolicyRevision
PermissionAudit
```

`ObjectGrant` 只承载特殊例外授权；常规 Team/Agency/Project/Assignment 权限应由其原业务关系推导，避免为每个对象生成海量重复 ACL 行。

## 23. API 规范

每个业务 endpoint：

1. resolve actor
2. load resource identity/minimal owner fields
3. authorize action
4. filter sensitive fields
5. validate revision/business state
6. execute command
7. audit/outbox
8. return safe projection

禁止：

- 先查询完整对象再在客户端隐藏
- 通过前端 route guard 代替服务端权限
- 导出 endpoint 使用比普通 API 更宽的权限
- 媒体 URL 绕过 resource authorization

## 24. 缓存

Permission Cache key 至少包含：

`actor + scope + action family + policy revision`

Membership/Admin/Grant/Share 变化：

- 提升 policy revision
- 失效相关缓存
- 通知实时连接重新校验
- 让未完成 Job 在 publish 前复核

## 25. 审计

必须审计：

- Team Admin 移交
- Agency Team Admin 改派
- Team Member add/remove
- Project Member add/remove
- Project transfer
- Explicit Grant/Deny
- Share create/revoke
- Sensitive export/download
- Call Sheet publish
- Approval
- Delete/Purge
- Knowledge publish

普通 read 可按风险和规模做访问日志，不要求每个 cell render 写审计。

## 26. 前端规则

前端从服务端获取 `allowed_actions`，但它仅用于体验优化。

- 无权动作不显示或 disabled，并说明原因。
- 403 后不能自动乐观显示成功。
- 权限被撤销时关闭或降级正在编辑的界面，保留未提交本地草稿供用户复制，不再提交。
- Admin/Member/Guest 标签是状态展示，不代替真实授权结果。
- “完整项目查看”和“可编辑”视觉上清楚分开。

## 27. 验收矩阵

### AUTH-01 未参与 Team Project

普通 Team Member 在“查看全部”能看到受限摘要，但直接访问项目正文/API/媒体/搜索/历史均拒绝。

### AUTH-02 Project Member

能查看参与项目；只能成功执行本人 Assignment 允许的命令，修改无关 Shot/Task 被拒绝。

### AUTH-03 Team Admin

能管理本 Team 全部项目，但不能因此管理另一 Team。

### AUTH-04 Agency Admin

能管理所属所有 Team/Project；不能因 Agency 身份获得系统知识后台权限。

### AUTH-05 Job/Skill Isolation

把用户岗位改为“导演/制片/摄影”不会改变任何系统权限。

### AUTH-06 Guest Share

只可访问 Share Grant 指定的 scope/action/fields；换对象 ID、搜索、媒体猜路径均不能越权。

### AUTH-07 Revoke

撤销 Project Membership/Share 后：
- 新 API 请求失败；
- WebSocket 停止；
- 未过期旧下载也重新验证；
- 后台 Job 不发布越权结果。

### AUTH-08 Sensitive Projection

有项目 view 权限但无 contact 权限时，Person 页面、Call Sheet、Export、Search 均不能泄露联系方式。

### AUTH-09 Multi-role Scope

用户是 Team A Admin、Team B 普通成员：A 具备管理能力，B 仍只按 B 的 Membership/Assignment 判定。

### AUTH-10 Historical Integrity

成员离队后历史责任、已发生 Task/Review/Audit 保留，但这些历史记录不自动授予当前项目正文访问。

### AUTH-11 Conflict

权限通过但 revision 过期返回业务冲突；不能混成权限拒绝。

### AUTH-12 AI

AI 输入仅包含 actor 有权数据；Accept 时再次鉴权；撤权后的 Job 不能写入。

## 28. 实施阶段

### P0 — Policy Foundation

Identity、Membership、Team/Agency Admin Binding、Project Membership、Action Catalog、Policy Engine、Policy Revision、Audit。

### P1 — Project / Assignment

Project View、Assigned Work、Scene/Shot/Task command guard、敏感字段投影。

### P2 — Share / Export / Media

Share Grant、Export Projection、Media/Download、Call Sheet recipient projection。

### P3 — Realtime / Job / AI

WebSocket 重鉴权、Job publish guard、AI input/output guard。

### P4 — Fine-grained Policy

在 ACL-01—06 确认后补充：
- field-level assignment
- explicit deny precedence
- member export/download/share
- summary field policy
- former-member grants
- team/project membership lifecycle

## 29. 需要用户后续确认的决策

保持现有编号：

- **ACL-01**：本人工作的最终粒度。
- **ACL-02**：explicit deny 与 Team/Agency Admin 权限优先级。
- **ACL-03**：普通 Project Member 的 Export/Download/Share/Delete/Restore/Shared View/Settings 等动作。
- **ACL-04**：未参与项目摘要字段。
- **ACL-05**：Former Member / Archive 的授权者与动作范围。
- **ACL-06**：Team Membership 与 Project Membership 变动联动。

在这些决策完成前，实现只能建立统一权限基础和明确已确认范围；不能通过“行业惯例”或竞品默认值替用户作决定。
