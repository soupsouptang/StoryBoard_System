# FRAMEFORGE 续作入口

## 2026-10-04 固定画框构图与双击100%复位（本地代码f8875c5）

最新用户确认：项目画框内缩放/位移、允许留空、显式锁定，小图只有Lock保存，详情Lock先记录本地草稿历史后卡片Save提交；原图和构图两个下载。最后追加双击百分比恢复100%居中满框并丢弃尚未锁定操作，已实现。两入口共用ShotImagePreview/原Dialog；项目比例支持小数，50–300%胶囊、±25步进、滚轮/左键pan；原图保留，MediaPresentation/ImageCropService/项目History是原有持久owner，无新路由/DDL。详情不再有图点击直接替换。本段覆盖下方历史slider及详情有图点击上传规则。

代码及对应owner/API/product/screen/UI台账先本地提交f8875c5，本文随后独立提交。后端两份针对检查9 passed，前端4份实际消费者/坐标检查通过，正式UI包及生产Webpack/TypeScript、diff/Regression Guard（base9417a48）通过。两个GitHub remote已fetch，各HEAD之外未合入数量0；未知:memory:.ses原样保留未stage。

真实本地PG/API合成012验证连续125%/150%Lock和项目Undo恢复、详情局部Undo/Redo及卡片Save；绿色合成PNG实际chooser替换Esc恢复原蓝黄图，再次Lock成功后项目Undo恢复。无Lock的Esc/窗外取消重开100%、双击位移归零、50/300按钮禁用通过；项目2.39:1实际画框正确，合成项目设置已恢复16:9。真实97镜头项目只读预览008，不保存/替换。

双下载实际收到Downloads：镜头012_构图画面 (1).png为1920×1080，镜头012_原图.png为800×450，尺寸/像素核验。浏览器download事件timeout但本机文件回执已确认，不能继续沿用旧“真实文件上传/下载未完成”状态。本轮实际选择/替换提交及下载门槛已补。

最终1440/1024/768/375/320无根/弹窗横向溢出，内容区中心差0、胶囊中心齐画框；宽608/400/288/288/288。截图outputs/shot-framing-preview-2026-10-04.jpg仅本机保留；QA页关闭、viewport已恢复。3002最终.next/shot-framing-interaction standalone Web PID53266/API8002 PID52490，现有运行环境/PG55432及原媒体保留，无DDL。入口http://127.0.0.1:3002/productions，用户刷新加载新代码。

**尚待门槛**：当前DOM浏览器API无原生drag/wheel，Codex原生应用控制被工具明确禁止，未绕过。真实组件事件/坐标/松开停留/边界测试已通过，原生鼠标实机仍需用户复核或合法工具补验，整体INTEGRATED_NOT_CUT_OVER。GitHub push此前被自动审批拒绝，要求具体目的地/分支上传授权；soupsouptang/StoryBoard_System master的询问仍未获回复。本轮未push/force，不能声称MD已上传。

续作只补上述实机门槛和GitHub同步，保留本轮代码与部署，不扩展其他旧产品待办；明确授权后正常快进上传本地代码及后续MD。详见[实施记录](SHOT_FRAMING_2026-10-04.md)。

## 2026-10-04 辅助制作方式全选（本地代码4902e02）

用户要求辅助制作方式标题后加入全选，勾选全选/取消全不选、与下方选项对齐。仅ShotDetailCard组内标题行使用下方同样两/三列网格与8px列gap，标题第一列/全选第二列，框16px/icon12px/文字14px行高20px保持；全部选中checked、无项unchecked、部分项indeterminate。操作调用现有setSecondary草稿，disabled复用权限/pending，仍需明确Save，原CAS/dirty/Esc/单一owner不变；没有API/DB或shared primitive改动。

消费者检查接入实际表格选项合同，新增十项全选/半选/再全选/清空与不请求断言，原草稿/原子Save/冲突/no-op/取消通过；生产Webpack/TypeScript、diff及Regression Guard以43ce6a5为base通过。真实合成012点击0→10→9→10→0及半选同步，恢复基线显示已同步；Space全选、Esc询问/二次Esc丢弃收起、重开0项与REV6保持，没有业务写入。实际008十项已有选中只读查看，全选自动checked。2560/1440/1024/768/375/320全选框/文字与下方第二列X差0、与标题中心Y差0，卡片470px、组/根无横向溢出、辅助组无折行或独立滚动。临时viewport恢复、QA页关闭、用户页保留，截图outputs/shot-detail-method-select-all-2026-10-04.png仅本机。

3002已更新.next/detail-method-select-all/standalone/apps/web，API8002/PG55432/媒体保持。代码/详细MD/ACTIVE本地提交4902e02，本文随后独立本地提交。GitHub具体仓库/分支授权仍未回复，未重试被拒上传；未知`:memory:.ses`保留不上传。不扩展旧待办或历史文件上传/下载实机门槛。

## 2026-10-04 顶部删除按钮微缩（本地代码bd40348）

用户要求宽高各缩小约2–3px，icon不变。仅ShotDetailCard顶部删除按钮size-[29px]覆盖原32px，仍圆角8px正方形，Trash2 16×16px、原红色/aria-label/title/权限/disabled及确认/Esc保持。真实1440/1024/768/375/320按钮均29×29、icon16×16且中心偏差0，卡片470px/根无横向溢出；合成012点击开启删除确认，Esc取消，没有业务写入。生产Webpack/TypeScript、diff与Regression Guard以b88efd4为base通过；纯尺寸改动未新增镜像测试。临时viewport恢复、QA页关闭、原用户页面保留，截图outputs/shot-detail-delete-compact-2026-10-04.png仅本机。

3002已部署.next/detail-delete-compact/standalone/apps/web，API8002/PG55432及媒体保持。代码/详细MD/ACTIVE本地提交bd40348，本文随后独立本地提交。GitHub仍等待此前明确仓库/分支授权，未重试被拒上传；未知`:memory:.ses`原样保留未上传。此段覆盖历史32px删除按钮描述，不扩展其他旧待办。

## 2026-10-04 辅助制作方式放大（本地代码b578b38）

最新用户要求“不影响框架、文字放大、可两列五行改三列四行、无需滚动/折行”已完成。仅ShotDetailCard辅助组14px字号/20px行高（原11px/16px）、16px复选框/12pxicon（原12px/10px）；保留8px横gap/4px纵gap，组实际宽度≥260px三列四行，否则两列五行。显式important仅覆盖该组文字，十项nowrap且无独立overflow；470px标准本体、六等宽内容轨、固定左图、16px内留白/字段间距、置顶操作及保存/dirty/Esc owner保持。

真实2560/1440/1024/768/375/320均十项完整14px/16px框，卡片470px、根/组无横向溢出；辅助列数3/2/2/2/3/3，组高92/116/116/116/92/92px且clientHeight=scrollHeight；容器根据字段可用宽度适配，不直接使用屏幕宽度。实际008十项全选完整、不折行，仅只读；合成项目点击文字特效勾选后出现未保存状态、Esc确认/第二次Esc丢弃收起、重开unchecked与REV6保持。没有提交业务写入。临时viewport恢复、QA页关闭、原用户页面保留；截图outputs/shot-detail-method-readable-2026-10-04.png仅本机。

现有shot-detail-card检查、最终生产Webpack/TypeScript、diff及Regression Guard以df23757为base通过。3002 Web已更新`.next/detail-method-readable/standalone/apps/web`，API8002/PG55432及媒体未改。代码和详细MD/ACTIVE本地提交b578b38，本文随后独立本地提交。GitHub具体仓库授权仍未回复，未重试/绕过此前自动审批拒绝，不能声称上传；未知`:memory:.ses`保留未上传。仅完成本次UI追加，不扩展旧待办或历史文件上传/下载实机门槛。此段覆盖历史11px/12px框固定两列描述。

## 2026-10-04 详情操作全部置顶（本地代码d32a7a2）

最新用户截图要求已实施：移除底部同步/保存/取消footer，顶部按镜头/REV/同步状态/删除icon排列、gap8px；删除仅Trash2 icon，32×32px圆角正方形，aria-label/title及原二次确认保留。右上保存取消各64×32px、同字号、均无icon。卡片470px本体、body16px内部留白和字段16px间距、既有草稿/权限/pending/原子Save/dirty/Esc处理函数不变；没有API/DB或其他页面改动。

实机桌面body338→403px增加65px，footer不存在；2560及五种1440/1024/768/375/320宽度均470px、按钮64×32/32×32和padding16、无根横向溢出；窄屏顶部组自然换行保持操作可达。真实合成项目no-op Save提示保存成功且REV6保持、不收起；删除icon开启确认，Esc退出；临时标题变化后顶部未保存提示，顶部Cancel询问、再次Esc丢弃收起，重开原值。现有shot-detail-card检查、最终Webpack生产构建/TypeScript、diff及Regression Guard以fb6e02f为base通过。截图outputs/shot-detail-header-actions-2026-10-04.png仅本机；临时viewport与QA页已清理，原页面保留。

3002后台Web已更新`.next/detail-header-actions/standalone/apps/web`，API8002/PG55432及媒体不变。代码与详细MD/ACTIVE本地提交d32a7a2，续作MD随后本地提交；GitHub具体仓库授权仍未获得，未重试/绕过自动审批拒绝，不声称上传。未知`:memory:.ses`保留未上传，不扩展其他旧待办。此段覆盖历史底部固定footer规则，布局owner及前述文件实机门槛不变。

## 2026-10-04 详情高度标准基准bug修复（本地代码f11427d）

用户截图指出内容撑高镜头行会导致详情按倍数增高。真实样本006标准行84.594px、008行313px，旧详情008达到1252px；ShotDetailSlot现固定为原标准布局470px，只观察内容区宽度，取消相邻TR测量/订阅。其他表格行高/布局、末行借空间、固定左图、内部滚动和保存语义保持，此段覆盖此前实测行高×4计算。未修改项目数据、API、DB或shared primitives。

实际006/008打开详情均470px；1440/1024/768/375/320宽度也均470px且无根横向溢出，干净Esc收起正常。既有shot-detail-card检查、最终生产Webpack/TypeScript、diff及Regression Guard以5ee8abc为base通过。本机Web3002已经重载`.next/detail-standard-height/standalone/apps/web`，API8002/PG55432保留，viewport恢复；截图outputs/shot-detail-standard-height-2026-10-04.png仅本机。代码与详细MD/ACTIVE本地提交f11427d，续作MD随后独立本地提交。GitHub具体仓库授权仍未获用户明确回复，未重试或绕过之前自动审批拒绝，不能声称本次已上传；未知`:memory:.ses`保持未上传。没有扩展其他旧待办，文件上传/下载实机门槛维持历史记录。

## 2026-10-04 四行详情、等宽列、制作方式名称与本机部署恢复（本地代码cf17489）

最新用户要求“部署软件让浏览器能够访问”已完成：本机入口http://127.0.0.1:3002/productions，实际浏览器原有4个项目正常加载，合成详情12镜头及图片可读。Web使用生产Webpack/TypeScript已通过的`.next/detail-method-verified/standalone/apps/web`，显式同源proxy→8002，两服务独立后台运行、绑定127.0.0.1；本次启动时API45531/Web45590，PG55432保留，后续不能将PID当永久事实。临时viewport已恢复，用户项目大厅保留；不是公网部署，机器休眠/重启后须重新检查进程。

本节覆盖旧“本机未应用画板迁移”运行停点：旧API已退出，当前HistoryService需要画板表，先有效pg_dump备份`/private/tmp/frameforge-before-preview-20261004.dump`、恢复独立副本，以及独立空库完整Alembic→c14f8a63b920演练；两条链成功，35张原业务表的逐行JSON排序SHA256/数量在副本及本机升级后完全相同。随后使用既有官方迁移升级原本机预览数据库，增加两张画板表，未修改API或迁移源码，未读取Legacy数据；原配置/媒体保留，未输出或上传凭据/备份/媒体。API健康和Web同源健康都200/healthy。仅本机部署必要迁移完成，不代表画板UI/完整产品已验收。

当前确认的追加UI已实现：Card本体max(470px,实测行高×4)，六等宽列随实际可用空间响应减少，镜号/时码同轨等分并排、IN/OUT排版保留；固定左图高度自适应且不参与右侧滚动，16px内部留白/字段间距；长文本从画面描述起占两列两行、128px固定TextArea，聚焦后滚轮/光标阅读完整原文。制作方式中文名统一实拍镜头/商用素材/客户提供/复用素材/静帧画面/AE效果/MG动画/三维制作/视觉特效/文字特效。沿用getMethodLabel唯一显示owner，新增/批量/旧Inspector/筛选消费者接入，原枚举/部门/持久化语义不变。辅助组两列五行、11px/16px行高、12px框完整不折行，无独立滚动；显式重要样式只覆盖该组，避免表格14px规则覆盖。详细范围及证据见SHOT_DETAIL_2026-10-04.md最新段落。

验证：四份现有针对前端检查再次通过、最终生产构建/TypeScript已通过、diff/Regression Guard以451323f为base通过；真实2560/1440/1024/768/375/320分别6/3/2/2/1/1等宽轨、470px、无根横向溢出，十项组高96px=scrollHeight、每项16px且无水平溢出。勾选文字特效后Esc询问/第二次Esc丢弃收起、重开unchecked，未保存草稿。此前四行长文208字符、滚轮0→30、箭头光标往返及右侧滚动147px左图稳定证据保持。最终截图outputs/shot-detail-method-names-2026-10-04.png仅留本机，不上传。之前真实选文件与下载收据两项BLOCKED_VISUAL保留，不绕过环境权限、不宣称全站cutover。

同步真实状态：开工fetch两个remote均无未合入增量，代码及详细MD/ACTIVE本地提交cf17489；正常push soupsouptang master被自动审批拒绝，理由是可信用户内容未明确具体仓库作为敏感代码上传目的地。没有执行推送、没有换remote/间接绕过、没有改写历史。用户此前概括“GitHub上传”不足以通过此次审核，需要明确确认soupsouptang/StoryBoard_System仓库master分支，再继续代码先推、本文随后上传并查询回执。本节续作MD先独立本地提交，不声称已上传。此前451323f等旧成功上传记录维持；本次待上传新代码不能与旧远端混淆。

未知`:memory:.ses`原样保留未上传；未扩展其他旧待办。下次先读本文及适用AGENTS、核对实际服务/Git/最新用户授权。当前页面部署与本次追加UI实现已完成，剩余本批GitHub同步需具体目的地授权，实际文件上传/下载验收仍受已记录环境门槛限制。

## 2026-10-04 扩展性总纲v2与执行合同（文档检查点）

用户要求重写[扩展性总纲](VNEXT_MAX_EXTENSIBILITY_REQUIREMENTS.md)，重新询问不清晰处，并明确父子所有权：一级Entity可以拥有真正从属子Entity，父子须明确所有权/生命周期/scope；独立实体业务连接使用typed link。已确认全部9内置列初始可见、内置禁止Purge、同共享view配置同步、团队共享资源身份显式关联、Scene要求动态继承/逐项覆盖、环境主值与差异提示。多Scene同一资源的数量合并仍等待Q-05回答，只暂停该规则。

配套[执行标准](EXTENSIBILITY_EXECUTION_STANDARD_2026-10-04.md)、[知识层合同](VNEXT_KNOWLEDGE_LAYER_REQUIREMENTS.md)、[29包机器清单](extensibility_execution_plan_2026-10-04.json)、岗位稿及实施计划一并整理。执行清单校验、拒绝环/无证据接受/待确认接受/越界路径检查、六文档本地链接核对通过；这些仅为文档结构验证，不是产品测试、真实PG或视觉验收。

已先后快进合入远端6d8ddfa和9c88410，并合并包含3182aad的03e4313，保留详情卡片/图片预览/五列布局及镜号时码合列的最新UI和其他会话记录；双方新增续作段落均保留。本轮不改运行代码/UI/依赖、不部署、不重启预览。已有未提交imports/exports/engineering PDF、新画板UI及依赖草稿仍保留，未脱敏REMAINING_CAPABILITY审计不上传。只有本轮明确文档与只读清单校验工具进入提交。

续作先fetch核对实际HEAD/dirty，读总纲最新决定和清单；不要把计划目标当已经实现，也不要用旧H-04、约7列或个人布局目标覆盖新规则。后端共享view/资源/继承的前端缺口交给指定UI owner，已有UI不冻结、不用旧草稿替换。

## 2026-10-04 镜号/时码合列、标题单列、制作方式整体（代码3182aad已上传）

最新用户截图要求已处理：镜号和时码在同一网格项保留各自标签及只读IN/OUT；镜头标题只占一列。制作方式三列以上置于首行最右列并跨两行，主方式在上、辅助复选在下；宽列260px以上辅助两列，否则一列，最大96px内部滚动，所有10项与编辑语义保持。窄屏自然排布。卡片圆角0px，只保留本体1px矩形外框，Slot/td/tr不叠加边框。独立项16px间距/内边距，三行352px本体/固定footer/图片中心缩放继续保持。本段覆盖下面历史标题跨两列与圆角Card。

写集仅ShotDetailCard及SHOT_DETAIL记录/ACTIVE/本文；未改API、数据库、shared primitives、请求/保存语义、导航或其他页面。检查现有shot-detail-card.cjs、最终生产Webpack/TypeScript、diff与Regression Guard通过。真实3002合成项目2560/1440/1024/768/375/320宽度均无root/body溢出、352px、圆角0；镜号/时码X一致，1440标题单轨173px、制作方式row 1 / span 2，大屏辅助两列。末尾TYPE滚动选项实际可达（内部scrollTop176），Esc二次丢弃重开未选中、没有写数据。截图outputs/shot-detail-grouped-2026-10-04.png保留本机不入Git；临时viewport恢复、独立QA页保留。

本机3002已更新`.next/detail-grouped-final/standalone/apps/web`，入口http://127.0.0.1:3002/productions；API8002/PG55432及新画板迁移停点不动。旧文件上传/下载浏览器环境门槛维持，未绕过或声称全站cutover。发布前fetch两remote均无待合入UI，未知`:memory:.ses`保留未上传。代码/对应MD已正常快进push到soupsouptang/StoryBoard_System master回执3182aad；本文随后独立提交上传，最终回执以Git为准，不宣称CI通过。当前追加需求实现与页面检查完成，待用户新反馈，不扩展旧产品待办。

## 2026-10-04 详情五列试用与均等间距（代码47f7576已上传）

用户确认缩略图旁约五列，并补充每个独立项周围均等合理留白。本轮仅改ShotDetailCard及对应记录/ACTIVE；Card render owner和既有草稿、字段、原子保存、图片预览owners保持。header/body/footer内部16px、独立字段横纵gap16px、标签至控件4px；标题跨2列、五列时长文交替跨3/2列，四列时跨2列，三列以下整行。图片约占内容宽20%、至少180px，窄卡片上下排列。命名container queries依据右侧实际宽度，不受侧栏或表格横向滚动误判。覆盖下方历史24px内部留白与三栏要求；本体max(352px, 实测行高×3)、固定按钮、灰色只读隐藏字段继续保留。

检查：现有shot-detail-card.cjs与Webpack生产构建/TypeScript、diff和Regression Guard通过。真实3002合成项目1440/1200/1024/768/375/320分别为5/4/3/3/2/1列；全部352px、内边距/gap16px、root/body横向溢出0、footer桌面899.125px／手机739.125px可见。桌面图236×144，长文本跨三列约551px，208字完整保留；聚焦内部滚动而footer固定。临时标题修改第一次Esc询问、第二次Esc丢弃后重开原值，未写入现有项目数据。截图工作区outputs/shot-detail-five-columns-2026-10-04.png不入Git；浏览器临时viewport已恢复，独立QA页保留供查看。

部署：Web3002已替换本会话原预览为`.next/detail-five-columns/standalone/apps/web`，入口http://127.0.0.1:3002/productions，显式同源proxy仍指8002。API8002、PG55432、本地现有项目与新画板迁移停点保持，未改数据库/API或其他页面。真实上传/下载此前两个环境验收门槛仍待补，不重试权限限制，不宣称全站cutover。

同步：发布前fetch两个remote，soupsouptang无新改动，origin/master全部已在本地祖先历史。代码与对应记录正常快进上传soupsouptang/StoryBoard_System master回执47f7576；未force或绕过审批。本文随后单独提交上传，最新回执以Git查询为准，不声称本次GitHub CI已通过。未知`:memory:.ses`原样保留未上传。当前新增五列/间距实现及页面检查已完成，无新反馈时不扩展其他旧产品待办。

## 2026-10-04 行下详情卡片、图片预览及追加视觉要求（代码已上传）

**最新用户决定和实现**：表格详情由侧滑改为镜头行下展开，顶部删除镜头、右下保存/取消、取消原X；集中当前镜头字段、灰色只读隐藏列、必填FF0082，显式保存成功不收起。实际改值才dirty；第一次Cancel/Esc询问、确认框Cancel/Esc丢弃并收起，返回编辑保留；另一镜头触发只关闭当前，需再次触发打开。保存内置、自定义值与暂存图片为一条事务/一历史步；409/失败留草稿/no-op不写。表格已有图单击预览、空图上传，详情图片直接暂存上传/替换；放大50–300%、slider/25%按钮、icon下载/替换、Esc，固定内容区（排除导航）居中，宽约一半。

**用户本轮追加覆盖早期草稿**：卡片不再受小viewport挤压成两行；本体=max(352px, 实测镜头行高×3)，短屏借内容区纵向滚动，末行展开完整footer可见。大缩略图桌面240×144px，短字段/宽标题/长文本分区。留白是内容与卡片边缘的**内部**留白（body24px），外侧额外空白已取消；Card贴齐可视内容区，不受表格横向滚动影响。浮窗图片以**画面中心为缩放基点**，每次zoom重定位至中心，不从左上角放大。最终截图outputs/shot-detail-2026-10-04.png及shot-image-preview-2026-10-04.png保留工作区、不入Git。

**核验与同步**：合入soupsouptang最新e778c1c的8个增量，另fetch origin/master=c93ba17，后者完全为当前祖先、无未合入UI；保留画板后端及扩展性文档，没有回写旧UI或改项目入口/导航/画板/导入导出UI。完整后端146 passed、Webpack生产构建/TypeScript、6份针对前端检查、diff及Regression Guard通过。真实3002合成12镜头/8类字段验证Save+一次undo、改回原值clean、取消焦点回TR、dirty Esc和filter guard、末行上滚、五宽度、隐藏字段、菜单/列管理、预览50/300及中心200%（X/Y偏移0）。最终五宽度Card均352px、body24px、root/body无横向溢出，footer桌面约899px／小屏739px可见。

**代码先上传完成**：正常快进push到soupsouptang/StoryBoard_System master，远端回执为`3e7d651689ef7a369c0e5e3bcffaba1fd4e7b70e`；没有force、改写历史或绕过审批。代码含相应owner/API/screen/product/UI台账与[详细实施MD](SHOT_DETAIL_2026-10-04.md)。本文随后单独提交并上传，最终MD SHA以Git远端查询为准；不宣称GitHub CI已通过。

**本机部署**：最新Web3002 `.next/detail-center` standalone保留，入口http://127.0.0.1:3002/productions；显式同源API proxy→8002，未放宽CORS/PNA。API8002 PID13309、PG55432继续保留本会话本地环境，不涉及公网/生产。8002未重启合入后新画板启动代码，本机未执行c14f8a63b920在线DDL；后续重启最新API须按画板独立PG迁移门槛演练，不能把本次前端预览说成新画板部署完成。

**实际文件操作门槛尚待用户环境**：Chrome扩展Allow access to file URLs关闭，实际选图/替换提交未完成；接口/合成消费者已验证Atomic image Save。下载按钮已实际点击但Chrome自动化未返回完成回执，真实下载收据未核验。两个门槛BLOCKED_VISUAL，已说明且未替用户放宽权限/绕过浏览器限制。用户开启ChatGPT Chrome扩展文件URL权限后可补实际上传/替换；下载以用户实际收到文件复核。共享reduced-motion CSS保留，未改系统设置做专项切换。其余本轮代码和页面检查已完成，整体INTEGRATED_NOT_CUT_OVER、不扩展其他旧待办。未知`:memory:.ses`原样保留未上传。

**下次开工**：先读本文/最新AGENTS/动态台账，检查local与两个remote；按用户新反馈继续，保留montblanc08最新UI。不要重做已完成代码或借后端任务重写工作台。当前确认需求的剩余是上述两个文件操作验收门槛；代码及本轮MD同步已按次序处理，没有恢复额度券或新建heartbeat。


## 2026-10-03 持久撤销与重做已实施并上传（代码 `74f76a2`）

最新用户要求“继续完成并上传同步，遵循GitHub搭建规则”。先读本文/根及适用AGENTS，fetch两个已配置remote后核实：GitHub此前仅有图片构图局部草稿undo/redo，没有贯穿项目的持久历史；远端最新规则与本地相同，未发现需要合并的新增提交。本次遵循apps/web＋apps/api＋PostgreSQL＋Alembic原生owner，不接回Legacy架构、不生产部署。

**已完成**：项目设置左侧撤销/重做按钮；Ctrl/Cmd+Z、Ctrl/Cmd+Shift+Z和Windows Ctrl+Y；用户＋项目最近100步、刷新/重新登录保留。现有镜头编辑/创建/软删除恢复/排序/批量/相对粘贴/导入，列命令、个人列布局、素材关联/图片构图、批注/审片意见、保存视图/交付模板/项目设置纳入服务端确认历史。列新增/复制的整列数据与位置/宽度/格式同事务一条历史。输入/IME/弹窗草稿/列宽拖动保留本地键盘所有权；新增代码不补录接入前的操作。

HistoryService/get_db原事务拥有日志/补偿，现有域service仍拥有正常写命令；PG三表history_states/history_entries/workspace_layouts由Alembic `a83f02c1d765`（前序b03e7a42f185）拥有。旧浏览器布局仅首次初始化后退出双写。全部对象及父/子引用先检查再整步补偿；冲突409不写、不移动游标；revision递增、audit/outbox追加。永久删除清全项目全部用户历史，个人布局已purge列引用清理；媒体展示追加revision，不改源文件。已有记录时迁移降级拒绝删表。

**实际验证**：完整后端137 passed（1项已有框架弃用warning），11项新增history事务/API测试；快捷键/shot-summary/shot-column-sort、生产Webpack构建/TypeScript、diff和Regression Guard（基于3f91fd9）通过。PG55432独立空库完整迁移与既有库副本迁移、真实HTTP undo/redo/CAS409和compound列位置通过。本机预览升级前有效备份 `/private/tmp/frameforge-before-history-20261003-verified.dump` 已验证，合成原项目/镜头/素材/批注/列数量保持；该备份与配置不进入Git。真实Chrome独立项目验证创建/宽度/后插列undo/redo、Ctrl+Y刷新持久、弹窗输入不触发项目历史和Esc，五宽度1440/1024/768/375/320无根溢出；列管理/表头右键菜单、键盘焦点可达。截图工作区outputs/project-undo-redo-2026-10-03.png，仅留本机。

**浏览器预览**：3002和API8002已重启载入最新构建/源码，PG55432保留。独立验收项目 `54374ea3-0b02-46c6-97c4-0fe9bfb3930a`，1镜头及“可撤销列”保留；入口 `http://127.0.0.1:3002/production/54374ea3-0b02-46c6-97c4-0fe9bfb3930a/shots`。独立验收tab关闭、临时视口恢复，用户原页面保留。视频样本97镜头和原106镜头项目未改动。

**上传完成**：用户在确切目的地确认后回复“强制上传GitHub”，本次明确授权已承接。重新fetch核实远端无新增提交、规则无变化，Regression Guard通过；随后正常快进上传 `soupsouptang/StoryBoard_System master`，远端从 `9e1f69c`更新到 `1d6018a`。包含代码 `74f76a27e9d2df46a3140330455cdde87627b2ca`、续作MD `1d6018a`及此前未同步的16个提交；保留原远端历史，没有改写或换remote。此前自动审批阻挡已解除，本段覆盖下方历史“尚未上传/等待授权”状态。最终上传状态MD随后单独提交并上传；当前远端SHA以Git查询为准。未宣称本次GitHub CI已通过。

**下一次开工**：先读本文、适用AGENTS及最新动态台账，检查Git状态并fetch远端；不重做本次已完成实现。当前已确认撤销/重做修改和GitHub同步完成，没有新需求时不扩展下方旧产品待办。未知`:memory:.ses`原样保留、未入Git。

实施范围与owner/验收详见[项目历史记录](PROJECT_HISTORY_2026-10-03.md)。现有操作已接通，仍为INTEGRATED_NOT_CUT_OVER；原生Moodboard/Lighting、完整项目restore/merge、成员RBAC、outbox发送和媒体GC是旧产品待办，不因此完成，也不在本次自动扩展。

## 2026-10-03 已选镜头数量垂直对齐（代码 `eeddeb5`）

用户截图指出“已选 N”比前方镜头数量统计偏低；表格页共同外层由 `items-baseline` 改为 `items-center`，两段文字按同一行中心对齐，保留12px字号、灰色、计数、四位数字占位与原有选择功能。不涉及 API、数据库或媒体修改。

验证：真实3002独立样本页临时选择后，1440px视口镜头统计及“已选1”均 top154px／height16px／center162px，字号与颜色一致；1024／768／375／320px换行正常且根页面没有横向溢出。视口已恢复，临时选择已取消、测试页已关闭，用户原浏览器页面保留。shot-summary.cjs、Webpack生产构建／TypeScript、diff及Regression Guard通过。实际截图保留工作区 `outputs/selected-count-alignment-2026-10-03.png`，不进入Git；3002已切换新本机构建，API8002与PG55432保留。

代码已先本地提交，续作MD随后提交；GitHub仍受此前具体仓库／分支授权的自动审批拒绝限制，未重试、未宣称上传。未知`:memory:.ses`保留。本次对齐需求完成，无新增待办。

## 2026-10-03 用户视频全列样本与 Excel / PDF 导入文件

本批请求已完成：使用用户提供的视频创建独立本机样本项目，不覆盖原有106镜头项目；输出一份 Excel 和四卷 PDF 供测试导入。样本项目 `aaab21df-7d26-468f-98f3-37a174d8ae81`，代码 `HERO_SAMPLE_20261003`，入口 `http://127.0.0.1:3002/production/aaab21df-7d26-468f-98f3-37a174d8ae81/shots`。97个候选分镜段、97张真实视频抽帧、34项数据；30fps、1282×720，全片11491帧，时长 `00:06:23:01`。按画面变化检测，剔除不足0.4秒短段，IN含起点／OUT不含，仍需剪辑师复核，不宣称人工逐帧剪辑定稿。

既有 ImportService / ShotService / PanelMediaService / CustomFieldService 通过正常本机 API 创建数据；无直接 SQL、迁移、架构或产品源码变更，无公网部署，无 Legacy 数据读取／迁移。为本请求将用户视频抽帧写入独立样本；其余项目与未知 `:memory:.ses` 保留。焦段、运镜、制作分工、表演与替代方案标明重拍建议，不能作为原片元数据。字幕由 macOS Vision 离线 OCR 抽样、核对明显误字，非完整原声／旁白转写，无可靠信息的字段标为待核对；没有外部 AI 上传。负责人字段使用本地已有测试账号有效 ID，非原片真实制作人员；换环境需清空或替换负责人映射。

10个 pending 预设列未被冒充接通，提供镜头参考、取景位置、空间属性、昼夜属性、角色标记、衔接策略、核对记录、可行性、替代建议、执行策略等对应自定义列；篇章实体没有正常新增命令，因此用叙事段落自定义列。启用10个已接通预设列，并保存“视频全列样本”视图：隐藏空的实体篇章，显示负责人和16个自定义列。源文件“时码 TC”非空数据会触发禁止重复新增保护列，样本文件改名“源时码区间”；页面标准时码仍由整数帧派生，未修改保护规则或导入代码。

输出目录为工作区 `outputs/01a0ee12-4541-7080-bdfb-0bfad98585b1/hero-storyboard-sample/`，不在 Git 仓库内：`真正的英雄_全列导入样本.xlsx`，PDF四卷001–030／031–060／061–090／091–097，及导入测试说明、校验摘要和 ZIP 合集。Excel 用 bundled artifact-tool 构建，首表第一行即34列表头，97行嵌入图片、冻结表头／标识列、筛选与说明页总帧数公式。PDF每页一个 SHOT、可提取中文和一张真实图片，分卷遵守单次最多30页。生成脚本／OCR／中间帧仅留本机临时目录，用户视频／抽帧／工作簿／PDF／截图不进入源码或 GitHub。

真实 API 预览：Excel 97行／97图／34列／11491帧，无警告；PDF四卷分别30／30／30／7行、同数图片及2749／3572／3598／1572帧，PDF额外保留38项字段／原文，合计11491帧。Excel 已实际经标准 ImportService 导入；PDF仅验证预览，未声称完成PDF写入。第一次 Excel 提交因受保护时码标题失败，服务事务回滚；修正文件后导入成功，不重复追加。API确认97镜头各1个有效 Panel 图片资产、97×30fps时序完整；浏览器确认97图均加载1282×720，项目总时长与显示有效时长均 `00:06:23:01`，保存视图成功。PDF各卷代表页与末页渲染检查通过；XLSX XML确认镜号001保留前导零、97图锚点精确对应数据行、帧数和说明公式11491。artifact-tool PNG预览不显示图片绘制层，图片完整性以工作簿drawing/media和实际导入后97张图片验收，不把该预览当成图片丢失。

本请求无剩余实现；本机3002／8002／PG55432及样本浏览器保留。续作 MD 本地提交；GitHub上传仍被此前具体仓库／分支授权的自动审批拒绝阻挡，不重试或换 remote 绕过，不宣称已上传。每次开始先读本文和适用 AGENTS，用户没有新需求时不扩展旧产品待办。

## 2026-10-03 项目总时长 / 显示有效时长与镜头数量（代码 `cc1a213`）

用户确认要求已实施：项目信息在镜头数/fps/比例后增加 `· 总时长 HH:MM:SS:FF（显示有效镜头时长 HH:MM:SS:FF）`，同字号/格式/灰色。按项目fps/drop_frame复用packages/timecode（Drop-frame沿用分号分隔），以零起点累计整数帧，不叠加项目IN时码。总时长统计全部活动镜头；括号内统计当前搜索/筛选后的有效镜头，不含废纸篓。元数据total_duration_frames与列表API原本已排除deleted_at，未改API/数据库。ProductionShotSummary只读取现有React Query shots/project/custom values和workspace filters，不持久化或镜像累计值；列表加载前采用项目已返回的总帧数，显示时长暂用—。

表格和卡片/视觉墙筛选原语义提取到shot-display filterShotsForView，页面与顶部统计共用，避免自定义字段、辅助制作方式及篇章等筛选统计不一致；不改变既有表格/卡片不同筛选范围。时间线沿用全部镜头。重复制作方式分组不重复累计。新增/删除/恢复/时长修改沿用现有query更新/失效，统计随缓存更新自动重算。

视图导航后的数量统一为 `总共 106 镜头（其中显示 106 镜头）`，沿用原首个数量的12px字体/起始位置/灰色。两处数字各4ch等宽占位，不补零；桌面同行，窄屏按完整词组换行，保留选中数量及其他控件。数量使用真实列表和筛选结果，不硬编码106。

验证：shot-summary.cjs覆盖帧累计、原筛选规则/自定义搜索/多制作方式、加载/空列表、新增/时长更新/移出活动列表、0/106/9999文案、drop-frame帧往返；new-shot-row及shot-column-sort通过。Webpack production build/TypeScript、diff与Regression Guard通过。真实3002合成页面106活动镜头总时长00:05:05:07；搜索色方块显示2镜/00:00:06:00，全项目总时长不变；无匹配显示0/00:00:00:00；卡片相同结果；清空搜索后两项均00:05:05:07、数量106/106。1440/1024/768/375/320无根横向溢出，统计字号均12px、颜色与前面相同，两处数字槽各32.78125px固定。没有创建、改时长或删除现有记录，动态写后更新由合成消费者测试验证，不把mock说成真实数据库写入。

最新3002预览已重载并留给用户，浏览器视口/搜索恢复。截图保留本机工作区shot-summary-all-2026-10-03.png和shot-summary-filtered-2026-10-03.png，不上传。代码先本地提交`cc1a213`，续作MD随后本地提交；GitHub继续受先前具体仓库/分支授权拒绝阻挡，不重试绕过、不宣称已上传。未知`:memory:.ses`保留。此批确认要求完成，不扩展旧产品待办；每次开工先读本文和适用AGENTS。

## 2026-10-03 单位说明放大、无单位默认秒（代码 `997c7af`）

用户最新要求覆盖下方历史“无单位为帧”和12px说明：新增镜头的纯数字输入默认为秒，`25`与`25s`均为25秒，`25f`为25帧；`m`分、`h`时和小数换算保留，按项目fps四舍五入到整帧、至少0.1秒。复用Web shot-display解析器与NewShotModal提交路径，API的duration_frames仍接收帧数，不修改数据库、导入字段或已有记录。无单位规则同步输入title、无障碍说明及错误提示。

单位说明仍在规划时长下面一行，字号放大到16px/20px行高，灰色保持与普通占位提示相同；整行均匀分布到输入框宽度，末尾h时右边缘与输入框右边缘对齐。桌面前两项保留20px空白第二行，三个标题和输入框分别齐平；窄屏仍按原单列布局。

验证：`node tests/frontend/new-shot-row.cjs`通过，覆盖纯数字/显式f/s/m/h、小数/分数fps、非法值、实际表单25在24fps提交600帧、Esc放弃草稿。Webpack production build和TypeScript通过。真实3002页面1440/1024/768/375/320宽度单位末尾与输入框右边缘差均0、无根/卡片/提示横向溢出；桌面标题Y=321.5、控件Y=377.5，灰色oklch(0.708 0 0)。输入25后Esc关闭，重开恢复3s；没有提交新增或修改现有镜头。截图留本机工作区new-shot-duration-units-expanded-2026-10-03.png，不上传。最新3002本地预览已重启，浏览器视口恢复原尺寸。

代码先本地提交`997c7af`，MD随后本地提交。GitHub上传继续等待此前具体仓库/分支授权（自动审批拒绝），不绕过或宣称已上传；未知`:memory:.ses`保留。此前额度heartbeat已删除，不自行重建或扩展旧产品待办。每次开工先读本文及适用AGENTS。

## 2026-10-03 新增卡片规划时长说明对齐（代码 `7ae7929`）

最新用户截图要求已实施：制作方式、标准景别、规划时长标题同一行；单位说明 f帧 / s秒 / m分 / h时 从标题拆出，显示在下一行，12px/16px行高、text-muted-foreground，与普通输入框占位提示同色。前两项该行留空，下面三个控件顶部整齐对齐。只调整NewShotModal现有Field排版；时长解析、提交、默认3s与Esc保持。窄屏沿用原单列排版，隐藏前两项无内容占位。

验证：Webpack production build/TypeScript及diff通过；真实1440/1024/768三个标题Y=323.5、控件Y=375.5，单位说明12px/16px与占位色均oklch(0.708 0 0)，375/320无卡片/根横向溢出，Esc关闭正常。最新3002预览已重启，截图本机工作区new-shot-duration-hint-2026-10-03.png保留，不上传。没有API/数据库/依赖/共享primitive修改。代码先本地提交，MD随后本地提交；GitHub上传沿用此前目的地/分支授权阻挡，不绕过。

额度自动检查已于上一heartbeat停止（automation已删除）：已确认修改完成且额度可用，剩余上传需要具体目的地授权，不再自动轮询。此说明覆盖下方历史段落中“heartbeat继续”的状态；用户新需求仍按每次先读本文及适用AGENTS继续。

## 2026-10-03 居中悬浮卡片与全弹窗 Esc（代码 `0e12efa`，待上传）

最新用户要求覆盖此前底部新增行：表格和卡片视图共用现有 NewShotModal / workspace store，底部 NewShotRow 已删除；新增不再随表格出现在底部。自动镜号、f/s/m/h、默认3s、原画面/旁白/景别/制作方式/分镜图框字段保留，篇章选择沿用卡片入口。创建由明确的“创建镜头”提交，取消/关闭/Esc 放弃未提交草稿，重开恢复空白默认值；不再使用旧新增行 blur 自动提交及 localStorage 草稿恢复。

分镜表底部剪贴板提示、命令错误、排序错误、批量操作错误共用 ShotFeedbackDialog 居中提示；批量删除二次确认也改为居中 Dialog。保留选择数量/批量字段工具条，这是可操作工具，非提示底栏。命名、列删除、保存视图、自定义字段、废纸篓、导入、旁白计时、图片裁剪及项目/素材/审片已有卡片都支持 Esc；受 pending guard 阻挡的 consumer 添加明确关闭处理，其余沿用 shared Radix Dialog。Esc 关闭当前最上层卡片，未提交不写库；已发出的请求继续由现有 hook/service/revision 管理，关闭界面不冒充撤销服务器事务。

证据：new-shot-row.cjs（现验证共用弹窗的自动编号/单位/非法值/Esc不提交/重开/显式创建）、bulk-controls.cjs（确认和取消/错误/原操作）、shot-column-sort.cjs（旧排序/排版）通过；Webpack production build / TypeScript、diff 与 Regression Guard 检查通过。真实3002合成项目：新增2m后Esc关闭，重开3s；保护列提示居中Esc关闭；删除确认Esc关闭且镜头仍在、选择保留；导入、废纸篓、保存视图、自定义列Esc关闭；关闭后焦点返回新增按钮。1440/1024/768/375/320宽度无根/卡片横向溢出、卡片居中；375×667滚动后取消按钮可见且键盘可达。测试未提交新增或删除，项目105活动镜头为实际读取，不沿用旧103数量。桌面截图本机工作区 centered-new-shot-2026-10-03.png；3002/8002/PG55432最新本地预览保留，无API/数据库/schema/依赖修改，无公网部署。

本轮代码已先本地提交 `0e12efa`，MD随后本地提交；GitHub上传仍受此前自动审批拒绝阻挡：soupsouptang/StoryBoard_System 的 master 未获得具体目的地/分支确认，不重试绕过。用户明确授权该目的地后，先推本地代码，再推续作MD并补上传状态。未知 :memory:.ses 保留不上传；现有额度续作 heartbeat 继续只追踪已确认工作及上传停点，不自行扩展产品旧待办。每次开工先读本文和适用AGENTS。

## 2026-10-03 自动镜号、时长单位、IN/OUT 与 Esc 取消（代码 `b856798`）

本批用户已确认要求已实施：新增镜号只读自动预填，提交时由现有 ShotService 在项目锁内分配下一个三位镜号；排序沿用既有重新编号命令。两个新增入口共用时长解析：无单位/`f`为帧、`s`秒、`m`分、`h`时；秒分时支持小数，按项目 fps 四舍五入到整帧，沿用至少0.1秒验证，默认3s。显式导入镜号仍保留；没有新增表或迁移。

时码同列两行：IN起始，OUT起始+时长，下一镜IN与上一镜OUT一致；复用现有时码和drop-frame换算，不新增持久化字段。原始镜号/分镜画面/时码/时长/镜头标题五列禁止改名，双击/F2提示“该列名称无法修改。”；旧本地/保存视图的这五列别名过滤，自定义及复制列仍可改名。全选、批注两个表头补齐同色1px分隔线。

追加bug已修：新增输入行及其操作行捕获Esc，取消整条未提交草稿、清理本地缓存、防止关闭时blur误保存；放弃新增复用相同取消入口。已发出的保存请求不冒充取消。真实页面输入2m后Esc关闭，重开回到3s且镜号仍111；未新增、修改或删除已有镜头。页面已显示103条活动镜头（用户或其他操作新增，不能沿用上次5条记录）。

验证：现有frontend new-shot-row（单位/小数/非法输入/自动编号/Esc后blur不保存）及shot-column-sort通过；两份针对backend测试7 passed；Webpack production build/TypeScript、diff与Regression Guard通过。真实3002页面确认IN/OUT、五列保护提示、分隔线、Esc；1440/1024/768/375/320px无根溢出且时码不溢出。截图本机工作区 `shot-timecodes-auto-number-2026-10-03.png`。3002/8002/PG55432预览保留，非生产部署。

**上传状态**：代码本地提交`b856798`，首次推送`soupsouptang/StoryBoard_System master`被自动审批拒绝，理由为具体GitHub目的地/分支授权不足，需用户明确确认后再推送；不得绕过。续作MD随后提交，上传成功后更新此状态。未知`:memory:.ses`保留，禁止上传。

**额度续作**：本会话已建立“额度恢复后继续分镜修改”heartbeat（id `automation`），每15分钟检查。额度耗尽时参照实际resetsAt，恢复可用再继续未完成的已确认工作，不使用恢复券，不重复执行正在运行工作。本批全部完成后只核实MD上传，不自动扩展旧产品待办。配置在Codex本机，需客户端/主机可运行；GitHub上的MD本身不提供调度。本次查询五小时用量45%，恢复时间2026-10-03 06:54:06香港时间；后续必须重新查询，不把此历史时间当成固定重置时间。

## 2026-10-04 最大化扩展性需求已同步

新增长期需求合同 [VNEXT_MAX_EXTENSIBILITY_REQUIREMENTS.md](VNEXT_MAX_EXTENSIBILITY_REQUIREMENTS.md)。该文档是后续新增 Domain/字段/关系/任务/排期/自动化/AI/Provider 的优先设计依据；状态为 PLANNED / REQUIREMENTS，不代表代码已完成。本次只更新文档，没有修改 UI、API、ORM、Alembic、Redis 或部署配置。

接手新增能力时，先判断它属于 Entity / Field / Relation / Workflow / Presentation / Automation 中哪一层，再定义 canonical owner、Command、Revision、权限、Event 和持久配置版本。禁止通过扩肥 Shot、万能 EAV、万能关系表、任意脚本插件或新增大量 packages 获得伪扩展性。Import 最新明确原则：不保存客户映射模板，每次重新模糊识别、自动合并、冲突预览，并保留 Provenance。

## 2026-10-03 三个镜头操作按钮统一与计数文案（`e79c357`）

最新要求已实施：新增镜头左侧对齐批量栏删除按钮；新增/删除/取消选择均100×36px、14px字号、相同8px圆角与正常字距。删除单选显示“删除镜头”，2–99显示“删除N镜”，超过99显示“删除···镜”；两位数固定占位、等宽数字且居中，按钮宽度不随数量改变。红色改为`#e11d48`，悬停`#be123c`，深浅主题均用相同鲜亮红色；保留原二次确认、错误处理、禁用与回收站功能。

新增右侧预留取消按钮100px+间隔8px+右留白24px。有限宽度左侧八项工具局部横向滚动，保持原顺序，搜索/新增仍同行；宽屏搜索继续居中。真实1318/2400px验收新增与删除左侧偏差0，三按钮尺寸/字体/字距一致，无根溢出；2400搜索中心偏差0且工具全部可见。真实单选/全选5条文案、取消选择已核实，未删除或写入数据；1/9/10/99/100边界及批量操作失败/确认检查由已有`bulk-controls.cjs`覆盖。Webpack production build/TypeScript、diff、Regression Guard通过。3002最新预览保留运行，截图本机`shot-actions-single-2026-10-03.png`和`shot-actions-multiple-2026-10-03.png`；代码先上传，本文随后上传。无API/数据库改动。

## 2026-10-03 新增镜头按钮向页面中心内收（`0bb991d`）

用户最新视觉修正：新增镜头仍与搜索框同一行，但增加24px右侧留白，向内容区中心内收；搜索最小宽度176px以容纳桌面工具行，最大320px。按钮高36px、字号14px和原功能继续保留。1318px真实预览同一行无重叠/根溢出，按钮距页面右侧约39px。Webpack production build/TypeScript、diff、Regression Guard通过；Turbopack因本机子进程端口限制失败，使用Next自带Webpack完成构建，未改项目构建配置。3002已重载，API/数据库未改，截图本机`new-shot-toolbar-inset-2026-10-03.png`；代码先推送，本文随后上传。

## 2026-10-03 新增镜头下移到搜索工具行（`4c9ada0`）

最新用户要求已实施：将“新增镜头”从视图切换行移至搜索工具行最右侧，与搜索框、导入菜单垂直对齐；按钮高36px、文字14px、加号16px，与同行导入一致。复用原 `setNewShotRowOpen(true)`，文字和新增流程保持原样。搜索弹性宽度更新为192–320px；宽屏仍在内容区居中，有限空间靠工具后排列，窄屏保持局部横向滚动。

Web production build（含TypeScript）、diff和Regression Guard通过。真实3002合成页面：默认1318px视口三个控件中心Y均208px、高均36px，新按钮完整可见，无根页面溢出；2400px搜索中心偏差0、无重叠。点击新增正常打开输入行，Esc取消当前输入后用“放弃新增”关闭草稿，未新增数据库记录。截图留本机`new-shot-toolbar-one-row-2026-10-03.png`。最新3002构建运行，API8002/PG55432保留；本次不涉及数据库或API修改。代码已先上传GitHub，本文随后上传；再次开工先读本文及架构要求。

## 2026-10-03 搜索与工具同一行（`ba6a5ff`）

最新用户截图修正：搜索框与导入等工具同一行；覆盖旧§6“单独一行搜索框”的布局。工具仍左起按导入/筛选分组/保存视图/冻结列/自定义列/列管理/详情/废纸篓排列，间距8px。宽屏有足够空间时搜索框在内容区居中；空间不足时置于工具后并缩至240–320px，窄屏整行横向滚动，不重叠/换行。

Web production build（含TypeScript）、diff与Regression Guard通过；真实3002合成页面2400/1440/375宽度均同一行、无重叠/根溢出，2400搜索中心偏差0；1440无工具行横向溢出，375仅工具行滚动。原数据库/API未改，3002已重载新构建，8002/55432保留运行供用户查看；这里是本地预览，不是公网部署。截图留本机`search-toolbar-one-row-2026-10-03.png`。

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
| [最大化扩展性需求总纲](VNEXT_MAX_EXTENSIBILITY_REQUIREMENTS.md) | 新 Domain/Relation/Task/权限/自动化/Provider 的长期需求合同；Import 无模板智能识别与 Provenance；不得把 PLANNED 写成完成 |
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
