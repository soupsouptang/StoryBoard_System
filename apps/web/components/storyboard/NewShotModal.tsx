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
import { parseShotDuration } from '@/lib/shot-display';

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
  const [durationInput, setDurationInput] = useState('3s');
  const [shotSize, setShotSize] = useState('全景');
  const [panelFrame, setPanelFrame] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;
    let durationFrames: number;
    const selectedSequenceId = sequenceId && sequenceId !== 'unassigned' ? sequenceId : null;
    setError(null);
    if (name.trim().length > 255) {
      setError('镜头标题不能超过 255 个字符。');
      return;
    }
    try { durationFrames = parseShotDuration(durationInput, fps); }
    catch (cause) { setError((cause as Error).message); return; }
    if (selectedSequenceId && !sequences.some(sequence => sequence.id === selectedSequenceId)) {
      setError('所选篇章已不可用，请重新选择。');
      return;
    }
    try {
      setIsSubmitting(true);
      await createShot.mutateAsync({
        sequence_id: selectedSequenceId,
        name: name.trim() || undefined,
        description,
        voice_over: voiceover,
        primary_method: primaryMethod,
        department: 'camera',
        duration_frames: durationFrames,
        shot_size: shotSize,
        panel_frame: panelFrame,
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
        onEscapeKeyDown={event => { event.preventDefault(); setNewShotModalOpen(false); }}
        onOpenAutoFocus={() => {
          setDisplayNumber(existingNumbers ? nextAvailableShotNumber(existingNumbers) : nextNumber);
          setSequenceId(sequences[0]?.id || '');
          setName(''); setDescription(''); setVoiceover(''); setPanelFrame('');
          setProductionMethod('live'); setShotSize('全景'); setDurationInput('3s');
          setError(null);
        }}
      >
        <DialogHeader className="pr-8">
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Icons.Plus className="h-4 w-4" aria-hidden="true" />
            新增镜头
          </DialogTitle>
          <DialogDescription className="sr-only">
            镜号自动生成；时长无单位默认为秒；填写镜头信息后点击创建，Esc取消。
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <fieldset disabled={isSubmitting} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="镜号 (Display Number)">
                <Input
                  aria-label="新增镜头镜号（自动）"
                  type="text"
                  readOnly
                  maxLength={64}
                  value={displayNumber}
                  title="镜号自动生成，排序后自动更新"
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
                <span aria-hidden="true" className="hidden h-5 sm:block" />
                <Select
                  label="制作方式"
                  value={primaryMethod}
                  onChange={value => setProductionMethod(value as ProductionMethod)}
                  options={[
                    { value: 'live', label: '实拍 (LIVE)' },
                    { value: 'stock', label: '购买素材 (STOCK)' },
                    { value: 'client', label: '客户素材 (CLIENT)' },
                    { value: 'archive', label: '历史资料 (ARCHIVE)' },
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
                <span aria-hidden="true" className="hidden h-5 sm:block" />
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

              <Field label="规划时长">
                <span id="new-shot-duration-hint" className="flex w-full items-center justify-between whitespace-nowrap text-base font-normal leading-5 text-muted-foreground">
                  {['f帧', '/', 's秒', '/', 'm分', '/', 'h时'].map((unit, index) => <span key={index}>{unit}</span>)}
                </span>
                <Input
                  aria-describedby="new-shot-duration-hint"
                  aria-label="新增镜头时长 / 帧数（必填）"
                  title="无单位默认为秒；f帧 / s秒 / m分 / h时"
                  type="text"
                  required
                  placeholder="请输入时长"
                  value={durationInput}
                  onChange={event => setDurationInput(event.target.value)}
                  className="font-mono placeholder:text-[#FF0082]"
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

            <Field label="分镜图框">
              <Input aria-label="新增镜头分镜图框" value={panelFrame} onChange={event => setPanelFrame(event.target.value)} placeholder="例如：16:9，主体位于画面左侧" />
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
