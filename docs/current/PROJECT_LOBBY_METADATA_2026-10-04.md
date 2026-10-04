> **范围：当前版本记录/合同。** 旧功能基线无效；正文中的来源、实现状态及验收仅对应注明提交。下一代不继承旧实现或 UI；当前任务不得按历史待办自动执行。

# 项目大厅卡片信息顺序 — 2026-10-04

用户补充确认：使用现有总时长，顺序为项目类型、画面比例、帧率、镜头数、总时长；字号、样式、版式不改。当前实际97镜头卡片为「宣传片、16:9、30 fps、97 镜头、总时长 00:06:23:01」。

只调整apps/web/app/(workspace)/productions/page.tsx的五项顺序与现有时长格式。原整数秒mm:ss改为参考图的HH:MM:SS:FF，调用现有@frameforge/timecode.framesToTimecode并使用项目fps_num/fps_den/drop_frame；仍消费项目列表API的total_duration_frames，不创建第二项时长或逐项目Shot请求。未知时长显示「总时长 待定」。标题、封面、操作、更新日期、className、字体、间距、颜色及数据owner均保持。无API/DB/DDL/依赖变化。

正式Webpack生产构建与TypeScript通过，既有tests/frontend/shot-summary.cjs通过（含帧时码及drop-frame总帧数检查）；diff检查通过。没有为纯排序添加镜像测试。

真实3002大厅四张卡片只读验证：顺序正确，分别显示00:06:23:01、00:00:36:00、00:00:03:00、00:05:05:07。1440实际12px字号/16px行高/12px横gap保持，1440/1024/768内容一行完整。五宽度根横向溢出均0；375/320沿用旧横向卡片，左侧信息被右侧日期/按钮挤压（320可用宽0），本轮遵循不改版式的明确要求保留，不宣称大厅整体移动端布局验收通过。该限制记录在SCREEN台账，不扩展修改。

证据工作区outputs/project-summary-order-2026-10-04.png为真实1440页面，仅保留本机；临时QA页关闭、viewport恢复，未写用户数据。3002最终.next/project-summary-order standalone Web PID77271，API8002/PG55432/媒体保持。生成tsconfig已复原，未知:memory:.ses保留、不stage。

代码与本记录先正常快进上传soupsouptang/StoryBoard_System master；续作MD随后独立更新上传。开始fetch与远端无分叉。Regression Guard在代码提交后上传前执行，回执记录续作入口。
