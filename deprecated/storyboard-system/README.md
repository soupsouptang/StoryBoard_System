# FRAMEFORGE 私有电影分镜制作系统

维护与结构说明：[架构和构建入口](docs/ARCHITECTURE.md) · [全生命周期架构实施方案](docs/LIFECYCLE_ARCHITECTURE_PLAN.md) · [工作区文件与清理约定](docs/WORKSPACE_HYGIENE.md) · [协作规则](AGENTS.md)

首个可用版本支持电影、TVC、MG、3D 与纪录片项目；所有业务数据、媒体代理、日志与下载包保存在公司内网服务器，外网 VPS 仅承担 HTTPS 入口与无缓存转发。

## 许可与版权

本项目采用 [FRAMEFORGE Source-Available License 1.0](LICENSE.md)：源码可供查看、学习和非商业个人使用，但商业使用、再分发、托管服务及营利性生产部署须事先取得书面许可。该协议不是 OSI 认可的开源许可。

## 已实现

- 项目创建与参数：制作类型、画幅、帧率、目标片长、默认起始时码 `01:00:00:00`
- Notion-like 镜头表：新增/插入/删除镜头、Shift/Ctrl 多选、批量编辑、拖动行与列、列头排序、自动列宽、隐藏列恢复图标、换行设置、行高和列偏好持久化；自定义列可从列标题右键菜单删除
- 项目编辑自动保存：本地草稿兜底，网络防抖同步，状态明确显示“待同步 / 同步中 / 已同步 / 同步失败”
- 旁白按文字量、标点停顿与目标片长自动分配时长，支持单镜锁定与手动修改
- `.xlsx`、`.csv`、`.tsv` 上传与常见中英文字段自动识别
- Panel 作为 Shot 子对象保留，可在 Inspector 中增加分镜格；Production Steps、评论、版本和审阅数据独立存储
- 图片在浏览器压缩为最长边 2560px、WebP 0.88；视频在支持的 Chromium 浏览器压缩为 1080p 内 WebM，不支持时保留原文件并明确回退
- 匿名永久只读 Snapshot 链接，可查看和下载 ZIP；可选访问密码、永久下载策略、后台撤销与过期校验；ZIP 会包含已发布快照及可用媒体文件
- 专业模式提供真实 Custom Fields 与 Saved Views 管理；精简模式只隐藏管理复杂度，不删除摄影核心字段
- 交付导出包含 PDF、CSV、JSON、SRT、VTT、OTIO、EDL、FCPXML；其中拍摄清单为 UTF-8 CSV，可直接用 Excel 打开
- 工程快照：创建项目自动生成初始快照，镜头/项目自动保存与自定义手动快照写入不可变链；快照包含项目、镜头、Panel、步骤、评论、版本引用及自定义列
- 工程备份：交付页提供 JSON 备份上传，校验后创建新项目导入（原项目不会被覆盖；媒体文件需重新上传）
- 分享视图空字段显示“xx未填写”；PDF 预览在图片预检与生成完成后才打开，并显示进度条；PDF、打印和分享共用可见展示字段，默认不输出数据库/网页内部字段，隐藏列表列也不会进入导出；可独立按镜头范围和字段精简导出
- 审阅动作记录：提交、撤回、同意、驳回会记录操作者、时间、前后状态及当前版本引用，并在审阅侧栏显示最近记录
- Before / After 版本：Before 版本改为横向滚动直接选择，版本卡与审阅记录统一显示完整日期时间
- 审阅镜头栏：已修改与未修改镜头分组显示，左栏独立滚动并提供悬浮上一镜/下一镜按钮；Before 版本条带支持横向滚动、左右翻页和强选中态
- 高 DPI/超宽适配：高分辨率密度采用反向缩放补偿，弹窗定位会按缩放比例换算；审阅与检查器使用内部滚动，长文本表格单元格默认两行截断；交付/审阅等独立页自动隐藏镜头检查器与表格工具栏，避免页面横向/纵向溢出
- 模块数据一致性：项目/分享接口返回的镜头统一规范化数组、JSON 字段、自定义字段和导入原始列；镜头表、卡片、视觉墙、时间线、制作方式分组、旁白、审阅、分享和 PDF 均从同一份完整镜头数据读取，主/辅制作方式与自定义/导入列保持一致
- SQLite WAL、PBKDF2 密码、服务端会话、CSRF、防登录暴力尝试与审计日志
- AI 功能当前关闭；`/api/ai/capabilities` 提供内网 Provider 适配层状态契约，不在 UI 暴露生成按钮

## 数据边界

- 应用：`/mnt/Media2/Apps/storyboard/app`
- 数据库与媒体：`/mnt/Media2/Apps/storyboard/data`
- 机密配置：`/mnt/Media2/Apps/storyboard/config/storyboard.env`
- 隧道密钥：`/mnt/Media2/Apps/storyboard/tunnel`
- TrueNAS 管理入口：`http://192.168.100.100/ui/signin`
- FrameForge 内网服务：`http://192.168.100.100:18765`
- 外网只经反向 SSH 隧道到 VPS `127.0.0.1:18766`，不写业务文件

## 本地测试

运行 `python -m unittest discover -s tests -v`。生产部署由 systemd 管理，并使用 Caddy 校验后热加载。

## 前端构建（自托管）

工作台使用官方 `@material/web` **2.4.1**。组件注册表经 esbuild **0.25.12** 打包为
`static/vendor/material-web.js`，运行时不使用 CDN、远程脚本、远程字体或遥测服务。

```powershell
cd storyboard-system
npm install --workspaces=false
npm run build
python -m unittest discover -s tests -v
```

 `static/index.html` 载入本地构建产物和 `static/styles.css`；Python 标准库服务可直接提供
 `static` 目录，无需 Node 进程。不要提交 `node_modules`、`.npm-cache`、`.qa-data` 或
 `qa-artifacts`。主题偏好只保存在浏览器 `localStorage`（键名 `frameforge-theme`）。

## 未完成事项（真实缺口）

以下项目目前没有标记为完成；文档只记录待做范围，不代表已有入口即可使用：

- 工程快照回滚 UI：当前已保存快照链和自动提交，尚未提供从项目级快照直接回滚工作树的界面。
- ZIP 工程备份恢复与媒体打包：当前支持 JSON 上传并创建新项目，ZIP、媒体完整性校验和原项目原位恢复仍待补齐。
- 审批记录增强：当前镜头审阅已绑定版本引用并保留历史；工程级审批汇总与导出仍待补齐。
- 列管理：完整管理全部内置列、计算列和保存视图列集合；当前仅支持隐藏、排序、换行和自定义列 CRUD。
- 图片上传：断点续传、暂停、取消、自动重试、分片 multipart 和短时签名 URL。
- 图片版本策略：当前工作区已改为替换只保留当前图片，仍需在内网持久化回归和部署后验证。
- 分享令牌安全迁移：当前分享仍兼容数据库明文 token，尚未迁移为仅保存 hash。
- PDF 服务端真实文件渲染与含真实媒体图片的自动化验收仍待补齐；浏览器预览进度与完成门禁已实现。
- 高级素材工作流：Stock/Client Asset 候选、版权、购买、请求、收件和替换状态；AE/MG、3D/VFX 专用字段对象。
- 实时协作与运维：WebSocket/Redis 跨进程 Presence、PostgreSQL/对象存储迁移、备份恢复、监控和正式隧道验收。
- 交互一致性：其余尚未改造的异步按钮需继续统一为“先本地渲染、后台同步、失败回滚”，并补充逐模块浏览器回归。
