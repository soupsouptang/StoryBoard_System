> **范围：当前版本记录/合同。** 旧功能基线无效；正文中的来源、实现状态及验收仅对应注明提交。下一代不继承旧实现或 UI；当前任务不得按历史待办自动执行。

# 载入原图与居中画框 · 2026-10-04

## 用户确认规则

- 图片悬浮窗左侧新增「载入原图」，与右侧「替换」处于同一行、左右边缘留白一致。缩放胶囊始终位于画框中轴；窄屏其余操作自然换行。
- 新上传图片默认水平、垂直居中铺满项目画框，超出画幅的两侧裁去。
- 载入原图恢复完整原始上传图片，按项目画框等比适配、始终居中；比例不一致时允许左右或上下黑边，不拉伸、不改项目比例。
- 载入原图只改变未锁定预览。小图必须 Lock 才保存；详情 Lock 进入本地草稿历史，卡片 Save 提交。Esc/X/窗外取消未锁定调整。双击百分比仍恢复100%居中铺满。
- 原图和构图两个下载保留；原始上传 bytes 不覆盖。两类缩略图共用该窗口。

## 权威实现

MediaTransform 增加 frame_fit=cover|contain，默认 cover；可缺省读取现有 VNext metadata，语义相同的保存不新增 presentation/history。字段仍在既有 MediaPresentation JSON 内，无路由、表或 DDL 增量。

ShotImagePreview 是唯一窗口/预览事件 owner；originalFrame 取完整 source crop、100%缩放及零位移。contain 的缩放/位移在项目画框内渲染，允许画面进入原先的黑边；pan 按原图实际适配尺寸换算，保持指针移动距离。服务端 image_framing 为成品权威，Canvas 仅草稿/PNG下载。不可变 AssetVersion、原 detail Command/CAS、权限、事务和项目 History 保留。

真实连续撤销发现既有构图命令会更新 Shot token，但 History 只记录有业务值改变的对象，导致后续撤销引用冲突。HistoryService.finish 现在在存在真实业务变化时，将同次命令中只有 token 改变的 Shot 纳入同一 history step；保留精确期望值与外部修改冲突保护，token-only/no-op 本身不产生历史。修复前已生成的旧测试历史不强行改写或绕过冲突；合成基线通过正常图片命令恢复后，重新验证新步骤连续撤销。

## 验证与部署

- 后端 original_fit、shot_detail、image_assets、command_history 四份检查29 passed：16:9/47:20，竖图/超宽图完整居中及默认cover、旧metadata缺省等价no-op、不可变源、CAS/回滚/权限、单次历史、连续撤销和原历史安全门槛。
- 前端 shot-framing、shot-framing-preview、shot-detail-card、shot-image-cell 全部通过；包含原图加载只改草稿、100%满框复位、contain移动坐标、原有dirty/refetch/冲突留草稿和原子Save。生产 Webpack/TypeScript通过。
- 实际3002合成012上传900×1600四色边竖图：默认铺满裁去上下，载入原图完整保留上下及左右边、两侧黑边且居中；Lock后重开保留contain，双击cover后Esc重开回到contain。
- 详情实际局部Undo恢复contain、Redo恢复cover；未锁定载入原图Esc后卡片Save仍保存已锁定cover，显示「保存成功」。修复后新小图替换contain→cover连续Lock，再连续两次项目Undo恢复contain及原蓝黄图片。合成基线已恢复；实际97镜头项目仅只读核验。
- 1440/1024/768/375/320宽度：Dialog宽608/400/288/288/288，根与Dialog横向溢出0，载入/替换同Y且左右留白17px，缩放胶囊/画框/内容区中心齐。viewport恢复。
- 实际构图下载「镜头012_构图画面 (2).png」1920×1080，左侧黑色、中心白色、顶部黄色/底部绿色，证明完整原图进入固定项目画幅。证据图：outputs/shot-original-fit-2026-10-04.jpg，仅保留本机，不上传原图/测试媒体。
- 本机 Web3002使用 .next/shot-original-fit standalone，API8002已重启；现有PG55432和用户媒体保留，无DDL。旧功能原生drag/wheel工具能力门槛仍待实机复核，不据此宣称整站cutover。

代码先提交并同步用户已授权的 soupsouptang/StoryBoard_System master，续作MD随后单独同步；最终提交及远端回执记录在 CONTINUE_WORK.md。
