# FrameForge VNext 原生重构工作簿

## 2026-10-04 扩展性需求重写与已确认产品规则

[总纲v2](VNEXT_MAX_EXTENSIBILITY_REQUIREMENTS.md)按最新用户要求重写，明确Entity真正从属与typed link边界。用户重新确认：全部9内置列默认可见/内置禁止Purge；同共享view布局及筛选/排序/分组同步；显式团队资源身份跨项目冲突；Scene要求动态继承且逐项覆盖；环境镜头显式值优先，否则主值附差异。Q-05资源数量合并待回答，不暂停其他明确包。

知识层与执行标准、岗位输入、实施计划和29包JSON配套，只读校验器检查依赖/证据/待确认门槛；目前没有新增产品PASS/PG/浏览器证据。远端详情及五列UI增量已快进保留，现有UI仍由montblanc08最新修改主导；本轮只提交文档与清单工具，旧代码/依赖草稿和未脱敏审计保持本地。

## 2026-10-04 分镜详情卡片与图片预览

最新本机部署已按用户授权恢复：原API退出后，先pg_dump备份、恢复副本及空库→官方Alembic head c14f8a63b920演练，原35张业务表数量/逐行哈希保持，再升级本机PG并后台启动8002 API与3002 Web。现有项目/媒体保留、同源健康200、真实项目大厅/12镜头合成详情已加载。最新`.next/detail-method-verified`卡片实机470px、宽屏六等宽列，辅助十项两列五行96px、11px/12px框完整不折行/无独立滚动，Esc两次丢弃未提交草稿通过。此处仅更新本机部署与当前UI证据，不代表画板UI/全站cutover或公网发布；详见本轮记录最新段落。

本会话按用户确认范围接通表格行下方详情卡片、原子保存、图片预览。最新视觉追加：最新卡片本体至少470px／实测四行高，最新内容距卡片边缘16px、各独立字段横纵间距16px；最新左侧图片按比例适配内容区高度且不参与右侧滚动，右侧按实际可用宽度最多六个等宽列，镜号/时码在同一列中等宽并排、标题单列、制作方式跨两行，长文本项占两列两行、输入框固定128px并支持滚轮/光标阅读全文；卡片直角单层外框，短屏由内容区滚动借空间。React Query/现有workspace store/本地草稿各自保持单一owner；新增ShotDetailService只编排既有Shot/CustomField/PanelMedia命令，一次保存一条项目历史。没有新DDL或Legacy功能实现。已快进合入远端e778c1c的8个增量；其Web/UI diff为空，保留全部画板后端及扩展性合同。

本会话写集仅分镜表页、详情/图片组件及相关hook/store/显式zoom图标，详情命令schema/service/router/history label、针对测试和台账；排除项目入口、导航、画板/灯光/情绪板、导出及导入UI。最新UI以用户明确任务和montblanc08贡献优先，未用旧文件覆盖远端UI。146项完整后端、生产Webpack/TypeScript、6份定向前端检查通过。最新四行/六等宽列/固定左图已构建/详情消费者检查、2560/1440/1024/768/375/320实测6/3/2/2/1/1列、470px且无横向溢出；右侧滚动147px左图位置尺寸不变，长文两列两行、固定输入尺寸及滚轮/光标实机可读。此前首次Esc询问/再次Esc丢弃未保存标题，原值保留。最新制作方式中文名统一为用户给定十个四字名称，辅助组11px/12px复选框、两列五行完整不折行、无独立滚动；getMethodLabel继续唯一显示owner，原枚举/保存保持，相关新增/批量/旧Inspector回归harness接入实际resolver。此前辅助项滚动是旧版历史证据，由最新完整展示覆盖，Esc证据保持。五列追加已生产构建/详情消费者检查，并于1440/1200/1024/768/375/320宽度验证5/4/3/3/2/1列、352px卡片、均等间距及无溢出；临时标题Esc丢弃后原值保留。真实3002已验证原子字段保存/一次undo、取消/Esc、末行上滚、焦点返回、五宽度、预览50–300%与内容区居中、列管理及表头/单元格菜单。浏览器选文件受Chrome扩展file URL权限阻挡；下载点击未取得自动化完成回执，两个实机门槛仍待核对，不宣称全站或生产验收。详见[本轮记录](SHOT_DETAIL_2026-10-04.md)。


## 2026-10-04 后端续作边界

画板后端/新迁移/唯一项目历史整合定向 18 项通过，新增跨用户引用撤销保护。最新授权扩大为仅补缺失的 Lighting/Moodboard UI；现有 UI 不覆盖，新增页面待真实桌面横屏验收。导入冲突策略与工程 PDF 实际扫码继续修复，未声称全量完成。

UI 修改权威来源为 GitHub 用户 `montblanc08`；主执行者本轮只改后端、测试和文档，新增前端合同交接给 UI 负责人，禁止覆盖其最新 UI 提交。账号归属须用 GitHub 核对。

已同步远端 `f291433`，复用现有项目HistoryService。主执行者接手后端/测试/文档，本轮不改UI、不设全站UI冻结；保护已确认界面与其他会话改动。扩展性子agent仅写独立新需求方案。画板/导入/导出中断草稿正在验收，未宣布完成。前端合同缺口、允许写入范围及防覆盖规则见 [后端衔接账本](BACKEND_FRONTEND_HANDOFF_2026-10-04.md)。

## 2026-10-03 项目撤销与重做

用户确认的现有VNext操作持久undo/redo已接通：用户＋项目最近100步，通用快捷键，个人列布局PG确认，列新增/复制＋位置一条事务。HistoryService/get_db沿用既有service/权限/审计/outbox，Alembic a83f02c1d765；冲突整步409、purge清全项目历史、源文件不变。完整后端137 passed，Next生产构建/TypeScript、PG空库/副本、真实浏览器五宽度通过。用户已明确授权soupsouptang仓库master；重新fetch核对后成功快进上传至1d6018a，包含代码74f76a2、续作MD和此前未同步提交，历史未改写。最终同步状态MD另行上传；下方待授权/未上传状态是历史检查点，最新以CONTINUE_WORK为准。原生Moodboard/Lighting、完整项目restore/merge及既有RBAC/发送worker等待办不因此完成。详见[实施记录](PROJECT_HISTORY_2026-10-03.md)。

## 2026-10-03 已选数量对齐

代码`eeddeb5`仅调整表格页视图导航与“已选 N”的共同flex容器为垂直居中。实际1440px两段文字top／height／center一致，五宽度无根溢出，原字号／颜色／计数保持。针对检查、生产构建与Regression Guard通过，3002预览已更新；详情见CONTINUE_WORK。代码和MD仅本地提交，GitHub目的地／分支审批限制仍在，未知`:memory:.ses`保留。

## 2026-10-03 视频全列导入样本

用户视频样本请求完成：正常本机 API 新建独立 `HERO_SAMPLE_20261003` 项目，97候选分镜／97真实抽帧／11491帧（30fps，00:06:23:01）；一份34列 XLSX 和30／30／30／7页四卷 PDF 已生成并验证真实导入预览，Excel实际导入成功。10个 pending 预设用对应自定义列，不更改 owner 或 DDL；字幕为离线OCR抽样，摄影和分工信息标记为重拍建议／待核对。页面97图全部加载、保存视图“视频全列样本”成功。输出与用户媒体仅留本机工作区，不进入Git；续作MD本地提交，GitHub具体目的地／分支仍受此前自动审批限制。详见CONTINUE_WORK；不扩展未确认产品任务。

## 2026-10-03 本会话新增镜头与悬浮卡片增量

执行者本会话；最新`cc1a213`：项目信息新增总时长/显示有效镜头时长，按项目fps/drop_frame精确到帧，排除废纸篓；视图数量统一“总共N镜头（其中显示N镜头）”，两处4ch等宽占位。ProductionShotSummary只派生现有查询缓存和filters，表/卡片筛选共用shot-display纯函数，未增加数据owner/API/DDL。此前新增卡片/Esc、无单位秒/显式f帧及单位说明16px对齐保持。针对三份前端检查、生产构建/TypeScript、Regression Guard、五宽度真实表格和卡片搜索验证通过；3002最新预览保留，全部106/106，总时长00:05:05:07。代码已先本地提交，MD随后提交；GitHub具体目的地/分支仍受自动审批拒绝阻挡，等待用户授权。额度heartbeat已删除，不扩展旧产品待办。证据与续作步骤见CONTINUE_WORK。

## 2026-10-02 原生数据库 / 媒体 / 列 / 导出增量

本轮原生增量：UTC PostgreSQL 在线演练；非破坏图片展示记录、实际左右图对比；9 Built-in /20 Preset /N Custom 分类和内置列 SQL/API Purge 保护；独立导出字段 allowlist、PDF 逐页预览、项目交付模板。Alembic 管 schema，既有命令 service 管事务。三列“禁止普通删除”旧规则由最新列模型合同覆盖：现允许软删除/恢复，禁止永久删除；复制/剪切保护仍保留。

仅在隔离合成数据库/端口验证；没有 Legacy 数据迁移或部署。10 个 pending 预设映射、预设 Purge 依赖/历史清理闭包、全项目 undo/restore/merge、成员权限与推送 worker 仍未完成。最终检查证据见续作入口和 VNext 数据库实施记录；不将该增量标成整个产品完成。


## 2026-10-02 基础设施与 CI 检查点（`a518ea1`）

- `a518ea1` 已推送至 `master`：API/worker/Web 运行时和镜像对齐，Python 依赖按哈希锁定，Web 采用 Next standalone 镜像，Alembic 为 schema 唯一 owner；认证使用 Argon2id/JWT、启动不再自动建表；Nginx WebSocket/CSP 与同源 API 路由已调整。
- 本地证据：完整后端 70 项通过，Web production build、项目文件合同、静态安全守卫、Nginx 配置合同及 workflow YAML 解析通过；Docker 本机不可用，因此镜像构建交由 GitHub Actions 验证。以上不代表生产部署或生产数据库验证。
- 首次 GitHub CI 摘要中，API/worker/Web 镜像与 Nginx 检查通过；PostgreSQL rehearsal 因缺少必需的合成 `SECRET_KEY` 失败，workflow 已补；Regression Guard 要求基础设施安全变更同时更新本账本、owner 与 API route inventory。对应文档将在后续修复提交补齐。
- Web build 的 setup 阶段与旧版生成产物守卫当时报告 runner setup 失败，未取得可读 step log；本环境无 `gh`，GitHub REST 请求 TLS 不通，需以新推送后的 Actions 结果复核，不能断言根因或已通过。

详见 [基础设施整改执行记录](worklogs/INFRASTRUCTURE_REMEDIATION_2026-10-02.md)。

每次开工先读 [续作入口](CONTINUE_WORK.md)，再核对本账本、owner 矩阵及最新用户决定。

## 2026-10-02 当前协调检查点

- 最新布局追加 `64dad10`（覆盖中间布局eeefa93）：搜索框内容区居中；八项工具全部靠左、8px统一间距，按导入/筛选分组/保存视图/冻结列/自定义列/列管理/详情/废纸篓排列；Web类型和五宽度真实居中/无重叠检查通过。详见执行文档§6。

- 最新追加实现 `b2ad7b5` 已上传：列删除确认/恢复、镜号/时码/分镜画面删除保护、表格14px、多行18字/17字加点号与标点换行；无DDL。Web类型、边界、6份前端定向检查、5项后端和五种宽度真实合成浏览器检查通过；细节见[执行文档§5](SHOT_COLUMNS_MENUS_2026-10-02.md#5-用户验收后的追加需求已确认并实施)。完整产品与数据库验收仍有待办。

- 最新本轮实现 `4ebb3ae` 已上传；[列/菜单执行文档](SHOT_COLUMNS_MENUS_2026-10-02.md)记录表头/行菜单、整列复制/剪切、四列排除、排序与工具条。Web类型/边界、前端定向检查、后端4项和1440暗色真实合成桌面验收通过；仅该范围，整体仍未cutover。

- **最新架构决定：停止 Legacy 兼容迁移。旧工程数据库/数据不迁，旧 API/session/runtime 不兼容；VNext 直接原生重构。唯一保留的跨版本兼容面是 Legacy 导出的便携工程文件可被 VNext 映射导入，允许为此窄范围修改 Legacy exporter 源码与测试。**
- 本地与远端主分支同步到 `2fde7c4` 后，以该SHA完成1440×900桌面现状采集；审计/13张合成截图/流程/工程码协议/基线修订已推送 `751e4b2`。完整UI仍 FAIL / BLOCKED_VISUAL，不部署。
- [功能/UI/动画计划](FEATURE_UI_PLAN_2026-10-02.md)及[新系统数据库结构计划](UI_DATABASE_PLAN_2026-10-02.md)承接最新完整需求；是后续实施合同，不是已完成清单。根 `packages/ui`、API服务、SavedView等现有owner继续复用。
- 最新决定：无归档；删除入回收站保留快照，永久删除确认后清除历史内容；基础列默认/预设手加；自定义及自动列宽/行高、全员共享视图；本轮保留Ctrl/Cmd+C/X/V及行剪切/向下粘贴、列剪切/向后粘贴，移除独立duplicate（覆盖早稿移除域剪切/双向粘贴）；适用交互均设计动画，不新增Reduced motion模式；整行照片封面硬保留。
- 下方旧日期的归档、九项镜头菜单、宽屏之外验收和旧界面事实均是历史记录，不能覆盖最新决定与本轮截图。
- 尚未吸收的4条远端治理/对等分支保留至摘取有效增量后再删；14条已清理分支不重复删除。原始截图与本地stash保留，不纳入发布包。

## 2026-10-02 代码上传检查点（cb5a818）

| 范围 | 当前 owner / 证据 | 剩余门槛 | 状态 |
| --- | --- | --- | --- |
| 镜头表及右键命令 | V-Web 单一选择、行内草稿、冻结列、镜号/六点统一拖拽；V-API ShotService 完整顺序/revision/审计事务及连续编号；真实合成浏览器复制/粘贴/剪切/计时与五种宽度检查，详见执行记录 | 本轮已移除独立复制并保留剪切/向下粘贴；列菜单与整列操作已接通；叠卡/悬停视觉、多 Panel 对等继续待验 | INTEGRATED_NOT_CUT_OVER；部分视觉门槛未齐 |
| 文档及 OCR | V-Web ImportModal/交付导出 → V-API document_import/document_export/ImportService；复用三个 Legacy 纯模块；三格式下载回读、Excel/PNG 浏览器入库、扫描 PDF/JPG 后端真实 OCR、失败文件回滚 | append 以外导入模式、生产 OCR 队列/媒体持久迁移、容器构建 | INTEGRATED_NOT_CUT_OVER |
| 数据库待确认 | 需求 8 个人已读/颜色；需求 11 待确认语义。独立方案 UI_DATABASE_PLAN_2026-10-02.md | 用户单独确认后执行数据库设计与迁移 | BLOCKED；本轮无 DDL |

现有代码是较早需求的实现检查点；与上方最新方案有差异的部分仍待调整，上传不等于新版验收通过。


## 2026-09-30 增量

- 数据库 URL 配对、ProductionService/AuthService 拆分、镜头图片/文字图框、项目封面、项目起始时码和 Alembic head 合并均已上传；GitHub 写权限已恢复。`9611be3` 的 CI、Regression Guard 与 PostgreSQL 空库升级通过，旧数据副本迁移已取消，不再是未完成项。
- Shot 图片/文字图框恢复切片已接 V-API Panel/Asset 与 V-Web 表、卡、墙；空 SQLite Alembic 升级到最新通过，隔离后端测试通过。媒体默认写入 `apps/api/media/`，可通过 `FRAMEFORGE_MEDIA_DIR` 指向持久目录；VNext 上线前仍需对象存储或持久卷及新系统引用/回滚核验；不复制 Legacy 媒体库。
- 项目库现已消费 V-API 的 `cover_media_id` 和受权图片字节读取，缺图时维持原有 Monogram 回退；合成数据浏览器在 1440/1024/768/375/320 宽度验证图片、回退与无横向溢出。仍需完成 VNext 持久对象存储接入；不迁 Legacy 媒体。
- `5e86a0b` 仍是功能基线，根 shadcn/ui 仍是视觉基线。其余表格高级功能、生产步骤、字段生命周期、Narration/Moodboard/Lighting 等尚未恢复，不得宣称整体对等。

## 2026-10-01 当前 UI 修复

最新 UI 文档与 Review 回复/引用、Shot Table 新建镜头入口已整合；视觉证据保留为 `BLOCKED_VISUAL`，先验收 1440 桌面四个核心面。当前用户要求同步视觉检查，并核对所有 Markdown 要求、组件加载、字体、图标及入口到后端/基线的对应。Luna 会话按互不重叠文件实施，主会话审查后按模块上传。

交接合并与分支收敛见 [审计记录](audits/HANDOFF_MERGE_2026-10-01.md)：独立模块已上传，14 个冗余远端分支已删除并保留归档标签；4 个开放 PR 仍有待整合能力，继续保留。未部署；VNext 功能/视觉验收仍未完成，Legacy parity/cutover 不再是目标。

| 模块 | 已修复与代码检查 | 视觉/功能验收 |
| --- | --- | --- |
| 表格行内编辑 | 恢复六处可读中文提示；阻止编辑框双击冒泡误开 Inspector；同步保存锁避免 Enter/blur 在重绘前重复提交；补输入标签并保留数值 0。合成组件检查覆盖 IME、失败草稿、409 刷新后重试及事件传播，Web typecheck 通过 | BLOCKED_VISUAL；合成 composition 事件不代表原生中文 IME 已验收，仍需桌面浏览器复验 |
| 项目入口封面交接合并 | 按用户截图恢复横幅背景封面、标题/项目类型/时长/帧率/更新时间、搜索与编辑/打开链接；复用真实 cover media 读取与请求取消/URL 回收，保留创建、错误重试及缩略图模式；根 UI 导出 Pencil。Web typecheck 通过 | BLOCKED_VISUAL；本轮仅交接代码合并，未标桌面视觉通过 |
| 分镜卡片与导航交接合并 | 表格/卡片/视觉墙/时间线共用真实路由入口；卡片恢复画面、描述/旁白行内编辑、扩展信息和可见自定义字段；筛选消费真实数据，完整未筛选/未分组列表才允许调用现有排序合同；失败提示保留。合成排序与导航检查及 Web TypeScript 通过 | BLOCKED_VISUAL；仍需桌面画面/卡片/详情并列与真实拖动、键盘操作验收 |
| Web 框架交接升级 | Next 16.3.8 / React 19.3.0；ESLint 10.11.0 与 Next flat config，移除已废弃的 next lint，采用 Next 生成的 react-jsx/types 配置。依赖安装、配置加载、类型检查及 Next Webpack 生产构建通过 | INTEGRATED_NOT_CUT_OVER；本机 Turbopack CSS worker 被禁止绑定临时端口，默认构建未获本机通过证据；视觉仍待验收 |
| 项目设置草稿 | 直接以服务端值显示，只 PATCH 实际修改字段；允许清空代码，保存后刷新缓存；保存/删除期间防重入，删除失败显示错误。Web TypeScript 检查通过 | 视觉待验收；分数帧率、目标时长、起始时码等完整设置基线仍未齐 |
| Shot 写权限 | 8 个标准写命令统一检查真实角色权限，导入/版本调用传递 actor；审片专用命令仅允许授权状态转换。隔离合成 API 与服务检查 23 项通过 | INTEGRATED_NOT_CUT_OVER；不代表完整项目权限与数据迁移验收 |
| Shot 工具区 / 批量控件 | 主操作、计数与查询工具分层；工具可换行，无隐藏横滚；批量条带入文档流，三个控件使用共享 Radix Select；default h9；原 API/选择/错误/两步移废纸篓保留；合成组件回归与 Web typecheck 通过 | 1440 明暗工具区、Inspector 同屏、键盘 Space/Escape/焦点返回及真实合成 API 保存后刷新已检查；完整表格视觉及全功能仍未通过 |
| Shot 右键菜单 | 复用 ShotTableContextMenu；接通单元格复制、换行偏好/保存视图、自定义字段隐藏/归档、新建与废纸篓入口、批量删除确认与失败处理；合成菜单回归、Web typecheck 通过 | BLOCKED_VISUAL；整镜头剪切/复制/粘贴、原子相对插入、核心列归档合同仍待补齐 |
| Review 三区域 | 镜头队列/真实 Panel 画面/评论版本并列；选择按 Shot ID 保留，提交修订调用版本快照命令，真实角色控制入口，失败保留目标并提示；合成组件回归与 Web build/typecheck 通过 | BLOCKED_VISUAL；Word-style 逐项接受/拒绝与完整自定义字段/制作步骤仍待补齐 |
| 主/辅制作方式 | 独立分组入口、表格跨组/筛选/徽标、Inspector 辅助方式保存、Review 去重展示复用同一方法读模型；跨组选择去重；合成回归和 Web build/typecheck 通过 | 1440 明暗布局及真实 API 辅助保存/跨组跳转已检查；独立组列表右键菜单仍待补齐，完整视觉对等未通过。卡/墙/时间线仅主方式符合功能基线 |
| 制作概览 | 恢复独立导航与基线四项真实统计；主/辅方式去重入组，AE/VFX 保持基线任务相加口径；空数据与请求失败区分；组件回归、Web typecheck 通过 | 1440 明暗四项卡片与真实 3/2/0/1 统计已检查；完整视觉对等仍未通过，未新增额外 KPI |
| 真实资产读模型 | 项目资产列表返回真实文件元数据；Panel/link 合并按活动 Shot 去重；内容读取遵守项目读权限与删除状态；单项隔离 API 合同及保护库哈希检查通过 | INTEGRATED_NOT_CUT_OVER；独立上传、清理与持久媒体迁移仍未齐 |
| Panel 图片上传服务拆分 | 上传路由保留鉴权、文件解析与 HTTP 映射；PanelMediaService 承接 Shot/revision、Panel/Asset/link/audit 和文件事务回滚；py_compile 与无应用/数据库导入的格式、版本、确认/失败文件清理检查通过 | INTEGRATED_NOT_CUT_OVER；本次仅服务拆分，未执行数据库测试或 PostgreSQL cutover，媒体内容读取路由仍待服务收敛 |
| 素材库真实消费 | 真实资产列表替代 Shot 占位；分类、搜索、元数据、镜头引用数、受权图片预览；上传入口连接镜头制作表；共享 AssetImage 处理取消/回收/目标切换；组件回归及 Web build/typecheck 通过 | 1440 明暗素材网格/预览与搜索空态已检查；独立上传/清理、全媒体及整体视觉对等仍未齐 |
| 根 UI / Tailwind 4 | 官方 New York v4、default h9、OKLCH neutral、字体权重及 Select/Dialog 兼容；`237c4a6` 已上传。UI 包检查、Web typecheck/build 通过 | BLOCKED_VISUAL；保持原 Shell 与业务布局，未标视觉通过 |
| Inspector 草稿安全 / 分镜画面 | 按 Shot ID 保留草稿；保存期间切换、失败保留、关闭确认、删除确认及工作面快捷键统一；复用 ShotImageCell 显示/上传首 Panel，dirty/pending 时阻止新增上传；四个分区在 380px 面板两行显示；合成回归与 Web typecheck 通过 | 1440 明暗图片与完整分区标签、草稿禁用上传、真实合成 PNG 上传（revision 4→5）及刷新保留已检查；完整 Inspector 仍 BLOCKED_VISUAL，全字段/多 Panel 对等未齐 |
| Inspector 四项细节字段 | 对白/字幕在画面分区、动作/构图在摄影分区；复用已有 draft、changed-fields、revision PATCH，不另建保存路径；合成回归覆盖跨分区修改与失败保留，Web typecheck 通过 | BLOCKED_VISUAL；按最新截图复审文档暂不继续实时界面操作，这四项未标视觉通过；完整摄影/多 Panel/制作步骤仍未齐 |
| VO 帧分配 | 最低帧数与锁定帧先保留，剩余帧按最大余数分配；可行目标总帧精确，不可行目标明确保留超额；timecode build 与合成回归通过 | 算法检查通过；弹窗真实交互另验，非数据库 cutover |
| 镜头/导入/VO 弹窗 | 共享 Dialog；新建按最大数字镜号与空场次校验、失败保留；导入可修改真实映射/预览/提交计数；VO 发送各自 revision 并显示部分保存/冲突；合成回归、Web typecheck/build 通过 | BLOCKED_VISUAL；导入多表/嵌图/更新替换、VO 原子批量和服务端并发镜号唯一性未齐 |

更新：2026-09-29。Git 根目录为 `referenced-chatgpt-conversation-this-is-an`；`storyboard-system` 仍是 Legacy 运行/迁移源，`apps/api`、`apps/web`、根 `packages/*` 是目标 owner。此表为当前协调账本，旧切片“本地验收”不代表目标架构 cutover。唯一 owner 和逐项门槛见 [CANONICAL_OWNER_MATRIX.md](CANONICAL_OWNER_MATRIX.md)。
| 轨道 | 会话 / 执行者 | 独占范围 | 本轮完成门槛 | 状态 |
| --- | --- | --- | --- | --- |
| Track B1：表格右键菜单 Overlay/Focus | fork `01a0e755-3e35-7583-8818-ebc16162fea7` | `#tableContextMenu` 的表头/单元格入口、owner、Escape/外点/焦点返回及对应 UI 测试；不改后端、PDF | 旧入口与重复关闭路径退出；1440/320/375 实际菜单打开、命中、滚动、关闭、焦点与层级通过 | BLOCKED；上轮 fork 失败，320px 聚焦/滚动竞态尚未通过浏览器验收 |
| Track A：目录整理 | fork `01a0e756-a1c3-7ac3-b379-b6caf148127d` | 引用与发布清单核查、`docs/WORKSPACE_HYGIENE.md`；只处理证据充分的废弃文件 | 对每个删除候选给出引用、数据归属、Git 状态和恢复依据；发布清单无遗漏 | 本轮审计完成；无安全删除项 |
| Track G：工程 PDF 小二维码 | fork `01a0e756-6e02-7723-9080-d1bb7962f712` | `project_pdf_roundtrip.py`、相关 PDF 回归；不改 UI/Shot 写入 | 长项目名不覆盖约 25 mm QR；合成 70 镜头完整 PDF 在 150/200/300 dpi 可解码；附件往返和哈希仍通过 | 本轮切片已本地验收 |
| Track C：批量 Shot 写入 | 本会话 Sol 子代理 | `shot_bulk_updates.py`、对应服务端错误映射与合同测试；不改 UI/PDF | 无效版本/字段结构化拒绝、无变化无虚假 revision；保留排序、自定义列、Panel、真实 409 与非重叠合并 | 本轮切片已本地验收 |
| Track B2：Selection / Inspector 与移动 UI | `01a0cd72-505a-7dd2-9b4f-34523054b1a2` | 详情状态、项目卡片、手机标题操作行与横滑 | 隔离源码浏览器覆盖 1440/320/374/375/390/768；最终报告已给出 | 本轮切片已本地验收 |
| Track F：2D/3D Canvas lifecycle | `01a0cd6f-2587-78d0-8ab2-1efaddb18196` | Split RAF 与卸载清理 | Canvas 浏览器回归通过 | 本轮切片已本地验收 |

并行约束：先看 `AGENTS.md` 与当前 dirty 差异；不得覆盖 `static/workspace-v73.js/css` 等现有生成产物，不用真实 Excel/PDF 测试样本进入发布包，不清理未知素材、数据或备份。各切片自行保留截图、隔离数据与失败证据；主会话在结果回来后更新状态并复核交叉变更。当前用户要求不部署。

集成门槛：核对各 owner 的旧路径是否确实删除；运行受影响的后端合同与浏览器交互测试；核查 1440/320/375 视觉和点击命中；检查发布清单、生成物与 dirty 工作树；然后再决定是否形成可部署候选。整体 React/Legacy 迁移与旧路径退役仍未完成。

## 2026-09-28 已核实的集成证据

- 单镜头与批量 Shot 命令边界：`test_shot_updates` 7/7、`test_backend_integrity` 17/17、`test_system` 8/8；Review 隔离浏览器测试完整通过。无变化不生成虚假 revision/event/snapshot，实际 409 与非重叠合并保留。
- UI 会话在恢复旧版紧凑首页卡片后，双浏览器协作 QA 已跑通保存与合并主流程；Windows IME 真实输入仍未在 headless 环境验证。
- Canvas 未失焦文字的 Ctrl/Cmd+S 已经隔离 Chrome 验证：提交字段后保存 Board，立即刷新内容保留，且不额外触发 Shot PUT。
- 工程 PDF 只读容量审计发现长项目名曾遮挡约 25 mm QR；Track G 已修正版式并完成扫码回归。
- 原目录卫生 fork `01a0e755-c229-7b83-b1e9-3a59d5538eb1` 在继承的协调 turn 中因用量中断，未提交目录改动；已由上表新 fork 接替。

- 工程 PDF 小 QR：合成 70 镜头、9/24/64 汉字与 64 ASCII 项目名在 150/200/300 dpi 的 PDFium + ZXing 实扫均解出 1 码；72B UTF-8 名称预览保持完整标题在正文与附件，`k=FFPDF1` 与 SHA-256 一致。

- 目录卫生复核未发现新的安全删除对象；旧 `frameforge-release-20260926-2213-4b7a7d03.zip` 缺当前工程 PDF 模块，属于过期包，不可作当前发布候选。保留理由与后续门槛见 `docs/WORKSPACE_HYGIENE.md`。
## 2026-09-29 Convergence & Cutover

| 里程碑 | 当前证据 | 状态 | 下一门槛 |
| --- | --- | --- | --- |
| M0 文档事实与根 AGENTS | 根规则从误追加的 Legacy AGENTS 分离；架构/生命周期/组件规范按并行实现与运行 owner 修正 | VERIFIED（本轮文档盘点） | 新增切片持续按 owner 矩阵同步 |
| M1 Canonical Owner Matrix | [矩阵](CANONICAL_OWNER_MATRIX.md) 已覆盖 HTTP、持久化、AI/Presence、Workspace 及 UI | VERIFIED（盘点） | 各切片按真实调用链更新状态 |
| M2 `@frameforge/ui` 收敛 | 已建立 [shadcn UI 基线](SHADCN_UI_BASELINE.md)：`new-york` 几何 + neutral semantic theme 为视觉基线，`5e86a0b` 仅作功能/IA 基线；共享 theme 锁定 50px TopBar、224/64px desktop rail、56px mobile rail、380px Inspector 与 1152px Hub content metrics。TopBar/NavRail/Project Hub 已成为首批真实消费者；Legacy 同名包仍供旧工作区使用 | INTEGRATED_NOT_CUT_OVER | 完成 Shot Table/Inspector/Review 的 rendered 1440/1024/768/375/320 dark/light QA，并继续迁真实 primitive consumers；未有浏览器证据前不得宣称视觉完成 |
| M3 API/持久化 | `apps/api` 已有路由/SQLAlchemy；[Legacy 路由清单](API_ROUTE_PARITY_MATRIX.md) 仅作功能参考；V-Web 已真实消费 SRT、EDL、OTIO、CSV | IMPLEMENTED_NOT_INTEGRATED（整体；导出子项已集成） | 直接完善 VNext 路由/事务与 PostgreSQL 隔离集成；不做旧 API parity |
| M4 Web 视图 | `apps/web` 有部分可挂载视图；Legacy `WorkspaceStage` 未从入口挂载 | IMPLEMENTED_NOT_INTEGRATED | 一个视图完成 render/state/request/mutation/save owner 接管 |
| M5 AI | VNext mock/proposal 为进程内；无持久 Job/真实 Web 消费；接受路径未走普通 Command | BLOCKED | 禁用零外发、provider/job/proposal/人工接受合同 |
| M6 Presence | VNext service 仍为进程内；canonical V-Web consumer 已主动断开，Redis/WS auth 尚未完成 | BLOCKED | authenticated WS、Redis TTL/pubsub、session_id、多 worker 与重连验收后才能重新接 UI |
| M7 PostgreSQL | Alembic/asyncpg 代码存在；Legacy SQLite 数据迁移已取消 | BLOCKED | empty→head、VNext 事务/业务集成；无需 SQLite 副本 backfill |

旧 2026-09-29 “完整 AI/Presence/React”等记录属于实现切片的历史笔记，不能作为当前 cutover 证据。`VNEXT_PROGRESS.md` 已将历史“READY FOR RELEASE”撤出当前状态。当前未部署，也未接触生产数据。未完成的路径继续保留 Legacy owner，不删除迁移源。

本轮代码与验证记录见 [VNEXT_PROGRESS.md](worklogs/VNEXT_PROGRESS.md)。M2 只接入了登录页四种根控件；Legacy UI 包未退出，`apps/web` 全站尚未共享控件化。M3 的 SRT 已有 V-Web 真实下载入口，但 Legacy 仍为生产服务配置入口；分享与注册是有测试的局部修复，其他路由与持久化收敛仍是下一门槛。


## 2026-09-29 Regression Stabilization

Current implementation target: `master`. Product behavior reference: `5e86a0b`, overridden by later explicit user decisions.

| Slice | Current evidence | Status | Next gate |
| --- | --- | --- | --- |
| Shot PATCH contract | V-Web sends changed fields; server revision is authoritative; `ShotService` suppresses no-op writes and now emits actor-scoped `AuditLog` rows for real mutations | INTEGRATED_NOT_CUT_OVER | immutable version/history plus Panel/asset/custom-field convergence |
| VNext bulk Shot contract | V-Web now sends per-shot server revisions; V-API validates the whole batch before mutation, rejects stale rows with 409, and suppresses no-op revision bumps | IMPLEMENTED_NOT_INTEGRATED | add the baseline bulk-action UI plus Panel/custom-field/audit semantics before real consumer cutover |
| VNext Shot reorder contract | V-API reorder now requires production scope, the complete active-shot set, exact client base order and all revisions before mutation; V-Web hook sends the same contract | IMPLEMENTED_NOT_INTEGRATED | wire canonical drag/reorder consumer; add collaboration lease plus snapshot/audit and rendered-browser parity before cutover |
| Inspector draft safety | dirty drafts are preserved per Shot and rebased after a 409 refresh | INTEGRATED_NOT_CUT_OVER | browser regression for switch/refetch/conflict/close on desktop and narrow widths |
| Inline edit | description/voice-over use real V-API PATCH and preserve input on conflict | INTEGRATED_NOT_CUT_OVER | expand field coverage and browser/keyboard conflict QA |
| Mobile Shot table | table owns horizontal scroll, first columns are sticky, Inspector overlays on narrow widths, `100dvh`/safe-area added | BLOCKED_VISUAL | real 1440/1024/768/375/320 rendered inspection |
| Presence | V-Web TopBar consumer disconnected again | BLOCKED | authenticated WS + Redis TTL/pubsub + multi-worker before reconnecting UI |
| Project entry | unauthorized feature-card overview replaced by redirect to selected Shot workspace | VERIFIED | keep IA aligned while recovering remaining baseline capabilities |
| Project cover | authenticated media bytes now render from the V-API cover read model, with deterministic monogram fallback; synthetic browser QA passed at 1440/1024/768/375/320 | INTEGRATED_NOT_CUT_OVER | durable media migration and copied-data verification |
| Shot Trash | soft delete/list/restore/purge flow through `ShotService`; trash/restore advance revision, lifecycle mutations emit audit rows, and UI keeps purge explicitly irreversible | INTEGRATED_NOT_CUT_OVER | immutable history and any real retention policy before further promotion |
| Visual warning state | shared warning tokens and Tailwind mapping restored | IMPLEMENTED_NOT_INTEGRATED | verify conflict/dirty states in light/dark browser renders |

Do not begin Narration, Moodboard, Lighting, or wider product recovery until this stabilization slice has passed CI and the Shot workspace has fresh rendered-browser QA.

## 2026-09-29 Review parity recovery

| Slice | Current evidence | Status | Next gate |
| --- | --- | --- | --- |
| Review parity | Canonical V-API/V-Web now persist and consume comment create/edit/delete/resolve/reopen plus immutable version history with branch/merge/restore and canonical Before–After compare; revision-bound decisions are read-only history and the removed global approve/reject/submit dashboard controls stay absent | INTEGRATED_NOT_CUT_OVER | restore reply/quote authoring, Word-style Audit/inline accept-reject, permission/browser QA and rendered visual parity |

## 2026-09-29 V-Web UI parity recovery

| Slice | Current evidence | Status | Next gate |
| --- | --- | --- | --- |
| Project Hub hierarchy | Authenticated cover media and deterministic fallback render in compact mobile/desktop cards; synthetic browser QA covered 1440/1024/768/375/320 and 320 dark/light | INTEGRATED_NOT_CUT_OVER | copied-data media validation and any visual issues found with representative images |
| Brand / utility controls | Login, Hub and Workspace now share the Film mark plus Lucide Sun/Moon theme semantics; locale controls use the same target-language labels | INTEGRATED_NOT_CUT_OVER | rendered dark/light verification; do not treat source parity as visual acceptance |
| Shot selection + table toolbar | Selection stays separate from Inspector; Shift range, Ctrl/Cmd toggle, explicit Details action, real search/filter/sort and atomic bulk toolbar coexist on the canonical page | INTEGRATED_NOT_CUT_OVER | browser keyboard/pointer regression and conflict-path QA |
| Column visibility | Root `@frameforge/ui` now exports a Radix Popover consumed by a real Shot Table column manager; visibility persists per production/browser | INTEGRATED_NOT_CUT_OVER | resize/reorder, server saved-view semantics, archived/purged custom-field lifecycle and context menus remain |
| Mobile workspace navigation | Horizontal rail now exposes an overflow fade while retaining route access | BLOCKED_VISUAL | inspect 375/320 with recovered full IA before accepting the mobile navigation model |

No UI slice in this section is visually complete until real rendered-browser evidence covers the relevant desktop/narrow widths. The current screenshots remain regression/failure evidence where product parity is still missing.
