# 项目撤销与重做实施记录

日期：2026-10-03，Asia/Hong_Kong。用户确认：用户＋项目隔离、最近100步、刷新/重新登录保留，包含列宽/顺序/显隐，不记录搜索/筛选/选择。遵循根AGENTS的VNext原生架构；没有Legacy运行时接入或生产部署。

## 1. 已接通的操作

- 项目工作区“项目设置”左侧增加撤销/重做，不可用时禁用，悬停显示动作和快捷键。
- Ctrl/Cmd+Z撤销，Ctrl/Cmd+Shift+Z重做，Windows兼容Ctrl+Y。原生输入/可编辑文字、IME、弹窗内草稿、列宽拖动保留键盘所有权；图片构图继续使用局部草稿历史，保存后才形成项目历史。
- 已有项目的镜头创建、编辑、软删除/恢复、排序、相对插入/粘贴、批量操作、导入提交；列新增/复制/修改/软删除恢复、个人布局、保存视图；素材关联/上传/图片构图；批注、审片意见、交付字段模板、项目设置及软删除。
- 既有镜头版本restore/merge内容命令纳入历史；不撤销不可变版本/分支记录的创建。
- 列新增/复制的整列数据、位置、宽度/显示格式同事务提交，同一撤销步。失败/无变化不新增历史，成功新操作清除自己的redo分支，超100步删除最旧步骤。
- 上线前操作不补录；历史从本次接入后的成功操作开始。

## 2. 唯一owner与接口

| 职责 | 权威owner |
| --- | --- |
| 展示、快捷键及反馈 | ProjectHistoryControls、history-shortcuts、已有共享Dialog |
| 正常业务写入 | 已有ShotService、CustomFieldService、ImportService、ReviewService及对应域service |
| 已确认日志/补偿/游标 | HistoryService；history_context仅解析可信路由与项目域 |
| 事务确认 | 原get_db unit of work，commit前finish；命令、日志、游标一起提交 |
| 个人列布局 | PostgreSQL WorkspaceLayout；useWorkspaceLayout消费确认值，拖动仅临时草稿 |
| Schema | Alembic a83f02c1d765，前序b03e7a42f185 |
| 权限/审计/事件 | 既有角色permissions、AuditLog、OutboxEvent；批注沿用ReviewService事件序号 |

新增history_states、history_entries、workspace_layouts三表，用户/项目唯一约束、FK及正数revision/sequence约束。无启动自动建表；SQLite只用于隔离测试。旧浏览器布局只在该用户/项目没有服务端布局时初始化一次，不再双写localStorage。

接口前缀`/api/v1/productions/{production_id}`：GET `/history`；POST `/history/undo`、`/history/redo`仅提交游标revision；GET/PUT `/workspace-layout`使用revision、闭合config与可选首次initialize。现有列insert/copy-column可选placement，同事务处理数据和位置，省略时保持原调用合同。响应不发送业务before/after或资源密钥。

## 3. 冲突与不可逆边界

每次补偿获取项目锁，复核权限、游标、全部受影响对象的数据＋revision/updated_at、父引用及新增子对象后才写。任一冲突返回409，整步不写、不移动游标、不覆盖他人内容。稳定ID保留，revision递增，审计/outbox追加；个人布局补偿不修改共享内容revision。图片展示追加MediaPresentation，不改AssetVersion/源文件。

永久删除镜头/列通过既有purge服务清除全项目全部用户历史，并清理个人布局中的已purge列引用；无变化purge不清历史。不可变源文件、已下载成品、外部剪贴板、Presence、已读水位、凭据不伪装可恢复。

迁移downgrade在有已确认历史或个人布局时拒绝执行；回滚运行版本应保留表/数据或恢复已验证备份，不通过删表丢弃确认记录。

## 4. 实际验收

- 完整后端137 passed，1项已有Starlette 422弃用warning；其中11项新增事务/API测试覆盖连续undo/redo、稳定ID/重新连接保留、100步、用户/项目隔离、foreign写入/子对象冲突、权限撤回、no-op/回滚/purge、真实HTTP导入/批量/整列数据/批注、compound位置原子性及stale回滚、个人布局不增加共享revision、媒体源文件不变。依赖轻量的purge合同fixture补充barrier调用检查，真实持久事务另有覆盖。
- 快捷键消费者检查覆盖平台/输入/IME/重复键/弹窗/拖动；已有shot-summary和shot-column-sort通过。Next Webpack生产构建/TypeScript通过，未改依赖或构建配置。
- PostgreSQL55432独立空库完整Alembic升级，以及既有合成库副本b03→a83升级；真实HTTP创建undo/redo/409与列新增＋个人位置原子undo/redo通过。升级本机预览前已验证pg_dump备份，升级后原项目/镜头/素材/批注/列数量不变。
- Chrome3002独立合成项目验证镜头创建→undo→快捷键redo；列宽254.703125→271.203125→undo恢复；Ctrl+Y与刷新保留；后插列一次undo移除/redo恢复原位置；新增弹窗原生文本undo不触发项目历史、Esc关闭无新增。
- 1440/1024/768/375/320实际渲染无根横向溢出，撤销/重做14px、高32px可见；列管理/表头右键菜单及键盘焦点已检查。截图outputs/project-undo-redo-2026-10-03.png仅留工作区，不上传。
- 本机3002/API8002已重启到最新构建/源码，使用Alembic升级后的合成库，供浏览器查看。没有Legacy数据库迁移、覆盖用户原项目/视频、提交用户媒体或生产部署。

## 5. 完成范围

本次现有VNext操作undo/redo已接通，状态INTEGRATED_NOT_CUT_OVER。尚无原生命令/持久模型的Moodboard/Lighting、项目级完整restore/merge、完整成员RBAC、outbox发送worker和全部媒体GC仍是原有待办，不因此完成。补偿范围不自动扩展到未来worker/新路由；新写命令须接入同一事务owner并补测试，不能另建持久历史。未宣称GitHub CI或生产发布验收通过。

上传与下一次入口以CONTINUE_WORK最新检查点及实际远端为准。每次启动先读CONTINUE_WORK及适用AGENTS。
