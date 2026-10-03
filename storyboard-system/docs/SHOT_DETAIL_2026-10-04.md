# 2026-10-04 分镜详情卡片与图片预览实施记录

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
