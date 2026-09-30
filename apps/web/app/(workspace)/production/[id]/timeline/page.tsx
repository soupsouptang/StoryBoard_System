'use client';

import { Button, Icons } from '@frameforge/ui';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import type { Shot } from '@frameforge/types';
import { framesToTimecode, framesToSeconds } from '@frameforge/timecode';
import { useProduction, useShots } from '@/lib/hooks/useProduction';
import { getMethodStyle } from '@/lib/media-resolver';
import { ShotInspector } from '@/components/shot/ShotInspector';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';

export default function TimelinePage() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : '';

  const { data: production } = useProduction(id);
  const { data: shots = [], isLoading } = useShots(id);

  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [zoomScale, setZoomScale] = useState(1.5); // pixels per frame

  const {
    selectedShotIds,
    selectShot,
    inspectedShotId,
    isInspectorOpen,
    openInspector,
    closeInspector
  } = useWorkspaceStore();

  const inspectedShot = shots.find(s => s.id === inspectedShotId) || null;

  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fps = production ? production.fps_num / (production.fps_den || 1) : 24;
  const totalFrames = shots.reduce((acc, s) => acc + (s.duration_frames || 0), 0);

  // Playhead animation
  useEffect(() => {
    if (production && isPlaying) {
      playIntervalRef.current = setInterval(() => {
        setCurrentFrame(prev => {
          if (prev >= totalFrames) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000 / fps);
    } else if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
    }

    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [isPlaying, totalFrames, fps, production]);

  if (!production) return null;

  const totalTimecode = framesToTimecode(totalFrames, fps, production.drop_frame);
  const currentTimecode = framesToTimecode(currentFrame, fps, production.drop_frame);

  // Compute accumulated shot start frames
  let accumulated = 0;
  const shotTimelineData = shots.map(s => {
    const start = accumulated;
    accumulated += s.duration_frames;
    return {
      ...s,
      startFrame: start,
      endFrame: accumulated
    };
  });

  // Current active shot under playhead
  const activeShot = shotTimelineData.find(
    s => currentFrame >= s.startFrame && currentFrame < s.endFrame
  ) || shotTimelineData[0];

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      {/* Timeline Controls & Monitor Split */}
      <div className="flex flex-1 border-b border-border bg-background overflow-hidden">
        {/* Left: Video Animatic Preview Monitor */}
        <div className="flex flex-1 flex-col items-center justify-center p-6 border-r border-border bg-background/80">
          <div className="relative w-full max-w-xl aspect-video rounded-lg border border-border bg-card shadow-2xl overflow-hidden flex flex-col justify-between p-4">
            {/* Monitor Top Bar */}
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="rounded bg-background/80 px-2 py-0.5 text-foreground font-bold border border-border">
                {activeShot ? `SHOT ${activeShot.display_number}` : 'NO SHOT'}
              </span>
              <span className="text-foreground font-bold bg-background/80 px-2 py-0.5 rounded">
                {currentTimecode}
              </span>
            </div>

            {/* Monitor Visual Content */}
            <div className="text-center space-y-2">
              <h4 className="text-sm font-bold text-foreground">
                {activeShot?.name || `镜头 ${activeShot?.display_number || '001'}`}
              </h4>
              <p className="text-xs text-muted-foreground line-clamp-2 max-w-md mx-auto">
                {activeShot?.description || '暂无画面描述'}
              </p>
              {activeShot?.voice_over && (
                <div className="text-xs text-foreground font-medium bg-background/70 p-2 rounded max-w-md mx-auto line-clamp-2 border border-border">
                  <span className="font-bold text-foreground mr-1">VO:</span>
                  {activeShot.voice_over}
                </div>
              )}
            </div>

            {/* Monitor Footer */}
            <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
              <span>{activeShot?.shot_size || '全景'} · {activeShot?.lens_mm ? `${activeShot.lens_mm}mm` : ''}</span>
              <span>{activeShot?.primary_method?.toUpperCase()}</span>
            </div>
          </div>
        </div>

        {/* Right: Selected Shot Inspector if open */}
        {isInspectorOpen && inspectedShot && (
          <ShotInspector
            shot={inspectedShot}
            production={production}
            onClose={closeInspector}
          />
        )}
      </div>

      {/* Timeline Controls Header */}
      <div className="flex items-center justify-between border-b border-border bg-card px-6 py-2 z-10 text-xs">
        <div className="flex items-center gap-3">
          {/* Play/Pause Button */}
          <Button
            size="icon"
            onClick={() => setIsPlaying(!isPlaying)}
            aria-label={isPlaying ? '暂停' : '播放'}
            className="h-8 w-8 rounded-full"
          >
            {isPlaying ? <Icons.Pause className="h-4 w-4" /> : <Icons.Play className="h-4 w-4" />}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentFrame(0)}
          >
            回退起点
          </Button>

          {/* Timecode Readout */}
          <div className="flex items-center gap-2 font-mono text-sm font-bold pl-2 border-l border-border">
            <span className="text-foreground">{currentTimecode}</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-muted-foreground">{totalTimecode}</span>
          </div>
        </div>

        {/* Zoom scale slider */}
        <div className="flex items-center gap-2 text-muted-foreground font-mono text-[11px]">
          <span>缩放:</span>
          <input
            type="range"
            min="0.5"
            max="4.0"
            step="0.1"
            value={zoomScale}
            onChange={e => setZoomScale(Number(e.target.value))}
            className="w-24 accent-primary cursor-pointer"
          />
        </div>
      </div>

      {/* Multi-Track Timeline Scroll Area */}
      <div className="h-64 overflow-x-auto overflow-y-hidden bg-background relative select-none">
        {/* Playhead Vertical Line */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-primary z-30 pointer-events-none shadow-md"
          style={{ left: `${currentFrame * zoomScale}px` }}
        >
          <div className="absolute -top-1 -left-1.5 h-3 w-3 rounded-full bg-primary shadow" />
        </div>

        {/* Timeline Tracks */}
        <div className="flex flex-col p-4 space-y-2 min-w-max">
          {/* Ruler Track */}
          <div className="h-6 flex items-center border-b border-border text-[10px] font-mono text-muted-foreground">
            {shotTimelineData.map(s => (
              <div
                key={s.id}
                style={{ width: `${s.duration_frames * zoomScale}px` }}
                className="border-l border-border pl-1 truncate"
              >
                {framesToTimecode(s.startFrame, fps)}
              </div>
            ))}
          </div>

          {/* Video / Shot Track */}
          <div className="h-16 flex items-center gap-0.5">
            {shotTimelineData.map(s => {
              const isSelected = selectedShotIds.includes(s.id) || inspectedShotId === s.id;
              const isCurrent = currentFrame >= s.startFrame && currentFrame < s.endFrame;
              const style = getMethodStyle(s.primary_method);

              return (
                <div
                  key={s.id}
                  onClick={() => {
                    selectShot(s.id, false, false, shots.map(shot => shot.id));
                    openInspector(s.id);
                    setCurrentFrame(s.startFrame);
                  }}
                  style={{ width: `${s.duration_frames * zoomScale}px` }}
                  className={`h-full rounded border flex flex-col justify-between p-1.5 cursor-pointer transition-all overflow-hidden bg-gradient-to-r ${style.bg} ${
                    isCurrent
                      ? 'border-ring shadow-md'
                      : isSelected
                      ? 'border-ring'
                      : 'border-border hover:border-ring'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="font-bold text-foreground drop-shadow">
                      {s.display_number}
                    </span>
                    <span className="text-foreground">
                      {s.duration_frames}f
                    </span>
                  </div>

                  <span className="text-[10px] text-foreground truncate font-medium">
                    {s.name || s.description}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Voiceover Track */}
          <div className="h-10 flex items-center gap-0.5">
            {shotTimelineData.map(s => (
              <div
                key={s.id}
                style={{ width: `${s.duration_frames * zoomScale}px` }}
                className="h-full rounded border border-border bg-card/80 p-1 text-[10px] text-foreground truncate flex items-center"
                title={s.voice_over}
              >
                {s.voice_over ? `VO: ${s.voice_over}` : <span className="text-muted-foreground">—</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
