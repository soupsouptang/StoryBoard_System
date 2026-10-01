'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { apiImageBlob } from '@/lib/api-client';

export function AssetImage({ assetId, alt, className = '', children }: {
  assetId: string | null;
  alt: string;
  className?: string;
  children?: ReactNode;
}) {
  const [image, setImage] = useState<{ id: string; url: string } | null>(null);
  useEffect(() => {
    setImage(null);
    if (!assetId) return;
    const controller = new AbortController();
    let objectUrl: string | null = null;
    void apiImageBlob(assetId, controller.signal).then(blob => {
      if (controller.signal.aborted) return;
      objectUrl = URL.createObjectURL(blob);
      setImage({ id: assetId, url: objectUrl });
    }).catch(() => { if (!controller.signal.aborted) setImage(null); });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [assetId]);
  return image?.id === assetId ? <img src={image.url} alt={alt} className={className}
    onError={() => setImage(current => current?.id === assetId ? null : current)} /> : <>{children}</>;
}
