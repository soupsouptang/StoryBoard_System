/**
 * FrameForge Lighting Asset Registry — V1
 *
 * 连接三层资产：
 *   1. GLB 文件  (三维模型, 用于 WebGL / three.js 3D 预览)
 *   2. Canvas 渲染函数  (用于当前 2.5D 等轴 Canvas 渲染)
 *   3. 元数据预设  (来自 lighting-scene.js PRESETS)
 *
 * CC0 模型来源：3DAssets.dev — TV Studio and Broadcast Gallery
 *   https://3dassets.dev/packs/tv-studio-and-broadcast-gallery
 *
 * 生成模型：film_equipment_25d_pack/generated_base_models/ (CC0-1.0)
 */
(function(root) {
'use strict';

const BASE = 'assets/glb/';

/**
 * ASSET_MAP: key = "type/subtype"  →  { glb, zh, w, d, h, defaultZ, notes }
 *   w/d/h = 真实尺寸参考 (cm)，用于 2.5D 投影比例
 *   defaultZ = 对象底部离地高度 (cm)
 */
const ASSET_MAP = {

  /* ─── 灯光 ─────────────────────────────────────────────────── */
  'light/arri_skypanel_x21': {
    glb: BASE + 'arri_skypanel_x21.glb',
    cc0glb: BASE + '35504_Softbox_Panel_Light__TV_Studio_and_Broadcast_Gallery_.glb',
    zh: 'ARRI SkyPanel X21', w: 74, d: 16, h: 200, defaultZ: 180,
    manufacturer: 'ARRI', model: 'SkyPanel X21', powerW: 800,
    replica: true, verifiedSpecs: true,
    specSource: 'https://www.arri.com/en/lighting/led/skypanel/x-series/tech-data',
    specTier: 'official',
    notes: 'Verified specs: 738x339x154mm body, 875x588x170mm with yoke, 28mm spigot. 专属几何：扁平方板灯体 + yoke 叉臂 + 28mm Spigot'
  },
  'light/aputure_storm_1200x': {
    glb: BASE + 'aputure_storm_1200x.glb',
    cc0glb: BASE + '35501_Barn_Door_Spot__TV_Studio_and_Broadcast_Gallery_.glb',
    zh: 'Aputure STORM 1200x', w: 34, d: 34, h: 220, defaultZ: 200,
    manufacturer: 'Aputure', model: 'STORM 1200x', powerW: 1200,
    replica: true, verifiedSpecs: true,
    specSource: 'https://www.aputure.com/en-US/products/storm-1200x',
    specTier: 'official',
    notes: 'Verified specs: 334x336x557mm with yoke, CF12 Fresnel 383x370x128mm. 专属几何：方箱机身 + 内凹 Fresnel 镜筒 + yoke'
  },
  'light/nanlite_forza_300b_ii': {
    glb: BASE + 'nanlite_forza_300b_ii.glb',
    cc0glb: BASE + '35501_Barn_Door_Spot__TV_Studio_and_Broadcast_Gallery_.glb',
    zh: 'Nanlite Forza 300B II', w: 33, d: 23, h: 200, defaultZ: 180,
    manufacturer: 'Nanlite', model: 'Forza 300B II', powerW: 350,
    replica: true, verifiedSpecs: true,
    specSource: 'https://www.focusnordic.com/products/video/led-lighting/fresnel-monolights/nanlite-forza-300b-ii-bicolor-led-spot-light',
    specTier: 'retailer',
    notes: 'Head 330x228x123mm, Bowens mount. 官方 nanlite.com 构建期返回 HTTP 500，尺寸取自经销商规格页（二手来源）。专属几何：聚光头反光杯 + Bowens 卡口 + yoke'
  },
  'light/nanlite_forza_500b_ii': {
    glb: BASE + 'nanlite_forza_500b_ii.glb',
    cc0glb: BASE + '35501_Barn_Door_Spot__TV_Studio_and_Broadcast_Gallery_.glb',
    zh: 'Nanlite Forza 500B II', w: 40, d: 23, h: 220, defaultZ: 200,
    manufacturer: 'Nanlite', model: 'Forza 500B II', powerW: 580,
    replica: true, verifiedSpecs: true,
    specSource: 'https://www.focusnordic.com/products/video/led-lighting/fresnel-monolights/nanlite-forza-500b-ii-bicolor-led-spot-light',
    specTier: 'retailer',
    notes: 'Head 400x230x142mm, Bowens mount. 官方 nanlite.com 构建期返回 HTTP 500，尺寸取自经销商规格页（二手来源）。专属几何：聚光头反光杯 + Bowens 卡口 + yoke（与 300B II 尺寸不同）'
  },
  'light/arri_orbiter': {
    glb: BASE + 'arri_orbiter.glb',
    cc0glb: BASE + '35502_Fresnel_Lamp_on_a_Hook_Clamp__TV_Studio_and_Broadcast_Gallery_.glb',
    zh: 'ARRI Orbiter', w: 40, d: 40, h: 220, defaultZ: 200,
    manufacturer: 'ARRI', model: 'Orbiter', powerW: 400,
    replica: true, verifiedSpecs: true,
    specSource: 'https://www.arri.com/en/lighting/led/orbiter/tech-specs',
    specTier: 'official',
    notes: 'Official tech-specs: 400W nominal (500W max), 28mm Spigot (Junior Pin). 专属几何：圆桶镜筒 + 28mm Junior Pin + yoke（不再是通用菲涅尔基型）'
  },
  'light/fresnel': {
    glb: BASE + 'light_fresnel_stand.glb',
    cc0glb: BASE + '35502_Fresnel_Lamp_on_a_Hook_Clamp__TV_Studio_and_Broadcast_Gallery_.glb',
    zh: '菲涅尔灯', w: 35, d: 35, h: 200, defaultZ: 180,
    notes: 'Generated fallback + CC0 hook-clamp variant'
  },
  'light/led_panel': {
    glb: BASE + 'light_led_panel_stand.glb',
    cc0glb: BASE + '35504_Softbox_Panel_Light__TV_Studio_and_Broadcast_Gallery_.glb',
    zh: 'LED 面板灯', w: 60, d: 10, h: 190, defaultZ: 160,
    notes: 'Generated fallback + CC0 softbox panel variant'
  },
  'light/cob': {
    glb: BASE + 'light_fresnel_stand.glb',
    cc0glb: BASE + '35501_Barn_Door_Spot__TV_Studio_and_Broadcast_Gallery_.glb',
    zh: 'COB 聚光灯', w: 30, d: 30, h: 200, defaultZ: 190,
    notes: 'CC0 barn-door spot as COB stand-in'
  },
  'light/par': {
    glb: BASE + 'light_fresnel_stand.glb',
    cc0glb: BASE + '35501_Barn_Door_Spot__TV_Studio_and_Broadcast_Gallery_.glb',
    zh: 'PAR 灯', w: 28, d: 28, h: 195, defaultZ: 180
  },
  'light/hmi': {
    glb: BASE + 'light_fresnel_stand.glb',
    cc0glb: BASE + '35502_Fresnel_Lamp_on_a_Hook_Clamp__TV_Studio_and_Broadcast_Gallery_.glb',
    zh: 'HMI 聚光灯', w: 40, d: 40, h: 210, defaultZ: 200
  },
  'light/tungsten': {
    glb: BASE + 'light_fresnel_stand.glb',
    zh: '钨丝灯', w: 32, d: 32, h: 195, defaultZ: 180
  },
  'light/practical': {
    glb: BASE + '35508_On_Air_Light__TV_Studio_and_Broadcast_Gallery_.glb',
    zh: '实景灯', w: 20, d: 20, h: 100, defaultZ: 100
  },

  /* ─── 修光器 ─────────────────────────────────────────────── */
  'modifier/softbox_rect': {
    glb: BASE + 'light_softbox_stand.glb',
    cc0glb: BASE + '35504_Softbox_Panel_Light__TV_Studio_and_Broadcast_Gallery_.glb',
    zh: '矩形柔光箱', w: 120, d: 80, h: 10, defaultZ: 200
  },
  'modifier/softbox_oct': {
    glb: BASE + 'light_softbox_stand.glb',
    zh: '八角柔光箱', w: 100, d: 100, h: 10, defaultZ: 200
  },
  'modifier/reflector': {
    glb: BASE + 'modifier_reflector_board.glb',
    zh: '反光板', w: 100, d: 5, h: 70, defaultZ: 100
  },
  'modifier/negative_fill': {
    glb: BASE + 'grip_flag_stand.glb',
    zh: '减光旗', w: 100, d: 5, h: 80, defaultZ: 120
  },
  'modifier/grid': {
    glb: BASE + 'light_softbox_stand.glb',
    zh: '蜂巢格', w: 60, d: 5, h: 60, defaultZ: 200
  },
  'modifier/barndoors': {
    glb: BASE + '35501_Barn_Door_Spot__TV_Studio_and_Broadcast_Gallery_.glb',
    zh: '遮扇', w: 40, d: 40, h: 30, defaultZ: 200
  },
  'modifier/diffusion_frame': {
    glb: BASE + 'grip_flag_stand.glb',
    zh: '柔光布', w: 120, d: 5, h: 80, defaultZ: 170
  },

  /* ─── 摄影机 ─────────────────────────────────────────────── */
  'camera/arri_alexa_35': {
    glb: BASE + 'arri_alexa_35.glb',
    cc0glb: BASE + '35497_Shoulder_Camera_on_a_Tripod__TV_Studio_and_Broadcast_Gallery_.glb',
    zh: 'ARRI ALEXA 35', w: 35, d: 45, h: 125, defaultZ: 110,
    manufacturer: 'ARRI', model: 'ALEXA 35',
    replica: true, verifiedSpecs: true,
    specSource: 'https://www.arri.com/en/camera-systems/cameras/legacy-camera-systems/alexa-35',
    specTier: 'mixed',
    notes: 'LPL 卡口与机身重量 ~2.9kg 经 ARRI 官网核实；ARRI 官网未列机身物理尺寸，机身 138x152x188mm 为项目内部已核实值（不含镜头/取景器/提手）。几何含方箱机身 + 顶部提手 + LPL 卡口圆筒 + 镜头筒 + 取景器'
  },
  'camera/cinema': {
    glb: BASE + 'camera_cinema_tripod.glb',
    cc0glb: BASE + '35497_Shoulder_Camera_on_a_Tripod__TV_Studio_and_Broadcast_Gallery_.glb',
    zh: '电影摄影机', w: 40, d: 80, h: 130, defaultZ: 100
  },
  'camera/dslr': {
    glb: BASE + 'camera_cinema_tripod.glb',
    zh: '单反相机', w: 20, d: 40, h: 120, defaultZ: 90
  },
  'camera/mirrorless': {
    glb: BASE + 'camera_cinema_tripod.glb',
    zh: '无反相机', w: 18, d: 35, h: 115, defaultZ: 85
  },
  'camera/aerial': {
    glb: BASE + 'camera_slider.glb',
    zh: '无人机', w: 60, d: 60, h: 20, defaultZ: 400
  },
  'camera/pedestal': {
    glb: BASE + '35496_Pedestal_Camera_on_a_Dolly__TV_Studio_and_Broadcast_Gallery_.glb',
    zh: '电视台摄像机', w: 50, d: 80, h: 150, defaultZ: 110
  },
  'camera/jib': {
    glb: BASE + '35500_Jib_Arm_on_a_Base__TV_Studio_and_Broadcast_Gallery_.glb',
    zh: 'Jib 摇臂', w: 60, d: 300, h: 200, defaultZ: 0
  },
  'camera/monitor': {
    glb: BASE + 'camera_director_monitor.glb',
    zh: '导演监视器', w: 35, d: 25, h: 90, defaultZ: 80
  },
  'camera/slider': {
    glb: BASE + 'camera_slider.glb',
    zh: '滑轨', w: 100, d: 20, h: 10, defaultZ: 80
  },

  /* ─── 演员 ─────────────────────────────────────────────────── */
  'actor/actor': {
    glb: null,
    zh: '演员', w: 60, d: 30, h: 170, defaultZ: 0
  },
  'actor/extra': {
    glb: null,
    zh: '群演', w: 50, d: 25, h: 165, defaultZ: 0
  },
  'actor/child': {
    glb: null,
    zh: '儿童演员', w: 40, d: 20, h: 120, defaultZ: 0
  },

  /* ─── 灯架/支撑 ─────────────────────────────────────────── */
  'grip/avenger_a2033f': {
    glb: BASE + 'avenger_cstand_a2033f.glb',
    zh: 'Avenger C-Stand 33"', w: 40, d: 40, h: 200, defaultZ: 0,
    manufacturer: 'Avenger', model: 'A2033F',
    replica: true, verifiedSpecs: true,
    specSource: 'https://www.thomann.nl/avenger_a2033f_c_stand_33_fixed_leg.htm',
    specTier: 'retailer',
    notes: '立杆最大高度 33"≈840mm（型号名），收合约 1340mm，重量 5.5kg、底座直径 ~950mm 经经销商核实。几何含三脚折叠底座 + 分级立杆(35/30/25mm) + 顶部 grip head 圆盘 + 16mm(5/8") 销 + grip arm'
  },
  'grip/tripod': {
    glb: BASE + 'camera_cinema_tripod.glb',
    zh: '三脚架', w: 60, d: 60, h: 160, defaultZ: 0
  },
  'grip/c_stand': {
    glb: BASE + 'grip_c_stand.glb',
    zh: 'C-Stand', w: 40, d: 40, h: 200, defaultZ: 0
  },
  'grip/boom': {
    glb: BASE + 'sound_boom_mic.glb',
    zh: '吊杆', w: 30, d: 180, h: 200, defaultZ: 0
  },
  'grip/sandbag': {
    glb: BASE + 'grip_sandbag.glb',
    cc0glb: BASE + '35510_Studio_Sandbag__TV_Studio_and_Broadcast_Gallery_.glb',
    zh: '沙袋', w: 30, d: 20, h: 15, defaultZ: 0
  },
  'grip/flag_stand': {
    glb: BASE + 'grip_flag_stand.glb',
    zh: '旗架', w: 40, d: 40, h: 200, defaultZ: 0
  },
  'grip/apple_box': {
    glb: BASE + 'set_apple_box.glb',
    zh: 'Apple Box', w: 50, d: 25, h: 20, defaultZ: 0
  },

  /* ─── 音效 ─────────────────────────────────────────────────── */
  'sound/boom_mic': {
    glb: BASE + 'sound_boom_mic.glb',
    cc0glb: BASE + '35505_Boom_Microphone_on_a_Pole__TV_Studio_and_Broadcast_Gallery_.glb',
    zh: '吊杆话筒', w: 25, d: 200, h: 220, defaultZ: 0
  },

  /* ─── 家具 ─────────────────────────────────────────────────── */
  'furniture/table': {
    glb: BASE + '35524_Green_Room_Table__TV_Studio_and_Broadcast_Gallery_.glb',
    zh: '桌子', w: 160, d: 80, h: 75, defaultZ: 0
  },
  'furniture/round_table': {
    glb: BASE + '35524_Green_Room_Table__TV_Studio_and_Broadcast_Gallery_.glb',
    zh: '圆桌', w: 120, d: 120, h: 75, defaultZ: 0
  },
  'furniture/conference_table': {
    glb: BASE + '35488_News_Desk_with_a_Monitor_Inset__TV_Studio_and_Broadcast_Gallery_.glb',
    zh: '会议桌/新闻台', w: 300, d: 100, h: 75, defaultZ: 0
  },
  'furniture/chair': {
    glb: BASE + '35489_Interview_Chair__TV_Studio_and_Broadcast_Gallery_.glb',
    cc0glb: BASE + '35516_Gallery_Operator_Chair__TV_Studio_and_Broadcast_Gallery_.glb',
    zh: '椅子', w: 50, d: 50, h: 90, defaultZ: 0
  },
  'furniture/sofa': {
    glb: BASE + '35490_Chat_Show_Sofa__TV_Studio_and_Broadcast_Gallery_.glb',
    cc0glb: BASE + '35523_Green_Room_Sofa__TV_Studio_and_Broadcast_Gallery_.glb',
    zh: '沙发', w: 200, d: 80, h: 85, defaultZ: 0
  },
  'furniture/bed': {
    glb: null,
    zh: '床', w: 200, d: 160, h: 60, defaultZ: 0
  },
  'furniture/cabinet': {
    glb: BASE + '35525_Prop_Store_Shelving_Bay__TV_Studio_and_Broadcast_Gallery_.glb',
    zh: '柜子/道具架', w: 100, d: 50, h: 200, defaultZ: 0
  },
  'furniture/news_desk': {
    glb: BASE + '35488_News_Desk_with_a_Monitor_Inset__TV_Studio_and_Broadcast_Gallery_.glb',
    zh: '新闻播报台', w: 200, d: 80, h: 110, defaultZ: 0
  },
  'furniture/riser': {
    glb: BASE + '35492_Riser_Platform__TV_Studio_and_Broadcast_Gallery_.glb',
    zh: '升降台', w: 200, d: 200, h: 30, defaultZ: 0
  },

  /* ─── 建筑 ─────────────────────────────────────────────────── */
  'architecture/wall': {
    glb: BASE + '35486_Set_Flat__TV_Studio_and_Broadcast_Gallery_.glb',
    zh: '墙体', w: 300, d: 20, h: 280, defaultZ: 0
  },
  'architecture/window': {
    glb: BASE + '35486_Set_Flat__TV_Studio_and_Broadcast_Gallery_.glb',
    zh: '窗', w: 120, d: 20, h: 280, defaultZ: 0
  },
  'architecture/door': {
    glb: BASE + '35485_Set_Flat_with_a_Doorway__TV_Studio_and_Broadcast_Gallery_.glb',
    cc0glb: BASE + '35526_Studio_Door_with_a_Soundlock__TV_Studio_and_Broadcast_Gallery_.glb',
    zh: '门', w: 90, d: 20, h: 280, defaultZ: 0
  },
  'architecture/column': {
    glb: null,
    zh: '柱子', w: 30, d: 30, h: 280, defaultZ: 0
  },
  'architecture/cyclorama': {
    glb: BASE + '35481_Cyclorama_Straight_Section__TV_Studio_and_Broadcast_Gallery_.glb',
    zh: '抠像幕布 (Cyc)', w: 400, d: 20, h: 280, defaultZ: 0
  },
  'architecture/green_screen': {
    glb: BASE + '35487_Green_Screen_Flat__TV_Studio_and_Broadcast_Gallery_.glb',
    zh: '绿幕', w: 300, d: 20, h: 250, defaultZ: 0
  },
  'architecture/stairs': {
    glb: BASE + '35492_Riser_Platform__TV_Studio_and_Broadcast_Gallery_.glb',
    zh: '台阶', w: 150, d: 200, h: 60, defaultZ: 0
  },
  'architecture/floor_tile': {
    glb: BASE + '35482_Studio_Floor_Tile__TV_Studio_and_Broadcast_Gallery_.glb',
    zh: '地砖', w: 100, d: 100, h: 2, defaultZ: 0
  },

  /* ─── 标注 ─────────────────────────────────────────────────── */
  'annotation/arrow': { glb: null, zh: '箭头', w: 240, d: 40, h: 1, defaultZ: 0 },
  'annotation/note':  { glb: null, zh: '标注', w: 150, d: 50, h: 1, defaultZ: 0 },
  'annotation/distance': { glb: null, zh: '距离', w: 200, d: 30, h: 1, defaultZ: 0 },
  'annotation/mark_spike': {
    glb: BASE + '35495_Mark_Spikes_and_Gaffer_Tape__TV_Studio_and_Broadcast_Gallery_.glb',
    zh: '位置标记', w: 30, d: 30, h: 5, defaultZ: 0
  },
};

/**
 * 获取资产条目（type/subtype 或 "type", "subtype" 分开传）
 * 优先返回带 cc0glb 的专业版本，回退 generated glb，再回退 null。
 */
function getAsset(type, subtype) {
  var key = subtype ? (type + '/' + subtype) : type;
  if (ASSET_MAP[key]) return ASSET_MAP[key];
  // 回退：画布上的对象是 V1 降级形态，type 可能被改写成后端白名单里的近义类型
  // （grip→tripod、furniture→table、architecture→wall 等），此时精确 key 查不到。
  // 按 subtype 反查真实条目，否则该 preset 的专属几何会被静默跳过。
  if (subtype) {
    for (var k in ASSET_MAP) {
      if (Object.prototype.hasOwnProperty.call(ASSET_MAP, k) && k.split('/')[1] === subtype) {
        return ASSET_MAP[k];
      }
    }
  }
  return null;
}

/**
 * 获取最佳 GLB URL（优先 cc0glb，其次 glb）
 */
function getGLBUrl(type, subtype) {
  var a = getAsset(type, subtype);
  if (!a) return null;
  // replica 条目必须用「该型号专属几何」——若还去加载 cc0glb 通用模型，
  // 等于又回到「通用菲涅尔改名 ARRI Orbiter」，分级门禁就失去意义。
  if (a.replica || a.twin) return a.glb || a.cc0glb || null;
  return a.cc0glb || a.glb || null;
}

/**
 * 获取 3D 真实尺寸 {w, d, h} (cm)
 * 用于 2.5D 投影时正确计算比例
 */
function getRealSize(type, subtype) {
  var a = getAsset(type, subtype);
  if (!a) return { w: 100, d: 100, h: 100 };
  return { w: a.w || 100, d: a.d || 100, h: a.h || 100 };
}

/**
 * 获取对象底部 defaultZ (cm)
 */
function getDefaultZ(type, subtype) {
  var a = getAsset(type, subtype);
  return a ? (a.defaultZ || 0) : 0;
}

/**
 * 返回所有资产的 manifest（供 UI 素材库列表用）
 * 格式：[{ key, type, subtype, zh, glbUrl, hasGLB }]
 */
function getManifest() {
  return Object.keys(ASSET_MAP).map(function(key) {
    var parts = key.split('/');
    var a = ASSET_MAP[key];
    return {
      key: key, type: parts[0], subtype: parts[1] || parts[0],
      zh: a.zh, glbUrl: a.cc0glb || a.glb || null,
      hasGLB: !!(a.cc0glb || a.glb),
      size: { w: a.w, d: a.d, h: a.h }, defaultZ: a.defaultZ || 0,
    };
  });
}

/**
 * 按 type 分组的 manifest（供侧边栏渲染用）
 */
function getManifestByType() {
  var result = {};
  getManifest().forEach(function(item) {
    if (!result[item.type]) result[item.type] = [];
    result[item.type].push(item);
  });
  return result;
}

/**
 * 资产运行时加载与验证注册表 (key -> { loaded, meshCount, glbUrl, verifiedAt })
 */
var verifiedAssets = new Map();

function registerVerifiedAsset(type, subtype, info) {
  var key = subtype ? (type + '/' + subtype) : type;
  verifiedAssets.set(key, Object.assign({}, info, { verifiedAt: Date.now() }));
  if (typeof window !== 'undefined' && window.__FF_ON_ASSET_VERIFIED) {
    try { window.__FF_ON_ASSET_VERIFIED(key, verifiedAssets.get(key)); } catch (_) {}
  }
}

function getAssetVerification(type, subtype) {
  var key = subtype ? (type + '/' + subtype) : type;
  return verifiedAssets.get(key) || null;
}

/**
 * 获取资产准入等级 — 按「几何来源」分级，严禁按「加载成功」升格。
 *
 *   digital_twin   : 厂商原生 CAD/STEP 派生 + IES 光度 + license 齐备
 *                    → 需 ASSET_MAP 显式声明 `twin: true`（目前无任何资产满足）
 *   staging        : 已声明真实品牌/型号，但尚无该型号的专属几何
 *                    （多个型号共用同一 TU/e 基型即属此级）
 *   replica        : 按真实尺寸/接口手工或程序化生成，且有 verifiedSpecs
 *                    → ENGINEERING REPLICA
 *   cc0            : CC0 影棚/通用采集模型 → GENERIC REFERENCE
 *   generic        : 通用基础三维模型     → GENERIC REFERENCE
 *   reference      : 仅参考占位           → REFERENCE
 */
function getAssetStatus(type, subtype, presetProps) {
  var a = getAsset(type, subtype) || {};
  var mfr = presetProps && presetProps.manufacturer || a.manufacturer;
  var model = presetProps && presetProps.model || a.model;
  var isRealEquipment = !!(mfr || model);

  // DIGITAL TWIN 是白名单制：必须在 ASSET_MAP 里显式声明存在厂商原生
  // CAD/STEP 来源 + IES 光度 + license，加载成功本身不足为凭。
  if (a.twin === true) {
    return !!a.verifiedSpecs ? 'digital_twin' : 'staging';
  }

  if (isRealEquipment) {
    // ENGINEERING REPLICA：按官方尺寸/安装接口程序化生成的「专属」几何。
    // 三条硬条件缺一不可，任何一条不满足都退回 STAGING：
    //   1) 显式声明 replica + verifiedSpecs
    //   2) 有明确 widened 的规格来源 specSource
    //   3) GLB 为该型号专属（不得与其他 preset 共用同一个基型文件）
    if (a.replica === true && a.verifiedSpecs === true && a.specSource && isDedicatedGlb(a.glb)) {
      return 'replica';
    }
    return 'staging';
  }

  if (a.cc0glb) return 'cc0';
  if (a.glb) return 'generic';
  return 'reference';
}

/** 判断 GLB 是否为该型号专属：ASSET_MAP 中没有任何其他条目引用同一主 GLB */
function isDedicatedGlb(glbFile) {
  if (!glbFile) return false;
  var owners = 0;
  for (var k in ASSET_MAP) {
    if (Object.prototype.hasOwnProperty.call(ASSET_MAP, k) && ASSET_MAP[k].glb === glbFile) owners++;
  }
  return owners === 1;
}

var api = {
  ASSET_MAP: ASSET_MAP,
  getAsset: getAsset, getGLBUrl: getGLBUrl,
  getRealSize: getRealSize, getDefaultZ: getDefaultZ,
  getManifest: getManifest, getManifestByType: getManifestByType,
  registerVerifiedAsset: registerVerifiedAsset,
  getAssetVerification: getAssetVerification,
  getAssetStatus: getAssetStatus,
  verifiedAssets: verifiedAssets,
};
if (typeof module !== 'undefined' && module.exports) module.exports = api;
root.FrameForgeLightingAssets = api;
})(globalThis);