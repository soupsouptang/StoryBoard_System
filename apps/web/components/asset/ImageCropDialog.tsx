'use client';

import { useEffect, useRef, useState } from 'react';
import ReactCrop, { centerCrop, makeAspectCrop, type PercentCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { useQuery } from '@tanstack/react-query';
import { Button, Dialog, DialogContent, DialogTitle, DialogDescription, Input, Select } from '@frameforge/ui';
import { apiClient, apiDownload } from '@/lib/api-client';
import { useAuthStore } from '@/stores/authStore';
import { drawMediaPreview } from '@/lib/media-preview';
import { assetError, assetPath, useAssetMutation, type AssetLibraryItem, type MediaPresentation, type ImageVersion } from '@/lib/hooks/useAssets';

type Transform = MediaPresentation['transform'];
const ORIGINAL: Transform = { crop: { x: 0, y: 0, width: 1, height: 1 }, rotation: 0, aspect_ratio: null, output_width: 1920,
  scale: 1, translation_x: 0, translation_y: 0, straighten_degrees: 0, perspective_horizontal: 0, perspective_vertical: 0, flip_horizontal: false, flip_vertical: false };
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const same = (a: Transform, b: Transform) => JSON.stringify(a) === JSON.stringify(b);

export function ImageCropDialog({ productionId, asset, open, onOpenChange, owner }: {
  productionId: string; asset: AssetLibraryItem; open: boolean; onOpenChange: (open: boolean) => void;
  owner?: { owner_type: 'asset' | 'panel' | 'production'; owner_id: string };
}) {
  const [pending, setPending] = useState(false);
  const returnFocus = useRef<HTMLElement | null>(typeof document === 'undefined' ? null : document.activeElement as HTMLElement);
  return <Dialog open={open} onOpenChange={value => { if (!pending) onOpenChange(value); }}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl"
    onCloseAutoFocus={event => { event.preventDefault(); if (returnFocus.current?.isConnected) returnFocus.current.focus(); }}>
    <DialogTitle>裁剪与构图 · {asset.display_name || asset.filename}</DialogTitle>
    <DialogDescription>拖动边角裁剪，切换“移动画面”重新构图，滚轮或双指缩放。原图和历史调整均保留。</DialogDescription>
    {open && <CropEditor key={`${asset.id}:${owner?.owner_id}`} productionId={productionId} asset={asset} owner={owner} onPending={setPending} onClose={() => onOpenChange(false)} />}
  </DialogContent></Dialog>;
}

function CropEditor({ productionId, asset, owner, onClose, onPending }: {
  productionId: string; asset: AssetLibraryItem; owner?: { owner_type: 'asset' | 'panel' | 'production'; owner_id: string };
  onClose: () => void; onPending: (value: boolean) => void;
}) {
  const permissions = useAuthStore(s => s.user?.role?.permissions);
  const canWrite = Boolean(permissions?.['*'] || permissions?.['production.write'] || permissions?.['asset.write']);
  const path = assetPath(productionId, asset.id);
  const ownerQuery = owner ? `?${new URLSearchParams(owner)}` : '';
  const versions = useQuery({ queryKey: ['asset-versions', productionId, asset.id], queryFn: ({ signal }) => apiClient<ImageVersion[]>(`${path}/image-versions`, { signal }) });
  const presentation = useQuery({ queryKey: ['asset-presentation', productionId, asset.id, owner], queryFn: ({ signal }) => apiClient<MediaPresentation>(`${path}/presentation${ownerQuery}`, { signal }) });
  const [draft, setDraft] = useState<Transform>(ORIGINAL);
  const live = useRef(draft); live.current = draft;
  const initialized = useRef(false);
  const [sourceId, setSourceId] = useState('');
  const [presentationRevision, setPresentationRevision] = useState(0);
  const [assetRevision, setAssetRevision] = useState(asset.revision);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState('');
  const [imageError, setImageError] = useState('');
  const [ratio, setRatio] = useState('free');
  const [customRatio, setCustomRatio] = useState('16:9');
  const [panMode, setPanMode] = useState(false);
  const [undo, setUndo] = useState<Transform[]>([]);
  const [redo, setRedo] = useState<Transform[]>([]);
  const gesture = useRef<Transform | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const canvas = useRef<HTMLCanvasElement>(null);
  const mutation = useAssetMutation(productionId);
  const source = sourceId || versions.data?.find(row => row.current)?.id || versions.data?.[0]?.id || '';
  const dimensions = image ? [draft.rotation % 180 ? image.naturalHeight : image.naturalWidth, draft.rotation % 180 ? image.naturalWidth : image.naturalHeight] : [1, 1];
  const aspect = draft.aspect_ratio ? draft.aspect_ratio.split(':').map(Number).reduce((w, h) => w / h) : undefined;
  const height = Math.round(draft.output_width * (aspect ? 1 / aspect : dimensions[1] * draft.crop.height / (dimensions[0] * draft.crop.width)));
  const valid = height > 0 && height <= 3840;

  function change(next: Transform, remember = true) {
    const previous = live.current;
    if (remember && !gesture.current && !same(previous, next)) { setUndo(rows => [...rows.slice(-49), previous]); setRedo([]); }
    live.current = next; setDraft(next);
  }
  function begin() { gesture.current ??= live.current; }
  function end() {
    const previous = gesture.current; gesture.current = null;
    if (previous && !same(previous, live.current)) { setUndo(rows => [...rows.slice(-49), previous]); setRedo([]); }
  }
  function history(back: boolean) {
    const rows = back ? undo : redo, previous = rows.at(-1); if (!previous) return;
    const current = live.current;
    if (back) { setUndo(rows.slice(0, -1)); setRedo(rows => [...rows, current]); }
    else { setRedo(rows.slice(0, -1)); setUndo(rows => [...rows, current]); }
    change(previous, false); setRatio(previous.aspect_ratio ? ['21:9','16:9','4:3','1:1','9:16'].includes(previous.aspect_ratio) ? previous.aspect_ratio : 'custom' : 'free'); if (previous.aspect_ratio) setCustomRatio(previous.aspect_ratio);
  }
  useEffect(() => {
    if (!presentation.data || initialized.current) return;
    initialized.current = true; setPresentationRevision(presentation.data.revision); setSourceId(presentation.data.source_version_id);
    live.current = presentation.data.transform; setDraft(presentation.data.transform);
    if (presentation.data.transform.aspect_ratio) { setRatio(['21:9','16:9','4:3','1:1','9:16'].includes(presentation.data.transform.aspect_ratio) ? presentation.data.transform.aspect_ratio : 'custom'); setCustomRatio(presentation.data.transform.aspect_ratio); }
  }, [presentation.data]);
  useEffect(() => {
    if (!source) return;
    let cancelled = false, url: string | undefined; const img = new Image();
    setImage(null); setLoading(true); setImageError('');
    void apiDownload(`${path}/image-versions/${encodeURIComponent(source)}/content`, 'source-image').then(({ blob }) => {
      if (cancelled) return; url = URL.createObjectURL(blob);
      img.onload = () => { if (!cancelled) { setImage(img); setLoading(false); } };
      img.onerror = () => { if (!cancelled) { setImageError('源图片无法解码，请重试。'); setLoading(false); } }; img.src = url;
    }).catch(reason => { if (!cancelled) { setImageError(assetError(reason)); setLoading(false); } });
    return () => { cancelled = true; img.onload = null; img.onerror = null; if (url) URL.revokeObjectURL(url); };
  }, [path, source, retry]);
  useEffect(() => {
    if (!image || !canvas.current) return;
    const frame = requestAnimationFrame(() => { try { drawMediaPreview(canvas.current!, image, draft); } catch (reason) { setImageError(assetError(reason)); } });
    return () => cancelAnimationFrame(frame);
  }, [image, draft]);
  function selectRatio(value: string, flipped = false) {
    setRatio(value);
    let chosen = value === 'free' || value === 'original' ? null : value === 'custom' ? customRatio : value;
    if (chosen && !/^[1-9][0-9]{0,3}:[1-9][0-9]{0,3}$/.test(chosen)) return;
    if (flipped && live.current.aspect_ratio) { chosen = live.current.aspect_ratio.split(':').reverse().join(':'); setRatio('custom'); setCustomRatio(chosen); }
    const percent = chosen ? centerCrop(makeAspectCrop({ unit: '%', width: 100 }, chosen.split(':').map(Number).reduce((w, h) => w / h), dimensions[0], dimensions[1]), dimensions[0], dimensions[1]) : null;
    change({ ...live.current, aspect_ratio: chosen, ...(percent ? { crop: { x: percent.x / 100, y: percent.y / 100, width: percent.width / 100, height: percent.height / 100 } } : value === 'original' ? { crop: ORIGINAL.crop } : {}) });
  }
  function pan(event: React.PointerEvent<HTMLCanvasElement>) {
    const before = pointers.current.get(event.pointerId); if (!before) return;
    const entries = [...pointers.current.values()]; const previousDistance = entries.length === 2 ? Math.hypot(entries[0].x - entries[1].x, entries[0].y - entries[1].y) : 0;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const next = [...pointers.current.values()], bounds = event.currentTarget.getBoundingClientRect();
    if (next.length === 2 && previousDistance > 0) change({ ...live.current, scale: clamp(live.current.scale * Math.hypot(next[0].x - next[1].x, next[0].y - next[1].y) / previousDistance, 1, 10) }, false);
    else if (panMode) change({ ...live.current, translation_x: clamp(live.current.translation_x + (event.clientX - before.x) / bounds.width, -1, 1), translation_y: clamp(live.current.translation_y + (event.clientY - before.y) / bounds.height, -1, 1) }, false);
  }
  async function save() {
    if (!image || !valid || !canWrite || mutation.isPending) return;
    setError(''); onPending(true);
    try { await mutation.mutateAsync({ kind: 'crop', assetId: asset.id, revision: assetRevision, presentation_revision: presentationRevision, source_version_id: source, ...owner, ...draft }); onClose(); }
    catch (reason) { setError(assetError(reason)); } finally { onPending(false); }
  }
  const sliders: { key: 'scale' | 'straighten_degrees' | 'perspective_horizontal' | 'perspective_vertical'; label: string; min: number; max: number; step: number }[] = [
    { key: 'scale', label: '缩放', min: 1, max: 10, step: .01 }, { key: 'straighten_degrees', label: '拉直', min: -45, max: 45, step: .1 },
    { key: 'perspective_horizontal', label: '水平透视', min: -30, max: 30, step: .1 }, { key: 'perspective_vertical', label: '垂直透视', min: -30, max: 30, step: .1 }];
  return <div className="space-y-4" onKeyDown={event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !(event.target as HTMLElement).closest('input,textarea')) { event.preventDefault(); history(!event.shiftKey); }
  }}>
    {(presentation.isPending || versions.isPending || loading) && <p role="status">正在读取图片…</p>}
    {(presentation.error || versions.error || imageError) && <div role="alert">{assetError(presentation.error || versions.error || imageError)} <Button variant="outline" onClick={() => { void presentation.refetch(); void versions.refetch(); setRetry(n => n + 1); }}>重试</Button></div>}
    <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={!undo.length || mutation.isPending} onClick={() => history(true)}>撤销</Button><Button variant="outline" disabled={!redo.length || mutation.isPending} onClick={() => history(false)}>重做</Button><Button variant={panMode ? 'default' : 'outline'} disabled={mutation.isPending} aria-pressed={panMode} onClick={() => setPanMode(value => !value)}>移动画面</Button></div>
    <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_240px]">
      <div className="flex min-h-40 min-w-0 items-center justify-center overflow-hidden bg-black p-2" onPointerDownCapture={begin} onPointerUpCapture={end} onPointerCancelCapture={end} onWheel={event => { if (!image || mutation.isPending) return; event.preventDefault(); change({ ...live.current, scale: clamp(live.current.scale * Math.exp(-event.deltaY * .002), 1, 10) }); }}>
        {image && <ReactCrop crop={{ unit: '%', x: draft.crop.x * 100, y: draft.crop.y * 100, width: draft.crop.width * 100, height: draft.crop.height * 100 }} disabled={panMode || mutation.isPending} aspect={aspect} minWidth={1} minHeight={1} keepSelection ruleOfThirds
          onChange={(_, percent: PercentCrop) => change({ ...live.current, crop: { x: percent.x / 100, y: percent.y / 100, width: percent.width / 100, height: percent.height / 100 } })}
          ariaLabels={{ cropArea: '裁剪区域，方向键移动', nwDragHandle: '左上边角', nDragHandle: '上边界', neDragHandle: '右上边角', eDragHandle: '右边界', seDragHandle: '右下边角', sDragHandle: '下边界', swDragHandle: '左下边角', wDragHandle: '左边界' }}>
          <canvas ref={canvas} aria-label="图片构图预览" className={`block max-h-[48vh] max-w-full touch-none object-contain ${panMode ? 'cursor-move' : ''}`} onPointerDown={event => { if (mutation.isPending) return; pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY }); if (panMode) event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={pan} onPointerUp={event => { pointers.current.delete(event.pointerId); end(); }} onPointerCancel={event => { pointers.current.delete(event.pointerId); end(); }} />
        </ReactCrop>}
      </div>
      <div className="space-y-3">
        <Select label="画幅比例" value={ratio} disabled={mutation.isPending} options={['free','original','21:9','16:9','4:3','1:1','9:16','custom'].map(value => ({ value, label: ({ free: '自由', original: '原始', custom: '自定义' } as Record<string,string>)[value] || value }))} onChange={selectRatio} />
        {ratio === 'custom' && <div className="flex gap-2"><Input aria-label="自定义比例" value={customRatio} onChange={event => setCustomRatio(event.target.value)} placeholder="例如 16:9" /><Button variant="outline" disabled={!/^[1-9][0-9]{0,3}:[1-9][0-9]{0,3}$/.test(customRatio) || mutation.isPending} onClick={() => selectRatio('custom')}>应用</Button></div>}
        <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={!draft.aspect_ratio || mutation.isPending} onClick={() => selectRatio(ratio, true)}>横 / 竖</Button><Button variant="outline" disabled={mutation.isPending} onClick={() => change({ ...live.current, rotation: ((draft.rotation + 90) % 360) as Transform['rotation'], crop: ORIGINAL.crop })}>旋转 90°</Button><Button variant="outline" disabled={mutation.isPending} onClick={() => change({ ...live.current, flip_horizontal: !draft.flip_horizontal })}>水平翻转</Button><Button variant="outline" disabled={mutation.isPending} onClick={() => change({ ...live.current, flip_vertical: !draft.flip_vertical })}>垂直翻转</Button></div>
        {sliders.map(({ key, label, min, max, step }) => <label key={key} className="block space-y-1 text-sm"><span className="flex justify-between gap-2">{label}<output>{draft[key].toFixed(key === 'scale' ? 2 : 1)}{key === 'scale' ? '×' : '°'}</output></span><input className="w-full accent-primary" type="range" aria-label={label} min={min} max={max} step={step} value={draft[key]} disabled={mutation.isPending} onPointerDown={begin} onPointerUp={end} onPointerCancel={end} onChange={event => change({ ...live.current, [key]: Number(event.target.value) })} /></label>)}
        {!valid && <p role="alert" className="text-sm text-destructive">请调整比例或裁剪范围，输出高度不能超过 3840。</p>}
        {versions.data && versions.data.length > 1 && <Select label="原图版本" value={source} options={versions.data.map(row => ({ value: row.id, label: `原图版本 ${row.version_number}` }))} disabled={mutation.isPending} onChange={value => { setSourceId(value); change(ORIGINAL); setRatio('free'); setUndo([]); setRedo([]); }} />}
      </div>
    </div>
    {error && <div role="alert" className="space-y-2 text-sm text-destructive"><p>{error}</p><Button variant="outline" disabled={mutation.isPending} onClick={async () => { try { const rows = await apiClient<AssetLibraryItem[]>(`${assetPath(productionId)}?state=active`); const current = rows.find(row => row.id === asset.id); if (!current) throw new Error('素材已删除，请关闭后刷新素材库。'); const saved = await apiClient<MediaPresentation>(`${path}/presentation${ownerQuery}`); setPresentationRevision(saved.revision); setAssetRevision(current.revision); setError('已读取最新版本，请检查草稿后重试。'); } catch (reason) { setError(assetError(reason)); } }}>读取最新版本，保留草稿</Button></div>}
    <div className="flex flex-wrap justify-end gap-2"><Button variant="outline" disabled={mutation.isPending} onClick={() => { change(ORIGINAL); setRatio('free'); }}>恢复原图</Button><Button variant="outline" disabled={mutation.isPending} onClick={onClose}>取消</Button><Button disabled={!canWrite || !image || !valid || loading || Boolean(imageError || presentation.error) || presentation.isPending || mutation.isPending} onClick={() => void save()}>{mutation.isPending ? '保存中…' : '完成'}</Button></div>
  </div>;
}
