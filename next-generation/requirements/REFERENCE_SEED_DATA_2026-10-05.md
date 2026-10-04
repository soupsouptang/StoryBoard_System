> **下一代业务定义，尚未实施。** 本文件是首批知识参考对象的“已填 Seed 数据包”，用于后续数据库/导入实现的结构化基线。它不是运行数据库快照，不代表产品已上线。所有器材规格只接受厂商官方来源；无法从当前官方来源确认的字段明确保持 UNKNOWN，不用第三方数据补齐。

# FrameForge 首批 Reference Seed Data

版本：1.0，2026-10-05。状态：首批官方数据已开始结构化填充；仍待实现数据库、导入器、索引和UI。

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

所有 SourceReference 记录 URL、accessed_at=2026-10-05 和来源版本/页面身份；按已确认规则不保存网页证据快照。

## 2. SourceReference 首批

| Source ID | Manufacturer / owner | 官方来源 |
| --- | --- | --- |
| SRC-RED-KOMODO-SPECS | RED | https://docs.red.com/955-0190_v1.5/955-0196_V1.5%20Rev-A_RED_PS_KOMODO_Operation_Guide/Content/A_TechSpecs/Specs_KOMODO_6K.htm |
| SRC-RED-KOMODO-FORMAT | RED | https://docs.red.com/955-0190_v1.3/955-0190_v1.3_REV-1.3_RED_PS_KOMODO_Operation_Guide/Content/4_Menus/ProjSet/Format.htm |
| SRC-ZEISS-CP3 | ZEISS | https://www.zeiss.com/photonics-and-optics/us/cinematography/lenses/compact-prime-cp-3-lenses.html |
| SRC-DJI-POCKET4 | DJI | https://store.dji.com/ca/product/osmo-pocket-4 |
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
| SRC-NANLITE-FC-PC | Nanlite | https://nanliteus.com/products/fc-powercontroller-for-fc-300b-fc-500b-and-fc-500c |
| SRC-NANLITE-PAVO15C | Nanlite | https://nanliteus.com/products/pavotube-ii-15c-2-foot-rgbww-led-tube-light |
| SRC-NANLITE-FORZA200 | Nanlite | Nanlite official Forza 200 legacy product/article source；实现导入前重新取得可引用归档URL |
| SRC-NANLITE-FORZA300B-OLD | Nanlite | Nanlite official retrospective/legacy source；实现导入前继续补归档manual |
| SRC-APUTURE-STORM1200X | Aputure | https://aputure.com/EN-US/products/storm-1200x |
| SRC-TIFFEN-BPM4565 | Tiffen | https://tiffen.com/products/4-x-5-65-black-pro-mist-filter |
| SRC-TIFFEN-PM4565 | Tiffen | Tiffen official 4×5.65 Pro-Mist product page/catalog；实现导入前固定当前canonical URL |
| SRC-BLENDER-FEATURES | Blender Foundation | https://www.blender.org/features/ |
| SRC-BLENDER-EDIT | Blender Foundation | https://www.blender.org/features/video-editing/ |
| SRC-UE-FEATURES | Epic Games | https://www.unrealengine.com/features |
| SRC-AE-FEATURES | Adobe | https://www.adobe.com/products/aftereffects/features.html |

## 3. RED KOMODO 6K（原版）

### 3.1 EquipmentModel

| Field | Value | Status | Source |
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

### 3.2 SensorRecordingMode

| Mode ID | Resolution | Effective area mm | Max REDCODE FPS | Status |
| --- | --- | --- | ---: | --- |
| MODE-KOMODO-6K-17-9 | 6144×3240 | 27.03×14.26 | 40 | OFFICIAL_VERIFIED |
| MODE-KOMODO-6K-2.4-1 | 6144×2592 | 27.03×11.40 | 50 | OFFICIAL_VERIFIED |
| MODE-KOMODO-6K-16-9 | 5760×3240 | 25.34×14.26 | UNKNOWN in max-FPS table | OFFICIAL_PARTIAL |
| MODE-KOMODO-5K-17-9 | 5120×2700 | 22.53×11.88 | 48 | OFFICIAL_VERIFIED |
| MODE-KOMODO-4K-17-9 | 4096×2160 | 18.02×9.50 | 60 | OFFICIAL_VERIFIED |
| MODE-KOMODO-2K-17-9 | 2048×1080 | 9.01×4.75 | 120 | OFFICIAL_VERIFIED |

Project time bases: 23.98 / 24 / 25 / 29.97 / 30 / 50 / 59.94 / 60 fps，固定为官方规格，不根据最大Capture FPS反推。

### 3.3 Compatibility

- `EQ-RED-KOMODO-6K → D.Camera.LensMount.RF`：DIRECT_COMPATIBLE。
- Canon EF lens 只有通过兼容 Canon RF adapter 才进入 `REQUIRES_ADAPTER`，且可保留官方确认的 full electronic communication。
- 其他 mount 不因“市面上存在转接环”自动加入；必须有已建 AdapterModel + 官方来源。
- Project Mount Preference 只排序，不改变 RF 原生接口事实。

## 4. ZEISS Compact Prime CP.3 / CP.3 XD

### 4.1 Product Family

- family_id: `FAM-ZEISS-CP3`
- category: CINE_PRIME_LENS
- coverage: full-frame coverage（官方系列说明）
- interchangeable mount family：PL / Canon EF / Nikon F / Sony E / MFT，具体 mount variant 按 ZEISS 官方 mount-change 数据建立。
- CP.3 XD 的 metadata / distortion / shading 能力作为 XD Variant/Capability，不反向写进普通 CP.3。

### 4.2 完整官方焦段表

AoV 顺序固定为：Full Frame / APS-H / Super 35 / Normal 35 / APS-C / MFT。

| Seed ID | Lens | Iris range | Close focus | Length | Front Ø | Weight | Horizontal AoV FF / APS-H / S35 / N35 / APS-C / MFT |
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

全部字段状态：`OFFICIAL_VERIFIED`，来源 SRC-ZEISS-CP3。选择具体 Camera Body/RecordingMode 后，优先匹配官方AoV对应格式；没有直接格式匹配时才允许使用经批准公式产生 `CALCULATED` FOV。

## 5. DJI 内置成像设备

### 5.1 Osmo Pocket 4

**修正旧规划：Pocket 4 不是单一内置镜头。** 当前 DJI 官方 Pocket 系列资料明确允许在两个内置镜头/成像模组之间切换，因此建模为一个 ImagingDevice + 两个 EmbeddedImagingModule。

| Field | Wide module | Medium-tele module | Status |
| --- | --- | --- | --- |
| module_id | IMG-POCKET4-WIDE | IMG-POCKET4-MEDTELE | — |
| sensor | 1-inch CMOS | 1/1.28-inch CMOS | OFFICIAL_VERIFIED |
| equivalent_focal_length | 20mm | 60mm | OFFICIAL_VERIFIED |
| aperture | f/2.0 | f/1.8 | OFFICIAL_VERIFIED |
| focus_range | 0.09m–∞ | 0.20m–∞ | OFFICIAL_VERIFIED |
| replaceable_lens | false | false | FRAMEFORGE_CLASSIFICATION |

设备级当前官方已确认：
- 4K/240fps max video；
- 107GB built-in storage；
- 2-inch OLED；
- vertical shooting；
- Intelligent AF / full-pixel PDAF；
- ActiveTrack supports up to 4× zoom；
- approximately 240 min operating time under DJI stated test condition。

独立 Lens Picker 不显示这两枚内置镜头；选择设备后只允许在官方内置模组间切换。

### 5.2 Mavic 4 Pro

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

## 6. DJI Camera Support / Focus / Transmission

### 6.1 DJI RS 5

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

### 6.2 DJI Focus Pro

组件独立建模：

| Seed ID | Component | Verified facts |
| --- | --- | --- |
| DJI-FOCUSPRO-LIDAR | Focus Pro LiDAR | human-subject focus distance up to 20m；70° FOV；76,800 ranging points；30Hz |
| DJI-FOCUSPRO-MOTOR | Focus Pro Motor | component identity verified；完整motor specs待官方module docs导入 |
| DJI-FOCUSPRO-GRIP | Focus Pro Grip | powers LiDAR + Motor approx.2.5h under DJI condition；supports lens calibration/workflow |
| DJI-FOCUSPRO-HANDUNIT | Focus Pro Hand Unit | component identity verified；详细range/control specs待module docs导入 |

Focus Pro 是四模块体系，不把“Focus Pro”本身当一个单体设备吞掉组件。Camera/Lens support 使用 DJI 官方兼容数据；镜头标定数据和“支持该镜头”不能反向推断镜头机械卡口兼容。

### 6.3 DJI Transmission

独立对象：

| Seed ID | Object | Key verified data |
| --- | --- | --- |
| DJI-TX-VIDEO | DJI Video Transmitter | ~350g；127×87×26mm excl. antennas；40MHz max bandwidth；40Mbps max bitrate；11W；6–18V |
| DJI-RX-VIDEO | DJI Video Receiver | ~350g；127×87×26mm excl. antennas；40Mbps system；9W；6–18V |
| DJI-HB-MONITOR | DJI High-Bright Remote Monitor | ~727g；integrated receiver/monitor/control/recording role |
| DJI-TRANSMISSION-STANDARD-COMBO | Standard Combo | bundle = Video Transmitter + Video Receiver |
| DJI-TRANSMISSION-HB-COMBO | High-Bright Monitor Combo | bundle = Video Transmitter + High-Bright Remote Monitor |

系统：O3 Pro。Combo 只是 Bundle，不拥有独立传输能力。

### 6.4 DJI SDR Transmission

| Seed ID | Object | Interfaces / verified data |
| --- | --- | --- |
| DJI-SDR-TX | SDR Transmitter | ~145g；86.5×64×32mm；SDI in、HDMI in、3.5mm stereo、USB-C firmware、USB-C power/gimbal comm；H.264；SDR+Wi-Fi；20Mbps SDR max；8.2W |
| DJI-SDR-RX | SDR Receiver | ~145g；86.5×64×32mm；SDI out、HDMI out、3.5mm stereo、USB-C firmware/video out、USB-C power；H.264；20Mbps；8.3W |
| DJI-SDR-COMBO | Combo | bundle of TX + RX；不是能力owner |

SDR latency 记录为带条件规格：80ms including camera/display or 35ms excluding under DJI stated 1080p60/control test；不能当任意系统固定延迟。最大距离同样带地区/模式条件。

## 7. Nanlite

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

产品身份与以下历史事实已由 Nanlite 官方 retrospective/legacy 资料确认：

- original Forza 300B existed and is distinct from Forza 300B II；
- separate control unit + removable AC power supply；
- original 300-series battery mode required two 14.8V batteries；
- original USB port did not supply accessory power；
- 39,180 lux @1m, 5600K with included reflector。

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

当前已确认：

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

## 8. Aputure STORM 1200x

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

## 9. Tiffen 4×5.65 diffusion

### 9.1 Black Pro-Mist

- family_id: FILTER-TIFFEN-BLACK-PROMIST-4565
- form_factor: 4×5.650"
- 当前官方产品页直接可验证的 Density Variant：`1/8、1/4、1/2、1、2`。
- product effect description 属于 KnowledgeRevision；Density 是 EquipmentVariant/SpecificationValue，不建立“Black Pro-Mist→1/8→效果”多层知识树。

### 9.2 Pro-Mist

- family_id: FILTER-TIFFEN-PROMIST-4565
- form_factor: 4×5.650"
- 首批只发布当前官方页面/catalog已核验的 Density Variant；未取得完整官方产品变体枚举前，不把第三方列表补成“全部官方档位”。

用户目标仍是**最终录全当前官方4×5.65 Density**。因此该两组 seed 的 completeness 状态暂为 `OFFICIAL_PARTIAL`；实施导入前必须再次枚举官方SKU，只有完成SKU核对才可切 `COMPLETE`。

## 10. 通用 Camera / Lighting Support

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

## 11. SoftwareProduct / Capability Seed

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

## 12. FormatDefinition Seed

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

## 13. Seed completeness backlog

下列内容已经有 identity，但还不能声称“官方数据完整”：

1. old Forza 300B：需官方旧款 manual/archive 补全 CCT、rated power、mount、control、weight/dimensions；
2. Tiffen 4×5.65 Pro-Mist / Black Pro-Mist：需按当前官方SKU完整枚举所有 Density 后才能标 COMPLETE；
3. DJI Focus Pro Motor/Hand Unit：需将 module-specific official specs继续结构化；
4. DJI RS 5 compatibility：具体 Camera/Lens/Control support 应从官方 Compatibility Search 导入，不手抄静态小样；
5. DJI Mavic 4 Pro：各内置模组的完整 recording-mode / ISO / shutter / codec/color matrix仍需官方详细规格页；
6. Osmo Pocket 4：完整双模组 recording-mode / ISO / shutter / codec/color matrix仍需官方详细规格页；
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
- Pocket 4只能选择两个官方内置模组，不能外换镜头；
- Mavic 4 Pro只能选择三个内置模组，不能外换镜头；
- FC-120B原生FM Mount，通过官方AS-BA-FMM才进入Bowens兼容路径；
- RS 5具体Camera/Lens支持由官方型号级兼容断言覆盖通用payload/接口推导；
- DJI Transmission/SDR的TX/RX/Monitor/Bundle身份不混；
- 软件能力不会从“软件类别”自动推断；
- Tiffen未完成官方SKU枚举前不能标COMPLETE；
- 人工EquipmentNote不能覆盖任何OFFICIAL SpecificationValue。
