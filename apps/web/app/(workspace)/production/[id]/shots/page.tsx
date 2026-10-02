'use client';

import { Button, Icons, Input, Select } from '@frameforge/ui';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { insertShotGroup, createShotDragGhost } from '@/lib/shot-row-drag';
import { framesToTimecode } from '@frameforge/timecode';
import { useParams } from 'next/navigation';
import type { Sequence, Shot } from '@frameforge/types';
import { useProduction, useReorderShots, useShots, useUpdateShot } from '@/lib/hooks/useProduction';
import { useShotCommands } from '@/lib/hooks/useShotCommands';
import { ImportModal } from '@/components/storyboard/ImportModal';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useCustomFields, useCustomFieldValues, useSetCustomFieldState, useUpdateCustomField, useInsertCustomFields, useCopyColumn, useBuiltinColumnStates, useSetBuiltinColumnState } from '@/lib/hooks/useCustomFields';
import { MethodBadge } from '@/components/shot/MethodBadge';
import { StatusBadge } from '@/components/shot/StatusBadge';
import { ShotInspector } from '@/components/shot/ShotInspector';
import { ShotTrashModal } from '@/components/shot/ShotTrashModal';
import { InlineEditCell } from '@/components/shot/InlineEditCell';
import { CustomFieldCell } from '@/components/shot/CustomFieldCell';
import { ShotImageCell } from '@/components/shot/ShotImageCell';
import { ShotViewNavigation } from '@/components/shot/ShotViewNavigation';
import { ShotColumnManager } from '@/components/shot/ShotColumnManager';
import { ShotCustomFieldManager } from '@/components/shot/ShotCustomFieldManager';
import { ShotSavedViews } from '@/components/shot/ShotSavedViews';
import { ShotTableText } from '@/components/shot/ShotTableText';
import { ShotColumnDialog } from '@/components/shot/ShotColumnDialog';
import { NewShotRow } from '@/components/shot/NewShotRow';
import {
  ShotTableContextMenu,
  type ShotTableContextColumnKey,
  type ShotTableContextTarget
} from '@/components/shot/ShotTableContextMenu';
import { BulkActionToolbar } from '@/components/storyboard/BulkActionToolbar';
import { getMethodLabel, getStatusBadge } from '@/lib/media-resolver';
import { shotMovementLabel, shotMethodValues, groupShotsByMethod } from '@/lib/shot-display';
import {
  DEFAULT_SHOT_TABLE_COLUMN_ORDER,
  SHOT_TABLE_COLUMN_LABELS,
  PROTECTED_SHOT_COLUMN_NAMES,
  PENDING_SHOT_TABLE_COLUMNS,
  clampShotTableColumnWidth,
  compareShotColumnValues,
  SHOT_TABLE_COLUMN_OPTIONS,
  isRetiredShotColumnLabel,
  isShotTableLayoutColumn,
  defaultShotTablePresentationPreferences,
  loadShotTablePresentationPreferences,
  normalizeShotTablePresentationPreferences,
  saveShotTablePresentationPreferences,
  type ShotTableColumnKey,
  type ShotTablePresentationPreferences,
  type ShotTableRowHeight
} from '@/lib/shot-table-presentation';

type ShotTableGroupMode = 'none' | 'sequence' | 'method';

const ROW_PADDING: Record<ShotTableRowHeight, string> = {
  compact: 'py-1',
  standard: 'py-2',
  comfortable: 'py-3',
  auto: 'py-2'
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}


function shotColumnValue(
  shot: Shot,
  column: ShotTableContextColumnKey
): string | number {
  switch (column) {
    case 'display_number':
      return shot.display_number || '';
    case 'primary_method':
      return shotMethodValues(shot).map(method => getMethodLabel(method)).join(' / ');
    case 'panel_image':
      return shot.panels?.some(panel => panel.asset_id) ? 1 : 0;
    case 'shot_size':
      return shot.shot_size || '';
    case 'lens_mm':
      return shot.lens_mm ?? '';
    case 'camera_movement':
      return shotMovementLabel(shot);
    case 'description':
      return shot.description || '';
    case 'voice_over':
      return shot.voice_over || '';
    case 'duration_frames':
      return shot.duration_frames || 0;
    case 'department':
      return shot.department || '';
    case 'owner_id':
      return shot.owner_id || '';
    case 'status':
      return shot.status ? getStatusBadge(shot.status).label : '';
    default:
      return typeof shot[column as keyof Shot] === 'string' ? shot[column as keyof Shot] as string : '';
  }
}

export default function ShotListPage() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : '';

  const { data: production } = useProduction(id);
  const { data: shots = [], isLoading } = useShots(id);
  const { data: customFields = [] } = useCustomFields(id);
  const { data: customFieldValueMatrix } = useCustomFieldValues(id);
  const updateShot = useUpdateShot(id);
  const setCustomFieldState = useSetCustomFieldState(id);
  const { data: builtinColumnStates = [], isLoading: columnStatesLoading } = useBuiltinColumnStates(id);
  const setBuiltinColumnState = useSetBuiltinColumnState(id);
  const protectedColumns = new Set(['display_number', 'tc_in', 'panel_image']);
  const removedColumns = new Set(builtinColumnStates.filter(row => row.state === 'removed').map(row => row.column_key));
  const insertFields = useInsertCustomFields(id);
  const copyColumn = useCopyColumn(id);
  const updateCustomField = useUpdateCustomField(id);
  const reorderShots = useReorderShots(id);
  const commands = useShotCommands(id, shots);
  const [isImportOpen, setImportOpen] = useState(false);

  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const [wrappedColumns, setWrappedColumns] = useState<ShotTableColumnKey[]>([]);
  const [clipboardMessage, setClipboardMessage] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [sortKey, setSortKey] = useState<'default' | ShotTableContextColumnKey>('default');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [groupMode, setGroupMode] = useState<ShotTableGroupMode>('none');
  const [tablePresentation, setTablePresentation] = useState<ShotTablePresentationPreferences>(
    () => defaultShotTablePresentationPreferences()
  );
  const [isNewShotRowOpen, setNewShotRowOpen] = useState(false);
  const [freezeEnabled, setFreezeEnabled] = useState(false);
  const [selectedPins, setSelectedPins] = useState<string[]>([]);
  // Retain the rendered positions after unpinning until horizontal scrolling resumes.
  const [renderedPins, setRenderedPins] = useState<string[]>([]);
  const lastScrollLeft = useRef(0);
  const [columnDialog, setColumnDialog] = useState<{ column: string; after: boolean; mode: 'insert' | 'rename'; returnFocus: HTMLElement | null } | null>(null);
  const [columnClipboard, setColumnClipboard] = useState<{ kind: 'frameforge-column'; version: 1; productionId: string; source: string; label: string; cut: boolean; field_revision?: number; shot_revisions: Record<string, number>; width_px: number; wrap_text: boolean; options?: string[] } | null>(null);
  const [cutColumn, setCutColumn] = useState<string | null>(null);
  const freezeClickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [contextTarget, setContextTarget] = useState<ShotTableContextTarget | null>(null);
  const [reorderPreview, setReorderPreview] = useState<{
    sourceIds: string[];
    targetId: string | null;
    insertAfter: boolean;
    x: number;
    y: number;
  } | null>(null);
  const suppressReorderClickRef = useRef(false);
  const reorderDragRef = useRef<{
    pointerId: number;
    sourceId: string;
    groupIds: string[];
    startX: number;
    startY: number;
    active: boolean;
    targetId: string | null;
    insertAfter: boolean;
    handle: HTMLButtonElement;
    timer: ReturnType<typeof setTimeout>;
    baseOrder: string[];
    revisions: Record<string, number>;
    ghost: ReturnType<typeof createShotDragGhost> | null;
  } | null>(null);

  const {
    filters,
    setFilter,
    resetFilters,
    selectedShotIds,
    selectShot,
    selectAllShots,
    clearSelection,
    inspectedShotId,
    isInspectorOpen,
    openInspector,
    closeInspector,
  } = useWorkspaceStore();

  const sequences: Sequence[] = useMemo(() => {
    const sequenceMap = new Map<string, Sequence>();
    for (const shot of shots) {
      if (!shot.sequence_id || sequenceMap.has(shot.sequence_id)) continue;
      sequenceMap.set(shot.sequence_id, {
        id: shot.sequence_id,
        production_id: id,
        display_number: 'SEQ',
        name: `场次 ${shot.sequence_id.slice(0, 8)}`,
        description: '',
        sort_index: 1000,
        created_at: '',
        updated_at: ''
      });
    }
    return Array.from(sequenceMap.values());
  }, [id, shots]);



  useEffect(() => {
    if (!id || typeof window === 'undefined') return;
    setTablePresentation(loadShotTablePresentationPreferences(id, window.localStorage));
    try {
      const saved: unknown = JSON.parse(window.localStorage.getItem(`frameforge:shot-wrap:${id}`) || '[]');
      setWrappedColumns(Array.isArray(saved) ? saved.filter((column): column is ShotTableColumnKey =>
        DEFAULT_SHOT_TABLE_COLUMN_ORDER.includes(column)) : []);
    } catch { setWrappedColumns([]); }
  }, [id]);

  const commitTablePresentation = (
    updater: (current: ShotTablePresentationPreferences) => ShotTablePresentationPreferences
  ) => {
    setTablePresentation(current => {
      const next = updater(current);
      if (id && typeof window !== 'undefined') {
        saveShotTablePresentationPreferences(id, next, window.localStorage);
      }
      return next;
    });
  };

  const handleColumnVisibleChange = (column: ShotTableColumnKey, visible: boolean) => {
    commitTablePresentation(current => ({
      ...current,
      hiddenColumns: visible
        ? current.hiddenColumns.filter(item => item !== column)
        : Array.from(new Set([...current.hiddenColumns, column]))
    }));
  };

  const handleColumnMove = (column: ShotTableColumnKey, direction: -1 | 1) => {
    commitTablePresentation(current => {
      const index = current.columnOrder.indexOf(column);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.columnOrder.length) return current;

      const nextOrder = [...current.columnOrder];
      [nextOrder[index], nextOrder[target]] = [nextOrder[target], nextOrder[index]];
      const displayOrder = [...orderedColumns];
      const displayIndex = displayOrder.indexOf(column);
      const neighborIndex = displayOrder.indexOf(nextOrder[index]);
      if (displayIndex >= 0 && neighborIndex >= 0) [displayOrder[displayIndex], displayOrder[neighborIndex]] = [displayOrder[neighborIndex], displayOrder[displayIndex]];
      return { ...current, columnOrder: nextOrder, displayOrder };
    });
  };

  const handleRowHeightChange = (rowHeight: ShotTableRowHeight) => {
    commitTablePresentation(current => ({ ...current, rowHeight }));
  };

  const resetColumnLayout = () => {
    const next = { ...defaultShotTablePresentationPreferences(), columnLabels: tablePresentation.columnLabels };
    setTablePresentation(next);
    setWrappedColumns([]);
    window.localStorage.removeItem(`frameforge:shot-wrap:${id}`);
    if (id && typeof window !== 'undefined') {
      saveShotTablePresentationPreferences(id, next, window.localStorage);
    }
  };

  const applySavedTableView = (config: Record<string, unknown>) => {
    const presentation = normalizeShotTablePresentationPreferences(config.presentation);
    setTablePresentation(presentation);
    if (id && typeof window !== 'undefined') {
      saveShotTablePresentationPreferences(id, presentation, window.localStorage);
    }

    const savedWrap = config.wrappedColumns;
    const nextWrap = Array.isArray(savedWrap) ? savedWrap.filter((column): column is ShotTableColumnKey =>
      DEFAULT_SHOT_TABLE_COLUMN_ORDER.includes(column)) : [];
    setWrappedColumns(nextWrap);
    window.localStorage.setItem(`frameforge:shot-wrap:${id}`, JSON.stringify(nextWrap));
    resetFilters();
    const savedFilters = isRecord(config.filters) ? config.filters : {};
    setFilter(
      'searchQuery',
      typeof savedFilters.searchQuery === 'string' ? savedFilters.searchQuery : ''
    );
    setFilter(
      'primaryMethod',
      typeof savedFilters.primaryMethod === 'string' ? savedFilters.primaryMethod : 'all'
    );
    setFilter(
      'department',
      typeof savedFilters.department === 'string' ? savedFilters.department : 'all'
    );
    setFilter(
      'status',
      typeof savedFilters.status === 'string' ? savedFilters.status : 'all'
    );

    const savedSort = isRecord(config.sort) ? config.sort : {};
    const validSortKeys = new Set<string>([
      'default',
      'display_number',
      'primary_method',
      ...DEFAULT_SHOT_TABLE_COLUMN_ORDER,
      ...customFields.map(field => field.column_key)
    ]);
    const nextSortKey =
      typeof savedSort.key === 'string' && validSortKeys.has(savedSort.key)
        ? (savedSort.key as 'default' | ShotTableContextColumnKey)
        : 'default';
    const nextSortDirection = savedSort.direction === 'desc' ? 'desc' : 'asc';

    setSortKey(nextSortKey);
    setSortDirection(nextSortDirection);

    const savedGrouping = isRecord(config.grouping) ? config.grouping : {};
    const nextGroupMode: ShotTableGroupMode =
      savedGrouping.mode === 'sequence' || savedGrouping.mode === 'method'
        ? savedGrouping.mode
        : 'none';
    setGroupMode(nextGroupMode);

    const hasSavedFilters =
      Boolean(
        typeof savedFilters.searchQuery === 'string' &&
        savedFilters.searchQuery.trim()
      ) ||
      (typeof savedFilters.primaryMethod === 'string' && savedFilters.primaryMethod !== 'all') ||
      (typeof savedFilters.department === 'string' && savedFilters.department !== 'all') ||
      (typeof savedFilters.status === 'string' && savedFilters.status !== 'all');
    setShowFilters(
      hasSavedFilters ||
      nextSortKey !== 'default' ||
      nextSortDirection !== 'asc' ||
      nextGroupMode !== 'none'
    );
  };

  const resizeColumnBy = (column: string, delta: number) => {
    commitTablePresentation(current => ({
      ...current,
      columnWidths: {
        ...current.columnWidths,
        [column]: clampShotTableColumnWidth(column, (current.columnWidths[column] || columnWidths[column]) + delta)
      }
    }));
  };

  const handleResizePointerDown = (
    column: string,
    event: React.PointerEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startWidth = columnWidths[column];
    let latestWidth = startWidth;
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handlePointerMove = (moveEvent: PointerEvent) => {
      latestWidth = clampShotTableColumnWidth(
        column,
        startWidth + moveEvent.clientX - startX
      );
      setTablePresentation(current => ({
        ...current,
        columnWidths: {
          ...current.columnWidths,
          [column]: latestWidth
        }
      }));
    };

    const finishResize = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', finishResize);
      window.removeEventListener('pointercancel', finishResize);
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;

      setTablePresentation(current => {
        const next = {
          ...current,
          columnWidths: {
            ...current.columnWidths,
            [column]: latestWidth
          }
        };
        if (id && typeof window !== 'undefined') {
          saveShotTablePresentationPreferences(id, next, window.localStorage);
        }
        return next;
      });
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', finishResize, { once: true });
    window.addEventListener('pointercancel', finishResize, { once: true });
  };

  const handleResizeKeyDown = (
    column: string,
    event: React.KeyboardEvent<HTMLButtonElement>
  ) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      resizeColumnBy(column, -8);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      resizeColumnBy(column, 8);
    }
  };

  const autoFitColumn = (column: string) => {
    const labelLength = columnLabels[column].length;
    const longestContent = shots.reduce((max, shot) => {
      const value = String(valueForColumn(shot, column));
      return Math.max(max, Math.min(value.length, 80));
    }, 0);
    const desiredWidth = Math.max(labelLength * 14 + 40, longestContent * 7.5 + 32);

    commitTablePresentation(current => ({
      ...current,
      columnWidths: {
        ...current.columnWidths,
        [column]: clampShotTableColumnWidth(column, desiredWidth)
      }
    }));
  };

  const openColumnContextMenu = (
    column: ShotTableContextColumnKey,
    element: HTMLElement,
    x: number,
    y: number
  ) => {
    void refreshColumnClipboard();
    setContextTarget({
      kind: 'column',
      column,
      x,
      y,
      returnFocus: element
    });
  };

  const openRowContextMenu = (
    shot: Shot,
    element: HTMLElement,
    x: number,
    y: number,
    cellElement?: HTMLElement
  ) => {
    void commands.refreshClipboard();
    const validSelectedIds = selectedShotIds.filter(selectedId =>
      shots.some(candidate => candidate.id === selectedId)
    );
    const cell = (cellElement || element).closest<HTMLTableCellElement>('td[data-shot-column], td[data-custom-field-id]');
    const column = cell?.dataset.shotColumn as ShotTableContextColumnKey | undefined;
    const customField = customFields.find(field => field.id === cell?.dataset.customFieldId);
    const shotIds =
      selectedShotIds.includes(shot.id) && validSelectedIds.length > 1
        ? validSelectedIds
        : [shot.id];

    if (!selectedShotIds.includes(shot.id)) {
      selectShot(shot.id, false, false, visibleShots.map(item => item.id));
    }

    setContextTarget({
      kind: 'row',
      x,
      y,
      returnFocus: element,
      shotId: shot.id,
      shotIds,
      displayNumber: shot.display_number,
      name: shot.name,
      ...(column && column !== 'panel_image' ? {
        cellValue: column === 'lens_mm' && shot.lens_mm == null ? '' : String(shotColumnValue(shot, column)),
        cellLabel: columnLabels[column]
      } : customField ? {
        cellValue: String(customFieldValueMatrix?.values[shot.id]?.[customField.id] ?? ''),
        cellLabel: customField.label
      } : {})
    });
  };

  const inspectedShot = shots.find(shot => shot.id === inspectedShotId) || null;

  const methodOptions = useMemo(
    () => Array.from(new Set(
      shots
        .map(item => item.primary_method)
        .filter((value): value is NonNullable<typeof value> => Boolean(value))
    )).sort(),
    [shots]
  );
  const departmentOptions = useMemo(
    () => Array.from(new Set(
      shots
        .map(item => item.department)
        .filter((value): value is NonNullable<typeof value> => Boolean(value))
    )).sort(),
    [shots]
  );
  const statusOptions = useMemo(
    () => Array.from(new Set(
      shots
        .map(item => item.status)
        .filter((value): value is NonNullable<typeof value> => Boolean(value))
    )).sort(),
    [shots]
  );

  const visibleShots = useMemo(() => {
    const query = filters.searchQuery.trim().toLowerCase();
    const filtered = shots.filter(item => {
      if (query) {
        const builtInMatch = [
          item.display_number,
          item.name,
          item.description,
          item.voice_over,
          item.owner_id,
          item.department,
          item.status,
          item.primary_method
        ].some(value => String(value || '').toLowerCase().includes(query));
        const customMatch = Object.values(
          customFieldValueMatrix?.values[item.id] || {}
        ).some(value => String(value ?? '').toLowerCase().includes(query));
        if (!builtInMatch && !customMatch) return false;
      }

      if (filters.primaryMethod !== 'all' && !shotMethodValues(item).includes(filters.primaryMethod)) return false;
      if (filters.department !== 'all' && item.department !== filters.department) return false;
      if (filters.status !== 'all' && item.status !== filters.status) return false;
      return true;
    });

    if (sortKey === 'default') return filtered;

    const field = customFields.find(field => field.column_key === sortKey);
    const kind = ['display_number', 'duration_frames', 'lens_mm', 'tc_in', 'panel_image'].includes(sortKey) || field?.field_type === 'number' ? 'number'
      : field && (['select', 'multiselect', 'boolean', 'date'].includes(field.field_type) || tablePresentation.columnFormats[field.column_key] === 'camera_movement') || ['primary_method', 'status', 'department', 'shot_size', 'camera_angle', 'camera_movement', 'sequence_id'].includes(sortKey) ? 'select' : 'text';
    const timecodeFrames = new Map<string, number>();
    if (sortKey === 'tc_in') {
      let frame = 0;
      for (const shot of [...shots].sort((a,b) => a.sort_index - b.sort_index || a.id.localeCompare(b.id))) {
        timecodeFrames.set(shot.id, frame); frame += shot.duration_frames;
      }
    }
    const rawValue = (shot: Shot) => field ? (customFieldValueMatrix?.values[shot.id]?.[field.id] === undefined ? field.default_value : customFieldValueMatrix?.values[shot.id]?.[field.id])
      : sortKey === 'tc_in' ? timecodeFrames.get(shot.id)
      : shotColumnValue(shot, sortKey);
    const value = (shot: Shot) => {
      const raw = rawValue(shot);
      const format = field ? tablePresentation.columnFormats[field.column_key] : '';
      return raw == null || raw === '' ? raw : format === 'primary_method' ? (Array.isArray(raw) ? raw : [raw]).map(method => getMethodLabel(String(method))).join(' / ')
        : format === 'status' ? getStatusBadge(String(raw)).label : format === 'camera_movement' && isRecord(raw) ? String(raw.type || '固定') : raw;
    };
    const category = (shot: Shot) => { const content = value(shot); return Array.isArray(content) ? [...content].sort().join('\0') : String(content ?? ''); };
    const categoryOrder = new Map<string, number>();
    if (kind === 'select') for (const shot of shots) if (!categoryOrder.has(category(shot))) categoryOrder.set(category(shot), categoryOrder.size);
    return [...filtered].sort((a, b) => compareShotColumnValues(value(a), value(b), kind, sortDirection)
      || (kind === 'select' ? (categoryOrder.get(category(a))! - categoryOrder.get(category(b))!) : 0));
  }, [shots, filters, sortKey, sortDirection, customFieldValueMatrix, customFields, tablePresentation.columnFormats]);

  const shotGroups = useMemo(() => {
    if (groupMode === 'none') {
      return [{ key: 'all', label: '', shots: visibleShots }];
    }

    if (groupMode === 'method') {
      return Array.from(groupShotsByMethod(visibleShots), ([method, shots]) => ({ key: `method:${method}`, label: method.toUpperCase(), shots }));
    }

    const groups = new Map<string, { key: string; label: string; shots: Shot[] }>();
    for (const shot of visibleShots) {
      const key = `sequence:${shot.sequence_id || 'unassigned'}`;
      const label = shot.sequence_id ? `场次 ${shot.sequence_id.slice(0, 8)}` : '未分场镜头';

      const existing = groups.get(key);
      if (existing) {
        existing.shots.push(shot);
      } else {
        groups.set(key, { key, label, shots: [shot] });
      }
    }
    return Array.from(groups.values());
  }, [visibleShots, groupMode]);

  const visibleShotIds = Array.from(new Set(shotGroups.flatMap(group => group.shots.map(item => item.id))));
  const showShotNumber = !removedColumns.has('display_number') && !tablePresentation.hiddenColumns.includes('display_number');
  const visibleColumns = tablePresentation.columnOrder.filter(
    column => DEFAULT_SHOT_TABLE_COLUMN_ORDER.includes(column) && builtinColumnStates.some(row => row.column_key === column && row.state !== 'removed') && !tablePresentation.hiddenColumns.includes(column)
  );
  const visibleCustomFields = customFields
    .filter(field => field.state === 'visible' && !field.permanently_deleted && !isRetiredShotColumnLabel(field.label))
    .sort((a, b) => (a.position - b.position) || (a.sort_index - b.sort_index));
  const columnWidths: Record<string, number> = { selection: 40, annotations: 40, display_number: 80,
    ...Object.fromEntries(customFields.map(field => [field.column_key, field.width_px || 180])), ...tablePresentation.columnWidths };
  const availableColumns = [...visibleColumns, ...visibleCustomFields.map(field => field.column_key)];
  const orderedColumns = [...new Set([...tablePresentation.displayOrder, ...availableColumns])].filter(column => availableColumns.includes(column as ShotTableColumnKey) && column !== 'display_number');
  const columnLabels: Record<string, string> = { ...SHOT_TABLE_COLUMN_LABELS,
    ...Object.fromEntries(customFields.map(field => [field.column_key, field.label])), ...tablePresentation.columnLabels };
  const frozenOffsets: Record<string, number> = {};
  let frozenWidth = 0;
  for (const column of ['selection', 'annotations', ...(showShotNumber ? ['display_number'] : []), ...orderedColumns]) {
    if (column === 'display_number' || renderedPins.includes(column)) { frozenOffsets[column] = frozenWidth; frozenWidth += columnWidths[column]; }
  }
  const frozenStyle = (column: string, header = false): React.CSSProperties => column in frozenOffsets
    ? { position: 'sticky', left: frozenOffsets[column], zIndex: header ? 30 : 5, background: 'var(--card)' } : {};
  const freezeHeader = (event: React.MouseEvent<HTMLTableSectionElement> | React.KeyboardEvent<HTMLTableSectionElement>) => {
    if (!freezeEnabled || (event.target as HTMLElement).closest('button,input')) return;
    const column = (event.target as HTMLElement).closest<HTMLTableCellElement>('th')?.dataset.shotColumn;
    if (!column || column === 'display_number') return;
    if ('key' in event) { if (!['Enter', ' '].includes(event.key)) return; event.preventDefault(); event.stopPropagation(); }
    const toggle = () => setSelectedPins(previous => {
      if (previous.includes(column)) return previous.filter(item => item !== column);
      setRenderedPins(current => [...new Set([...current, column])]);
      return [...previous, column];
    });
    if ('key' in event) toggle();
    else {
      if (freezeClickTimer.current) clearTimeout(freezeClickTimer.current);
      freezeClickTimer.current = setTimeout(toggle, 500);
    }
  };
  const tableMinWidth = 80 + (showShotNumber ? columnWidths.display_number : 0) + orderedColumns.reduce((sum, column) => sum + columnWidths[column], 0);

  const rowPadding = ROW_PADDING[tablePresentation.rowHeight];
  const tableColumnCount = (showShotNumber ? 3 : 2) + visibleColumns.length + visibleCustomFields.length;

  const activeFilterCount = [
    filters.primaryMethod !== 'all',
    filters.department !== 'all',
    filters.status !== 'all'
  ].filter(Boolean).length;

  const currentSavedViewConfig = useMemo<Record<string, unknown>>(
    () => ({
      presentation: tablePresentation,
      wrappedColumns,
      filters: {
        searchQuery: filters.searchQuery,
        primaryMethod: filters.primaryMethod,
        department: filters.department,
        status: filters.status
      },
      sort: {
        key: sortKey,
        direction: sortDirection
      },
      grouping: {
        mode: groupMode
      }
    }),
    [
      tablePresentation,
      wrappedColumns,
      filters.searchQuery,
      filters.primaryMethod,
      filters.department,
      filters.status,
      sortKey,
      sortDirection,
      groupMode
    ]
  );

  const canonicalShots = useMemo(
    () => [...shots].sort((a, b) => (a.sort_index - b.sort_index) || a.id.localeCompare(b.id)),
    [shots]
  );
  const canonicalShotIds = useMemo(
    () => canonicalShots.map(shot => shot.id),
    [canonicalShots]
  );

  const shotTimecodes = useMemo(() => {
    const result: Record<string, { in: string; out: string }> = {};
    let frame = production?.start_timecode_frames || 0;
    const rate = production ? production.fps_num / (production.fps_den || 1) : 24;
    for (const shot of canonicalShots) { result[shot.id] = { in: framesToTimecode(frame, rate, production?.drop_frame), out: framesToTimecode(frame + shot.duration_frames, rate, production?.drop_frame) }; frame += shot.duration_frames; }
    return result;
  }, [canonicalShots, production]);

  const valueForColumn = (shot: Shot, column: string) => {
    const field = customFields.find(field => field.column_key === column);
    return field ? (customFieldValueMatrix?.values[shot.id]?.[field.id] === undefined ? field.default_value : customFieldValueMatrix?.values[shot.id]?.[field.id])
      : column === 'tc_in' ? shotTimecodes[shot.id]?.in : shotColumnValue(shot, column as ShotTableContextColumnKey);
  };
  const placeColumns = (columns: string[], reference: string, after: boolean, shownBuiltins: ShotTableColumnKey[] = []) => {
    commitTablePresentation(current => {
      const order = ['display_number', ...orderedColumns].filter(key => !columns.includes(key));
      const index = order.indexOf(reference);
      order.splice(Math.max(1, index + (after ? 1 : 0)), 0, ...columns);
      return { ...current, displayOrder: order, columnOrder: [...order.filter(key => DEFAULT_SHOT_TABLE_COLUMN_ORDER.includes(key as ShotTableColumnKey)), ...current.columnOrder.filter(key => !order.includes(key))] as ShotTableColumnKey[], hiddenColumns: current.hiddenColumns.filter(key => !shownBuiltins.includes(key)) };
    });
  };
  const refreshColumnClipboard = async () => {
    try {
      const value = JSON.parse(await navigator.clipboard.readText());
      if (value?.kind !== 'frameforge-column' || value.version !== 1 || value.productionId !== id || !isShotTableLayoutColumn(value.source)
          || typeof value.cut !== 'boolean' || typeof value.label !== 'string' || value.label.length > 80
          || !isRecord(value.shot_revisions) || Object.entries(value.shot_revisions).some(([key, revision]) => typeof key !== 'string' || !Number.isSafeInteger(revision) || Number(revision) < 1)
          || typeof value.width_px !== 'number' || value.width_px < 80 || value.width_px > 560 || typeof value.wrap_text !== 'boolean') {
        setColumnClipboard(null); setCutColumn(null); return null;
      }
      setColumnClipboard(value); setCutColumn(value.cut ? value.source : null); return value as NonNullable<typeof columnClipboard>;
    } catch { setColumnClipboard(null); return null; }
  };
  const copyTableColumn = async (column: string, cut: boolean) => {
    if (protectedColumns.has(column)) { setClipboardMessage('镜号、时码、分镜画面不支持复制或剪切移动。'); return; }
    if (cut && !commands.canWrite) { setClipboardMessage('当前账号没有移动列的权限。'); return; }
    const field = customFields.find(field => field.column_key === column);
    const clip: NonNullable<typeof columnClipboard> = { kind: 'frameforge-column', version: 1, productionId: id, source: column, label: columnLabels[column], cut,
      ...(field ? { field_revision: field.revision } : {}), shot_revisions: Object.fromEntries(shots.map(shot => [shot.id, shot.revision])),
      width_px: columnWidths[column], wrap_text: field ? field.wrap_text : wrappedColumns.includes(column as ShotTableColumnKey), options: field ? field.options : SHOT_TABLE_COLUMN_OPTIONS[column] || [] };
    try { await navigator.clipboard.writeText(JSON.stringify(clip)); setColumnClipboard(clip); setCutColumn(cut ? column : null); setClipboardMessage(cut ? '列已剪切；成功粘贴前保留原列数据。' : '整列已复制。'); }
    catch { setClipboardMessage('无法访问剪贴板，请允许浏览器访问后重试。'); }
  };
  const pasteTableColumn = async (target: string) => {
    if (!commands.canWrite || copyColumn.isPending) return;
    const clip = await refreshColumnClipboard();
    if (!clip) { setClipboardMessage('剪贴板没有当前项目的列。'); return; }
    if (protectedColumns.has(clip.source)) { setClipboardMessage('镜号、时码、分镜画面不支持复制或剪切移动。'); return; }
    try {
      if (clip.cut) {
        if (clip.source === target) throw new Error('请在另一列后粘贴。');
        const field = customFields.find(field => field.column_key === clip.source);
        if (!orderedColumns.includes(clip.source) || field && field.revision !== clip.field_revision) throw new Error('来源列已修改或隐藏，请重新剪切。');
        placeColumns([clip.source], target, true);
        setColumnClipboard(null); setCutColumn(null); await navigator.clipboard.writeText('').catch(() => {});
      } else {
        const result = await copyColumn.mutateAsync({ ...clip, existing_labels: Object.values(columnLabels) });
        const saved = result.field;
        const refreshed = { ...clip, shot_revisions: result.shot_revisions };
        setColumnClipboard(refreshed);
        await navigator.clipboard.writeText(JSON.stringify(refreshed)).catch(() => {});
        placeColumns([saved.column_key], target, true);
        commitTablePresentation(current => ({ ...current, columnWidths: { ...current.columnWidths, [saved.column_key]: clip.width_px },
          columnFormats: { ...current.columnFormats, [saved.column_key]: current.columnFormats[clip.source] || clip.source } }));
      }
      setClipboardMessage('列已向后粘贴。');
    } catch (cause) { setClipboardMessage(cause instanceof Error ? cause.message : '粘贴失败，原数据已保留。'); }
  };
  const openColumnDialog = (column: string, mode: 'insert' | 'rename', after = false, returnFocus: HTMLElement | null = contextTarget?.returnFocus || null) => {
    if (mode === 'rename' && PROTECTED_SHOT_COLUMN_NAMES.has(column)) { setClipboardMessage('该列名称无法修改。'); return; }
    if (!commands.canWrite) { setClipboardMessage('当前账号没有修改列的权限。'); return; }
    if (freezeClickTimer.current) clearTimeout(freezeClickTimer.current);
    setColumnDialog({ column, mode, after, returnFocus });
  };
  const hiddenCandidates = [
    ...(removedColumns.has('display_number') ? [{ key: 'display_number', label: columnLabels.display_number }] : []),
    ...tablePresentation.columnOrder.filter(key => DEFAULT_SHOT_TABLE_COLUMN_ORDER.includes(key) && (removedColumns.has(key) || tablePresentation.hiddenColumns.includes(key))).map(key => ({ key, label: columnLabels[key] })),
    ...customFields.filter(field => field.state !== 'visible' && !field.permanently_deleted && !isRetiredShotColumnLabel(field.label)).map(field => ({ key: field.column_key, label: field.label }))
  ];
  const confirmColumnDialog = async (keys: string[], name: string) => {
    if (!columnDialog) return;
    const { column, mode, after } = columnDialog;
    if (isRetiredShotColumnLabel(name)) throw new Error('该列已取消，不能使用此名称。');
    if (mode === 'rename') {
      if (PROTECTED_SHOT_COLUMN_NAMES.has(column)) throw new Error('该列名称无法修改。');
      if (!name) throw new Error('列名不能为空。');
      const field = customFields.find(field => field.column_key === column);
      if (field) await updateCustomField.mutateAsync({ id: field.id, revision: field.revision, label: name });
      else commitTablePresentation(current => ({ ...current, columnLabels: { ...current.columnLabels, [column]: name } }));
    } else {
      if (['镜号','时码','时码 TC','分镜画面', ...[...protectedColumns].map(key => columnLabels[key])].includes(name)) throw new Error('镜号、时码、分镜画面不能重复新增。');
      const labels = new Set(Object.values(columnLabels));
      let nextName = name;
      if (name && labels.has(name)) { let suffix = 1; while (labels.has(`${name}${String(suffix).padStart(2, '0')}`)) suffix++; nextName = `${name}${String(suffix).padStart(2, '0')}`; }
      if (nextName.length > 80) throw new Error('列名不能超过 80 个字符。');
      const hidden = keys.map(key => customFields.find(field => field.column_key === key)).filter(field => !!field);
      const restore_columns = Object.fromEntries(keys.filter(key => removedColumns.has(key)).map(key => [key, builtinColumnStates.find(row => row.column_key === key)?.revision || 0]));
      const saved = name || hidden.length || Object.keys(restore_columns).length ? await insertFields.mutateAsync({ fields: name ? [{ label: nextName, field_type: 'text' }] : [], restore: Object.fromEntries(hidden.map(field => [field.id, field.revision])), restore_columns }) : [];
      const builtins = keys.filter(key => DEFAULT_SHOT_TABLE_COLUMN_ORDER.includes(key as ShotTableColumnKey)) as ShotTableColumnKey[];
      placeColumns([...keys, ...saved.filter(field => !keys.includes(field.column_key)).map(field => field.column_key)], column, after, builtins);
    }
    setColumnDialog(null);
  };
  const columnKeyDown = (column: string, event: React.KeyboardEvent<HTMLTableCellElement>) => {
    if (event.key === 'F2') { event.preventDefault(); event.stopPropagation(); openColumnDialog(column, 'rename', false, event.currentTarget); return; }
    if (!(event.ctrlKey || event.metaKey) || !['c','x','v'].includes(event.key.toLowerCase())) return;
    event.preventDefault(); event.stopPropagation();
    if (event.key.toLowerCase() === 'v') void pasteTableColumn(column);
    else void copyTableColumn(column, event.key.toLowerCase() === 'x');
  };
  const orderColumnElements = (elements: React.ReactElement<React.HTMLAttributes<HTMLTableCellElement>>[], header = false) => elements
    .sort((a, b) => orderedColumns.indexOf((a.props as Record<string, unknown>)['data-shot-column'] as string) - orderedColumns.indexOf((b.props as Record<string, unknown>)['data-shot-column'] as string))
    .map(element => {
      const column = (element.props as Record<string, unknown>)['data-shot-column'] as string;
      return React.cloneElement(element, { children: typeof element.props.children === 'string' || typeof element.props.children === 'number' ? <ShotTableText text={String(element.props.children)} /> : element.props.children, className: `${element.props.className || ''} ${cutColumn === column ? 'opacity-40' : ''}`,
        ...(header ? { onDoubleClick: event => { if (!(event.target as HTMLElement).closest('button,input')) { event.stopPropagation(); openColumnDialog(column, 'rename', false, event.currentTarget); } },
          onKeyDown: event => { columnKeyDown(column, event); if (!event.defaultPrevented) element.props.onKeyDown?.(event); } } : {}) });
    });

  const clearShotReorderDrag = () => {
    const drag = reorderDragRef.current;
    if (drag) {
      drag.ghost?.element.remove();
      clearTimeout(drag.timer);
      try {
        drag.handle.releasePointerCapture(drag.pointerId);
      } catch {
        // Pointer capture may already have been released by the browser.
      }
    }
    reorderDragRef.current = null;
    setReorderPreview(null);
  };

  const movingGroupFor = (sourceId: string) => {
    if (!selectedShotIds.includes(sourceId) || selectedShotIds.length <= 1) {
      return [sourceId];
    }
    const selected = new Set(selectedShotIds);
    return canonicalShotIds.filter(shotId => selected.has(shotId));
  };

  const commitShotReorder = async (
    sourceId: string,
    targetId: string,
    insertAfter: boolean,
    groupIds: string[],
    baseOrder = canonicalShotIds,
    revisions = Object.fromEntries(canonicalShots.map(shot => [shot.id, shot.revision]))
  ) => {
    if (sortKey !== 'default' || sortDirection !== 'asc' || groupMode !== 'none' || reorderShots.isPending) return;

    const nextOrder = insertShotGroup(baseOrder, [sourceId, ...groupIds], targetId, insertAfter);
    if (nextOrder.every((shotId, index) => shotId === baseOrder[index])) return;

    try {
      await reorderShots.mutateAsync({
        orderedShotIds: nextOrder,
        baseOrder, revisions
      });
    } catch {
      // Keep the acknowledged order; the hook refetches after success or conflict.
    }
  };

  const beginShotReorder = (
    shotId: string,
    event: React.PointerEvent<HTMLButtonElement>
  ) => {
    event.stopPropagation();
    suppressReorderClickRef.current = false;
    if (sortKey !== 'default' || sortDirection !== 'asc' || groupMode !== 'none' || reorderShots.isPending) return;

    event.preventDefault();
    const groupIds = movingGroupFor(shotId);
    const drag = {
      pointerId: event.pointerId,
      sourceId: shotId,
      groupIds,
      startX: event.clientX,
      startY: event.clientY,
      active: false,
      targetId: null as string | null,
      insertAfter: false,
      handle: event.currentTarget,
      timer: undefined as unknown as ReturnType<typeof setTimeout>,
      baseOrder: [...canonicalShotIds],
      revisions: Object.fromEntries(canonicalShots.map(shot => [shot.id, shot.revision])),
      ghost: null as ReturnType<typeof createShotDragGhost> | null
    };

    const activate = () => {
      if (reorderDragRef.current !== drag || drag.active) return;
      drag.active = true;
      drag.ghost = createShotDragGhost(drag.handle.closest('tr')!, drag.groupIds, drag.startX, drag.startY);
      drag.ghost.element.style.left = `${drag.startX - drag.ghost.offsetX}px`;
      drag.ghost.element.style.top = `${drag.startY - drag.ghost.offsetY}px`;
      window.getSelection()?.removeAllRanges();
      setReorderPreview({
        sourceIds: drag.groupIds,
        targetId: drag.targetId,
        insertAfter: drag.insertAfter,
        x: drag.startX,
        y: drag.startY
      });
    };

    drag.timer = setTimeout(activate, event.pointerType === 'mouse' ? 90 : 260);
    reorderDragRef.current = drag;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is a progressive enhancement for drag continuity.
    }
  };

  const moveShotReorder = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = reorderDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const distance = Math.hypot(
      event.clientX - drag.startX,
      event.clientY - drag.startY
    );

    if (!drag.active) {
      if (event.pointerType === 'mouse' && distance > 4) {
        clearTimeout(drag.timer);
        drag.active = true;
        drag.ghost = createShotDragGhost(drag.handle.closest('tr')!, drag.groupIds, drag.startX, drag.startY);
      } else if (event.pointerType !== 'mouse' && distance > 10) {
        clearShotReorderDrag();
        return;
      } else {
        return;
      }
    }

    event.preventDefault();
    event.stopPropagation();

    if (drag.ghost) {
      drag.ghost.element.style.left = `${event.clientX - drag.ghost.offsetX}px`;
      drag.ghost.element.style.top = `${event.clientY - drag.ghost.offsetY}px`;
    }
    const target = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest('tr[data-shot-id]') as HTMLTableRowElement | null;
    const targetId = target?.dataset.shotId || null;

    if (!target || !targetId || drag.groupIds.includes(targetId)) {
      drag.targetId = null;
      setReorderPreview({
        sourceIds: drag.groupIds,
        targetId: null,
        insertAfter: false,
        x: event.clientX,
        y: event.clientY
      });
      return;
    }

    const rect = target.getBoundingClientRect();
    drag.targetId = targetId;
    drag.insertAfter = event.clientY >= rect.top + rect.height / 2;
    setReorderPreview({
      sourceIds: drag.groupIds,
      targetId,
      insertAfter: drag.insertAfter,
      x: event.clientX,
      y: event.clientY
    });
  };

  const finishShotReorder = (
    event: React.PointerEvent<HTMLButtonElement>,
    shouldCommit: boolean
  ) => {
    const drag = reorderDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    if (drag.active) {
      suppressReorderClickRef.current = true;
      event.preventDefault();
      event.stopPropagation();
    }

    const snapshot = {
      sourceId: drag.sourceId,
      groupIds: drag.groupIds,
      targetId: drag.targetId,
      insertAfter: drag.insertAfter,
      active: drag.active, baseOrder: drag.baseOrder, revisions: drag.revisions
    };
    clearShotReorderDrag();

    if (shouldCommit && snapshot.active && snapshot.targetId) {
      void commitShotReorder(
        snapshot.sourceId,
        snapshot.targetId,
        snapshot.insertAfter,
        snapshot.groupIds, snapshot.baseOrder, snapshot.revisions
      );
    }
  };

  const moveShotByKeyboard = (sourceId: string, direction: -1 | 1) => {
    if (sortKey !== 'default' || sortDirection !== 'asc' || groupMode !== 'none' || reorderShots.isPending) return;
    const groupIds = movingGroupFor(sourceId);
    const group = new Set(groupIds);
    const first = canonicalShotIds.findIndex(shotId => group.has(shotId));
    let last = -1;
    canonicalShotIds.forEach((shotId, index) => {
      if (group.has(shotId)) last = index;
    });

    if (direction < 0) {
      for (let index = first - 1; index >= 0; index -= 1) {
        const targetId = canonicalShotIds[index];
        if (!group.has(targetId)) {
          void commitShotReorder(sourceId, targetId, false, groupIds);
          return;
        }
      }
      return;
    }

    for (let index = last + 1; index < canonicalShotIds.length; index += 1) {
      const targetId = canonicalShotIds[index];
      if (!group.has(targetId)) {
        void commitShotReorder(sourceId, targetId, true, groupIds);
        return;
      }
    }
  };

  useEffect(() => {
    const cancel = (event: KeyboardEvent) => { if (event.key === 'Escape') clearShotReorderDrag(); };
    window.addEventListener('keydown', cancel);
    return () => { window.removeEventListener('keydown', cancel); clearShotReorderDrag(); if (freezeClickTimer.current) clearTimeout(freezeClickTimer.current); };
  }, []);

  if (!production) return null;
  const fps = production.fps_num / (production.fps_den || 1);
  const canReorder = groupMode === 'none' && sortKey === 'default' && sortDirection === 'asc' && shots.length > 1;

  const toggleLock = async (shot: Shot, event: React.MouseEvent) => {
    event.stopPropagation();
    await updateShot.mutateAsync({
      id: shot.id,
      revision: shot.revision,
      changes: { timing_locked: !shot.timing_locked }
    });
  };

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden">
      <div className="z-10 shrink-0 space-y-3 border-b border-border bg-background px-4 py-3">
        <h1 className="text-lg font-semibold">分镜制作</h1>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-baseline gap-3">
            <ShotViewNavigation productionId={production.id} active="table" count={shots.length} />
            <span className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
              显示 {visibleShots.length} / {shots.length}
              {selectedShotIds.length > 0 && ` · 已选 ${selectedShotIds.length}`}
            </span>
          </div>
        </div>
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_11rem_max-content] items-center gap-2 overflow-x-auto 2xl:grid-cols-[minmax(max-content,1fr)_minmax(11rem,20rem)_minmax(max-content,1fr)] [&_button]:h-9 [&_button]:text-sm [&_svg]:h-4 [&_svg]:w-4" role="group" aria-label="镜头查询与工具">
          <div className="relative col-start-2 row-start-1 w-full min-w-0">
            <Icons.Search aria-hidden="true" className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              value={filters.searchQuery}
              onChange={event => setFilter('searchQuery', event.target.value)}
              aria-label="搜索镜头"
              placeholder="搜索镜号、画面、旁白、负责人..."
              className="w-full min-w-0 pl-8"
            />
          </div>
          <div className="col-start-1 row-start-1 flex w-max max-w-full flex-nowrap items-center justify-start gap-2 overflow-x-auto">
            <Button variant="ghost" size="sm" disabled={!commands.canWrite} onClick={() => setImportOpen(true)}><Icons.FileDown className="h-3.5 w-3.5" />导入</Button>
            <Button
              variant={showFilters || activeFilterCount > 0 || groupMode !== 'none' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setShowFilters(value => !value)}
              aria-expanded={showFilters}
              className="shrink-0"
            >
              <Icons.Filter className="h-3.5 w-3.5" />
              筛选/分组{activeFilterCount ? ` · ${activeFilterCount}` : ''}
            </Button>
            <ShotSavedViews
              productionId={production.id}
              currentConfig={currentSavedViewConfig}
              onApply={applySavedTableView}
            />

            <Button variant={freezeEnabled ? 'secondary' : 'ghost'} size="sm" role="switch" aria-checked={freezeEnabled}
              onClick={() => { setFreezeEnabled(previous => !previous); if (freezeEnabled) setSelectedPins([]); }} className="h-8 shrink-0 text-xs">
              <Icons.Columns3 className="h-3.5 w-3.5" />冻结列
            </Button>
            <ShotCustomFieldManager productionId={production.id} />

            <ShotColumnManager
              productionId={production.id}
              columnOrder={tablePresentation.columnOrder.filter(column => DEFAULT_SHOT_TABLE_COLUMN_ORDER.includes(column) && !removedColumns.has(column))}
              hiddenColumns={tablePresentation.hiddenColumns}
              rowHeight={tablePresentation.rowHeight}
              columnLabels={columnLabels}
              onVisibleChange={handleColumnVisibleChange}
              onMove={handleColumnMove}
              onRowHeightChange={handleRowHeightChange}
              onReset={resetColumnLayout}
            />

            <Button
              variant="ghost"
              size="sm"
              disabled={!isInspectorOpen && selectedShotIds.length !== 1}
              aria-expanded={isInspectorOpen}
              onClick={() => isInspectorOpen ? closeInspector() : selectedShotIds[0] && openInspector(selectedShotIds[0])}
              className="shrink-0"
            >
              <Icons.PanelRightOpen className={`h-4 w-4 ${isInspectorOpen ? 'scale-x-[-1]' : ''}`} />
              详情
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsTrashOpen(true)}
              className="shrink-0"
            >
              <Icons.Trash2 className="h-3.5 w-3.5" />
              废纸篓
            </Button>

            {!canReorder && shots.length > 1 && (
              <span
                className="hidden whitespace-nowrap text-[11px] text-muted-foreground xl:inline"
                title="清除分组并恢复默认升序后可拖动镜号旁的手柄调整顺序"
              >
                顺序已锁定
              </span>
            )}
          </div>
          <Button size="sm" className="col-start-3 row-start-1 mr-[132px] h-9 w-[100px] justify-self-end text-sm tracking-normal" onClick={() => setNewShotRowOpen(true)}>
            <Icons.Plus aria-hidden="true" />新增镜头
          </Button>
        </div>
      </div>

      <BulkActionToolbar
        production={production}
        allShotIds={visibleShotIds}
      />

      {showFilters && (
        <div className="z-10 shrink-0 border-b border-border bg-background px-3 py-3 sm:px-6">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <Select
              label="制作方式筛选"
              value={filters.primaryMethod}
              onChange={value => setFilter('primaryMethod', value)}
              options={[
                { value: 'all', label: '全部制作方式' },
                ...methodOptions.map(value => ({ value, label: value }))
              ]}
              className="h-9 text-xs"
            />
            <Select
              label="部门筛选"
              value={filters.department}
              onChange={value => setFilter('department', value)}
              options={[
                { value: 'all', label: '全部部门' },
                ...departmentOptions.map(value => ({ value, label: value }))
              ]}
              className="h-9 text-xs"
            />
            <Select
              label="状态筛选"
              value={filters.status}
              onChange={value => setFilter('status', value)}
              options={[
                { value: 'all', label: '全部状态' },
                ...statusOptions.map(value => ({ value, label: value }))
              ]}
              className="h-9 text-xs"
            />
            <Select
              label="分组方式"
              value={groupMode}
              onChange={value => setGroupMode(value as ShotTableGroupMode)}
              options={[
                { value: 'none', label: '不分组' },
                { value: 'sequence', label: '按场次 / 篇章' },
                { value: 'method', label: '按制作方式' }
              ]}
              className="h-9 text-xs"
            />
            <Select
              label="排序字段"
              value={sortKey}
              onChange={value => setSortKey(value as typeof sortKey)}
              options={[
                { value: 'default', label: '默认镜头顺序' },
                { value: 'display_number', label: '按镜号' },
                { value: 'primary_method', label: '按制作方式' },
                ...tablePresentation.columnOrder.map(column => ({
                  value: column,
                  label: '按' + SHOT_TABLE_COLUMN_LABELS[column]
                }))
              ]}
              className="h-9 text-xs"
            />
            <div className="flex min-w-0 gap-2">
              <Select
                label="排序方向"
                value={sortDirection}
                onChange={value => setSortDirection(value as typeof sortDirection)}
                options={[
                  { value: 'asc', label: '升序' },
                  { value: 'desc', label: '降序' }
                ]}
                className="h-9 min-w-0 flex-1 text-xs"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  resetFilters();
                  setSortKey('default');
                  setSortDirection('asc');
                  setGroupMode('none');
                }}
                className="h-9 shrink-0 text-xs"
              >
                重置
              </Button>
            </div>
          </div>
        </div>
      )}

      {isTrashOpen && (
        <ShotTrashModal
          productionId={production.id}
          onClose={() => setIsTrashOpen(false)}
        />
      )}

      {reorderShots.error && <p role="alert" className="px-3 py-2 text-xs text-destructive">{reorderShots.error instanceof Error ? reorderShots.error.message : '排序保存失败，请刷新后重试。'}</p>}
      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
        <div
          onScroll={event => {
            setContextTarget(null);
            if (event.currentTarget.scrollLeft !== lastScrollLeft.current) {
              lastScrollLeft.current = event.currentTarget.scrollLeft;
              setRenderedPins(selectedPins);
            }
          }}
          className="min-h-0 min-w-0 flex-1 overflow-auto overscroll-contain"
          role="region"
          aria-label="镜头制作表"
          tabIndex={0}
        >
          {isLoading || columnStatesLoading ? (
            <div className="flex h-64 items-center justify-center font-mono text-xs text-muted-foreground">
              正在加载镜头制作表...
            </div>
          ) : (
            <table
              className="shot-production-table w-full table-fixed border-collapse text-left font-sans text-sm"
              style={{ minWidth: `${Math.max(tableMinWidth, 360)}px`, '--shot-text-lines': Math.max(1, Math.floor(((visibleColumns.includes('panel_image') ? columnWidths.panel_image - 16 : 88) * 9 / 16) / 20)) } as React.CSSProperties}
            >
              <thead onClick={freezeHeader} onKeyDownCapture={freezeHeader} className="sticky top-0 z-10 border-b border-border bg-card text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th data-shot-column="selection" scope="col" tabIndex={0} style={frozenStyle('selection', true)} className={`relative w-10 px-2 py-2.5 ${selectedPins.includes('selection') ? 'font-bold underline' : ''}`}><span className="sr-only">勾选</span><span aria-hidden="true" className="pointer-events-none absolute inset-y-1 right-0 w-px bg-border" />
                    <input style={selectedPins.includes('selection') ? { borderBottom: '2px solid currentColor', outlineOffset: 3 } : undefined} type="checkbox" aria-label="全选所有镜头"
                      checked={visibleShotIds.length > 0 && visibleShotIds.every(id => selectedShotIds.includes(id))}
                      ref={element => { if (element) element.indeterminate = visibleShotIds.some(id => selectedShotIds.includes(id)) && !visibleShotIds.every(id => selectedShotIds.includes(id)); }}
                      onChange={() => visibleShotIds.length > 0 && visibleShotIds.every(id => selectedShotIds.includes(id)) ? clearSelection() : selectAllShots(visibleShotIds)}
                      className="h-4 w-4 cursor-pointer accent-foreground" />
                  </th>
                  <th data-shot-column="annotations" scope="col" tabIndex={0} style={frozenStyle('annotations', true)} className={`relative w-10 px-1 py-2.5 ${selectedPins.includes('annotations') ? 'font-bold underline' : ''}`} title="批注提示">批注<span aria-hidden="true" className="pointer-events-none absolute inset-y-1 right-0 w-px bg-border" /></th>
                  {showShotNumber && <th
                    style={{ width: columnWidths.display_number, ...frozenStyle('display_number', true) }} data-shot-column="display_number" scope="col"
                    tabIndex={0}
                    onDoubleClick={event => { if (!(event.target as HTMLElement).closest('button,input')) { event.stopPropagation(); openColumnDialog('display_number', 'rename', false, event.currentTarget); } }}
                    onContextMenu={event => {
                      event.preventDefault();
                      openColumnContextMenu(
                        'display_number',
                        event.currentTarget,
                        event.clientX,
                        event.clientY
                      );
                    }}
                    onKeyDown={event => {
                      columnKeyDown('display_number', event);
                      if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
                        event.preventDefault();
                        const rect = event.currentTarget.getBoundingClientRect();
                        openColumnContextMenu(
                          'display_number',
                          event.currentTarget,
                          rect.left + Math.min(48, rect.width / 2),
                          rect.top + Math.min(30, rect.height / 2)
                        );
                      }
                    }}
                    className="relative sticky left-0 z-30 border-r border-border bg-card px-3 py-2.5 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  >
                    <ShotTableText text={columnLabels.display_number} maxLines={1} />
                    <button type="button" aria-label={`调整${columnLabels.display_number}列宽`} title="拖动调整镜号列宽；方向键微调"
                      onPointerDown={event => handleResizePointerDown('display_number', event)} onKeyDown={event => handleResizeKeyDown('display_number', event)}
                      className="absolute inset-y-0 right-0 z-20 w-2 cursor-col-resize touch-none border-0 bg-transparent p-0 outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="pointer-events-none absolute inset-y-1 right-0 w-px bg-border" /></button>
                  </th>}
                  {orderColumnElements([...visibleColumns.map(column => (
                    <th
                      data-shot-column={column} key={column}
                      scope="col"
                      tabIndex={0}
                      onContextMenu={event => {
                        event.preventDefault();
                        openColumnContextMenu(
                          column,
                          event.currentTarget,
                          event.clientX,
                          event.clientY
                        );
                      }}
                      onKeyDown={event => {
                        if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
                          event.preventDefault();
                          const rect = event.currentTarget.getBoundingClientRect();
                          openColumnContextMenu(
                            column,
                            event.currentTarget,
                            rect.left + Math.min(48, rect.width / 2),
                            rect.top + Math.min(30, rect.height / 2)
                          );
                        }
                      }}
                      className={`relative px-3 py-2.5 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${
                        column === 'duration_frames'
                          ? 'text-right'
                          : column === 'status'
                            ? 'text-center'
                            : ''
                      }`}
                      style={{ width: tablePresentation.columnWidths[column], ...frozenStyle(column, true) }}
                    >
                      <span className={`block truncate pr-1 ${selectedPins.includes(column) ? 'font-bold underline underline-offset-4' : ''}`}>
                        <ShotTableText text={columnLabels[column]} maxLines={1} />
                      </span>
                      <button
                        type="button"
                        aria-label={`调整${columnLabels[column]}列宽`}
                        title={`拖动调整${columnLabels[column]}列宽；方向键微调`}
                        onPointerDown={event => handleResizePointerDown(column, event)}
                        onKeyDown={event => handleResizeKeyDown(column, event)}
                        className="absolute inset-y-0 right-0 z-20 w-2 cursor-col-resize touch-none border-0 bg-transparent p-0 outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="pointer-events-none absolute inset-y-1 right-0 w-px bg-border" /></button>
                    </th>
                  )), ...visibleCustomFields.map(field => (
                    <th
                      data-shot-column={field.column_key} key={field.column_key}
                      scope="col"
                      className="relative px-3 py-2.5 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                      style={{ width: columnWidths[field.column_key], ...frozenStyle(field.column_key, true) }}
                      tabIndex={0}
                      onContextMenu={event => {
                        event.preventDefault();
                        void refreshColumnClipboard();
                        setContextTarget({ kind: 'custom-column', columnKey: field.column_key as `custom:${string}`, fieldId: field.id, revision: field.revision,
                          label: field.label, x: event.clientX, y: event.clientY, returnFocus: event.currentTarget });
                      }}
                      onKeyDown={event => {
                        if (event.key !== 'ContextMenu' && !(event.shiftKey && event.key === 'F10')) return;
                        event.preventDefault();
                        const rect = event.currentTarget.getBoundingClientRect();
                        void refreshColumnClipboard();
                        setContextTarget({ kind: 'custom-column', columnKey: field.column_key as `custom:${string}`, fieldId: field.id, revision: field.revision,
                          label: field.label, x: rect.left + 24, y: rect.bottom, returnFocus: event.currentTarget });
                      }}
                      title={field.description || field.label}
                    >
                      <span className={`block truncate ${selectedPins.includes(field.column_key) ? 'font-bold underline underline-offset-4' : ''}`}><ShotTableText text={field.label} maxLines={1} /></span>
                      <span className="mt-0.5 block truncate text-[9px] font-normal normal-case tracking-normal text-muted-foreground">
                        <ShotTableText text={`自定义 · ${field.field_type}`} maxLines={1} />
                      </span>
                      <button type="button" aria-label={`调整${field.label}列宽`} title={`拖动调整${field.label}列宽；方向键微调`}
                        onPointerDown={event => handleResizePointerDown(field.column_key, event)} onKeyDown={event => handleResizeKeyDown(field.column_key, event)}
                        className="absolute inset-y-0 right-0 z-20 w-2 cursor-col-resize touch-none border-0 bg-transparent p-0 outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="pointer-events-none absolute inset-y-1 right-0 w-px bg-border" /></button>
                    </th>
                  ))], true)}
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {shotGroups.map(group => (
                  <React.Fragment key={group.key}>
                    {groupMode !== 'none' && (
                      <tr className="bg-muted/55">
                        <td
                          colSpan={tableColumnCount}
                          className="px-3 py-2 text-xs text-foreground"
                        >
                          <div className="flex min-w-0 items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-2">
                              <Icons.ListVideo className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                              <span className="truncate font-medium">{group.label}</span>
                            </div>
                            <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                              {group.shots.length} 镜头
                            </span>
                          </div>
                        </td>
                      </tr>
                    )}
                    {group.shots.map(shot => {
                  const isSelected = selectedShotIds.includes(shot.id);
                  const isInspected = inspectedShotId === shot.id;
                  const durationSec = ((shot.duration_frames || 0) / fps).toFixed(1);

                  return (
                    <tr
                      key={shot.id}
                      data-shot-id={shot.id}
                      onClick={event => {
                        selectShot(
                          shot.id,
                          event.shiftKey,
                          event.metaKey || event.ctrlKey,
                          visibleShotIds
                        );
                      }}
                      onDoubleClick={() => openInspector(shot.id)}
                      onContextMenu={event => {
                        event.preventDefault();
                        openRowContextMenu(
                          shot,
                          event.currentTarget,
                          event.clientX,
                          event.clientY,
                          event.target as HTMLElement
                        );
                      }}
                      onKeyDown={event => {
                        if ((event.target as HTMLElement).closest('input,textarea,select,[contenteditable="true"]')) return;
                        if ((event.metaKey || event.ctrlKey) && ['c','x','v'].includes(event.key.toLowerCase())) {
                          event.preventDefault(); event.stopPropagation();
                          const ids = selectedShotIds.includes(shot.id) ? selectedShotIds : [shot.id];
                          if (event.key.toLowerCase() === 'v') void commands.paste(shot.id);
                          else if (event.key.toLowerCase() === 'c' || commands.canWrite) void commands.copy(ids, event.key.toLowerCase() === 'x');
                          return;
                        }
                        if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
                          event.preventDefault();
                          const rect = event.currentTarget.getBoundingClientRect();
                          openRowContextMenu(
                            shot,
                            event.currentTarget,
                            rect.left + Math.min(48, rect.width / 2),
                            rect.top + Math.min(30, rect.height / 2)
                          );
                        } else if (event.key === 'Enter') {
                          event.preventDefault();
                          openInspector(shot.id);
                        } else if (event.key === ' ') {
                          event.preventDefault();
                          selectShot(
                            shot.id,
                            event.shiftKey,
                            event.metaKey || event.ctrlKey,
                            visibleShotIds
                          );
                        }
                      }}
                      tabIndex={0}
                      aria-selected={isSelected}
                      aria-current={isInspected ? 'true' : undefined}
                      className={`group cursor-pointer transition-colors ${isSelected ? 'bg-accent' : 'hover:bg-accent'} ${reorderPreview?.sourceIds.includes(shot.id) ? 'opacity-40' : ''}`}
                      style={reorderPreview?.targetId === shot.id ? { boxShadow: reorderPreview.insertAfter ? 'inset 0 -4px 0 #3b82f6' : 'inset 0 4px 0 #3b82f6' } : undefined}
                    >
                      <td style={frozenStyle('selection')} data-shot-column="selection" className={`w-10 px-2 ${rowPadding}`}>
                        <input type="checkbox" aria-label={`选择镜头 ${shot.display_number}`} checked={isSelected}
                          onChange={() => {}}
                          onClick={event => { event.stopPropagation(); selectShot(shot.id, event.shiftKey, event.ctrlKey || event.metaKey, visibleShotIds); }}
                          onDoubleClick={event => event.stopPropagation()}
                          className="h-4 w-4 cursor-pointer accent-foreground" />
                      </td>
                      <td style={frozenStyle('annotations')} data-shot-column="annotations" className={`w-10 px-2 ${rowPadding}`} />
                      {showShotNumber && <td
                        style={frozenStyle('display_number')} data-shot-column="display_number"
                        className={`sticky left-0 z-10 w-20 border-r border-border px-2 ${rowPadding} font-mono font-bold text-foreground ${
                          isSelected ? 'bg-accent' : 'bg-card group-hover:bg-accent'
                        }`}
                      >
                          <button
                            type="button"
                            aria-label={
                              canReorder
                                ? `拖动镜头 ${shot.display_number} 调整顺序；方向键可逐行移动`
                                : '当前分组或排序状态下不可调整镜头顺序'
                            }
                            title={
                              canReorder
                                ? '拖动调整镜头顺序；聚焦后使用 ↑ / ↓ 微调'
                                : '清除分组并恢复默认升序后可调整镜头顺序'
                            }
                            onClick={event => {
                              event.stopPropagation();
                              if (!suppressReorderClickRef.current) selectShot(shot.id, event.shiftKey, event.ctrlKey || event.metaKey, visibleShotIds);
                              suppressReorderClickRef.current = false;
                            }}
                            onDoubleClick={event => event.stopPropagation()}
                            onPointerDown={event => beginShotReorder(shot.id, event)}
                            onPointerMove={moveShotReorder}
                            onPointerUp={event => finishShotReorder(event, true)}
                            onPointerCancel={event => finishShotReorder(event, false)}
                            onLostPointerCapture={event => finishShotReorder(event, false)}
                            onKeyDown={event => {
                              if (event.key === 'ArrowUp') {
                                event.stopPropagation();
                                event.preventDefault();
                                void moveShotByKeyboard(shot.id, -1);
                              } else if (event.key === 'ArrowDown') {
                                event.stopPropagation();
                                event.preventDefault();
                                void moveShotByKeyboard(shot.id, 1);
                              }
                            }}
                            className={`flex h-7 w-full min-w-0 items-center gap-1 rounded-md px-1 text-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring ${canReorder && !reorderShots.isPending ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
                          >
                            <Icons.GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                            <span className="min-w-0 flex-1"><ShotTableText text={shot.display_number} maxLines={1} /></span>
                          </button>
                      </td>}
                      {orderColumnElements([...visibleColumns.map(column => {
                        if (PENDING_SHOT_TABLE_COLUMNS.has(column)) return <td data-shot-column={column} key={column} className={`px-3 ${rowPadding} text-muted-foreground`} title="此列暂不可编辑">—</td>;
                        if (column === 'primary_method') return <td data-shot-column={column} key={column} className={`px-3 ${rowPadding}`}><div className="flex flex-wrap gap-1">{shotMethodValues(shot).map(method => <MethodBadge key={method} method={method} size="sm" />)}</div></td>;
                        if (column === 'tc_in') return <td data-shot-column={column} key={column} className={`px-3 ${rowPadding} font-mono`}>
                          <div className="flex items-center gap-2 whitespace-nowrap" aria-label={`起始时码 ${shotTimecodes[shot.id]?.in || '—'}`}><span className="w-[3ch] shrink-0 text-muted-foreground" title="起始时码">IN</span>{shotTimecodes[shot.id]?.in || '—'}</div>
                          <div className="flex items-center gap-2 whitespace-nowrap" aria-label={`结束时码 ${shotTimecodes[shot.id]?.out || '—'}`}><span className="w-[3ch] shrink-0 text-muted-foreground" title="结束时码">OUT</span>{shotTimecodes[shot.id]?.out || '—'}</div>
                        </td>;
                        if (column === 'sequence_id') return <td data-shot-column={column} key={column} className={`px-3 ${rowPadding}`}>{sequences.find(sequence => sequence.id === shot.sequence_id)?.name || '—'}</td>;
                        if (['name', 'camera_angle', 'performance', 'dialogue', 'action'].includes(column)) return <td data-shot-column={column} key={column} className={`px-3 ${rowPadding}`}><InlineEditCell productionId={production.id} shot={shot} field={column as keyof Shot} value={String(shot[column as keyof Shot] || '')} placeholder={`双击输入${SHOT_TABLE_COLUMN_LABELS[column]}`} /></td>;

                        if (column === 'panel_image') {
                          return (
                            <td data-shot-column={column} key={column} className={`px-2 ${rowPadding}`}>
                              <ShotImageCell shot={shot} />
                            </td>
                          );
                        }

                        if (column === 'shot_size') {
                          return (
                            <td data-shot-column={column} key={column} className={`px-3 ${rowPadding} font-mono text-foreground`}>
                              {shot.shot_size || '全景'}
                            </td>
                          );
                        }

                        if (column === 'lens_mm') {
                          return (
                            <td data-shot-column={column} key={column} className={`px-3 ${rowPadding} font-mono text-muted-foreground`}>
                              {shot.lens_mm ? `${shot.lens_mm}mm` : '—'}
                            </td>
                          );
                        }

                        if (column === 'camera_movement') {
                          return (
                            <td data-shot-column={column} key={column} className={`max-w-[120px] px-3 ${rowPadding} text-foreground ${wrappedColumns.includes(column) ? 'whitespace-pre-wrap break-words' : 'truncate'}`}>
                              {shotMovementLabel(shot)}
                            </td>
                          );
                        }

                        if (column === 'description') {
                          return (
                            <td data-shot-column={column} key={column} className={`px-3 ${rowPadding} text-foreground ${wrappedColumns.includes(column) ? '[&_.line-clamp-1]:line-clamp-none [&_.line-clamp-1]:whitespace-pre-wrap [&_.line-clamp-1]:break-words' : ''}`}>
                              <InlineEditCell
                                productionId={production.id}
                                shot={shot}
                                field="description"
                                value={shot.description || ''}
                                placeholder="双击输入画面描述"
                              />
                            </td>
                          );
                        }

                        if (column === 'voice_over') {
                          return (
                            <td data-shot-column={column} key={column} className={`px-3 ${rowPadding} text-foreground ${wrappedColumns.includes(column) ? '[&_.line-clamp-1]:line-clamp-none [&_.line-clamp-1]:whitespace-pre-wrap [&_.line-clamp-1]:break-words' : ''}`}>
                              <InlineEditCell
                                productionId={production.id}
                                shot={shot}
                                field="voice_over"
                                value={shot.voice_over || ''}
                                placeholder="双击输入旁白"
                              />
                            </td>
                          );
                        }

                        if (column === 'duration_frames') {
                          return (
                            <td data-shot-column={column} key={column} className={`px-3 ${rowPadding} text-right font-mono`}>
                              <div className="flex items-center justify-end gap-1.5">
                                <div className="min-w-0 flex-1 text-right">
                                  <span className="block font-bold text-foreground"><ShotTableText text={`${shot.duration_frames}f`} maxLines={1} /></span>
                                  <span className="block text-muted-foreground"><ShotTableText text={`(${durationSec}s)`} maxLines={1} /></span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={event => toggleLock(shot, event)}
                                  aria-label={shot.timing_locked ? '已锁定' : '未锁定'}
                                  title={shot.timing_locked ? '已锁定' : '未锁定'}
                                  className={`h-6 w-6 shrink-0 ${
                                    shot.timing_locked ? 'text-foreground' : 'text-muted-foreground'
                                  }`}
                                >
                                  {shot.timing_locked ? (
                                    <Icons.Lock className="h-3 w-3" />
                                  ) : (
                                    <Icons.LockOpen className="h-3 w-3" />
                                  )}
                                </Button>
                              </div>
                            </td>
                          );
                        }

                        if (column === 'department') {
                          return (
                            <td data-shot-column={column} key={column} className={`px-3 ${rowPadding} font-mono text-muted-foreground`}>
                              {shot.department || 'Camera'}
                            </td>
                          );
                        }

                        if (column === 'owner_id') {
                          return (
                            <td data-shot-column={column} key={column} className={`px-3 ${rowPadding} text-foreground ${wrappedColumns.includes(column) ? '[&_.line-clamp-1]:line-clamp-none [&_.line-clamp-1]:whitespace-pre-wrap [&_.line-clamp-1]:break-words' : ''}`}>
                              {shot.owner_id || '—'}
                            </td>
                          );
                        }

                        return (
                          <td data-shot-column={column} key={column} className={`px-3 ${rowPadding} text-center`}>
                            <StatusBadge status={shot.status} />
                          </td>
                        );
                      }).map(cell => {
                        const element = cell as React.ReactElement<React.HTMLAttributes<HTMLTableCellElement>>;
                        const column = element.key as string;
                        return React.cloneElement(element, { style: { ...element.props.style, ...frozenStyle(column), ...(column in frozenOffsets && isSelected ? { background: 'var(--accent)' } : {}) } });
                      }), ...visibleCustomFields.map(field => (
                        <td
                          key={field.column_key}
                          data-shot-column={field.column_key}
                          data-custom-field-id={field.id}
                          className={`px-3 ${rowPadding} text-foreground`}
                          style={{ width: columnWidths[field.column_key], ...frozenStyle(field.column_key), ...(field.column_key in frozenOffsets && isSelected ? { background: 'var(--accent)' } : {}) }}
                        >
                          <CustomFieldCell
                            productionId={production.id}
                            shot={shot}
                            field={field}
                            format={tablePresentation.columnFormats[field.column_key]}
                            fps={production.fps_num / (production.fps_den || 1)}
                            value={customFieldValueMatrix?.values[shot.id]?.[field.id]}
                          />
                        </td>
                      ))])}
                    </tr>
                  );
                    })}
                  </React.Fragment>
                ))}
                {isNewShotRowOpen && <NewShotRow production={production} shots={shots} columns={orderedColumns} onDone={() => setNewShotRowOpen(false)} />}
              </tbody>
            </table>
          )}
        </div>

        {isInspectorOpen && inspectedShot && (
          <>
            <div
              className="fixed inset-0 z-40 bg-background/70 lg:hidden"
              onClick={closeInspector}
              aria-hidden="true"
            />
            <div className="fixed inset-x-2 top-[58px] bottom-[calc(env(safe-area-inset-bottom)+8px)] z-50 min-w-0 overflow-hidden rounded-lg border border-border bg-card shadow-2xl [&>aside]:h-full [&>aside]:w-full lg:static lg:inset-auto lg:z-auto lg:w-[380px] lg:shrink-0 lg:rounded-none lg:border-0 lg:shadow-none lg:[&>aside]:w-[380px]">
              <ShotInspector
                shot={inspectedShot}
                production={production}
                onClose={closeInspector}
              />
            </div>
          </>
        )}
      </div>

      {production && <ImportModal production={production} isOpen={isImportOpen} onClose={() => setImportOpen(false)} />}
      {commands.error && <p role="alert" className="px-3 py-2 text-xs text-destructive">{commands.error}</p>}
      <ShotTableContextMenu
        commands={commands}
        canAutoTime={contextTarget?.kind === 'row' && Boolean(shots.find(shot => shot.id === contextTarget.shotId && !shot.timing_locked && shot.voice_over?.trim()))}
        onSelectShot={shotId => selectShot(shotId, false, false, visibleShotIds)}
        productionId={production.id}
        target={contextTarget}
        sortKey={sortKey}
        sortDirection={sortDirection}
        onOpenChange={open => {
          if (!open) setContextTarget(null);
        }}
        onOpenInspector={openInspector}
        onClearSelection={clearSelection}
        onNewShot={() => setNewShotRowOpen(true)}
        onOpenTrash={() => setIsTrashOpen(true)}
        columnLabels={columnLabels}
        canPasteColumn={Boolean(columnClipboard)}
        columnPending={copyColumn.isPending || insertFields.isPending || updateCustomField.isPending || setCustomFieldState.isPending || setBuiltinColumnState.isPending}
        onInsertColumn={(column, after) => openColumnDialog(column, 'insert', after)}
        onCopyColumn={(column, cut) => void copyTableColumn(column, cut)}
        onPasteColumn={column => void pasteTableColumn(column)}
        wrappedColumns={wrappedColumns}
        onToggleWrap={column => {
          const next = wrappedColumns.includes(column) ? wrappedColumns.filter(item => item !== column) : [...wrappedColumns, column];
          setWrappedColumns(next);
          window.localStorage.setItem(`frameforge:shot-wrap:${id}`, JSON.stringify(next));
        }}
        onCopyCell={value => {
          void Promise.resolve().then(() => navigator.clipboard.writeText(value)).then(
            () => setClipboardMessage('单元格文本已复制'),
            () => setClipboardMessage('无法访问剪贴板，请允许浏览器访问后重试')
          );
        }}
        onSort={(column, direction) => {
          setSortKey(column);
          setSortDirection(direction);
        }}
        onClearSort={() => {
          setSortKey('default');
          setSortDirection('asc');
        }}
        onAutoFitColumn={autoFitColumn}
        onDeleteColumn={async column => {
          const field = customFields.find(field => field.column_key === column);
          if (field) await setCustomFieldState.mutateAsync({ id: field.id, revision: field.revision, state: 'removed' });
          else await setBuiltinColumnState.mutateAsync({ column, revision: builtinColumnStates.find(row => row.column_key === column)?.revision || 0, state: 'removed' });
          setSelectedPins(current => current.filter(key => key !== column));
          setRenderedPins(current => current.filter(key => key !== column));
          if (sortKey === column) setSortKey('default');
          if (cutColumn === column) { setCutColumn(null); setColumnClipboard(null); }
        }}
        onHideColumn={column => {
          const field = customFields.find(field => field.column_key === column);
          if (field) void setCustomFieldState.mutateAsync({ id: field.id, revision: field.revision, state: 'hidden' }).catch(cause => setClipboardMessage(cause instanceof Error ? cause.message : '隐藏列失败。'));
          else handleColumnVisibleChange(column as ShotTableColumnKey, false);
        }}
      />

      {columnDialog && <ShotColumnDialog key={`${columnDialog.mode}:${columnDialog.column}`} mode={columnDialog.mode}
        label={columnLabels[columnDialog.column]}
        candidates={columnDialog.mode === 'insert' ? hiddenCandidates : []}
        existingLabels={Object.entries(columnLabels).filter(([key]) => key !== columnDialog.column).map(([, label]) => label)}
        returnFocus={columnDialog.returnFocus} onCancel={() => setColumnDialog(null)} onConfirm={confirmColumnDialog} />}

      {clipboardMessage && (
        <div role="status" className="shrink-0 border-t border-border bg-card px-3 py-2 text-xs">
          {clipboardMessage}
          <Button variant="ghost" size="sm" onClick={() => setClipboardMessage(null)}>关闭</Button>
        </div>
      )}


    </div>
  );
}
