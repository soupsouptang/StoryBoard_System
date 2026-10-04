/* FrameForge creative boards, dependency-free classic script.
 * mount(container, {projectId, kind:'moodboard'|'lighting', shots, assets, api,
 *   upload: async File => projectAsset, onShot: shotId => void}) => cleanup
 * Repeated mount on the same container/project/kind updates callbacks and asset
 * lists without rebuilding the editor or fetching over local edits.
 * cleanup.flush() => Promise<boolean>; cleanup.getDraft() => {revision,boards}.
 * Parent should await flush before leaving and honor false. cleanup is idempotent.
 * api returns decoded JSON and throws with .status=409 on conflicts. It owns auth.
 * Asset shape: {id,project_id?,filename?,mime?,url?}; defaults to /media/{id}.
 * CSS hooks: ff-boards, ff-boards-toolbar, ff-boards-status, ff-boards-layout,
 * ff-boards-sidebar, ff-boards-palette, ff-boards-viewport, ff-boards-stage,
 * ff-boards-canvas, ff-boards-item/is-selected, ff-boards-resize,
 * ff-boards-inspector, ff-boards-field, ff-boards-shots, ff-boards-coverage,
 * ff-boards-notice. Inline geometry provides a usable unthemed editor.
 * SVG primitives are original path geometry. Coverage has no photometric model.
 */
(function (global) {
  'use strict';
  const sessions = new Map(), mounts = new WeakMap();
  const clone = value => JSON.parse(JSON.stringify(value));
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const uid = () => global.crypto?.randomUUID?.() || `cb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  const SNAP = 20, MAX_ITEMS = 500, NS = 'http://www.w3.org/2000/svg';
  const names = {note:'便签', color:'色卡', link:'链接', image:'图片', table:'桌子', chair:'椅子', sofa:'沙发', bed:'床', cabinet:'柜子', door:'门', window:'窗', actor:'演员', camera:'摄影机', tripod:'三脚架', light:'灯具', softbox:'柔光箱', diffuser:'柔光布', wall:'墙', arrow:'方向箭头'};
  const attachments = {naked:90, softbox:100, grid:40, umbrella:120, barndoors:55};
  const attachmentNames = {naked:'裸灯', softbox:'柔光箱', grid:'蜂巢', umbrella:'反光伞', barndoors:'遮扉'};
  // 灯头接口 → 该接口实际能装的附件。反光伞需要伞孔/伞适配器，只有 Bowens 卡口机型提供。
  const MOUNT_ATTACHMENTS = {
    'Bowens':          ['naked','softbox','grid','barndoors','umbrella'],
    '28mm Spigot':     ['naked','softbox','grid','barndoors'],
    'Junior Pin':      ['naked','softbox','grid','barndoors'],
    '28mm Junior Pin': ['naked','softbox','grid','barndoors'],
  };
  /** 取对象所属 preset 声明的灯头接口（mount） */
  function presetMount(item) {
    if (!item) return null;
    if (item.mount) return item.mount;
    const LS = globalThis.FrameForgeLightingScene;
    if (LS && LS.PRESETS && item.subtype) {
      for (const g in LS.PRESETS) {
        const p = LS.PRESETS[g] && LS.PRESETS[g][item.subtype];
        if (p && p.props && p.props.mount) return p.props.mount;
      }
    }
    return null;
  }
  /** 该灯具可安装的附件 key 列表；接口未知时不限制 */
  function allowedAttachments(item) {
    const m = presetMount(item);
    return (m && MOUNT_ATTACHMENTS[m]) ? MOUNT_ATTACHMENTS[m].slice() : Object.keys(attachments);
  }
  /** 由 subtype 反查所属 PRESETS 分组（light/camera/grip/...），用于「替换型号」 */
  function presetGroupOf(item) {
    const LS = globalThis.FrameForgeLightingScene;
    if (!LS || !LS.PRESETS || !item || !item.subtype) return null;
    for (const g in LS.PRESETS) {
      if (LS.PRESETS[g] && LS.PRESETS[g][item.subtype]) return g;
    }
    return null;
  }
  /**
   * 器材规格行（参考图标签为「品名 + 规格」两行，如 "Aputure STORM 700x Spotlight II / 650W Fresnel"）。
   * 依赖 getAsset 的 subtype 回退：2D 画布对象的 type 是 V1 降级值，靠 subtype 才能查到真实条目。
   */
  function itemSpec(item) {
    if (!item) return '';
    const A = globalThis.FrameForgeLightingAssets;
    const a = (A && A.getAsset) ? A.getAsset(item.type, item.subtype) : null;
    const bits = [];
    if (a) {
      // 品名行已含型号时不再重复（label 常为 "ARRI SkyPanel X21"，model 为 "SkyPanel X21"）
      const label = String(item.label || '');
      if (a.model && !label.includes(a.model)) bits.push(a.model);
      if (a.powerW) bits.push(a.powerW + 'W');
      else if (a.w && a.h) bits.push(a.w + '×' + a.h + 'cm');
    }
    if (!bits.length) {
      if (item.attachment && attachmentNames[item.attachment]) bits.push(attachmentNames[item.attachment]);
      if (item.intensity != null) bits.push(item.intensity + '%');
    }
    return bits.join(' · ');
  }
  const primitivePaths = {
    table:'M15 20H85V80H15Z M22 20V12 M78 20V12 M22 80V88 M78 80V88',
    chair:'M25 20H75V35H25Z M28 40H72V78H28Z M20 45V78 M80 45V78',
    sofa:'M12 18H88V35H12Z M12 35H88V80H12Z M20 40V73 M80 40V73 M50 35V80 M5 35H20V85H5Z M80 35H95V85H80Z',
    bed:'M20 10H80V90H20Z M20 30H80 M25 15H45V25H25Z M55 15H75V25H55Z M20 75H80',
    cabinet:'M10 20H90V80H10Z M50 20V80 M43 43V57 M57 43V57',
    door:'M10 90V10 M10 10A80 80 0 0 1 90 90 M10 90H90',
    window:'M10 25H90V75H10Z M10 50H90 M50 25V75',
    actor:'M50 27A13 13 0 1 0 50 1A13 13 0 1 0 50 27 M15 58Q15 30 50 30Q85 30 85 58Q50 75 15 58 M50 65V95 M50 95L40 83 M50 95L60 83',
    camera:'M10 25H65V75H10Z M65 40L92 25V75L65 60Z M20 15H40V25 M20 40H48V60H20Z',
    tripod:'M50 42L12 90 M50 42L88 90 M50 42V8 M50 30A12 12 0 1 0 50 54A12 12 0 1 0 50 30',
    light:'M40 20A30 30 0 1 0 40 80A30 30 0 1 0 40 20 M60 30L92 15V85L60 70 M40 38V62 M28 50H52',
    softbox:'M12 25L32 8H65L85 25V75L65 92H32L12 75Z M32 8V92 M65 8V92 M12 50H85 M85 50H98',
    diffuser:'M15 10H85V90H15Z M15 10L85 90 M85 10L15 90 M5 95H30 M70 95H95',
    wall:'M0 30H100V70H0Z M10 30L30 70 M30 30L50 70 M50 30L70 70 M70 30L90 70',
    arrow:'M5 50H90 M65 22L93 50L65 78'
  };
  /**
   * 侧视矢量剪影图元（矢量插画风格，参考用户提供的布光平面图图例）。
   * 与 primitivePaths（俯视符号）的关键差别：器材画成「侧面看」的轮廓 ——
   * 灯具带喇叭口反光罩 + 人字支架，摄影机带镜头筒，墙体是重复短线段（幕布褶皱）。
   * viewBox 统一 0 0 100 100，Y 轴向下，纯描边（fill:none）。
   */
  const sidePaths = {
    // 聚光灯 / 菲涅尔：灯体 + 前端喇叭口 + 提手 + 人字支架
    spot:'M26 32H56V58H26Z M56 36L78 24V66L56 54 M32 32V24H50V32 M41 58V70 M28 86L41 70L54 86',
    // 面板灯 / SkyPanel：扁平方板 + 中柱 + 展开支架
    led_panel:'M28 20H72V66H28Z M34 26H66 M34 34H66 M34 42H66 M50 66V76 M34 88L50 76L66 88',
    // 柔光箱：伞形罩 + 撑杆 + 支架
    softbox:'M18 26L46 34V62L18 72Z M46 48H64V58H46 M55 58V70 M42 86L55 70L68 86',
    // 实景灯 / 逻辑光：台灯（灯罩 + 灯杆 + 底座）
    practical:'M30 34H64L54 56H40Z M47 56V74 M34 74H60 M40 80H54',
    // 摄影机：机身 + 镜头筒 + 取景器 + 三脚架
    camera:'M24 36H62V58H24Z M62 42H80V52H62 M30 36V26H46V36 M43 58V68 M30 86L43 68L56 86',
    // 演员：侧视人形
    actor:'M50 22A8 8 0 1 1 50 38A8 8 0 1 1 50 22 M42 40Q50 38 58 40L61 62H39Z M39 62L37 84 M61 62L63 84',
    // C 架 / 三脚架：立杆 + 三腿 + 顶部 grip head
    tripod:'M50 20V70 M50 70L30 90 M50 70V90 M50 70L70 90 M42 14H60V20H42Z',
    // 墙 / 幕布：重复短线段表示褶皱（参考图特征）
    wall:'M8 24V76 M18 24V76 M28 24V76 M38 24V76 M48 24V76 M58 24V76 M68 24V76 M78 24V76 M88 24V76 M98 24V76',
    // 家具：侧视
    table:'M16 46H84V54H16Z M26 54V78 M74 54V78',
    chair:'M32 28V60H62 M32 60H64V78 M64 60V78 M26 46H32',
    sofa:'M18 44H82V64H18Z M18 64V78 M82 64V78 M28 34V44 M72 34V44 M18 52H82',
    bed:'M14 42H86V64H14Z M14 64V78 M86 64V78 M30 42V34H52V42',
    cabinet:'M22 26H78V74H22Z M50 26V74 M42 46V56 M58 46V56',
    door:'M24 84V22 M24 22A56 56 0 0 1 80 84 M24 84H80',
    window:'M22 24H78V76H22Z M50 24V76 M22 50H78',
    diffuser:'M24 22H76V78H24Z M24 50H76',
    arrow:'M5 50H90 M65 22L93 50L65 78'
  };
  /** 按 V2 subtype 细化灯具图标；type 在 2D 画布上是 V1 降级值，故优先看 subtype */
  function iconPathFor(item) {
    const t = item.type, st = String(item.subtype || '');
    // Floor plans use top-down footprints; elevation silhouettes belong only
    // to an elevation legend, never to the editable plan.
    if (t === 'light') {
      if (/skypanel|led_panel|nova|panel|^led/.test(st)) return 'M20 20H65V80H20Z M65 20H75V80H65 M30 30V70 M45 30V70 M75 50H95 M85 40L95 50L85 60';
      if (/softbox|oct|rect/.test(st)) return primitivePaths.softbox;
      if (/practical|prac/.test(st)) return 'M50 15A35 35 0 1 0 50 85A35 35 0 1 0 50 15 M25 25L75 75 M75 25L25 75';
      return primitivePaths.light;
    }
    return primitivePaths[t] || primitivePaths.arrow;
  }
  function elevationIconPathFor(item) {
    const t = item.type, st = String(item.subtype || '');
    if (t === 'light' || t === 'softbox' || t === 'diffuser') {
      if (/skypanel|led_panel|nova|panel|^led/.test(st)) return sidePaths.led_panel;
      if (/softbox|oct|rect/.test(st)) return sidePaths.softbox;
      if (/practical|prac/.test(st)) return sidePaths.practical;
      if (/practical/.test(t)) return sidePaths.practical;
      return sidePaths.spot;
    }
    if (t === 'camera') return sidePaths.camera;
    if (t === 'actor') return sidePaths.actor;
    if (t === 'tripod') return sidePaths.tripod;
    if (t === 'table') return sidePaths.table;
    if (t === 'chair') return sidePaths.chair;
    if (t === 'sofa') return sidePaths.sofa;
    if (t === 'bed') return sidePaths.bed;
    if (t === 'cabinet') return sidePaths.cabinet;
    if (t === 'door') return sidePaths.door;
    if (t === 'window') return sidePaths.window;
    if (t === 'wall') return sidePaths.wall;
    if (t === 'diffuser') return sidePaths.diffuser;
    if (t === 'arrow') return sidePaths.arrow;
    return sidePaths[t] || primitivePaths[t] || null;
  }
  // 与后端 LIGHT_TYPES 一一对应：只有这些空间对象接受 z（离地高度 cm）。
  const spatialTypes = Object.keys(primitivePaths);
  function point(rect, width, height, clientX, clientY) {
    // rect includes editor scale AND any ancestor CSS zoom / transform.
    return {x:(clientX-rect.left)*width/rect.width, y:(clientY-rect.top)*height/rect.height};
  }
  function safeLink(value) {
    if (typeof value !== 'string' || value.length > 2048 || /[\s\\\x00-\x1f\x7f]/.test(value)) return false;
    try { const u = new URL(value); return /^https?:$/.test(u.protocol) && !!u.hostname && !u.username && !u.password; } catch (_) { return false; }
  }
  function setAttachment(item, attachment) {
    if (!Object.hasOwn(attachments, attachment)) return;
    item.attachment = attachment;
    if (!item.beam_custom) item.beam_spread = attachments[attachment];
  }
  function cctColor(kelvin) {
    const k = clamp(Number(kelvin) || 5600, 2000, 20000);
    if (k < 3600) return '#e8d8bf';
    if (k < 5000) return '#e3e0d8';
    if (k < 6800) return '#d9e0ea';
    return '#cbd5e1';
  }
  /**
   * 光束轮廓：梯形（矢量插画风格，参考图远端为直线收束边界，而非扇形圆弧）。
   * 光源端保留与灯具体量相关的宽度 —— 面板灯/柔光箱出来是宽梯形，
   * 聚光灯出来是细长梯形，与真实光锥观感一致。
   */
  function conePath(item) {
    const spread = clamp(Number(item.beam_spread) || 60, 5, 170);
    const half = spread * Math.PI / 360;
    const L = Math.max(20, Number(item.beam_length) || 380);
    const srcW = Math.max(8, (Number(item.width) || 40) * 0.30);   // 光源端宽度
    const endW = Math.max(srcW, 2 * L * Math.tan(half));           // 远端宽度由展开角决定
    const r = v => Math.round(v * 100) / 100;
    return `M0 ${r(-srcW / 2)} L${r(L)} ${r(-endW / 2)} L${r(L)} ${r(endW / 2)} L0 ${r(srcW / 2)} Z`;
  }
  function newItem(type, x=80, y=80, assetId) {
    // 新对象不要全堆在左上角：按类型给不同的默认位置，错开摆放。
    const defaults = {
      wall: { x: 200, y: 100 }, window: { x: 500, y: 100 }, door: { x: 800, y: 100 },
      furniture: { x: 400, y: 400 }, actor: { x: 600, y: 500 }, camera: { x: 200, y: 600 },
      light: { x: 300, y: 200 }, softbox: { x: 700, y: 300 }, diffuser: { x: 500, y: 300 },
      arrow: { x: 600, y: 200 },
    };
    const pos = defaults[type] || { x: 100 + Math.random() * 400, y: 100 + Math.random() * 300 };
    const item = {id:uid(), type, x:pos.x, y:pos.y, width:180, height:120, rotation:0, label:names[type]};
    // 离地高度只属于灯光平面图的空间对象。情绪板对象不携带空间字段，否则保存会被后端拒绝。
    if (spatialTypes.includes(type)) item.z = type==='actor'?0:type==='camera'?130:['light','softbox'].includes(type)?200:type==='diffuser'?150:0;
    if (primitivePaths[type]) Object.assign(item, {width:100, height:100});
    if (type === 'wall' || type === 'arrow') Object.assign(item, {width:240, height:40});
    if (type === 'note') Object.assign(item, {text:'写下视觉方向、材质或拍摄想法', color:'#fff2b3'});
    if (type === 'color') item.color = '#64748b';
    if (type === 'link') item.url = 'https://example.com/';
    if (type === 'image') Object.assign(item, {asset_id:assetId, width:240, height:180});
    if (type === 'light' || type === 'softbox') {
      Object.assign(item, {attachment:'naked', beam_spread:90, beam_custom:false, beam_length:320, intensity:60, temperature:5600, show_coverage:true});
      setAttachment(item, type === 'softbox' ? 'softbox' : 'naked');
    }
    return item;
  }
  function validResponse(value) {
    if (!value || !Number.isSafeInteger(value.revision) || value.revision < 0 || !Array.isArray(value.boards)) throw new Error('服务器返回了无效的创意板数据');
    return value;
  }
  function createMoodboardRecord(name) {
    return {id:uid(), kind:'moodboard', name, width:1600, height:1000, shot_ids:[], items:[]};
  }
  function createLightingBoardRecord(name) {
    return {id:uid(), kind:'lighting', schemaVersion:2, version:2, name,
      width:1600, height:1000, shot_ids:[], items:[], objects:[],
      environment:{roomWidth:1600, roomDepth:1000},
      settings:{unit:'cm', gridSize:100, snapEnabled:true, showGrid:true, defaultView:'3d'}};
  }
  function serializeMoodboardItem(item) {
    const base = {id:String(item.id), type:String(item.type), x:Number(item.x)||0, y:Number(item.y)||0,
      width:Number(item.width)||100, height:Number(item.height)||100,
      rotation:Number(item.rotation)||0, label:String(item.label||'')};
    switch (item.type) {
      case 'image': return {...base, asset_id:String(item.asset_id||'')};
      case 'note': return {...base, text:String(item.text||''), color:String(item.color||'#fff2b3')};
      case 'color': return {...base, color:String(item.color||'#64748b')};
      case 'link': return {...base, url:String(item.url||'')};
      default: throw new Error(`不支持的情绪板元素类型: ${item.type}`);
    }
  }
  function serializeMoodboardForSave(board) {
    return {id:String(board.id), kind:'moodboard', name:String(board.name||''),
      width:Number(board.width)||1600, height:Number(board.height)||1000,
      shot_ids:Array.isArray(board.shot_ids)?[...board.shot_ids]:[],
      items:Array.isArray(board.items)?board.items.map(serializeMoodboardItem):[]};
  }
  function serializeLightingForSave(board) {
    const source = clone(board);
    // UI edits hydrated V1 items. Rebuild objects from those current items,
    // rather than saving the stale V2 objects returned by the previous GET.
    const normalize = globalThis.FrameForgeLightingScene?.normalizeScene;
    if (normalize) {
      const normalized = normalize({...source, version:1, objects:[]});
      source.objects = normalized.objects || [];
      source.environment = normalized.environment || source.environment || {};
      source.settings = normalized.settings || source.settings;
    }
    const result = {};
    for (const key of ['id','kind','name','width','height','shot_ids','items','objects','environment','settings']) {
      if (source[key] !== undefined) result[key] = source[key];
    }
    return {...result, schemaVersion:2, version:2};
  }
  function serializeBoardForSave(board) {
    if (!board) return null;
    if (board.kind === 'moodboard') return serializeMoodboardForSave(board);
    if (board.kind === 'lighting') return serializeLightingForSave(board);
    throw new Error(`不支持的画板类型: ${board.kind}`);
  }
  function createSession(projectId, api) {
    const s = {projectId, api, boards:[], revision:0, loaded:false, dirty:false, conflict:false,
      version:0, lastSaveError:null, blockedSaveVersion:null,
      history:[], future:[], listeners:new Set(), views:{}, status:'正在载入创意板…', recovery:null, gestures:0};
    s.emit = (render=false) => s.listeners.forEach(fn => fn(render));
    s.snapshot = () => ({
      revision: s.revision,
      boards: s.boards.map(serializeBoardForSave).filter(Boolean)
    });
    s.schedule = () => {
      clearTimeout(s.timer);
      if (s.conflict || s.blockedSaveVersion === s.version) return;
      s.timer = setTimeout(() => s.flush(), 700);
    };
    s.record = (before, notify=true) => {
      if (JSON.stringify(before) === JSON.stringify(s.boards)) return;
      s.history.push(before); if (s.history.length > 60) s.history.shift();
      s.future = []; s.version++; s.dirty = true;
      s.status = s.conflict ? '保存冲突 · 本地草稿已保留，请导出或重新载入' : '有未保存修改';
      if (notify) s.emit(true); s.schedule();
    };
    s.change = fn => { if (!s.loaded || s.loading || s.gestures) return; const before = clone(s.boards); fn(s.boards); s.record(before); };
    s.travel = redo => {
      if (s.gestures || s.loading) return;
      const from = redo ? s.future : s.history, to = redo ? s.history : s.future;
      if (!from.length) return;
      to.push(clone(s.boards)); s.boards = from.pop(); s.version++; s.dirty = true;
      s.status = s.conflict ? '保存冲突 · 本地草稿已保留' : '有未保存修改'; s.emit(true); s.schedule();
    };
    /**
     * Lighting Scene V2 以 objects 为规范形态，后端保存时会丢弃同名 items。
     * 载入后必须把 objects 降级回 V1 items，否则 DOM/交互层拿到空数组，刷新即丢数据。
     */
    function hydrateBoards(boards) {
      const LS = globalThis.FrameForgeLightingScene;
      if (!Array.isArray(boards)) return boards;
      boards.forEach(board => {
        if (!board || board.kind !== 'lighting' || !Array.isArray(board.objects) || !board.objects.length) return;
        if (Array.isArray(board.items) && board.items.length) return;
        board.items = LS && LS.demoteItem ? board.objects.map(o => LS.demoteItem(o)) : [];
      });
      return boards;
    }

    s.load = async (explicit=false) => {
      if (s.loading || s.pending || s.gestures || (s.dirty && !explicit)) return false;
      if (explicit && s.dirty) s.recovery = s.snapshot();
      s.loading = true; s.status = '正在载入创意板…'; s.emit();
      try {
        const data = validResponse(await s.api(`/api/projects/${encodeURIComponent(projectId)}/creative-boards`, {method:'GET'}));
        s.boards = clone(data.boards); s.revision = data.revision; s.loaded = true;
        hydrateBoards(s.boards);
        s.dirty = false; s.conflict = false; s.history = []; s.future = []; s.version++;
        s.lastSaveError = null; s.blockedSaveVersion = null;
        s.status = s.recovery ? '已载入服务器版本 · 旧草稿仍可导出' : '已同步';
        return true;
      } catch (error) { s.status = `载入失败：${error.message} · 可重试`; return false; }
      finally { s.loading = false; s.emit(true); }
    };
    s.flush = async () => {
      clearTimeout(s.timer);
      if (s.pending) { await s.pending; return s.dirty && !s.conflict ? s.flush() : !s.dirty; }
      if (!s.dirty) return true;
      if (!s.loaded || s.loading || s.conflict || s.gestures || s.blockedSaveVersion === s.version) return false;
      const version = s.version;
      let payload;
      try { payload = s.snapshot(); }
      catch (error) {
        s.lastSaveError = error; s.blockedSaveVersion = version;
        s.status = `画板数据校验失败：${error.message} · 本地草稿已保留`;
        s.emit(); return false;
      }
      s.status = '正在保存…'; s.emit();
      s.pending = (async () => {
        try {
          const data = validResponse(await s.api(`/api/projects/${encodeURIComponent(projectId)}/creative-boards`, {method:'PUT', json:payload}));
          if (data.revision !== payload.revision + 1) throw new Error('保存回执版本不匹配，请重新载入核对');
          s.revision = data.revision; s.dirty = s.version !== version;
          s.lastSaveError = null; s.blockedSaveVersion = null;
          // Never replace boards here: a pointer gesture or newer edit may exist.
          s.status = s.dirty ? '有新修改等待保存' : '已保存';
          return !s.dirty;
        } catch (error) {
          s.lastSaveError = error;
          const status = Number(error.status || error.response?.status || 0);
          if (status === 409) {
            s.conflict = true; s.status = '保存冲突 · 本地草稿已保留，请导出或重新载入';
          } else if (status === 400 || status === 422) {
            // Block the rejected request's version, not an edit made in flight.
            s.blockedSaveVersion = version;
            s.status = `画板数据校验失败：${error.message} · 本地草稿已保留`;
          } else s.status = `保存失败：${error.message} · 草稿已保留，点击重试保存`;
          return false;
        } finally { s.pending = null; s.emit(); }
      })();
      const ok = await s.pending;
      if (!s.conflict && s.dirty && s.version !== version) s.schedule();
      return ok;
    };
    return s;
  }
  function el(tag, className, text, style) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    if (style) Object.assign(node.style, style);
    return node;
  }
  function svg(tag, attrs={}) {
    const node = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([key,value]) => node.setAttribute(key, String(value)));
    return node;
  }
  function button(label, action, parent) {
    const node = el('button', 'ff-boards-button', label, {minHeight:'32px', cursor:'pointer'});
    const icons = {'选择':'M4 3L19 12L12 14L9 21Z','点选':'M4 3L19 12L12 14L9 21Z','平移':'M8 12V5a2 2 0 0 1 4 0v6V3a2 2 0 0 1 4 0v8V6a2 2 0 0 1 4 0v9c0 5-3 7-7 7-3 0-5-2-7-5L2 12a2 2 0 0 1 3-2l3 2',
      '移动':'M12 2v20M2 12h20M8 6l4-4 4 4M8 18l4 4 4-4M6 8l-4 4 4 4M18 8l4 4-4 4','旋转':'M4 9a8 8 0 1 1 0 6M4 3v6h6','环绕':'M3 12a9 4 0 1 0 18 0a9 4 0 1 0-18 0M12 3a4 9 0 1 0 0 18a4 9 0 1 0 0-18',
      '适合窗口':'M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5','撤销':'M9 4L3 10l6 6M3 10h11a6 6 0 0 1 6 6v4','重做':'M15 4l6 6-6 6M21 10H10a6 6 0 0 0-6 6v4','吸附':'M5 3v10a7 7 0 0 0 14 0V3h-5v10a2 2 0 0 1-4 0V3Z'};
    if (icons[label]) {
      const icon = svg('svg', {viewBox:'0 0 24 24',width:18,height:18,'aria-hidden':'true',class:'ff-boards-tool-icon'});
      icon.append(svg('path',{d:icons[label],fill:'none',stroke:'currentColor','stroke-width':1.7,'stroke-linecap':'round','stroke-linejoin':'round'}));
      node.prepend(icon);
    }
    node.title = label;
    node.type = 'button'; node.addEventListener('click', action); parent?.append(node); return node;
  }
  function field(parent, label, value, type, change, attrs={}) {
    const wrap = el('label', 'ff-boards-field', null, {display:'flex', flexDirection:'column', gap:'4px', marginBottom:'12px'});
    wrap.append(el('span', '', label));
    const input = el(type === 'textarea' ? 'textarea' : 'input');
    input.setAttribute('aria-label', label);
    if (type !== 'textarea') input.type = type;
    if (type === 'checkbox') input.checked = value; else input.value = value;
    Object.assign(input, attrs); Object.assign(input.style, {minWidth:'0', maxWidth:'100%', minHeight:'36px'});
    input.addEventListener('change', () => {
      const next = type === 'checkbox' ? input.checked : type === 'number' ? input.valueAsNumber : input.value;
      if ((type === 'number' && !Number.isFinite(next)) || !input.checkValidity()) { input.reportValidity(); return; }
      change(next, input);
    });
    wrap.append(input); parent.append(wrap); return input;
  }
  function select(parent, label, choices, value, change) {
    const wrap = el('label','ff-boards-field',null,{display:'flex',flexDirection:'column',gap:'4px',marginBottom:'12px'});
    wrap.append(el('span','',label)); const node = el('select'); node.style.minHeight = '36px';
    node.setAttribute('aria-label', label);
    choices.forEach(([id,title]) => { const option = el('option','',title); option.value = id; node.append(option); });
    node.value = value; node.addEventListener('change', () => change(node.value)); wrap.append(node); parent.append(wrap); return node;
  }
  function mount(container, options) {
    if (!container?.append || !options?.projectId || !['moodboard','lighting'].includes(options.kind) || typeof options.api !== 'function') throw new TypeError('FrameForgeBoards.mount requires container, projectId, kind and api');
    const old = mounts.get(container);
    if (old && old.projectId === options.projectId && old.kind === options.kind) { old.update(options); return old.cleanup; }
    old?.cleanup();
    let opts = {...options}, alive = true, drag = null, uploading = false, spaceHeld = false;
    let session = sessions.get(options.projectId);
    if (!session) { session = createSession(options.projectId, options.api); sessions.set(options.projectId, session); }
    const s = session, kind = options.kind;
    s.api = options.api;
    const view = s.views[kind] ||= {boardId:null, selected:null, zoom:1, snap:true, coverage:true, mode:kind==='lighting'?'3d':'2d'};
    view.mode ||= kind==='lighting'?'3d':'2d';
    // 2.5D 模式已移除：立体摆位统一走 3D。旧数据里残留的 '2.5d' 就地迁移。
    if (view.mode === '2.5d') view.mode = '3d';
    const root = el('section','ff-boards',null,{fontFamily:'inherit',fontSize:'14px',lineHeight:'1.5',minWidth:'0'});
    root.setAttribute('aria-label', kind === 'lighting' ? '灯光平面图编辑器' : '情绪板编辑器'); root.tabIndex = -1;
    root.dataset.kind = kind;
    const toolbar = el('div','ff-boards-toolbar',null,{display:'flex',flexWrap:'wrap',alignItems:'center',gap:'8px',padding:'12px 0'});
    const status = el('div','ff-boards-status',null,{minHeight:'24px'}); status.setAttribute('role','status'); status.setAttribute('aria-live','polite');
    const notice = el('div','ff-boards-notice',null,{minHeight:'24px'}); notice.setAttribute('role','status');
    const layout = el('div','ff-boards-layout',null,{display:'flex',flexWrap:'wrap',gap:'16px',alignItems:'flex-start'});
    const sidebar = el('aside','ff-boards-sidebar',null,{flex:'0 1 180px',minWidth:'140px'});
    const viewport = el('div','ff-boards-viewport',null,{flex:'1 1 400px',minWidth:'0',height:'min(68vh, 720px)',minHeight:'360px',overflow:'auto',border:'1px solid var(--ff-boards-border, #cbd5e1)',background:'var(--ff-boards-background, #f1f5f9)'});
    const stage = el('div','ff-boards-stage',null,{position:'relative'});
    const canvas = el('div','ff-boards-canvas',null,{position:'relative',transformOrigin:'0 0',backgroundColor:'var(--ff-boards-paper, #fafaf9)',color:'var(--ff-boards-ink, #1e293b)',isolation:'isolate'});
    canvas.tabIndex = 0; canvas.setAttribute('role','group'); canvas.setAttribute('aria-label','画布：选择元素后用方向键移动，Delete 删除，Ctrl Z 撤销');
    const inspector = el('aside','ff-boards-inspector',null,{flex:'0 1 224px',minWidth:'180px',maxHeight:'72vh',overflowY:'auto'});
    const workspace = el('div','ff-boards-workspace');
    const floating = el('div','ff-boards-floating'); floating.setAttribute('role','group'); floating.setAttribute('aria-label','画布工具');
    stage.append(canvas); viewport.append(stage); workspace.append(viewport,floating); layout.append(sidebar,workspace,inspector); root.append(toolbar,status,notice,layout); container.replaceChildren(root);
    const board = () => {
      const current = s.boards.find(b => b.id === view.boardId && b.kind === kind);
      // A V2 lighting response is canonicalized as `objects` by the server.
      // Keep the interaction layer usable even if the first render happens
      // before the normal hydration pass completes.
      if (current && kind === 'lighting' && (!Array.isArray(current.items) || !current.items.length) && Array.isArray(current.objects) && current.objects.length) {
        const LS = globalThis.FrameForgeLightingScene;
        if (LS?.demoteItem) current.items = current.objects.map(object => LS.demoteItem(object));
      }
      return current;
    };
    const selected = () => board()?.items.find(i => i.id === view.selected);
    const planViewport = () => canvas.closest('.ff-boards-split-left') || viewport;
    function zoomPlan(next, clientX, clientY) {
      if (!board() || drag) return;
      if (kind === 'lighting' && view.mode === '3d') {
        webglRuntime?.zoomBy(next > view.zoom ? -120 : 120);
        return;
      }
      const host = planViewport(), rect = host.getBoundingClientRect();
      const px = ((clientX ?? rect.left + rect.width / 2) - rect.left) * host.clientWidth / rect.width;
      const py = ((clientY ?? rect.top + rect.height / 2) - rect.top) * host.clientHeight / rect.height;
      const ratio = clamp(next, .1, 4) / view.zoom;
      const left = (host.scrollLeft + px) * ratio - px, top = (host.scrollTop + py) * ratio - py;
      view.zoom = clamp(next, .1, 4);
      canvas.style.transform = `scale(${view.zoom})`;
      canvas.style.setProperty('--ff-zoom', String(view.zoom));
      canvas.style.setProperty('--ff-touch-target-size', `${44 / view.zoom}px`);
      if (view.mode !== 'split') Object.assign(stage.style, {width: `${board().width * view.zoom}px`, height: `${board().height * view.zoom}px`});
      host.scrollLeft = left; host.scrollTop = top;
      renderToolbar();
    }
    function fitBoard() {
      if (!board()) return;
      if (kind === 'lighting' && view.mode === '3d') { webglRuntime?.setViewPreset('3q'); return; }
      const host = planViewport();
      zoomPlan(Math.min((host.clientWidth - 32) / board().width, (host.clientHeight - 32) / board().height));
      host.scrollLeft = host.scrollTop = 0;
    }
    const message = text => { if (alive) notice.textContent = text; };
    const editItem = fn => s.change(() => { const item = selected(); if (item) fn(item); });
    const availableAssets = () => (opts.assets || []).filter(a => a && (!a.project_id || a.project_id === options.projectId) && (!a.mime || a.mime.startsWith('image/')));
    const announce = () => { status.textContent = s.status; status.dataset.state = s.conflict ? 'conflict' : s.dirty ? 'dirty' : 'saved'; renderToolbar(); };
    function add(type, position, assetId, targetBoardId=view.boardId) {
      const target = s.boards.find(b => b.id === targetBoardId && b.kind === kind);
      if (!target) { message('请先新建或选择画板'); return; }
      if (s.boards.reduce((n,b) => n+b.items.length,0) >= MAX_ITEMS) { message('每个项目最多 500 个元素'); return; }
      if (type === 'image' && !assetId) { message('请在素材列表选择图片，或上传图片'); return; }
      const item = newItem(type, position?.x ?? 80 + target.items.length%8*20, position?.y ?? 80 + target.items.length%8*20, assetId);
      item.x = clamp(view.snap ? Math.round(item.x/SNAP)*SNAP : item.x,0,target.width-item.width);
      item.y = clamp(view.snap ? Math.round(item.y/SNAP)*SNAP : item.y,0,target.height-item.height);
      s.change(() => { target.items.push(item); if (view.boardId === targetBoardId) view.selected = item.id; });
    }
    function duplicate() {
      if (!selected()) return;
      if (s.boards.reduce((n,b) => n+b.items.length,0) >= MAX_ITEMS) return message('每个项目最多 500 个元素');
      s.change(() => { const item = clone(selected()); item.id = uid(); item.x = Math.min(item.x+20,board().width-item.width); item.y = Math.min(item.y+20,board().height-item.height); board().items.push(item); view.selected = item.id; });
    }
    function remove() { s.change(() => { if (board()) board().items = board().items.filter(i => i.id !== view.selected); view.selected = null; }); }
    // 返回是否真的导出了草稿 —— 导航阀门要靠它判断“离开会不会丢数据”。
    function exportDraft(recovery=false) {
      const payload = recovery ? s.recovery : s.snapshot(); if (!payload) return false;
      try {
        const blob = new Blob([JSON.stringify({projectId:options.projectId,...payload},null,2)],{type:'application/json'});
        const url = URL.createObjectURL(blob), link = el('a'); link.href = url; link.download = `creative-boards-${options.projectId}${recovery?'-retained':''}.json`;
        root.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url),1000);
        return true;
      } catch (_) { return false; }
    }
    function createBoard() {
      if (!s.loaded || s.loading) return;
      const count = s.boards.filter(b => b.kind === kind).length;
      if (s.boards.length >= 50) return message('每个项目最多 50 个画板');
      s.change(() => {
        const name = `${kind==='lighting'?'灯光图':'情绪板'} ${count+1}`;
        const b = kind === 'lighting' ? createLightingBoardRecord(name) : createMoodboardRecord(name);
        s.boards.push(b); view.boardId=b.id; view.selected=null;
      });
    }
    function duplicateBoard() {
      const source = board(); if (!source) return;
      if (s.boards.length >= 50) return message('每个项目最多 50 个画板');
      if (s.boards.reduce((n,b)=>n+b.items.length,0)+source.items.length > MAX_ITEMS) return message('每个项目最多 500 个元素');
      s.change(()=>{ const copy=clone(source); copy.id=uid(); copy.name=`${source.name.slice(0,115)} 副本`; copy.items.forEach(item=>{item.id=uid();}); s.boards.push(copy); view.boardId=copy.id; view.selected=null; });
    }
    function renderToolbar() {
      const utilitiesOpen = toolbar.querySelector('.ff-boards-utilities')?.open;
      toolbar.replaceChildren();
      const choices = s.boards.filter(b => b.kind === kind).map(b => [b.id,b.name]);
      const chooser = select(toolbar,'画板',choices.length ? choices : [['','尚无画板']],view.boardId || '', id => { if (drag) finishGesture(true); view.boardId = id; view.selected = null; render(); });
      chooser.disabled = !s.loaded || s.loading;
      if (kind === 'lighting') {
        const modes = el('div','ff-boards-view-modes',null,{display:'flex',gap:'2px',marginLeft:'8px'});
        [['2d','2D'],['split','分屏'],['3d','3D']].forEach(([value,label]) => {
          const control=button(label,()=>{
            view.mode=value; root.dataset.viewMode=value;
            // 进入 2D 时自动适配窗口：参考图是完整平面图，不能只露一角
            if (value === '2d') {
              const b = board();
              if (b) view.zoom = clamp(Math.min((viewport.clientWidth-48)/b.width, (viewport.clientHeight-48)/b.height), .1, 2);
            }
            renderCanvas(); renderToolbar();
          },modes);
          control.setAttribute('aria-pressed',String(view.mode===value));
          control.title=value==='3d'?'3D 立体视图':value==='2d'?'专业俯视平面图':value==='split'?'分屏：左俯视 + 右立体':value;
        });
        toolbar.append(modes);
        // 3D 模式：相机视角预设（酷家乐式多视角）。仅在有 WebGL 运行时且处于立体视图时显示
        if (view.mode === '3d') {
          const cams = el('div','ff-boards-view-modes',null,{display:'flex',gap:'2px',marginLeft:'6px'});
          [['top','俯视'],['bird','鸟瞰'],['walk','漫游'],['3q','3/4']].forEach(([value,label]) => {
            const c = button(label, () => {
              view.cameraPreset = value;
              if (webglRuntime && webglRuntime.setViewPreset) webglRuntime.setViewPreset(value);
              renderToolbar();
            }, cams);
            c.setAttribute('aria-pressed', String((view.cameraPreset || '3q') === value));
            c.title = value === 'top' ? '俯视：正上方看平面布置'
                    : value === 'bird' ? '鸟瞰：高位立体视角'
                    : value === 'walk' ? '漫游：人眼高度水平观察'
                    : '3/4 立体视角（默认）';
          });
          toolbar.append(cams);
        }
      }
      button('撤销', () => s.travel(false),toolbar).disabled = !s.history.length || !!drag || s.loading;
      button('重做', () => s.travel(true),toolbar).disabled = !s.future.length || !!drag || s.loading;
      const zoomOptions=[['0.25','25%'],['0.5','50%'],['0.75','75%'],['1','100%'],['1.5','150%'],['2','200%']];
      if (!zoomOptions.some(([v])=>Number(v)===view.zoom)) zoomOptions.push([String(view.zoom),`${Math.round(view.zoom*100)}%`]);
      if (kind !== 'lighting' || view.mode !== '3d') select(toolbar,'缩放',zoomOptions,String(view.zoom), value => zoomPlan(Number(value)));
      button('适合窗口', fitBoard, toolbar).disabled = !board();
      floating.replaceChildren();
      ['选择','平移'].forEach((label,index)=>{ const control=button(label,()=>{view.hand=!!index;if(!index)view.tool='select';renderToolbar();viewport.classList.toggle('is-hand',view.hand);},floating); control.setAttribute('aria-pressed',String(index?!!view.hand:!view.hand&&(!view.tool||view.tool==='select'))); });
      if (kind === 'lighting' && view.mode !== '2d') {
        [['select','点选'],['move','移动'],['rotate','旋转'],['orbit','环绕']].forEach(([tool,label]) => {
          const control = button(label, () => { view.tool = tool; view.hand = false; renderToolbar(); }, floating);
          control.dataset.tool = tool; control.setAttribute('aria-pressed', String((view.tool || 'select') === tool));
        });
        if (webglRuntime) webglRuntime.tool = view.hand ? 'pan' : (view.tool || 'select');
        button('聚焦所选', () => webglRuntime?.focusSelected(), floating).disabled = !selected();
      }
      if (kind === 'moodboard') ['note','color','link'].forEach(type=>{button(names[type],()=>add(type),floating).disabled=!board()||s.loading;});
      const snap=button('吸附',()=>{view.snap=!view.snap;renderCanvas();renderToolbar();},floating); snap.setAttribute('aria-pressed',String(view.snap)); snap.title='按 20 画布单位吸附';
      if (kind === 'lighting') { const coverage=button('光束',()=>{view.coverage=!view.coverage;renderCanvas();renderToolbar();},floating); coverage.setAttribute('aria-pressed',String(view.coverage)); }
      const utilities = el('details','ff-boards-utilities');
      utilities.open = !!utilitiesOpen || s.conflict || (!s.loaded && !s.loading && s.status.startsWith('载入失败'));
      const summary=el('summary','', '•••'); summary.title='画板与同步操作'; summary.setAttribute('aria-label','画板与同步操作'); utilities.append(summary);
      const menu = el('div','ff-boards-utility-menu'); utilities.append(menu); toolbar.append(utilities);
      const create=button('新建画板',createBoard,menu); create.dataset.action='create-board'; create.disabled=!s.loaded||s.loading;
      button('重命名画板',()=>{view.selected=null;renderInspector();const input=inspector.querySelector('input[aria-label="画板名称"]');input?.focus();input?.select();utilities.open=false;},menu).disabled=!board();
      button('复制画板',duplicateBoard,menu).disabled=!board()||s.loading;
      button('删除画板（可撤销）',()=>s.change(()=>{const id=view.boardId;s.boards=s.boards.filter(b=>b.id!==id);view.boardId=null;view.selected=null;}),menu).disabled=!board()||s.loading;
      button('重试保存', () => s.flush(),menu).disabled = !s.dirty || s.conflict || !!s.pending || !!drag;
      button(s.loaded?'重新载入服务器版本':'重试载入',async () => {
        // Explicit reload retains the draft in s.recovery for export.
        await s.load(true);
      },menu).disabled = !!s.pending || s.loading || !!drag;
      button('导出当前草稿',() => exportDraft(),menu).disabled = !s.loaded;
      if (s.recovery) button('导出保留草稿',() => exportDraft(true),menu);
      toolbar.insertBefore(status, utilities);
    }
    function renderSidebar() {
      sidebar.replaceChildren();
      const palette = el('div','ff-boards-palette',null,{display:'flex',flexWrap:'wrap',gap:'8px'});
      sidebar.append(el('h3','ff-boards-panel-title',kind==='lighting'?'对象库':'项目图片'),palette);
      const search=el('input','ff-boards-asset-search'); search.type='search';search.placeholder='搜索素材工具…';search.setAttribute('aria-label','搜索素材工具');search.value=view.paletteQuery||'';
      const filterPalette=()=>{ const query=search.value.trim().toLocaleLowerCase(); palette.querySelectorAll('button').forEach(node=>{node.hidden=!(node.dataset.search||'').includes(query);}); palette.querySelectorAll('.ff-boards-library-group').forEach(group=>{group.hidden=![...group.querySelectorAll('button')].some(node=>!node.hidden);}); };
      search.addEventListener('input',()=>{view.paletteQuery=search.value;filterPalette();});sidebar.insertBefore(search,palette);

      if (kind === 'lighting') {
        // V8 预设分组面板：优先使用 FrameForgeLightingScene.getPresets，回退旧分组
        const LS = globalThis.FrameForgeLightingScene;
        if (LS && LS.getPresets) {
          const presetGroups = [
            { title: '灯光', type: 'light' },
            { title: '修光器', type: 'modifier' },
            { title: '摄影机', type: 'camera' },
            { title: '演员/角色', type: 'actor' },
            { title: '灯架支撑', type: 'grip' },
            { title: '家具', type: 'furniture' },
            { title: '建筑', type: 'architecture' },
            { title: '标注', type: 'annotation' },
          ];
          presetGroups.forEach(({ title, type }) => {
            const presets = LS.getPresets(type);
            if (!presets.length) return;
            const group = el('section', 'ff-boards-library-group');
            const gHead = el('h4', '', title);
            group.append(gHead);
            const tiles = el('div', 'ff-boards-tiles'); group.append(tiles); palette.append(group);
            presets.forEach(preset => {
              const label = preset.zh || preset.name || preset.subtype;
              const subLabel = preset.name && preset.zh && preset.name !== preset.zh ? preset.name : '';
              
              const LA = globalThis.FrameForgeLightingAssets;
              const assetMeta = LA?.getAsset ? LA.getAsset(type, preset.subtype) : null;
              const status = LA?.getAssetStatus ? LA.getAssetStatus(type, preset.subtype, preset.props) : null;
              const mfr = preset.props?.manufacturer || assetMeta?.manufacturer || '';
              const mount = preset.props?.pin || preset.props?.mount || assetMeta?.mount || (preset.subtype.includes('junior') ? '28mm' : preset.subtype.includes('baby') ? '16mm' : '');
              const power = preset.props?.powerW || assetMeta?.powerW ? `${preset.props?.powerW || assetMeta?.powerW}W` : '';

              const node = el('button', 'ff-boards-tile-card');
              node.type = 'button';
              node.disabled = !board() || s.loading;
              node.draggable = true;

              const header = el('div', 'ff-tile-header');
              const iconSvg = svg('svg', { viewBox: '0 0 24 24', class: 'ff-tile-icon' });
              const useIcon = type === 'light' ? '#icon-lamp_desk' : type === 'camera' ? '#icon-videocam' : type === 'modifier' ? '#icon-filter' : type === 'grip' ? '#icon-handyman' : type === 'actor' ? '#icon-person' : '#icon-layers';
              iconSvg.append(svg('use', { href: useIcon }));
              header.append(iconSvg);

              if (status === 'digital_twin') {
                header.append(el('span', 'ff-tile-badge dt', 'Digital Twin'));
              } else if (status === 'staging') {
                header.append(el('span', 'ff-tile-badge staging', 'Staging'));
              } else if (status === 'replica') {
                // 按真实尺寸/接口程序化生成，有 verifiedSpecs，但不是厂商原生几何
                header.append(el('span', 'ff-tile-badge replica', 'Engineering Replica'));
              } else if (status === 'cc0' || status === 'generic') {
                // CC0 采集或通用基型 —— 统一标 GENERIC REFERENCE，避免「通用=已复刻」的错觉
                header.append(el('span', 'ff-tile-badge cc0', 'Generic Reference'));
              } else {
                header.append(el('span', 'ff-tile-badge generic', 'Reference'));
              }

              const body = el('div', 'ff-tile-body');
              const titleEl = el('span', 'ff-tile-title', label);
              body.append(titleEl);
              if (subLabel) body.append(el('span', 'ff-tile-subtitle', subLabel));

              const footer = el('div', 'ff-tile-footer');
              if (power) footer.append(el('span', 'ff-tile-spec', power));
              if (mount) footer.append(el('span', 'ff-tile-spec', mount));
              if (mfr) footer.append(el('span', 'ff-tile-spec mfr', mfr));
              if (footer.children.length) body.append(footer);

              node.append(header, body);
              tiles.append(node);

              node.dataset.search = (label + ' ' + subLabel + ' ' + type + ' ' + title + ' ' + mfr + ' ' + mount + ' ' + preset.subtype).toLocaleLowerCase();
              node.dataset.type = type; node.dataset.subtype = preset.subtype;
              node.title = `${label}${subLabel ? ' (' + subLabel + ')' : ''}${mfr ? ' · ' + mfr : ''}${power ? ' · ' + power : ''}${mount ? ' · ' + mount : ''}`;
              
              node.addEventListener('click', () => addPreset(type, preset.subtype));
              node.addEventListener('dragstart', event => {
                event.dataTransfer.setData('application/x-frameforge-board', JSON.stringify({ type, subtype: preset.subtype }));
                event.dataTransfer.effectAllowed = 'copy';
              });
            });
          });
        } else {
          // Fallback to legacy groups
          const groups=[['场景',['wall','door','window','table','chair','sofa','bed','cabinet']],['人物',['actor']],['摄影',['camera','tripod']],['灯光',['light','softbox','diffuser']],['标记',['arrow']]];
          groups.forEach(([title,types])=>{
            const group=el('section','ff-boards-library-group'); group.append(el('h4','',title)); const tiles=el('div','ff-boards-tiles');group.append(tiles);palette.append(group);
            types.forEach(type => {
              const node = button(names[type],() => add(type),tiles); node.dataset.search=(names[type]+' '+type+' '+title).toLocaleLowerCase(); node.draggable = true; node.disabled = !board() || s.loading;
              const paths = primitivePaths[type];
              if (paths) { const preview=svg('svg',{viewBox:'0 0 100 100','aria-hidden':'true',class:'ff-boards-asset-icon'}); preview.append(svg('path',{d:paths,fill:'none',stroke:'currentColor','stroke-width':6.25,'stroke-linecap':'round','stroke-linejoin':'round'})); node.prepend(preview); }
              node.dataset.type = type;
              node.addEventListener('dragstart',event => { event.dataTransfer.setData('application/x-frameforge-board',JSON.stringify({type})); event.dataTransfer.effectAllowed='copy'; });
            });
          });
        }
        filterPalette();
        sidebar.append(el('p','ff-boards-notice','示意图 · 非照度/阴影计算')); return;
      }
      const assets = availableAssets();
      palette.classList.add('ff-boards-asset-grid'); search.placeholder='搜索项目图片…';
      assets.forEach(asset=>{const title=asset.filename||asset.name||asset.id;const tile=button(title,()=>add('image',null,asset.id),palette);tile.dataset.search=title.toLocaleLowerCase();tile.disabled=!board()||s.loading;const url=imageUrl(asset);if(url){const img=el('img');img.alt='';img.loading='lazy';img.src=url;img.addEventListener('error',()=>{img.replaceWith(el('span','ff-boards-image-error','缩略图无法加载'));},{once:true});tile.prepend(img);}else tile.prepend(el('span','ff-boards-image-error','素材不可用'));});
      if (!assets.length) palette.append(el('p','ff-boards-panel-hint','暂无项目图片'));
      palette.querySelectorAll('button').forEach(tile=>{
        const caption=el('span','ff-boards-asset-caption');
        [...tile.childNodes].filter(node=>node.nodeType===3).forEach(node=>caption.append(node));
        tile.title=caption.textContent; tile.append(caption);
      });
      filterPalette();
      const file = el('input'); file.type='file'; file.accept='image/*'; file.setAttribute('aria-label','上传图片并加入画板');
      file.style.maxWidth='100%'; file.disabled = !board() || !opts.upload || uploading || s.loading;
      file.addEventListener('change',async () => {
        const image = file.files?.[0], targetId = view.boardId; if (!image || !opts.upload) return;
        if (!image.type.startsWith('image/')) { message('请选择图片文件'); return; }
        uploading = true; file.disabled = true; message('正在上传图片…');
        try {
          const asset = await opts.upload(image);
          if (!asset?.id || (asset.project_id && asset.project_id !== options.projectId) || (asset.mime && !asset.mime.startsWith('image/'))) throw new Error('上传结果不是当前项目图片');
          opts.assets = [...(opts.assets || []).filter(a => a.id !== asset.id),asset];
          if (alive) { add('image',null,asset.id,targetId); message('图片已上传'); }
        } catch (error) { message(`上传失败：${error.message}`); }
        finally { uploading = false; if (alive) renderSidebar(); }
      });
      file.hidden=true; const upload=button(uploading?'正在上传…':'上传参考图片',()=>file.click(),sidebar);upload.disabled=file.disabled;sidebar.append(file);
      if (!opts.upload) sidebar.append(el('p','','尚未接入上传回调，可使用已有项目素材'));
    }
    function imageUrl(asset) {
      const value = asset.url || `/media/${encodeURIComponent(asset.id)}`;
      // Relative same-origin media or absolute HTTP(S), never active/data URLs.
      return /^\/(?![\/\\])[^\\\x00-\x20]*$/.test(value) || safeLink(value) ? value : '';
    }
    function positionItem(node,item) {
      // 2.5D / 3D 模式：交互层与 Canvas 投影对齐
      if (kind==='lighting' && view.mode==='3d' && globalThis.FrameForgeLightingScene && globalThis.FrameForgeLightingRender) {
        const S=globalThis.FrameForgeLightingScene, R=globalThis.FrameForgeLightingRender;
        const obj=S.migrateItem(item);
        const bounds=R.objectScreenBounds(obj,view.mode,1);
        const b=board();
        const rw=b?.width||1600, rd=b?.height||1000;
        const [cx,cy]=view.mode==='3d'?R.project3d(rw/2,rd/2,0,1,rw,rd):R.project25d(rw/2,rd/2,0,1);
        const ox=rw/2-cx, oy=rd/2-cy;
        Object.assign(node.style,{left:`${bounds.left+ox}px`,top:`${bounds.top+oy}px`,width:`${Math.max(28,bounds.width)}px`,height:`${Math.max(28,bounds.height)}px`,transform:'none'});
        return;
      }
      const lift = kind==='lighting' && view.mode!=='2d' ? Math.min(80,Math.max(0,Number(item.z)||0)*0.12) : 0;
      Object.assign(node.style,{left:`${item.x}px`,top:`${item.y}px`,width:`${item.width}px`,height:`${item.height}px`,transform:`translateY(${-lift}px) rotate(${item.rotation}deg)`});
    }
    function renderCoverage() {
      canvas.querySelector('.ff-boards-coverage')?.remove();
      const b = board(); if (!b || kind !== 'lighting' || !view.coverage) return;
      const overlay = svg('svg',{class:'ff-boards-coverage',viewBox:`0 0 ${b.width} ${b.height}`,width:b.width,height:b.height,'aria-hidden':'true'});
      Object.assign(overlay.style,{position:'absolute',left:'0',top:'0',pointerEvents:'none',overflow:'hidden',zIndex:'0'});
      b.items.filter(i => ['light','softbox'].includes(i.type) && i.show_coverage).forEach(savedItem => {
        const item=drag?.item.id===savedItem.id?drag.item:savedItem;
        const active=item.id===view.selected;
        // 矢量插画风格：光束用半透明实心色块（参考图），强度越高越实；选中时描边加重
        const cone = svg('path',{d:conePath(item),transform:`translate(${item.x+item.width/2} ${item.y+item.height/2}) rotate(${item.rotation})`,fill:'currentColor','fill-opacity':0.10+(item.intensity??60)/100*0.14,stroke:'currentColor','stroke-opacity':active?0.55:0.3,'stroke-width':1,'vector-effect':'non-scaling-stroke'});
        cone.style.color = cctColor(item.temperature);
        overlay.append(cone);
      }); canvas.prepend(overlay);
    }
    // ── Canvas render layer (Unified Three.js WebGL Runtime) ────────────────
    let webglRuntime = null;
    let sceneCanvas = null, sceneCtx = null;
    let splitCanvas = null, splitCtx = null;   // right panel in split mode
    let splitRenderFrame = null;

    if (typeof window !== 'undefined') {
      window.__FF_ON_ASSET_VERIFIED = () => {
        if (alive) renderSidebar();
      };
    }

    function ensureSceneCanvas(parent) {
      parent = parent || canvas;
      if (sceneCanvas?.isConnected && sceneCanvas.parentElement === parent) return;
      if (sceneCanvas) sceneCanvas.remove();
      sceneCanvas = document.createElement('canvas');
      sceneCanvas.className = 'ff-boards-25d-canvas';
      Object.assign(sceneCanvas.style, { position:'absolute', left:'0', top:'0', pointerEvents:'none', zIndex:'0' });
      parent.prepend(sceneCanvas);
      sceneCtx = sceneCanvas.getContext('2d');
    }

    function sizeCanvas(cv, w, h, dpr) {
      if (cv.width !== w * dpr || cv.height !== h * dpr) {
        cv.width = w * dpr; cv.height = h * dpr;
        cv.style.width = w + 'px'; cv.style.height = h + 'px';
      }
    }

    /** 渲染立体视图（3D，或分屏的右栏）。2.5D 等轴模式已于 2026-09-18 移除。 */
    function renderScene3d(targetCanvas, targetCtx, renderMode, parentW, parentH) {
      if (kind !== 'lighting') return;
      // 2D 模式不使用立体渲染。必须在此提前返回并移除 WebGL 画布 ——
      // 否则它会被 prepend 到白色平面图上，把 2D 视图整个盖成深色（scene.background 0x0e1014）。
      if (view.mode === '2d') {
        if (webglRuntime) {
          if (webglRuntime.boardId === board()?.id && webglRuntime.orbit) {
            view.orbit = {...webglRuntime.orbit};
            view.orbitBoardId = webglRuntime.boardId;
          }
          webglRuntime.dispose();
          webglRuntime = null;
        }
        return;
      }
      const b = board(); if (!b) return;
      const R = globalThis.FrameForgeLightingRender;
      if (!R) return;

      if (globalThis.THREE && R.reconcileWebGLRuntime) {
        // 上下文互斥：这块画布若已取过 2D context 就不能再给 WebGL 用，先移除
        if (targetCtx) { targetCtx = null; }
        if (sceneCanvas?.isConnected) { sceneCanvas.remove(); sceneCanvas = null; sceneCtx = null; }
        const parent = targetCanvas?.parentElement || canvas;
        webglRuntime = R.reconcileWebGLRuntime(webglRuntime, parent, b, {
          roomWidth: b.width || 1600,
          roomDepth: b.height || 1000,
          mode: renderMode,
          zoom: view.zoom,
          selectedId: view.selected,
          coverage: view.coverage,
          viewPreset: view.cameraPreset || '3q',
          tool: view.hand ? 'pan' : (view.tool || 'select'),
          onGestureStart() { s.gestures++; },
          onGestureEnd() { s.gestures = Math.max(0, s.gestures - 1); if(s.dirty&&!s.conflict)s.schedule(); },
          onSelect(id) { view.selected = id; renderInspector(); renderToolbar(); webglRuntime?.syncScene(board(), {selectedId:id}); },
          onTransform(id, patch) {
            const b = board(), item = b?.items.find(i => i.id === id);
            if (!item) return;
            s.change(() => {
              const snap = v => view.snap ? Math.round(v / SNAP) * SNAP : v;
              if (patch.x != null) item.x = clamp(snap(patch.x), 0, Math.max(0, b.width - item.width));
              if (patch.y != null) item.y = clamp(snap(patch.y), 0, Math.max(0, b.height - item.height));
              if (patch.rotation != null) item.rotation = ((patch.rotation % 360) + 360) % 360;
            });
          }
        }, view.orbitBoardId === b.id ? view.orbit : null);
        // WebGL 初始化失败（无 WebGL2/上下文被占用等）→ 回退 2D 投影渲染
        if (webglRuntime) return;
        // 回退：2D 画布在上面已被移除，需重新挂载
        if (!targetCanvas?.isConnected) {
          if (targetCanvas === splitCanvas) {
            // split 模式的画布由 renderCanvas() 管理，不在此重建
          } else {
            ensureSceneCanvas(parent || canvas);
            targetCanvas = sceneCanvas; targetCtx = sceneCtx;
          }
        }
      }

      const dpr = window.devicePixelRatio || 1;
      const isSplit = renderMode === 'split' || targetCanvas === splitCanvas;
      const w = parentW || (isSplit ? (splitCanvas?.parentElement?.clientWidth || b.width) : b.width);
      const h = parentH || (isSplit ? (splitCanvas?.parentElement?.clientHeight || b.height) : b.height);
      sizeCanvas(targetCanvas, w, h, dpr);
      if (targetCanvas.getContext) {
        var tctx = targetCtx || targetCanvas.getContext('2d');
        if (tctx) {
          tctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          const scene = globalThis.FrameForgeLightingScene ? globalThis.FrameForgeLightingScene.normalizeScene(b) : b;
          const z = isSplit ? view.zoom : 1;
          R.renderFrame(tctx, scene, { zoom: z, mode: '3d' }, w, h, view.selected);
        }
      }
    }

    /** Add a preset item (V2 subtype) via addPreset(type, subtype) */
    function addPreset(type, subtype, position, targetBoardId) {
      targetBoardId = targetBoardId || view.boardId;
      const target = s.boards.find(b => b.id === targetBoardId && b.kind === kind);
      if (!target) { message('请先新建或选择画板'); return; }
      if (s.boards.reduce((n, b) => n + b.items.length, 0) >= MAX_ITEMS) { message('每个项目最多 500 个元素'); return; }
      const LS = globalThis.FrameForgeLightingScene;
      let item;
      // 未显式指定落点（从对象库点击添加）时按网格错开：
      // 仅 20px 步进会让连续添加的器材叠成一团，看不出摆了什么。
      const explicit = !!(position && (position.x != null || position.y != null));
      // 散布在房间中心 2/3 区域，而不是堆在左上角 —— 3D 相机对着房间中心，
      // 器材都挤在角落会导致视口里只见一角。
      const stagger = n => ({
        x: Math.round(target.width * 0.18) + (n % 3) * Math.round(target.width * 0.22),
        y: Math.round(target.height * 0.22) + Math.floor(n / 3) * Math.round(target.height * 0.26)
      });
      if (LS && LS.createObject) {
        const v2 = LS.createObject(type, subtype, position || {});
        item = LS.demoteItem ? LS.demoteItem(v2) : v2;
        if (!explicit) { const p = stagger(target.items.length); item.x = p.x; item.y = p.y; }
        if (item.x == null) item.x = 80;
        if (item.y == null) item.y = 80;
        if (item.width == null) item.width = 100;
        if (item.height == null) item.height = 100;
        if (item.rotation == null) item.rotation = 0;
      } else {
        // Fallback: map type→v1 and use newItem
        const v1type = type === 'light' ? 'light' : type === 'modifier' ? 'softbox' : type === 'grip' ? 'tripod' : type === 'furniture' ? 'table' : type === 'architecture' ? subtype : 'arrow';
        const p = stagger(target.items.length);
        item = newItem(v1type, p.x, p.y);
      }
      item.x = clamp(view.snap ? Math.round(item.x / SNAP) * SNAP : item.x, 0, target.width - item.width);
      item.y = clamp(view.snap ? Math.round(item.y / SNAP) * SNAP : item.y, 0, target.height - item.height);
      s.change(() => { target.items.push(item); if (view.boardId === targetBoardId) view.selected = item.id; });
    }

    function renderCanvas() {
      if (splitRenderFrame != null) {
        global.cancelAnimationFrame(splitRenderFrame);
        splitRenderFrame = null;
      }
      if (drag || s.gestures) return;
      viewport.querySelector(':scope > .ff-boards-empty-state')?.remove();
      root.dataset.viewMode = view.mode;
      const isSplit = kind === 'lighting' && view.mode === 'split';
      const is25d   = kind === 'lighting' && view.mode === '3d';

      // Split mode: divide workspace into 2D left + 2.5D right
      if (isSplit) {
        canvas.replaceChildren(); sceneCanvas = null; sceneCtx = null; splitCanvas = null; splitCtx = null;
        const b = board();
        const width = b ? b.width : 1600, height = b ? b.height : 1000;
        // Left panel: 2D DOM canvas (interactive)
        const leftPanel = el('div', 'ff-boards-split-left', null, { position:'relative', flex:'1', overflow:'auto', borderRight:'1px solid var(--ff-boards-border,#2a2d35)' });
        const rightPanel = el('div', 'ff-boards-split-right', null, { position:'relative', flex:'1', overflow:'hidden', background:'#0e1014' });
        // Create a wrapper to hold both panels
        const splitWrap = el('div', 'ff-boards-split-wrap', null, { display:'flex', width:'100%', height:'100%', position:'absolute', left:'0', top:'0' });
        splitWrap.append(leftPanel, rightPanel);
        // stage 宽度曾被非分屏分支设为画布实际宽度（如 1600px），
        // splitWrap 继承后会把右栏推出可视区——分屏下 stage 必须收缩回容器尺寸
        Object.assign(stage.style, { width: '100%', height: '100%' });
        stage.replaceChildren(splitWrap);
        // Left: 复用主画布（保留其事件监听器，分屏下 2D 可交互），不要新建无监听的替身
        Object.assign(canvas.style,{position:'relative', width:width+'px', height:height+'px', transform:'scale('+view.zoom+')', backgroundColor:'var(--ff-boards-paper,#fafaf9)', color:'var(--ff-boards-ink,#1e293b)', isolation:'isolate', backgroundImage:view.snap?'radial-gradient(var(--ff-boards-grid,#303030) .7px, transparent .7px)':'none', backgroundSize:SNAP+'px '+SNAP+'px'});
        canvas.style.setProperty('--ff-touch-target-size', `${44 / view.zoom}px`);
        leftPanel.append(canvas);
        // Right: 2.5D Canvas preview
        splitCanvas = document.createElement('canvas');
        splitCanvas.className = 'ff-boards-25d-canvas ff-boards-split-preview';
        Object.assign(splitCanvas.style, { position:'absolute', left:'0', top:'0', width:'100%', height:'100%' });
        rightPanel.append(splitCanvas);
        splitCtx = splitCanvas.getContext('2d');
        // Render left items into the main canvas (reuses existing code path + listeners)
        renderCanvasItems(canvas, b, false);
        // Render right preview
        const scheduledSplitCanvas = splitCanvas;
        splitRenderFrame = global.requestAnimationFrame(() => {
          splitRenderFrame = null;
          if (!alive || view.mode !== 'split' || splitCanvas !== scheduledSplitCanvas || !rightPanel.isConnected) return;
          const rw = rightPanel.clientWidth || width, rh = rightPanel.clientHeight || height;
          renderScene3d(splitCanvas, splitCtx, 'split', rw, rh);
        });
        root.classList.toggle('ff-boards-empty', !b);
        if (!b) {
          canvas.append(el('p','ff-boards-canvas-hint','从左侧对象库开始'));
          rightPanel.append(el('p','ff-boards-canvas-hint', null, {color:'#888', padding:'16px'}));
        }
        return;
      }

      // 非分屏：把主画布归还 stage（分屏分支曾把它移入左栏），并清掉分屏残留
      if (canvas.parentElement !== stage) stage.replaceChildren(canvas);
      else if (stage.querySelector('.ff-boards-split-wrap')) stage.replaceChildren(canvas);
      canvas.replaceChildren(); sceneCanvas = null; sceneCtx = null; splitCanvas = null; splitCtx = null;
      const b = board();
      const width = b ? b.width : 1600, height = b ? b.height : 1000;
      Object.assign(stage.style,{width:(width*view.zoom)+'px',height:(height*view.zoom)+'px'});
      Object.assign(canvas.style,{width:width+'px',height:height+'px',transform:'scale('+view.zoom+')',backgroundImage:view.snap?'radial-gradient(var(--ff-boards-grid, #303030) .7px, transparent .7px)':'none',backgroundSize:SNAP+'px '+SNAP+'px'});
      if (is25d) {
        Object.assign(stage.style, {width:'100%',height:'100%'});
        Object.assign(canvas.style, {width:'100%',height:'100%',transform:'none'});
      }
      if (is25d) canvas.style.backgroundImage = 'none';
      // 供 CSS 反算：图元要按「屏幕像素」恒定尺寸显示，需抵消画布缩放
      canvas.style.setProperty('--ff-zoom', String(view.zoom || 1));
      canvas.style.setProperty('--ff-touch-target-size', `${44 / (view.zoom || 1)}px`);
      root.classList.toggle('ff-boards-empty',!b);
      if (!b) {
        const empty=el('div','ff-boards-empty-state');
        const icon=el('div','ff-boards-empty-icon',null,{});
        icon.innerHTML = kind==='lighting'
          ? '<svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>'
          : '<svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>';
        empty.append(icon);
        empty.append(el('h4','',s.loaded?(kind==='lighting'?'创建第一张灯光平面图':'创建第一张情绪板'):s.loading?'正在载入…':'画板载入失败，请从更多操作重试'));
        if (s.loaded) empty.append(el('p','ff-boards-empty-desc',kind==='lighting'?'在画布上布置场景、灯光与摄影机位置，规划拍摄布光。':'收集参考图片、便签与色卡，为分镜定调。'));
        const create=button('创建第一张画板',createBoard,empty); create.dataset.action='create-board'; create.disabled=!s.loaded||s.loading;
        viewport.append(empty); return;
      }
      if (!b.items.length) canvas.append(el('p','ff-boards-canvas-hint',kind==='lighting'?'从左侧对象库开始':'上传图片或从左侧素材开始'));
      renderCanvasItems(canvas, b, is25d);
      if (kind === 'lighting') {
        ensureSceneCanvas(canvas);
        renderScene3d(sceneCanvas, sceneCtx, view.mode || '3d');
      }
    }

    /** Renders board items as DOM nodes into a target container element */
    function renderCanvasItems(targetEl, b, as25d) {
      if (!b) return;
      renderCoverage();
      b.items.forEach(item => {
        const active = item.id === view.selected;
        const node = el('div','ff-boards-item'+(active?' is-selected':''),null,{position:'absolute',boxSizing:'border-box',touchAction:'none',userSelect:'none',cursor:'move',zIndex:'1',outline:active?'2px solid var(--ff-boards-accent, #2563eb)':'none',outlineOffset:'0',transformOrigin:'center center'});
        node.dataset.itemId=item.id; node.tabIndex=0; node.setAttribute('role','button'); node.setAttribute('aria-label',(item.label || names[item.type] || item.type)+', '+Math.round(item.x)+', '+Math.round(item.y)); node.setAttribute('aria-pressed',String(active));
        positionItem(node,item);
        if (primitivePaths[item.type] || sidePaths[item.type]) {
          if (!as25d) {
            // xMidYMid meet：保持图元比例居中，避免被 item 框拉伸成怪异几何（参考图器材图标均为等比）
            const icon = svg('svg',{viewBox:'0 0 100 100',width:'100%',height:'100%',preserveAspectRatio:'xMidYMid meet','aria-hidden':'true'});
            // Floor-plan symbols always use the top-down footprint.
            icon.append(svg('path',{d:iconPathFor(item) || primitivePaths[item.type],fill:'none',stroke:'currentColor','stroke-width':3,'stroke-linejoin':'round','stroke-linecap':'round'})); node.append(icon);
            // 标签：品名 + 规格两行（矢量插画风格）
            const labelEl = el('span','ff-boards-item-label',null,{position:'absolute',top:'100%',left:'0',whiteSpace:'nowrap',maxWidth:'240px',overflow:'hidden',textOverflow:'ellipsis'});
            labelEl.append(el('span','ff-label-name',item.label || names[item.type] || item.type));
            const spec = itemSpec(item);
            if (spec) labelEl.append(el('span','ff-label-spec',spec));
            node.append(labelEl);
          } else {
            node.style.pointerEvents='none';
            node.style.background='transparent'; node.style.border='none'; node.style.color='transparent';
            if (item.label) node.append(el('span','ff-boards-item-label',item.label,{position:'absolute',bottom:'-4px',left:'50%',transform:'translateX(-50%)',fontSize:'12px',color:'rgba(255,255,255,0.55)',whiteSpace:'nowrap',pointerEvents:'none'}));
          }
        } else if (item.type === 'image') {
          const asset = availableAssets().find(a => a.id === item.asset_id);
          if (asset && imageUrl(asset)) {
            const img = el('img'); img.src=imageUrl(asset); img.alt=item.label || asset.filename || '参考图片'; img.draggable=false;
            Object.assign(img.style,{width:'100%',height:'100%',objectFit:'contain',pointerEvents:'none'});
            img.addEventListener('error',() => { img.replaceWith(el('span','','图片无法载入')); }); node.append(img);
          } else node.append(el('span','','素材已移除或不可用'));
        } else {
          Object.assign(node.style,{overflow:'visible',border:'1px solid var(--ff-boards-border, #cbd5e1)',background:item.color || 'var(--ff-boards-paper, #fafaf9)',color:'var(--ff-boards-ink,#1e293b)'});
          if (item.color) {
            const rgb = item.color.match(/[\da-f]{2}/gi)?.map(v => parseInt(v,16)) || [255,255,255];
            node.style.color = (rgb[0]*299+rgb[1]*587+rgb[2]*114)/1000 > 145 ? '#172033' : '#ffffff';
          }
          const content=el('div','ff-boards-item-content',null,{position:'absolute',inset:'0',boxSizing:'border-box',padding:'12px',overflow:'hidden',pointerEvents:'none',whiteSpace:'pre-wrap',overflowWrap:'anywhere'});
          content.append(el('strong','',item.label));
          if (item.type === 'color') {
            content.append(el('div','ff-boards-color-val',item.color,{fontFamily:'var(--font-mono, monospace)',whiteSpace:'nowrap',wordBreak:'keep-all',letterSpacing:'0.04em'}));
          } else {
            content.append(el('div','',item.type==='note'?item.text:item.url));
          }
          node.append(content);
        }
        node.addEventListener('pointerdown',event => {
          const handle=event.target.closest('.ff-boards-rotate,.ff-boards-resize');
          let mode=handle?.classList.contains('ff-boards-rotate')?'rotate':handle?'resize':'move';
          // At fit-to-screen zoom, a 44px touch target can overlap most of a
          // small object's visible body. A finger landing on that body should
          // still move it; reserve rotate/resize for the visible handle itself
          // or for expanded hit area outside the object.
          if(event.pointerType==='touch'&&handle){
            const itemRect=node.getBoundingClientRect(),handleRect=handle.getBoundingClientRect();
            const inItem=event.clientX>=itemRect.left&&event.clientX<=itemRect.right&&event.clientY>=itemRect.top&&event.clientY<=itemRect.bottom;
            const onVisibleHandle=event.clientX>=handleRect.left&&event.clientX<=handleRect.right&&event.clientY>=handleRect.top&&event.clientY<=handleRect.bottom;
            if(inItem&&!onVisibleHandle)mode='move';
          }
          startGesture(event,item,node,mode);
        });
        node.addEventListener('focus',() => { if (view.selected !== item.id) { view.selected=item.id; markSelection(); renderInspector(); } });
        if (active) {
          const rotate=el('span','ff-boards-rotate','↻'); rotate.title='拖动旋转 · Shift 按 15° 吸附'; node.append(rotate);
          const handle = el('span','ff-boards-resize','',{position:'absolute',right:'2px',bottom:'2px',width:'14px',height:'14px',borderRadius:'3px',background:'var(--ff-boards-accent, #2563eb)',border:'2px solid white',cursor:'nwse-resize',zIndex:'2',boxShadow:'0 1px 3px rgba(0,0,0,0.35)'});
          handle.setAttribute('aria-hidden','true'); node.append(handle);
        }
        canvas.append(node);
      });
    }
    function markSelection() {
      canvas.querySelectorAll('.ff-boards-item').forEach(node => {
        const active = node.dataset.itemId === view.selected;
        node.classList.toggle('is-selected',active); node.setAttribute('aria-pressed',String(active));
        node.style.outline = active?'2px solid var(--ff-boards-accent, #2563eb)':'none';
        node.style.outlineOffset = '0';
      });
      renderCoverage();
    }
    function startGesture(event,item,node,mode) {
      if (event.button !== 0 || view.hand || spaceHeld || drag || s.loading || s.gestures) return;
      event.preventDefault(); event.stopPropagation();
      view.selected=item.id; node.focus({preventScroll:true}); markSelection(); renderInspector();
      const b = board(), rect = canvas.getBoundingClientRect();
      drag = {id:event.pointerId,node,item:clone(item),target:item,mode,before:clone(s.boards),start:point(rect,b.width,b.height,event.clientX,event.clientY),original:clone(item),frame:null};
      s.gestures++; node.setPointerCapture(event.pointerId);
      node.addEventListener('pointermove',moveGesture); node.addEventListener('pointerup',upGesture); node.addEventListener('pointercancel',cancelGesture); node.addEventListener('lostpointercapture',cancelGesture);
      renderToolbar();
    }
    function moveGesture(event) {
      if (!drag || event.pointerId !== drag.id) return;
      const b = board(), p = point(canvas.getBoundingClientRect(),b.width,b.height,event.clientX,event.clientY), d=drag.original;
      const is3d = kind === 'lighting' && view.mode === '3d' && globalThis.FrameForgeLightingRender;
      let dx=p.x-drag.start.x, dy=p.y-drag.start.y;
      if (is3d && drag.mode === 'move') {
        // 立体视图下屏幕位移需要反投影到世界坐标，否则拖动方向会错。
        const [wdx, wdy] = globalThis.FrameForgeLightingRender.unproject25dDelta(dx, dy, view.zoom);
        dx = wdx; dy = wdy;
      }
      const snap = value => view.snap && !event.altKey ? Math.round(value/SNAP)*SNAP : value;
      if (drag.mode==='move') {
        drag.item.x=clamp(snap(d.x+dx),0,b.width-d.width); drag.item.y=clamp(snap(d.y+dy),0,b.height-d.height);
      } else if (drag.mode==='rotate') {
        const cx=d.x+d.width/2,cy=d.y+d.height/2;
        const start=Math.atan2(drag.start.y-cy,drag.start.x-cx);
        let angle=d.rotation+(Math.atan2(p.y-cy,p.x-cx)-start)*180/Math.PI;
        if(event.shiftKey)angle=Math.round(angle/15)*15;
        drag.item.rotation=((angle%360)+360)%360;
      } else {
        // Resize in the rotated local axes, keeping the opposite corner fixed.
        const angle=d.rotation*Math.PI/180, c=Math.cos(angle), sn=Math.sin(angle);
        const width=clamp(snap(d.width+dx*c+dy*sn),16,Math.min(4000,b.width));
        const height=clamp(snap(d.height-dx*sn+dy*c),16,Math.min(4000,b.height));
        const dw=width-d.width, dh=height-d.height;
        Object.assign(drag.item,{width,height,x:clamp(d.x+(c*dw-sn*dh-dw)/2,0,b.width-width),y:clamp(d.y+(sn*dw+c*dh-dh)/2,0,b.height-height)});
      }
      if (drag.frame==null) drag.frame=global.requestAnimationFrame(()=>{
        if(!drag)return; drag.frame=null;
        positionItem(drag.node,drag.item); renderCoverage();
        // Split mode: update right-panel 2.5D preview during drag
        if (kind==='lighting' && view.mode==='split' && splitCanvas && splitCtx) {
          const rp = splitCanvas.parentElement;
          if (rp) renderScene3d(splitCanvas, splitCtx, '3d', rp.clientWidth, rp.clientHeight);
        }
      });
    }
    function finishGesture(cancel=false) {
      if (!drag) return;
      const ended=drag; drag=null; s.gestures--;
      if(ended.frame!=null)global.cancelAnimationFrame(ended.frame);
      ended.node.removeEventListener('pointermove',moveGesture); ended.node.removeEventListener('pointerup',upGesture); ended.node.removeEventListener('pointercancel',cancelGesture); ended.node.removeEventListener('lostpointercapture',cancelGesture);
      if (ended.node.hasPointerCapture(ended.id)) ended.node.releasePointerCapture(ended.id);
      if (!cancel) { Object.assign(ended.target,ended.item); s.record(ended.before,false); }
      if (s.dirty && !s.conflict) s.schedule();
      if (alive) render();
    }
    function upGesture(event) { if (drag?.id === event.pointerId) { moveGesture(event); finishGesture(); } }
    function cancelGesture(event) { if (drag?.id === event.pointerId) finishGesture(true); }
    function renderInspector() {
      inspector.replaceChildren(); const b=board(); if (!b) return;
      if (kind === 'lighting' && b.items.length) {
        select(inspector, '场景对象', [['','未选择'], ...b.items.map(item => [item.id,item.label || names[item.type] || item.type])], view.selected || '', id => {
          view.selected = id || null;
          if (view.mode !== '2d') webglRuntime?.syncScene(b, {selectedId:view.selected});
          markSelection(); renderInspector(); renderToolbar();
        });
      }
      inspector.append(el('h3','ff-boards-panel-title',selected()?'元素属性':'画板设置'));
      if (!selected()) {
        field(inspector,'画板名称',b.name,'text',value => { if (!value.trim()) return message('画板名称不能为空'); s.change(() => { b.name=value; }); },{maxLength:120});
        [['width','画板宽度'],['height','画板高度']].forEach(([key,label])=>field(inspector,label,b[key],'number',value=>{
          if(b.items.some(item=>key==='width'?item.x+item.width>value:item.y+item.height>value))return message('尺寸不能小于现有对象的边界');
          s.change(()=>{b[key]=value;});
        },{min:320,max:10000,step:1}));
      }
      const item=selected();
      if (item) {
        inspector.append(el('h3','',names[item.type] || '元素'));
        field(inspector,'标签',item.label,'text',value => editItem(i => { i.label=value; }),{maxLength:200});
        [['x','X',0,b.width-item.width],['y','Y',0,b.height-item.height],['width','宽度',16,Math.min(4000,b.width-item.x)],['height','高度',16,Math.min(4000,b.height-item.y)],['rotation',item.type==='light'||item.type==='softbox'?'朝向（°，0 向右）':'旋转（°）',-360,360]].forEach(([key,title,min,max]) => field(inspector,title,item[key],'number',value => editItem(i => { i[key]=value; }),{min,max,step:'any'}));
        if (kind === 'lighting') field(inspector,'离地高度（cm）',item.z ?? 0,'number',value => editItem(i => { i.z=value; }),{min:0,max:2000,step:1});
        // 模型替换（酷家乐式「同位置换型号」）：保留位置/旋转，几何与规格按新型号重建
        if (kind === 'lighting') {
          const grp = presetGroupOf(item);
          const LSs = globalThis.FrameForgeLightingScene;
          if (grp && LSs && LSs.getPresets) {
            const list = LSs.getPresets(grp).map(pr => [pr.subtype, pr.zh || pr.name || pr.subtype]);
            if (list.length > 1) {
              select(inspector, '替换型号', list, item.subtype, v => {
                if (v === item.subtype) return;
                const v2 = LSs.createObject(grp, v, { x: item.x, y: item.y });
                const next = LSs.demoteItem ? LSs.demoteItem(v2) : v2;
                editItem(i => {
                  const keep = { id: i.id, x: i.x, y: i.y };
                  Object.keys(i).forEach(k => { delete i[k]; });
                  Object.assign(i, next, keep);
                });
              });
              inspector.append(el('p','ff-boards-notice','替换型号会保留位置与坐标，几何/规格/接口按新型号重建'));
            }
          }
        }
        if (item.type==='note') field(inspector,'便签内容',item.text,'textarea',value => editItem(i => { i.text=value; }),{maxLength:10000,rows:5});
        if (['note','color'].includes(item.type)) field(inspector,'颜色',item.color,'color',value => editItem(i => { i.color=value; }));
        if (item.type==='link') {
          field(inspector,'链接地址（http/https）',item.url,'url',(value,input) => {
            if (!safeLink(value)) { input.setCustomValidity('请输入完整的 http/https 地址，不含空格或登录信息'); input.reportValidity(); input.addEventListener('input',()=>input.setCustomValidity(''),{once:true}); return; }
            editItem(i => { i.url=value; });
          },{maxLength:2048});
          if (safeLink(item.url)) { const a=el('a','','打开参考链接'); a.href=item.url; a.target='_blank'; a.rel='noopener noreferrer'; inspector.append(a); }
        }
        if (item.type==='image') select(inspector,'替换图片素材',availableAssets().map(a=>[a.id,a.filename||a.id]),item.asset_id,id=>editItem(i=>{i.asset_id=id;}));
        if (['light','softbox'].includes(item.type)) {
          inspector.append(el('p','ff-boards-notice','显示 · 非照度/阴影计算'));
          // 附件按灯头接口（mount）过滤：Bowens / Spigot / Junior Pin 可装的附件不同
          const mount = presetMount(item);
          const allowed = allowedAttachments(item);
          const curAtt = allowed.includes(item.attachment) ? item.attachment : 'naked';
          if (item.attachment && !allowed.includes(item.attachment)) {
            inspector.append(el('p','ff-boards-notice',
              `“${attachmentNames[item.attachment] || item.attachment}”与${mount || '该'}灯头接口不兼容，已回退为裸灯`));
          }
          select(inspector, mount ? `灯具附件（${mount} 接口）` : '灯具附件',
            Object.entries(attachmentNames).filter(([k]) => allowed.includes(k)),
            curAtt, value => editItem(i => setAttachment(i, value)));
          field(inspector,'光束展开角（°）',item.beam_spread,'number',value=>editItem(i=>{i.beam_spread=value;i.beam_custom=true;}),{min:5,max:170,step:1});
          field(inspector,'切换附件时保留自定义角度',item.beam_custom,'checkbox',value=>editItem(i=>{i.beam_custom=value;if(!value)i.beam_spread=attachments[i.attachment];}));
          field(inspector,'示意范围（画布单位）',item.beam_length,'number',value=>editItem(i=>{i.beam_length=value;}),{min:20,max:2000,step:10});
          field(inspector,'强度（仅示意 %）',item.intensity,'number',value=>editItem(i=>{i.intensity=value;}),{min:0,max:100,step:1});
          field(inspector,'色温（仅示意 K）',item.temperature,'number',value=>editItem(i=>{i.temperature=value;}),{min:1800,max:12000,step:100});
          field(inspector,'显示此灯覆盖范围',item.show_coverage,'checkbox',value=>editItem(i=>{i.show_coverage=value;}));
          // V8：Aim Tilt（俯仰角）——Aim Pan 复用现有 rotation 字段
          field(inspector,'Aim 俯仰角（°）',item.aim_tilt ?? 0,'number',value=>editItem(i=>{i.aim_tilt=value;}),{min:-90,max:90,step:1});
          // 俯仰快捷：-90 垂直向下 / 0 水平 / +90 垂直向上
          const aimRow = el('div','ff-boards-layer-actions');
          [[-90,'垂直向下 ↓'],[0,'水平 →'],[90,'垂直向上 ↑']].forEach(([deg,label])=>{
            button(label,()=>editItem(i=>{i.aim_tilt=deg;}),aimRow);
          });
          inspector.append(aimRow);
          inspector.append(el('p','ff-boards-notice','俯仰：-90° 垂直向下照射，0° 水平，+90° 垂直向上打顶/反光'));
          // 灯架高度快捷档位（离地高度 z，单位 cm）
          const hRow = el('div','ff-boards-layer-actions');
          [[0,'落地 0'],[60,'低灯位 60'],[180,'常规 180'],[300,'高位 300'],[420,'顶光 420']].forEach(([h,label])=>{
            button(label,()=>editItem(i=>{i.z=h;}),hRow);
          });
          inspector.append(hRow);
        }
        if (item.type==='camera') {
          field(inspector,'焦距（mm）',item.focal_length ?? 35,'number',value=>editItem(i=>{i.focal_length=value;}),{min:8,max:600,step:1});
          field(inspector,'传感器宽度（mm）',item.sensor_width ?? 36,'number',value=>editItem(i=>{i.sensor_width=value;}),{min:10,max:70,step:1});
          // FOV 是计算值，只读显示
          const fov = item.focal_length && item.sensor_width ? Math.round(2*Math.atan(item.sensor_width/(2*item.focal_length))*180/Math.PI*10)/10 : null;
          if (fov != null) inspector.append(el('p','ff-boards-notice',`FOV：${fov}°（由焦距与传感器计算）`));
        }
        if (item.type==='actor') {
          field(inspector,'身高（cm）',item.actor_height ?? 170,'number',value=>editItem(i=>{i.actor_height=value;}),{min:100,max:220,step:1});
          field(inspector,'朝向（°，0 向右）',item.actor_facing ?? 0,'number',value=>editItem(i=>{i.actor_facing=value;}),{min:-180,max:180,step:1});
        }
        const actions=el('div','',null,{display:'flex',gap:'8px',margin:'12px 0'}); inspector.append(actions);
        button('复制元素',duplicate,actions); button('删除元素',remove,actions);
        const layers=el('div','ff-boards-layer-actions');inspector.append(layers);
        const moveLayer=direction=>s.change(()=>{const index=b.items.indexOf(item),target=clamp(index+direction,0,b.items.length-1);if(index===target)return;b.items.splice(index,1);b.items.splice(target,0,item);});
        button('下移一层',()=>moveLayer(-1),layers).disabled=b.items.indexOf(item)===0;
        button('上移一层',()=>moveLayer(1),layers).disabled=b.items.indexOf(item)===b.items.length-1;
      }
      const links=el('fieldset','ff-boards-shots',null,{marginTop:'16px'}); links.append(el('legend','','关联分镜（可多选）'));
      (opts.shots || []).filter(shot=>!shot.is_deleted && (!shot.project_id || shot.project_id===options.projectId)).forEach(shot=>{
        const row=el('div','',null,{display:'flex',alignItems:'center',gap:'8px'}), label=`${shot.number || ''} ${shot.title || shot.id}`.trim();
        field(row,label,b.shot_ids.includes(shot.id),'checkbox',checked=>{
          if (checked && b.shot_ids.length>=1000) return message('每张画板最多关联 1000 个分镜');
          s.change(()=>{b.shot_ids=checked?[...b.shot_ids,shot.id]:b.shot_ids.filter(id=>id!==shot.id);});
        });
        const jump=button('跳转',()=>opts.onShot?.(shot.id),row); jump.setAttribute('aria-label',`跳转分镜 ${label}`); jump.disabled=!opts.onShot;
        links.append(row);
      });
      if (!(opts.shots || []).length) links.append(el('p','','项目还没有分镜')); inspector.append(links);
    }
    function render() {
      if (!alive) return;
      if (!board()) view.boardId=s.boards.find(b=>b.kind===kind)?.id || null;
      if (!selected()) view.selected=null;
      announce(); renderSidebar(); renderCanvas(); renderInspector();
    }
    canvas.addEventListener('pointerdown',event=>{if(event.target===canvas){view.selected=null;renderCanvas();renderInspector();}});
    const disposeNavigation = global.FrameForgeBoardNavigation.bindViewportNavigation({
      viewport, view, board, planViewport, zoomPlan,
      isItemDragging: () => Boolean(drag),
      cancelItemGesture: () => finishGesture(true),
      isSpaceHeld: () => spaceHeld
    });
    canvas.addEventListener('dragover',event=>{if(event.dataTransfer.types.includes('application/x-frameforge-board')){event.preventDefault();event.dataTransfer.dropEffect='copy';}});
    canvas.addEventListener('drop',event=>{
      event.preventDefault(); const b=board(); if(!b)return;
      try { const data=JSON.parse(event.dataTransfer.getData('application/x-frameforge-board'));
        const pos=point(canvas.getBoundingClientRect(),b.width,b.height,event.clientX,event.clientY);
        // Support both V1 type drops and V2 {type,subtype} drops from preset palette
        if (data.subtype && globalThis.FrameForgeLightingScene) {
          addPreset(data.type, data.subtype, pos);
        } else if ((kind==='lighting'?Object.keys(primitivePaths):['note','color','link']).includes(data.type)) {
          add(data.type, pos);
        }
      } catch (_) { message('无法读取拖放内容'); }
    });
    const saveShortcut = async event => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 's') return;
      const target = event.target;
      if (!root.isConnected || (target !== document.body && target !== document.documentElement && !root.contains(target))) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.repeat) return;
      // Board fields normally commit on change/blur. Include the focused value
      // before taking the snapshot, using the field's existing validation path.
      if (root.contains(target) && target.matches?.('input,textarea,select')) {
        const label = target.getAttribute('aria-label');
        const selection = typeof target.selectionStart === 'number'
          ? [target.selectionStart, target.selectionEnd, target.selectionDirection] : null;
        target.dispatchEvent(new Event('change', {bubbles:true}));
        if (target.isConnected && !target.checkValidity()) return;
        const replacement = label && [...root.querySelectorAll('input,textarea,select')]
          .find(node => node.getAttribute('aria-label') === label);
        if (replacement && replacement !== target) {
          replacement.focus({preventScroll:true});
          if (selection && typeof replacement.setSelectionRange === 'function') {
            replacement.setSelectionRange(...selection);
          }
        }
      }
      if (drag) finishGesture();
      if (!uploading) await s.flush();
    };
    // Capture also handles a canvas click that left focus on body, and stops
    // the workspace-level Shot shortcut from running for a Board save.
    global.addEventListener('keydown', saveShortcut, true);
    root.addEventListener('keydown',event=>{
      if (event.target.closest('input,textarea,select,[contenteditable="true"]')) return;
      if (event.key==='Escape' && drag) {event.preventDefault();finishGesture(true);return;}
      const mod=event.ctrlKey||event.metaKey,key=event.key.toLowerCase();
      if (!mod && kind==='lighting' && view.mode!=='2d' && ['v','g','r','h','f'].includes(key)) {
        event.preventDefault();
        if(key==='f')webglRuntime?.focusSelected();
        else {view.hand=key==='h';view.tool={v:'select',g:'move',r:'rotate',h:'pan'}[key];renderToolbar();}
      }
      else if (event.code === 'Space') { event.preventDefault(); spaceHeld = true; viewport.classList.add('is-hand'); }
      else if (!mod && ['+','=','-','0'].includes(key)) { event.preventDefault(); if(key==='0')fitBoard();else zoomPlan(view.zoom * (key==='-' ? .8 : 1.25)); }
      else if(mod&&key==='z'){event.preventDefault();s.travel(event.shiftKey);}
      else if(mod&&key==='y'){event.preventDefault();s.travel(true);}
      else if(mod&&key==='d'){event.preventDefault();duplicate();}
      else if(selected()&&(event.key==='Delete'||event.key==='Backspace')){event.preventDefault();remove();}
      else if(selected()&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){
        event.preventDefault();const step=event.shiftKey?20:view.snap?SNAP:1;
        editItem(i=>{i.x=clamp(i.x+(event.key==='ArrowLeft'?-step:event.key==='ArrowRight'?step:0),0,board().width-i.width);i.y=clamp(i.y+(event.key==='ArrowUp'?-step:event.key==='ArrowDown'?step:0),0,board().height-i.height);});
        canvas.focus({preventScroll:true});
      }
    });
    const releaseSpace = () => { spaceHeld = false; viewport.classList.toggle('is-hand', Boolean(view.hand)); };
    root.addEventListener('keyup', event => { if(event.code==='Space') releaseSpace(); });
    global.addEventListener('blur', releaseSpace);
    const listener=full=>{if(!alive)return;if(full&&!drag)render();else announce();};s.listeners.add(listener);
    const beforeUnload=event=>{if(s.dirty||drag||uploading){event.preventDefault();event.returnValue='';}};
    global.addEventListener('beforeunload',beforeUnload);
    function cleanup() {
      if(!alive)return;
      if(drag)finishGesture();
      if(splitRenderFrame!=null)global.cancelAnimationFrame(splitRenderFrame);
      splitRenderFrame=null; alive=false;s.listeners.delete(listener);global.removeEventListener('beforeunload',beforeUnload);
      global.removeEventListener('blur', releaseSpace);
      global.removeEventListener('keydown', saveShortcut, true);
      disposeNavigation();
      webglRuntime?.dispose(); webglRuntime = null;
      if(mounts.get(container)?.cleanup===cleanup)mounts.delete(container);
      root.remove(); if(s.dirty&&!s.conflict)s.flush();
    }
    cleanup.flush=()=>{if(drag)finishGesture();return uploading?Promise.resolve(false):s.flush();};
    cleanup.getDraft=()=>s.snapshot();
    // 让调用方在放弃未保存草稿前先把草稿交还给用户，避免保存失败时数据静默丢失。
    cleanup.exportDraft=()=>alive ? exportDraft() : false;
    mounts.set(container,{projectId:options.projectId,kind,cleanup,update(next){opts={...opts,...next};s.api=next.api;if(!root.isConnected)container.replaceChildren(root);/* Keep focused controls/gestures intact on parent renders. */ if(!root.contains(document.activeElement)&&!drag){renderSidebar();renderInspector();renderCanvas();}}});
    render(); if(!s.loaded&&!s.loading)s.load(); return cleanup;
  }
  global.FrameForgeBoards = Object.freeze({mount, primitives:Object.freeze(Object.keys(primitivePaths)),
    // Pure model helpers also support deterministic non-browser regression tests.
    model:Object.freeze({point,safeLink,setAttachment,conePath,newItem,createSession,
      createMoodboardRecord,createLightingBoardRecord,serializeBoardForSave,serializeMoodboardItem})});
})(globalThis);
