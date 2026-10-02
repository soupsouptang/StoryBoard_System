'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiDownload, apiImageBlob } from '@/lib/api-client';
import { assetPath } from '@/lib/hooks/useAssets';

export function AssetImage({ assetId, alt, className = '', children, revision, prodId, thumbnail = false, presentation, owner }: {
  assetId: string | null;
  alt: string;
  className?: string;
  children?: ReactNode;
  revision?: number;
  prodId?: string;
  thumbnail?: boolean;
  owner?: { owner_type: string; owner_id: string };
  presentation?: { revision: number; source_version_id: string; owner_type: string; owner_id: string };
}) {
  const key = `${assetId}:${revision}:${prodId}:${thumbnail}:${JSON.stringify(presentation)}:${JSON.stringify(owner)}`;
  const imageQuery = useQuery({
    queryKey: ['asset-image', assetId, thumbnail && prodId ? 'thumbnail' : 'original', prodId, revision, presentation, owner],
    enabled: Boolean(assetId),
    queryFn: async ({ signal }) => {
      const params = presentation ? new URLSearchParams({ revision: String(presentation.revision), owner_type: presentation.owner_type, owner_id: presentation.owner_id }) : null;
      const blob = presentation && prodId
        ? (await apiDownload(presentation.revision === 0
          ? `${assetPath(prodId, assetId!)}/image-versions/${encodeURIComponent(presentation.source_version_id)}/content`
          : `${assetPath(prodId, assetId!)}/presentation/content?${params}`, alt)).blob
        : thumbnail && prodId
        ? (await apiDownload(`${assetPath(prodId, assetId!)}/thumbnail?revision=${revision ?? 0}`, alt)).blob
        : await apiImageBlob(assetId!, signal, owner);
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
      return blob;
    },
    staleTime: 60_000,
    gcTime: 60_000,
    retry: 1
  });
  const [image, setImage] = useState<{ id: string; url: string } | null>(null);
  useEffect(() => {
    setImage(null);
    if (!imageQuery.data) return;
    const url = URL.createObjectURL(imageQuery.data);
    setImage({ id: key, url });
    return () => URL.revokeObjectURL(url);
  }, [imageQuery.data, key]);
  return image?.id === key ? <img src={image.url} alt={alt} className={className}
    onError={() => setImage(current => current?.id === key ? null : current)} /> : imageQuery.error ? <span role="alert" className="p-2 text-xs">画面读取失败 <button className="underline" type="button" onClick={() => void imageQuery.refetch()}>重试</button></span> : <>{children}</>;
}
