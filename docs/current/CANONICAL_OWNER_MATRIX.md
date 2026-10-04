# 当前职责与消费者

本表只描述当前代码路径，不登记下一代进度或旧切换门槛。

| 职责 | 当前位置 | 核查依据与边界 |
| --- | --- | --- |
| Web 路由与页面 | apps/web/app | 根 workspace dev/build；当前 UI 由用户接受要求和 montblanc08 最新变更决定 |
| 查询/草稿/选择 | apps/web/lib、components | 保留当前消费者；本轮不重做状态层 |
| HTTP、权限、业务命令 | apps/api/app/api、services | apps/api/main.py 路由入口；不改他人导入导出草稿 |
| 持久模型与迁移 | apps/api/app/models、alembic | 保留当前链和空库/约束/事务检查 |
| 后台作业 | apps/worker/worker.py | Docker Worker 入口；具体任务仍需真实消费者验收 |
| 当前共享原语 | packages/ui、types、contracts、timecode | 根构建与应用引用，不新增第二套共享包 |
| 基础设施 | infra | 现有 Docker/Nginx 配置与 CI；不部署 |
| 弃用存档 | deprecated | 无正常运行/测试/打包消费者，禁止自动恢复 |

所有新 agent 任务需声明允许与排除写集、基础提交、接口和测试；公共注册、迁移链及锁文件由集成负责人协调。下一代需要重新登记负责人，不能沿用旧矩阵的 CUT_OVER/PASS 状态。
