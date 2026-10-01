'use client';

import React, { useMemo, useState } from 'react';
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Icons } from '@frameforge/ui';
import type { Production, Shot } from '@frameforge/types';
import {
  calculateVOTiming,
  DEFAULT_PUNCTUATION_WEIGHTS,
  framesToSeconds,
  framesToTimecode
} from '@frameforge/timecode';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { ApiError } from '@/lib/api-client';
import { useUpdateShot } from '@/lib/hooks/useProduction';

interface VOTimingModalProps {
  production: Production;
  shots: Shot[];
}

export function VOTimingModal({ production, shots }: VOTimingModalProps) {
  const { isVOTimingModalOpen, setVOTimingModalOpen } = useWorkspaceStore();
  const updateShot = useUpdateShot(production.id);

  const fps = production.fps_num / (production.fps_den || 1);
  const defaultTargetFrames = production.target_duration_frames || Math.round(270 * fps);

  const [targetFrames, setTargetFrames] = useState(defaultTargetFrames);
  const [weights, setWeights] = useState(DEFAULT_PUNCTUATION_WEIGHTS);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Compute timing plan
  const computedShots = useMemo(() => {
    const timingInputs = shots.map(s => ({
      id: s.id,
      voiceover: s.voice_over || '',
      locked: Boolean(s.timing_locked),
      duration_frames: s.duration_frames
    }));

    const calculated = calculateVOTiming(timingInputs, targetFrames, fps, weights);
    const map = new Map(calculated.map(c => [c.id, c.duration_frames]));

    return shots.map(s => {
      const newDuration = map.get(s.id) || s.duration_frames;
      return {
        ...s,
        proposed_frames: newDuration,
        delta_frames: newDuration - s.duration_frames
      };
    });
  }, [shots, targetFrames, fps, weights]);

  const lockedCount = shots.filter(s => s.timing_locked).length;
  const totalProposedFrames = computedShots.reduce((acc, s) => acc + s.proposed_frames, 0);

  const timingValid = shots.length > 0 && Number.isSafeInteger(targetFrames) && targetFrames > 0 && totalProposedFrames === targetFrames;
  const handleApply = async () => {
    if (isApplying || !timingValid) return;
    let savedCount = 0;
    let savingShotNumber = '';
    try {
      setError(null);
      setIsApplying(true);
      // ponytail: sequential PATCH can partially succeed; use an atomic per-shot batch when the API supports it.
      for (const s of computedShots) {
        if (!s.timing_locked && s.delta_frames !== 0) {
          savingShotNumber = s.display_number;
          await updateShot.mutateAsync({
            id: s.id,
            revision: s.revision,
            changes: { duration_frames: s.proposed_frames }
          });
          savedCount += 1;
        }
      }
      setVOTimingModalOpen(false);
    } catch (cause) {
      const message = cause instanceof ApiError && cause.status === 409
        ? '镜头版本已变化，请核对最新预览后重试。'
        : cause instanceof Error ? cause.message : '应用旁白计时失败';
      setError(`已保存 ${savedCount} 个镜头；镜头 ${savingShotNumber} 未保存。${message}`);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <Dialog open={isVOTimingModalOpen} onOpenChange={open => { if (!isApplying) setVOTimingModalOpen(open); }}>
      <DialogContent hideCloseButton={isApplying} className="flex h-[85dvh] max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl" onOpenAutoFocus={() => setError(null)}>
        <DialogHeader className="shrink-0 border-b border-border p-6 pr-12">
          <DialogTitle className="flex items-center gap-2">
            <Icons.Clock3 className="h-4 w-4" aria-hidden="true" />
            智能旁白计时算法 (VO Auto-Timing Engine)
          </DialogTitle>
          <DialogDescription className="text-xs">
            依据旁白字数与标点停顿权重分配总帧数，应用前核对计算结果
          </DialogDescription>
        </DialogHeader>

        {/* Modal Config Bar */}
        <div className="grid shrink-0 gap-4 border-b border-border bg-muted/40 p-4 text-xs sm:grid-cols-3">
          <div>
            <label htmlFor="vo-target-duration" className="block text-muted-foreground mb-1 font-medium">规划目标总时长</label>
            <div className="flex items-center gap-2">
              <Input
                id="vo-target-duration"
                type="number"
                min={1 / fps}
                step="any"
                disabled={isApplying}
                value={Number(framesToSeconds(targetFrames, fps).toFixed(3))}
                onChange={e => setTargetFrames(Math.max(1, Math.round(Number(e.target.value) * fps)))}
                className="w-24 font-mono"
              />
              <span className="text-muted-foreground">秒 ({targetFrames} 帧)</span>
            </div>
          </div>

          <div>
            <label className="block text-muted-foreground mb-1 font-medium">标点停顿权重 (逗号 / 句号)</label>
            <div className="flex items-center gap-2 text-foreground font-mono">
              <span>逗号 +{weights.comma}f</span>
              <span className="text-muted-foreground">|</span>
              <span>句号 +{weights.period}f</span>
            </div>
          </div>

          <div>
            <label className="block text-muted-foreground mb-1 font-medium">锁定镜头保护</label>
            <div className="flex items-center gap-2 font-mono">
              <span className="text-foreground font-bold">{lockedCount}</span> 个镜头已锁定时长（不参与调整）
            </div>
          </div>
        </div>

        {error && <p role="alert" className="shrink-0 px-4 pt-3 text-sm text-destructive">{error}</p>}
        {!timingValid && <p role="alert" className="shrink-0 px-4 pt-3 text-xs text-warning">
          {shots.length === 0 ? '当前没有可计算的镜头。' : `目标 ${targetFrames} 帧与计算总计 ${totalProposedFrames} 帧不符；请调整目标时长或镜头锁定状态。`}
        </p>}

        {/* Preview Table */}
        <div className="min-h-0 flex-1 overflow-auto p-4">
          <table className="w-full min-w-[640px] text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="border-b border-border text-muted-foreground pb-2">
                <th className="py-2 px-3">镜号</th>
                <th className="py-2 px-3">旁白解说词</th>
                <th className="py-2 px-3 text-right">字数</th>
                <th className="py-2 px-3 text-right">原时长</th>
                <th className="py-2 px-3 text-right">计算后时长</th>
                <th className="py-2 px-3 text-right">帧数变化</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {computedShots.map(s => {
                const voClean = (s.voice_over || '').trim();
                const charCount = voClean.replace(/\s+/g, '').length;
                const oldSec = framesToSeconds(s.duration_frames, fps).toFixed(1);
                const newSec = framesToSeconds(s.proposed_frames, fps).toFixed(1);

                return (
                  <tr key={s.id} className="hover:bg-muted/50 transition">
                    <td className="py-2 px-3 font-bold text-foreground">
                      {s.display_number}
                      {s.timing_locked && (
                        <span className="ml-1 text-[10px] text-foreground">[LOCKED]</span>
                      )}
                    </td>
                    <td className="py-2 px-3 font-sans text-foreground max-w-xs truncate">
                      {s.voice_over || <span className="text-muted-foreground italic">无旁白</span>}
                    </td>
                    <td className="py-2 px-3 text-right text-muted-foreground">
                      {charCount}
                    </td>
                    <td className="py-2 px-3 text-right text-muted-foreground">
                      {s.duration_frames}f ({oldSec}s)
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-foreground">
                      {s.proposed_frames}f ({newSec}s)
                    </td>
                    <td className="py-2 px-3 text-right font-bold">
                      {s.delta_frames > 0 ? (
                        <span className="text-foreground">+{s.delta_frames}f</span>
                      ) : s.delta_frames < 0 ? (
                        <span className="text-destructive">{s.delta_frames}f</span>
                      ) : (
                        <span className="text-muted-foreground">0f</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Modal Footer */}
        <DialogFooter className="shrink-0 border-t border-border px-4 py-4 text-xs sm:items-center sm:justify-between sm:px-6">
          <div className="font-mono text-muted-foreground">
            总计算分配帧数: <span className="font-bold text-foreground">{totalProposedFrames}f</span> ({framesToSeconds(totalProposedFrames, fps).toFixed(1)}s)
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:gap-3">
            <Button variant="outline" size="sm"
              onClick={() => setVOTimingModalOpen(false)}
              disabled={isApplying}
              className="font-medium"
            >
              取消
            </Button>
            <Button variant="default" size="sm"
              onClick={handleApply}
              disabled={isApplying || !timingValid}
              className="gap-1.5"
            >
              <Icons.Check className="h-4 w-4" />
              {isApplying ? '正在批量写入…' : '应用计算结果到所有镜头'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
