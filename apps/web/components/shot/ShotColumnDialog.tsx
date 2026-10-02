'use client';

import { useState } from 'react';
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle, Input } from '@frameforge/ui';

export function ShotColumnDialog({ mode, label, candidates, existingLabels, returnFocus, onCancel, onConfirm }: {
  mode: 'insert' | 'rename'; label: string;
  candidates: { key: string; label: string }[]; existingLabels: string[];
  returnFocus: HTMLElement | null; onCancel: () => void;
  onConfirm: (keys: string[], name: string) => Promise<void>;
}) {
  const [name, setName] = useState(mode === 'rename' ? label : '');
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const duplicate = mode === 'rename' && name.trim() !== label && existingLabels.includes(name.trim());
  const confirm = async () => {
    if (pending) return;
    if (!name.trim() && !selected.length) { setError('请先选择或输入列名。'); return; }
    setPending(true); setError('');
    try { await onConfirm(candidates.filter(candidate => selected.includes(candidate.key)).map(candidate => candidate.key), name.trim()); }
    catch (cause) { setError(cause instanceof Error ? cause.message : '列操作失败，原数据已保留。'); }
    finally { setPending(false); }
  };
  return <Dialog open onOpenChange={open => { if (!open && !pending) onCancel(); }}>
    <DialogContent className="max-w-md" onCloseAutoFocus={event => { event.preventDefault(); returnFocus?.focus({ preventScroll: true }); }}
      onEscapeKeyDown={event => { if (pending) event.preventDefault(); }} onInteractOutside={event => { if (pending) event.preventDefault(); }}>
      <DialogTitle>{mode === 'rename' ? '修改列名' : '新增列'}</DialogTitle>
      <DialogDescription>{mode === 'rename' ? '修改列名不会改变列的数据和功能。只有点击确认才保存。' : '选择尚未显示的列，或输入一个新列名。确认后插入指定位置。'}</DialogDescription>
      {candidates.length > 0 && <div className="max-h-56 space-y-2 overflow-y-auto rounded-md border p-3">
        {candidates.map(candidate => <label key={candidate.key} className="flex items-center gap-2 text-sm">
          <input type="checkbox" disabled={pending} checked={selected.includes(candidate.key)}
            onChange={event => {
              if (mode === 'rename') { setSelected(event.target.checked ? [candidate.key] : []); setName(event.target.checked ? candidate.label : ''); }
              else setSelected(current => event.target.checked ? [...current, candidate.key] : current.filter(key => key !== candidate.key));
            }} />{candidate.label}
        </label>)}
      </div>}
      <label className="space-y-2 text-sm">{mode === 'rename' ? '列名' : '手动输入新列名'}
        <Input autoFocus maxLength={80} disabled={pending} value={name} aria-label="列名" placeholder="请输入列名"
          onChange={event => { setName(event.target.value); if (mode === 'rename') setSelected([]); setError(''); }} />
      </label>
      {duplicate && <p role="status" className="text-sm text-warning">此名称与已有列重复；点击确认仍可使用该名称，列数据保持独立。</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <DialogFooter><Button variant="outline" disabled={pending} onClick={onCancel}>取消</Button>
        <Button disabled={pending} onClick={() => void confirm()}>{pending ? '处理中…' : '确认'}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}
