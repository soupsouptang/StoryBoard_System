import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Asset } from '@frameforge/types';
import { apiClient, ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/stores/authStore';

export type AssetLibraryItem = Pick<Asset, 'id' | 'production_id' | 'filename' | 'display_name' |
  'asset_type' | 'source_type' | 'mime_type' | 'width' | 'height' | 'file_size' | 'rights_status' | 'created_at'> & {
  reference_shot_count: number;
  revision: number;
  category: string;
  has_thumbnail: boolean;
  updated_at: string;
  deleted_at: string | null;
};

export const assetPath = (productionId: string, assetId?: string) =>
  `/api/v1/productions/${encodeURIComponent(productionId)}/assets${assetId ? `/${encodeURIComponent(assetId)}` : ''}`;

export function useAssets(productionId: string, filters: { state?: 'active' | 'trashed'; search?: string; category?: string } = {}) {
  const query = new URLSearchParams({ state: filters.state || 'active', search: filters.search || '' });
  if (filters.category) query.set('category', filters.category);
  return useQuery({
    queryKey: ['assets', productionId, query.toString()],
    queryFn: ({ signal }) => apiClient<AssetLibraryItem[]>(`${assetPath(productionId)}?${query}`, { signal }),
    enabled: Boolean(productionId)
  });
}

export interface ImageCrop { x: number; y: number; width: number; height: number }
export interface MediaPresentation {
  revision: number; source_version_id: string;
  transform: { crop: ImageCrop; frame_fit?: 'cover' | 'contain'; rotation: 0 | 90 | 180 | 270; aspect_ratio: string | null; output_width: number;
    scale: number; translation_x: number; translation_y: number; straighten_degrees: number;
    perspective_horizontal: number; perspective_vertical: number; flip_horizontal: boolean; flip_vertical: boolean };
}
export interface ImageVersion {
  id: string; version_number: number; width: number; height: number;
  rotation: 0 | 90 | 180 | 270; aspect_ratio: string; crop: ImageCrop | null; current: boolean;
}
export interface AssetReferences {
  references: { component: string; component_id: string; shot_id: string; display_number: string; is_deleted: boolean }[];
  reference_shot_count: number; retained_commit_ids: string[];
}
export function assetError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 409) return '素材已被其他人修改。草稿已保留，请读取最新版本后检查并重试。';
    if (error.status === 403) return '你没有管理此素材的权限。';
    if (error.status === 401) return '登录已过期，请重新登录后重试。';
  }
  return error instanceof Error ? error.message : typeof error === 'string' ? error : '操作失败，请重试。';
}
type AssetCommand =
  | { kind: 'upload'; file: File; signal?: AbortSignal }
  | { kind: 'update'; assetId: string; revision: number; display_name: string; category: string }
  | { kind: 'delete' | 'restore'; assetId: string; revision: number }
  | ({ kind: 'crop'; assetId: string; revision: number; presentation_revision: number; source_version_id: string;
      owner_type?: 'asset' | 'panel' | 'production'; owner_id?: string } & MediaPresentation['transform']);
export function useAssetMutation(productionId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (command: AssetCommand) => {
      const permissions = useAuthStore.getState().user?.role?.permissions;
      if (!(permissions?.['*'] || permissions?.['production.write'] || permissions?.['asset.write'])) {
        throw new Error('你没有管理此素材的权限。');
      }
      if (command.kind === 'upload') {
        const body = new FormData(); body.append('image', command.file);
        return apiClient(`${assetPath(productionId)}/images`, { method: 'POST', body, signal: command.signal });
      }
      const { kind, assetId, ...json } = command;
      const path = assetPath(productionId, assetId);
      return apiClient(kind === 'delete' ? `${path}?revision=${command.revision}` : kind === 'update' ? path : `${path}/${kind}`, {
        method: kind === 'delete' ? 'DELETE' : kind === 'update' ? 'PATCH' : 'POST',
        ...(kind === 'delete' ? {} : { json })
      });
    },
    onSuccess: async (_result, command) => {
      await Promise.all([
        ...(command.kind === 'upload' ? [] : [client.invalidateQueries({ queryKey: ['asset-image', command.assetId] })]),
        client.invalidateQueries({ queryKey: ['assets', productionId] }),
        client.invalidateQueries({ queryKey: ['asset-versions', productionId] }),
        client.invalidateQueries({ queryKey: ['asset-presentation', productionId] }),
        client.invalidateQueries({ queryKey: ['asset-references', productionId] }),
        client.invalidateQueries({ queryKey: ['shots', productionId] }),
        client.invalidateQueries({ queryKey: ['project-version-state', productionId] }),
        client.invalidateQueries({ queryKey: ['project-versions', productionId] }),
        client.invalidateQueries({ queryKey: ['production', productionId] })
      ]);
    }
  });
}
