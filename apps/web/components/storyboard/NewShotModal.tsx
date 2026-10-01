'use client';

import React, { useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  Icons,
  Input,
  Select,
  TextArea
} from '@frameforge/ui';
import type { ProductionMethod, Production, Sequence } from '@frameforge/types';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useCreateShot } from '@/lib/hooks/useProduction';

interface NewShotModalProps {
  production: Production;
  sequences: Sequence[];
  nextNumber: string;
  existingNumbers?: string[];
}

export function nextAvailableShotNumber(existingNumbers: readonly string[]): string {
  const maximum = existingNumbers.reduce((max, number) => {
    const numeric = number.trim();
    if (!/^\d+$/.test(numeric)) return max;
    const value = BigInt(numeric);
    return value > max ? value : max;
  }, 0n);
  return (maximum + 1n).toString().padStart(3, '0');
}

export function NewShotModal({ production, sequences, nextNumber, existingNumbers }: NewShotModalProps) {
  const { isNewShotModalOpen, setNewShotModalOpen } = useWorkspaceStore();
  const createShot = useCreateShot(production.id);

  const fps = production.fps_num / (production.fps_den || 1);

  const [displayNumber, setDisplayNumber] = useState(nextNumber);
  const [sequenceId, setSequenceId] = useState(sequences[0]?.id || '');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [voiceover, setVoiceover] = useState('');
  const [primaryMethod, setProductionMethod] = useState<ProductionMethod>('live');
  const [durationSeconds, setDurationSeconds] = useState(3.0);
  const [shotSize, setShotSize] = useState('全景');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;
    const number = displayNumber.trim();
    const durationFrames = Math.round(durationSeconds * fps);
    const selectedSequenceId = sequenceId && sequenceId !== 'unassigned' ? sequenceId : null;
    setError(null);
    if (!number || number.length > 64) {
      setError('请输入 1–64 个字符的镜号。');
      return;
    }
    if (existingNumbers?.some(value => value.trim() === number)) {
      setError('此镜号已存在，请使用其他镜号。');
      return;
    }
    if (name.trim().length > 255) {
      setError('镜头标题不能超过 255 个字符。');
      return;
    }
    if (!Number.isFinite(durationSeconds) || durationSeconds < 0.1 || !Number.isSafeInteger(durationFrames) || durationFrames < 1) {
      setError('请输入有效的规划时长，至少 0.1 秒且不少于一帧。');
      return;
    }
    if (selectedSequenceId && !sequences.some(sequence => sequence.id === selectedSequenceId)) {
      setError('所选篇章已不可用，请重新选择。');
      return;
    }
    try {
      setIsSubmitting(true);
      await createShot.mutateAsync({
        display_number: number,
        sequence_id: selectedSequenceId,
        name: name.trim() || `镜头 ${number}`,
        description,
        voice_over: voiceover,
        primary_method: primaryMethod,
        department: 'camera',
        duration_frames: durationFrames,
        shot_size: shotSize,
        timing_locked: false,
        status: 'draft'
      });

      setNewShotModalOpen(false);
      setName('');
      setDescription('');
      setVoiceover('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '创建镜头失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isNewShotModalOpen} onOpenChange={open => { if (!isSubmitting) setNewShotModalOpen(open); }}>
      <DialogContent
        hideCloseButton={isSubmitting}
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg"
        onOpenAutoFocus={() => {
          setDisplayNumber(existingNumbers ? nextAvailableShotNumber(existingNumbers) : nextNumber);
          setSequenceId(sequences[0]?.id || '');
          setError(null);
        }}
      >
        <DialogHeader className="pr-8">
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Icons.Plus className="h-4 w-4" aria-hidden="true" />
            新建分镜镜头 (New Shot)
          </DialogTitle>
          <DialogDescription className="sr-only">
            新建镜头并设置镜号、篇章、制作方式、景别、时长、画面描述和旁白。
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <fieldset disabled={isSubmitting} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="镜号 (Display Number)">
                <Input
                  type="text"
                  required
                  maxLength={64}
                  value={displayNumber}
                  onChange={event => setDisplayNumber(event.target.value)}
                  placeholder="例如：081"
                  className="font-mono font-bold"
                />
              </Field>

              <Field label="所属篇章 / 幕">
                <Select
                  label="所属篇章 / 幕"
                  value={sequenceId}
                  onChange={setSequenceId}
                  options={sequences.map(sequence => ({
                    value: sequence.id,
                    label: sequence.display_number + ' · ' + sequence.name
                  }))}
                />
              </Field>
            </div>

            <Field label="镜头标题 / 内容概要">
              <Input
                type="text"
                maxLength={255}
                value={name}
                onChange={event => setName(event.target.value)}
                placeholder="例如：主大门车流与全景特写"
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="制作方式">
                <Select
                  label="制作方式"
                  value={primaryMethod}
                  onChange={value => setProductionMethod(value as ProductionMethod)}
                  options={[
                    { value: 'live', label: '实拍 (LIVE)' },
                    { value: 'stock', label: '购买素材 (STOCK)' },
                    { value: 'client', label: '客户素材 (CLIENT)' },
                    { value: 'ae', label: 'AE合成 (AE)' },
                    { value: 'mg', label: '动效 (MG)' },
                    { value: 'three_d', label: '3D三维 (3D)' },
                    { value: 'vfx', label: '视效 (VFX)' },
                    { value: 'still', label: '静帧 (STILL)' },
                    { value: 'type', label: '字卡 (TYPE)' }
                  ]}
                  className="font-mono font-semibold"
                />
              </Field>

              <Field label="标准景别">
                <Select
                  label="标准景别"
                  value={shotSize}
                  onChange={setShotSize}
                  options={[
                    { value: '全景', label: '全景 (FS)' },
                    { value: '特写', label: '特写 (CU)' },
                    { value: '中景', label: '中景 (MS)' },
                    { value: '近景', label: '近景 (MCU)' },
                    { value: '远景', label: '远景 (WS)' },
                    { value: '大特写', label: '大特写 (ECU)' }
                  ]}
                />
              </Field>

              <Field label="规划时长 (秒)">
                <Input
                  type="number"
                  step="0.1"
                  min="0.1"
                  required
                  value={durationSeconds}
                  onChange={event => setDurationSeconds(Number(event.target.value))}
                  className="font-mono"
                />
              </Field>
            </div>

            <Field label="画面构图与视觉描述">
              <TextArea
                rows={3}
                value={description}
                onChange={event => setDescription(event.target.value)}
                placeholder="画面主体、运镜方式与光影氛围设计..."
              />
            </Field>

            <Field label="对应解说词旁白">
              <TextArea
                rows={2}
                value={voiceover}
                onChange={event => setVoiceover(event.target.value)}
                placeholder="本镜头对应的解说旁白或对白内容..."
              />
            </Field>

          </fieldset>
          <DialogFooter className="border-t border-border pt-4">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => setNewShotModalOpen(false)}
              disabled={isSubmitting}
            >
              取消
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              <Icons.Check className="h-4 w-4" aria-hidden="true" />
              {isSubmitting ? '正在创建…' : '创建镜头'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
