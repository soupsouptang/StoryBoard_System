> **下一代业务定义，尚未实施。** 本文件把“制作常识库”从条目清单展开为首批可实施 Topic Catalog。Topic 是稳定语义身份；正文进入 KnowledgeRevision。器材、软件和格式只能引用这些 Topic/Domain，不反向定义常识。

# FrameForge 制作常识 Topic Catalog

版本：1.1，2026-10-05。状态：首批常识正文合同，尚未建立运行知识条目。本版作为243个唯一共享Topic与13个FormulaDefinition的内容基线。

配套：[制作常识与 Seed Catalog](PRODUCTION_COMMONS_AND_REFERENCE_SEEDS_2026-10-05.md)、[知识库基础合同](KNOWLEDGE_FOUNDATION_AND_EXTENSIBILITY_2026-10-05.md)、[知识体系](VNEXT_KNOWLEDGE_LAYER_REQUIREMENTS.md)。

## 1. Topic 内容合同

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

## 2. Relation vocabulary

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

## 3. Narrative & Coverage

| ID | Topic | 定义与边界 | 关键关系 |
| --- | --- | --- | --- |
| PC-NAR-001 | Scene / 场景 | 叙事或制作语境中的场景单元；在 FrameForge 中不是 Shot 的父对象，Scene↔Shot 可多对多 | REFERENCES Shot；CONSTRAINS requirement/context |
| PC-NAR-002 | Shot / 镜头 | 一个可独立描述、制作、排期、审阅的镜头身份；不等同一次 Take | REFERENCES Scene；PART_OF coverage |
| PC-NAR-003 | Establishing Shot / 建立镜头 | 用于建立空间、人物关系或环境信息的镜头用途 | IS_A Shot purpose；AFFECTS spatial comprehension |
| PC-NAR-004 | Master Shot / 主镜头 | 覆盖一个表演/场景主要动作范围的连续镜头用途 | IS_A coverage strategy |
| PC-NAR-005 | Coverage / 覆盖 | 通过多个镜头为同一动作/场景提供剪辑选择的拍摄策略 | PART_OF shooting strategy；CONSUMES Shot |
| PC-NAR-006 | Insert / 插入镜头 | 强调物体、动作细节或信息的补充镜头 | IS_A coverage shot |
| PC-NAR-007 | Reaction Shot / 反应镜头 | 以人物对事件/对白的反应为主要信息的镜头 | IS_A coverage shot |
| PC-NAR-008 | OTS / 过肩镜头 | 以前景人物肩部/头部作为空间关系参照的构图用途 | AFFECTS screen relation |
| PC-NAR-009 | POV / 主观镜头 | 画面视点被定义为某角色/主体观察位置 | DEPENDS_ON narrative viewpoint |
| PC-NAR-010 | Blocking / 调度 | 人物、摄影机、动作在空间中的安排 | AFFECTS Camera Position、Perspective、Coverage |
| PC-NAR-011 | Rehearsal / 排练 | 正式记录前验证表演、调度、技术协同的活动 | PRECEDES Shoot；AFFECTS estimate |
| PC-NAR-012 | Setup / 机位准备 | 为某拍摄配置机位、灯光、收声、支撑等准备活动 | PRECEDES Shoot；MEASURED_AS duration |
| PC-NAR-013 | Shoot / 拍摄执行 | 实际记录画面/声音的执行阶段 | PRODUCES media/Actual |
| PC-NAR-014 | Reset / 复位 | 为下一次执行恢复表演、道具、设备或场景状态 | FOLLOWS Shoot；PRECEDES next Shoot |
| PC-NAR-015 | Strike / 撤场 | 某配置或工作段结束后拆除/收整设备与布置 | FOLLOWS Shoot；MEASURED_AS duration |
| PC-NAR-016 | 180° Axis / 轴线 | 用于维护屏幕方向与空间连续性的参考轴概念 | AFFECTS Screen Direction |
| PC-NAR-017 | Screen Direction / 屏幕方向 | 主体在画面内的左右方向关系 | DEPENDS_ON camera position/axis |
| PC-NAR-018 | Eyeline Match / 视线匹配 | 剪辑中保持人物视线方向与被看对象空间关系的连续性 | AFFECTS continuity |
| PC-NAR-019 | 30° Rule / 30度规则 | 同一主体连续镜头中避免过小机位角度变化造成跳切感的传统剪辑/覆盖经验 | AFFECTS coverage choice；不是硬性物理定律 |
| PC-NAR-020 | Match on Action / 动作匹配 | 跨镜头保持动作时间和运动连续性的剪辑原则 | REQUIRES coverage continuity |

## 4. Camera Angle / Composition / Spatial Perspective

| ID | Topic | 定义与边界 | 关键关系 |
| --- | --- | --- | --- |
| PC-CAM-001 | Camera Position / 机位位置 | 摄影机光学中心在空间中的位置 | DETERMINES perspective with subject geometry；AFFECTS framing |
| PC-CAM-002 | Camera Height / 机位高度 | 相对主体/地面的摄影机高度 | PART_OF Camera Position；AFFECTS Camera Angle |
| PC-CAM-003 | Camera Angle / 摄影角度 | 摄影机朝向相对主体/水平面的观察角度，如平视、俯视、仰视 | DEPENDS_ON position/orientation；CONTRASTS_WITH FOV |
| PC-CAM-004 | Eye Level / 平视 | 光轴与主体常规视线高度接近的摄影角度 | IS_A Camera Angle |
| PC-CAM-005 | High Angle / 俯拍 | 摄影机从较高位置向下观察主体 | IS_A Camera Angle |
| PC-CAM-006 | Low Angle / 仰拍 | 摄影机从较低位置向上观察主体 | IS_A Camera Angle |
| PC-CAM-007 | Top Shot / 顶拍 | 接近垂直向下的摄影角度 | IS_A Camera Angle |
| PC-CAM-008 | Dutch Angle / 倾斜构图 | 摄影机 Roll 使画面水平线倾斜 | DEPENDS_ON Roll |
| PC-CAM-009 | Field of View / 视场角 | 成像系统在给定有效成像区域内覆盖的角度范围 | DEPENDS_ON lens projection、official AoV、active area；CONTRASTS_WITH Camera Angle/Perspective |
| PC-CAM-010 | Horizontal FOV | 水平方向覆盖角 | IS_A Field of View |
| PC-CAM-011 | Vertical FOV | 垂直方向覆盖角 | IS_A Field of View |
| PC-CAM-012 | Diagonal FOV | 对角线方向覆盖角 | IS_A Field of View |
| PC-CAM-013 | Perspective / 透视 | 空间中不同距离物体在成像中的相对大小与汇聚关系 | DETERMINED_BY Camera Position relative to scene；Focal Length only affects framing/FOV at fixed position |
| PC-CAM-014 | Foreground / Midground / Background | 按相机空间深度划分的前/中/后景关系 | PART_OF spatial composition |
| PC-CAM-015 | Headroom | 人物头部与画面上边缘之间的构图空间 | PART_OF composition |
| PC-CAM-016 | Lead Room / Look Room | 主体运动/视线方向前方预留的构图空间 | PART_OF composition |
| PC-CAM-017 | Rule of Thirds / 三分构图 | 用三等分参考线组织视觉重心的方法 | IS_A composition principle |
| PC-CAM-018 | Symmetry / 对称 | 围绕画面轴线组织视觉元素的构图方式 | IS_A composition principle |
| PC-CAM-019 | Negative Space / 负空间 | 主体以外、参与画面平衡与信息表达的空间 | IS_A composition concept |
| PC-CAM-020 | Depth Composition / 纵深构图 | 利用不同深度层次组织画面的构图方法 | DEPENDS_ON spatial relation/Perspective |

## 5. Optics / Lens / Imaging Geometry

| ID | Topic | 定义与边界 | 关键关系 |
| --- | --- | --- | --- |
| PC-OPT-001 | Physical Focal Length / 物理焦距 | 镜头光学系统的标称/实际焦距参数；不等于画幅等效焦距 | AFFECTS FOV；MEASURED_AS mm |
| PC-OPT-002 | Effective Imaging Area / 有效成像区域 | 当前 SensorRecordingMode 实际参与成像的宽高区域 | AFFECTS FOV/crop；PART_OF SensorRecordingMode |
| PC-OPT-003 | Image Circle / 像场 | 镜头可覆盖的成像圆范围 | CONSTRAINS sensor coverage |
| PC-OPT-004 | Lens Coverage / 镜头覆盖 | 镜头像场对特定有效成像区域的覆盖关系 | DEPENDS_ON Image Circle + active area |
| PC-OPT-005 | Prime Lens / 定焦镜头 | 拍摄时焦距固定的镜头 | CONTRASTS_WITH Zoom Lens |
| PC-OPT-006 | Zoom Lens / 变焦镜头 | 允许连续/离散改变物理焦距的镜头 | CHANGES Focal Length |
| PC-OPT-007 | F-number / F值 | 焦距与有效入瞳直径之比的几何光圈量 | AFFECTS exposure/DOF；CONTRASTS_WITH T-stop |
| PC-OPT-008 | T-stop / T值 | 将镜头实际透光损失计入后的曝光标度 | AFFECTS exposure；conversion requires official transmission relation |
| PC-OPT-009 | Iris / 光圈机构 | 改变有效孔径的镜头机构 | CHANGES F-number/T-stop where supported |
| PC-OPT-010 | Transmission / 透光率 | 光学系统实际传输光量的比例/损失关系 | LINKS F-number to T-stop when known |
| PC-OPT-011 | Focus Distance / 对焦距离 | 对焦平面对应的主体距离 | AFFECTS DOF |
| PC-OPT-012 | Minimum Focus Distance | 镜头可正常合焦的最近距离 | CONSTRAINS Focus Distance |
| PC-OPT-013 | Rack Focus / 焦点转移 | 拍摄过程中从一个对焦目标改变到另一个目标 | CHANGES Focus Distance；不等于 camera movement |
| PC-OPT-014 | Focus Breathing | 对焦变化伴随的视场/放大率变化 | AFFECTS framing/FOV；镜头特性 |
| PC-OPT-015 | Depth of Field / 景深 | 在给定观察/成像条件下可接受清晰范围 | DEPENDS_ON aperture、focus distance、focal length、CoC/model |
| PC-OPT-016 | Hyperfocal Distance / 超焦距 | 在指定 CoC/焦距/光圈模型下，使远端延伸至无穷远的对焦距离 | DERIVED_BY FORM-DOF-002 |
| PC-OPT-017 | Circle of Confusion | 景深模型中的允许弥散圆参数 | INPUT_TO DOF model；不是固定普适值 |
| PC-OPT-018 | Diffraction / 衍射 | 小孔径下波动光学导致细节扩散的现象 | AFFECTS resolution/sharpness |
| PC-OPT-019 | Rectilinear Projection | 尽量保持直线为直线的常见镜头投影模型 | ENABLES standard rectilinear FOV formula |
| PC-OPT-020 | Fisheye Projection | 非直线投影的超广角镜头模型集合 | REQUIRES manufacturer/projection model；禁止套普通FOV公式 |
| PC-OPT-021 | Spherical Lens | 水平/垂直不采用 anamorphic squeeze 的常规成像体系 | CONTRASTS_WITH Anamorphic |
| PC-OPT-022 | Anamorphic Lens | 在至少一个方向进行光学压缩的成像体系 | REQUIRES squeeze/desqueeze |
| PC-OPT-023 | Squeeze Ratio | Anamorphic 水平等方向的光学压缩倍率 | AFFECTS desqueezed FOV/aspect |
| PC-OPT-024 | Desqueeze | 将 anamorphic 压缩画面恢复显示比例的变换 | DEPENDS_ON Squeeze Ratio |
| PC-OPT-025 | Crop / Equivalent FOV | 用不同有效成像区域比较取景范围的表达 | DERIVED_BY active area + focal length；不覆盖 physical focal length |

## 6. Camera Movement / Framing Change

| ID | Topic | 定义与边界 | 关键关系 |
| --- | --- | --- | --- |
| PC-MOV-001 | Pan | 摄影机位置基本不变，绕垂直轴旋转 | CHANGES orientation；PRESERVES position |
| PC-MOV-002 | Tilt | 摄影机位置基本不变，绕水平轴上下旋转 | CHANGES orientation |
| PC-MOV-003 | Roll | 绕光轴旋转 | CHANGES horizon/Dutch angle |
| PC-MOV-004 | Pedestal | 摄影机整体上下平移 | CHANGES Camera Position；PRESERVES focal length if lens unchanged |
| PC-MOV-005 | Truck / Track | 摄影机整体横向/沿轨迹平移 | CHANGES Camera Position/Perspective |
| PC-MOV-006 | Dolly In / Out | 摄影机向主体靠近/远离 | CHANGES position, framing and perspective |
| PC-MOV-007 | Arc / Orbit | 摄影机绕主体弧形移动 | CHANGES position/orientation/perspective |
| PC-MOV-008 | Crane / Jib | 借助摇臂/吊臂产生复合空间位移 | CHANGES Camera Position |
| PC-MOV-009 | Handheld | 由操作者直接承托产生的机位/姿态变化方式 | IS_A support/movement mode |
| PC-MOV-010 | Gimbal Movement | 由电控稳定器辅助的移动摄影 | REQUIRES compatible support |
| PC-MOV-011 | Steadicam Movement | 由机械稳定系统辅助的移动摄影 | REQUIRES compatible support |
| PC-MOV-012 | Drone Movement | 由飞行平台实现三维空间移动摄影 | REQUIRES aerial imaging device |
| PC-MOV-013 | Spatial Push | 焦距保持，摄影机靠近主体造成主体画面占比增大 | CHANGES position/perspective；PRESERVES focal length |
| PC-MOV-014 | Optical Zoom | 机位保持，改变镜头焦距造成取景范围改变 | CHANGES focal length/FOV；PRESERVES position |
| PC-MOV-015 | Mixed Push / Dolly Zoom | 机位与焦距同时改变 | CHANGES position+focal length；可用于保持特定主体画面比例 |
| PC-MOV-016 | In-camera Digital Zoom/Crop | 拍摄阶段通过传感器裁切/数字缩放改变取景 | CHANGES recorded framing；不改变光学 perspective |
| PC-MOV-017 | Post Reframe / Digital Zoom | 后期对已有图像裁切/缩放 | FOLLOWS capture；不改变拍摄时 perspective/FOV |

## 7. Exposure / Capture Time

| ID | Topic | 定义与边界 | 关键关系 |
| --- | --- | --- | --- |
| PC-EXP-001 | Exposure | 传感器/胶片接收到的有效光量及记录结果 | DEPENDS_ON aperture、exposure time、scene luminance、sensitivity model |
| PC-EXP-002 | ISO | 设备/标准定义的感光标度；具体意义依相机实现 | 不与EI/Gain全局互换 |
| PC-EXP-003 | Exposure Index / EI | 作为曝光/处理参考的指数，可能不等于传感器物理增益 | model-specific |
| PC-EXP-004 | Gain | 电子/数字信号增益表达 | model-specific；可用dB等 |
| PC-EXP-005 | Shutter Speed / Exposure Time | 单帧实际曝光时长 | DERIVED_WITH Shutter Angle + FPS where applicable |
| PC-EXP-006 | Shutter Angle | 用一圈周期角度表达曝光占比的电影摄影参数 | DERIVED_WITH exposure time + FPS |
| PC-EXP-007 | Neutral Density / ND | 降低进入系统光量的滤镜/机制 | MEASURED_AS optical density/stops |
| PC-EXP-008 | Stop | 以2倍/1/2光量为一级的曝光变化单位 | PART_OF exposure relationships |
| PC-EXP-009 | Exposure Value / EV | 在指定定义下组合光圈与曝光时间的曝光参数 | DERIVED_BY FORM-EXP-001 |
| PC-EXP-010 | Frame Rate | 单位时间记录/播放的帧数 | AFFECTS motion/time calculations |
| PC-EXP-011 | Project FPS | 项目/时间线基准帧率 | CONSTRAINS timecode/playback |
| PC-EXP-012 | Capture FPS | 实际拍摄记录帧率 | AFFECTS slow/fast motion |
| PC-EXP-013 | Playback FPS | 回放帧率 | with Capture FPS DETERMINES speed ratio |
| PC-EXP-014 | Motion Blur | 曝光期间运动在图像中的时间积分模糊 | AFFECTED_BY exposure time + motion |
| PC-EXP-015 | Overcrank | Capture FPS 高于目标 Playback FPS 形成慢动作 | DEPENDS_ON capture/playback ratio |
| PC-EXP-016 | Undercrank | Capture FPS 低于目标 Playback FPS 形成快动作 | DEPENDS_ON capture/playback ratio |

## 8. Lighting / Photometry / Color Temperature

| ID | Topic | 定义与边界 | 关键关系 |
| --- | --- | --- | --- |
| PC-LGT-001 | Key Light | 画面中承担主要塑形/方向作用的光源角色 | IS_A lighting role |
| PC-LGT-002 | Fill Light | 调节阴影亮度/反差的光源角色 | AFFECTS contrast ratio |
| PC-LGT-003 | Back / Rim Light | 从主体后方/侧后方塑造轮廓或分离的光源角色 | AFFECTS separation |
| PC-LGT-004 | Hard Light | 相对明显锐利阴影边缘的光质 | AFFECTED_BY apparent source size/distance |
| PC-LGT-005 | Soft Light | 相对柔和阴影过渡的光质 | AFFECTED_BY apparent source size/distance |
| PC-LGT-006 | Apparent Source Size | 从主体视角看到的光源角尺寸 | AFFECTS shadow softness |
| PC-LGT-007 | Light Direction | 光相对主体的入射方向 | AFFECTS shape/texture |
| PC-LGT-008 | Light Distance | 光源与受光面的距离 | AFFECTS illuminance and apparent size |
| PC-LGT-009 | Contrast Ratio | 画面指定区域亮度/曝光关系的比较 | DEPENDS_ON measurement definition |
| PC-LGT-010 | Inverse Square Law | 理想点光源下照度随距离平方反比变化 | DERIVED_BY FORM-LGT-001；实际大面积光源近场需注明限制 |
| PC-LGT-011 | CCT | 用相关色温描述近似白光色度的量 | MEASURED_AS kelvin |
| PC-LGT-012 | Tint / Green-Magenta | 与色温轴不同的绿-洋红偏移描述 | CONTRASTS_WITH CCT |
| PC-LGT-013 | Modifier | 改变光束形状、扩散、聚光或质感的附件类别 | REQUIRES compatible interface |
| PC-LGT-014 | Fresnel | 利用菲涅耳光学改变光束的灯光附件/光学结构 | IS_A Modifier |
| PC-LGT-015 | Softbox | 扩大/扩散发光面的柔光附件 | IS_A Modifier |
| PC-LGT-016 | Grid | 限制扩散角/控制溢光的附件 | IS_A Modifier |
| PC-LGT-017 | Projection Attachment | 投射图案/切光/聚焦的光学附件 | IS_A Modifier；REQUIRES lens/mount compatibility |

## 9. Color Science / Image Pipeline

| ID | Topic | 定义与边界 | 关键关系 |
| --- | --- | --- | --- |
| PC-COL-001 | White Balance | 对场景中性点/照明色偏进行拍摄或处理基准设定 | AFFECTS image transform |
| PC-COL-002 | Color Space | 定义色度坐标、白点等颜色表示范围/体系 | PART_OF color pipeline |
| PC-COL-003 | Transfer Function | 线性场景/显示信号与编码值之间的映射 | CONTRASTS_WITH Color Space |
| PC-COL-004 | Gamma | 一类幂函数/近似编码或显示关系的统称，需指明具体定义 | IS_A/RELATED transfer function |
| PC-COL-005 | Log Encoding | 为扩大编码动态范围而使用的对数/类对数编码 | IS_A transfer/encoding family |
| PC-COL-006 | Linear Light | 与场景/光能近似线性比例的图像数值域 | CONTRASTS_WITH display/log encodings |
| PC-COL-007 | LUT | 固定输入到输出颜色/数值映射表 | PART_OF transform pipeline；不是完整色彩管理本身 |
| PC-COL-008 | Bit Depth | 每通道可表示的离散数值精度 | AFFECTS quantization headroom |
| PC-COL-009 | Chroma Sampling | 色度相对亮度的采样结构，如4:4:4/4:2:2等 | AFFECTS chroma detail |
| PC-COL-010 | SDR | 标准动态范围显示/交付类别 | CONTRASTS_WITH HDR |
| PC-COL-011 | HDR | 高动态范围显示/交付类别 | REQUIRES transfer/display metadata context |
| PC-COL-012 | Rec.709 | 常见HD视频颜色/信号推荐体系；使用时需区分色域/传递函数具体上下文 | REFERENCES delivery/display |
| PC-COL-013 | Rec.2020 | UHD广色域推荐体系 | REFERENCES HDR/UHD workflows |
| PC-COL-014 | sRGB | 常见计算机/网络图像颜色空间/传递关系 | REFERENCES graphics/stills |
| PC-COL-015 | Display P3 | 常见广色域显示颜色空间 | REFERENCES display pipeline |
| PC-COL-016 | Gamma 2.4 | 常见监看/显示目标之一 | IS_A transfer/display setting |
| PC-COL-017 | ST2084 / PQ | HDR绝对亮度型电光传递函数 | IS_A transfer function |
| PC-COL-018 | HLG | HDR广播兼容型传递体系 | IS_A transfer function |
| PC-COL-019 | ACES | 影视色彩管理与交换体系 | PART_OF color pipeline |
| PC-COL-020 | RED IPP2 / Log3G10 | RED影像处理/编码体系中的相关工作流概念 | REFERENCES RED camera pipeline |
| PC-COL-021 | Camera Recording Pipeline | 相机从传感器到记录格式/色彩编码的数据流 | PRODUCES camera media |
| PC-COL-022 | Composite Color Pipeline | 合成阶段输入、工作空间、输出的颜色数据流 | CONSUMES/PRODUCES image formats |
| PC-COL-023 | Render Color Pipeline | 渲染阶段场景线性/显示变换与输出的颜色数据流 | PRODUCES render formats |
| PC-COL-024 | Post / Delivery Color Pipeline | 调色、在线、母版和交付颜色变换链 | CONSUMES camera/render/composite media |

## 10. Production Sound / Sync

| ID | Topic | 定义与边界 | 关键关系 |
| --- | --- | --- | --- |
| PC-AUD-001 | Microphone Type | 按换能/用途等分类的话筒概念 | CONSTRAINS capture method |
| PC-AUD-002 | Pickup Pattern | 话筒对不同方向声音敏感度的空间特性 | PART_OF microphone spec |
| PC-AUD-003 | Boom | 通过杆件将话筒定位在画面外靠近声源的现场收声方式 | IS_A production sound method |
| PC-AUD-004 | Lavalier / Lav | 佩戴/隐藏于人物附近的小型话筒使用方式 | IS_A production sound method |
| PC-AUD-005 | Mic Level | 常见低电平麦克风信号级别类别 | CONTRASTS_WITH Line Level |
| PC-AUD-006 | Line Level | 设备间传输的较高标准信号级别类别 | CONTRASTS_WITH Mic Level |
| PC-AUD-007 | Sample Rate | 每秒数字音频采样次数 | MEASURED_AS Hz |
| PC-AUD-008 | Audio Bit Depth | 单个音频样本的量化位深 | AFFECTS quantization/dynamic representation |
| PC-AUD-009 | Timecode | 为媒体建立时间位置标识的计时码体系 | SUPPORTS sync |
| PC-AUD-010 | Sync | 使画面与声音或多设备时间关系一致 | DEPENDS_ON timecode/clock/reference/workflow |
| PC-AUD-011 | Production Sound | 拍摄现场记录的声音 | PRODUCES media |
| PC-AUD-012 | Dialogue | 对白内容类别 | PART_OF sound edit/mix |
| PC-AUD-013 | SFX | 音效内容类别 | PART_OF sound design |
| PC-AUD-014 | Music | 音乐内容类别 | PART_OF soundtrack |
| PC-AUD-015 | Mix | 将多个声音元素按目标输出整合的过程 | CONSUMES dialogue/music/SFX |

## 11. Media / Format / Metadata

| ID | Topic | 定义与边界 | 关键关系 |
| --- | --- | --- | --- |
| PC-MED-001 | Container | 封装多种媒体流和metadata的文件结构 | CONTAINS codec streams |
| PC-MED-002 | Codec | 媒体编码/解码方式 | USED_IN container/stream |
| PC-MED-003 | Image Sequence | 以连续单帧文件组成运动影像的方式 | CONTRASTS_WITH video container |
| PC-MED-004 | Project Interchange | 在不同剪辑/后期系统间传递时间线/编辑信息的交换格式类别 | REFERENCES OTIO/EDL/XML |
| PC-MED-005 | Original / Camera Original | 由拍摄设备产生、作为原始源的媒体 | PRECEDES proxy/conform |
| PC-MED-006 | Proxy | 为性能/协作生成的低负载替代媒体 | REFERENCES original；不得冒充 master |
| PC-MED-007 | Preview | 用于预览/草稿流程的媒体 | 不等于Formal Handoff/Master |
| PC-MED-008 | Master | 经过指定制作/验收后的主交付媒体版本 | PRECEDES variants/delivery |
| PC-MED-009 | Metadata | 描述媒体、拍摄、编码或业务信息的数据 | PART_OF media/asset |
| PC-MED-010 | Offload | 从采集介质复制素材到目标存储的过程 | PRECEDES integrity/backup |
| PC-MED-011 | Integrity Check | 验证文件内容完整性的检查事实 | REQUIRED_BY Formal Handoff |
| PC-MED-012 | Backup Verification | 验证项目要求的备份事实 | REQUIRED_BY Formal Handoff when configured |
| PC-MED-013 | Formal Handoff | 将固定 AssetVersion 正式交给下游的业务事实 | REQUIRES integrity + configured backup |
| PC-MED-014 | Conform | 将离线编辑决策重新连接至高质量/原始媒体的过程 | CONSUMES edit decisions + originals |
| PC-MED-015 | QC | 对目标版本按项目要求进行检查的事实/流程 | PRECEDES delivery where required |
| PC-MED-016 | Delivery Variant | 同一作品针对不同交付目标生成的版本变体 | PART_OF deliverable |

## 12. 2D / Motion / Compositing

| ID | Topic | 定义与边界 | 关键关系 |
| --- | --- | --- | --- |
| PC-2D-001 | Alpha | 表示像素覆盖/透明关系的通道或概念 | USED_BY compositing |
| PC-2D-002 | Matte | 用于限定图像区域的遮罩信息 | USED_BY compositing |
| PC-2D-003 | Keying | 基于颜色/亮度等特征分离前景背景的过程 | PRODUCES matte/alpha |
| PC-2D-004 | Rotoscope | 通过逐帧/跟踪方式建立精细遮罩的过程 | PRODUCES matte |
| PC-2D-005 | Tracking | 估计图像中特征/物体/相机运动的过程 | PRODUCES motion data |
| PC-2D-006 | Cleanup | 移除或修复画面中指定元素的处理类别 | CONSUMES plate/reference |
| PC-2D-007 | Compositing | 将多层图像/渲染元素整合为目标画面的过程 | CONSUMES layers/mattes/color pipeline |
| PC-2D-008 | Motion Graphics | 以图形、文字和运动设计为核心的动态图像类别 | REFERENCES typography/animation/composite |
| PC-2D-009 | Typography Animation | 以文字形态、排版和运动为核心的动画类别 | IS_A Motion Graphics |
| PC-2D-010 | 2D Animation | 二维空间为主要表达体系的动画制作类别 | CONTRASTS_WITH 3D animation |

## 13. 3D / VFX / Realtime

| ID | Topic | 定义与边界 | 关键关系 |
| --- | --- | --- | --- |
| PC-3D-001 | Mesh | 三维表面几何表示 | PART_OF 3D asset |
| PC-3D-002 | Topology | Mesh 顶点/边/面的连接结构 | AFFECTS deformation/model quality |
| PC-3D-003 | UV | 将三维表面映射到二维纹理坐标的结构 | SUPPORTS texturing |
| PC-3D-004 | Material | 定义表面着色属性的资产/描述 | REFERENCES shader/textures |
| PC-3D-005 | Shader | 计算表面/体积外观的着色程序/模型 | PART_OF material/rendering |
| PC-3D-006 | Rig | 为模型提供控制、骨骼和变形结构的系统 | PRECEDES character/object animation |
| PC-3D-007 | Layout | 在镜头中组织相机、角色和场景元素的阶段/结果 | PRECEDES final animation/render |
| PC-3D-008 | Virtual Camera | 在数字场景中定义摄影机及其运动/光学参数 | REFERENCES camera commons |
| PC-3D-009 | 3D Animation | 对三维对象/角色/相机随时间变化进行制作 | CONSUMES rig/layout |
| PC-3D-010 | Simulation | 依据规则/物理模型计算随时间变化的效果 | PRODUCES cache |
| PC-3D-011 | Cache | 固化模拟/动画计算结果供下游读取的数据 | PRODUCES/CONSUMES pipeline artifact |
| PC-3D-012 | 3D Lighting | 在三维场景中定义数字光源和照明关系 | REFERENCES lighting/color commons |
| PC-3D-013 | Rendering | 将数字场景计算为图像/序列的过程 | PRODUCES image sequence/AOV |
| PC-3D-014 | AOV | 渲染输出中按属性/贡献拆分的辅助图像通道 | PRODUCES compositing inputs |
| PC-3D-015 | Realtime Rendering | 以交互速度更新画面的渲染方式 | PART_OF realtime production |
| PC-3D-016 | Virtual Production | 将实时数字环境、摄影、跟踪等用于制作现场/预演/拍摄的工作方式集合 | REFERENCES realtime/camera/tracking |
| PC-3D-017 | Mocap | 采集现实运动并转换为数字动作数据的过程 | PRODUCES motion data |
| PC-3D-018 | Photogrammetry | 从多张照片/影像估计三维几何与纹理的重建方法 | PRODUCES 3D asset/reference |

## 14. Production Workflow / Schedule / Handoff

| ID | Topic | 定义与边界 | 关键关系 |
| --- | --- | --- | --- |
| PC-WF-001 | Task | 可分派、执行、交接的工作单元 | DEPENDS_ON inputs/dependencies |
| PC-WF-002 | Dependency | 一个工作单元对另一个工作/输入的先后/准备关系 | CONSTRAINS readiness |
| PC-WF-003 | Handoff | 固定输出版本交给下游的业务动作 | PRODUCES downstream input |
| PC-WF-004 | Planned | 已确认/候选计划中的预期事实 | CONTRASTS_WITH Forecast/Actual |
| PC-WF-005 | Forecast | 基于当前信息推算的未来事实 | DERIVED_BY current facts |
| PC-WF-006 | Actual | 已发生并记录的实际事实 | 不被Forecast覆盖 |
| PC-WF-007 | SchedulePlan | 一套可比较的排期方案 | CONTAINS ShootDay/ScheduleItem |
| PC-WF-008 | ShootDay | 某拍摄工作日范围 | CONTAINS schedule items |
| PC-WF-009 | ScheduleItem | 在时间轴上安排或记录实际执行的工作条目 | REFERENCES Scene/Shot/Task/Person/Location |
| PC-WF-010 | Company Move | 转场/移动工作，属于 ScheduleItem 类型 | CHANGES location/time availability |
| PC-WF-011 | Call Sheet Draft | 从当前排期与项目事实投影出的通告草稿 | DERIVED_BY current schedule |
| PC-WF-012 | CallSheetRevision | 发布后固定的通告修订 | 不随排期自动漂移 |
| PC-WF-013 | Readiness | 由 Task/Input/Checklist/Authorization 等事实派生的可开始状态 | DERIVED_BY authoritative facts |
| PC-WF-014 | Checklist | 检查是否满足条件的结构化检查，不是SOP | AFFECTS Readiness if required |
| PC-WF-015 | Authorization Requirement | 项目要求的制作授权条件 | AFFECTS Readiness/QC when hard |
| PC-WF-016 | Review | 对固定版本/修订进行审阅的业务过程 | REFERENCES immutable target |
| PC-WF-017 | ReworkRequest | 从Review/Delivery问题形成的返工或补拍需求 | PRODUCES Task/Schedule demand |
| PC-WF-018 | Deliverable | 对外交付对象/要求 | CONSUMES approved version/QC |
| PC-WF-019 | Delivery | 提交/送达/确认/验收等独立事实集合 | FOLLOWS QC/authorization where required |

## 15. Formula / Unit / Derived Calculation

首批 FormulaDefinition：

| ID | Formula | 输入 | 输出/规则 |
| --- | --- | --- | --- |
| FORM-OPT-001 | Rectilinear FOV | focal length + effective dimension | `2 * atan(dimension / (2*f))`；仅适用 rectilinear 且无更高优先级官方AoV |
| FORM-OPT-002 | Anamorphic desqueezed FOV | official/projection data + squeeze + active area | 按厂商模型；禁止仅用通用倍乘替代特殊官方数据 |
| FORM-DOF-001 | DOF | focal length、focus distance、F-number、CoC | 仅在指定几何光学模型下计算 |
| FORM-DOF-002 | Hyperfocal | focal length、F-number、CoC | 常见薄透镜近似；结果标CALCULATED |
| FORM-TIME-001 | Shutter Angle → Exposure Time | shutter angle + FPS | `t = angle / (360 * fps)` |
| FORM-TIME-002 | Exposure Time → Shutter Angle | exposure time + FPS | `angle = t * fps * 360` |
| FORM-TIME-003 | Frame Count ↔ Duration | frames + rational FPS | duration = frames / fps；需遵守项目timecode规则 |
| FORM-DATA-001 | Bitrate × Duration | bitrate + duration | 估算数据量；明确bit/byte换算 |
| FORM-LGT-001 | Inverse Square | distance ratio | 理想点光源近似：E ∝ 1/r² |
| FORM-EXP-001 | EV | F-number + exposure time | 常用ISO100基准形式 `EV = log2(N²/t)`；其他上下文需显式 |
| FORM-EXP-002 | ND Stops | transmission/optical density | 按定义转换；不能把厂商命名直接当精确测量 |
| FORM-LGT-002 | Lux ↔ foot-candle | illuminance | 1 fc ≈ 10.7639 lux |
| FORM-OPT-003 | Crop / Equivalent FOV | active dimensions + reference dimensions | 只用于视场比较，不覆盖physical focal length |

F-number ↔ T-stop 与 ISO/EI/Gain **不提供全局 FormulaDefinition**；必须由具体镜头/机身官方映射支持。

## 16. Equipment Interface / Compatibility 常识

| ID | Topic | 定义 |
| --- | --- | --- |
| PC-IF-001 | Interface | 设备间机械、电气、数据、控制或光学连接能力的稳定定义 |
| PC-IF-002 | Mechanical Mount | 机械安装接口，如 lens mount、modifier mount、support mount |
| PC-IF-003 | Power Interface | 供电输入/输出接口 |
| PC-IF-004 | Video Interface | 视频输入/输出接口 |
| PC-IF-005 | Data Interface | 数据传输接口 |
| PC-IF-006 | Control Interface | 遥控/协议/电子控制接口 |
| PC-IF-007 | Quick Release Interface | 快拆板、云台、稳定器等支撑系统接口 |
| PC-IF-008 | Direct Compatibility | 无中间件即可按目标用途连接/工作 |
| PC-IF-009 | Adapter Required | 需要现实存在的 AdapterModel/Accessory 才能连接 |
| PC-IF-010 | Conditional Compatibility | 只有特定模式/固件/功能条件下兼容 |
| PC-IF-011 | Incompatible | 按明确用途/接口无法兼容 |
| PC-IF-012 | Compatibility Path | 由接口和中间件组成的兼容路径；自动推荐最多两个中间节点 |

Compatibility 必须分别保存 mechanical/electronic/AF/aperture/metadata/stabilization/focus-control/power/video/data/control 等能力，不以“能装上”代表全部支持。

## 17. Time Calibration 常识

| ID | Topic | 定义 |
| --- | --- | --- |
| PC-TIME-001 | Planned Duration | 排期/制作表中的预估工作时长 |
| PC-TIME-002 | Actual Duration | 已发生工作的实际时长 |
| PC-TIME-003 | Duration Range | 只能粗略确认时使用的时长范围 |
| PC-TIME-004 | Shot Aggregate | Shot总时长聚合目标，不与组成阶段重复计样本 |
| PC-TIME-005 | Scene Aggregate | Scene总时长聚合目标 |
| PC-TIME-006 | ShootDay Aggregate | ShootDay总时长聚合目标 |
| PC-TIME-007 | Setup Duration | Setup component metric |
| PC-TIME-008 | Rehearsal Duration | Rehearsal component metric |
| PC-TIME-009 | Shoot Duration | Shoot component metric |
| PC-TIME-010 | Reset Duration | Reset component metric |
| PC-TIME-011 | Strike Duration | Strike component metric |
| PC-TIME-012 | Company Move Duration | 转场 component metric |
| PC-TIME-013 | Task Duration | 一般Task component metric |
| PC-TIME-014 | Post Work Duration | 后期工作 component metric |

时间统计绝不按 Person 汇总效率；同一执行事实的 aggregate 与 components 不可同时作为独立样本累计。

## 18. 首批 Domain ↔ Topic 绑定原则

15个基础大类只做归组，不限制 Topic 被多域引用。例如：

- FIELD_OF_VIEW 同时属于 Camera Angle/Composition、Optics/Imaging Geometry、Formula/Derived Calculation；
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
