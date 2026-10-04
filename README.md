# FrameForge

当前可运行版本与下一代重构规划分开维护。**旧功能基线已失效**，旧提交、对等清单和历史截图不再是当前或下一代的验收门槛；按用户最新明确要求及本轮真实证据判断。

| 位置 | 用途 |
| --- | --- |
| `apps/web` / `apps/api` / `apps/worker` | 当前 Web、API 与后台 Worker |
| `packages` / `infra` / `tests` / `tools` | 当前共享包、基础设施及验证 |
| [正常文档入口](docs/README.md) | 当前事实、协作边界、整理清单 |
| [下一代独立方案](https://github.com/soupsouptang/StoryBoard_System/tree/docs/next-generation-plan/next-generation) | 下一代需求和设计，尚未启动实现 |
| [弃用存档](deprecated/README.md) | 旧系统、旧规范、旧基线及一次性材料；不进入正常运行 |

当前 JavaScript 运行时为 Node.js 24，API/Worker 使用 Python 3.12；具体依赖以各应用锁文件为准。下一代从空库和独立媒体空间重新设计，现有实现、用户数据、素材和原入口封面约束不纳入；不自动迁移旧环境。

## 本地开发

```bash
npm ci
npm run dev
python -m pip install --require-hashes -r apps/api/requirements-dev.lock
npm run dev:api
```

数据库、认证、媒体等通过明确环境配置提供，schema 由 Alembic 管理。不要使用弃用目录里的旧 server、systemd、部署脚本或导出桥接启动服务。

## 验证

```bash
python tools/package_boundary_gate.py
python tools/repository_boundary_guard.py
python -m pytest tests/backend -q
npm run build
```

仓库检查只证明边界、路径和归档清单正确，不能宣称应用功能通过。UI 修改必须另做实际浏览器验收；旧阶段脚本和旧工程桥接不再计入通过数。

仓库当前没有统一声明的产品许可证；存档及现有第三方目录内的许可证必须保留。
