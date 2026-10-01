'use client';

import React, { useState } from 'react';
import { Button, Card, Checkbox, Icons } from '@frameforge/ui';
import type { Production, Shot } from '@frameforge/types';
import { framesToSeconds, framesToTimecode } from '@frameforge/timecode';
import type { CustomFieldDefinition } from '@/lib/hooks/useCustomFields';
import { useUpdateShot } from '@/lib/hooks/useProduction';
import { shotMethodValues, shotMovementLabel } from '@/lib/shot-display';
import { InlineEditCell } from '@/components/shot/InlineEditCell';
import { ShotPanelImage } from '@/components/shot/ShotPanelImage';
import { MethodBadge } from '@/components/shot/MethodBadge';
import { StatusBadge } from '@/components/shot/StatusBadge';

function displayValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? '是' : '否';
  if (Array.isArray(value)) return value.map(displayValue).join(' · ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function ShotExtraDetails({
  shot, fields = [], values = {}
}: {
  shot: Shot;
  fields?: CustomFieldDefinition[];
  values?: Record<string, unknown>;
}) {
  const entries: Array<[string, unknown]> = [
    ['TC OUT', shot.tc_out], ['分镜图框', shot.panel_frame], ['动作', shot.action],
    ['表演', shot.performance], ['构图', shot.composition], ['导演备注', shot.director_notes],
    ['机位角度', shot.camera_angle], ['机位高度', shot.camera_height], ['摄影设备', shot.camera],
    ['传感器', shot.sensor], ['光圈', shot.aperture], ['快门', shot.shutter],
    ['对白', shot.dialogue], ['字幕', shot.subtitle], ['音乐', shot.music_notes],
    ['音效', shot.sfx_notes], ['部门', shot.department], ['负责人', shot.owner_id],
    ['连续性', shot.continuity_notes], ['风险备注', shot.risk_notes]
  ];
  fields.filter(field => field.state === 'visible' && !field.permanently_deleted)
    .sort((a, b) => a.sort_index - b.sort_index)
    .forEach(field => entries.push([field.label,
      values[field.id] === undefined ? field.default_value : values[field.id]]));
  const imported = (shot as Shot & { import_columns?: Record<string, unknown> }).import_columns;
  if (imported) entries.push(...Object.entries(imported));
  for (const step of shot.steps || []) {
    if (!step.deleted_at) entries.push(['制作步骤 · ' + step.type, step.status + (step.notes ? ' · ' + step.notes : '')]);
  }
  const populated = entries.map(([label, value]) => [label, displayValue(value)] as const)
    .filter(([, value]) => value.trim() !== '');
  if (!populated.length) return null;

  return (
    <details className="text-xs" onClick={event => event.stopPropagation()}
      onDoubleClick={event => event.stopPropagation()}>
      <summary className="cursor-pointer py-1 font-medium text-foreground focus-visible:outline focus-visible:outline-ring">
        更多信息 · {populated.length}
      </summary>
      <dl className="mt-2 space-y-3 border-t border-border pt-3">
        {populated.map(([label, value], index) => (
          <div key={label + ':' + index} className="grid gap-1">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="whitespace-pre-wrap break-words text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

interface ShotCardProps {
  shot: Shot;
  production: Production;
  isSelected: boolean;
  onSelect: (event: React.MouseEvent) => void;
  onInspect: () => void;
  fields?: CustomFieldDefinition[];
  customValues?: Record<string, unknown>;
  canReorder?: boolean;
  isDragging?: boolean;
  isDropTarget?: boolean;
  onDragStart?: (event: React.DragEvent) => void;
  onDragOver?: (event: React.DragEvent) => void;
  onDrop?: (event: React.DragEvent) => void;
  onDragEnd?: () => void;
  onMove?: (direction: -1 | 1) => void;
}

export function ShotCard({
  shot, production, isSelected, onSelect, onInspect, fields, customValues,
  canReorder = false, isDragging = false, isDropTarget = false,
  onDragStart, onDragOver, onDrop, onDragEnd, onMove
}: ShotCardProps) {
  const updateShot = useUpdateShot(production.id);
  const [saveError, setSaveError] = useState<string | null>(null);
  const fps = production.fps_num / (production.fps_den || 1);
  const timecode = shot.tc_in ?? framesToTimecode(production.start_timecode_frames, fps, production.drop_frame);

  const toggleLock = async (event: React.MouseEvent) => {
    event.stopPropagation();
    if (updateShot.isPending) return;
    setSaveError(null);
    try {
      await updateShot.mutateAsync({
        id: shot.id, revision: shot.revision, changes: { timing_locked: !shot.timing_locked }
      });
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : '时长锁定保存失败，请重试');
    }
  };

  return (
    <Card
      onClick={onSelect}
      onDoubleClick={event => {
        if (!(event.target as HTMLElement).closest('button, input, textarea, summary, details, [data-card-copy]')) onInspect();
      }}
      onKeyDown={event => {
        if (event.target !== event.currentTarget) return;
        if (event.key === 'Enter') {
          event.preventDefault();
          onSelect(event as unknown as React.MouseEvent);
        } else if (event.key === ' ') {
          event.preventDefault();
          onInspect();
        }
      }}
      onDragOver={onDragOver} onDrop={onDrop}
      role="group" tabIndex={0}
      aria-label={'镜头 ' + shot.display_number + '，' + (shot.name || '未命名镜头')}
      className={[
        'flex min-w-0 flex-col gap-0 overflow-hidden py-0 text-card-foreground',
        'transition-[border-color,box-shadow] motion-reduce:transition-none focus-visible:outline focus-visible:outline-ring',
        isSelected ? 'border-ring ring-2 ring-ring/40' : 'border-border',
        isDragging ? 'opacity-50' : '', isDropTarget ? 'outline-2 outline-ring' : ''
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border px-2 py-1">
        <div className="flex min-w-0 items-center gap-1">
          <Button variant="ghost" size="icon" disabled={!canReorder}
            draggable={canReorder} onDragStart={onDragStart} onDragEnd={onDragEnd}
            aria-label={'拖动镜头 ' + shot.display_number}
            title={canReorder ? '拖动排序；Alt + ↑/↓ 移动' : '完整、未筛选且未分组的镜头列表可排序'}
            onClick={event => event.stopPropagation()}
            onDoubleClick={event => event.stopPropagation()}
            onKeyDown={event => {
              if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown') && canReorder) {
                event.preventDefault();
                event.stopPropagation();
                void onMove?.(event.key === 'ArrowUp' ? -1 : 1);
              }
            }}>
            <Icons.GripVertical />
          </Button>
          <span className="truncate font-mono text-xs font-medium">SHOT {shot.display_number}</span>
          <span onClick={event => {
            event.stopPropagation();
            onSelect({ ...event, ctrlKey: true, shiftKey: false } as React.MouseEvent);
          }} onDoubleClick={event => event.stopPropagation()}>
            <Checkbox checked={isSelected} aria-label={'选择镜头 ' + shot.display_number} />
          </span>
        </div>
        <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">{timecode}</span>
      </div>

      <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden border-b border-border bg-muted">
        <ShotPanelImage shot={shot} className="absolute inset-0 h-full w-full object-contain">
          <span className="px-3 text-center text-xs text-muted-foreground">
            {shot.panel_frame || '暂无分镜'}
          </span>
        </ShotPanelImage>
      </div>

      <div className="space-y-3 p-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 break-words text-sm font-semibold">{shot.name || '未命名镜头'}</h3>
          <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
            {framesToSeconds(shot.duration_frames, fps).toFixed(1)}s
          </span>
        </div>
        <p className="break-words text-xs text-muted-foreground">
          {shot.shot_size || '景别未设置'} · {shotMovementLabel(shot, '运镜未设置')} · {shot.lens_mm ? shot.lens_mm + 'mm' : '焦段未设置'}
        </p>
        <div data-card-copy className="space-y-1" onClick={event => event.stopPropagation()}>
          <div className="text-[11px] text-muted-foreground">画面描述</div>
          <InlineEditCell productionId={production.id} shot={shot} field="description"
            value={shot.description || ''} placeholder="暂无画面描述，双击编辑" />
        </div>
        <div data-card-copy className="space-y-1" onClick={event => event.stopPropagation()}>
          <div className="text-[11px] text-muted-foreground">对应旁白</div>
          <InlineEditCell productionId={production.id} shot={shot} field="voice_over"
            value={shot.voice_over || ''} placeholder="暂无对应旁白，双击编辑" />
        </div>
        <ShotExtraDetails shot={shot} fields={fields} values={customValues} />
        {saveError && <p role="alert" className="break-words text-xs text-destructive">{saveError}</p>}
      </div>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-border px-3 py-2">
        <StatusBadge status={shot.status} />
        <div className="flex flex-wrap items-center gap-1">
          {shotMethodValues(shot).map(method => <MethodBadge key={method} method={method} />)}
        </div>
        <Button variant="ghost" size="icon" onClick={toggleLock} disabled={updateShot.isPending}
          onDoubleClick={event => event.stopPropagation()}
          aria-label={shot.timing_locked ? '解锁时长' : '锁定时长'}
          title={(shot.timing_locked ? '已锁定时长' : '锁定时长') + ' · ' + shot.duration_frames + 'f'}>
          {shot.timing_locked ? <Icons.Lock /> : <Icons.LockOpen />}
        </Button>
      </div>
    </Card>
  );
}
