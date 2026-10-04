> **来源规划存档，不可直接执行。** 已迁至下一代独立分支。本文保留当时内容；其中旧实现复用、封面保留、数据迁移、包进度及验收状态均不是下一代授权。最新规则以[需求基线](../../REQUIREMENT_BASELINE.md)和[AGENTS](../../AGENTS.md)为准。

# 新增文档全量审计与访谈结果

日期：2026-10-04。审计基点：master @ 0e7de58，包含最新已确认界面提交。状态：16问已结束，第一批文档已落盘，提交前只作文档检查；新增功能仍须实施和验收。全文使用产品中文，必要字段保留精确名称。

## 1. 本轮范围与边界

用户要求全部新增文档按grill-me逐项审计、问清再改，并要求写完一段就上传。本轮仅修订需求、数据库方案、执行清单和交接，不改变应用代码、已确认UI、运行数据库、服务器或部署；保留其他会话未提交的画板、导入导出和依赖草稿。沿用contract-first的单一接口与数据负责人规则，不造第二套权限、解析器或持久历史。

功能参考仍为5e86a0bb11a20ecd631d9c2af66260a73d7c92e7；被用户后续明确修改或取消的行为按最新决定。shadcn/ui及montblanc08最新已确认界面决定呈现，整行照片项目入口封面必须保留。

## 2. 新增文档盘点

按Git新增记录核对2026-10-02以来13份已提交新增文件（12份MD与1份JSON清单），另补本轮需求与审计两份文件。实施记录按其注明提交及真实证据保留，不把历史通过结果当成本轮重测。

| 文件 | 审计结果与处理 |
| --- | --- |
| [需求总纲](https://github.com/soupsouptang/StoryBoard_System/blob/493bbb24e92f42315ad54e451629ef005fd5ab00/storyboard-system/docs/VNEXT_MAX_EXTENSIBILITY_REQUIREMENTS.md) | 重写不清晰分支，登记34条有效决定，取消库房，明确Entity所有权与跨对象关系 |
| [岗位方案](https://github.com/soupsouptang/StoryBoard_System/blob/493bbb24e92f42315ad54e451629ef005fd5ab00/storyboard-system/docs/ROLE_WORKFLOW_REQUIREMENTS_2026-10-03.md) | 账号、人员、角色、任务、交接、看板和导出职责明确；按时间段需求替代库房 |
| [知识需求](https://github.com/soupsouptang/StoryBoard_System/blob/493bbb24e92f42315ad54e451629ef005fd5ab00/storyboard-system/docs/VNEXT_KNOWLEDGE_LAYER_REQUIREMENTS.md) | 固定采集时贡献团队；原始回答隔离；型号与基础知识，取消器材使用方法 |
| [实施计划](https://github.com/soupsouptang/StoryBoard_System/blob/493bbb24e92f42315ad54e451629ef005fd5ab00/storyboard-system/docs/EXTENSIBILITY_IMPLEMENTATION_PLAN_2026-10-04.md) | 保留注明基点的代码证据，直接修正实施位置，增加需求、构图、帧率三个独立包 |
| [执行标准](https://github.com/soupsouptang/StoryBoard_System/blob/493bbb24e92f42315ad54e451629ef005fd5ab00/storyboard-system/docs/EXTENSIBILITY_EXECUTION_STANDARD_2026-10-04.md) | 修正权限作用域、锁序、历史边界、数据库约束及FX-21至25门槛 |
| [机器清单](https://github.com/soupsouptang/StoryBoard_System/blob/493bbb24e92f42315ad54e451629ef005fd5ab00/storyboard-system/docs/extensibility_execution_plan_2026-10-04.json) | 第一批29包扩至32包；第二批独立拆出需求新页，现33包；无库房或预留包，删除已解决Q-05；新增包未开始、证据为空 |
| [前后端交接](https://github.com/soupsouptang/StoryBoard_System/blob/493bbb24e92f42315ad54e451629ef005fd5ab00/storyboard-system/docs/BACKEND_FRONTEND_HANDOFF_2026-10-04.md) | 记录后端造成的共享视图、来源、默认构图、帧率及需求界面缺口，明确UI负责人接入 |
| [项目历史记录](https://github.com/soupsouptang/StoryBoard_System/blob/493bbb24e92f42315ad54e451629ef005fd5ab00/storyboard-system/docs/PROJECT_HISTORY_2026-10-03.md) | 保留已有单一HistoryService及100步证据；不得据此宣称未来新增域已通过 |
| [详情记录](https://github.com/soupsouptang/StoryBoard_System/blob/493bbb24e92f42315ad54e451629ef005fd5ab00/storyboard-system/docs/SHOT_DETAIL_2026-10-04.md) | 保留inline详情、卡片草稿、保存ACK及最新无光晕状态，不恢复旧侧栏规范 |
| [构图记录](https://github.com/soupsouptang/StoryBoard_System/blob/493bbb24e92f42315ad54e451629ef005fd5ab00/storyboard-system/docs/SHOT_FRAMING_2026-10-04.md) | 保留两入口共用预览控件与分别持久/局部历史；不写第二套裁剪UI |
| [原图适配记录](https://github.com/soupsouptang/StoryBoard_System/blob/493bbb24e92f42315ad54e451629ef005fd5ab00/storyboard-system/docs/SHOT_ORIGINAL_FIT_2026-10-04.md) | 保留原图等比contain、居中填黑，不覆盖原图、不拉伸 |
| [两行工具栏](https://github.com/soupsouptang/StoryBoard_System/blob/493bbb24e92f42315ad54e451629ef005fd5ab00/storyboard-system/docs/SHOT_TOOLBAR_2026-10-04.md) | 保留最新两行顺序、真实数量与批量入口，不恢复旧第三行或写死99 |
| [项目入口资料](https://github.com/soupsouptang/StoryBoard_System/blob/493bbb24e92f42315ad54e451629ef005fd5ab00/storyboard-system/docs/PROJECT_LOBBY_METADATA_2026-10-04.md) | 保留类型、比例、fps、镜头数、总时码顺序及照片封面；既有验证不冒称本轮重跑 |
| [时间段需求](https://github.com/soupsouptang/StoryBoard_System/blob/493bbb24e92f42315ad54e451629ef005fd5ab00/storyboard-system/docs/RESOURCE_TIME_REQUIREMENTS_2026-10-04.md) | 本轮新写最终轻量合同，无库存、预留或使用方法 |
| 本审计 | 保存问题、明确回答、被替代回答、修订位置及真实文档检查结果 |

联动检查并修正既有[数据库计划](https://github.com/soupsouptang/StoryBoard_System/blob/493bbb24e92f42315ad54e451629ef005fd5ab00/storyboard-system/docs/UI_DATABASE_PLAN_2026-10-02.md)、[功能界面计划](https://github.com/soupsouptang/StoryBoard_System/blob/493bbb24e92f42315ad54e451629ef005fd5ab00/storyboard-system/docs/FEATURE_UI_PLAN_2026-10-02.md)、[列模型](https://github.com/soupsouptang/StoryBoard_System/blob/493bbb24e92f42315ad54e451629ef005fd5ab00/storyboard-system/docs/COLUMN_MODEL_REQUIREMENTS_2026-10-02.md)、[历史确认稿](https://github.com/soupsouptang/StoryBoard_System/blob/493bbb24e92f42315ad54e451629ef005fd5ab00/storyboard-system/docs/CONFIRMED_UI_REQUIREMENTS_2026-10-02.md)、[历史执行稿](https://github.com/soupsouptang/StoryBoard_System/blob/493bbb24e92f42315ad54e451629ef005fd5ab00/storyboard-system/docs/UI_REQUIREMENTS_EXECUTION_2026-10-02.md)。后两份注明旧阶段，不能以历史验收规则覆盖当前桌面边界。工程码协议、数据库实施和重构范围继续沿单一负责人及文件桥接边界；后续逐批实施时核对实际代码。

## 3. 16问及最终效力

访谈开始预计8问，用户要求全部新增文档后扩展到16问，每次只问一个。用户最后回答优先；被取消问题仅作决策来源，不保留为实施待办。

| 问 | 答复与最终效力 |
| --- | --- |
| 1 库房是否耗材 | 只简单灯光器材和拍摄道具；库房整体随后由第15问取消 |
| 2 租赁到场与领用 | 只提示待录入或已录入、不设审批；随第15问取消库存流程 |
| 3 同时需求 | 独立需求相加，明确共用只计一次；仍有效 |
| 4 超量预留 | 计划和预留可超量，只提示不足；第15问取消预留，不实施 |
| 5 登记颗粒度 | 型号数量、单件编号选填；第15问取消库存登记 |
| 6 库房归属与资格 | 通用大库房、登录拍摄staff可用；第15问取消 |
| 7 库存编辑资格 | 所有合格staff可改；第15问取消，不增加项目权限例外 |
| 8 素材默认构图 | 更新默认，只影响未专用的当前引用；镜头与封面专用构图保持 |
| 9 项目帧率 | 自动重算帧数；保留秒数、统一舍入，时码跟随，音频与拍摄时间不变 |
| 10 任职与资格到期 | 有效任职保留资格，撤销或到期取消；库房资格由第15问取消 |
| 11 经验共享组织 | 复用后台用户组，不造独立知识成员体系 |
| 12 用户组团队归类 | 用户组保留团队归类方式；自动贡献到团队 |
| 13 多团队贡献范围 | 按项目成员所在的全部团队自动贡献 |
| 14 成员变化与旧经验 | 只影响之后新经验，旧贡献范围保留；仍按当前权限读汇总 |
| 15 库房撤销 | 完全取消通用大库房，只保留知识和一个时间段需要什么 |
| 16 最终知识内容 | 取消使用方法，只要型号、基础知识；独立需求相加 |

第16问未新增人员或场地清单，因此沿既有排期职责，不另造人员场地名单；按已有排期关联需求、未排期另列属于接入细化。第3问已确认的明确共用例外继续保留，不能以型号相同自动去重。实际名单、型号、数量和拍摄时间由用户配置，不能编造为已就绪。

## 4. 主要冲突与整改

| 冲突 | 最终整改 |
| --- | --- |
| 库房提案在总纲、数据库、知识和清单中相互强化 | 正文直接取消，删除本轮未发布的旧库房草稿，统一新需求文件，移除库存锁及权限例外 |
| 多场景用量仍列未决Q-05 | 按时段独立相加、明确共用一次，来源重复与独立需求区别处理 |
| 型号存在被误当实际器材可用 | 基础知识和需求事实分离，无库存结论 |
| 成员变化可能扩散旧经验 | 采集时固定贡献团队；之后变化只影响新经验；退出成员仍失去当前读权限 |
| 默认构图更新可能让历史画面漂移 | 当前继承与专用优先；版本、审片及导出固定有效构图及原图版本 |
| 帧率变化方式未确定且与构图混成一包 | 自动保留秒数；FX-24构图、FX-25帧率，分别交付 |
| 多实体因关联误变成从属 | 父子只代表所有权、生命周期与作用域，独立对象连接用明确关系 |
| 旧UI稿含侧栏、旧菜单、约7列、旧工具栏和99计数 | 当前九内置列、最新行列菜单、inline详情、两行工具栏与真实计数为准；保留历史记录但注明已被替代 |
| 可执行文档被误报实现完成 | 新包全部未开始；真实数据库、API、文件与页面证据分开，结构校验不填功能通过 |

## 5. 本轮检查与分段上传

第一批交付上述需求与合同修订，显式暂存文档，不混入任何应用或他人草稿。提交前执行git diff --check、执行清单依赖/证据结构校验、相对链接和取消范围检索。第一批实际文档检查：32个工作包的依赖、写集和证据结构通过；14份提交文件的本地相对文件链接有效；文档git diff --check通过。产品测试未运行。检查入口为tools/validate_extensibility_plan.py和git diff --check -- storyboard-system/docs；链接检查仅确认目标文件存在，不替代正文语义审计。

第一批已提交360d4fbe9aa94298661370276ee3272bd9c6eebe并上传GitHub master，ls-remote核对相同SHA。

第二批补足来源去重与时段查询结果、经验范围保存、构图读取和历史固定、精确帧率转换及原子提交；拆出独立需求新页包，现33包。更新续作入口、协作台账与负责人表，保持应用代码和既有UI不变。历史续作记录的本机地址和个人证据目录已脱敏，本地原文备份保留且不提交。

第二批实际文档检查：33包依赖与证据结构有效；依赖环、越界路径、无证据接受、带未决决定接受四种错误清单均被拒绝；152处本地文件链接和Markdown标题锚点有效；文档diff检查通过。再次fetch确认远端仍为第一批360d4fb。所有结果仅是文档检查，未运行产品测试。产品门槛FX-01至25、KL-01至11仍待各执行者实际运行；本轮未执行产品测试、视觉验收或生产部署。
