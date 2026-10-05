> **下一代业务定义，尚未实施。** 本文件把“制作常识库”从条目清单展开为首批可实施 Topic Catalog。Topic 是稳定语义身份；正文进入 KnowledgeRevision。器材、软件和格式只能引用这些 Topic/Domain，不反向定义常识。

# FrameForge 制作常识 Topic Catalog

版本：1.2，2026-10-05。状态：首批常识正文合同，尚未建立运行知识条目。本版作为243个唯一共享Topic与13个FormulaDefinition的内容基线。

配套：[制作常识与 Seed Catalog](PRODUCTION_COMMONS_AND_REFERENCE_SEEDS_2026-10-05.md)、[知识库基础合同](KNOWLEDGE_FOUNDATION_AND_EXTENSIBILITY_2026-10-05.md)、[知识体系](VNEXT_KNOWLEDGE_LAYER_REQUIREMENTS.md)。

## 1. 知识主题内容合同

每个主题至少有稳定ID、中文名称、英文术语及别名。中文名称不可缺失，英文缩写不单独作为可读标题。下列技术键供实现引用：

每个 Topic 至少有：

- stable topic id；
- canonical name、中文名、英文名、aliases；
- type：TERM_CONCEPT / METHOD_PRINCIPLE / INPUT_OUTPUT / INTERNAL_QC_REFERENCE；
- concise definition；
- scope / exclusions；
- key relations；
- formula links（如适用）；
- base domains；
- revision / source policy。

本文件定义常识语义，不把 Topic 作为分类树层级。当前最大分类深度已固定为 Library→Domain→Component→可选Subcomponent；Topic 通过 typed relation / link 被任意分类节点引用。

## 2. 关系词汇

首批 KnowledgeRelation 使用受控 relation，不允许自由字符串承担核心语义：

- `IS_A`：概念分类；
- `PART_OF`：组成关系；
- `AFFECTS`：会影响但不等于决定；
- `DETERMINES`：在明确条件下决定；
- `DEPENDS_ON`：计算/判断需要；
- `CONSTRAINS`：限制可选范围；
- `CHANGES`：动作改变某物理/画面量；
- `PRESERVES`：动作保持某量不变；
- `CONTRASTS_WITH`：概念对照；
- `DERIVED_BY`：由 FormulaDefinition 派生；
- `MEASURED_AS`：对应测量量；
- `PRODUCES` / `CONSUMES`：产生/消费；
- `PRECEDES` / `FOLLOWS`：流程前后；
- `REQUIRES`：成立/执行必需条件；
- `REFERENCES`：知识引用，不代表业务拥有。

## 3. 制作单元、叙事用途与执行阶段

下列五组分别维护，不再合称“镜头语言与覆盖”。旧PC-NAR编号仅保持引用稳定，不作为分类依据。拍摄准备（Setup）是准备活动，不是轴线规则或镜头覆盖配置。

### 3.1 场景与镜头身份

| ID | 中文名称（英文术语） | 定义与边界 | 关键关系 |
| --- | --- | --- | --- |
| PC-NAR-001 | 场景（Scene） | 叙事或制作语境中的场景单元；在 FrameForge 中不是 Shot 的父对象，Scene↔Shot 可多对多 | REFERENCES Shot；CONSTRAINS requirement/context |
| PC-NAR-002 | 镜头（Shot） | 一个可独立描述、制作、排期、审阅的镜头身份；不等同一次 Take | REFERENCES Scene；PART_OF coverage |

### 3.2 镜头用途与覆盖策略

| ID | 中文名称（英文术语） | 定义与边界 | 关键关系 |
| --- | --- | --- | --- |
| PC-NAR-003 | 建立镜头（Establishing Shot） | 用于建立空间、人物关系或环境信息的镜头用途 | IS_A Shot purpose；AFFECTS spatial comprehension |
| PC-NAR-004 | 主镜头（Master Shot） | 覆盖一个表演/场景主要动作范围的连续镜头用途 | IS_A coverage strategy |
| PC-NAR-005 | 镜头覆盖策略（Coverage） | 通过多个镜头为同一动作/场景提供剪辑选择的拍摄策略 | PART_OF shooting strategy；CONSUMES Shot |
| PC-NAR-006 | 插入镜头（Insert） | 强调物体、动作细节或信息的补充镜头 | IS_A coverage shot |
| PC-NAR-007 | 反应镜头（Reaction Shot） | 以人物对事件/对白的反应为主要信息的镜头 | IS_A coverage shot |
| PC-NAR-008 | 过肩镜头（OTS） | 以前景人物肩部/头部作为空间关系参照的构图用途 | AFFECTS screen relation |
| PC-NAR-009 | 主观镜头（POV） | 画面视点被定义为某角色/主体观察位置 | DEPENDS_ON narrative viewpoint |

### 3.3 人物与机位调度

| ID | 中文名称（英文术语） | 定义与边界 | 关键关系 |
| --- | --- | --- | --- |
| PC-NAR-010 | 人物与机位调度（Blocking） | 人物、摄影机、动作在空间中的安排 | AFFECTS Camera Position、Perspective、Coverage |

### 3.4 现场拍摄准备与执行阶段

| ID | 中文名称（英文术语） | 定义与边界 | 关键关系 |
| --- | --- | --- | --- |
| PC-NAR-011 | 排练（Rehearsal） | 正式记录前验证表演、调度、技术协同的活动 | PRECEDES Shoot；AFFECTS estimate |
| PC-NAR-012 | 拍摄准备（Setup） | 为某拍摄配置机位、灯光、收声、支撑等准备活动 | PRECEDES Shoot；MEASURED_AS duration |
| PC-NAR-013 | 拍摄执行（Shoot） | 实际记录画面/声音的执行阶段 | PRODUCES media/Actual |
| PC-NAR-014 | 复位（Reset） | 为下一次执行恢复表演、道具、设备或场景状态 | FOLLOWS Shoot；PRECEDES next Shoot |
| PC-NAR-015 | 撤场（Strike） | 某配置或工作段结束后拆除/收整设备与布置 | FOLLOWS Shoot；MEASURED_AS duration |

### 3.5 空间连续性与剪辑衔接

| ID | 中文名称（英文术语） | 定义与边界 | 关键关系 |
| --- | --- | --- | --- |
| PC-NAR-016 | 动作轴线与180度规则（180° Axis） | 用于维护屏幕方向与空间连续性的参考轴概念 | AFFECTS Screen Direction |
| PC-NAR-017 | 屏幕方向（Screen Direction） | 主体在画面内的左右方向关系 | DEPENDS_ON camera position/axis |
| PC-NAR-018 | 视线匹配（Eyeline Match） | 剪辑中保持人物视线方向与被看对象空间关系的连续性 | AFFECTS continuity |
| PC-NAR-019 | 30度规则（30° Rule） | 同一主体连续镜头中避免过小机位角度变化造成跳切感的传统剪辑/覆盖经验 | AFFECTS coverage choice；不是硬性物理定律 |
| PC-NAR-020 | 动作匹配（Match on Action） | 跨镜头保持动作时间和运动连续性的剪辑原则 | REQUIRES coverage continuity |

## 4. 机位、摄影角度、视場与构图

### 4.1 机位位置与观察角度

| ID | 中文名称（英文术语） | 定义与边界 | 关键关系 |
| --- | --- | --- | --- |
| PC-CAM-001 | 机位位置（Camera Position） | 摄影机光学中心在空间中的位置 | DETERMINES perspective with subject geometry；AFFECTS framing |
| PC-CAM-002 | 机位高度（Camera Height） | 相对主体/地面的摄影机高度 | PART_OF Camera Position；AFFECTS Camera Angle |
| PC-CAM-003 | 摄影角度（Camera Angle） | 摄影机朝向相对主体/水平面的观察角度，如平视、俯视、仰视 | DEPENDS_ON position/orientation；CONTRASTS_WITH FOV |
| PC-CAM-004 | 平视（Eye Level） | 光轴与主体常规视线高度接近的摄影角度 | IS_A Camera Angle |
| PC-CAM-005 | 俯拍（High Angle） | 摄影机从较高位置向下观察主体 | IS_A Camera Angle |
| PC-CAM-006 | 仰拍（Low Angle） | 摄影机从较低位置向上观察主体 | IS_A Camera Angle |
| PC-CAM-007 | 顶拍（Top Shot） | 接近垂直向下的摄影角度 | IS_A Camera Angle |
| PC-CAM-008 | 倾斜构图（Dutch Angle） | 摄影机 Roll 使画面水平线倾斜 | DEPENDS_ON Roll |

### 4.2 视场角

| ID | 中文名称（英文术语） | 定义与边界 | 关键关系 |
| --- | --- | --- | --- |
| PC-CAM-009 | 视场角（Field of View） | 成像系统在给定有效成像区域内覆盖的角度范围 | DEPENDS_ON lens projection、official AoV、active area；CONTRASTS_WITH Camera Angle/Perspective |
| PC-CAM-010 | 水平视场角（Horizontal FOV） | 水平方向覆盖角 | IS_A Field of View |
| PC-CAM-011 | 垂直视场角（Vertical FOV） | 垂直方向覆盖角 | IS_A Field of View |
| PC-CAM-012 | 对角视场角（Diagonal FOV） | 对角线方向覆盖角 | IS_A Field of View |

### 4.3 空间透视

| ID | 中文名称（英文术语） | 定义与边界 | 关键关系 |
| --- | --- | --- | --- |
| PC-CAM-013 | 透视（Perspective） | 空间中不同距离物体在成像中的相对大小与汇聚关系 | DETERMINED_BY Camera Position relative to scene；Focal Length only affects framing/FOV at fixed position |

### 4.4 构图组织

| ID | 中文名称（英文术语） | 定义与边界 | 关键关系 |
| --- | --- | --- | --- |
| PC-CAM-014 | 前景、中景与后景层次（Foreground / Midground / Background） | 按相机空间深度划分的前/中/后景关系 | PART_OF spatial composition |
| PC-CAM-015 | 头顶留白（Headroom） | 人物头部与画面上边缘之间的构图空间 | PART_OF composition |
| PC-CAM-016 | 运动与视线方向留白（Lead Room / Look Room） | 主体运动/视线方向前方预留的构图空间 | PART_OF composition |
| PC-CAM-017 | 三分构图（Rule of Thirds） | 用三等分参考线组织视觉重心的方法 | IS_A composition principle |
| PC-CAM-018 | 对称构图（Symmetry） | 围绕画面轴线组织视觉元素的构图方式 | IS_A composition principle |
| PC-CAM-019 | 负空间（Negative Space） | 主体以外、参与画面平衡与信息表达的空间 | IS_A composition concept |
| PC-CAM-020 | 纵深构图（Depth Composition） | 利用不同深度层次组织画面的构图方法 | DEPENDS_ON spatial relation/Perspective |

## 5. 镜头光学与成像

### 5.1 焦距与镜头种类

| ID | 中文名称（英文术语） | 定义与边界 | 关键关系 |
| --- | --- | --- | --- |
| PC-OPT-001 | 物理焦距（Physical Focal Length） | 镜头光学系统的标称/实际焦距参数；不等于画幅等效焦距 | AFFECTS FOV；MEASURED_AS mm |
| PC-OPT-005 | 定焦镜头（Prime Lens） | 拍摄时焦距固定的镜头 | CONTRASTS_WITH Zoom Lens |
| PC-OPT-006 | 变焦镜头（Zoom Lens） | 允许连续/离散改变物理焦距的镜头 | CHANGES Focal Length |

### 5.2 成像区域与像场覆盖

| ID | 中文名称（英文术语） | 定义与边界 | 关键关系 |
| --- | --- | --- | --- |
| PC-OPT-002 | 有效成像区域（Effective Imaging Area） | 当前 SensorRecordingMode 实际参与成像的宽高区域 | AFFECTS FOV/crop；PART_OF SensorRecordingMode |
| PC-OPT-003 | 像场（Image Circle） | 镜头可覆盖的成像圆范围 | CONSTRAINS sensor coverage |
| PC-OPT-004 | 镜头像场覆盖（Lens Coverage） | 镜头像场对特定有效成像区域的覆盖关系 | DEPENDS_ON Image Circle + active area |

### 5.3 光圈机构与透光

| ID | 中文名称（英文术语） | 定义与边界 | 关键关系 |
| --- | --- | --- | --- |
| PC-OPT-007 | 几何光圈F值（F-number） | 焦距与有效入瞳直径之比的几何光圈量 | AFFECTS exposure/DOF；CONTRASTS_WITH T-stop |
| PC-OPT-008 | 透光光圈T值（T-stop） | 将镜头实际透光损失计入后的曝光标度 | AFFECTS exposure；conversion requires official transmission relation |
| PC-OPT-009 | 光圈机构（Iris） | 改变有效孔径的镜头机构 | CHANGES F-number/T-stop where supported |
| PC-OPT-010 | 透光率（Transmission） | 光学系统实际传输光量的比例/损失关系 | LINKS F-number to T-stop when known |

### 5.4 对焦与景深

| ID | 中文名称（英文术语） | 定义与边界 | 关键关系 |
| --- | --- | --- | --- |
| PC-OPT-011 | 对焦距离（Focus Distance） | 对焦平面对应的主体距离 | AFFECTS DOF |
| PC-OPT-012 | 最近对焦距离（Minimum Focus Distance） | 镜头可正常合焦的最近距离 | CONSTRAINS Focus Distance |
| PC-OPT-013 | 焦点转移（Rack Focus） | 拍摄过程中从一个对焦目标改变到另一个目标 | CHANGES Focus Distance；不等于 camera movement |
| PC-OPT-014 | 呼吸效应（Focus Breathing） | 对焦变化伴随的视场/放大率变化 | AFFECTS framing/FOV；镜头特性 |
| PC-OPT-015 | 景深（Depth of Field） | 在给定观察/成像条件下可接受清晰范围 | DEPENDS_ON aperture、focus distance、focal length、CoC/model |
| PC-OPT-016 | 超焦距（Hyperfocal Distance） | 在指定 CoC/焦距/光圈模型下，使远端延伸至无穷远的对焦距离 | DERIVED_BY FORM-DOF-002 |
| PC-OPT-017 | 弥散圆（Circle of Confusion） | 景深模型中的允许弥散圆参数 | INPUT_TO DOF model；不是固定普适值 |

### 5.5 衍射与投影模型

| ID | 中文名称（英文术语） | 定义与边界 | 关键关系 |
| --- | --- | --- | --- |
| PC-OPT-018 | 衍射（Diffraction） | 小孔径下波动光学导致细节扩散的现象 | AFFECTS resolution/sharpness |
| PC-OPT-019 | 直线投影（Rectilinear Projection） | 尽量保持直线为直线的常见镜头投影模型 | ENABLES standard rectilinear FOV formula |
| PC-OPT-020 | 鱼眼投影（Fisheye Projection） | 非直线投影的超广角镜头模型集合 | REQUIRES manufacturer/projection model；禁止套普通FOV公式 |

### 5.6 变形成像与视场比较

| ID | 中文名称（英文术语） | 定义与边界 | 关键关系 |
| --- | --- | --- | --- |
| PC-OPT-021 | 非变形成像镜头（Spherical Lens） | 水平/垂直不采用 anamorphic squeeze 的常规成像体系 | CONTRASTS_WITH Anamorphic |
| PC-OPT-022 | 变形成像镜头（Anamorphic Lens） | 在至少一个方向进行光学压缩的成像体系 | REQUIRES squeeze/desqueeze |
| PC-OPT-023 | 挤压倍率（Squeeze Ratio） | Anamorphic 水平等方向的光学压缩倍率 | AFFECTS desqueezed FOV/aspect |
| PC-OPT-024 | 去挤压（Desqueeze） | 将 anamorphic 压缩画面恢复显示比例的变换 | DEPENDS_ON Squeeze Ratio |
| PC-OPT-025 | 裁切与等效视场比较（Crop / Equivalent FOV） | 用不同有效成像区域比较取景范围的表达 | DERIVED_BY active area + focal length；不覆盖 physical focal length |

## 6. 摄影机运动、承托方式与取景变化

### 6.1 摄影机旋转

| ID | 中文名称（英文术语） | 定义与边界 | 关键关系 |
| --- | --- | --- | --- |
| PC-MOV-001 | 水平摇摄（Pan） | 摄影机位置基本不变，绕垂直轴旋转 | CHANGES orientation；PRESERVES position |
| PC-MOV-002 | 俯仰摇摄（Tilt） | 摄影机位置基本不变，绕水平轴上下旋转 | CHANGES orientation |
| PC-MOV-003 | 滚转（Roll） | 绕光轴旋转 | CHANGES horizon/Dutch angle |

### 6.2 摄影机空间位移

| ID | 中文名称（英文术语） | 定义与边界 | 关键关系 |
| --- | --- | --- | --- |
| PC-MOV-004 | 升降移动（Pedestal） | 摄影机整体上下平移 | CHANGES Camera Position；PRESERVES focal length if lens unchanged |
| PC-MOV-005 | 横移与跟移（Truck / Track） | 摄影机整体横向/沿轨迹平移 | CHANGES Camera Position/Perspective |
| PC-MOV-006 | 前推与后拉（Dolly In / Out） | 摄影机向主体靠近/远离 | CHANGES position, framing and perspective |
| PC-MOV-007 | 弧线与环绕移动（Arc / Orbit） | 摄影机绕主体弧形移动 | CHANGES position/orientation/perspective |
| PC-MOV-008 | 摇臂与吊臂移动（Crane / Jib） | 借助摇臂/吊臂产生复合空间位移 | CHANGES Camera Position |

### 6.3 承托与移动平台

| ID | 中文名称（英文术语） | 定义与边界 | 关键关系 |
| --- | --- | --- | --- |
| PC-MOV-009 | 手持摄影（Handheld） | 由操作者直接承托产生的机位/姿态变化方式 | IS_A support/movement mode |
| PC-MOV-010 | 电控稳定器移动摄影（Gimbal Movement） | 由电控稳定器辅助的移动摄影 | REQUIRES compatible support |
| PC-MOV-011 | 机械稳定系统移动摄影（Steadicam Movement） | 由机械稳定系统辅助的移动摄影 | REQUIRES compatible support |
| PC-MOV-012 | 无人机移动摄影（Drone Movement） | 由飞行平台实现三维空间移动摄影 | REQUIRES aerial imaging device |

### 6.4 空间推进、光学变焦与混合变化

| ID | 中文名称（英文术语） | 定义与边界 | 关键关系 |
| --- | --- | --- | --- |
| PC-MOV-013 | 固定焦距的空间推进（Spatial Push） | 焦距保持，摄影机靠近主体造成主体画面占比增大 | CHANGES position/perspective；PRESERVES focal length |
| PC-MOV-014 | 固定机位的光学变焦（Optical Zoom） | 机位保持，改变镜头焦距造成取景范围改变 | CHANGES focal length/FOV；PRESERVES position |
| PC-MOV-015 | 机位与焦距混合变化（Mixed Push / Dolly Zoom） | 机位与焦距同时改变 | CHANGES position+focal length；可用于保持特定主体画面比例 |

### 6.5 拍摄阶段电子裁切

| ID | 中文名称（英文术语） | 定义与边界 | 关键关系 |
| --- | --- | --- | --- |
| PC-MOV-016 | 机内电子裁切与数字变焦（In-camera Digital Zoom/Crop） | 拍摄阶段通过传感器裁切/数字缩放改变取景 | CHANGES recorded framing；不改变光学 perspective |

### 6.6 后期重构图

| ID | 中文名称（英文术语） | 定义与边界 | 关键关系 |
| --- | --- | --- | --- |
| PC-MOV-017 | 后期重构图与数字放大（Post Reframe / Digital Zoom） | 后期对已有图像裁切/缩放 | FOLLOWS capture；不改变拍摄时 perspective/FOV |

## 7. 曝光和帧率

### 7.1 曝光量、感光与增益

| ID | 中文名称（英文术语） | 定义与边界 | 关键关系 |
| --- | --- | --- | --- |
| PC-EXP-001 | 曝光（Exposure） | 传感器/胶片接收到的有效光量及记录结果 | DEPENDS_ON aperture、exposure time、scene luminance、sensitivity model |
| PC-EXP-002 | 感光度ISO（ISO） | 设备/标准定义的感光标度；具体意义依相机实现 | 不与EI/Gain全局互换 |
| PC-EXP-003 | 曝光指数EI（Exposure Index / EI） | 作为曝光/处理参考的指数，可能不等于传感器物理增益 | model-specific |
| PC-EXP-004 | 信号增益（Gain） | 电子/数字信号增益表达 | model-specific；可用dB等 |

### 7.2 曝光时间与快门角度

| ID | 中文名称（英文术语） | 定义与边界 | 关键关系 |
| --- | --- | --- | --- |
| PC-EXP-005 | 快门速度与曝光时间（Shutter Speed / Exposure Time） | 单帧实际曝光时长 | DERIVED_WITH Shutter Angle + FPS where applicable |
| PC-EXP-006 | 快门角度（Shutter Angle） | 用一圈周期角度表达曝光占比的电影摄影参数 | DERIVED_WITH exposure time + FPS |
| PC-EXP-014 | 运动模糊（Motion Blur） | 曝光期间运动在图像中的时间积分模糊 | AFFECTED_BY exposure time + motion |

### 7.3 减光与曝光计算

| ID | 中文名称（英文术语） | 定义与边界 | 关键关系 |
| --- | --- | --- | --- |
| PC-EXP-007 | 中性密度减光（Neutral Density / ND） | 降低进入系统光量的滤镜/机制 | MEASURED_AS optical density/stops |
| PC-EXP-008 | 曝光档级（Stop） | 以2倍/1/2光量为一级的曝光变化单位 | PART_OF exposure relationships |
| PC-EXP-009 | 曝光值EV（Exposure Value / EV） | 在指定定义下组合光圈与曝光时间的曝光参数 | DERIVED_BY FORM-EXP-001 |

### 7.4 拍摄、项目和回放帧率

| ID | 中文名称（英文术语） | 定义与边界 | 关键关系 |
| --- | --- | --- | --- |
| PC-EXP-010 | 帧率（Frame Rate） | 单位时间记录/播放的帧数 | AFFECTS motion/time calculations |
| PC-EXP-011 | 项目基准帧率（Project FPS） | 项目/时间线基准帧率 | CONSTRAINS timecode/playback |
| PC-EXP-012 | 拍摄帧率（Capture FPS） | 实际拍摄记录帧率 | AFFECTS slow/fast motion |
| PC-EXP-013 | 回放帧率（Playback FPS） | 回放帧率 | with Capture FPS DETERMINES speed ratio |
| PC-EXP-015 | 升格拍摄（Overcrank） | Capture FPS 高于目标 Playback FPS 形成慢动作 | DEPENDS_ON capture/playback ratio |
| PC-EXP-016 | 降格拍摄（Undercrank） | Capture FPS 低于目标 Playback FPS 形成快动作 | DEPENDS_ON capture/playback ratio |

## 8. 灯光角色、光质、光度与附件

### 8.1 光源在画面中的作用

| ID | 中文名称（英文术语） | 定义与边界 | 关键关系 |
| --- | --- | --- | --- |
| PC-LGT-001 | 主光（Key Light） | 画面中承担主要塑形/方向作用的光源角色 | IS_A lighting role |
| PC-LGT-002 | 补光（Fill Light） | 调节阴影亮度/反差的光源角色 | AFFECTS contrast ratio |
| PC-LGT-003 | 背光与轮廓光（Back / Rim Light） | 从主体后方/侧后方塑造轮廓或分离的光源角色 | AFFECTS separation |

### 8.2 光质与入射几何

| ID | 中文名称（英文术语） | 定义与边界 | 关键关系 |
| --- | --- | --- | --- |
| PC-LGT-004 | 硬光（Hard Light） | 相对明显锐利阴影边缘的光质 | AFFECTED_BY apparent source size/distance |
| PC-LGT-005 | 软光（Soft Light） | 相对柔和阴影过渡的光质 | AFFECTED_BY apparent source size/distance |
| PC-LGT-006 | 光源表观尺寸（Apparent Source Size） | 从主体视角看到的光源角尺寸 | AFFECTS shadow softness |
| PC-LGT-007 | 入射光方向（Light Direction） | 光相对主体的入射方向 | AFFECTS shape/texture |
| PC-LGT-008 | 光源距离（Light Distance） | 光源与受光面的距离 | AFFECTS illuminance and apparent size |
| PC-LGT-009 | 反差比（Contrast Ratio） | 画面指定区域亮度/曝光关系的比较 | DEPENDS_ON measurement definition |

### 8.3 光度规律

| ID | 中文名称（英文术语） | 定义与边界 | 关键关系 |
| --- | --- | --- | --- |
| PC-LGT-010 | 照度平方反比规律（Inverse Square Law） | 理想点光源下照度随距离平方反比变化 | DERIVED_BY FORM-LGT-001；实际大面积光源近场需注明限制 |

### 8.4 白光色度调整

| ID | 中文名称（英文术语） | 定义与边界 | 关键关系 |
| --- | --- | --- | --- |
| PC-LGT-011 | 相关色温（CCT） | 用相关色温描述近似白光色度的量 | MEASURED_AS kelvin |
| PC-LGT-012 | 绿洋红偏移（Tint / Green-Magenta） | 与色温轴不同的绿-洋红偏移描述 | CONTRASTS_WITH CCT |

### 8.5 控光附件种类

| ID | 中文名称（英文术语） | 定义与边界 | 关键关系 |
| --- | --- | --- | --- |
| PC-LGT-013 | 控光附件（Modifier） | 改变光束形状、扩散、聚光或质感的附件类别 | REQUIRES compatible interface |
| PC-LGT-014 | 菲涅耳透镜（Fresnel） | 利用菲涅耳光学改变光束的灯光附件/光学结构 | IS_A Modifier |
| PC-LGT-015 | 柔光箱（Softbox） | 扩大/扩散发光面的柔光附件 | IS_A Modifier |
| PC-LGT-016 | 蜂巢与格栅（Grid） | 限制扩散角/控制溢光的附件 | IS_A Modifier |
| PC-LGT-017 | 投影附件（Projection Attachment） | 投射图案/切光/聚焦的光学附件 | IS_A Modifier；REQUIRES lens/mount compatibility |

## 9. 色彩表示、变换与制作阶段数据流

### 9.1 色彩表示与编码

| ID | 中文名称（英文术语） | 定义与边界 | 关键关系 |
| --- | --- | --- | --- |
| PC-COL-001 | 白平衡（White Balance） | 对场景中性点/照明色偏进行拍摄或处理基准设定 | AFFECTS image transform |
| PC-COL-002 | 色彩空间（Color Space） | 定义色度坐标、白点等颜色表示范围/体系 | PART_OF color pipeline |
| PC-COL-003 | 传递函数（Transfer Function） | 线性场景/显示信号与编码值之间的映射 | CONTRASTS_WITH Color Space |
| PC-COL-004 | 伽马（Gamma） | 一类幂函数/近似编码或显示关系的统称，需指明具体定义 | IS_A/RELATED transfer function |
| PC-COL-005 | 对数编码（Log Encoding） | 为扩大编码动态范围而使用的对数/类对数编码 | IS_A transfer/encoding family |
| PC-COL-006 | 线性光（Linear Light） | 与场景/光能近似线性比例的图像数值域 | CONTRASTS_WITH display/log encodings |
| PC-COL-008 | 位深（Bit Depth） | 每通道可表示的离散数值精度 | AFFECTS quantization headroom |
| PC-COL-009 | 色度采样（Chroma Sampling） | 色度相对亮度的采样结构，如4:4:4/4:2:2等 | AFFECTS chroma detail |

### 9.2 色彩变换

| ID | 中文名称（英文术语） | 定义与边界 | 关键关系 |
| --- | --- | --- | --- |
| PC-COL-007 | 颜色查找表（LUT） | 固定输入到输出颜色/数值映射表 | PART_OF transform pipeline；不是完整色彩管理本身 |
| PC-COL-019 | 学院色彩编码体系ACES（ACES） | 影视色彩管理与交换体系 | PART_OF color pipeline |
| PC-COL-020 | RED图像处理与对数编码（RED IPP2 / Log3G10） | RED影像处理/编码体系中的相关工作流概念 | REFERENCES RED camera pipeline |

### 9.3 显示与交付色彩体系

| ID | 中文名称（英文术语） | 定义与边界 | 关键关系 |
| --- | --- | --- | --- |
| PC-COL-010 | 标准动态范围（SDR） | 标准动态范围显示/交付类别 | CONTRASTS_WITH HDR |
| PC-COL-011 | 高动态范围（HDR） | 高动态范围显示/交付类别 | REQUIRES transfer/display metadata context |
| PC-COL-012 | 高清色彩体系Rec.709（Rec.709） | 常见HD视频颜色/信号推荐体系；使用时需区分色域/传递函数具体上下文 | REFERENCES delivery/display |
| PC-COL-013 | 超高清色彩体系Rec.2020（Rec.2020） | UHD广色域推荐体系 | REFERENCES HDR/UHD workflows |
| PC-COL-014 | 网络图像色彩空间sRGB（sRGB） | 常见计算机/网络图像颜色空间/传递关系 | REFERENCES graphics/stills |
| PC-COL-015 | 显示色彩空间Display P3（Display P3） | 常见广色域显示颜色空间 | REFERENCES display pipeline |
| PC-COL-016 | 显示伽马2.4（Gamma 2.4） | 常见监看/显示目标之一 | IS_A transfer/display setting |
| PC-COL-017 | 感知量化传递函数PQ（ST2084 / PQ） | HDR绝对亮度型电光传递函数 | IS_A transfer function |
| PC-COL-018 | 混合对数伽马HLG（HLG） | HDR广播兼容型传递体系 | IS_A transfer function |

### 9.4 摄影、合成、渲染、后期的独立数据流

| ID | 中文名称（英文术语） | 定义与边界 | 关键关系 |
| --- | --- | --- | --- |
| PC-COL-021 | 摄影机记录色彩数据流（Camera Recording Pipeline） | 相机从传感器到记录格式/色彩编码的数据流 | PRODUCES camera media |
| PC-COL-022 | 合成色彩数据流（Composite Color Pipeline） | 合成阶段输入、工作空间、输出的颜色数据流 | CONSUMES/PRODUCES image formats |
| PC-COL-023 | 渲染色彩数据流（Render Color Pipeline） | 渲染阶段场景线性/显示变换与输出的颜色数据流 | PRODUCES render formats |
| PC-COL-024 | 后期与交付色彩数据流（Post / Delivery Color Pipeline） | 调色、在线、母版和交付颜色变换链 | CONSUMES camera/render/composite media |

## 10. 声音基础与同步

### 10.1 话筒类型与放置形式

| ID | 中文名称（英文术语） | 定义与边界 | 关键关系 |
| --- | --- | --- | --- |
| PC-AUD-001 | 话筒类型（Microphone Type） | 按换能/用途等分类的话筒概念 | CONSTRAINS capture method |
| PC-AUD-002 | 拾音指向性（Pickup Pattern） | 话筒对不同方向声音敏感度的空间特性 | PART_OF microphone spec |
| PC-AUD-003 | 挑杆收音（Boom） | 通过杆件将话筒定位在画面外靠近声源的现场收声方式 | IS_A production sound method |
| PC-AUD-004 | 领夹话筒（Lavalier / Lav） | 佩戴/隐藏于人物附近的小型话筒使用方式 | IS_A production sound method |

### 10.2 信号与音频记录参数

| ID | 中文名称（英文术语） | 定义与边界 | 关键关系 |
| --- | --- | --- | --- |
| PC-AUD-005 | 话筒电平（Mic Level） | 常见低电平麦克风信号级别类别 | CONTRASTS_WITH Line Level |
| PC-AUD-006 | 线路电平（Line Level） | 设备间传输的较高标准信号级别类别 | CONTRASTS_WITH Mic Level |
| PC-AUD-007 | 音频采样率（Sample Rate） | 每秒数字音频采样次数 | MEASURED_AS Hz |
| PC-AUD-008 | 音频位深（Audio Bit Depth） | 单个音频样本的量化位深 | AFFECTS quantization/dynamic representation |

### 10.3 时间码与同步

| ID | 中文名称（英文术语） | 定义与边界 | 关键关系 |
| --- | --- | --- | --- |
| PC-AUD-009 | 时间码（Timecode） | 为媒体建立时间位置标识的计时码体系 | SUPPORTS sync |
| PC-AUD-010 | 同步（Sync） | 使画面与声音或多设备时间关系一致 | DEPENDS_ON timecode/clock/reference/workflow |

### 10.4 现场与后期声音内容

| ID | 中文名称（英文术语） | 定义与边界 | 关键关系 |
| --- | --- | --- | --- |
| PC-AUD-011 | 现场录音（Production Sound） | 拍摄现场记录的声音 | PRODUCES media |
| PC-AUD-012 | 对白（Dialogue） | 对白内容类别 | PART_OF sound edit/mix |
| PC-AUD-013 | 音效（SFX） | 音效内容类别 | PART_OF sound design |
| PC-AUD-014 | 音乐（Music） | 音乐内容类别 | PART_OF soundtrack |
| PC-AUD-015 | 混音（Mix） | 将多个声音元素按目标输出整合的过程 | CONSUMES dialogue/music/SFX |

## 11. 媒体表示、产物身份与交接

### 11.1 媒体格式与工程交换

| ID | 中文名称（英文术语） | 定义与边界 | 关键关系 |
| --- | --- | --- | --- |
| PC-MED-001 | 媒体容器（Container） | 封装多种媒体流和metadata的文件结构 | CONTAINS codec streams |
| PC-MED-002 | 编解码器（Codec） | 媒体编码/解码方式 | USED_IN container/stream |
| PC-MED-003 | 图像序列（Image Sequence） | 以连续单帧文件组成运动影像的方式 | CONTRASTS_WITH video container |
| PC-MED-004 | 工程交换（Project Interchange） | 在不同剪辑/后期系统间传递时间线/编辑信息的交换格式类别 | REFERENCES OTIO/EDL/XML |

### 11.2 原始、代理、预览和母版身份

| ID | 中文名称（英文术语） | 定义与边界 | 关键关系 |
| --- | --- | --- | --- |
| PC-MED-005 | 原始媒体与摄影机原始素材（Original / Camera Original） | 由拍摄设备产生、作为原始源的媒体 | PRECEDES proxy/conform |
| PC-MED-006 | 代理素材（Proxy） | 为性能/协作生成的低负载替代媒体 | REFERENCES original；不得冒充 master |
| PC-MED-007 | 预览产物（Preview） | 用于预览/草稿流程的媒体 | 不等于Formal Handoff/Master |
| PC-MED-008 | 母版（Master） | 经过指定制作/验收后的主交付媒体版本 | PRECEDES variants/delivery |
| PC-MED-009 | 元数据（Metadata） | 描述媒体、拍摄、编码或业务信息的数据 | PART_OF media/asset |
| PC-MED-016 | 交付变体（Delivery Variant） | 同一作品针对不同交付目标生成的版本变体 | PART_OF deliverable |

### 11.3 素材复制、校验与正式交接

| ID | 中文名称（英文术语） | 定义与边界 | 关键关系 |
| --- | --- | --- | --- |
| PC-MED-010 | 素材卸载复制（Offload） | 从采集介质复制素材到目标存储的过程 | PRECEDES integrity/backup |
| PC-MED-011 | 完整性校验（Integrity Check） | 验证文件内容完整性的检查事实 | REQUIRED_BY Formal Handoff |
| PC-MED-012 | 备份验证（Backup Verification） | 验证项目要求的备份事实 | REQUIRED_BY Formal Handoff when configured |
| PC-MED-013 | 正式素材交接（Formal Handoff） | 将固定 AssetVersion 正式交给下游的业务事实 | REQUIRES integrity + configured backup |

### 11.4 套底与质量检查

| ID | 中文名称（英文术语） | 定义与边界 | 关键关系 |
| --- | --- | --- | --- |
| PC-MED-014 | 套底与回批（Conform） | 将离线编辑决策重新连接至高质量/原始媒体的过程 | CONSUMES edit decisions + originals |
| PC-MED-015 | 质量检查（QC） | 对目标版本按项目要求进行检查的事实/流程 | PRECEDES delivery where required |

## 12. 二维图像处理与动画

### 12.1 透明与遮罩数据

| ID | 中文名称（英文术语） | 定义与边界 | 关键关系 |
| --- | --- | --- | --- |
| PC-2D-001 | 透明通道（Alpha） | 表示像素覆盖/透明关系的通道或概念 | USED_BY compositing |
| PC-2D-002 | 遮罩（Matte） | 用于限定图像区域的遮罩信息 | USED_BY compositing |

### 12.2 抠像、描绘、跟踪与修复

| ID | 中文名称（英文术语） | 定义与边界 | 关键关系 |
| --- | --- | --- | --- |
| PC-2D-003 | 抠像（Keying） | 基于颜色/亮度等特征分离前景背景的过程 | PRODUCES matte/alpha |
| PC-2D-004 | 逐帧描绘遮罩（Rotoscope） | 通过逐帧/跟踪方式建立精细遮罩的过程 | PRODUCES matte |
| PC-2D-005 | 跟踪（Tracking） | 估计图像中特征/物体/相机运动的过程 | PRODUCES motion data |
| PC-2D-006 | 擦除与修复（Cleanup） | 移除或修复画面中指定元素的处理类别 | CONSUMES plate/reference |

### 12.3 数字合成

| ID | 中文名称（英文术语） | 定义与边界 | 关键关系 |
| --- | --- | --- | --- |
| PC-2D-007 | 数字合成（Compositing） | 将多层图像/渲染元素整合为目标画面的过程 | CONSUMES layers/mattes/color pipeline |

### 12.4 图形、文字和二维动画

| ID | 中文名称（英文术语） | 定义与边界 | 关键关系 |
| --- | --- | --- | --- |
| PC-2D-008 | 动态图形（Motion Graphics） | 以图形、文字和运动设计为核心的动态图像类别 | REFERENCES typography/animation/composite |
| PC-2D-009 | 文字动画（Typography Animation） | 以文字形态、排版和运动为核心的动画类别 | IS_A Motion Graphics |
| PC-2D-010 | 二维动画（2D Animation） | 二维空间为主要表达体系的动画制作类别 | CONTRASTS_WITH 3D animation |

## 13. 三维资产、制作环节与实时方式

### 13.1 几何、材质与绑定

| ID | 中文名称（英文术语） | 定义与边界 | 关键关系 |
| --- | --- | --- | --- |
| PC-3D-001 | 网格（Mesh） | 三维表面几何表示 | PART_OF 3D asset |
| PC-3D-002 | 拓扑（Topology） | Mesh 顶点/边/面的连接结构 | AFFECTS deformation/model quality |
| PC-3D-003 | 纹理坐标UV（UV） | 将三维表面映射到二维纹理坐标的结构 | SUPPORTS texturing |
| PC-3D-004 | 材质（Material） | 定义表面着色属性的资产/描述 | REFERENCES shader/textures |
| PC-3D-005 | 着色器（Shader） | 计算表面/体积外观的着色程序/模型 | PART_OF material/rendering |
| PC-3D-006 | 绑定控制系统（Rig） | 为模型提供控制、骨骼和变形结构的系统 | PRECEDES character/object animation |

### 13.2 布局、虚拟摄影与动画

| ID | 中文名称（英文术语） | 定义与边界 | 关键关系 |
| --- | --- | --- | --- |
| PC-3D-007 | 三维镜头布局（Layout） | 在镜头中组织相机、角色和场景元素的阶段/结果 | PRECEDES final animation/render |
| PC-3D-008 | 虚拟摄影机（Virtual Camera） | 在数字场景中定义摄影机及其运动/光学参数 | REFERENCES camera commons |
| PC-3D-009 | 三维动画（3D Animation） | 对三维对象/角色/相机随时间变化进行制作 | CONSUMES rig/layout |

### 13.3 模拟与缓存

| ID | 中文名称（英文术语） | 定义与边界 | 关键关系 |
| --- | --- | --- | --- |
| PC-3D-010 | 模拟（Simulation） | 依据规则/物理模型计算随时间变化的效果 | PRODUCES cache |
| PC-3D-011 | 缓存（Cache） | 固化模拟/动画计算结果供下游读取的数据 | PRODUCES/CONSUMES pipeline artifact |

### 13.4 灯光、渲染与分层输出

| ID | 中文名称（英文术语） | 定义与边界 | 关键关系 |
| --- | --- | --- | --- |
| PC-3D-012 | 三维灯光（3D Lighting） | 在三维场景中定义数字光源和照明关系 | REFERENCES lighting/color commons |
| PC-3D-013 | 渲染（Rendering） | 将数字场景计算为图像/序列的过程 | PRODUCES image sequence/AOV |
| PC-3D-014 | 渲染分层输出（AOV） | 渲染输出中按属性/贡献拆分的辅助图像通道 | PRODUCES compositing inputs |

### 13.5 实时渲染与虚拟制作

| ID | 中文名称（英文术语） | 定义与边界 | 关键关系 |
| --- | --- | --- | --- |
| PC-3D-015 | 实时渲染（Realtime Rendering） | 以交互速度更新画面的渲染方式 | PART_OF realtime production |
| PC-3D-016 | 虚拟制作（Virtual Production） | 将实时数字环境、摄影、跟踪等用于制作现场/预演/拍摄的工作方式集合 | REFERENCES realtime/camera/tracking |

### 13.6 动捕与摄影测量

| ID | 中文名称（英文术语） | 定义与边界 | 关键关系 |
| --- | --- | --- | --- |
| PC-3D-017 | 动作捕捉（Mocap） | 采集现实运动并转换为数字动作数据的过程 | PRODUCES motion data |
| PC-3D-018 | 摄影测量（Photogrammetry） | 从多张照片/影像估计三维几何与纹理的重建方法 | PRODUCES 3D asset/reference |

## 14. 制作业务概念

### 14.1 任务、依赖、交接与可开始条件

| ID | 中文名称（英文术语） | 定义与边界 | 关键关系 |
| --- | --- | --- | --- |
| PC-WF-001 | 任务（Task） | 可分派、执行、交接的工作单元 | DEPENDS_ON inputs/dependencies |
| PC-WF-002 | 依赖关系（Dependency） | 一个工作单元对另一个工作/输入的先后/准备关系 | CONSTRAINS readiness |
| PC-WF-003 | 工作交接（Handoff） | 固定输出版本交给下游的业务动作 | PRODUCES downstream input |
| PC-WF-013 | 可开始条件（Readiness） | 由 Task/Input/Checklist/Authorization 等事实派生的可开始状态 | DERIVED_BY authoritative facts |
| PC-WF-014 | 检查清单（Checklist） | 检查是否满足条件的结构化检查，不是SOP | AFFECTS Readiness if required |
| PC-WF-015 | 制作授权要求（Authorization Requirement） | 项目要求的制作授权条件 | AFFECTS Readiness/QC when hard |

### 14.2 计划、预测与实际

| ID | 中文名称（英文术语） | 定义与边界 | 关键关系 |
| --- | --- | --- | --- |
| PC-WF-004 | 计划事实（Planned） | 已确认/候选计划中的预期事实 | CONTRASTS_WITH Forecast/Actual |
| PC-WF-005 | 预测事实（Forecast） | 基于当前信息推算的未来事实 | DERIVED_BY current facts |
| PC-WF-006 | 实际事实（Actual） | 已发生并记录的实际事实 | 不被Forecast覆盖 |

### 14.3 拍摄排期与转场

| ID | 中文名称（英文术语） | 定义与边界 | 关键关系 |
| --- | --- | --- | --- |
| PC-WF-007 | 排期方案（SchedulePlan） | 一套可比较的排期方案 | CONTAINS ShootDay/ScheduleItem |
| PC-WF-008 | 拍摄工作日（ShootDay） | 某拍摄工作日范围 | CONTAINS schedule items |
| PC-WF-009 | 排期条目（ScheduleItem） | 在时间轴上安排或记录实际执行的工作条目 | REFERENCES Scene/Shot/Task/Person/Location |
| PC-WF-010 | 剧组转场（Company Move） | 转场/移动工作，属于 ScheduleItem 类型 | CHANGES location/time availability |

### 14.4 通告草稿与发布修订

| ID | 中文名称（英文术语） | 定义与边界 | 关键关系 |
| --- | --- | --- | --- |
| PC-WF-011 | 通告草稿（Call Sheet Draft） | 从当前排期与项目事实投影出的通告草稿 | DERIVED_BY current schedule |
| PC-WF-012 | 已发布通告修订（CallSheetRevision） | 发布后固定的通告修订 | 不随排期自动漂移 |

### 14.5 审阅、返工、交付物与交付事实

| ID | 中文名称（英文术语） | 定义与边界 | 关键关系 |
| --- | --- | --- | --- |
| PC-WF-016 | 审阅（Review） | 对固定版本/修订进行审阅的业务过程 | REFERENCES immutable target |
| PC-WF-017 | 返工与补拍请求（ReworkRequest） | 从Review/Delivery问题形成的返工或补拍需求 | PRODUCES Task/Schedule demand |
| PC-WF-018 | 交付物（Deliverable） | 对外交付对象/要求 | CONSUMES approved version/QC |
| PC-WF-019 | 交付事实（Delivery） | 提交/送达/确认/验收等独立事实集合 | FOLLOWS QC/authorization where required |

## 15. 公式、单位与派生计算

首批 FormulaDefinition：

| ID | Formula | 输入 | 输出/规则 |
| --- | --- | --- | --- |
| FORM-OPT-001 | 直线投影视场角（Rectilinear FOV） | focal length + effective dimension | `2 * atan(dimension / (2*f))`；仅适用 rectilinear 且无更高优先级官方AoV |
| FORM-OPT-002 | 变形成像去挤压视场角（Anamorphic desqueezed FOV） | official/projection data + squeeze + active area | 按厂商模型；禁止仅用通用倍乘替代特殊官方数据 |
| FORM-DOF-001 | 景深（DOF） | focal length、focus distance、F-number、CoC | 仅在指定几何光学模型下计算 |
| FORM-DOF-002 | 超焦距（Hyperfocal） | focal length、F-number、CoC | 常见薄透镜近似；结果标CALCULATED |
| FORM-TIME-001 | 快门角度换曝光时间（Shutter Angle → Exposure Time） | shutter angle + FPS | `t = angle / (360 * fps)` |
| FORM-TIME-002 | 曝光时间换快门角度（Exposure Time → Shutter Angle） | exposure time + FPS | `angle = t * fps * 360` |
| FORM-TIME-003 | 帧数与片长换算（Frame Count ↔ Duration） | frames + rational FPS | duration = frames / fps；需遵守项目timecode规则 |
| FORM-DATA-001 | 数据量估算（Bitrate × Duration） | bitrate + duration | 估算数据量；明确bit/byte换算 |
| FORM-LGT-001 | 照度平方反比（Inverse Square） | distance ratio | 理想点光源近似：E ∝ 1/r² |
| FORM-EXP-001 | 曝光值（EV） | F-number + exposure time | 常用ISO100基准形式 `EV = log2(N²/t)`；其他上下文需显式 |
| FORM-EXP-002 | 减光档数（ND Stops） | transmission/optical density | 按定义转换；不能把厂商命名直接当精确测量 |
| FORM-LGT-002 | 照度单位换算（Lux ↔ foot-candle） | illuminance | 1 fc ≈ 10.7639 lux |
| FORM-OPT-003 | 裁切与等效视场比较（Crop / Equivalent FOV） | active dimensions + reference dimensions | 只用于视场比较，不覆盖physical focal length |

F-number ↔ T-stop 与 ISO/EI/Gain **不提供全局 FormulaDefinition**；必须由具体镜头/机身官方映射支持。

## 16. 设备连接接口与兼容常识

| ID | Topic | 定义 |
| --- | --- | --- |
| PC-IF-001 | 连接接口（Interface） | 设备间机械、电气、数据、控制或光学连接能力的稳定定义 |
| PC-IF-002 | 机械安装接口（Mechanical Mount） | 机械安装接口，如 lens mount、modifier mount、support mount |
| PC-IF-003 | 供电接口（Power Interface） | 供电输入/输出接口 |
| PC-IF-004 | 视频接口（Video Interface） | 视频输入/输出接口 |
| PC-IF-005 | 数据接口（Data Interface） | 数据传输接口 |
| PC-IF-006 | 控制接口（Control Interface） | 遥控/协议/电子控制接口 |
| PC-IF-007 | 快拆接口（Quick Release Interface） | 快拆板、云台、稳定器等支撑系统接口 |
| PC-IF-008 | 直接兼容（Direct Compatibility） | 无中间件即可按目标用途连接/工作 |
| PC-IF-009 | 需要转接（Adapter Required） | 需要现实存在的 AdapterModel/Accessory 才能连接 |
| PC-IF-010 | 有条件兼容（Conditional Compatibility） | 只有特定模式/固件/功能条件下兼容 |
| PC-IF-011 | 明确不兼容（Incompatible） | 按明确用途/接口无法兼容 |
| PC-IF-012 | 兼容路径（Compatibility Path） | 由接口和中间件组成的兼容路径；自动推荐最多两个中间节点 |

Compatibility 必须分别保存 mechanical/electronic/AF/aperture/metadata/stabilization/focus-control/power/video/data/control 等能力，不以“能装上”代表全部支持。

## 17. 时间校准常识

| ID | Topic | 定义 |
| --- | --- | --- |
| PC-TIME-001 | 计划时长（Planned Duration） | 排期/制作表中的预估工作时长 |
| PC-TIME-002 | 实际时长（Actual Duration） | 已发生工作的实际时长 |
| PC-TIME-003 | 时长范围（Duration Range） | 只能粗略确认时使用的时长范围 |
| PC-TIME-004 | 镜头总工时汇总（Shot Aggregate） | Shot总时长聚合目标，不与组成阶段重复计样本 |
| PC-TIME-005 | 场景总工时汇总（Scene Aggregate） | Scene总时长聚合目标 |
| PC-TIME-006 | 拍摄日总工时汇总（ShootDay Aggregate） | ShootDay总时长聚合目标 |
| PC-TIME-007 | 拍摄准备时长（Setup Duration） | Setup component metric |
| PC-TIME-008 | 排练时长（Rehearsal Duration） | Rehearsal component metric |
| PC-TIME-009 | 拍摄执行时长（Shoot Duration） | Shoot component metric |
| PC-TIME-010 | 复位时长（Reset Duration） | Reset component metric |
| PC-TIME-011 | 撤场时长（Strike Duration） | Strike component metric |
| PC-TIME-012 | 转场时长（Company Move Duration） | 转场 component metric |
| PC-TIME-013 | 任务时长（Task Duration） | 一般Task component metric |
| PC-TIME-014 | 后期工作时长（Post Work Duration） | 后期工作 component metric |

时间统计绝不按 Person 汇总效率；同一执行事实的 aggregate 与 components 不可同时作为独立样本累计。

## 18. 首批 Domain ↔ Topic 绑定原则

知识分类只做归组，不限制 Topic 被多域引用。例如：

- 视场角以独立分类维护，同时被构图、光学和公式引用；
- CCT 同时属于 Lighting 和 Color Science；
- Timecode 同时属于 Production Sound/Sync、Media/Metadata、Production Workflow；
- Virtual Camera 同时属于 3D/VFX/Realtime 和 Camera commons；
- Formal Handoff 同时属于 Media/Format 与 Production Workflow。

同一 Topic 只维护一份 canonical revision。

## 19. 后续 A–H 小库的引用规则

后续建立 A–H 内部组件时：

1. 优先引用本 Catalog Topic；
2. 只有该专业确实存在新的稳定概念时才新增 Topic；
3. 不允许把同一概念换名后在不同小库复制正文；
4. 专业小库可新增 INPUT_OUTPUT、ROLE_BOUNDARY、METHOD_PRINCIPLE，但应链接共享常识；
5. 分类树不得超过 Library→Domain→Component→可选Subcomponent；超过后使用 Topic、Relation、Facet 或 SpecificationDefinition，不增加第五/第六级目录。

## 20. 首批内容完成标准

本 Catalog 作为首批常识内容基线，至少应满足：

- Topic stable ID 唯一；
- Camera Angle / FOV / Perspective 三者独立；
- Optical Zoom / Spatial Push / Mixed / In-camera Digital / Post Reframe 五类不混；
- F-number / T-stop 独立；
- SensorRecordingMode / Effective Imaging Area 进入FOV关系；
- Rectilinear / Fisheye / Anamorphic 不混用公式；
- Lighting、Color、Audio、Media、2D、3D、Workflow、Compatibility、Time Calibration 均有首批基础 Topic；
- FormulaDefinition 标明适用/禁止条件；
- A–H 后续只引用，不复制 canonical Topic。
- 运镜、覆盖策略、轴线连续性、人物调度、拍摄准备分组独立；所有主题标题有中文名称；
- 遮光斗、滤镜架、托盘和连接环进入支撑/光学附件知识，不以滤镜效果条目代替安装系统。
