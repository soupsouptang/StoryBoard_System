# FrameForge storyboard-system 工作规则

## 指令与操作边界

- 遵循当前对话中用户最近一次明确指令；用户指令优先于本文件。当前明确要求不部署，除非用户之后明确改口，否则不要执行会改动线上服务的命令。允许本地构建、隔离数据下的测试及只读核查。
- 用户要求整理或删除时，先列出候选文件并用引用、构建入口、Git 状态和数据归属核实用途。未知来源、用户内容、素材、备份和运行数据要保留；不要用 `git clean`、递归删除或批量移动代替逐项核对。
- 不覆盖已有工作。操作前看 `git status --short`；构建前确认生成物是否有未提交修改。
- 针对改变的数据契约和交互路径运行必要的隔离测试；说明实际运行的命令和结果，不用测试替代真实浏览器视觉验收。

## 项目与运行数据边界

- `server.py` 及其 SQLite/静态前端依赖现在只作为 Legacy 功能参考和临时工程导出桥接，不再要求 VNext 保留旧 API、旧 session、旧数据库或旧运行时契约。仅允许为“旧工程导出文件 → VNext 可映射导入”所必需的 Legacy 导出源码、测试和安全修复做窄范围修改。
- `static/index.html` 加载 `static/app.js`、工作区 bundle 和多份功能脚本、样式及媒体资源。不得仅因名称相似或位于 `static/` 就认定文件未使用。
- 运行数据由 `STORYBOARD_DATA_ROOT` 决定，含 `storyboard.db`、`media/`、`exports/`、`import_staging/`、`avatars/`。旧数据库/旧工程数据不做迁移或回填；开发与测试只使用隔离/合成数据。真实旧工程仅在用户主动使用 Legacy 导出器生成便携工程文件时进入桥接流程，不直接读取其数据库给 VNext。
- 保留真实 Excel 导入能力，包括 `.xlsx` 解析、字段映射、嵌入图片和原始导入列。不要用“只支持 CSV”替代，不要删除真实工作簿回归覆盖。旧工程唯一跨版本兼容要求是 Legacy 可导出一个便携工程文件，VNext 能按明确 mapping 导入；必要时允许修改 Legacy exporter 以生成该合同。真实工作簿/真实工程文件不得复制进源码或发布包，回归使用脱敏或合成 fixture。

## 源码、构建产物与发布包

- 前端构建输入为 `src/material-web.js`、`src/three-bundle.js`、`src/workspace/**` 和 `packages/ui/src/**`。`npm run build` 以及会调用它的 `npm run check` 会覆盖 `static/workspace-v73.js`、`static/workspace-v73.css` 和 `static/vendor/` 生成文件；运行前确认这些目标没有用户改动。
- `static/` 混有手写运行资源、构建输出、第三方资产、许可和媒体。只根据具体引用关系和生成命令分类；不要整目录清理或盲目重建。
- `tests/`、测试夹具和测试表格只用于开发/验收，禁止进入发布包。修改打包规则时用发布清单明确允许的运行文件，并检查静态目录内递归资源；`.gitignore` 只控制 Git 状态，不会阻止打包器复制文件。
- `data/`、`.qa-data/`、`.qa-live/`、`qa-artifacts/`、`dist/`、`deployments/`、`scratch/`、`merge-backups/`、`node_modules/` 和 `.npm-cache/` 可能含用户数据、诊断证据、历史包或可重建依赖。忽略或命名为临时不等于可以删除。

## 验收

- Python 回归入口：`python -m unittest discover -s tests -v`。先确认测试隔离在临时目录，不触碰项目或线上 `data/`。
- 表格列管理可用 `python tests/run_column_lifecycle_browser_qa.py` 验证；相关状态级检查在 `tests/column_manager_qa.cjs`。根据改动选择有针对性的浏览器 QA，不因某个脚本通过就宣称所有视觉状态正确。
- 视觉/UI 改动要在浏览器查看实际渲染并保存/检查截图。表格相关改动的截图验收必须包含列管理弹出面板，以及列标题/单元格右键菜单的打开、可见范围、交互和关闭状态；检查窄屏/滚动下没有裁切或遮挡。只看 CSS 或无头断言不算完成视觉验收。
- 改动 Excel 导入时，覆盖真实工作簿回归（若本机附件存在）和合成夹具；检查表头定位、行数、字段映射、嵌入图像及原始列。报告附件缺失导致跳过的项目，不要把它说成已通过。
