# 当前仓库实际架构

2026-10-05 的路径与消费者核查，不是下一代目标架构或功能完成声明。

| 入口 | 实际用途 |
| --- | --- |
| 根 `package.json` 的 dev/build | 启动 apps/web，依次构建四个共享包及 Web |
| `apps/api/main.py` | 当前 FastAPI 入口；业务修改通过 app/services；Alembic 维护迁移链 |
| `apps/worker/worker.py` | Redis/RQ Worker 入口；有容器消费者不代表所有处理任务已实现 |
| `packages/ui` | 当前共享控件；Web/共享控件的实现不自动进入下一代 |
| `packages/types`、`contracts`、`timecode` | 当前跨模块类型、协议和时码计算 |
| `infra/docker`、`infra/nginx` | 当前镜像和代理配置；本轮不部署、不改运行参数 |
| `tests/backend`、`tests/frontend` | 当前实现的验证；源断言不等于浏览器验收 |

当前应用、共享包和基础设施未发现指向整套 storyboard-system 旧应用的运行依赖。旧工程序列化器/映射器只有 tests/contracts 消费，没有真实导入 API 消费，随专属 fixture 和旧 CI 作业归档。正常 Excel/PDF/图片/工程导入导出服务与其他 agent 草稿保留。

当前 PostgreSQL/Alembic 迁移链继续属于当前版本。数据库安全、事务、并发、权限、源文件保护及真实测试仍保留；不会因为废止旧功能基线而取消这些验证。

带日期的实现记录是历史事实，不表示最新工作树通过全部功能、端到端或视觉验收。新版技术及数据设计另见独立分支。
