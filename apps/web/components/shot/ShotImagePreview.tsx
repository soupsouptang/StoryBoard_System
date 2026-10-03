'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Shot } from '@frameforge/types';
import { Button, Dialog, DialogContent, DialogDescription, DialogTitle, Icons } from '@frameforge/ui';
import { useQuery } from '@tanstack/react-query';
import { apiImageBlob } from '@/lib/api-client';
import { primaryPanelAssetId } from './ShotPanelImage';

export function ShotImagePreview({ shot, open, onClose, onReplace, disabled }: { shot: Shot; open: boolean; onClose: () => void; onReplace: () => void; disabled: boolean }) {
  const [zoom, setZoom] = useState(100);
  const [ratio, setRatio] = useState(16 / 9);
  const [url, setUrl] = useState<string | null>(null);
  const [bounds, setBounds] = useState({ center: 0, width: 0, maxHeight: 0 });
  const stage = useRef<HTMLDivElement>(null);
  const panel = [...(shot.panels || [])].filter(item => !item.deleted_at).sort((a, b) => a.sort_index - b.sort_index)[0];
  const assetId = primaryPanelAssetId(shot);
  const image = useQuery({ queryKey: ['shot-preview', assetId, panel?.id, shot.revision], enabled: open && Boolean(assetId), queryFn: ({ signal }) => apiImageBlob(assetId!, signal, panel ? { owner_type: 'panel', owner_id: panel.id } : undefined) });
  useEffect(() => {
    if (!image.data) { setUrl(null); return; }
    const next = URL.createObjectURL(image.data); setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [image.data]);
  useEffect(() => { if (open) setZoom(100); }, [open, assetId]);
  useEffect(() => {
    if (!open) return;
    const region = document.querySelector('[data-shots-content]') || document.querySelector('main');
    const measure = () => {
      const rect = region?.getBoundingClientRect();
      const left = rect?.left || 0, width = rect?.width || window.innerWidth;
      setBounds({ center: left + width / 2, width: Math.min(width - 16, Math.max(288, width * .5)), maxHeight: window.innerHeight * .85 });
    };
    measure(); window.addEventListener('resize', measure);
    const observer = new ResizeObserver(measure); if (region) observer.observe(region);
    return () => { observer.disconnect(); window.removeEventListener('resize', measure); };
  }, [open]);
  const frameHeight = Math.max(80, Math.min((bounds.width - 32) / ratio, bounds.maxHeight - 136));
  useLayoutEffect(() => {
    const element = stage.current;
    if (!element || !open) return;
    element.scrollLeft = Math.max(0, (element.scrollWidth - element.clientWidth) / 2);
    element.scrollTop = Math.max(0, (element.scrollHeight - element.clientHeight) / 2);
  }, [zoom, open, url, frameHeight, bounds.width]);
  const setScale = (value: number) => setZoom(Math.max(50, Math.min(300, value)));
  const download = () => {
    if (!url || !image.data) return;
    const extension = image.data.type.split('/')[1]?.replace('jpeg', 'jpg') || 'png';
    const link = document.createElement('a'); link.href = url; link.download = `镜头${shot.display_number}_分镜画面.${extension}`; link.click();
  };
  return <Dialog open={open} onOpenChange={next => { if (!next) onClose(); }}><DialogContent aria-describedby={undefined} style={{ left: bounds.center || '50%', width: bounds.width || '50%', maxWidth: 'none', maxHeight: bounds.maxHeight || '85vh' }} className="gap-3 overflow-hidden p-4" closeLabel="关闭画面预览">
    <DialogTitle className="pr-6 text-sm">镜头 {shot.display_number} · 分镜画面</DialogTitle>
    <DialogDescription className="sr-only">图片可放大、缩小、下载或替换，按 Esc 关闭。</DialogDescription>
    <div ref={stage} data-preview-stage className="overflow-auto rounded-md bg-muted/30" style={{ height: frameHeight }} aria-label="分镜画面预览">
      {url ? <div style={{ width: `${Math.max(100, zoom)}%`, height: `${Math.max(100, zoom)}%` }} className="flex items-center justify-center"><img alt={`镜头 ${shot.display_number} 放大预览`} src={url} onLoad={event => setRatio(event.currentTarget.naturalWidth / event.currentTarget.naturalHeight)} style={{ width: `${zoom < 100 ? zoom : 100}%`, height: `${zoom < 100 ? zoom : 100}%`, maxWidth: 'none', objectFit: 'contain', objectPosition: 'center' }} /></div> : <p className="p-4 text-sm text-muted-foreground">{image.isError ? '画面加载失败，请重新打开后重试。' : '加载画面…'}</p>}
    </div>
    <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
      <Button variant="outline" size="icon" aria-label="缩小图片" disabled={zoom <= 50} onClick={() => setScale(zoom - 25)} className="h-8 w-8"><Icons.ZoomOut /></Button>
      <input type="range" aria-label="图片缩放比例" min={50} max={300} step={1} value={zoom} onChange={event => setScale(Number(event.target.value))} className="min-w-12 flex-1 accent-foreground" />
      <Button variant="outline" size="icon" aria-label="放大图片" disabled={zoom >= 300} onClick={() => setScale(zoom + 25)} className="h-8 w-8"><Icons.ZoomIn /></Button><span className="w-[4ch] text-right tabular-nums">{zoom}%</span>
      <Button variant="outline" size="sm" aria-label="下载分镜画面" disabled={!url} onClick={download} className="h-8 text-sm"><Icons.Download />下载</Button>
      <Button variant="outline" size="sm" aria-label="替换分镜画面" disabled={disabled} onClick={onReplace} className="h-8 text-sm"><Icons.RefreshCw />替换</Button>
    </div>
  </DialogContent></Dialog>;
}
