'use client';

import { type ReactNode } from 'react';
import type { Shot } from '@frameforge/types';
import { AssetImage } from '@/components/asset/AssetImage';

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
  return <AssetImage assetId={primaryPanelAssetId(shot)} alt={`镜头 ${shot.display_number} 分镜画面`} className={className}>{children}</AssetImage>;
}
