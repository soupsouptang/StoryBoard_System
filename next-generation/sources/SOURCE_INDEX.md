# 需求来源及范围审计

2026-10-05。固定读取基线：`493bbb24e92f42315ad54e451629ef005fd5ab00`。业务文档引用是规则出处，不作为下一代代码、样式、数据、模板或进度资产。

| 来源 | 固定版本 SHA-256 | 使用内容与限制 |
| --- | --- | --- |
| [VNEXT_MAX_EXTENSIBILITY_REQUIREMENTS.md](https://github.com/soupsouptang/StoryBoard_System/blob/493bbb24e92f42315ad54e451629ef005fd5ab00/storyboard-system/docs/VNEXT_MAX_EXTENSIBILITY_REQUIREMENTS.md) | `ae576d533245dce5f063ceaf6ee80079ff148c693ca495666ec5fb4447fd2524` | 业务语义及决定；旧UI保留、现有代码复用与旧迁移细节不继承 |
| [VNEXT_KNOWLEDGE_LAYER_REQUIREMENTS.md](https://github.com/soupsouptang/StoryBoard_System/blob/493bbb24e92f42315ad54e451629ef005fd5ab00/storyboard-system/docs/VNEXT_KNOWLEDGE_LAYER_REQUIREMENTS.md) | `7b1b7e9567bd991f5981bec7f01dbafe07cd6af8234cc143469af3a1e73c4405` | 业务语义及决定；旧UI保留、现有代码复用与旧迁移细节不继承 |
| [JOB_CATALOG_DEFINITIONS_2026-10-05.md](https://github.com/soupsouptang/StoryBoard_System/blob/493bbb24e92f42315ad54e451629ef005fd5ab00/storyboard-system/docs/JOB_CATALOG_DEFINITIONS_2026-10-05.md) | `390adc1955fa507807d8eac1cb70b910b03c0509ce5a0370837e4d7ca15429dd` | 业务语义及决定；旧UI保留、现有代码复用与旧迁移细节不继承 |
| [ROLE_WORKFLOW_REQUIREMENTS_2026-10-03.md](https://github.com/soupsouptang/StoryBoard_System/blob/493bbb24e92f42315ad54e451629ef005fd5ab00/storyboard-system/docs/ROLE_WORKFLOW_REQUIREMENTS_2026-10-03.md) | `477edc6607ef753f1e471235fe90e12945a6a4f00165893d914279ffc031bb65` | 业务语义及决定；旧UI保留、现有代码复用与旧迁移细节不继承 |
| [RESOURCE_TIME_REQUIREMENTS_2026-10-04.md](https://github.com/soupsouptang/StoryBoard_System/blob/493bbb24e92f42315ad54e451629ef005fd5ab00/storyboard-system/docs/RESOURCE_TIME_REQUIREMENTS_2026-10-04.md) | `63d5a1d48c27cef87564f64d78a501ae2890f307cac35c66d0f5c98a8fb6620a` | 业务语义及决定；旧UI保留、现有代码复用与旧迁移细节不继承 |
| [EXTENSIBILITY_EXECUTION_STANDARD_2026-10-04.md](https://github.com/soupsouptang/StoryBoard_System/blob/493bbb24e92f42315ad54e451629ef005fd5ab00/storyboard-system/docs/EXTENSIBILITY_EXECUTION_STANDARD_2026-10-04.md) | `11caf530525863068dbcfa4abd63363b0b3e17ff64a5f0d71b45fea89114df2c` | 业务语义及决定；旧UI保留、现有代码复用与旧迁移细节不继承 |
| [COLUMN_MODEL_REQUIREMENTS_2026-10-02.md](https://github.com/soupsouptang/StoryBoard_System/blob/493bbb24e92f42315ad54e451629ef005fd5ab00/storyboard-system/docs/COLUMN_MODEL_REQUIREMENTS_2026-10-02.md) | `130c70666c7abdcd1b89d25228ab903ae1be562c8b17290619133d41990858b3` | 业务语义及决定；旧UI保留、现有代码复用与旧迁移细节不继承 |

总纲3.3、知识2.1及工种1.0读取时仍包含旧 UI 保护、既有接口/HistoryService复用、旧工作包状态和旧截图验收。下一代以本会话明确的空库、无旧资产、入口重设计覆盖这些实施约束；业务范围和权限、版本、需求汇总继续抽取。没有将旧清单38包的任何完成状态迁入。

最新工种目录明确四种制作分工不是日历阶段，岗位与权限独立，团队岗位可复用；J-01—J-08仍未决。知识门槛为10个独立执行单位和3个项目，每账号每天最多3个非阻断主题，原始数据隔离。资源需求只做时段清单，不恢复库房或使用教程。

本目录 AGENTS、需求基线、UI 与导出应一致；有争议的归属、权限或状态先询问，不能以参考截图或重构自行决定。来源后续更新时需逐项对照最新用户决定，不自动导入新内容或覆盖本目录。

当前只做文档链接、XML和Git写集检查。未运行下一代应用或文件渲染测试；没有实施声明。

本轮实际检查：24份Markdown的90个本地链接存在，两份新绘SVG可被XML解析且没有脚本或外部资源引用；两工作区的旧执行清单跳转均使校验器明确退出码2并说明没有运行验证/产品测试；历史机器清单与来源提交字节一致；新写核心文档未发现IPv4或凭据赋值模式。Git文档及工具差异空白检查通过。这些是仓库整理检查，不是功能验收。

## 2026-10-05布局深化的附加来源

旧功能黄金基线已由用户明确判为无效。上面的固定Git来源是需求讨论的出处，不是功能恢复清单；历史源稿仍保留原文，不能将其中Golden Baseline、旧UI保护或已通过验收的表述带入新版。

两批截图按[参考分析](../REFERENCE_LAYOUT_STUDY.md)组织；本次重新查看其中十个独立画面，未搬入原附件。由此写出[布局细则](../UI_LAYOUT_SPEC.md)，其中尺寸、密度与默认排列都是本项目的提案，不是从截图测得的精确值或用户已确认参数。

| 在线资料 | 本次核查内容 | 使用边界 |
| --- | --- | --- |
| [Yamdu通告帮助](https://support.yamdu.com/en/articles/31336-creating-and-distributing-call-sheets) | 模板、草稿布局、排期调整、收件名单、发送报告 | 为分步工作页提供参考，不代替本项目固定修订和显式外发规则 |
| [shadcn Data Table](https://ui.shadcn.com/docs/components/radix/data-table) | 排序、筛选、列显示、选择和分页组合指导 | 不安装依赖、不锁定示例主版本，不作为排期业务引擎 |

本包的写集、检查和未实现范围见[规划更新记录](../PLANNING_UPDATES.md)。原13份源稿及历史机器清单保持资料存档，本次不修改其正文或旧完成记录。
