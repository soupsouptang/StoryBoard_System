'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiDownload, apiImageBlob } from '@/lib/api-client';
import { assetPath } from '@/lib/hooks/useAssets';

export function AssetImage({ assetId, alt, className = '', children, revision, prodId, thumbnail = false }: {
  assetId: string | null;
  alt: string;
  className?: string;
  children?: ReactNode;
  revision?: number;
  prodId?: string;
  thumbnail?: boolean;
}) {
  const key = `${assetId}:${revision}:${prodId}:${thumbnail}`;
  const imageQuery = useQuery({
    queryKey: ['asset-image', assetId, thumbnail && prodId ? 'thumbnail' : 'original', prodId, revision],
    enabled: Boolean(assetId),
    queryFn: async ({ signal }) => {
      const blob = thumbnail && prodId
        ? (await apiDownload(`${assetPath(prodId, assetId!)}/thumbnail?revision=${revision ?? 0}`, alt)).blob
        : await apiImageBlob(assetId!, signal);
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
    onError={() => setImage(current => current?.id === key ? null : current)} /> : <>{children}</>;
}
