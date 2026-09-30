'use client';

import { useEffect, useState, type ReactNode } from 'react';
import type { Shot } from '@frameforge/types';
import { apiImageBlob } from '@/lib/api-client';

export function primaryPanelAssetId(shot: Shot): string | null {
  return [...(shot.panels ?? [])]
    .filter(panel => !panel.deleted_at)
    .sort((left, right) => left.sort_index - right.sort_index)[0]?.asset_id ?? null;
}

export function ShotPanelImage({
  shot,
  className = '',
  children
}: {
  shot: Shot;
  className?: string;
  children?: ReactNode;
}) {
  const assetId = primaryPanelAssetId(shot);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    setUrl(null);
    if (!assetId) return;
    const controller = new AbortController();
    let objectUrl: string | null = null;
    void apiImageBlob(assetId, controller.signal)
      .then(blob => {
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => { if (!controller.signal.aborted) setUrl(null); });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [assetId]);

  return url ? (
    <img
      src={url}
      alt={`镜头 ${shot.display_number} 分镜画面`}
      className={className}
      onError={() => setUrl(null)}
    />
  ) : <>{children}</>;
}
