'use client';
import { useEffect, useRef, useState } from 'react';
import type { Shot } from '@frameforge/types';
import { useShotFraming } from '@/lib/hooks/useShotFraming';
import { drawShotFraming, type ShotFraming } from '@/lib/shot-framing';
export function ShotFramingImage({ shot, file, framing }: {shot:Shot; file:File|null; framing:ShotFraming}) {
  const source = useShotFraming(shot, !file), canvas = useRef<HTMLCanvasElement>(null);
  const blob = file || source.data?.blob;
  const [error,setError] = useState('');
  useEffect(() => {
    if (!blob || !canvas.current) return;
    const image = new Image(), url = URL.createObjectURL(blob);
    image.onload = () => { try { drawShotFraming(canvas.current!,image,framing.transform);setError(''); } catch(cause) {setError(cause instanceof Error ? cause.message : '构图显示失败');} };
    image.onerror = () => setError('原图加载失败'); image.src=url;
    return () => { image.onload=null;image.onerror=null;URL.revokeObjectURL(url); };
  },[blob,framing]);
  return error ? <span role="alert">{error}</span> : <canvas ref={canvas} aria-label={`镜头 ${shot.display_number} 待保存构图`} className="h-full w-full object-contain" />;
}
