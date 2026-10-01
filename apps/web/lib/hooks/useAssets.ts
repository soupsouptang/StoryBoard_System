import { useQuery } from '@tanstack/react-query';
import type { Asset } from '@frameforge/types';
import { apiClient } from '@/lib/api-client';

export type AssetLibraryItem = Pick<Asset, 'id' | 'production_id' | 'filename' | 'display_name' |
  'asset_type' | 'source_type' | 'mime_type' | 'width' | 'height' | 'file_size' | 'rights_status' | 'created_at'> & {
  reference_shot_count: number;
};

export function useAssets(productionId: string) {
  return useQuery({
    queryKey: ['assets', productionId],
    queryFn: () => apiClient<AssetLibraryItem[]>(`/api/v1/productions/${productionId}/assets`),
    enabled: Boolean(productionId)
  });
}
