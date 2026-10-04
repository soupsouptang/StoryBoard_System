> **范围：当前版本记录/合同。** 旧功能基线无效；正文中的来源、实现状态及验收仅对应注明提交。下一代不继承旧实现或 UI；当前任务不得按历史待办自动执行。

# 分镜画面构图、锁定与双击复位 · 2026-10-04

## 最新追加：两个入口共用撤销/重做控件

用户要求表格分镜小图与详情大图打开同一版本，并明确不能复制两套近似控件。两个入口继续只调用ShotImagePreview；标题行中的Undo2/Redo2、32px按钮/16px图标及快捷键仅在该组件定义一份，始终显示、按历史/权限/pending置灰。详情传入原本地frameUndo/frameRedo，不提前提交；表格入口接入原项目HistoryService，恢复项目最新可撤销/重做步骤，title包含该步骤标签。小图仍只有Lock提交，详情Lock仍进草稿后Save。

将原ProjectHistoryControls的query/Command/CAS/pending/重复请求保护及反馈提取为useProjectCommandHistory，项目菜单和图片窗口共用同一客户端适配；原项目＋用户query key、revision及后端权限/审计/HistoryService保持，不另建持久历史。表格窗口仅在open时启用该query。成功等待ACK及cache失效后刷新画面并清除未锁定替换/调整；失败保留画面，窗口内显示错误。统一⌘Z/Ctrl+Z、⌘⇧Z/Ctrl+Shift+Z/Ctrl+Y处理，不抢输入框/中文输入法/重复按键；Dialog外的原全局快捷键规则保持。没有API/DB/依赖/共享primitive变化。

五份针对检查通过：project-command-history验证真实hook的CAS/ACK/重复/pending/disabled/失败恢复；shot-framing-preview验证同一消费者两种历史派发、失败保留与ACK刷新，原坐标/取消/双击/冲突保持；shot-image-cell验证撤销成功清除未锁定替换；shot-detail-card与history-shortcuts保持。正式Webpack/TypeScript、diff通过。

真实3002合成012：小图125%Lock→窗口Undo100%→Redo125%，Ctrl+Z/Ctrl+Y恢复，最后Undo回原100%基线；详情草稿125%Lock→Undo100%→Redo125%，Meta+Z/Meta+Shift+Z同结果，再Undo并Esc退出，详情版本29保持且已保存，无详情业务提交。实际97镜头008两个入口只读验收，各显示同样32px/16px按钮。1440/1024/768/375/320共用窗口宽608/400/288/288/288px，根/Dialog无横向溢出，两个按钮均可见；标准1280两入口宽528px一致。viewport恢复、QA页关闭，证据outputs/shot-preview-history-table-2026-10-04.jpg及shot-preview-history-detail-2026-10-04.jpg仅留本机。

本机3002更新.next/preview-history standalone（部署时PID68349），API8002/PG55432与媒体保持，无DDL。未知:memory:.ses原样保留未stage。按用户已授权soupsouptang/StoryBoard_System master正常快进同步，代码先上传、续作MD随后独立更新上传；不扩展其他旧待办。

最新追加「载入原图」完整居中contain、默认上传cover及连续构图撤销修复，现有Lock/Esc/双下载保持。见[后续记录](SHOT_ORIGINAL_FIT_2026-10-04.md)；以下为此前阶段证据。

## 最新确认规则

- 画框取项目比例，不支持独立自定义比例；小数比例也支持，例如2.35:1。
- 缩放50–300%，按钮25个百分点、滚轮连续缩放；左键拖动，松开停留。允许缩小或位移后留下黑色空区。
- 胶囊代替slider：左圆形Minus、中间百分比、右圆形Plus，留舒适间距。双击百分比恢复100%居中满框，丢弃尚未锁定调整，不保存或删除已记录历史。
- 小镜头有图点击预览、空图点击上传。预览替换File暂存，只有Lock提交；Esc/X/窗外取消尚未Lock的调整和替换。
- 详情大图使用相同预览。Lock记录本地草稿步骤，支持局部Undo/Redo及通用快捷键；卡片Save才将字段、自定义值、File和构图一起提交。原脏草稿关闭确认语义保留。
- 两种下载分别为当前构图PNG、原图原始bytes；替换/锁定也有icon。弹窗固定居中于分镜内容区，排除导航，不随表格双向滚动；桌面宽约内容区50%，高度按画幅，窄屏自然换行。

## 实施及保存约束

ShotImagePreview统一渲染/事件，shot-framing提供项目cover初始化、归一化pan/zoom和Canvas草稿/下载，复用media-preview。缩放保持当前画面中心，双击重新初始化项目满框构图。交互采样默认≤960px，构图下载采用输出分辨率；API仍独占权威保存成品渲染。

useShotFraming读取panel presentation及不可变source，打开时来源revision保留到保存；refetch不覆盖未锁定草稿。换图解码期间禁用锁定/缩放，避免沿用旧尺寸。409/失败保留草稿，只有ACK后显示锁定。

现有multipart ShotDetailSave增加framing：source为null（同次上传新图），或包含asset/panel/presentation/source版本。ShotDetailService→PanelMediaService→ImageCropService复用权限、项目/Shot锁、presentation CAS、AssetVersion/MediaPresentation、audit、History及get_db事务。服务端独立复核画幅，2.35:1→47:20；scale仅50–300%。字段/File/构图一事务一历史步，失败整步回滚，no-op不造假revision/history。无新路由、DB表/DDL、持久owner或Legacy实现。

## 验证证据

- 后端test_shot_detail.py + test_image_assets.py：9 passed。覆盖16:9/2.35:1输出、50%空区、原图bytes保留、来源/比例拒绝、presentation冲突、字段/图片/构图回滚、一历史步、no-op及项目Undo/Redo。
- 前端shot-framing.cjs、shot-framing-preview.cjs、shot-detail-card.cjs、shot-image-cell.cjs均通过。实际组件事件覆盖drag/release/wheel边界/双击100%且位移归零、不保存、dirty refetch、409留草稿、替换取消及Lock提交、详情局部Undo/Redo和原子payload。
- 正式UI包及生产Webpack/TypeScript构建通过，无新增依赖。最终diff及Regression Guard以9417a48为base检查。
- 真实3002 + PG/API合成012：125%未锁定Esc重开100%；连续Lock125%/150%无冲突，Project Undo两步恢复。详情Lock125%形成草稿，局部Undo100%/Redo125%，关闭预览后卡片Save提示保存成功，再Project Undo恢复。
- 真实file chooser选绿色合成PNG：预览绿色，Esc重开原蓝黄图；再次选图并Lock成功，Project Undo恢复。真实97镜头项目仅只读预览，没有保存/替换。
- 两种下载实际落到Downloads：镜头012_构图画面 (1).png为1920×1080，镜头012_原图.png为800×450，尺寸/像素独立检查。浏览器download事件timeout，但文件实际收到，不能以事件超时冒充没有下载或成功。
- 实机50/300及对应按钮禁用、双击100%、Esc/窗外取消重开100%、真实样本008预览均通过。
- 最终1440/1024/768/375/320弹窗宽608/400/288/288/288px，内容区居中差0、根/弹窗横向溢出0。16:9/项目设置2.39:1画框实机通过；2.35:1由HTTP及纯函数覆盖。合成项目已恢复16:9，合成保存经项目撤销恢复原内容。

## 仍待实机复核

当前DOM浏览器自动化接口没有原生drag/wheel动作；调用Codex原生应用控制被工具明确禁止，未绕过。组件事件/坐标/停止/滚轮边界测试通过，但这两项不能标为真实鼠标实机PASS。用户可在本地预览复核，或具备合法原生输入能力后补。整体INTEGRATED_NOT_CUT_OVER。

## 部署与同步

Web3002采用.next/shot-framing-interaction/standalone/apps/web，API8002沿用现有本机运行配置重启，PG55432/原数据和媒体保留，无DDL。入口http://127.0.0.1:3002/productions，刷新加载新版本。本机最终Web PID53266/API PID52490。

两个GitHub remote已fetch，无HEAD之外待合入提交。此前push的具体目的地授权阻挡已解除：用户在明确列出soupsouptang/StoryBoard_System master后回复“强制上传”。正常快进push回执451323f→f8875c5，代码和对应实施MD已上传，续作及本同步记录随后单独提交上传；无需改写远端历史，未绕过审批。最终MD回执以Git远端查询为准。

截图本机outputs/shot-framing-preview-2026-10-04.jpg，不进入Git。无子agent；未知:memory:.ses保留，不stage。续作入口在CONTINUE_WORK.md。
