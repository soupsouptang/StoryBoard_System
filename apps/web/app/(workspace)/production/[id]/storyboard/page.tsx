'use client';

import { Icons } from '@frameforge/ui';

import React, { Suspense, useMemo, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import type { Sequence, Shot } from '@frameforge/types';
import { useProduction, useShots } from '@/lib/hooks/useProduction';
import { filterShotsForView } from '@/lib/shot-display';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { StoryboardHeader } from '@/components/storyboard/StoryboardHeader';
import { StoryboardGrid } from '@/components/storyboard/StoryboardGrid';
import { WallView } from '@/components/storyboard/WallView';
import { ShotInspector } from '@/components/shot/ShotInspector';
import { BulkActionToolbar } from '@/components/storyboard/BulkActionToolbar';
import { VOTimingModal } from '@/components/storyboard/VOTimingModal';
import { NewShotModal } from '@/components/storyboard/NewShotModal';
import { ImportModal } from '@/components/storyboard/ImportModal';
import { useCustomFields, useCustomFieldValues } from '@/lib/hooks/useCustomFields';

export default function StoryboardPage() {
  return <Suspense fallback={null}><StoryboardWorkspace /></Suspense>;
}

function StoryboardWorkspace() {
  const params = useParams();
  const searchParams = useSearchParams();
  const activeView = searchParams.get('view') === 'wall' ? 'wall' : 'cards';
  const id = typeof params?.id === 'string' ? params.id : '';

  const { data: production } = useProduction(id);
  const { data: shots = [], isLoading } = useShots(id);
  const { data: fields = [] } = useCustomFields(id);
  const { data: fieldValues } = useCustomFieldValues(id);

  const {
    filters,
    selectedShotIds,
    selectShot,
    clearSelection,
    inspectedShotId,
    isInspectorOpen,
    isImportModalOpen,
    openInspector,
    closeInspector,
    toggleInspector
  } = useWorkspaceStore();

  // Derive sequences from actual shot data, or fall back cleanly to unassigned
  const sequences: Sequence[] = useMemo(() => {
    const seqMap = new Map<string, Sequence>();
    let hasUnassigned = false;
    for (const s of shots) {
      if (s.sequence_id) {
        if (!seqMap.has(s.sequence_id)) {
          seqMap.set(s.sequence_id, {
            id: s.sequence_id,
            production_id: id,
            display_number: 'SEQ',
            name: `场次 ${s.sequence_id.slice(0, 8)}`,
            description: '',
            sort_index: 1000,
            created_at: '',
            updated_at: ''
          });
        }
      } else {
        hasUnassigned = true;
      }
    }
    const list = Array.from(seqMap.values());
    if (list.length === 0 || hasUnassigned) {
      list.push({
        id: 'unassigned',
        production_id: id,
        display_number: 'SEQ00',
        name: list.length === 0 ? '全部镜头（未分场）' : '未分场镜头',
        description: '',
        sort_index: 999999,
        created_at: '',
        updated_at: ''
      });
    }
    return list;
  }, [id, shots]);

  // Use real shots mapping empty sequence_id to unassigned
  const enrichedShots: Shot[] = useMemo(() => {
    return shots.map(s => ({
      ...s,
      sequence_id: s.sequence_id || 'unassigned'
    }));
  }, [shots]);

  // Filtered shots
  const filteredShots = useMemo(() => {
    return filterShotsForView(enrichedShots, filters, 'storyboard');
  }, [enrichedShots, filters]);

  const allFilteredIds = useMemo(() => filteredShots.map(s => s.id), [filteredShots]);

  // Currently inspected shot
  const activeInspectedShot = useMemo(() => {
    return enrichedShots.find(s => s.id === inspectedShotId) || null;
  }, [enrichedShots, inspectedShotId]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture when typing in inputs/textareas
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey ||
        (e.target as HTMLElement)?.closest('input, textarea, select, [contenteditable="true"], [role="dialog"], [role="listbox"], [role="menu"]')) {
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        clearSelection();
        closeInspector();
      } else if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        toggleInspector();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clearSelection, closeInspector, toggleInspector]);

  const handleSelectShot = (shotId: string, e: React.MouseEvent) => {
    const isShift = e.shiftKey;
    const isCtrlOrCmd = e.ctrlKey || e.metaKey;
    selectShot(shotId, isShift, isCtrlOrCmd, allFilteredIds);
  };

  const handleInspectShot = (shotId: string) => {
    openInspector(shotId);
  };

  if (!production) return null;

  const nextShotNumber = `${(enrichedShots.length + 1).toString().padStart(3, '0')}`;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      {/* Sticky Header & Filter Toolbar */}
      <StoryboardHeader
        production={production}
        sequences={sequences}
        shots={enrichedShots}
        filteredShots={filteredShots}
        activeView={activeView}
      />

      {/* Main View Area + Inspector Split */}
      <div className="flex flex-1 overflow-hidden">
        {/* Scrollable Storyboard Grid / Wall */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center font-mono text-xs text-muted-foreground">
              <Icons.Film className="animate-spin h-5 w-5 mr-2 text-foreground" />
              正在载入分镜画面...
            </div>
          ) : activeView === 'wall' ? (
            <WallView
              production={production}
              shots={filteredShots}
              onSelectShot={handleSelectShot}
              onInspectShot={handleInspectShot}
            />
          ) : (
            <StoryboardGrid
              production={production}
              sequences={sequences}
              shots={filteredShots}
              allShots={enrichedShots}
              fields={fields}
              customValues={fieldValues?.values}
              onSelectShot={handleSelectShot}
              onInspectShot={handleInspectShot}
            />
          )}
        </div>

        {/* Shot Inspector Side Panel */}
        {isInspectorOpen && activeInspectedShot && (
          <ShotInspector
            shot={activeInspectedShot}
            production={production}
            onClose={closeInspector}
          />
        )}
      </div>

      {/* Multi-Selection Bulk Action Bar */}
      <BulkActionToolbar
        production={production}
        allShotIds={allFilteredIds}
      />

      {/* VO Auto-Timing Engine Modal */}
      <VOTimingModal
        production={production}
        shots={enrichedShots}
      />

      {/* New Shot Modal */}
      <NewShotModal
        production={production}
        sequences={sequences}
        nextNumber={nextShotNumber}
        existingNumbers={shots.map(s => s.display_number)}
      />

      {/* Smart Table Import Modal */}
      <ImportModal
        production={production}
        isOpen={isImportModalOpen}
        onClose={() => useWorkspaceStore.getState().setImportModalOpen(false)}
      />
    </div>
  );
}
