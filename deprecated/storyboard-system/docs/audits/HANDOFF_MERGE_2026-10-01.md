# 2026-10-01 交接合并与 GitHub 分支收敛

## 合并依据

用户要求读取 `frameforge-thread-01a0cd5d-f0f6-7371-9890` 交接目录和粘贴会话，与当前实现合并，并使用子智能体审查、删除 GitHub 冗余分支。目标仓库为 `soupsouptang/StoryBoard_System`，默认分支和提交目标均为 `master`。

交接主检出基于 `524afea`。先按 UTF-8 和 LF 比较实际内容：大量工作树差异仅来自 CRLF，实际有 10 个已跟踪文件修改和一个新建视图导航文件。逐项接入当前代码，没有以整个旧检出覆盖当前主线。交接中的旧行内编辑实现被当前已修复实现替代，保留冲突草稿和保存防重入。

原始交接目录、会话、截图、数据库和缓存留在本地；本次提交只包含审查后的代码、依赖锁文件、检查和本文。未执行生产部署或生产数据库操作。

## 已上传模块

| 提交 | 合并内容 | 本轮证据 | 状态 |
| --- | --- | --- | --- |
| `408aeee` | 行内编辑中文提示、编辑事件隔离、同步保存锁、输入标签和数值 0 | `node tests/frontend/inline-edit-cell.cjs`、Web TypeScript | BLOCKED_VISUAL；原生 IME 待验收 |
| `a060d7c` | 项目横幅封面、搜索和元数据、设置/打开入口、Pencil 导出 | Web TypeScript；受权图片字节读取与 URL 清理保留 | BLOCKED_VISUAL |
| `10a0db8` | 共用表格/卡片/视觉墙/时间线路由，折叠导航和项目信息；卡片画面、描述/旁白编辑、扩展字段、完整列表排序 | `node tests/frontend/storyboard-handoff.cjs`、Web TypeScript | BLOCKED_VISUAL；真实拖动/键盘和桌面并列布局待验收 |
| `45033eb` | Next 16.3.8、React 19.3.0、ESLint 10.11.0、Next flat config 和自动 JSX runtime/types 配置 | 依赖安装、ESLint 配置加载、Web TypeScript、`npm run build --workspace=@frameforge/web -- --webpack` | INTEGRATED_NOT_CUT_OVER |
| `5dbb946` | 摘取交接本地提交 `177600c`：现有 CI 的 checkout/setup-python 固定官方 SHA，明确 AI zero-egress 作业名称 | 官方 GitHub refs 核对；`python .github/scripts/security_invariants.py` 通过 | 已整合；未声称云端 CI 运行已通过 |
| `19385b6` | 按 Next 标准保留生成文件在本地、退出 Git 跟踪，保留版本文档指导和根规则优先级 | 已安装 Next 文档与 generator 核对；本地 HTTP 检查 | 开发环境可访问，不代表视觉通过 |

框架变更依据 [Next 16 官方升级指南](https://nextjs.org/docs/app/guides/upgrading/version-16)：默认构建使用 Turbopack，允许 `--webpack`，原 `next lint` 改为直接使用 ESLint。这里保留默认构建脚本。本机 Turbopack CSS worker 因禁止绑定临时端口失败；停掉旧开发进程、保留旧缓存到临时目录后，Webpack 完整生产构建通过。不能把该证据标为默认 Turbopack 构建通过。

卡片排序复用当前 `useReorderShots`；仅完整、未筛选、未分组的列表开放排序。服务端完整集合、base order 和 revision 合同保留。并非已经实现 PR #5 的成组拖动、pointer/touch 手势与完整乐观回滚。

按已安装 Next 的 TypeScript 文档停止跟踪自动生成的 `apps/web/next-env.d.ts`，本地文件保留，构建/开发自动重建；仍在 tsconfig include 中。Next 16 开发启动自动生成的 `apps/web/AGENTS.md` / `CLAUDE.md` 纳入版本管理，并明确根仓库规则仍权威。本地 Web 和隔离 API 的 HTTP 可访问检查均为 200，这不属于视觉验收。

本轮未进行浏览器视觉验收。代码检查和构建不替代视觉通过，整体功能对等、后端拆分、数据库迁移和 Legacy cutover 均未完成。

## 已删除的 14 个冗余远端分支

删除前重新读取开放 PR、远端 head、本地跟踪 head 和对应远端归档标签。以下分支无开放 PR，且远端归档标签的 peeled commit 与 head 完全相同。使用一次原子删除，未强推主线。

每个分支保留可恢复标签 `archive/2026-10-01/<完整分支名>`。旧实现被当前实现替代的分支，不代表其所有提交已成为 master 祖先。

| 已删除分支 | 保留提交 | 收敛依据 |
| --- | --- | --- |
| `chatgpt/project-cover-readmodel-e98b663` | `abb0b103` | 当前主线 service cover read model 已替代旧实现 |
| `chatgpt/review-comment-first` | `dbe7d614` | 已为主线祖先 |
| `chatgpt/review-comment-first-8780820` | `d601bda0` | 评论/回复/引用由当前 canonical 实现接管 |
| `chatgpt/review-comment-first-9c8db3a` | `bd7fe74c` | 旧 Review 实现由当前 canonical 实现替代 |
| `chatgpt/review-comment-first-f545bd8` | `b35faf42` | 旧 Review 实现由当前 canonical 实现替代 |
| `chatgpt/review-final-58c95dd` | `9d77b6df` | 旧 Review 实现由当前 canonical 实现替代 |
| `chatgpt/review-parity-dd12676` | `dd12676b` | 旧 Review 实现由当前 canonical 实现替代 |
| `chatgpt/review-ui-c19832b` | `c19832bf` | 旧 Review UI 由当前 canonical 实现替代 |
| `chatgpt/review-ui-e2cddf4` | `e2cddf4c` | 旧 Review UI 由当前 canonical 实现替代 |
| `docs/ui-migration-inventory-20260930` | `65c7ea44` | git cherry 核对补丁等价 |
| `fix/inline-edit-ime-20260930` | `539f9ef6` | git cherry 核对补丁等价；当前实现另有保存修复 |
| `fix/review-replies-quotes-20261001` | `9fc53878` | 已为主线祖先 |
| `fix/version-detail-route` | `b8de4ea2` | 当前 `10f4e21` 提供等价版本详情路由 |
| `integration/ui-backend-check-20261001` | `21181b30` | 已为主线祖先 |

## 保留的 4 个开放 PR

子智能体比较实际文件和提交后，确认以下分支仍有需整合的内容。没有直接合并过时的页面/API 树，也没有删除这些未整合能力。

| PR / 分支 | 仍需整合的能力 | 后续处理 |
| --- | --- | --- |
| [#1](https://github.com/soupsouptang/StoryBoard_System/pull/1) `maintenance/regression-hardening` | 迁移状态、OpenAPI/命令边界、零外发、视觉比较/夜间回归/provenance 等硬化，WebVTT 导出 | 优先作为硬化/VTT 来源，按当前 owner 分模块重放 |
| [#2](https://github.com/soupsouptang/StoryBoard_System/pull/2) `chore/maintenance-guardrails` | 与 #1 重叠的 guardrails/VTT；另有 PR freshness/integrity 检查 | 核对 freshness 能力覆盖后再收敛 |
| [#3](https://github.com/soupsouptang/StoryBoard_System/pull/3) `chore/repo-hardening-all` | 重叠硬化/VTT；PR base/contract 检查差异仍需核对 | 版本详情路由已覆盖；剩余有效规则整合后再收敛 |
| [#5](https://github.com/soupsouptang/StoryBoard_System/pull/5) `work/shadcn-functional-parity-reorder` | 多选成组重排、pointer/touch/cancel、base order 和 revision 乐观回滚 | 和当前 Shot 页面及命令合同整合，保留独有交互和冲突保护 |

删除完成后，GitHub heads 核对只剩 `master` 和上表四个分支。归档标签不作为新的开发分支使用。
