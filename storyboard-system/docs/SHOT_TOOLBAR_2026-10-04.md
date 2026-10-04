# 分镜制作两行工具栏 — 2026-10-04

## 用户确认的布局

本轮按用户确认的第二张示意图实施，覆盖旧表格工具栏排布：

- 全局顶部只显示品牌与账号/语言/主题操作；项目编码、名称、帧率、比例与总时长由原项目信息条显示一次。
- 分镜制作第一行：标题、总共 N 镜头（其中显示 N 镜头）、已选＋蓝色数量徽标，新增镜头放在右侧。总数与显示数至少预留四位数字；选择数量完整显示，不截断为99。
- 第二行四组顺序：原管理工具至废纸篓 → 四种视图 → 搜索框 → 删除镜头、取消选择。
- 三个分隔空档使用20px＋1px短竖线＋20px；竖线20px高且垂直居中。
- 删除镜头与浅色取消选择均100×36px、8px圆角。无选中时保留位置并禁用，避免布局跳动。
- 表格旧第三行的独立蓝色计数、修改提示及制作方式/状态/部门批量下拉不再呈现。筛选/分组仍可打开原筛选面板，列标题和单元格原批量操作保留。
- 宽屏四组保持同一行；空间不足时工具条内部横向滚动，标题按需换行。键盘进入工具自动完整滚入可见区域。

## 真实消费者与责任边界

- `apps/web/app/(workspace)/production/[id]/shots/page.tsx` 拥有表格标题和四组工具排列；仍读取原useWorkspaceStore选择/filters与既有查询数据。
- `ShotViewNavigation` 保留原四条路由，`showCount=false` 只用于表格第二行；提取的ShotCountSummary为同一数量展示组合，Card/Wall/Timeline默认行为保持。
- `BulkActionToolbar compact` 只在表格用于删除/取消组合，继续拥有原删除确认、错误反馈及useBulkTrashShots请求；没有复制删除程序。Card/Wall既有默认批量控件保持。
- 工作区layout不再向TopBar传重复项目资料，原项目信息条仍是显示入口。
- 无API/DB/DDL、持久状态owner、历史/CAS、媒体、依赖或共享primitive变化。不恢复用户明确移除的旧控件，也不扩大其他迁移切换范围。

## 验证

三份针对消费者检查通过：

```sh
node tests/frontend/bulk-controls.cjs
node tests/frontend/shot-summary.cjs
node tests/frontend/storyboard-handoff.cjs
```

覆盖compact无旧下拉/提示、空选择禁用、确认前不删除、Esc保留选择、取消清除选择，以及0/106/9999数量和原视图路由。原默认批量请求、pending、失败与确认路径继续通过。

最终Webpack生产构建及TypeScript通过，构建目录 `.next/shot-toolbar-compact`；生成tsconfig复原。仓库Regression Guard在代码提交后、上传前执行，最终结果记录于续作入口。

真实3002页面验证：

- 97镜头项目只进行临时选择、搜索与菜单预览，没有保存/删除业务数据；搜索“惊觉迟到”显示1/97，清空恢复97，已选0→1→0正确。
- 2560宽四组同排、三处20px居中分隔、两动作按钮100×36px/8px，顶部无重复项目资料，原第三行移除。
- 1440/1024/768/375/320根横向溢出均0；工具区自身滚动，Tab进入删除与取消后完整可见。首次窄屏焦点部分被裁切，已加入本工具区域焦点滚入并重建/复核。
- 320宽删除确认窗288px、左右16px；Esc退出且选择保留，取消选择清空；新增镜头弹窗Esc退出无创建。
- 列管理、表头右键、单元格右键菜单均可打开并Esc关闭；表格→卡片→表格原路由与数量保留。
- 真实截图：工作区 `outputs/shot-toolbar-compact-2026-10-04.png`，仅留本机、不上传用户媒体。临时验证页关闭、viewport恢复、测试选择清空。

## 本机部署与同步

3002使用 `.next/shot-toolbar-compact/standalone/apps/web`，本轮最终Web PID76225；API8002、PG55432及原媒体保持。用户刷新原分镜页面查看。保留未知 `:memory:.ses`，不stage。

上传按用户授权目标 soupsouptang/StoryBoard_System master 正常快进；开始fetch核验与本地HEAD无分叉。代码及配套记录先上传，再单独更新和上传CONTINUE_WORK.md；不得force改写他人历史。此轮不扩展旧图片原生drag/wheel的工具限制或其他历史待办。
