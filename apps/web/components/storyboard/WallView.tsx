'use client';

import React from 'react';
import { Card } from '@frameforge/ui';
import type { Production, Shot } from '@frameforge/types';
import { framesToSeconds } from '@frameforge/timecode';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { getMethodStyle } from '@/lib/media-resolver';
import { MethodBadge } from '../shot/MethodBadge';
import { ShotPanelImage } from '../shot/ShotPanelImage';

interface WallViewProps {
  production: Production;
  shots: Shot[];
  onSelectShot: (id: string, e: React.MouseEvent) => void;
  onInspectShot: (id: string) => void;
}

export function WallView({
  production,
  shots,
  onSelectShot,
  onInspectShot
}: WallViewProps) {
  const { selectedShotIds, cardSize } = useWorkspaceStore();
  const fps = production.fps_num / (production.fps_den || 1);

  const gridColsClass =
    cardSize === 'sm'
      ? 'grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2'
      : cardSize === 'lg'
      ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4'
      : 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-3';

  return (
    <div className={`grid ${gridColsClass} p-6 select-none`}>
      {shots.map(shot => {
        const isSelected = selectedShotIds.includes(shot.id);
        const style = getMethodStyle(shot.primary_method);
        const durationSec = framesToSeconds(shot.duration_frames, fps).toFixed(1);

        return (
          <Card
            key={shot.id}
            onClick={e => onSelectShot(shot.id, e)}
            onDoubleClick={() => onInspectShot(shot.id)}
            title={`[${shot.display_number}] ${shot.name || ''}\n${shot.description || ''}\nVO: ${shot.voice_over || '无'}`}
            className={`group relative flex flex-col rounded-md border bg-card overflow-hidden cursor-pointer transition-all duration-150 ${
              isSelected
                ? 'border-ring ring-2 ring-ring shadow-lg shadow-foreground/20 scale-[1.02] z-10'
                : 'border-border hover:border-border hover:scale-[1.01]'
            }`}
          >
            {/* Visual Tile */}
            <div className={`relative w-full aspect-video bg-gradient-to-br ${style.bg} flex items-center justify-center p-2`}>
              <ShotPanelImage shot={shot} className="absolute inset-0 h-full w-full object-cover">
                <div className="text-center">
                  <span className={`font-mono text-lg font-black tracking-wider ${style.text} drop-shadow`}>
                    {shot.display_number}
                  </span>
                </div>
              </ShotPanelImage>

              {/* Top Badge */}
              <div className="absolute top-1 left-1 z-10 scale-90 origin-top-left">
                <MethodBadge method={shot.primary_method} size="sm" />
              </div>

              {/* Timing Overlay */}
              <div className="absolute bottom-1 right-1 z-10 rounded bg-background/80 px-1 py-0.5 font-mono text-[9px] font-bold text-foreground border border-border">
                {shot.duration_frames}f ({durationSec}s)
              </div>
            </div>

            {/* Micro Caption */}
            <div className="p-1.5 bg-background/90 border-t border-border text-[10px] truncate">
              <span className="text-foreground font-medium">{shot.name || `镜头 ${shot.display_number}`}</span>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
