'use client';
import { useEffect, useRef, useState } from 'react';
import type { Shot } from '@frameforge/types';
import { Button, Dialog, DialogContent, DialogDescription, DialogTitle, Icons } from '@frameforge/ui';
import { useShotFraming } from '@/lib/hooks/useShotFraming';
import { drawShotFraming, framingBlob, fullFrame, panFraming, projectFrameRatio, zoomFraming, type ShotFraming } from '@/lib/shot-framing';

export function ShotImagePreview({ shot, aspectRatio, open, onClose, onReplace, onLock, disabled, file, framing,
  onUndo, onRedo, canUndo, canRedo }: {
  shot: Shot; aspectRatio: string; open: boolean; onClose: () => void; onReplace: () => void;
  onLock: (framing: ShotFraming) => Promise<unknown> | void; disabled: boolean;
  file?: File | null; framing?: ShotFraming | null;
  onUndo?: () => void; onRedo?: () => void; canUndo?: boolean; canRedo?: boolean;
}) {
  const source = useShotFraming(shot, open && !file);
  const [snapshot, setSnapshot] = useState<typeof source.data>();
  const [acknowledgement, setAcknowledgement] = useState(0);
  const adjusted = useRef(false);
  const blob = file || snapshot?.blob;
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [transform, setTransform] = useState<ShotFraming['transform'] | null>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [locked, setLocked] = useState(false);
  const [bounds, setBounds] = useState({ center: 0, width: 0, maxHeight: 0 });
  const stage = useRef<HTMLDivElement>(null), canvas = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  useEffect(() => {
    if (!open) { setSnapshot(undefined); adjusted.current=false; setLocked(false); }
    else if (source.data && !adjusted.current) setSnapshot(source.data);
  }, [open, source.data, acknowledgement]);
  useEffect(() => { adjusted.current=false; }, [file, framing]);
  let frameRatio = 16 / 9;
  try { frameRatio = projectFrameRatio(aspectRatio).ratio; } catch { /* actionable error in initialization */ }
  useEffect(() => {
    if (!open || !blob) { setImage(null); return; }
    setImage(null); setTransform(null);
    const url = URL.createObjectURL(blob), next = new Image();
    next.onload = () => { setImage(next); setError(''); };
    next.onerror = () => setError('原图加载失败，请重新打开后重试。'); next.src = url;
    return () => { next.onload = null; next.onerror = null; URL.revokeObjectURL(url); };
  }, [open, blob]);
  useEffect(() => {
    if (!open || !image) return;
    try {
      const base = fullFrame(aspectRatio, image.naturalWidth, image.naturalHeight);
      const saved = framing?.transform || (!file ? snapshot?.presentation.transform : null);
      setTransform(saved?.aspect_ratio === base.aspect_ratio ? saved : base);
      drag.current = null;
    } catch (cause) { setError(cause instanceof Error ? cause.message : '项目画幅无效'); }
  }, [open, image, aspectRatio, framing, file, snapshot]);
  useEffect(() => {
    if (!open) return;
    const region = document.querySelector('[data-shots-content]') || document.querySelector('main');
    const measure = () => { const rect = region?.getBoundingClientRect(); const left = rect?.left || 0, width = rect?.width || window.innerWidth;
      setBounds({ center: left + width / 2, width: Math.min(width - 16, Math.max(288, width * .5)), maxHeight: window.innerHeight * .85 }); };
    measure(); window.addEventListener('resize', measure);
    const observer = new ResizeObserver(measure); if (region) observer.observe(region);
    return () => { observer.disconnect(); window.removeEventListener('resize', measure); };
  }, [open]);
  useEffect(() => {
    if (!image || !transform || !canvas.current) return;
    const frame = requestAnimationFrame(() => { try { drawShotFraming(canvas.current!, image, transform); } catch (cause) { setError(cause instanceof Error ? cause.message : '构图预览失败'); } });
    return () => cancelAnimationFrame(frame);
  }, [image, transform]);
  useEffect(() => {
    const element = stage.current;
    if (!element || !open) return;
    const wheel = (event: WheelEvent) => {
      if (disabled || pending || !image) return;
      event.preventDefault(); adjusted.current=true; setLocked(false);
      setTransform(current => current ? zoomFraming(current,current.scale * Math.exp(-event.deltaY * .002)) : current);
    };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => element.removeEventListener('wheel', wheel);
  }, [open, disabled, pending, image]);
  const zoom = transform ? Math.round(transform.scale * 100) : 100;
  const setScale = (value: number) => { adjusted.current=true; setLocked(false); setTransform(current => current ? zoomFraming(current,value / 100) : current); };
  const reset = () => { if (!image || pending || disabled) return; adjusted.current=true; setTransform(fullFrame(aspectRatio, image.naturalWidth, image.naturalHeight)); setLocked(false); drag.current = null; };
  const frameHeight = Math.max(80, Math.min((bounds.width - 34) / frameRatio, bounds.maxHeight - 180));
  const finishDrag = () => { drag.current = null; };
  const download = async (original: boolean) => {
    try {
      let data = original ? blob : null;
      if (!original && image && transform) {
        const output=document.createElement('canvas');
        drawShotFraming(output,image,transform,true);
        data=await framingBlob(output);
      }
      if (!data) return;
      const extension = original ? data.type.split('/')[1]?.replace('jpeg', 'jpg') || 'png' : 'png';
      const url = URL.createObjectURL(data), link = document.createElement('a');
      link.href = url; link.download = `镜头${shot.display_number}_${original ? '原图' : '构图画面'}.${extension}`;
      link.click(); setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (cause) { setError(cause instanceof Error ? cause.message : '下载失败'); }
  };
  const lock = async () => {
    if (!transform || !image || disabled || pending) return;
    setPending(true); setError('');
    try {
      const before=framing?.transform || (!file ? snapshot?.presentation.transform : null);
      if (JSON.stringify(before)!==JSON.stringify(transform)) await onLock({ source: file ? null : framing?.source || snapshot?.source || null, transform });
      adjusted.current=false;
      setAcknowledgement(current => current+1);
      setLocked(true);
    }
    catch (cause) { setError(cause instanceof Error ? cause.message : '锁定失败，调整已保留'); }
    finally { setPending(false); }
  };
  const editDisabled = disabled || pending || !image || !transform;
  return <Dialog open={open} onOpenChange={next => { if (!next) onClose(); }}>
    <DialogContent aria-describedby={undefined} style={{ left: bounds.center || '50%', width: bounds.width || '50%', maxWidth: 'none', maxHeight: bounds.maxHeight || '85vh' }}
      className="gap-3 overflow-y-auto p-4" closeLabel="关闭画面预览" onKeyDown={event => {
        const target = event.target as HTMLElement;
        if (target.closest('input,textarea') || !(event.metaKey || event.ctrlKey) || event.altKey || pending) return;
        const key = event.key.toLowerCase();
        if (key === 'z' && onUndo) { event.preventDefault(); event.stopPropagation(); (event.shiftKey ? onRedo : onUndo)?.(); }
        else if (key === 'y' && event.ctrlKey && onRedo) { event.preventDefault(); event.stopPropagation(); onRedo(); }
      }}>
      <div className="flex items-center gap-2 pr-6">
        <DialogTitle className="text-sm">镜头 {shot.display_number} · 分镜画面</DialogTitle>
        {onUndo && <Button variant="ghost" size="icon-sm" aria-label="撤销锁定构图" title="撤销锁定构图" disabled={!canUndo || pending} onClick={onUndo}><Icons.Undo2 /></Button>}
        {onRedo && <Button variant="ghost" size="icon-sm" aria-label="重做锁定构图" title="重做锁定构图" disabled={!canRedo || pending} onClick={onRedo}><Icons.Redo2 /></Button>}
      </div>
      <DialogDescription className="sr-only">固定项目画幅 {aspectRatio}。按住鼠标左键移动画面，滚轮缩放，双击百分比恢复居中满框。只有锁定画面才确认，Esc 或点击窗外取消未锁定调整。</DialogDescription>
      <div ref={stage} data-preview-stage data-frame-ratio={aspectRatio} className="flex touch-none select-none items-center justify-center overflow-hidden rounded-md bg-black"
        style={{ height: frameHeight, width:Math.min(bounds.width-34,frameHeight*frameRatio)||'100%', maxWidth:'100%', justifySelf:'center', cursor: editDisabled ? 'default' : drag.current ? 'grabbing' : 'grab' }} aria-label="分镜画面预览"
        onPointerDown={event => { if (event.button !== 0 || editDisabled) return; event.preventDefault(); drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY }; event.currentTarget.setPointerCapture(event.pointerId); }}
        onPointerMove={event => { const last = drag.current; if (!last || last.id !== event.pointerId || editDisabled) return;
          const rect = canvas.current?.getBoundingClientRect(); if (!rect) return;
          const dx = event.clientX - last.x, dy = event.clientY - last.y; drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
          adjusted.current=true; setLocked(false); setTransform(current => current ? panFraming(current, dx, dy, rect.width, rect.height) : current); }}
        onPointerUp={finishDrag} onPointerCancel={finishDrag} onLostPointerCapture={finishDrag}>
        {image && transform ? <canvas ref={canvas} data-framing-scale={transform.scale} data-framing-x={transform.translation_x} data-framing-y={transform.translation_y}
          aria-label={`镜头 ${shot.display_number} 构图预览`} className="block max-h-full max-w-full" style={{aspectRatio:frameRatio, width:'100%', height:'100%', objectFit:'contain'}} />
          : <p role="status" className="p-4 text-sm text-muted-foreground">{source.isError ? '画面加载失败，请重新打开后重试。' : '加载画面…'}</p>}
      </div>
      <div className="@container/preview-toolbar">
        <div className="grid grid-cols-1 items-center gap-3 @min-[1000px]/preview-toolbar:grid-cols-[1fr_auto_1fr]">
          <div data-zoom-capsule className="flex items-center justify-self-center gap-3 rounded-full border border-border p-1.5 @min-[1000px]/preview-toolbar:col-start-2">
            <Button variant="ghost" size="icon-sm" aria-label="缩小图片" disabled={editDisabled || zoom <= 50} onClick={() => setScale(zoom - 25)} className="rounded-full"><Icons.Minus /></Button>
            <button type="button" aria-label="图片缩放比例，双击恢复100%" title="双击恢复100%居中满框" disabled={editDisabled} onDoubleClick={reset} className="w-[5ch] text-center text-sm tabular-nums">{zoom}%</button>
            <Button variant="ghost" size="icon-sm" aria-label="放大图片" disabled={editDisabled || zoom >= 300} onClick={() => setScale(zoom + 25)} className="rounded-full"><Icons.Plus /></Button>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 @min-[1000px]/preview-toolbar:col-start-3">
            <Button size="sm" aria-label="锁定画面" disabled={editDisabled} onClick={() => void lock()} className="h-8 text-sm"><Icons.Lock />{pending ? '锁定中' : '锁定画面'}</Button>
            <Button variant="outline" size="sm" aria-label="下载构图后的画面" disabled={!image || !transform} onClick={() => void download(false)} className="h-8 text-sm"><Icons.Download />构图下载</Button>
            <Button variant="outline" size="sm" aria-label="下载原图" disabled={!blob} onClick={() => void download(true)} className="h-8 text-sm"><Icons.Download />原图下载</Button>
            <Button variant="outline" size="sm" aria-label="替换分镜画面" disabled={disabled || pending} onClick={onReplace} className="h-8 text-sm"><Icons.RefreshCw />替换</Button>
          </div>
        </div>
      </div>
      {locked && <p role="status" className="text-xs text-muted-foreground">{onUndo ? '构图已锁定至草稿，点击详情卡片保存后提交。' : '画面已锁定。'}</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </DialogContent>
  </Dialog>;
}
