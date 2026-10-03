'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Button, Checkbox, Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle, Icons, Input, Select, TextArea } from '@frameforge/ui';
import type { Production, Sequence, Shot } from '@frameforge/types';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useDeleteShot } from '@/lib/hooks/useProduction';
import { useSaveShotDetail } from '@/lib/hooks/useShotDetail';
import { detailFieldValue, equalDetailValue, type DetailField } from '@/lib/shot-detail-fields';
import { getMethodLabel, getStatusBadge } from '@/lib/media-resolver';
import { parseShotDuration } from '@/lib/shot-display';
import { ShotPanelImage } from './ShotPanelImage';
import { ShotFeedbackDialog } from './ShotFeedbackDialog';

function valueText(value: unknown) {
  return value == null ? '' : Array.isArray(value) ? value.join(' / ') : typeof value === 'object' ? JSON.stringify(value) : String(value);
}
function optionLabel(field: DetailField, value: string) {
  return field.key === 'primary_method' ? getMethodLabel(value) : field.key === 'status' ? getStatusBadge(value).label : value;
}

/** Bounded input: unfocused presentation can truncate; the editable value is always complete. */
function DetailText({ label, value, multiline, disabled, onChange }: { label: string; value: string; multiline: boolean; disabled: boolean; onChange: (value: string) => void }) {
  const [focused, setFocused] = useState(false);
  const common = { 'aria-label': label, value, disabled, onFocus: () => setFocused(true), onBlur: () => setFocused(false), onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(event.target.value), placeholder: `输入${label}`, className: 'w-full text-sm' };
  return <div className="relative min-w-0">
    {multiline ? <TextArea {...common} rows={4} className="h-24 w-full resize-none text-sm" /> : <Input {...common} className="h-9 w-full text-sm text-ellipsis" />}
    {multiline && !focused && value && <div aria-hidden="true" className="pointer-events-none absolute inset-px rounded-md bg-background px-3 py-2"><div className="line-clamp-4 whitespace-pre-wrap break-words text-sm [line-break:strict]">{value}</div></div>}
  </div>;
}

export function ShotDetailCard({ shot, production, fields, customValues, sequences, timecode, height, canWrite, onClose }: {
  shot: Shot; production: Production; fields: DetailField[]; customValues: Record<string, unknown>; sequences: Sequence[];
  timecode?: { in: string; out: string }; height: number; canWrite: boolean; onClose: () => void;
}) {
  const baseline = useRef({ shot, values: customValues, fields });
  const initial = () => Object.fromEntries(fields.map(field => [field.key, detailFieldValue(field, shot, customValues)]));
  const [draft, setDraft] = useState<Record<string, unknown>>(initial);
  const [duration, setDuration] = useState(`${shot.duration_frames}f`);
  const [secondary, setSecondary] = useState(shot.secondary_methods || []);
  const [locked, setLocked] = useState(shot.timing_locked);
  const [image, setImage] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [discard, setDiscard] = useState(false);
  const [trash, setTrash] = useState(false);
  const save = useSaveShotDetail(production.id);
  const deletion = useDeleteShot(production.id);
  const busy = save.isPending || deletion.isPending;
  const file = useRef<HTMLInputElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const fps = production.fps_num / (production.fps_den || 1);
  let durationFrames: number | null = null;
  try { durationFrames = parseShotDuration(duration, fps); } catch { /* present invalid draft without writing */ }
  const editableFields = baseline.current.fields.filter(field => !field.readonly);
  const dirty = Boolean(image) || editableFields.some(field => field.key !== 'duration_frames' && !equalDetailValue(draft[field.key], detailFieldValue(field, baseline.current.shot, baseline.current.values)))
    || (editableFields.some(field => field.key === 'duration_frames') && (durationFrames !== baseline.current.shot.duration_frames || locked !== baseline.current.shot.timing_locked))
    || (editableFields.some(field => field.key === 'primary_method') && !equalDetailValue(secondary, baseline.current.shot.secondary_methods || []));

  useEffect(() => {
    if (!image) { setImageUrl(null); return; }
    const url = URL.createObjectURL(image); setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);
  // Authoritative refresh updates clean cards only; dirty snapshots retain their original CAS token.
  useEffect(() => {
    if (dirty || busy) return;
    if (baseline.current.shot.revision === shot.revision && equalDetailValue(baseline.current.values, customValues)
      && equalDetailValue(baseline.current.fields, fields)) return;
    baseline.current = { shot, values: customValues, fields };
    setDraft(initial()); setDuration(`${shot.duration_frames}f`); setSecondary(shot.secondary_methods || []); setLocked(shot.timing_locked);
  }, [shot.revision, customValues, fields, dirty, busy]);

  const forceClose = () => {
    useWorkspaceStore.getState().setInspectorCloseGuard(null);
    onClose();
  };
  useLayoutEffect(() => {
    const guard = () => {
      if (busy) return false;
      if (dirty) { setDiscard(true); return false; }
      return true;
    };
    useWorkspaceStore.getState().setInspectorCloseGuard(guard);
    return () => { if (useWorkspaceStore.getState().inspectorCloseGuard === guard) useWorkspaceStore.getState().setInspectorCloseGuard(null); };
  }, [dirty, busy]);
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented || document.querySelector('[role="dialog"], [role="listbox"], [role="menu"]')) return;
      event.preventDefault(); useWorkspaceStore.getState().closeInspector();
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, []);
  useEffect(() => {
    card.current?.focus({ preventScroll: true });
    return () => {
      // Inline regions have no Dialog trigger to restore focus to on exit.
      requestAnimationFrame(() => {
        if (document.activeElement !== document.body) return;
        const row = [...document.querySelectorAll<HTMLElement>('tr[data-shot-id]')].find(element => element.dataset.shotId === shot.id);
        row?.focus({ preventScroll: true });
      });
    };
  }, [shot.id]);

  const submit = async () => {
    if (busy || !canWrite) return;
    const changes: Partial<Shot> = {};
    const custom_values: { field_id: string; field_revision: number; value: unknown }[] = [];
    try {
      for (const field of editableFields) {
        if (fields.some(current => current.key === field.key && !current.readonly)) continue;
        const changed = field.kind === 'image' ? Boolean(image) : field.kind === 'duration'
          ? durationFrames !== baseline.current.shot.duration_frames || locked !== baseline.current.shot.timing_locked
          : !equalDetailValue(draft[field.key], detailFieldValue(field, baseline.current.shot, baseline.current.values));
        if (changed) throw new Error(`${field.label}的列状态已变化，请恢复该列后保存，或取消本次修改`);
      }
      for (const field of fields.filter(field => !field.readonly && field.kind !== 'image' && field.kind !== 'duration')) {
        let value = draft[field.key];
        if (field.kind === 'json' && typeof value === 'string') value = value.trim() ? JSON.parse(value) : null;
        if (field.required && (value == null || value === '' || (Array.isArray(value) && !value.length))) throw new Error(`${field.label}为必填项`);
        const previous = detailFieldValue(field, baseline.current.shot, baseline.current.values);
        if (equalDetailValue(value, previous)) continue;
        if (field.custom) custom_values.push({ field_id: field.custom.id, field_revision: baseline.current.fields.find(item => item.key === field.key)?.custom?.revision || field.custom.revision, value });
        else (changes as Record<string, unknown>)[field.key] = value;
      }
      if (fields.some(field => field.kind === 'duration' && !field.readonly)) {
        if (durationFrames == null) throw new Error('时长格式不正确，请使用 f帧 / s秒 / m分 / h时；无单位默认为秒');
        if (durationFrames !== baseline.current.shot.duration_frames) changes.duration_frames = durationFrames;
        if (locked !== baseline.current.shot.timing_locked) changes.timing_locked = locked;
      }
      if (fields.some(field => field.key === 'primary_method' && !field.readonly) && !equalDetailValue(secondary, baseline.current.shot.secondary_methods || [])) changes.secondary_methods = secondary;
      if (!Object.keys(changes).length && !custom_values.length && !image) { setMessage('保存成功'); return; }
      const saved = await save.mutateAsync({ id: shot.id, revision: baseline.current.shot.revision, changes, custom_values, image });
      const values = { ...baseline.current.values, ...Object.fromEntries(custom_values.map(item => [item.field_id, item.value])) };
      baseline.current = { shot: saved, values, fields };
      setDraft(Object.fromEntries(fields.map(field => [field.key, detailFieldValue(field, saved, values)])));
      setDuration(`${saved.duration_frames}f`); setSecondary(saved.secondary_methods || []); setLocked(saved.timing_locked); setImage(null);
      setError(null); setMessage('保存成功');
    } catch (cause) { setError(cause instanceof Error ? cause.message : '保存失败，草稿已保留'); }
  };
  const change = (key: string, value: unknown) => setDraft(current => ({ ...current, [key]: value }));
  const fieldView = (field: DetailField) => {
    const value = draft[field.key];
    const disabled = field.readonly || !canWrite || busy;
    const empty = field.required && (value == null || value === '' || (Array.isArray(value) && !value.length));
    const editor = field.kind === 'image' ? <>
      <input ref={file} type="file" accept="image/png,image/jpeg,image/gif,image/webp" hidden disabled={disabled} aria-label="详情分镜画面文件" onChange={event => {
        const next = event.target.files?.[0]; event.target.value = '';
        if (!next) return;
        if (next.size > 10 * 1024 * 1024) { setError('图片不得超过 10 MB'); return; }
        setImage(next);
      }} />
      <button type="button" disabled={disabled} aria-label="上传或替换详情分镜画面" onClick={() => file.current?.click()} className="relative block h-36 w-full overflow-hidden rounded-md border border-border bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default">
        {imageUrl ? <img src={imageUrl} alt="待保存分镜画面" className="h-full w-full object-contain" /> : <ShotPanelImage shot={shot} className="h-full w-full object-contain"><span className="text-muted-foreground">点击上传分镜画面</span></ShotPanelImage>}
      </button>
    </> : field.kind === 'timecode' ? <div className="font-mono text-sm"><div>IN {timecode?.in || '—'}</div><div>OUT {timecode?.out || '—'}</div></div>
      : field.readonly ? <div className="line-clamp-3 whitespace-pre-wrap break-words text-sm" title={valueText(value)}>{valueText(value) || '—'}</div>
      : field.kind === 'duration' ? <><Input aria-label="详情时长" value={duration} disabled={disabled} onChange={event => setDuration(event.target.value)} className="h-9 text-sm" /><label className="mt-1 flex items-center gap-2 text-xs text-muted-foreground"><Checkbox aria-label="锁定时长" checked={locked} disabled={disabled} onCheckedChange={checked => setLocked(checked === true)} />锁定时长 · f帧 / s秒 / m分 / h时</label>{durationFrames == null && <span className="text-xs text-[#FF0082]">请输入有效时长</span>}</>
      : field.kind === 'select' ? <Select label={field.label} value={valueText(value)} disabled={disabled} options={field.key === 'sequence_id' ? [{ value: '', label: '未分篇章' }, ...sequences.map(sequence => ({ value: sequence.id, label: sequence.name }))] : [{ value: '', label: '请选择' }, ...field.options.map(option => ({ value: option, label: optionLabel(field, option) }))]} onChange={next => change(field.key, field.key === 'sequence_id' ? next || null : next)} />
      : field.kind === 'multiselect' ? <div className="flex max-h-20 flex-wrap gap-x-3 gap-y-1 overflow-auto">{field.options.map(option => <label key={option} className="flex items-center gap-1"><Checkbox aria-label={`${field.label}：${option}`} disabled={disabled} checked={Array.isArray(value) && value.includes(option)} onCheckedChange={checked => change(field.key, checked ? [...new Set([...(Array.isArray(value) ? value : []), option])] : (Array.isArray(value) ? value : []).filter(item => item !== option))} />{option}</label>)}</div>
      : field.kind === 'boolean' ? <Checkbox aria-label={field.label} disabled={disabled} checked={value === true} onCheckedChange={checked => change(field.key, checked === true)} />
      : field.kind === 'number' ? <Input type="number" aria-label={field.label} disabled={disabled} value={value == null ? '' : String(value)} onChange={event => change(field.key, event.target.value === '' ? null : Number(event.target.value))} className="h-9 text-sm" />
      : field.kind === 'date' ? <Input type="date" aria-label={field.label} disabled={disabled} value={valueText(value)} onChange={event => change(field.key, event.target.value)} className="h-9 text-sm" />
      : field.kind === 'movement' ? <DetailText label={field.label} value={typeof value === 'object' && value ? String((value as Record<string, unknown>).type || '') : ''} multiline={false} disabled={disabled} onChange={next => change(field.key, { ...(typeof value === 'object' && value ? value : {}), type: next })} />
      : <DetailText label={field.label} value={valueText(value)} multiline={field.kind === 'textarea' || field.kind === 'json'} disabled={disabled} onChange={next => change(field.key, next)} />;
    return <div key={field.key} className={`min-w-0 ${field.key === 'name' ? 'sm:col-span-2' : ''} ${field.hidden ? 'text-muted-foreground opacity-60' : ''}`}>
      <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">{field.label}{field.readonly && <span className="text-[11px] font-normal">只读</span>}</div>
      {editor}{empty && <p className="mt-1 text-xs text-[#FF0082]">{field.label}为必填项</p>}
      {field.key === 'primary_method' && !field.readonly && <div className="mt-2"><span className="text-xs text-muted-foreground">辅助制作方式</span><div className="flex max-h-20 flex-wrap gap-x-3 gap-y-1 overflow-auto">{field.options.map(option => <label key={option} className="flex items-center gap-1 text-xs"><Checkbox aria-label={`辅助制作方式：${getMethodLabel(option)}`} disabled={disabled} checked={secondary.includes(option as typeof secondary[number])} onCheckedChange={checked => setSecondary(checked ? [...new Set([...secondary, option as typeof secondary[number]])] : secondary.filter(item => item !== option))} />{getMethodLabel(option)}</label>)}</div></div>}
    </div>;
  };
  const visible = fields.filter(field => !field.hidden);
  const pictures = visible.filter(field => field.kind === 'image');
  const shortFields = visible.filter(field => !['image', 'textarea', 'json'].includes(field.kind));
  const longFields = visible.filter(field => ['textarea', 'json'].includes(field.kind));
  return <div ref={card} tabIndex={-1} data-local-history role="region" aria-label={`镜头 ${shot.display_number} 详情`} style={{ height }} className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card text-sm outline-none" onClick={event => event.stopPropagation()} onDoubleClick={event => event.stopPropagation()}>
    <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-6 py-4"><h2 className="min-w-0 truncate text-base font-semibold">镜头 {shot.display_number} · 详情 <span className="ml-2 text-xs font-normal text-muted-foreground">REV {shot.revision}</span></h2><Button size="sm" variant="destructive" disabled={!canWrite || busy} onClick={() => setTrash(true)} className="h-8 shrink-0 text-sm"><Icons.Trash2 />删除镜头</Button></header>
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-6" data-detail-body>
      <div className={`grid min-w-0 gap-5 ${pictures.length ? 'lg:grid-cols-[minmax(180px,240px)_minmax(0,1fr)]' : ''}`}>
        {pictures.length > 0 && <aside className="min-w-0 space-y-4 lg:sticky lg:top-0 lg:self-start">{pictures.map(fieldView)}</aside>}
        <div className="min-w-0 space-y-5">
          <div className="grid min-w-0 grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">{shortFields.map(fieldView)}</div>
          {longFields.length > 0 && <div className="grid min-w-0 grid-cols-1 gap-4 border-t border-border pt-4 xl:grid-cols-2">{longFields.map(fieldView)}</div>}
        </div>
      </div>
      {fields.some(field => field.hidden) && <section className="mt-5 border-t border-border pt-4"><h3 className="mb-4 text-xs text-muted-foreground">隐藏列 · 只读</h3><div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{fields.filter(field => field.hidden).map(fieldView)}</div></section>}
    </div>
    <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-6 py-4"><span className="mr-auto text-xs text-muted-foreground">{busy ? '保存中…' : dirty ? '有未保存修改' : '已同步'}</span><Button size="sm" disabled={!canWrite || busy} onClick={() => void submit()} className="h-8 text-sm"><Icons.Check />保存</Button><Button size="sm" variant="outline" disabled={busy} onClick={onClose} className="h-8 text-sm">取消</Button></footer>
    <Dialog open={discard} onOpenChange={open => { if (!open && !busy) forceClose(); }}><DialogContent hideCloseButton onEscapeKeyDown={event => { event.preventDefault(); if (!busy) forceClose(); }} onPointerDownOutside={event => event.preventDefault()}><DialogTitle>放弃未保存的修改？</DialogTitle><DialogDescription>取消或按 Esc 将放弃修改并收起详情。</DialogDescription><DialogFooter><Button variant="outline" onClick={() => setDiscard(false)}>返回编辑</Button><Button disabled={busy} onClick={forceClose}>取消并收起</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={trash} onOpenChange={setTrash}><DialogContent><DialogTitle>删除镜头 {shot.display_number}？</DialogTitle><DialogDescription>镜头会移入废纸篓；未保存的修改将放弃。</DialogDescription><DialogFooter><Button variant="outline" disabled={busy} onClick={() => setTrash(false)}>取消</Button><Button variant="destructive" disabled={busy} onClick={async () => { try { await deletion.mutateAsync(shot.id); forceClose(); } catch (cause) { setError(cause instanceof Error ? cause.message : '删除失败'); } }}>确认删除</Button></DialogFooter></DialogContent></Dialog>
    <ShotFeedbackDialog message={message || error} onClose={() => { setMessage(null); setError(null); }} />
  </div>;
}
