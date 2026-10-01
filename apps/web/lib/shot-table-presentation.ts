export const SHOT_TABLE_COLUMN_LABELS = {
  panel_image: '分镜画面',
  shot_reference: '镜头',
  tc_in: '时码 TC',
  duration_frames: '时长',
  name: '镜头标题',
  sequence_id: '篇章',
  location: '场景/地点',
  shot_size: '景别',
  lens_mm: '焦段',
  camera_movement: '运镜',
  camera_angle: '机位角度',
  description: '画面描述',
  voice_over: '对应旁白',
  primary_method: '制作方式',
  status: '状态',
  department: '责任部门',
  int_ext: '内外景',
  day_night: '日夜',
  dialogue_character: '对白角色',
  performance: '表演提示',
  dialogue: '对白',
  edit_transition: '剪辑/转场',
  notes: '备注',
  action: '动作',
  original_number: '原镜号',
  feasibility: '可行性',
  replacement: '建议替换内容',
  original_description: '原描述',
  panel_frame: '分镜图框',
  movement_reference: '机位/运镜',
  execution_method: '执行方式',
  owner_id: '负责人',
} as const;

export type ShotTableColumnKey = keyof typeof SHOT_TABLE_COLUMN_LABELS;
export type ShotTableRowHeight = 'compact' | 'standard' | 'comfortable' | 'auto';

export const DEFAULT_SHOT_TABLE_COLUMN_ORDER = Object.keys(SHOT_TABLE_COLUMN_LABELS) as ShotTableColumnKey[];

export const DEFAULT_SHOT_TABLE_COLUMN_WIDTHS = Object.fromEntries(DEFAULT_SHOT_TABLE_COLUMN_ORDER.map(column => [column,
  column === 'panel_image' ? 128 : ['description', 'voice_over', 'original_description', 'replacement'].includes(column) ? 260 : column === 'tc_in' ? 132 : 112
])) as Record<ShotTableColumnKey, number>;
const SHOT_TABLE_COLUMN_MIN_WIDTHS = Object.fromEntries(DEFAULT_SHOT_TABLE_COLUMN_ORDER.map(column => [column, column === 'panel_image' ? 112 : 80])) as Record<ShotTableColumnKey, number>;
const SHOT_TABLE_COLUMN_MAX_WIDTHS = Object.fromEntries(DEFAULT_SHOT_TABLE_COLUMN_ORDER.map(column => [column, 560])) as Record<ShotTableColumnKey, number>;

// These headings are confirmed; their domain mapping is deferred to the database review.
export const PENDING_SHOT_TABLE_COLUMNS = new Set<ShotTableColumnKey>(['shot_reference', 'location', 'int_ext', 'day_night', 'dialogue_character', 'edit_transition', 'notes', 'original_number', 'feasibility', 'replacement', 'original_description', 'movement_reference', 'execution_method']);

export interface ShotTablePresentationPreferences {
  version: 1;
  columnOrder: ShotTableColumnKey[];
  hiddenColumns: ShotTableColumnKey[];
  columnWidths: Record<ShotTableColumnKey, number>;
  rowHeight: ShotTableRowHeight;
}

const COLUMN_KEYS = new Set<ShotTableColumnKey>(DEFAULT_SHOT_TABLE_COLUMN_ORDER);
const ROW_HEIGHTS = new Set<ShotTableRowHeight>(['compact', 'standard', 'comfortable', 'auto']);

export function clampShotTableColumnWidth(column: ShotTableColumnKey, width: number) {
  const finiteWidth = Number.isFinite(width) ? width : DEFAULT_SHOT_TABLE_COLUMN_WIDTHS[column];
  return Math.round(
    Math.min(
      SHOT_TABLE_COLUMN_MAX_WIDTHS[column],
      Math.max(SHOT_TABLE_COLUMN_MIN_WIDTHS[column], finiteWidth)
    )
  );
}

export function normalizeShotTableColumnOrder(value: unknown): ShotTableColumnKey[] {
  if (!Array.isArray(value)) return [...DEFAULT_SHOT_TABLE_COLUMN_ORDER];
  if (!value.includes('tc_in')) return [...DEFAULT_SHOT_TABLE_COLUMN_ORDER];
  const requested = value.filter(
    (item): item is ShotTableColumnKey =>
      typeof item === 'string' && COLUMN_KEYS.has(item as ShotTableColumnKey)
  );
  const deduped = Array.from(new Set(requested));
  for (const column of DEFAULT_SHOT_TABLE_COLUMN_ORDER) {
    if (!deduped.includes(column)) deduped.push(column);
  }
  if (!requested.includes('panel_image')) {
    deduped.splice(deduped.indexOf('panel_image'), 1);
    deduped.unshift('panel_image');
  }
  if (!requested.includes('panel_frame')) {
    deduped.splice(deduped.indexOf('panel_frame'), 1);
    deduped.splice(deduped.indexOf('description') + 1, 0, 'panel_frame');
  }
  return deduped;
}

export function defaultShotTablePresentationPreferences(): ShotTablePresentationPreferences {
  return {
    version: 1,
    columnOrder: [...DEFAULT_SHOT_TABLE_COLUMN_ORDER],
    hiddenColumns: ['owner_id'],
    columnWidths: { ...DEFAULT_SHOT_TABLE_COLUMN_WIDTHS },
    rowHeight: 'standard'
  };
}

export function normalizeShotTablePresentationPreferences(
  value: unknown
): ShotTablePresentationPreferences {
  const fallback = defaultShotTablePresentationPreferences();
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fallback;

  const parsed = value as Partial<ShotTablePresentationPreferences>;
  const hiddenColumns: ShotTableColumnKey[] = Array.isArray(parsed.hiddenColumns)
    ? parsed.hiddenColumns.filter(
        (item): item is ShotTableColumnKey =>
          typeof item === 'string' && COLUMN_KEYS.has(item as ShotTableColumnKey)
      )
    : ['owner_id'];
  if (!Array.isArray(parsed.columnOrder) || !parsed.columnOrder.includes('tc_in')) hiddenColumns.push('owner_id');

  const columnWidths = { ...DEFAULT_SHOT_TABLE_COLUMN_WIDTHS };
  if (parsed.columnWidths && typeof parsed.columnWidths === 'object') {
    for (const column of DEFAULT_SHOT_TABLE_COLUMN_ORDER) {
      const width = parsed.columnWidths[column];
      if (typeof width === 'number') {
        columnWidths[column] = clampShotTableColumnWidth(column, width);
      }
    }
  }

  return {
    version: 1,
    columnOrder: normalizeShotTableColumnOrder(parsed.columnOrder),
    hiddenColumns: Array.from(new Set(hiddenColumns)),
    columnWidths,
    rowHeight:
      typeof parsed.rowHeight === 'string' &&
      ROW_HEIGHTS.has(parsed.rowHeight as ShotTableRowHeight)
        ? (parsed.rowHeight as ShotTableRowHeight)
        : 'standard'
  };
}

const LEGACY_COLUMN_KEY_MAP: Record<string, ShotTableColumnKey> = {
  shotSize: 'shot_size',
  lens: 'lens_mm',
  movement: 'camera_movement',
  description: 'description',
  voiceOver: 'voice_over',
  duration: 'duration_frames',
  department: 'department',
  owner: 'owner_id',
  status: 'status'
};

export function loadShotTablePresentationPreferences(
  productionId: string,
  storage: Pick<Storage, 'getItem'>
): ShotTablePresentationPreferences {
  const fallback = defaultShotTablePresentationPreferences();

  try {
    const raw = storage.getItem(`frameforge:shot-table:${productionId}:presentation-v1`);
    if (raw) {
      return normalizeShotTablePresentationPreferences(JSON.parse(raw));
    }

    // Compatibility bridge for the short-lived order/visibility v2 slice.
    const interimRaw = storage.getItem(`frameforge:shot-table:${productionId}:column-layout-v2`);
    if (interimRaw) {
      const interim = JSON.parse(interimRaw) as { order?: unknown; hidden?: unknown };
      fallback.columnOrder = normalizeShotTableColumnOrder(interim.order);
      fallback.hiddenColumns = Array.isArray(interim.hidden)
        ? interim.hidden.filter(
            (item): item is ShotTableColumnKey =>
              typeof item === 'string' && COLUMN_KEYS.has(item as ShotTableColumnKey)
          )
        : [];
      return fallback;
    }

    // One-time compatibility bridge for the earlier visibility-only slice.
    const legacyRaw = storage.getItem(`frameforge:shot-table:${productionId}:columns`);
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw) as Record<string, unknown>;
      fallback.hiddenColumns = Object.entries(legacy)
        .filter(([, visible]) => visible === false)
        .map(([key]) => LEGACY_COLUMN_KEY_MAP[key])
        .filter((column): column is ShotTableColumnKey => Boolean(column));
    }
  } catch {
    return fallback;
  }

  return fallback;
}

export function saveShotTablePresentationPreferences(
  productionId: string,
  preferences: ShotTablePresentationPreferences,
  storage: Pick<Storage, 'setItem'>
) {
  storage.setItem(
    `frameforge:shot-table:${productionId}:presentation-v1`,
    JSON.stringify(preferences)
  );
}
