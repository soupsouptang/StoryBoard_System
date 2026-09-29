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

export function useCreateShot(productionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newShot: Partial<Shot>) => {
      return apiClient<Shot>(`/api/v1/productions/${productionId}/shots`, {
        method: 'POST',
        json: newShot
      });
    },
    onSuccess: () => {
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
    mutationFn: async (items: { id: string; sort_index: number }[]) => {
      const currentShots = queryClient.getQueryData<Shot[]>(['shots', productionId]) ?? [];
      const byId = new Map(currentShots.map(shot => [shot.id, shot]));
      const missing = items.filter(item => !byId.has(item.id));

      if (missing.length > 0) {
        throw new Error('重新排序前需要刷新镜头数据，以取得最新版本号。');
      }

      return apiClient(`/api/v1/shots/reorder`, {
        method: 'POST',
        json: {
          items: items.map(item => ({
            ...item,
            revision: byId.get(item.id)!.revision
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
