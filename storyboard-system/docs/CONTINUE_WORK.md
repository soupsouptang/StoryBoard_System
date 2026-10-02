# FRAMEFORGE 续作入口

## 最新代码检查点：`095fb7a`（2026-10-02）

已按用户“再次读取新要求并修改”实施并上传至 `soupsouptang/StoryBoard_System master`。本节覆盖下文历史切片中的旧状态；**不是完整 VNext 产品完成声明**。详见 [数据库实施记录 §9](VNEXT_DATABASE_IMPLEMENTATION_2026-10-02.md#9-非破坏图片三类列与交付字段第六段)。

- 非破坏图片构图：独立展示元数据、原图保留、素材/画面/项目 owner、裁剪旋转翻转/拉直/缩放/透视、局部草稿 undo/redo；Review 实际 Before/After 图片。内容版本 schema2 剔除布局与批注/审阅独立历史。
- 9 内置 /20 预设 /N 自定义列目录及四区管理；新项目创建9内置定义。最新列模型合同覆盖旧三列禁止普通删除要求：**镜号/时码/分镜画面可软删除恢复，全部9内置禁止 Purge/hard-delete**；三列复制/剪切保护继续保留。
- 交付独立字段搜索/分组选取、CSV/XLSX/DOCX/PDF 同一服务端 allowlist、真实 PDF 逐页预览；按稳定列 ID 保存/读取交付模板及 revision 冲突，永久删除自定义列同步清模板引用。EDL/OTIO/SRT 标记协议必需。
- 代码检查：后端完整 **125 passed**（1项框架弃用 warning）、Web production build/TypeScript、package boundary、Regression Guard、diff whitespace 均通过。PostgreSQL16 空库→19条迁移→head `b03e7a42f185`、并发/CAS/FK/UTC/水位/事务回滚、`pg_dump/pg_restore` 和模板稳定 ID恢复已实际通过；此前 UTC 提交 `cf26947` 的 GitHub PostgreSQL CI 已核实成功，本新提交 CI 须以实际 Actions 为准。
- 合成页面验收：内置列删除恢复、预设添加、图片构图保存/取消、原图不变、真实左右图、交付模板保存刷新读取、PDF预览。裁剪弹窗320/375/768/1024/1440根页面无横向溢出；不代表全站全部主题/交互验收。

**下一步明确待办**：10项预设 pending 语义映射；预设永久删除及历史/导出产物/任务/媒体/cache/undo引用闭包；四区回收站完整Purge入口；导入稳定ID/catalog映射；全项目undo/restore/merge与灯光持久化；完整成员/分享权限和outbox发送；所有媒体组件独立构图UI/历史引用GC；导出完整版式/水印/工程文件合同。交付模板本段仅保存字段选择，不含完整版式/profile版本。

运行验收仅使用独立3002/8002和55432合成数据库，结束后已停止本轮临时服务；原有3001进程未改接合成数据。不访问Legacy数据库，不部署。未知 `:memory:.ses` 保留且未上传。再次开工先读取本文、根AGENTS、最新远端MD，再根据上述待办追踪真实owner。

## 基础设施续作（2026-10-02）

基础设施提交 `a518ea1` 与修复提交 `7229447`、`07bcc4c` 已推送 `master`。修复包括 PostgreSQL rehearsal 合成 `SECRET_KEY`、Regression Guard 所需三份台账、Web 裁剪依赖和文档变更触发 CI。修复后 Actions 结果因 GitHub API TLS 与浏览器读取失败而尚未核实。本轮不部署。执行记录见 [基础设施整改 worklog](worklogs/INFRASTRUCTURE_REMEDIATION_2026-10-02.md)。

更新日期：2026-10-02（Asia/Hong_Kong）。用户要求：先上传现有代码，再上传续作 MD；**每次开始工作必须先读取本文**。本文是续作索引和检查点，不替代当前用户指令、架构规则或详细功能方案。

**最新追加需求已实施并上传代码 `b2ad7b5`、`64dad10`**：表头“删除此列”及二次确认；镜号/时码/分镜画面禁止删除并提示；表格统一14px、多行18字上限与17字加“...”、标点不在新行行首。详见[本轮文档§5](SHOT_COLUMNS_MENUS_2026-10-02.md#5-用户验收后的追加需求已确认并实施)。搜索框居中、八项工具全部左侧8px间距及最新顺序见同文档§6。本批复用已有列状态，无DDL；完整新版功能与数据库设计仍有后续任务。

## 1. 每次开工顺序

2026-10-02 数据库续作增量：`57bea59` 统一项目列和值，`212a388` 增加共享行高策略/builtin 生命周期/outbox；新增批注个人水位/用户色/revision 实施详见 [VNext 数据库实施记录](VNEXT_DATABASE_IMPLEMENTATION_2026-10-02.md)。旧“本轮无DDL/待单独确认”是历史切片，不覆盖用户已明确授权完善数据库。最新用户确认项目级全要素版本（情绪板除外）、镜头级比较及全要素撤销重做；图片资产管理分别解耦实施。基础设施整改由 Luna 新会话推进，避免覆盖其 runtime/CI/Docker/Legacy 收敛改动。不部署。

1. 先读本文及根 `AGENTS.md`；修改具体目录时读最近的 `AGENTS.md`。
2. 检查 `git status --short`、branch、HEAD；fetch 后核对远端增量。保留其他会话的 dirty、stash、worktree 和未知文件，禁止强推或破坏性清理。
3. 读 [当前协调账本](ACTIVE_WORKSTREAMS.md) 与 [owner 矩阵](CANONICAL_OWNER_MATRIX.md)，再读任务涉及的下列方案。
4. 按最新明确用户决定、实际代码和证据解决差异；历史执行记录不覆盖较新的产品决定。
5. 选一个范围清晰的任务，追踪真实 Web → API → service → persistence 链，复用已有 owner。只用隔离合成数据，不部署或操作生产。
6. 做针对检查和真实消费者验证，更新准确状态，提交并非强制上传；停点更新本文。新提交 SHA 用 Git 查询，不能从旧文档猜测。

| 文档 | 用途 |
| --- | --- |
| [本轮列/菜单执行与续作](SHOT_COLUMNS_MENUS_2026-10-02.md) | 最新确认的表头/行菜单、整列操作、工具条及实际验收；冲突处优先于早稿 |
| [完整功能/UI/动画计划](FEATURE_UI_PLAN_2026-10-02.md) | 当前产品要求和实施路线，尤其 §1.1 最新决定 |
| [VNext 数据库计划](UI_DATABASE_PLAN_2026-10-02.md) | 新系统 schema/持久化设计，仍需确认与演练 |
| [原交接](HANDOFF_2026-10-02.md) | 其他会话交接、历史环境与尚未完成事项；历史 PID/路径不可直接当作当前值 |
| [需求清单](CONFIRMED_UI_REQUIREMENTS_2026-10-02.md) | 原编号需求及镜号/拖拽追加要求；冲突时依最新方案处理 |
| [执行记录](UI_REQUIREMENTS_EXECUTION_2026-10-02.md) | 已实现和实际验证证据，不等于新版方案全量完成 |
| [视觉基线](SHADCN_UI_BASELINE.md)、[桌面验收](DESKTOP_UI_ACCEPTANCE.md) | New York/neutral 和真实浏览器验收要求 |
| [原桌面审计](audits/DESKTOP_UI_AUDIT_2026-10-02.md) | 旧检查点的 FAIL 证据，不能因新代码上传而改成 PASS |

## 2. 已上传代码检查点

仓库 `soupsouptang/StoryBoard_System`，主分支 **master**。

- 最新实现提交：`64dad10`（搜索框居中、八项工具全部靠左/8px统一间距及新顺序，覆盖中间布局eeefa93）；Web类型与五种宽度的实际居中/无重叠检查通过，已非强制上传。
- 追加删除/文字提交：`b2ad7b5`（删除确认/三列保护、14px与多行标点截断）；定向检查与真实浏览器验证完成，已非强制上传。
- 前一批实现提交：`4ebb3ae`（表头/行菜单、整列原子复制、新增/改名、剪切位置、排序、四列排除与工具条）；已非强制上传。详见本轮执行文档。
- 上一轮实现提交：`cb5a818`（document OCR、Shot commands、镜号拖拽）。
- 合入并行文档后的上传检查点：`f172add`；上传成功，包含远端截至 `f04292b` 的架构和计划增量。
- 后续本文/启动规则另行提交；读取时以实际 Git HEAD 和远端为准。
- 上传只保存当前实现，不代表完整产品、全部视觉、PostgreSQL 或发布验收完成。

| 已有能力 | 实际消费链 / 本轮状态 |
| --- | --- |
| 单选/Shift 区间/Ctrl 或 Command 多选、筛选结果全选 | 共用 workspace selection；真实合成浏览器检查过 |
| 行内新增、冻结列、单条/成组重排 | V-Web table → V-API ShotService；已有 revision/完整顺序/事务保护；部分视觉门槛未齐 |
| 排序后镜号连续编号 | 完整项目排序后 `001…`，内部 Shot ID/素材关联保持；真实排序和合同验证过 |
| 镜号与六点手柄整体拖拽 | 同一个按钮，共用拖拽和点击选择；悬停统一圆角背景已有 CSS，尚缺独立悬停/叠卡拖动中截图 |
| 右键相对插入、复制/剪切/粘贴、旁白计时 | 真实权限/revision/审计/事务和系统剪贴板；本轮统一为上插/下插、复制、剪切、向下粘贴；移除独立复制；详见新执行文档 |
| XLSX/DOCX/PDF 导入导出 | ImportModal/交付页 → document_import/document_export/ImportService；真实文件回读和浏览器消费；导入目前 append |
| JPG/PNG、扫描 PDF OCR | RapidOCR 1.4.4，内置 Paddle PP-OCRv4 mobile ONNX，CPU 本地识别；JPG/PNG 仅导入识别，不提供导出 |
| 导入图片和失败补偿 | 原图/源文本保留；图片和 Shot 由外层事务统一提交，失败清理本事务新文件；未新增 DDL |

OCR 当前限制：40 MB/文件、10000 行、200 列、PDF 30 页、图片 10 MB/2000 万像素；识别结果先预览、人工映射。当前单进程共享 CPU 引擎并串行识别，持续并发应接已有任务队列。扫描表格结构自动完整还原尚未实现。

## 3. 已核实证据与未通过门槛

- Web TypeScript、`shot-row-drag.cjs`、`shot-context-menu.cjs`、`bulk-controls.cjs` 针对检查通过。
- 后端定向检查覆盖 `test_document_formats.py`、`test_shot_relative_commands.py`、导入、事务回执/图片补偿、CRUD/reorder 及 patch/no-op/conflict；最后 patch 与导入回归 13 项通过。此为分批结果，不宣称全测试套件通过。
- 真实浏览器合成项目完成排序/复制/剪切/粘贴/单条 VO 计时、Excel 和 PNG OCR 导入；实际下载 XLSX/DOCX/PDF 再解析，保留字段与图片。
- 1440/1024/768/375/320 的表格页面检查无根页面横向溢出；列管理、表头/行菜单及窄屏菜单有部分证据。新工作按当前桌面验收范围执行，旧窄屏检查不是全功能视觉通过。
- 悬停及叠卡拖动中截图、Dialog 完整 focus return、全部交互/明暗/动效仍未全验收。Docker 配置已改但未构建；PostgreSQL 并发与新 schema 验收未完成。
- 真实 V4 工作簿检查因指定本机附件缺失按设计跳过；合成嵌图工作簿已验证。禁止上传真实工作簿或媒体。
- 新增 `tools/package_boundary_gate.py` 已实际运行通过。GitHub CI 结果须下一次现场核查，不凭本地通过推断。

## 4. 新架构与现有代码的差异（接手必须处理）

已合入的 `577b3d2`/`f04292b` 确立 **VNext 原生重构**：旧数据库/数据不迁移，旧 API/session/runtime 兼容不做；仅保留 Legacy 便携工程 exporter → VNext importer 的文件映射。

1. `legacy_import_adapter.py` 当前动态读取 Legacy 三个纯模块，容器也复制这些文件。这是上传代码的实际依赖，**不符合最终原生边界**。后续把必要纯逻辑收敛至已有应用/包 owner，删除动态 Legacy 依赖；只保留必要便携工程 exporter。不要新建 `common/shared/utils` 包，根 packages 只允许 ui/types/contracts/timecode。
2. 本轮用户明确保留剪切，菜单统一为行：上插镜头/下插镜头/复制/剪切/向下粘贴；列：前插列/后插列/复制/剪切/向后粘贴。已完成，覆盖早稿“移除域剪切、上下双向粘贴”。输入框原生文本操作不受影响，继续复用相对命令/revision owner。
3. 当前默认预设列、空列/批注占位及完整回收站/永久删除闭包仍未齐；本批已把自定义列“归档”改为可恢复的“删除”，表头接入普通列删除/恢复，三列受保护。删除历史内容的不可逆操作须按方案确认，不能仅换按钮文案。
4. 当前导出为真实文档字节，但六版式、字段选取、工程附件/QR/DM、便携 ZIP、可见及隐写水印仍未完整。真实文件下载不能证明这些能力已完成。

## 5. 后续计划

| 分类 | 下一步 | 门槛 |
| --- | --- | --- |
| 页面 | 本轮右键/列显示完成；补镜号悬停/叠卡证据；按功能计划恢复 Inspector、四视图 TC/图片、共享尺寸和设置 | 每小段真实桌面 UI/键盘/焦点/保存验证；保留原 FAIL 证据 |
| 程序 | 先收敛动态 Legacy 纯模块依赖；再做导入 update/replace、便携工程文件往返、完整导出和队列 | 复用 Web/API/services；权限、409、ack、审计与失败回滚保持 |
| 数据库 | 独立确认批注个人已读/最后用户颜色、列语义与生命周期、共享视图等 VNext schema；用户确认后用 Alembic 和空 PostgreSQL 演练 | 本轮无 DDL；不做旧 SQLite backfill；需求 11 数据设计必须最后提醒用户 |
| 治理 | 现场核查剩余分支/PR/CI、其他会话和自动化实际状态 | 有效增量审阅整合后才删除分支；不按历史标题/PID推断 |

## 6. 本地续作注意

- 当前工作区仓库为 `work/StoryBoard_System`。另一个交接中的 `work/FrameForge` 和相关 worktree 属于其他环境/会话，不混用或清理。
- 本轮 Web/API 验收地址为本机 `127.0.0.1:3001` / `127.0.0.1:8001`。服务是否仍运行、加载哪一提交需重新检查；文档不保证进程存活。本轮 API 已重载实现提交b2ad7b5；Web开发服务运行最新代码。下次仍须现场核对，不能依历史PID启动/停止。
- 本轮独立合成项目 `b8035d24-2937-42b9-9e32-1e9e6301e14f`；此前 `383170ee-28de-4e1a-aaed-f76edba6ba3c` 亦为历史合成验收项目；保留用户原浏览器页和草稿。登录配置留本机，凭据不写本文或公开仓库。
- 本轮截图在工作区 `outputs/column-qa-2026-10-02/column-menu-desktop.jpg`；追加删除/文字检查截图清单见执行文档§5；本批约1440/1024/768/375/320暗色定向验收，不代表全部功能/主题通过。旧验收截图保存在本地 `frameforge-qa/table-{1440,1024,768,375,320}.jpg`、`mirror-drag-final.jpg`；详细证据见执行记录，不假定新主机存在这些文件。
- 仓库有未跟踪 `:memory:.ses`，未上传、未删除；先核查来源，禁止 `git add .` 带入。
- 本次没有新建额度等待、没有兑换重置券、没有重复创建云端任务。用户已重置额度；未来需等待时查真实 reset，仅安排单次恢复后续作，不每 15 分钟轮询。

**停点结论：本轮列/菜单/工具条与追加删除/文字代码已上传、定向检查与真实浏览器验收完成；后续先读本文及本轮执行文档；新版功能、视觉及 VNext 数据库验收仍有待办。**

GitHub `095fb7a` 已核实：FRAMEFORGE CI、PostgreSQL Migration Rehearsal、Safety Invariants成功；Regression Guard因裁剪重构未同步两份parity台账失败。后续文档补齐PRODUCT_PARITY_MATRIX和SCREEN_PARITY_MATRIX，必须以完整基线差异重跑guard，并核实新推送结果；不抹除该次失败记录。

补充实际结果：补齐台账后，以 `93c98f4` 为base的完整本地Regression Guard通过；GitHub文档提交 `cd9536d` 的Regression Guard亦已核实成功。代码 `095fb7a` 的构建/PostgreSQL/安全成功证据保持；文档提交的额外FRAMEFORGE CI查询时仍queued。
