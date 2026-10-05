> **下一代业务定义，尚未实施。** 本文件是首批知识参考对象的“已填 Seed 数据包”，用于后续数据库/导入实现的结构化基线。它不是运行数据库快照，不代表产品已上线。所有器材规格只接受厂商官方来源；无法从当前官方来源确认的字段明确保持 UNKNOWN，不用第三方数据补齐。

# FrameForge 真实型号、字段及连接数据样例

版本：1.1，2026-10-05。状态：首批官方数据已开始结构化填充；仍待实现数据库、导入器、索引和UI。

配套：[制作常识与 Seed Catalog](PRODUCTION_COMMONS_AND_REFERENCE_SEEDS_2026-10-05.md)、[制作常识 Topic Catalog](PRODUCTION_COMMONS_TOPIC_CATALOG_2026-10-05.md)、[A–H知识小库组件](AH_KNOWLEDGE_LIBRARY_COMPONENTS_2026-10-05.md)。

## 1. 数据状态

| Status | 含义 |
| --- | --- |
| `OFFICIAL_VERIFIED` | 当前厂商官方页面/手册直接支持该字段 |
| `OFFICIAL_PARTIAL` | 产品身份和部分数据已由官方来源确认，但仍有字段待官方资料补齐 |
| `OFFICIAL_CONFLICT` | 同一厂商不同官方页面/版本存在冲突，保留来源，不静默择一 |
| `UNKNOWN` | 当前官方来源没有确认，不猜值 |
| `DERIVED` | FrameForge 根据已确认官方输入与已批准公式/分类产生；不能冒充官方规格 |
| `FRAMEFORGE_CLASSIFICATION` | 软件能力级别等由 FrameForge 对官方功能范围做的受控分类，不是厂商原话 |

来源记录URL、资料版本、地区和实际访问时间，不统一伪填日期。既有表的状态为原稿核验摘要；本轮未逐字段重查的值保留但不得据此直接导入为已核验。本轮明确复核的字段及栏目位置见下表与第15—16节。原稿缺页码、条件或来源的项等待补齐；不保存网页证据快照。

值来源、核验状态、完整程度、链接访问状态按[字段合同](EQUIPMENT_REFERENCE_FIELD_CONTRACT_2026-10-05.md)独立记录。本篇是真实样例及待补数据，不是全量官方规格完成报告。

## 2. 首批来源索引（SourceReference）

| Source ID | Manufacturer / owner | 官方来源 |
| --- | --- | --- |
| SRC-RED-KOMODO-SPECS | RED | https://docs.red.com/955-0190_v1.5/955-0196_V1.5%20Rev-A_RED_PS_KOMODO_Operation_Guide/Content/A_TechSpecs/Specs_KOMODO_6K.htm |
| SRC-RED-KOMODO-FORMAT | RED | https://docs.red.com/955-0190_v1.3/955-0190_v1.3_REV-1.3_RED_PS_KOMODO_Operation_Guide/Content/4_Menus/ProjSet/Format.htm |
| SRC-ZEISS-CP3 | ZEISS | https://www.zeiss.com/photonics-and-optics/us/cinematography/lenses/compact-prime-cp-3-lenses.html |
| SRC-DJI-POCKET4P | DJI | https://store.dji.com/cn/product/osmo-pocket-4p?set_region=CN （本轮检索到官方正文；英国同路径直接打开失败，访问状态另记） |
| SRC-DJI-POCKET4P-GUIDE | DJI | https://repair.dji.com/help/content?customId=01700043704&documentType=&lang=zh-CN&paperDocType=FAQ&re=CN&spaceId=17 （只提取基础规格和条件，不复制操作步骤） |
| SRC-DJI-POCKET4P-WIDE | DJI | https://store.dji.com/uk/product/osmo-pocket-4p-wide-angle-lens?from=site-nav&set_region=GB&vid=241671 |
| SRC-ARRI-LMB45 | ARRI | https://www.arri.com/resource/blob/73126/e3cad1c69313e606f7d9d98e61d7db06/7-3-0-lightweight-matte-boxes-lmb-4x5-data.pdf （配置图7.3.0 / 2024.11，第1页） |
| SRC-ARRI-F4 | ARRI | https://www.arri.com/en/cine-systems/mechanical-accessories/matte-box/filter-frames-new （F4栏目） |
| SRC-DJI-POCKET-SERIES | DJI | https://store.dji.com/ca/event/dji-osmo-pocket-series |
| SRC-DJI-MAVIC4 | DJI | https://store.dji.com/ca/product/dji-mavic-4-pro |
| SRC-DJI-MAVIC4-ANNOUNCE | DJI | https://www.dji.com/mc/media-center/announcements/dji-release-mavic-4-pro |
| SRC-DJI-RS5 | DJI | https://www.dji.com/rs-5/specs |
| SRC-DJI-COMPAT | DJI | https://www.dji.com/support/compatibility |
| SRC-DJI-FOCUSPRO | DJI | https://www.dji.com/focus-pro |
| SRC-DJI-TRANSMISSION | DJI | https://www.dji.com/support/product/transmission |
| SRC-DJI-SDR | DJI | https://www.dji.com/sdr-transmission/specs |
| SRC-NANLITE-FC120B | Nanlite | https://nanliteus.com/products/fc-120b-bi-color-led-spotlight-testing-1 |
| SRC-NANLITE-FC-SERIES | Nanlite | https://nanliteus.com/shop/by-collection/monolight-style/fc-series/ |
| SRC-NANLITE-FC300B | Nanlite | https://nanliteus.com/products/fc-300b-bi-color-led-spotlight-open-box |
| SRC-NANLITE-FC-PC | Nanlite | https://nanliteus.com/products/fc-powercontroller-for-fc-300b-fc-500b-and-fc-500c |
| SRC-NANLITE-PAVO15C | Nanlite | https://nanliteus.com/products/pavotube-ii-15c-2-foot-rgbww-led-tube-light |
| SRC-NANLITE-FORZA200 | Nanlite | https://www.nanlite.com/product-forza-200 |
| SRC-NANLITE-FORZA300B-OLD | Nanlite | 缺少可定位官方网址/资料位置；待取得旧款手册，不作为已核验来源 |
| SRC-APUTURE-STORM1200X | Aputure | https://aputure.com/EN-US/products/storm-1200x |
| SRC-TIFFEN-BPM4565 | Tiffen | https://tiffen.com/products/4-x-5-65-black-pro-mist-filter |
| SRC-TIFFEN-PM4565 | Tiffen | https://tiffen.com/products/4-x-5-65-pro-mist-filter |
| SRC-BLENDER-FEATURES | Blender Foundation | https://www.blender.org/features/ |
| SRC-BLENDER-EDIT | Blender Foundation | https://www.blender.org/features/video-editing/ |
| SRC-UE-FEATURES | Epic Games | https://www.unrealengine.com/features |
| SRC-AE-FEATURES | Adobe | https://www.adobe.com/products/aftereffects/features.html |

## 3. 摄影机 → RED → KOMODO 6K（仅原版）

### 3.1 型号身份与专业字段（EquipmentModel）

| 字段 | 值 | 核验摘要 | 来源 |
| --- | --- | --- | --- |
| seed_id | EQ-RED-KOMODO-6K | — | — |
| manufacturer | RED | OFFICIAL_VERIFIED | SRC-RED-KOMODO-SPECS |
| model | KOMODO 6K | OFFICIAL_VERIFIED | SRC-RED-KOMODO-SPECS |
| equipment_category | CAMERA_BODY / IMAGING_DEVICE | FRAMEFORGE_CLASSIFICATION | — |
| sensor_type | 19.9 MP Super 35 Global Shutter CMOS | OFFICIAL_VERIFIED | SRC-RED-KOMODO-SPECS |
| effective_pixels | 6144 × 3240 | OFFICIAL_VERIFIED | SRC-RED-KOMODO-SPECS |
| sensor_width_mm | 27.03 | OFFICIAL_VERIFIED | SRC-RED-KOMODO-SPECS |
| sensor_height_mm | 14.26 | OFFICIAL_VERIFIED | SRC-RED-KOMODO-SPECS |
| sensor_diagonal_mm | 30.56 | OFFICIAL_VERIFIED | SRC-RED-KOMODO-SPECS |
| dynamic_range | 16+ stops | OFFICIAL_VERIFIED | SRC-RED-KOMODO-SPECS |
| native_lens_mount | Canon RF | OFFICIAL_VERIFIED | SRC-RED-KOMODO-SPECS |
| mount_electronic_communication | supported | OFFICIAL_VERIFIED | SRC-RED-KOMODO-SPECS |
| max_data_rate | 280 MB/s | OFFICIAL_VERIFIED | SRC-RED-KOMODO-SPECS |
| media | qualified CFast 2.0 / RED Pro CFast | OFFICIAL_VERIFIED | SRC-RED-KOMODO-SPECS |
| primary_raw_format | REDCODE RAW | OFFICIAL_VERIFIED | SRC-RED-KOMODO-SPECS |

### 3.2 传感器录制模式（SensorRecordingMode）

| 模式ID | 分辨率 | 有效区域mm | 最大REDCODE拍摄帧率 | 核验摘要 |
| --- | --- | --- | ---: | --- |
| MODE-KOMODO-6K-17-9 | 6144×3240 | 27.03×14.26 | 40 | OFFICIAL_VERIFIED |
| MODE-KOMODO-6K-2.4-1 | 6144×2592 | 27.03×11.40 | 50 | OFFICIAL_VERIFIED |
| MODE-KOMODO-6K-16-9 | 5760×3240 | 25.34×14.26 | UNKNOWN in max-FPS table | OFFICIAL_PARTIAL |
| MODE-KOMODO-5K-17-9 | 5120×2700 | 22.53×11.88 | 48 | OFFICIAL_VERIFIED |
| MODE-KOMODO-4K-17-9 | 4096×2160 | 18.02×9.50 | 60 | OFFICIAL_VERIFIED |
| MODE-KOMODO-2K-17-9 | 2048×1080 | 9.01×4.75 | 120 | OFFICIAL_VERIFIED |

Project time bases: 23.98 / 24 / 25 / 29.97 / 30 / 50 / 59.94 / 60 fps，固定为官方规格，不根据最大Capture FPS反推。

### 3.3 原生接口与适配证据（Compatibility）

- 摄影机 → RED → KOMODO 6K（EQ-RED-KOMODO-6K）的原生接口为摄影专业 → 镜头卡口 → RF；这是型号拥有的接口事实，不是两个产品的直接兼容关系。
- 镜头 → 任一厂商 → 具体EF卡口变体，与摄影机 → RED → KOMODO之间，只能在列出转接件 → 厂商 → 实际型号、每端接口及官方功能证据后确认；本篇未填写具体转接型号，当前不创建已兼容电子通信断言。
- 其他卡口不因“市面上存在转接环”自动加入；必须有已建 AdapterModel + 官方来源。
- Project Mount Preference 只排序，不改变 RF 原生接口事实。

## 4. 镜头 → ZEISS → Compact Prime CP.3 / CP.3 XD

### 4.1 产品系列与变体

- family_id: `FAM-ZEISS-CP3`
- category: CINE_PRIME_LENS
- coverage: full-frame coverage（官方系列说明）
- interchangeable mount family：PL / Canon EF / Nikon F / Sony E / MFT，具体 mount variant 按 ZEISS 官方 mount-change 数据建立。
- CP.3 XD 的 metadata / distortion / shading 能力作为 XD Variant/Capability，不反向写进普通 CP.3。

### 4.2 十焦段数据候选表：保留字段，逐行待复核

AoV 顺序固定为：Full Frame / APS-H / Super 35 / Normal 35 / APS-C / MFT。

| 样例ID | 镜头 | 透光光圈范围 | 最近对焦 | 长度 | 前口径 | 重量 | 官方水平视角 FF / APS-H / S35 / N35 / APS-C / MFT |
| --- | --- | --- | --- | --- | --- | --- | --- |
| LENS-ZEISS-CP3-15 | 15mm T2.9 | T2.9–T22 | 0.30m | 83.7mm | 95mm | 0.87kg | 100° / 90° / 79° / 73° / 73° / 60° |
| LENS-ZEISS-CP3-18 | 18mm T2.9 | T2.9–T22 | 0.30m | 83.7mm | 95mm | 0.86kg | 89° / 80° / 69° / 63° / 64° / 51° |
| LENS-ZEISS-CP3-21 | 21mm T2.9 | T2.9–T22 | 0.24m | 83.7mm | 95mm | 0.82kg | 81° / 71° / 61° / 55° / 56° / 45° |
| LENS-ZEISS-CP3-25 | 25mm T2.1 | T2.1–T22 | 0.26m | 83.7mm | 95mm | 0.82kg | 72° / 62° / 53° / 47° / 48° / 38° |
| LENS-ZEISS-CP3-28 | 28mm T2.1 | T2.1–T22 | 0.24m | 83.7mm | 95mm | 0.84kg | 65° / 57° / 48° / 43° / 43° / 34° |
| LENS-ZEISS-CP3-35 | 35mm T2.1 | T2.1–T22 | 0.30m | 83.7mm | 95mm | 0.80kg | 54° / 47° / 39° / 35° / 35° / 28° |
| LENS-ZEISS-CP3-50 | 50mm T2.1 | T2.1–T22 | 0.45m | 83.7mm | 95mm | 0.77kg | 40° / 34° / 28° / 25° / 25° / 20° |
| LENS-ZEISS-CP3-85 | 85mm T2.1 | T2.1–T22 | 1.00m | 83.7mm | 95mm | 0.88kg | 24° / 20° / 17° / 15° / 15° / 12° |
| LENS-ZEISS-CP3-100CF | 100mm T2.1 CF | T2.1–T22 | 0.70m | 126.5mm | 95mm | 1.01kg | 20° / 17° / 14° / 13° / 13° / 10° |
| LENS-ZEISS-CP3-135 | 135mm T2.1 | T2.1–T22 | 1.00m | 126.5mm | 95mm | 1.15kg | 15° / 13° / 11° / 9° / 9° / 7° |

原稿将本表统一标成已核验，来源SRC-ZEISS-CP3；本轮保留数值但撤销批量核验结论。每支镜头的焦距、透光光圈、最近对焦基准、尺寸、卡口条件及六种画幅视角分别定位表格行后，才进入已核验规格。选择具体 Camera Body/RecordingMode 后，优先匹配官方AoV对应格式；没有直接格式匹配时才允许使用经批准公式产生 `CALCULATED` FOV。

## 5. 摄影机大类中的固定镜头与内置模组

### 5.1 摄影机 → DJI → Osmo Pocket 4P（口袋云台相机）

按用户本轮指定只写4P。旧稿把Pocket 4和4P的系列对比列混在一起，本节撤下混用参数，按[官方4P产品页](https://store.dji.com/cn/product/osmo-pocket-4p?set_region=CN)及[官方4P资料](https://repair.dji.com/help/content?customId=01700043704&documentType=&lang=zh-CN&paperDocType=FAQ&re=CN&spaceId=17)重新记录。英国整机链接本轮直接打开失败，不能把该失败当成参数否定；来源访问状态与内容核验分开。

整机ID：EQ-DJI-POCKET4P；两个从属内置模组分别维护，不是两台设备，也不是可更换镜头。官方资料说明拍摄时只有一个镜头工作，按变焦倍数切换。

| 中文字段 / 技术键 | 广角模组IMG-POCKET4P-WIDE | 中焦模组IMG-POCKET4P-MEDTELE | 栏目与状态 |
| --- | --- | --- | --- |
| 传感器名 sensor_type | 1英寸CMOS | 1/1.28英寸CMOS | 产品页“影像实力”，已核验名称，不等于毫米尺寸 |
| 等效焦距 equivalent_focal_length_mm | 20 | 60 | 产品页镜头行，已核验；物理焦距未知 |
| 几何光圈 f_number_min | 2.0 | 1.8 | 产品页镜头行，已核验；不填写透光光圈 |
| 最高慢动作规格 | 4K/240fps | 4K/200fps | 产品页最高录制规格，已核验上限；不是完整模式矩阵 |
| 可拆换镜头 replaceable_lens | false | false | 产品结构分类；内置模组不进独立镜头选择器 |
| 近摄距离 / 对焦基准 | 未核验 | 未核验 | 撤下旧稿0.09m/0.20m断言，待具体规格行 |
| 物理焦距 / 有效成像区毫米值 | 未知 | 未知 | 不能以营销画幅或等效焦距反推官方值 |

| 整机字段 | 值与条件 | 来源位置 |
| --- | --- | --- |
| built_in_storage_gb 内置存储 | 103GB | 官方资料“猜想问题”存储项，已核验 |
| runtime_test 续航测试 | 最长210分钟；25°C、1080p/24fps、16:9、Wi-Fi关闭且息屏 | 官方资料续航项及条件，已核验 |
| tracking_zoom_limit 跟踪变焦上限 | 12倍 | 官方资料智能跟随项，已核验；不是光学变焦倍率 |
| 其他显示/色彩/编码/快门/感光规格 | 待逐模式核验 | 不把广告汇总扩展到两个模组及全部模式 |

来源实际访问日2026-10-05；核验仅覆盖本节明确值。存储可录时长与电池续航独立，不互相替代。原稿107GB、240分钟、4倍跟随属于相邻型号对比列，不再用于4P。

### 5.2 摄影机 → DJI → Mavic 4 Pro（航拍设备）

一个 ImagingDevice + 三个 EmbeddedImagingModule：

| Module ID | Camera | Sensor | Photo | Lens | Aperture | Video / range | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| IMG-MAVIC4-HASSELBLAD | Hasselblad wide | 4/3 CMOS | 100MP | wide-angle；具体eq mm待规格页固定 | f/2.0–f/11 | up to 6K/60 HDR；15.5 stops DR | OFFICIAL_VERIFIED/PARTIAL |
| IMG-MAVIC4-70 | medium tele | 1/1.3-inch CMOS | 48MP | 70mm eq | f/2.8 | exact full video matrix UNKNOWN | OFFICIAL_VERIFIED/PARTIAL |
| IMG-MAVIC4-168 | tele | 1/1.5-inch CMOS | 50MP | 168mm eq | f/2.8 | exact full video matrix UNKNOWN | OFFICIAL_VERIFIED/PARTIAL |

设备级：
- Infinity Gimbal supports 70° upward shooting and 360° rotation；
- max flight time up to 51 min under DJI test conditions；
- O4+ supports up to 30km 10-bit HDR transmission under stated regional/test conditions。

三个模块都不可在 Lens Picker 中替换镜头。

## 6. 摄影支撑、跟焦与传输：按所属大类分别展开

### 6.1 稳定器 → DJI → RS 5

| Field | Value | Status |
| --- | --- | --- |
| seed_id | SUPPORT-DJI-RS5 | — |
| category | GIMBAL / CAMERA_SUPPORT | FRAMEFORGE_CLASSIFICATION |
| tested_payload | 3.0kg | OFFICIAL_VERIFIED |
| max_controlled_rotation_speed | Pan/Tilt/Roll 360°/s | OFFICIAL_VERIFIED |
| pan_range | 360° continuous | OFFICIAL_VERIFIED |
| roll_range | -95° to +240° | OFFICIAL_VERIFIED |
| tilt_range | -112° to +214° | OFFICIAL_VERIFIED |
| vertical_shooting | supported | OFFICIAL_VERIFIED |
| gimbal_weight | approx.1193g including upper/lower quick-release plates and screws | OFFICIAL_VERIFIED |
| interfaces | RSA/NATO、1/4"-20、cold shoe、Camera Control USB-C、multifunction USB-C | OFFICIAL_VERIFIED |

关系：
- Upper/Lower Quick-Release Plate 建立为 CameraSupport QuickReleaseComponent，可被 Tripod/Support 知识复用。
- Electronic Briefcase Handle、Enhanced Intelligent Tracking Module、Focus Pro 等只在 DJI 官方 Support/Compatibility 中明确时建立 `SUPPORTS`。
- Camera/Lens 兼容性不从3kg payload推导，必须使用 SRC-DJI-COMPAT 的型号级 assertion。

### 6.2 跟焦 → DJI → Focus Pro各独立组件

组件独立建模：

| 样例ID | 所属大类及组件 | 原稿参数候选（待逐字段位置复核） |
| --- | --- | --- |
| DJI-FOCUSPRO-LIDAR | 跟焦 → DJI → Focus Pro激光测距组件（LiDAR） | human-subject focus distance up to 20m；70° FOV；76,800 ranging points；30Hz |
| DJI-FOCUSPRO-MOTOR | 跟焦 → DJI → Focus Pro电机（Motor） | component identity verified；完整motor specs待官方module docs导入 |
| DJI-FOCUSPRO-GRIP | 跟焦 → DJI → Focus Pro手柄（Grip） | powers LiDAR + Motor approx.2.5h under DJI condition；supports lens calibration/workflow |
| DJI-FOCUSPRO-HANDUNIT | 跟焦 → DJI → Focus Pro手轮（Hand Unit） | component identity verified；详细range/control specs待module docs导入 |

Focus Pro 是四模块体系，不把“Focus Pro”本身当一个单体设备吞掉组件。Camera/Lens support 使用 DJI 官方兼容数据；镜头标定数据和“支持该镜头”不能反向推断镜头机械卡口兼容。

### 6.3 视频传输 / 监看 → DJI → Transmission各独立组件

独立对象：

| 样例ID | 所属大类及对象 | 原稿参数候选（待逐字段位置复核） |
| --- | --- | --- |
| DJI-TX-VIDEO | 视频传输 → DJI → Video Transmitter（发射器） | ~350g；127×87×26mm excl. antennas；40MHz max bandwidth；40Mbps max bitrate；11W；6–18V |
| DJI-RX-VIDEO | 视频传输 → DJI → Video Receiver（接收器） | ~350g；127×87×26mm excl. antennas；40Mbps system；9W；6–18V |
| DJI-HB-MONITOR | 监看 → DJI → High-Bright Remote Monitor（高亮监看屏） | ~727g；integrated receiver/monitor/control/recording role |
| DJI-TRANSMISSION-STANDARD-COMBO | 器材套装 → DJI → Transmission Standard Combo（标准套装） | bundle = Video Transmitter + Video Receiver |
| DJI-TRANSMISSION-HB-COMBO | 器材套装 → DJI → Transmission High-Bright Monitor Combo（高亮套装） | bundle = Video Transmitter + High-Bright Remote Monitor |

系统：O3 Pro。Combo 只是 Bundle，不拥有独立传输能力。

### 6.4 视频传输 → DJI → SDR Transmission各独立组件

| 样例ID | 所属大类及对象 | 接口与参数候选（待逐字段位置复核） |
| --- | --- | --- |
| DJI-SDR-TX | 视频传输 → DJI → SDR Transmitter（发射器） | ~145g；86.5×64×32mm；SDI in、HDMI in、3.5mm stereo、USB-C firmware、USB-C power/gimbal comm；H.264；SDR+Wi-Fi；20Mbps SDR max；8.2W |
| DJI-SDR-RX | 视频传输 → DJI → SDR Receiver（接收器） | ~145g；86.5×64×32mm；SDI out、HDMI out、3.5mm stereo、USB-C firmware/video out、USB-C power；H.264；20Mbps；8.3W |
| DJI-SDR-COMBO | 器材套装 → DJI → SDR Combo | bundle of TX + RX；不是能力owner |

SDR latency 记录为带条件规格：80ms including camera/display or 35ms excluding under DJI stated 1080p60/control test；不能当任意系统固定延迟。最大距离同样带地区/模式条件。

## 7. 灯具 → Nanlite → 各型号

### 7.1 Forza 200（旧款）

| Field | Value | Status |
| --- | --- | --- |
| seed_id | LIGHT-NANLITE-FORZA200 | — |
| category | DAYLIGHT_LED_SPOTLIGHT | FRAMEFORGE_CLASSIFICATION |
| rated_power | 200W | OFFICIAL_VERIFIED |
| CCT | 5600K | OFFICIAL_VERIFIED |
| CRI | 98 | OFFICIAL_VERIFIED |
| TLCI | 97 | OFFICIAL_VERIFIED |
| native_modifier_mount | Bowens-style | OFFICIAL_VERIFIED |
| illuminance | 37,540 lux @1m with 55° reflector | OFFICIAL_VERIFIED |
| luminous_flux | 21,460 lm | OFFICIAL_VERIFIED |
| head_weight | approx.4lb | OFFICIAL_VERIFIED |
| power | 48V DC；battery support present | OFFICIAL_PARTIAL |
| yoke_support | 5/8" receiver + umbrella | OFFICIAL_VERIFIED |

旧款来源需在实际导入前固定 Nanlite 官方归档 URL；当前条目不从二手零售页补缺失值。

### 7.2 Forza 300B（旧款）

原稿录入以下旧款历史线索，但未给出可定位的官方来源。本轮降为待核验候选；在取得旧款资料前，不参与官方规格查询和兼容判断：

- 旧款Forza 300B与Forza 300B II为不同型号；
- 独立控制箱及可拆交流电源；
- 旧300系列电池模式使用两块14.8V电池；
- 旧款USB端口不向附件供电；
- 随附反光罩、5600K、1米照度39,180lx。

以下字段保持 `UNKNOWN` 直到取得对应旧款官方 manual/archive：完整CCT范围、额定功率、原生modifier mount、完整控制协议、重量/尺寸。**禁止拿 Forza 300B II 的字段回填旧款。**

### 7.3 FC-120B

| Field | Value | Status |
| --- | --- | --- |
| seed_id | LIGHT-NANLITE-FC120B | — |
| rated_power | 145W | OFFICIAL_VERIFIED |
| CCT | 2700–6500K | OFFICIAL_VERIFIED |
| CRI / TLCI | 96 / 98 | OFFICIAL_VERIFIED |
| SSI 3200 / 5600 | 82 / 74 | OFFICIAL_VERIFIED |
| TM-30 Rf / Rg | 95 / 101 | OFFICIAL_VERIFIED |
| beam_angle | 120° bare | OFFICIAL_VERIFIED |
| dimming | 0–100% | OFFICIAL_VERIFIED |
| native_modifier_mount | Nanlite FM Mount | OFFICIAL_VERIFIED |
| included_adapter | AS-BA-FMM Bowens Mount Adapter | OFFICIAL_VERIFIED |
| control | onboard、Bluetooth/NANLINK、DMX/RDM、2.4G | OFFICIAL_VERIFIED |
| dimensions | 19.12×11.5×19.31cm | OFFICIAL_VERIFIED |
| weight | 0.98kg | OFFICIAL_VERIFIED |
| output_with_reflector | 17,450 lux @1m 5600K | OFFICIAL_VERIFIED |

CompatibilityPath：
`FC-120B → FM Mount → AS-BA-FMM → Bowens modifier`。
Bowens **不是** FC-120B 原生卡口。

已确认官方 FM accessory seed 至少加入：
- FL-11 Fresnel；
- PJ-FMM-18-36 Projection Attachment；
- PJ-FMM 19° Projection Attachment；
其 relation 都从 FM Mount 推导，并保存型号级官方 support assertion。

### 7.4 FC-300B

当前已确认（主规格字段以 SRC-NANLITE-FC300B / FC Series 官方页面为来源，FC PowerController关系另用 SRC-NANLITE-FC-PC）：

| Field | Value | Status |
| --- | --- | --- |
| seed_id | LIGHT-NANLITE-FC300B | — |
| category | BI_COLOR_LED_SPOTLIGHT | FRAMEFORGE_CLASSIFICATION |
| rated_power | 350W | OFFICIAL_VERIFIED |
| CCT | 2700–6500K | OFFICIAL_VERIFIED |
| CRI / TLCI | 96 / 98 | OFFICIAL_VERIFIED |
| TM-30 | Rf≈95 / Rg≈100–101 according to official page context | OFFICIAL_PARTIAL |
| dimming | 0–100% | OFFICIAL_VERIFIED |
| native_modifier_mount | Bowens | OFFICIAL_VERIFIED |
| control | Bluetooth/NANLINK、2.4G、locking 3.5mm DMX/RDM | OFFICIAL_VERIFIED |
| included_reflector | 45° | OFFICIAL_VERIFIED |
| output_with_reflector | 37,340 lux @1m 5600K | OFFICIAL_VERIFIED |
| bare_output | 11,210 lux @1m 5600K | OFFICIAL_VERIFIED |

官方配套关系：
- FC PowerController → supports FC-300B / FC-500B / FC-500C；
- PowerController supports 14.4–14.8V and 26V V-Mount batteries and can charge attached compatible batteries；
- Bowens modifier ecosystem 通过原生 Bowens interface 关联，具体附件仍需型号级 support assertion。

### 7.5 PavoTube II 15C

| Field | Value | Status |
| --- | --- | --- |
| seed_id | LIGHT-NANLITE-PAVOTUBE-II-15C | — |
| LED | RGBWW | OFFICIAL_VERIFIED |
| rated_power | 30W | OFFICIAL_VERIFIED |
| CCT | 2700–7500K | OFFICIAL_VERIFIED |
| G/M | ±150 | OFFICIAL_VERIFIED |
| CRI / TLCI | 97 / 98 | OFFICIAL_VERIFIED |
| SSI 3200 / 5600 | 81 / 73 | OFFICIAL_VERIFIED |
| TM-30 Rf / Rg | 94 / 101 | OFFICIAL_VERIFIED |
| dimming | 0–100% | OFFICIAL_VERIFIED |
| battery | built-in 2200mAh | OFFICIAL_VERIFIED |
| runtime_100 | 2h07m | OFFICIAL_VERIFIED |
| power | AC barrel + USB-C PD3.0 | OFFICIAL_VERIFIED |
| control | onboard、Bluetooth/NANLINK、wired DMX/RDM、2.4G | OFFICIAL_VERIFIED |
| dimensions | Ø4.8cm × 77cm | OFFICIAL_VERIFIED |
| weight | 0.85kg | OFFICIAL_VERIFIED |

T12 mounting clip、safety wire等作为 SupportAccessory，不把它们写成灯具规格。

## 8. 灯具 → Aputure → STORM 1200x

| Field | Value | Status |
| --- | --- | --- |
| seed_id | LIGHT-APUTURE-STORM1200X | — |
| LED engine | BLAIR | OFFICIAL_VERIFIED |
| CCT | 2500–10000K | OFFICIAL_VERIFIED |
| G/M | ±G100% | OFFICIAL_VERIFIED |
| max_output | 1200W | OFFICIAL_VERIFIED |
| max_power_consumption | 1550W | OFFICIAL_VERIFIED（当前产品页） |
| CRI | ≥95 @3000K | OFFICIAL_VERIFIED |
| TLCI | ≥95 @3200K | OFFICIAL_VERIFIED |
| SSI tungsten / D56 | 87 / 87 | OFFICIAL_VERIFIED |
| TM-30 Rf / Rg | 95 / 100 | OFFICIAL_VERIFIED |
| native_modifier_mount | ProLock locking Bowens | OFFICIAL_VERIFIED |
| included_reflector | 45° | OFFICIAL_VERIFIED |
| data_ports | 5-pin DMX In、5-pin DMX Out、2×LAN | OFFICIAL_VERIFIED |
| control | onboard、Sidus Link、DMX/RDM、CRMX、sACN、Art-Net | OFFICIAL_VERIFIED |
| environment | IP65 | OFFICIAL_VERIFIED |

官方 Spotlight MAX、Fresnel、Bowens modifiers 等配套在各自官方页面确认型号支持后作为 AccessoryModel / CompatibilityRelation 导入，不用“Bowens就一定全兼容”代替型号断言。

## 9. 滤镜 → Tiffen → 4×5.65柔光产品

### 9.1 黑柔（Black Pro-Mist）

- family_id: FILTER-TIFFEN-BLACK-PROMIST-4565
- form_factor: 4×5.650"
- 当前官方产品页直接可验证的 Density Variant：`1/8、1/4、1/2、1、2`。
- product effect description 属于 KnowledgeRevision；Density 是 EquipmentVariant/SpecificationValue，不建立“Black Pro-Mist→1/8→效果”多层知识树。

### 9.2 柔光（Pro-Mist）

- family_id: FILTER-TIFFEN-PROMIST-4565
- form_factor: 4×5.650"
- 首批只发布当前官方页面/catalog已核验的 Density Variant；未取得完整官方产品变体枚举前，不把第三方列表补成“全部官方档位”。

用户目标仍是**最终录全当前官方4×5.65 Density**。因此该两组 seed 的 completeness 状态暂为 `OFFICIAL_PARTIAL`；实施导入前必须再次枚举官方SKU，只有完成SKU核对才可切 `COMPLETE`。

## 10. 摄影支撑与灯光支撑：分别维护接口资料

这些先作为 Category / Interface / Topic seed，不虚构型号：

| Seed ID | Canonical object | Domain |
| --- | --- | --- |
| GEN-SUPPORT-TRIPOD | Tripod | D.CameraSupport |
| GEN-SUPPORT-FLUIDHEAD | Fluid Head | D.CameraSupport |
| GEN-SUPPORT-QUICKRELEASE | Quick Release Plate/System | D.CameraSupport |
| GEN-SUPPORT-CAMERAPLATE | Camera Plate | D.CameraSupport |
| GEN-SUPPORT-NATO | NATO Rail / Clamp interface | D.CameraSupport |
| GEN-SUPPORT-RSA | DJI RSA interface family | D.CameraSupport |
| GEN-SUPPORT-1-4-20 | 1/4"-20 threaded support interface | D.CameraSupport |
| GEN-SUPPORT-3-8-16 | 3/8"-16 threaded support interface | D.CameraSupport |
| GEN-LIGHT-LIGHTSTAND | Light Stand | D.LightingSupport |
| GEN-LIGHT-CSTAND | C-Stand | D.LightingSupport |
| GEN-LIGHT-BOOM | Lighting Boom / 三节摇类 | D.LightingSupport |

Baby Pin / Junior Receiver 等只有取得稳定官方/标准定义后再固定 InterfaceDefinition，不依赖俗称猜尺寸。

## 11. 软件大类 → 具体产品 → 制作能力资料

SupportLevel 是 FrameForge 对官方公开功能范围的分类，因此状态为 `FRAMEFORGE_CLASSIFICATION`，不是软件厂商声称的评级。

| Product | Capability | Level | Official evidence scope |
| --- | --- | --- | --- |
| Blender | THREE_D_MODELING | PRIMARY | official Modeling feature |
| Blender | SCULPTING | PRIMARY | official Sculpting feature |
| Blender | RIGGING | PRIMARY | official Animation & Rigging |
| Blender | THREE_D_ANIMATION | PRIMARY | official Animation & Rigging |
| Blender | SIMULATION | PRIMARY | official Simulation |
| Blender | RENDERING | PRIMARY | official rendering suite |
| Blender | COMPOSITING | SUPPORTED | official VFX/compositing |
| Blender | EDITING | SUPPORTED | official Video Sequencer / complete video editing system |
| Blender | PIPELINE_AUTOMATION | SUPPORTED | official Python API / pipeline integration |
| Unreal Engine 5 | REALTIME_PRODUCTION | PRIMARY | official realtime engine scope |
| Unreal Engine 5 | VIRTUAL_PRODUCTION | PRIMARY | official Virtual Production feature area |
| Unreal Engine 5 | RENDERING | PRIMARY | official rendering/lighting/materials |
| Unreal Engine 5 | LIGHTING | PRIMARY | official rendering/lighting/materials |
| Unreal Engine 5 | THREE_D_ANIMATION | SUPPORTED | official characters and animation |
| Unreal Engine 5 | SIMULATION | SUPPORTED | official simulation and effects |
| Unreal Engine 5 | PIPELINE_AUTOMATION | SUPPORTED | official pipeline integration / developer tools |
| Adobe After Effects | MOTION_GRAPHICS | PRIMARY | official product positioning/features |
| Adobe After Effects | COMPOSITING | PRIMARY | official compositing feature |
| Adobe After Effects | TWO_D_ANIMATION | PRIMARY | official 2D animation feature set |
| Adobe After Effects | THREE_D_ANIMATION | LIMITED | 3D workspace/models/shapes exist, but not classified as full 3D DCC |
| Adobe After Effects | COLOR | SUPPORTED | official color correction/LUT tools |

没有官方证据的 Capability 不自动补成 `NOT_SUPPORTED`。特别是 Blender 的 EDITING 明确为 SUPPORTED，不能因其是3D DCC而否定。

## 12. 格式参考 → 格式类别 → 定义样例

首批只固定 canonical identity、类别和最基本的知识关系；codec profile、bit-depth、chroma、license、container restrictions 等精细字段需各自官方/标准来源后再填。

| Format ID | Canonical | Kind | Initial domain relations |
| --- | --- | --- | --- |
| FMT-MOV | QuickTime Movie / MOV | CONTAINER | D/H PRODUCES/CONSUMES |
| FMT-MP4 | MP4 | CONTAINER | D/H PRODUCES/CONSUMES |
| FMT-MXF | MXF | CONTAINER | D/H PRODUCES/CONSUMES |
| FMT-R3D | REDCODE RAW / R3D | CAMERA_RAW | RED Camera PRODUCES；H CONSUMES |
| FMT-BRAW | Blackmagic RAW | CAMERA_RAW | Camera/Post reference |
| FMT-ARRIRAW | ARRIRAW | CAMERA_RAW | Camera/Post reference |
| FMT-CINEMADNG | CinemaDNG | CAMERA_RAW / IMAGE_SEQUENCE_FAMILY | Camera/Post reference |
| FMT-PRORES | Apple ProRes family | CODEC / INTERMEDIATE | D/F/G/H |
| FMT-DNXHR | Avid DNxHR family | CODEC / INTERMEDIATE | F/G/H |
| FMT-H264 | H.264 / AVC | CODEC | D/H/Transmission |
| FMT-H265 | H.265 / HEVC | CODEC | D/H |
| FMT-EXR | OpenEXR | IMAGE_SEQUENCE / STILL | G PRODUCES；F/H CONSUMES |
| FMT-DPX | DPX | IMAGE_SEQUENCE / STILL | F/G/H |
| FMT-TIFF | TIFF | STILL / IMAGE_SEQUENCE | C/F/G/H |
| FMT-PNG | PNG | STILL / IMAGE_SEQUENCE | C/F/G/H |
| FMT-JPEG | JPEG | STILL | C/D/H |
| FMT-WAV | WAV | AUDIO_CONTAINER | D/H |
| FMT-SRT | SubRip / SRT | SUBTITLE | H |
| FMT-OTIO | OpenTimelineIO | EDITORIAL_INTERCHANGE | H IMPORTS/EXPORTS |
| FMT-EDL | Edit Decision List | EDITORIAL_INTERCHANGE | H IMPORTS/EXPORTS |
| FMT-XML | XML-based editorial interchange | EDITORIAL_INTERCHANGE_FAMILY | H IMPORTS/EXPORTS |

“XML”不是单一剪辑交换标准，必须由后续子定义区分具体 dialect；本 seed 不把所有 XML 工程格式错误合并成互相兼容。

## 13. 待补资料清单

下列内容已经有 identity，但还不能声称“官方数据完整”：

1. old Forza 300B：需官方旧款 manual/archive 补全 CCT、rated power、mount、control、weight/dimensions；
2. Tiffen 4×5.65 Pro-Mist / Black Pro-Mist：需按当前官方SKU完整枚举所有 Density 后才能标 COMPLETE；
3. DJI Focus Pro Motor/Hand Unit：需将 module-specific official specs继续结构化；
4. DJI RS 5 compatibility：具体 Camera/Lens/Control support 应从官方 Compatibility Search 导入，不手抄静态小样；
5. DJI Mavic 4 Pro：各内置模组的完整 recording-mode / ISO / shutter / codec/color matrix仍需官方详细规格页；
6. Osmo Pocket 4P：完整双模组 recording-mode / ISO / shutter / codec/color matrix仍需官方详细规格页；
7. Aputure/Nanlite accessory ecosystem：只有官方产品页明确 support 的具体附件才可建立型号级 relation；
8. FormatDefinition：精细标准字段需逐格式官方/标准来源补齐。

这些 backlog 是 `UNKNOWN / OFFICIAL_PARTIAL`，不阻止已经核验字段成为首批 Seed。

## 14. 导入验收

实际 Seed importer / database 建成后至少验证：

- 每个 seed_id 唯一；
- `OFFICIAL_VERIFIED` 字段都能回到 SourceReference；
- UNKNOWN 不会显示为0/false/默认值；
- KOMODO不同SensorRecordingMode切换后有效成像区域同步改变FOV计算输入；
- CP.3 10支镜头和各官方AoV完整可查询；
- Pocket 4P只能选择两个官方内置模组，不能外换镜头；
- Mavic 4 Pro只能选择三个内置模组，不能外换镜头；
- FC-120B原生FM Mount，通过官方AS-BA-FMM才进入Bowens兼容路径；
- RS 5具体Camera/Lens支持由官方型号级兼容断言覆盖通用payload/接口推导；
- DJI Transmission/SDR的TX/RX/Monitor/Bundle身份不混；
- 软件能力不会从“软件类别”自动推断；
- Tiffen未完成官方SKU枚举前不能标COMPLETE；
- 人工EquipmentNote不能覆盖任何OFFICIAL SpecificationValue。

## 15. 配件真实数据：所属大类、型号与适用范围

### 15.1 光学附件 → DJI → Osmo Pocket 4P Wide-Angle Lens（专用增广镜）

| 字段 | 值 | 出处 |
| --- | --- | --- |
| 配件ID与型号 | ACC-DJI-POCKET4P-WIDE；Osmo Pocket 4P Wide-Angle Lens，黑色变体 | SRC-DJI-POCKET4P-WIDE标题 |
| 所属大类与宿主范围 | 光学附件 → DJI → 该增广镜；专用宿主为摄影机 → DJI → Osmo Pocket 4P | Compatibility栏目，已核验宿主名单 |
| combined_optical_specification 组合视场 | 108°；水平/垂直/对角方向未说明 | Overview栏目，已核验数值；方向未知 |
| dimensions_mm 尺寸 | 45.07×30.09×7.40mm，长×宽×高 | Specifications栏目 |
| weight_g 重量 | 5.77g | Specifications栏目 |
| attachment_site / 叠加条件 | 具体模组、与其他滤镜同时安装的条件待核实 | 不能把整机适配推给所有模组 |

来源：[DJI官方增广镜页](https://store.dji.com/uk/product/osmo-pocket-4p-wide-angle-lens?from=site-nav&set_region=GB&vid=241671)，2026-10-05访问。108°是该宿主组合说明，不是附件独立镜头参数。

明确连接：光学附件 → DJI → 4P增广镜 → COMPATIBLE_WITH（限整机声明）→ 摄影机 → DJI → Osmo Pocket 4P。镜头 → ZEISS → CP.3不在这条官方宿主名单中，不能在其可用配件里列入该增广镜，也不伪造转接路径；分类相似不是证据。未列型号标未核实，不能凭空宣称物理绝不可能。

### 15.2 遮光斗 → ARRI → LMB 4x5；滤镜托盘 → ARRI → LMB F4；连接环 → ARRI → 95mm夹持环

这些是安装资料样例，不是项目必须选用的产品。产品配置、组件型号和条件均独立维护。

| 所属大类及型号 | 身份或参数 | 栏目位置与状态 |
| --- | --- | --- |
| 遮光斗 → ARRI → LMB 4x5 | 夹持式、15mm轻型、15/19mm摄影棚支撑选项 | SRC-ARRI-LMB45第1页，已核验这些配置选项，不表示单一套装同时含全部 |
| 遮光斗 → ARRI → LMB 4x5 | 配置图列最多三片4×5.65或4×4滤镜 | 同页technical data，仅此配置图范围；扩展配置另查 |
| 滤镜托盘 → ARRI → LMB F4 Filter Frame | 货号K2.0021499；4×5.65/4×4 | SRC-ARRI-F4，F4栏目，已核验 |
| 镜头连接环 → ARRI → LMB 4x5 Clamp Adapter 95mm | 货号K2.0014439；镜头端标称95mm | SRC-ARRI-LMB45第1页95mm条目，已核验 |

已核验连接：滤镜托盘 → ARRI → LMB F4 K2.0021499，可用于遮光斗 → ARRI → LMB 4x5，证据为F4栏目；镜头连接环 → ARRI → K2.0014439，属于遮光斗 → ARRI → LMB 4x5对应夹持环，证据为配置图。两条连接端点各有类别，不推广到其他架和遮光斗。

### 15.3 黑柔滤镜安装到镜头前端的候选结构

| 顺序 | 所属大类 → 品牌 → 具体资料 | 现有证据 | 仍需核实 |
| --- | --- | --- | --- |
| 滤镜片 | 滤镜 → Tiffen → Black Pro-Mist 4×5.65，具体密度变体 | 第9节产品页支持产品身份和片幅 | 该货号实际厚度、尺寸公差及叠片条件 |
| 承载 | 滤镜托盘 → ARRI → LMB F4 K2.0021499 | 官方标称支持4×5.65 | 具体滤镜片与框的厚度/间隙是否满足 |
| 遮光与固定 | 遮光斗 → ARRI → LMB 4x5，选定配置 | 上述框对该遮光斗的官方关系 | 实际槽位、与其他组件空间 |
| 连接环 | 镜头连接环 → ARRI → K2.0014439 95mm | 对该遮光斗的官方95mm环 | 镜头具体焦段、变体和夹持位置限制 |
| 镜头端 | 镜头 → ZEISS → CP.3具体焦段和卡口变体 | 第4节保留95mm前口径资料候选 | 官方字段位置、广角遮挡、承载间隙与完整配置证据 |

这是现实安装结构的待核验候选，不是已证明完整兼容链。没有单独的滤镜架不必硬加一层；如产品实际使用独立架，则登记该型号。95mm前口径不等于95mm滤镜螺纹；黑柔不能直接拧到镜头前端。配置图明确提示夹持环可能遮挡，完整组合须保留该条件，不静默判成通过。

托盘、遮光斗、连接环都是实际组件，不能藏入备注。完整配置可记录更长现实路径，但未经官方或用户确认的特殊路径不进入默认自动推荐；默认最多两个中间组件。该候选尚不满足例外准入。

## 16. 字段归属、专业入口及补齐核对

旧表是阅读样例，导入实现必须按下表映射归属对象和规格定义；不把全部值直接写进EquipmentModel主表。逐字段来源未补齐不导入为已核验。

| 样例字段 | 所属大类与真实对象 | 字段合同归属 | 来源位置要求 | 岗位专业入口 |
| --- | --- | --- | --- | --- |
| KOMODO尺寸、重量、原生接口 | 摄影机 → RED → KOMODO型号 | 整机参数及接口连接 | 型号规格行及是否含附件的条件 | D摄影 / DIT |
| KOMODO传感器尺寸、像素、快门 | 摄影机 → RED → KOMODO引用的传感器 | SensorDefinition，合同4.1 | 对应手册传感器栏目 | D摄影 / G相机匹配 |
| KOMODO模式有效区域、最大帧率 | 摄影机 → RED → KOMODO各模式 | SensorRecordingMode，合同4.2 | 模式名、版本、表格行；多版手册混用待核验 | D摄影 / DIT / H后期 |
| CP.3焦距、光圈、近摄、前径、视角 | 镜头 → ZEISS → 每支CP.3及卡口变体 | LensModel/LensVariant及官方视角表，合同4.3 | 每焦段表行、卡口、近摄基准、画幅与方向 | D摄影 / 跟焦；B分镜引用光学概念 |
| 4P传感器名、20/60等效焦距、2.0/1.8光圈 | 摄影机 → DJI → 4P两个内置模组 | 模组光学与传感器资料，合同4.1/4.3 | 产品页影像实力及镜头行 | D摄影 |
| 4P的103GB、210分钟 | 摄影机 → DJI → 4P整机 | 整机存储及条件化续航，合同4.1 | 官方存储/续航问答及测试条件 | D摄影 / 媒体 |
| 灯具输出、耗电、照度、色彩 | 灯具 → 对应厂商 → 每一型号 | 合同4.4；照度逐测试行 | 色温、距离、功率设置、附件和资料版本 | D灯光 / 供电 |
| 负载、端口、延时、控制 | 稳定器 / 视频传输 / 监看各自大类与型号 | 合同4.5；不混成品牌能力表 | 配置、端口方向、功能及测试条件 | D移动摄影 / 现场数据 |
| 滤镜密度、片幅、厚度 | 滤镜 → Tiffen → 具体型号及货号 | 滤镜资料与变体；合同4.5/4.6 | 每个官方货号，不以部分枚举称全量 | D摄影 / B/C视觉意图 |
| 托盘、遮光斗、连接环 | 各自大类 → ARRI → 对应型号 | 合同4.6及5适用范围 | 货号、配置图或兼容栏目 | D摄影支撑 |
| 软件能力 / 格式方向 | 软件 → 产品与版本；格式参考 → 对应定义 | 独立能力支持关系 | 官方功能范围、版本和输入输出条件 | F/G/H各阶段 |

岗位关联只是专业知识的用途，不是人员授权或Task实例；每个知识端点仍保留所属大类，不从专业之间的协同推断具体器材兼容。

### 16.1 原稿字段名与规范字段的转换

| 原稿字段 | 规范字段与归属 | 转换要求 |
| --- | --- | --- |
| dynamic_range：文字含档数 | dynamic_range_stops，模组/模式条件化规格 | 提取数值与大于/下限语义，保存测试条件，不能丢掉“+” |
| native_lens_mount | lens_mount_interface_id，型号或变体的原生接口连接 | 名称解析到摄影专业接口身份；未知转接能力不一起写入 |
| max_data_rate：MB/s | max_data_rate_bytes_s，录制能力及条件 | 核实单位十进制/二进制和上限条件，再换算；未核实标单位待核对 |
| effective_pixels：宽×高 | 有效像素与读取尺寸各自结构化值 | 不把像素矩阵当毫米面积，也不把输出模式等同整颗传感器 |
| aperture / iris range | f_number_min/max或t_stop_min/max，模组/镜头光学 | 按官方原始F/T含义分别解析，不互换；随焦距变化独立表 |
| close focus / focus_range | minimum_focus_distance_m / focus_range_m及focus_reference | 单位规范化，测量基准未知保持未知 |
| Front Ø | front_diameter_mm，具体镜头变体 | 前径不是滤镜螺纹；filter_thread_mm另核实 |
| tested_payload / gimbal_weight | tested_payload_kg / weight_g，具体稳定器实体 | 带测试配置、含板/螺丝等重量条件，不继承到整套配置 |
| interfaces：合并字符串 | port_links，逐端口方向、协议及功能 | 不能因一个USB-C词就赋予视频/控制/供电全部能力 |
| light wattage / illuminance | rated_output_w、max_power_consumption_w、photometric_measurements | 输出与耗电分开；照度逐距离/色温/附件保存，不采孤立最高值 |
| filter density | density_variant及effect_type，具体滤镜变体 | 柔光密度不转换成中性减光档数；货号和片幅独立 |
| support：supported等文字 | 独立function_support / format_support_links | 先定功能、方向、对象、版本及条件；未知不解析成false |

本表是下一代样例录入规则，不是旧用户工程或旧数据库迁移方案。缺少来源位置或成立条件的原稿字段进入待核验区，不能只改字段名就当作正式数据导入。

补齐门槛：内置模组完整模式矩阵、旧款灯具来源、各配件宿主与功能矩阵、全部滤镜密度货号、具体变体视角与重量条件、软件版本格式方向均逐项登记。当前仅4P本节字段、专用增广镜字段及ARRI样例的明确组件关系在本轮重新核对；其余原稿数据保持待逐字段复核，不以本轮分类审计代替器材事实验收。
## 17. 首批真实型号与软件资料的补齐范围

本节从类别规划移入，保留原已确认范围，不代表所有数值或配对已核实。每个条目按所属大类进入；未取得证据的项目仍为待补。

### 17.1 器材真实型号范围

原则：实施时必须重新读取官方页面/手册并尽可能全量写入该对象类别可表达的官方参数、接口、附件和兼容关系。本文只固定对象范围和已核实的关键身份，避免规划文档变成过期的手抄规格表。

#### 17.1.1 摄影机 → RED

##### RED KOMODO 6K（仅原版）

Seed 至少包括：

- KOMODO 6K body；
- Super 35 global-shutter sensor；
- active sensor size / recording modes；
- RF mount；
- R3D / ProRes recording capability；
- RED/Canon 官方明确兼容的 RF→PL、RF→EF 等 adapter relation；
- 对 adapter 的电子通信/metadata 等能力按官方资料分别保存；
- RED 官方 KOMODO accessory relation。

官方 seed source：
- https://www.red.com/komodo
- https://www.red.com/komodo-brain-parent
- https://docs.red.com/955-0196/955-0196_V1.7%20Rev-B%20RED%20PS%2C%20KOMODO%20Operation%20Guide%20HTML/Content/A_TechSpecs/Specs_KOMODO_6K.htm

不顺带建立 KOMODO-X。

#### 17.1.2 镜头 → ZEISS → Compact Prime CP.3

完整官方焦段系列建立独立 LensModel：

- 15mm T2.9；
- 18mm T2.9；
- 21mm T2.9；
- 25mm T2.1；
- 28mm T2.1；
- 35mm T2.1；
- 50mm T2.1；
- 85mm T2.1；
- 100mm T2.1 CF；
- 135mm T2.1。

每支镜头保存官方 Close Focus、Length、Front Diameter、Weight，以及 ZEISS 提供的 Full Frame / APS-H / Super 35 / Normal 35 / APS-C / MFT Horizontal Angle of View。Mount Variant 从 ZEISS 官方 mount-change 文档建立，不按名称猜。

官方 seed source：
- https://www.zeiss.com/content/dam/consumer-products/downloads/cinematography/brochures/en/brochure-zeiss-compact-prime-cp3-lenses.pdf

#### 17.1.3 摄影机 → DJI → Osmo Pocket 4P

一个 ImagingDevice + 两个可切换 EmbeddedImagingModule，镜头均固定在设备内部：

- 广角模组：官方1英寸CMOS、20mm等效、F2.0；对焦范围待详细规格核验；
- 中长焦模组：官方1/1.28英寸CMOS、60mm等效、F1.8；对焦范围待详细规格核验；
- 两个内置镜头都不出现在独立 Lens Picker；
- 切换内置模组时 Sensor、Focal、Aperture、FOV/recording capability 与相关附件能力同步变化；
- 完整 ISO / shutter / codec / recording-mode matrix 只从 DJI 官方详细规格继续补，不根据旧 Pocket 型号推断。

官方 seed source：
- https://store.dji.com/cn/product/osmo-pocket-4p?set_region=CN
- https://store.dji.com/ca/event/dji-osmo-pocket-series

#### 17.1.4 摄影机 → DJI → Mavic 4 Pro

一个 ImagingDevice，建立三个可选择 EmbeddedImagingModule。每个模组分别保存官方 Sensor、Lens/Focal、Aperture、FOV/recording capability、codec/color capability 和支持的拍摄模式。机型本身不拆成三个 EquipmentModel。

官方 seed source：
- https://www.dji.com/mavic-4-pro/specs

#### 17.1.5 稳定器 → DJI → RS 5

Seed 至少包括：

- 云台主体（gimbal body）；
- 上下快拆板（quick-release plate）；
- 快开三脚支撑（quick-open tripod）；
- RSA/NATO；
- 1/4"-20；
- 冷靴（cold shoe）；
- USB-C camera control / multifunction；
- 官方测试承重及条件（payload）；
- 电子提壶手柄（Electronic Briefcase Handle）；
- 增强智能追踪组件（Enhanced Intelligent Tracking Module）；
- Focus Pro / motor / transmission 等官方 support relations；
- DJI Camera & Lens Compatibility 的 model-level assertions。

Camera/Lens compatibility 以 DJI 官方 Compatibility Search 为 override，不只靠 payload 推断。

官方 seed source：
- https://www.dji.com/rs-5/specs
- https://www.dji.com/support/compatibility

#### 17.1.6 跟焦 → DJI → Focus Pro

建立独立组件：

- Focus Pro激光测距组件（LiDAR）；
- Focus Pro手柄（Grip）；
- Focus Pro手轮（Hand Unit）；
- Focus Pro电机（Motor）；
- 官方 Combo / AMF system bundle；
- cables / mounts / accessory relations；
- Camera/Lens support assertions。

官方 seed source：
- https://www.dji.com/focus-pro
- https://www.dji.com/focus-pro/downloads

#### 17.1.7 视频传输、监看各自大类 → DJI → Transmission各组件

建立：

- DJI视频发射器（Video Transmitter）；
- DJI视频接收器（Video Receiver）；
- DJI高亮遥控监看屏（High-Bright Remote Monitor）；
- 标准套装（Standard Combo）；
- 高亮监看套装（High-Bright Monitor Combo）；
- WB37 / cable hub / official accessory support。

Combo 是 bundle，不是能力 owner。

官方 seed source：
- https://www.dji.com/transmission
- https://www.dji.com/transmission/downloads

#### 17.1.8 视频传输 → DJI → SDR Transmission

建立：

- SDR发射器（Transmitter）；
- SDR接收器（Receiver）；
- 官方套装（Combo）；
- SDI / HDMI / USB-C / audio / power interfaces；
- Camera compatibility / Ronin support / adapter support。

官方 seed source：
- https://www.dji.com/sdr-transmission/specs
- https://www.dji.com/downloads/products/sdr-transmission

#### 17.1.9 灯具 → Nanlite → 各指定型号

首批具体 EquipmentModel：

- Forza 200（旧款）；
- Forza 300B（旧款）；
- FC-120B；
- FC-300B；
- PavoTube II 15C。

同时录入这些型号官方配套：

- native modifier mount；
- Bowens adapter（如官方提供）；
- reflector / Fresnel / softbox / projection attachment；
- battery/power accessory；
- DMX/RDM / NANLINK 等控制 interface；
- stands/clamps/cases 只在官方明确兼容时建立 support relation。

FC-120B 以官方资料建立：原生 FM Mount，Bowens adapter 为明确中间件；不能把 Bowens 当成 FC-120B 原生 mount。

官方 seed source：
- https://www.nanlite.com/product-forza-200
- Nanlite/Nanlite US Forza 500/300/200 legacy collection / archived official product material
- https://nanliteus.com/products/fc-120b-bi-color-led-spotlight-testing-1
- https://nanliteus.com/brands/FC-Series.html
- https://nanliteus.com/collections/pavotube-ii-c

#### 17.1.10 灯具 → Aputure → STORM 1200x

首批：

- STORM 1200x；
- ProLock Bowens / Bowens modifier interface；
- reflector / Fresnel / projection / softbox 等官方兼容附件；
- power/control interfaces；
- DMX / CRMX / Art-Net / sACN 等官方控制能力；
- official support/accessory relations。

官方 seed source：
- https://aputure.com/en-US/products/storm-1200x

#### 17.1.11 滤镜 → Tiffen → 两类指定柔光滤镜

首批 Product Family：

- Black Pro-Mist 4×5.65"；
- Pro-Mist 4×5.65"。

保存官方全部 Density Variant，不只常用档。Form Factor 和 Density 分开建模。

官方 seed source：
- https://tiffen.com/products/4-x-5-65-black-pro-mist-filter
- Tiffen 官方 4×5.65 Pro-Mist product catalog / product page。

#### 17.1.12 摄影支撑与灯光支撑各自资料

首批只建通用 Category / Topic / Interface，不虚构具体品牌 Model：

- Tripod；
- Fluid Head；
- Quick Release Plate；
- Camera Plate；
- NATO；
- RSA；
- 1/4"-20；
- 3/8"-16；
- Light Stand；
- C-Stand；
- Boom / 三节摇；
- Baby Pin / Junior Receiver 等在正式官方/标准来源确认后逐项进入接口库。

Tilta/铁头三脚架未指定具体型号前不建立具体 EquipmentModel。

### 17.2 软件真实产品范围

#### 软件 → Blender

记录具体官方 Capability Scope；不能因其主要是 3D DCC 就自动标记 Editing 不支持。至少覆盖 Modeling、Sculpting、Animation、Simulation、Rendering、Compositing、Video Editing 等官方能力范围。

#### 软件 → Unreal Engine 5

至少覆盖 Realtime Production、Virtual Production、Realtime Rendering、3D scene / animation / simulation 等官方能力范围。

#### 软件 → Adobe After Effects

至少覆盖 Compositing、Motion Graphics、2D Animation、Tracking/Keying 等官方能力范围；不把它声明为完整 NLE。

不建立软件教程或“某版本新增按钮”知识。
