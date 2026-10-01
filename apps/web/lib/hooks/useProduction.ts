import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Production, Shot } from '@frameforge/types';

export function useProduction(productionId: string) {
  return useQuery({
    queryKey: ['production', productionId],
    queryFn: async () => {
      if (!productionId) return null;
      return apiClient<Production>(`/api/v1/productions/${productionId}`);
    },
    enabled: Boolean(productionId)
  });
}

export function useShots(productionId: string) {
  return useQuery({
    queryKey: ['shots', productionId],
    queryFn: async () => {
      if (!productionId) return [];
      const data = await apiClient<Shot[]>(`/api/v1/productions/${productionId}/shots`);
      return data || [];
    },
    enabled: Boolean(productionId)
  });
}

export function useUpdateShot(productionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      revision,
      changes
    }: {
      id: string;
      revision: number;
      changes: Partial<Shot>;
    }) => {
      return apiClient<Shot>(`/api/v1/shots/${id}`, {
        method: 'PATCH',
        json: {
          revision,
          changes
        }
      });
    },
    // The server owns revision assignment. A no-op PATCH may keep the same revision.
    onSuccess: (savedShot) => {
      queryClient.setQueryData<Shot[]>(['shots', productionId], old =>
        old?.map(s => (s.id === savedShot.id ? savedShot : s)) ?? []
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['shots', productionId] });
      queryClient.invalidateQueries({ queryKey: ['production', productionId] });
    }
  });
}

export function useUploadPanelImage(productionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ shot, file }: { shot: Shot; file: File }) => {
      const body = new FormData();
      body.append('revision', String(shot.revision));
      body.append('image', file);
      return apiClient<{ asset_id: string; revision: number }>(`/api/v1/shots/${shot.id}/panel-image`, {
        method: 'POST',
        body
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shots', productionId] });
      queryClient.invalidateQueries({ queryKey: ['assets', productionId] });
      queryClient.invalidateQueries({ queryKey: ['production', productionId] });
    }
  });
}

export function useCreateShot(productionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newShot: Partial<Shot>) => {
      return apiClient<Shot>(`/api/v1/productions/${productionId}/shots`, {
        method: 'POST',
        json: newShot
      });
    },
    onSuccess: savedShot => {
      queryClient.setQueryData<Shot[]>(['shots', productionId], old =>
        [...(old || []).filter(shot => shot.id !== savedShot.id), savedShot]
      );
      queryClient.invalidateQueries({ queryKey: ['shots', productionId] });
      queryClient.invalidateQueries({ queryKey: ['production', productionId] });
    }
  });
}

export function useDeleteShot(productionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (shotId: string) => {
      return apiClient(`/api/v1/shots/${shotId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shots', productionId] });
      queryClient.invalidateQueries({ queryKey: ['production', productionId] });
    }
  });
}

export function useBulkTrashShots(productionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (shotIds: string[]) => {
      return apiClient<{ ok: boolean; moved_count: number; already_trashed_count: number }>(
        `/api/v1/productions/${productionId}/shots/bulk-trash`,
        {
          method: 'POST',
          json: { shot_ids: shotIds }
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shots', productionId] });
      queryClient.invalidateQueries({ queryKey: ['production', productionId] });
      queryClient.invalidateQueries({ queryKey: ['production', productionId, 'trash'] });
    }
  });
}

export function useBulkUpdateShots(productionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      shotIds,
      updates
    }: {
      shotIds: string[];
      updates: Record<string, unknown>;
    }) => {
      const currentShots = queryClient.getQueryData<Shot[]>(['shots', productionId]) ?? [];
      const byId = new Map(currentShots.map(shot => [shot.id, shot]));
      const missing = shotIds.filter(id => !byId.has(id));

      if (missing.length > 0) {
        throw new Error('批量修改前需要刷新镜头数据，以取得最新版本号。');
      }

      const revisions = Object.fromEntries(
        shotIds.map(id => [id, byId.get(id)!.revision])
      );

      return apiClient(`/api/v1/shots/bulk-update`, {
        method: 'POST',
        json: {
          shot_ids: shotIds,
          updates,
          revisions
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shots', productionId] });
      queryClient.invalidateQueries({ queryKey: ['production', productionId] });
    }
  });
}

export function useReorderShots(productionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderedShotIds: string[]) => {
      const currentShots = queryClient.getQueryData<Shot[]>(['shots', productionId]) ?? [];
      const activeOrder = [...currentShots]
        .sort((a, b) => (a.sort_index - b.sort_index) || a.id.localeCompare(b.id))
        .map(shot => shot.id);

      if (
        orderedShotIds.length !== activeOrder.length ||
        new Set(orderedShotIds).size !== activeOrder.length ||
        activeOrder.some(id => !orderedShotIds.includes(id))
      ) {
        throw new Error('重新排序必须包含当前项目的完整镜头集合，请刷新后重试。');
      }

      const byId = new Map(currentShots.map(shot => [shot.id, shot]));

      return apiClient('/api/v1/shots/reorder', {
        method: 'POST',
        json: {
          production_id: productionId,
          base_order: activeOrder,
          items: orderedShotIds.map((id, index) => ({
            id,
            sort_index: (index + 1) * 1000,
            revision: byId.get(id)!.revision
          }))
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shots', productionId] });
      queryClient.invalidateQueries({ queryKey: ['production', productionId] });
    }
  });
}
