/**
 * FrameForge Lighting Scene V2.1 - Versioned scene data model.
 * One Scene, one dataset, multiple render modes (2D / 2.5D / 3D / Export).
 * V2.1: Added PRESETS library with canonical params for all object subtypes.
 */
(function(root) {
'use strict';

const SCENE_VERSION = 2;

const DEFAULT_Z = {
  actor: 0, camera: 120, light: 200, softbox: 200,
  diffuser: 150, negative_fill: 140, bounce: 140,
  wall: 0, window: 0, door: 0, furniture: 0,
};

const TYPE_MAP = {
  wall:      { type: 'architecture', subtype: 'wall' },
  window:    { type: 'architecture', subtype: 'window' },
  door:      { type: 'architecture', subtype: 'door' },
  furniture: { type: 'furniture',    subtype: 'table' },
  actor:     { type: 'actor',        subtype: 'actor' },
  camera:    { type: 'camera',       subtype: 'cinema' },
  light:     { type: 'light',        subtype: 'cob' },
  softbox:   { type: 'modifier',     subtype: 'softbox_rect' },
  diffuser:  { type: 'modifier',     subtype: 'diffusion_frame' },
  arrow:     { type: 'annotation',   subtype: 'arrow' },
  tripod:    { type: 'grip',         subtype: 'tripod' },
  chair:     { type: 'furniture',    subtype: 'chair' },
  sofa:      { type: 'furniture',    subtype: 'sofa' },
  bed:       { type: 'furniture',    subtype: 'bed' },
  cabinet:   { type: 'furniture',    subtype: 'cabinet' },
};

const OBJECT_TYPES = new Set(['actor','camera','light','modifier','grip','furniture','architecture','practical','annotation']);

/** Preset library: PRESETS[type][subtype] = { zh, name, defaultZ, width, height, props } */
const PRESETS = {
  light: {
    arri_skypanel_x21:   { zh:'ARRI SkyPanel X21', name:'SkyPanel X21', defaultZ:200, width:74,  height:34, props:{manufacturer:'ARRI', model:'SkyPanel X21', powerW:800,  temperature:5600, intensity:85, beamSpread:120, beamLength:380, aimPan:0, aimTilt:-45, showCoverage:true, mount:'28mm Spigot'} },
    aputure_storm_1200x: { zh:'Aputure STORM 1200x', name:'STORM 1200x', defaultZ:220, width:34, height:34, props:{manufacturer:'Aputure', model:'STORM 1200x', powerW:1200, temperature:5600, intensity:90, beamSpread:45,  beamLength:550, aimPan:0, aimTilt:-45, showCoverage:true, mount:'Junior Pin', attachment:'CF12 Fresnel'} },
    nanlite_forza_300b_ii:{ zh:'Nanlite Forza 300B II', name:'Forza 300B II', defaultZ:200, width:33, height:23, props:{manufacturer:'Nanlite', model:'Forza 300B II', powerW:350, temperature:5600, intensity:75, beamSpread:60, beamLength:400, aimPan:0, aimTilt:-45, showCoverage:true, mount:'Bowens'} },
    nanlite_forza_500b_ii:{ zh:'Nanlite Forza 500B II', name:'Forza 500B II', defaultZ:220, width:40, height:23, props:{manufacturer:'Nanlite', model:'Forza 500B II', powerW:580, temperature:5600, intensity:85, beamSpread:55, beamLength:480, aimPan:0, aimTilt:-45, showCoverage:true, mount:'Bowens'} },
    arri_orbiter:        { zh:'ARRI Orbiter',       name:'Orbiter',       defaultZ:220, width:40, height:40, props:{manufacturer:'ARRI', model:'Orbiter', powerW:400,  temperature:5600, intensity:80, beamSpread:30,  beamLength:450, aimPan:0, aimTilt:-45, showCoverage:true, mount:'28mm Junior Pin'} },
    cob:       { zh:'COB 聚光灯',   name:'COB',       defaultZ:220, width:60,  height:60,  props:{temperature:5600, intensity:80,  beamSpread:30,  beamLength:400, aimPan:0, aimTilt:-45, showCoverage:true} },
    fresnel:   { zh:'菲涅尔灯',   name:'Fresnel',   defaultZ:220, width:70,  height:70,  props:{temperature:3200, intensity:70,  beamSpread:25,  beamLength:500, aimPan:0, aimTilt:-45, showCoverage:true} },
    par:       { zh:'PAR 灯', name:'PAR',       defaultZ:200, width:55,  height:55,  props:{temperature:5600, intensity:60,  beamSpread:40,  beamLength:350, aimPan:0, aimTilt:-40, showCoverage:true} },
    led_panel: { zh:'LED 面板',name:'LED Panel',defaultZ:190, width:80,  height:50,  props:{temperature:5600, intensity:75,  beamSpread:90,  beamLength:250, aimPan:0, aimTilt:-60, showCoverage:true} },
    hmi:       { zh:'HMI 镝灯',       name:'HMI',       defaultZ:250, width:80,  height:80,  props:{temperature:5600, intensity:100, beamSpread:15,  beamLength:600, aimPan:0, aimTilt:-30, showCoverage:true} },
    tungsten:  { zh:'钨丝灯',   name:'Tungsten',  defaultZ:200, width:60,  height:60,  props:{temperature:3200, intensity:85,  beamSpread:50,  beamLength:300, aimPan:0, aimTilt:-45, showCoverage:true} },
    practical: { zh:'实景灯',   name:'Practical', defaultZ:100, width:40,  height:40,  props:{temperature:2700, intensity:30,  beamSpread:120, beamLength:150, aimPan:0, aimTilt:-90, showCoverage:false} },
  },
  modifier: {
    softbox_rect:    { zh:'矩形柔光箱', name:'Rect Softbox',    defaultZ:210, width:120, height:80,  props:{beamSpread:120, beamLength:280, aimPan:0, aimTilt:-60, showCoverage:true} },
    softbox_oct:     { zh:'八角柔光箱', name:'Octa Softbox',    defaultZ:210, width:100, height:100, props:{beamSpread:140, beamLength:250, aimPan:0, aimTilt:-60, showCoverage:true} },
    diffusion_frame: { zh:'柔光布框',     name:'Diffusion Frame', defaultZ:170, width:120, height:80,  props:{beamSpread:90,  beamLength:200, showCoverage:false} },
    reflector:       { zh:'反光板',     name:'Reflector',       defaultZ:100, width:100, height:70,  props:{beamSpread:60,  beamLength:200, showCoverage:false} },
    negative_fill:   { zh:'减光黑旗',     name:'Negative Fill',   defaultZ:100, width:100, height:70,  props:{showCoverage:false} },
    grid:            { zh:'蜂巢格',     name:'Grid',            defaultZ:220, width:60,  height:60,  props:{beamSpread:40,  beamLength:300, showCoverage:true} },
    barndoors:       { zh:'四页遮扉',   name:'Barndoors',       defaultZ:220, width:70,  height:70,  props:{beamSpread:55,  beamLength:320, showCoverage:true} },
  },
  camera: {
    arri_alexa_35: { zh:'ARRI ALEXA 35', name:'ALEXA 35', defaultZ:120, width:35, height:45, props:{manufacturer:'ARRI', model:'ALEXA 35', focalLength:35, sensorWidth:27.99, sensorHeight:19.22, opticalCenter:true} },
    cinema:     { zh:'电影摄影机', name:'Cinema',     defaultZ:120, width:80, height:60, props:{focalLength:35, sensorWidth:36,   sensorHeight:24} },
    dslr:       { zh:'单反相机',   name:'DSLR',       defaultZ:90,  width:60, height:50, props:{focalLength:50, sensorWidth:36,   sensorHeight:24} },
    mirrorless: { zh:'无反微单',   name:'Mirrorless', defaultZ:85,  width:55, height:45, props:{focalLength:50, sensorWidth:35.6, sensorHeight:23.8} },
    aerial:     { zh:'航拍无人机', name:'Drone',      defaultZ:400, width:60, height:60, props:{focalLength:24, sensorWidth:17.3, sensorHeight:13} },
    pedestal:   { zh:'重型台架机', name:'Pedestal',   defaultZ:110, width:60, height:80, props:{focalLength:35, sensorWidth:36, sensorHeight:24} },
    jib:        { zh:'摄影摇臂',   name:'Jib Arm',    defaultZ:0,   width:80, height:240, props:{armLength:310} },
    slider:     { zh:'电动滑轨',   name:'Slider',     defaultZ:80,  width:100, height:20, props:{} },
    monitor:    { zh:'导演监视器', name:'Director Mon',defaultZ:80, width:40, height:30, props:{} },
  },
  actor: {
    actor: { zh:'主演演员',   name:'Actor', defaultZ:0, width:60, height:60, props:{height:170, facing:0} },
    extra: { zh:'现场群演',   name:'Extra', defaultZ:0, width:50, height:50, props:{height:165, facing:0} },
    child: { zh:'儿童演员',   name:'Child', defaultZ:0, width:40, height:40, props:{height:120, facing:0} },
  },
  grip: {
    avenger_a2033f: { zh:'Avenger C-Stand 33"', name:'Avenger C-Stand', defaultZ:0, width:40, height:40, props:{manufacturer:'Avenger', model:'A2033F', maxH:328, minH:134, pin:'16mm Baby Pin'} },
    tripod:  { zh:'重型三脚架', name:'Tripod',  defaultZ:0, width:50, height:50, props:{} },
    c_stand: { zh:'标准魔术腿', name:'C-Stand', defaultZ:0, width:40, height:40, props:{} },
    boom:    { zh:'影视吊臂架', name:'Boom Arm',defaultZ:0, width:50, height:80, props:{} },
    sandbag: { zh:'配重沙袋',   name:'Sandbag', defaultZ:0, width:30, height:20, props:{} },
  },
  furniture: {
    table:            { zh:'剧组长桌',   name:'Table',    defaultZ:0, width:160, height:80,  props:{} },
    round_table:      { zh:'圆桌',   name:'Round',    defaultZ:0, width:120, height:120, props:{} },
    conference_table: { zh:'会议台/新闻台', name:'Conf.',defaultZ:0, width:300, height:100, props:{} },
    chair:            { zh:'导演椅',   name:'Chair',    defaultZ:0, width:50,  height:50,  props:{} },
    sofa:             { zh:'置景沙发',   name:'Sofa',     defaultZ:0, width:200, height:80,  props:{} },
    bed:              { zh:'置景床',     name:'Bed',      defaultZ:0, width:200, height:160, props:{} },
    cabinet:          { zh:'器材柜',     name:'Cabinet',  defaultZ:0, width:100, height:50,  props:{} },
  },
  architecture: {
    cyclorama: { zh:'弧形白棚/绿幕', name:'Cyc Section', defaultZ:0, width:300, height:200, props:{} },
    set_flat:  { zh:'摄影棚景片',     name:'Set Flat',    defaultZ:0, width:200, height:20,  props:{} },
    wall:   { zh:'建筑墙体',   name:'Wall',   defaultZ:0,  width:300, height:20,  props:{} },
    window: { zh:'现场窗户',   name:'Window', defaultZ:80, width:120, height:20,  props:{} },
    door:   { zh:'现场门',     name:'Door',   defaultZ:0,  width:90,  height:20,  props:{} },
    column: { zh:'承重柱',     name:'Column', defaultZ:0,  width:30,  height:30,  props:{} },
  },
  annotation: {
    arrow:      { zh:'运镜/动线箭头', name:'Arrow',    defaultZ:0, width:240, height:40, props:{} },
    note:       { zh:'拍摄说明',     name:'Note',     defaultZ:0, width:150, height:50, props:{} },
    mark_spike: { zh:'地标定位贴',   name:'Mark Spike', defaultZ:0, width:30, height:30, props:{} },
    distance:   { zh:'测距标线',     name:'Distance', defaultZ:0, width:200, height:30, props:{} },
  },
};

function migrateItem(item) {
  if (!item) return null;
  if (item.transform && item.properties && item.type in PRESETS) {
    return item;
  }
  if (item.subtype) {
    for (var g in PRESETS) {
      if (PRESETS[g][item.subtype]) {
        var pDef = PRESETS[g][item.subtype];
        var obj = createObject(g, item.subtype, {
          x: Number(item.x) || 80,
          y: Number(item.y) || 80,
          z: Number(item.z) || pDef.defaultZ || 0
        });
        obj.id = item.id;
        obj.label = item.label || obj.label;
        obj.name = item.name || obj.name;
        if (item.rotation != null) obj.transform.rotation.z = Number(item.rotation) || 0;
        if (item.width != null) obj.transform.scale.x = Number(item.width) || pDef.width;
        if (item.height != null) obj.transform.scale.y = Number(item.height) || pDef.height;
        obj.properties = Object.assign({}, obj.properties, extractProperties(item, { type: g, subtype: item.subtype }));
        return obj;
      }
    }
  }
  const mapped = TYPE_MAP[item.type] || { type: 'annotation', subtype: item.type || 'note' };
  const rawZ = Number(item.z);
  const z = Number.isFinite(rawZ) ? rawZ : (DEFAULT_Z[item.type] ?? 0);
  return {
    id: item.id || ('obj-' + Math.random().toString(36).slice(2, 10)),
    type: mapped.type, subtype: item.subtype || mapped.subtype,
    name: item.name || item.label || mapped.subtype, label: item.label || '',
    transform: {
      position: { x: Number(item.x) || 0, y: Number(item.y) || 0, z },
      rotation: { x: 0, y: 0, z: Number(item.rotation) || 0 },
      scale:    { x: Number(item.width) || 100, y: Number(item.height) || 100, z: 1 },
    },
    visible: item.visible !== false, locked: !!item.locked,
    metadata: {}, properties: extractProperties(item, mapped),
  };
}

function extractProperties(item, mapped) {
  const p = {};
  if (mapped.type === 'light' || mapped.type === 'modifier') {
    if (item.attachment)      p.attachment  = item.attachment;
    if (item.beam_spread  != null) p.beamSpread  = Number(item.beam_spread);
    if (item.beam_custom  != null) p.beamCustom  = Number(item.beam_custom);
    if (item.beam_length  != null) p.beamLength  = Number(item.beam_length);
    if (item.intensity    != null) p.intensity   = Number(item.intensity);
    if (item.temperature  != null) p.temperature = Number(item.temperature);
    if (item.show_coverage!= null) p.showCoverage= !!item.show_coverage;
    p.aimPan  = item.aim_pan != null ? Number(item.aim_pan) : 0;
    p.aimTilt = item.aim_tilt != null ? Number(item.aim_tilt) : 0;
  }
  if (mapped.type === 'camera') {
    p.focalLength  = item.focal_length  != null ? Number(item.focal_length)  : 35;
    p.sensorWidth  = item.sensor_width  != null ? Number(item.sensor_width)  : 36;
    p.sensorHeight = item.sensor_height != null ? Number(item.sensor_height) : 24;
    p.fov = null;
  }
  if (mapped.type === 'actor') {
    p.height = item.actor_height != null ? Number(item.actor_height) : 170;
    p.facing = item.actor_facing != null ? Number(item.actor_facing) : (Number(item.rotation) || 0);
  }
  return p;
}

function demoteItem(obj) {
  const v1Type = reverseType(obj);
  const item = {
    id: obj.id, type: v1Type, subtype: obj.subtype,
    x: Math.round(obj.transform?.position?.x ?? 80),
    y: Math.round(obj.transform?.position?.y ?? 80),
    width: Math.round(obj.transform?.scale?.x ?? 100),
    height: Math.round(obj.transform?.scale?.y ?? 100),
    rotation: Math.round(obj.transform?.rotation?.z ?? 0),
    label: obj.label || obj.name || '',
  };
  const z = Math.round(obj.transform?.position?.z ?? (DEFAULT_Z[v1Type] || 0));
  if (z > 0 || v1Type in DEFAULT_Z) item.z = z;
  const p = obj.properties || {};
  if (p.attachment  != null) item.attachment   = p.attachment;
  if (p.beamSpread  != null) item.beam_spread  = p.beamSpread;
  if (p.beamCustom  != null) item.beam_custom  = p.beamCustom;
  if (p.beamLength  != null) item.beam_length  = p.beamLength;
  if (p.intensity   != null) item.intensity    = p.intensity;
  if (p.temperature != null) item.temperature  = p.temperature;
  if (p.showCoverage!= null) item.show_coverage= p.showCoverage;
  if (p.aimTilt     != null) item.aim_tilt     = p.aimTilt;
  if (p.focalLength != null) item.focal_length = p.focalLength;
  if (p.sensorWidth != null) item.sensor_width = p.sensorWidth;
  if (p.height      != null) item.actor_height = p.height;
  if (p.facing      != null) item.actor_facing = p.facing;
  return item;
}

function reverseType(obj) {
  for (var v1 in TYPE_MAP) {
    if (TYPE_MAP[v1].type === obj.type && TYPE_MAP[v1].subtype === obj.subtype) return v1;
  }
  if (obj.type === 'light')        return 'light';
  if (obj.type === 'modifier')     return (obj.subtype === 'diffusion_frame' ? 'diffuser' : 'softbox');
  if (obj.type === 'grip')         return 'tripod';
  if (obj.type === 'furniture') {
    if (['chair','sofa','bed','cabinet'].includes(obj.subtype)) return obj.subtype;
    return 'table';
  }
  if (obj.type === 'camera')       return 'camera';
  if (obj.type === 'actor')        return 'actor';
  if (obj.type === 'architecture') return (['wall','window','door'].includes(obj.subtype) ? obj.subtype : 'wall');
  if (obj.type === 'practical')    return 'light';
  return 'arrow';
}

function normalizeScene(board) {
  if (!board) return null;
  if (board.version === SCENE_VERSION && board.objects && board.objects.length) return board;
  var env = board.environment || { roomWidth: Number(board.width) || 1600, roomDepth: Number(board.height) || 1000 };
  var settings = board.settings || { unit:'cm', gridSize:100, snapEnabled:true, showGrid:true, defaultView:'3d' };
  var objects = (board.objects && board.objects.length) ? board.objects : (board.items || []).map(migrateItem);
  return {
    id: board.id, version: SCENE_VERSION, schemaVersion: SCENE_VERSION, name: board.name || '',
    settings: settings,
    environment: env,
    objects: objects,
    _v1Board: board,
  };
}

function demoteScene(scene) {
  var v1 = scene._v1Board || {};
  return {
    id: scene.id, kind: v1.kind || 'lighting', name: scene.name,
    schemaVersion: 2, version: 2,
    width:    scene.environment ? scene.environment.roomWidth  : (v1.width  || 1600),
    height:   scene.environment ? scene.environment.roomDepth  : (v1.height || 1000),
    shot_ids: v1.shot_ids || [],
    settings: scene.settings || { unit:'cm', gridSize:100, snapEnabled:true, showGrid:true, defaultView:'3d' },
    environment: scene.environment || { roomWidth: 1600, roomDepth: 1000 },
    objects: (scene.objects || []).map(function(o) { return Object.assign({}, o); }),
    items:    (scene.objects || []).map(demoteItem),
  };
}

function createObject(type, subtype, position) {
  position = position || {};
  var preset = PRESETS[type] && PRESETS[type][subtype];
  var z = position.z != null ? position.z : (preset ? preset.defaultZ : (DEFAULT_Z[reverseSubtype(type, subtype)] || 0));
  return {
    id: 'obj-' + Math.random().toString(36).slice(2, 10),
    type: type, subtype: subtype,
    name:  preset ? preset.zh : subtype,
    label: preset ? preset.zh : subtype,
    transform: {
      position: { x: position.x != null ? position.x : 80, y: position.y != null ? position.y : 80, z: z },
      rotation: { x: 0, y: 0, z: 0 },
      scale:    { x: preset ? preset.width : 100, y: preset ? preset.height : 100, z: 1 },
    },
    visible: true, locked: false, metadata: {},
    properties: preset ? Object.assign({}, preset.props) : {},
  };
}

function reverseSubtype(type, subtype) {
  for (var v1 in TYPE_MAP) {
    if (TYPE_MAP[v1].type === type && TYPE_MAP[v1].subtype === subtype) return v1;
  }
  return subtype;
}

function computeFov(camera) {
  var p = camera.properties || {};
  if (p.fov != null) return p.fov;
  var fl = p.focalLength || 35, sw = p.sensorWidth || 36;
  return Math.round(2 * Math.atan(sw / (2 * fl)) * 180 / Math.PI * 10) / 10;
}

function beamLengthCm(light) {
  return (light.properties || {}).beamLength != null ? (light.properties || {}).beamLength : 300;
}

/** Returns preset list for a type: [{subtype, name, ...}] for UI rendering */
function getPresets(type) {
  var group = PRESETS[type] || {};
  return Object.keys(group).map(function(subtype) {
    var p = group[subtype];
    return Object.assign({ subtype: subtype, name: p.zh || p.name }, p);
  });
}

var api = {
  SCENE_VERSION: SCENE_VERSION, DEFAULT_Z: DEFAULT_Z, TYPE_MAP: TYPE_MAP,
  OBJECT_TYPES: OBJECT_TYPES, PRESETS: PRESETS,
  migrateItem: migrateItem, demoteItem: demoteItem,
  normalizeScene: normalizeScene, demoteScene: demoteScene,
  createObject: createObject, computeFov: computeFov,
  beamLengthCm: beamLengthCm, getPresets: getPresets,
};
if (typeof module !== 'undefined' && module.exports) module.exports = api;
root.FrameForgeLightingScene = api;
})(globalThis);