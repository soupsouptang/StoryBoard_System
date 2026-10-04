import * as React from 'react';
import { Icons } from '@frameforge/ui';
import { openInspector, selectShot, useSelection, useShots } from '../store';
import type { ShotItem, WorkspaceBridge } from '../contracts';

export function TimelineView({ bridge }: { bridge?: WorkspaceBridge | null }) {
  const shots = useShots();
  const { selectedShotIds } = useSelection();

  const totalFrames = React.useMemo(() => {
    return shots.reduce((sum, s) => sum + (s.durationFrames || 75), 0);
  }, [shots]);

  if (shots.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-on-surface-variant">
        <Icons.GanttChart size={36} className="opacity-40 mb-2" />
        <p className="text-sm">No shots to display on timeline.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-surface overflow-hidden" data-testid="timeline-view">
      {/* Timecode Header Banner */}
      <div className="h-10 border-b border-outline-variant/30 bg-surface-container-low px-4 flex items-center justify-between text-xs text-on-surface-variant select-none">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-on-surface">Timeline Track 1 (Video)</span>
          <span className="text-[11px] font-mono text-outline">Total: {totalFrames} frames ({Math.round(totalFrames / 25)}s @ 25fps)</span>
        </div>
      </div>

      {/* Interactive Timeline Track Strip */}
      <div className="flex-1 overflow-x-auto p-4 flex items-center bg-surface-container-lowest">
        <div className="flex items-center h-28 border border-outline-variant/40 rounded-xl overflow-hidden shadow-inner bg-surface-container-low">
          {shots.map((shot: ShotItem) => {
            const isSelected = selectedShotIds.includes(shot.id);
            // Minimum 80px width, proportional to duration
            const blockWidth = Math.max(80, Math.round((shot.durationFrames / 25) * 60));

            return (
              <div
                key={shot.id}
                onClick={e => {
                  selectShot(shot.id, e.shiftKey || e.metaKey || e.ctrlKey);
                  bridge?.selectShot?.(shot.id, e.shiftKey || e.metaKey || e.ctrlKey);
                }}
                onDoubleClick={() => {
                  openInspector(shot.id, 'docked');
                  bridge?.openInspector?.(shot.id, 'docked');
                }}
                style={{ width: `${blockWidth}px` }}
                className={`h-full border-r border-outline-variant/40 p-2 flex flex-col justify-between cursor-pointer select-none transition-all ${
                  isSelected
                    ? 'bg-primary-container/40 text-on-surface ring-2 ring-inset ring-primary'
                    : 'hover:bg-surface-container text-on-surface-variant'
                }`}
                title={`Shot ${shot.number}: ${shot.title || 'Untitled'} (${shot.durationFrames} frames)`}
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold font-mono text-on-surface">#{shot.number}</span>
                  <span className="text-[10px] font-mono opacity-80">{shot.durationFrames}f</span>
                </div>

                <div className="text-xs font-medium text-on-surface truncate">
                  {shot.title || 'Untitled'}
                </div>

                <div className="text-[10px] text-outline truncate">
                  {shot.shotSize || '全景'} · {shot.movement || '固定'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
