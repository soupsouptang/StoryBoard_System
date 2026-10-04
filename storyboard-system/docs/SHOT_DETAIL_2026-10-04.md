# 2026-10-04 分镜详情卡片与图片预览实施记录

## 最新本机部署恢复与最终页面验收

用户明确要求重新部署供浏览器访问。本机旧API进程已停止，最新API的HistoryService读取画板表，原PG停在a83f02c1d765，因此先备份到本机`/private/tmp/frameforge-before-preview-20261004.dump`，实际恢复至独立副本，并在副本及独立空库执行既有Alembic迁移至c14f8a63b920；两条链通过。原35张业务表逐行JSON排序SHA256/数量在副本升级后及本机正式升级后均完全一致，只增加现有官方迁移的两张画板表。本次没有修改迁移或API源码，没有读取Legacy数据库，也没有新建持久化owner；此处覆盖下方历史“画板迁移尚未应用”的本机运行状态，不代表画板产品/UI已验收。

Web使用已通过生产Webpack/TypeScript构建的`.next/detail-method-verified/standalone/apps/web`，3002显式同源代理至8002；两服务改为后台独立进程，绑定127.0.0.1。启动使用原本机配置和媒体目录，未输出或上传凭据、备份、图片。API健康及Web同源健康端点均200/healthy，浏览器实际项目大厅显示原有4个项目，分镜合成项目12镜头和图片正常加载。PG55432保留。机器休眠/重启后的进程状态仍需现场核对，本次不是公网部署。

最新构建实机2560/1440/1024/768/375/320均470px卡片、6/3/2/2/1/1等宽列、无根横向溢出；十项辅助复选均11px/16px行高、12px框、两列五行，组高96px=scrollHeight，不折行/无独立滚动。勾选文字特效后Esc询问、再次Esc丢弃并收起，重开unchecked；未提交草稿。四份针对前端检查再次通过。最终截图`outputs/shot-detail-method-names-2026-10-04.png`仅留工作区。此前四行/固定左图/长文本滚轮及光标检查保持有效；真实选文件及下载回执仍沿用下方未通过门槛，不宣称全站cutover。

## 最新追加：制作方式四字名称与完整辅助复选组

用户指定十项中文显示名：live实拍镜头、stock商用素材、client客户提供、archive复用素材、still静帧画面、ae AE效果、mg MG动画、three_d三维制作、vfx视觉特效、type文字特效。只替换中文呈现，原枚举值/数据/命令/选中值保持；英文locale独立译名保留。复用media-resolver.getMethodLabel作为显示owner，表格badge/详情/自定义原格式列/分类页面等既有消费者直接沿用；新增镜头、批量制作方式、旧Inspector和卡片筛选菜单移除各自硬编码备注并使用该函数。责任部门选项不改，避免相同stock/three_d/vfx编码误套制作方式名称。

详情辅助组固定两列五行，字号11px、行高16px、复选框12×12px、勾选图标10px、横gap8px/纵gap4px；移除max-height及独立overflow，不折行。选项span用显式important字号/行高覆盖表格既有14px!important统一样式，只限定这十项。主方式选择与辅助组仍是同列两行的整体，Card四行高/六等宽轨/固定左图/长文本两列两行保持。

允许写集在四行布局基础上加media-resolver及上述四处纯显示选项调用、现有三个前端回归harness依赖接入；不改shared UI primitive、API、DB、导航/导入导出流程或其他业务逻辑，不新增显示标签owner。shot-detail-card、新增镜头单位/Esc、批量更新/删除/错误、旧Inspector草稿/CAS/取消四份定向检查通过，测试读取实际resolver而非复制映射；最终生产构建/TypeScript通过。真实浏览器具体尺寸与截图回执在续作MD最新段落补录。

## 最新追加：四行高度、等宽轨道与长文本两列两行

用户在六列代码451323f正常上传后追加：卡片由三行增为四个单位，右侧所有列等宽，从画面描述开始的长文本输入项统一占两列两行。最新实现覆盖下面352px/三行、身份列最小272px和长文本跨三列的描述。

Slot本体=max(470px,实测镜头行高×4)，分镜表可用区最低558px，末行继续借上层纵向空间显示完整footer。Card右侧全部采用等宽tracks，不为镜号/时码单独扩大一轨；两者仍在同一轨中等分，IN/OUT两行保持，窄轨可横向阅读时码。制作方式两列以上仍是最右列跨两行的整体。长文本/JSON网格项统一col-span-2、row-span-2，单列窄屏自然占一列；TextArea显式field-sizing:fixed、128px固定高度、正常文字换行和overflow-y-auto，未聚焦最多五行省略展示，聚焦去除覆盖层，可滚轮及光标阅读完整值。左图高度随新增空间增大，桌面16:9约501×282px；图片区域不参与右侧滚动。

允许写集扩为ShotDetailCard、ShotDetailSlot、分镜表页唯一minHeight及本文/ACTIVE/CONTINUE_WORK；owner不变，排除导航、其他页面、API、数据库和shared primitive。定向shot-detail-card草稿/原子保存/冲突/no-op/取消检查、最终Webpack生产构建/TypeScript与diff通过。实际3002合成项目2560/1440/1024/768/375/320宽度均470px、root/body无横向溢出、末行footer可见，分别6/3/2/2/1/1等宽列；2560六轨均283.445px。长文本项实际column/row均span 2，输入126px内高、CSS fieldSizing=fixed；208字符原文完整，1440滚轮scrollTop0→30，ArrowDown光标至208，ArrowUp至0且scrollTop回0，未改值/未保存。稳定布局下右侧滚动147px，左图及左栏X/Y/宽高完全不变；首次尺寸变更的异步测量不计作稳定证据。临时viewport恢复。

本机最终Web3002构建.next/detail-four-verified；8002/PG和未应用画板迁移保持。截图outputs/shot-detail-four-rows-six-columns-2026-10-04.png仅工作区，不入Git。此前上传/下载实机环境门槛保持；仅完成本次详情排版追加，不扩展总纲待实施包。代码先上传，再独立更新和上传续作MD。

## 最新追加：镜号时码并排、固定左图与六列内容

最新用户截图覆盖下面组内纵排/最多五列方案：镜号和时码在同一网格项内并排，各占一半，时码继续保持14px等宽IN/OUT两行。左侧图片独立占列，按图片自然比例与内容区可用高度计算宽度，保留16px内容内边距；16:9合成图桌面约292×164px，不裁切。图片区域不参与右侧滚动，隐藏只读字段也移入右侧滚动区。Card整体三行高、直角单层外框、header/footer固定和上传/保存/取消规则保持。

右侧以实际可编辑区域420/580/740/900/1060px为2/3/4/5/6列阈值；镜号/时码合列最小272px，保证各半列可完整显示两条时码；宽屏各轨等宽。制作方式两列以上位于首行最右列跨两行，主方式与辅助复选整体不拆分，辅助项布局保持。长文字宽屏跨三列，其余按可用宽度跨列；小于760px的卡片改为固定上图、下方字段独立滚动，所有字段可达，不强行压成六列。

本轮允许写集只有ShotDetailCard、本文/ACTIVE/CONTINUE_WORK；render owner仍为现有Card，排除API、数据库、共享primitive、导航和其他页面。开工fetch并快进保留405faca的扩展性新合同文档/清单工具；origin/master完全包含于祖先，未知`:memory:.ses`原样保留。没有重启8002/PG或应用画板新迁移。

验证：shot-detail-card.cjs草稿/原子payload/冲突/no-op/guard/取消检查、最终Webpack生产构建与TypeScript通过。真实3002合成项目2560/1440/1024/768/375/320宽度分别6/4/2/2/1/1列，卡片352px、root/body横向溢出0，末行footer完整可见。2560合列两个半区均151px；右侧scrollTop从0到190时图片及左栏X/Y/宽高完全一致。临时标题首次Esc询问、再次Esc丢弃，重开原值，未产生业务保存。viewport已恢复；截图outputs/shot-detail-six-columns-fixed-image-2026-10-04.png仅留工作区。

本机3002使用.next/detail-six-final standalone。代码先正常快进上传soupsouptang master，再独立更新/上传续作MD；具体SHA和回执以续作入口为准。原文件上传/下载实机验收限制保持，不把布局完成写成全站cutover。

## 最新追加：信息合列、制作方式整体与直角外框

用户最新截图要求覆盖下面标题跨两列方案：镜号和时码作为同一网格项，保留各自名称/只读/IN/OUT，组内紧凑排列；镜头标题只占一列，仍可通过输入光标阅读完整值。制作方式在三列以上固定于首行最右列并跨两行，主方式选择与辅助方式复选构成整体；窄屏按正常文档流排列。辅助项由密集横向流改为整齐网格，列宽至少260px时两列，否则一列，间距8px，区域最大96px，保留10项并支持内部滚动及键盘选择。卡片四角0px，只有Card一个1px外框；Slot/td/tr没有叠加矩形框，输入框和按钮的既有造型保留。

允许写集仅ShotDetailCard及本文/ACTIVE/续作MD，render owner不变；没有修改业务状态/请求/保存命令、API、数据库、导航或其他页。发布前核对两remote，当前无未合入增量，保留未知`:memory:.ses`。现有shot-detail-card草稿/保存/冲突/取消检查及最终Webpack/TypeScript通过。真实3002合成项目2560/1440/1024/768/375/320均352px、root/body横向溢出0、圆角0px、镜号/时码X相同；1440标题与单轨宽均173px、制作方式row 1 / span 2，2560复选网格两列，较窄单列。末尾TYPE选项实际滚动可达（辅助区域scrollTop176），Esc提示/再次Esc丢弃，重开false，未写入测试/客户数据。末行footer完整可见，临时viewport已恢复。

本机Web3002最终构建`.next/detail-grouped-final`，8002/PG和画板迁移停点维持；截图工作区outputs/shot-detail-grouped-2026-10-04.png不入Git。此前文件上传/下载实机门槛未因此解除，不宣称全站cutover。代码先正常快进上传指定soupsouptang master，续作MD随后独立同步，回执见CONTINUE_WORK最新前缀。

## 最新追加：五列布局与均等间距

用户确认先试用缩略图旁约五列，并要求每个独立项周围留有均等合理空间。本轮只修改 `apps/web/components/shot/ShotDetailCard.tsx` 和本文/ACTIVE/续作MD；render owner仍为该Card，字段/草稿/保存/权限等owner不变，未修改API、数据库、共享primitive或其他页面。

Card内部header/body/footer统一16px留白，字段网格横纵gap均16px，字段标签至控件4px。按可编辑区域实际宽度采用命名container queries（300/460/620/780px→2/3/4/5列），避免侧栏占宽仍强制五列；镜头标题跨两列，长文本五列时交替占3/2列，四列时占两列，三列以下整行。左图约占内部宽度20%、至少180px，窄卡片上下排列；隐藏字段仍集中灰色只读并沿用同一间距。卡片本体三行高、固定footer、内部滚动及图片中心缩放保持。本节覆盖下面早期24px/三栏描述。

验证：现有shot-detail-card.cjs草稿/原子payload/取消/冲突等检查、Webpack生产构建与TypeScript通过，未为纯排版重复增加测试。实际3002合成项目1440px右侧5列，每列约173px；1200px4列，1024/768px3列，375px2列，320px1列。各宽度Card352px、body16px、网格gap16px、root/body无横向溢出、footer完整可见；桌面图236×144px。实测长文本551px跨三列、文字208字符完整保留，聚焦后内部滚动且footer仍可见。临时改标题后Esc提示/第二次Esc丢弃、重开原值，未产生数据保存。截图 `outputs/shot-detail-five-columns-2026-10-04.png` 只保留工作区。3002更新为`.next/detail-five-columns`，8002/PG与原项目保持本会话已有状态。既有真实文件上传/下载验收门槛未因此解除，不将本次布局检查描述为全站cutover。

代码先提交并同步指定soupsouptang master，随后独立更新续作MD；具体回执以续作入口为准。

## 范围与协作边界

本会话用户授权：详情改为镜头行下方展开、图片放大预览/缩放/下载/替换、保存/放弃规则，完成后同步soupsouptang/StoryBoard_System master并更新续作MD；本轮先启动3002本地页面再继续。最新追加要求覆盖早期平均分栏：卡片本体占三条完整镜头行，内容与卡片边缘留白、缩略图更大、内容有主次。

允许写集：分镜表页、ShotDetailCard/Slot/ImagePreview/ImageCell及旧Inspector的上传模式开关、应用内字段adapter和保存hook、workspace开关/guard、packages/ui的显式zoom图标，详情HTTP/schema/application service/history label、针对测试及本文/动态台账。排除项目入口、导航、画板、灯光/情绪板、导入导出UI和基础设施。未调用子agent。未知`:memory:.ses`原样保留，不进入Git。真实客户媒体、视频样本与既有106镜头项目未修改；实机写入只发生在独立DETAIL_QA_1004合成项目。

开工快进合入7b2b966；发布前再fetch，快进保留e778c1c的8个增量。其Web、UI包、前端依赖diff为空，没有用本地作者名猜测GitHub UI账号归属或替换远端UI。另fetch origin/master=c93ba17，该分支完全包含在当前祖先历史，无尚未合入的montblanc08远端UI增量。新增画板后端/扩展性合同原样保留；不把其未接通Web的功能标成完成。

## 已实施交互

- Slot插在镜头行下方，占据真实纵向空间。卡片本体=max(352px, 实测行高×3)，取消外侧空白，内容区24px内边距；不再按短viewport压成两行。短屏给表格440px可用区，由上层内容区纵向滚动借空间；末行打开先滚表格再滚内容区，横向位置不重置。
- 卡片左侧大分镜画面（桌面240×144px），右侧短字段、宽标题，较长文字独立两栏；隐藏字段末尾集中灰色只读。字段标签弱化，标题适度强调，沿用现有neutral tokens、14px编辑文字和FF0082必填提示。输入尺寸有界，未聚焦多行四行省略显示，完整草稿永远不含人为截断点号；焦点进入后可用光标/滚动阅读。
- 顶部删除镜头仍需二次确认并软删，右下保存/取消，无详情X。保存仅服务器ACK后成功，保持展开；没有改值/改回原值视为clean。第一次dirty Cancel/Esc询问，确认框Cancel/Esc丢弃关闭，返回编辑保留。另一镜头触发仅关闭当前，需再次触发打开。筛选/排序/分组先处理草稿；列状态变化不能偷偷丢弃已修改值；脏快照不被query刷新重置。
- 表格已有图单击固定放大Dialog，空图单击上传。详情有/无图均点击上传/替换，暂存File与objectURL，显式Save一并写，Cancel不产生图片上传。旧Card/Wall Inspector保留原上传模式。
- 放大窗口不随表格双向滚动移动；以分镜内容区（排除导航）中心为基准，宽约50%，窄屏最小可读宽288px且限制于可用宽度。图片缩放以画面中心为基点，每次缩放将滚动位置回到画面中心；比例随图适配，zoom50–300、按钮25%步进，slider1%，下载/替换/缩放/关闭icon与Esc。下载读取当前Panel presentation的同一blob，媒体源资产/版本不覆盖。

## 命令与数据约束

POST /api/v1/shots/{id}/detail只编排既有Shot/CustomField/PanelMedia owners，不新增表或绕过命令。封闭typed built-in字段allowlist＋expected Shot/field revision；multipart最多1MiB JSON和10MiB图片。先权限、项目/Shot锁及定义CAS，再领域校验及原service，整个request一次DB事务/History。失败整步回滚/保留草稿，真正no-op不产生revision/history。一次Save里的字段＋图片只产生一条个人/项目历史；不可变媒体文件仍可由原undo/redo引用。

本地同源API proxy只在显式http loopback配置时启用（3002→8002），默认关闭，未放宽CORS/PNA保护、没有公网或生产部署。3002使用.next/detail-center standalone；8002保留本会话已运行的详情API，未重启合入新画板后端或修改本机数据库DDL，远端画板新迁移在线部署不属于本轮。后续如需重启最新API先按其独立迁移门槛演练，避免运行代码/本机schema不一致。

## 验证与尚未取得的证据

- 完整backend suite合入最新远端后146 passed（此前基线139）；actual ASGI详情测试覆盖字段+custom+image、undo/redo、no-op、晚期无效图片回滚、Shot/字段CAS、必填/enum/非法字段和401。未将SQLite测试当成新画板PG上线验收。
- Webpack生产构建/TypeScript通过；shot-detail-card、shot-image-cell、shot-selection、shot_inspector_check、history-shortcuts、shot-column-sort通过。新详情消费者测试含staged image未保存不发请求、单一payload、冲突留草稿、no-op及filter guard/Esc；build生成的tsconfig include已复原，不上传本机产物。
- 真实3002合成项目末行：卡片352px，外Slot同高；桌面与内容区左边缘224px齐平、内容内边距24px，footer约899px、窗口900px；1440/1024/768/375/320宽度都无root/body横向溢出。末行上滚、保留横向位置、内部滚动、隐藏列、图增大、两个关闭规则、字段Save+一undo、改回原值、取消焦点返回TR、筛选脏草稿提示与菜单实际验证。
- Preview稳定后中心偏移0，五宽度分别608/400/288/288/288px；50–300端点/禁用按钮/Esc通过；追加中心缩放在200%实测图片中心与预览中心X/Y偏移均0，scrollLeft287／scrollTop162；滑杆键盘201%按画面中心重新定位。下载按钮已实际点击，但Chrome extension automation未返回download完成事件；不能宣称真实文件下载收据已验证。Chrome上传文件路径权限关闭，未代为放宽权限，真实选图/替换提交门槛BLOCKED_VISUAL；服务端和合成组件已验证。用户开启ChatGPT Chrome扩展Allow access to file URLs后可补实际上传/替换验收。共享reduced-motion规则保留，没有改OS设置或声称专项切换验收。
- 截图只留工作区outputs：shot-detail-2026-10-04.png、shot-image-preview-2026-10-04.png、shot-detail-columns/header-menu/cell-menu-2026-10-04.png，不进源码。原页面与数据保留。

## 同步

代码及相关owner/API/screen/active台账先上传指定master；续作MD再单独更新并上传。具体提交及远端回执以CONTINUE_WORK最新前缀为准。自动审批若拒绝必须报告原因，不绕过、换remote或改写远端历史。整体INTEGRATED_NOT_CUT_OVER，不扩大到其他旧产品待办。
