# 工作区文件与清理约定

仓库目前存在大量已跟踪文件修改和未跟踪文件。整理按引用和内容逐项核实；用户已明确要求删除确定不用的文件。`data/`、媒体、QA 结果、部署文件、手工备份及未知未跟踪资料仍可能是用户有意保留的内容。

## 先看改动，再动文件

```powershell
git status --short
git diff --stat
git ls-files --others --exclude-standard
```

按独立变更组查看文件列表及内容；不要用 `git clean`、递归删除、批量移动或全目录重建来“恢复干净”。执行构建前也先看状态，因为 `npm run build` 会覆盖若干 `static/` 文件。

## 当前边界

- `.gitignore` 已忽略 `node_modules/`、`.npm-cache/`、`.qa-data/`、`qa-artifacts/`、`__pycache__/`、`data/`、`tests/tmp*/`、`dist/`、`.qa-live/` 和 `*.log`。
- 忽略规则只影响 Git 状态展示，不代表文件没有价值或可以删除。
- 当前状态中存在大量未跟踪的部署脚本、交接/审计材料、QA 脚本和素材资料，也有受其他工作的 tracked 修改。先认领归属、来源和保留期限，再逐项提交或归档。
- `askpass*.bat`、环境配置、数据库、媒体、运行日志、浏览器状态、QA 数据及调试导出均可能含凭据或用户内容。诊断时不要把其内容贴入文档、日志或聊天，也不要将其混入源码归档。
- `docs/audits/` 与 `docs/worklogs/` 可能是不可替代的过程记录。保持时间线和出处，不将交接材料改写成当前架构事实。
- `static/` 同时放有源码、构建输出、第三方依赖、许可证、字体、图标、GLB 素材与业务界面资源。任何清理都需要具体文件清单和使用关系证据。

## 后续人工整理顺序

1. 仅生成状态清单，不改文件；将既有修改按 UI、后端、测试、运维、文档和素材归属标记。
2. 对每个未跟踪文件确认创建来源、是否已纳入产品、数据/凭据风险、再生成命令和保留责任人。
3. 把可再生的缓存放到明确忽略目录，并给生成物记录唯一命令；只对已确认可再生且无用户内容的文件做清理。
4. 对需保留的部署方案、素材库、审计记录和 QA 资产设置版本管理/外部存档策略，保留许可、出处和校验清单。
5. 确认目录规划后，分批提交；每批都检查 `git diff --stat`、`git status --short` 和目标目录清单。

不要把“工作树干净”设为整理的唯一目标。真正要保证的是文件所有权明确、源码可重建、数据不丢失、差异易审查。

## 2026-09-24 维护清单（只读核对）

### 运行与构建引用

- 根目录 `server.py` 是 HTTP/API 与静态文件服务入口；它直接导入 `creative_boards.py`、`field_lifecycle.py`、`text_format.py`、`asset_cleanup.py`、`narration_timing.py`、`delivery_exports.py`。这些根目录模块属于运行依赖。
- `static/index.html` 实际加载 `app.js`、`workspace-v73.js`、`workspace-v73.css`、`workspace-v73-views.css`、`workspace-layout.js`、`rich-text.js`、`field-system.js`、`presence-ui.js`、`screenplay.js`、`vendor/three-bundle.js`、灯光/Creative Board/横版导出/Apple workspace 脚本及多份样式。HTML 中被引用的文件，以及 HTML/CSS/JS 引用的字体、图标、模型、媒体与许可证都要按运行资源审查，不能只按文件名清理。
- `build.mjs` 的输入是 `src/material-web.js`、`src/three-bundle.js`、`src/workspace/index.tsx` 和 `src/workspace/theme.css`；输出会覆盖 `static/vendor/` 下 bundle/许可证以及 `static/workspace-v73.js`、`static/workspace-v73.css`。构建或 `npm run check` 前须核对这些目标的工作树状态。

### 测试与发布包边界

- `tests/` 是测试源码；仓库中未发现测试目录内的 `.xlsx`、`.csv`、`.tsv` 或 `.zip` 表格/归档样例。`.gitignore` 没有忽略 `tests/`，这能保留测试源码供版本管理，不会让它们自动进入发布包。
- `tools/deploy_gui.py` 的 `build_release_package()` 明确复制服务端白名单文件和 `vendor/`，并递归复制 `static/`。预检现会拒绝静态目录内的表格和常见凭据文件，复制时排除日志、缓存和已确认的开发文本；`tests/`、根目录文档和 `qa-artifacts/` 不进入包。新静态文件仍须逐项审查运行用途。
- `tests/release_package_smoke.py` 读取已存在的 ZIP，核对必需资源、数据/测试材料排除，并在临时目录启动服务。本轮对本地 dry-run 产生的包运行，隔离健康与静态资源检查通过；未部署。

### 本轮已确认的清理

- `static/GEOMETRY_TEST.txt` 仅含旧图片尺寸 QA 输出；`static/README.txt` 仅含旧媒体比例修复记录。两者无运行/构建引用，均为未跟踪文件，已从 `static/` 删除。相关功能与测试代码保留。
- 新建但尚未接入的 `ai_capabilities.py` 草稿模块已按用户“先拆架构，再加功能”的新顺序删除；未来 AI 边界记录在 `docs/LIFECYCLE_ARCHITECTURE_PLAN.md`。

### 可执行的后续清单

1. 继续核对 `scratch/`、`qa-artifacts/`、`dist/`、`scripts/` 中归档包，以及 `deployments/` 内资料的保留与再生成方式；不能只按目录名删除。`_finalcheck.txt` 包含素材清单，尚未确认是否为用户交接记录，暂保留。
2. 发布打包器的静态资源复制改为经过核对的资源清单，或增加有证据的排除规则；明确 `static/` 下非运行 QA/调试材料不能随包分发。改规则时检查 HTML/CSS/JS 间接资源、许可证和业务素材。
3. 测试表格样例如需长期保留，应放在明确的测试 fixture 目录并在包清单中明确排除；如含真实业务数据，先改为合成数据。测试源码继续纳入仓库，不以宽泛忽略 `tests/` 的方式解决发布包边界。
4. 后续新增忽略规则应只覆盖已确认可再生的缓存/临时输出；`.gitignore` 当前已覆盖依赖缓存、数据目录、QA 输出、日志与 `dist/`。忽略规则不会阻止打包器复制文件，也不构成删除授权。

## 2026-09-28 维护复核

- 复核 `static/GEOMETRY_TEST.txt`、`static/README.txt` 与 `static/README.md`：前两项当前缺失且 Git 无跟踪记录；仓库内命中仅为打包排除规则、历史记录和卫生说明。它们无需再次删除，排除规则可继续防止同名开发文件进入包。
- 本轮没有发现满足安全删除条件的新文件。保留历史部署目录与归档包、`scratch/`、`tests/tmp*`、`_finalcheck.txt`、`askpass*.bat` 及其测试脚本、由测试引用的 `scratch/project-pdf-text-layer-prototype.png`；这些分别涉及部署证据、QA/用户内容、材料清单、凭据风险或测试依赖，需先明确归属和保留策略。
- 对 `dist/releases/frameforge-release-20260926-2213-4b7a7d03.zip` 执行 `python tests/release_package_smoke.py ...` 失败，原因是包内缺少 `project_pdf_roundtrip.py`。该归档早于当前工程 PDF 模块，应视为历史包，不用于当前发布验收。本轮未重建发布包，也未部署；当前工作树有大量未提交修改，构建和打包前必须先审查输出覆盖范围。此前已通过的本地 dry-run 发布包检查记录仍指向另一份候选包。
- 下一步：代码冻结后，从当前源码生成隔离的候选发布包并重跑发布清单测试；对 `deployments/`、`scratch/` 与被权限保护的测试临时目录逐项确认负责人、来源和保留期限，在确认前继续保留。
