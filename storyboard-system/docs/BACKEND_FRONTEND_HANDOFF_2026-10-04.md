# 后端与前端衔接账本

日期：2026-10-04，Asia/Shanghai。开工已快进合入远端 `f291433`。此账本记录范围和待接入合同；“进行中”不等于测试通过。

## 协作边界

- 主执行者负责后端、测试、文档。本轮不改 UI；此前实现子 agent 已停止。另一个 GPT-6.1 Sol agent 仅允许写新增扩展性实施方案。
- 不设全站 UI 冻结；其他获明确 UI 任务的会话可继续，保留已确认分镜工作台表格/控件/布局/样式及整行照片项目入口要求。
- 后端允许范围：画板模型/迁移/路由/服务、快照与项目历史整合、素材引用保护、文档导入导出及定向测试。公共注册、迁移链和台账由主执行者整合。
- 修改前核对远端、本地dirty和文件负责人；不覆盖其他会话工作。显式暂存文件、不用 `git add .`；推送前复查远端。新增UI接入应从最新代码开始，以小补丁修改，不整文件恢复旧草稿。

## 后端变动产生的前端缺口

| 能力 | 后端合同 / owner | 尚需前端接入与验收 |
| --- | --- | --- |
| 灯光2D/3D、情绪板 | `BoardService`；`/api/v1/productions/{id}/boards`，renderer共用同一对象文档 | 上轮新画板路由/组件为本地未提交草稿，未验收；只补新模块，保留既有工作台。需保存ACK、409保留草稿、刷新、三栏与2D/3D坐标一致 |
| 画板undo/redo | 复用远端现有 `HistoryService`，个人/项目100步；项目history端点唯一持久游标 | 新画板不使用第二套独立游标；局部undo/redo需board revision与history_revision，且最近操作属于当前画板。消费者重新读取项目history；旧草稿can_undo/can_redo合同需调整 |
| 内容版本 | lighting section进入项目内容快照；情绪板排除 | 现有Review比较可接新增section，不改布局。快照/比较不代表全项目restore/merge已经完成 |
| 画板图片 | `BoardAssetReference`保留历史媒体；Asset references增加board列表及reference_board_count | 素材库“未使用”与删除解释需计入画板/历史引用；本轮只接服务端保护，前端统计待复核。禁止拉伸，原图保留 |
| 导入 | `ImportService`的append/update/replace plan、稳定ID及expected revisions正在收口 | 既有弹窗默认append合同保留；模式/非空冲突预览/确认与替换范围尚待接入，不保存客户模板。须验证单次事务、失败回滚及一个undo步 |
| 六版式/工程PDF | `document_export`、`engineering_pdf`、exports router正在收口 | 交付页完整layout、范围、工程恢复入口待接入；复用字段选择。正文/附件/QR须同一授权范围，实际文件回读；QR/hash不能冒充隐写水印 |
| 友好错误 | validation handler只输出可序列化loc/msg/type | 现有api-client错误合同继续使用；不需改UI。validator异常应返回422，不回传正文/凭据 |

## 本地草稿保护

前次未完成的新画板页面/组件、Three依赖仍独立保留，不纳入本轮后端提交。ImportModal旧草稿已保存本地补丁，最新远端弹窗保持原样。后续先复核最新远端和合同，不直接整份恢复覆盖其他会话。

## 后续独立门槛

远端项目撤销重做已接通既有操作，旧“项目历史完全缺失”结论作废。仍逐项验收：新模块历史整合、项目restore/三方merge、成员权限、协作/outbox发送、列稳定识别、便携工程持久导入、真实TTS、水印抗截图/裁剪、持久作业与完整媒体GC。岗位/演职工作流当前是需求文档，不宣称已实施。全站视觉及生产部署未验收。
