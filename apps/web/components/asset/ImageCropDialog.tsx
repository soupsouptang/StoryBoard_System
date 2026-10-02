'use client';

import { useEffect, useRef, useState } from 'react';
import ReactCrop, { centerCrop, makeAspectCrop, type PercentCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { useQuery } from '@tanstack/react-query';
import { Button, Dialog, DialogContent, DialogTitle, DialogDescription, Input, Select } from '@frameforge/ui';
import { apiClient, apiDownload } from '@/lib/api-client';
import { useAuthStore } from '@/stores/authStore';
import { assetError, assetPath, useAssetMutation, type AssetLibraryItem, type ImageCrop, type ImageVersion } from '@/lib/hooks/useAssets';

const FULL: ImageCrop = { x: 0, y: 0, width: 1, height: 1 };
const MIN = 0.001;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function ImageCropDialog({ productionId, asset, open, onOpenChange }: {
  productionId: string; asset: AssetLibraryItem; open: boolean; onOpenChange: (open: boolean) => void;
}) {
  const [pending, setPending] = useState(false);
  const returnFocus = useRef<HTMLElement | null>(typeof document === 'undefined' ? null : document.activeElement as HTMLElement);
  return <Dialog open={open} onOpenChange={value => { if (!pending) onOpenChange(value); }}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl"
    onCloseAutoFocus={event => { event.preventDefault(); if (returnFocus.current?.isConnected) returnFocus.current.focus(); }}>
    <DialogTitle>裁剪与重框选 · {asset.display_name || asset.filename}</DialogTitle>
    <DialogDescription>先旋转，再选择裁剪区域。保存会应用到所有引用此素材的镜头，原始版本仍保留。</DialogDescription>
    {open && <CropEditor key={asset.id} productionId={productionId} asset={asset} onPending={setPending} onClose={() => onOpenChange(false)} />}
  </DialogContent></Dialog>;
}

function CropEditor({ productionId, asset, onClose, onPending }: { productionId: string; asset: AssetLibraryItem; onClose: () => void; onPending: (value: boolean) => void }) {
  const permissions = useAuthStore(s => s.user?.role?.permissions);
  const canWrite = Boolean(permissions?.['*'] || permissions?.['production.write'] || permissions?.['asset.write']);
  const path = assetPath(productionId, asset.id);
  const versions = useQuery({ queryKey: ['asset-versions', productionId, asset.id],
    queryFn: ({ signal }) => apiClient<ImageVersion[]>(`${path}/image-versions`, { signal }) });
  const mutation = useAssetMutation(productionId);
  const [sourceId, setSourceId] = useState('');
  const selectedId = sourceId || versions.data?.find(v => v.version_number === 1)?.id || versions.data?.[0]?.id || '';
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [loadedSourceId, setLoadedSourceId] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(asset.revision);
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0);
  const [crop, setCrop] = useState<ImageCrop>(FULL);
  const [ratio, setRatio] = useState('16:9');
  const [customW, setCustomW] = useState('16');
  const [customH, setCustomH] = useState('9');
  const [outputWidth, setOutputWidth] = useState('1920');
  const [rotated, setRotated] = useState<{ url: string; image: HTMLImageElement | null; sourceId: string; rotation: number } | null>(null);
  const [rotationError, setRotationError] = useState('');
  const outputCanvas = useRef<HTMLCanvasElement>(null);
  const aspect = ratio === 'custom' ? `${customW}:${customH}` : ratio;
  const [aw, ah] = aspect.split(':').map(Number);
  const validRatio = /^[1-9][0-9]{0,3}:[1-9][0-9]{0,3}$/.test(aspect) && Number.isSafeInteger(aw) && Number.isSafeInteger(ah);
  const output = Number(outputWidth);
  const validOutput = Number.isInteger(output) && output >= 64 && output <= 3840 && validRatio && Math.round(output * ah / aw) >= 1 && Math.round(output * ah / aw) <= 3840;
  const rotatedWidth = image ? (rotation % 180 ? image.naturalHeight : image.naturalWidth) : 1;
  const rotatedHeight = image ? (rotation % 180 ? image.naturalWidth : image.naturalHeight) : 1;

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false; let url: string | undefined; let img: HTMLImageElement | undefined;
    setImage(null); setLoadedSourceId(''); setLoading(true); setLoadError('');
    void apiDownload(`${path}/image-versions/${encodeURIComponent(selectedId)}/content`, 'source-image').then(({ blob }) => {
      if (cancelled) return;
      url = URL.createObjectURL(blob); img = new Image();
      img.onload = () => { if (!cancelled) { setImage(img!); setLoadedSourceId(selectedId); setLoading(false); } };
      img.onerror = () => { if (!cancelled) { setLoadError('源图片无法解码，请重试。'); setLoading(false); } };
      img.src = url;
    }).catch(reason => { if (!cancelled) { setLoadError(assetError(reason)); setLoading(false); } });
    return () => { cancelled = true; if (img) { img.onload = null; img.onerror = null; } if (url) URL.revokeObjectURL(url); };
  }, [path, selectedId, loadAttempt]);

  useEffect(() => {
    setRotated(null); setRotationError('');
    if (!image) return;
    let cancelled = false; let url: string | undefined;
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 1600 / Math.max(rotatedWidth, rotatedHeight));
    canvas.width = Math.round(rotatedWidth * scale); canvas.height = Math.round(rotatedHeight * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) { setRotationError('浏览器无法创建图片预览。'); return; }
    ctx.translate(canvas.width / 2, canvas.height / 2); ctx.rotate(rotation * Math.PI / 180);
    ctx.drawImage(image, -image.naturalWidth * scale / 2, -image.naturalHeight * scale / 2, image.naturalWidth * scale, image.naturalHeight * scale);
    canvas.toBlob(blob => {
      if (cancelled) return;
      if (!blob) { setRotationError('旋转预览生成失败。'); return; }
      url = URL.createObjectURL(blob); setRotated({ url, image: null, sourceId: loadedSourceId, rotation });
    }, 'image/png');
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
  }, [image, loadedSourceId, rotation, rotatedWidth, rotatedHeight]);

  useEffect(() => {
    const preview = outputCanvas.current; const source = rotated?.image;
    if (!preview) return;
    const out = preview.getContext('2d'); if (!out) return;
    if (!source) { preview.width = 640; preview.height = 360; out.fillStyle = '#000'; out.fillRect(0, 0, 640, 360); return; }
    if (!validOutput) { preview.width = 640; preview.height = 360; out.fillStyle = '#000'; out.fillRect(0, 0, 640, 360); return; }
    const outputHeight = Math.round(output * ah / aw);
    const displayScale = Math.min(640 / output, 640 / outputHeight);
    preview.width = Math.max(1, Math.round(output * displayScale)); preview.height = Math.max(1, Math.round(outputHeight * displayScale));
    out.fillStyle = '#000'; out.fillRect(0, 0, preview.width, preview.height);
    const sw = crop.width * source.naturalWidth; const sh = crop.height * source.naturalHeight;
    if (sw <= 0 || sh <= 0) return;
    // Match Pillow contain, including enlargement of a smaller selected region.
    const fit = Math.min(output / (crop.width * rotatedWidth), outputHeight / (crop.height * rotatedHeight));
    const dw = crop.width * rotatedWidth * fit * displayScale;
    const dh = crop.height * rotatedHeight * fit * displayScale;
    out.drawImage(source, crop.x * source.naturalWidth, crop.y * source.naturalHeight, sw, sh,
      (preview.width - dw) / 2, (preview.height - dh) / 2, dw, dh);
  }, [rotated, crop, aw, ah, validOutput, output, rotatedWidth, rotatedHeight]);

  function selection(percent: PercentCrop) {
    setCrop({ x: percent.x / 100, y: percent.y / 100, width: percent.width / 100, height: percent.height / 100 });
  }
  function numeric(field: keyof ImageCrop, value: string) {
    const n = Number(value) / 100; if (!Number.isFinite(n)) return;
    setCrop(c => ({ ...c, [field]: field === 'x' ? clamp(n, 0, 1 - c.width) : field === 'y' ? clamp(n, 0, 1 - c.height)
      : field === 'width' ? clamp(n, MIN, 1 - c.x) : clamp(n, MIN, 1 - c.y) }));
  }
  function fitRatio() {
    if (!validRatio) return;
    selection(centerCrop(makeAspectCrop({ unit: '%', width: 100 }, aw / ah, rotatedWidth, rotatedHeight), rotatedWidth, rotatedHeight));
  }
  async function save() {
    if (!rotated?.image || rotated.sourceId !== selectedId || rotated.rotation !== rotation || !validOutput || !canWrite || mutation.isPending) return;
    setError('');
    onPending(true);
    try {
      await mutation.mutateAsync({ kind: 'crop', assetId: asset.id, revision, source_version_id: selectedId, crop, rotation, aspect_ratio: aspect, output_width: output });
      onClose();
    } catch (reason) { setError(assetError(reason)); }
    finally { onPending(false); }
  }
  return <div className="space-y-4">
    {versions.isPending ? <p role="status">正在读取图片版本…</p> : versions.error ? <div role="alert">{assetError(versions.error)} <Button variant="outline" onClick={() => void versions.refetch()}>重试</Button></div> :
      <Select label="裁剪源版本" value={selectedId} disabled={mutation.isPending} options={(versions.data || []).map(v => ({ value: v.id, label: `版本 ${v.version_number}${v.version_number === 1 ? ' · 原图' : ''}${v.current ? ' · 当前' : ''}${v.width && v.height ? ` (${v.width} × ${v.height})` : ' · 加载后读取尺寸'}` }))}
        onChange={value => { setSourceId(value); setCrop(FULL); setRotation(0); }} />}
    {!versions.isPending && !versions.error && !selectedId && <p role="alert">没有可用的图片版本。</p>}
    {loading && <p role="status">正在加载原始画面…</p>}
    {loadError && <div role="alert">{loadError} <Button variant="outline" onClick={() => setLoadAttempt(n => n + 1)}>重试</Button></div>}
    <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-2">
        <p className="text-sm font-medium">旋转后的源画面</p>
        <div className="flex min-h-40 items-center justify-center rounded-md bg-black p-3">
          {rotated && <ReactCrop crop={{ unit: '%', x: crop.x * 100, y: crop.y * 100, width: crop.width * 100, height: crop.height * 100 }} onChange={(_, percent) => selection(percent)} disabled={mutation.isPending || !canWrite} minWidth={1} minHeight={1} keepSelection ruleOfThirds
            ariaLabels={{ cropArea: '裁剪区域，方向键移动', nwDragHandle: '调整左上边界', nDragHandle: '调整上边界', neDragHandle: '调整右上边界', eDragHandle: '调整右边界', seDragHandle: '调整右下边界', sDragHandle: '调整下边界', swDragHandle: '调整左下边界', wDragHandle: '调整左边界' }}>
            <img src={rotated.url} alt="完整源画面，拖动选择裁剪区域" className="block max-h-[420px] max-w-full object-contain" onLoad={event => { const img = event.currentTarget; setRotated(current => current?.url === img.src ? { ...current, image: img } : current); }} onError={() => setRotationError('旋转预览加载失败，请重新选择源版本。')} />
          </ReactCrop>}
        </div>
        {rotationError && <p role="alert" className="text-sm text-destructive">{rotationError}</p>}
        <p className="text-xs text-muted-foreground">拖动框内移动，拖动手柄调整边界；选中裁剪框或手柄后，用方向键微调，Shift 加速。数值框支持 0.01% 精度。</p>
        {image && <p className="text-xs text-muted-foreground">源图 {image.naturalWidth} × {image.naturalHeight} px；旋转后 {rotatedWidth} × {rotatedHeight} px</p>}
      </div>
      <div className="min-w-0 space-y-3">
        <p className="text-sm font-medium">输出画框预览</p>
        <div className="flex h-56 items-center justify-center rounded-md bg-black"><canvas ref={outputCanvas} className="max-h-full max-w-full object-contain" aria-label="所选区域等比缩放到黑色输出画框" /></div>
        <p className="text-xs text-muted-foreground">所选区域等比缩放，剩余区域填黑。</p>
        <Select label="输出画幅" value={ratio} disabled={mutation.isPending} options={['21:9', '16:9', '4:3', '1:1', '9:16', 'custom'].map(v => ({ value: v, label: v === 'custom' ? '自定义比例' : v }))} onChange={setRatio} />
        {ratio === 'custom' && <div className="grid grid-cols-2 gap-2"><Input aria-label="比例宽" type="number" min={1} max={9999} value={customW} onChange={e => setCustomW(e.target.value)} disabled={mutation.isPending} /><Input aria-label="比例高" type="number" min={1} max={9999} value={customH} onChange={e => setCustomH(e.target.value)} disabled={mutation.isPending} /></div>}
        {!validRatio && <p role="alert" className="text-xs text-destructive">比例宽和高需为 1–9999 的整数。</p>}
        <Button variant="outline" disabled={!image || !validRatio || mutation.isPending} onClick={fitRatio}>按画幅居中裁剪</Button>
        <Select label="旋转" value={String(rotation)} disabled={mutation.isPending} options={[0, 90, 180, 270].map(v => ({ value: String(v), label: `顺时针 ${v}°` }))} onChange={v => { setRotation(Number(v) as typeof rotation); setCrop(FULL); }} />
        <label className="block space-y-1 text-xs">输出宽度（px）<Input type="number" min={64} max={3840} value={outputWidth} disabled={mutation.isPending} onChange={e => setOutputWidth(e.target.value)} /></label>
        {validOutput ? <p className="text-xs text-muted-foreground">{output} × {Math.round(output * ah / aw)} px</p> : <p className="text-xs text-destructive">输出宽度需为 64–3840 的整数，高度需为 1–3840。</p>}
      </div>
    </div>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{(['x', 'y', 'width', 'height'] as const).map(field => <label key={field} className="space-y-1 text-xs">{({ x: '左侧', y: '顶部', width: '宽度', height: '高度' })[field]}（%）<Input type="number" step="0.01" min={field === 'x' || field === 'y' ? 0 : 0.1} max={100} value={Number((crop[field] * 100).toFixed(3))} disabled={mutation.isPending} onChange={e => numeric(field, e.target.value)} /></label>)}</div>
    {error && <div role="alert" className="space-y-2 text-sm text-destructive"><p>{error}</p><Button variant="outline" disabled={mutation.isPending} onClick={async () => {
      try { const list = await apiClient<AssetLibraryItem[]>(`${assetPath(productionId)}?state=active`); const current = list.find(a => a.id === asset.id); if (!current) throw new Error('素材已被删除，请关闭并刷新素材库。'); setRevision(current.revision); setError('已读取最新版本；请检查草稿，再保存。'); } catch (reason) { setError(assetError(reason)); }
    }}>读取最新版本，保留草稿</Button></div>}
    <div className="flex flex-wrap justify-end gap-2"><Button variant="outline" disabled={mutation.isPending} onClick={() => setCrop(FULL)}>恢复完整画面</Button><Button variant="outline" disabled={mutation.isPending} onClick={onClose}>取消</Button><Button disabled={!canWrite || !rotated?.image || rotated.sourceId !== selectedId || rotated.rotation !== rotation || loading || !selectedId || !validOutput || crop.width <= 0 || crop.height <= 0 || mutation.isPending} onClick={() => void save()}>{mutation.isPending ? '正在保存…' : '保存并应用到所有引用'}</Button></div>
  </div>;
}
