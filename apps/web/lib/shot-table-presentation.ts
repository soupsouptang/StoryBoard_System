export type ShotTableColumnKey =
  | 'shot_size'
  | 'lens_mm'
  | 'camera_movement'
  | 'description'
  | 'voice_over'
  | 'duration_frames'
  | 'department'
  | 'owner_id'
  | 'status';

export type ShotTableRowHeight = 'compact' | 'standard' | 'comfortable' | 'auto';

export const DEFAULT_SHOT_TABLE_COLUMN_ORDER: ShotTableColumnKey[] = [
  'shot_size',
  'lens_mm',
  'camera_movement',
  'description',
  'voice_over',
  'duration_frames',
  'department',
  'owner_id',
  'status'
];

export const SHOT_TABLE_COLUMN_LABELS: Record<ShotTableColumnKey, string> = {
  shot_size: '景别',
  lens_mm: '焦段',
  camera_movement: '机位运镜',
  description: '画面内容与构图',
  voice_over: '对应旁白',
  duration_frames: '时长 / 帧数',
  department: '部门',
  owner_id: '负责人',
  status: '状态'
};

export const DEFAULT_SHOT_TABLE_COLUMN_WIDTHS: Record<ShotTableColumnKey, number> = {
  shot_size: 80,
  lens_mm: 80,
  camera_movement: 132,
  description: 260,
  voice_over: 240,
  duration_frames: 126,
  department: 104,
  owner_id: 120,
  status: 112
};

const SHOT_TABLE_COLUMN_MIN_WIDTHS: Record<ShotTableColumnKey, number> = {
  shot_size: 72,
  lens_mm: 72,
  camera_movement: 96,
  description: 160,
  voice_over: 160,
  duration_frames: 108,
  department: 88,
  owner_id: 96,
  status: 96
};

const SHOT_TABLE_COLUMN_MAX_WIDTHS: Record<ShotTableColumnKey, number> = {
  shot_size: 180,
  lens_mm: 180,
  camera_movement: 320,
  description: 560,
  voice_over: 560,
  duration_frames: 240,
  department: 280,
  owner_id: 320,
  status: 220
};

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
  const requested = value.filter(
    (item): item is ShotTableColumnKey =>
      typeof item === 'string' && COLUMN_KEYS.has(item as ShotTableColumnKey)
  );
  const deduped = Array.from(new Set(requested));
  for (const column of DEFAULT_SHOT_TABLE_COLUMN_ORDER) {
    if (!deduped.includes(column)) deduped.push(column);
  }
  return deduped;
}

export function defaultShotTablePresentationPreferences(): ShotTablePresentationPreferences {
  return {
    version: 1,
    columnOrder: [...DEFAULT_SHOT_TABLE_COLUMN_ORDER],
    hiddenColumns: [],
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
  const hiddenColumns = Array.isArray(parsed.hiddenColumns)
    ? parsed.hiddenColumns.filter(
        (item): item is ShotTableColumnKey =>
          typeof item === 'string' && COLUMN_KEYS.has(item as ShotTableColumnKey)
      )
    : [];

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