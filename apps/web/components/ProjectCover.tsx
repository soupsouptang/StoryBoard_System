'use client';

import React, { useEffect, useState } from 'react';
import { apiImageBlob } from '@/lib/api-client';

interface ProjectCoverProps {
  name: string;
  mediaId?: string | null;
  className?: string;
}

export function ProjectCover({ name, mediaId, className = '' }: ProjectCoverProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    setImageUrl(null);
    if (!mediaId) return;
    const controller = new AbortController();
    let objectUrl: string | null = null;
    void apiImageBlob(mediaId, controller.signal)
      .then(blob => {
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setImageUrl(objectUrl);
      })
      .catch(() => { if (!controller.signal.aborted) setImageUrl(null); });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [mediaId]);

  const safeName = name || '';
  const isCJK = /[\u4e00-\u9fff]/.test(safeName);
  const mono = safeName
    ? (isCJK ? safeName.slice(0, 1) : safeName.slice(0, 2).toUpperCase())
    : '#';

  let hue = 0;
  for (let i = 0; i < safeName.length; i += 1) {
    hue = (hue * 31 + safeName.charCodeAt(i)) % 360;
  }

  const bgStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, hsl(${hue} 30% 25%), hsl(${(hue + 26) % 360} 36% 15%))`
  };

  return (
    <div
      className={`relative grid shrink-0 place-items-center overflow-hidden rounded-lg ${className || 'h-[56px] w-[96px]'}`}
      style={bgStyle}
      aria-hidden="true"
    >
      {imageUrl && <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" onError={() => setImageUrl(null)} />}
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background: 'linear-gradient(90deg, rgba(0,0,0,0) 62%, rgb(var(--card)) 128%)'
        }}
      />
      <span className="relative z-0 text-base font-semibold leading-none tracking-[0.04em] text-white/80">
        {mono}
      </span>
    </div>
  );
}
