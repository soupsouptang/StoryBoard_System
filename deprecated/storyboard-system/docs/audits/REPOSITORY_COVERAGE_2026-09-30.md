# FrameForge 仓库覆盖盘点（2026-09-30）

## 审计边界

- 仓库：本工作树 Git 根 `FrameForge`。
- 基线：`bf69345c64d8ec2a4e299705bc8c1fd3827bcbca`。
- Git 索引共 755 个 tracked 文件；审计期间工作树已有一处修改：`apps/web/components/shot/InlineEditCell.tsx`。本盘点未读取其差异以外的产品决策，也未触碰该文件。
- 本文是源码入口、模块边界、配置消费者和资产类别的静态覆盖盘点，不是全文件逐行审阅、运行时探测、安全扫描或发布清单。
- 未运行测试、浏览器、构建、部署或会写入数据的命令。没有读取/复制本地环境变量、密码、密钥或 IP 值。

## 覆盖范围与未读项

本轮枚举了完整 `git ls-files` 清单，并按根目录、扩展名和主要子树分类。实际读取了：

- 根 `AGENTS.md` 与 `storyboard-system/AGENTS.md`，根和 Legacy README、`package.json`、Legacy `package.json`、`build.mjs`、TypeScript 配置、Legacy systemd 单元。
- `ARCHITECTURE.md`（前 220 行）、`ARCHITECTURE_MIGRATION.md`（迁移契约开头与当前基线）、`LIFECYCLE_ARCHITECTURE_PLAN.md`、`CANONICAL_OWNER_MATRIX.md`、`ACTIVE_WORKSTREAMS.md`、`WORKSPACE_HYGIENE.md`、`SHADCN_UI_BASELINE.md`、组件库规范，以及产品、API 路由、页面和 UI primitive parity 文档的相关章节。
- VNext 入口 `apps/api/main.py`、`apps/web/app/layout.tsx`、`apps/web/app/page.tsx`、workspace layout、登录与项目路由概览；API 数据库/config、Shot router/service；根共享包导出、契约、时间码；`apps/worker/worker.py`。
- Legacy `server.py` 顶层直接导入与 `AppHandler`/静态服务定位；`static/index.html` 的 CSS/JS 加载清单；构建入口和 PDF 模块前段；以 `git grep` 检查 Legacy FastAPI、repository、AI、Presence 等 Python import 消费者。
- `.github/workflows/` 的 CI、生成物、迁移、安全和回归工作流，Dockerfile、Nginx 配置、根测试入口，以及三支根级媒体/工作簿脚本的源码入口。根 Nginx 对外配置由 phase runner 直接读取；根素材脚本未运行。

本轮未逐行读取 755 个 tracked 文件。以下范围明确未逐个检查，不能据此推断无消费者或可删除：

- 125 个 GLB、18 个 WOFF2、9 个 JPG、1 个 PNG 等二进制素材；图片与模型只按清单和少量加载器引用分类，未解码逐件核验。
- `storyboard-system/static/` 的全部 142 个文件、`scratch/` 的 58 个脚本、`tests/` 的 100 个 Legacy 测试、`vendor/pypdf/` 的 56 个文件未逐文件通读。静态入口清单和已检索的引用仅能证明部分加载关系。
- VNext 131 个文件和根 `packages/` 28 个文件未逐文件通读；已覆盖关键启动入口、路由装配、Shot 写入链、包导出和消费拓扑，具体模块的完整语义及逐组件渲染未验收。
- 全部 Alembic migration、所有 API service/schema、所有 Next 页面/组件、全部 Legacy HTML/CSS/JS 符号、事件字符串/动态加载器、完整路由实现和测试断言未逐项审计。
- SQLite/媒体/导入暂存/导出运行目录、`.env`/systemd 外部配置、仓库外编排与服务器配置均未读取。没有进行生产访问。

## 目录与文件类别

| 范围 | tracked 数量 | 盘点判断 |
| --- | ---: | --- |
| `storyboard-system/` | 541 | 活跃 Legacy 服务和 UI、迁移实现、测试、生成物、素材及 vendor 并存；不是整体可退役目录。 |
| `apps/` | 131 | VNext FastAPI、Next.js 和 worker 目标实现；多项由 CI、页面/路由或服务内调用消费，但未替代全部 Legacy 运行入口。 |
| 根 `packages/` | 28 | VNext types、contracts、timecode、共享 UI；通过 npm workspace、应用 imports 和 CI 构建消费。 |
| 根 `tests/` | 18 | backend 合同测试进入 CI；3 个 phase runner 由 README 人工入口驱动，其中 phase 1 自包含算法断言，尚无产品源码调用。 |
| `.github/` | 7 | CI workflow 调用其脚本并约束 Legacy 构建/安全回归。 |
| `infra/` | 5 | Docker 与 Nginx 配置；一部分有测试或服务架构引用，另有仓库外消费者未知。 |
| `_cut_review/` | 9 | 人工媒体审阅图；脚本/源媒体与其运行关系并未逐项审计，保留。 |
| 根目录及产品规划 | 16 | 规则、说明、依赖清单和人工素材脚本；不是统一的运行模块。 |

Legacy 子树重点计数：`static/` 142、`tests/` 100、`scratch/` 58、`vendor/` 56、`docs/` 26、`film_equipment_25d_pack/` 87。数量仅作范围提示，不作为清理依据。

## 活跃入口与消费者

### 当前 Legacy 服务与前端

- 配置的 Legacy 服务入口仍为 `storyboard-system/server.py`：Legacy README 提供启动命令，systemd unit 的 `ExecStart` 也指向该入口；`server.py` 定义 `AppHandler`、静态服务和 HTTP 服务启动。
- `server.py` 直接导入共享功能模块，包括字段生命周期、导入解析/暂存、创意板、时码/旁白、PDF 往返、导出、Shot 写入/版本、资产清理、审计和 schema migration。模块化文件已被入口消费，不代表 HTTP/数据库权属已迁移。
- `storyboard-system/static/index.html` 同时装载 hand-written `app.js`、Legacy React workspace bundle、照明/画板/协作/字段和 PDF/Word/横版导出模块，并加载多层 CSS。该静态入口为实际运行资源的消费者。
- `build.mjs` 由 Legacy workspace package scripts 调用：从 `src/material-web.js`、`src/three-bundle.js`、`src/workspace/index.tsx` 构建本地 vendor/workspace 产物，并由 Tailwind 生成 CSS。`static/index.html` 又直接加载部分生成产物。生成文件既是构建输出，也是当前 Legacy 运行输入，不可单凭“generated”清除。
- `static/lighting-assets.js` 将 GLB 路径、预设和 2.5D/3D 模型数据连接起来；素材包、静态 GLB、字体、光标与厂商资源须沿加载路径逐件核对。二进制内容不在本次审计范围。
- `storyboard-system/fastapi_app/` 是独立的第二套 FastAPI 实现。API parity 文档将其列为测试型并行实现；`tests/test_fastapi_app.py` 直接导入它。尚未看到它替代 systemd Legacy 入口的配置。`repositories/`、`presence_system/`、`ai_system/` 也分别由该树、其测试或其路由引用，不是零消费者。
- `vendor/pypdf/` 是本地 vendored 依赖；`project_pdf_roundtrip.py` 显式将其路径加入 Python import path 并使用 pypdf API。vendor 与许可文件保留。

### VNext API/Web/packages

- 根 npm workspace 声明 `apps/*` 和 `packages/*`；根 scripts 将 web、API、所有 packages 暴露为开发/构建/测试入口。`.github/workflows/ci.yml` 分别执行 VNext backend tests、共享包 build、Next build。
- VNext API 入口为 `apps/api/main.py`，集中装配 health/auth/production/Shot/review/version/import/export/share/AI/presence/custom-field/saved-view routers。`apps/api/app/core/database.py` 提供 SQLAlchemy engine/session；路由注入 session 和服务；Alembic 是 schema migration 输入，PostgreSQL workflow 实际升级空库。
- VNext Web 入口为 `apps/web/app/layout.tsx` 与 root redirect，Next App Router 下有 auth、production、share 页面。`Providers`、TopBar/NavRail、feature components、hooks、API client、Zustand stores 由各页面 import 消费；`apps/web` 依赖根 `@frameforge/ui`、types、contracts、timecode。
- 根 `packages/ui/src/index.ts` 导出共享 primitives/components/icons，`apps/web` 按 workspace alias/import 使用；根 contracts/types/timecode 分别被应用及 CI 引入。Legacy `storyboard-system/packages/ui` 仍由 Legacy workspace tsconfig/build 使用，同名包并存是切换缺口。
- `apps/worker/worker.py` 是 RQ worker 入口，Dockerfile 定义运行镜像并监听 default/exports/proxies queues。本轮代码检索未找到仓库内的 enqueue producer；这是待核实消费关系，不足以证明可删，仓库外部署亦未核实。

### CI、容器与测试

- 五个 GitHub workflow 当前分别验证架构边界、VNext 后端/Web、Legacy Python/Web、生成物、Alembic 空库升级、回归 guard 和 security invariants。Legacy 源和 bundle 同时仍被 CI 依赖。
- `infra/docker/Dockerfile.api` 与 `Dockerfile.web`、`Dockerfile.worker` 定义 VNext 容器镜像；仓库内未见 compose 或自动镜像发布流程。`external-gateway.conf` 被根 `tests/test_phase3_runner.py` 直接读取；`internal-server.conf` 未发现仓库内直接加载者，但可能由仓库外运维消费。
- `.github/scripts/regression_guard.py`、`security_invariants.py` 分别由 workflow 明确调用。
- `tests/backend/` 的 API contract cases 由 CI 调用。`tests/test_phase1_runner.py` 被根 README 列为人工命令，但逻辑主要在 runner 内自定义，不等同产品实现覆盖；phase 2/3 runner 会导入产品模块或读取 Nginx 配置。未运行任何 runner。
- 根 `analyze_video_cuts.py`、`make_cut_sheets.py`、`prepare_web_storyboard.py` 是人工输入/输出驱动脚本，未见仓库内 runner；第三个脚本含联网取材及写工作簿/素材目录路径。本次仅静态阅读，不执行。

## 活跃、生成、候选和结论

| 分类 | 路径/示例 | 当前证据 | 处置结论 |
| --- | --- | --- | --- |
| 配置运行入口 | `storyboard-system/server.py`、`storyboard-system/static/index.html` | README/systemd/静态引用 | Legacy 仍在用，不能退役。 |
| VNext 并行目标 | `apps/api`、`apps/web`、根 `packages/*` | workspace、imports、routers、CI | 真实开发/测试消费者存在；整体 cutover 未证明。 |
| Legacy/VNext 重复实现 | `storyboard-system/fastapi_app`、`repositories`、`presence_system`、`ai_system`；双 UI package | 测试和模块 imports 可见；owner/parity 文档记录未切换/门槛 | 仅作为未来逐能力收敛候选，先移交独有行为并去掉测试/运行消费者；本轮不删除。 |
| 构建生成物 | `static/workspace-v73.js/css`、`static/vendor/*` | build 输入/输出关系、HTML 加载、生成物 CI guard | 当前运行依赖并受 CI 校验；不得按生成物标签删除或重建。 |
| 数据/模型/字体/图片/vendor | `static/assets/**`、`film_equipment_25d_pack/**`、字体、`vendor/pypdf/**` | loader、import、license/目录结构；二进制未逐件解析 | 保留；未完成逐资产引用及许可证核对。 |
| scratch 与历史工具 | `storyboard-system/scratch/**`、根素材脚本、`_cut_review/**` | 有些是手工 QA/输入输出；全部调用与外部数据归属未审计 | 只能进入人工核实清单；本轮无零消费者证明。 |
| 仓库内未发现调用者的基础设施 | `infra/docker/Dockerfile.web`、`Dockerfile.worker`、`infra/nginx/internal-server.conf` | 在已读 tracked workflows/scripts/manifest 中未找到仓库内调用 | 仓库外部署消费者未核实；不建议退役。 |

**结论：本轮没有证据充分的删除项。** 对任何代码、工作流、资产或配置提出退役前，仍需逐项检查 static/dynamic imports、HTML、符号与事件、打包/部署清单、Python imports、消费者测试、仓库外配置和数据/媒体归属；并确认替代实现接管了相同能力。根 `AGENTS.md` 的核心约束是“一能力一个权威 owner”，但在真实调用链 cut over 且旧 owner 零消费者以前，必须保留迁移源。

## 必读规范和架构结论

- 根规则定义 VNext canonical target（Next/React、FastAPI/SQLAlchemy、根 `packages/ui`、PostgreSQL/Alembic）；`storyboard-system/` 在职责切换前仍是 Legacy/migration source。
- 迁移文档、生命周期方案、Owner Matrix 和各 parity ledger 共同强调：文件存在不代表已集成；按能力逐条确认真实入口、state/request/mutation/persistence owner、Parity、视觉/测试门槛、回滚和旧路径删除条件。
- UI 按 shadcn `new-york` + neutral semantic baseline 重构；5e86a0b 仅保留功能/交互能力参考。应保留层级、信息、文案意图和既有用户决定，不把视觉收敛当成删除功能的理由；避免新建并行组件层。
- AI 默认关闭、无可见入口；生产部署当前暂停。生产配置、生产数据和线上状态不在这次读取范围。

## 下一步建议（不执行）

1. 由协调者按 `CANONICAL_OWNER_MATRIX.md` 选一个细粒度真实调用链，不以整目录为迁移单元。
2. 先记录 Legacy/VNext 的 render、state、events、request、mutation、persistence owner 和功能 parity；复用现有 shadcn 组件，保留产品结构与文案含义。
3. 完成该链的实现与需要的验证后，再更新 parity/owner 状态；证明旧路径与测试/部署消费者退出后，另行审核可删除文件。
4. 本文只记录 2026-09-30 源码快照盘点；没有批准或实施文件删除、build、测试、PR、合并或部署。
