'use client';

import { Button, Icons, Input, Select } from '@frameforge/ui';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import type { Shot } from '@frameforge/types';
import { useProduction, useReorderShots, useShots, useUpdateShot } from '@/lib/hooks/useProduction';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { MethodBadge } from '@/components/shot/MethodBadge';
import { StatusBadge } from '@/components/shot/StatusBadge';
import { ShotInspector } from '@/components/shot/ShotInspector';
import { ShotTrashModal } from '@/components/shot/ShotTrashModal';
import { InlineEditCell } from '@/components/shot/InlineEditCell';
import { ShotColumnManager } from '@/components/shot/ShotColumnManager';
import {
  ShotTableContextMenu,
  type ShotTableContextColumnKey,
  type ShotTableContextTarget
} from '@/components/shot/ShotTableContextMenu';
import { BulkActionToolbar } from '@/components/storyboard/BulkActionToolbar';
import { shotMovementLabel } from '@/lib/shot-display';
import {
  SHOT_TABLE_COLUMN_LABELS,
  clampShotTableColumnWidth,
  defaultShotTablePresentationPreferences,
  loadShotTablePresentationPreferences,
  saveShotTablePresentationPreferences,
  type ShotTableColumnKey,
  type ShotTablePresentationPreferences,
  type ShotTableRowHeight
} from '@/lib/shot-table-presentation';

const ROW_PADDING: Record<ShotTableRowHeight, string> = {
  compact: 'py-1',
  standard: 'py-2',
  comfortable: 'py-3',
  auto: 'py-2'
};

function shotColumnValue(
  shot: Shot,
  column: ShotTableContextColumnKey
): string | number {
  switch (column) {
    case 'display_number':
      return shot.display_number || '';
    case 'primary_method':
      return shot.primary_method || '';
    case 'shot_size':
      return shot.shot_size || '';
    case 'lens_mm':
      return shot.lens_mm ?? 0;
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
      return shot.status || '';
  }
}

export default function ShotListPage() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : '';

  const { data: production } = useProduction(id);
  const { data: shots = [], isLoading } = useShots(id);
  const updateShot = useUpdateShot(id);
  const reorderShots = useReorderShots(id);

  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [sortKey, setSortKey] = useState<'default' | ShotTableContextColumnKey>('default');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [tablePresentation, setTablePresentation] = useState<ShotTablePresentationPreferences>(
    () => defaultShotTablePresentationPreferences()
  );
  const [contextTarget, setContextTarget] = useState<ShotTableContextTarget | null>(null);
  const [reorderPreview, setReorderPreview] = useState<{
    sourceIds: string[];
    targetId: string | null;
    insertAfter: boolean;
    x: number;
    y: number;
  } | null>(null);
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
    closeInspector
  } = useWorkspaceStore();

  useEffect(() => {
    if (!id || typeof window === 'undefined') return;
    setTablePresentation(loadShotTablePresentationPreferences(id, window.localStorage));
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
      return { ...current, columnOrder: nextOrder };
    });
  };

  const handleRowHeightChange = (rowHeight: ShotTableRowHeight) => {
    commitTablePresentation(current => ({ ...current, rowHeight }));
  };

  const resetColumnLayout = () => {
    const next = defaultShotTablePresentationPreferences();
    setTablePresentation(next);
    if (id && typeof window !== 'undefined') {
      saveShotTablePresentationPreferences(id, next, window.localStorage);
    }
  };

  const resizeColumnBy = (column: ShotTableColumnKey, delta: number) => {
    commitTablePresentation(current => ({
      ...current,
      columnWidths: {
        ...current.columnWidths,
        [column]: clampShotTableColumnWidth(column, current.columnWidths[column] + delta)
      }
    }));
  };

  const handleResizePointerDown = (
    column: ShotTableColumnKey,
    event: React.PointerEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startWidth = tablePresentation.columnWidths[column];
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
    column: ShotTableColumnKey,
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

  const autoFitColumn = (column: ShotTableColumnKey) => {
    const labelLength = SHOT_TABLE_COLUMN_LABELS[column].length;
    const longestContent = shots.reduce((max, shot) => {
      const value = String(shotColumnValue(shot, column));
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
    y: number
  ) => {
    const validSelectedIds = selectedShotIds.filter(selectedId =>
      shots.some(candidate => candidate.id === selectedId)
    );
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
      name: shot.name
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
    const orderedShots = [...shots].sort((a, b) => (a.sort_index - b.sort_index) || a.id.localeCompare(b.id));
    const filtered = orderedShots.filter(item => {
      if (
        query &&
        ![
          item.display_number,
          item.name,
          item.description,
          item.voice_over,
          item.owner_id,
          item.department,
          item.status,
          item.primary_method
        ].some(value => String(value || '').toLowerCase().includes(query))
      ) return false;

      if (filters.primaryMethod !== 'all' && item.primary_method !== filters.primaryMethod) return false;
      if (filters.department !== 'all' && item.department !== filters.department) return false;
      if (filters.status !== 'all' && item.status !== filters.status) return false;
      return true;
    });

    if (sortKey === 'default') return filtered;

    return [...filtered].sort((a, b) => {
      const left = shotColumnValue(a, sortKey);
      const right = shotColumnValue(b, sortKey);

      const comparison =
        typeof left === 'number' && typeof right === 'number'
          ? left - right
          : String(left).localeCompare(String(right), undefined, {
              numeric: true,
              sensitivity: 'base'
            });

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [shots, filters, sortKey, sortDirection]);

  const canonicalShots = useMemo(
    () => [...shots].sort((a, b) => (a.sort_index - b.sort_index) || a.id.localeCompare(b.id)),
    [shots]
  );
  const canonicalShotIds = useMemo(
    () => canonicalShots.map(shot => shot.id),
    [canonicalShots]
  );

  const clearShotReorderDrag = () => {
    const drag = reorderDragRef.current;
    if (drag) {
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
    groupIds: string[]
  ) => {
    if (sortKey !== 'default' || reorderShots.isPending) return;

    const valid = new Set(canonicalShotIds);
    const movingSet = new Set(
      [sourceId, ...groupIds].filter(shotId => valid.has(shotId))
    );
    if (!movingSet.size || movingSet.has(targetId) || !valid.has(targetId)) return;

    const moving = canonicalShotIds.filter(shotId => movingSet.has(shotId));
    const remaining = canonicalShotIds.filter(shotId => !movingSet.has(shotId));
    let insertion = remaining.indexOf(targetId);
    if (insertion < 0) return;
    if (insertAfter) insertion += 1;

    const nextOrder = [
      ...remaining.slice(0, insertion),
      ...moving,
      ...remaining.slice(insertion)
    ];
    if (nextOrder.every((shotId, index) => shotId === canonicalShotIds[index])) return;

    try {
      await reorderShots.mutateAsync({
        orderedShotIds: nextOrder,
        baseOrder: canonicalShotIds,
        revisions: Object.fromEntries(canonicalShots.map(shot => [shot.id, shot.revision]))
      });
    } catch {
      // Mutation error state is rendered above the table; optimistic state is
      // rolled back by the hook before the next interaction is allowed.
    }
  };

  const beginShotReorder = (
    shotId: string,
    event: React.PointerEvent<HTMLButtonElement>
  ) => {
    event.stopPropagation();
    if (sortKey !== 'default' || reorderShots.isPending) return;

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
      timer: undefined as unknown as ReturnType<typeof setTimeout>
    };

    const activate = () => {
      if (reorderDragRef.current !== drag || drag.active) return;
      drag.active = true;
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
      } else if (event.pointerType !== 'mouse' && distance > 10) {
        clearShotReorderDrag();
        return;
      } else {
        return;
      }
    }

    event.preventDefault();
    event.stopPropagation();

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
      event.preventDefault();
      event.stopPropagation();
    }

    const snapshot = {
      sourceId: drag.sourceId,
      groupIds: drag.groupIds,
      targetId: drag.targetId,
      insertAfter: drag.insertAfter,
      active: drag.active
    };
    clearShotReorderDrag();

    if (shouldCommit && snapshot.active && snapshot.targetId) {
      void commitShotReorder(
        snapshot.sourceId,
        snapshot.targetId,
        snapshot.insertAfter,
        snapshot.groupIds
      );
    }
  };

  const moveShotByKeyboard = (sourceId: string, direction: -1 | 1) => {
    if (sortKey !== 'default' || reorderShots.isPending) return;
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

  if (!production) return null;

  const fps = production.fps_num / (production.fps_den || 1);

  const visibleShotIds = visibleShots.map(item => item.id);
  const visibleColumns = tablePresentation.columnOrder.filter(
    column => !tablePresentation.hiddenColumns.includes(column)
  );
  const tableMinWidth =
    192 + visibleColumns.reduce(
      (sum, column) => sum + tablePresentation.columnWidths[column],
      0
    );
  const rowPadding = ROW_PADDING[tablePresentation.rowHeight];

  const activeFilterCount = [
    filters.primaryMethod !== 'all',
    filters.department !== 'all',
    filters.status !== 'all'
  ].filter(Boolean).length;

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
      <div className="z-10 shrink-0 border-b border-border bg-card/90 px-3 py-2 sm:px-6 sm:py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 basis-full sm:basis-64 sm:max-w-xs">
            <Icons.Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              value={filters.searchQuery}
              onChange={event => setFilter('searchQuery', event.target.value)}
              placeholder="搜索镜号、画面、旁白、负责人..."
              className="w-full min-w-0 pl-8"
            />
          </div>

          <span className="whitespace-nowrap text-xs font-mono text-muted-foreground">
            显示 <span className="font-bold text-foreground">{visibleShots.length}</span> / {shots.length}
          </span>

          {selectedShotIds.length > 0 && (
            <span className="whitespace-nowrap rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
              已选 {selectedShotIds.length}
            </span>
          )}

          {reorderShots.isPending && (
            <span className="whitespace-nowrap text-[11px] font-mono text-muted-foreground">
              ↻ 排序同步中…
            </span>
          )}
          {reorderShots.error && (
            <span
              role="alert"
              className="max-w-72 truncate text-[11px] text-destructive"
              title={reorderShots.error instanceof Error ? reorderShots.error.message : '镜头排序保存失败'}
            >
              {reorderShots.error instanceof Error ? reorderShots.error.message : '镜头排序保存失败'}
            </span>
          )}

          <div className="ml-auto flex max-w-full items-center gap-1 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Button
              variant={showFilters || activeFilterCount > 0 ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setShowFilters(value => !value)}
              aria-expanded={showFilters}
              className="h-8 text-xs"
            >
              <Icons.Filter className="h-3.5 w-3.5" />
              筛选{activeFilterCount ? ` · ${activeFilterCount}` : ''}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => selectAllShots(visibleShotIds)}
              disabled={!visibleShotIds.length}
              className="h-8 text-xs"
            >
              全选可见
            </Button>

            {selectedShotIds.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearSelection} className="h-8 text-xs">
                清除选择
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              disabled={selectedShotIds.length !== 1}
              onClick={() => selectedShotIds[0] && openInspector(selectedShotIds[0])}
              className="h-8 text-xs"
            >
              <Icons.PanelRightOpen className="h-3.5 w-3.5" />
              详情
            </Button>

            <ShotColumnManager
              columnOrder={tablePresentation.columnOrder}
              hiddenColumns={tablePresentation.hiddenColumns}
              rowHeight={tablePresentation.rowHeight}
              onVisibleChange={handleColumnVisibleChange}
              onMove={handleColumnMove}
              onRowHeightChange={handleRowHeightChange}
              onReset={resetColumnLayout}
            />

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsTrashOpen(true)}
              className="h-8 text-xs hover:text-foreground"
            >
              <Icons.Trash2 className="h-3.5 w-3.5" />
              废纸篓
            </Button>
          </div>
        </div>
      </div>

      {showFilters && (
        <div className="z-10 shrink-0 border-b border-border bg-background px-3 py-3 sm:px-6">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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

      {reorderPreview && reorderPreview.sourceIds.length > 1 && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-[80] flex items-center gap-1 rounded-md border border-border bg-popover px-2 py-1 text-[11px] font-medium text-popover-foreground shadow-md"
          style={{ left: reorderPreview.x + 14, top: reorderPreview.y + 14 }}
        >
          <Icons.GripVertical className="h-3 w-3 text-muted-foreground" />
          {reorderPreview.sourceIds.length} 个镜头
        </div>
      )}

      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
        <div
          className="min-h-0 min-w-0 flex-1 overflow-auto overscroll-contain"
          role="region"
          aria-label="镜头制作表"
          tabIndex={0}
        >
          {isLoading ? (
            <div className="flex h-64 items-center justify-center font-mono text-xs text-muted-foreground">
              正在加载镜头制作表...
            </div>
          ) : (
            <table
              className="w-full table-fixed border-collapse text-left font-sans text-xs"
              style={{ minWidth: `${Math.max(tableMinWidth, 360)}px` }}
            >
              <thead className="sticky top-0 z-10 border-b border-border bg-card text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th
                    scope="col"
                    tabIndex={0}
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
                    className="sticky left-0 z-30 w-20 border-r border-border bg-card px-3 py-2.5 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  >
                    镜号
                  </th>
                  <th
                    scope="col"
                    tabIndex={0}
                    onContextMenu={event => {
                      event.preventDefault();
                      openColumnContextMenu(
                        'primary_method',
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
                          'primary_method',
                          event.currentTarget,
                          rect.left + Math.min(48, rect.width / 2),
                          rect.top + Math.min(30, rect.height / 2)
                        );
                      }
                    }}
                    className="sticky left-20 z-30 w-28 border-r border-border bg-card px-3 py-2.5 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  >
                    制作方式
                  </th>
                  {visibleColumns.map(column => (
                    <th
                      key={column}
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
                      style={{ width: tablePresentation.columnWidths[column] }}
                    >
                      <span className="block truncate pr-1">
                        {SHOT_TABLE_COLUMN_LABELS[column]}
                      </span>
                      <button
                        type="button"
                        aria-label={`调整${SHOT_TABLE_COLUMN_LABELS[column]}列宽`}
                        title={`拖动调整${SHOT_TABLE_COLUMN_LABELS[column]}列宽；方向键微调`}
                        onPointerDown={event => handleResizePointerDown(column, event)}
                        onKeyDown={event => handleResizeKeyDown(column, event)}
                        className="absolute inset-y-0 right-0 z-20 w-2 cursor-col-resize touch-none border-0 bg-transparent p-0 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {visibleShots.map(shot => {
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
                          event.clientY
                        );
                      }}
                      onKeyDown={event => {
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
                      className={`group cursor-pointer transition-[color,background-color,opacity,box-shadow] duration-100 ${
                        isSelected ? 'bg-accent hover:bg-accent/80' : 'hover:bg-accent'
                      } ${isInspected ? 'ring-1 ring-inset ring-ring/50' : ''} ${
                        reorderPreview?.sourceIds.includes(shot.id) ? 'relative z-[1] opacity-70 shadow-sm' : ''
                      }`}
                      style={
                        reorderPreview?.targetId === shot.id
                          ? {
                              boxShadow: reorderPreview.insertAfter
                                ? 'inset 0 -2px 0 hsl(var(--primary))'
                                : 'inset 0 2px 0 hsl(var(--primary))'
                            }
                          : undefined
                      }
                    >
                      <td
                        className={`sticky left-0 z-10 w-20 border-r border-border px-3 ${rowPadding} font-mono font-bold text-foreground ${
                          isSelected ? 'bg-accent' : 'bg-card group-hover:bg-accent'
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`调整镜头 ${shot.display_number} 顺序`}
                            aria-disabled={sortKey !== 'default' || reorderShots.isPending}
                            title={
                              sortKey !== 'default'
                                ? '当前表格已排序，请先清除排序后再调整镜头顺序'
                                : '拖动调整顺序；Alt + ↑/↓ 可键盘移动'
                            }
                            onClick={event => event.stopPropagation()}
                            onDoubleClick={event => event.stopPropagation()}
                            onPointerDown={event => beginShotReorder(shot.id, event)}
                            onPointerMove={moveShotReorder}
                            onPointerUp={event => finishShotReorder(event, true)}
                            onPointerCancel={event => finishShotReorder(event, false)}
                            onKeyDown={event => {
                              event.stopPropagation();
                              if (event.altKey && event.key === 'ArrowUp') {
                                event.preventDefault();
                                moveShotByKeyboard(shot.id, -1);
                              } else if (event.altKey && event.key === 'ArrowDown') {
                                event.preventDefault();
                                moveShotByKeyboard(shot.id, 1);
                              }
                            }}
                            className={`h-6 w-6 shrink-0 touch-pan-y p-0 text-muted-foreground transition-opacity ${
                              sortKey === 'default' && !reorderShots.isPending
                                ? 'cursor-grab opacity-45 hover:opacity-100 active:cursor-grabbing'
                                : 'cursor-not-allowed opacity-25'
                            }`}
                          >
                            <Icons.GripVertical className="h-3.5 w-3.5" />
                          </Button>
                          <span className="min-w-0 truncate">{shot.display_number}</span>
                        </div>
                      </td>
                      <td
                        className={`sticky left-20 z-10 w-28 border-r border-border px-3 ${rowPadding} ${
                          isSelected ? 'bg-accent' : 'bg-card group-hover:bg-accent'
                        }`}
                      >
                        <MethodBadge method={shot.primary_method} size="sm" />
                      </td>

                      {visibleColumns.map(column => {
                        if (column === 'shot_size') {
                          return (
                            <td key={column} className={`px-3 ${rowPadding} font-mono text-foreground`}>
                              {shot.shot_size || '全景'}
                            </td>
                          );
                        }

                        if (column === 'lens_mm') {
                          return (
                            <td key={column} className={`px-3 ${rowPadding} font-mono text-muted-foreground`}>
                              {shot.lens_mm ? `${shot.lens_mm}mm` : '—'}
                            </td>
                          );
                        }

                        if (column === 'camera_movement') {
                          return (
                            <td key={column} className={`max-w-[120px] truncate px-3 ${rowPadding} text-foreground`}>
                              {shotMovementLabel(shot)}
                            </td>
                          );
                        }

                        if (column === 'description') {
                          return (
                            <td key={column} className={`px-3 ${rowPadding} text-foreground`}>
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
                            <td key={column} className={`px-3 ${rowPadding} text-foreground`}>
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
                            <td key={column} className={`px-3 ${rowPadding} text-right font-mono`}>
                              <div className="flex items-center justify-end gap-1.5">
                                <span className="font-bold text-foreground">
                                  {shot.duration_frames}f
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  ({durationSec}s)
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={event => toggleLock(shot, event)}
                                  aria-label={shot.timing_locked ? '已锁定' : '未锁定'}
                                  title={shot.timing_locked ? '已锁定' : '未锁定'}
                                  className={`h-6 w-6 ${
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
                            <td key={column} className={`px-3 ${rowPadding} font-mono text-muted-foreground`}>
                              {shot.department || 'Camera'}
                            </td>
                          );
                        }

                        if (column === 'owner_id') {
                          return (
                            <td key={column} className={`px-3 ${rowPadding} text-foreground`}>
                              {shot.owner_id || '—'}
                            </td>
                          );
                        }

                        return (
                          <td key={column} className={`px-3 ${rowPadding} text-center`}>
                            <StatusBadge status={shot.status} />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {isInspectorOpen && inspectedShot && (
          <>
            <div
              className="fixed inset-0 z-40 bg-background/70 md:hidden"
              onClick={closeInspector}
              aria-hidden="true"
            />
            <div className="fixed inset-x-2 top-[58px] bottom-[calc(env(safe-area-inset-bottom)+8px)] z-50 min-w-0 overflow-hidden rounded-lg border border-border bg-card shadow-2xl [&>aside]:h-full [&>aside]:w-full md:static md:inset-auto md:z-auto md:w-[380px] md:shrink-0 md:rounded-none md:border-0 md:shadow-none md:[&>aside]:w-[380px]">
              <ShotInspector
                shot={inspectedShot}
                production={production}
                onClose={closeInspector}
              />
            </div>
          </>
        )}
      </div>

      <ShotTableContextMenu
        productionId={production.id}
        target={contextTarget}
        sortKey={sortKey}
        sortDirection={sortDirection}
        onOpenChange={open => {
          if (!open) setContextTarget(null);
        }}
        onOpenInspector={openInspector}
        onClearSelection={clearSelection}
        onSort={(column, direction) => {
          setSortKey(column);
          setSortDirection(direction);
        }}
        onClearSort={() => {
          setSortKey('default');
          setSortDirection('asc');
        }}
        onAutoFitColumn={autoFitColumn}
        onHideColumn={column => handleColumnVisibleChange(column, false)}
      />

      <BulkActionToolbar
        production={production}
        allShotIds={visibleShotIds}
      />
    </div>
  );
}
