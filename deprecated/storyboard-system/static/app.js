/* ==========================================================================
   FRAMEFORGE V4.7 · APPLICATION CORE ENGINE
   Satoshi Typography × Notion Information Hierarchy × Cinematography Core
   ========================================================================== */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// --------------------------------------------------------------------------
// 1. CONSTANTS & APPLICATION STATE
// --------------------------------------------------------------------------
const VIEW = {
  TABLE: 'table',
  CARDS: 'cards',
  WALL: 'wall',
  TIMELINE: 'timeline',
  METHOD: 'method_groups',
  ASSETS: 'assets',
  MOODBOARD: 'moodboard',
  LIGHTING: 'lighting',
  VOICEOVER: 'script',
  REVIEW: 'review',
  DELIVERABLES: 'deliverables',
  OVERVIEW: 'overview',
  HUB: 'hub'
};

const APP_CONTEXT = {
  HUB: 'hub',
  PROJECT: 'project'
};

const VIEW_TITLES = {
  [VIEW.TABLE]: '镜头制作表',
  [VIEW.CARDS]: '分镜卡片板',
  [VIEW.WALL]: '分镜视觉墙',
  [VIEW.TIMELINE]: '规划时间线',
  [VIEW.METHOD]: '制作方式分组',
  [VIEW.ASSETS]: '素材资产库',
  [VIEW.MOODBOARD]: '情绪板',
  [VIEW.LIGHTING]: '灯光平面图',
  [VIEW.VOICEOVER]: '旁白与对齐',
  [VIEW.REVIEW]: '审片与版本',
  [VIEW.DELIVERABLES]: '交付与导出',
  [VIEW.OVERVIEW]: '制作概览',
  [VIEW.HUB]: '项目管理大厅'
};

const TYPE_NAMES = {
  promo: '宣传片',
  tvc: 'TVC 广告',
  film: '电影 / 剧情',
  documentary: '纪录片',
  mg: 'MG 动画',
  '3d_vfx': '3D / VFX 视效',
  custom: '自定义项目'
};

const STATUS_LABELS = {
  'Draft': '草稿',
  'WIP': '制作中',
  'Ready for Review': '已提审',
  'Changes Requested': '待修改',
  'Approved': '已批准',
  'Locked': '已锁定',
  'Deprecated': '已弃用'
};

const SHOT_FIELD_PRESETS = {
  script_scene_type: { label: '内外景', values: ['INT.', 'EXT.', 'INT./EXT.'] },
  script_time_of_day: { label: '日夜', values: ['DAY', 'NIGHT', 'DAWN', 'DUSK', 'CONTINUOUS', 'LATER'] },
  script_parenthetical: { label: '表演提示', values: ['低声', '停顿', '笑着', '对电话', 'whispering', 'beat', 'into phone'] },
  transition: { label: '转场', values: ['CUT TO:', 'DISSOLVE TO:', 'FADE TO:', 'FADE OUT.'] },
  shot_size: {
    label: '景别',
    values: ['大远景', '远景', '大全景', '全景', '中全景', '中景', '中近景', '近景', '特写', '大特写', '微距']
  },
  lens: {
    label: '焦段',
    values: ['14mm', '18mm', '21mm', '24mm', '28mm', '35mm', '50mm', '65mm', '85mm', '100mm', '135mm', '200mm', '变焦镜头']
  },
  movement: {
    label: '运镜',
    values: ['固定', '推镜', '拉镜', '摇镜', '横移', '跟拍', '升镜', '降镜', '环绕', '甩镜', '手持', '斯坦尼康', '轨道', '航拍', '变焦', '一镜到底']
  },
  angle: {
    label: '机位角度',
    values: ['平视', '高机位', '低机位', '俯拍', '仰拍', '顶拍', '鸟瞰', '荷兰角', '过肩', '主观镜头']
  },
  status: {
    label: '状态',
    values: ['Draft', 'WIP', 'Ready for Review', 'Changes Requested', 'Approved', 'Locked', 'Deprecated']
  }
};

const SHOT_SIZE_LENS_RECOMMENDATIONS = {
  '大远景': '24mm', '远景': '28mm', '大全景': '24mm', '全景': '35mm',
  '中全景': '35mm', '中景': '50mm', '中近景': '50mm', '近景': '85mm',
  '特写': '85mm', '大特写': '100mm', '微距': '100mm'
};

function applyShotFieldMutation(shot, field, value, { source = 'ui', explicitLens = false } = {}) {
  if (!shot) return shot;
  shot[field] = value;

  if (field === 'shot_size') {
    const recommended = SHOT_SIZE_LENS_RECOMMENDATIONS[value];
    if (recommended && !explicitLens) {
      shot.lens = recommended;
      shot.lens_source = 'auto-shot-size';
    }
  }

  if (field === 'lens') {
    shot.lens_source = source === 'auto-shot-size' ? 'auto-shot-size' : 'manual';
  }

  return shot;
}
window.applyShotFieldMutation = applyShotFieldMutation;

const MODE_VISIBILITY = {
  always: [
    'number', 'thumb', 'tc', 'duration', 'title',
    'shot_size', 'lens', 'movement', 'angle',
    'description', 'voiceover', 'primary_method', 'status',
    'comments', 'modifiedBy', 'previousVersion', 'review'
  ],
  cinematographyOptional: [
    'height', 'equipment', 'sensor', 'aperture', 'shutter'
  ],
  professionalOnly: [
    'department', 'owner', 'secondaryMethods', 'productionSteps',
    'stockRightsAdvanced', 'deliveryAdvanced', 'presenceAdvanced'
  ]
};

const state = {
  session: null,
  csrf: '',
  projects: [],
  projectBundleCache: new Map(),
  bundle: null,
  context: APP_CONTEXT.HUB,
  view: { current: VIEW.TABLE },
  selection: {
    activeShotId: null,
    selectedShotIds: new Set(),
    anchorShotId: null
  },
  get activeShotId() { return this.selection?.activeShotId ?? null; },
  set activeShotId(id) { if (this.selection) this.selection.activeShotId = id; },
  inspector: { open: false, targetShotId: null },
  uiMode: 'unified',
  dirty: false,
  shareToken: null,
  undoStack: [],
  redoStack: [],
  historyForceFields: new Map(),
  historyDeletedShots: new Map(),
  // Animatic Player
  isPlaying: false,
  playIndex: 0,
  playTimer: null,
  timelineGroupMode: 'chapter',
  timelineAutoPart: true,
  mediaCache: new Map(),
  pendingUploads: 0,
  // Filter settings
  filterMethod: 'ALL',
  filterStatus: 'ALL',
  filterDept: 'ALL',
  searchQuery: '',
  projectSearchQuery: '',
  shareViewToken: null,
  searchResults: [],
  searchActiveIndex: -1,
  searchTimer: null,
  tablePrefs: { widths: {}, hidden: [], archived: [], purged: [], order: [], sort: null, wrap: {}, rowHeight: 'standard' },
  autoSaveTimer: null,
  saveInFlight: false,
  saveQueued: false,
  saveStartedAt: null,
  lastSaveAttemptAt: null,
  lastSaveCompletedAt: null,
  currentSaveToken: 0,
  saveAbortController: null,
  wakeRecoveryCount: 0,
  changeVersion: 0,
  saveRefreshInFlight: false,
  networkHealth: 'online',
  networkFailureCount: 0,
  lastSaveError: null,
  localDraftError: null,
  autoSaveRetryAttempt: 0,
  importWizard: null,
  timingDraft: null,
  narrationSpeed: 1,
  insertAnchorShotId: null,
  presence: [],
  presenceProjectId: null,
  presencePointer: { x: null, y: null, visible: false, module: '' },
  presencePollTimer: null,
  presenceHeartbeatTimer: null,
  projectSyncTimer: null,
  lastServerUpdatedAt: '',
  remoteRefreshInFlight: false,
  remoteRefreshStartedAt: null,
  presenceSendTimer: null,
  presenceSendInFlight: false,
  presencePollInFlight: false,
  presencePollStartedAt: null,
  presenceLastSentAt: 0
};
window.state = state;
let saveRequestToken = 0;
let reviewStatusInFlight = false;

const PRODUCTION_METHODS = [
  ['LIVE', 'LIVE 实拍'], ['STOCK', 'STOCK 素材'], ['CLIENT', 'CLIENT 甲方提供'],
  ['ARCHIVE', 'ARCHIVE 档案'], ['STILL', 'STILL 静帧'], ['AE', 'AE'],
  ['MG', 'MG 动画'], ['3D', '3D'], ['VFX', 'VFX'], ['TYPE', 'TYPE 字幕 / 排版']
];
const STEP_TYPE_OPTIONS = [['TASK', '任务'], ['REVIEW', '审核'], ['DELIVERY', '交付'], ['DEPENDENCY', '依赖'], ['MILESTONE', '里程碑']];
const STEP_DEPARTMENT_OPTIONS = [['', '未指定'], ['Director', '导演'], ['Camera', '摄影'], ['Production', '制片'], ['Art', '美术'], ['Editorial', '剪辑'], ['Motion', '动效'], ['MG', 'MG'], ['3D', '三维'], ['VFX', '视效'], ['Sound', '声音'], ['Color', '调色'], ['Legal', '法务']];
const stepTypeLabel = value => STEP_TYPE_OPTIONS.find(item => item[0] === value)?.[1] || value || '任务';
const stepDepartmentLabel = value => STEP_DEPARTMENT_OPTIONS.find(item => item[0] === value)?.[1] || value || '未指定';

// Keep a compact per-shot server baseline. Saves then send only fields this
// client actually changed, allowing two collaborators to edit different
// fields without one full-bundle PUT erasing the other person's work.
const COLLAB_SYNC_FIELDS = ['number', 'title', 'chapter', 'scene', 'panel_frame', 'camera_fps', 'description', 'action', 'performance', 'composition', 'director_notes', 'notes', 'duration_frames', 'locked', 'shot_size', 'lens', 'angle', 'height', 'movement', 'equipment', 'sensor', 'aperture', 'shutter', 'voiceover', 'dialogue', 'subtitle', 'music', 'sound', 'primary_method', 'secondary_methods', 'department', 'owner', 'status', 'transition', 'method_data_json', 'is_deleted'];
COLLAB_SYNC_FIELDS.push('lens_source', 'rich_text_json', 'script_character', 'script_parenthetical', 'script_scene_type', 'script_time_of_day');
function adoptServerBundle(bundle) {
  if (!bundle?.shots) return bundle;
  bundle.shots.forEach(shot => {
    shot._syncBaseline = Object.fromEntries(COLLAB_SYNC_FIELDS.map(field => [field, structuredClone(shot[field])]));
    shot._syncBaseline.revision = shot.revision || 1;
    shot._syncBaseline.custom_fields = structuredClone(shot.custom_fields || {});
    shot._syncBaseline.panels = structuredClone(shot.panels || []);
    shot._syncBaseline.import_columns = structuredClone(shot.import_columns || {});
  });
  return bundle;
}
function prepareCollaborativeShots(bundle) {
  const payload = (bundle?.shots || []).map(shot => {
    const baseline = shot._syncBaseline || {};
    const forced = state.historyForceFields?.get(shot.id) || new Set();
    const changedFields = COLLAB_SYNC_FIELDS.filter(field => JSON.stringify(shot[field]) !== JSON.stringify(baseline[field]));
    COLLAB_SYNC_FIELDS.forEach(field => {
      if (forced.has(field) && !changedFields.includes(field)) changedFields.push(field);
    });
    const clean = { ...shot, base_revision: baseline.revision || shot.revision || 1, changed_fields: changedFields };
    if (forced.has('custom_fields') || JSON.stringify(shot.custom_fields || {}) !== JSON.stringify(baseline.custom_fields || {})) {
      if (!clean.changed_fields.includes('custom_fields')) clean.changed_fields.push('custom_fields');
    }
    if (forced.has('panels') || JSON.stringify(shot.panels || []) !== JSON.stringify(baseline.panels || [])) {
      if (!clean.changed_fields.includes('panels')) clean.changed_fields.push('panels');
    }
    if (forced.has('import_columns_json') || JSON.stringify(shot.import_columns || {}) !== JSON.stringify(baseline.import_columns || {})) {
      if (!clean.changed_fields.includes('import_columns_json')) clean.changed_fields.push('import_columns_json');
      clean.import_columns_json = shot.import_columns || {};
    }
    delete clean._syncBaseline;
    return clean;
  });
  const currentIds = new Set((bundle?.shots || []).map(shot => shot.id));
  (state.historyDeletedShots ? [...state.historyDeletedShots.values()] : []).forEach(shot => {
    if (currentIds.has(shot.id)) return;
    const baseline = shot._syncBaseline || {};
    payload.push({
      ...shot,
      is_deleted: true,
      base_revision: baseline.revision || shot.revision || 1,
      changed_fields: ['is_deleted'],
    });
  });
  return payload;
}
window.prepareCollaborativeShots = prepareCollaborativeShots;

const TABLE_COLUMNS = {
  select: [38, 38, 38], number: [64, 64, 120], thumb: [82, 82, 240], tc: [100, 100, 180],
  duration: [62, 64, 120], title: [130, 120, 420], chapter: [180, 180, 420], scene: [120, 120, 320], panel_frame: [120, 120, 300], shot_size: [76, 64, 180], lens: [68, 64, 180],
  movement: [84, 72, 220], angle: [76, 64, 200], description: [240, 180, 720], voiceover: [240, 180, 720],
  methods: [110, 100, 260], status: [90, 90, 180], department: [100, 90, 220], actions: [74, 74, 140]
};

// Column resizing is free-form. Tuple minima are legacy layout hints, not
// resize stops; retain only a tiny recovery width for the drag handle.
const COLUMN_RESIZE_FLOOR = 1;

function clampColumnWidth(value, definition) {
  const maximum = Number(definition?.[2]) || 720;
  return Math.max(COLUMN_RESIZE_FLOOR, Math.min(maximum, Math.round(Number(value) || COLUMN_RESIZE_FLOOR)));
}

const TABLE_COLUMN_LABELS = {
  select: '选择', number: '镜头', thumb: '分镜画面', tc: '时码 TC', duration: '时长', title: '镜头标题',
  chapter: '篇章', scene: '场景/地点', panel_frame: '分镜图框', shot_size: '景别', lens: '焦段', movement: '运镜',
  angle: '机位角度', description: '画面描述', voiceover: '对应旁白', methods: '制作方式', status: '状态',
  department: '责任部门', actions: '操作'
};

const SCRIPT_COLUMNS = {script_scene_type:'内外景', script_time_of_day:'日夜', script_character:'对白角色', script_parenthetical:'表演提示', dialogue:'对白', transition:'转场'};
Object.assign(TABLE_COLUMN_LABELS, SCRIPT_COLUMNS);
for (const field of Object.keys(SCRIPT_COLUMNS)) TABLE_COLUMNS[field] = [100, 120, 420];
const RICH_TEXT_FIELDS = new Set(['title','scene','description','voiceover','action','performance','composition','director_notes','notes','dialogue','subtitle','music','sound']);
function formattedShotField(shot, field, empty = '—', strict = false) {
  const plain = String(shot?.[field] || '');
  return plain ? FrameForgeRichText.html(shot?.rich_text_json?.[field], plain, strict) : escapeHtml(empty);
}
/**
 * --------------------------------------------------------------------------
 * MULTIPLAYER RELIABILITY & ACTIVE EDITOR INFRASTRUCTURE
 * --------------------------------------------------------------------------
 */
async function waitUntil(
  predicate,
  { timeout = 5000, interval = 25, errorMessage = '等待操作完成超时' } = {}
) {
  const startedAt = performance.now();
  while (true) {
    if (predicate()) return true;
    if (performance.now() - startedAt >= timeout) {
      throw new Error(errorMessage);
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
}

const activeEditorRegistry = new Map();
window.activeEditorRegistry = activeEditorRegistry;
let editorSessionCounter = 0;

function nextEditorSessionId(type = 'editor') {
  editorSessionCounter += 1;
  return `${type}-${Date.now()}-${editorSessionCounter}`;
}

function registerActiveEditor(session) {
  if (!session?.id) throw new Error('Editor session requires id');
  activeEditorRegistry.set(session.id, session);
  refreshSaveStatus();
  queuePresenceHeartbeat(true);
  return session;
}

function unregisterActiveEditor(sessionOrId) {
  const id = typeof sessionOrId === 'string' ? sessionOrId : sessionOrId?.id;
  if (!id) return;
  activeEditorRegistry.delete(id);
  refreshSaveStatus();
  queuePresenceHeartbeat(true);
}

function activeEditorsForCurrentProject() {
  const projectId = String(state.bundle?.project?.id || '');
  return [...activeEditorRegistry.values()].filter(
    session => String(session.projectId || '') === projectId && !session.closed
  );
}

function hasDirtyActiveEditor() {
  return activeEditorsForCurrentProject().some(session =>
    typeof session.isDirty === 'function' ? session.isDirty() : Boolean(session.isDirty)
  );
}

async function flushActiveEditors({ timeout = 5000 } = {}) {
  const projectId = state.bundle?.project?.id;
  if (!projectId) return true;

  const flush = async () => {
    const sessions = activeEditorsForCurrentProject();
    for (const session of sessions) {
      if (session.closed) continue;
      if (typeof session.waitForCompositionEnd === 'function') {
        await session.waitForCompositionEnd();
      }
      if (typeof session.commit === 'function') {
        await session.commit({ reason: 'flush' });
      }
    }
  };

  try {
    await Promise.race([
      flush(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('当前编辑仍在提交')), timeout))
    ]);

    await waitUntil(
      () => !activeEditorsForCurrentProject().some(session => session.composing || session.commitInFlight),
      { timeout, interval: 25, errorMessage: '当前文本仍在提交' }
    );
    return true;
  } catch (error) {
    toast('当前文本仍在提交，本地内容已保留，请稍后重试', true);
    return false;
  }
}

function editorDraftKey(projectId, shotId, field) {
  return ['frameforge-editor-draft', projectId, shotId, field].join(':');
}

const editorDraftTimers = new Map();
const pendingEditorDrafts = new Map();
window.pendingEditorDrafts = pendingEditorDrafts;

function scheduleEditorDraft({ projectId, shotId, field, text, runs, baseRevision }) {
  if (!projectId || !shotId || !field) return;
  const key = editorDraftKey(projectId, shotId, field);
  const payload = {
    version: 1,
    savedAt: Date.now(),
    projectId,
    shotId,
    field,
    text: String(text ?? ''),
    runs: Array.isArray(runs) ? runs : undefined,
    baseRevision: baseRevision || undefined
  };
  pendingEditorDrafts.set(key, payload);

  clearTimeout(editorDraftTimers.get(key));
  editorDraftTimers.set(
    key,
    setTimeout(() => {
      editorDraftTimers.delete(key);
      try {
        localStorage.setItem(key, JSON.stringify(payload));
        // Successful write clears any prior localDraftError
        if (state.localDraftError) {
          state.localDraftError = null;
          refreshSaveStatus();
        }
      } catch (draftErr) {
        // Keep pendingEditorDrafts entry — do NOT delete key or payload
        // Re-insert timer so retry will be attempted on next schedule
        state.localDraftError = draftErr;
        refreshSaveStatus();
        console.warn?.('[draft] localStorage persistence failed', { key, error: draftErr });
      }
    }, 350)
  );
}

function flushAllPendingEditorDraftsSync() {
  for (const [key, payload] of pendingEditorDrafts.entries()) {
    clearTimeout(editorDraftTimers.get(key));
    editorDraftTimers.delete(key);
    try {
      localStorage.setItem(key, JSON.stringify(payload));
      if (state.localDraftError) {
        state.localDraftError = null;
        refreshSaveStatus();
      }
    } catch (draftErr) {
      // Keep pendingEditorDrafts entry — do NOT delete
      state.localDraftError = draftErr;
      console.warn?.('[draft] flush persistence failed', { key, error: draftErr });
    }
  }
}
window.flushAllPendingEditorDraftsSync = flushAllPendingEditorDraftsSync;

function clearEditorDraft(projectId, shotId, field) {
  const key = editorDraftKey(projectId, shotId, field);
  clearTimeout(editorDraftTimers.get(key));
  editorDraftTimers.delete(key);
  pendingEditorDrafts.delete(key);
  try { localStorage.removeItem(key); } catch (_) {}
}

function isDraftAcknowledged(draft, shot) {
  if (!draft || !shot) return false;
  const field = draft.field;
  const acknowledgedText = String(shot[field] ?? '');
  const draftText = String(draft.text ?? '');
  if (acknowledgedText !== draftText) return false;
  if (draft.runs !== undefined) {
    const ackRuns = shot.rich_text_json?.[field] || [];
    return JSON.stringify(ackRuns) === JSON.stringify(draft.runs);
  }
  return true;
}

function clearAcknowledgedEditorDrafts(projectId, savedBundle) {
  if (!projectId || !savedBundle?.shots) return;
  const prefix = `frameforge-editor-draft:${projectId}:`;

  // 1. Check in-memory pendingEditorDrafts
  for (const [key, pendingPayload] of pendingEditorDrafts.entries()) {
    if (!key.startsWith(prefix)) continue;
    const shot = savedBundle.shots.find(s => s.id === pendingPayload.shotId);
    if (shot && isDraftAcknowledged(pendingPayload, shot)) {
      clearTimeout(editorDraftTimers.get(key));
      editorDraftTimers.delete(key);
      pendingEditorDrafts.delete(key);
      try { localStorage.removeItem(key); } catch (_) {}
    }
  }

  // 2. Check persisted localStorage drafts
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(prefix)) continue;
    try {
      const pending = pendingEditorDrafts.get(key);
      if (pending) {
        const shot = savedBundle.shots.find(s => s.id === pending.shotId);
        if (!shot || !isDraftAcknowledged(pending, shot)) {
          continue;
        }
      }
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const draft = JSON.parse(raw);
      const shot = savedBundle.shots.find(s => s.id === draft.shotId);
      if (shot && isDraftAcknowledged(draft, shot)) {
        clearTimeout(editorDraftTimers.get(key));
        editorDraftTimers.delete(key);
        pendingEditorDrafts.delete(key);
        localStorage.removeItem(key);
        i--;
      }
    } catch (_) {}
  }
}

let projectDraftTimer = null;
function scheduleProjectDraft() {
  clearTimeout(projectDraftTimer);
  projectDraftTimer = setTimeout(() => {
    projectDraftTimer = null;
    const projectId = state.bundle?.project?.id;
    if (!projectId) return;
    try {
      localStorage.setItem(
        `frameforge-draft:${projectId}`,
        JSON.stringify({
          savedAt: Date.now(),
          shots: state.bundle.shots
        })
      );
    } catch (_) {}
  }, 750);
}

const RESERVATION_SOFT_TIMEOUT = 1000;
const RESERVATION_RENEW_MS = 9000;
const RESERVATION_RETRY_DELAYS = [2000, 4000, 8000, 15000, 30000];

const reservationSessions = new Map();
let reservationSerial = 0;

function reservationKey(shotId, field) {
  return `${shotId}:${field}`;
}

function retryDelay(attempt) {
  const base = RESERVATION_RETRY_DELAYS[Math.min(attempt, RESERVATION_RETRY_DELAYS.length - 1)];
  const jitter = 0.85 + Math.random() * 0.3;
  return Math.round(base * jitter);
}

function updateReservationUI(session) {
  if (!session) return;
  const elements = document.querySelectorAll(`[data-field="${CSS.escape(session.field)}"], [data-card-copy="${CSS.escape(session.field)}"]`);
  elements.forEach(el => {
    const hostShotId = el.closest('[data-id], [data-shot-id]')?.dataset.id || el.closest('[data-shot-id]')?.dataset.shotId;
    if (!hostShotId || hostShotId === session.shotId) {
      el.dataset.reservationState = session.state;
      if (session.state === 'contended') {
        el.title = `${session.holder || '其他协作者'}也在编辑，保存时将检查冲突`;
      } else if (session.state === 'degraded') {
        el.title = '协作状态延迟，本地修改已保留';
      } else if (session.state === 'offline') {
        el.title = '当前离线，本地修改已保留';
      } else {
        el.removeAttribute('title');
      }
    }
  });
}

function createSoftReservationSession(shotId, field) {
  reservationSerial += 1;
  const id = `reservation-${Date.now()}-${reservationSerial}`;
  const session = {
    id,
    shotId,
    field,
    state: 'pending',
    holder: null,
    released: false,
    renewTimer: null,
    degradeTimer: null,
    retryTimer: null,
    retryAttempt: 0,
    release: null
  };

  reservationSessions.set(reservationKey(shotId, field), session);
  session.release = () => releaseSoftReservation(session);
  acquireSoftReservation(session);
  return session;
}

async function acquireSoftReservation(session) {
  if (!session || session.released || !state.session?.authenticated) return;
  session.state = 'pending';
  clearTimeout(session.degradeTimer);
  session.degradeTimer = setTimeout(() => {
    if (!session.released && session.state === 'pending') {
      session.state = 'degraded';
      updateReservationUI(session);
    }
  }, RESERVATION_SOFT_TIMEOUT);

  try {
    const result = await api('/api/v1/edit-reservations', {
      method: 'POST',
      json: { shot_id: session.shotId, field: session.field, action: 'acquire' }
    });
    clearTimeout(session.degradeTimer);

    if (session.released) {
      if (result?.success !== false) {
        releaseReservationHttp(session.shotId, session.field);
      }
      return;
    }

    const current = reservationSessions.get(reservationKey(session.shotId, session.field));
    if (!current || current.id !== session.id) return;

    if (result?.success === false) {
      session.state = 'contended';
      session.holder = result?.holder || '其他协作者';
      updateReservationUI(session);
      scheduleReservationRetry(session, 8000 + Math.random() * 2000);
      return;
    }

    session.state = 'owned';
    session.holder = null;
    session.retryAttempt = 0;
    updateReservationUI(session);
    startReservationRenew(session);
  } catch (error) {
    clearTimeout(session.degradeTimer);
    if (session.released) return;
    session.state = error?.isNetworkError ? 'offline' : 'degraded';
    updateReservationUI(session);
    scheduleReservationRetry(session);
  }
}

function scheduleReservationRetry(session, explicitDelay) {
  if (session.released) return;
  clearTimeout(session.retryTimer);
  const delay = explicitDelay != null ? explicitDelay : retryDelay(session.retryAttempt++);
  session.retryTimer = setTimeout(() => {
    acquireSoftReservation(session);
  }, delay);
}

function startReservationRenew(session) {
  clearTimeout(session.renewTimer);
  session.renewTimer = setTimeout(() => renewSoftReservation(session), RESERVATION_RENEW_MS);
}

async function renewSoftReservation(session) {
  if (!session || session.released || session.state !== 'owned' || session.renewInFlight) {
    return;
  }

  session.renewInFlight = true;

  try {
    const result = await api('/api/v1/edit-reservations', {
      method: 'POST',
      json: { shot_id: session.shotId, field: session.field, action: 'acquire' }
    });

    if (session.released) return;

    const current = reservationSessions.get(reservationKey(session.shotId, session.field));
    if (!current || current.id !== session.id) return;

    if (result?.success === false) {
      session.state = 'contended';
      session.holder = result?.holder || '其他协作者';
      updateReservationUI(session);
      scheduleReservationRetry(session, 8000 + Math.random() * 2000);
      return;
    }

    session.state = 'owned';
    session.holder = null;
  } catch (error) {
    if (!session.released) {
      session.state = error?.isNetworkError ? 'degraded' : session.state;
      updateReservationUI(session);
    }
  } finally {
    session.renewInFlight = false;

    if (!session.released && session.state === 'owned') {
      session.renewTimer = setTimeout(
        () => renewSoftReservation(session),
        RESERVATION_RENEW_MS
      );
    }
  }
}

function releaseSoftReservation(session) {
  if (!session || session.released) return;
  session.released = true;
  session.state = 'released';
  clearTimeout(session.renewTimer);
  clearTimeout(session.degradeTimer);
  clearTimeout(session.retryTimer);

  const key = reservationKey(session.shotId, session.field);
  const current = reservationSessions.get(key);
  if (current?.id === session.id) {
    reservationSessions.delete(key);
  }
  releaseReservationHttp(session.shotId, session.field);
  updateReservationUI(session);
}

function releaseReservationHttp(shotId, field) {
  api('/api/v1/edit-reservations', {
    method: 'POST',
    json: { shot_id: shotId, field, action: 'release' }
  }).catch(() => {});
  queuePresenceHeartbeat(true);
}

function acquireFieldReservation(shotId, field) {
  if (!shotId || !field) return Promise.resolve(true);
  createSoftReservationSession(shotId, field);
  return Promise.resolve(true);
}

function releaseFieldReservation(shotId, field) {
  if (!shotId || !field) return;
  const key = reservationKey(shotId, field);
  const session = reservationSessions.get(key);
  if (session) session.release();
  else releaseReservationHttp(shotId, field);
}

function noteNetworkSuccess() {
  state.networkFailureCount = 0;
  if (state.networkHealth !== 'online') {
    state.networkHealth = 'online';
    refreshSaveStatus();
  }
}

function noteNetworkFailure() {
  state.networkFailureCount = (state.networkFailureCount || 0) + 1;
  const next = state.networkFailureCount >= 3 ? 'offline' : 'degraded';
  if (next !== state.networkHealth) {
    state.networkHealth = next;
    refreshSaveStatus();
  }
}

function setSaveStatus(text, tone = '', tooltip = '') {
  const indicator = $('#saveProjectBtn');
  if (!indicator) return;
  indicator.textContent = text;
  indicator.classList.toggle('dirty', tone === 'dirty');
  indicator.classList.toggle('is-syncing', tone === 'syncing');
  indicator.classList.toggle('is-error', tone === 'error');
  if (tooltip) indicator.title = tooltip;
}

function refreshSaveStatus() {
  if (state.saveConflict) {
    setSaveStatus('! 存在冲突', 'error', '检测到协同修改冲突，请处理');
    return;
  }
  if (state.saveRefreshInFlight || state.saveInFlight) {
    setSaveStatus('↻ 同步中…', 'syncing', '正在同步到服务器');
    return;
  }
  if (state.lastSaveError && state.dirty) {
    setSaveStatus('! 同步失败 · 本地已保留', 'error', '服务器同步失败，修改已在本地保存，将自动重试');
    return;
  }
  if (state.localDraftError && (hasDirtyActiveEditor() || state.dirty || pendingEditorDrafts.size > 0)) {
    setSaveStatus('! 本地草稿存储失败', 'error', '浏览器本地存储写入失败，编辑内容仅保留在内存中');
    return;
  }
  if (hasDirtyActiveEditor()) {
    setSaveStatus('● 编辑中', 'dirty', '当前输入尚未提交到服务器');
    return;
  }
  if (state.dirty) {
    setSaveStatus('● 待同步', 'dirty', '修改已保存到本地，等待服务器同步');
    return;
  }
  if (state.networkHealth === 'offline') {
    setSaveStatus('○ 离线 · 本地修改已保留', 'error', '网络不可用，本地修改仍被保留');
    return;
  }
  if (state.networkHealth === 'degraded') {
    setSaveStatus('△ 网络较慢', 'dirty', '网络连接延迟较高');
    return;
  }
  setSaveStatus('● 已同步', '', '本地内容与服务器已同步');
}

/**
 * 富文本字段编辑。传入 host 时走原位编辑（选区浮动工具条 / 右键菜单），
 * 不再强制弹出大编辑窗口；没有宿主元素的场景才退回弹窗。
 */
async function openRichShotEditor(shot, field, host, options = {}) {
  if (host && (host.classList.contains('is-rich-editing') || host.getAttribute('contenteditable') === 'true')) return;
  if (!host && document.querySelector('.rich-editor-dialog[open]')) return;

  const projectId = state.bundle?.project?.id;
  if (!projectId || !shot?.id) return;
  const shotId = shot.id;

  const originalText = String(shot[field] || '');
  const originalRuns = structuredClone(shot.rich_text_json?.[field] || []);
  const originalMarks = JSON.stringify(originalRuns);
  const label = tableColumnLabel(field);

  const reservation = options.skipReservation ? null : createSoftReservationSession(shotId, field);

  const editorId = nextEditorSessionId('rich');
  let resolveDone;
  const done = new Promise(resolve => { resolveDone = resolve; });

  const session = {
    id: editorId,
    type: 'rich',
    projectId,
    shotId,
    field,
    composing: false,
    commitInFlight: false,
    closed: false,
    isDirty() {
      if (session.closed) return false;
      const targetEl = host || document.querySelector('.rich-editor-dialog[open] .rich-editor-surface');
      if (targetEl) {
        if (globalThis.FrameForgeRichText?.getActiveSession?.()?.host === targetEl) {
          const active = globalThis.FrameForgeRichText.getActiveSession();
          if (typeof active?.isDirty === 'function') return active.isDirty();
        }
        const currentRuns = globalThis.FrameForgeRichText?.readElement?.(targetEl) || [];
        const currentText = currentRuns.map(r => r.text).join('');
        const normOriginalRuns = globalThis.FrameForgeRichText?.normalize?.(originalRuns, originalText) || [];
        return currentText !== originalText || JSON.stringify(currentRuns) !== JSON.stringify(normOriginalRuns);
      }
      return false;
    },
    async waitForCompositionEnd() {
      if (!session.composing && !globalThis.FrameForgeRichText?.isComposing?.()) return;
      await waitUntil(
        () => !session.composing && !globalThis.FrameForgeRichText?.isComposing?.(),
        { timeout: 5000, errorMessage: '等待输入法完成超时' }
      );
    },
    async commit() {
      if (session.closed || session.commitInFlight) return done;
      session.commitInFlight = true;
      try {
        await session.waitForCompositionEnd();
        await globalThis.FrameForgeRichText?.flushActive?.();
        return done;
      } finally {
        session.commitInFlight = false;
      }
    },
    done
  };

  registerActiveEditor(session);

  let result = null;
  try {
    result = host
      ? await FrameForgeRichText.inline({
          element: host,
          text: originalText,
          runs: originalRuns,
          title: label,
          onTab: options.onTab,
          onChange: ({ text: liveText, runs: liveRuns }) => {
            scheduleEditorDraft({
              projectId,
              shotId,
              field,
              text: liveText,
              runs: liveRuns,
              baseRevision: shot.base_revision || shot.revision
            });
            refreshSaveStatus();
          },
          clientX: options.clientX,
          clientY: options.clientY,
          source: options.source
        })
      : await FrameForgeRichText.edit({
          title: `SHOT ${shot.number} · ${label}`,
          text: originalText,
          runs: originalRuns
        });

    if (!result) {
      // User explicitly cancelled the rich text editor — clear any pending draft
      clearEditorDraft(projectId, shotId, field);
      return;
    }
    if (state.bundle?.project?.id !== projectId) return;

    const current = state.bundle.shots.find(item => item.id === shotId);
    if (!current) {
      scheduleEditorDraft({
        projectId,
        shotId,
        field,
        text: result.text,
        runs: result.runs,
        baseRevision: shot.base_revision || shot.revision
      });
      toast('该镜头已被移除，修改已保留在本地草稿中', true);
      return;
    }

    const currentText = String(current[field] || '');
    const currentRuns = current.rich_text_json?.[field] || [];
    if (currentText !== originalText || JSON.stringify(currentRuns) !== originalMarks) {
      scheduleEditorDraft({
        projectId,
        shotId,
        field,
        text: result.text,
        runs: result.runs,
        baseRevision: shot.base_revision || shot.revision
      });
      toast('该字段在编辑期间已发生变化，本地文本已保留，请处理同步冲突', true);
      return;
    }

    if (result.text === originalText && JSON.stringify(result.runs) === originalMarks) return;

    recordHistory();
    current[field] = result.text;
    current.rich_text_json = {
      ...(current.rich_text_json || {}),
      [field]: result.runs
    };
    markDirty();
    renderProjectHeader();
    if (state.inspector.targetShotId === shotId) renderInspector();
  } finally {
    session.closed = true;
    unregisterActiveEditor(session);
    reservation?.release();
    resolveDone?.();
    refreshSaveStatus();
  }
}
function customTableFields() {
  return (state.bundle?.custom_fields || []).filter(field => field && field.is_active !== 0);
}

function importedTableFields() {
  const keys = new Set();
  (state.bundle?.shots || []).forEach(shot => Object.keys(shot.import_columns || {}).forEach(key => keys.add(String(key))));
  return [...keys].sort((a, b) => a.localeCompare(b, 'zh-CN', { numeric: true }));
}

function archivedColumnSet() {
  return new Set(state.tablePrefs.archived || []);
}

function purgedColumnSet() {
  // Local storage and saved views own presentation only. The API owns tombstones.
  return new Set((state.bundle?.column_preferences || [])
    .filter(item => [true, 1, '1'].includes(item.permanently_deleted))
    .map(item => item.column_key));
}
function isColumnArchived(field) { return archivedColumnSet().has(field); }
function isColumnPurged(field) { return purgedColumnSet().has(field); }

function tableColumnCatalogFields() {
  const core = Object.keys(TABLE_COLUMNS).filter(field => field !== 'actions');
  const custom = customTableFields().map(field => `custom:${field.key}`);
  const imported = importedTableFields().map(key => `import:${key}`);
  return [...core, ...custom, ...imported, 'actions'].filter(field => !isColumnPurged(field));
}

function tableColumnFields() {
  return tableColumnCatalogFields().filter(field => !isColumnArchived(field));
}

function currentColumnOrder() {
  const canonical = tableColumnFields();
  const saved = Array.isArray(state.tablePrefs.order) ? state.tablePrefs.order : [];
  return [...saved.filter(field => canonical.includes(field)), ...canonical.filter(field => !saved.includes(field))];
}

function tableColumnDefinition(field) {
  return TABLE_COLUMNS[field] || [110, 120, 420];
}

function tableColumnLabel(field) {
  if (TABLE_COLUMN_LABELS[field]) return TABLE_COLUMN_LABELS[field];
  if (field.startsWith('custom:')) return customTableFields().find(item => `custom:${item.key}` === field)?.label || field.slice(7);
  if (field.startsWith('import:')) return field.slice(7);
  return field;
}

function isColumnHidden(field) {
  return (state.tablePrefs.hidden || []).includes(field);
}

function isColumnWrapped(field) {
  if (Object.prototype.hasOwnProperty.call(state.tablePrefs.wrap || {}, field)) return Boolean(state.tablePrefs.wrap[field]);
  return ['chapter', 'scene', 'panel_frame', 'description', 'voiceover'].includes(field) || field.startsWith('custom:');
}

function setColumnHidden(field, hidden) {
  if (isColumnArchived(field) || isColumnPurged(field)) return;
  const next = new Set(state.tablePrefs.hidden || []);
  if (hidden) next.add(field); else next.delete(field);
  // The selection column and actions remain available so the table never
  // loses its basic editing affordances.
  next.delete('select');
  next.delete('actions');
  state.tablePrefs.hidden = [...next];
  saveTablePrefs();
}

function setColumnArchived(field, archived = true) {
  if (!field || ['select', 'actions'].includes(field) || isColumnPurged(field)) return;
  const next = archivedColumnSet();
  if (archived) {
    next.add(field);
    state.tablePrefs.hidden = (state.tablePrefs.hidden || []).filter(item => item !== field);
  } else next.delete(field);
  state.tablePrefs.archived = [...next];
  saveTablePrefs();
}

function archiveColumn(field, { confirm = true } = {}) {
  const label = tableColumnLabel(field);
  if (!field || ['select', 'actions'].includes(field) || isColumnPurged(field)) return false;
  if (confirm && !window.confirm(`归档列“${label}”？归档后将从表格、侧栏、卡片和导出中移除；可在列管理的“归档”中恢复或永久删除。`)) return false;
  setColumnArchived(field, true);
  renderCurrentView();
  toast(`已归档列“${label}”`);
  return true;
}

async function deleteArchivedColumnPermanently(field, { confirm = true } = {}) {
  return purgeArchivedColumns([field], confirm);
}

async function purgeArchivedColumns(fields, confirm = true) {
  const projectId = state.bundle?.project?.id;
  fields = [...new Set(fields)].filter(isColumnArchived);
  if (!projectId || !fields.length) return false;
  if (confirm && !await confirmAction('永久删除归档列', `永久删除当前项目的 ${fields.length} 列及其活动数据？此操作不能撤销。镜号、时码和时长的内部计算保留；历史快照及备份不在本次清理范围。`)) return false;
  try {
    if (!await flushProjectBeforeLeaving() || state.bundle?.project?.id !== projectId) return false;
    await waitUntil(() => !columnPreferenceWrites.has(projectId), {timeout:15000,errorMessage:'归档尚未同步，请稍后重试'});
    const result = await api(`/api/projects/${encodeURIComponent(projectId)}/columns/purge`, {method:'DELETE',json:{fields}});
    if (state.bundle?.project?.id !== projectId) return true;
    state.bundle = adoptServerBundle(result.bundle);
    applyColumnLifecycleProjection();
    state.undoStack = []; state.redoStack = [];
    localStorage.setItem(tablePrefsKey(), JSON.stringify(tablePresentationPrefs(state.tablePrefs)));
    renderProjectHeader(); renderCurrentView(); renderInspector();
    toast(`已永久删除 ${result.deleted.length} 列`);
    return true;
  } catch (err) {
    toast(`永久删除列失败：${err.message}`, true);
    return false;
  }
}

function customFieldValue(shot, key) {
  return shot?.custom_fields?.[key] ?? '';
}

function tablePrefsKey(view = state.view.current) {
  return `frameforge-table-prefs:${state.bundle?.project?.id || 'none'}:${view}`;
}

const columnPreferenceWrites = new Map();
function columnPreferencePayload() {
  if (!state.bundle) return [];
  const catalog = tableColumnCatalogFields();
  const order = currentColumnOrder();
  const archived = archivedColumnSet();
  const hidden = new Set(state.tablePrefs.hidden || []);
  const payload = catalog.map((columnKey, index) => ({
    column_key: columnKey,
    state: archived.has(columnKey) ? 'removed' : hidden.has(columnKey) ? 'hidden' : 'visible',
    position: Math.max(0, order.indexOf(columnKey) >= 0 ? order.indexOf(columnKey) : index),
    width_px: state.tablePrefs.widths?.[columnKey] ?? null,
    wrap_text: isColumnWrapped(columnKey)
  }));
  return payload;
}

function queueColumnPreferenceSync() {
  const projectId = state.bundle?.project?.id;
  if (!projectId) return;
  const pending = columnPreferenceWrites.get(projectId) || { running: false };
  clearTimeout(pending.timer);
  pending.preferences = columnPreferencePayload();
  columnPreferenceWrites.set(projectId, pending);
  pending.timer = window.setTimeout(async () => {
    if (pending.running) return;
    pending.running = true;
    try {
      // Serialize writes per project; edits made during a request are sent next.
      let sent;
      do {
        sent = pending.preferences;
        const preferences = await api(`/api/projects/${encodeURIComponent(projectId)}/column-preferences`, {
          method: 'PUT', json: { preferences: sent }
        });
        if (pending.preferences === sent && state.bundle?.project?.id === projectId) {
          state.bundle.column_preferences = preferences;
          const before = JSON.stringify([state.tablePrefs.archived, state.tablePrefs.purged]);
          applyColumnLifecycleProjection(preferences);
          if (before !== JSON.stringify([state.tablePrefs.archived, state.tablePrefs.purged])) {
            renderCurrentView(); renderInspector();
          }
        }
      } while (pending.preferences !== sent);
      clearTimeout(pending.timer);
      columnPreferenceWrites.delete(projectId);
    } catch (err) {
      toast(`列配置同步失败：${err.message}`, true);
    } finally {
      pending.running = false;
    }
  }, 320);
}

function tablePresentationPrefs(saved = {}) {
  return {
    widths: saved.widths || {}, hidden: Array.isArray(saved.hidden) ? saved.hidden : [],
    order: Array.isArray(saved.order) ? saved.order : [], sort: saved.sort || null,
    wrap: saved.wrap || {}, rowHeight: saved.rowHeight || 'standard'
  };
}

function applyColumnLifecycleProjection(preferences) {
  const remote = preferences || columnPreferenceWrites.get(state.bundle?.project?.id)?.preferences
    || state.bundle?.column_preferences || [];
  const purged = purgedColumnSet();
  state.tablePrefs.archived = remote.filter(item => item.state === 'removed' && !purged.has(item.column_key))
    .map(item => item.column_key);
  state.tablePrefs.purged = [...purged];
  state.tablePrefs.hidden = (state.tablePrefs.hidden || []).filter(key => !purged.has(key));
  state.tablePrefs.order = (state.tablePrefs.order || []).filter(key => !purged.has(key));
  for (const key of purged) {
    delete state.tablePrefs.widths[key]; delete state.tablePrefs.wrap[key];
  }
  if (purged.has(state.tablePrefs.sort?.field)) state.tablePrefs.sort = null;
}

function loadTablePrefs() {
  try {
    state.tablePrefs = tablePresentationPrefs(JSON.parse(localStorage.getItem(tablePrefsKey()) || '{}'));
  } catch (_) { state.tablePrefs = tablePresentationPrefs(); }
  const remote = columnPreferenceWrites.get(state.bundle?.project?.id)?.preferences
    || state.bundle?.column_preferences || [];
  const remoteOrder = remote.slice().sort((a, b) => Number(a.position || 0) - Number(b.position || 0)).map(item => item.column_key);
  state.tablePrefs.order = [...remoteOrder, ...state.tablePrefs.order.filter(key => !remoteOrder.includes(key))];
  const hidden = new Set(state.tablePrefs.hidden);
  remote.forEach(item => {
    hidden.delete(item.column_key);
    if (item.state === 'hidden') hidden.add(item.column_key);
    if (item.width_px != null) state.tablePrefs.widths[item.column_key] = Number(item.width_px);
    else delete state.tablePrefs.widths[item.column_key];
    state.tablePrefs.wrap[item.column_key] = Boolean(item.wrap_text);
  });
  state.tablePrefs.hidden = [...hidden];
  applyColumnLifecycleProjection(remote);
  const select = $('#rowHeightSelect');
  if (select) select.value = state.tablePrefs.rowHeight;
}

function saveTablePrefs(view = state.view.current) {
  localStorage.setItem(tablePrefsKey(view), JSON.stringify(tablePresentationPrefs(state.tablePrefs)));
  queueColumnPreferenceSync();
}

function autoFitTableColumns(table = $('#mainShotTable')) {
  if (!table) return;
  const fields = tableColumnFields();
  const measureCanvas = document.createElement('canvas');
  const context = measureCanvas.getContext('2d');
  fields.forEach(field => {
    if (isColumnHidden(field)) return;
    const definition = tableColumnDefinition(field);
    if (field === 'select') { state.tablePrefs.widths[field] = definition[1]; return; }
    if (field === 'thumb') { state.tablePrefs.widths[field] = Math.max(definition[1], 112); return; }
    let widest = 0;
    const headerLabel = table.querySelector(`th[data-column="${CSS.escape(field)}"] .column-label`);
    if (headerLabel) widest = headerLabel.scrollWidth;
    const cells = [...table.querySelectorAll(`tbody td[data-column="${CSS.escape(field)}"]`)].slice(0, 80);
    cells.forEach(cell => {
      const target = cell.querySelector('.cell-display, .shot-number, .status-dot-label') || cell;
      const style = getComputedStyle(target);
      if (context) {
        context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        widest = Math.max(widest, context.measureText(target.textContent.trim()).width);
      } else widest = Math.max(widest, target.scrollWidth);
    });
    const next = clampColumnWidth(widest + 30, definition);
    state.tablePrefs.widths[field] = next;
  });
  saveTablePrefs();
  renderTableView();
  toast('已按当前内容自动调整列宽');
}

function shotColumnValue(shot, field) {
  if (field.startsWith('custom:')) return customFieldValue(shot, field.slice(7));
  if (field.startsWith('import:')) return shot?.import_columns?.[field.slice(7)] ?? '';
  if (field === 'methods') return methodValues(shot).map(methodLabel).join(' ');
  if (field === 'thumb' || field === 'actions' || field === 'select') return '';
  return shot?.[field] ?? '';
}

function sortTableShots(shots) {
  const sort = state.tablePrefs.sort;
  if (!sort?.field || !['asc', 'desc'].includes(sort.direction)) return shots;
  const direction = sort.direction === 'asc' ? 1 : -1;
  return [...shots].sort((left, right) => {
    const a = shotColumnValue(left, sort.field);
    const b = shotColumnValue(right, sort.field);
    const an = Number(a); const bn = Number(b);
    let result;
    if (a === '' && b !== '') result = 1;
    else if (b === '' && a !== '') result = -1;
    else if (Number.isFinite(an) && Number.isFinite(bn) && a !== '' && b !== '') result = an - bn;
    else result = String(a).localeCompare(String(b), 'zh-CN', { numeric: true, sensitivity: 'base' });
    return result * direction;
  });
}

function columnCalculation(field) {
  const values = filterShots(state.bundle?.shots || []).map(shot => shotColumnValue(shot, field)).filter(value => value !== '' && value != null);
  if (!values.length) return '无可计算内容';
  const numbers = values.map(Number).filter(Number.isFinite);
  if (numbers.length === values.length) {
    const sum = numbers.reduce((total, value) => total + value, 0);
    return `合计 ${sum.toFixed(2).replace(/\.00$/, '')} · 平均 ${(sum / numbers.length).toFixed(2)} · ${numbers.length} 项`;
  }
  return `非空 ${values.length} 项`;
}

function openColumnMenu(field, anchor = null) {
  const popover = $('#columnSettingsPopover');
  tableContextMenu.close();
  if (popover) popover.onclick = null;
  if (!popover || ['select', 'actions'].includes(field)) return;
  const label = tableColumnLabel(field);
  const sort = state.tablePrefs.sort?.field === field ? state.tablePrefs.sort.direction : '';
  const removeAction = 'column-archive';
  const removeLabel = '归档此列';
  popover.innerHTML = `<div class="column-settings-head"><div><b>${escapeHtml(label)}</b><small>当前视图列操作</small></div><button type="button" class="btn-ghost-icon" id="closeColumnSettings" aria-label="关闭列菜单">×</button></div><div class="column-menu-actions"><button type="button" class="column-menu-action" data-column-sort="asc"><span>↑</span><span>升序排序</span>${sort === 'asc' ? '<b>✓</b>' : ''}</button><button type="button" class="column-menu-action" data-column-sort="desc"><span>↓</span><span>降序排序</span>${sort === 'desc' ? '<b>✓</b>' : ''}</button><button type="button" class="column-menu-action" data-column-autofit><span>↔</span><span>按内容自动列宽</span></button><button type="button" class="column-menu-action" data-column-wrap><span>↕</span><span>${isColumnWrapped(field) ? '关闭文本换行' : '开启文本换行'}</span>${isColumnWrapped(field) ? '<b>✓</b>' : ''}</button><button type="button" class="column-menu-action" data-column-hide><span>◌</span><span>隐藏此列（可恢复）</span></button><button type="button" class="column-menu-action" data-${removeAction}><span>−</span><span>${removeLabel}</span></button><button type="button" class="column-menu-action" data-column-clear-sort><span>×</span><span>清除排序</span></button></div><div class="column-calculation"><b>计算</b><span>${escapeHtml(columnCalculation(field))}</span></div>`;
  popover.classList.remove('hidden');
  if (anchor) requestAnimationFrame(() => positionPopoverNear(anchor, popover));
  $('#closeColumnSettings')?.addEventListener('click', () => popover.classList.add('hidden'));
  $$('[data-column-sort]', popover).forEach(button => button.addEventListener('click', () => {
    state.tablePrefs.sort = { field, direction: button.dataset.columnSort };
    saveTablePrefs(); renderTableView(); renderColumnSettingsPopover();
  }));
  $('[data-column-clear-sort]', popover)?.addEventListener('click', () => { state.tablePrefs.sort = null; saveTablePrefs(); renderTableView(); renderColumnSettingsPopover(); });
  $('[data-column-hide]', popover)?.addEventListener('click', () => { setColumnHidden(field, true); popover.classList.add('hidden'); renderTableView(); });
  $('[data-column-archive]', popover)?.addEventListener('click', () => { archiveColumn(field); popover.classList.add('hidden'); });
  $('[data-column-autofit]', popover)?.addEventListener('click', () => { popover.classList.add('hidden'); autoFitTableColumns(); });
  $('[data-column-wrap]', popover)?.addEventListener('click', () => { state.tablePrefs.wrap[field] = !isColumnWrapped(field); saveTablePrefs(); renderTableView(); openColumnMenu(field); });
}

function reorderTableColumns(table, order) {
  const headerRow = table.tHead?.rows[0];
  const cols = table.querySelector('colgroup');
  const get = (root, field) => root?.querySelector(`[data-column="${CSS.escape(field)}"]`);
  order.forEach(field => {
    const header = get(headerRow, field);
    const col = get(cols, field);
    if (header) headerRow.appendChild(header);
    if (col) cols.appendChild(col);
  });
  table.querySelectorAll('tbody tr').forEach(row => order.forEach(field => {
    const cell = get(row, field);
    if (cell) row.appendChild(cell);
  }));
}

function columnManagerEntries(query = '', scope = 'visible') {
  const archived = archivedColumnSet();
  const needle = query.trim().toLocaleLowerCase();
  return tableColumnCatalogFields().map(field => ({
    field, label: tableColumnLabel(field),
    fixed: ['select', 'actions'].includes(field),
    status: archived.has(field) ? 'archived' : isColumnHidden(field) ? 'hidden' : 'visible'
  })).filter(entry => (scope === 'all' || entry.status === scope) &&
    (!needle || entry.label.toLocaleLowerCase().includes(needle) || entry.field.toLocaleLowerCase().includes(needle)));
}

function setColumnManagerExpanded(open) {
  const value = String(Boolean(open));
  $('#columnSettingsBtn')?.setAttribute('aria-expanded', value);
  document.querySelectorAll('[data-frameforge-column-manager-trigger="canonical"]').forEach(trigger => {
    trigger.setAttribute('aria-expanded', value);
  });
}

function closeColumnSettings(restoreFocus = false) {
  $('#columnSettingsPopover')?.classList.add('hidden');
  setColumnManagerExpanded(false);
  if (restoreFocus) {
    const visibleTrigger = Array.from(document.querySelectorAll('[data-frameforge-column-manager-trigger="canonical"]'))
      .find(trigger => trigger.getClientRects().length);
    (visibleTrigger || $('#columnSettingsBtn'))?.focus();
  }
}

$('#columnSettingsPopover')?.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  event.preventDefault();
  event.stopPropagation();
  closeColumnSettings(true);
}, true);

function toggleCanonicalColumnManager(anchor = null) {
  const popover = $('#columnSettingsPopover');
  if (!popover || !state.bundle) return;
  tableContextMenu.close();
  $('#filterPopover')?.classList.add('hidden');
  $('#filterPopoverBtn')?.setAttribute('aria-expanded', 'false');
  setToolbarTools(false);

  if (!popover.classList.contains('hidden')) {
    closeColumnSettings(false);
    return;
  }

  renderColumnSettingsPopover();
  document.body.append(popover);
  Object.assign(popover.style, {position:'fixed',right:'auto',maxWidth:'calc(100vw - 16px)',maxHeight:'calc(100dvh - 24px)',overflowY:'auto'});
  popover.classList.remove('hidden');
  setColumnManagerExpanded(true);

  const target = anchor && anchor.getClientRects?.().length
    ? anchor
    : Array.from(document.querySelectorAll('[data-frameforge-column-manager-trigger="canonical"]'))
      .find(trigger => trigger.getClientRects().length)
      || $('#columnSettingsBtn');

  requestAnimationFrame(() => {
    if (popover.classList.contains('hidden')) return;
    if (target?.getClientRects?.().length) positionPopoverNear(target, popover);
    $('#columnManagerSearch')?.focus();
  });
}

function legacyWorkspaceColumnTriggerFrom(target) {
  const button = target?.closest?.('#workspaceToolbarV73 button');
  if (!button || button.matches('[data-frameforge-column-manager-trigger="canonical"]')) return null;
  const label = String(button.textContent || '').replace(/\s+/g, '').trim();
  return label === '列' ? button : null;
}

function suppressLegacyWorkspaceColumnManager() {
  let removed = false;
  document.querySelectorAll('.ff73-columns').forEach(node => {
    node.remove();
    removed = true;
  });
  document.querySelectorAll('#workspaceToolbarV73 button').forEach(button => {
    if (button.matches('[data-frameforge-column-manager-trigger="canonical"]')) return;
    const label = String(button.textContent || '').replace(/\s+/g, '').trim();
    if (label !== '列') return;
    button.setAttribute('aria-expanded', 'false');
    button.removeAttribute('data-state');
  });
  return removed;
}

// Compatibility firewall for an older cached workspace-v73.js. The legacy
// React/Radix implementation used its own "显示 / 隐藏 / 已删除" popup. Capture
// that toolbar click before React sees it and always open the canonical
// "当前列 / 已隐藏 / 归档" manager owned by app.js instead.
document.addEventListener('click', event => {
  const legacyTrigger = legacyWorkspaceColumnTriggerFrom(event.target);
  if (!legacyTrigger) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();
  suppressLegacyWorkspaceColumnManager();
  toggleCanonicalColumnManager(legacyTrigger);
}, true);

// If a stale bundle manages to portal the old manager by another path, remove
// it immediately. This is deliberately limited to the old .ff73-columns portal.
const legacyColumnManagerObserver = new MutationObserver(() => {
  suppressLegacyWorkspaceColumnManager();
});
legacyColumnManagerObserver.observe(document.documentElement, { childList: true, subtree: true });

function renderColumnSettingsPopover() {
  const popover = $('#columnSettingsPopover');
  if (!popover || !state.bundle) return;
  tableContextMenu.close();
  const projectId = String(state.bundle.project.id);
  if (popover.dataset.projectId !== projectId) {
    popover.dataset.projectId = projectId;
    popover.dataset.scope = 'visible';
    popover.dataset.query = '';
  }
  const scope = ['visible', 'hidden', 'archived'].includes(popover.dataset.scope) ? popover.dataset.scope : 'visible';
  const query = popover.dataset.query || '';
  const scrollTop = popover.querySelector('.column-settings-list')?.scrollTop || 0;
  const active = document.activeElement;
  const focusField = popover.contains(active) ? active?.dataset?.columnField : null;
  const focusScope = popover.contains(active) ? active?.dataset?.columnScope : null;
  const focusId = popover.contains(active) ? active?.id : null;
  const counts = { visible: 0, hidden: 0, archived: 0 };
  columnManagerEntries('', 'all').forEach(entry => counts[entry.status]++);
  popover.innerHTML = `<div class="column-settings-head"><b>列管理</b><button type="button" class="btn-ghost-icon" id="closeColumnSettings" aria-label="关闭列管理">×</button></div>
    <input type="search" id="columnManagerSearch" class="column-manager-search" aria-label="搜索列名称" placeholder="搜索列名称" value="${escapeHtml(query)}">
    <div class="column-manager-scopes" role="group" aria-label="列状态">${[['visible', '当前列'], ['hidden', '已隐藏'], ['archived', '归档']].map(([value, label]) => `<button type="button" data-column-scope="${value}" aria-pressed="${scope === value}">${label}<span>${counts[value]}</span></button>`).join('')}</div>
    <div class="column-settings-list"></div><p id="columnManagerHint" class="column-manager-hint"></p>
    ${scope === 'archived' ? '<div class="column-settings-actions"><button type="button" class="btn btn-ghost" data-column-bulk="select">全选</button><button type="button" class="btn btn-danger" data-column-bulk="selected">删除所选</button><button type="button" class="btn btn-danger" data-column-bulk="all">清空归档</button></div>' : ''}
    <div class="column-settings-actions"><button type="button" class="btn btn-secondary" id="columnManagerAdd">新增自定义列</button><button type="button" class="btn btn-ghost" id="autoFitColumnsBtn">自动列宽</button><button type="button" class="btn btn-ghost" id="resetColumnPrefsBtn">重置列宽</button></div>`;
  const renderList = () => {
    const currentScope = popover.dataset.scope || 'visible';
    const entries = columnManagerEntries(popover.dataset.query || '', currentScope);
    const empty = (popover.dataset.query || '').trim() ? '没有匹配的列，请换个名称搜索。' : currentScope === 'hidden' ? '没有隐藏列。' : currentScope === 'archived' ? '没有归档列。' : '当前没有显示列。';
    popover.querySelector('.column-settings-list').innerHTML = entries.length ? entries.map(entry => `<div class="column-settings-item ${entry.fixed ? 'is-fixed' : ''}">
      ${entry.status === 'archived' ? `<input type="checkbox" data-column-selected="${escapeHtml(entry.field)}" aria-label="选择 ${escapeHtml(entry.label)}">` : ''}<span class="column-setting-label">${escapeHtml(entry.label)}</span>
      ${entry.fixed ? '<small>固定操作列</small>' : entry.status === 'visible' ? `<button type="button" class="btn btn-ghost btn-small" data-column-action="hide" data-column-field="${escapeHtml(entry.field)}">隐藏</button><button type="button" class="btn btn-ghost btn-small column-remove-button" data-column-action="archive" data-column-field="${escapeHtml(entry.field)}" aria-label="归档列 ${escapeHtml(entry.label)}">归档</button>` : entry.status === 'hidden' ? `<button type="button" class="btn btn-secondary btn-small" data-column-action="show" data-column-field="${escapeHtml(entry.field)}">恢复显示</button>` : `<button type="button" class="btn btn-secondary btn-small" data-column-action="restore-archive" data-column-field="${escapeHtml(entry.field)}">恢复归档</button><button type="button" class="btn btn-danger btn-small" data-column-action="purge" data-column-field="${escapeHtml(entry.field)}">永久删除</button>`}
      </div>`).join('') : `<div class="empty-state" role="status">${empty}</div>`;
    $('#columnManagerHint').textContent = currentScope === 'archived' ? '归档列已从所有视图移除；可恢复归档，永久删除则不能撤销。' : currentScope === 'hidden' ? '隐藏只影响显示，可随时恢复。' : '归档会移出所有视图，可在归档区恢复或永久删除。';
  };
  renderList();
  popover.querySelector('.column-settings-list').scrollTop = scrollTop;
  $('#columnManagerSearch').addEventListener('input', event => {
    popover.dataset.query = event.target.value;
    renderList();
  });
  popover.onclick = async event => {
    // A rebuild detaches the clicked node. Do not let the document's outside
    // click handler mistake that detached target for a click outside this panel.
    event.stopPropagation();
    const bulk = event.target.closest('[data-column-bulk]');
    if (bulk) {
      if(bulk.dataset.columnBulk === 'select') { popover.querySelectorAll('[data-column-selected]').forEach(input=>{input.checked=true;}); return; }
      const fields = bulk.dataset.columnBulk === 'all' ? columnManagerEntries('', 'archived').map(e=>e.field) : Array.from(popover.querySelectorAll('[data-column-selected]:checked')).map(e=>e.dataset.columnSelected);
      bulk.disabled=true;
      await purgeArchivedColumns(fields);
      renderColumnSettingsPopover(); return;
    }
    const scopeButton = event.target.closest('[data-column-scope]');
    if (scopeButton) {
      popover.dataset.scope = scopeButton.dataset.columnScope;
      renderColumnSettingsPopover();
      return;
    }
    const button = event.target.closest('[data-column-action]');
    if (!button) return;
    const field = button.dataset.columnField;
    if (button.dataset.columnAction === 'hide') setColumnHidden(field, true);
    else if (button.dataset.columnAction === 'show') setColumnHidden(field, false);
    else if (button.dataset.columnAction === 'restore-archive') {
      setColumnArchived(field, false);
      popover.dataset.scope = 'visible';
      toast(`已恢复列“${tableColumnLabel(field)}”`);
    }
    else if (button.dataset.columnAction === 'archive') {
      const archived = archiveColumn(field, { confirm: true });
      if (archived) popover.dataset.scope = 'archived';
      renderColumnSettingsPopover();
      return;
    } else if (button.dataset.columnAction === 'purge') {
      await deleteArchivedColumnPermanently(field);
      renderCurrentView();
      renderColumnSettingsPopover();
      return;
    }
    renderCurrentView();
    renderColumnSettingsPopover();
  };
  $('#closeColumnSettings').addEventListener('click', () => closeColumnSettings(true));
  $('#columnManagerAdd').addEventListener('click', () => { closeColumnSettings(); $('#addColumnBtn')?.click(); });
  $('#autoFitColumnsBtn').addEventListener('click', () => { closeColumnSettings(); autoFitTableColumns(); });
  $('#resetColumnPrefsBtn').addEventListener('click', () => {
    state.tablePrefs.widths = {};
    saveTablePrefs(); renderTableView(); renderColumnSettingsPopover();
    toast('列宽已恢复默认');
  });
  if (focusField) {
    const target = Array.from(popover.querySelectorAll('[data-column-field]')).find(item => item.dataset.columnField === focusField);
    (target || $('#columnManagerSearch'))?.focus();
  } else if (focusScope) {
    Array.from(popover.querySelectorAll('[data-column-scope]')).find(item => item.dataset.columnScope === focusScope)?.focus();
  } else if (focusId) {
    popover.querySelector(`#${CSS.escape(focusId)}`)?.focus();
  }
}

function contextIcon(icon = 'description') {
  return `<svg class="g-icon" aria-hidden="true"><use href="#icon-${escapeHtml(icon)}"></use></svg>`;
}

function tableContextItems(target) {
  const header = target?.closest?.('th[data-column]');
  if (header && !['select', 'actions'].includes(header.dataset.column)) {
    const field = header.dataset.column;
    return {
      items: [
        { action: 'column-sort-asc', icon: 'arrow_upward', label: '升序排序' },
        { action: 'column-sort-desc', icon: 'arrow_downward', label: '降序排序' },
        { action: 'column-clear-sort', icon: 'close', label: '清除排序', disabled: state.tablePrefs.sort?.field !== field },
        'separator',
        { action: 'column-autofit', icon: 'swap_horiz', label: '按内容自动列宽' },
        { action: 'column-wrap', icon: 'wrap_text', label: isColumnWrapped(field) ? '关闭文本换行' : '开启文本换行', checked: isColumnWrapped(field) },
        { action: 'column-hide', icon: 'visibility_off', label: '隐藏此列（可恢复）' },
        { action: 'column-archive', icon: 'archive', label: '归档此列', danger: true },
        'separator',
        { action: 'column-add-custom', icon: 'add', label: '添加自定义列' }
      ],
      metadata: { field, kind: '列属性', label: tableColumnLabel(field) }
    };
  }
  const row = target?.closest?.('[data-context-shot-id], tr[data-id]');
  if (!row) return null;
  const shotId = row.dataset.contextShotId || row.dataset.id;
  const shot = state.bundle?.shots?.find(item => item.id === shotId);
  if (!shot) return null;
  const selectedIds = state.selection.selectedShotIds.has(shotId) ? [...state.selection.selectedShotIds] : [shotId];
  const selectedCount = selectedIds.filter(id => state.bundle.shots.some(item => item.id === id)).length;
  const isMulti = selectedCount > 1;
  return {
    items: [
      { action: 'row-select', icon: 'check_circle', label: isMulti ? `操作已选 ${selectedCount} 个镜头` : `选中 SHOT ${shot.number || ''}` },
      ...(isMulti ? [
        { action: 'row-copy', icon: 'content_copy', label: `复制已选 ${selectedCount} 个镜头`, shortcut: 'Ctrl+C' },
        { action: 'row-cut', icon: 'content_cut', label: `剪切已选 ${selectedCount} 个镜头`, shortcut: 'Ctrl+X' },
        { action: 'row-bulk-delete', icon: 'delete', label: `删除已选 ${selectedCount} 个镜头`, danger: true },
        'separator',
        { action: 'row-bulk-clear', icon: 'close', label: '清除多选' }
      ] : [
        { action: 'row-methods', icon: 'layers', label: '编辑制作方式' },
        { action: 'row-auto-timing', icon: 'timer', label: '单条旁白自动计时', disabled: !String(shot.voiceover || shot.dialogue || '').trim() },
      ]),
      'separator',
      ...(isMulti ? [
        { action: 'row-paste', icon: 'content_paste', label: `在 SHOT ${shot.number || ''} 后粘贴`, shortcut: 'Ctrl+V', disabled: !localStorage.getItem(SHOT_CLIPBOARD_KEY) },
      ] : [
        { action: 'row-insert-before', icon: 'arrow_upward', label: '在前面插入镜头' },
        { action: 'row-insert-after', icon: 'arrow_downward', label: '在后面插入镜头' },
        { action: 'row-duplicate', icon: 'content_copy', label: '复制此镜头' },
        { action: 'row-copy', icon: 'content_copy', label: '复制到剪贴板', shortcut: 'Ctrl+C' },
        { action: 'row-cut', icon: 'content_cut', label: '剪切到剪贴板', shortcut: 'Ctrl+X' },
        { action: 'row-paste', icon: 'content_paste', label: '在此镜头后粘贴', shortcut: 'Ctrl+V', disabled: !localStorage.getItem(SHOT_CLIPBOARD_KEY) },
      ]),
      'separator',
      ...(isMulti ? [] : [{ action: 'row-delete', icon: 'delete', label: '删除此镜头', danger: true }])
    ],
    metadata: { shotId, kind: isMulti ? '多选镜头操作' : '镜头操作', label: isMulti ? `已选 ${selectedCount} 个镜头` : `SHOT ${shot.number || ''} · ${shot.title || '未命名镜头'}` }
  };
}

// The table menu owns its open state, anchor, focus return and dismissal.
// Domain actions stay below; callers only request open or close.
const tableContextMenu = (() => {
  const menu = $('#tableContextMenu');
  let anchor = null;
  let returnFocus = null;
  let temporaryTabIndex = false;
  let openedWithKeyboard = false;
  const isOpen = () => Boolean(menu && !menu.classList.contains('hidden'));

  function close(restoreFocus = false) {
    if (!menu) return;
    const focusTarget = restoreFocus && returnFocus?.isConnected ? returnFocus : null;
    const oldReturnFocus = returnFocus;
    const removeTabIndex = temporaryTabIndex;
    if (menu.contains(document.activeElement)) document.activeElement.blur?.();
    anchor?.classList.remove('is-context-target');
    anchor = null;
    returnFocus = null;
    temporaryTabIndex = false;
    openedWithKeyboard = false;
    menu.classList.add('hidden');
    menu.replaceChildren();
    ['contextField', 'contextShot', 'contextX', 'contextY'].forEach(key => { delete menu.dataset[key]; });
    focusTarget?.focus?.({ preventScroll: true });
    if (removeTabIndex && oldReturnFocus?.isConnected) oldReturnFocus.removeAttribute('tabindex');
  }

  function open(target, x, y, keyboard = false) {
    const config = tableContextItems(target);
    if (!config || !menu) { close(); return false; }
    close();
    closeColumnSettings();
    anchor = target.closest('th[data-column], [data-context-shot-id], tr[data-id]');
    anchor?.classList.add('is-context-target');
    openedWithKeyboard = keyboard;
    if (keyboard) {
      const active = document.activeElement;
      returnFocus = active instanceof HTMLElement && active !== document.body && target.contains(active) ? active : anchor;
      if (returnFocus && !returnFocus.matches('button,input,select,textarea,a[href],[tabindex]')) {
        returnFocus.setAttribute('tabindex', '-1');
        temporaryTabIndex = true;
      }
    }
    const metadata = config.metadata;
    menu.innerHTML = `${metadata.label ? `<div class="context-menu-heading"><span>${escapeHtml(metadata.kind || '快捷操作')}</span><b>${escapeHtml(metadata.label)}</b></div>` : ''}${config.items.map(item => item === 'separator' ? '<div class="context-menu-separator" role="separator"></div>' : `<button type="button" class="context-menu-item ${item.danger ? 'is-danger' : ''} ${item.checked ? 'is-checked' : ''}" role="menuitem" data-context-action="${escapeHtml(item.action)}" ${item.disabled ? 'disabled' : ''}><span class="context-menu-icon">${contextIcon(item.icon)}</span><span>${escapeHtml(item.label)}</span>${item.shortcut ? `<kbd>${escapeHtml(item.shortcut)}</kbd>` : ''}</button>`).join('')}`;
    menu.dataset.contextField = metadata.field || '';
    menu.dataset.contextShot = metadata.shotId || '';
    menu.dataset.contextX = String(x);
    menu.dataset.contextY = String(y);
    menu.classList.remove('hidden');
    positionPopoverAt(x, y, menu);
    if (keyboard) menu.querySelector('[data-context-action]:not(:disabled)')?.focus({ preventScroll: true });
    return true;
  }

  function snapshot() {
    return {
      field: menu?.dataset.contextField || '',
      shotId: menu?.dataset.contextShot || '',
      x: Number(menu?.dataset.contextX),
      y: Number(menu?.dataset.contextY),
      anchor,
      keyboard: openedWithKeyboard
    };
  }

  menu?.addEventListener('keydown', event => {
    const items = $$('[role="menuitem"]:not(:disabled)', menu);
    const current = items.indexOf(document.activeElement);
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key) || !items.length) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : event.key === 'ArrowDown' ? (current + 1 + items.length) % items.length : (current - 1 + items.length) % items.length;
    items[next]?.focus({ preventScroll: true });
  });
  window.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !isOpen()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    close(true);
  });
  document.addEventListener('click', event => {
    if (isOpen() && !event.target.closest('#tableContextMenu')) close();
  });
  $('#tableScrollWrap')?.addEventListener('scroll', () => { if (isOpen()) close(); }, { passive: true });
  window.addEventListener('resize', () => { if (isOpen()) close(); }, { passive: true });
  return { open, close, snapshot, isOpen };
})();

function positionPopoverNear(anchor, popover, gap = 6) {
  if (!anchor || !popover) return;
  const rect = anchor.getBoundingClientRect();
  positionPopoverAt(rect.left, rect.bottom + gap, popover);
}

function positionPopoverAt(x, y, popover) {
  if (!popover) return;
  // CSS zoom scales descendants of body a second time. Convert viewport
  // coordinates back to the popover's unscaled layout space before clamping.
  const bodyZoom = parseFloat(getComputedStyle(document.body).zoom) || 1;
  const scale = bodyZoom > 0 ? bodyZoom : 1;
  const width = popover.offsetWidth || 260;
  const height = popover.offsetHeight || 240;
  const viewportWidth = window.innerWidth / scale;
  const viewportHeight = window.innerHeight / scale;
  const edge = 8 / scale;
  popover.style.left = `${Math.max(edge, Math.min(Number(x) / scale, viewportWidth - width - edge))}px`;
  popover.style.top = `${Math.max(edge, Math.min(Number(y) / scale, viewportHeight - height - edge))}px`;
}

$('#tableContextMenu')?.addEventListener('click', async event => {
  const button = event.target.closest('[data-context-action]');
  const menu = $('#tableContextMenu');
  if (!button || !menu || !state.bundle) return;
  event.preventDefault();
  event.stopPropagation();
  const action = button.dataset.contextAction;
  const { field, shotId, x: contextX, y: contextY, anchor: actionAnchor, keyboard } = tableContextMenu.snapshot();
  tableContextMenu.close(keyboard);
  if (action.startsWith('column-')) {
    if (action === 'column-archive') {
      archiveColumn(field);
    } else if (action === 'column-sort-asc' || action === 'column-sort-desc') {
      state.tablePrefs.sort = { field, direction: action.endsWith('asc') ? 'asc' : 'desc' };
      saveTablePrefs();
      renderTableView();
      toast(`已按${tableColumnLabel(field)}${action.endsWith('asc') ? '升序' : '降序'}排列`);
    } else if (action === 'column-autofit') {
      autoFitTableColumns();
    } else if (action === 'column-wrap') {
      state.tablePrefs.wrap[field] = !isColumnWrapped(field);
      saveTablePrefs();
      renderTableView();
    } else if (action === 'column-hide') {
      setColumnHidden(field, true);
      renderTableView();
      toast(`已隐藏列：${tableColumnLabel(field)}`);
    } else if (action === 'column-remove' || action === 'column-delete-custom') {
      archiveColumn(field);
    } else if (action === 'column-clear-sort') {
      if (state.tablePrefs.sort?.field === field) state.tablePrefs.sort = null;
      saveTablePrefs();
      renderTableView();
    } else if (action === 'column-add-custom') {
      $('#customFieldsModal')?.showModal();
      try {
        await renderProConfig();
        $('#customFieldForm input[name="label"]')?.focus();
      } catch (err) { toast(err.message, true); }
    } else if (action === 'column-settings') {
      renderColumnSettingsPopover();
      const popover = $('#columnSettingsPopover');
      popover?.classList.remove('hidden');
      setColumnManagerExpanded(true);
      if (popover && Number.isFinite(contextX) && Number.isFinite(contextY)) {
        positionPopoverAt(contextX, contextY, popover);
      }
    }
    return;
  }
  const selectedForContext = state.selection.selectedShotIds.has(shotId)
    ? [...state.selection.selectedShotIds].filter(id => state.bundle.shots.some(item => item.id === id))
    : [shotId];
  if (selectedForContext.length && (!state.selection.selectedShotIds.has(shotId) || action === 'row-select')) {
    state.selection.selectedShotIds = new Set(selectedForContext);
    state.selection.anchorShotId = shotId;
  }
  const shot = state.bundle.shots.find(item => item.id === shotId);
  if (!shot) return;
  if (action === 'row-select') {
    syncShotSelectionClasses();
    renderBulkActionBar();
  } else if (action === 'row-methods') {
    const cell = document.querySelector(`#mainShotTable tr[data-id="${CSS.escape(shotId)}"] td[data-field="methods"]`);
    if (cell || actionAnchor) openMethodsPopover(cell || actionAnchor, shot);
  } else if (action === 'row-auto-timing') {
    openSingleShotTiming(shotId);
  } else if (action === 'row-insert-before' || action === 'row-insert-after') {
    openInsertShotDialog(action.endsWith('after') ? 'after' : 'before', shotId);
  } else if (action === 'row-duplicate') {
    const position = state.bundle.shots.findIndex(item => item.id === shotId) + 1;
    await createShotAt(position, {
      title: `${shot.title || `镜头 ${shot.number}`} 副本`,
      description: shot.description || '',
      voiceover: shot.voiceover || '',
      dialogue: shot.dialogue || '',
      duration_frames: shot.duration_frames,
      duration_seconds: shot.duration_seconds,
      primary_method: shot.primary_method,
      secondary_methods: Array.isArray(shot.secondary_methods) ? [...shot.secondary_methods] : [],
      shot_size: shot.shot_size,
      lens: shot.lens,
      movement: shot.movement,
      angle: shot.angle,
      chapter: shot.chapter,
      scene: shot.scene,
      panel_frame: shot.panel_frame
    });
  } else if (action === 'row-copy') {
    copySelectedShots('copy');
  } else if (action === 'row-cut') {
    copySelectedShots('cut');
  } else if (action === 'row-bulk-clear') {
    state.selection.selectedShotIds.clear();
    syncShotSelectionClasses();
    renderBulkActionBar();
  } else if (action === 'row-bulk-delete') {
    await deleteSelectedShots();
  } else if (action === 'row-paste') {
    selectShot(shotId);
    await pasteShotClipboard();
  } else if (action === 'row-delete') {
    deleteShotById(shotId);
  }
});

$('#tableScrollWrap')?.addEventListener('contextmenu', event => {
  if (!event.target.closest('#mainShotTable')) return;
  if (tableContextMenu.open(event.target, event.clientX, event.clientY, false)) event.preventDefault();
});

$('#tableScrollWrap')?.addEventListener('keydown', event => {
  if (!(event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10'))) return;
  const target = event.target.closest('th[data-column], tr[data-id]') || document.querySelector(`#mainShotTable tr[data-id="${CSS.escape(state.selection.activeShotId || '')}"]`);
  if (!target) return;
  event.preventDefault();
  const rect = target.getBoundingClientRect();
  tableContextMenu.open(target, rect.left + Math.min(48, rect.width / 2), rect.top + Math.min(30, rect.height / 2), true);
});

$('#workspaceMain')?.addEventListener('contextmenu', event => {
  if (event.defaultPrevented || event.target.closest('#mainShotTable')) return;
  if (event.target.closest('textarea, input, [contenteditable="true"]')) return;
  const target = event.target.closest('[data-context-shot-id]');
  if (!target) return;
  if (tableContextMenu.open(target, event.clientX, event.clientY, false)) event.preventDefault();
});

$('#workspaceMain')?.addEventListener('keydown', event => {
  if (!(event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10'))) return;
  if (event.target.closest('#mainShotTable')) return;
  const target = event.target.closest('[data-context-shot-id]');
  if (!target) return;
  event.preventDefault();
  const rect = target.getBoundingClientRect();
  tableContextMenu.open(target, rect.left + Math.min(48, rect.width / 2), rect.top + Math.min(30, rect.height / 2), true);
});

function methodValues(shot) {
  const secondary = Array.isArray(shot?.secondary_methods) ? shot.secondary_methods : [];
  return [...new Set([shot?.primary_method || 'LIVE', ...secondary].filter(Boolean))];
}

function methodLabel(code) {
  return PRODUCTION_METHODS.find(item => item[0] === code)?.[1] || code;
}

function presetDisplayValue(field, value) {
  if (field === 'status') return STATUS_LABELS[value] || value || '草稿';
  return value || '—';
}

function openShotPresetPopover(anchor, shot, field) {
  const config = SHOT_FIELD_PRESETS[field];
  if (!anchor || !shot || !config) return;
  document.querySelector('.shot-preset-popover')?.remove();
  const current = String(shot[field] || '');
  const isCustom = Boolean(current && !config.values.includes(current));
  const popover = document.createElement('div');
  popover.className = 'shot-preset-popover';
  popover.setAttribute('role', 'dialog');
  popover.setAttribute('aria-label', `${config.label}预设`);
  popover.innerHTML = `
    <div class="preset-popover-head"><div><b>${escapeHtml(config.label)}</b><span>单选常用预设，或输入自定义值</span></div><button type="button" class="btn-ghost-icon" data-preset-close aria-label="关闭"><svg class="g-icon"><use href="#icon-close"></use></svg></button></div>
    <div class="preset-option-grid" role="radiogroup" aria-label="${escapeHtml(config.label)}常用预设">
      ${['', ...config.values].map(value => `<button type="button" class="preset-option ${current === value ? 'is-selected' : ''}" role="radio" aria-checked="${current === value}" data-preset-value="${escapeHtml(value)}"><span class="preset-radio"></span><span>${value ? escapeHtml(presetDisplayValue(field, value)) : '留空'}</span></button>`).join('')}
    </div>
    <form class="preset-custom-form"><label><span>自定义</span><input name="customValue" value="${escapeHtml(isCustom ? current : '')}" placeholder="输入自定义${escapeHtml(config.label)}" autocomplete="off"></label><button type="submit" class="btn btn-secondary">应用</button></form>
  `;
  document.body.append(popover);
  const width = Math.min(340, window.innerWidth - 16);
  popover.style.width = `${width}px`;
  positionPopoverNear(anchor, popover);
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    popover.remove();
    document.removeEventListener('pointerdown', outside);
  };
  const outside = event => { if (!popover.contains(event.target) && !anchor.contains(event.target)) close(); };
  const apply = value => {
    const next = String(value || '').trim();
    if (next !== current) {
      recordHistory();
      applyShotFieldMutation(shot, field, next, { source: 'preset' });
      markDirty();
    }
    close();
    renderCurrentView();
    renderInspector();
    const linkedLens = field === 'shot_size' ? SHOT_SIZE_LENS_RECOMMENDATIONS[next] : '';
    toast(`${config.label}已设为：${presetDisplayValue(field, next)}${linkedLens ? ` · 焦段已关联 ${linkedLens}` : ''}`);
  };
  setTimeout(() => document.addEventListener('pointerdown', outside), 0);
  $('[data-preset-close]', popover)?.addEventListener('click', close);
  $$('[data-preset-value]', popover).forEach(button => button.addEventListener('click', () => apply(button.dataset.presetValue)));
  $('.preset-custom-form', popover)?.addEventListener('submit', event => {
    event.preventDefault();
    apply(new FormData(event.currentTarget).get('customValue'));
  });
  popover.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); close(); anchor.focus?.(); }
  });
  (popover.querySelector('.preset-option.is-selected') || popover.querySelector('.preset-option') || popover.querySelector('input'))?.focus();
}

function openFieldEditor(title, value = '', multiline = false) {
  const dialog = $('#fieldEditorModal');
  const form = $('#fieldEditorForm');
  const input = $('#fieldEditorInput');
  if (!dialog || !form || !input) return Promise.resolve(null);
  $('#fieldEditorTitle').textContent = title;
  $('#fieldEditorLabel').firstChild.textContent = `${title} `;
  input.value = value ?? '';
  input.rows = multiline ? 6 : 1;
  input.style.resize = multiline ? 'vertical' : 'none';
  dialog.showModal();
  setTimeout(() => input.focus(), 0);
  return new Promise(resolve => {
    let settled = false;
    const finish = result => { if (settled) return; settled = true; form.onsubmit = null; input.onkeydown = null; dialog.close(); resolve(result); };
    form.onsubmit = event => { event.preventDefault(); finish(input.value); };
    form.querySelector('[data-close="fieldEditorModal"]')?.addEventListener('click', () => finish(null), { once: true });
    input.onkeydown = event => {
      if (event.key === 'Escape') { event.preventDefault(); finish(null); }
      if (event.key === 'Enter' && !multiline) { event.preventDefault(); finish(input.value); }
      if (event.key === 'Enter' && multiline && (event.ctrlKey || event.metaKey)) { event.preventDefault(); finish(input.value); }
    };
  });
}

function confirmAction(title, message) {
  const dialog = $('#confirmActionModal');
  const form = $('#confirmActionForm');
  if (!dialog || !form) return Promise.resolve(false);
  $('#confirmActionTitle').textContent = title;
  $('#confirmActionMessage').textContent = message;
  dialog.showModal();
  return new Promise(resolve => {
    let settled = false;
    const finish = result => { if (settled) return; settled = true; form.onsubmit = null; dialog.close(); resolve(result); };
    form.onsubmit = event => { event.preventDefault(); finish(true); };
    form.querySelector('[data-confirm="cancel"]')?.addEventListener('click', () => finish(false), { once: true });
  });
}

function openMethodsPopover(anchor, shot) {
  document.querySelector('.methods-popover')?.remove();
  const popover = document.createElement('div');
  popover.className = 'methods-popover';
  popover.setAttribute('role', 'dialog');
  const selected = new Set(methodValues(shot));
  popover.innerHTML = `<div class="methods-popover-head"><b>制作方式</b><span>可多选</span></div><input class="methods-search" placeholder="搜索制作方式…" aria-label="搜索制作方式"><div class="methods-options">${PRODUCTION_METHODS.map(([code, label]) => `<label data-method-option="${code}"><input type="checkbox" value="${code}" ${selected.has(code) ? 'checked' : ''}><span>${escapeHtml(label)}</span></label>`).join('')}</div><div class="methods-popover-foot"><button class="btn btn-ghost" data-method-cancel>取消</button><button class="btn btn-primary" data-method-apply>应用</button></div>`;
  document.body.append(popover);
  positionPopoverNear(anchor, popover);
  const close = () => { popover.remove(); document.removeEventListener('pointerdown', outside); };
  const outside = event => { if (!popover.contains(event.target) && !anchor.contains(event.target)) close(); };
  setTimeout(() => document.addEventListener('pointerdown', outside), 0);
  $('.methods-search', popover)?.addEventListener('input', event => {
    const q = event.target.value.trim().toLowerCase();
    $$('[data-method-option]', popover).forEach(row => row.hidden = q && !row.textContent.toLowerCase().includes(q));
  });
  $('[data-method-cancel]', popover)?.addEventListener('click', close);
  $('[data-method-apply]', popover)?.addEventListener('click', async () => {
    const values = $$('input[type="checkbox"]:checked', popover).map(input => input.value);
    if (!values.length) { toast('至少选择一种制作方式', true); return; }
    recordHistory();
    shot.primary_method = values[0];
    shot.secondary_methods = values.slice(1);
    markDirty();
    close();
    renderTableView();
    renderInspector();
    toast('制作方式已更新');
  });
}

let loginCooldownTimer = null;

function stopLoginCooldown() {
  if (loginCooldownTimer) window.clearInterval(loginCooldownTimer);
  loginCooldownTimer = null;
  const button = $('#loginForm button[type="submit"]');
  if (button) button.disabled = false;
}

function updateAdminVisibility() {
  const isAdmin = String(state.session?.role || '').toLowerCase() === 'admin';
  const button = $('#userAdminBtn');
  if (button) button.classList.toggle('hidden', !isAdmin);
  const profileButton = $('#userProfileBtn');
  if (profileButton) {
    profileButton.title = isAdmin ? '打开管理员管理中心' : '修改头像和用户名';
    profileButton.setAttribute('aria-label', isAdmin ? '管理员管理中心' : '个人信息与偏好设置');
  }
}

function startLoginCooldown(seconds = 30) {
  stopLoginCooldown();
  const form = $('#loginForm');
  const button = form?.querySelector('button[type="submit"]');
  const error = $('#loginError');
  if (!button || !error) return;
  const deadline = Date.now() + Math.max(1, Number(seconds) || 30) * 1000;
  button.disabled = true;
  const update = () => {
    const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    if (!remaining) {
      stopLoginCooldown();
      error.textContent = '';
      return;
    }
    error.textContent = `错误次数过多，请 ${remaining}s 后再试`;
  };
  update();
  loginCooldownTimer = window.setInterval(update, 250);
}

// --------------------------------------------------------------------------
// 2. TOAST & API DISPATCHER
// --------------------------------------------------------------------------
let toastDismissTimer;
function toast(message, bad = false) {
  const el = $('#toast');
  if (!el) return;
  const level = typeof bad === 'string' ? bad : bad ? 'error' : 'success';
  const icons = {error:'error',warning:'warning',success:'check_circle',info:'info'};
  el.dataset.level = icons[level] ? level : 'info';
  el.setAttribute('role', level === 'error' ? 'alert' : 'status');
  el.innerHTML = `<svg class="g-icon" aria-hidden="true"><use href="#icon-${icons[level] || 'info'}"></use></svg><span>${escapeHtml(message)}</span>`;
  el.style.removeProperty('border-color');
  el.classList.add('show');
  clearTimeout(toastDismissTimer);
  toastDismissTimer = setTimeout(() => el.classList.remove('show'), level === 'error' ? 5000 : 3000);
}

function showConflictDialog(error) {
  const data = error?.conflictData || error?.payload || {};
  const server = data.server_version || {};
  const yours = data.your_version || {};
  const projectId = state.bundle?.project?.id;
  if (!projectId || !yours.id) return;
  state.saveConflict = { projectId, error };
  clearTimeout(state.autoSaveTimer);
  state.autoSaveTimer = null;
  state.saveQueued = false;
  document.querySelector('dialog[data-save-conflict]')?.remove();
  const dialog = document.createElement('dialog');
  dialog.dataset.saveConflict = projectId;
  dialog.className = 'standard-dialog';
  dialog.innerHTML = `<div class="dialog-card conflict-dialog"><div class="dialog-head"><div><h2>检测到并发冲突</h2><p class="modal-subtitle">相同字段已被另一位协作者修改，请明确选择。</p></div><button class="btn-ghost-icon" data-conflict="close">×</button></div><div class="conflict-columns"><section><h3>服务器版本</h3><pre>${escapeHtml(JSON.stringify(server, null, 2))}</pre></section><section><h3>你的版本</h3><pre>${escapeHtml(JSON.stringify(yours, null, 2))}</pre></section></div><div class="dialog-foot"><button class="btn btn-ghost" data-conflict="server">保留服务器版本</button><button class="btn btn-primary" data-conflict="overwrite">覆盖服务器版本</button></div></div>`;
  document.body.append(dialog);
  const close = () => { dialog.close(); dialog.remove(); };
  dialog.querySelector('[data-conflict="close"]')?.addEventListener('click', close);
  const resolve = async keepServer => {
    if (dialog.dataset.resolving || state.bundle?.project?.id !== projectId) return;
    dialog.dataset.resolving = 'true';
    try {
      // A conflict response lacks the related custom values/panels. Fetch a
      // complete shot, but never replace the other locally edited shots.
      const latest = await api(`/api/projects/${encodeURIComponent(projectId)}`);
      if (state.bundle?.project?.id !== projectId) return;
      const remote = latest.shots.find(shot => shot.id === yours.id);
      if (!remote) throw new Error('该镜头已被删除，请保留本地内容并处理删除冲突。');
      if (Number(remote.revision) !== Number(server.revision)) {
        showConflictDialog({ conflictData: { ...data, server_version: remote } });
        return;
      }
      const local = state.bundle.shots.find(shot => shot.id === yours.id) || state.historyDeletedShots.get(yours.id);
      if (!local) throw new Error('本地镜头已变化，请重新保存后处理冲突。');
      const pending = prepareCollaborativeShots(state.bundle).find(shot => shot.id === yours.id);
      const conflicts = new Set(data.conflicting_fields || yours.changed_fields || []);
      const merged = adoptServerBundle({ shots: [structuredClone(remote)] }).shots[0];
      for (const field of pending?.changed_fields || []) {
        if (keepServer && conflicts.has(field)) continue;
        const key = field === 'import_columns_json' ? 'import_columns' : field;
        merged[key] = structuredClone(key === 'is_deleted' ? pending.is_deleted : local[key]);
      }
      const index = state.bundle.shots.findIndex(shot => shot.id === yours.id);
      if (index >= 0) state.bundle.shots[index] = merged;
      else if (!merged.is_deleted) {
        state.bundle.shots.push(merged);
        state.bundle.shots.sort((a, b) => a.position - b.position);
      }
      state.historyDeletedShots.delete(yours.id);
      if (index < 0 && merged.is_deleted) state.historyDeletedShots.set(yours.id, merged);
      state.historyForceFields.delete(yours.id);
      state.saveConflict = null;
      markDirty();
      close();
      renderProjectHeader();
      renderCurrentView();
      if (state.selection.activeShotId) renderInspector();
      await saveProject({ automatic: false });
    } catch (err) { toast(err.message, true); }
    finally { delete dialog.dataset.resolving; }
  };
  dialog.querySelector('[data-conflict="server"]')?.addEventListener('click', () => resolve(true));
  dialog.querySelector('[data-conflict="overwrite"]')?.addEventListener('click', () => resolve(false));
  dialog.showModal();
}

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.json !== undefined) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.json);
  }
  if (options.method && options.method !== 'GET') {
    headers['X-CSRF-Token'] = state.csrf;
  }

  const isUploadOrImport = path.includes('/upload') || path.includes('/import') || path.includes('/export') || options.body instanceof FormData;
  const timeoutMs = options.timeout !== undefined
    ? options.timeout
    : isUploadOrImport
      ? 0
      : (path.includes('/shots') && options.method === 'PUT') ? 18000 : 15000;

  let timer = null;
  let controller = null;
  let signal = options.signal;
  let timedOut = false;
  let externalAbortHandler = null;

  const cleanup = () => {
    if (timer) clearTimeout(timer);
    if (externalAbortHandler && options.signal && !options.signal.aborted) {
      try { options.signal.removeEventListener('abort', externalAbortHandler); } catch (_) {}
    }
  };

  if (timeoutMs > 0) {
    controller = new AbortController();
    timer = setTimeout(() => {
      timedOut = true;
      controller.abort(new Error(`API 请求超时 (${timeoutMs}ms): ${path}`));
    }, timeoutMs);
    if (options.signal) {
      externalAbortHandler = () => controller.abort(options.signal.reason);
      options.signal.addEventListener('abort', externalAbortHandler, { once: true });
    }
    signal = controller.signal;
  }

  let res;
  try {
    res = await fetch(path, { credentials: 'same-origin', ...options, headers, signal });
  } catch (cause) {
    cleanup();
    // 1. Real timeout — the timer fired and aborted the controller
    if (timedOut) {
      noteNetworkFailure();
      const err = new Error(`网络请求超时 (${timeoutMs}ms)，本地修改已保留`);
      err.cause = cause;
      err.isNetworkError = true;
      err.isTimeout = true;
      throw err;
    }
    // 2. Intentional external abort (watchdog, newer generation, etc.)
    if (options.signal?.aborted || cause?.name === 'AbortError') {
      const err = new Error('请求已取消');
      err.cause = cause;
      err.isAborted = true;
      err.isNetworkError = false;
      throw err;
    }
    // 3. Actual network transport failure
    noteNetworkFailure();
    const err = new Error('无法连接服务器，请检查网络后重试');
    err.cause = cause;
    err.isNetworkError = true;
    err.isTimeout = false;
    throw err;
  }
  try {
    // Keep the same deadline active until the complete response body is read and parsed.
    noteNetworkSuccess();
    if (res.status === 204) return null;
    const type = res.headers.get('content-type') || '';
    const data = type.includes('json') ? await res.json() : await res.text();
    if (res.status === 409) {
      const err = new Error("并发冲突: 另一协作者已修改相同字段");
      err.status = 409;
      err.conflictData = data;
      err.payload = data;
      throw err;
    }
    if (!res.ok) {
      const err = new Error(data?.error || `请求失败 (${res.status})`);
      err.status = res.status;
      err.payload = data;
      throw err;
    }
    return normalizeBundlePayload(data);
  } finally {
    cleanup();
  }
}

function normalizeShotRecord(shot) {
  if (!shot || typeof shot !== 'object') return shot;
  const parse = (value, fallback) => {
    if (value == null || value === '') return fallback;
    if (typeof value !== 'string') return value;
    try { return JSON.parse(value); } catch (_) { return fallback; }
  };
  const array = value => {
    const parsed = parse(value, []);
    return Array.isArray(parsed) ? parsed : [];
  };
  return {
    ...shot,
    locked: shot.locked === true || shot.locked === 1 || shot.locked === '1',
    secondary_methods: array(shot.secondary_methods),
    method_data_json: parse(shot.method_data_json, {}),
    import_columns: parse(shot.import_columns ?? shot.import_columns_json, {}),
    custom_fields: parse(shot.custom_fields, {}),
    panels: array(shot.panels),
    steps: array(shot.steps),
    assets: array(shot.assets),
    comments: array(shot.comments),
    review_history: array(shot.review_history),
    versions: array(shot.versions)
  };
}

function normalizeBundlePayload(data) {
  const bundle = data?.project && Array.isArray(data.shots) ? data : data?.bundle?.project && Array.isArray(data.bundle.shots) ? data.bundle : null;
  if (!bundle) return data;
  const parseArray = value => {
    if (Array.isArray(value)) return value;
    if (typeof value !== 'string') return [];
    try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch (_) { return []; }
  };
  bundle.shots = bundle.shots.map(normalizeShotRecord);
  bundle.assets = parseArray(bundle.assets);
  bundle.sequences = parseArray(bundle.sequences);
  bundle.custom_fields = parseArray(bundle.custom_fields);
  bundle.saved_views = parseArray(bundle.saved_views);
  bundle.snapshots = parseArray(bundle.snapshots);
  bundle.column_preferences = parseArray(bundle.column_preferences);
  bundle.presence = parseArray(bundle.presence);
  return data;
}

function escapeHtml(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showView(id) {
  // bootView 是认证未决态的占位层：一旦确定进入登录页、分享页或应用，就必须收起，
  // 否则它会一直盖在真实内容上面。
  for (const x of ['bootView', 'loginView', 'shareView', 'appView']) {
    $('#' + x)?.classList.toggle('hidden', x !== id);
  }
  document.body.dataset.authState = id === 'appView' ? 'authenticated' : id === 'loginView' ? 'anonymous' : 'pending';
  document.body.dataset.surface = id === 'shareView' ? 'share' : (id === 'loginView' ? 'auth' : 'app');
}

function parseShareToken() {
  const m = location.pathname.match(/^\/share\/([^/]+)/);
  return m && m[1];
}

// --------------------------------------------------------------------------
// 3. UI MODE MANAGEMENT (Single Source of Truth)
// --------------------------------------------------------------------------
function initUiMode() {
  // One complete workspace. Keep explicit column/sidebar preferences intact.
  state.uiMode = 'unified';
  document.body.dataset.uiMode = 'unified';
  localStorage.removeItem('frameforge-ui-mode');
}

document.addEventListener('click', e => {
  const action = e.target.closest('[data-action]');
  if (!action) return;
  const type = action.dataset.action;
  if (type === 'new-project') {
    $('#newProjModal')?.showModal();
  } else if (type === 'edit-project' && action.dataset.projectId) {
    const project = state.projects.find(item => item.id === action.dataset.projectId);
    if (project) openProjectSettings(project);
  } else if (type === 'delete-project' && action.dataset.projectId) {
    const project = state.projects.find(item => item.id === action.dataset.projectId);
    if (!project) return;
    confirmAction('永久删除项目', `将永久删除项目“${project.name}”及其镜头、媒体文件、历史版本、评论和分享链接。此操作无法撤回。`).then(async confirmed => {
      if (!confirmed) return;
      try {
        const result = await api(`/api/projects/${encodeURIComponent(project.id)}`, { method: 'DELETE' });
        if (!result?.deleted) throw new Error('服务器未确认删除结果');
        if (state.bundle?.project?.id === project.id) showDashboard();
        await loadProjects();
        toast(`项目已永久删除${result.files_removed ? `，已清理 ${result.files_removed} 个文件` : ''}`);
      } catch (err) {
        // A relay can lose the response after the server completed deletion.
        // Re-fetch the hub once before presenting a failure to avoid a false
        // “Unable to fetch” after a successful destructive operation.
        if (err.isNetworkError) {
          try {
            await loadProjects();
            if (!state.projects.some(item => item.id === project.id)) {
              if (state.bundle?.project?.id === project.id) showDashboard();
              toast('项目已永久删除');
              return;
            }
          } catch (_) { /* preserve the original network error */ }
        }
        toast(`删除失败：${err.message}`, true);
      }
    });
  } else if (type === 'upload-shot' && action.dataset.shotId) {
    triggerShotMediaUpload(action.dataset.shotId);
  } else if (type === 'open-pdf') {
    openDocumentExportDialog();
  } else if (type === 'add-panel' && action.dataset.shotId) {
    const shot = state.bundle?.shots?.find(item => item.id === action.dataset.shotId);
    if (!shot) return;
    api(`/api/shots/${shot.id}/panels`, { method: 'POST', json: { duration_frames: shot.duration_frames } }).then(async () => {
      state.bundle = adoptServerBundle(await api(`/api/projects/${state.bundle.project.id}`));
      renderInspector();
      toast('Panel 已添加');
    }).catch(err => toast(err.message, true));
  } else if (type === 'delete-panel' && action.dataset.panelId) {
    confirmAction('删除分镜画面', '只移除当前分镜画面关系，不会删除素材文件。').then(async confirmed => {
      if (!confirmed) return;
      try {
        recordHistory();
        await api(`/api/panels/${encodeURIComponent(action.dataset.panelId)}`, { method: 'DELETE' });
        state.bundle = adoptServerBundle(await api(`/api/projects/${state.bundle.project.id}`));
        renderInspector();
        renderCurrentView();
        toast('分镜画面已删除');
      } catch (err) { toast(err.message, true); }
    });
  } else if (type === 'add-step' && action.dataset.shotId) {
    api(`/api/shots/${encodeURIComponent(action.dataset.shotId)}/production-steps`, { method: 'POST', json: { name: '自定义步骤', status: '未开始' } }).then(async () => {
      state.bundle = adoptServerBundle(await api(`/api/projects/${state.bundle.project.id}`));
      renderInspector();
      toast('制作步骤已添加');
    }).catch(err => toast(err.message, true));
  } else if (type === 'delete-step' && action.dataset.stepId) {
    confirmAction('删除制作步骤', '关联的素材不会删除，只移除这条步骤关系。').then(async confirmed => {
      if (!confirmed) return;
      try {
        recordHistory();
        await api(`/api/production-steps/${encodeURIComponent(action.dataset.stepId)}`, { method: 'DELETE' });
        state.bundle = adoptServerBundle(await api(`/api/projects/${state.bundle.project.id}`));
        renderInspector();
        toast('制作步骤已删除');
      } catch (err) { toast(err.message, true); }
    });
  } else if (type === 'copy-share' && action.dataset.shareUrl) {
    navigator.clipboard?.writeText(action.dataset.shareUrl).then(() => toast('链接已复制到剪贴板'));
  } else if (type === 'upload-backup') {
    $('#backupUploadInput')?.click();
  }
});

document.addEventListener('change', async event => {
  const input = event.target.closest('#backupUploadInput, #projectPdfImportInput');
  const file = input?.files?.[0];
  if (!file) return;
  try {
    const signature = new Uint8Array(await file.slice(0, 5).arrayBuffer());
    const isPdf = signature.length === 5 && String.fromCharCode(...signature) === '%PDF-';
    let imported;
    if (isPdf) {
      imported = await api('/api/projects/import-project-pdf', {
        method: 'POST', headers: { 'Content-Type': 'application/pdf' }, body: file
      });
    } else {
      if (file.name.toLowerCase().endsWith('.pdf')) throw new Error('所选文件不是有效 PDF');
      const payload = JSON.parse(await file.text());
      if (!payload?.project || !Array.isArray(payload.shots)) throw new Error('备份文件格式无效');
      imported = await api('/api/projects/import-backup', { method: 'POST', json: payload });
    }
    state.bundle = imported;
    await loadProjects();
    await openProject(imported.project.id);
    if ($('#pdfExportModal')?.open) $('#pdfExportModal').close();
    toast(`备份已导入：${imported.project.name}`);
  } catch (err) { toast(`备份导入失败：${err.message}`, true); }
  input.value = '';
});

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('frameforge-theme', theme);
  const toggle = $('#themeToggle');
  if (toggle) {
    const isDark = theme === 'dark';
    const next = isDark ? '切换至浅色模式' : '切换至深色模式';
    toggle.title = next;
    toggle.setAttribute('aria-label', next);
    const use = toggle.querySelector('use');
    if (use) {
      use.setAttribute('href', isDark ? '#icon-sun' : '#icon-moon');
    }
  }
}

// --------------------------------------------------------------------------
// 4. NAVIGATION & CONTEXT DISPATCHER
// --------------------------------------------------------------------------
function setAppContext(context) {
  state.context = context;
  closeInspector();
  document.body.dataset.context = context;

  renderSidebar();

  if (context === APP_CONTEXT.HUB) {
    state.selection.activeShotId = null;
    state.shareViewToken = null;
    document.body.dataset.hasShot = 'false';
    $('#workspaceContentGrid')?.classList.remove('has-inspector');
    const slot = $('#inspectorSlot');
    if (slot) slot.hidden = true;

    $('#topBreadcrumb')?.classList.remove('hidden');
    if ($('#crumbProject')) $('#crumbProject').textContent = '项目管理大厅';
    $('#crumbSep')?.classList.add('hidden');
    $('#crumbView')?.classList.add('hidden');
    $('#backToListBtn')?.classList.add('hidden');
    if ($('#globalSearchInput')) $('#globalSearchInput').placeholder = '搜索项目...';

    $('#dashboardView')?.classList.remove('hidden');
    $('#projectWorkView')?.classList.add('hidden');
  } else if (context === APP_CONTEXT.PROJECT) {
    $('#topBreadcrumb')?.classList.remove('hidden');
    $('#backToListBtn')?.classList.remove('hidden');
    $('#crumbSep')?.classList.remove('hidden');
    $('#crumbView')?.classList.remove('hidden');
    if (state.bundle && state.bundle.project && $('#crumbProject')) {
      $('#crumbProject').textContent = '全部工程';
    }
    if ($('#globalSearchInput')) $('#globalSearchInput').placeholder = '搜索镜头、描述、旁白…';

    $('#dashboardView')?.classList.add('hidden');
    $('#projectWorkView')?.classList.remove('hidden');

    navigateToView(state.view.current || VIEW.TABLE);
  }
}

async function navigateToView(view) {
  if (!Object.values(VIEW).includes(view)) return;
  tableContextMenu.close();
  if (creativeBoardsMount && view !== state.view.current && !await flushCreativeBoards()) return;
  const changedView = view !== state.view.current;
  state.view.current = view;
  const fullPageView = [VIEW.MOODBOARD, VIEW.LIGHTING, VIEW.METHOD, VIEW.ASSETS, VIEW.VOICEOVER, VIEW.REVIEW, VIEW.DELIVERABLES, VIEW.OVERVIEW].includes(view);
  $('.workspace-toolbar')?.classList.toggle('hidden', fullPageView);

  // View changes dismiss the inspector while preserving the shot selection.
  if (changedView) {
    closeInspector();
  }

  updateSidebarActiveState();
  updateBreadcrumb();
  renderCurrentView();
  // A cursor may be mounted in the previous view's clipped host. Reposition
  // immediately after the new view is mounted so it cannot remain visible in
  // a stale host until the next presence poll or scroll event.
  positionRemotePresenceCursors();
  queuePresenceHeartbeat(true);
}

function updateSidebarActiveState() {
  publishWorkspaceUI();
  $$('.nav-item', $('#appSidebar')).forEach(item => {
    const active = item.dataset.view === state.view.current || (item.dataset.view === VIEW.TABLE && [VIEW.CARDS, VIEW.WALL, VIEW.TIMELINE].includes(state.view.current));
    item.classList.toggle('is-active', active);
    item.setAttribute('aria-current', active ? 'page' : 'false');
  });
  $$('[data-workspace-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.workspaceView === state.view.current)));
}

$('#workspaceViewTabs')?.addEventListener('click', event => {
  const button = event.target.closest('[data-workspace-view]');
  if (button) navigateToView(button.dataset.workspaceView);
});

function updateBreadcrumb() {
  if (state.context === APP_CONTEXT.PROJECT && $('#crumbView')) {
    $('#crumbView').textContent = VIEW_TITLES[state.view.current] || '镜头制作表';
  }
}

// Sidebar 采用稳定导航模型（R5 §5）：分组只是视觉组织，
// 任何时候都不因「未选项目」隐藏模块 —— 未选项目时由主区显示 Empty State。
// 分组依据 R5 §5：制作 / 视觉 / 资源 / 声音 / 审阅 / 项目
const SIDEBAR_ITEMS = [
  { key:'table', view:VIEW.TABLE, group:'制作', label:'分镜工作台', icon:'table_rows' },
  { key:'lighting', view:VIEW.LIGHTING, group:'制作', label:'灯光平面图', icon:'tune' },
  { key:'moodboard', view:VIEW.MOODBOARD, group:'视觉', label:'情绪板', icon:'palette' },
  { key:'method', view:VIEW.METHOD, group:'资源', label:'制作方式分组', icon:'layers', pro:true }, { key:'assets', view:VIEW.ASSETS, group:'资源', label:'素材资产库', icon:'palette', pro:true },
  { key:'voiceover', view:VIEW.VOICEOVER, group:'声音', label:'旁白与对齐', icon:'description', pro:true },
  { key:'review', view:VIEW.REVIEW, group:'审阅', label:'审片与版本', icon:'rate_review', pro:true },
  { key:'deliverables', view:VIEW.DELIVERABLES, group:'项目', label:'交付与导出', icon:'download', pro:true }, { key:'overview', view:VIEW.OVERVIEW, group:'项目', label:'制作概览', icon:'dashboard' }
];
function sidebarPrefs() { try { return { hidden: [], labels: {}, ...JSON.parse(localStorage.getItem('frameforge-sidebar-prefs') || '{}') }; } catch (_) { return { hidden: [], labels: {} }; } }
function saveSidebarPrefs(value) { localStorage.setItem('frameforge-sidebar-prefs', JSON.stringify(value)); }
function positionFloatingLayer(anchor, layer, { placement = 'right-end', offset = 8, padding = 12 } = {}) {
  if (!anchor || !layer) return;
  const anchorRect = anchor.getBoundingClientRect();
  const layerRect = layer.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let left = anchorRect.right + offset;
  let top = anchorRect.bottom - layerRect.height;

  // Horizontal clamp / flip
  if (left + layerRect.width > vw - padding) {
    const leftAlt = anchorRect.left - layerRect.width - offset;
    if (leftAlt >= padding) {
      left = leftAlt;
    } else {
      left = Math.max(padding, Math.min(left, vw - layerRect.width - padding));
    }
  }
  if (left < padding) left = padding;

  // Vertical clamp
  if (top < padding) top = padding;
  if (top + layerRect.height > vh - padding) {
    top = Math.max(padding, vh - layerRect.height - padding);
  }

  layer.style.position = 'fixed';
  layer.style.left = `${Math.round(left)}px`;
  layer.style.top = `${Math.round(top)}px`;
  layer.style.bottom = 'auto';
  layer.style.right = 'auto';
  layer.style.zIndex = '999';
}

function renderSidebarSettings() {
  const sidebar = $('#appSidebar'); if (!sidebar) return;
  const trigger = sidebar.querySelector('[data-sidebar-settings]');
  const old = $('#sidebarSettingsPopover'); if (old) { old.remove(); return; }
  const prefs = sidebarPrefs(); const pop = document.createElement('div'); pop.id = 'sidebarSettingsPopover'; pop.className = 'sidebar-settings-popover';
  pop.innerHTML = `<div class="column-settings-head"><b>侧栏设置</b><button type="button" class="btn-ghost-icon" aria-label="关闭">×</button></div>${SIDEBAR_ITEMS.map(item => `<div class="sidebar-settings-row"><input aria-label="显示${escapeHtml(item.label)}" type="checkbox" data-sidebar-visible="${item.key}" ${prefs.hidden.includes(item.key) ? '' : 'checked'}><input class="sidebar-label-editor" type="text" maxlength="40" data-sidebar-label="${item.key}" value="${escapeHtml(prefs.labels[item.key] || item.label)}" aria-label="编辑${item.label}"></div>`).join('')}<button type="button" class="btn btn-ghost" data-sidebar-reset>恢复默认</button>`;
  document.body.append(pop);
  if (trigger) {
    positionFloatingLayer(trigger, pop);
  }
  pop.querySelector('[aria-label="关闭"]').onclick = () => pop.remove();
  const onDocClick = (e) => {
    if (!pop.contains(e.target) && !e.target.closest('[data-sidebar-settings]')) {
      pop.remove();
      document.removeEventListener('pointerdown', onDocClick);
    }
  };
  setTimeout(() => document.addEventListener('pointerdown', onDocClick), 0);
  pop.querySelectorAll('[data-sidebar-visible]').forEach(input => input.onchange = () => { const key = input.dataset.sidebarVisible; prefs.hidden = prefs.hidden.filter(item => item !== key); if (!input.checked) prefs.hidden.push(key); saveSidebarPrefs(prefs); renderSidebar(); renderSidebarSettings(); });
  pop.querySelectorAll('[data-sidebar-label]').forEach(input => input.onchange = () => {
    const key = input.dataset.sidebarLabel;
    prefs.labels[key] = input.value.trim().slice(0, 40);
    saveSidebarPrefs(prefs); renderSidebar(); renderSidebarSettings();
    $(`[data-sidebar-label="${CSS.escape(key)}"]`)?.focus();
  });
  pop.querySelector('[data-sidebar-reset]').onclick = () => { localStorage.removeItem('frameforge-sidebar-prefs'); renderSidebar(); renderSidebarSettings(); };
}

function renderSidebar() {
  const sidebar = $('#appSidebar');
  if (!sidebar) return;
  if (globalThis.FrameForgeUI?.ready) { publishWorkspaceUI(); return; }

  if (state.context === APP_CONTEXT.HUB) {
    sidebar.innerHTML = `
      <div class="nav-section-label">项目</div>
      <button class="nav-item is-active" data-view="hub">
        <svg class="g-icon"><use href="#icon-folder"></use></svg>
        <span>项目管理大厅</span>
      </button>
    `;
    return;
  }

  // Render navigation once from its catalog; layouts live inside the workspace.

  const prefs = sidebarPrefs();
  const order = [...new Set([...(prefs.order || []), ...SIDEBAR_ITEMS.map(item => item.key)])];
  const visible = order.map(key => SIDEBAR_ITEMS.find(item => item.key === key)).filter(item => item && !(prefs.hidden || []).includes(item.key));
  sidebar.innerHTML = visible.reduce((html, item, index, list) => {
    const group = list[index - 1]?.group === item.group ? '' : `<div class="nav-section-label ${item.pro ? 'pro-only' : ''}">${item.group}</div>`;
    return html + `${group}<button class="nav-item ${item.pro ? 'pro-only' : ''}" data-view="${item.view}" data-sidebar-key="${item.key}"><svg class="g-icon"><use href="#icon-${item.icon}"></use></svg><span>${escapeHtml(prefs.labels?.[item.key] || item.label)}</span></button>`;
  }, '') + `<button type="button" class="sidebar-settings-trigger" data-sidebar-settings title="侧栏显示与名称设置"><svg class="g-icon"><use href="#icon-tune"></use></svg><span>侧栏设置</span></button>`;
  sidebar.querySelectorAll('.nav-item').forEach(item => { item.title = item.textContent.trim(); item.setAttribute('aria-label', item.title); });
  updateSidebarActiveState();
}

// Sidebar Event Delegation
$('#appSidebar')?.addEventListener('click', e => {
  if (e.target.closest('[data-sidebar-settings]')) { e.preventDefault(); renderSidebarSettings(); return; }
  const item = e.target.closest('[data-view]');
  if (!item) return;
  const targetView = item.dataset.view;
  if (targetView === 'hub') {
    showDashboard();
  } else {
    navigateToView(targetView);
  }
});

function renderCurrentView() {
  syncDerivedTimeline();
  const view = state.view.current;
  $$('.view-content').forEach(v => v.classList.add('hidden'));

  if (view === VIEW.TABLE) {
    $('#viewTable')?.classList.remove('hidden');
    renderTableView();
  } else if (view === VIEW.CARDS) {
    $('#viewBoard')?.classList.remove('hidden');
    renderCardsView();
  } else if (view === VIEW.WALL) {
    $('#viewWall')?.classList.remove('hidden');
    renderWallView();
  } else if (view === VIEW.TIMELINE) {
    $('#viewTimeline')?.classList.remove('hidden');
    renderTimelineView();
  } else if (view === VIEW.OVERVIEW) {
    $('#viewOverview')?.classList.remove('hidden');
    renderOverviewView();
  } else if (view === VIEW.VOICEOVER) {
    $('#viewScript')?.classList.remove('hidden');
    renderScriptView();
  } else if (view === VIEW.ASSETS) {
    $('#viewAssets')?.classList.remove('hidden');
    renderAssetsView();
  } else if (view === VIEW.MOODBOARD || view === VIEW.LIGHTING) {
    $('#viewCreativeBoards')?.classList.remove('hidden');
    renderCreativeBoards(view);
  } else if (view === VIEW.REVIEW) {
    $('#viewReview')?.classList.remove('hidden');
    renderReviewView();
  } else if (view === VIEW.DELIVERABLES) {
    $('#viewDeliverables')?.classList.remove('hidden');
    renderDeliverablesView();
  } else if (view === VIEW.METHOD) {
    $('#viewMethodGroups')?.classList.remove('hidden');
    renderMethodGroupsView();
  }
  renderBulkActionBar();
  syncFilterControls();
}

let creativeBoardsMount = null;
async function flushCreativeBoards() {
  if (!creativeBoardsMount) return true;
  if (await creativeBoardsMount.flush()) return true;
  // 保存失败不能把用户永久锁死在当前页面：先把草稿导出给用户，再确认是否放弃离开。
  // 此前任何一次保存被拒都会让导航静默失败，表现为“画板不能创建 / 控件无反应 / 无法切页”。
  const leave = await confirmAction('创意板尚未保存', '服务器拒绝了本次画板保存。离开本页会丢失这些未保存修改。\n\n点击“确定”：先自动下载一份草稿备份，然后离开本页。\n点击“取消”：留在当前页面，可在画板右上角“•••”中重试保存。');
  if (!leave) { toast('创意板尚未保存，请先重试保存或导出草稿；暂未离开当前页面', true); return false; }
  let draftSaved = false;
  try { draftSaved = !!creativeBoardsMount.exportDraft?.(); } catch (_) { draftSaved = false; }
  if (!draftSaved) {
    // 连草稿都没导出来，就不能悄悄放行 —— 那样用户会在毫不知情的情况下丢掉修改。
    const stillLeave = await confirmAction('草稿备份失败', '浏览器未能自动下载草稿备份。\n\n继续离开将永久丢失这些未保存的画板修改，确定要离开吗？\n点击“取消”留在当前页面并重试保存。');
    if (!stillLeave) { toast('已留在当前页面，请在画板右上角“•••”中重试保存', true); return false; }
  }
  return true;
}
function renderCreativeBoards(kind) {
  if (!state.bundle || !globalThis.FrameForgeBoards) return;
  const projectId = state.bundle.project.id;
  creativeBoardsMount = FrameForgeBoards.mount($('#creativeBoardsContainer'), {
    projectId, kind, shots: state.bundle.shots, assets: state.bundle.assets || [], api,
    upload: async file => {
      if (!file.type.startsWith('image/')) throw new Error('情绪板目前支持图片文件');
      let compressed = file;
      try { compressed = await compressImage(file); } catch (_) { /* Keep original when local decoding is unavailable. */ }
      const query = new URLSearchParams({filename: compressed.name || file.name, category: 'Moodboard'});
      const asset = await api(`/api/projects/${projectId}/media?${query}`, {
        method:'POST', headers:{'Content-Type': compressed.type || file.type}, body:compressed
      });
      if (state.bundle?.project?.id === projectId) {
        state.bundle.assets ||= [];
        state.bundle.assets.push(asset);
      }
      return asset;
    },
    onShot: shotId => { selectShot(shotId); navigateToView(VIEW.TABLE); }
  });
}

function timecodeToFrames(value, fps) {
  const parts = String(value || '').trim().split(/[:;.]/).map(Number);
  if (parts.length !== 4 || parts.some(part => !Number.isFinite(part))) return 0;
  const nominal = Math.max(1, Math.round(Number(fps) || 25));
  return (((parts[0] * 60 + parts[1]) * 60 + parts[2]) * nominal) + parts[3];
}

function framesToTimecode(value, fps, isDropFrame = false) {
  let frames = Math.max(0, Math.round(Number(value) || 0));
  if (isDropFrame && Math.abs(Number(fps) - 29.97) < .05) {
    const dropFrames = 2;
    const framesPerMinute = 1798;
    const framesPerTenMinutes = 17982;
    const blocks = Math.floor(frames / framesPerTenMinutes);
    const remainder = frames % framesPerTenMinutes;
    frames += dropFrames * 9 * blocks + (remainder > dropFrames ? dropFrames * Math.floor((remainder - dropFrames) / framesPerMinute) : 0);
    return `${String(Math.floor(frames / 108000)).padStart(2, '0')}:${String(Math.floor(frames / 1800) % 60).padStart(2, '0')}:${String(Math.floor(frames / 30) % 60).padStart(2, '0')};${String(frames % 30).padStart(2, '0')}`;
  }
  const nominal = Math.max(1, Math.round(Number(fps) || 25));
  const framePart = frames % nominal;
  const totalSeconds = Math.floor(frames / nominal);
  return `${String(Math.floor(totalSeconds / 3600)).padStart(2, '0')}:${String(Math.floor(totalSeconds / 60) % 60).padStart(2, '0')}:${String(totalSeconds % 60).padStart(2, '0')}${isDropFrame ? ';' : ':'}${String(framePart).padStart(2, '0')}`;
}

function syncDerivedTimeline() {
  const project = state.bundle?.project;
  const shots = state.bundle?.shots;
  if (!project || !Array.isArray(shots)) return;
  const fps = Math.max(1, Number(project.fps) || 25);
  let cursor = timecodeToFrames(project.start_tc || '01:00:00:00', fps);
  shots.forEach((shot, index) => {
    const frames = Math.max(1, Math.round(Number(shot.duration_frames) || Number(shot.duration_seconds) * fps || fps * 3));
    shot.position = index;
    shot.duration_frames = frames;
    shot.duration_seconds = Number((frames / fps).toFixed(3));
    shot.tc_in_frames = cursor;
    shot.tc_in = framesToTimecode(cursor, fps, Boolean(project.is_drop_frame));
    cursor += frames;
    shot.tc_out_frames = cursor;
    shot.tc_out = framesToTimecode(cursor, fps, Boolean(project.is_drop_frame));
  });
}

// --------------------------------------------------------------------------
// 5. BOOTSTRAPPING & SESSION
// --------------------------------------------------------------------------
// 会话检查必须有上限：请求挂起时不能把用户永久留在启动层
// —— 那样既进不去应用，也看不到登录页，页面像是坏了。
const SESSION_TIMEOUT_MS = 8000;
function withTimeout(promise, ms, controller) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller?.abort(new Error('session-timeout'));
      reject(new Error('session-timeout'));
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function boot() {
  // 这些初始化彼此独立，任何一个抛错都不该阻断整条启动流程。
  for (const step of [initUiMode, installCursorSystem, installCollaborationPresence,
                      installMediaLoadFeedback, requestPersistentMediaStorage]) {
    try { step(); } catch (err) { console.warn('boot step failed:', step.name, err); }
  }
  const token = parseShareToken();
  if (token) {
    showView('shareView');
    return loadShareView(token);
  }

  try {
    const sessionController = new AbortController();
    state.session = await withTimeout(api('/api/session', { signal: sessionController.signal }), SESSION_TIMEOUT_MS, sessionController);
  } catch (err) {
    console.warn('session check failed:', err);
    state.session = null;
    showView('loginView');
    toast('无法确认登录状态，请重试');
    return;
  }
  state.csrf = state.session.csrf || '';
  if (!state.session.authenticated) {
    showView('loginView');
    return;
  }
  try {
    renderSessionProfile();
    updateAdminVisibility();
    showView('appView');
    await loadProjects();
  } catch (err) {
    // 会话已确认有效，只是项目列表没拉到。此时退回登录页只会让人莫名其妙被登出，
    // 所以停在应用外壳并如实提示。
    console.warn('project load failed:', err);
    showView('appView');
    toast('项目列表加载失败，请检查网络后重试');
  }
}

function renderSessionProfile() {
  const session = state.session || {};
  const name = session.display_name || session.username || '用户';
  if ($('#userNameLabel')) $('#userNameLabel').textContent = name;
  const avatar = $('#userAvatar');
  if (avatar) {
    avatar.style.setProperty('--user-color', safePresenceColor(session.color));
    if (session.avatar_url) {
      let img = avatar.querySelector('img');
      if (!img) { img = document.createElement('img'); avatar.replaceChildren(img); }
      img.alt = name;
      if (img.getAttribute('src') !== session.avatar_url) img.src = session.avatar_url;
    } else {
      const initial = Array.from(name)[0] || '用';
      if (avatar.textContent !== initial || avatar.querySelector('img')) avatar.textContent = initial;
    }
  }
}

function installCursorSystem() {
  if (!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches) return;
  document.documentElement.classList.add('ff-cursor-ready');
}

function installCollaborationPresence() {
  globalThis.FrameForgePresenceUI?.install({
    context: () => ({userId: state.session?.user_id, view: state.view.current, shotId: state.selection.activeShotId}),
    navigate: navigateToView,
    select: id => selectShot(id),
    notice: message => toast(message),
    changed: () => queuePresenceHeartbeat(true),
    label: person => VIEW_TITLES[person.workspace] || person.workspace || '镜头表'
  });
  if ($('#remotePresenceLayer')) return;
  const layer = document.createElement('div');
  layer.id = 'remotePresenceLayer';
  layer.className = 'remote-presence-layer';
  layer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(layer);

  document.addEventListener('pointermove', event => {
    if (event.pointerType && !['mouse', 'pen'].includes(event.pointerType)) return;
    if (!state.presenceProjectId || state.context !== APP_CONTEXT.PROJECT) return;
    const host = presenceModuleHost(event.target);
    const point = presencePoint(host, event.clientX, event.clientY);
    if (!point) return;
    const next = point.inside
      ? {
          x: point.x,
          y: point.y,
          visible: true,
          module: host.dataset.presenceModule || host.id
        }
      : { ...state.presencePointer, visible: false };
    const moved = next.visible !== state.presencePointer.visible
      || next.module !== state.presencePointer.module
      || Math.abs((next.x ?? 0) - (state.presencePointer.x ?? 0)) > 0.001
      || Math.abs((next.y ?? 0) - (state.presencePointer.y ?? 0)) > 0.001;
    state.presencePointer = next;
    if (moved) queuePresenceHeartbeat();
  }, { passive: true });

  const hideLocalCursor = () => {
    if (!state.presencePointer.visible) return;
    state.presencePointer = { ...state.presencePointer, visible: false };
    queuePresenceHeartbeat(true);
  };
  window.addEventListener('blur', hideLocalCursor);
  window.addEventListener('resize', () => {
    renderPresence(state.presence);
    positionRemotePresenceCursors();
  }, { passive: true });
  document.addEventListener('scroll', positionRemotePresenceCursors, { passive: true, capture: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) hideLocalCursor();
    else queuePresenceHeartbeat(true);
  });
  window.addEventListener('beforeunload', () => leavePresenceProject(state.presenceProjectId, true));
}

function presenceModuleHost(target) {
  const element = target instanceof Element ? target : null;
  const table = element?.closest('#mainShotTable');
  if (table) {
    const wrap = table.closest('#tableScrollWrap');
    if (wrap) { wrap.dataset.presenceModule = 'table-scroll'; return wrap; }
    table.dataset.presenceModule = 'main-shot-table';
    return table;
  }
  const view = element?.closest('.view-content:not(.hidden)');
  if (view) return view;
  const inspector = element?.closest('#inspectorSlot:not([hidden])');
  if (inspector) return inspector;
  const toolbar = element?.closest('.workspace-toolbar:not(.hidden)');
  if (toolbar) { toolbar.dataset.presenceModule = 'workspace-toolbar'; return toolbar; }
  return null;
}

function getPresenceModule(moduleId) {
  if (!moduleId) return null;
  if (moduleId === 'table-scroll') return $('#tableScrollWrap');
  if (moduleId === 'workspace-toolbar') return $('.workspace-toolbar:not(.hidden)');
  const candidate = document.getElementById(moduleId);
  return candidate && !candidate.classList.contains('hidden') && !candidate.hidden ? candidate : null;
}

function safePresenceColor(value) {
  return /^#[0-9a-f]{6}$/i.test(String(value || '')) ? String(value) : '#5B8DEF';
}

function presencePoint(host, clientX, clientY) {
  const rect = host?.getBoundingClientRect();
  if (!rect || rect.width <= 0 || rect.height <= 0) return null;
  const contentWidth = Math.max(rect.width, host.scrollWidth || rect.width);
  const contentHeight = Math.max(rect.height, host.scrollHeight || rect.height);
  const contentX = clientX - rect.left + (host.scrollLeft || 0);
  const contentY = clientY - rect.top + (host.scrollTop || 0);
  return {
    x: Math.max(0, Math.min(1, contentX / contentWidth)),
    y: Math.max(0, Math.min(1, contentY / contentHeight)),
    inside: clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom
  };
}

function activePresenceField() {
  return activeEditorsForCurrentProject().at(-1)?.field || null;
}

function queuePresenceHeartbeat(immediate = false) {
  if (!state.presenceProjectId || !state.session?.authenticated) return;
  clearTimeout(state.presenceSendTimer);
  const elapsed = Date.now() - state.presenceLastSentAt;
  const delay = immediate ? 0 : Math.max(0, 140 - elapsed);
  state.presenceSendTimer = window.setTimeout(sendPresenceHeartbeat, delay);
}

let presenceResponseSequence = 0;
let presenceAppliedSequence = 0;
function applyPresenceResponse(projectId, sequence, people) {
  if (state.presenceProjectId !== projectId || sequence < presenceAppliedSequence) return;
  presenceAppliedSequence = sequence;
  globalThis.FrameForgePresenceUI?.connection(true);
  renderPresence(Array.isArray(people) ? people : []);
}

function checkSyncWatchdog() {
  const now = Date.now();

  // 1. Recover stale project save (>30s)
  if (state.saveInFlight && state.saveStartedAt && (now - state.saveStartedAt > 30000)) {
    console.warn?.('[sync] recovered stale saveInFlight', {
      duration: now - state.saveStartedAt,
      dirty: state.dirty
    });
    saveRequestToken++;
    state.currentSaveToken = saveRequestToken;
    if (state.saveAbortController) {
      try {
        state.saveAbortController.abort(new Error('Stalled save aborted by watchdog'));
      } catch (_) {}
      state.saveAbortController = null;
    }
    state.saveInFlight = false;
    state.saveStartedAt = null;
    state.dirty = true;
    state.lastSaveError = new Error('检测到上次保存请求卡死，已自动恢复并重试');
    refreshSaveStatus();
    scheduleAutoSave(1000);
  }

  // 2. Recover stale presence poll (>20s)
  if (state.presencePollInFlight && state.presencePollStartedAt && (now - state.presencePollStartedAt > 20000)) {
    console.warn?.('[sync] recovered stale presencePollInFlight');
    state.presencePollInFlight = false;
    state.presencePollStartedAt = null;
  }

  // 3. Recover stale remote refresh (>20s)
  if (state.remoteRefreshInFlight && state.remoteRefreshStartedAt && (now - state.remoteRefreshStartedAt > 20000)) {
    console.warn?.('[sync] recovered stale remoteRefreshInFlight');
    state.remoteRefreshInFlight = false;
    state.remoteRefreshStartedAt = null;
  }
}
window.checkSyncWatchdog = checkSyncWatchdog;

let wakeRecoveryTimer = null;
let lastWakeRecoveryAt = 0;

async function triggerWakeRecovery({ reason = 'wake' } = {}) {
  const now = Date.now();
  if (now - lastWakeRecoveryAt < 1000) return; // Debounce 1000ms
  clearTimeout(wakeRecoveryTimer);
  wakeRecoveryTimer = setTimeout(async () => {
    wakeRecoveryTimer = null;
    lastWakeRecoveryAt = Date.now();
    state.wakeRecoveryCount = (state.wakeRecoveryCount || 0) + 1;
    console.debug?.(`[sync] running foreground/wake recovery (reason: ${reason})`);

    // 1. Verify and recover any stale save / poll in flight state
    checkSyncWatchdog();

    // 2. Flush any pending editor drafts to localStorage
    flushAllPendingEditorDraftsSync();

    // 3. Send immediate presence heartbeat
    queuePresenceHeartbeat(true);

    // 4. Run one presence poll
    pollPresence().catch(() => {});

    // 5. Run one project sync check
    pollProjectSync().catch(() => {});

    // 6. Schedule autosave immediately when local dirty data exists
    if (state.dirty) {
      scheduleAutoSave(0);
    }
  }, 100);
}
window.triggerWakeRecovery = triggerWakeRecovery;

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    triggerWakeRecovery({ reason: 'visibility' });
  } else if (document.visibilityState === 'hidden') {
    flushAllPendingEditorDraftsSync();
  }
});
window.addEventListener('pagehide', () => {
  flushAllPendingEditorDraftsSync();
});
window.addEventListener('focus', () => {
  triggerWakeRecovery({ reason: 'focus' });
});
window.addEventListener('online', () => {
  // navigator/browser online is only a hint.
  // Only a successful real FRAMEFORGE HTTP request may call noteNetworkSuccess().
  triggerWakeRecovery({ reason: 'online' });
});

async function sendPresenceHeartbeat() {
  const projectId = state.presenceProjectId;
  if (!projectId) return;
  if (state.presenceSendInFlight) { state.presenceSendQueued = true; return; }
  state.presenceSendInFlight = true;
  const editor = activeEditorsForCurrentProject().at(-1);
  const sequence = ++presenceResponseSequence;
  state.presenceLastSentAt = Date.now();
  try {
    const data = await api('/api/v1/presence/heartbeat', {
      method: 'POST',
      json: {
        production_id: projectId,
        workspace: state.view.current || VIEW.TABLE,
        module: state.presencePointer.module || '',
        shot_id: editor?.shotId || state.selection.activeShotId,
        field: activePresenceField(),
        presence_state: document.hidden ? 'idle' : editor ? 'editing' : 'viewing',
        cursor: state.presencePointer
      },
      timeout: 10000
    });
    applyPresenceResponse(projectId, sequence, data?.presence);
  } catch (_) {
    // Presence is intentionally non-blocking; editing must remain available
    // during a transient polling or network failure.
  } finally {
    state.presenceSendInFlight = false;
    if (state.presenceSendQueued) {
      state.presenceSendQueued = false;
      queuePresenceHeartbeat(true);
    }
  }
}

async function pollPresence() {
  checkSyncWatchdog();
  const projectId = state.presenceProjectId;
  if (!projectId || state.presencePollInFlight) return;
  state.presencePollInFlight = true;
  state.presencePollStartedAt = Date.now();
  const sequence = ++presenceResponseSequence;
  try {
    const people = await api(`/api/v1/productions/${encodeURIComponent(projectId)}/presence`, { timeout: 10000 });
    applyPresenceResponse(projectId, sequence, people);
  } catch (_) {} finally {
    state.presencePollInFlight = false;
    state.presencePollStartedAt = null;
  }
}

// 任何进行中的编辑都必须挡住远程刷新与页面导航：否则 DOM 被重建时，
// contenteditable 不会触发 blur，用户正在输入的内容会直接丢失。
// 新增编辑态时务必把 class 加到这里（此前就是因为漏了 .is-rich-editing 才被轮询冲掉内容）。
const ACTIVE_EDIT_SELECTOR = '.is-text-editing, .inline-edit-input, .inline-cell-editor, .has-active-editor, .is-rich-editing';

// Presentation only: never serialize motion state or await it in a save path.
const collaborativeMotionAnimations = new Set();
function motionAllowed() {
  return !matchMedia('(prefers-reduced-motion: reduce)').matches && document.body.dataset.effects !== 'reduced';
}
function cancelCollaborativeAnimations(element = null) {
  for (const animation of collaborativeMotionAnimations) {
    if (!element || animation.effect?.target === element) {
      animation.cancel();
      collaborativeMotionAnimations.delete(animation);
    }
  }
}
const collaborativeMotionPreference = matchMedia('(prefers-reduced-motion: reduce)');
collaborativeMotionPreference.addEventListener?.('change', event => { if (event.matches) cancelCollaborativeAnimations(); });
new MutationObserver(records => {
  if (records.some(record => record.attributeName === 'data-effects') && document.body.dataset.effects === 'reduced') cancelCollaborativeAnimations();
}).observe(document.body, {attributes:true, attributeFilter:['data-effects']});
const collaborativeMotionTableView = document.querySelector('#viewTable');
if (collaborativeMotionTableView) new MutationObserver(() => {
  if (collaborativeMotionTableView.classList.contains('hidden')) cancelCollaborativeAnimations();
}).observe(collaborativeMotionTableView, {attributes:true, attributeFilter:['class']});
function animateElement(element, keyframes, duration = 200) {
  if (!element?.isConnected || !motionAllowed() || !element.animate) return Promise.resolve();
  cancelCollaborativeAnimations(element);
  const animation = element.animate(keyframes, {duration, easing:'cubic-bezier(.2,0,0,1)', id:'ff-collab-update'});
  collaborativeMotionAnimations.add(animation);
  return animation.finished.catch(() => {}).finally(() => collaborativeMotionAnimations.delete(animation));
}
function visibleMotionElements(selector) {
  const clip = $('#tableScrollWrap')?.getBoundingClientRect();
  return $$(selector).filter(el => {
    const r = el.getBoundingClientRect();
    return r.width && r.height && r.bottom > Math.max(0,clip?.top || 0) && r.top < Math.min(innerHeight,clip?.bottom || innerHeight) && r.right > 0 && r.left < innerWidth;
  }).slice(0, 100);
}
function captureRowRects() {
  return new Map(visibleMotionElements('#mainShotTable tr[data-id]').map(el => [el.dataset.id, el.getBoundingClientRect()]));
}
function animateRowFlip(before) {
  if (!motionAllowed()) return;
  visibleMotionElements('#mainShotTable tr[data-id]').forEach(el => {
    const old = before.get(el.dataset.id);
    if (!old) return;
    const dy = old.top - el.getBoundingClientRect().top;
    if (Math.abs(dy) > 1) void animateElement(el, [{transform:`translateY(${dy}px)`},{transform:'translateY(0)'}]);
  });
}
function diffCollaborativeBundle(before, after) {
  const previous = new Map((before?.shots || []).map(s => [s.id,s]));
  const next = new Set((after?.shots || []).map(s => s.id));
  const patch = {changedCells:[], insertedShotIds:[], removedShotIds:[...previous.keys()].filter(id => !next.has(id))};
  for (const shot of after?.shots || []) {
    const old = previous.get(shot.id);
    if (!old) { patch.insertedShotIds.push(shot.id); continue; }
    for (const field of COLLAB_SYNC_FIELDS.filter(f => !['number','is_deleted','rich_text_json'].includes(f))) {
      if (JSON.stringify(old[field]) !== JSON.stringify(shot[field])) patch.changedCells.push({shotId:shot.id,field:field === 'duration_frames' ? 'duration_seconds' : field});
    }
    for (const key of new Set([...Object.keys(old.custom_fields || {}),...Object.keys(shot.custom_fields || {})])) {
      if (JSON.stringify(old.custom_fields?.[key]) !== JSON.stringify(shot.custom_fields?.[key])) patch.changedCells.push({shotId:shot.id,field:`custom:${key}`});
    }
  }
  return patch;
}
function animateCollaborativePatch(patch, rects) {
  if (!motionAllowed()) return;
  // New remote state supersedes the previous highlight/FLIP; never stack motion
  // across successive polls, especially when the same cell changes repeatedly.
  cancelCollaborativeAnimations();
  animateRowFlip(rects);
  for (const id of patch.insertedShotIds) {
    visibleMotionElements(`#mainShotTable tr[data-id="${CSS.escape(id)}"]`).forEach(el => void animateElement(el,[{opacity:.4,transform:'translateY(4px)'},{opacity:1,transform:'translateY(0)'}]));
  }
  for (const {shotId,field} of patch.changedCells) {
    const selector = `#mainShotTable td[data-shot-id="${CSS.escape(shotId)}"][data-field="${CSS.escape(field)}"]`;
    const cells = visibleMotionElements(selector);
    if (state.inspector.open && state.inspector.targetShotId === shotId) cells.push(...$$(`#inspectorSlot [data-field="${CSS.escape(field)}"]`));
    for (const cell of cells) {
      if (cell.querySelector('input,textarea,[contenteditable="true"]')) continue;
      void animateElement(cell,[{backgroundColor:'color-mix(in srgb, var(--accent) 18%, transparent)'},{backgroundColor:'transparent'}],700);
    }
  }
}

async function pollProjectSync() {
  checkSyncWatchdog();
  const projectId = state.presenceProjectId;
  const blocked = () => state.dirty || state.saveInFlight || state.saveConflict || state.projectNavigationInFlight || columnPreferenceWrites.has(projectId) || shotReorderInFlight || document.body.classList.contains('is-reordering') || document.querySelector(ACTIVE_EDIT_SELECTOR) || hasDirtyActiveEditor() || state.saveRefreshInFlight;
  if (!projectId || state.remoteRefreshInFlight || blocked()) return;
  state.remoteRefreshInFlight = true;
  state.remoteRefreshStartedAt = Date.now();
  const versionAtStart = state.changeVersion;
  const columnsAtStart = state.bundle?.column_preferences;
  try {
    const sync = await api(`/api/projects/${encodeURIComponent(projectId)}/sync-state`, { timeout: 10000 });
    if (!sync?.updated_at || sync.updated_at === state.lastServerUpdatedAt) return;
    if (state.presenceProjectId !== projectId || blocked() || state.changeVersion !== versionAtStart) return;
    const activeShotId = state.selection.activeShotId;
    const latest = await api(`/api/projects/${encodeURIComponent(projectId)}`, { timeout: 12000 });
    if (state.presenceProjectId !== projectId || state.bundle?.project?.id !== projectId || blocked() || state.changeVersion !== versionAtStart || state.bundle.column_preferences !== columnsAtStart) return;
    const patch = diffCollaborativeBundle(state.bundle, latest);
    const rects = captureRowRects();
    state.bundle = adoptServerBundle(latest);
    state.lastServerUpdatedAt = latest.project.updated_at || sync.updated_at;
    state.selection.activeShotId = latest.shots.some(shot => shot.id === activeShotId) ? activeShotId : (latest.shots[0]?.id || null);
    renderProjectHeader();
    renderCurrentView();
    if (state.inspector.open) renderInspector();
    animateCollaborativePatch(patch, rects);
    refreshSaveStatus();
  } catch (_) {
    // Background sync must never interrupt local editing.
  } finally {
    state.remoteRefreshInFlight = false;
    state.remoteRefreshStartedAt = null;
  }
}

function startPresenceSync(projectId) {
  if (!projectId) return;
  if (state.presenceProjectId && state.presenceProjectId !== projectId) stopPresenceSync({ notify: true });
  state.presenceProjectId = projectId;
  state.presencePointer = { x: null, y: null, visible: false, module: '' };
  clearInterval(state.presencePollTimer);
  clearInterval(state.presenceHeartbeatTimer);
  clearInterval(state.projectSyncTimer);
  state.presencePollTimer = window.setInterval(pollPresence, 1000);
  state.presenceHeartbeatTimer = window.setInterval(() => queuePresenceHeartbeat(true), 8000);
  state.projectSyncTimer = window.setInterval(pollProjectSync, 2200);
  queuePresenceHeartbeat(true);
}

function leavePresenceProject(projectId, keepalive = false) {
  if (!projectId || !state.csrf) return Promise.resolve();
  return fetch('/api/v1/presence/leave', {
    method: 'POST',
    credentials: 'same-origin',
    keepalive,
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': state.csrf },
    body: JSON.stringify({ production_id: projectId })
  }).catch(() => null);
}

function stopPresenceSync({ notify = false } = {}) {
  presenceAppliedSequence = ++presenceResponseSequence;
  const projectId = state.presenceProjectId;
  clearInterval(state.presencePollTimer);
  clearInterval(state.presenceHeartbeatTimer);
  clearInterval(state.projectSyncTimer);
  clearTimeout(state.presenceSendTimer);
  state.presencePollTimer = null;
  state.presenceHeartbeatTimer = null;
  state.projectSyncTimer = null;
  state.presenceSendTimer = null;
  state.presenceProjectId = null;
  state.presence = [];
  state.presencePointer = { x: null, y: null, visible: false, module: '' };
  renderPresence([]);
  if (notify) leavePresenceProject(projectId, true);
}

function renderPresence(people) {
  state.presence = Array.isArray(people) ? [...people].sort((a, b) => String(a.user_id).localeCompare(String(b.user_id))) : [];
  globalThis.FrameForgePresenceUI?.update(state.presence);
  const ownId = String(state.session?.user_id || '');
  const collaborators = state.presence.filter(person => String(person.user_id) !== ownId);
  const participants = state.presence.length ? state.presence : (state.session?.authenticated ? [{
    user_id: ownId,
    display_name: state.session.display_name || state.session.username || '我',
    status: 'active',
    color: state.session.color,
    avatar_url: state.session.avatar_url,
    workspace: state.view.current
  }] : []);
  const cluster = $('#presenceCluster');
  if (cluster) {
    const maximum = window.innerWidth < 720 ? 2 : 4;
    const existing = new Map($$('[data-presence-user]', cluster).map(node => [node.dataset.presenceUser, node]));
    const used = new Set();
    participants.slice(0, maximum).forEach((person, index) => {
      const userId = String(person.user_id || '');
      let avatar = existing.get(userId);
      if (!avatar) {
        avatar = document.createElement('span');
        avatar.dataset.presenceUser = userId;
        avatar.className = 'presence-avatar';
      }
      used.add(userId);
      const name = String(person.display_name || person.user_id || '协作者');
      avatar.classList.toggle('is-idle', person.status === 'idle');
      avatar.classList.toggle('is-self', userId === ownId);
      avatar.setAttribute('role', 'listitem');
      avatar.setAttribute('aria-label', `${name}，${person.status === 'idle' ? '暂离' : '在线'}`);
      avatar.title = `${name} · ${VIEW_TITLES[person.workspace] || person.workspace || '镜头表'} · ${person.status === 'idle' ? '暂离' : '在线'}`;
      avatar.style.setProperty('--presence-color', safePresenceColor(person.color));
      if (person.avatar_url) {
        let image = avatar.querySelector('img');
        if (!image) {
          image = document.createElement('img');
          image.alt = '';
          avatar.replaceChildren(image);
        }
        if (image.getAttribute('src') !== person.avatar_url) image.src = person.avatar_url;
      } else if (!avatar.querySelector(':scope > span')) {
        const initial = document.createElement('span');
        initial.textContent = Array.from(name.trim())[0] || '协';
        avatar.replaceChildren(initial);
      } else {
        avatar.querySelector(':scope > span').textContent = Array.from(name.trim())[0] || '协';
      }
      if (!avatar.querySelector(':scope > i')) avatar.append(document.createElement('i'));
      if (cluster.children[index] !== avatar) cluster.insertBefore(avatar, cluster.children[index] || null);
    });
    existing.forEach((avatar, userId) => { if (!used.has(userId)) avatar.remove(); });
    let more = cluster.querySelector('[data-presence-more]');
    if (participants.length > maximum) {
      if (!more) {
        more = document.createElement('span');
        more.dataset.presenceMore = 'true';
        more.className = 'presence-avatar presence-more';
      }
      more.setAttribute('role', 'listitem');
      more.textContent = `+${participants.length - maximum}`;
      more.title = participants.slice(maximum).map(person => person.display_name || person.user_id).join('、');
      if (cluster.lastElementChild !== more) cluster.appendChild(more);
    } else more?.remove();
    cluster.classList.toggle('hidden', participants.length === 0 || state.context !== APP_CONTEXT.PROJECT);
  }

  const layer = $('#remotePresenceLayer');
  if (!layer) return;
  // Cursors are re-parented into the active module's clipped layer during
  // positioning. Query only cursor nodes here so presence avatars in the HUD
  // are not mistaken for canvas overlays.
  const existing = new Map($$('.remote-presence-cursor[data-presence-user]').map(cursor => [cursor.dataset.presenceUser, cursor]));
  const activeIds = new Set();
  collaborators.forEach(person => {
    const userId = String(person.user_id || '');
    if (!userId) return;
    activeIds.add(userId);
    let cursor = existing.get(userId);
    if (!cursor) {
      cursor = document.createElement('div');
      cursor.className = 'remote-presence-cursor';
      cursor.dataset.presenceUser = userId;
      cursor.innerHTML = '<svg viewBox="0 0 28 28" aria-hidden="true"><path d="M3.2 2.5v18.1l4.7-4 3.75 7.9 3.25-1.55-3.7-7.75h6.15L3.2 2.5Z"/></svg><span></span>';
      layer.appendChild(cursor);
    }
    const color = safePresenceColor(person.color);
    cursor.style.setProperty('--presence-color', color);
    cursor.querySelector('span').textContent = String(person.display_name || person.user_id || '协作者');
    cursor.classList.toggle('label-left', Number(person.cursor_x) > 0.72);
    cursor.classList.toggle('label-up', Number(person.cursor_y) > 0.82);
    cursor.classList.toggle('is-idle', person.status === 'idle');
  });
  existing.forEach((cursor, userId) => { if (!activeIds.has(userId)) cursor.remove(); });
  positionRemotePresenceCursors();
}

function positionRemotePresenceCursors() {
  const layer = $('#remotePresenceLayer');
  if (!layer) return;
  const ownId = String(state.session?.user_id || '');
  state.presence.filter(person => String(person.user_id) !== ownId).forEach(person => {
    // Cursors move into a module-local clipped layer after their first
    // position. Searching only inside #remotePresenceLayer therefore loses
    // the same cursor on its next update.
    const cursor = $$('.remote-presence-cursor[data-presence-user]').find(item => item.dataset.presenceUser === String(person.user_id));
    if (!cursor) return;
    const x = Number(person.cursor_x);
    const y = Number(person.cursor_y);
    const host = getPresenceModule(person.module);
    const rect = host?.getBoundingClientRect();
    const visible = state.context === APP_CONTEXT.PROJECT
      && person.workspace === state.view.current
      && person.cursor_visible
      && Number.isFinite(x)
      && Number.isFinite(y)
      && rect
      && rect.width > 0
      && rect.height > 0;
    const contentWidth = Math.max(rect?.width || 0, host?.scrollWidth || rect?.width || 0);
    const contentHeight = Math.max(rect?.height || 0, host?.scrollHeight || rect?.height || 0);
    // The cursor lives inside a module-local clipped layer. The layer itself
    // scrolls with its host, so keep the transform in content coordinates and
    // apply the host scroll offset only when deciding whether it is visible.
    // Subtracting scrollLeft/scrollTop here would double-subtract the scroll.
    const px = rect ? contentWidth * x : 0;
    const py = rect ? contentHeight * y : 0;
    const clip = host?.getBoundingClientRect();
    const scrollLeft = host?.scrollLeft || 0;
    const scrollTop = host?.scrollTop || 0;
    const clientWidth = host?.clientWidth || rect?.width || 0;
    const clientHeight = host?.clientHeight || rect?.height || 0;
    const inside = !clip || (px >= scrollLeft && px <= scrollLeft + clientWidth && py >= scrollTop && py <= scrollTop + clientHeight);
    cursor.classList.toggle('is-visible', Boolean(visible && inside));
    if (visible) {
      let cursorLayer = host?.querySelector(':scope > .remote-presence-host-layer');
      if (host && !cursorLayer) {
        cursorLayer = document.createElement('div');
        cursorLayer.className = 'remote-presence-host-layer';
        if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
        host.appendChild(cursorLayer);
      }
      if (cursorLayer && cursor.parentElement !== cursorLayer) cursorLayer.appendChild(cursor);
      // Counter-scroll the clipped viewport layer, not the cursor content.
      // Its extent stays <= the existing scroll extent (no scroll feedback).
      Object.assign(cursorLayer.style, {inset:'auto',left:'0',top:'0',width:`${clientWidth}px`,height:`${clientHeight}px`,transform:`translate(${scrollLeft}px, ${scrollTop}px)`});
      const nextTransform = `translate3d(${Math.round(px-scrollLeft)}px, ${Math.round(py-scrollTop)}px, 0)`;
      const firstPosition = !cursor.classList.contains('is-positioned');
      cursor.style.transform = nextTransform;
      if (firstPosition) {
        cursor.getBoundingClientRect();
        cursor.classList.add('is-positioned');
      }
    }
  });
}

function updateMediaHost(host) {
  if (!host) return;
  const loading = host.querySelector('img.is-media-loading');
  const failed = host.querySelector('img.is-media-error');
  host.classList.toggle('is-media-loading', Boolean(loading));
  host.classList.toggle('is-media-error', Boolean(failed));
  let indicator = host.querySelector(':scope > .media-load-indicator');
  if (!loading && !failed) {
    indicator?.remove();
    host.classList.remove('media-load-host');
    return;
  }
  host.classList.add('media-load-host');
  if (!indicator) {
    indicator = document.createElement('span');
    indicator.className = 'media-load-indicator';
    indicator.setAttribute('role', 'status');
    indicator.setAttribute('aria-live', 'polite');
    host.appendChild(indicator);
  }
  const status = failed ? 'error' : 'loading';
  if (indicator.dataset.status === status) return;
  indicator.dataset.status = status;
  indicator.innerHTML = failed
    ? `<span class="media-load-error-icon">!</span><span>画面加载失败</span><button type="button" class="media-retry-button" data-image-retry>重试</button>`
    : `<span class="media-load-spinner" aria-hidden="true"></span><span>正在载入画面</span><span class="media-load-bar" aria-hidden="true"><i></i></span>`;
}

const imageLoadControllers = new WeakMap();
function bindImageLoadFeedback(image) {
  if (!(image instanceof HTMLImageElement)) return;
  const existing = imageLoadControllers.get(image);
  if (existing) { existing.start(); return; }
  image.dataset.loadFeedbackBound = 'true';
  const host = image.parentElement;
  if (!host) return;
  let timer = null;
  let visibility = null;
  const clear = () => { clearTimeout(timer); timer = null; visibility?.disconnect(); visibility = null; };
  const loaded = () => {
    clear();
    delete image.dataset.mediaRetry;
    image.classList.remove('is-media-loading', 'is-media-error');
    image.classList.add('is-media-loaded');
    updateMediaHost(host);
  };
  const failed = () => {
    const source = image.currentSrc || image.src || '';
    const isStoryboardMedia = source.includes('/media/');
    const retryCount = Number(image.dataset.mediaRetry || 0);
    if (isStoryboardMedia && navigator.onLine !== false && retryCount < 2) {
      image.dataset.mediaRetry = String(retryCount + 1);
      clear();
      image.classList.remove('is-media-error', 'is-media-loaded');
      image.classList.add('is-media-loading');
      updateMediaHost(host);
      window.setTimeout(() => {
        if (!image.isConnected) return;
        try {
          const retryUrl = new URL(source, location.href);
          retryUrl.searchParams.set('_retry', String(Date.now()));
          image.src = retryUrl.href;
        } catch (_) { image.src = source; }
        start();
      }, 350 * (retryCount + 1));
      return;
    }
    clear();
    image.classList.remove('is-media-loading', 'is-media-loaded');
    image.classList.add('is-media-error');
    updateMediaHost(host);
  };
  image.addEventListener('load', loaded);
  image.addEventListener('error', failed);
  const start = () => {
    clear();
    if (image.complete) { if (image.naturalWidth > 0) loaded(); else failed(); return; }
    image.classList.remove('is-media-error', 'is-media-loaded');
    image.classList.add('is-media-loading');
    updateMediaHost(host);
    const deadline = () => {
      if (timer) return;
      timer = setTimeout(() => { if (image.isConnected) failed(); else clear(); }, 20000);
    };
    // Lazy images below the viewport must not time out before they are requested.
    if (image.loading === 'lazy' && typeof IntersectionObserver !== 'undefined') {
      visibility = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) { visibility?.disconnect(); deadline(); }
      });
      visibility.observe(image);
    } else deadline();
  };
  imageLoadControllers.set(image, { start, clear });
  start();
}

function installMediaLoadFeedback() {
  $$('img').forEach(bindImageLoadFeedback);
  const observer = new MutationObserver(records => records.forEach(record => {
    if (record.type === 'attributes') { bindImageLoadFeedback(record.target); return; }
    record.removedNodes.forEach(node => {
      if (node instanceof HTMLImageElement) imageLoadControllers.get(node)?.clear();
      else if (node instanceof Element) $$('img', node).forEach(img => imageLoadControllers.get(img)?.clear());
    });
    record.addedNodes.forEach(node => {
    if (node instanceof HTMLImageElement) bindImageLoadFeedback(node);
    else if (node instanceof Element) $$('img', node).forEach(bindImageLoadFeedback);
    });
  }));
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'srcset'] });
  document.addEventListener('click', event => {
    const retry = event.target.closest('[data-image-retry]');
    if (!retry) return;
    event.preventDefault();
    event.stopPropagation();
    const host = retry.closest('.media-load-host');
    const image = host?.querySelector('img.is-media-error');
    if (!image) return;
    image.classList.remove('is-media-error');
    image.classList.add('is-media-loading');
    const source = image.currentSrc || image.src;
    try {
      const url = new URL(source, location.href);
      if (url.origin === location.origin && /^https?:$/.test(url.protocol)) url.searchParams.set('_retry', Date.now());
      image.src = url.href;
    } catch (_) { image.src = source; }
    updateMediaHost(host);
  });
}

$('#loginForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  if (loginCooldownTimer) return;
  if ($('#loginError')) $('#loginError').textContent = '';
  const formData = new FormData(e.currentTarget);
  try {
    const data = await api('/api/login', { method: 'POST', json: Object.fromEntries(formData) });
    state.csrf = data.csrf;
    state.session = data;
    stopLoginCooldown();
    renderSessionProfile();
    updateAdminVisibility();
    showView('appView');
    await loadProjects();
  } catch (err) {
    if (err.status === 429) {
      startLoginCooldown(err.payload?.retry_after || 30);
    } else if ($('#loginError')) {
      $('#loginError').textContent = err.message;
    }
  }
});

$('#togglePasswordBtn')?.addEventListener('click', event => {
  const input = $('#loginForm input[name="password"]');
  if (!input) return;
  const reveal = input.type === 'password';
  input.type = reveal ? 'text' : 'password';
  event.currentTarget.setAttribute('aria-pressed', String(reveal));
  event.currentTarget.setAttribute('aria-label', reveal ? '隐藏密码' : '显示密码');
  const use = event.currentTarget.querySelector('use');
  if (use) use.setAttribute('href', reveal ? '#icon-visibility_off' : '#icon-visibility');
});

$('#openRegisterBtn')?.addEventListener('click', () => {
  $('#registerError').textContent = '';
  $('#registerForm')?.reset();
  $('#registerModal')?.showModal();
});

$('#registerForm')?.addEventListener('submit', async event => {
  event.preventDefault();
  const error = $('#registerError');
  if (error) error.textContent = '';
  try {
    const result = await api('/api/register', { method: 'POST', json: Object.fromEntries(new FormData(event.currentTarget)) });
    $('#registerModal')?.close();
    toast(result.message || '申请已提交');
  } catch (err) { if (error) error.textContent = err.message; }
});

async function openAdminCenter() {
  if (String(state.session?.role || '').toLowerCase() !== 'admin') return;
  const modal = $('#userAdminModal');
  const list = $('#userAdminList');
  if (!modal || !list) return;
  if (!modal.open) modal.showModal();
  try {
    const users = await api('/api/admin/users');
    list.innerHTML = users.map(user => `<article class="user-admin-row" data-account-status="${escapeHtml(user.status)}"><div><b>${escapeHtml(user.display_name || user.username)}</b><span>${escapeHtml(user.username)} · ${escapeHtml(user.role)} · ${escapeHtml(user.status)}</span></div><div class="user-admin-actions">${user.status === 'PENDING' ? `<button class="btn btn-primary" data-admin-action="approve" data-user-id="${escapeHtml(user.id)}">批准</button><button class="btn btn-ghost" data-admin-action="reject" data-user-id="${escapeHtml(user.id)}">驳回</button>` : ''}${user.status === 'ACTIVE' && user.id !== state.session?.user_id ? `<button class="btn btn-ghost" data-admin-action="suspend" data-user-id="${escapeHtml(user.id)}">停用</button>` : ''}${user.status === 'SUSPENDED' ? `<button class="btn btn-secondary" data-admin-action="reactivate" data-user-id="${escapeHtml(user.id)}">恢复</button>` : ''}</div></article>`).join('') || '<div class="empty-state">暂无账户</div>';
    $$('[data-admin-action]', list).forEach(button => button.addEventListener('click', async () => {
      const action = button.dataset.adminAction;
      if (['reject', 'suspend'].includes(action) && !await confirmAction('确认用户操作', `确定执行“${action === 'reject' ? '驳回' : '停用'}”吗？`)) return;
      try { await api(`/api/admin/users/${encodeURIComponent(button.dataset.userId)}/${action}`, { method: 'POST', json: {} }); await openAdminCenter(); toast('用户状态已更新'); } catch (err) { toast(err.message, true); }
    }));
  } catch (err) { list.innerHTML = `<div class="empty-state">${escapeHtml(err.message)}</div>`; }
}

$('#userAdminBtn')?.addEventListener('click', openAdminCenter);
$('#userProfileBtn')?.addEventListener('click', () => {
  if (String(state.session?.role || '').toLowerCase() === 'admin') openAdminCenter();
  else openUserProfile();
});
$('#adminProfileBtn')?.addEventListener('click', () => {
  $('#userAdminModal')?.close();
  openUserProfile();
});
$('#adminBackupBtn')?.addEventListener('click', async event => {
  const button = event.currentTarget;
  if (String(state.session?.role || '').toLowerCase() !== 'admin' || button.disabled) return;
  button.disabled = true;
  try {
    const response = await fetch('/api/admin/backup', { credentials: 'same-origin', cache: 'no-store' });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || `备份下载失败（${response.status}）`);
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const filename = response.headers.get('Content-Disposition')?.match(/filename="?([^";]+)"?/i)?.[1];
    anchor.href = url;
    anchor.download = filename || 'frameforge_backup.db';
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('数据库备份已下载');
  } catch (err) { toast(err.message, true); }
  finally { button.disabled = false; }
});

function openUserProfile() {
  const form = $('#userProfileForm');
  if (!form || !state.session) return;
  form.elements.username.value = state.session.username || '';
  form.elements.display_name.value = state.session.display_name || '';
  const preview = $('#profileAvatarPreview');
  const name = state.session.display_name || state.session.username || '用户';
  if (preview) preview.innerHTML = state.session.avatar_url ? `<img src="${escapeHtml(state.session.avatar_url)}" alt="">` : escapeHtml(Array.from(name)[0] || '用');
  $('#userProfileModal')?.showModal();
}

$('.profile-avatar-picker')?.addEventListener('click', () => $('#profileAvatarInput')?.click());
$('#profileAvatarInput')?.addEventListener('change', event => {
  const file = event.target.files?.[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { toast('头像不能超过 5MB', true); event.target.value = ''; return; }
  const preview = $('#profileAvatarPreview');
  if (preview) preview.innerHTML = `<img src="${URL.createObjectURL(file)}" alt="头像预览">`;
});

$('#userProfileForm')?.addEventListener('submit', async event => {
  event.preventDefault();
  const button = event.submitter;
  if (button) button.disabled = true;
  try {
    const file = $('#profileAvatarInput')?.files?.[0];
    let uploaded = null;
    if (file) uploaded = await api('/api/profile/avatar', { method: 'POST', body: file, headers: { 'Content-Type': file.type } });
    const profile = await api('/api/profile', { method: 'PUT', json: Object.fromEntries(new FormData(event.currentTarget)) });
    state.session = { ...state.session, ...profile, avatar_url: uploaded?.avatar_url || profile.avatar_url || state.session.avatar_url };
    renderSessionProfile();
    renderPresence(state.presence);
    $('#userProfileModal')?.close();
    event.currentTarget.reset();
    await loadProjects();
    queuePresenceHeartbeat(true);
    toast('个人资料已同步更新');
  } catch (err) { toast(err.message, true); }
  finally { if (button) button.disabled = false; }
});

$('#logoutBtn')?.addEventListener('click', async () => {
  if (state.pendingUploads > 0) { toast('图片正在上传或缓存，请完成后再退出。', true); return; }
  if (!await flushProjectBeforeLeaving()) return;
  await leavePresenceProject(state.presenceProjectId);
  stopPresenceSync();
  await api('/api/logout', { method: 'POST' });
  location.href = '/';
});

// --------------------------------------------------------------------------
// 6. PROJECT HUB
// --------------------------------------------------------------------------
async function loadProjects() {
  state.projects = await api('/api/projects');
  renderProjectsGrid();
  setAppContext(APP_CONTEXT.HUB);
}

async function flushProjectBeforeLeaving() {
  if (!await flushCreativeBoards()) return false;
  const projectId = state.bundle?.project?.id;
  if (!projectId) return true;
  if (!await flushActiveEditors({ timeout: 5000 })) return false;
  document.activeElement?.blur?.();
  if (state.pendingUploads > 0 || document.querySelector(ACTIVE_EDIT_SELECTOR)) {
    toast('请先完成当前编辑或上传，再离开项目。', true);
    return false;
  }
  try {
    await waitUntil(
      () => !state.saveInFlight && !shotReorderInFlight,
      { timeout: 22000, interval: 25, errorMessage: '等待当前同步完成超时' }
    );
  } catch (_) {
    toast('等待同步完成超时，本地内容已保留', true);
    return false;
  }
  if (state.bundle?.project?.id !== projectId) return false;
  while (state.dirty) {
    if (!await saveProject({ automatic: false })) return false;
    if (state.bundle?.project?.id !== projectId) return false;
  }
  return !state.saveConflict && !state.pendingUploads;
}

async function showDashboard() {
  if (state.projectNavigationInFlight) return false;
  state.projectNavigationInFlight = true;
  try {
  if (!await flushProjectBeforeLeaving()) return false;
  creativeBoardsMount?.(); creativeBoardsMount = null;
  stopPresenceSync({ notify: true });
  clearTimeout(state.autoSaveTimer);
  state.autoSaveTimer = null;
  state.bundle = null;
  state.selection.activeShotId = null;
  state.dirty = false;
  state.undoStack = [];
  state.redoStack = [];
  state.historyForceFields.clear();
  state.historyDeletedShots.clear();
  state.historyOrder = null;
  state.saveConflict = null;
  setAppContext(APP_CONTEXT.HUB);
  return true;
  } finally { state.projectNavigationInFlight = false; }
}

/**
 * R11 §2.4 QA 测试项目隔离：
 * 自动化测试项目统一命名 `qa-<suite>-<timestamp>`，正式 Hub **默认不显示**，
 * 避免污染真实项目列表。需要排查时可设置
 * localStorage['frameforge-show-qa-projects'] = '1' 临时显示。
 */
function isQaProject(project) {
  const n = String((project && project.name) || '').trim();
  if (!n) return false;
  if (/^qa-/i.test(n)) return true;                       // R11 命名规范
  if (/\bQA$/i.test(n)) return true;                      // 以 QA 结尾 = 自动化套件命名
  if (/\bProbe\b/i.test(n)) return true;                  // 探测脚本项目
  if (/ [0-9]{13}$/.test(n)) return true;                 // 「标签 + 13 位毫秒时间戳」= 自动化测试特征
  if (/^(UIUX 视觉验收|Material 3 浏览器验收)/.test(n)) return true; // 视觉验收留痕项目
  return false;
}
function qaProjectsVisible() {
  try { return localStorage.getItem('frameforge-show-qa-projects') === '1'; } catch (_) { return false; }
}

/**
 * R14 §8 Project Cover System —— 项目封面。
 * 默认形态：左侧渐变分镜封面 + Monogram fallback。
 *   色相由项目名哈希决定，同一项目恒定，不会每次刷新跳色。
 * 后续可扩展：Custom Icon / Custom Image / 由 Shot thumbnail 生成的分镜封面。
 * 封面只用于项目识别 —— Project Name 始终是第一信息层级（见 CSS 中 title 的权重）。
 */
function projectCoverMarkup(p) {
  const name = String((p && p.name) || '');
  const isCJK = /[\u4e00-\u9fff]/.test(name);
  const mono = name ? (isCJK ? name.slice(0, 1) : name.slice(0, 2).toUpperCase()) : '#';
  let hue = 0;
  for (let i = 0; i < name.length; i++) hue = (hue * 31 + name.charCodeAt(i)) % 360;
  const coverUrl = p?.cover_media_id ? getMediaUrl(p.cover_media_id) : '';
  const image = coverUrl ? '<img class="project-cover-image" src="' + escapeHtml(coverUrl) + '" alt="" loading="lazy" decoding="async">' : '';
  return '<div class="project-cover ' + (coverUrl ? 'has-image' : 'is-fallback') + '" aria-hidden="true" style="--cover-h:' + hue + '">'
       + image + '<span class="project-cover-wash"></span>'
       + '<span class="project-cover-monogram">' + escapeHtml(mono) + '</span>'
       + '</div>';
}

function hydrateProjectCover(row, project) {
  if (!row || project?.cover_media_id) return;
  const cover = row.querySelector('.project-cover');
  if (!cover || cover.querySelector('img')) return;
  api(`/api/projects/${encodeURIComponent(project.id)}`).then(bundle => {
    const shot = (bundle?.shots || []).find(item => getShotPrimaryMedia(item));
    const url = shot && getShotPrimaryMedia(shot);
    if (!url || !cover.isConnected || cover.querySelector('img')) return;
    const image = document.createElement('img');
    image.className = 'project-cover-image'; image.alt = ''; image.loading = 'lazy'; image.decoding = 'async';
    image.addEventListener('error', () => { image.remove(); cover.classList.remove('has-image'); cover.classList.add('is-fallback'); }, {once:true});
    image.src = url;
    cover.classList.remove('is-fallback'); cover.classList.add('has-image'); cover.prepend(image);
  }).catch(() => {});
}

function renderProjectsGrid() {
  const showQA = qaProjectsVisible();
  const visibleAll = state.projects.filter(p => showQA || !isQaProject(p));
  if ($('#projCountLabel')) $('#projCountLabel').textContent = `最近打开 (${visibleAll.length})`;
  const grid = $('#projectGrid');
  if (!grid) return;
  grid.innerHTML = '';

  const query = state.projectSearchQuery;
  const projects = visibleAll.filter(project => !query || [project.name, project.production_type, project.aspect_ratio].join(' ').toLowerCase().includes(query));

  if (projects.length === 0) {
    grid.innerHTML = `
      <div class="empty-project-state">
        <h3 style="font-size:14px;color:var(--text-primary);margin-bottom:6px;">还没有制作项目</h3>
        <p style="font-size:12px;margin-bottom:16px;">创建第一个影视制作项目。</p>
        <button class="btn btn-primary" data-action="new-project">+ 新建项目</button>
      </div>
    `;
    return;
  }

  projects.forEach(p => {
    const row = document.createElement('div');
    row.className = 'project-row';
    row.innerHTML = `
      ${projectCoverMarkup(p)}
      <div class="project-row-main">
        <div class="project-row-title">${escapeHtml(p.name)}</div>
        <div class="project-row-meta">
          <span>${TYPE_NAMES[p.production_type] || p.production_type}</span> ·
          <span>${p.shot_count || 0} 镜头</span> ·
          <span>${formatSeconds((p.total_frames || 0) / p.fps)}</span> ·
          <span>${p.fps} fps</span> ·
          <span>${p.aspect_ratio}</span>
        </div>
      </div>
      <div class="project-row-side">
        <span class="project-row-modified"><span>${escapeHtml(formatProjectEdited(p.updated_at, true))}</span><small>${escapeHtml(p.updated_by || '修改人未记录')}</small></span>
        <button type="button" class="project-row-edit btn-ghost-icon" data-action="edit-project" data-project-id="${escapeHtml(p.id)}" title="修改项目设置" aria-label="修改 ${escapeHtml(p.name)}"><svg class="g-icon"><use href="#icon-edit"></use></svg></button>
        <span class="project-row-open">打开 →</span>
        <button type="button" class="project-row-delete btn-ghost-icon" data-action="delete-project" data-project-id="${escapeHtml(p.id)}" title="删除项目"><svg class="g-icon"><use href="#icon-delete"></use></svg></button>
      </div>
    `;
    row.querySelector('.project-cover-image')?.addEventListener('error', event => {
      event.target.remove();
      const cover = row.querySelector('.project-cover');
      cover?.classList.remove('has-image'); cover?.classList.add('is-fallback');
    }, {once:true});
    // /api/projects already supplies cover_media_id; never fetch a full bundle for a cover.
    row.tabIndex = 0;
    row.setAttribute('role', 'button');
    row.onclick = event => { if (!event.target.closest('[data-action]')) openProject(p.id); };
    row.onkeydown = event => { if ((event.key === 'Enter' || event.key === ' ') && !event.target.closest('[data-action]')) { event.preventDefault(); openProject(p.id); } };
    grid.append(row);
  });
}

$('#dashNewProjectBtn')?.addEventListener('click', () => $('#newProjModal')?.showModal());
$('#newProjForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const raw = Object.fromEntries(new FormData(e.currentTarget));
  raw.fps = parseFloat(raw.fps);
  raw.target_seconds = parseFloat(raw.target_seconds);
  try {
    const bundle = await api('/api/projects', { method: 'POST', json: raw });
    $('#newProjModal')?.close();
    state.projects.unshift(bundle.project);
    renderProjectsGrid();
    await openProject(bundle.project.id);
    toast('制作项目已创建');
  } catch (err) {
    toast(err.message, true);
  }
});

$('#backToListBtn')?.addEventListener('click', showDashboard);
$('#crumbProject')?.addEventListener('click', () => {
  if (state.context === APP_CONTEXT.PROJECT) showDashboard();
});

// --------------------------------------------------------------------------
// 7. PROJECT WORKSPACE ENGINE
// --------------------------------------------------------------------------
async function openProject(id) {
  window.openProject = openProject;
  if (state.projectNavigationInFlight) return false;
  state.projectNavigationInFlight = true;
  const loading = $('#projectLoadStatus');
  if (loading) {
    loading.hidden = false;
    loading.querySelector('progress').hidden = false;
    $('#projectLoadLabel').textContent = '正在保存并打开工程…';
    $('#projectLoadRetry').hidden = true;
    $('#projectLoadDismiss').hidden = true;
  }
  let loadFailed = false;
  try {
  if (!await flushProjectBeforeLeaving()) return false;
  if (loading) $('#projectLoadLabel').textContent = '正在读取工程与镜头…';
  const prefetched = state.bundle?.project?.id === id ? null : state.projectBundleCache.get(id);
  const nextBundle = prefetched || await api(`/api/projects/${id}`);
  // Editing remains available while the destination loads.
  if (!await flushProjectBeforeLeaving()) return false;
  if (state.presenceProjectId && state.presenceProjectId !== id) stopPresenceSync({ notify: true });
  state.projectBundleCache.delete(id);
  if (state.bundle?.project?.id === id) return true;
  creativeBoardsMount?.(); creativeBoardsMount = null;
  state.bundle = adoptServerBundle(nextBundle);
  clearTimeout(state.autoSaveTimer);
  state.autoSaveTimer = null;
  state.dirty = false;
  state.undoStack = [];
  state.redoStack = [];
  state.historyForceFields.clear();
  state.historyDeletedShots.clear();
  state.historyOrder = null;
  state.saveConflict = null;
  state.selection.selectedShotIds.clear();
  state.bulkColumn = null;
  state.selection.anchorShotId = null;
  state.selection.activeShotId = state.bundle.shots[0]?.id || null;
  state.shareToken = state.bundle.project.share_token;
  state.lastServerUpdatedAt = state.bundle.project.updated_at || '';

  setAppContext(APP_CONTEXT.PROJECT);
  renderProjectHeader();
  renderCurrentView();
  if (state.selection.activeShotId) {
    selectShot(state.selection.activeShotId);
  }
  startPresenceSync(id);
  return true;
  } catch (err) {
    loadFailed = true;
    if (loading) {
      $('#projectLoadLabel').textContent = `打开失败：${err.message}`;
      loading.querySelector('progress').hidden = true;
      $('#projectLoadRetry').hidden = false;
      $('#projectLoadRetry').onclick = () => openProject(id);
      $('#projectLoadDismiss').hidden = false;
      $('#projectLoadDismiss').onclick = () => { loading.hidden = true; };
    }
    toast(err.message, true); return false;
  }
  finally {
    state.projectNavigationInFlight = false;
    if (loading && !loadFailed) loading.hidden = true;
  }
}
window.openProject = openProject;

function formatProjectEdited(value, withTime = false) {
  const date = new Date(value || 0);
  if (!Number.isFinite(date.getTime())) return '—';
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return `今天 ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
  return `${date.getMonth() + 1}月${date.getDate()}日${withTime ? ` ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })}` : ''}`;
}

function renderProjectActivity() {
  const panel = $('#projectActivityPanel');
  if (!panel || !state.bundle) return;
  const activity = (state.bundle.shots || []).map(shot => {
    const latestComment = [...(shot.comments || [])].sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))[0];
    const changedAt = shot.last_change_at || '';
    const commentAt = latestComment?.created_at || '';
    const at = String(commentAt).localeCompare(String(changedAt)) > 0 ? commentAt : changedAt || shot.updated_at || '';
    const kind = commentAt && String(commentAt).localeCompare(String(changedAt)) >= 0 ? '评论了' : '编辑了';
    return { shot, at, kind };
  }).filter(item => item.at).sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 6);
  const actor = state.session?.display_name || state.session?.username || '项目成员';
  panel.innerHTML = `<header><b>活动</b><span>${activity.length} 条最近记录</span></header><div class="project-activity-list">${activity.length ? activity.map(item => `<button type="button" data-activity-shot="${escapeHtml(item.shot.id)}"><span><small>${escapeHtml(actor)}</small><b>${item.kind} SHOT ${escapeHtml(item.shot.number)}</b></span><time>${escapeHtml(formatProjectEdited(item.at, true))}</time></button>`).join('') : '<div class="project-activity-empty">暂无新的编辑或评论</div>'}</div>`;
  $$('[data-activity-shot]', panel).forEach(button => button.addEventListener('click', () => {
    panel.classList.add('hidden');
    $('#projectLastEdited')?.setAttribute('aria-expanded', 'false');
    openShotReview(button.dataset.activityShot, 'comments');
  }));
}

function renderProjectHeader() {
  if (!state.bundle || !state.bundle.project) return;
  const p = state.bundle.project;
  if ($('#crumbProject')) $('#crumbProject').textContent = '全部工程';
  if ($('#currentProjName')) $('#currentProjName').textContent = p.name;
  if ($('#currentProjTypeTag')) $('#currentProjTypeTag').textContent = (TYPE_NAMES[p.production_type] || p.production_type).toUpperCase();

  const totalFrames = state.bundle.shots.reduce((acc, s) => acc + s.duration_frames, 0);
  const totalSeconds = totalFrames / p.fps;

  if ($('#hudTotalDuration')) $('#hudTotalDuration').textContent = formatSeconds(totalSeconds);
  if ($('#hudFps')) $('#hudFps').textContent = `${p.fps} fps`;
  if ($('#hudAspectRatio')) $('#hudAspectRatio').textContent = p.aspect_ratio;
  if ($('#hudShotCount')) $('#hudShotCount').textContent = `${state.bundle.shots.length} 镜头`;
  if ($('#projectLastEdited')) $('#projectLastEdited').textContent = `上次编辑 ${formatProjectEdited(p.updated_at)} · ${p.updated_by || '修改人未记录'}`;
  const favorite = localStorage.getItem(`frameforge-favorite:${p.id}`) === 'true';
  $('#projectFavoriteBtn')?.classList.toggle('is-active', favorite);
  $('#projectFavoriteBtn')?.setAttribute('aria-pressed', String(favorite));
  renderProjectActivity();
}

function openProjectSettings(project = state.bundle?.project) {
  const dialog = $('#projectSettingsModal');
  const form = $('#projectSettingsForm');
  if (!project || !dialog || !form) return;
  form.dataset.projectId = project.id;
  for (const [key, value] of Object.entries({
    name: project.name || '', production_type: project.production_type || 'promo',
    aspect_ratio: project.aspect_ratio || '16:9', fps: String(project.fps || 25),
    target_seconds: project.target_seconds || 1, start_tc: project.start_tc || '01:00:00:00'
  })) {
    const control = form.elements.namedItem(key);
    if (control) control.value = value;
  }
  dialog.showModal();
  form.elements.namedItem('name')?.focus();
}

function getMediaUrl(mediaId) {
  if (!mediaId) return null;
  if (state.mediaCache.has(String(mediaId))) return state.mediaCache.get(String(mediaId));
  const token = state.shareViewToken;
  return `/media/${encodeURIComponent(mediaId)}${token ? `?share=${encodeURIComponent(token)}` : ''}`;
}

function openMediaCache() {
  return new Promise(resolve => {
    if (!window.indexedDB) return resolve(null);
    const request = indexedDB.open('frameforge-browser-cache', 2);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains('media')) request.result.createObjectStore('media');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

async function requestPersistentMediaStorage() {
  try {
    if (!navigator.storage?.persist) return false;
    return await navigator.storage.persist();
  } catch (_) {
    return false;
  }
}

async function pruneMediaCache(db, incomingBytes = 0) {
  if (!db) return;
  let estimate = null;
  try { estimate = await navigator.storage?.estimate?.(); } catch (_) { estimate = null; }
  const quota = Number(estimate?.quota || 512 * 1024 * 1024);
  const target = Math.max(128 * 1024 * 1024, Math.min(2 * 1024 * 1024 * 1024, Math.floor(quota * 0.65)));
  const entries = await new Promise(resolve => {
    const found = [];
    const request = db.transaction('media', 'readonly').objectStore('media').openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return resolve(found);
      found.push({ key: cursor.key, size: Number(cursor.value?.size || cursor.value?.blob?.size || 0), updatedAt: Number(cursor.value?.updatedAt || 0) });
      cursor.continue();
    };
    request.onerror = () => resolve(found);
  });
  let total = entries.reduce((sum, item) => sum + item.size, 0);
  if (total + incomingBytes <= target) return;
  entries.sort((a, b) => a.updatedAt - b.updatedAt);
  const remove = [];
  for (const item of entries) {
    if (total + incomingBytes <= target) break;
    remove.push(item.key);
    total -= item.size;
  }
  if (!remove.length) return;
  await new Promise(resolve => {
    const tx = db.transaction('media', 'readwrite');
    const store = tx.objectStore('media');
    remove.forEach(key => store.delete(key));
    tx.oncomplete = resolve;
    tx.onerror = resolve;
  });
}

async function cacheMediaBlob(mediaId, blob) {
  if (!mediaId || !blob) return;
  const key = String(mediaId);
  const url = URL.createObjectURL(blob);
  const old = state.mediaCache.get(key);
  if (old?.startsWith('blob:')) URL.revokeObjectURL(old);
  state.mediaCache.set(key, url);
  const db = await openMediaCache();
  if (!db) return;
  await pruneMediaCache(db, blob.size);
  await new Promise(resolve => {
    const tx = db.transaction('media', 'readwrite');
    tx.objectStore('media').put({ blob, type: blob.type, size: blob.size, updatedAt: Date.now() }, key);
    tx.oncomplete = resolve;
    tx.onerror = resolve;
    tx.onabort = resolve;
  });
}

async function readCachedMedia(mediaId) {
  const key = String(mediaId || '');
  if (!key) return null;
  const db = await openMediaCache();
  if (!db) return null;
  return new Promise(resolve => {
    const request = db.transaction('media', 'readonly').objectStore('media').get(key);
    request.onsuccess = () => {
      const item = request.result;
      if (!item?.blob) return resolve(null);
      const old = state.mediaCache.get(key);
      if (old?.startsWith('blob:')) URL.revokeObjectURL(old);
      state.mediaCache.set(key, URL.createObjectURL(item.blob));
      resolve(item.blob);
    };
    request.onerror = () => resolve(null);
  });
}

window.addEventListener('beforeunload', event => {
  if (state.pendingUploads > 0 || state.saveInFlight || state.dirty) {
    event.preventDefault();
    event.returnValue = '内容仍在上传、缓存或同步，请等待完成。';
  }
});

function getShotPrimaryMedia(shot) {
  if (!shot) return null;
  // The storyboard thumbnail is owned by the primary Panel only.
  //
  // Do NOT fall back to shot.assets here. shot.assets is the project's asset
  // association/history layer; after a Panel is deleted that association may
  // legitimately outlive the Panel. Falling back to it resurrects an image
  // even though the inspector correctly reports 0 storyboard frames.
  const primaryPanel = Array.isArray(shot.panels) ? shot.panels[0] : null;
  return primaryPanel?.media_id ? getMediaUrl(primaryPanel.media_id) : null;
}

function shotCommentBadge(shot) {
  const comments = shot?.comments || [];
  if (!comments.length) return '';
  const pending = comments.filter(comment => !comment.is_resolved).length;
  const lead = comments.find(comment => !comment.is_resolved) || comments[comments.length - 1];
  const syncing = comments.some(comment => comment._sync_state === 'syncing');
  return `<button type="button" class="shot-comment-badge ${pending ? 'has-pending' : 'is-resolved'} ${syncing ? 'is-syncing' : ''}" data-shot-comments="${escapeHtml(shot.id)}" title="${pending ? `${pending} 条待处理评论` : `${comments.length} 条评论均已处理`}" aria-label="打开 SHOT ${escapeHtml(shot.number)} 的评论"><span>${commentInitial(lead)}</span><i>${syncing ? '↻' : comments.length}</i></button>`;
}

const SHOT_CLIPBOARD_KEY = 'frameforge-shot-clipboard:v1';
let shotClipboardPasteInFlight = false;
let shotClipboardCopyInFlight = false;
function clipboardShotPayload(shot) {
  // Copy business values, never identities, audit history or UI/sync state.
  // Missing values stay missing so the server can apply typed defaults.
  const pick = (record, fields) => Object.fromEntries(fields.filter(key => Object.hasOwn(record || {}, key) && record[key] !== undefined).map(key => [key, structuredClone(record[key])]));
  const allowed = ['title', 'chapter', 'scene', 'panel_frame', 'description', 'action', 'performance', 'composition', 'director_notes', 'notes', 'duration_frames', 'locked', 'handles_head_frames', 'handles_tail_frames', 'shot_size', 'lens', 'angle', 'height', 'movement', 'equipment', 'sensor', 'aperture', 'shutter', 'camera_fps', 'voiceover', 'dialogue', 'subtitle', 'music', 'sound', 'primary_method', 'secondary_methods', 'department', 'owner', 'status', 'transition', 'custom_fields', 'method_data_json', 'import_columns', 'import_columns_json'];
  const payload = pick(shot, allowed);
  payload.panels = (Array.isArray(shot?.panels) ? shot.panels : []).map(panel => pick(panel, ['position', 'label', 'duration_frames', 'media_id', 'drawing_json', 'notes']));
  payload.steps = (Array.isArray(shot?.steps) ? shot.steps : []).map(step => pick(step, ['step_order', 'sort_index', 'name', 'type', 'input_asset', 'output_asset', 'department', 'owner', 'status', 'notes']));
  // Asset IDs are references: the transaction validates ownership and clones
  // or relinks media. Storage paths and asset audit metadata are not writable.
  payload.assets = (Array.isArray(shot?.assets) ? shot.assets : []).map(asset => pick(asset, ['id', 'role']));
  return payload;
}
async function copySelectedShots(mode = 'copy', explicitId = null) {
  if (!state.bundle) return false;
  if (shotClipboardCopyInFlight) { toast('正在保存复制内容，请稍后重试', true); return false; }
  const sourceProjectId = state.bundle.project.id;
  const ids = explicitId ? [explicitId] : (state.selection.selectedShotIds.size ? [...state.selection.selectedShotIds] : [state.selection.activeShotId].filter(Boolean));
  if (!ids.length) return false;
  shotClipboardCopyInFlight = true;
  try {
    const clipboardBeforeSave = localStorage.getItem(SHOT_CLIPBOARD_KEY);
    // The paste endpoint reads source IDs from the database, not snapshots.
    // Never publish a clipboard whose source values are still only local.
    const deadline = Date.now() + 5000;
    while (state.saveInFlight && state.bundle?.project?.id === sourceProjectId && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 25));
    if (state.bundle?.project?.id !== sourceProjectId) { toast('工程已切换，请重新复制', true); return false; }
    if (state.saveInFlight || state.pendingUploads > 0 || state.saveConflict?.projectId === sourceProjectId) { toast('源工程仍在同步、上传或有保存冲突，请处理后重新复制', true); return false; }
    if (state.dirty && !await saveProject({ automatic: true })) { toast('源工程保存未完成，请保存成功后重新复制', true); return false; }
    if (state.bundle?.project?.id !== sourceProjectId || state.dirty || state.saveInFlight || state.pendingUploads > 0) { toast('源工程内容仍在变化，请保存完成后重新复制', true); return false; }
    if (localStorage.getItem(SHOT_CLIPBOARD_KEY) !== clipboardBeforeSave) { toast('剪贴板已更新，请重新复制', true); return false; }
    // Re-read after save: it can replace the bundle and merge server values.
    const shots = state.bundle.shots.filter(shot => ids.includes(shot.id));
    if (shots.length !== new Set(ids).size) { toast('所选镜头已变化，请重新选择后复制', true); return false; }
    localStorage.setItem(SHOT_CLIPBOARD_KEY, JSON.stringify({ mode: mode === 'cut' ? 'cut' : 'copy', source_project_id: sourceProjectId, source_ids: shots.map(shot => shot.id), shots: shots.map(clipboardShotPayload), copied_at: Date.now() }));
    toast(`${mode === 'cut' ? '已剪切' : '已复制'} ${shots.length} 条镜头，可切换工程后粘贴`);
    return true;
  } catch (err) { toast(`复制未完成：${err.message}`, true); return false; }
  finally { shotClipboardCopyInFlight = false; }
}
async function pasteShotClipboard() {
  if (!state.bundle || shotClipboardPasteInFlight) return false;
  if (shotClipboardCopyInFlight) { toast('正在保存复制内容，请完成后再粘贴', true); return false; }
  let payload, clipboardValue;
  try { clipboardValue = localStorage.getItem(SHOT_CLIPBOARD_KEY); payload = JSON.parse(clipboardValue || 'null'); } catch (_) { payload = null; }
  if (!Array.isArray(payload?.shots) || !payload.shots.length || payload.shots.some(shot => !shot || typeof shot !== 'object' || Array.isArray(shot)) || !['copy', 'cut'].includes(payload.mode) || typeof payload.source_project_id !== 'string' || !payload.source_project_id || !Array.isArray(payload.source_ids) || payload.source_ids.length !== payload.shots.length || payload.source_ids.some(id => typeof id !== 'string' || !id) || new Set(payload.source_ids).size !== payload.source_ids.length) {
    toast('剪贴板中没有有效镜头，请重新复制', true); return false;
  }
  const targetProjectId = state.bundle.project.id;
  const anchorShotId = state.selection.activeShotId;
  shotClipboardPasteInFlight = true;
  try {
    while (state.saveInFlight) await new Promise(resolve => setTimeout(resolve, 25));
    if (state.bundle?.project?.id !== targetProjectId) return false;
    if (state.dirty && !await saveProject({ automatic: true })) return false;
    if (state.bundle?.project?.id !== targetProjectId || state.dirty) return false;
    const before = structuredClone(state.bundle.shots);
    const position = Math.max(0, before.findIndex(shot => shot.id === anchorShotId) + 1);
    const pasted = await api(`/api/projects/${encodeURIComponent(targetProjectId)}/shots/paste`, { method: 'POST', json: {
      source_project_id: payload.source_project_id, source_ids: payload.source_ids,
      mode: payload.mode, shots: payload.shots.map(clipboardShotPayload), position
    } });
    if (payload.mode === 'cut') {
      // A successful cut consumes only the clipboard that this request read,
      // even if navigation occurred or another copy happened while waiting.
      try { if (localStorage.getItem(SHOT_CLIPBOARD_KEY) === clipboardValue) localStorage.removeItem(SHOT_CLIPBOARD_KEY); } catch (_) { /* Transaction already committed. */ }
    }
    if (state.bundle?.project?.id !== targetProjectId) return true;
    const currentById = new Map(state.bundle.shots.map(shot => [shot.id, shot]));
    const beforeById = new Map(before.map(shot => [shot.id, shot]));
    state.bundle = adoptServerBundle(pasted);
    // Preserve edits made during the request, while adopting server identities,
    // ordering and baselines for the new rows.
    for (const shot of state.bundle.shots) {
      const current = currentById.get(shot.id), previous = beforeById.get(shot.id);
      if (!current || !previous) continue;
      const previousPayload = clipboardShotPayload(previous);
      for (const [key, value] of Object.entries(clipboardShotPayload(current))) {
        if (JSON.stringify(value) !== JSON.stringify(previousPayload[key])) shot[key] = structuredClone(current[key]);
      }
    }
    state.lastServerUpdatedAt = state.bundle.project.updated_at || state.lastServerUpdatedAt;
    renderProjectHeader(); renderCurrentView();
    toast(`已${payload.mode === 'cut' ? '移动' : '粘贴'} ${payload.shots.length} 条镜头`);
    return true;
  } catch (err) { toast(`粘贴未完成：${err.message}`, true); return false; }
  finally { shotClipboardPasteInFlight = false; }
}

function mediaUploadIndicator(shot) {
  if (!shot?._mediaUploadState) return '';
  const failed = shot._mediaUploadState === 'failed';
  return `<span class="media-upload-sync ${failed ? 'is-failed' : ''}" role="status"><span class="media-load-spinner" aria-hidden="true"></span>${failed ? '同步失败' : '后台同步中'}</span>`;
}

// --------------------------------------------------------------------------
// 8. SHOT TABLE (READ-FIRST NOTION DATABASE WITH CINEMATOGRAPHY CORE)
// --------------------------------------------------------------------------
let shotReorderInFlight = false;
let suppressShotActivationUntil = 0;

function clearShotDropIndicators(container) {
  $$('.drop-target, .drop-before, .drop-after', container).forEach(item => item.classList.remove('drop-target', 'drop-before', 'drop-after'));
}

function previewShotDomMove(source, target, insertAfter) {
  if (!source || !target || source === target || source.parentElement !== target.parentElement) return;
  const parent = target.parentElement;
  const anchor = insertAfter ? target.nextElementSibling : target;
  if (anchor === source || (!insertAfter && source.nextElementSibling === target)) return;
  parent.insertBefore(source, anchor);
  source.classList.add('is-reorder-preview');
}

function shotDropIsAfter(target, clientX, clientY) {
  const rect = target.getBoundingClientRect();
  const isHorizontalCardFlow = target.matches('.shot-card, .wall-item, .timeline-clip');
  return isHorizontalCardFlow ? clientX >= rect.left + rect.width / 2 : clientY >= rect.top + rect.height / 2;
}

async function commitShotReorder(sourceId, targetId, insertAfter, { respectTableSort = false, groupIds = [] } = {}) {
  if (!state.bundle || shotReorderInFlight || !sourceId || !targetId || sourceId === targetId) return false;
  if (respectTableSort && state.tablePrefs.sort?.field) {
    toast('当前表格已排序，请先清除排序后再调整镜头顺序。', true);
    return false;
  }
  const projectId = state.bundle.project.id;
  // Finish an earlier field save before changing order. Its response must
  // not replace the optimistic reordered array.
  while (state.saveInFlight) await new Promise(resolve => setTimeout(resolve, 25));
  if (state.bundle?.project?.id !== projectId || shotReorderInFlight) return false;
  if (state.dirty && !await saveProject({ automatic: true })) return false;
  if (state.bundle?.project?.id !== projectId || state.dirty || shotReorderInFlight) return false;
  const all = state.bundle.shots;
  const baseOrder = all.map(shot => shot.id);
  const movingIds = new Set([sourceId, ...groupIds].filter(id => all.some(shot => shot.id === id)));
  const moving = all.filter(shot => movingIds.has(shot.id));
  const remaining = all.filter(shot => !movingIds.has(shot.id));
  let to = remaining.findIndex(shot => shot.id === targetId);
  if (!moving.length || to < 0) return false;
  shotReorderInFlight = true;
  const versionAtStart = state.changeVersion;
  try {
  setSaveStatus('↻ 排序同步中…', 'syncing');
  recordHistory();
  if (insertAfter) to += 1;
  const insertion = Math.max(0, Math.min(to, remaining.length));
  all.splice(0, all.length, ...remaining.slice(0, insertion), ...moving, ...remaining.slice(insertion));
  // The visible mirror follows editorial order immediately; the server
  // repeats this normalization transactionally before returning its bundle.
  all.forEach((shot, index) => {
    shot.position = index;
    shot.sort_index = index;
    shot.number = String(index + 1).padStart(3, '0');
  });
  syncDerivedTimeline();
  renderCurrentView();
  selectShot(sourceId);
    const result = await api(`/api/projects/${projectId}/shots/reorder`, { method: 'POST', json: { shot_ids: all.map(shot => shot.id), base_order: baseOrder } });
    if (state.bundle?.project?.id !== projectId) return true;
    if (state.changeVersion === versionAtStart) state.bundle = adoptServerBundle(result);
    state.lastServerUpdatedAt = result.project?.updated_at || state.lastServerUpdatedAt;
    state.playIndex = Math.max(0, result.shots.findIndex(shot => shot.id === sourceId));
    renderProjectHeader();
    renderCurrentView();
    selectShot(sourceId);
    setSaveStatus(state.dirty ? '● 待同步' : '● 已同步', state.dirty ? 'dirty' : '');
    toast('镜头顺序已保存');
    return true;
  } catch (err) {
    if (state.bundle?.project?.id !== projectId) return false;
    const rank = new Map(baseOrder.map((id, index) => [id, index]));
    state.bundle.shots.sort((a, b) => (rank.get(a.id) ?? Infinity) - (rank.get(b.id) ?? Infinity));
    state.bundle.shots.forEach((shot, index) => { shot.number = String(index + 1).padStart(3, '0'); shot.position = index; shot.sort_index = index; });
    syncDerivedTimeline();
    renderCurrentView();
    toast(`排序保存失败：${err.message}`, true);
    setSaveStatus('! 排序同步失败', 'error');
    return false;
  } finally {
    shotReorderInFlight = false;
    if (state.dirty) scheduleAutoSave(60);
  }
}

// Reorder through one pointer stream. The previous HTML5/touch handlers
// moved cards on every dragover, so the hit target moved under the pointer
// and the whole view flashed. Keep layout fixed until drop.
function wirePointerShotReorder(container, itemSelector, idFor = item => item.dataset.id, options = {}) {
  if (!container) return;
  container._shotPointerController?.abort();
  const controller = new AbortController();
  container._shotPointerController = controller;
  const listenerOptions = { signal: controller.signal };
  let drag = null;
  const clear = () => {
    clearShotDropIndicators(container);
    container.querySelectorAll('.is-dragging, .is-group-dragging').forEach(node => node.classList.remove('is-dragging', 'is-group-dragging'));
    container.querySelector('.shot-drag-stack')?.remove();
    document.body.classList.remove('is-reordering');
  };
  const finish = commit => {
    if (!drag) return;
    const current = drag;
    drag = null;
    window.clearTimeout(current.timer);
    if (commit && current.active && current.targetId) {
      commitShotReorder(current.sourceId, current.targetId, current.insertAfter, { ...options, groupIds: current.groupIds });
    }
    clear();
    try { current.handle.releasePointerCapture(current.pointerId); } catch (_) {}
  };
  const moveStack = event => {
    const stack = container.querySelector('.shot-drag-stack');
    if (stack) { stack.style.left = `${event.clientX + 16}px`; stack.style.top = `${event.clientY + 16}px`; }
  };
  const activate = () => {
    if (!drag || drag.active) return;
    if (options.respectTableSort && state.tablePrefs.sort?.field) {
      toast('当前表格已排序，请先清除排序后再调整镜头顺序。', true);
      finish(false);
      return;
    }
    drag.active = true;
    drag.source.classList.add('is-dragging');
    drag.groupIds.forEach(id => container.querySelector(`${itemSelector}[data-id="${CSS.escape(id)}"]`)?.classList.add('is-group-dragging'));
    document.body.classList.add('is-reordering');
    window.getSelection()?.removeAllRanges();
    suppressShotActivationUntil = Date.now() + 900;
    if (drag.groupIds.length > 1) {
      const stack = document.createElement('span');
      stack.className = 'shot-drag-stack';
      stack.setAttribute('aria-hidden', 'true');
      stack.innerHTML = `<i></i><i></i><b>${drag.groupIds.length}</b>`;
      container.append(stack);
    }
    navigator.vibrate?.(18);
  };
  container.addEventListener('pointerdown', event => {
    if (event.button !== undefined && event.button !== 0) return;
    const handle = event.target.closest('[data-shot-drag-handle]');
    const source = handle?.closest(itemSelector);
    if (!handle || !source || drag || shotReorderInFlight || source.querySelector('.inline-cell-editor, .is-editing')) return;
    const sourceId = idFor(source);
    if (!sourceId) return;
    const selected = (state.bundle?.shots || []).filter(shot => state.selection.selectedShotIds.has(shot.id)).map(shot => shot.id);
    const groupIds = selected.includes(sourceId) && selected.length > 1 ? selected : [sourceId];
    event.preventDefault();
    event.stopPropagation();
    drag = { pointerId: event.pointerId, handle, source, sourceId, groupIds, startX: event.clientX, startY: event.clientY, targetId: null, insertAfter: false, active: false, timer: window.setTimeout(activate, event.pointerType === 'mouse' ? 90 : 260) };
    try { handle.setPointerCapture(event.pointerId); } catch (_) {}
  }, listenerOptions);
  container.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
    if (!drag.active) {
      if (event.pointerType === 'mouse' && distance > 4) activate();
      else if (event.pointerType !== 'mouse' && distance > 10) finish(false);
      return;
    }
    event.preventDefault();
    moveStack(event);
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest?.(itemSelector);
    if (!target || !container.contains(target) || drag.groupIds.includes(idFor(target))) {
      if (drag.targetId !== null) { drag.targetId = null; clearShotDropIndicators(container); }
      return;
    }
    const targetId = idFor(target);
    const insertAfter = shotDropIsAfter(target, event.clientX, event.clientY);
    if (drag.targetId === targetId && drag.insertAfter === insertAfter) return;
    clearShotDropIndicators(container);
    drag.targetId = targetId;
    drag.insertAfter = insertAfter;
    target.classList.add(insertAfter ? 'drop-after' : 'drop-before');
  }, { ...listenerOptions, passive: false });
  container.addEventListener('pointerup', event => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (drag.active) { event.preventDefault(); event.stopPropagation(); }
    finish(true);
  }, listenerOptions);
  container.addEventListener('pointercancel', () => finish(false), listenerOptions);
  container.addEventListener('dragstart', event => { if (drag) event.preventDefault(); }, listenerOptions);
  container.addEventListener('selectstart', event => { if (drag) event.preventDefault(); }, listenerOptions);
  window.addEventListener('blur', () => finish(false), listenerOptions);
  container.addEventListener('contextmenu', event => { if (drag?.active) event.preventDefault(); }, listenerOptions);
}

function wireLongPressShotReorder(container, itemSelector, idFor = item => item.dataset.id, options = {}) {
  if (!container) return;
  container._shotLongPressController?.abort();
  const controller = new AbortController();
  container._shotLongPressController = controller;
  const listenerOptions = { signal: controller.signal };
  let press = null;

  const reset = (restore = true) => {
    if (!press) return;
    window.clearTimeout(press.timer);
    press.source?.classList.remove('is-dragging', 'is-long-press-dragging', 'is-reorder-preview');
    if (restore && press.originalParent && press.source) {
      press.originalParent.insertBefore(press.source, press.originalNextSibling);
    }
    clearShotDropIndicators(container);
    document.body.classList.remove('is-reordering');
    try {
      if (press.handle?.hasPointerCapture?.(press.pointerId)) press.handle.releasePointerCapture(press.pointerId);
    } catch (_) {}
    press = null;
  };

  container.addEventListener('pointerdown', event => {
    if (!['touch', 'pen'].includes(event.pointerType) || (event.button !== undefined && event.button !== 0)) return;
    const handle = event.target.closest('[data-shot-drag-handle]');
    const source = handle?.closest(itemSelector);
    if (!handle || !source) return;
    const sourceId = idFor(source);
    if (!sourceId) return;
    press = {
      pointerId: event.pointerId,
      handle,
      source,
      sourceId,
      originalParent: source.parentElement,
      originalNextSibling: source.nextElementSibling,
      startX: event.clientX,
      startY: event.clientY,
      targetId: null,
      insertAfter: false,
      active: false,
      timer: window.setTimeout(() => {
        if (!press) return;
        if (options.respectTableSort && state.tablePrefs.sort?.field) {
          toast('当前表格已排序，请先清除排序后再调整镜头顺序。', true);
          reset();
          return;
        }
        press.active = true;
        press.source.classList.add('is-dragging', 'is-long-press-dragging');
        document.body.classList.add('is-reordering');
        suppressShotActivationUntil = Date.now() + 800;
        navigator.vibrate?.(18);
      }, 320)
    };
    try { handle.setPointerCapture?.(event.pointerId); } catch (_) {}
  }, listenerOptions);

  container.addEventListener('pointermove', event => {
    if (!press || event.pointerId !== press.pointerId) return;
    const distance = Math.hypot(event.clientX - press.startX, event.clientY - press.startY);
    if (!press.active) {
      if (distance > 9) reset();
      return;
    }
    event.preventDefault();
    const hit = document.elementFromPoint(event.clientX, event.clientY);
    const target = hit?.closest?.(itemSelector);
    clearShotDropIndicators(container);
    if (!target || !container.contains(target) || target === press.source) {
      press.targetId = null;
      return;
    }
    press.targetId = idFor(target);
    press.insertAfter = shotDropIsAfter(target, event.clientX, event.clientY);
    previewShotDomMove(press.source, target, press.insertAfter);
    target.classList.add(press.insertAfter ? 'drop-after' : 'drop-before');
  }, { ...listenerOptions, passive: false });

  container.addEventListener('pointerup', async event => {
    if (!press || event.pointerId !== press.pointerId) return;
    const active = press.active;
    const sourceId = press.sourceId;
    const targetId = press.targetId;
    const insertAfter = press.insertAfter;
    if (active) {
      event.preventDefault();
      event.stopPropagation();
      suppressShotActivationUntil = Date.now() + 800;
    }
    reset(false);
    if (active && targetId) await commitShotReorder(sourceId, targetId, insertAfter, options);
  }, listenerOptions);
  container.addEventListener('pointercancel', reset, listenerOptions);
  container.addEventListener('contextmenu', event => {
    if (press?.active) event.preventDefault();
  }, listenerOptions);
}

function wireHandleNativeShotReorder(container, itemSelector, idFor = item => item.dataset.id) {
  if (!container) return;
  container._shotNativeController?.abort();
  const controller = new AbortController();
  container._shotNativeController = controller;
  const listenerOptions = { signal: controller.signal };
  let source = null;
  let sourceId = null;
  let originalParent = null;
  let originalNextSibling = null;
  let committed = false;
  container.addEventListener('dragstart', event => {
    const handle = event.target.closest('[data-shot-drag-handle]');
    source = handle?.closest(itemSelector) || null;
    sourceId = source ? idFor(source) : null;
    if (!handle || !source || !sourceId) {
      event.preventDefault();
      return;
    }
    source.classList.add('is-dragging');
    originalParent = source.parentElement;
    originalNextSibling = source.nextElementSibling;
    committed = false;
    document.body.classList.add('is-reordering');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', sourceId);
  }, listenerOptions);
  container.addEventListener('dragover', event => {
    if (!sourceId) return;
    const target = event.target.closest(itemSelector);
    if (!target || target === source) return;
    event.preventDefault();
    clearShotDropIndicators(container);
    const insertAfter = shotDropIsAfter(target, event.clientX, event.clientY);
    previewShotDomMove(source, target, insertAfter);
    target.classList.add(insertAfter ? 'drop-after' : 'drop-before');
  }, listenerOptions);
  container.addEventListener('drop', async event => {
    if (!sourceId) return;
    const target = event.target.closest(itemSelector);
    event.preventDefault();
    const movingId = sourceId;
    const targetId = target ? idFor(target) : null;
    const insertAfter = target ? shotDropIsAfter(target, event.clientX, event.clientY) : false;
    committed = Boolean(targetId);
    clearShotDropIndicators(container);
    source?.classList.remove('is-dragging');
    document.body.classList.remove('is-reordering');
    source = null;
    sourceId = null;
    if (targetId) await commitShotReorder(movingId, targetId, insertAfter);
  }, listenerOptions);
  container.addEventListener('dragend', () => {
    if (!committed && originalParent && source) originalParent.insertBefore(source, originalNextSibling);
    source?.classList.remove('is-dragging');
    document.body.classList.remove('is-reordering');
    clearShotDropIndicators(container);
    source = null;
    sourceId = null;
    originalParent = null;
    originalNextSibling = null;
    committed = false;
  }, listenerOptions);
}

function wireMiddleButtonTablePan(wrap) {
  if (!wrap || wrap.dataset.middlePanReady === 'true') return;
  wrap.dataset.middlePanReady = 'true';
  let pan = null;
  wrap.addEventListener('pointerdown', event => {
    if (event.button !== 1) return;
    event.preventDefault();
    pan = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, left: wrap.scrollLeft, top: wrap.scrollTop };
    try { wrap.setPointerCapture?.(event.pointerId); } catch (_) {}
    wrap.classList.add('is-middle-panning');
  });
  wrap.addEventListener('pointermove', event => {
    if (!pan || event.pointerId !== pan.pointerId) return;
    event.preventDefault();
    wrap.scrollLeft = pan.left - (event.clientX - pan.x);
    wrap.scrollTop = pan.top - (event.clientY - pan.y);
  }, { passive: false });
  const finish = event => {
    if (!pan || (event?.pointerId != null && event.pointerId !== pan.pointerId)) return;
    try { wrap.releasePointerCapture?.(pan.pointerId); } catch (_) {}
    pan = null;
    wrap.classList.remove('is-middle-panning');
  };
  wrap.addEventListener('pointerup', finish);
  wrap.addEventListener('pointercancel', finish);
  wrap.addEventListener('lostpointercapture', finish);
  wrap.addEventListener('auxclick', event => { if (event.button === 1) event.preventDefault(); });
  wrap.addEventListener('wheel', event => {
    if (!event.shiftKey || Math.abs(event.deltaY) < Math.abs(event.deltaX)) return;
    event.preventDefault();
    wrap.scrollLeft += event.deltaY;
  }, { passive: false });
}

function renderTableView() {
  const wrap = $('#tableScrollWrap');
  if (!wrap || !state.bundle) return;

  loadTablePrefs();
  const columnButton = $('#columnSettingsBtn');
  if (columnButton) {
    const hiddenCount = (state.tablePrefs.hidden || []).length;
    const archivedCount = archivedColumnSet().size;
    columnButton.innerHTML = `<svg class="g-icon" aria-hidden="true"><use href="#icon-archive"></use></svg><span>列管理${hiddenCount || archivedCount ? ` · 隐藏 ${hiddenCount} / 归档 ${archivedCount}` : ''}</span>`;
    columnButton.title = '显示、隐藏、归档列；归档列只能在归档区永久删除，不能恢复';
  }

  const shots = sortTableShots(filterShots(state.bundle.shots));
  const shotsById = new Map(shots.map(shot => [String(shot.id), shot]));
  const customFields = customTableFields();
  const importedFields = importedTableFields();
  const dynamicColumns = currentColumnOrder();
  const width = field => isColumnHidden(field) ? 28 : (state.tablePrefs.widths[field] ?? TABLE_COLUMNS[field]?.[1] ?? 100);
  const th = (field, label) => { const sort = state.tablePrefs.sort?.field === field ? (state.tablePrefs.sort.direction === 'asc' ? ' ↑' : ' ↓') : ''; return `<th data-column="${field}" draggable="true" tabindex="0" aria-haspopup="menu" class="${field === 'department' || field.startsWith('custom:') ? 'pro-only ' : ''}${isColumnHidden(field) ? 'is-column-hidden' : ''}" style="width:${width(field)}px" title="${isColumnHidden(field) ? `列已隐藏：${escapeHtml(label)}，点击图标恢复` : `拖动列头调整顺序，点击列名打开菜单，双击分隔线自动列宽`}" aria-label="${escapeHtml(label)}"><span class="column-label">${escapeHtml(label)}${sort}</span><button type="button" class="column-hidden-toggle" data-show-column="${escapeHtml(field)}" aria-label="恢复列：${escapeHtml(label)}" title="恢复列：${escapeHtml(label)}"><svg class="g-icon"><use href="#icon-visibility"></use></svg></button><span class="column-resize-handle" data-resize-column="${escapeHtml(field)}" title="拖动调整列宽"></span></th>`; };
  const customHeaders = customFields.map(field => th(`custom:${field.key}`, field.label)).join('');
  const importedHeaders = importedFields.map(key => th(`import:${key}`, key)).join('');

  let html = `
    <table class="shot-table" id="mainShotTable">
      <colgroup>${dynamicColumns.map(field => `<col data-column="${escapeHtml(field)}" style="width:${width(field)}px">`).join('')}</colgroup>
      <thead>
        <tr>
          <th data-column="select" style="width:${width('select')}px"><input class="shot-select" data-all="true" type="checkbox" aria-label="全选当前镜头"></th>
          ${th('number', '镜头')}${th('thumb', '分镜画面')}${th('tc', '时码 TC')}${th('duration', '时长')}${th('title', '镜头标题')}${th('chapter', '篇章')}${th('scene', '场景/地点')}${th('panel_frame', '分镜图框')}${th('shot_size', '景别')}${th('lens', '焦段')}${th('movement', '运镜')}${th('angle', '机位角度')}${th('description', '画面描述')}${th('voiceover', '对应旁白')}${th('methods', '制作方式')}${th('status', '状态')}${th('department', '责任部门')}${customHeaders}${importedHeaders}${th('actions', '操作')}
        </tr>
      </thead>
      <tbody>
  `;

  shots.forEach(shot => {
    const isSel = shot.id === state.selection.activeShotId || state.selection.selectedShotIds.has(shot.id);
    const mediaUrl = getShotPrimaryMedia(shot);
    const statusClass = (shot.status || 'Draft').toLowerCase().replace(/\s+/g, '');
    const statusName = STATUS_LABELS[shot.status] || shot.status || '草稿';

    html += `
      <tr class="${isSel ? 'is-selected' : ''}" data-id="${shot.id}" data-context-shot-id="${shot.id}" title="按住拖动手柄调整镜头顺序">
        <td><input class="shot-select" data-shot-id="${shot.id}" type="checkbox" aria-label="选择 SHOT ${escapeHtml(shot.number)}" ${state.selection.selectedShotIds.has(shot.id) ? 'checked' : ''}></td>
        <td><div class="shot-number-cell"><span class="shot-drag-handle" data-shot-drag-handle role="button" aria-label="拖动 SHOT ${escapeHtml(shot.number)}" title="按住拖动镜头；多选时拖动整组"><svg class="g-icon"><use href="#icon-drag_indicator"></use></svg></span><span class="shot-number tnum">SHOT ${escapeHtml(shot.number)}</span>${shotCommentBadge(shot)}</div></td>
        <td class="shot-media-cell" data-shot-id="${shot.id}" data-field="thumb">
          <div class="shot-thumb" data-shot-id="${shot.id}" title="点击上传或替换分镜图片">
            ${mediaUrl ? `<img src="${mediaUrl}" loading="lazy" decoding="async" alt="SHOT ${shot.number}">` : `<span class="meta-text" style="font-size:10px;color:var(--text-muted);">16:9</span>`}
            ${mediaUploadIndicator(shot)}
            <div class="media-hover-actions">↑ 上传</div>
          </div>
        </td>
        <td><span class="timecode tnum">${shot.tc_in || '00:00:00:00'}</span></td>
        <td class="editable-cell" data-shot-id="${shot.id}" data-field="duration_seconds" data-editor="number">
          <div class="cell-display tnum">${shot.duration_seconds || 3}s</div>
        </td>
        <td class="editable-cell" data-shot-id="${shot.id}" data-field="title" data-editor="text">
          <div class="cell-display">${escapeHtml(shot.title || '未命名镜头')}</div>
        </td>
        <td class="editable-cell" data-shot-id="${shot.id}" data-field="chapter" data-editor="text">
          <div class="cell-display cell-clamp-2">${escapeHtml(shot.chapter || '—')}</div>
        </td>
        <td class="editable-cell" data-shot-id="${shot.id}" data-field="scene" data-editor="text">
          <div class="cell-display cell-clamp-2">${escapeHtml(shot.scene || '—')}</div>
        </td>
        <td class="editable-cell" data-shot-id="${shot.id}" data-field="panel_frame" data-editor="text">
          <div class="cell-display cell-clamp-2">${escapeHtml(shot.panel_frame || shot.import_columns?.['分镜图框'] || '—')}</div>
        </td>
        <td class="editable-cell preset-cell" data-shot-id="${shot.id}" data-field="shot_size" data-editor="preset" tabindex="0" role="button" aria-haspopup="listbox" aria-label="选择景别">
          <div class="cell-display preset-cell-display"><span>${escapeHtml(shot.shot_size || '全景')}</span><svg class="g-icon"><use href="#icon-arrow_downward"></use></svg></div>
        </td>
        <td class="editable-cell preset-cell" data-shot-id="${shot.id}" data-field="lens" data-editor="preset" tabindex="0" role="button" aria-haspopup="listbox" aria-label="选择焦段">
          <div class="cell-display preset-cell-display"><span>${escapeHtml(shot.lens || '35mm')}</span><svg class="g-icon"><use href="#icon-arrow_downward"></use></svg></div>
        </td>
        <td class="editable-cell preset-cell" data-shot-id="${shot.id}" data-field="movement" data-editor="preset" tabindex="0" role="button" aria-haspopup="listbox" aria-label="选择运镜">
          <div class="cell-display preset-cell-display"><span>${escapeHtml(shot.movement || '固定')}</span><svg class="g-icon"><use href="#icon-arrow_downward"></use></svg></div>
        </td>
        <td class="editable-cell preset-cell" data-shot-id="${shot.id}" data-field="angle" data-editor="preset" tabindex="0" role="button" aria-haspopup="listbox" aria-label="选择机位角度">
          <div class="cell-display preset-cell-display"><span>${escapeHtml(shot.angle || '平视')}</span><svg class="g-icon"><use href="#icon-arrow_downward"></use></svg></div>
        </td>
        <td class="editable-cell" data-shot-id="${shot.id}" data-field="description" data-editor="textarea">
          <div class="cell-display cell-clamp-2" title="${escapeHtml(shot.description || '')}">${escapeHtml(shot.description || '—')}</div>
        </td>
        <td class="editable-cell" data-shot-id="${shot.id}" data-field="voiceover" data-editor="textarea">
          <div class="cell-display cell-clamp-2" title="${escapeHtml(shot.voiceover || '')}">${escapeHtml(shot.voiceover || '—')}</div>
        </td>
        <td class="editable-cell method-cell" data-shot-id="${shot.id}" data-field="methods" data-editor="methods">
          <div class="cell-display method-summary" title="双击选择多个制作方式">${escapeHtml(methodValues(shot).map(methodLabel).join(' · '))}</div>
        </td>
        <td class="editable-cell preset-cell" data-shot-id="${shot.id}" data-field="status" data-editor="preset" tabindex="0" role="button" aria-haspopup="listbox" aria-label="选择状态">
          <div class="cell-display preset-cell-display"><span class="status-dot-label ${statusClass}">${statusName}</span><svg class="g-icon"><use href="#icon-arrow_downward"></use></svg></div>
        </td>
        <td class="pro-only editable-cell" data-shot-id="${shot.id}" data-field="department" data-editor="text">
          <div class="cell-display">${escapeHtml(shot.department || 'Camera')}</div>
        </td>
        ${customFields.map(field => {
          const value = customFieldValue(shot, field.key);
          const editor = field.field_type === 'textarea' ? 'textarea' : field.field_type === 'number' ? 'number' : field.field_type === 'boolean' ? 'boolean' : 'text';
          return `<td class="pro-only editable-cell" data-shot-id="${shot.id}" data-field="custom:${escapeHtml(field.key)}" data-editor="${editor}"><div class="cell-display cell-clamp-2">${escapeHtml(value === true ? '是' : value === false ? '否' : String(value || '—'))}</div></td>`;
        }).join('')}
        ${importedFields.map(key => `<td class="editable-cell imported-column-cell" data-shot-id="${shot.id}" data-field="import:${escapeHtml(key)}" data-editor="textarea"><div class="cell-display cell-clamp-2">${escapeHtml(String(shot.import_columns?.[key] ?? '—'))}</div></td>`).join('')}
        <td class="shot-actions"><button type="button" class="btn-ghost-icon row-delete-shot" data-delete-shot="${shot.id}" title="删除当前镜头" aria-label="删除 SHOT ${escapeHtml(shot.number)}"><svg class="g-icon"><use href="#icon-delete"></use></svg></button></td>
      </tr>
    `;
  });

  html += '</tbody></table>';
  wrap.innerHTML = html;
  wrap.dataset.rowHeight = state.tablePrefs.rowHeight;
  wireMiddleButtonTablePan(wrap);

  const table = $('#mainShotTable', wrap);
  if (!table) return;
  table.addEventListener('click', event => {
    if (event.shiftKey || event.ctrlKey || event.metaKey) return;
    if (event.target.closest('input, button, select, textarea, .column-resize-handle, [data-resize-column], [data-shot-drag-handle]')) return;
    const target = event.target.closest('th[data-column]');
    if (!target) return;
    const field = target.dataset.column;
    state.bulkColumn = field === 'duration_seconds' ? 'duration' : field;
    if (state.selection.selectedShotIds.size >= 2 && bulkColumnField(state.bulkColumn)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      renderBulkActionBar();
    }
  }, true);
  table.querySelectorAll('th[data-column]').forEach(header => {
    header.tabIndex = ['select', 'actions'].includes(header.dataset.column) ? -1 : 0;
    header.setAttribute('aria-haspopup', 'menu');
  });
  table.querySelectorAll('tbody tr[data-id]').forEach(row => {
    row.tabIndex = row.dataset.id === state.selection.activeShotId ? 0 : -1;
    row.setAttribute('aria-haspopup', 'menu');
  });
  syncShotSelectionClasses(table);

  // Keep every cell addressable even though the row markup is intentionally
  // compact. This lets visibility preferences apply consistently to headers,
  // colgroup and body cells, including future custom columns.
  for (const [field,label] of Object.entries(SCRIPT_COLUMNS)) {
    table.querySelector('thead tr').insertAdjacentHTML('beforeend', th(field,label));
    table.querySelectorAll('tbody tr').forEach(row=>{
      const shot=shotsById.get(row.dataset.id);
      row.insertAdjacentHTML('beforeend', `<td class="editable-cell" data-shot-id="${escapeHtml(shot.id)}" data-field="${field}" data-editor="${SHOT_FIELD_PRESETS[field]?'preset':field==='dialogue'?'textarea':'text'}"><div class="cell-display">${formattedShotField(shot,field)}</div></td>`);
    });
  }
  table.querySelectorAll('tbody .editable-cell[data-field]').forEach(cell=>{
    if (!RICH_TEXT_FIELDS.has(cell.dataset.field)) return;
    const shot=shotsById.get(cell.dataset.shotId);
    const display=cell.querySelector('.cell-display');if(display)display.innerHTML=formattedShotField(shot,cell.dataset.field);
  });
  const columnFields = [...table.querySelectorAll('thead th[data-column]')].map(header => header.dataset.column);
  table.querySelectorAll('tbody tr').forEach(row => {
    [...row.cells].forEach((cell, index) => {
      const field = columnFields[index];
      if (!field) return;
      cell.dataset.column = field;
      if (isColumnHidden(field)) {
        cell.classList.add('is-column-hidden');
        cell.innerHTML = `<span class="column-hidden-cell" title="列已隐藏：${escapeHtml(tableColumnLabel(field))}"><svg class="g-icon"><use href="#icon-visibility"></use></svg></span>`;
      } else if (!isColumnWrapped(field)) cell.classList.add('is-column-nowrap');
    });
  });
  table.querySelectorAll('th[data-column]').forEach(header => {
    if (isColumnHidden(header.dataset.column)) header.classList.add('is-column-hidden');
    header.tabIndex = ['select', 'actions'].includes(header.dataset.column) ? -1 : 0;
    header.setAttribute('aria-haspopup', 'menu');
  });
  // Removed columns must leave the DOM entirely. Keeping a 28px placeholder
  // made the visible column sequence look corrupt and caused resize targets to
  // drift away from their real boundaries. Column settings remains the single
  // restore path, so the preference itself is retained.
  const hiddenFields = new Set((state.tablePrefs.hidden || []).filter(field => !['select', 'actions'].includes(field)));
  const archivedFields = new Set([...archivedColumnSet()].filter(field => !['select', 'actions'].includes(field)));
  // Core columns are rendered from the fixed table template before preferences
  // are applied. A permanently deleted (purged) core column therefore also has
  // to be removed from the rendered DOM, otherwise its header/body cells survive
  // without a matching colgroup/order entry and appear as an unusable ghost column.
  const purgedFields = new Set([...purgedColumnSet()].filter(field => !['select', 'actions'].includes(field)));
  const omittedFields = new Set([...hiddenFields, ...archivedFields, ...purgedFields]);
  table.querySelectorAll('[data-column]').forEach(node => {
    if (omittedFields.has(node.dataset.column)) node.remove();
  });
  reorderTableColumns(table, dynamicColumns.filter(field => !omittedFields.has(field)));

  let draggedColumn = null;
  table.addEventListener('dragstart', event => {
    const header = event.target.closest('th[data-column]');
    if (!header) return;
    if (['select', 'actions'].includes(header.dataset.column) || event.target.closest('.column-resize-handle')) {
      event.preventDefault(); return;
    }
    draggedColumn = header.dataset.column;
    header.classList.add('is-column-dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', draggedColumn);
  });
  table.addEventListener('dragover', event => {
    const header = event.target.closest('th[data-column]');
    if (!header || !draggedColumn || header.dataset.column === draggedColumn || ['select', 'actions'].includes(header.dataset.column)) return;
    event.preventDefault();
    table.querySelectorAll('th.column-drop-target').forEach(item => item.classList.remove('column-drop-target'));
    header.classList.add('column-drop-target');
  });
  table.addEventListener('drop', event => {
    const header = event.target.closest('th[data-column]');
    if (!header || !draggedColumn || header.dataset.column === draggedColumn || ['select', 'actions'].includes(header.dataset.column)) return;
    event.preventDefault();
    const order = currentColumnOrder().filter(field => field !== draggedColumn);
    const target = order.indexOf(header.dataset.column);
    order.splice(Math.max(0, target), 0, draggedColumn);
    state.tablePrefs.order = order;
    saveTablePrefs();
    draggedColumn = null;
    renderTableView();
    toast('列顺序已保存到当前视图');
  });
  table.addEventListener('dragend', () => { draggedColumn = null; table.querySelectorAll('.is-column-dragging, .column-drop-target').forEach(item => item.classList.remove('is-column-dragging', 'column-drop-target')); });
  table.querySelectorAll('th[data-column] .column-label').forEach(label => label.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    openColumnMenu(label.closest('th').dataset.column, label.closest('th'));
  }));

  table.addEventListener('click', event => {
    const showButton = event.target.closest('[data-show-column]');
    if (!showButton) return;
    event.preventDefault();
    event.stopPropagation();
    setColumnHidden(showButton.dataset.showColumn, false);
    renderTableView();
    toast(`已恢复列：${tableColumnLabel(showButton.dataset.showColumn)}`);
  });

  const openPresetCell = (cell, event) => {
    const shot = state.bundle?.shots?.find(item => item.id === cell?.dataset.shotId);
    if (shot && SHOT_FIELD_PRESETS[cell.dataset.field]) {
      activateShotForPointer(cell.dataset.shotId, event, shots);
      openShotPresetPopover(cell, shot, cell.dataset.field);
    }
  };
  table.addEventListener('click', event => {
    const cell = event.target.closest('td[data-editor="preset"]');
    if (!cell) return;
    event.preventDefault();
    openPresetCell(cell, event);
  });
  table.addEventListener('keydown', event => {
    const cell = event.target.closest('td[data-editor="preset"]');
    if (!cell || !['Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    openPresetCell(cell, event);
  });

  // Single click row selection (does NOT re-render table to avoid destroying editors)
  table.addEventListener('click', e => {
    if (Date.now() < suppressShotActivationUntil) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    const deleteButton = e.target.closest('.row-delete-shot');
    if (deleteButton) {
      e.preventDefault();
      e.stopPropagation();
      deleteShotById(deleteButton.dataset.deleteShot);
      return;
    }
    if (e.target.closest('.shot-thumb') || e.target.closest('.inline-cell-editor') || e.target.closest('.shot-select') || e.target.closest('td[data-editor="preset"]')) return;
    const tr = e.target.closest('tr[data-id]');
    if (!tr) return;
    activateShotForPointer(tr.dataset.id, e, shots);
  });

  // Double click in-place editor
  table.addEventListener('dblclick', onTableDoubleClick);
  table.addEventListener('click', event => {
    const checkbox = event.target.closest('.shot-select:not([data-all])');
    if (!checkbox || !event.shiftKey || !state.selection.anchorShotId) return;
    const anchor = shots.findIndex(shot => shot.id === state.selection.anchorShotId);
    const target = shots.findIndex(shot => shot.id === checkbox.dataset.shotId);
    if (anchor < 0 || target < 0) return;
    const [start, end] = anchor < target ? [anchor, target] : [target, anchor];
    // The native checkbox has already toggled by the time the click event
    // runs. Use its new value so Shift-click applies the same range state as
    // the visible checkbox instead of clearing the range in reverse.
    const select = checkbox.checked;
    shots.slice(start, end + 1).forEach(shot => {
      if (select) state.selection.selectedShotIds.add(shot.id); else state.selection.selectedShotIds.delete(shot.id);
      const item = table.querySelector(`.shot-select[data-shot-id="${CSS.escape(shot.id)}"]`);
      if (item) item.checked = select;
    });
    // The native click still toggles the clicked checkbox; the change handler
    // below normalizes the final target state and updates the action bar.
    syncShotSelectionClasses(table);
  });
  table.addEventListener('change', event => {
    const checkbox = event.target.closest('.shot-select');
    if (!checkbox) return;
    if (checkbox.dataset.all) {
      shots.forEach(shot => checkbox.checked ? state.selection.selectedShotIds.add(shot.id) : state.selection.selectedShotIds.delete(shot.id));
      state.selection.anchorShotId = shots.at(-1)?.id || null;
    } else if (checkbox.checked) {
      state.selection.selectedShotIds.add(checkbox.dataset.shotId);
      state.selection.anchorShotId = checkbox.dataset.shotId;
    } else {
      state.selection.selectedShotIds.delete(checkbox.dataset.shotId);
      state.selection.anchorShotId = checkbox.dataset.shotId;
    }
    syncShotSelectionClasses(table);
    renderBulkActionBar();
  });

  wirePointerShotReorder(table, 'tbody tr[data-id]', row => row.dataset.id, { respectTableSort: true });
  wireColumnResize(table);

  // Thumbnail upload click
  $$('.shot-thumb[data-shot-id]', wrap).forEach(thumb => {
    thumb.addEventListener('click', e => {
      e.stopPropagation();
      triggerShotMediaUpload(thumb.dataset.shotId);
    });
  });
  $$('[data-shot-comments]', wrap).forEach(button => button.addEventListener('click', event => {
    event.stopPropagation();
    selectShot(button.dataset.shotComments);
    navigateToView(VIEW.REVIEW);
  }));
  renderBulkActionBar();
}

let activeColumnResizeCleanup = null;

function wireColumnResize(table) {
  $$('.column-resize-handle', table).forEach(handle => {
    handle.addEventListener('pointerdown', event => {
      if (event.button !== undefined && event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      activeColumnResizeCleanup?.(true);
      const field = handle.dataset.resizeColumn;
      const header = handle.closest('th');
      const col = table.querySelector(`col[data-column="${CSS.escape(field)}"]`);
      if (!header || !col) return;
      const definition = tableColumnDefinition(field);
      const headerRect = header.getBoundingClientRect();
      const zoom = parseFloat(getComputedStyle(document.body).zoom) || 1;
      const startWidth = Math.round(headerRect.width / zoom || definition[1]);
      const startX = event.clientX;
      const pointerId = event.pointerId;
      const controller = new AbortController();
      let frame = 0;
      let pendingWidth = startWidth;
      let pendingClientX = headerRect.right;
      let finished = false;
      const guide = document.createElement('div');
      const hud = document.createElement('div');
      guide.className = 'column-resize-guide';
      hud.className = 'column-resize-hud tnum';
      hud.textContent = `${tableColumnLabel(field)} · ${startWidth}px`;
      document.body.append(guide, hud);

      const paint = () => {
        frame = 0;
        col.style.width = `${pendingWidth}px`;
        header.style.width = `${pendingWidth}px`;
        const edge = header.getBoundingClientRect().right;
        guide.style.transform = `translate3d(${edge / zoom}px,0,0)`;
        hud.style.transform = `translate3d(${Math.min(window.innerWidth / zoom - 126, Math.max(8, edge / zoom + 10))}px,${Math.max(8, headerRect.bottom / zoom + 7)}px,0)`;
        hud.textContent = `${tableColumnLabel(field)} · ${pendingWidth}px`;
      };
      const queuePaint = () => {
        if (!frame) frame = requestAnimationFrame(paint);
      };
      const finish = (commit = true) => {
        if (finished) return;
        finished = true;
        if (frame) cancelAnimationFrame(frame);
        pendingWidth = commit ? pendingWidth : startWidth;
        paint();
        controller.abort();
        try {
          if (handle.hasPointerCapture?.(pointerId)) handle.releasePointerCapture(pointerId);
        } catch (_) {}
        guide.remove();
        hud.remove();
        header.classList.remove('is-column-resizing');
        document.body.classList.remove('is-resizing-column');
        activeColumnResizeCleanup = null;
        if (commit) {
          state.tablePrefs.widths[field] = pendingWidth;
          saveTablePrefs(VIEW.TABLE);
        }
      };
      activeColumnResizeCleanup = finish;
      try { handle.setPointerCapture?.(pointerId); } catch (_) {}
      document.body.classList.add('is-resizing-column');
      header.classList.add('is-column-resizing');
      paint();
      const move = moveEvent => {
        if (moveEvent.pointerId !== pointerId) return;
        if (moveEvent.pointerType === 'mouse' && moveEvent.buttons === 0) { finish(true); return; }
        moveEvent.preventDefault();
        pendingWidth = clampColumnWidth(startWidth + (moveEvent.clientX - startX) / zoom, definition);
        pendingClientX = moveEvent.clientX;
        queuePaint();
      };
      window.addEventListener('pointermove', move, { signal: controller.signal, passive: false });
      window.addEventListener('pointerup', pointerEvent => { if (pointerEvent.pointerId === pointerId) finish(true); }, { signal: controller.signal });
      window.addEventListener('pointercancel', pointerEvent => { if (pointerEvent.pointerId === pointerId) finish(true); }, { signal: controller.signal });
      handle.addEventListener('lostpointercapture', () => finish(true), { signal: controller.signal });
      window.addEventListener('blur', () => finish(true), { signal: controller.signal });
      document.addEventListener('keydown', keyEvent => {
        if (keyEvent.key !== 'Escape') return;
        keyEvent.preventDefault();
        finish(false);
      }, { signal: controller.signal });
    });
    handle.addEventListener('dblclick', event => {
      event.preventDefault();
      const field = handle.dataset.resizeColumn;
      const definition = tableColumnDefinition(field);
      const labelWidth = handle.closest('th')?.querySelector('.column-label')?.scrollWidth || definition[1];
      const sample = Math.max(labelWidth + 28, ...$$(`tbody td:nth-child(${handle.closest('th')?.cellIndex + 1}) .cell-display`, table).slice(0, 30).map(cell => Math.min(definition[2], cell.scrollWidth + 24)));
      state.tablePrefs.widths[field] = clampColumnWidth(sample, definition);
      saveTablePrefs(VIEW.TABLE);
      renderTableView();
    });
  });
}

function bulkColumnField(column) {
  if (!column || ['select', 'number', 'thumb', 'tc', 'actions'].includes(column)) return null;
  if (column.startsWith('custom:')) return customTableFields().some(f => `custom:${f.key}` === column) ? column : null;
  if (column === 'duration') return 'duration_frames';
  if (column === 'methods') return 'primary_method';
  return COLLAB_SYNC_FIELDS.includes(column) ? column : null;
}

function renderBulkActionBar() {
  const bar = $('#bulkActionBar');
  if (!bar) return;
  if (!state.bundle) {
    bar.hidden = true;
    bar.replaceChildren();
    return;
  }
  const selected = [...state.selection.selectedShotIds].filter(id => state.bundle.shots.some(shot => shot.id === id));
  state.selection.selectedShotIds = new Set(selected);
  const isBulk = selected.length >= 2;
  bar.hidden = !isBulk;
  if (!isBulk) {
    bar._editorSignature = null;
    $$('#mainShotTable th.is-bulk-column').forEach(th => th.classList.remove('is-bulk-column'));
    return;
  }
  const column = state.bulkColumn;
  const field = bulkColumnField(column);
  const definition = field?.startsWith('custom:') ? customTableFields().find(f => `custom:${f.key}` === field) : null;
  const type = definition?.field_type || (field === 'duration_frames' ? 'number' : ['status', 'primary_method', 'department'].includes(field) ? 'select' : ['description', 'voiceover', 'notes'].includes(field) ? 'textarea' : 'text');
  const label = field ? tableColumnLabel(column) : '';
  const choices = definition?.options || (field === 'status' ? Object.keys(STATUS_LABELS) : field === 'primary_method' ? PRODUCTION_METHODS.map(item => item[0]) : field === 'department' ? STEP_DEPARTMENT_OPTIONS.map(item => item[0]) : []);
  const signature = JSON.stringify([state.bundle.project.id, selected, field, type, choices]);
  $$('#mainShotTable th[data-column]').forEach(th => th.classList.toggle('is-bulk-column', !!field && th.dataset.column === column));
  if (bar._editorSignature === signature && !bar.hidden) return;
  const previousInput = $('#bulkValue');
  const previousDraft = bar._editorField === field && previousInput ? { value: previousInput.value, checked: previousInput.checked } : null;
  bar._editorSignature = signature;
  bar._editorField = field;
  const control = type === 'boolean' ? '<input id="bulkValue" type="checkbox" aria-label="统一布尔值">'
    : type === 'select' ? `<select id="bulkValue" aria-label="统一值">${choices.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('')}</select>`
    : type === 'textarea' ? `<textarea id="bulkValue" rows="2" aria-label="${escapeHtml(label)}统一值" placeholder="输入统一内容；Ctrl+Enter 应用"></textarea>`
    : `<input id="bulkValue" aria-label="${escapeHtml(label)}统一值" type="${['number', 'date', 'url'].includes(type) ? type : 'text'}" ${type === 'number' ? 'step="any"' : ''} placeholder="${field === 'duration_frames' ? '统一时长（秒）' : '输入统一值，可留空清除'}">`;
  bar.innerHTML = `<strong class="bulk-selection-count"><span class="bulk-selection-stack" aria-hidden="true"><i></i><i></i><i></i></span>已选 ${selected.length} 镜头</strong>${field ? `<span>修改：${escapeHtml(label)}</span>${control}<button id="bulkApplyBtn" class="btn btn-secondary">应用到 ${selected.length} 个镜头</button>` : '<span>点击要修改的列标题或单元格</span>'}<button id="bulkDeleteBtn" class="btn btn-danger">删除 ${selected.length} 个镜头</button><button id="bulkClearBtn" class="btn btn-ghost">清除选择</button>`;
  if (previousDraft && $('#bulkValue')) {
    $('#bulkValue').value = previousDraft.value;
    $('#bulkValue').checked = previousDraft.checked;
  }
  $('#bulkValue')?.addEventListener('keydown', event => {
    if (!event.isComposing && event.key === 'Enter' && (type !== 'textarea' || event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      $('#bulkApplyBtn')?.click();
    }
  });
  $('#bulkApplyBtn')?.addEventListener('click', async () => {
    if (!field) return;
    const input = $('#bulkValue');
    let value = type === 'boolean' ? input.checked : input.value.trim();
    if (type === 'number') {
      if (value === '' || !Number.isFinite(Number(value))) { toast('请输入有效数字', true); return; }
      value = Number(value);
      if (field === 'duration_frames') {
        if (value <= 0) { toast('时长必须大于零', true); return; }
        value = Math.max(1, Math.round(value * state.bundle.project.fps));
      }
    }
    recordHistory();
    state.bundle.shots.forEach(shot => {
      if (!state.selection.selectedShotIds.has(shot.id)) return;
      if (field.startsWith('custom:')) {
        shot.custom_fields = shot.custom_fields || {};
        shot.custom_fields[field.slice(7)] = value;
      } else {
        applyShotFieldMutation(shot, field, value, { source: 'bulk' });
      }
    });
    syncDerivedTimeline();
    markDirty();
    renderProjectHeader();
    renderCurrentView();
    toast(`已修改 ${selected.length} 个镜头的${label}，正在自动保存`);
  });
  $('#bulkDeleteBtn')?.addEventListener('click', async () => {
    await deleteSelectedShots();
  });
  $('#bulkClearBtn')?.addEventListener('click', () => { state.selection.selectedShotIds.clear(); renderCurrentView(); });
}

function syncFilterControls() {
  const selectors = [
    ['methodFilter', 'filterMethod', PRODUCTION_METHODS],
    ['statusFilter', 'filterStatus', Object.entries(STATUS_LABELS)],
    ['deptFilter', 'filterDept', STEP_DEPARTMENT_OPTIONS]
  ];
  for (const [id, key, values] of selectors) {
    const input = $(`#${id}`);
    if (!input) continue;
    const options = [['ALL', '全部'], ...values];
    if (!options.some(([value]) => value === state[key])) options.push([state[key], state[key]]);
    const signature = JSON.stringify(options);
    if (input.dataset.options !== signature) {
      input.innerHTML = options.map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`).join('');
      input.dataset.options = signature;
    }
    input.value = state[key];
  }
  const active = selectors.filter(([, key]) => state[key] !== 'ALL').length;
  const button = $('#filterPopoverBtn');
  if (button) { button.textContent = active ? `筛选 · ${active}` : '筛选'; button.classList.toggle('is-active', active > 0); }
  const count = $('#filterResultCount');
  if (count) count.textContent = `${filterShots(state.bundle?.shots || []).length} / ${state.bundle?.shots?.length || 0} 镜头`;
  const clear = $('#clearShotFilters');
  if (clear) clear.disabled = active === 0 && !state.searchQuery;
  publishWorkspaceUI();
}

$('#clearShotFilters')?.addEventListener('click', () => {
  state.filterMethod = state.filterStatus = state.filterDept = 'ALL';
  state.searchQuery = '';
  if ($('#globalSearchInput')) $('#globalSearchInput').value = '';
  $('#searchResultPanel')?.classList.add('hidden');
  renderCurrentView();
});

function filterShots(shots) {
  return shots.filter(shot => {
    if (state.filterMethod !== 'ALL' && !methodValues(shot).includes(state.filterMethod)) return false;
    if (state.filterStatus !== 'ALL' && shot.status !== state.filterStatus) return false;
    if (state.filterDept !== 'ALL' && shot.department !== state.filterDept) return false;
    if (state.searchQuery) {
      const hay = [shot.number, shot.title, shot.description, shot.voiceover, shot.primary_method, shot.shot_size, shot.lens, shot.movement].join(' ').toLowerCase();
      if (!hay.includes(state.searchQuery)) return false;
    }
    return true;
  });
}

// 富文本原位编辑里按 Tab / Shift+Tab：提交当前格并移动到相邻可编辑格。
function focusNextEditableCell(cell, shift) {
  const cells = [...document.querySelectorAll('#mainShotTable .editable-cell')].filter(item => item.getClientRects().length);
  const next = cells[cells.indexOf(cell) + (shift ? -1 : 1)];
  if (!next) return;
  const target = {shot: next.dataset.shotId, field: next.dataset.field};
  requestAnimationFrame(() => {
    const fresh = [...document.querySelectorAll('#mainShotTable .editable-cell')].find(item => item.dataset.shotId === target.shot && item.dataset.field === target.field);
    if (fresh) openInlineEditor(fresh);
  });
}

// In-place Double-Click Editing
function onTableDoubleClick(event) {
  cancelPendingSelection();
  const cell = event.target.closest('.editable-cell');
  if (!cell) {
    const row = event.target.closest('tr[data-id]');
    if (row) inspectShot(row.dataset.id);
    return;
  }
  // P0-SEL-01: Bulk edit only when AT LEAST 2 shots are selected and this shot is in selection
  if (state.selection.selectedShotIds.size > 1 && state.selection.selectedShotIds.has(cell.dataset.shotId)) {
    const column = cell.dataset.field === 'duration_seconds' ? 'duration' : cell.dataset.field;
    if (bulkColumnField(column)) {
      event.preventDefault();
      state.bulkColumn = column;
      renderBulkActionBar();
      $('#bulkValue')?.focus();
      return;
    }
  }

  event.preventDefault();
  event.stopPropagation();
  openInlineEditor(cell, {
    clientX: event.clientX,
    clientY: event.clientY,
    source: 'dblclick'
  });
}

async function openInlineEditor(cell, options = {}) {
  if (cell.classList.contains('is-editing')) return;

  const shotId = cell.dataset.shotId;
  const field = cell.dataset.field;
  const customKey = field.startsWith('custom:') ? field.slice(7) : '';
  const importKey = field.startsWith('import:') ? field.slice(7) : '';
  const customDef = customKey ? customTableFields().find(item => item.key === customKey) : null;
  const editorType = customDef?.field_type || cell.dataset.editor;

  const display = cell.querySelector('.cell-display');
  const row = cell.closest('tr[data-id]');
  const shot = state.bundle?.shots?.find(s => s.id === shotId);
  const originalValue = shot ? (customKey ? customFieldValue(shot, customKey) : importKey ? (shot.import_columns?.[importKey] ?? '') : (shot[field] ?? '')) : (display?.textContent ?? '');
  if (shot && RICH_TEXT_FIELDS.has(field)) {
    if (display) {
      // 原位编辑：表格里直接改，格式从选区浮窗或右键菜单取，不弹大窗口。
      cell.classList.add('is-editing');
      row?.classList.add('has-active-editor');
      await openRichShotEditor(shot, field, display, {
        onTab: shift => focusNextEditableCell(cell, shift),
        clientX: options.clientX,
        clientY: options.clientY,
        source: options.source || 'inline'
      });
      cell.classList.remove('is-editing');
      row?.classList.remove('has-active-editor');
      return;
    }
    openRichShotEditor(shot, field, null, options);
    return;
  }

  if (editorType === 'methods' && shot) {
    openMethodsPopover(cell, shot);
    return;
  }
  if (editorType === 'preset' && shot) {
    openShotPresetPopover(cell, shot, field);
    return;
  }

  const reservation = shot ? createSoftReservationSession(shotId, field) : null;
  cell.classList.add('is-editing');
  row?.classList.add('has-active-editor');

  const editor = editorType === 'textarea'
    ? document.createElement('textarea')
    : editorType === 'select'
      ? document.createElement('select')
      : document.createElement('input');

  editor.className = 'inline-cell-editor';
  if (editorType === 'select') {
    const options = [...new Set(['', ...(customDef?.options || []), String(originalValue || '')])];
    editor.innerHTML = options.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value || '未选择')}</option>`).join('');
    editor.value = String(originalValue || '');
  } else if (editorType === 'boolean') {
    editor.type = 'checkbox';
    editor.checked = Boolean(originalValue === true || originalValue === 'true' || originalValue === '是');
  } else {
    editor.value = originalValue;
    if (editorType === 'number') editor.type = 'number';
    if (editorType === 'date') editor.type = 'date';
    if (editorType === 'url') editor.type = 'url';
  }

  display.hidden = true;
  cell.appendChild(editor);
  editor.draggable = false;
  editor.addEventListener('pointerdown', event => event.stopPropagation());
  editor.addEventListener('mousedown', event => event.stopPropagation());
  editor.addEventListener('dragstart', event => event.stopPropagation());

  // Auto-grow for textarea: expand to show all content without scroll
  if (editor.tagName === 'TEXTAREA') {
    const autoGrow = () => {
      editor.style.height = 'auto';
      editor.style.height = editor.scrollHeight + 'px';
    };
    editor.addEventListener('input', autoGrow);
    requestAnimationFrame(autoGrow);
  }

  editor.focus();
  if (editor.setSelectionRange && !['boolean', 'number', 'date'].includes(editorType)) {
    const caret = String(editor.value || '').length;
    editor.setSelectionRange(caret, caret);
  }

  const editorId = nextEditorSessionId('inline');
  let resolveDone;
  const done = new Promise(resolve => { resolveDone = resolve; });

  const session = {
    id: editorId,
    type: 'inline',
    projectId: state.bundle?.project?.id,
    shotId,
    field,
    composing: false,
    commitInFlight: false,
    closed: false,
    isDirty() {
      if (session.closed) return false;
      const currentVal = editorType === 'boolean' ? editor.checked : editor.value;
      return String(currentVal).trim() !== String(originalValue).trim();
    },
    async waitForCompositionEnd() {
      if (!session.composing) return;
      await waitUntil(() => !session.composing, { timeout: 5000, errorMessage: '等待输入法完成超时' });
    },
    async commit() {
      if (session.closed || session.commitInFlight) return done;
      session.commitInFlight = true;
      try {
        await session.waitForCompositionEnd();
        await commit();
        return done;
      } finally {
        session.commitInFlight = false;
      }
    },
    done
  };
  registerActiveEditor(session);

  let composing = false;
  const onTyping = () => {
    if (shot && !['boolean', 'methods', 'preset'].includes(editorType)) {
      scheduleEditorDraft({
        projectId: state.bundle?.project?.id,
        shotId,
        field,
        text: editor.value,
        baseRevision: shot.base_revision || shot.revision
      });
      refreshSaveStatus();
    }
  };

  editor.addEventListener('input', onTyping);
  editor.addEventListener('compositionstart', () => { session.composing = true; composing = true; });
  editor.addEventListener('compositionend', () => {
    session.composing = false;
    composing = false;
    onTyping();
  });

  let committed = false;
  const commit = async () => {
    if (committed) return;
    committed = true;
    const newValue = editorType === 'boolean' ? editor.checked : editor.value.trim();
    if (newValue === String(originalValue).trim()) {
      closeEditor();
      return;
    }
    try {
      if (shot) {
        recordHistory();
        if (customKey) {
          shot.custom_fields = shot.custom_fields || {};
          shot.custom_fields[customKey] = editorType === 'number' ? (parseFloat(newValue) || 0) : newValue;
        } else if (importKey) {
          shot.import_columns = shot.import_columns || {};
          shot.import_columns[importKey] = newValue;
        } else if (editorType === 'number') {
          const num = parseFloat(newValue) || 0;
          shot[field] = num;
          if (field === 'duration_seconds') {
            shot.duration_frames = Math.round(num * state.bundle.project.fps);
          }
        } else {
          applyShotFieldMutation(shot, field, newValue, { source: 'inline' });
        }
        if (field === 'duration_seconds') syncDerivedTimeline();
        markDirty();
        renderProjectHeader();
      }
      display.textContent = editorType === 'boolean' ? (newValue ? '是' : '否') : editorType === 'number' && !customKey ? `${newValue}s` : (newValue || '—');
      display.title = String(newValue);
      closeEditor();
      if (field === 'duration_seconds' || field === 'shot_size' || field === 'lens') renderTableView();
      if (state.inspector.targetShotId === shotId) renderInspector();
    } catch (err) {
      toast('保存失败: ' + err.message, true);
      committed = false;
      editor.style.borderColor = 'var(--danger)';
    }
  };

  const closeEditor = () => {
    session.closed = true;
    unregisterActiveEditor(session);
    reservation?.release();
    resolveDone?.();
    editor.remove();
    display.hidden = false;
    cell.classList.remove('is-editing');
    row?.classList.remove('has-active-editor');
    refreshSaveStatus();
  };

  editor.addEventListener('blur', commit);
  if (editorType === 'select' || editorType === 'boolean') editor.addEventListener('change', commit);
  editor.addEventListener('keydown', async e => {
    if (composing || e.isComposing) return;
    if (e.key === 'Tab') {
      e.preventDefault();
      const cells = [...document.querySelectorAll('#mainShotTable .editable-cell')].filter(item => item.getClientRects().length);
      const next = cells[cells.indexOf(cell) + (e.shiftKey ? -1 : 1)];
      const target = next && {shot: next.dataset.shotId, field: next.dataset.field};
      await commit();
      if (editor.isConnected) return;
      if (target) {
        const fresh = [...document.querySelectorAll('#mainShotTable .editable-cell')].find(item => item.dataset.shotId === target.shot && item.dataset.field === target.field);
        if (fresh) openInlineEditor(fresh);
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      await commit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      committed = true;
      // User explicitly cancelled — clear any pending draft for this field
      if (shot && state.bundle?.project?.id) {
        clearEditorDraft(state.bundle.project.id, shotId, field);
      }
      closeEditor();
    }
  });
}

// --------------------------------------------------------------------------
// 9. STORYBOARD CARDS VIEW
// --------------------------------------------------------------------------
function shotExtendedEntries(shot) {
  const labels = {
    panel_frame: '分镜图框', tc_out: 'TC OUT', action: '动作', performance: '表演', composition: '构图',
    director_notes: '导演备注', notes: '备注', height: '机位高度', equipment: '摄影设备', sensor: '传感器',
    aperture: '光圈', shutter: '快门', camera_fps: '摄影帧率', dialogue: '对白', subtitle: '字幕', music: '音乐',
    sound: '声音', owner: '负责人', transition: '剪辑/转场', approval_version: '审批版本'
  };
  const entries = Object.entries(labels).map(([key, label]) => [label, shot?.[key]]);
  customTableFields().filter(field => !isColumnArchived(`custom:${field.key}`) && !isColumnPurged(`custom:${field.key}`)).forEach(field => entries.push([field.label, customFieldValue(shot, field.key)]));
  Object.entries(shot?.import_columns || {}).filter(([key]) => !isColumnArchived(`import:${key}`) && !isColumnPurged(`import:${key}`)).forEach(([key, value]) => entries.push([key, value]));
  return entries.filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '');
}

function renderShotExtendedFields(shot) {
  const entries = shotExtendedEntries(shot);
  return entries.length ? `<details class="card-extra-disclosure"><summary>更多信息 · ${entries.length}</summary><div class="card-extra-fields">${entries.map(([label, value]) => `<div><span>${escapeHtml(label)}</span><b>${escapeHtml(String(value))}</b></div>`).join('')}</div></details>` : '';
}

function renderCardsView() {
  const grid = $('#shotCardGrid');
  if (!grid || !state.bundle) return;
  grid.innerHTML = '';

  const shots = filterShots(state.bundle.shots);

  shots.forEach(shot => {
    const card = document.createElement('article');
    const isSel = shot.id === state.selection.activeShotId || state.selection.selectedShotIds.has(shot.id);
    card.className = `shot-card ${isSel ? 'is-selected' : ''}`;
    card.dataset.id = shot.id;
    card.dataset.contextShotId = shot.id;
    card.tabIndex = 0;
    card.setAttribute('aria-haspopup', 'menu');

    const mediaUrl = getShotPrimaryMedia(shot);
    const statusClass = (shot.status || 'Draft').toLowerCase().replace(/\s+/g, '');
    const statusName = STATUS_LABELS[shot.status] || shot.status || '草稿';

    card.innerHTML = `
      <div class="shot-card-header">
        <span class="shot-card-identity"><span class="shot-drag-handle" data-shot-drag-handle role="button" aria-label="拖动 SHOT ${escapeHtml(shot.number)}" title="按住拖动镜头；多选时拖动整组"><svg class="g-icon"><use href="#icon-drag_indicator"></use></svg></span><span class="shot-number tnum">SHOT ${escapeHtml(shot.number)}</span><span class="shot-selection-mark" aria-hidden="true">${state.selection.selectedShotIds.has(shot.id) ? '✓' : ''}</span></span>
        <span class="timecode tnum">${shot.tc_in || '00:00:00:00'}</span>
      </div>
      <div class="storyboard-media" data-shot-id="${shot.id}" data-field="thumb">
        ${mediaUrl ? `<img src="${mediaUrl}" loading="lazy" decoding="async" alt="SHOT ${shot.number}">` : `<span style="font-size:11px;color:var(--text-muted);">暂无分镜</span>`}
        ${shotCommentBadge(shot)}
        ${mediaUploadIndicator(shot)}
        <div class="media-hover-actions">↑ 上传 / 替换</div>
      </div>
      <div class="shot-card-body">
        <div class="card-title-row">
          <span>${formattedShotField(shot,'title','未命名镜头')}</span>
          <span class="tnum" style="font-size:11px;color:var(--text-muted);">${shot.duration_seconds}s</span>
        </div>
        <div class="card-camera-meta">
          ${escapeHtml(shot.shot_size || '全景')} · ${escapeHtml(shot.movement || '固定')} · ${escapeHtml(shot.lens || '35mm')}
        </div>
        <div class="card-inline-field" data-card-copy="description" role="button" tabindex="0" aria-label="直接修改画面描述" title="点击直接修改">
          <span class="card-inline-field-label">画面描述</span><p>${formattedShotField(shot,'description','暂无画面描述')}</p><svg class="g-icon card-inline-edit-icon"><use href="#icon-edit"></use></svg>
        </div>
        <div class="card-inline-field is-voiceover" data-card-copy="voiceover" role="button" tabindex="0" aria-label="直接修改对应旁白" title="点击直接修改">
          <span class="card-inline-field-label">对应旁白</span><p>${formattedShotField(shot,'voiceover','暂无对应旁白')}</p><svg class="g-icon card-inline-edit-icon"><use href="#icon-edit"></use></svg>
        </div>
        ${renderShotExtendedFields(shot)}
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:2px;">
          <span class="status-dot-label ${statusClass}">${statusName}</span>
          <span style="font-size:10px;font-weight:600;background:var(--bg-surface-3);color:var(--text-secondary);padding:1px 6px;border-radius:4px;">
            ${escapeHtml(methodValues(shot).map(methodLabel).join(' · '))}
          </span>
        </div>
      </div>
    `;

    card.addEventListener('click', e => {
      if (Date.now() < suppressShotActivationUntil) { e.preventDefault(); return; }
      const editableCopy = e.target.closest('[data-card-copy]');
      if (editableCopy) {
        e.stopPropagation();
        startCardCopyEdit(card, shot, editableCopy.dataset.cardCopy, editableCopy.querySelector('p'));
        return;
      }
      const commentBadge = e.target.closest('[data-shot-comments]');
      if (commentBadge) {
        e.stopPropagation();
        selectShot(shot.id);
        navigateToView(VIEW.REVIEW);
        return;
      }
      if (e.target.closest('.storyboard-media')) return;
      if (e.shiftKey || e.ctrlKey || e.metaKey) {
        toggleShotSelection(shot.id, e, shots);
      } else {
        state.selection.selectedShotIds.clear();
        state.selection.anchorShotId = shot.id;
        selectShot(shot.id);
      }
    });
    card.addEventListener('dblclick', event => {
      if (event.target.closest('[data-card-copy], .storyboard-media, [data-shot-comments]')) return;
      event.preventDefault();
      event.stopPropagation();
      inspectShot(shot.id);
    });

    const mediaFrame = $('.storyboard-media', card);
    mediaFrame?.addEventListener('click', e => {
      e.stopPropagation();
      triggerShotMediaUpload(shot.id);
    });

    grid.append(card);
  });
  syncShotSelectionClasses(grid);
  wirePointerShotReorder(grid, '.shot-card[data-id]', card => card.dataset.id);
}

function startCardCopyEdit(card, shot, field, host) {
  if (!card || !shot || !['description', 'voiceover'].includes(field) || card.querySelector('.card-inline-editor')) return;
  openRichShotEditor(shot, field, host || null);
}

// --------------------------------------------------------------------------
// 10. VISUAL WALL (CONTACT SHEET 16:9)
// --------------------------------------------------------------------------
function renderWallView() {
  const grid = $('#wallGrid');
  if (!grid || !state.bundle) return;
  grid.innerHTML = '';

  const shots = filterShots(state.bundle.shots);

  shots.forEach(shot => {
    const mediaUrl = getShotPrimaryMedia(shot);
    const item = document.createElement('div');
    item.className = 'wall-item';
    item.dataset.id = shot.id;
    item.dataset.contextShotId = shot.id;
    item.tabIndex = 0;
    item.setAttribute('aria-haspopup', 'menu');
    item.innerHTML = `
      <div class="wall-media" data-shot-id="${shot.id}" data-field="thumb">
        ${mediaUrl ? `<img src="${mediaUrl}" loading="lazy" decoding="async" alt="SHOT ${shot.number}">` : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:11px;">SHOT ${shot.number}</div>`}
        ${mediaUploadIndicator(shot)}
        <div class="media-hover-actions">↑ 替换</div>
      </div>
      <div class="wall-caption">
        <span class="shot-card-identity"><span class="shot-drag-handle" data-shot-drag-handle role="button" aria-label="拖动 SHOT ${escapeHtml(shot.number)}" title="按住拖动镜头；多选时拖动整组"><svg class="g-icon"><use href="#icon-drag_indicator"></use></svg></span><span class="shot-number tnum">SHOT ${escapeHtml(shot.number)}</span><span class="shot-selection-mark" aria-hidden="true">${state.selection.selectedShotIds.has(shot.id) ? '✓' : ''}</span>${shotCommentBadge(shot)}</span>
        <span class="timecode tnum">${shot.duration_seconds}s</span>
      </div>
    `;

    item.addEventListener('click', e => {
      if (Date.now() < suppressShotActivationUntil) { e.preventDefault(); return; }
      if (e.target.closest('[data-shot-comments]')) {
        e.stopPropagation();
        selectShot(shot.id);
        navigateToView(VIEW.REVIEW);
      } else if (e.target.closest('.media-hover-actions')) {
        triggerShotMediaUpload(shot.id);
      } else {
        if (e.shiftKey || e.ctrlKey || e.metaKey) {
          toggleShotSelection(shot.id, e, shots);
        } else {
          state.selection.selectedShotIds.clear();
          state.selection.anchorShotId = shot.id;
          selectShot(shot.id);
          navigateToView(VIEW.CARDS);
        }
      }
    });

    grid.append(item);
  });
  syncShotSelectionClasses(grid);
  wirePointerShotReorder(grid, '.wall-item[data-id]', item => item.dataset.id);
}

// --------------------------------------------------------------------------
// 11. TIMELINE & ANIMATIC VIEWER
// --------------------------------------------------------------------------
function renderTimelineView() {
  const activeIndex = state.bundle?.shots?.findIndex(shot => shot.id === state.selection.activeShotId) ?? -1;
  if (!state.isPlaying && activeIndex >= 0) state.playIndex = activeIndex;
  renderAnimaticScreen();
  renderTimelineLanes();
}

function formatTimelineClock(seconds) {
  const value = Math.max(0, Math.round(Number(seconds) || 0));
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
}

function timelineElapsedSeconds(index = state.playIndex) {
  const shots = state.bundle?.shots || [];
  const fps = Math.max(1, Number(state.bundle?.project?.fps) || 25);
  return shots.slice(0, Math.max(0, index)).reduce((sum, shot) => sum + Number(shot.duration_frames || 0), 0) / fps;
}

function updateTimelineTransport() {
  const shots = state.bundle?.shots || [];
  const current = shots[state.playIndex];
  const fps = Math.max(1, Number(state.bundle?.project?.fps) || 25);
  const total = shots.reduce((sum, shot) => sum + Number(shot.duration_frames || 0), 0) / fps;
  const scrubber = $('#timelineScrubber');
  if (scrubber) {
    scrubber.max = String(Math.max(0, shots.length - 1));
    scrubber.value = String(Math.max(0, Math.min(state.playIndex, shots.length - 1)));
    scrubber.disabled = shots.length < 2;
  }
  if ($('#timelineElapsed')) $('#timelineElapsed').textContent = formatTimelineClock(timelineElapsedSeconds());
  if ($('#timelineTotal')) $('#timelineTotal').textContent = formatTimelineClock(total);
  if ($('#timelinePrevBtn')) $('#timelinePrevBtn').disabled = state.playIndex <= 0;
  if ($('#timelineNextBtn')) $('#timelineNextBtn').disabled = state.playIndex >= shots.length - 1;
  if ($('#timelinePlayBtn')) $('#timelinePlayBtn').disabled = state.isPlaying || !current;
  if ($('#timelinePauseBtn')) $('#timelinePauseBtn').disabled = !state.isPlaying;
  if (!state.isPlaying && $('#timelinePlaybackStatus')) {
    $('#timelinePlaybackStatus').textContent = current ? `已暂停 · SHOT ${current.number} · ${current.duration_seconds}s` : '暂无镜头';
  }
}

function updateTimelineSelection({ reveal = false } = {}) {
  const shots = state.bundle?.shots || [];
  const current = shots[state.playIndex];
  $$('.timeline-clip').forEach(clip => {
    const active = clip.dataset.id === current?.id;
    const selected = state.selection.selectedShotIds.has(clip.dataset.id);
    clip.classList.toggle('is-selected', active || selected);
    clip.classList.toggle('is-multi-selected', selected);
    const mark = clip.querySelector('.shot-selection-mark');
    if (mark) mark.textContent = active || selected ? '✓' : '';
  });
  if (reveal) $(`.timeline-clip[data-id="${CSS.escape(current?.id || '')}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  updateTimelineTransport();
}

function jumpTimelineTo(index, { stop = true, reveal = true } = {}) {
  const shots = state.bundle?.shots || [];
  if (!shots.length) return;
  if (stop) stopTimelinePlayback();
  state.playIndex = Math.max(0, Math.min(Number(index) || 0, shots.length - 1));
  selectShot(shots[state.playIndex].id);
  renderAnimaticScreen();
  updateTimelineSelection({ reveal });
}

function renderAnimaticScreen() {
  const shots = state.bundle?.shots || [];
  const curShot = shots[state.playIndex] || shots[0];
  const screen = $('#animaticScreen');
  const info = $('#timelineViewerInfo');
  if (!curShot || !screen || !info) return;

  const mediaUrl = getShotPrimaryMedia(curShot);
  screen.dataset.contextShotId = curShot.id;
  screen.tabIndex = 0;
  screen.setAttribute('aria-haspopup', 'menu');
  screen.innerHTML = mediaUrl
    ? `<img src="${mediaUrl}" alt="SHOT ${curShot.number}">`
    : `<div class="timeline-empty-frame"><b>SHOT ${curShot.number}</b><small>${escapeHtml(curShot.title || '暂无画面')}</small></div>`;

  info.innerHTML = `
    <div class="timeline-info-head">
      <div><small>当前镜头</small><h3>SHOT ${curShot.number} · ${escapeHtml(curShot.title || '未命名')}</h3></div>
      <span class="timeline-current-tc tnum">${curShot.tc_in || '00:00:00:00'}</span>
    </div>
    <div class="timeline-shot-facts">
      <span>${escapeHtml(curShot.shot_size || '全景')}</span><span>${escapeHtml(curShot.movement || '固定')}</span><span>${escapeHtml(curShot.lens || '35mm')}</span><b>${curShot.duration_seconds}s · ${curShot.duration_frames}f</b>
    </div>
    <p class="timeline-description">${escapeHtml(curShot.description || '暂无画面描述')}</p>
    ${curShot.voiceover ? `<blockquote class="timeline-voiceover"><span>旁白</span>${escapeHtml(curShot.voiceover)}</blockquote>` : ''}
    ${renderShotExtendedFields(curShot)}
  `;
  updateTimelineTransport();
}

function renderTimelineLanes() {
  const track = $('#timelineScrollArea');
  if (!track || !state.bundle) return;
  track.innerHTML = '';

  const ruler = document.createElement('div');
  ruler.className = 'timeline-track-row timeline-ruler-track';
  ruler.innerHTML = `<span>00:00:00:00</span><span style="margin-left:auto;">${formatSeconds(state.bundle.shots.reduce((a, s) => a + s.duration_frames, 0) / state.bundle.project.fps)}</span>`;
  track.append(ruler);

  const shots = state.bundle.shots || [];
  const mode = state.timelineGroupMode || 'chapter';
  const groups = [];
  shots.forEach((shot, idx) => {
    const rawPart = state.timelineAutoPart ? (shot.chapter || shot.scene || '未分组') : '全部镜头';
    const key = mode === 'method' ? (methodValues(shot).map(methodLabel).join(' · ') || '未指定') : mode === 'chapter' ? rawPart : `镜头 ${idx + 1}`;
    let group = groups.at(-1);
    if (!group || group.key !== key || mode === 'none') {
      group = { key, shots: [] };
      groups.push(group);
    }
    group.shots.push({ shot, idx });
  });
  groups.forEach(group => {
    if (mode !== 'none' || state.timelineAutoPart) {
      const header = document.createElement('div');
      header.className = 'timeline-part-header';
      const total = group.shots.reduce((sum, item) => sum + Number(item.shot.duration_frames || 0), 0) / state.bundle.project.fps;
      header.innerHTML = `<span>${escapeHtml(group.key)}</span><small>${group.shots.length} 镜 · ${formatSeconds(total)}</small>`;
      track.append(header);
    }
    const lane = document.createElement('div');
    lane.className = 'timeline-group-lane';
    group.shots.forEach(({ shot, idx }) => {
      const clip = document.createElement('button');
      clip.type = 'button';
      clip.className = `timeline-clip ${idx === state.playIndex || state.selection.selectedShotIds.has(shot.id) ? 'is-selected' : ''}`;
      clip.dataset.id = shot.id;
      clip.dataset.contextShotId = shot.id;
      clip.setAttribute('aria-haspopup', 'menu');
      clip.style.flex = `${shot.duration_frames} 0 auto`;
      clip.style.minWidth = '78px';
      clip.title = `${shot.tc_in || ''} · ${shot.duration_seconds}s`;
      clip.innerHTML = `<span class="timeline-clip-title"><span class="shot-drag-handle" data-shot-drag-handle role="button" aria-label="拖动 SHOT ${escapeHtml(shot.number)}" title="按住拖动镜头；多选时拖动整组"><svg class="g-icon"><use href="#icon-drag_indicator"></use></svg></span><b class="tnum">SHOT ${escapeHtml(shot.number)}</b><span class="shot-selection-mark" aria-hidden="true">${state.selection.selectedShotIds.has(shot.id) ? '✓' : ''}</span></span><span class="tnum" style="color:var(--text-muted);">${escapeHtml(String(shot.duration_seconds || 0))}s</span>`;
      clip.onclick = event => {
        if (Date.now() < suppressShotActivationUntil) return;
        if (event.shiftKey || event.ctrlKey || event.metaKey) toggleShotSelection(shot.id, event, shots);
        else { state.selection.selectedShotIds.clear(); state.selection.anchorShotId = shot.id; jumpTimelineTo(idx, { reveal: false }); }
      };
      clip.ondblclick = event => {
        event.preventDefault();
        event.stopPropagation();
        inspectShot(shot.id);
      };
      lane.append(clip);
    });
    track.append(lane);
  });
  syncShotSelectionClasses(track);
  wirePointerShotReorder(track, '.timeline-clip[data-id]', clip => clip.dataset.id);
  updateTimelineTransport();
}

function stopTimelinePlayback() {
  state.isPlaying = false;
  if (state.playTimer) window.clearTimeout(state.playTimer);
  state.playTimer = null;
  const status = $('#timelinePlaybackStatus');
  const shot = state.bundle?.shots?.[state.playIndex];
  if (status) status.textContent = shot ? `已暂停 · SHOT ${shot.number} · ${shot.duration_seconds}s` : '暂无镜头';
  updateTimelineTransport();
}

function startTimelinePlayback() {
  if (!state.bundle?.shots?.length) return;
  state.isPlaying = true;
  const tick = () => {
    if (!state.isPlaying) return;
    const shot = state.bundle.shots[state.playIndex];
    if (!shot) { stopTimelinePlayback(); return; }
    selectShot(shot.id);
    renderAnimaticScreen();
    updateTimelineSelection({ reveal: true });
    const status = $('#timelinePlaybackStatus');
    if (status) status.textContent = `播放中 · SHOT ${shot.number} · ${shot.duration_seconds}s`;
    state.playTimer = window.setTimeout(() => {
      if (state.playIndex >= state.bundle.shots.length - 1) { stopTimelinePlayback(); return; }
      state.playIndex += 1;
      tick();
    }, Math.max(250, Number(shot.duration_frames || 1) / Number(state.bundle.project.fps || 25) * 1000));
  };
  tick();
}

$('#timelinePlayBtn')?.addEventListener('click', startTimelinePlayback);
$('#timelinePauseBtn')?.addEventListener('click', stopTimelinePlayback);
$('#timelineResetBtn')?.addEventListener('click', () => {
  jumpTimelineTo(0);
});
$('#timelinePrevBtn')?.addEventListener('click', () => jumpTimelineTo(state.playIndex - 1));
$('#timelineNextBtn')?.addEventListener('click', () => jumpTimelineTo(state.playIndex + 1));
$('#timelineScrubber')?.addEventListener('input', event => jumpTimelineTo(Number(event.target.value), { reveal: false }));
$('#timelineGroupMode')?.addEventListener('change', event => { state.timelineGroupMode = event.target.value; renderTimelineLanes(); });
$('#timelineAutoPart')?.addEventListener('change', event => { state.timelineAutoPart = event.target.checked; renderTimelineLanes(); });

// --------------------------------------------------------------------------
// 12. NOTION DATABASE PAGE PROPERTY INSPECTOR
// --------------------------------------------------------------------------
function syncShotSelectionClasses(root = document) {
  const selected = state.selection.selectedShotIds || new Set();
  const isMulti = selected.size >= 2;
  const isSingle = selected.size === 1;

  $$('[data-context-shot-id], tr[data-id]', root).forEach(item => {
    const id = item.dataset.contextShotId || item.dataset.id;
    if (!id) return;
    const isActive = id === state.selection.activeShotId;
    const isItemSelected = selected.has(id);
    const itemMulti = isMulti && isItemSelected;
    const itemSingle = (isSingle && isItemSelected) || (selected.size === 0 && isActive);

    item.classList.toggle('is-active-shot', isActive);
    item.classList.toggle('is-selected-shot', itemSingle);
    item.classList.toggle('is-multi-selected', itemMulti);
    item.classList.toggle('is-selected', isActive || isItemSelected);
    item.setAttribute('aria-selected', String(isActive || isItemSelected));
  });
  $$('.shot-select[data-shot-id]', root).forEach(input => { input.checked = selected.has(input.dataset.shotId); });
  $$('.shot-selection-mark', root).forEach(mark => {
    const owner = mark.closest('[data-context-shot-id], [data-id]');
    const id = owner?.dataset.contextShotId || owner?.dataset.id;
    mark.innerHTML = id && selected.has(id) ? '<svg class="g-icon" aria-hidden="true"><use href="#icon-check"></use></svg>' : '';
  });
  const all = $('#mainShotTable .shot-select[data-all]');
  if (all) {
    const visible = filterShots(state.bundle?.shots || []);
    const count = visible.filter(shot => selected.has(shot.id)).length;
    all.checked = visible.length > 0 && count === visible.length;
    all.indeterminate = count > 0 && count < visible.length;
  }
}

function selectionRangeIds(shotId, items = filterShots(state.bundle?.shots || [])) {
  const anchorId = state.selection.anchorShotId || state.selection.activeShotId;
  const anchor = items.findIndex(shot => shot.id === anchorId);
  const target = items.findIndex(shot => shot.id === shotId);
  if (anchor < 0 || target < 0) return [shotId];
  const [start, end] = anchor < target ? [anchor, target] : [target, anchor];
  return items.slice(start, end + 1).map(shot => shot.id);
}

let pendingSelectionTimer = null;

function cancelPendingSelection() {
  if (pendingSelectionTimer) {
    clearTimeout(pendingSelectionTimer);
    pendingSelectionTimer = null;
  }
}

function activateShotForPointer(shotId, event, items = filterShots(state.bundle?.shots || [])) {
  if (!shotId) return;
  cancelPendingSelection();
  if (event?.shiftKey && (state.selection.anchorShotId || state.selection.activeShotId)) {
    const range = selectionRangeIds(shotId, items);
    state.selection.selectedShotIds = new Set(range);
    state.selection.activeShotId = shotId;
    syncShotSelectionClasses();
    renderBulkActionBar();
  } else if (event?.ctrlKey || event?.metaKey) {
    if (state.selection.selectedShotIds.has(shotId)) {
      state.selection.selectedShotIds.delete(shotId);
      state.selection.activeShotId = [...state.selection.selectedShotIds].at(-1) || null;
    } else {
      state.selection.selectedShotIds.add(shotId);
      state.selection.activeShotId = shotId;
    }
    state.selection.anchorShotId = shotId;
    syncShotSelectionClasses();
    if (state.selection.selectedShotIds.size >= 2) {
      closeInspector();
      document.body.dataset.hasShot = 'false';
      $('#workspaceContentGrid')?.classList.remove('has-inspector');
      $('#inspectorSlot')?.setAttribute('hidden', '');
      renderBulkActionBar();
    } else {
      renderBulkActionBar();
      if (state.selection.activeShotId) {
        selectShot(state.selection.activeShotId);
      }
    }
  } else {
    if (state.selection.selectedShotIds.size > 1 && state.selection.selectedShotIds.has(shotId)) {
      state.selection.activeShotId = shotId;
      syncShotSelectionClasses();
      pendingSelectionTimer = setTimeout(() => {
        pendingSelectionTimer = null;
        state.selection.selectedShotIds = new Set([shotId]);
        state.selection.activeShotId = shotId;
        state.selection.anchorShotId = shotId;
        syncShotSelectionClasses();
        renderBulkActionBar();
        selectShot(shotId);
      }, 220);
      return;
    }

    state.selection.selectedShotIds = new Set([shotId]);
    state.selection.activeShotId = shotId;
    state.selection.anchorShotId = shotId;
    syncShotSelectionClasses();
    renderBulkActionBar();
    selectShot(shotId);
  }
}

function toggleShotSelection(shotId, event, items = filterShots(state.bundle?.shots || [])) {
  activateShotForPointer(shotId, event, items);
}

async function deleteSelectedShots() {
  if (!state.bundle) return false;
  const ids = [...state.selection.selectedShotIds].filter(id => state.bundle.shots.some(shot => shot.id === id));
  if (!ids.length) return false;
  const selectedLabels = ids.map(id => {
    const shot = state.bundle.shots.find(item => item.id === id);
    return `SHOT ${shot?.number || '—'} · ${shot?.title || '未命名'}`;
  });
  const shotScope = selectedLabels.length <= 5 ? selectedLabels.join('、') : `${selectedLabels.slice(0, 5).join('、')} 等 ${selectedLabels.length} 个镜头`;
  if (!await confirmAction('移入镜头废纸篓', `将以下 ${ids.length} 个镜头移入废纸篓：${shotScope}。可在 30 天内恢复。`)) return false;
  recordHistory();
  const before = { ...state.bundle, shots: cloneShots(state.bundle.shots) };
  const projectId = before.project.id;
  state.bundle = { ...before, shots: before.shots.filter(shot => !ids.includes(shot.id)) };
  if (state.inspector.open && ids.includes(state.inspector.targetShotId)) closeInspector();
  state.bundle.shots.forEach((shot, index) => { shot.position = index; shot.sort_index = index; shot.number = String(index + 1).padStart(3, '0'); });
  state.selection.selectedShotIds.clear();
  state.selection.activeShotId = state.bundle.shots[0]?.id || null;
  renderProjectHeader();
  renderCurrentView();
  try {
    const deletedBundle = await api(`/api/projects/${projectId}/shots/bulk-delete`, { method: 'POST', json: { shot_ids: ids } });
    if (state.bundle?.project?.id !== projectId) return true;
    state.bundle = adoptServerBundle(deletedBundle);
    state.lastServerUpdatedAt = state.bundle.project.updated_at || state.lastServerUpdatedAt;
    state.selection.activeShotId = state.bundle.shots[0]?.id || null;
    renderProjectHeader();
    renderCurrentView();
    if (state.inspector.open) renderInspector();
    toast(`已删除 ${ids.length} 个镜头`);
    return true;
  } catch (err) {
    if (state.bundle?.project?.id !== projectId) return false;
    state.bundle = before;
    state.selection.selectedShotIds = new Set(ids);
    renderProjectHeader();
    renderCurrentView();
    if (state.inspector.open) renderInspector();
    toast(`删除失败，已恢复选择：${err.message}`, true);
    return false;
  }
}

function updateShotSelection(shotId) {
  if (shotId && !state.bundle?.shots?.some(shot => shot.id === shotId)) shotId = null;
  state.selection.activeShotId = shotId;
  if (shotId) {
    if (state.selection.selectedShotIds.size <= 1) {
      state.selection.selectedShotIds = new Set([shotId]);
      state.selection.anchorShotId = shotId;
    }
  } else {
    state.selection.selectedShotIds.clear();
    state.selection.anchorShotId = null;
  }
  const hasShot = shotId !== null;
  document.body.dataset.hasShot = hasShot ? 'true' : 'false';
  syncShotSelectionClasses();
  renderBulkActionBar();
  queuePresenceHeartbeat(true);
}

function selectShot(shotId) {
  updateShotSelection(shotId);
  publishWorkspaceUI();
}

function syncInspectorVisibility() {
  const targetExists = state.bundle?.shots?.some(shot => shot.id === state.inspector.targetShotId);
  const visible = Boolean(state.inspector.open && targetExists);
  if (!visible) { state.inspector.open = false; state.inspector.targetShotId = null; }
  $('#workspaceContentGrid')?.classList.toggle('has-inspector', visible);
  const slot = $('#inspectorSlot');
  if (slot) slot.hidden = !visible;
  const trigger = $('#toggleInspectorBtn');
  if (trigger) {
    trigger.setAttribute('aria-expanded', String(visible));
    trigger.setAttribute('aria-pressed', String(visible));
    trigger.setAttribute('aria-label', '详情');
    trigger.setAttribute('title', visible ? '收起镜头详情' : '打开镜头详情');
  }
}

function closeInspector() {
  state.inspector.open = false;
  state.inspector.targetShotId = null;
  syncInspectorVisibility();
  publishWorkspaceUI();
}

function inspectShot(shotId) {
  if (!state.bundle?.shots?.some(shot => shot.id === shotId)) return false;
  updateShotSelection(shotId);
  state.inspector.targetShotId = shotId;
  state.inspector.open = true;
  syncInspectorVisibility();
  renderInspector();
  publishWorkspaceUI();
  return true;
}

const REVIEW_COMPARE_FIELDS = [
  { key: 'title', label: '镜头标题' },
  { key: 'chapter', label: '篇章' },
  { key: 'scene', label: '场景 / 地点' },
  { key: 'panel_frame', label: '分镜图框' },
  { key: 'description', label: '画面描述' },
  { key: 'voiceover', label: '对应旁白' },
  { key: 'duration_seconds', label: '时长' },
  { key: 'shot_size', label: '景别' },
  { key: 'lens', label: '焦段' },
  { key: 'movement', label: '运镜' },
  { key: 'angle', label: '机位角度' },
  { key: 'primary_method', label: '主要制作方式' },
  { key: 'department', label: '责任部门' },
  { key: 'owner', label: '负责人' },
  { key: 'status', label: '状态' }
];

function reviewCompareFields(current, previous) {
  const fields = [...REVIEW_COMPARE_FIELDS];
  customTableFields().forEach(field => fields.push({ key: `custom:${field.key}`, label: field.label }));
  const importedKeys = new Set([
    ...Object.keys(current?.import_columns || {}),
    ...Object.keys(previous?.import_columns || previous?.import_columns_json || {})
  ]);
  importedKeys.forEach(key => fields.push({ key: `import:${key}`, label: `原始列 · ${key}` }));
  return fields;
}

function versionSnapshot(version) {
  if (!version) return {};
  if (version.snapshot && typeof version.snapshot === 'object') return version.snapshot;
  try {
    const parsed = JSON.parse(version.snapshot_json || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (_) {
    return {};
  }
}

function reviewFieldValue(source, key) {
  let raw;
  if (key.startsWith('custom:')) raw = source?.custom_fields?.[key.slice(7)];
  else if (key.startsWith('import:')) {
    let imported = source?.import_columns || source?.import_columns_json || {};
    if (typeof imported === 'string') { try { imported = JSON.parse(imported); } catch (_) { imported = {}; } }
    raw = imported?.[key.slice(7)];
  } else raw = source?.[key];
  if (key === 'status') return STATUS_LABELS[raw] || raw || '—';
  if (key === 'duration_seconds') {
    if (raw === undefined || raw === null || raw === '') {
      const frames = Number(source?.duration_frames);
      raw = Number.isFinite(frames) ? frames / Math.max(1, Number(state.bundle?.project?.fps) || 25) : '';
    }
    return raw === '' ? '—' : `${Number(raw.toFixed ? raw.toFixed(3) : Number(raw).toFixed(3))}s`;
  }
  return String(raw ?? '').trim() || '—';
}

function reviewChanges(current, previous) {
  return reviewCompareFields(current, previous).map(field => {
    const before = reviewFieldValue(previous, field.key);
    const after = reviewFieldValue(current, field.key);
    return { ...field, before, after, changed: before !== after };
  });
}

function renderTrackedChanges(current, previous) {
  const changes = reviewChanges(current, previous);
  const changed = changes.filter(item => item.changed);
  if (!changed.length) return '<div class="review-no-change">当前稿与所选快照在主要字段上没有差异。</div>';
  return `<div class="word-review-document">${changed.map(item => `
    <section class="word-review-change">
      <div class="word-review-field">${escapeHtml(item.label)}</div>
      <div class="word-review-copy"><del>${escapeHtml(item.before)}</del><ins>${escapeHtml(item.after)}</ins></div>
    </section>
  `).join('')}</div>`;
}

function commentInitial(comment) {
  const name = String(comment?.author_name || '评').trim();
  return escapeHtml(name.slice(0, 1).toUpperCase() || '评');
}

function formatDateTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value || '—') : date.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

function renderHoverComments(comments, { compact = false } = {}) {
  if (!comments?.length) return '';
  return `<div class="word-comment-rail ${compact ? 'is-compact' : ''}" aria-label="悬浮评论">${comments.map((comment, index) => `
    <button type="button" class="word-comment-pin ${comment.is_resolved ? 'is-resolved' : ''}" data-open-comment="${escapeHtml(comment.id)}" aria-label="查看 ${escapeHtml(comment.author_name || '协作者')} 的评论">
      <span class="word-comment-avatar">${commentInitial(comment)}</span>
      <span class="word-comment-index">${index + 1}</span>
      <span class="word-comment-tooltip" role="tooltip">
        <span class="word-comment-meta"><b>${escapeHtml(comment.author_name || '协作者')}</b><time>${escapeHtml(comment.timecode || comment.created_at || '')}</time></span>
        ${comment.quote_text ? `<span class="word-comment-reference"><small>${escapeHtml(COMMENT_REFERENCE_LABELS[comment.quote_field] || '自动引用')}</small><span>${escapeHtml(comment.quote_text)}</span></span>` : ''}
        <span class="word-comment-text">${escapeHtml(comment.text || '')}</span>
        <span class="word-comment-state">${comment.is_resolved ? '已解决' : '待处理'}</span>
      </span>
    </button>
  `).join('')}</div>`;
}

function openShotReview(shotId, tab = 'comments', versionId = '') {
  const container = $('#reviewContainer');
  if (container) {
    container.dataset.reviewTab = tab;
    if (versionId) container.dataset.reviewVersionId = versionId;
    else delete container.dataset.reviewVersionId;
  }
  selectShot(shotId);
  navigateToView(VIEW.REVIEW);
}

function renderInspector() {
  const shot = state.bundle?.shots?.find(s => s.id === state.inspector.targetShotId);
  const scroll = $('#inspectorScroll');
  if (!shot) { if (state.inspector.open) closeInspector(); return; }
  if (!scroll) return;

  const latestVersion = shot.versions?.[0] || null;
  const latestSnapshot = versionSnapshot(latestVersion);
  const inspectorChanges = latestVersion ? reviewChanges(shot, latestSnapshot).filter(item => item.changed) : [];
  const previewBefore = reviewFieldValue(latestSnapshot, latestSnapshot.description ? 'description' : 'title');
  const previewAfter = reviewFieldValue(shot, shot.description ? 'description' : 'title');

  if ($('#inspShotNumber')) $('#inspShotNumber').textContent = `SHOT ${shot.number}`;
  if ($('#inspMethodBadge')) $('#inspMethodBadge').textContent = shot.primary_method || 'LIVE';

  scroll.innerHTML = `
    <!-- Section 1: 时间 -->
    <section class="inspector-section">
      <div class="inspector-section-title">时间</div>
      <div class="property-row" data-field="tc_in">
        <span class="property-label">TC IN</span>
        <span class="property-value tnum">${shot.tc_in || '00:00:00:00'}</span>
      </div>
      <div class="property-row" data-field="tc_out">
        <span class="property-label">TC OUT</span>
        <span class="property-value tnum">${shot.tc_out || '00:00:00:00'}</span>
      </div>
      <div class="property-row" data-field="duration_seconds">
        <span class="property-label">时长</span>
        <span class="property-value tnum">${shot.duration_seconds || 3}s (${shot.duration_frames || 75}f)</span>
      </div>
      <div class="property-row toggle-row" data-field="locked" role="button" tabindex="0">
        <span class="property-label">锁定时长</span>
        <span class="property-value">${shot.locked ? '已锁定' : '未锁定'}</span>
      </div>
    </section>

    <!-- Section 2: 制作与状态 -->
    <section class="inspector-section">
      <div class="inspector-section-title">制作</div>
      <div class="property-row method-property-row" data-field="methods">
        <span class="property-label">制作方式</span>
        <span class="property-value method-summary">${escapeHtml(methodValues(shot).map(methodLabel).join(' · '))}</span>
      </div>
      <div class="property-row" data-field="status">
        <span class="property-label">审核状态</span>
        <span class="property-value">${STATUS_LABELS[shot.status] || shot.status || '草稿'}</span>
      </div>
    </section>

    <section class="inspector-section pro-only">
      <div class="inspector-section-title">制作管线</div>
      <div class="property-row" data-field="department">
        <span class="property-label">责任部门</span>
        <span class="property-value">${escapeHtml(shot.department || 'Camera')}</span>
      </div>
      <div class="property-row" data-field="owner">
        <span class="property-label">负责人</span>
        <span class="property-value">${escapeHtml(shot.owner || '—')}</span>
      </div>
      <div class="production-steps-heading"><span>制作步骤</span><button class="btn btn-ghost" data-action="add-step" data-shot-id="${shot.id}">+ 添加</button></div>
      <div class="inspector-steps">${(shot.steps || []).map((step, index) => `<div class="inspector-step editable-step" draggable="true" data-step-id="${escapeHtml(step.id)}"><span class="step-handle" title="拖动排序">⋮⋮</span><b class="step-name">${String(index + 1).padStart(2, '0')} · ${escapeHtml(step.name || '未命名步骤')}</b><button class="step-status" data-step-status="${escapeHtml(step.id)}">${escapeHtml(step.status || '未开始')}</button><button class="btn-ghost-icon step-delete" data-action="delete-step" data-step-id="${escapeHtml(step.id)}" title="删除步骤">×</button><div class="step-fields"><button data-step-field="type" data-label="类型"><span>类型</span><b>${escapeHtml(stepTypeLabel(step.type))}</b></button><button data-step-field="department" data-label="责任部门"><span>部门</span><b>${escapeHtml(stepDepartmentLabel(step.department))}</b></button><button data-step-field="owner" data-label="负责人"><span>负责人</span><b>${escapeHtml(step.owner || '—')}</b></button><button data-step-field="input_asset" data-label="输入素材"><span>输入</span><b>${escapeHtml(step.input_asset || '—')}</b></button><button data-step-field="output_asset" data-label="输出素材"><span>输出</span><b>${escapeHtml(step.output_asset || '—')}</b></button><button data-step-field="notes" data-label="步骤备注"><span>备注</span><b>${escapeHtml(step.notes || '—')}</b></button></div></div>`).join('') || '<div class="config-empty">暂无制作步骤</div>'}</div>
    </section>

    ${customTableFields().filter(field => !isColumnArchived(`custom:${field.key}`) && !isColumnPurged(`custom:${field.key}`)).length ? `<section class="inspector-section pro-only"><div class="inspector-section-title">自定义字段</div>${customTableFields().filter(field => !isColumnArchived(`custom:${field.key}`) && !isColumnPurged(`custom:${field.key}`)).map(field => `<div class="property-row" data-field="custom:${escapeHtml(field.key)}"><span class="property-label">${escapeHtml(field.label)}</span><span class="property-value">${escapeHtml(String(shot.custom_fields?.[field.key] ?? '—'))}</span></div>`).join('')}</section>` : ''}

    ${Object.entries(shot.import_columns || {}).filter(([label]) => !isColumnArchived(`import:${label}`) && !isColumnPurged(`import:${label}`)).length ? `<section class="inspector-section"><div class="inspector-section-title">导入原始列（${Object.entries(shot.import_columns || {}).filter(([label]) => !isColumnArchived(`import:${label}`) && !isColumnPurged(`import:${label}`)).length}）</div>${Object.entries(shot.import_columns || {}).filter(([label]) => !isColumnArchived(`import:${label}`) && !isColumnPurged(`import:${label}`)).map(([label, value]) => `<div class="property-row imported-property" data-field="import:${escapeHtml(label)}" tabindex="0" title="双击修改"><span class="property-label">${escapeHtml(label)}</span><span class="property-value">${escapeHtml(String(value || '—'))}</span></div>`).join('')}</section>` : ''}

    <!-- Section 3: 摄影核心 (两种模式均完整呈现) -->
    <section class="inspector-section">
      <div class="inspector-section-title">摄影</div>
      <div class="property-row" data-field="shot_size">
        <span class="property-label">景别</span>
        <span class="property-value">${escapeHtml(shot.shot_size || '全景')}</span>
      </div>
      <div class="property-row" data-field="lens">
        <span class="property-label">焦段</span>
        <span class="property-value">${escapeHtml(shot.lens || '35mm')}</span>
      </div>
      <div class="property-row" data-field="movement">
        <span class="property-label">运镜</span>
        <span class="property-value">${escapeHtml(shot.movement || '固定')}</span>
      </div>
      <div class="property-row" data-field="angle">
        <span class="property-label">机位角度</span>
        <span class="property-value">${escapeHtml(shot.angle || '平视')}</span>
      </div>
      <div class="property-row" data-field="height">
        <span class="property-label">机位高度</span>
        <span class="property-value">${escapeHtml(shot.height || '—')}</span>
      </div>
      <div class="property-row" data-field="equipment">
        <span class="property-label">摄影机</span>
        <span class="property-value">${escapeHtml(shot.equipment || '—')}</span>
      </div>
      <div class="property-row" data-field="sensor">
        <span class="property-label">传感器</span>
        <span class="property-value">${escapeHtml(shot.sensor || '—')}</span>
      </div>
      <div class="property-row" data-field="aperture">
        <span class="property-label">光圈</span>
        <span class="property-value">${escapeHtml(shot.aperture || '—')}</span>
      </div>
      <div class="property-row" data-field="shutter">
        <span class="property-label">快门</span>
        <span class="property-value">${escapeHtml(shot.shutter || '—')}</span>
      </div>
    </section>

    <!-- Section 4: 画面与旁白 -->
    <section class="inspector-section">
      <div class="inspector-section-title">画面与旁白</div>
      <div class="inspector-text-block">
        <div class="inspector-text-block-label">画面描述</div>
        <div class="inspector-text-block-value" data-field="description">${escapeHtml(shot.description || '点击输入画面描述...')}</div>
      </div>
      <div class="inspector-text-block">
        <div class="inspector-text-block-label">对应旁白</div>
        <div class="inspector-text-block-value" data-field="voiceover">${escapeHtml(shot.voiceover || '点击输入解说词旁白...')}</div>
      </div>
    </section>

    <!-- Section 5: 分镜管理 -->
    <section class="inspector-section">
      <button class="btn btn-ghost inspector-upload-action" data-action="upload-shot" data-shot-id="${shot.id}">
        <svg class="g-icon"><use href="#icon-cloud_upload"></use></svg> 上传 / 替换分镜画面 →
      </button>
    </section>

    <section class="inspector-section">
      <div class="inspector-section-title panel-section-heading"><span>分镜画面</span><span class="panel-count">${(shot.panels || []).length}</span></div>
      <div class="panel-list">${(shot.panels || []).map((panel, index) => {
        const panelMedia = panel.media_id ? getMediaUrl(panel.media_id) : '';
        return `<div class="panel-row" draggable="true" data-panel-id="${escapeHtml(panel.id)}"><span class="panel-drag-handle" title="拖动排序">⋮⋮</span><div class="panel-thumb">${panelMedia ? `<img src="${escapeHtml(panelMedia)}" loading="lazy" decoding="async" alt="分镜画面 ${index + 1}">` : '<span>16:9</span>'}</div><div class="panel-main"><b>${escapeHtml(panel.label || String.fromCharCode(65 + index))}</b><span>${panelMedia ? '已有画面' : '待上传'}</span></div><div class="panel-actions"><button class="btn-ghost-icon" data-action="upload-shot" data-shot-id="${shot.id}" title="上传 / 替换">↑</button><button class="btn-ghost-icon" data-action="delete-panel" data-panel-id="${escapeHtml(panel.id)}" title="删除分镜画面">×</button></div></div>`;
      }).join('') || '<div class="config-empty">暂无分镜画面</div>'}</div>
      <button class="btn btn-ghost" data-action="add-panel" data-shot-id="${shot.id}">+ 添加分镜画面</button>
    </section>

    <!-- Section 6: 评论与版本 -->
    <section class="inspector-section inspector-review-section">
      <div class="inspector-section-title inspector-review-heading"><span>版本、评论与审阅</span><button type="button" class="inspector-link" data-inspector-action="review">完整审阅 →</button></div>
      ${latestVersion ? `
        <button type="button" class="inspector-version-compare" data-inspector-action="previous" aria-label="对比 ${escapeHtml(latestVersion.version_num || '上一版本')} 与当前稿">
          <span class="inspector-version-side is-before"><small>BEFORE · ${escapeHtml(latestVersion.version_num || '快照')}</small><b>${escapeHtml(previewBefore)}</b></span>
          <span class="inspector-version-arrow" aria-hidden="true">→</span>
          <span class="inspector-version-side is-after"><small>AFTER · 当前</small><b>${escapeHtml(previewAfter)}</b></span>
          <span class="inspector-version-count">${inspectorChanges.length ? `${inspectorChanges.length} 项变化` : '无变化'}</span>
        </button>
      ` : `
        <button type="button" class="inspector-version-empty" data-inspector-action="versions">
          <span>暂无历史快照</span><small>进入版本页创建当前稿快照，后续即可 Before / After 对比。</small>
        </button>
      `}
      <div class="inspector-comment-head"><span>悬浮评论</span><button type="button" class="inspector-link" data-inspector-action="comments">${(shot.comments || []).length} 条 · 查看全部</button></div>
      ${renderHoverComments(shot.comments || [], { compact: true })}
      <div class="inspector-modified">最近修改：${escapeHtml(shot.updated_at || '—')} · 修改人以审计记录为准</div>
    </section>
  `;

  const beginInspectorInlineEdit = (host, currentValue, { multiline = false, numeric = false, field = null, onCommit } = {}) => {
    if (!host || host.querySelector('.property-inline-editor')) return;
    const original = String(currentValue ?? '');
    const editor = document.createElement(multiline ? 'textarea' : 'input');
    editor.className = 'property-inline-editor';
    if (numeric && editor instanceof HTMLInputElement) {
      editor.type = 'number';
      editor.min = '0';
      editor.step = '0.01';
    }
    editor.value = original;
    host.classList.add('is-inline-editing');
    host.replaceChildren(editor);
    if (editor instanceof HTMLTextAreaElement) {
      const autoGrow = () => { editor.style.height = 'auto'; editor.style.height = `${editor.scrollHeight}px`; };
      editor.addEventListener('input', autoGrow);
      requestAnimationFrame(autoGrow);
    }
    editor.focus();
    if (!numeric && editor.setSelectionRange) editor.setSelectionRange(editor.value.length, editor.value.length);

    const reservation = field && shot?.id ? createSoftReservationSession(shot.id, field) : null;
    const editorId = nextEditorSessionId('inspector');
    let resolveDone;
    const done = new Promise(resolve => { resolveDone = resolve; });

    let finished = false;
    const session = {
      id: editorId,
      type: 'inspector',
      projectId: state.bundle?.project?.id,
      shotId: shot?.id,
      field,
      composing: false,
      commitInFlight: false,
      closed: false,
      isDirty() {
        if (session.closed) return false;
        return editor.value.trim() !== original.trim();
      },
      async waitForCompositionEnd() {
        if (!session.composing) return;
        await waitUntil(() => !session.composing, { timeout: 5000, errorMessage: '等待输入法完成超时' });
      },
      async commit() {
        if (session.closed || session.commitInFlight) return done;
        session.commitInFlight = true;
        try {
          await session.waitForCompositionEnd();
          finish(true);
          return done;
        } finally {
          session.commitInFlight = false;
        }
      },
      done
    };
    registerActiveEditor(session);

    const onTyping = () => {
      if (field && shot?.id && !numeric) {
        scheduleEditorDraft({
          projectId: state.bundle?.project?.id,
          shotId: shot.id,
          field,
          text: editor.value,
          baseRevision: shot.base_revision || shot.revision
        });
        refreshSaveStatus();
      }
    };

    editor.addEventListener('input', onTyping);
    editor.addEventListener('compositionstart', () => { session.composing = true; });
    editor.addEventListener('compositionend', () => {
      session.composing = false;
      onTyping();
    });

    const finish = save => {
      if (finished) return;
      finished = true;
      session.closed = true;
      unregisterActiveEditor(session);
      reservation?.release();
      resolveDone?.();
      const next = editor.value.trim();
      if (save && next !== original.trim()) {
        onCommit?.(next);
      }
      refreshSaveStatus();
      renderInspector();
    };
    editor.addEventListener('click', event => event.stopPropagation());
    editor.addEventListener('pointerdown', event => event.stopPropagation());
    editor.addEventListener('blur', () => finish(true), { once: true });
    editor.addEventListener('keydown', event => {
      event.stopPropagation();
      if (event.key === 'Escape') {
        event.preventDefault();
        // User explicitly cancelled — clear any pending draft for this field
        if (field && shot?.id && state.bundle?.project?.id) {
          clearEditorDraft(state.bundle.project.id, shot.id, field);
        }
        finish(false);
      }
      if (event.key === 'Enter' && (!multiline || event.ctrlKey || event.metaKey)) { event.preventDefault(); finish(true); }
    });
  };

  scroll.insertAdjacentHTML('afterbegin', `<section class="inspector-section"><div class="inspector-section-title">剧本</div>${Object.entries(SCRIPT_COLUMNS).filter(([field])=>!isColumnArchived(field) && !isColumnPurged(field)).map(([field,label])=>`<div class="property-row" data-field="${field}"><span class="property-label">${label}</span><span class="property-value">${formattedShotField(shot,field)}</span></div>`).join('')}</section>`);
  $$('.inspector-text-block-value[data-field]', scroll).forEach(block=>{block.innerHTML=formattedShotField(shot,block.dataset.field,'双击输入…');});
  // Every visible property supports deliberate double-click editing. A single
  // click remains available for text selection and panel navigation.
  $$('.property-row', scroll).forEach(row => {
    row.tabIndex = row.tabIndex >= 0 ? row.tabIndex : 0;
    row.title = row.title || '双击修改';
    const editProperty = event => {
      const field = row.dataset.field;
      if (!field) return;
      if (field === 'locked') {
        recordHistory();
        shot.locked = !shot.locked;
        markDirty();
        renderInspector();
        return;
      }
      if (field === 'methods') {
        openMethodsPopover(row, shot);
        return;
      }
      if (field === 'tc_in' || field === 'tc_out') return;
      if (RICH_TEXT_FIELDS.has(field)) { openRichShotEditor(shot, field, row.querySelector('.property-value'), { clientX: event?.clientX, clientY: event?.clientY, source: 'dblclick' }); return; }
      if (SHOT_FIELD_PRESETS[field]) {
        openShotPresetPopover(row, shot, field);
        return;
      }
      if (field.startsWith('import:')) {
        const key = field.slice(7);
        const currentVal = shot.import_columns?.[key] ?? '';
        beginInspectorInlineEdit(row.querySelector('.property-value'), currentVal, { multiline: true, field, onCommit: next => {
            recordHistory();
            shot.import_columns = { ...(shot.import_columns || {}), [key]: next };
            markDirty();
        }});
        return;
      }
      if (field?.startsWith('custom:')) {
        const key = field.slice(7);
        const currentVal = shot.custom_fields?.[key] ?? '';
        beginInspectorInlineEdit(row.querySelector('.property-value'), currentVal, { multiline: true, field, onCommit: next => {
            recordHistory();
            shot.custom_fields = { ...(shot.custom_fields || {}), [key]: next };
            markDirty();
        }});
        return;
      }
      if (['secondary_methods', 'production_steps'].includes(field)) return;
      const currentVal = shot[field] || '';
      const multiline = ['description', 'voiceover', 'action', 'performance', 'composition', 'director_notes', 'notes', 'dialogue', 'subtitle', 'music', 'sound'].includes(field);
      beginInspectorInlineEdit(row.querySelector('.property-value'), currentVal, { multiline, numeric: field === 'duration_seconds', field, onCommit: next => {
          recordHistory();
          if (field === 'duration_seconds') {
            const seconds = Math.max(0, Number.parseFloat(next) || 0);
            shot.duration_seconds = seconds;
            shot.duration_frames = Math.round(seconds * Math.max(1, Number(state.bundle?.project?.fps) || 25));
            syncDerivedTimeline();
            renderProjectHeader();
            renderCurrentView();
          } else {
            applyShotFieldMutation(shot, field, next, { source: 'inspector' });
          }
          markDirty();
          syncTableCell(shot.id, field, field === 'duration_seconds' ? shot.duration_seconds : next);
          if (field === 'shot_size') {
            syncTableCell(shot.id, 'lens', shot.lens);
            renderInspector();
          }
      }});
    };
    row.addEventListener('dblclick', event => { event.preventDefault(); editProperty(event); });
    row.addEventListener('keydown', event => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      editProperty(event);
    });
  });

  // Text block quick editing bindings — fully inline, no popup dialog
  $$('.inspector-text-block-value', scroll).forEach(block => {
    block.tabIndex = 0;
    block.title = '双击修改';
    const editTextBlock = event => {
      if (RICH_TEXT_FIELDS.has(block.dataset.field)) { openRichShotEditor(shot, block.dataset.field, block, { clientX: event?.clientX, clientY: event?.clientY, source: 'dblclick' }); return; }
      if (block.classList.contains('is-text-editing')) return;
      const field = block.dataset.field;
      const currentVal = shot[field] || '';
      block.classList.add('is-text-editing');

      const ta = document.createElement('textarea');
      ta.className = 'inspector-inline-editor';
      ta.value = currentVal;
      ta.rows = 4;
      ta.placeholder = field === 'description' ? '画面描述…' : '对应旁白…';

      const autoGrow = () => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; };
      ta.addEventListener('input', autoGrow);

      const hint = document.createElement('div');
      hint.className = 'inspector-inline-hint';
      hint.textContent = 'Ctrl + Enter 保存 · Esc 取消';

      block.textContent = '';
      block.appendChild(ta);
      block.appendChild(hint);
      requestAnimationFrame(autoGrow);
      ta.focus();
      ta.setSelectionRange(ta.value.length, ta.value.length);

      const reservation = shot?.id && field ? createSoftReservationSession(shot.id, field) : null;
      const editorId = nextEditorSessionId('inspector-text');
      let resolveDone;
      const done = new Promise(resolve => { resolveDone = resolve; });

      let saved = false;
      const session = {
        id: editorId,
        type: 'inspector-text',
        projectId: state.bundle?.project?.id,
        shotId: shot?.id,
        field,
        composing: false,
        commitInFlight: false,
        closed: false,
        isDirty() {
          if (session.closed) return false;
          return ta.value.trim() !== String(currentVal).trim();
        },
        async waitForCompositionEnd() {
          if (!session.composing) return;
          await waitUntil(() => !session.composing, { timeout: 5000, errorMessage: '等待输入法完成超时' });
        },
        async commit() {
          if (session.closed || session.commitInFlight) return done;
          session.commitInFlight = true;
          try {
            await session.waitForCompositionEnd();
            save();
            return done;
          } finally {
            session.commitInFlight = false;
          }
        },
        done
      };
      registerActiveEditor(session);

      const onTyping = () => {
        if (shot?.id && field) {
          scheduleEditorDraft({
            projectId: state.bundle?.project?.id,
            shotId: shot.id,
            field,
            text: ta.value,
            baseRevision: shot.base_revision || shot.revision
          });
          refreshSaveStatus();
        }
      };

      ta.addEventListener('input', onTyping);
      ta.addEventListener('compositionstart', () => { session.composing = true; });
      ta.addEventListener('compositionend', () => {
        session.composing = false;
        onTyping();
      });

      const closeSession = () => {
        session.closed = true;
        unregisterActiveEditor(session);
        reservation?.release();
        resolveDone?.();
        refreshSaveStatus();
      };

      const save = () => {
        if (saved) return;
        saved = true;
        const newVal = ta.value;
        closeSession();
        block.classList.remove('is-text-editing');
        if (newVal.trim() !== String(currentVal).trim()) {
          recordHistory();
          shot[field] = newVal.trim();
          markDirty();
          syncTableCell(shot.id, field, newVal.trim());
        }
        renderInspector();
      };
      const cancel = () => {
        if (saved) return;
        saved = true;
        closeSession();
        block.classList.remove('is-text-editing');
        renderInspector();
      };

      ta.addEventListener('blur', save);
      ta.addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); ta.blur(); }
        if (e.key === 'Escape') { e.preventDefault(); ta.removeEventListener('blur', save); cancel(); }
      });
    };
    block.addEventListener('dblclick', event => { event.preventDefault(); editTextBlock(); });
    block.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); editTextBlock(); } });
  });

  $$('.editable-step', scroll).forEach(row => {
    const step = (shot.steps || []).find(item => item.id === row.dataset.stepId);
    if (!step) return;
      row.querySelector('.step-name')?.addEventListener('dblclick', async event => {
        event.stopPropagation();
        beginInspectorInlineEdit(event.currentTarget, step.name || '', { onCommit: async value => {
          if (!value) return;
          try {
            recordHistory();
            const updated = await api(`/api/production-steps/${encodeURIComponent(step.id)}`, { method: 'PUT', json: { name: value } });
          Object.assign(step, updated);
          renderInspector();
          toast('步骤名称已保存');
        } catch (err) { toast(err.message, true); }
      }});
    });
    row.querySelector('.step-status')?.addEventListener('click', async event => {
      event.stopPropagation();
      const statuses = ['未开始', '进行中', '待审', '已完成', '阻塞'];
      const next = statuses[(statuses.indexOf(step.status) + 1) % statuses.length] || statuses[0];
      try {
        recordHistory();
        await api(`/api/production-steps/${encodeURIComponent(step.id)}`, { method: 'PUT', json: { status: next } });
        step.status = next;
        renderInspector();
        toast(`步骤状态：${next}`);
      } catch (err) { toast(err.message, true); }
    });
    $$('[data-step-field]', row).forEach(button => button.addEventListener('click', async event => {
      event.stopPropagation();
      const field = button.dataset.stepField;
      if (field === 'type' || field === 'department') {
        row.draggable = false;
        const options = field === 'type' ? STEP_TYPE_OPTIONS : STEP_DEPARTMENT_OPTIONS;
        const select = document.createElement('select');
        select.className = 'step-field-select';
        select.innerHTML = options.map(([value, label]) => `<option value="${escapeHtml(value)}" ${value === (step[field] || '') ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('');
        button.replaceChildren(select);
        select.focus();
        const finish = async save => {
          const value = select.value;
          row.draggable = true;
          if (save && value !== (step[field] || '')) {
            try {
              recordHistory();
              const updated = await api(`/api/production-steps/${encodeURIComponent(step.id)}`, { method: 'PUT', json: { [field]: value } });
              Object.assign(step, updated);
              toast(`${button.dataset.label}已保存`);
            } catch (err) { toast(err.message, true); }
          }
          renderInspector();
        };
        select.addEventListener('change', () => finish(true), { once: true });
        select.addEventListener('keydown', keyEvent => { if (keyEvent.key === 'Escape') finish(false); });
        select.addEventListener('blur', () => setTimeout(() => { if (select.isConnected) finish(true); }, 0), { once: true });
        return;
      }
      beginInspectorInlineEdit(button, step[field] || '', { multiline: ['notes', 'input_asset', 'output_asset'].includes(field), onCommit: async value => {
        try {
          recordHistory();
          const updated = await api(`/api/production-steps/${encodeURIComponent(step.id)}`, { method: 'PUT', json: { [field]: value } });
          Object.assign(step, updated);
          renderInspector();
          toast(`${button.dataset.label || '步骤'}已保存`);
        } catch (err) { toast(err.message, true); }
      }});
    }));
  });

  const wireInspectorReorder = (listSelector, itemSelector, idField, endpoint) => {
    const list = $(listSelector, scroll);
    if (!list) return;
    let dragged = null;
    list.addEventListener('dragstart', event => {
      const item = event.target.closest(itemSelector);
      if (!item) return;
      dragged = item;
      item.classList.add('is-dragging');
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', item.dataset[idField]);
    });
    list.addEventListener('dragend', () => { dragged?.classList.remove('is-dragging'); dragged = null; $$('.drop-before, .drop-after', list).forEach(item => item.classList.remove('drop-before', 'drop-after')); });
    list.addEventListener('dragover', event => {
      const target = event.target.closest(itemSelector);
      if (!target || target === dragged) return;
      event.preventDefault();
      $$('.drop-before, .drop-after', list).forEach(item => item.classList.remove('drop-before', 'drop-after'));
      const rect = target.getBoundingClientRect();
      target.classList.add(event.clientY < rect.top + rect.height / 2 ? 'drop-before' : 'drop-after');
    });
    list.addEventListener('drop', async event => {
      const target = event.target.closest(itemSelector);
      if (!target || !dragged || target === dragged) return;
      event.preventDefault();
      recordHistory();
      const before = event.clientY < target.getBoundingClientRect().top + target.getBoundingClientRect().height / 2;
      const items = [...list.querySelectorAll(itemSelector)];
      const from = items.indexOf(dragged);
      let to = items.indexOf(target);
      items.splice(from, 1);
      if (from < to) to -= 1;
      if (!before) to += 1;
      items.splice(to, 0, dragged);
      try {
        await Promise.all(items.map((item, index) => api(endpoint(item.dataset[idField]), { method: 'PUT', json: { [idField === 'panelId' ? 'position' : 'step_order']: index } })));
        const source = idField === 'panelId' ? shot.panels : shot.steps;
        const byId = new Map(source.map(item => [item.id, item]));
        source.splice(0, source.length, ...items.map(item => byId.get(item.dataset[idField])).filter(Boolean));
        renderInspector();
        toast('顺序已保存');
      } catch (err) { toast(`顺序保存失败：${err.message}`, true); }
    });
  };
  wireInspectorReorder('.panel-list', '.panel-row', 'panelId', id => `/api/panels/${encodeURIComponent(id)}`);
  wireInspectorReorder('.inspector-steps', '.editable-step', 'stepId', id => `/api/production-steps/${encodeURIComponent(id)}`);

  $$('[data-inspector-action]', scroll).forEach(link => {
    link.addEventListener('click', e => {
      e.stopPropagation();
      const action = link.dataset.inspectorAction;
      if (action === 'comments' || action === 'review') openShotReview(shot.id, 'comments');
      else if (action === 'previous') openShotReview(shot.id, 'compare', latestVersion?.id || '');
      else if (action === 'versions') openShotReview(shot.id, 'versions');
    });
  });

  $$('[data-open-comment]', scroll).forEach(pin => pin.addEventListener('click', event => {
    event.stopPropagation();
    openShotReview(shot.id, 'comments');
  }));
}

function syncTableCell(shotId, field, value) {
  const tr = $(`#mainShotTable tbody tr[data-id="${shotId}"]`);
  if (!tr) return;
  const cell = tr.querySelector(`.editable-cell[data-field="${field}"] .cell-display`);
  if (cell) {
    cell.textContent = field === 'duration_seconds' ? `${value}s` : (value || '—');
    cell.title = value;
  }
}

$('#inspCloseBtn')?.addEventListener('click', closeInspector);
$('#toggleInspectorBtn')?.addEventListener('click',()=>{
  const shot=state.bundle?.shots?.find(item=>item.id===state.selection.activeShotId)||state.bundle?.shots?.[0];
  if(!shot){toast('先添加一个镜头');return;}
  if(state.inspector.open && state.inspector.targetShotId===shot.id){closeInspector();return;}
  inspectShot(shot.id);
});

let previousViewportWidth = window.innerWidth;
window.addEventListener('resize', () => {
  const currentWidth = window.innerWidth;
  if (previousViewportWidth >= 768 && currentWidth < 768 && state.inspector.open) {
    $('#inspCloseBtn')?.click();
  }
  previousViewportWidth = currentWidth;
});

async function deleteShotById(deletedId) {
  if (!deletedId || !state.bundle) return;
  const wasInspected = state.inspector.open && state.inspector.targetShotId === deletedId;
  recordHistory();
  const before = { ...state.bundle, shots: cloneShots(state.bundle.shots) };
  const projectId = before.project.id;
  state.bundle = { ...before, shots: before.shots.filter(shot => shot.id !== deletedId) };
  const remainingShotIds = new Set(state.bundle.shots.map(shot => shot.id));
  state.selection.selectedShotIds = new Set([...state.selection.selectedShotIds].filter(id => remainingShotIds.has(id)));
  if (state.selection.selectedShotIds.size === 0 && state.bundle.shots[0]) state.selection.selectedShotIds.add(state.bundle.shots[0].id);
  state.selection.anchorShotId = state.bundle.shots[0]?.id || null;
  state.bundle.shots.forEach((shot, index) => { shot.position = index; shot.sort_index = index; shot.number = String(index + 1).padStart(3, '0'); });
  state.selection.activeShotId = state.bundle.shots[0]?.id || null;
  if (wasInspected) closeInspector();
  selectShot(state.selection.activeShotId);
  if (state.inspector.open) renderInspector();
  renderProjectHeader();
  renderCurrentView();
  setSaveStatus('↻ 删除同步中…', 'syncing');
  try {
    const deletedBundle = await api(`/api/projects/${projectId}/shots/bulk-delete`, { method: 'POST', json: { shot_ids: [deletedId] } });
    if (state.bundle?.project?.id !== projectId) return;
    state.bundle = adoptServerBundle(deletedBundle);
    state.selection.activeShotId = state.bundle.shots[0]?.id || null;
    state.selection.selectedShotIds = new Set(state.bundle.shots.slice(0, 1).map(shot => shot.id));
    state.selection.anchorShotId = state.selection.activeShotId;
    if (wasInspected) closeInspector();
    renderProjectHeader();
    renderCurrentView();
    if (state.selection.activeShotId) selectShot(state.selection.activeShotId);
    else $('#inspCloseBtn')?.click();
    if (state.inspector.open) renderInspector();
    setSaveStatus('● 已同步', '');
    toast('镜头已移入废纸篓');
  } catch (err) {
    if (state.bundle?.project?.id !== projectId) return;
    state.bundle = before;
    state.selection.activeShotId = deletedId;
    state.selection.selectedShotIds = new Set([deletedId]);
    state.selection.anchorShotId = deletedId;
    renderProjectHeader(); renderCurrentView(); selectShot(deletedId);
    if (wasInspected) inspectShot(deletedId);
    else if (state.inspector.open) renderInspector();
    setSaveStatus('! 删除同步失败', 'error');
    toast(`删除失败，已恢复：${err.message}`, true);
  }
}

$('#inspTrashBtn')?.addEventListener('click', async () => {
  const shot = state.bundle?.shots.find(item => item.id === state.inspector.targetShotId);
  if (!shot) return;
  if (!await confirmAction('移入镜头废纸篓', `将 SHOT ${shot.number || '—'} · ${shot.title || '未命名'} 移入废纸篓，可在 30 天内恢复。`)) return;
  await deleteShotById(shot.id);
});

// --------------------------------------------------------------------------
// 13. MEDIA UPLOAD (DRAG & DROP / CLICK)
// --------------------------------------------------------------------------
let _uploadTargetShotId = null;
let _uploadTargetAssetId = null;
const _fileInput = document.createElement('input');
_fileInput.type = 'file';
_fileInput.accept = 'image/*,video/*';
_fileInput.style.display = 'none';
document.body.appendChild(_fileInput);

function triggerShotMediaUpload(shotId) {
  _uploadTargetShotId = shotId;
  const shot = state.bundle?.shots?.find(item => item.id === shotId);
  _uploadTargetAssetId = shot?.panels?.[0]?.media_id || null;
  _fileInput.click();
}

function canvasBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('媒体压缩失败')), type, quality);
  });
}

// Browser-side image compression.
//
// RULE:
// - Compression may reduce resolution / change codec.
// - Compression MUST NOT change image geometry.
// - The fixed 16:9 storyboard crop belongs to the DISPLAY layer only.
//
// Keep stored proxies at the source aspect ratio. A previous implementation
// rendered images into a fixed-ratio canvas, mixing storage with presentation.
const MAX_CLIENT_IMAGE_BYTES = 80 * 1024 * 1024;
const MAX_CLIENT_IMAGE_EDGE = 2048;
const MAX_UNCOMPRESSED_FALLBACK_BYTES = 80 * 1024 * 1024;
const IMAGE_ASPECT_TOLERANCE = 0.005; // 0.5%

async function decodeImageBitmap(file, label = '图片') {
  try {
    return await createImageBitmap(file);
  } catch (error) {
    throw new Error(`${label}解码失败，请换用 JPG、PNG 或 WebP 后重试`, { cause: error });
  }
}

async function imageGeometry(file) {
  const bitmap = await decodeImageBitmap(file);
  try {
    return {
      width: bitmap.width,
      height: bitmap.height,
      aspect: bitmap.width / Math.max(1, bitmap.height)
    };
  } finally {
    bitmap.close();
  }
}

async function compressImage(file) {
  if (file.size > MAX_CLIENT_IMAGE_BYTES) {
    throw new Error('图片超过 80MB，请先压缩后再上传');
  }

  const bitmap = await decodeImageBitmap(file);
  try {
    const sourceWidth = Math.max(1, bitmap.width);
    const sourceHeight = Math.max(1, bitmap.height);
    const scale = Math.min(1, MAX_CLIENT_IMAGE_EDGE / Math.max(sourceWidth, sourceHeight));
    const outputWidth = Math.max(1, Math.round(sourceWidth * scale));
    const outputHeight = Math.max(1, Math.round(sourceHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = outputWidth;
    canvas.height = outputHeight;

    const context = canvas.getContext('2d', { alpha: true, willReadFrequently: false });
    if (!context) throw new Error('当前浏览器无法创建图片画布');

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.clearRect(0, 0, outputWidth, outputHeight);
    context.drawImage(bitmap, 0, 0, outputWidth, outputHeight);

    const blob = await canvasBlob(canvas, 'image/webp', 0.88);
    const proxy = new File(
      [blob],
      `${file.name.replace(/\.[^.]+$/, '')}.webp`,
      { type: 'image/webp' }
    );

    console.debug?.('[FrameForge media] compressed image', {
      source: `${sourceWidth}x${sourceHeight}`,
      proxy: `${outputWidth}x${outputHeight}`,
      sourceAspect: sourceWidth / sourceHeight,
      proxyAspect: outputWidth / outputHeight
    });

    return proxy;
  } finally {
    bitmap.close();
  }
}

async function verifyCompressedImageGeometry(sourceFile, proxyFile) {
  const [source, proxy] = await Promise.all([
    imageGeometry(sourceFile),
    imageGeometry(proxyFile)
  ]);

  const relativeDrift =
    Math.abs(proxy.aspect - source.aspect) /
    Math.max(source.aspect, Number.EPSILON);

  if (relativeDrift > IMAGE_ASPECT_TOLERANCE) {
    throw new Error(
      `图片压缩比例异常：原图 ${source.width}×${source.height}，压缩后 ${proxy.width}×${proxy.height}`
    );
  }

  return { source, proxy, relativeDrift };
}

async function compressVideo(file) {
  if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) return file;
  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.src = url;
  video.muted = true;
  video.playsInline = true;
  await new Promise((resolve, reject) => {
    video.onloadedmetadata = resolve;
    video.onerror = () => reject(new Error('视频无法读取'));
  });
  const scale = Math.min(1, 1920 / video.videoWidth, 1080 / video.videoHeight);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(2, Math.round(video.videoWidth * scale));
  canvas.height = Math.max(2, Math.round(video.videoHeight * scale));
  const ctx = canvas.getContext('2d');
  const stream = canvas.captureStream(30);
  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 5_000_000 });
  const chunks = [];
  recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
  const finished = new Promise(resolve => { recorder.onstop = resolve; });
  const draw = () => {
    if (video.ended) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    requestAnimationFrame(draw);
  };
  recorder.start(250);
  await video.play();
  draw();
  await new Promise(resolve => { video.onended = resolve; });
  recorder.stop();
  await finished;
  stream.getTracks().forEach(track => track.stop());
  URL.revokeObjectURL(url);
  return new File([new Blob(chunks, { type: 'video/webm' })], `${file.name.replace(/\.[^.]+$/, '')}.webm`, { type: 'video/webm' });
}

_fileInput.addEventListener('change', async e => {
  const file = e.target.files?.[0];
  if (!file || !_uploadTargetShotId) return;
  const projectId = state.bundle?.project?.id;
  if (!projectId) return;
  const targetShotId = _uploadTargetShotId;
  const targetAssetId = _uploadTargetAssetId;
  // Finish older saves before installing a temporary panel. Otherwise their
  // response can replace the preview or reset the just-uploaded baseline.
  if (!await flushProjectBeforeLeaving()) { _fileInput.value = ''; return; }
  if (state.bundle?.project?.id !== projectId || state.pendingUploads > 0) { _fileInput.value = ''; return; }
  const localShot = state.bundle?.shots?.find(item => item.id === targetShotId);
  const uploadHistory = localShot ? recordHistory() : null;
  const previousPanel = localShot?.panels?.[0] ? { ...localShot.panels[0] } : null;
  const temporaryMediaId = `local-upload-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const previewUrl = URL.createObjectURL(file);
  state.mediaCache.set(temporaryMediaId, previewUrl);
  const uploadPresenceSession = {
    id: nextEditorSessionId('media-upload'),
    projectId,
    shotId: targetShotId,
    field: 'thumb',
    isDirty: true,
    closed: false,
    commit: async () => true
  };
  if (localShot) {
    localShot.panels = localShot.panels || [];
    localShot.panels[0] = { ...(localShot.panels[0] || {}), media_id: temporaryMediaId };
    localShot._mediaUploadState = 'syncing';
    renderCurrentView();
  }
  state.pendingUploads += 1;
  registerActiveEditor(uploadPresenceSession);
  try {
    toast('本地预览已显示，正在后台压缩并同步…');
    let compressed = file;
    try {
      if (file.type.startsWith('image/')) {
        compressed = await compressImage(file);
        await verifyCompressedImageGeometry(file, compressed);
      } else {
        compressed = await compressVideo(file);
      }
    } catch (compressionError) {
      // Correct geometry is more important than proxy size. If compression
      // fails or changes aspect ratio, upload the original bytes instead.
      if (file.type.startsWith('image/') && file.size <= MAX_UNCOMPRESSED_FALLBACK_BYTES) {
        compressed = file;
        console.warn?.('[FrameForge media] proxy rejected; uploading original', compressionError);
        toast('图片压缩未通过比例校验，已自动改为原图上传');
      } else {
        throw compressionError;
      }
    }
    const query = new URLSearchParams({ shot_id: targetShotId, filename: compressed.name });
    if (targetAssetId) query.set('asset_id', targetAssetId);
    const media = await api(`/api/projects/${projectId}/media?${query}`, {
      method: 'POST',
      headers: { 'Content-Type': compressed.type || file.type || 'application/octet-stream' },
      body: compressed
    });
    // Browser cache is optional; a blocked IndexedDB must not keep upload
    // completion (or the undo gate) pending after a successful server write.
    cacheMediaBlob(media.id, compressed).catch(() => {});
    const savedPanel = media.panel || { media_id: media.id };
    resolveUploadHistory(temporaryMediaId, savedPanel);
    if (uploadHistory && !previousPanel && media.panel) {
      const historicalShot = uploadHistory.find(item => item.id === targetShotId);
      if (historicalShot) historicalShot.panels = [{ ...media.panel, media_id: null }];
    }
    // The upload may finish after the user has navigated to another project.
    // The server already attached it to projectId; never paint that result
    // onto the newly opened project's local bundle.
    if (state.bundle?.project?.id !== projectId) return;
    const shot = state.bundle.shots.find(s => s.id === targetShotId);
    if (shot) {
      shot.panels = shot.panels || [];
      shot.panels[0] = { ...(shot.panels[0] || {}), ...savedPanel };
      if (shot._syncBaseline) {
        const panels = structuredClone(shot._syncBaseline.panels || []);
        panels[0] = structuredClone(shot.panels[0]);
        shot._syncBaseline.panels = panels;
      }
      delete shot._mediaUploadState;
      renderCurrentView();
      toast('分镜图片已同步');
    }
  } catch (err) {
    resolveUploadHistory(temporaryMediaId, previousPanel);
    state.undoStack = state.undoStack.filter(entry => entry !== uploadHistory);
    if (state.bundle?.project?.id !== projectId) return;
    const shot = state.bundle?.shots?.find(item => item.id === targetShotId);
    if (shot) {
      if (previousPanel) shot.panels[0] = previousPanel;
      else shot.panels = (shot.panels || []).slice(1);
      shot._mediaUploadState = 'failed';
      renderCurrentView();
    }
    toast(err.message, true);
  } finally {
    uploadPresenceSession.closed = true;
    unregisterActiveEditor(uploadPresenceSession);
    const stalePreview = state.mediaCache.get(temporaryMediaId);
    if (stalePreview?.startsWith('blob:')) URL.revokeObjectURL(stalePreview);
    state.mediaCache.delete(temporaryMediaId);
    state.pendingUploads = Math.max(0, state.pendingUploads - 1);
    if (!state.pendingUploads && state.dirty) scheduleAutoSave(0);
    _fileInput.value = '';
    _uploadTargetShotId = null;
    _uploadTargetAssetId = null;
  }
});

// --------------------------------------------------------------------------
// 14. SAVE STATE & ACTIONS
// --------------------------------------------------------------------------
function cloneShots(shots) {
  return JSON.parse(JSON.stringify(shots || []));
}

function resolveUploadHistory(temporaryId, replacement) {
  for (const entry of [...state.undoStack, ...state.redoStack]) {
    for (const snapshot of [entry, entry._after]) {
      for (const shot of snapshot || []) {
        if (!shot.panels) continue;
        shot.panels = shot.panels.flatMap(panel => panel.media_id !== temporaryId
          ? [panel] : replacement ? [{ ...panel, ...replacement }] : []);
      }
    }
  }
}

function recordHistory() {
  if (!state.bundle) return;
  const snapshot = cloneShots(state.bundle.shots);
  const projectId = state.bundle.project.id;
  state.undoStack.push(snapshot);
  if (state.undoStack.length > 50) state.undoStack.shift();
  state.redoStack = [];
  // Capture the local operation before an awaited server response can merge
  // somebody else's fields or newly created shots into this history entry.
  queueMicrotask(() => {
    if (!snapshot._after && state.bundle?.project?.id === projectId) {
      snapshot._after = cloneShots(state.bundle.shots);
    }
  });
  return snapshot;
}

function applyHistorySnapshot(snapshot) {
  if (!state.bundle || !snapshot?._after) return false;
  const currentShots = state.bundle.shots || [];
  const currentById = new Map(currentShots.map(shot => [shot.id, shot]));
  const beforeById = new Map(snapshot.map(shot => [shot.id, shot]));
  const afterById = new Map(snapshot._after.map(shot => [shot.id, shot]));
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const fields = [...COLLAB_SYNC_FIELDS.filter(field => field !== 'number'), 'custom_fields', 'panels', 'import_columns'];
  let changed = false;
  // A three-way inverse: only reverse values still equal to this operation's
  // own result. Divergent remote values (and unrelated local edits) survive.
  const inverse = (before, after, current) => {
    if (same(before, after)) return current;
    if (same(current, after)) { changed = true; return structuredClone(before); }
    const object = value => value && typeof value === 'object' && !Array.isArray(value);
    if (object(before) && object(after) && object(current)) {
      const result = structuredClone(current);
      for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
        const value = inverse(before[key], after[key], current[key]);
        if (value === undefined) delete result[key]; else result[key] = value;
      }
      return result;
    }
    return current;
  };
  for (const [id, before] of beforeById) {
    const after = afterById.get(id);
    const current = currentById.get(id);
    if (after && current) {
      for (const field of fields) current[field] = inverse(before[field], after[field], current[field]);
    } else if (!after && !current) {
      // Restore only an explicitly observed local removal, never all IDs
      // missing from an old snapshot. The save patches only is_deleted.
      const restored = structuredClone(before);
      restored._syncBaseline = { ...(restored._syncBaseline || {}), is_deleted: true };
      restored.is_deleted = false;
      state.historyDeletedShots.delete(id);
      currentShots.push(restored);
      changed = true;
    }
  }
  for (const [id, after] of afterById) {
    const current = currentById.get(id);
    if (!beforeById.has(id) && current && fields.every(field => same(current[field], after[field]))) {
      state.historyDeletedShots.set(id, structuredClone(current));
      currentShots.splice(currentShots.indexOf(current), 1);
      changed = true;
    }
  }
  const beforeOrder = snapshot.map(shot => shot.id);
  const afterOrder = snapshot._after.map(shot => shot.id);
  const currentOrder = currentShots.map(shot => shot.id);
  if (same([...beforeOrder].sort(), [...afterOrder].sort()) && !same(beforeOrder, afterOrder) && same(currentOrder, afterOrder)) {
    state.historyOrder = { projectId: state.bundle.project.id, baseOrder: currentOrder, shotIds: beforeOrder };
    currentShots.sort((a, b) => beforeOrder.indexOf(a.id) - beforeOrder.indexOf(b.id));
    changed = true;
  }
  if (!changed) return false;
  if (!state.bundle.shots.some(shot => shot.id === state.selection.activeShotId)) {
    state.selection.activeShotId = state.bundle.shots[0]?.id || null;
  }
  markDirty();
  renderProjectHeader();
  renderCurrentView();
  if (state.selection.activeShotId) renderInspector();
  return true;
}

function undoLastChange(recovering = false) {
  if (state.pendingUploads > 0) { toast('图片正在上传，完成后即可撤销'); return false; }
  if (!state.bundle || !state.undoStack.length) {
    if (!recovering) toast('没有可撤销的更改');
    return false;
  }
  const current = cloneShots(state.bundle.shots);
  const previous = state.undoStack.pop();
  if (!applyHistorySnapshot(previous)) {
    toast('该历史操作已无可安全撤销的本地更改');
    return false;
  }
  current._after = cloneShots(state.bundle.shots);
  if (!recovering) state.redoStack.push(current);
  if (!recovering) toast('已撤销');
  return true;
}

function redoLastChange() {
  if (state.pendingUploads > 0) { toast('图片正在上传，完成后即可重做'); return; }
  if (!state.bundle || !state.redoStack.length) {
    toast('没有可重做的更改');
    return;
  }
  const current = cloneShots(state.bundle.shots);
  if (!applyHistorySnapshot(state.redoStack.pop())) { toast('该历史操作已无可安全重做的本地更改'); return; }
  current._after = cloneShots(state.bundle.shots);
  state.undoStack.push(current);
  toast('已重做');
}

const AUTO_SAVE_RETRY = [2000, 4000, 8000, 15000, 30000];

function autoSaveRetryDelay() {
  const index = Math.min(state.autoSaveRetryAttempt || 0, AUTO_SAVE_RETRY.length - 1);
  const base = AUTO_SAVE_RETRY[index];
  const jitter = 0.9 + Math.random() * 0.2;
  return Math.round(base * jitter);
}

function scheduleAutoSave(delay = 160) {
  if (!state.bundle?.project?.id || !state.dirty || state.saveConflict) return;
  if (hasDirtyActiveEditor()) {
    delay = Math.max(delay, 600);
  }
  clearTimeout(state.autoSaveTimer);
  state.autoSaveTimer = setTimeout(() => {
    state.autoSaveTimer = null;
    saveProject({ automatic: true });
  }, delay);
}

function markDirty() {
  syncDerivedTimeline();
  const history = state.undoStack.at(-1);
  if (history && !history._after) history._after = cloneShots(state.bundle.shots);
  state.dirty = true;
  state.changeVersion += 1;
  scheduleProjectDraft();
  refreshSaveStatus();
  scheduleAutoSave();
}

async function saveProject({ automatic = false, timeout = 18000 } = {}) {
  window.saveProject = saveProject;
  if (!state.bundle?.project?.id) return false;
  if (reviewStatusInFlight) { if (automatic) scheduleAutoSave(150); return false; }
  // A temporary media ID exists only in this browser. The upload finalizer
  // resumes pending edits after it has installed a durable ID or rolled back.
  if (state.pendingUploads > 0) return false;
  if (state.saveConflict?.projectId === state.bundle.project.id) {
    if (!automatic && !document.querySelector('dialog[data-save-conflict]')) showConflictDialog(state.saveConflict.error);
    return false;
  }
  if (shotReorderInFlight) { scheduleAutoSave(150); return false; }

  // 1. Watchdog check
  checkSyncWatchdog();

  // 2. Concurrency check
  if (state.saveInFlight) {
    state.saveQueued = true;
    console.debug?.('[save] queued because saveInFlight');
    return false;
  }

  // 3. Dirty check
  syncDerivedTimeline();
  if (!state.dirty) {
    if (hasDirtyActiveEditor()) {
      refreshSaveStatus();
      return false;
    }
    refreshSaveStatus();
    return true;
  }

  const projectId = state.bundle.project.id;
  const order = state.historyOrder;
  const hasReorder = order?.projectId === projectId;
  const columnsWerePending = columnPreferenceWrites.has(projectId);
  const columnsAtStart = state.bundle.column_preferences;

  // 4. Compute outbound changes BEFORE setting saveInFlight
  const outboundShots = structuredClone(prepareCollaborativeShots(state.bundle)).filter(
    shot => Array.isArray(shot.changed_fields) && shot.changed_fields.length > 0
  );

  // If dirty was set but no diff exists and no reorder / column changes are pending:
  if (!outboundShots.length && !hasReorder && !columnsWerePending) {
    state.dirty = false;
    state.saveQueued = false;
    state.lastSaveError = null;
    clearTimeout(state.autoSaveTimer);
    state.autoSaveTimer = null;
    console.debug?.('[save] dirty state normalized to clean; no outbound fields');
    refreshSaveStatus();
    return true;
  }

  // 5. Only now set saveInFlight and begin try/finally
  clearTimeout(state.autoSaveTimer);
  state.autoSaveTimer = null;
  state.saveInFlight = true;
  state.saveStartedAt = Date.now();
  state.lastSaveAttemptAt = Date.now();
  const currentToken = ++saveRequestToken;
  state.currentSaveToken = currentToken;
  if (state.saveAbortController) {
    try { state.saveAbortController.abort(new Error('Superseeded by new save')); } catch (_) {}
  }
  const saveAbortController = new AbortController();
  state.saveAbortController = saveAbortController;

  const versionAtStart = state.changeVersion;
  const sentById = new Map(outboundShots.map(shot => [shot.id, shot]));
  refreshSaveStatus();

  try {
    if (hasReorder) {
      try {
        await api(`/api/projects/${projectId}/shots/reorder`, {
          method: 'POST', json: { shot_ids: order.shotIds, base_order: order.baseOrder },
          timeout: 15000,
          signal: saveAbortController.signal
        });
      } catch (err) {
        if (state.bundle?.project?.id === projectId && state.historyOrder === order) {
          state.historyOrder = null;
          state.bundle.shots.sort((a, b) => order.baseOrder.indexOf(a.id) - order.baseOrder.indexOf(b.id));
        }
        throw err;
      }
      if (state.historyOrder === order) state.historyOrder = null;
    }
    const savedBundle = adoptServerBundle(await api(`/api/projects/${projectId}/shots`, {
      method: 'PUT',
      json: { shots: outboundShots, restore_order: false },
      timeout,
      signal: saveAbortController.signal
    }));
    if (state.currentSaveToken !== currentToken) {
      console.debug?.('[save] ignored response from stale save generation', { currentToken, activeToken: state.currentSaveToken });
      return false;
    }
    // A request can finish after the user has switched projects. Never let a
    // response for the previous project overwrite the newly opened bundle.
    if (state.bundle?.project?.id !== projectId) return true;
    if (columnsWerePending || columnPreferenceWrites.has(projectId) || state.bundle.column_preferences !== columnsAtStart) {
      savedBundle.column_preferences = structuredClone(columnPreferenceWrites.get(projectId)?.preferences || state.bundle.column_preferences || []);
    }
    if (savedBundle?.project?.updated_at) state.lastServerUpdatedAt = savedBundle.project.updated_at;
    state.lastSaveCompletedAt = Date.now();

    if (versionAtStart === state.changeVersion) {
      state.bundle = savedBundle;
      state.historyForceFields.clear();
      state.historyDeletedShots.clear();
      state.dirty = false;
      state.lastSaveError = null;
      state.autoSaveRetryAttempt = 0;
      clearAcknowledgedEditorDrafts(projectId, savedBundle);
      try { localStorage.removeItem(`frameforge-draft:${projectId}`); } catch (_) { /* ignore cache cleanup failure */ }
      refreshSaveStatus();
      if (!automatic) toast('项目已同步');
    } else {
      // Preserve edits made while the request was in flight, while advancing
      // their baselines to the successful server response. Values that still
      // equal the outbound snapshot were not edited during the request and
      // can safely adopt the server's (possibly merged) value.
      const savedById = new Map((savedBundle?.shots || []).map(shot => [shot.id, shot]));
      (state.bundle.shots || []).forEach(current => {
        const sent = sentById.get(current.id);
        const saved = savedById.get(current.id);
        if (!sent || !saved) return;
        COLLAB_SYNC_FIELDS.forEach(field => {
          if (JSON.stringify(current[field]) === JSON.stringify(sent[field])) current[field] = structuredClone(saved[field]);
        });
        if (JSON.stringify(current.custom_fields || {}) === JSON.stringify(sent.custom_fields || {})) current.custom_fields = structuredClone(saved.custom_fields || {});
        if (JSON.stringify(current.panels || []) === JSON.stringify(sent.panels || [])) current.panels = structuredClone(saved.panels || []);
        if (JSON.stringify(current.import_columns || {}) === JSON.stringify(sent.import_columns || {})) current.import_columns = structuredClone(saved.import_columns || {});
        current._syncBaseline = structuredClone(saved._syncBaseline || {});
      });
      state.dirty = true;
      state.saveQueued = true;
      state.lastSaveError = null;
      state.autoSaveRetryAttempt = 0;
      clearAcknowledgedEditorDrafts(projectId, savedBundle);
      refreshSaveStatus();
    }
    return true;
  } catch (err) {
    // Stale save generation: another save has superseded this one.
    // Do NOT corrupt state or show errors for an obsolete request.
    if (state.currentSaveToken !== currentToken) {
      console.debug?.('[save] ignored error from stale save generation', {
        currentToken,
        activeToken: state.currentSaveToken
      });
      return false;
    }
    if (state.bundle?.project?.id !== projectId) return false;
    state.dirty = true;
    state.lastSaveError = err;
    refreshSaveStatus();
    if (err.status === 409) {
      const conflict = err.conflictData || err.payload || {};
      if (conflict.your_version?.id) showConflictDialog(err);
    }
    toast(err.message, true);
    if (automatic && err.status !== 409) {
      const delay = autoSaveRetryDelay();
      state.autoSaveRetryAttempt = (state.autoSaveRetryAttempt || 0) + 1;
      scheduleAutoSave(delay);
    }
    return false;
  } finally {
    if (state.currentSaveToken === currentToken) {
      state.saveInFlight = false;
      state.saveStartedAt = null;
      state.saveAbortController = null;
      refreshSaveStatus();
    }
    if (state.currentSaveToken === currentToken && state.saveQueued) {
      state.saveQueued = false;
      scheduleAutoSave(60);
    }
  }
}
window.saveProject = saveProject;

async function saveCurrentProjectManually() {
  const flushed = await flushActiveEditors({ timeout: 5000 });
  if (!flushed) return false;
  checkSyncWatchdog();
  if (state.saveInFlight) {
    try {
      await waitUntil(
        () => !state.saveInFlight,
        { timeout: 22000, interval: 25, errorMessage: '等待当前同步完成超时' }
      );
    } catch (_) {
      toast('当前同步仍未完成，本地内容已保留', true);
      return false;
    }
  }
  return saveProject({ automatic: false });
}
window.saveCurrentProjectManually = saveCurrentProjectManually;

window.getCollabDiagnostics = () => ({
  saveInFlight: state.saveInFlight,
  saveQueued: state.saveQueued,
  saveStartedAt: state.saveStartedAt,
  lastSaveAttemptAt: state.lastSaveAttemptAt,
  lastSaveCompletedAt: state.lastSaveCompletedAt,
  dirty: state.dirty,
  changeVersion: state.changeVersion,
  presencePollInFlight: state.presencePollInFlight,
  presenceSendInFlight: state.presenceSendInFlight,
  remoteRefreshInFlight: state.remoteRefreshInFlight,
  lastSaveError: state.lastSaveError ? String(state.lastSaveError.message || state.lastSaveError) : null,
  networkHealth: state.networkHealth,
  activeEditors: activeEditorsForCurrentProject().length,
  hasDirtyActiveEditor: hasDirtyActiveEditor(),
  wakeRecoveryCount: state.wakeRecoveryCount || 0
});

let saveRefreshSequence = 0;

async function saveAndRefreshProject() {
  if (state.saveRefreshInFlight) return false;
  const projectId = state.bundle?.project?.id;
  if (!projectId) {
    toast('当前未打开任何项目', true);
    return false;
  }

  // Set saveRefreshInFlight BEFORE the first await to lock out concurrent clicks
  const sequence = ++saveRefreshSequence;
  state.saveRefreshInFlight = true;
  refreshSaveStatus();
  publishWorkspaceUI();

  try {
    // 1. Safety flush of any active editor session
    const flushed = await flushActiveEditors({ timeout: 5000 });
    if (!flushed) {
      toast('当前编辑仍在提交，已取消刷新', true);
      return false;
    }

    // 1b. Flush creative boards before save
    if (!await flushCreativeBoards()) {
      return false;
    }

    // 2. Snapshot current workspace context
    const activeShotId = state.selection.activeShotId;
    const windowScrollY = window.scrollY || document.documentElement.scrollTop;
    const tableContainer = document.querySelector('#mainShotTable')?.closest('.table-container');
    const tableScrollTop = tableContainer ? tableContainer.scrollTop : null;
    const tableScrollLeft = tableContainer ? tableContainer.scrollLeft : null;

    // 3. Wait for any in-flight background save or reorder (bounded)
    try {
      await waitUntil(
        () => {
          if (sequence !== saveRefreshSequence || state.bundle?.project?.id !== projectId) return true;
          return !state.saveInFlight && !shotReorderInFlight;
        },
        { timeout: 22000, interval: 25, errorMessage: '等待当前同步完成超时' }
      );
    } catch (_) {
      toast('等待同步完成超时，已停止刷新以防止丢失修改', true);
      return false;
    }
    if (sequence !== saveRefreshSequence || state.bundle?.project?.id !== projectId) {
      return false;
    }

    // 4. If dirty, save project first
    if (state.dirty) {
      const saved = await saveProject({ automatic: false });
      if (!saved || sequence !== saveRefreshSequence || state.bundle?.project?.id !== projectId) {
        toast('项目保存失败，已停止刷新以防止丢失修改', true);
        return false;
      }
    }

    // Block refresh whenever uploads are pending, save conflict exists, or dirty editors/data remain
    if (state.pendingUploads > 0) {
      toast('正在上传媒体文件，已停止刷新', true);
      return false;
    }
    if (state.saveConflict) {
      toast('存在冲突未处理，已停止刷新', true);
      return false;
    }
    if (hasDirtyActiveEditor() || state.dirty) {
      toast('检测到未保存内容，已停止刷新', true);
      return false;
    }

    // 5. Version guard before fetching latest
    const versionBeforeRefresh = state.changeVersion;

    const latest = await api(`/api/projects/${encodeURIComponent(projectId)}`);

    // 6. Stale / race checks after fetch
    if (sequence !== saveRefreshSequence) return false;
    if (state.bundle?.project?.id !== projectId) return false;
    if (state.changeVersion !== versionBeforeRefresh || state.dirty || hasDirtyActiveEditor()) {
      toast('检测到刷新期间产生新修改，跳过覆盖以保留本地修改', true);
      return false;
    }

    // 7. Adopt server bundle safely
    state.bundle = adoptServerBundle(latest);
    state.dirty = false;
    state.lastSaveError = null;
    state.autoSaveRetryAttempt = 0;
    clearAcknowledgedEditorDrafts(projectId, state.bundle);
    try { localStorage.removeItem(`frameforge-draft:${projectId}`); } catch (_) {}

    // 8. Re-render views
    renderProjectHeader();
    renderCurrentView();

    // 9. Restore selection and scroll positions
    if (activeShotId && state.bundle.shots.some(s => s.id === activeShotId)) {
      selectShot(activeShotId);
    }
    if (state.inspector.open) renderInspector();
    if (tableContainer && tableScrollTop !== null) {
      const newTableContainer = document.querySelector('#mainShotTable')?.closest('.table-container');
      if (newTableContainer) {
        newTableContainer.scrollTop = tableScrollTop;
        if (tableScrollLeft !== null) newTableContainer.scrollLeft = tableScrollLeft;
      }
    }
    window.scrollTo({ top: windowScrollY, behavior: 'instant' });

    toast('已安全保存并刷新到最新状态');
    return true;
  } catch (err) {
    if (sequence === saveRefreshSequence) {
      toast('刷新失败: ' + err.message, true);
    }
    return false;
  } finally {
    if (sequence === saveRefreshSequence) {
      state.saveRefreshInFlight = false;
      refreshSaveStatus();
      publishWorkspaceUI();
    }
  }
}
window.saveAndRefreshProject = saveAndRefreshProject;

$('#undoBtn')?.addEventListener('click', () => undoLastChange());
$('#redoBtn')?.addEventListener('click', () => redoLastChange());

// Add / insert shot actions. The server accepts an optional zero-based
// position and renumbers display numbers and timecodes atomically.
async function createShotAt(position = null, overrides = {}) {
  window.createShotAt = createShotAt;
  if (!state.bundle) return null;
  const num = String((position === null ? state.bundle.shots.length : position) + 1).padStart(3, '0');
  const newShot = {
    id: 'shot_' + Math.random().toString(36).slice(2, 9), number: num,
    title: `镜头 ${num}`, description: '', voiceover: '', duration_frames: 75,
    duration_seconds: 3.0, primary_method: 'LIVE', status: 'Draft',
    shot_size: '全景', lens: '35mm', movement: '固定', angle: '平视', ...overrides
  };
  recordHistory();
  try {
    const payload = position === null ? newShot : { ...newShot, position };
    const result = await api(`/api/projects/${state.bundle.project.id}/shots`, { method: 'POST', json: payload });
      state.bundle = adoptServerBundle(result);
    const createdId = result.created_shot_id || newShot.id;
    const created = state.bundle.shots.find(shot => shot.id === createdId)
      || (position === null ? state.bundle.shots.at(-1) : state.bundle.shots[Math.min(position, state.bundle.shots.length - 1)]);
    selectShot(created?.id || null);
    renderProjectHeader();
    renderCurrentView();
    toast(`已新增 SHOT ${created?.number || num}`);
    return created;
  } catch (err) {
    state.undoStack.pop();
    toast(`新增镜头失败：${err.message}`, true);
    return null;
  }
}

$('#addShotActionBtn')?.addEventListener('click', () => createShotAt());

function openInsertShotDialog(direction = 'before', shotId = state.selection.activeShotId) {
  if (!state.bundle) return;
  state.insertAnchorShotId = shotId || null;
  const form = $('#insertShotForm');
  if (form) {
    form.reset();
    form.elements.title.value = '新镜头';
    const selected = form.querySelector(`input[name="insertDirection"][value="${CSS.escape(direction)}"]`);
    if (selected) selected.checked = true;
  }
  $('#insertShotModal')?.showModal();
}

$('#insertShotActionBtn')?.addEventListener('click', () => openInsertShotDialog('before'));

$('#insertShotForm')?.addEventListener('submit', async event => {
  event.preventDefault();
  if (!state.bundle) return;
  const form = new FormData(event.currentTarget);
  const activeIndex = state.bundle.shots.findIndex(shot => shot.id === (state.insertAnchorShotId || state.selection.activeShotId));
  const direction = form.get('insertDirection') || 'before';
  const position = activeIndex < 0 ? state.bundle.shots.length : activeIndex + (direction === 'after' ? 1 : 0);
  const created = await createShotAt(position, { title: form.get('title'), description: form.get('description') });
  if (created) {
    state.insertAnchorShotId = null;
    $('#insertShotModal')?.close();
  }
});

function splitNarration(text) {
  return String(text || '').split(/(?<=[。！？；.!?;\n])/u).map(item => item.trim()).filter(Boolean);
}

const NARRATION_SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

function normalizeNarrationSpeed(speed) {
  const parsed = Number(speed);
  return NARRATION_SPEED_OPTIONS.includes(parsed) ? parsed : 1;
}

function syncNarrationSpeedControls() {
  const projectControl = $('#projectNarrationSpeed');
  if (projectControl) projectControl.value = String(normalizeNarrationSpeed(state.narrationSpeed));
}

function estimateNarrationFrames(text, fps, speed = 1) {
  const value = String(text || '').trim();
  if (!value) return Math.max(1, Math.round(fps * 1.2));
  const chinese = (value.match(/[\u3400-\u9fff]/g) || []).length;
  const words = (value.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g) || []).length;
  const punctuation = (value.match(/[，,、]/g) || []).length * 0.16 + (value.match(/[。！？.!?；;]/g) || []).length * 0.28;
  const speechSeconds = chinese / 4.4 + words / 2.8;
  const seconds = speechSeconds / normalizeNarrationSpeed(speed) + punctuation;
  return Math.max(Math.round(fps * 0.6), Math.round(seconds * fps));
}

function recalculateTimingSegments(segments, fps, speed) {
  const rate = normalizeNarrationSpeed(speed);
  for (const segment of segments || []) {
    if (segment.locked || segment.manuallyEdited) continue;
    segment.frames = estimateNarrationFrames(segment.text, fps, rate);
  }
  return segments;
}

function updateTimingWorkspaceSummary(root, draft, fps) {
  const total = draft.segments.reduce((sum, segment) => sum + Math.max(1, Number(segment.frames) || 1), 0);
  const totalNode = $('[data-timing-total]', root);
  const secondsNode = $('[data-timing-seconds]', root);
  if (totalNode) totalNode.textContent = `${total}f`;
  if (secondsNode) secondsNode.textContent = formatSeconds(total / Math.max(1, Number(fps) || 25));
}

function renderTimingWorkspace() {
  const root = $('#timingWorkspace');
  const draft = state.timingDraft;
  if (!root || !draft) return;
  const fps = state.bundle.project.fps;
  const total = draft.segments.reduce((sum, segment) => sum + Number(segment.frames || 0), 0);
  root.innerHTML = `
    <section class="timing-shot-summary">
      <div class="timing-shot-identity"><span>当前镜头</span><b>SHOT ${escapeHtml(draft.shot.number)}</b><small>${escapeHtml(draft.shot.title || '未命名镜头')}</small></div>
      <div class="timing-total-compare" aria-live="polite">
        <span><small>原时长</small><b>${draft.shot.duration_frames}f</b></span>
        <svg class="g-icon"><use href="#icon-chevron_right"></use></svg>
        <span class="is-suggested"><small>建议时长</small><b data-timing-total>${total}f</b><em data-timing-seconds>${formatSeconds(total / Math.max(1, Number(fps) || 25))}</em></span>
      </div>
    </section>
    <label class="timing-speed-control"><span>旁白语速</span><select data-timing-speed aria-label="旁白语速">${NARRATION_SPEED_OPTIONS.map(speed => `<option value="${speed}" ${normalizeNarrationSpeed(draft.speed) === speed ? 'selected' : ''}>${speed}×${speed === 1 ? ' · 标准' : ''}</option>`).join('')}</select><small>改变自动建议时长，已手动修改或锁定的片段保持不变</small></label>
    <div class="timing-segment-list">${draft.segments.map((segment, index) => `
      <article class="timing-segment-row">
        <span class="timing-index">${String(index + 1).padStart(2, '0')}</span>
        <div class="timing-segment-copy"><small>旁白片段 ${String(index + 1).padStart(2, '0')}</small><p>${escapeHtml(segment.text)}</p></div>
        <div class="timing-segment-controls">
          <label class="timing-frame-control"><span>帧数</span><span class="timing-number-shell"><input type="number" min="1" step="1" data-timing-frames="${index}" value="${segment.frames}" ${segment.locked ? 'disabled' : ''}><em>f</em></span></label>
          <label class="timing-lock"><input type="checkbox" data-timing-lock="${index}" ${segment.locked ? 'checked' : ''}><span class="timing-check"><svg class="g-icon"><use href="#icon-check"></use></svg></span><span>锁定</span></label>
          <button type="button" class="btn btn-ghost timing-recalc" data-timing-recalc="${index}" ${segment.locked ? 'disabled' : ''}><svg class="g-icon"><use href="#icon-timer"></use></svg>重算</button>
        </div>
      </article>`).join('')}</div>`;
  $$('[data-timing-frames]', root).forEach(input => input.addEventListener('input', event => {
    const segment = draft.segments[Number(event.target.dataset.timingFrames)];
    segment.frames = Math.max(1, Number(event.target.value) || 1);
    segment.manuallyEdited = true;
    updateTimingWorkspaceSummary(root, draft, fps);
  }));
  $('[data-timing-speed]', root)?.addEventListener('change', event => {
    draft.speed = normalizeNarrationSpeed(event.target.value);
    state.narrationSpeed = draft.speed;
    syncNarrationSpeedControls();
    recalculateTimingSegments(draft.segments, fps, draft.speed);
    renderTimingWorkspace();
  });
  $$('[data-timing-lock]', root).forEach(input => input.addEventListener('change', event => {
    draft.segments[Number(event.target.dataset.timingLock)].locked = event.target.checked;
    renderTimingWorkspace();
  }));
  $$('[data-timing-recalc]', root).forEach(button => button.addEventListener('click', () => {
    const index = Number(button.dataset.timingRecalc);
    draft.segments[index].frames = estimateNarrationFrames(draft.segments[index].text, fps, draft.speed);
    draft.segments[index].manuallyEdited = false;
    renderTimingWorkspace();
  }));
}

async function runProjectAutoTiming() {
  if (!state.bundle) { toast('请先打开一个项目', true); return; }
  const narratedCount = state.bundle.shots.filter(shot => !shot.locked && (String(shot.voiceover || '').trim() || String(shot.dialogue || '').trim())).length;
  if (!narratedCount) {
    toast('没有可自动计时的旁白镜头；无旁白镜头保持原时长');
    return;
  }
  const button = $('#autoTimingActionBtn');
  if (button) { button.disabled = true; button.classList.add('is-loading'); }
  try {
    // Persist edits made in the script view before the server calculates the
    // timing budget, otherwise it would calculate against stale narration.
    if (!await flushProjectBeforeLeaving()) return;
    const projectId = state.bundle.project.id;
    const speechRate = normalizeNarrationSpeed(state.narrationSpeed);
    const before = cloneShots(state.bundle.shots);
    const result = await api(`/api/projects/${projectId}/auto-timing`, { method: 'POST', json: { speech_rate: speechRate } });
    if (state.bundle?.project.id !== projectId) return;
    const previous = new Map(before.map(shot => [shot.id, shot]));
    const calculated = new Map(result.shots.map(shot => [shot.id, shot]));
    // History contains only this timing operation, not concurrent field edits.
    recordHistory();
    for (const shot of state.bundle.shots) {
      const old = previous.get(shot.id), next = calculated.get(shot.id);
      if (!old || !next) continue;
      if (shot.duration_frames === old.duration_frames) shot.duration_frames = next.duration_frames;
      if (shot._syncBaseline) shot._syncBaseline.duration_frames = next.duration_frames;
    }
    state.undoStack[state.undoStack.length - 1]._after = cloneShots(state.bundle.shots);
    markDirty();
    renderProjectHeader();
    renderCurrentView();
    renderInspector();
    toast(`已按 ${speechRate}×语速估算 ${narratedCount} 个旁白/对白镜头；无旁白镜头保持原时长`);
  } catch (err) {
    toast(`自动计时失败：${err.message}`, true);
  } finally {
    if (button) { button.disabled = false; button.classList.remove('is-loading'); }
  }
}

$('#autoTimingActionBtn')?.addEventListener('click', runProjectAutoTiming);

function openSingleShotTiming(shotId = state.selection.activeShotId) {
  const shot = state.bundle?.shots?.find(item => item.id === shotId) || state.bundle?.shots?.[0];
  if (!shot || !state.bundle) { toast('请先选择一个镜头', true); return; }
  const segments = splitNarration(shot.voiceover || shot.dialogue);
  if (!segments.length) { toast('当前镜头没有可计时的旁白或对白', true); return; }
  state.selection.activeShotId = shot.id;
  const speed = normalizeNarrationSpeed(state.narrationSpeed);
  state.timingDraft = { shot, speed, segments: segments.map(text => ({ text, frames: estimateNarrationFrames(text, state.bundle.project.fps, speed), locked: false, manuallyEdited: false })) };
  renderTimingWorkspace();
  $('#timingModal')?.showModal();
}

$('#autoTimingShotDetailBtn')?.addEventListener('click', () => openSingleShotTiming());

$('#applyTimingShotBtn')?.addEventListener('click', () => {
  const draft = state.timingDraft;
  if (!draft || !state.bundle) return;
  const shot = state.bundle.shots.find(item => item.id === draft.shot.id);
  if (!shot) return;
  recordHistory();
  shot.duration_frames = draft.segments.reduce((sum, segment) => sum + Math.max(1, Number(segment.frames) || 1), 0);
  markDirty();
  renderProjectHeader();
  renderCurrentView();
  renderInspector();
  $('#timingModal')?.close();
  toast('当前镜头逐句计时已应用');
});

// --------------------------------------------------------------------------
// 15. PDF EXPORT MODAL & GENERATOR
// --------------------------------------------------------------------------
const PDF_FIELD_FALLBACK = ['number', 'tc', 'duration', 'title', 'chapter', 'scene', 'panel_frame', 'shot_size', 'lens', 'movement', 'angle', 'description', 'voiceover', 'methods', 'status', 'department'];
const PDF_RECORD_FIELDS = [
  ...PDF_FIELD_FALLBACK,
  'action', 'performance', 'composition', 'director_notes', 'notes', 'locked',
  'handles_head_frames', 'handles_tail_frames', 'height', 'equipment', 'sensor',
  'aperture', 'shutter', 'camera_fps', 'dialogue', 'subtitle', 'music', 'sound',
  'primary_method', 'secondary_methods', 'owner', 'transition', 'approval_version',
  'revision', 'created_at', 'updated_at', 'method_data_json'
];
const PDF_FIELD_LABELS = {
  action: '动作', performance: '表演', composition: '构图', director_notes: '导演备注', notes: '备注',
  locked: '锁定', handles_head_frames: '前置帧', handles_tail_frames: '尾帧', height: '机位高度',
  equipment: '摄影设备', sensor: '传感器', aperture: '光圈', shutter: '快门', camera_fps: '摄影帧率',
  dialogue: '对白', subtitle: '字幕', music: '音乐', sound: '声音', primary_method: '主要制作方式',
  secondary_methods: '辅助制作方式', owner: '负责人', transition: '剪辑/转场', approval_version: '审批版本',
  revision: '修订号', created_at: '创建时间', updated_at: '更新时间', method_data_json: '制作方式参数'
};
function pdfFieldOptions() {
  const removed = archivedColumnSet();
  const custom = customTableFields().map(field => `custom:${field.key}`).filter(field => !removed.has(field) && !isColumnPurged(field));
  const imported = importedTableFields().map(key => `import:${key}`).filter(field => !removed.has(field) && !isColumnPurged(field));
  // Export is a presentation surface. Internal revision timestamps, sync
  // payloads and raw method JSON must never leak through “all fields”.
  const fields = [...new Set([...PDF_FIELD_FALLBACK, ...Object.keys(SCRIPT_COLUMNS), 'notes', 'action'].filter(field => !removed.has(field) && !isColumnPurged(field)).concat(custom, imported))];
  return fields;
}
function presentationFieldKey(field) {
  return field === 'thumb' ? null : field;
}
function visiblePresentationFields() {
  const allowed = new Set(pdfFieldOptions());
  const fields = currentColumnOrder()
    .filter(field => !isColumnHidden(field) && !['select', 'actions'].includes(field))
    .map(presentationFieldKey)
    .filter(field => field && allowed.has(field));
  return [...new Set(fields)];
}
function buildPresentationExportModel({ fields = null, shots = null } = {}) {
  const allowed = new Set(pdfFieldOptions());
  const selectedFields = fields == null
    ? visiblePresentationFields()
    : [...new Set(fields)].filter(field => allowed.has(field));
  return {
    project: state.bundle?.project || {},
    shots: shots || state.bundle?.shots || [],
    includeImages: !isColumnHidden('thumb') && !isColumnArchived('thumb') && !isColumnPurged('thumb'),
    fields: selectedFields
  };
}
function pdfFieldLabel(field) {
  if (PDF_FIELD_LABELS[field]) return PDF_FIELD_LABELS[field];
  if (field.startsWith('custom:')) return tableColumnLabel(field);
  if (field.startsWith('import:')) return `原始列 · ${field.slice(7)}`;
  return tableColumnLabel(field);
}
function pdfJsonValue(value) {
  if (value == null || value === '') return '';
  if (typeof value === 'object') {
    try { return JSON.stringify(value, null, 2); } catch (_) { return String(value); }
  }
  return String(value);
}
function pdfFieldValue(shot, field) {
  if (field.startsWith('custom:')) {
    const value = customFieldValue(shot, field.slice(7));
    return value === true ? '是' : value === false ? '否' : value;
  }
  if (field.startsWith('import:')) {
    let imported = shot?.import_columns || shot?.import_columns_json || {};
    if (typeof imported === 'string') { try { imported = JSON.parse(imported); } catch (_) { imported = {}; } }
    return imported?.[field.slice(7)] ?? '';
  }
  if (field === 'number') return shot.number || '';
  if (field === 'tc') return `${shot.tc_in || '00:00:00:00'} / ${shot.tc_out || '00:00:00:00'}`;
  if (field === 'duration') return `${shot.duration_seconds || ''}s / ${shot.duration_frames || ''}f`;
  if (field === 'methods') return methodValues(shot).map(methodLabel).join(' · ');
  if (field === 'primary_method') return methodLabel(shot.primary_method || '');
  if (field === 'secondary_methods') return (shot.secondary_methods || []).map(methodLabel).join(' · ');
  if (field === 'status') return STATUS_LABELS[shot.status] || shot.status || '草稿';
  if (field === 'locked') return shot.locked ? '是' : '否';
  return pdfJsonValue(shot?.[field]);
}
function renderPdfFieldOptions() {
  const grid = $('#pdfFieldsGrid');
  if (!grid) return;
  const previous = new Map([...grid.querySelectorAll('input[name="pdf_field"]')].map(input => [input.value, input.checked]));
  const firstRender = grid.dataset.initialized !== 'true';
  grid.innerHTML = pdfFieldOptions().map(field => {
    const tableField = field === 'tc' ? 'tc' : field === 'duration' ? 'duration' : field === 'methods' ? 'methods' : field;
    const followsTable = tableColumnFields().includes(tableField);
    const checked = firstRender
      ? (!followsTable || !isColumnHidden(tableField))
      : (previous.has(field) ? previous.get(field) && (!followsTable || !isColumnHidden(tableField)) : (!followsTable || !isColumnHidden(tableField)));
    return `<label class="pdf-field-check"><input type="checkbox" name="pdf_field" value="${escapeHtml(field)}" ${checked ? 'checked' : ''}><span>${escapeHtml(pdfFieldLabel(field))}</span></label>`;
  }).join('');
  grid.dataset.initialized = 'true';
}

function sanitizePdfData(value, key = '') {
  if (Array.isArray(value)) return value.map(item => sanitizePdfData(item));
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([name]) => !['snapshot', 'snapshot_json', 'stored_name', 'media_id'].includes(name))
    .map(([name, item]) => [name, sanitizePdfData(item, name)]));
}

function pdfShotAppendix(shot) {
  const payload = sanitizePdfData(shot);
  let text = '{}';
  try { text = JSON.stringify(payload, null, 2); } catch (_) { text = '数据序列化失败'; }
  return `<section class="shot-extra"><h3>完整数据 · SHOT ${escapeHtml(shot.number || '')}</h3><pre>${escapeHtml(text)}</pre></section>`;
}

function openDocumentExportDialog() {
  renderPdfFieldOptions();
  const status = $('#pdfPreflightStatus');
  const progress = $('#pdfProgress');
  if (status) status.textContent = '';
  if (progress) { progress.hidden = true; progress.value = 0; }
  const dialog = $('#pdfExportModal');
  if (dialog && !dialog.open) dialog.showModal();
}
$('#pdfExportQuickBtn')?.addEventListener('click', openDocumentExportDialog);

$('#importProjectPdfBtn')?.addEventListener('click', () => $('#projectPdfImportInput')?.click());

$('#downloadProjectPdfBtn')?.addEventListener('click', () => {
  const pid = state.bundle?.project?.id;
  if (!pid) { toast('请先打开一个项目', true); return; }
  // The engineering PDF always contains the complete project, regardless of
  // the current document layout, selected fields, or shot range.
  const anchor = document.createElement('a');
  anchor.href = `/api/projects/${encodeURIComponent(pid)}/export/project-pdf`;
  anchor.download = `${String(state.bundle.project.name || 'FRAMEFORGE').replace(/[\\/:*?"<>|\u0000-\u001F]/g, '_').slice(0, 80)}-工程.pdf`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
});

$$('.pdf-layout-option').forEach(opt => {
  if (opt.tagName !== 'BUTTON') opt.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    opt.click();
  });
  opt.addEventListener('click', () => {
    $$('.pdf-layout-option').forEach(o => {
      o.classList.remove('selected');
      o.setAttribute('aria-checked', 'false');
    });
    opt.classList.add('selected');
    opt.setAttribute('aria-checked', 'true');
    const input = $('#pdfLayoutHiddenInput');
    if (input) input.value = opt.dataset.value;
    const fixedFields = opt.dataset.value === 'landscape-board';
    if ($('#pdfFieldScopeRow')) $('#pdfFieldScopeRow').hidden = fixedFields;
    if ($('#pdfCustomFields')) $('#pdfCustomFields').hidden = fixedFields || $('#pdfFieldScope')?.value !== 'custom';
  });
});

const documentMedia = globalThis.FrameForgeDocumentMedia.create(getShotPrimaryMedia);

function buildPdfDocument(layout, mediaMap = new Map(), fields = null, filteredShots = null) {
  // The dialog uses null for all available fields; the renderer receives prepared values.
  const model = buildPresentationExportModel({ fields: fields ?? pdfFieldOptions(), shots: filteredShots });
  const labels = Object.fromEntries(model.fields.map(field => [field, pdfFieldLabel(field)]));
  const rows = model.shots.map(shot => ({
    shot,
    values: Object.fromEntries(model.fields.map(field => [field, pdfFieldValue(shot, field)])),
    formatted: Object.fromEntries(model.fields.filter(field => RICH_TEXT_FIELDS.has(field))
      .map(field => [field, formattedShotField(shot, field, '')]))
  }));
  if (!globalThis.FrameForgePdfExport?.build) throw new Error('PDF 导出模块未加载');
  return globalThis.FrameForgePdfExport.build({ layout, model, rows, labels, mediaMap });
}

// Parse shot range string like "1-10,15,20-25" into a Set of shot number strings.
function parseShotRange(rangeStr, shots) {
  if (!rangeStr || !rangeStr.trim()) return null; // null = all shots
  const allNums = shots.map(s => s.number);
  const selected = new Set();
  rangeStr.split(',').forEach(part => {
    const p = part.trim();
    if (!p) return;
    const dash = p.match(/^(\d+)-(\d+)$/);
    if (dash) {
      const from = parseInt(dash[1]), to = parseInt(dash[2]);
      allNums.forEach(n => { const ni = parseInt(n); if (!isNaN(ni) && ni >= from && ni <= to) selected.add(n); });
    } else {
      // exact number match
      const exact = allNums.find(n => parseInt(n) === parseInt(p) || n === p);
      if (exact) selected.add(exact);
    }
  });
  return selected;
}

function documentExportSelection() {
  const selectedFields = Array.from($$('input[name="pdf_field"]:checked', document)).map(cb => cb.value);
  const fieldScope = $('#pdfFieldScope')?.value || 'visible';
  const fields = fieldScope === 'all' ? null : fieldScope === 'visible'
    ? pdfFieldOptions().filter(field => !isColumnHidden(field)) : selectedFields;
  const shotScope = $('#pdfShotScope')?.value || 'all';
  const rangeStr = shotScope === 'range' ? $('#pdfShotRange')?.value || '' : '';
  if (shotScope === 'range' && !rangeStr.trim()) throw new Error('请输入镜头编号或范围');
  const allShots = state.bundle?.shots || [];
  const selectedShots = allShots.filter(shot => state.selection.selectedShotIds.has(shot.id));
  const sourceShots = shotScope === 'selected' ? selectedShots : shotScope === 'visible' ? filterShots(allShots) : allShots;
  const rangeSet = parseShotRange(rangeStr, allShots);
  const shots = rangeSet ? sourceShots.filter(shot => rangeSet.has(shot.number)) : sourceShots;
  if (!shots.length) throw new Error('指定的镜头范围未匹配到任何镜头，请检查格式。');
  return { fields, shots };
}

$('#pdfShotScope')?.addEventListener('change', event => {
  $('#pdfShotRange').hidden = event.target.value !== 'range';
});
$('#pdfFieldScope')?.addEventListener('change', event => {
  $('#pdfCustomFields').hidden = event.target.value !== 'custom';
});
$('#openPdfDocumentBtn')?.addEventListener('click', () => {
  const layout = $('#pdfLayoutHiddenInput')?.value || 'table';
  const button = $('#openPdfDocumentBtn');
  const status = $('#pdfPreflightStatus');
  const progress = $('#pdfProgress');
  // Collect selected fields
  let fields, filteredShots;
  try { ({ fields, shots: filteredShots } = documentExportSelection()); }
  catch (error) { toast(error.message, true); return; }
  if (fields && !fields.length && !['screenplay','us-board','landscape-board'].includes(layout)) { toast('请至少选择一个导出字段', true); return; }
  if (button) { button.disabled = true; button.textContent = '检查图片…'; }
  if (progress) { progress.hidden = false; progress.value = 0; }
  if (status) status.textContent = `正在检查 ${filteredShots.length} 个镜头的分镜画面…`;
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    toast('浏览器拦截了预览窗口，请允许弹出窗口后重试', true);
    if (button) { button.disabled = false; button.textContent = '生成预览'; }
    if (progress) progress.hidden = true;
    return;
  }
  printWindow.document.write('<!doctype html><title>准备分镜预览</title><p role="status">正在准备分镜图片，请保留此页…</p>');
  printWindow.document.close();
  documentMedia.preflight(layout === 'landscape-board' ? filteredShots : layout === 'screenplay' || isColumnHidden('thumb') || isColumnArchived('thumb') || isColumnPurged('thumb') ? [] : filteredShots, (done, total) => {
    if (status) status.textContent = `准备图片 ${done} / ${total}`;
    if (progress) progress.value = Math.round(done / total * 70);
  }, { compact: layout === 'landscape-board' }).then(async ({ mediaMap, failures }) => {
    if (progress) progress.value = 70;
    if (failures.length) {
      const list = failures.slice(0, 12).map(item => `SHOT ${item.number}：${item.reason}`).join('\n');
      if (status) status.innerHTML = `<span class="pdf-preflight-error">${escapeHtml(`有 ${failures.length} 张图片无法嵌入 PDF。\n${list}`)}</span>`;
      const continueWithout = await confirmAction('图片预检未通过', `有 ${failures.length} 张图片无法嵌入。本次可以继续生成 PDF，缺失位置将保留占位框。\n\n${list}`);
      if (!continueWithout) { printWindow.close(); return; }
    }
    if (status) status.textContent = '正在生成 PDF 预览…';
    if (printWindow.closed) throw new Error('预览窗口已关闭，请重新生成');
    if (!printWindow) throw new Error('浏览器阻止了新窗口，请允许弹窗后重试');
    printWindow.document.open();
    printWindow.document.write(buildPdfDocument(layout, mediaMap, fields, filteredShots));
    printWindow.document.close();
    if (progress) progress.value = 100;
    $('#pdfExportModal')?.close();
  }).catch(error => {
    toast(`PDF 图片预检失败：${error.message}`, true);
  }).finally(() => {
    if (button) { button.disabled = false; button.textContent = '生成预览'; }
    if (progress) setTimeout(() => { progress.hidden = true; progress.value = 0; }, 400);
  });
});

$('#downloadWordDocumentBtn')?.addEventListener('click', async () => {
  const button = $('#downloadWordDocumentBtn');
  const status = $('#pdfPreflightStatus');
  const progress = $('#pdfProgress');
  try {
    const { fields, shots } = documentExportSelection();
    const fixedLandscapeFields = $('#pdfLayoutHiddenInput')?.value === 'landscape-board';
    const model = buildPresentationExportModel({ fields: fixedLandscapeFields ? pdfFieldOptions() : fields ?? pdfFieldOptions(), shots });
    if (!model.fields.length) throw new Error('请至少选择一个导出字段');
    if (!globalThis.FrameForgeWordExport?.build) throw new Error('Word 导出模块未加载');
    button.disabled = true;
    button.textContent = '正在准备 Word…';
    if (progress) { progress.hidden = false; progress.value = 0; }
    if (status) status.textContent = `正在检查 ${shots.length} 个镜头的分镜画面…`;
    const { mediaMap, failures } = await documentMedia.preflight(shots, (done, total) => {
      if (status) status.textContent = `准备图片 ${done} / ${total}`;
      if (progress) progress.value = Math.round(done / total * 70);
    }, { wordCompatible: true });
    if (failures.length) {
      const list = failures.slice(0, 12).map(item => `SHOT ${item.number}：${item.reason}`).join('\n');
      const proceed = await confirmAction('图片预检未通过', `有 ${failures.length} 张图片无法嵌入 Word，缺失处将保留占位框。是否继续？\n\n${list}`);
      if (!proceed) return;
    }
    if (status) status.textContent = '正在生成 Word 文档…';
    const blob = globalThis.FrameForgeWordExport.build({
      project: model.project,
      shots: model.shots.map(shot => ({
        id: shot.id, number: shot.number,
        values: Object.fromEntries(model.fields.map(field => [field, pdfFieldValue(shot, field)]))
      })),
      fields: model.fields.map(field => ({ key: field, label: pdfFieldLabel(field) })),
      mediaMap
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${String(model.project.name || 'FRAMEFORGE').replace(/[\\/:*?"<>|\u0000-\u001F]/g, '_').slice(0, 80)}-分镜表.docx`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    if (progress) progress.value = 100;
    if (status) status.textContent = `Word 文档已生成：${shots.length} 个镜头`;
    $('#pdfExportModal')?.close();
  } catch (error) {
    toast(`Word 导出失败：${error.message}`, true);
    if (status) status.textContent = `Word 导出失败：${error.message}`;
  } finally {
    button.disabled = false;
    button.textContent = '下载 Word (.docx)';
    if (progress) setTimeout(() => { progress.hidden = true; progress.value = 0; }, 400);
  }
});

// --------------------------------------------------------------------------
// 16. EXCEL / CSV IMPORT WIZARD
// --------------------------------------------------------------------------
function setImportStep(step) {
  $$('[data-import-step-label]').forEach(label => label.classList.toggle('is-active', Number(label.dataset.importStepLabel) === step));
  const back = $('#importBackBtn');
  const next = $('#importNextBtn');
  const commit = $('#commitImportBtn');
  const finish = $('#finishImportBtn');
  if (back) back.classList.toggle('hidden', step <= 1 || step >= 5);
  if (next) next.classList.toggle('hidden', step !== 1);
  if (commit) {
    commit.classList.toggle('hidden', step !== 3 && step !== 4);
    commit.disabled = step === 4;
    commit.textContent = step === 4 ? '正在导入…' : '确认导入';
  }
  if (finish) finish.classList.toggle('hidden', step !== 5);
}

function uploadImportFile(file) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const url = `/api/projects/${encodeURIComponent(state.bundle.project.id)}/import-preview?filename=${encodeURIComponent(file.name)}`;
    xhr.open('POST', url);
    xhr.timeout = 10 * 60 * 1000;
    xhr.withCredentials = true;
    xhr.setRequestHeader('X-CSRF-Token', state.csrf);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    let parseTimer = null;
    xhr.upload.onprogress = event => {
      const summary = $('#importFileSummary');
      if (summary && event.lengthComputable) summary.innerHTML = `<b>上传文件</b>　${Math.round(event.loaded / event.total * 100)}%<div class="progress-track"><span style="width:${Math.round(event.loaded / event.total * 100)}%"></span></div><small>${formatBytes(event.loaded)} / ${formatBytes(event.total)}</small>`;
    };
    xhr.upload.onload = () => {
      const summary = $('#importFileSummary');
      if (summary) summary.innerHTML = `<b>${escapeHtml(file.name)}</b>　${formatBytes(file.size)}<div class="progress-track is-indeterminate"><span></span></div><small>文件已上传，正在智能识别字段、卡片和图片…</small>`;
      const startedAt = Date.now();
      parseTimer = setInterval(() => {
        const elapsed = Math.round((Date.now() - startedAt) / 1000);
        const small = summary?.querySelector('small');
        if (small) small.textContent = `文件已上传，正在智能识别字段、卡片和图片… 已用时 ${elapsed}s；完成后可继续下一步。`;
      }, 1000);
    };
    xhr.onerror = () => { if (parseTimer) clearInterval(parseTimer); reject(new Error('文件上传失败，请重试')); };
    xhr.ontimeout = () => { if (parseTimer) clearInterval(parseTimer); reject(new Error('解析超时（10分钟），文件可能过大或格式异常，请重新选择')); };
    xhr.onload = () => {
      if (parseTimer) clearInterval(parseTimer);
      let payload = {};
      try { payload = JSON.parse(xhr.responseText || '{}'); } catch (_) { payload = {}; }
      if (xhr.status >= 200 && xhr.status < 300) resolve(payload);
      else { const error = new Error(payload.error || `上传失败 (${xhr.status})`); error.status = xhr.status; reject(error); }
    };
    xhr.send(file);
  });
}

$('#importExcelBtn')?.addEventListener('click', () => {
  setImportStep(1);
  $('#importFileSummary')?.classList.add('hidden');
  $('#mappingPreviewBox').innerHTML = '<div class="import-drop-state">选择 XLSX / CSV / TSV / PDF；PDF 可识别卡片式分镜排版</div>';
  $('#importModal')?.showModal();
  $('#importFileInput')?.click();
});

$('#importFileInput')?.addEventListener('change', async e => {
  const file = e.target.files?.[0];
  if (!file || !state.bundle) return;
  $('#importModal')?.showModal();
  setImportStep(1);
  const fileSummary = $('#importFileSummary');
  if (fileSummary) { fileSummary.classList.remove('hidden'); fileSummary.innerHTML = `<b>${escapeHtml(file.name)}</b>　${formatBytes(file.size)}<div class="progress-track"><span style="width:0%"></span></div><small>正在上传文件…</small>`; }
  try {
    const preview = await uploadImportFile(file);
  state.importWizard = { file, preview, step: 2, mode: 'append', busy: false };
    renderImportMapping(preview);
  } catch (err) {
    if (fileSummary) fileSummary.innerHTML = `<b>文件接收失败</b><p>${escapeHtml(err.message)}</p><button type="button" class="btn btn-secondary" id="retryImportUploadBtn">重新选择</button>`;
    toast(err.message, true);
  } finally {
    $('#importFileInput').value = '';
  }
});

function importCustomColumnsFromPreview(preview) {
  // Unmapped spreadsheet columns are discarded by default. A column only
  // survives when the user explicitly keeps it in this list.
  return Array.isArray(preview.custom_columns)
    ? preview.custom_columns.filter(item => item?.selected === true).map(item => ({ ...item }))
    : [];
}

function readImportCustomColumns(box) {
  return $$('[data-import-custom-col]', box).map(item => ({
    source_col: Number(item.dataset.importCustomCol),
    key: item.dataset.key || '',
    label: item.querySelector('input')?.value.trim() || '',
    field_type: 'text'
  })).filter(item => item.label && Number.isInteger(item.source_col) && item.source_col >= 0);
}

function renderImportCustomColumnList(box, headers) {
  const target = $('#importCustomColumns', box);
  if (!target || !state.importWizard) return;
  const columns = state.importWizard.customColumns || [];
  const mapped = new Set($$('.mapping-combobox[data-field]', box).map(item => Number(item.dataset.col)).filter(Number.isFinite).filter(col => col >= 0));
  const selected = new Set(columns.map(item => Number(item.source_col)));
  const available = headers.map((label, source_col) => ({ source_col, label: label || `未命名列${source_col + 1}` }))
    .filter(item => !mapped.has(item.source_col) && !selected.has(item.source_col));
  const badge = box.querySelector('.import-custom-section .import-section-badge');
  if (badge) badge.textContent = `${columns.length} 列`;
  target.innerHTML = `${columns.map(item => `<div class="import-custom-column" data-import-custom-col="${item.source_col}" data-key="${escapeHtml(item.key || '')}"><span class="import-custom-source">${escapeHtml(headers[item.source_col] || `第 ${item.source_col + 1} 列`)}</span><input value="${escapeHtml(item.label || '')}" aria-label="自定义列名称：${escapeHtml(item.label || '')}"><button type="button" class="btn-ghost-icon import-custom-remove" data-remove-import-custom="${item.source_col}" aria-label="不导入 ${escapeHtml(item.label || '')}" title="不导入此列">×</button></div>`).join('')}${available.length ? `<div class="import-custom-available"><span>未选择来源列（不会导入）</span>${available.map(item => `<button type="button" class="btn btn-secondary btn-small" data-add-import-custom="${item.source_col}">保留「${escapeHtml(item.label)}」</button>`).join('')}</div>` : (!columns.length ? '<div class="config-empty">没有明确保留的自定义列。</div>' : '')}`;
  target.querySelectorAll('[data-remove-import-custom]').forEach(button => button.addEventListener('click', () => {
    const sourceCol = Number(button.dataset.removeImportCustom);
    state.importWizard.customColumns = (state.importWizard.customColumns || []).filter(item => item.source_col !== sourceCol);
    renderImportCustomColumnList(box, headers);
  }));
  target.querySelectorAll('[data-add-import-custom]').forEach(button => button.addEventListener('click', () => {
    const sourceCol = Number(button.dataset.addImportCustom);
    const label = headers[sourceCol] || `未命名列${sourceCol + 1}`;
    state.importWizard.customColumns = [...(state.importWizard.customColumns || []), { source_col: sourceCol, label, field_type: 'text' }];
    renderImportCustomColumnList(box, headers);
  }));
}

function renderImportPreviewTable(preview, headers, embeddedImages) {
  const table = $('#importPreviewTable');
  if (!table) return;
  const imageByRow = new Map();
  embeddedImages.forEach(image => {
    const row = Number(image.data_row);
    if (!imageByRow.has(row)) imageByRow.set(row, []);
    imageByRow.get(row).push(image);
  });
  table.innerHTML = `<thead><tr>${headers.map((header, index) => `<th scope="col">${escapeHtml(header || `未命名列${index + 1}`)}</th>`).join('')}<th scope="col" class="import-image-header">识别图片</th></tr></thead><tbody>${(preview.rows || []).slice(0, 50).map((row, index) => { const images = imageByRow.get(index) || []; return `<tr>${headers.map((_, col) => `<td>${escapeHtml(String(row[col] ?? '—'))}</td>`).join('')}<td class="import-image-cell">${images.length ? `<div class="import-preview-images">${images.map(image => `<img src="${escapeHtml(image.preview_url || '')}" loading="lazy" decoding="async" alt="第 ${index + 1} 条识别图片"><span>${images.length > 1 ? `${images.length} 张` : '已识别'}</span>`).join('')}</div>` : '<span class="import-image-empty">—</span>'}</td></tr>`; }).join('')}</tbody>`;
}

function renderImportMapping(preview) {
  const box = $('#mappingPreviewBox');
  if (!box) return;
  setImportStep(2);
  const fields = [
    ['number', '镜号'], ['title', '镜头标题'], ['chapter', '篇章'], ['scene', '场景/地点'], ['panel_frame', '分镜图框'],
    ['description', '画面描述'], ['voiceover', '对应旁白'], ['duration', '时长'],
    ['shot_size', '景别'], ['lens', '焦段'], ['movement', '运镜'], ['angle', '机位角度'],
    ['primary_method', '制作方式'], ['department', '责任部门'], ['owner', '负责人']
  ];
  const mapping = preview.mapping || {};
  const headers = preview.headers || [];
  const sampleRows = preview.sample_preview || [];
  const diagnostics = preview.diagnostics || [];
  const sourceDiagnostics = Array.isArray(preview.source_diagnostics) ? preview.source_diagnostics : [];
  const fieldIssueCounts = diagnostics.reduce((counts, item) => {
    (item.fields || []).forEach(field => { counts[field] = (counts[field] || 0) + 1; });
    return counts;
  }, {});
  const embeddedImages = preview.embedded_images || [];
  if (state.importWizard) state.importWizard.customColumns = importCustomColumnsFromPreview(preview);
  box.innerHTML = `
    <div class="import-mode-row"><b>字段映射</b><label><input type="radio" name="importMode" value="append" checked> 新增镜头</label><label><input type="radio" name="importMode" value="update"> 更新已有镜头</label><label class="import-replace-option"><input type="radio" name="importMode" value="replace"> 替换所有镜头</label></div>
    <div class="import-mode-help">“替换所有镜头”会在同一事务中移除当前项目镜头，再写入本文件；校验失败会自动回滚，不会留下半成品。</div>
    ${sourceDiagnostics.map(item => `<div class="import-source-warning" role="alert" data-diagnostic-code="${escapeHtml(item.code || '')}"><b>PDF 文字提取提示</b><p>${escapeHtml(item.message || '')}</p><small>共 ${Number(item.page_count) || 0} 页；解析器从 ${Number(item.text_page_count) || 0} 页取得文字；${Number(item.rendered_page_count) || 0} 页已保留整页画面。可以继续仅导入图片，或先用 OCR 处理 PDF 后重新导入。</small></div>`).join('')}
    <div style="font-size:12px;color:var(--text-secondary);margin-bottom:10px;">已读取 <b>${preview.total_rows || 0}</b> 行、${headers.length} 列${preview.embedded_image_count ? `，识别图片 <b>${preview.embedded_image_count}</b> 张（${formatBytes(preview.embedded_image_bytes || 0)}）` : ''}。每个来源列只能映射到一个属性。${sourceDiagnostics.length ? '当前仅支持按页占位导入，正文和其他字段尚未识别。' : diagnostics.length ? `有 <b>${diagnostics.length}</b> 行需关注，提示已归入下方对应选择项。` : '当前预检通过。'}</div>
    <div class="import-mapping-grid">
      ${fields.map(([field, label]) => `
        <label class="import-map-row"><span>${label}${fieldIssueCounts[field] ? `<small class="mapping-field-warning">${fieldIssueCounts[field]} 行缺少或格式异常</small>` : ''}</span><div class="mapping-input-wrap"><input class="mapping-combobox" list="mapping-source-columns" data-field="${field}" data-col="${mapping[field]?.col ?? -1}" value="${escapeHtml(String(mapping[field] ? (headers[mapping[field].col] || '') : ''))}" placeholder="不导入 / 搜索来源列"><button type="button" class="btn-ghost-icon mapping-clear" data-clear-mapping="${field}" aria-label="清除${label}映射" title="清除映射">×</button></div></label>
      `).join('')}
    </div>
    <section class="import-custom-section" aria-labelledby="importCustomColumnsTitle"><div class="import-section-head"><div><b id="importCustomColumnsTitle">导入自定义列</b><small>只有明确保留的自定义列会写入项目；未选择的来源列不会进入表格或侧栏。</small></div><span class="import-section-badge">${(state.importWizard?.customColumns || []).length} 列</span></div><div id="importCustomColumns" class="import-custom-columns"></div></section>
    <datalist id="mapping-source-columns">${headers.map((header, index) => `<option value="${escapeHtml(header)}" data-index="${index}">${index + 1} · ${escapeHtml(header)}</option>`).join('')}</datalist>
    <div class="import-preview-section"><div class="import-section-head"><div><b>原始数据预览</b><small>横向滚动查看全部来源列；图片独立显示，不与文字叠放。</small></div><span class="import-section-badge">最多显示 50 行</span></div><div class="import-preview-scroll"><table id="importPreviewTable"></table></div></div>
  `;
  renderImportCustomColumnList(box, headers);
  renderImportPreviewTable(preview, headers, embeddedImages);
  box.querySelectorAll('.mapping-combobox').forEach(input => input.addEventListener('input', event => {
    const value = event.target.value.trim();
    const col = headers.findIndex(header => header === value);
    event.target.dataset.col = String(col);
    if (col >= 0) {
      $$('.mapping-combobox[data-field]', box).filter(item => item !== event.target && Number(item.dataset.col) === col).forEach(item => {
        item.value = '';
        item.dataset.col = '-1';
      });
    }
    const mapped = new Set($$('.mapping-combobox[data-field]', box).map(item => Number(item.dataset.col)).filter(Number.isFinite));
    const current = readImportCustomColumns(box);
    const existing = new Map(current.map(item => [item.source_col, item]));
    state.importWizard.customColumns = headers.map((header, source_col) => existing.get(source_col) || (mapped.has(source_col) ? null : (preview.custom_columns || []).find(item => item.source_col === source_col) || { source_col, label: header || `未命名列${source_col + 1}`, field_type: 'text' })).filter(item => item && !mapped.has(item.source_col));
    renderImportCustomColumnList(box, headers);
  }));
  box.querySelectorAll('[data-clear-mapping]').forEach(button => button.addEventListener('click', () => {
    const input = box.querySelector(`.mapping-combobox[data-field="${CSS.escape(button.dataset.clearMapping)}"]`);
    if (!input) return;
    input.value = '';
    input.dataset.col = '-1';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }));
  box.querySelectorAll('input[name="importMode"]').forEach(input => input.addEventListener('change', event => {
    if (state.importWizard) state.importWizard.mode = event.target.value;
  }));
  $('#nextImportPreviewBtn')?.remove();
  const next = $('#importNextBtn');
  if (next) { next.textContent = '查看预览'; next.classList.remove('hidden'); next.onclick = () => { setImportStep(3); next.classList.add('hidden'); $('#commitImportBtn')?.classList.remove('hidden'); toast('已生成导入预览'); }; }
  $('#commitImportBtn').onclick = async () => {
    const mode = box.querySelector('input[name="importMode"]:checked')?.value || state.importWizard?.mode || 'append';
    if (mode === 'replace') {
      const currentCount = state.bundle?.shots?.length || 0;
      const incomingCount = Number(preview.total_rows || preview.rows?.length || 0);
      const confirmed = await confirmAction('替换全部镜头', `将当前 ${currentCount} 个镜头整体替换为文件中的 ${incomingCount} 条。任何一条失败都会整次回滚，是否继续？`);
      if (!confirmed) return;
    }
    if (state.importWizard) state.importWizard.busy = true;
    setImportStep(4);
    $$('[data-close="importModal"]').forEach(button => { button.disabled = true; });
    box.insertAdjacentHTML('afterbegin', '<div class="import-progress" id="importProgress" role="status" aria-live="polite"><b>正在写入镜头与识别图片</b><div class="progress-track is-indeterminate"><span></span></div><small>源文件已安全暂存，图片由服务器直接关联到对应分镜。完成前请勿关闭窗口。</small></div>');
    try {
      const selectedMapping = {};
      $$('#mappingPreviewBox input.mapping-combobox[data-field]').forEach(select => {
        const col = Number(select.dataset.col);
        if (col >= 0) selectedMapping[select.dataset.field] = { col };
      });
      const selectedCustomColumns = readImportCustomColumns($('#mappingPreviewBox'));
      const res = await api(`/api/projects/${state.bundle.project.id}/import-commit`, {
        method: 'POST',
        json: { preview_id: preview.preview_id, mapping: selectedMapping, custom_columns: selectedCustomColumns, mode }
      });
      if (res.mode !== mode || (mode === 'replace' && Number(res.after_count) !== Number(res.imported))) {
        throw new Error('服务器未确认全量替换结果，界面已拒绝采用本次响应');
      }
      state.bundle = adoptServerBundle(res.bundle || state.bundle);
      setImportStep(5);
      $('#importProgress')?.remove();
      box.innerHTML = `<div class="import-complete" role="status"><h3>导入完成</h3><p>${res.replaced ? `已将原有 ${res.before_count || 0} 镜全量替换为 <b>${res.after_count || 0}</b> 镜` : `新增镜头 <b>${res.imported || 0}</b>　更新 ${res.updated || 0}`}　跳过 ${res.skipped || 0}　错误 ${(res.errors || []).length}</p><small>${res.images_imported ? `已导入识别图片 ${res.images_imported} 张。` : ''} ${res.atomic ? '本次写入已通过原子提交和数量校验。' : ''}</small></div>`;
      renderProjectHeader();
      toast('分镜清单导入成功');
    } catch (err) {
      setImportStep(3);
      if (err.payload?.errors?.length) {
        const details = err.payload.errors.slice(0, 20).map(item => `第 ${item.row} 行：${item.message}`).join('\n');
        box.insertAdjacentHTML('afterbegin', `<div class="import-error-summary"><b>${escapeHtml(err.message)}</b><pre>${escapeHtml(details)}</pre></div>`);
      }
      toast(err.message, true);
    } finally {
      if (state.importWizard) state.importWizard.busy = false;
      $$('[data-close="importModal"]').forEach(button => { button.disabled = false; });
    }
  };
}

$('#finishImportBtn')?.addEventListener('click', () => {
  state.searchQuery = '';
  if ($('#globalSearchInput')) $('#globalSearchInput').value = '';
  $('#searchResultPanel')?.classList.add('hidden');
  $('#importModal')?.close();
  navigateToView(VIEW.TABLE);
  renderProjectHeader();
  renderCurrentView();
});

// --------------------------------------------------------------------------
// 17. REVIEW & SHARE
// --------------------------------------------------------------------------
function renderShareDialog() {
  const container = $('#shareLinkContainer');
  const revoke = $('#revokeShareBtn');
  if (!container || !state.bundle) return;
  const token = state.bundle.project.share_token;
  if (!token) {
    container.innerHTML = '<p class="share-empty">尚未生成审片链接。生成后默认永久有效，并允许下载。</p><label class="share-password-field">访问密码（可选）<input id="sharePasswordInput" type="password" autocomplete="new-password" placeholder="留空表示不设密码"></label>';
    if (revoke) revoke.classList.add('hidden');
    return;
  }
  const shareUrl = `${location.origin}/share/${token}`;
  container.innerHTML = `
    <div class="share-link-row">
      <input readonly value="${escapeHtml(shareUrl)}" id="shareUrlInput">
      <button class="btn btn-secondary" data-action="copy-share" data-share-url="${escapeHtml(shareUrl)}">复制</button>
    </div>
    <p class="share-link-note">永久有效 · 免登录查看 · 允许下载</p>
  `;
  if (revoke) revoke.classList.remove('hidden');
}

async function renderProConfig() {
  if (!state.bundle) return;
  const pid = state.bundle.project.id;
  const [views, fields] = await Promise.all([api(`/api/projects/${pid}/saved-views`), api(`/api/projects/${pid}/custom-fields`)]);
  const viewList = $('#savedViewsList');
  const fieldList = $('#customFieldsList');
  if (viewList) viewList.innerHTML = views.length ? views.map(view => `<div class="config-list-row"><button class="config-view-apply" data-apply-view="${escapeHtml(view.id)}"><b>${escapeHtml(view.name)}</b><small>${escapeHtml(view.view_type)} · ${escapeHtml(view.created_at || '')}</small></button><div class="config-row-actions"><button class="btn-ghost-icon" data-rename-view="${escapeHtml(view.id)}" title="重命名保存视图" aria-label="重命名 ${escapeHtml(view.name)}">✎</button><button class="btn-ghost-icon" data-copy-view="${escapeHtml(view.id)}" title="复制保存视图" aria-label="复制 ${escapeHtml(view.name)}">⧉</button><button class="btn-ghost-icon" data-delete-view="${escapeHtml(view.id)}" title="删除保存视图">×</button></div></div>`).join('') : '<div class="config-empty">暂无保存视图</div>';
  if (fieldList) fieldList.innerHTML = fields.length ? fields.map(field => `<div class="config-list-row custom-field-row"><span class="custom-field-type-icon"><svg class="g-icon"><use href="#icon-description"></use></svg></span><span class="config-row-copy"><b>${escapeHtml(field.label)}</b><small>${escapeHtml(field.key)} · ${escapeHtml(field.field_type)} · 当前表格及侧栏同步</small></span><div class="config-row-actions"><button class="btn-ghost-icon" data-edit-field="${escapeHtml(field.id)}" title="编辑自定义列" aria-label="编辑 ${escapeHtml(field.label)}"><svg class="g-icon"><use href="#icon-edit"></use></svg></button><button class="btn btn-secondary btn-small" data-remove-field="${escapeHtml(field.key)}" title="归档该自定义列">归档列</button></div></div>`).join('') : '<div class="config-empty">还没有自定义列。可在上方创建第一个字段。</div>';
  state.bundle.custom_fields = fields;
  viewList?.querySelectorAll('[data-delete-view]').forEach(button => button.addEventListener('click', async () => {
    await api(`/api/projects/${pid}/saved-views/${button.dataset.deleteView}`, { method: 'DELETE' });
    await renderProConfig();
    toast('保存视图已删除');
  }));
  viewList?.querySelectorAll('[data-rename-view]').forEach(button => button.addEventListener('click', async () => {
    const view = views.find(item => item.id === button.dataset.renameView);
    if (!view) return;
    const name = String(await openFieldEditor('重命名保存视图', view.name) || '').trim();
    if (!name || name === view.name) return;
    await api(`/api/projects/${pid}/saved-views/${view.id}`, { method: 'PUT', json: { name, config: view.config } });
    await renderProConfig();
    toast('保存视图已重命名');
  }));
  viewList?.querySelectorAll('[data-copy-view]').forEach(button => button.addEventListener('click', async () => {
    const view = views.find(item => item.id === button.dataset.copyView);
    if (!view) return;
    await api(`/api/projects/${pid}/saved-views`, { method: 'POST', json: { name: `${view.name} 副本`, view_type: view.view_type, is_shared: view.is_shared, config: view.config } });
    await renderProConfig();
    toast('保存视图已复制');
  }));
  viewList?.querySelectorAll('[data-apply-view]').forEach(button => button.addEventListener('click', () => {
    const view = views.find(item => item.id === button.dataset.applyView);
    const config = view?.config || {};
    state.searchQuery = config.search || '';
    state.filterMethod = config.filter_method || 'ALL';
    state.filterStatus = config.filter_status || 'ALL';
    state.filterDept = config.filter_department || 'ALL';
    if (config.table_prefs) {
      state.tablePrefs = tablePresentationPrefs(config.table_prefs);
      applyColumnLifecycleProjection();
      saveTablePrefs(VIEW.TABLE);
    }
    if ($('#globalSearchInput')) $('#globalSearchInput').value = state.searchQuery;
    $('#proConfigModal')?.close();
    navigateToView(view?.view_type === 'cards' ? VIEW.CARDS : view?.view_type === 'wall' ? VIEW.WALL : VIEW.TABLE);
    toast(`已应用视图：${view?.name || ''}`);
  }));
  fieldList?.querySelectorAll('[data-remove-field]').forEach(button => button.addEventListener('click', async () => {
    const field = fields.find(item => item.key === button.dataset.removeField);
    if (!field) return;
    const columnKey = `custom:${field.key}`;
    if (archiveColumn(columnKey)) await renderProConfig();
  }));
  fieldList?.querySelectorAll('[data-edit-field]').forEach(button => button.addEventListener('click', () => {
    const field = fields.find(item => item.id === button.dataset.editField);
    if (!field) return;
    const form = $('#customFieldEditForm');
    if (!form) return;
    form.elements.id.value = field.id;
    form.elements.label.value = field.label;
    form.elements.key.value = field.key;
    form.elements.field_type.value = field.field_type;
    form.elements.options.value = (field.options || []).join(', ');
    syncCustomFieldOptions(form);
    $('#customFieldEditModal')?.showModal();
    form.elements.label.focus();
  }));
}

function syncCustomFieldOptions(form) {
  const row = form?.querySelector('.custom-options-field');
  const options = form?.elements?.field_type?.value === 'select';
  if (row) row.hidden = !options;
  const input = row?.querySelector('[name="options"]');
  if (input) input.disabled = !options;
}

$('#customFieldForm [name="field_type"]')?.addEventListener('change', event => syncCustomFieldOptions(event.currentTarget.form));
$('#customFieldEditForm [name="field_type"]')?.addEventListener('change', event => syncCustomFieldOptions(event.currentTarget.form));

$('#proConfigBtn')?.addEventListener('click', async () => {
  $('#proConfigModal')?.showModal();
  try { await renderProConfig(); } catch (err) { toast(err.message, true); }
});

$('#addColumnBtn')?.addEventListener('click', async () => {
  $('#customFieldsModal')?.showModal();
  try {
    await renderProConfig();
    $('#customFieldForm input[name="label"]')?.focus();
  } catch (err) { toast(err.message, true); }
});

$('#savedViewForm')?.addEventListener('submit', async event => {
  event.preventDefault();
  if (!state.bundle) return;
  const formElement = event.currentTarget;
  const form = new FormData(formElement);
  try {
    await api(`/api/projects/${state.bundle.project.id}/saved-views`, { method: 'POST', json: {
      name: form.get('name'), view_type: form.get('view_type'), is_shared: false,
      config: { search: state.searchQuery, filter_method: state.filterMethod, filter_status: state.filterStatus, filter_department: state.filterDept, density: 'comfortable', table_prefs: tablePresentationPrefs(state.tablePrefs) }
    }});
    formElement.reset();
    await renderProConfig();
    toast('保存视图已创建');
  } catch (err) { toast(err.message, true); }
});

$('#customFieldForm')?.addEventListener('submit', async event => {
  event.preventDefault();
  if (!state.bundle) return;
  const formElement = event.currentTarget;
  const form = new FormData(formElement);
  try {
    await api(`/api/projects/${state.bundle.project.id}/custom-fields`, { method: 'POST', json: {
      label: form.get('label'), key: form.get('key'), field_type: form.get('field_type'), group_name: 'Custom',
      options: form.get('field_type') === 'select' ? String(form.get('options') || '').split(/[,，]/).map(item => item.trim()).filter(Boolean) : []
    }});
    formElement.reset();
    state.bundle = adoptServerBundle(await api(`/api/projects/${state.bundle.project.id}`));
    await renderProConfig();
    renderProjectHeader();
    renderCurrentView();
    toast('自定义列已添加');
  } catch (err) { toast(err.message, true); }
});

$('#customFieldEditForm')?.addEventListener('submit', async event => {
  event.preventDefault();
  if (!state.bundle) return;
  const form = new FormData(event.currentTarget);
  try {
    await api(`/api/projects/${state.bundle.project.id}/custom-fields/${form.get('id')}`, { method: 'PUT', json: {
      label: form.get('label'), field_type: form.get('field_type'),
      options: form.get('field_type') === 'select' ? String(form.get('options') || '').split(/[,，]/).map(item => item.trim()).filter(Boolean) : []
    }});
    state.bundle = adoptServerBundle(await api(`/api/projects/${state.bundle.project.id}`));
    $('#customFieldEditModal')?.close();
    await renderProConfig();
    renderCurrentView();
    toast('自定义列已更新');
  } catch (err) { toast(err.message, true); }
});

function openShareDialog() {
  if (!state.bundle) return;
  renderShareDialog();
  $('#shareDialogModal')?.showModal();
}

$('#projectShareBtn')?.addEventListener('click', openShareDialog);
$('#projectFavoriteBtn')?.addEventListener('click', event => {
  if (!state.bundle) return;
  const button = event.currentTarget;
  const next = button.getAttribute('aria-pressed') !== 'true';
  localStorage.setItem(`frameforge-favorite:${state.bundle.project.id}`, String(next));
  button.setAttribute('aria-pressed', String(next));
  button.classList.toggle('is-active', next);
  toast(next ? '项目已收藏' : '已取消收藏');
});
$('#projectLastEdited')?.addEventListener('click', event => {
  const panel = $('#projectActivityPanel');
  if (!panel) return;
  const open = panel.classList.toggle('hidden') === false;
  event.currentTarget.setAttribute('aria-expanded', String(open));
  if (open) renderProjectActivity();
});
$('#projectMoreBtn')?.addEventListener('click', event => {
  const menu = $('#projectQuickMenu');
  if (!menu) return;
  const open = menu.classList.toggle('hidden') === false;
  event.currentTarget.setAttribute('aria-expanded', String(open));
  if(open) {
    document.body.append(menu);
    Object.assign(menu.style,{position:'fixed',right:'auto',maxWidth:'calc(100vw - 16px)',maxHeight:'calc(100dvh - 24px)',overflowY:'auto'});
    positionPopoverNear(event.currentTarget,menu);
    menu.querySelector('button')?.focus();
  }
});
$('#projectQuickMenu')?.addEventListener('click', event => {
  const action = event.target.closest('[data-project-quick]')?.dataset.projectQuick;
  if (!action) return;
  $('#projectQuickMenu')?.classList.add('hidden');
  $('#projectMoreBtn')?.setAttribute('aria-expanded', 'false');
  if (action === 'settings') openProjectSettings();
  if (action === 'undo') $('#undoBtn')?.click();
  if (action === 'redo') $('#redoBtn')?.click();
  if (action === 'share') openShareDialog();
  if (action === 'import') $('#importExcelBtn')?.click();
  if (action === 'pdf') $('#pdfExportQuickBtn')?.click();
  if (action === 'trash') openShotTrash();
});

function mergeRestoredShots(result, requestedIds) {
  if (state.bundle?.project?.id !== result?.project?.id) return false;
  const shots = state.bundle.shots;
  const currentIds = new Set(shots.map(shot => shot.id));
  const restored = adoptServerBundle(result).shots.filter(shot => requestedIds.includes(shot.id) && !currentIds.has(shot.id));
  if (!restored.length) return false;
  recordHistory();
  for (const shot of restored) {
    const remoteIndex = result.shots.findIndex(item => item.id === shot.id);
    const next = result.shots.slice(remoteIndex + 1).find(item => shots.some(current => current.id === item.id));
    const index = next ? shots.findIndex(item => item.id === next.id) : shots.length;
    shots.splice(index, 0, shot);
  }
  markDirty();
  return true;
}

async function openShotTrash() {
  if (!state.bundle) return;
  const projectId = state.bundle.project.id;
  const modal = $('#shotTrashModal');
  const list = $('#shotTrashList');
  const emptyButton = $('#emptyShotTrashBtn');
  if (modal && !modal.open) modal.showModal();
  if (!list) return;
  if (emptyButton) { emptyButton.disabled = true; emptyButton.dataset.trashLoaded = 'false'; }
  list.innerHTML = '<div class="empty-state">正在读取…</div>';
  try {
    const rows = await api(`/api/projects/${encodeURIComponent(projectId)}/trash`);
    if (state.bundle?.project?.id !== projectId) return;
    if (emptyButton) {
      emptyButton.dataset.trashLoaded = 'true';
      emptyButton.dataset.trashCount = String(rows.length);
      emptyButton.disabled = rows.length === 0;
    }
    list.innerHTML = rows.length ? rows.map(row => {
      const deleted = new Date(row.deleted_at || Date.now());
      const remaining = Math.max(0, 30 - Math.floor((Date.now() - deleted.getTime()) / 86400000));
      return `<div class="config-list-row"><span class="config-row-copy"><b>SHOT ${escapeHtml(row.number || '—')} · ${escapeHtml(row.title || '未命名')}</b><small>${escapeHtml(formatProjectEdited(row.deleted_at, true))} 删除 · 还可恢复 ${remaining} 天</small></span><div class="config-row-actions"><button class="btn btn-secondary" data-trash-restore="${escapeHtml(row.id)}">恢复</button><button class="btn btn-danger" data-trash-purge="${escapeHtml(row.id)}">彻底删除</button></div></div>`;
    }).join('') : '<div class="empty-state">废纸篓为空</div>';
    $$('[data-trash-restore]', list).forEach(button => button.addEventListener('click', async () => {
      if (button.disabled || state.bundle?.project?.id !== projectId) return;
      button.disabled = true;
      try {
        if (!await flushProjectBeforeLeaving() || state.bundle?.project?.id !== projectId) return;
        const ids = [button.dataset.trashRestore];
        const result = await api(`/api/projects/${projectId}/trash/restore`, { method: 'POST', json: { shot_ids: ids } });
        if (state.bundle?.project?.id !== projectId) return;
        mergeRestoredShots(result, ids);
        renderProjectHeader(); renderCurrentView(); await openShotTrash(); toast('镜头已恢复');
      } catch (err) { toast(`恢复失败：${err.message}`, true); }
      finally { button.disabled = false; }
    }));
    $$('[data-trash-purge]', list).forEach(button => button.addEventListener('click', async () => {
      if (button.disabled || state.bundle?.project?.id !== projectId) return;
      button.disabled = true;
      try {
        const shot = rows.find(row => row.id === button.dataset.trashPurge);
        if (!shot) return;
        const shotLabel = `SHOT ${shot.number || '—'} · ${shot.title || '未命名'}`;
        if (!await confirmAction('彻底删除镜头', `将废纸篓中的 ${shotLabel} 永久删除。此操作不可撤销。`)) return;
        if (state.bundle?.project?.id !== projectId) return;
        await api(`/api/projects/${projectId}/trash`, { method: 'DELETE', json: { shot_ids: [button.dataset.trashPurge] } });
        if (state.bundle?.project?.id === projectId) await openShotTrash();
        toast('镜头已彻底删除');
      } catch (err) { toast(`彻底删除失败：${err.message}`, true); }
      finally { button.disabled = false; }
    }));
  } catch (err) {
    if (emptyButton) { emptyButton.disabled = true; emptyButton.dataset.trashLoaded = 'false'; emptyButton.dataset.trashCount = ''; }
    list.innerHTML = `<div class="empty-state">${escapeHtml(err.message)}</div>`;
  }
}

$('#emptyShotTrashBtn')?.addEventListener('click', async () => {
  const projectId = state.bundle?.project?.id;
  const button = $('#emptyShotTrashBtn');
  if (!projectId || button.disabled || button.dataset.trashLoaded !== 'true') return;
  const trashCount = Number(button.dataset.trashCount || 0);
  if (!trashCount) return;
  button.disabled = true;
  try {
    if (!await confirmAction('清空镜头废纸篓', `将永久删除当前项目废纸篓中的 ${trashCount} 个镜头及不再引用的媒体，无法恢复。`)) return;
    if (state.bundle?.project?.id !== projectId) return;
    await api(`/api/projects/${projectId}/trash`, { method: 'DELETE', json: {} });
    if (state.bundle?.project?.id === projectId) await openShotTrash();
    toast('废纸篓已清空');
  }
  catch (err) { toast(err.message, true); }
  finally { button.disabled = button.dataset.trashLoaded !== 'true' || Number(button.dataset.trashCount || 0) === 0; }
});
$('#projectSettingsBtn')?.addEventListener('click', () => openProjectSettings());
$('#currentProjName')?.addEventListener('click', () => openProjectSettings());
$('#projectSettingsForm')?.addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const projectId = form.dataset.projectId;
  if (!projectId) return;
  const submit = form.querySelector('[type="submit"]');
  if (submit.disabled) return;
  const values = Object.fromEntries(new FormData(form));
  values.fps = Number(values.fps);
  values.target_seconds = Number(values.target_seconds);
  submit.disabled = true;
  submit.textContent = '保存中…';
  try {
    if (state.bundle?.project?.id === projectId && !await flushProjectBeforeLeaving()) return;
    const updatedBundle = await api(`/api/projects/${encodeURIComponent(projectId)}`, { method: 'PUT', json: values });
    const summary = { ...updatedBundle.project, shot_count: updatedBundle.shots?.length || 0, total_frames: (updatedBundle.shots || []).reduce((sum, shot) => sum + Number(shot.duration_frames || 0), 0) };
    const projectIndex = state.projects.findIndex(item => item.id === projectId);
    if (projectIndex >= 0) state.projects[projectIndex] = { ...state.projects[projectIndex], ...summary };
    else state.projects.unshift(summary);
    if (state.bundle?.project?.id === projectId) {
      // Settings affect project metadata only. Never replace newer local
      // shot edits with the snapshot returned by this independent request.
      state.bundle.project = updatedBundle.project;
      syncDerivedTimeline();
      renderProjectHeader();
      renderCurrentView();
      renderInspector();
    } else renderProjectsGrid();
    $('#projectSettingsModal')?.close();
    toast('项目设置已保存');
  } catch (err) {
    toast(`保存失败：${err.message}`, true);
  } finally {
    submit.disabled = false;
    submit.textContent = '保存设置';
  }
});
document.addEventListener('pointerdown', event => {
  if (!event.target.closest('.project-collaboration-bar, #projectQuickMenu')) {
    $('#projectActivityPanel')?.classList.add('hidden');
    $('#projectQuickMenu')?.classList.add('hidden');
    $('#projectLastEdited')?.setAttribute('aria-expanded', 'false');
    $('#projectMoreBtn')?.setAttribute('aria-expanded', 'false');
  }
});
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  const menu = $('#projectQuickMenu');
  if (!menu || menu.classList.contains('hidden')) return;
  menu.classList.add('hidden');
  $('#projectMoreBtn')?.setAttribute('aria-expanded', 'false');
  $('#projectMoreBtn')?.focus();
});

$('#genShareBtn')?.addEventListener('click', async () => {
  if (!state.bundle) return;
  const button = $('#genShareBtn');
  if (button?.disabled) return;
  if (button) { button.disabled = true; button.textContent = '正在生成链接…'; }
  try {
    if (!await flushProjectBeforeLeaving()) return;
    const res = await api(`/api/projects/${state.bundle.project.id}/share`, {
      method: 'POST',
      json: {
        is_permanent: true,
        allow_download: true,
        password: $('#sharePasswordInput')?.value || '',
        view_config: {
          visible_columns: [...visiblePresentationFields(), ...(!isColumnHidden('thumb') && !isColumnArchived('thumb') && !isColumnPurged('thumb') ? ['thumb'] : [])],
          column_order: currentColumnOrder()
        }
      }
    });
    state.bundle.project.share_token = res.token;
    renderShareDialog();
    const input = $('#shareUrlInput');
    if (input) {
      await navigator.clipboard?.writeText(input.value);
      toast('审片链接已生成并复制');
    }
  } catch (err) {
    toast(err.message, true);
  } finally {
    if (button) { button.disabled = false; button.textContent = '生成分享链接'; }
  }
});

$('#revokeShareBtn')?.addEventListener('click', async () => {
  if (!state.bundle || !await confirmAction('撤销审片链接', '撤销后旧链接将立即失效，确定继续吗？')) return;
  try {
    await api(`/api/projects/${state.bundle.project.id}/share`, { method: 'DELETE' });
    state.bundle.project.share_token = null;
    renderShareDialog();
    toast('审片链接已撤销');
  } catch (err) {
    toast(err.message, true);
  }
});

async function loadShareView(token) {
  const root = $('#shareView');
  if (!root) return;
  state.shareViewToken = token;
  try {
    const data = await api(`/api/shares/${token}`);
    const b = data.bundle;
    const p = b.project;

    root.innerHTML = `
      <div class="share-review-page">
        <header class="share-review-header">
          <div>
            <h1 class="page-title">${escapeHtml(p.name)}</h1>
            <div class="proj-meta-text" style="margin-top:4px;">
              <span>${p.fps} fps</span> · <span>${p.aspect_ratio}</span> · <span>${b.shots.length} 个镜头</span>
            </div>
          </div>
          ${data.share.allow_download ? `<a class="btn btn-primary" href="/api/shares/${token}/download"><svg class="g-icon"><use href="#icon-download"></use></svg> 下载完整项目包</a>` : ''}
        </header>
        <div id="shareCardsGrid" class="share-review-grid"></div>
        <nav id="sharePagination" class="share-pagination" aria-label="审片分页"></nav>
      </div>
    `;

    const grid = $('#shareCardsGrid');
    const shareValue = value => String(value ?? '').trim() || 'xx未填写';
    const shareColumns = new Set(b.share_view?.visible_columns || []);
    const shareHas = field => !shareColumns.size || shareColumns.has(field);
    const shareColumnLabel = field => field.startsWith('custom:') ? (b.custom_fields || []).find(item => item.key === field.slice(7))?.label || field.slice(7) : tableColumnLabel(field);
    const shareFieldValue = (shot, field) => {
      if (field.startsWith('custom:')) return customFieldValue(shot, field.slice(7));
      if (field === 'tc') return `${shot.tc_in || '00:00:00:00'} / ${shot.tc_out || '00:00:00:00'}`;
      if (field === 'duration') return `${shot.duration_seconds || ''}s / ${shot.duration_frames || ''}f`;
      if (field === 'methods') return methodValues(shot).map(methodLabel).join(' · ');
      return shot[field];
    };
    const shareSpecialFields = new Set(['number', 'title', 'duration', 'shot_size', 'movement', 'lens', 'angle', 'description', 'voiceover', 'methods', 'status']);
    const shareExtraFields = () => [...shareColumns].filter(field => !shareSpecialFields.has(field) && !field.startsWith('custom:') && field !== 'thumb' && field !== 'select' && field !== 'actions');
    const pageSize = 9;
    let page = 0;
    const renderSharePage = () => {
      grid.innerHTML = '';
      const pageCount = Math.max(1, Math.ceil(b.shots.length / pageSize));
      const pageShots = b.shots.slice(page * pageSize, (page + 1) * pageSize);
      pageShots.forEach(shot => {
      const card = document.createElement('div');
      card.className = 'shot-card share-review-card';
      const m = getShotPrimaryMedia(shot);
      const statusClass = (shot.status || 'Draft').toLowerCase().replace(/\s+/g, '');
      card.innerHTML = `
        <div class="shot-card-header">
          <span class="shot-number tnum">SHOT ${shot.number}</span>
          <span class="timecode tnum">${shot.tc_in || '00:00:00:00'}</span>
        </div>
        <div class="storyboard-media">
          ${m ? `<img src="${m}" loading="lazy" decoding="async" alt="SHOT ${escapeHtml(shot.number)} 分镜画面">` : `<span style="font-size:11px;color:var(--text-muted);">SHOT ${shot.number}</span>`}
        </div>
        <div class="shot-card-body">
          <div class="card-title-row">
            <span>${escapeHtml(shot.title || '未命名')}</span>
            <span class="tnum" style="font-size:11px;color:var(--text-muted);">${shot.duration_seconds}s</span>
          </div>
          ${['shot_size', 'movement', 'lens', 'angle'].some(shareHas) ? `<div class="share-camera-meta">${[['shot_size', shot.shot_size], ['movement', shot.movement], ['lens', shot.lens], ['angle', shot.angle]].filter(([field]) => shareHas(field)).map(([, value]) => escapeHtml(shareValue(value))).join(' · ')}</div>` : ''}
          ${shareHas('description') ? `<section class="share-full-copy"><span>画面描述</span><p>${formattedShotField(shot,'description','暂无描述')}</p></section>` : ''}
          ${shareHas('voiceover') ? `<section class="share-full-copy is-voiceover"><span>对应旁白</span><p>${formattedShotField(shot,'voiceover','暂无旁白')}</p></section>` : ''}
          ${shareExtraFields().map(field => `<section class="share-full-copy"><span>${escapeHtml(shareColumnLabel(field))}</span><p>${escapeHtml(shareValue(shareFieldValue(shot, field)))}</p></section>`).join('')}
          ${[...shareColumns].filter(field => field.startsWith('custom:')).map(field => `<section class="share-full-copy"><span>${escapeHtml(shareColumnLabel(field))}</span><p>${escapeHtml(String(customFieldValue(shot, field.slice(7)) || '—'))}</p></section>`).join('')}
          ${(shareHas('status') || shareHas('methods')) ? `<div class="share-card-footer">${shareHas('status') ? `<span class="status-dot-label ${statusClass}">${escapeHtml(STATUS_LABELS[shot.status] || shot.status || '草稿')}</span>` : ''}${shareHas('methods') ? `<span class="method-tag">${escapeHtml(shareValue(methodValues(shot).map(methodLabel).join(' · ')))}</span>` : ''}</div>` : ''}
        </div>
      `;
      grid.append(card);
      });
      const pagination = $('#sharePagination');
      if (pagination) {
        pagination.innerHTML = `<button type="button" class="btn btn-ghost" data-share-page="prev" ${page === 0 ? 'disabled' : ''}>上一页</button><span>第 ${page + 1} / ${pageCount} 页 · ${pageShots.length} 镜</span><button type="button" class="btn btn-ghost" data-share-page="next" ${page >= pageCount - 1 ? 'disabled' : ''}>下一页</button>`;
        pagination.querySelector('[data-share-page="prev"]')?.addEventListener('click', () => { page -= 1; renderSharePage(); root.scrollTo({ top: 0, behavior: 'smooth' }); });
        pagination.querySelector('[data-share-page="next"]')?.addEventListener('click', () => { page += 1; renderSharePage(); root.scrollTo({ top: 0, behavior: 'smooth' }); });
      }
    };
    renderSharePage();
  } catch (err) {
    if (err.status === 401 && err.payload?.password_required) {
      root.innerHTML = `<form id="sharePasswordForm" class="share-password-gate"><h2>此审片链接需要密码</h2><p>请输入发布者提供的访问密码。</p><input name="password" type="password" autocomplete="current-password" required autofocus><button class="btn btn-primary" type="submit">验证并查看</button></form>`;
      $('#sharePasswordForm')?.addEventListener('submit', async event => {
        event.preventDefault();
        const password = new FormData(event.currentTarget).get('password');
        try {
          await api(`/api/shares/${token}/access`, { method: 'POST', json: { password } });
          await loadShareView(token);
        } catch (accessErr) {
          toast(accessErr.message, true);
        }
      });
      return;
    }
    root.innerHTML = `
      <div style="padding:60px 20px;text-align:center;">
        <h2>审片链接不可用</h2>
        <p style="color:var(--danger);">${escapeHtml(err.message)}</p>
      </div>
    `;
  }
}

// --------------------------------------------------------------------------
// 18. OTHER AUXILIARY VIEWS
// --------------------------------------------------------------------------
function renderOverviewView() {
  const c = $('#overviewContainer');
  if (!c || !state.bundle) return;
  const shots = state.bundle.shots || [];
  const hasMethod = (shot, method) => methodValues(shot).includes(method);
  const live = shots.filter(s => hasMethod(s, 'LIVE'));
  const stock = shots.filter(s => hasMethod(s, 'STOCK'));
  const ae = shots.filter(s => hasMethod(s, 'AE'));
  const vfx = shots.filter(s => hasMethod(s, 'VFX'));

  c.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(200px, 1fr));gap:12px;padding:16px;">
      <div style="background:var(--bg-surface-1);padding:14px;border-radius:6px;border:1px solid var(--border-subtle);">
        <div style="font-size:24px;font-weight:700;" class="tnum">${shots.length}</div>
        <div style="font-size:12px;color:var(--text-muted);">总镜头数</div>
      </div>
      <div style="background:var(--bg-surface-1);padding:14px;border-radius:6px;border:1px solid var(--border-subtle);">
        <div style="font-size:24px;font-weight:700;" class="tnum">${live.length}</div>
        <div style="font-size:12px;color:var(--text-muted);">LIVE 实拍镜头</div>
      </div>
      <div style="background:var(--bg-surface-1);padding:14px;border-radius:6px;border:1px solid var(--border-subtle);">
        <div style="font-size:24px;font-weight:700;" class="tnum">${stock.length}</div>
        <div style="font-size:12px;color:var(--text-muted);">STOCK 素材采购</div>
      </div>
      <div style="background:var(--bg-surface-1);padding:14px;border-radius:6px;border:1px solid var(--border-subtle);">
        <div style="font-size:24px;font-weight:700;" class="tnum">${ae.length + vfx.length}</div>
        <div style="font-size:12px;color:var(--text-muted);">后期与特效制作</div>
      </div>
    </div>
  `;
}

function renderScriptView() {
  const c = $('#scriptContainer');
  if (!c || !state.bundle) return;
  const shots = filterShots(state.bundle.shots);
  const voChars = shots.reduce((total, shot) => total + String(shot.voiceover || '').length, 0);
  c.innerHTML = `
    <div class="script-view-head">
      <div><h3>旁白与时间对齐</h3><p>${shots.length} 个镜头 · ${voChars} 字 · 修改旁白后可手动保存或重新自动计时</p></div>
      <label class="toolbar-compact-control" title="改变自动计时结果的旁白语速">语速<select id="projectNarrationSpeed" aria-label="项目自动计时语速">${NARRATION_SPEED_OPTIONS.map(speed => `<option value="${speed}" ${normalizeNarrationSpeed(state.narrationSpeed) === speed ? 'selected' : ''}>${speed}×${speed === 1 ? ' 标准' : ''}</option>`).join('')}</select></label>
      <button class="btn btn-secondary" data-action="auto-timing">重新自动计时</button>
    </div>
    <div class="script-list">
      ${shots.map(shot => `
        <article class="script-row ${shot.id === state.selection.activeShotId ? 'is-selected' : ''}" data-shot-id="${shot.id}" data-context-shot-id="${shot.id}" tabindex="0" aria-haspopup="menu">
          <div class="script-row-meta"><b>SHOT ${escapeHtml(shot.number)}</b><span>${escapeHtml(shot.tc_in || '')} · ${shot.duration_seconds || 0}s</span></div>
          <div class="script-row-title">${escapeHtml(shot.title || '未命名镜头')}</div>
          <button type="button" class="script-voiceover" data-rich-voiceover="${escapeHtml(shot.id)}" aria-label="编辑 SHOT ${escapeHtml(shot.number)} 旁白及格式">${formattedShotField(shot,'voiceover','点击输入旁白…')}</button>
        </article>
      `).join('')}
    </div>
  `;
  c.querySelector('#projectNarrationSpeed')?.addEventListener('change', event => {
    state.narrationSpeed = normalizeNarrationSpeed(event.target.value);
  });
  c.querySelectorAll('[data-rich-voiceover]').forEach(button => button.addEventListener('click', () => {
    const shot = state.bundle.shots.find(s => s.id === button.dataset.richVoiceover);
    if (shot) openRichShotEditor(shot, 'voiceover', button);
  }));
  const activateScriptRow = row => {
    if (!row) return;
    state.selection.activeShotId = row.dataset.shotId;
    $$('.script-row', c).forEach(item => item.classList.toggle('is-selected', item === row));
    queuePresenceHeartbeat(true);
  };
  $$('.script-row', c).forEach(row => {
    row.addEventListener('pointerdown', () => activateScriptRow(row));
    row.addEventListener('focusin', () => activateScriptRow(row));
  });
  c.querySelector('[data-action="auto-timing"]')?.addEventListener('click', runProjectAutoTiming);
}

function renderAssetsView() {
  const c = $('#assetsContainer');
  if (!c || !state.bundle) return;
  c._assetsCleanup?.();

  const assets = state.bundle.assets || [];
  const projectId = state.bundle.project.id;
  const cleanups = [];
  let disposed = false;
  cleanups.push(() => { disposed = true; });
  c._assetsCleanup = () => cleanups.forEach(cleanup => cleanup());

  // Panel count is useful context, but only the server's cleanup preview can
  // decide whether a file is actually safe to remove.
  const usage = new Map();
  (state.bundle.shots || []).forEach(shot => {
    new Set((shot.panels || []).map(panel => String(panel.media_id || '')).filter(Boolean))
      .forEach(id => usage.set(id, (usage.get(id) || 0) + 1));
  });
  let unusedCount = 0;

  c.innerHTML = `
    <section class="assets-v75" aria-label="素材资产库">
      <header class="assets-v75-head">
        <div><h3>素材资产库</h3><span data-assets-count>${assets.length} 个素材</span></div>
        <aside class="assets-v75-tools">
          <button type="button" class="btn btn-ghost assets-v75-clean-unused" data-assets-clean-unused disabled title="核对素材引用后显示可清理数量">
            正在核对可清理素材…
          </button>
          <label class="assets-v75-search"><span>搜索</span><input type="search" placeholder="搜索素材名称…" aria-label="搜索素材名称"></label>
        </aside>
      </header>
      <nav class="assets-v75-filters" aria-label="素材类型">${[['all','全部素材'],['unused','未使用'],['image','图片'],['video','视频'],['file','其他文件']].map(([value,label]) => `<button type="button" data-assets-kind="${value}" aria-pressed="${value === 'all'}" ${value === 'unused' ? 'disabled' : ''}>${label}</button>`).join('')}</nav>
      <p class="assets-v75-no-results" role="status" hidden>没有匹配的素材，试试其他名称或类型。</p>
      ${assets.length ? '<div class="assets-v75-grid"></div>' : `<div class="assets-v75-empty">
        <div class="assets-v75-empty-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2.5"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg></div>
        <h4>暂无素材</h4>
        <p>在镜头详情中上传分镜画面后，素材会显示在这里。</p>
        <p class="assets-v75-empty-hint">支持图片与视频文件</p>
      </div>`}
    </section>
  `;

  const observer = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        observer.unobserve(entry.target);
        entry.target._loadAsset?.();
      }
    });
  }, { rootMargin: '240px' }) : null;
  cleanups.push(() => observer?.disconnect());

  const fragment = document.createDocumentFragment();
  const entries = [];

  assets.forEach(asset => {
    const filename = asset.filename || '未命名文件';
    const mime = String(asset.mime || '').toLowerCase();
    const kind = mime.startsWith('image/') ? 'image' : mime.startsWith('video/') ? 'video' : 'file';
    const url = getMediaUrl(asset.id) || '';
    const count = usage.get(String(asset.id)) || 0;
    const unused = false;
    const tile = document.createElement('article');
    tile.className = `assets-v75-tile${unused ? ' is-unused' : ''}`;
    tile.dataset.assetId = String(asset.id || '');
    entries.push({ tile, kind, name: filename.toLocaleLowerCase(), unused, assetId: String(asset.id), count, size: asset.size || 0 });

    tile.innerHTML = `
      <div class="assets-v75-preview"><div class="assets-v75-media"></div>
        <div class="assets-v75-status" role="status" aria-live="polite"></div>
      </div>
      <h4 class="assets-v75-name" title="${escapeHtml(filename)}">${escapeHtml(filename)}</h4>
      <p class="assets-v75-meta">${kind === 'image' ? '图片' : kind === 'video' ? '视频' : '文件'} · ${count ? `${count} 个镜头引用` : '正在核对引用'} · ${escapeHtml(formatBytes(asset.size || 0))}</p>
      <div class="assets-v75-actions">
        ${url ? `${kind === 'video' ? '<button type="button" class="btn btn-ghost" data-asset-play>播放</button>' : ''}<a class="btn btn-ghost" href="${escapeHtml(url)}" target="_blank" rel="noopener" aria-label="查看原文件：${escapeHtml(filename)}">查看原文件</a><a class="btn btn-ghost" href="${escapeHtml(url)}" download="${escapeHtml(filename)}" aria-label="下载：${escapeHtml(filename)}">下载</a>` : '<span class="assets-v75-unavailable">缺少文件地址，无法下载</span>'}
        <button type="button" class="btn btn-ghost" data-asset-retry hidden>重试</button>
      </div>`;

    tile.querySelector('.assets-v75-preview').append(tile.querySelector('.assets-v75-actions'));
    const host = tile.querySelector('.assets-v75-media');
    const status = tile.querySelector('.assets-v75-status');
    const retry = tile.querySelector('[data-asset-retry]');
    const play = tile.querySelector('[data-asset-play]');
    let media = null;
    let timer;
    let attempt = 0;

    const setStatus = (value, message) => {
      tile.dataset.mediaState = value;
      host.setAttribute('aria-busy', String(value === 'loading'));
      status.textContent = message;
      status.hidden = value === 'loaded';
      retry.hidden = value !== 'error' && !(value === 'unsupported' && kind === 'video');
    };

    const disposeMedia = () => {
      clearTimeout(timer);
      if (media) {
        media.onload = media.onerror = media.onloadeddata = null;
        media.removeAttribute('src');
        if (kind === 'video') media.load();
        media.remove();
        media = null;
      }
    };
    cleanups.push(disposeMedia);

    const load = (isRetry = false) => {
      disposeMedia();
      setStatus('loading', '正在加载预览');
      media = document.createElement(kind === 'video' ? 'video' : 'img');
      if (kind === 'video') {
        media.muted = true;
        media.playsInline = true;
        media.preload = 'auto';
        media.setAttribute('aria-label', filename);
      } else {
        media.alt = filename;
        media.decoding = 'async';
      }
      const fail = () => {
        clearTimeout(timer);
        const unsupported = kind === 'video' && media?.error?.code === 4;
        setStatus(unsupported ? 'unsupported' : 'error', unsupported ? '浏览器不支持此视频格式' : '无法加载缩略图');
      };
      const loaded = () => {
        if (kind === 'image' ? !media.naturalWidth : !media.videoWidth) return fail();
        clearTimeout(timer);
        setStatus('loaded', '');
        if (isRetry) tile.querySelectorAll('a').forEach(link => { link.href = media.src; });
      };
      media.onerror = fail;
      if (kind === 'video') media.onloadeddata = loaded;
      else media.onload = loaded;
      let source = url;
      if (isRetry) {
        // Retry expired object URLs against the authenticated media endpoint.
        source = url.startsWith('blob:') ? `/media/${encodeURIComponent(asset.id)}${state.shareViewToken ? `?share=${encodeURIComponent(state.shareViewToken)}` : ''}` : url;
        if (!source.startsWith('data:') && !source.startsWith('blob:')) {
          const fresh = new URL(source, window.location.href);
          fresh.searchParams.set('_retry', `${Date.now()}-${++attempt}`);
          source = fresh.href;
        }
      }
      host.appendChild(media);
      timer = setTimeout(fail, 20000);
      media.src = source;
    };

    retry.addEventListener('click', () => {
      load(true);
      tile.querySelector('a')?.focus({ preventScroll: true });
    });
    play?.addEventListener('click', async () => {
      if (!media || kind !== 'video') return;
      if (media.paused) { await media.play().catch(() => {}); play.textContent = '暂停'; }
      else { media.pause(); play.textContent = '播放'; }
    });

    if (!url) setStatus('missing', '缺少原文件');
    else if (kind === 'file') setStatus('unsupported', '此格式不支持缩略图');
    else {
      setStatus('loading', '正在加载预览');
      tile._loadAsset = () => load();
      if (observer) observer.observe(tile);
      else load();
    }
    fragment.appendChild(tile);
  });

  c.querySelector('.assets-v75-grid')?.appendChild(fragment);

  let activeKind = 'all';
  const search = c.querySelector('.assets-v75-search input');
  const applyFilter = () => {
    const query = search.value.trim().toLocaleLowerCase();
    let visible = 0;
    entries.forEach(({ tile, kind, name, unused }) => {
      const categoryMatch =
        activeKind === 'all' ||
        (activeKind === 'unused' ? unused : kind === activeKind);
      tile.hidden = !categoryMatch || !name.includes(query);
      if (!tile.hidden) visible++;
    });
    c.querySelector('[data-assets-count]').textContent = `${visible} / ${assets.length} 个素材`;
    c.querySelector('.assets-v75-no-results').hidden = visible > 0 || !assets.length;
  };

  search.addEventListener('input', applyFilter);
  c.querySelectorAll('[data-assets-kind]').forEach(button => button.addEventListener('click', () => {
    activeKind = button.dataset.assetsKind;
    c.querySelectorAll('[data-assets-kind]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    applyFilter();
  }));

  const reasonNames = {
    panel:'镜头画面', shot_link:'镜头关联', production_step:'制作步骤',
    creative_board:'画板', shot_version:'镜头版本', project_snapshot:'项目快照',
    asset_metadata:'其它素材', active_share:'有效分享'
  };
  const applyCleanupPreview = preview => {
    if (disposed || state.bundle?.project?.id !== projectId) return;
    const deletable = new Set((preview.deletable || []).map(item => String(item.id)));
    const protectedById = new Map((preview.protected || []).map(item => [String(item.id), item.reasons || []]));
    unusedCount = Number(preview.deletable_count) || 0;
    const button = c.querySelector('[data-assets-clean-unused]');
    if (button) {
      button.disabled = unusedCount === 0;
      button.innerHTML = `清理未使用素材${unusedCount ? ` <span>${unusedCount}</span>` : ''}`;
      button.title = `${unusedCount} 个素材经服务端核对可清理`;
    }
    c.querySelector('[data-assets-kind="unused"]')?.removeAttribute('disabled');
    entries.forEach(entry => {
      entry.unused = deletable.has(entry.assetId);
      entry.tile.classList.toggle('is-unused', entry.unused);
      const status = entry.count ? `${entry.count} 个镜头引用` : entry.unused
        ? '可清理' : (protectedById.get(entry.assetId) || []).map(code => reasonNames[code] || code).join('、') || '受保护';
      const meta = entry.tile.querySelector('.assets-v75-meta');
      if (meta) meta.textContent = `${entry.kind === 'image' ? '图片' : entry.kind === 'video' ? '视频' : '文件'} · ${status} · ${formatBytes(entry.size)}`;
      const badge = entry.tile.querySelector('.assets-v75-unused-badge');
      if (entry.unused && !badge) {
        const label = document.createElement('span');
        label.className = 'assets-v75-unused-badge';
        label.textContent = '未使用';
        entry.tile.querySelector('.assets-v75-preview')?.append(label);
      } else if (!entry.unused) badge?.remove();
    });
    applyFilter();
  };

  api(`/api/projects/${encodeURIComponent(projectId)}/assets/unused/preview`)
    .then(applyCleanupPreview)
    .catch(error => {
      if (disposed) return;
      const button = c.querySelector('[data-assets-clean-unused]');
      if (button) button.textContent = '无法核对可清理素材';
      console.warn('素材清理预览失败', error);
    });

  c.querySelector('[data-assets-clean-unused]')?.addEventListener('click', async event => {
    const button = event.currentTarget;
    if (!unusedCount || button.disabled) return;
    const originalText = button.innerHTML;
    button.disabled = true;
    button.textContent = '正在重新核对…';

    try {
      const latest = await api(`/api/projects/${encodeURIComponent(projectId)}/assets/unused/preview`);
      applyCleanupPreview(latest);
      if (state.bundle?.project?.id !== projectId || disposed) return;
      const latestCount = Number(latest.deletable_count) || 0;
      if (!latestCount) { toast('没有可清理的素材'); return; }
      button.disabled = true;
      const confirmed = await confirmAction(
        '清理未使用素材',
        `服务端确认有 ${latestCount} 个素材未被镜头、制作步骤、画板、版本、快照、其它素材或有效分享使用。将永久删除这些素材文件，此操作不能撤销。`
      );
      if (!confirmed) { button.disabled = false; return; }
      button.textContent = '正在清理…';
      const result = await api(`/api/projects/${encodeURIComponent(projectId)}/assets/unused`, { method: 'DELETE' });
      if (state.bundle?.project?.id === projectId) {
        state.bundle = adoptServerBundle(await api(`/api/projects/${encodeURIComponent(projectId)}`));
        renderCurrentView();
      }
      const freed = result?.bytes_freed ? `，释放 ${formatBytes(result.bytes_freed)}` : '';
      const protectedText = result?.protected ? `；${result.protected} 个因仍有版本/分享等引用而保留` : '';
      toast(`已删除 ${result?.deleted || 0} 个未使用素材${freed}${protectedText}`);
    } catch (err) {
      if (!disposed && button.isConnected) {
        button.disabled = unusedCount === 0;
        button.innerHTML = originalText;
      }
      toast(`清理失败：${err.message}`, true);
    }
  });
}

const COMMENT_REFERENCE_LABELS = {
  description: '画面描述',
  voiceover: '对应旁白',
  title: '镜头标题'
};

function reviewActivityScore(shot) {
  const comments = shot.comments || [];
  const unresolved = comments.filter(comment => !comment.is_resolved).length;
  const changed = Number(shot.change_count || 0);
  const inReview = !['', 'Draft'].includes(String(shot.status || 'Draft'));
  return unresolved * 1000 + comments.length * 100 + changed * 10 + (inReview ? 1 : 0);
}

function reviewOrderedShots(shots) {
  return shots.map((shot, index) => ({ shot, index, score: reviewActivityScore(shot) }))
    .sort((left, right) => right.score - left.score || String(right.shot.last_change_at || right.shot.updated_at || '').localeCompare(String(left.shot.last_change_at || left.shot.updated_at || '')) || left.index - right.index)
    .map(item => item.shot);
}

function commentReferenceCandidates(shot) {
  return [
    ['description', shot.description],
    ['voiceover', shot.voiceover],
    ['title', shot.title]
  ].filter(([, value]) => String(value || '').trim()).map(([field, value]) => ({ field, text: String(value).trim(), label: COMMENT_REFERENCE_LABELS[field] }));
}

function mergeShotPatch(shot, patch) {
  if (!shot || !patch) return shot;
  const attached = { comments: shot.comments, versions: shot.versions, panels: shot.panels, steps: shot.steps, assets: shot.assets, custom_fields: shot.custom_fields };
  Object.assign(shot, normalizeShotRecord({ ...shot, ...patch }), attached);
  return shot;
}

function acknowledgePartialReviewShot(shot, response) {
  // /api/shots/{id} returns a partial Shot without panels/custom fields. Keep
  // their baselines and the earlier base revision so a later bulk edit still
  // checks concurrent changes that happened before this status-only ACK.
  const remote = normalizeShotRecord(response);
  const baseline = shot._syncBaseline || {};
  COLLAB_SYNC_FIELDS.forEach(field => {
    if (!Object.hasOwn(remote, field)) return;
    if (JSON.stringify(shot[field]) === JSON.stringify(baseline[field])) {
      shot[field] = structuredClone(remote[field]);
    }
    baseline[field] = structuredClone(remote[field]);
  });
  shot.revision = remote.revision;
  shot.updated_at = remote.updated_at;
  shot._syncBaseline = baseline;
}

async function refreshCompleteReviewBundle(projectId, shotId, minRevision, originalBaseline, acknowledgedStatus) {
  if (state.bundle?.project?.id !== projectId || hasDirtyActiveEditor()) return false;
  try {
    const latest = await api(`/api/projects/${encodeURIComponent(projectId)}`);
    if (state.bundle?.project?.id !== projectId || hasDirtyActiveEditor()) return false;
    const remote = latest?.shots?.find(item => item.id === shotId);
    const local = state.bundle.shots.find(item => item.id === shotId);
    if (!remote || !local || Number(remote.revision) < Number(minRevision)) return false;
    const complete = adoptServerBundle({ shots: [remote] }).shots[0];
    const fields = [...COLLAB_SYNC_FIELDS, 'custom_fields', 'panels', 'import_columns'];
    const changedLocally = field => JSON.stringify(local[field]) !== JSON.stringify(
      field === 'status' ? acknowledgedStatus : originalBaseline[field]);
    const conflict = fields.some(field => changedLocally(field) &&
      JSON.stringify(complete[field]) !== JSON.stringify(
        field === 'status' ? acknowledgedStatus : originalBaseline[field]) &&
      JSON.stringify(local[field]) !== JSON.stringify(complete[field]));
    if (conflict) return false;
    fields.forEach(field => {
      if (!changedLocally(field)) local[field] = structuredClone(complete[field]);
    });
    local.revision = complete.revision;
    local.updated_at = complete.updated_at;
    local._syncBaseline = complete._syncBaseline;
    state.bundle.project.updated_at = latest.project?.updated_at || state.bundle.project.updated_at;
    state.lastServerUpdatedAt = latest.project?.updated_at || state.lastServerUpdatedAt;
    return true;
  } catch (_) {
    return false;
  }
}

function renderReviewView() {
  const c = $('#reviewContainer');
  if (!c || !state.bundle) return;
  const reviewScroll = c.dataset.scrollProject === state.bundle.project.id
    ? ['.review-shot-strip-scroll','.review-viewer','.review-side'].map(selector=>[selector,c.querySelector(selector)?.scrollTop||0]) : [];
  c.dataset.scrollProject=state.bundle.project.id;
  const shots = state.bundle.shots || [];
  const reviewShots = reviewOrderedShots(shots);
  const reviewShotGroups = [
    { key: 'changed', label: '已修改', shots: reviewShots.filter(shot => reviewActivityScore(shot) > 0) },
    { key: 'unchanged', label: '未修改', shots: reviewShots.filter(shot => reviewActivityScore(shot) === 0) }
  ].filter(group => group.shots.length);
  const activeShot = shots.find(shot => shot.id === state.selection.activeShotId) || shots[0];
  const activeId = activeShot?.id || '';
  if (!activeShot) {
    c.innerHTML = '<div class="empty-state">当前项目没有可审阅的镜头。</div>';
    return;
  }
  const comments = activeShot?.comments || [];
  const versions = activeShot?.versions || [];
  const tab = c.dataset.reviewTab || 'comments';
  const media = activeShot ? getShotPrimaryMedia(activeShot) : '';
  const selectedVersion = versions.find(version => version.id === c.dataset.reviewVersionId) || null;
  const priorSnapshot = versionSnapshot(selectedVersion);
  const changedFields = selectedVersion ? reviewChanges(activeShot, priorSnapshot).filter(item => item.changed) : [];
  const unresolvedComments = comments.filter(comment => !comment.is_resolved).length;
  const referenceCandidates = commentReferenceCandidates(activeShot);
  const requestedReference = c.dataset.commentReferenceField;
  const activeReference = referenceCandidates.find(item => item.field === requestedReference) || referenceCandidates[0] || { field: 'title', label: '镜头标题', text: activeShot.title || `SHOT ${activeShot.number}` };
  c.dataset.commentReferenceField = activeReference.field;
  if (!selectedVersion) delete c.dataset.reviewVersionId;

  const commentsPanel = `
    <div class="review-panel-summary"><span>${comments.length} 条评论</span><b>${unresolvedComments} 条待处理</b></div>
    <div class="comment-list">${comments.length ? comments.map((comment, index) => `
      <article class="comment-item ${comment.is_resolved ? 'is-resolved' : ''} ${comment._sync_state ? `is-${comment._sync_state}` : ''}" data-review-comment-id="${escapeHtml(comment.id)}">
        <div class="comment-item-head"><span class="comment-avatar">${commentInitial(comment)}</span><b>${escapeHtml(comment.author_name || '协作者')}</b><time>${escapeHtml(comment.timecode || comment.created_at || '')}</time></div>
        ${comment.quote_text ? `<div class="comment-reference"><span>${escapeHtml(COMMENT_REFERENCE_LABELS[comment.quote_field] || '自动引用')} · ${escapeHtml(comment.timecode || '')}</span><blockquote>${escapeHtml(comment.quote_text)}</blockquote></div>` : ''}
        <p>${escapeHtml(comment.text || '')}</p>
        ${comment._sync_state ? `<div class="comment-sync-state">${comment._sync_state === 'failed' ? '同步失败，请编辑后重试' : '正在后台同步…'}</div>` : ''}
        <div class="comment-actions">
          <button class="comment-resolve ${comment.is_resolved ? 'is-reopen' : 'is-primary-action'}" data-comment-id="${escapeHtml(comment.id)}" data-comment-resolved="${comment.is_resolved ? 'true' : 'false'}" ${comment._sync_state ? 'disabled' : ''}><svg class="g-icon"><use href="#icon-${comment.is_resolved ? 'undo' : 'check_circle'}"></use></svg>${comment.is_resolved ? '重新打开' : `解决批注 ${index + 1}`}</button>
          <button class="comment-edit" data-comment-edit="${escapeHtml(comment.id)}" ${comment._sync_state === 'syncing' ? 'disabled' : ''}><svg class="g-icon"><use href="#icon-edit"></use></svg>修改</button>
          <button class="comment-delete" data-comment-delete="${escapeHtml(comment.id)}"><svg class="g-icon"><use href="#icon-delete"></use></svg>删除</button>
        </div>
      </article>
    `).join('') : '<div class="empty-state compact">暂无评论</div>'}</div>
    <form id="commentForm" class="comment-form">
      <div class="comment-auto-reference">
        <div class="comment-reference-head"><span><svg class="g-icon"><use href="#icon-rate_review"></use></svg>自动引用当前镜头</span><small>SHOT ${escapeHtml(activeShot.number)} · ${escapeHtml(activeShot.tc_in || '')}</small></div>
        <div class="comment-reference-switch">${referenceCandidates.map(reference => `<button type="button" class="${reference.field === activeReference.field ? 'is-active' : ''}" data-comment-reference-field="${reference.field}">${escapeHtml(reference.label)}</button>`).join('')}</div>
        <blockquote data-comment-reference-quote>${escapeHtml(activeReference.text)}</blockquote>
      </div>
      <textarea name="text" required placeholder="像 Word 批注一样写下修改意见…"></textarea>
      <div class="comment-submit-row"><span class="comment-submit-status" aria-live="polite">提交后自动绑定镜头与时码</span><button class="btn btn-primary" type="submit"><span>添加评论</span></button></div>
    </form>
  `;

  const versionsPanel = `
    <div class="review-panel-summary"><span>${versions.length} 个历史快照</span><b>当前稿实时更新</b></div>
    <div class="version-list">${versions.length ? versions.map(version => `
      <article class="version-item ${version.id === selectedVersion?.id ? 'is-selected' : ''}">
        <div class="version-item-copy"><b>${escapeHtml(version.version_num || '快照')}</b><span>${escapeHtml(version.name || '未命名版本')}</span><small>${escapeHtml(version.created_by || '—')} · ${escapeHtml(formatDateTime(version.created_at))}</small></div>
        <button type="button" class="btn btn-ghost version-compare-btn" data-review-version-id="${escapeHtml(version.id)}">与当前稿对比</button>
      </article>
    `).join('') : '<div class="empty-state compact">暂无版本快照。先保存一个快照，再继续修改即可形成对比。</div>'}</div>
    <button id="createVersionBtn" class="btn btn-secondary review-create-version">创建当前镜头快照</button>
  `;

  const comparePanel = selectedVersion ? `
    <div class="review-compare-toolbar">
      <span>${changedFields.length} 项变化 · ${escapeHtml(formatDateTime(selectedVersion.created_at))}</span>
      <button type="button" class="btn btn-secondary" data-restore-review-version="${escapeHtml(selectedVersion.id)}">回滚当前镜头到此版本</button>
    </div>
    <div class="review-before-after" aria-label="历史版本与当前稿对比">
      <section class="review-version-pane is-before"><header><span>BEFORE</span><b>${escapeHtml(selectedVersion.version_num || '快照')}</b></header><div class="review-before-version-wrap"><button type="button" class="review-version-scroll-btn" data-review-version-scroll="-1" aria-label="向左滚动版本" title="向左滚动版本"><svg class="g-icon"><use href="#icon-chevron_left"></use></svg></button><div class="review-before-version-strip" role="tablist" aria-label="选择 Before 版本">${versions.map(version => `<button type="button" class="review-before-version ${version.id === selectedVersion.id ? 'is-selected' : ''}" data-review-version-id="${escapeHtml(version.id)}" role="tab" aria-selected="${version.id === selectedVersion.id}"><b>${escapeHtml(version.version_num || '快照')}</b><span>${escapeHtml(version.name || '未命名')}</span><time>${escapeHtml(formatDateTime(version.created_at))}</time></button>`).join('')}</div><button type="button" class="review-version-scroll-btn" data-review-version-scroll="1" aria-label="向右滚动版本" title="向右滚动版本"><svg class="g-icon"><use href="#icon-chevron_right"></use></svg></button></div><h4>${escapeHtml(reviewFieldValue(priorSnapshot, 'title'))}</h4><p>${escapeHtml(reviewFieldValue(priorSnapshot, 'description'))}</p><blockquote>${escapeHtml(reviewFieldValue(priorSnapshot, 'voiceover'))}</blockquote></section>
      <section class="review-version-pane is-after"><header><span>AFTER</span><b>当前稿</b></header><h4>${escapeHtml(reviewFieldValue(activeShot, 'title'))}</h4><p>${escapeHtml(reviewFieldValue(activeShot, 'description'))}</p><blockquote>${escapeHtml(reviewFieldValue(activeShot, 'voiceover'))}</blockquote></section>
    </div>
    <div class="word-review-heading"><div><b>审阅标记</b><span>删除内容以红色删除线显示，新增内容以绿色下划线显示。</span></div><strong>${changedFields.length}</strong></div>
    ${renderTrackedChanges(activeShot, priorSnapshot)}
  ` : `
    <div class="review-empty-version"><b>还没有可对比的历史版本</b><p>创建当前镜头快照后再修改内容，系统会像 Word 审阅一样标出 Before / After 差异。</p><button type="button" class="btn btn-secondary" data-review-tab="versions">前往创建快照</button></div>
  `;

  const reviewProperties = [
    ['篇章 / Part', activeShot.chapter], ['场景 / 地点', activeShot.scene],
    ['景别', activeShot.shot_size], ['焦段', activeShot.lens],
    ['运镜', activeShot.movement], ['机位角度', activeShot.angle],
    ['制作方式', methodValues(activeShot).map(methodLabel).join(' · ')],
    ['责任部门', activeShot.department]
  ];
  shotExtendedEntries(activeShot).forEach(entry => {
    if (!reviewProperties.some(([label]) => label === entry[0])) reviewProperties.push(entry);
  });
  const reviewCardDetails = `
    <div class="review-card-head"><div><span>SHOT ${escapeHtml(activeShot.number || '')}</span><b>${escapeHtml(activeShot.title || '未命名镜头')}</b></div><div class="review-card-time"><strong class="tnum">${escapeHtml(activeShot.tc_in || '')}</strong><span class="tnum">${escapeHtml(activeShot.tc_out || '')} · ${escapeHtml(activeShot.duration_seconds || 0)}s / ${escapeHtml(activeShot.duration_frames || 0)}f</span></div></div>
    <dl class="review-card-properties">${reviewProperties.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(String(value || '—'))}</dd></div>`).join('')}</dl>
    <section class="review-card-copy"><span>画面描述</span><p>${escapeHtml(activeShot.description || '暂无画面描述')}</p></section>
    <section class="review-card-copy is-voiceover"><span>对应旁白</span><blockquote>${escapeHtml(activeShot.voiceover || '暂无旁白')}</blockquote></section>
  `;

  const currentStatus = String(activeShot.status || 'Draft');
  const statusClass = currentStatus.toLowerCase().replaceAll(' ', '-');
  const reviewFeedback = c.dataset.reviewFeedback || '';
  const reviewHistory = (activeShot.review_history || []).slice(0, 5);
  const reviewActions = currentStatus === 'Draft'
    ? [['Ready for Review', '提交修订', 'secondary']]
    : currentStatus === 'Ready for Review'
      ? [['Draft', '撤回修订', 'ghost']]
      : currentStatus === 'Changes Requested'
        ? [['Ready for Review', '重新提交修订', 'secondary']]
        : [];
  const reviewActionButtons = reviewActions.map(([status, label, tone]) => `<button class="btn btn-${tone}" data-review-status="${status}">${label}</button>`).join('');
  const selectedRevisionLabel = selectedVersion ? `REV · ${selectedVersion.version_num || selectedVersion.name || '所选修订'}` : '';
  const reviewDecisionButtons = currentStatus === 'Ready for Review' && selectedVersion
    ? `<div class="review-revision-target">审批对象：SHOT ${escapeHtml(activeShot.number || '—')} · ${escapeHtml(selectedRevisionLabel)}</div><div class="review-revision-actions"><button class="btn btn-primary" data-review-status="Approved" data-review-version-id="${escapeHtml(selectedVersion.id)}">同意 ${escapeHtml(selectedRevisionLabel)}</button><button class="btn btn-danger-ghost" data-review-status="Changes Requested" data-review-version-id="${escapeHtml(selectedVersion.id)}">驳回 ${escapeHtml(selectedRevisionLabel)}</button></div>`
    : currentStatus === 'Ready for Review'
      ? '<div class="review-revision-target is-unselected">先在“版本”中明确选择一条修订，再执行同意或驳回。</div>'
      : '';

  c.innerHTML = `
    <div class="review-head"><div><h3>审片与版本</h3><p>Before / After 历史对照 · Word 式审阅标记 · 悬浮批注</p></div><div class="review-head-actions"><span class="status-dot-label ${statusClass}">${escapeHtml(STATUS_LABELS[currentStatus] || currentStatus)}</span><span class="review-active-shot" aria-live="polite">当前 SHOT ${escapeHtml(activeShot.number || '')}</span></div></div>
    <div class="review-workspace">
      <aside class="review-shot-strip" aria-label="镜头条带"><div class="review-shot-strip-head"><b>镜头列表</b><span>${reviewShots.length} 镜 · 已修改 ${reviewShotGroups.find(group => group.key === 'changed')?.shots.length || 0}</span></div><div class="review-shot-strip-scroll">${reviewShotGroups.map(group => `<section class="review-shot-group review-shot-group-${group.key}"><h4><span>${group.label}</span><small>${group.shots.length}</small></h4>${group.shots.map(shot => { const thumb = getShotPrimaryMedia(shot); const pending = (shot.comments || []).filter(comment => !comment.is_resolved).length; const changed = Number(shot.change_count || 0); const active = shot.id === activeId; return `<button class="review-shot-chip ${active ? 'is-active' : ''} ${reviewActivityScore(shot) ? 'has-activity' : ''}" data-review-shot-id="${shot.id}" data-context-shot-id="${shot.id}" aria-haspopup="menu" aria-current="${active ? 'true' : 'false'}"><span class="review-chip-thumb">${thumb ? `<img src="${escapeHtml(thumb)}" loading="lazy" alt="">` : `<span>${escapeHtml(shot.number)}</span>`}</span><span class="review-chip-line"><b>${escapeHtml(shot.number)}</b><span class="review-chip-flags">${changed ? `<i title="${changed} 次修改">EDIT</i>` : ''}${pending ? `<em title="${pending} 条待处理评论">${pending}</em>` : ''}</span></span><small>${active ? '当前 · ' : ''}${escapeHtml(shot.duration_seconds || 0)}s</small></button>`; }).join('')}</section>`).join('')}</div><div class="review-shot-float-nav"><button type="button" class="btn-ghost-icon" data-review-shot-nav="prev" aria-label="上一个审阅镜头" title="上一个审阅镜头"><svg class="g-icon"><use href="#icon-chevron_left"></use></svg></button><button type="button" class="btn-ghost-icon" data-review-shot-nav="next" aria-label="下一个审阅镜头" title="下一个审阅镜头"><svg class="g-icon"><use href="#icon-chevron_right"></use></svg></button></div></aside>
      <section class="review-viewer" data-context-shot-id="${activeShot.id}" tabindex="0" aria-haspopup="menu"><div class="review-viewer-media">${media ? `<img src="${escapeHtml(media)}" alt="SHOT ${escapeHtml(activeShot.number || '')}">` : '<div class="review-empty-frame"><span>16:9</span><small>暂无分镜画面</small></div>'}</div>${renderHoverComments(comments)}<div class="review-viewer-caption">${reviewCardDetails}</div></section>
      <aside class="review-side">
        <section class="review-state-card"><div><span>当前审阅状态</span><b>${escapeHtml(STATUS_LABELS[currentStatus] || currentStatus)}</b></div><span class="review-state-orb ${statusClass}"><svg class="g-icon"><use href="#icon-${currentStatus === 'Approved' ? 'check_circle' : 'rate_review'}"></use></svg></span></section>
        <div class="review-decision">${reviewActionButtons}${reviewDecisionButtons}</div>
        ${reviewFeedback ? `<div class="review-feedback"><svg class="g-icon"><use href="#icon-check_circle"></use></svg><span>${escapeHtml(reviewFeedback)}</span></div>` : ''}
        ${reviewHistory.length ? `<details class="review-history"><summary>审阅记录（${activeShot.review_history.length}）</summary>${reviewHistory.map(item => `<div><b>${escapeHtml(item.action_label)}</b><span>${escapeHtml(item.created_by)} · ${escapeHtml(formatDateTime(item.created_at))}</span></div>`).join('')}</details>` : ''}
        <div class="review-tabs" role="tablist"><button class="${tab === 'comments' ? 'is-active' : ''}" data-review-tab="comments">评论 ${comments.length}</button><button class="${tab === 'versions' ? 'is-active' : ''}" data-review-tab="versions">版本 ${versions.length}</button><button class="${tab === 'compare' ? 'is-active' : ''}" data-review-tab="compare">Before / After</button></div><div class="review-tab-content">${tab === 'comments' ? commentsPanel : ''}${tab === 'versions' ? versionsPanel : ''}${tab === 'compare' ? comparePanel : ''}</div>
      </aside>
    </div>
  `;
  reviewScroll.forEach(([selector,top])=>{const node=c.querySelector(selector);if(node)node.scrollTop=top;});
  $$('[data-review-shot-id]', c).forEach(button => button.addEventListener('click', () => { delete c.dataset.reviewVersionId; selectShot(button.dataset.reviewShotId); renderReviewView(); }));
  const activeReviewIndex = reviewShots.findIndex(shot => shot.id === activeId);
  $$('[data-review-shot-nav]', c).forEach(button => {
    const direction = button.dataset.reviewShotNav === 'next' ? 1 : -1;
    const target = reviewShots[activeReviewIndex + direction];
    button.disabled = !target;
    button.addEventListener('click', () => {
      if (!target) return;
      delete c.dataset.reviewVersionId;
      selectShot(target.id);
      renderReviewView();
      const list=c.querySelector('.review-shot-strip-scroll'), chip=c.querySelector(`[data-review-shot-id="${CSS.escape(target.id)}"]`);
      if(list&&chip){const a=chip.getBoundingClientRect(),b=list.getBoundingClientRect();if(a.top<b.top)list.scrollTop-=b.top-a.top;else if(a.bottom>b.bottom)list.scrollTop+=a.bottom-b.bottom;}
    });
  });
  $$('[data-review-tab]', c).forEach(button => button.addEventListener('click', () => { c.dataset.reviewTab = button.dataset.reviewTab; renderReviewView(); }));
  $$('[data-review-version-id]', c).forEach(button => button.addEventListener('click', () => { c.dataset.reviewVersionId = button.dataset.reviewVersionId; c.dataset.reviewTab = 'compare'; renderReviewView(); }));
  $$('[data-review-version-scroll]', c).forEach(button => button.addEventListener('click', () => {
    const strip = $('.review-before-version-strip', c);
    if (strip) strip.scrollBy({ left: Number(button.dataset.reviewVersionScroll || 0) * Math.max(180, strip.clientWidth * 0.72), behavior: 'smooth' });
  }));
  requestAnimationFrame(() => $('.review-before-version.is-selected', c)?.scrollIntoView({ block: 'nearest', inline: 'center' }));
  $('[data-restore-review-version]', c)?.addEventListener('click', async event => {
    const button = event.currentTarget;
    const shotIndex = state.bundle.shots.findIndex(shot => shot.id === activeShot.id);
    const previous = structuredClone(activeShot);
    state.bundle.shots[shotIndex] = { ...activeShot, ...structuredClone(priorSnapshot), comments: activeShot.comments, versions: activeShot.versions, panels: activeShot.panels, steps: activeShot.steps, assets: activeShot.assets };
    c.dataset.reviewFeedback = '已在本地回滚，正在后台同步';
    renderReviewView();
    button.disabled = true;
    try {
      state.bundle = adoptServerBundle(await api(`/api/versions/${button.dataset.restoreReviewVersion}/restore`, { method: 'POST', json: {} }));
      c.dataset.reviewFeedback = '当前镜头已回滚，回滚前内容已自动保存为版本';
      renderReviewView();
      renderInspector();
      toast('镜头版本已回滚');
    } catch (err) { state.bundle.shots[shotIndex] = previous; renderReviewView(); renderInspector(); toast(err.message, true); }
  });
  $$('[data-open-comment]', c).forEach(pin => pin.addEventListener('click', () => {
    c.dataset.reviewTab = 'comments';
    renderReviewView();
    requestAnimationFrame(() => {
      const comment = $(`[data-review-comment-id="${CSS.escape(pin.dataset.openComment)}"]`, c);
      comment?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      comment?.classList.add('is-highlighted');
      setTimeout(() => comment?.classList.remove('is-highlighted'), 1600);
    });
  }));
  $$('[data-comment-reference-field]', c).forEach(button => button.addEventListener('click', () => {
    const selected = referenceCandidates.find(reference => reference.field === button.dataset.commentReferenceField);
    if (!selected) return;
    c.dataset.commentReferenceField = selected.field;
    $$('[data-comment-reference-field]', c).forEach(item => item.classList.toggle('is-active', item === button));
    const quote = $('[data-comment-reference-quote]', c);
    if (quote) quote.textContent = selected.text;
  }));
  $$('[data-review-status]', c).forEach(button => button.addEventListener('click', async () => {
    if (reviewStatusInFlight || c.dataset.reviewStatusPreparing) return;
    const nextStatus = button.dataset.reviewStatus;
    const reviewVersionId = button.dataset.reviewVersionId || null;
    if (['Approved', 'Changes Requested'].includes(nextStatus)) {
      const revision = versions.find(version => version.id === reviewVersionId);
      if (currentStatus !== 'Ready for Review' || !revision || revision.id !== selectedVersion?.id) {
        toast('请先选择当前镜头中要审批的修订', true);
        return;
      }
      const revisionLabel = revision.version_num || revision.name || '所选修订';
      const actionLabel = nextStatus === 'Approved' ? '同意' : '驳回';
      if (!await confirmAction(`${actionLabel}镜头修订`, `将${actionLabel} SHOT ${activeShot.number || '—'} · ${revisionLabel}。`)) return;
    }
    const projectId = state.bundle?.project?.id;
    const shotId = activeShot.id;
    // Flush the active editor and bulk Shot draft before taking a revision for
    // this separate Review command. A failed flush leaves the draft untouched.
    c.dataset.reviewStatusPreparing = 'true';
    let flushed;
    try { flushed = await saveCurrentProjectManually(); }
    finally { delete c.dataset.reviewStatusPreparing; }
    if (!flushed) return;
    if (state.bundle?.project?.id !== projectId) return;
    const current = state.bundle.shots.find(shot => shot.id === shotId);
    if (!current || current.status !== currentStatus) {
      c.dataset.reviewFeedback = '镜头状态已变化，请核对后重试';
      renderReviewView();
      return;
    }
    // Review changes only status, so use the latest acknowledged Shot revision.
    // Bulk drafts retain their earlier _syncBaseline.revision for overlap checks.
    const baseRevision = current.revision;
    const versionAtStart = state.changeVersion;
    const baselineBeforeStatus = structuredClone(current._syncBaseline || {});
    reviewStatusInFlight = true;
    c.dataset.reviewFeedback = '正在提交审阅状态…';
    renderReviewView();
    try {
      const updated = await api(`/api/shots/${shotId}`, { method: 'PUT', json: {
        status: nextStatus, version_id: reviewVersionId,
        base_revision: baseRevision, changed_fields: ['status']
      } });
      if (state.bundle?.project?.id !== projectId) return;
      const local = state.bundle.shots.find(shot => shot.id === shotId);
      if (!local) return;
      acknowledgePartialReviewShot(local, updated);
      local.last_change_at = updated.updated_at || new Date().toISOString();
      await refreshCompleteReviewBundle(projectId, shotId, updated.revision, baselineBeforeStatus, updated.status);
      c.dataset.reviewFeedback = nextStatus === 'Draft' ? '已撤回提交，镜头回到草稿' : `状态已更新为“${STATUS_LABELS[nextStatus] || nextStatus}”`;
      renderReviewView();
      toast(c.dataset.reviewFeedback);
    } catch (err) {
      if (state.bundle?.project?.id !== projectId) return;
      if (err.status === 409 && err.payload?.server_version) {
        const local = state.bundle.shots.find(shot => shot.id === shotId);
        const remote = err.payload.server_version;
        if (local) {
          if (state.changeVersion === versionAtStart && !state.dirty) {
            acknowledgePartialReviewShot(local, remote);
            await refreshCompleteReviewBundle(projectId, shotId, remote.revision, baselineBeforeStatus, remote.status);
          }
        }
        c.dataset.reviewFeedback = state.dirty
          ? '审阅状态发生冲突，本地修改仍保留；请先处理同步冲突'
          : '审阅状态发生冲突，已显示服务器状态';
      } else c.dataset.reviewFeedback = '审阅状态未保存，请重试';
      renderReviewView();
      toast(err.message, true);
    } finally {
      reviewStatusInFlight = false;
      if (state.dirty) scheduleAutoSave(60);
    }
  }));
  $$('[data-comment-id]', c).forEach(button => button.addEventListener('click', async () => {
    const comment = (activeShot.comments || []).find(item => item.id === button.dataset.commentId);
    if (!comment) return;
    const nextResolved = !comment.is_resolved;
    const previous = Boolean(comment.is_resolved);
    comment.is_resolved = nextResolved ? 1 : 0;
    renderReviewView();
    try {
      const result = await api(`/api/comments/${button.dataset.commentId}/resolve`, { method: 'POST', json: { resolved: nextResolved } });
      comment.is_resolved = result.is_resolved ? 1 : 0;
      c.dataset.reviewFeedback = nextResolved ? '评论已解决，可随时重新打开' : '评论已重新打开';
      renderReviewView();
    } catch (err) { comment.is_resolved = previous ? 1 : 0; renderReviewView(); toast(err.message, true); }
  }));
  $$('[data-comment-edit]', c).forEach(button => button.addEventListener('click', async () => {
    const comment = (activeShot.comments || []).find(item => item.id === button.dataset.commentEdit);
    if (!comment) return;
    const nextText = await openFieldEditor('修改评论', comment.text || '', true);
    if (nextText === null || !String(nextText).trim() || String(nextText).trim() === comment.text) return;
    const previous = comment.text;
    comment.text = String(nextText).trim();
    comment._sync_state = 'syncing';
    renderReviewView();
    try {
      const result = await api(`/api/comments/${comment.id}`, { method: 'PUT', json: { text: comment.text } });
      comment.text = result.text;
      delete comment._sync_state;
      renderReviewView();
      toast('评论修改已同步');
    } catch (err) {
      comment.text = previous;
      comment._sync_state = 'failed';
      renderReviewView();
      toast(err.message, true);
    }
  }));
  $$('[data-comment-delete]', c).forEach(button => button.addEventListener('click', async () => {
    const commentId = button.dataset.commentDelete;
    if (!await confirmAction('删除评论', '确定删除这条评论吗？删除后无法从审阅面板恢复。')) return;
    const index = activeShot.comments.findIndex(comment => comment.id === commentId);
    const removed = activeShot.comments[index];
    activeShot.comments.splice(index, 1);
    renderReviewView();
    try {
      await api(`/api/comments/${commentId}`, { method: 'DELETE' });
      c.dataset.reviewFeedback = '评论已删除';
      renderReviewView();
      toast('评论已删除');
    } catch (err) { activeShot.comments.splice(Math.max(0, index), 0, removed); renderReviewView(); toast(err.message, true); }
  }));
  $('#commentForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    if (!activeShot) return;
    const form = e.currentTarget;
    const text = String(new FormData(form).get('text') || '').trim();
    if (!text) return;
    const selectedReference = referenceCandidates.find(reference => reference.field === c.dataset.commentReferenceField) || activeReference;
    const temporaryId = `local-comment-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimistic = {
      id: temporaryId, shot_id: activeShot.id, text,
      author_name: state.session?.display_name || state.session?.username || '我',
      role: 'Director', timecode: activeShot.tc_in || '',
      quote_field: selectedReference.field, quote_text: selectedReference.text,
      is_resolved: 0, created_at: new Date().toISOString(), _sync_state: 'syncing'
    };
    activeShot.comments = [...(activeShot.comments || []), optimistic];
    c.dataset.reviewFeedback = '评论已显示，正在后台同步';
    renderReviewView();
    try {
      const created = await api(`/api/shots/${activeShot.id}/comments`, { method: 'POST', json: {
        text,
        timecode: activeShot.tc_in || '',
        quote_field: selectedReference.field,
        quote_text: selectedReference.text
      } });
      const targetShot = state.bundle.shots.find(shot => shot.id === activeShot.id);
      const optimisticIndex = targetShot.comments.findIndex(comment => comment.id === temporaryId);
      if (optimisticIndex >= 0) targetShot.comments.splice(optimisticIndex, 1, created);
      c.dataset.reviewFeedback = `评论已提交并引用 ${selectedReference.label}`;
      renderReviewView();
      toast('评论已添加');
    } catch (err) {
      optimistic._sync_state = 'failed';
      c.dataset.reviewFeedback = '评论同步失败，内容已保留';
      renderReviewView();
      toast(err.message, true);
    }
  });
  $('#createVersionBtn')?.addEventListener('click', async () => {
    if (!activeShot) return;
    const optimisticId = `local-version-${Date.now()}`;
    activeShot.versions = [{ id: optimisticId, version_num: '同步中', name: '当前镜头快照', created_by: state.session?.display_name || '我', created_at: new Date().toISOString(), snapshot: structuredClone(activeShot) }, ...(activeShot.versions || [])];
    c.dataset.reviewVersionId = optimisticId;
    renderReviewView();
    try {
      await api(`/api/shots/${activeShot.id}/versions`, { method: 'POST', json: { name: `审片快照 ${new Date().toLocaleString('zh-CN')}` } });
      state.bundle = adoptServerBundle(await api(`/api/projects/${state.bundle.project.id}`));
      c.dataset.reviewVersionId = state.bundle.shots.find(shot => shot.id === activeShot.id)?.versions?.[0]?.id || '';
      renderReviewView();
      renderInspector();
      toast('版本快照已创建');
    } catch (err) { activeShot.versions = activeShot.versions.filter(version => version.id !== optimisticId); renderReviewView(); toast(err.message, true); }
  });
}
function renderDeliverablesView() {
  const pid = state.bundle?.project?.id;
  const c = $('#deliverablesContainer');
  if (!pid || !c) return;
  c.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(260px, 1fr));gap:16px;padding:20px;">
      <div style="background:var(--bg-surface-1);border:1px solid var(--border-subtle);border-radius:8px;padding:16px;display:flex;flex-direction:column;gap:8px;">
        <h3 style="margin:0;font-size:14px;">导演分镜 PDF</h3>
        <p style="font-size:12px;color:var(--text-muted);">包含分镜图版、时码、运镜与旁白。</p>
        <button class="btn btn-primary" data-action="open-pdf">导出 PDF</button>
      </div>
      <div style="background:var(--bg-surface-1);border:1px solid var(--border-subtle);border-radius:8px;padding:16px;display:flex;flex-direction:column;gap:8px;">
        <h3 style="margin:0;font-size:14px;">现场拍摄通告表 (CSV)</h3>
        <p style="font-size:12px;color:var(--text-muted);">包含镜头场景、机位与调度参数，可用 Excel 直接打开。</p>
        <a class="btn btn-secondary" href="/api/projects/${pid}/export/shooting_list">下载 CSV 表格</a>
      </div>
      <div style="background:var(--bg-surface-1);border:1px solid var(--border-subtle);border-radius:8px;padding:16px;display:flex;flex-direction:column;gap:8px;">
        <h3 style="margin:0;font-size:14px;">剪辑工程交换 (EDL)</h3>
        <p style="font-size:12px;color:var(--text-muted);">标准 CMX3600 EDL 时码剪辑表。</p>
        <a class="btn btn-secondary" href="/api/projects/${pid}/export/edl">下载 EDL</a>
      </div>
      <div style="background:var(--bg-surface-1);border:1px solid var(--border-subtle);border-radius:8px;padding:16px;display:flex;flex-direction:column;gap:8px;">
        <h3 style="margin:0;font-size:14px;">旁白时码字幕 (SRT)</h3>
        <p style="font-size:12px;color:var(--text-muted);">根据精确时码生成的旁白解说字幕。</p>
        <a class="btn btn-secondary" href="/api/projects/${pid}/export/srt">下载 SRT</a>
      </div>
      <div class="deliverable-links">
        <strong>工程交换与备份</strong>
        <a href="/api/projects/${pid}/export/vtt">VTT 字幕</a>
        <a href="/api/projects/${pid}/export/otio">OpenTimelineIO</a>
        <a href="/api/projects/${pid}/export/fcpxml">FCPXML</a>
        <a href="/api/projects/${pid}/export/json">JSON 备份</a>
        <a href="/api/projects/${pid}/export/project-pdf" download>工程 PDF</a>
        <button class="btn btn-secondary" type="button" data-action="upload-backup">上传备份</button>
        <input id="backupUploadInput" type="file" accept="application/json,.json,application/pdf,.pdf" hidden>
      </div>
    </div>
  `;
}
function renderMethodGroupsView() {
  const c = $('#methodGroupsContainer');
  if (!c || !state.bundle) return;
  const groups = new Map();
  state.bundle.shots.forEach(shot => {
    methodValues(shot).forEach(method => {
      if (!groups.has(method)) groups.set(method, []);
      groups.get(method).push(shot);
    });
  });
  c.innerHTML = `<div class="method-groups-list">${[...groups.entries()].map(([method, shots]) => `<section class="method-group"><header><h3>${escapeHtml(methodLabel(method))}</h3><span>${shots.length} 镜头 · 含主/辅制作方式</span></header>${shots.map(shot => `<button class="method-shot-row" data-shot-id="${shot.id}" data-context-shot-id="${shot.id}" aria-haspopup="menu"><b>SHOT ${escapeHtml(shot.number)}</b><span>${escapeHtml(shot.title || '')}</span><small>${shot.primary_method === method ? '主制作方式' : '辅助制作方式'} · ${escapeHtml(methodValues(shot).map(methodLabel).join(' / '))}</small></button>`).join('')}</section>`).join('')}</div>`;
  c.querySelectorAll('[data-shot-id]').forEach(row => row.addEventListener('click', () => { selectShot(row.dataset.shotId); navigateToView(VIEW.TABLE); }));
}

function formatBytes(size) {
  const value = Number(size) || 0;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

// --------------------------------------------------------------------------
// 19. FILTERS & SEARCH
// --------------------------------------------------------------------------
function highlightSearch(value, query) {
  const text = String(value || '');
  if (!query) return escapeHtml(text);
  const lower = text.toLowerCase();
  const needle = query.toLowerCase();
  let cursor = 0;
  let html = '';
  let index = lower.indexOf(needle);
  while (index >= 0) {
    html += escapeHtml(text.slice(cursor, index));
    html += `<mark>${escapeHtml(text.slice(index, index + needle.length))}</mark>`;
    cursor = index + needle.length;
    index = lower.indexOf(needle, cursor);
  }
  return html + escapeHtml(text.slice(cursor));
}

function buildSearchResults(query) {
  const results = [];
  if (!state.bundle || !query) return results;
  const fields = [
    ['number', '镜头'], ['title', '镜头标题'], ['description', '画面描述'], ['voiceover', '对应旁白'],
    ['dialogue', '对白'], ['shot_size', '景别'], ['lens', '焦段'], ['movement', '运镜'], ['angle', '机位角度'],
    ['primary_method', '制作方式'], ['department', '责任部门'], ['owner', '负责人'], ['status', '状态'], ['chapter', '篇章'], ['scene', '场景']
  ];
  for (const shot of state.bundle.shots) {
    const extras = [['secondary_methods', '辅助制作方式', methodValues(shot).slice(1).map(methodLabel).join(' · ')], ...shotExtendedEntries(shot).map(([label, value]) => [label, label, value])];
    for (const [field, label, explicitValue] of [...fields.map(item => [item[0], item[1], shot[item[0]]]), ...extras]) {
      const value = String(explicitValue || '');
      if (value.toLowerCase().includes(query.toLowerCase())) {
        results.push({ type: 'shot', shotId: shot.id, title: `SHOT ${shot.number} · ${shot.title || '未命名镜头'}`, field: label, value });
        break;
      }
    }
    for (const comment of shot.comments || []) {
      if (String(comment.text || '').toLowerCase().includes(query.toLowerCase())) {
        results.push({ type: 'comment', shotId: shot.id, title: `SHOT ${shot.number} · ${shot.title || '未命名镜头'}`, field: '评论', value: comment.text });
      }
    }
  }
  return results.slice(0, 40);
}

function renderSearchResults(query) {
  const panel = $('#searchResultPanel');
  if (!panel) return;
  if (!query) { panel.classList.add('hidden'); panel.innerHTML = ''; state.searchResults = []; state.searchActiveIndex = -1; return; }
  state.searchResults = buildSearchResults(query);
  state.searchActiveIndex = state.searchResults.length ? 0 : -1;
  panel.classList.remove('hidden');
  panel.innerHTML = state.searchResults.length ? state.searchResults.map((result, index) => `<button class="search-result-item ${index === 0 ? 'is-active' : ''}" data-search-index="${index}" role="option" aria-selected="${index === 0}"><span class="search-result-type">${result.type === 'comment' ? '评论' : '镜头'}</span><span class="search-result-main"><b>${highlightSearch(result.title, query)}</b><small>命中：${escapeHtml(result.field)} · ${highlightSearch(result.value.slice(0, 100), query)}</small></span></button>`).join('') : '<div class="search-empty">没有匹配结果</div>';
  panel.querySelectorAll('[data-search-index]').forEach(button => button.addEventListener('click', () => openSearchResult(Number(button.dataset.searchIndex))));
}

async function openSearchResult(index) {
  const result = state.searchResults[index];
  if (!result || !state.bundle) return;
  $('#searchResultPanel')?.classList.add('hidden');
  await navigateToView(VIEW.TABLE);
  if (state.view.current !== VIEW.TABLE) return;
  selectShot(result.shotId);
  requestAnimationFrame(() => {
    const row = $(`#mainShotTable tbody tr[data-id="${CSS.escape(result.shotId)}"]`);
    row?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    row?.classList.add('search-hit');
    setTimeout(() => row?.classList.remove('search-hit'), 1400);
  });
}

$('#filterPopoverBtn')?.addEventListener('click', e => {
  e.stopPropagation();
  const anchor = e.currentTarget;
  const popover = $('#filterPopover');
  const open = popover?.classList.contains('hidden');
  if (open) { closeColumnSettings(); setToolbarTools(false); }
  popover?.classList.toggle('hidden', !open);
  e.currentTarget.setAttribute('aria-expanded', String(Boolean(open)));
  if (open && popover) requestAnimationFrame(() => {
    if (popover.classList.contains('hidden')) return;
    positionPopoverNear(anchor, popover);
    popover.querySelector('select')?.focus();
  });
});

$('#methodFilter')?.addEventListener('change', e => {
  state.filterMethod = e.target.value;
  renderCurrentView();
});

$('#statusFilter')?.addEventListener('change', e => {
  state.filterStatus = e.target.value;
  renderCurrentView();
});

$('#deptFilter')?.addEventListener('change', e => {
  state.filterDept = e.target.value;
  renderCurrentView();
});

$('#rowHeightSelect')?.addEventListener('change', e => {
  state.tablePrefs.rowHeight = e.target.value;
  saveTablePrefs();
  if (state.view.current === VIEW.TABLE) renderTableView();
});

$('#columnSettingsBtn')?.addEventListener('click', event => {
  event.stopPropagation();
  toggleCanonicalColumnManager(event.currentTarget);
});

function setMobileNav(open) {
  const sidebar = $('#appSidebar');
  const trigger = $('#mobileNavBtn');
  const scrim = $('#navScrim');
  sidebar?.classList.toggle('is-open', open);
  scrim?.classList.toggle('hidden', !open);
  trigger?.setAttribute('aria-expanded', String(open));
  trigger?.setAttribute('aria-label', open ? '关闭侧边栏' : '打开侧边栏');
  scrim?.setAttribute('aria-hidden', String(!open));
}

$('#mobileNavBtn')?.addEventListener('click', event => setMobileNav(event.currentTarget.getAttribute('aria-expanded') !== 'true'));
$('#navScrim')?.addEventListener('click', () => setMobileNav(false));
$('#appSidebar')?.addEventListener('click', event => {
  if (event.target.closest('.nav-item') && window.innerWidth < 768) setMobileNav(false);
});

function setToolbarTools(open) {
  if (open) {
    closeColumnSettings();
    $('#filterPopover')?.classList.add('hidden');
    $('#filterPopoverBtn')?.setAttribute('aria-expanded', 'false');
  }
  $('#toolbarSecondaryActions')?.classList.toggle('is-open', open);
  $('#toolbarMoreBtn')?.setAttribute('aria-expanded', String(open));
}

$('#toolbarMoreBtn')?.addEventListener('click', event => {
  event.stopPropagation();
  setToolbarTools(event.currentTarget.getAttribute('aria-expanded') !== 'true');
});

$('#globalSearchInput')?.addEventListener('input', e => {
  const value = e.target.value.trim().toLowerCase();
  if (state.context === APP_CONTEXT.HUB) {
    state.projectSearchQuery = value;
    clearTimeout(state.searchTimer);
    state.searchTimer = setTimeout(() => renderProjectsGrid(), 150);
  } else {
    state.searchQuery = value;
    clearTimeout(state.searchTimer);
    renderSearchResults(value);
    state.searchTimer = setTimeout(() => {
      if (state.view.current === VIEW.TABLE) renderTableView();
      else if (state.view.current === VIEW.CARDS) renderCardsView();
      else if (state.view.current === VIEW.WALL) renderWallView();
    }, 150);
  }
});

// Close popover when clicking outside
document.addEventListener('click', e => {
  if (!e.target.closest('#filterPopover') && !e.target.closest('#filterPopoverBtn')) {
    $('#filterPopover')?.classList.add('hidden');
    $('#filterPopoverBtn')?.setAttribute('aria-expanded', 'false');
  }
  if (!e.target.closest('.global-search') && !e.target.closest('#searchResultPanel')) {
    $('#searchResultPanel')?.classList.add('hidden');
  }
  if (!e.target.closest('#columnSettingsPopover') &&
      !e.target.closest('#columnSettingsBtn') &&
      !e.target.closest('[data-frameforge-column-manager-trigger="canonical"]')) {
    closeColumnSettings(false);
  }
  if (!e.target.closest('#toolbarSecondaryActions') && !e.target.closest('#toolbarMoreBtn')) setToolbarTools(false);
});

// Theme Toggle
$('#themeToggle')?.addEventListener('click', () => {
  applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
});

// Dialog Closer
$$('[data-close]').forEach(btn => {
  btn.addEventListener('click', () => {
    const dlg = $('#' + btn.dataset.close);
    if (dlg) dlg.close();
  });
});

$('#importModal')?.addEventListener('cancel', event => {
  if (state.importWizard?.busy) {
    event.preventDefault();
    toast('正在将镜头和图片写入内网，请等待完成。', true);
  }
});

// Keyboard Shortcuts
window.addEventListener('keydown', e => {
  if (e.defaultPrevented || e.target.closest?.('.ff-boards')) return;
  const typing = e.target instanceof HTMLElement && Boolean(e.target.closest('input, textarea, select, [contenteditable="true"]'));
  if (!typing && state.context === APP_CONTEXT.PROJECT && (e.ctrlKey || e.metaKey) && ['c', 'x', 'v'].includes(e.key.toLowerCase())) {
    e.preventDefault();
    if (e.key.toLowerCase() === 'c') copySelectedShots('copy');
    else if (e.key.toLowerCase() === 'x') copySelectedShots('cut');
    else pasteShotClipboard();
    return;
  }
  if (e.key === 'Escape') {
    const column = $('#columnSettingsPopover');
    const filter = $('#filterPopover');
    if (column && !column.classList.contains('hidden')) {
      closeColumnSettings(true);
      return;
    }
    if (filter && !filter.classList.contains('hidden')) {
      filter.classList.add('hidden');
      $('#filterPopoverBtn')?.setAttribute('aria-expanded', 'false');
      $('#filterPopoverBtn')?.focus();
      return;
    }
    if ($('#appSidebar')?.classList.contains('is-open')) {
      setMobileNav(false);
      $('#mobileNavBtn')?.focus();
      return;
    }
    if ($('#toolbarSecondaryActions')?.classList.contains('is-open')) {
      setToolbarTools(false);
      $('#toolbarMoreBtn')?.focus();
      return;
    }
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    const input = $('#globalSearchInput');
    input?.focus();
    input?.select();
  } else if ($('#searchResultPanel') && !$('#searchResultPanel').classList.contains('hidden') && ['ArrowDown', 'ArrowUp', 'Enter'].includes(e.key)) {
    e.preventDefault();
    const total = state.searchResults.length;
    if (!total) return;
    if (e.key === 'ArrowDown') state.searchActiveIndex = (state.searchActiveIndex + 1) % total;
    if (e.key === 'ArrowUp') state.searchActiveIndex = (state.searchActiveIndex - 1 + total) % total;
    if (e.key === 'Enter') { openSearchResult(state.searchActiveIndex); return; }
    $$('[data-search-index]', $('#searchResultPanel')).forEach(item => {
      const active = Number(item.dataset.searchIndex) === state.searchActiveIndex;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-selected', String(active));
    });
  } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    saveCurrentProjectManually();
  } else if (e.key === 'Escape') {
    // Modal dialogs own their cancel lifecycle (including pending editor promises).
    // Let the browser dispatch cancel to the topmost dialog instead of closing all.
    if ($('dialog[open]')) return;
    $('#filterPopover')?.classList.add('hidden');
  }
});

$('#saveProjectBtn')?.addEventListener('click', () => {
  saveCurrentProjectManually();
});

function formatSeconds(v) {
  v = Number(v) || 0;
  const m = Math.floor(v / 60);
  const s = Math.floor(v % 60);
  const f = Math.round((v - Math.floor(v)) * 100);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}${f ? '.' + String(f).padStart(2, '0') : ''}`;
}

// --------------------------------------------------------------------------
// 20. INITIALIZATION
// --------------------------------------------------------------------------
const savedTheme = localStorage.getItem('frameforge-theme');
applyTheme(savedTheme === 'light' ? 'light' : 'dark');

// Explicit presentation adapter: keep established persistence, undo and upload
// commands while migrating the front end to the shared React component layer.
function publishWorkspaceUI() {
  if (!globalThis.FrameForgeUI?.ready) return;
  const options = values => [['ALL', '全部'], ...values].map(([value, label]) => ({ value, label }));
  const filters = [
    { key: 'filterMethod', label: '制作方式', value: state.filterMethod, options: options(PRODUCTION_METHODS) },
    { key: 'filterStatus', label: '状态', value: state.filterStatus, options: options(Object.entries(STATUS_LABELS)) },
    { key: 'filterDept', label: '责任部门', value: state.filterDept, options: options(STEP_DEPARTMENT_OPTIONS) }
  ];
  filters.forEach(filter => { if (!filter.options.some(option => option.value === filter.value)) filter.options.push({ value: filter.value, label: filter.value }); });
  const groups = { moodboard: '视觉', voiceover: '声音', deliverables: '项目' };
  globalThis.FrameForgeUI.update({
    projectId: String(state.bundle?.project?.id || ''), context: state.context, view: state.view.current,
    search: state.searchQuery, total: state.bundle?.shots?.length || 0,
    filtered: filterShots(state.bundle?.shots || []).length, inspectorOpen: state.inspector.open,
    saveRefreshBusy: Boolean(state.saveRefreshInFlight),
    columns: state.bundle ? columnManagerEntries('', 'all') : [],
    columnOrder: state.bundle ? currentColumnOrder() : [], filters,
    navigation: SIDEBAR_ITEMS.map(item => ({ ...item, group: groups[item.key] || item.group })),
    sidebarPrefs: sidebarPrefs(), rowHeight: state.tablePrefs.rowHeight || 'standard',
    effects: document.body.dataset.effects || 'full'
  });
}

globalThis.FrameForgeUI?.mount({
  navigate: view => {
    if (view === VIEW.HUB) showDashboard(); else navigateToView(view);
    if (window.innerWidth < 768) setMobileNav(false);
  },
  action: (name, anchor = null) => {
    if (name === 'columns') { toggleCanonicalColumnManager(anchor); return; }
    if (name === 'saveRefresh') { saveAndRefreshProject(); return; }
    if (name === 'projectSettings') { openProjectSettings(); return; }
    if (name === 'autoFit') { autoFitTableColumns(); publishWorkspaceUI(); return; }
    if (name === 'resetColumns') { state.tablePrefs.widths = {}; saveTablePrefs(); renderTableView(); publishWorkspaceUI(); return; }
    const buttons = {
      inspector:'toggleInspectorBtn', import:'importExcelBtn', pdf:'pdfExportQuickBtn',
      timing:'autoTimingActionBtn', saveView:'proConfigBtn', insert:'insertShotActionBtn',
      addShot:'addShotActionBtn', addColumn:'addColumnBtn', resetLayout:'resetWorkspaceLayoutBtn', clearFilters:'clearShotFilters'
    };
    const button = buttons[name] && document.getElementById(buttons[name]);
    if (button && !button.disabled) button.click();
    publishWorkspaceUI();
  },
  search: value => { state.searchQuery = value; renderCurrentView(); },
  filter: (key, value) => {
    if (!['filterMethod', 'filterStatus', 'filterDept'].includes(key)) return;
    state[key] = value; renderCurrentView();
  },
  column: (field, action) => {
    if (!columnManagerEntries('', 'all').some(entry => entry.field === field && !entry.fixed)) return;
    if (action === 'hide' || action === 'show') setColumnHidden(field, action === 'hide');
    else setColumnArchived(field, action === 'remove');
    renderCurrentView();
  },
  reorderColumns: ids => {
    const order = currentColumnOrder();
    const allowed = ids.filter(field => order.includes(field) && !['select','actions'].includes(field));
    let index = 0;
    state.tablePrefs.order = order.map(field => allowed.includes(field) ? allowed[index++] : field);
    saveTablePrefs(); renderCurrentView();
  },
  sidebar: prefs => { saveSidebarPrefs({ ...sidebarPrefs(), ...prefs }); publishWorkspaceUI(); },
  preference: (key, value) => {
    const input = document.getElementById(key === 'rowHeight' ? 'rowHeightSelect' : 'workspaceEffects');
    if (!input) return;
    input.value = value; input.dispatchEvent(new Event('change', { bubbles:true }));
    publishWorkspaceUI();
  }
});
publishWorkspaceUI();

boot().catch(err => {
  console.error('Boot error:', err);
  toast(err.message, true);
});
