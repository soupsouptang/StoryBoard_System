'use client';

import React, { useState } from 'react';
import { Icons } from '@frameforge/ui';
import type { Production, Sequence, Shot } from '@frameforge/types';
import { framesToSeconds } from '@frameforge/timecode';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useReorderShots } from '@/lib/hooks/useProduction';
import type { CustomFieldDefinition } from '@/lib/hooks/useCustomFields';
import { ShotCard } from './ShotCard';

interface StoryboardGridProps {
  production: Production;
  sequences: Sequence[];
  shots: Shot[];
  allShots?: Shot[];
  fields?: CustomFieldDefinition[];
  customValues?: Record<string, Record<string, unknown>>;
  onSelectShot: (id: string, e: React.MouseEvent) => void;
  onInspectShot: (id: string) => void;
}

export function StoryboardGrid({
  production,
  sequences,
  shots,
  allShots,
  fields,
  customValues,
  onSelectShot,
  onInspectShot
}: StoryboardGridProps) {
  const { selectedShotIds, groupBySequence, cardSize, filters } = useWorkspaceStore();
  const [draggedShotId, setDraggedShotId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [reorderError, setReorderError] = useState<string | null>(null);
  const reorderShots = useReorderShots(production.id);
  const fps = production.fps_num / (production.fps_den || 1);

  const gridColsClass =
    cardSize === 'sm'
      ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3'
      : cardSize === 'lg'
      ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-6'
      : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4';

  const canonicalShots = allShots ?? shots;
  const canonicalOrder = canonicalShots.map(shot => shot.id);
  const filtersAreClear = !filters.searchQuery.trim() && filters.sequenceId === 'all' &&
    filters.primaryMethod === 'all' && filters.department === 'all' && filters.status === 'all' &&
    filters.timingLocked === null && filters.vfxRequired === null;
  const canReorder = Boolean(allShots) && !groupBySequence && filtersAreClear && shots.length > 1 &&
    shots.length === canonicalShots.length && shots.every((shot, index) => shot.id === canonicalShots[index]?.id);

  const moveShot = async (shotId: string, direction: -1 | 1) => {
    if (!canReorder || reorderShots.isPending) return;
    const index = canonicalOrder.indexOf(shotId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= canonicalOrder.length) return;
    const nextOrder = [...canonicalOrder];
    [nextOrder[index], nextOrder[target]] = [nextOrder[target], nextOrder[index]];
    setReorderError(null);
    try {
      await reorderShots.mutateAsync(nextOrder);
    } catch (error) {
      setReorderError(error instanceof Error ? error.message : '镜头排序失败，请重试');
    }
  };

  const renderShot = (shot: Shot) => (
    <ShotCard
      key={shot.id}
      shot={shot}
      production={production}
      isSelected={selectedShotIds.includes(shot.id)}
      onSelect={event => onSelectShot(shot.id, event)}
      onInspect={() => onInspectShot(shot.id)}
      fields={fields}
      customValues={customValues?.[shot.id]}
      canReorder={canReorder && !reorderShots.isPending}
      isDragging={draggedShotId === shot.id}
      isDropTarget={dropTargetId === shot.id && draggedShotId !== shot.id}
      onMove={direction => moveShot(shot.id, direction)}
      onDragStart={event => {
        event.stopPropagation();
        setDraggedShotId(shot.id);
        setDropTargetId(null);
        setReorderError(null);
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', shot.id);
      }}
      onDragEnd={() => {
        setDraggedShotId(null);
        setDropTargetId(null);
      }}
      onDragOver={event => {
        if (!canReorder || reorderShots.isPending || !draggedShotId) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        setDropTargetId(shot.id);
      }}
      onDrop={event => {
        if (!canReorder || reorderShots.isPending || !draggedShotId || draggedShotId === shot.id) return;
        event.preventDefault();
        event.stopPropagation();
        const sourceId = draggedShotId;
        const nextOrder = canonicalOrder.filter(id => id !== sourceId);
        const targetIndex = nextOrder.indexOf(shot.id);
        if (targetIndex < 0) return;
        nextOrder.splice(targetIndex, 0, sourceId);
        setDraggedShotId(null);
        setDropTargetId(null);
        setReorderError(null);
        void reorderShots.mutateAsync(nextOrder).catch(error => {
          setReorderError(error instanceof Error ? error.message : '镜头排序失败，请重试');
        });
      }}
    />
  );

  if (shots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-center text-xs text-muted-foreground">
        <Icons.Search className="h-12 w-12 text-muted-foreground mb-3" />
        <p className="text-foreground font-medium text-sm mb-1">未找到匹配的分镜镜头</p>
        <p>请尝试调整搜索关键字或筛选条件</p>
      </div>
    );
  }

  // If grouping is enabled and no specific sequence filter is applied
  if (groupBySequence && filters.sequenceId === 'all' && sequences.length > 0) {
    return (
      <div className="p-6 space-y-8">
        {reorderError && <p role="alert" className="text-sm text-destructive">{reorderError}</p>}
        {sequences.map(seq => {
          const seqShots = shots.filter(s => s.sequence_id === seq.id);
          if (seqShots.length === 0) return null;

          const seqFrames = seqShots.reduce((acc, s) => acc + (s.duration_frames || 0), 0);
          const seqSec = framesToSeconds(seqFrames, fps).toFixed(1);

          return (
            <div key={seq.id} className="space-y-3">
              {/* Sequence Header */}
              <div className="flex items-center justify-between border-b border-border pb-2">
                <div className="flex items-center gap-3">
                  <span className="rounded bg-accent border border-border px-2 py-0.5 font-mono text-xs font-bold text-accent-foreground">
                    {seq.display_number}
                  </span>
                  <h3 className="text-sm font-bold text-foreground">{seq.name}</h3>
                </div>

                <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground">
                  <span>{seqShots.length} 镜头</span>
                  <span>·</span>
                  <span className="text-foreground font-semibold">{seqSec}s ({seqFrames}f)</span>
                </div>
              </div>

              {/* Grid of Shots */}
              <div className={`grid ${gridColsClass}`}>
                {seqShots.map(renderShot)}
              </div>
            </div>
          );
        })}

        {/* Unassigned shots if any */}
        {shots.filter(s => !s.sequence_id || !sequences.some(seq => seq.id === s.sequence_id)).length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h3 className="text-sm font-bold text-muted-foreground">未归类篇章镜头</h3>
            </div>
            <div className={`grid ${gridColsClass}`}>
              {shots.filter(s => !s.sequence_id || !sequences.some(seq => seq.id === s.sequence_id)).map(renderShot)}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Flat Grid
  return (
    <div className="p-6">
      {reorderError && <p role="alert" className="mb-3 text-sm text-destructive">{reorderError}</p>}
      <div className={`grid ${gridColsClass}`}>{shots.map(renderShot)}</div>
    </div>
  );
}
