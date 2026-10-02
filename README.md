# FRAMEFORGE OS

专业影视分镜与镜头制作管理系统。当前仓库正在建设 **VNext 原生架构**；旧系统保留为功能参考和便携工程导出来源，不再作为新系统的 API、数据库或运行时兼容目标。

## 当前架构原则

FRAMEFORGE VNext 采用 clean-break 设计：

- **旧数据库不迁移**：不做 SQLite → PostgreSQL 数据回填，也不维持双写。
- **旧 API 不兼容**：VNext API 只服务新系统，不为旧客户端保留兼容层。
- **旧运行时不作为发布门槛**：Legacy 代码可以用于核对产品能力，但不能成为 VNext 的长期运行依赖。
- **保留一个文件级跨版本桥**：旧系统可以导出便携工程文件，VNext 负责解析、映射并导入该文件。为了保证这个导出合同可靠，可以对 Legacy exporter 做窄范围维护。
- **功能基线仍然有效**：Golden Baseline `5e86a0bb11a20ecd631d9c2af66260a73d7c92e7` 用于防止功能在重建过程中无意丢失；它不是代码、API 或数据库兼容要求。
- **一个能力只有一个权威 owner**：避免长期并存的第二套状态、写入路径或持久化实现。

## Canonical VNext

```text
Browser
   │
   ▼
apps/web
Next.js 16 + React 19 + TypeScript
   │
   ▼
apps/api
FastAPI + SQLAlchemy 2
   │
   ├── PostgreSQL      durable business data
   ├── Redis           ephemeral presence / lease / realtime state
   └── Media storage   assets / exports / generated artifacts

apps/worker
   └── asynchronous jobs such as export, media processing, TTS and future AI work
```

仓库的目标边界：

```text
/
├── apps/
│   ├── web/          # Canonical Web application
│   ├── api/          # Canonical HTTP/API and application services
│   └── worker/       # Background jobs
│
├── packages/
│   ├── ui/           # Shared UI primitives and design tokens
│   ├── types/        # Shared TypeScript domain types
│   ├── contracts/    # Cross-runtime contracts
│   └── timecode/     # SMPTE/timecode logic
│
├── infra/            # Deployment/runtime infrastructure
├── tests/            # VNext tests
├── tools/            # Repository architecture/quality gates
│
└── storyboard-system/
    └── Legacy reference + portable-project exporter bridge
```

## `packages/` 是封闭集合

根目录 `packages/` **不是通用代码收纳区**。当前只允许四个顶层共享包：

```text
packages/ui
packages/types
packages/contracts
packages/timecode
```

默认禁止为了“看起来更模块化”继续增加：

```text
packages/common
packages/core
packages/shared
packages/utils
packages/hooks
packages/domain
packages/api-client
...
```

可复用代码应先放在真正拥有它的应用内。只有出现明确、稳定的跨应用或跨运行时所有权边界，并且用户明确批准架构变更后，才允许新增顶层 package。

CI 通过 `tools/package_boundary_gate.py` 对这四个目录做白名单校验；未经批准增加第五个顶层 package 会直接失败。

## Legacy → VNext 工程文件桥

兼容范围只有文件，不是数据库或 API：

```text
Legacy project
      │
      ▼
Legacy portable export
      │
      ▼
versioned file contract
      │
      ▼
VNext importer / mapper
      │
      ▼
new VNext project in PostgreSQL
```

要求：

1. Legacy exporter 可以为稳定导出格式做必要修复。
2. VNext importer 必须显式映射字段和媒体引用，不直接读取旧数据库。
3. 导入失败不得部分污染新项目；映射和校验应有明确错误。
4. 文件合同应版本化，并使用固定 fixture 做回归。
5. 不因此恢复旧 API、旧 session、旧数据库 schema 或运行时依赖。

## 产品与工程状态

仓库中已经存在 VNext Web、API、Worker 和共享包实现，但不同能力的完成度不同。**文件存在、构建成功或局部测试通过，不等于整个产品已经完成。**

当前状态应以以下文档和真实测试/浏览器证据为准：

- `AGENTS.md` — 仓库执行规则与长期架构约束
- `storyboard-system/docs/ACTIVE_WORKSTREAMS.md` — 当前工作状态
- `storyboard-system/docs/PRODUCT_PARITY_MATRIX.md` — 功能恢复情况
- `storyboard-system/docs/SCREEN_PARITY_MATRIX.md` — 页面与视觉恢复情况
- `storyboard-system/docs/SHADCN_UI_BASELINE.md` — VNext 视觉基线

不要从 README 推断某个具体功能已经通过功能或视觉验收。

## 本地开发

安装 JavaScript/TypeScript 依赖：

```bash
npm ci
```

启动 VNext Web：

```bash
npm run dev
```

安装并启动 VNext API：

```bash
python -m pip install --require-hashes -r apps/api/requirements-dev.lock
npm run dev:api
```

数据库、认证和媒体目录等运行参数按环境配置提供。开发和生产 schema 均由 **Alembic** 管理；应用启动不会自动建表。API/worker 使用 Python 3.12，精确依赖版本和包哈希记录在 `apps/api/uv.lock` 与导出的 lock requirements 中。

## 验证

常用 VNext 检查：

```bash
# Root package architecture allowlist
python tools/package_boundary_gate.py

# Backend contracts
python -m pytest tests/backend -q

# Shared packages + Web
npm run build
```

可见 UI 修改还必须经过真实浏览器验收；源代码审查、TypeScript 通过或 Next.js build 不能替代视觉与交互验证。

## License

The GitHub repository is public and currently has no declared license.
