# 器材参考字段合同

版本：1.1，2026-10-05。状态：下一代需求整理；以下字段名和记录结构是设计提案，业务边界采用用户已确认要求。尚未实施数据库、接口或导入器。

本文件是器材参考字段的唯一维护入口。[制作常识规划](PRODUCTION_COMMONS_AND_REFERENCE_SEEDS_2026-10-05.md)定义建设范围，[知识基础合同](KNOWLEDGE_FOUNDATION_AND_EXTENSIBILITY_2026-10-05.md)定义维护和修订，[种子资料](REFERENCE_SEED_DATA_2026-10-05.md)填写具体值。三篇均引用本合同，不再另列一套不一致的型号字段。

## 1. 先分清四种内容

| 内容 | 示例 | 保存位置 | 禁止混入 |
| --- | --- | --- | --- |
| 专业概念 | 视场角、透视、运镜、轴线规则 | 知识主题及正文修订 | 某设备当前库存、某镜头实际参数 |
| 型号事实 | 产品身份、接口、官方规格和适配关系 | 器材参考对象及规格修订 | 本次拍摄选用了什么、是否已经准备好 |
| 项目选择 | 所选机身、镜头、录制模式、配件和时段数量 | 项目需求与制作对象 | 写回官方规格、改变兼容事实 |
| 计算结果 | 指定组合的理论视场角、预计数据量 | 查询计算结果及输入引用 | 伪装成官方实测规格、预先穷举全部组合 |

镜头覆盖策略（Coverage）和镜头像场覆盖（Lens Coverage）必须分别命名，不能共用一个 `coverage` 字段。拍摄准备活动（Setup）与摄影机配置也必须分别命名，不能用一个 `setup` 字段同时记录工作时长和设备组合。

## 2. 身份和真实从属关系

| 对象：中文名（技术名） | 身份字段 / 关系 | 数据归属与范围 |
| --- | --- | --- |
| 厂商（Manufacturer） | `manufacturer_id`、`name_zh`、`name_en`、`aliases` | 独立厂商身份，不用产品名代替 |
| 产品系列（EquipmentProductFamily） | `family_id`、`manufacturer_id`、中英文名称 | 组织同系列产品；系列说明不自动成为所有型号参数 |
| 器材型号（EquipmentModel） | `model_id`、`manufacturer_id`、可空 `family_id`、`name_zh`、`name_en`、`model_code`、分类引用、`revision`、`lifecycle_state` | 一个实际产品型号的稳定身份；不存某项目数量或人员 |
| 产品变体（EquipmentVariant） | `variant_id`、`model_id`、官方货号、变体维度与值 | 从属具体型号；卡口、密度、颜色、地区等官方差异可形成变体；没有变体的型号不虚构默认变体 |
| 成像设备资料（ImagingDevice） | `model_id`、可更换镜头能力、内置模组引用 | 型号的专业资料，不另建第二份产品身份 |
| 内置成像模组（EmbeddedImagingModule） | `module_id`、所属设备、模组名称、传感器/光学资料引用 | 真正从属设备；不可拆换模组不进入可更换镜头选择器 |
| 传感器定义（SensorDefinition） | 传感器身份与官方尺寸、像素、快门类型 | 由设备或模组明确引用；不能仅凭“1英寸”推断实际毫米尺寸 |
| 传感器录制模式（SensorRecordingMode） | `mode_id`、设备/模组、模式名称、输出分辨率、有效区域、帧率及格式能力 | 真正从属其设备/模组；裁切模式的有效区域不能写成整机固定尺寸 |
| 镜头资料（LensModel） | 型号引用、光学规格 | 专业结构化资料，不重复产品身份 |
| 镜头变体资料（LensVariant） | 官方变体引用、卡口及变体规格 | 从属具体镜头型号，不能覆盖型号的共同参数 |
| 配件资料（AccessoryModel） | 型号或变体引用、用途、宿主范围 | 独立销售的配件不因适用而归宿主所有 |
| 转接件资料（AdapterModel） | 型号或变体引用、输入输出端点、功能转换 | 独立适配资料；各端保留所属专业 |
| 支撑资料（SupportComponent） | 型号或变体引用、承托功能、安装条件 | 归支撑对象；不收纳稳定器或滤镜承载资料 |
| 官方套装（EquipmentBundle） | `bundle_id`、官方套装名称/货号、成员型号/变体、数量、来源修订 | 套装成员可独立存在；购买组合不拥有成员能力、不自动证明成员互相兼容 |

产品新世代按厂商独立产品身份建立型号；各独立焦段按实际产品身份建立，卡口差异按官方变体记录。不同数据功能版本逐一核实，不能自动继承。包装、地区组合和开箱销售不凭商店页面变成新光学型号。

## 3. 每个规格值都必须说明出处和条件

| 字段 | 中文含义 | 规则 |
| --- | --- | --- |
| `specification_definition_id` | 规格定义引用 | 指向字段定义，确定数据类型、单位维度和适用对象。 |
| `definition_revision` | 定义修订 | 固定采用的字段定义修订，不能在定义变化后静默改变旧值含义。 |
| `subject_type` | 归属对象类型 | 明确值归型号、变体、模组、模式或配件中的哪类对象。 |
| `subject_id` | 归属对象身份 | 只引用一个归属对象；相关对象通过关系读取，不复制该值。 |
| `subject_revision` | 归属对象修订 | 固定核验时所用对象修订，用于追溯条件和冲突。 |
| `value_type` | 值类型 | 声明数值、范围、枚举、布尔、向量或结构化表的类型。 |
| `value` | 参数值 | 按声明类型保存；未知状态不写进数值，0和false是有效值。 |
| `unit_id` | 单位引用 | 引用单位定义并校验维度；没有量纲的枚举不虚构单位。 |
| `value_state` | 有值 / 未知 / 不适用 | `KNOWN` / `UNKNOWN` / `NOT_APPLICABLE`；未知不等于0、false或不支持 |
| `conditions` | 成立条件 | 结构化记录固件、录制模式、温度、距离、附件组合、测量方向等，不用一段备注承担全部条件 |
| `source_reference_ids` | 来源引用 | 引用具体官方资料记录；一个值可以有多份证据，冲突不覆盖。 |
| `source_locator` | 来源具体位置 | 定位栏目、表格行或手册页码；官网首页不足以定位参数。 |
| `raw_label` | 原始字段名 | 保留核验所需的原始字段短名称。 |
| `raw_value` | 原始值 | 保留核验所需的原始值短摘录；不保存整页或手册快照。 |
| `raw_unit` | 原始单位 | 保留原始单位，和规范单位并列对照，不覆盖原文。 |
| `origin` | 数据由何而来 | `OFFICIAL`官方原值、`CALCULATED`计算结果、`CLASSIFICATION`系统分类、`MANUAL_NOTE`人工备注；四者分开 |
| `verification_state` | 核验结果 | 待核验、已核验、冲突、否定；“已核验”必须有逐字段证据，不能整页批量盖章 |
| `revision` | 值修订 | 值、来源或适用条件变化产生修订；无内容变化不制造修订。 |
| `verified_at` | 核验时间 | 记录实际核验时间；不是网页发布日期或访问时间。 |

来源记录另存URL、发布者、标题、资料/固件版本、地区、访问时间及可访问状态。产品覆盖程度另存“仅身份 / 部分参数 / 适用字段完整”。链接失效、规格未知和官方资料冲突是三件不同的事。

旧种子表中的 `OFFICIAL_VERIFIED` 等组合标签只能作为阅读摘要；实际导入前拆成上述独立状态，并核验具体位置。旧版本手册与新产品页混用必须解释适用版本，不把访问日期当成资料发布日期。

## 4. 分类规格字典

每个对象有独立字段表，字段一项一行。以下英文键属于设计提案；每个字段的适用对象、类型、单位和来源要求通过规格定义管理，不据此宣称厂商已公开数值。通用实体参数复用同一技术定义，各器材只引用适用字段。

<a id="equipment-fields-1"></a>

### 4.1 通用实体参数

归属和条件：归具体实体；重量注明是否含电池、快拆或控制箱。尺寸向量展开长、宽、高和单位。

| 字段键 | 中文含义 |
| --- | --- |
| `weight_g` | 重量 |
| `dimensions_mm` | 外形尺寸 |
| `length_mm` | 长度 |
| `operating_temperature_c` | 工作温度 |
| `ingress_protection` | 防护等级 |

<a id="equipment-fields-2"></a>

### 4.2 摄影机

归属和条件：归型号或变体；模组和录制模式分别引用，不复制整机能力。接口、存储、显示、供电各为独立字段。

| 字段键 | 中文含义 |
| --- | --- |
| `lens_mount_interface_id` | 原生镜头卡口 |
| `port_links` | 端口引用 |
| `built_in_storage_gb` | 内置存储容量 |
| `supported_media` | 支持记录介质 |
| `display_specifications` | 内置显示规格 |
| `power_inputs` | 电源输入 |
| `battery_capacity_mah` | 电池容量 |
| `battery_energy_wh` | 电池能量 |
| `runtime_test` | 续航测试 |
| `accessory_support_links` | 配件支持 |
| `included_bundle_links` | 随附套装 |

<a id="equipment-fields-3"></a>

### 4.3 内置成像模组

归属和条件：模组是真正从属设备的对象；不可拆换模组不进入可更换镜头选择器。

| 字段键 | 中文含义 |
| --- | --- |
| `module_id` | 模组身份 |
| `sensor_definition_id` | 传感器引用 |
| `recording_mode_ids` | 录制模式引用 |
| `fixed_optical_specification_id` | 内置光学规格引用 |

<a id="equipment-fields-4"></a>

### 4.4 传感器

归属和条件：实际毫米尺寸不可由营销画幅名称猜测；动态范围和感光能力附官方测量或模式条件。

| 字段键 | 中文含义 |
| --- | --- |
| `sensor_type` | 传感器类型 |
| `shutter_type` | 快门方式 |
| `sensor_width_mm` | 传感器宽度 |
| `sensor_height_mm` | 传感器高度 |
| `sensor_diagonal_mm` | 传感器对角尺寸 |
| `effective_pixels` | 有效像素 |
| `dynamic_range_stops` | 动态范围 |
| `sensitivity_mapping` | 感光映射 |
| `shutter_time_range_s` | 曝光时间范围 |
| `shutter_angle_range_deg` | 快门角度范围 |

<a id="equipment-fields-5"></a>

### 4.5 录制模式

归属和条件：真正从属设备或模组；输出尺寸不等于传感器有效区域；精确分数帧率独立保存。每项能力须标固件和模式条件。

| 字段键 | 中文含义 |
| --- | --- |
| `mode_id` | 模式身份 |
| `output_width_px` | 输出宽度 |
| `output_height_px` | 输出高度 |
| `recording_aspect_ratio` | 输出画面比例 |
| `active_width_mm` | 有效区域宽度 |
| `active_height_mm` | 有效区域高度 |
| `readout_window` | 读取窗口 |
| `capture_fps_range` | 拍摄帧率范围 |
| `project_timebase_options` | 项目基准帧率 |
| `playback_fps_options` | 回放帧率 |
| `format_support_links` | 格式支持关系 |
| `codec_profile` | 编码配置 |
| `max_data_rate_bytes_s` | 最高数据率 |
| `color_primaries` | 色域 |
| `transfer_function` | 传递函数 |
| `log_profile` | 对数编码 |
| `bit_depth` | 位深 |
| `chroma_sampling` | 色度采样 |
| `digital_crop_mode` | 电子裁切模式 |
| `stabilization_crop` | 防抖裁切 |
| `desqueeze_setting` | 去挤压设置 |

<a id="equipment-fields-6"></a>

### 4.6 镜头

归属和条件：归型号、官方变体或条件化规格。物理焦距不被等效焦距覆盖，F值和T值不自动换算；前口径不等同滤镜螺纹；最近对焦测量基准不默认镜头前端。

| 字段键 | 中文含义 |
| --- | --- |
| `physical_focal_length_mm` | 物理焦距 |
| `focal_length_min_mm` | 最短焦距 |
| `focal_length_max_mm` | 最长焦距 |
| `equivalent_focal_length_mm` | 等效焦距 |
| `equivalence_reference` | 等效比较基准 |
| `f_number_min` | 最小F值 |
| `f_number_max` | 最大F值 |
| `t_stop_min` | 最小T值 |
| `t_stop_max` | 最大T值 |
| `aperture_by_focal_length` | 光圈随焦距变化表 |
| `transmission_mapping` | 透光映射 |
| `iris_type` | 光圈机构 |
| `iris_blade_count` | 光圈叶片数 |
| `image_circle_mm` | 像场直径 |
| `supported_imaging_formats` | 官方覆盖画幅 |
| `projection_model` | 投影模型 |
| `official_aov` | 官方视角表 |
| `minimum_focus_distance_m` | 最近对焦距离 |
| `focus_range_m` | 对焦范围 |
| `focus_reference` | 距离测量基准 |
| `max_magnification` | 最大放大倍率 |
| `filter_thread_mm` | 滤镜螺纹口径 |
| `front_diameter_mm` | 前口径 |
| `lens_mount_interface_id` | 镜头卡口 |
| `autofocus_support` | 自动对焦支持 |
| `stabilization_support` | 防抖支持 |
| `metadata_support` | 镜头数据支持 |
| `focus_control_support` | 焦点控制支持 |
| `squeeze_ratio` | 挤压倍率 |
| `squeeze_axis` | 挤压方向 |
| `desqueeze_model` | 去挤压模型 |

<a id="equipment-fields-7"></a>

### 4.7 光学附件

归属和条件：附加光学规格只属于已核实宿主组合；专用名单不向同品牌、同系列、同大类扩散。空名单表示未核实，不能匹配全部产品。

| 字段键 | 中文含义 |
| --- | --- |
| `attachment_effect` | 附加光学作用 |
| `combined_optical_specification` | 指定组合光学规格 |
| `host_selector_type` | 宿主匹配方式 |
| `host_model_ids` | 允许宿主型号 |
| `host_variant_ids` | 允许宿主变体 |
| `host_module_ids` | 允许宿主模组 |
| `required_mode_ids` | 必要录制模式 |
| `excluded_hosts` | 明确排除宿主 |
| `attachment_site` | 安装部位 |
| `required_intermediates` | 必要中间件 |

<a id="equipment-fields-8"></a>

### 4.8 滤镜

归属和条件：矩形片不是螺纹滤镜；柔光密度不是减光档数。每种形态的尺寸和安装条件分别记录，不适用字段标不适用。

| 字段键 | 中文含义 |
| --- | --- |
| `form_factor` | 物理形态 |
| `filter_width_mm` | 片宽 |
| `filter_height_mm` | 片高 |
| `filter_thickness_mm` | 片厚 |
| `filter_thread_mm` | 圆形滤镜螺纹 |
| `effect_type` | 作用类型 |
| `density_variant` | 密度变体 |
| `stacking_conditions` | 叠片条件 |

<a id="equipment-fields-9"></a>

### 4.9 遮光斗

归属和条件：描述遮光和安装能力；滤镜架、托盘、连接环是独立参考对象，不因相关就成为遮光斗拥有的产品。

| 字段键 | 中文含义 |
| --- | --- |
| `mounting_method` | 安装方式 |
| `front_mount_range_mm` | 前端安装范围 |
| `rod_support_links` | 导管支撑条件 |
| `filter_slot_count` | 滤镜槽位数 |
| `flag_support` | 遮光叶支持 |
| `holder_support_links` | 滤镜架支持 |
| `tray_support_links` | 托盘支持 |
| `vignetting_conditions` | 遮挡条件 |

<a id="equipment-fields-10"></a>

### 4.10 滤镜架

归属和条件：片幅、厚度和锁紧条件分别核实，不由标称片幅推导全部适配。

| 字段键 | 中文含义 |
| --- | --- |
| `supported_filter_sizes` | 支持片幅 |
| `max_filter_thickness_mm` | 最大片厚 |
| `slot_width_mm` | 槽宽 |
| `filter_slot_count` | 槽位数 |
| `connection_endpoints` | 连接端点 |
| `rotation_conditions` | 旋转条件 |
| `locking_method` | 锁紧方式 |
| `tray_support_links` | 支持托盘 |

<a id="equipment-fields-11"></a>

### 4.11 滤镜托盘

归属和条件：托盘与片、架、遮光斗分别有明确适配关系；托盘不是通用标准外形的同义词。

| 字段键 | 中文含义 |
| --- | --- |
| `tray_outer_dimensions_mm` | 托盘外形 |
| `inner_filter_size_mm` | 内片幅 |
| `filter_thickness_range_mm` | 片厚范围 |
| `mounting_orientation` | 横竖安装方向 |
| `retention_method` | 防脱方式 |
| `locking_method` | 锁紧方式 |
| `holder_support_links` | 支持滤镜架 |
| `matte_box_support_links` | 支持遮光斗 |

<a id="equipment-fields-12"></a>

### 4.12 镜头连接环

归属和条件：转换镜头前端安装条件，不改变摄影机的镜头卡口。

| 字段键 | 中文含义 |
| --- | --- |
| `lens_end_diameter_mm` | 镜头端直径 |
| `lens_end_thread` | 镜头端螺纹 |
| `carrier_end_interface` | 承载端接口 |
| `clamp_range_mm` | 夹持范围 |
| `host_support_links` | 明确宿主支持 |

<a id="equipment-fields-13"></a>

### 4.13 摄影支撑

归属和条件：三脚架、云台、底座、导管、镜头支撑分别有对应项；承重够不等于空间和安装条件满足。导管系统不能只按直径合并。

| 字段键 | 中文含义 |
| --- | --- |
| `support_type` | 支撑类型 |
| `tested_payload_kg` | 测试载荷 |
| `mount_interfaces` | 安装接口 |
| `rod_diameter_mm` | 导管直径 |
| `rod_spacing_mm` | 导管间距 |
| `rod_height_standard` | 导管高度制式 |
| `clearance_conditions` | 间隙条件 |
| `center_of_gravity_conditions` | 重心条件 |
| `base_support_links` | 底座支持 |

<a id="equipment-fields-14"></a>

### 4.14 快拆组件

归属和条件：快拆板和夹座分别登记；名称和外形相似不构成适配证据。

| 字段键 | 中文含义 |
| --- | --- |
| `plate_width_mm` | 板宽 |
| `plate_length_mm` | 板长 |
| `groove_profile` | 槽形 |
| `mounting_orientation` | 安装方向 |
| `retention_method` | 防脱方式 |
| `locking_method` | 锁紧方式 |
| `screw_thread` | 螺纹 |
| `system_support_links` | 支持系统 |

<a id="equipment-fields-15"></a>

### 4.15 稳定器

归属和条件：机械平衡、空间、控制和供电分别判断；运动轨迹由运镜知识维护。

| 字段键 | 中文含义 |
| --- | --- |
| `tested_payload_kg` | 测试载荷 |
| `balance_conditions` | 平衡条件 |
| `camera_clearance` | 机身空间条件 |
| `lens_clearance` | 镜头空间条件 |
| `quick_release_support` | 快拆支持 |
| `host_support_links` | 机身镜头支持 |
| `control_support_links` | 控制功能支持 |
| `power_inputs` | 电源输入 |

<a id="equipment-fields-16"></a>

### 4.16 跟焦组件

归属和条件：测距器、电机、手轮、手柄逐项登记；套装不替代成员型号和独立能力。

| 字段键 | 中文含义 |
| --- | --- |
| `component_function` | 组件功能 |
| `motor_torque` | 电机扭矩 |
| `gear_specification` | 齿轮规格 |
| `measurement_conditions` | 测距条件 |
| `control_ports` | 控制端口 |
| `power_inputs` | 电源输入 |
| `function_support` | 功能支持 |
| `member_support_links` | 成员支持关系 |

<a id="equipment-fields-17"></a>

### 4.17 灯具

归属和条件：标称输出和耗电独立；照度附距离、色温、设置、附件；控制端口不混电源端口。

| 字段键 | 中文含义 |
| --- | --- |
| `emitter_type` | 发光系统 |
| `rated_output_w` | 标称输出 |
| `max_power_consumption_w` | 最大耗电 |
| `cct_range_k` | 色温范围 |
| `green_magenta_range` | 绿洋红调整 |
| `cri` | 显色指数 |
| `tlci` | 电视照明一致性指数 |
| `ssi` | 光谱相似性指数 |
| `tm30_rf` | 色彩保真指标 |
| `tm30_rg` | 色域指标 |
| `photometric_measurements` | 照度测量表 |
| `beam_angle_deg` | 光束角 |
| `dimming_range` | 调光范围 |
| `modifier_mount_interface_id` | 原生控光接口 |
| `support_interfaces` | 支撑接口 |
| `control_protocols` | 控制协议 |
| `control_ports` | 控制端口 |
| `wireless_control_support` | 无线控制支持 |
| `input_voltage_range_v` | 输入电压范围 |
| `input_current_a` | 输入电流 |
| `battery_support_links` | 电池支持 |
| `runtime_test` | 续航测试 |
| `accessory_support_links` | 配件支持 |
| `included_bundle_links` | 随附套装 |

<a id="equipment-fields-18"></a>

### 4.18 控光附件

归属和条件：反光罩、菲涅耳、柔光箱、蜂巢、投影附件分别登记；同接口名字不证明全功能兼容。

| 字段键 | 中文含义 |
| --- | --- |
| `modifier_type` | 附件类型 |
| `modifier_mount_interface_id` | 原生安装接口 |
| `dimensions_mm` | 尺寸 |
| `beam_angle_deg` | 光束角 |
| `optical_effect` | 光学作用 |
| `host_support_links` | 灯具支持 |
| `required_intermediates` | 必要转接件 |

<a id="equipment-fields-19"></a>

### 4.19 灯光支撑

归属和条件：灯架、魔术腿、悬臂分别登记；不收纳电池和供电线缆。

| 字段键 | 中文含义 |
| --- | --- |
| `support_type` | 支撑类型 |
| `tested_payload_kg` | 测试载荷 |
| `pin_specification` | 销规格 |
| `receiver_specification` | 接收孔规格 |
| `working_height_range_mm` | 工作高度范围 |
| `footprint_dimensions_mm` | 占地尺寸 |
| `clearance_conditions` | 安装间隙 |

<a id="equipment-fields-20"></a>

### 4.20 供电设备

归属和条件：容量和能量不直接换单位；供电接口支持不能证明能够驱动设备全部输出。

| 字段键 | 中文含义 |
| --- | --- |
| `input_voltage_range_v` | 输入电压范围 |
| `output_voltage_range_v` | 输出电压范围 |
| `max_output_current_a` | 最大输出电流 |
| `max_power_consumption_w` | 最大耗电 |
| `battery_capacity_mah` | 电池容量 |
| `battery_energy_wh` | 电池能量 |
| `power_inputs` | 电源输入 |
| `power_outputs` | 电源输出 |
| `runtime_test` | 续航测试 |

<a id="equipment-fields-21"></a>

### 4.21 线缆

归属和条件：同外形不同接线和协议分别核实；机械可插不代表视频、数据、控制或供电均可用。

| 字段键 | 中文含义 |
| --- | --- |
| `connection_endpoints` | 两端接口 |
| `signal_direction` | 信号方向 |
| `length_mm` | 长度 |
| `voltage_range_v` | 电压范围 |
| `current_limit_a` | 电流限制 |
| `bandwidth` | 带宽 |
| `protocols` | 协议 |
| `active_passive_type` | 主动或被动 |
| `function_passthrough` | 功能透传 |

<a id="equipment-fields-22"></a>

### 4.22 转接件

归属和条件：每端归所属专业范围；机械转接和电气协议转换分别判断，不虚构通用万能转接件。

| 字段键 | 中文含义 |
| --- | --- |
| `connection_endpoints` | 输入输出端点 |
| `signal_direction` | 工作方向 |
| `active_passive_type` | 主动或被动 |
| `function_passthrough` | 功能透传 |
| `host_support_links` | 明确宿主支持 |
| `required_intermediates` | 必要中间件 |
| `conditions` | 适用条件 |

<a id="equipment-fields-23"></a>

### 4.23 监看设备

归属和条件：显示、输入输出、控制和供电分别有条件；不能由端口外形推出能力。

| 字段键 | 中文含义 |
| --- | --- |
| `signal_input` | 视频输入 |
| `signal_output` | 视频输出 |
| `resolution_support` | 分辨率支持 |
| `frame_rate_support` | 帧率支持 |
| `codec_support` | 编解码支持 |
| `color_pipeline_support` | 色彩解释支持 |
| `control_ports` | 控制端口 |
| `power_inputs` | 电源输入 |
| `mount_interfaces` | 安装接口 |

<a id="equipment-fields-24"></a>

### 4.24 视频传输设备

归属和条件：发射器、接收器独立登记；延时附测试条件和方向。

| 字段键 | 中文含义 |
| --- | --- |
| `transmission_role` | 发送或接收角色 |
| `signal_input` | 信号输入 |
| `signal_output` | 信号输出 |
| `resolution_support` | 分辨率支持 |
| `frame_rate_support` | 帧率支持 |
| `codec_support` | 编解码支持 |
| `frequency_bands` | 工作频段 |
| `latency_test` | 延时测试 |
| `control_support_links` | 控制支持 |
| `power_inputs` | 电源输入 |
| `member_support_links` | 成员支持 |

<a id="equipment-fields-25"></a>

### 4.25 音频设备

归属和条件：话筒、录音机、音频接口、无线发射接收分别登记；时间码和同步支持不能互换。

| 字段键 | 中文含义 |
| --- | --- |
| `audio_device_type` | 设备类型 |
| `microphone_type` | 话筒类型 |
| `pickup_pattern` | 指向性 |
| `audio_inputs` | 音频输入 |
| `audio_outputs` | 音频输出 |
| `signal_level` | 信号电平 |
| `sample_rate_support` | 采样率支持 |
| `audio_bit_depth_support` | 音频位深支持 |
| `timecode_support` | 时间码支持 |
| `sync_support` | 同步支持 |
| `wireless_support` | 无线支持 |
| `power_inputs` | 电源输入 |

<a id="equipment-fields-26"></a>

### 4.26 记录介质

归属和条件：瞬时速率不等于持续写入；容量和速率标明单位，合格名单与接口匹配分别维护。

| 字段键 | 中文含义 |
| --- | --- |
| `media_type` | 介质类型 |
| `capacity_bytes` | 容量 |
| `read_speed_bytes_s` | 读取速率 |
| `write_speed_bytes_s` | 写入速率 |
| `sustained_write_bytes_s` | 持续写入速率 |
| `format_conditions` | 格式条件 |
| `qualified_host_links` | 官方合格设备 |

<a id="equipment-fields-27"></a>

### 4.27 官方套装

归属和条件：套装只记录成员；不继承成员能力，也不证明所有成员两两兼容。

| 字段键 | 中文含义 |
| --- | --- |
| `bundle_id` | 套装身份 |
| `bundle_code` | 官方套装货号 |
| `member_links` | 成员引用 |
| `member_quantities` | 成员数量 |
| `source_reference_ids` | 官方来源 |

### 4.28 结构化参数的内部字段

结构化参数仍是一种明确参数，不是允许把其他专业对象堆进去的万能JSON。

| 参数 | 子字段 | 校验 |
| --- | --- | --- |
| 尺寸向量 | 长、宽、高、单位、测量对象 | 不使用中文备注作为唯一数值 |
| 数值范围 | 下界、上界、单位、是否含边界 | 未知边界和0区分 |
| 官方视角表 | 方向、视角、画幅定义、焦距、对焦条件、录制模式、来源位置 | 不从对角视角冒充水平视角 |
| 照度表 | 距离、色温、输出设置、附件、照度、单位、来源位置 | 裸灯和附件组合分别记录 |
| 功能支持关系 | 功能、方向、对端引用、版本条件、支持等级、来源位置 | 机械连接不代替功能支持 |
| 续航测试 | 设备、模式、附件、电池、温度、时长、官方条件、来源位置 | 不把一组条件扩散到所有配置 |
| 兼容端点 | 所属大类、对象身份、型号或变体、接口、方向、来源位置 | 只在真实数据中填写型号和直接组合 |

### 4.29 安装校验

滤镜、托盘、滤镜架、遮光斗、连接环和支撑各自建资料。产品是否需要这些部件取决于真实设计，不强制套用固定装配链。安装校验逐项检查尺寸、片厚、锁紧、槽位、旋转空间、镜头间隙、遮挡和完整配置重量。

完整安装结构和指定产品配对只放在[真实资料](REFERENCE_SEED_DATA_2026-10-05.md)。默认自动推荐最多两个真实中间组件；不得把托盘或连接环藏进备注。复杂实际结构使用已确认的特殊案例路径，保留完整成员和证据，不纳入默认多跳推荐。

## 5. 配件适配：必须先有适用范围，再谈连接

### 5.1 适用范围策略

| 适配策略 | 条件 | 自动检索规则 |
| --- | --- | --- |
| `EXPLICIT_HOST_LIST`：专用宿主名单 | 明确型号/变体；需要时进一步指定内置模组、录制模式、固件 | 只从已核实名单检索；绝不因品牌、系列、类别或接口外形扩大名单 |
| `STANDARD_INTERFACE_RULE`：标准接口规则 | 明确接口标准、尺寸、方向、机械/电气/光学约束，厂商限制 | 可以生成待校验候选；所有必需条件成立且无否定断言，才给出可兼容结论 |
| `UNKNOWN_SCOPE`：范围未核实 | 配件身份已知，适配名单/条件未取得 | 可浏览资料，不能成为“已兼容”选项或自动配置结果 |

具体字段提案：`accessory_id`、`host_selector_type`、`host_model_ids`、`host_variant_ids`、`host_module_ids`、`required_mode_ids`、`attachment_site`、`interface_links`、`required_intermediates`、`excluded_hosts`、`conditions`、`function_support`、来源位置和修订。空名单表示未建立证据，不能解释成匹配全部产品。

一条关系必须区分：`INCLUDED_IN_BUNDLE`随附、`RECOMMENDED_FOR`官方推荐用途、`COMPATIBLE_WITH`经条件确认的兼容、`REQUIRES_COMPONENT`需要另一个组件。同一宿主有配件关系并不表示配件与其他配件互相兼容。

### 5.2 专用光学附件的范围校验

专用附件只有已核实的宿主及条件才进入可用配件检索；不能因其他产品也是镜头或光学器材就扩展适配范围。未列宿主表示缺证据，不是无证据的物理不可能断言。厂商只声明整机支持时，具体模组、滤镜叠加和效果方向仍需分别核实。

概念对照、随附、官方推荐和可兼容分别保存。具体型号正反例及证据只在[数据样例](REFERENCE_SEED_DATA_2026-10-05.md)中维护。

### 5.3 通用连接和路径检查顺序

1. 取用户实际选择的宿主型号、变体、模组和模式，不能拿产品类别当具体宿主。
2. 先检查配件适用范围及型号级否定规则；专用配件不进入跨型号接口推导。
3. 匹配所属专业范围的真实接口，再校验尺寸、方向、电气、光学、协议和固件条件。
4. 有转接件时列出实际型号、连接端点、方向和所有必要功能的逐段支持证据；路径自动推荐硬性最多两个中间组件。
5. 机械安装、自动对焦、光圈、镜头数据、防抖、焦点控制、供电、视频、数据、控制分别返回支持 / 不支持 / 有条件 / 未知。
6. 返回直接兼容、需转接、有条件兼容、明确不兼容或待核验；待核验是信息状态，不新增一个未经确认的兼容事实。

知识连接可以记录官方证明或用户已确认的特殊真实拍摄案例，但不能借特例让默认组合器突破两层限制，也不能用团队实测取代官方器材规格。

## 6. 配套资料覆盖

各大类按第4节独立展开字段；具体对应项见[类别目录](KNOWLEDGE_CATALOG_STRUCTURE_2026-10-05.md)。摄影机、镜头、光学附件、滤镜、遮光斗、滤镜架、托盘、连接环、支撑、稳定器、跟焦、灯具、控光附件、灯光支撑、供电、线缆、转接件、监看、视频传输、音频设备、记录介质及套装分别检查，不再用复合大类代替它们。

每项配套资料记录“已核实列表 / 尚缺官方资料 / 官方未提供该类配件”，后者也须证据。共同字段不构成实际组合。真实型号和配对仅在真实资料填值。

## 7. 跨篇核对和导入门槛

| 起点 | 本合同归属 | 种子资料应展示 | 消费者 |
| --- | --- | --- | --- |
| 制作常识规划2.3型号模板 | 身份、变体、来源、规格、接口、兼容、配件、套装、备注 | 每块的身份/数值/关系及覆盖状态，不只一个型号名 | 知识检索、项目选型 |
| 基础合同6.2 / 6.3 | 本合同2—4节 | `field → subject → definition → source locator`绑定表 | 规格筛选、比较和转换 |
| 基础合同7 / 常识规划10 | 本合同5节 | 宿主范围、端点、条件、功能、转接链和证据 | 多机位选型、配件选择 |
| 常识规划11 / 种子资料5 | 内置模组与录制模式 | 型号及每个模组独立值，不混用容量/帧率 | 视场与录制能力查询 |
| A–H组件与岗位目录 | 中文概念分类及对应专业引用 | 引用权威主题/规格，不复制正文 | 岗位知识浏览 |

导入验收至少包括：所有已填字段都绑定规格定义及真实对象；每个已核实值能定位证据；专用配件不能越宿主名单；原生接口不写成转接后接口；未知不当false；增广后的官方视角不改变透视或覆盖宿主原始值；同型号不同变体/模式不互相污染；旧款来源缺失不能用II代替；套装不会替成员获得功能。

缺字段、缺来源、来源冲突、缺兼容条件、未完成全量枚举分别记录，不能统称“资料已完整”。所有内容继续从空库实施；本次仅接受文档一致性检查，不宣称运行验收。

## 8. 类别、岗位专业和数据样例分工

类别文档仅定义大类、对应项、字段、子项及支持内容，不含实际产品值或直接配对。岗位专业关联使用知识目录的岗位专业关联节的专业域、组件及关联原因；真实数据样例承载具体品牌、型号、配件和安装证据，连接端点逐项标所属大类。专业知识相关性不改变器材适配结论。
