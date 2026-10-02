# FrameForge 列模型需求：内置列 / 预设列 / 自定义列

> 日期：2026-10-02  
> 状态：**部分实施；代码 `095fb7a`，完整验收仍有待办**
> 优先级：本文件覆盖此前文档中“所有业务列都允许永久删除”的旧规则。  
> 范围：VNext Shot Table、列管理、Saved View、导入映射、版本/历史、导出交付。  
> 最初本文件仅更新Markdown；用户随后已授权实现。当前实现与未完成范围见[数据库实施记录§9](VNEXT_DATABASE_IMPLEMENTATION_2026-10-02.md#9-非破坏图片三类列与交付字段第六段)。本文仍是目标合同，不代表所有条目已完成；未操作生产数据。

## 1. 目标

FrameForge 的业务列正式分为三类：

1. **内置列 Built-in**：FrameForge 核心 Shot/工作流长期依赖的列。允许隐藏、删除到回收站和恢复，**禁止硬删除 / Purge**。
2. **预设列 Preset**：FrameForge 官方提供的可选业务字段模板。项目按需添加；允许隐藏、删除、恢复和**永久删除**。
3. **自定义列 Custom**：用户在项目内自行创建的字段。允许隐藏、删除、恢复和**永久删除**。

“是否默认显示”与“列类别”必须解耦。内置列不要求全部默认显示；预设列也可以由模板默认启用。

技术 ID、revision、权限、FK、审计序号、内部排序身份等不是业务列，不进入这三类目录，也不出现在普通列管理中。

## 2. 三类列的生命周期

| 能力 | 内置列 | 预设列 | 自定义列 |
| --- | --- | --- | --- |
| 项目创建时存在定义 | 是 | 否，按模板/用户添加 | 否 |
| 可隐藏 | 是 | 是 | 是 |
| 可调整顺序/宽度/换行 | 是 | 是 | 是 |
| 可删除到回收站 | 是 | 是 | 是 |
| 可恢复 | 是 | 是 | 是 |
| 可永久删除 / Purge | **否** | **是** | **是** |
| 删除后保留业务值 | **是** | 是，直到 Purge | 是，直到 Purge |
| Purge 后清当前值 | 不适用 | 是 | 是 |
| Purge 后清受控历史内容 | 不适用 | 是 | 是 |
| 可在交付导出中排除 | **是** | 是 | 是 |
| 可重新添加 | 恢复原内置列 | Purge 后从官方预设重新添加为新项目实例 | Purge 后重新创建为新 ID/key |

### 2.1 隐藏、删除、永久删除必须分开

- **隐藏 Hide**：只改变共享视图呈现。列仍 active，不影响数据和系统逻辑。
- **删除 Delete**：进入回收站。普通 Shot Table 不再显示，也不允许普通编辑；可恢复。
- **永久删除 Purge**：只适用于预设列和自定义列。清除项目实例的值与受控历史内容，并保留最小 tombstone/删除记录，阻止旧缓存、版本恢复或导入重放复活旧数据。
- 不再提供“归档列”作为第四种生命周期。

## 3. 内置列：9 个

内置列的判断标准不是“当前是不是数据库物理字段”，而是：**删除其定义或业务值会破坏 Shot 核心身份、层级、时序、主要内容或工作流 owner**。

| 序 | key | 名称 | 核心 owner / 语义 | 删除规则 |
| --- | --- | --- | --- | --- |
| 1 | `display_number` | 镜号 | Shot 展示身份与排序后的业务编号 | 可删除到回收站；不可 Purge |
| 2 | `panel_image` | 分镜画面 | Panel / Asset 关系的主要画面入口 | 可删除到回收站；不可 Purge |
| 3 | `tc_in` | 时码 TC | 起始时码 + 全局 Shot 顺序 + duration 派生 | 可删除到回收站；不可 Purge |
| 4 | `duration_frames` | 时长 | 时间线、时码、VO timing 等基础时序 | 可删除到回收站；不可 Purge |
| 5 | `name` | 镜头标题 | Shot 的主要可读名称 | 可删除到回收站；不可 Purge |
| 6 | `sequence_id` | 篇章 | Shot 层级 / Sequence 关联 | 可删除到回收站；不可 Purge |
| 7 | `description` | 画面描述 | Shot 核心画面叙述 owner | 可删除到回收站；不可 Purge |
| 8 | `primary_method` | 制作方式 | 主/辅制作方式与制作工作流 | 可删除到回收站；不可 Purge |
| 9 | `status` | 状态 | Shot 工作流 / Review 状态 | 可删除到回收站；不可 Purge |

### 3.1 内置列删除语义

内置列点击“删除”时：

- 列进入项目回收站 / removed 状态；
- Shot Table 与普通可编辑入口退出；
- **底层 canonical 值不清除**；
- 历史版本、审计、Review、时间线、排序、Panel/Asset、项目层级等系统逻辑不得因此损坏；
- 恢复时使用同一个稳定内置 identity；
- UI 不提供“永久删除”，API/Service 也必须拒绝 builtin purge；
- 删除内置列不能通过改名、复制、导入或旧 Saved View 形成第二个同义 owner。

### 3.2 默认视图

默认 Shot Table 仍建议只显示约 7 个高频列，避免 9 个内置列全部强制铺开。默认可见集合属于模板 / Shared View 策略，不改变列类别。

## 4. 预设列：20 个

预设列是 FrameForge 官方提供的业务字段模板。它们可以有官方 label、类型、选项与 formatter，但**不是系统不可删除的基础结构**。

| 序 | key | 名称 | 建议类型/归属 |
| --- | --- | --- | --- |
| 1 | `shot_reference` | 镜头 | text；语义与镜号 / Shot ID 分离 |
| 2 | `location` | 场景/地点 | text / Scene 映射待合同确认 |
| 3 | `shot_size` | 景别 | select |
| 4 | `lens_mm` | 焦段 | number / 保留无法标准化的来源文本策略 |
| 5 | `camera_movement` | 运镜 | structured/select |
| 6 | `camera_angle` | 机位角度 | select/text |
| 7 | `voice_over` | 对应旁白 | textarea |
| 8 | `department` | 责任部门 | select |
| 9 | `int_ext` | 内外景 | select |
| 10 | `day_night` | 日夜 | select |
| 11 | `dialogue_character` | 对白角色 | text/multiselect，角色实体化另行决定 |
| 12 | `performance` | 表演提示 | textarea |
| 13 | `dialogue` | 对白 | textarea |
| 14 | `edit_transition` | 剪辑/转场 | text/select |
| 15 | `notes` | 备注 | textarea |
| 16 | `action` | 动作 | textarea |
| 17 | `feasibility` | 可行性 | select/text |
| 18 | `replacement` | 建议替换内容 | textarea |
| 19 | `execution_method` | 执行方式 | text/select；不得与制作方式混为同一 owner |
| 20 | `owner_id` | 负责人 | user reference / text fallback |

预设 catalog 与项目实例必须分开：

- 删除项目预设列不删除系统预设模板；
- Purge 清除该项目实例及其值/受控历史；
- 之后重新添加同一预设时创建**新的项目列实例 identity**，不得恢复已 Purge 的旧值；
- 官方预设升级不能静默覆盖项目已调整的 label、宽度、选项或 formatter。

## 5. 自定义列：N 个

自定义列由项目用户创建，数量不固定。支持 `text`、`textarea`、`number`、`boolean`、`date`、`url`、`select`、`multiselect`、`json`。

来源语义：

- `preset`：官方 catalog 实例化；
- `custom`：项目自行定义；
- `import`：未知外部表头导入时创建，产品层按自定义列处理，同时保留来源 metadata。

列类别创建后不可通过改名直接转换。需要转换时必须建立显式迁移/复制命令，不能只修改 `origin` 绕过生命周期规则。

## 6. 旧 32 列方案的处理

此前“32 项预设全集”不再是目标列分类。

当前目标业务目录：

```text
9 Built-in
+ 20 Preset
+ N Custom
= 29 + N 项目业务列
```

以下旧字段不再作为普通官方列目录成员：

- 原镜号
- 原描述
- 分镜图框
- 机位/运镜

它们只作为 Legacy / Excel / PDF 等导入过程中的**来源字段或 Import/Custom 列**处理，不自动进入默认项目，也不得绕过三类列生命周期。

## 7. 数据模型需求

目标语义可以继续由统一 `project_columns` 承担项目列 owner，但必须显式表达：

```text
column_class = builtin | preset | custom
origin       = builtin | preset | custom | import
state        = active | trashed | purging | purged
```

规则：

- `column_class=builtin`：只允许 `active ↔ trashed`；任何 `purging/purged` 请求必须服务端拒绝。
- `column_class=preset/custom`：允许 `active ↔ trashed → purging → purged`。
- `column_class` 创建后不可变。
- 内置列拥有稳定 catalog key 与稳定项目 identity。
- 预设 catalog 与项目列实例分离。
- 如果某个现有实体字段被重新归类为预设列，实施前必须审计“系统是否仍隐式依赖它”；存在核心依赖就不能支持 Purge，必须留在 built-in。
- 不允许为了实现自由删除而在另一张表、JSON 或快照中偷偷保留同一业务值的第二权威副本。

## 8. 列管理 UI

列管理改为四区：

1. **内置列**
2. **预设列**
3. **自定义列**
4. **回收站**

内置列允许显隐、顺序、宽度、删除和恢复；不允许永久删除、修改字段类型或转换类别。

预设列从官方 catalog 添加；项目实例支持显隐、顺序/宽度、删除、恢复、永久删除。

自定义列支持创建、编辑定义、显隐、顺序/宽度、删除、恢复、永久删除。字段类型变更必须先验证已有值。

回收站必须显示类别：

- 内置列：只提供“恢复”；
- 预设列：恢复 / 永久删除；
- 自定义列：恢复 / 永久删除。

## 9. 导出交付页字段控制

**内置列不可硬删除，不代表必须导出。**

交付页必须提供独立于 Shot Table 显隐状态的“导出字段”配置：

- 按 **内置 / 预设 / 自定义** 分组；
- 搜索、单字段勾选、分组全选/全不选；
- 支持保存为交付模板；
- 预览与最终导出使用同一个 server-side allowlist；
- 任意 active 内置列都允许取消勾选；
- 已删除到回收站的内置列默认且强制不进入新的普通列型交付，恢复后才重新成为可选项；
- 已 Purge 的预设/自定义必须从旧交付模板、Saved View 和新导出任务中自动清除；
- PDF、Word、XLSX、CSV、分镜表等可配置列型交付不得以“数据库内置字段”为理由强制输出某列。

EDL、OTIO、SRT 等协议格式所需的技术数据与“表格导出字段”分开建模；UI 标记“格式必需”，不能把协议结构字段伪装成普通可选列。

## 10. 导入映射

1. 只有明确匹配受支持 Built-in catalog key 才能映射为内置列。
2. 明确匹配官方 Preset catalog 的，映射到该预设项目实例。
3. 未识别字段默认建议创建 Import/Custom 列。
4. 不能因为中文名称相似就猜成内置列。
5. Legacy 便携工程文件遵循同样规则；文件桥不能创建第二套隐藏内置字段。

## 11. 验收标准

- 新项目能区分 9 内置、20 预设和 N 自定义。
- 内置列没有任何可达 hard-delete/Purge 路径。
- 内置列删除后值仍存在，恢复后原值与原 identity 返回。
- 内置列从表格删除后，依赖该值的系统功能仍正常工作。
- 预设/自定义软删除可恢复。
- 预设/自定义 Purge 后当前值与受控历史内容不能通过版本恢复、Saved View、导入重放或旧缓存复活。
- Purge 后重新添加同名预设/自定义得到新项目列 identity，不恢复旧值。
- 导出交付页可取消任意 active 内置列；预览与实际文件一致。
- 已删除内置列不进入新的普通列型交付。
- 已 Purge 预设/自定义不进入任何新导出，并从旧模板引用中清除。
- 多用户并发下删除/恢复/Purge 使用 revision、permission、commit ack，失败不显示成功。
- 本需求实施前必须补数据库、API、UI、导出和浏览器测试；本文件本身不代表功能已经完成。
