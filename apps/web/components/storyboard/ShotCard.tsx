'use client';

import React from 'react';
import { Card, Icons } from '@frameforge/ui';
import { Button } from '@frameforge/ui';
import type { Shot, Production } from '@frameforge/types';
import { framesToTimecode, framesToSeconds } from '@frameforge/timecode';
import { MethodBadge } from '../shot/MethodBadge';
import { StatusBadge } from '../shot/StatusBadge';
import { getMethodStyle } from '@/lib/media-resolver';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useUpdateShot } from '@/lib/hooks/useProduction';
import { shotMovementLabel } from '@/lib/shot-display';
import { ShotPanelImage } from '@/components/shot/ShotPanelImage';

interface ShotCardProps {
  shot: Shot;
  production: Production;
  isSelected: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onInspect: () => void;
}

export function ShotCard({
  shot,
  production,
  isSelected,
  onSelect,
  onInspect
}: ShotCardProps) {
  const cardSize = useWorkspaceStore(s => s.cardSize);
  const updateShot = useUpdateShot(production.id);

  const fps = production.fps_num / (production.fps_den || 1);
  const durationSec = framesToSeconds(shot.duration_frames, fps).toFixed(1);
  const timecode = framesToTimecode(shot.duration_frames, fps, production.drop_frame);

  const style = getMethodStyle(shot.primary_method);

  const toggleLock = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await updateShot.mutateAsync({
        id: shot.id,
        revision: shot.revision,
        changes: { timing_locked: !shot.timing_locked }
      });
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    <Card
      onClick={onSelect}
      onDoubleClick={onInspect}
      className={`group relative flex flex-col rounded-lg border bg-card transition-all duration-150 select-none cursor-pointer overflow-hidden ${
        isSelected
          ? 'border-ring ring-2 ring-ring/50 shadow-lg shadow-foreground/10 bg-accent'
          : 'border-border hover:border-border hover:shadow-md'
      }`}
    >
      {/* Thumbnail Aspect Box */}
      <div
        className={`relative w-full aspect-video bg-gradient-to-br ${style.bg} border-b border-border flex items-center justify-center overflow-hidden`}
      >
        <ShotPanelImage shot={shot} className="absolute inset-0 h-full w-full object-cover">
          <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />
          <div className="flex flex-col items-center justify-center p-4 text-center z-10">
            <span className={`font-mono text-2xl font-black tracking-widest ${style.text} drop-shadow`}>
              {shot.display_number}
            </span>
            <span className="text-[11px] text-foreground font-medium mt-1 line-clamp-1">
              {shot.name || shot.description?.slice(0, 20) || '画面分镜图'}
            </span>
          </div>
        </ShotPanelImage>

        {/* Top Badges Overlay */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-10">
          <div className="flex items-center gap-1.5">
            {/* Multi-select checkbox */}
            <div
              onClick={e => {
                e.stopPropagation();
                onSelect(e);
              }}
              className={`flex h-5 w-5 items-center justify-center rounded border transition ${
                isSelected
                  ? 'bg-accent border-ring text-accent-foreground'
                  : 'bg-background/80 border-border text-transparent group-hover:border-border'
              }`}
            >
              <Icons.Check className="h-3.5 w-3.5" />
            </div>

            <MethodBadge method={shot.primary_method} size="sm" />
          </div>

          <div className="flex items-center gap-1.5">
            {/* Lock Timing Button */}
            <Button variant="ghost" size="sm"
              onClick={toggleLock}
              title={shot.timing_locked ? '已锁定时长' : '点击锁定时长'}
              aria-label={shot.timing_locked ? '解锁时长' : '锁定时长'}
              className={`flex h-6 w-6 items-center justify-center rounded border backdrop-blur-sm transition ${
                shot.timing_locked
                  ? 'bg-accent border-ring text-accent-foreground'
                  : 'bg-background/60 border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {shot.timing_locked ? <Icons.Lock className="h-3.5 w-3.5" /> : <Icons.LockOpen className="h-3.5 w-3.5" />}
            </Button>

            <StatusBadge status={shot.status} />
          </div>
        </div>

        {/* Bottom Timecode & Camera Overlay */}
        <div className="absolute bottom-1.5 left-2 right-2 flex items-center justify-between z-10 text-[10px] font-mono">
          <span className="rounded bg-background/80 px-1.5 py-0.5 text-foreground border border-border/60 backdrop-blur-sm">
            {shot.shot_size || '全景'} {shot.lens_mm ? `· ${shot.lens_mm}mm` : ''}
          </span>

          <span className="rounded bg-background/90 px-1.5 py-0.5 font-bold text-foreground border border-border backdrop-blur-sm">
            {shot.duration_frames}f ({durationSec}s)
          </span>
        </div>
      </div>

      {/* Card Content Details */}
      <div className="flex flex-col p-3 gap-2 flex-1 justify-between text-xs">
        {/* Description & Action */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-foreground line-clamp-1">
              {shot.name || `镜头 ${shot.display_number}`}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">
              {timecode}
            </span>
          </div>

          <p className="text-muted-foreground line-clamp-2 text-[11px] leading-relaxed">
            {shot.description || '暂无画面描述'}
          </p>
        </div>

        {/* Voiceover Strip */}
        {shot.voice_over && (
          <div className="rounded border border-border/60 bg-background/60 p-2 text-[11px] text-foreground leading-normal line-clamp-2">
            <span className="font-bold text-foreground mr-1">VO:</span>
            {shot.voice_over}
          </div>
        )}

        {/* Card Footer info */}
        <div className="flex items-center justify-between border-t border-border pt-2 text-[10px] text-muted-foreground font-mono">
          <span className="truncate max-w-[120px]">
            {shotMovementLabel(shot, '固定机位')}
          </span>
          <span>{shot.owner_id || shot.department || '摄影组'}</span>
        </div>
      </div>
    </Card>
  );
}
