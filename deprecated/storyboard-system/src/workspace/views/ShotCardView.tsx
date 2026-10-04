import * as React from 'react';
import { Icons } from '@frameforge/ui';
import { openInspector, selectShot, useSelection, useShots } from '../store';
import type { ShotItem, WorkspaceBridge } from '../contracts';

export function ShotCardView({ bridge }: { bridge?: WorkspaceBridge | null }) {
  const shots = useShots();
  const { selectedShotIds } = useSelection();

  if (shots.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-on-surface-variant">
        <Icons.LayoutGrid size={36} className="opacity-40 mb-2" />
        <p className="text-sm">No shots to display.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-4 bg-surface" data-testid="shot-card-view">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {shots.map((shot: ShotItem) => {
          const isSelected = selectedShotIds.includes(shot.id);

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
              className={`flex flex-col rounded-xl border overflow-hidden cursor-pointer select-none transition-all ${
                isSelected
                  ? 'border-primary ring-2 ring-primary/30 shadow-md bg-surface-container-low'
                  : 'border-outline-variant/30 hover:border-outline-variant hover:shadow-sm bg-surface-container-lowest'
              }`}
              data-shot-id={shot.id}
            >
              {/* Aspect Ratio 16:9 Thumbnail Box */}
              <div className="aspect-video bg-surface-container flex items-center justify-center relative border-b border-outline-variant/20">
                {shot.thumbnailUrl ? (
                  <img
                    src={shot.thumbnailUrl}
                    alt={shot.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-outline opacity-50">
                    <Icons.Images size={28} />
                    <span className="text-[10px] mt-1">Shot {shot.number}</span>
                  </div>
                )}
                <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-white px-2 py-0.5 rounded text-[10px] font-mono">
                  #{shot.number}
                </div>
                <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-white px-1.5 py-0.5 rounded text-[10px] font-mono">
                  {shot.durationFrames}f
                </div>
              </div>

              {/* Card Meta */}
              <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                <div>
                  <div className="font-semibold text-xs text-on-surface line-clamp-1">
                    {shot.title || `Shot ${shot.number}`}
                  </div>
                  <p className="text-[11px] text-on-surface-variant line-clamp-2 mt-0.5">
                    {shot.action || shot.description || 'No action summary'}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-outline-variant/20 text-[10px] text-on-surface-variant">
                  <span className="px-1.5 py-0.5 rounded bg-surface-container font-medium">
                    {shot.shotSize || '全景'}
                  </span>
                  <span>{shot.lens || 'Lens —'}</span>
                  <span className="font-semibold">{shot.status || 'Draft'}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
