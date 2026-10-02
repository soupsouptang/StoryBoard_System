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
  const panel = [...(shot.panels ?? [])].filter(row => !row.deleted_at).sort((a,b) => a.sort_index - b.sort_index)[0];
  return <AssetImage assetId={primaryPanelAssetId(shot)} owner={panel ? { owner_type: 'panel', owner_id: panel.id } : undefined} alt={`镜头 ${shot.display_number} 分镜画面`} className={className}>{children}</AssetImage>;
}
