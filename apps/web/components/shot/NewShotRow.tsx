'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Button, Input } from '@frameforge/ui';
import type { Production, Shot } from '@frameforge/types';
import { useCreateShot } from '@/lib/hooks/useProduction';
import { nextAvailableShotNumber } from '@/components/storyboard/NewShotModal';

export function NewShotRow({ production, shots, columns, onDone }: {
  production: Production; shots: Shot[]; columns: string[];
  onDone: () => void;
}) {
  const createShot = useCreateShot(production.id);
  const key = `frameforge:new-shot-draft:${production.id}`;
  const [draft, setDraft] = useState<Record<string, string>>({ primary_method: 'live' });
  const [error, setError] = useState('');
  const ready = useRef(false);
  const saving = useRef(false);
  const cancelled = useRef(false);
  const focusedValue = useRef('');
  const row = useRef<HTMLTableRowElement>(null);
  const number = nextAvailableShotNumber(shots.map(shot => shot.display_number));

  useEffect(() => {
    try { const saved = JSON.parse(localStorage.getItem(key) || 'null'); if (saved && !Array.isArray(saved) && typeof saved === 'object') setDraft(Object.fromEntries(Object.entries(saved).filter(([, value]) => typeof value === 'string')) as Record<string, string>); } catch { /* Invalid local draft is discarded. */ }
    ready.current = true;
    row.current?.scrollIntoView({ block: 'nearest' });
    row.current?.querySelector('input')?.focus();
  }, [key]);
  useEffect(() => { if (ready.current) localStorage.setItem(key, JSON.stringify(draft)); }, [draft, key]);

  const save = async () => {
    if (saving.current || cancelled.current) return;
    const displayNumber = (draft.display_number || '').trim();
    const frames = Number(draft.duration_frames);
    // An incomplete row remains a local draft; it is never reported as saved.
    if (!displayNumber || !draft.duration_frames) return;
    if (displayNumber.length > 64 || shots.some(shot => shot.display_number.trim() === displayNumber)) { setError('镜号必须唯一，长度不超过 64 个字符。'); return; }
    if (!Number.isSafeInteger(frames) || frames < Math.ceil(0.1 * production.fps_num / (production.fps_den || 1))) { setError('时长必须是至少 0.1 秒且不少于一帧的整数。'); return; }
    if ((draft.name || '').length > 255) { setError('镜头标题不能超过 255 个字符。'); return; }
    setError(''); saving.current = true;
    try {
      await createShot.mutateAsync({
        display_number: displayNumber, duration_frames: frames,
        name: draft.name?.trim() || `镜头 ${displayNumber}`,
        description: draft.description || '', voice_over: draft.voice_over || '',
        panel_frame: draft.panel_frame || '', shot_size: draft.shot_size || '全景',
        primary_method: (draft.primary_method || 'live') as Shot['primary_method'],
        department: 'camera', status: 'draft', timing_locked: false
      });
      localStorage.removeItem(key); ready.current = false; onDone();
    } catch (cause) { setError(cause instanceof Error ? cause.message : '新增镜头失败，输入已保留。'); }
    finally { saving.current = false; }
  };
  const input = (field: string, hint: string, required = false, numeric = false) => <Input
    aria-label={`新增镜头${hint}`} value={draft[field] || ''} placeholder={hint}
    type={numeric ? 'number' : 'text'} maxLength={field === 'display_number' ? 64 : field === 'name' ? 255 : undefined} required={required} min={numeric ? 1 : undefined}
    className={`h-8 min-w-16 text-xs ${required ? 'placeholder:text-[#FF0082]' : ''}`}
    disabled={createShot.isPending}
    onFocus={() => { focusedValue.current = draft[field] || ''; cancelled.current = false; }}
    onChange={event => { cancelled.current = false; setDraft(previous => ({ ...previous, [field]: event.target.value })); }}
    onBlur={() => { void save(); }}
    onKeyDown={event => {
      event.stopPropagation();
      if (event.key === 'Escape') { event.preventDefault(); cancelled.current = true; setDraft(previous => ({ ...previous, [field]: focusedValue.current })); event.currentTarget.blur(); }
      if (event.key === 'Enter' && !event.nativeEvent.isComposing && event.nativeEvent.keyCode !== 229) { event.preventDefault(); void save(); }
    }} />;

  return <>
    <tr ref={row} aria-label="新增镜头输入行" className="border-y border-ring bg-muted/20">
      <td className="w-10 px-2 py-3" />
      <td className="w-10 px-2 py-3" />
      <td className="w-20 px-2 py-3">{input('display_number', `镜号（必填，如 ${number}）`, true)}</td>
      {columns.map(column => <td key={column} className="px-2 py-3">
        {column === 'primary_method' ? <select aria-label="新增镜头制作方式" value={draft.primary_method || 'live'} disabled={createShot.isPending} onFocus={() => { cancelled.current = false; }} onChange={event => setDraft(previous => ({ ...previous, primary_method: event.target.value }))} onBlur={() => { void save(); }} className="h-8 w-full rounded-md border bg-background text-xs">{['live','stock','client','archive','still','ae','mg','three_d','vfx','type'].map(method => <option key={method} value={method}>{method.toUpperCase()}</option>)}</select> : column === 'duration_frames' ? input(column, '时长 / 帧数（必填）', true, true)
          : ['name','description','panel_frame','voice_over','shot_size'].includes(column) ? input(column, column === 'name' ? '镜头标题' : column === 'description' ? '画面描述' : column === 'voice_over' ? '对应旁白' : column === 'panel_frame' ? '分镜图框' : '景别') : '—'}
      </td>)}
    </tr>
    <tr><td colSpan={3 + columns.length} className="px-3 py-2">
      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground">新增镜头草稿 · 必填项完成后，离开输入即保存；Esc 取消当前输入。</span>
        {!columns.includes('duration_frames') && input('duration_frames', '时长 / 帧数（必填）', true, true)}
        <Button size="sm" disabled={createShot.isPending} onClick={() => void save()}>{createShot.isPending ? '保存中…' : '保存镜头'}</Button>
        <Button size="sm" variant="ghost" disabled={createShot.isPending} onMouseDown={event => event.preventDefault()} onClick={() => { localStorage.removeItem(key); ready.current = false; onDone(); }}>放弃新增</Button>
      </div>
      {error && <p role="alert" className="mt-1 text-destructive">{error}</p>}
    </td></tr>
  </>;
}
