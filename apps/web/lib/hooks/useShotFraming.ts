import { useQuery } from '@tanstack/react-query';
import type { Shot } from '@frameforge/types';
import { apiClient, apiDownload } from '../api-client';
import { assetPath, type MediaPresentation } from './useAssets';
import { primaryPanelAssetId } from '@/components/shot/ShotPanelImage';

export function useShotFraming(shot: Shot, enabled: boolean) {
  const panel = [...(shot.panels || [])].filter(p => !p.deleted_at).sort((a,b) => a.sort_index-b.sort_index)[0];
  const assetId = primaryPanelAssetId(shot);
  return useQuery({ queryKey: ['shot-framing', assetId, panel?.id, shot.revision], enabled: enabled && Boolean(assetId && panel),
    queryFn: async ({ signal }) => {
      const path = assetPath(shot.production_id, assetId!);
      const presentation = await apiClient<MediaPresentation>(`${path}/presentation?${new URLSearchParams({owner_type:'panel',owner_id:panel!.id})}`, {signal});
      const {blob} = await apiDownload(`${path}/image-versions/${encodeURIComponent(presentation.source_version_id)}/content`, '原图');
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
      return { blob, presentation, source: {asset_id:assetId!,panel_id:panel!.id,presentation_revision:presentation.revision,source_version_id:presentation.source_version_id} };
    }, staleTime: 0 });
}
