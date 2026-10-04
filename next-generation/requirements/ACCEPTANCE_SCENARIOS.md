# 下一代待运行验收场景

保留有效业务反例与闭环断言，不保留旧代码测试名、迁移兼容要求或通过状态。以下编号只是可引用的场景编号；实现启动后分别建立测试和真实消费者，所有场景初始状态均为“未运行”。职责编号在总纲中是模块划分提案，并非现存机器执行清单。

## FX-01—FX-32

### FX-01 新版命令历史

A/B 同项目，连续创建/编辑/列复制＋布局；刷新；A redo 分叉；B 新建子引用；101步；late commit failure；用户 cursor 隔离/最多100步；复合操作一条；失败/409 整步零写且 cursor不移动；本地输入 undo不抢项目历史。在新版测试中验证，不沿用旧测试结果。

### FX-02 no-op/CAS/codec

同 command 重试、不同 payload 同 ID；业务字段不变；两事务相同 revision；本代历史与配置的升级格式；未知未来版本；相同请求同 receipt；不同请求拒绝；no-op 的 revisions/updated_at/Audit/History/Outbox 不变；仅一 CAS 成功；本代已发布条目可读，未知格式拒绝写。

### FX-03 Work/Episode

standalone P0；W1/E1/E2；将 P1/P2移入/移出；试直挂Work；P2当前无权；故障在第二项目批量写；直挂拒绝；独立不必填层级；每个项目权限过滤；归组前后 Shot IDs、五向量、History与媒体一致；逐项目 receipt显示真实部分完成，不伪造跨项目原子成功。

### FX-04 身份/岗位

无账号演员、同名两 Person、一人兼摄影/灯光、一人饰两 Character、受限 guest、停用/解绑 User；不猜 identity或Casting；岗位不授管理权；Person保留、登录权限撤销；跨项目联系人不透出。对应 RW-01，加入最新 User/Person/Character已确认合同。

### FX-05 权限变更

A普通成员、B只读、C另一项目；列表/计数/详情/历史/媒体/导出/WS；授权后撤销，运行中job与旧下载；所有入口同 scope；统计不暴露无权总数；失去权限后 undo、job publish和download受控，私密字段不入正文/日志/附件。

### FX-06 多 Scene

S1/S2共同引用Shot1，Shot2零Scene；各自重排；primary竞态；跨项目link；删除S1；仅修改主场景的新版命令；各Scene顺序正确，最多一个primary，Shot1保留且全局总时长不重复；仅修改主关系不会删除其他关联；不得降为单场景。Schedule/导出保留多关系。

### FX-07 字段/来源

同 key 在 shot/scene，numeric 0/false/null，日期/非法选项，required/default，text→number失败；pending对白/地点；FK/type拒绝跨scope；不吞非法值；转换预览精确失败行；default不回写历史；关系候选不静默绑定；本代列身份及既有视图/配置/历史引用保持可解释。

### FX-08 DAG并发

Project/WorkflowTemplate首次实例化A→B→D、A→C→D，共享Scene任务被三Shot引用；重复实例化；并发B→A/ A→B；模板v2发布；首次实例化完整且重复应用不重复建任务；不形成环；共享任务计一次；汇合依赖全齐才ready；v1实例不改；故障不留半套任务；完成不改Review批准事实。

### FX-09 过期/指标

固定输入图v1/对白/灯光；完成后只改相关图v2；无关视图变化；AE+VFX双方式、取消任务、0分母；只相关分支失效，原交接保留；old result不覆盖；AE/VFX交集按明确口径计算，不重复计全项目镜头；新指标分子/分母/下钻IDs一致，0分母不显示100%。

### FX-10 Outbox/规则

commit前失败；commit后队列失败；enqueue后标published前崩溃；重复/乱序event；consumer失败；规则自激；回滚无事件；已提交事件不丢；可重投且命令只一次；消费者状态独立；不回滚原业务；因果链可解释，循环受限。

### FX-11 Job/Storage

导出/OCR大输入、staged文件后失败、lease接管、取消、权限/源revision/purge epoch变化；可查询真实progress/失败；取消阻断发布；迟到输出不入当前事实；重复worker不造重复asset；只清自建无引用staged文件，存储失败可重试。

### FX-12 Purge闭包

A/B各有history、版本、视图、profile、来源、缓存；board pin与job输出；Purge自定义列/Scene/Person/Asset；旧artifact/restore/import/redo；内置拒绝；普通删除可恢复；Purge清/撤销闭包并防复活，全用户cursor失效；其他Scene/Shot与共享原图不误删；GC竞态不能删除新pin。旧已下载副本不被称为撤回成功。

### FX-13 排期

两plans、同一Shot跨日/多Unit；UTC跨当地午夜/夏令时；UNAVAILABLE/TENTATIVE/UNKNOWN；转场不足；CURRENT竞态；当天首个拍摄条目Actual超时后重算Company Move与剩余计划；正确时间语义与明确冲突；Shot内容时长不改；只有一个CURRENT；Actual不覆盖Baseline/Plan，未锁定后续和预计Wrap重算，锁定项不移动；CallSheet draft更新、published旧revision不随正常编辑变。

### FX-14 新域插入

器材型号知识对象＋自定义规格字段＋Shot/Task/Schedule链接＋授权query＋import/export＋audit/event；不新增Shot核心字段，不改巨大UI shell/万能graph；使用既定seams。迁移后历史/字段/Purge覆盖；有真实贯穿consumer，不只registry描述。

### FX-15 二次导入/交付

120镜头合成XLSX多行表头、嵌图、同字段多列、enum冲突、同名人；改文件重导；不同非空值；预览后并发改；PDF/ZIP排除人联系和图片；CREATE/MERGE/UNCHANGED/CONFLICT/AMBIGUOUS明确；仅安全空值填充；plan commit不重猜；unchanged无假变更；成品/预览/附件/QR/JSON都符合allowlist；工程文件回读保持typed多Scene关系与namespace。

### FX-16 新版页面与多端

对被接受slice真浏览器读写、403/409、保存失败/重试、dirty draft与refetch、keyboard/IME/localundo、明暗、1440×900和1920×1080桌面横屏/正常缩放；只server ack为saved；query/server/draft/derived分层；失效不覆盖草稿；稳定slot权限；表格菜单、选择、列控件和全新项目入口按新版方案运行；focus/关闭/动画可打断。覆盖桌面、平板、手机、正常缩放及内容放大；不增加产品Reduced Motion开关，不用build代替视觉PASS。

### FX-17 制作联动闭环

两Scene/六Shot/两Person、摄影/灯光/制片/剪辑、两拍摄日、一共享设备、一外协Task、一交付变体。将周三计划移至周五：一人不可用、器材准备任务时段锁定、交付目标固定；正常链中途故障、重复event与undo；未来人员/资源准备、CallSheet Draft/需重确认范围、素材预计交接、后期/交付预测自动更新；系统不自动Publish/Send。任务失效按D-35分流，Formal MediaHandoff按D-37门槛。三个例外各有原因/负责人，原基准与已完成/已发布事实不改；失败目标显示并重试，不重复任务/通知。仅制作闭环，不包含费用、付款、合同经营或Take。

### FX-18 同一共享视图

A/B同view，C另一view；并发改宽/高/筛选/排序/分组；断线重连、列删除、自动尺寸、undo与第三方后来写；配置同revision同步，选择/光标/草稿独立；冲突保留草稿；个人布局不双写共享配置；自动尺寸同结果，no-op不增版本，内容hash不变；共享配置协议与新版表格及多端呈现分别验收

### FX-19 跨项目身份

两项目同名Person、独立场地、显式共享身份、时间冲突、解绑、无权项目及并发排期；未关联不猜合并；授权后按共享人员/场地身份发现冲突；摘要不透出无权项目正文/计数，未知不假可用；器材不建立库存身份或预留

### FX-20 动态继承/环境

S1/S2共同Shot；增补/排除/替换一个来源项，修改Scene、清override、删除/恢复来源；主Scene外日、另一Scene内夜；显式地点与无主场景；未覆盖要求动态更新，来源/override可解释；恢复取当前来源，来源新ID不套旧override；实际出演/Actual不被推定；环境显式值优先、主值附差异、无主待确认；资源计量按总纲确认规则测试

### FX-21 范围与权限

未授权查询拒绝；器材知识仅型号和基础知识；接口、模型及页面不产生库存、预留或库房资格

### FX-22 来源识别

字段及导入重复识别、缺型号或数量、来源修正和删除；同来源候选去重，独立来源不误合并；确认后走原命令

### FX-23 分时汇总

同时独立相加、明确共用一次、相邻区间、跨日、未排期及来源覆盖；只统计受权数据，不重复汇总同一使用安排

### FX-24 默认构图

未专用当前引用随默认构图更新；专用保持；历史、审片及导出固定有效构图和原图版本；缓存失效后可复现且不拉伸

### FX-25 帧率重算

30fps/150帧改60fps为300帧；分数帧率统一舍入、正时长最少一帧、锁秒数保持；累计时码与总量一致，音频与排期不漂移

### FX-26 任务适用性失效

自动生成任务A未开始无Actual/产物/交接，任务B已开始，任务C已有产物，任务D人工创建；删除对应Scene requirement或Production Method，再恢复同一稳定来源；A自动进入NOT_REQUIRED/inactive并保留历史，不记人工Cancel；B/C/D保留事实并提示负责人，不自动取消。下游不能因删边伪Ready；同源恢复时仅A可恢复适用，执行过的旧Task不复活

### FX-27 通告发布边界

已有Published rev1及部分ack；排期改时间/地点/个人Call Time，重复事件并触发Impact；再由有权限人与无权限人分别尝试Publish/Send；自动化只更新Draft和需重确认Recipient，不产生Published/Send事实；rev1/旧ack不漂移。有权限显式Publish产生rev2，Send另需显式权限；无权限、重复事件和失败不伪发布

### FX-28 素材正式交接

一个AssetVersion先上传，Integrity通过但项目配置Backup未满足；生成proxy Preview后做草稿预处理，再完成BackupVerification并Formal Handoff；随后源版本变化；Preview可被明确允许的草稿预处理消费，但正式input仍pending；完整性+配置备份门槛满足后Formal Handoff固定版本并解锁正式Task。源变化只使相关下游stale，旧交接事实保留，不以目录/上传存在判完成

### FX-29 Review返工补拍与交付

同一Review问题重复投递；一个走AE返工，一个走补拍；生成新Version再Review；Deliverable经历QC、submit、deliver、ack、reject、rework、重新submit、accept；同来源只一个活动ReworkRequest；后期返工回Task，补拍回Schedule/Media/Post；每次版本固定。交付各事实分开，reject回返工且不抹旧记录，最终accept固定对应Version/授权检查

### FX-30 全流程产品闭环

使用总纲§19.4合成项目，从Project/Scene/Shot、Task、Person、Schedule/Move、CallSheet、Actual、Media、Post、Review、Rework/Reshoot、Delivery到Experience/Calibration/K3受权接受；中途注入权限撤销、409、consumer失败、重复event；每环上游可驱动下游、失败可解释重试、历史不漂移；D-35/D-36/D-37边界全部成立；经验校准先形成候选，经K3受权接受后才影响未来estimate/workflow，不改当前Actual/已确认计划。必须有API+真实PG+真实consumer/浏览器+合同证据，单包PASS不能冒充整链闭环

### FX-31 授权资料

Project/Scene/Deliverable各配置一个hard和一个soft授权Requirement；AuthorizationRecord覆盖Person/Location/Asset并固定文件版本；依次测试missing、UNKNOWN、有效、expired、允许N/A、withdrawn、无权限读取、Purge；hard missing/UNKNOWN/expired/withdrawn阻塞对应Readiness/Final QC；soft只提示；允许N/A需显式权限/理由。文件存在不自动判定所有用途合法；不出现合同、金额、付款或法务结论；固定历史引用不随当前记录漂移

### FX-32 Checklist/Readiness

Template/Production Method生成required和optional Checklist；Scene/Shot/Task/Deliverable分别实例化；测试complete、UNKNOWN、N/A、来源失效、已完成带证据后来源移除、重复事件、直接尝试写ready=true；Readiness只能由权威事实派生；required未通过阻塞、optional只提示、N/A按定义/权限保存。未确认自动项来源失效可停用，已确认/有证据结果保留并标来源失效；不出现SOP步骤执行器或用自由布尔绕过条件

## 其他模块的验收

岗位场景 RW-01—RW-10 见[岗位需求](ROLE_WORKFLOW_REQUIREMENTS_2026-10-03.md)；知识场景 KL-01—KL-23 见[知识需求](VNEXT_KNOWLEDGE_LAYER_REQUIREMENTS.md)；KL-12—KL-16覆盖岗位驱动知识，KL-17—KL-23覆盖A–H分库、可扩展设备规格、官方值/备注分离、兼容关系、软件适用范围、时间QA边界和统一权限边界。语义、单位与统计验收见[总纲第20节](VNEXT_MAX_EXTENSIBILITY_REQUIREMENTS.md)。
