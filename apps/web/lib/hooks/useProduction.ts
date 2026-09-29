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

export interface ReorderShotsInput {
  orderedShotIds: string[];
  baseOrder: string[];
  revisions: Record<string, number>;
}

export function useReorderShots(productionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['shots', productionId, 'reorder'],
    mutationFn: async ({ orderedShotIds, baseOrder, revisions }: ReorderShotsInput) => {
      if (
        orderedShotIds.length !== baseOrder.length ||
        new Set(orderedShotIds).size !== baseOrder.length ||
        new Set(baseOrder).size !== baseOrder.length ||
        baseOrder.some(id => !orderedShotIds.includes(id)) ||
        baseOrder.some(id => revisions[id] === undefined)
      ) {
        throw new Error(
          '重新排序必须包含当前项目的完整镜头集合和版本信息，请刷新后重试。'
        );
      }

      return apiClient('/api/v1/shots/reorder', {
        method: 'POST',
        json: {
          production_id: productionId,
          base_order: baseOrder,
          items: orderedShotIds.map((id, index) => ({
            id,
            sort_index: (index + 1) * 1000,
            revision: revisions[id]
          }))
        }
      });
    },
    onMutate: async ({ orderedShotIds }) => {
      await queryClient.cancelQueries({ queryKey: ['shots', productionId] });
      const currentShots =
        queryClient.getQueryData<Shot[]>(['shots', productionId]) ?? [];
      const previousSortIndexes = Object.fromEntries(
        currentShots.map(shot => [shot.id, shot.sort_index])
      );
      const rank = new Map(orderedShotIds.map((id, index) => [id, index]));

      queryClient.setQueryData<Shot[]>(['shots', productionId], old => {
        if (!old) return old;
        return old
          .map(shot => {
            const index = rank.get(shot.id);
            return index === undefined
              ? shot
              : { ...shot, sort_index: (index + 1) * 1000 };
          })
          .sort((a, b) => (a.sort_index - b.sort_index) || a.id.localeCompare(b.id));
      });

      return { previousSortIndexes };
    },
    onError: (_error, _variables, context) => {
      if (!context?.previousSortIndexes) return;

      queryClient.setQueryData<Shot[]>(['shots', productionId], old => {
        if (!old) return old;
        return old
          .map(shot => {
            const previousSortIndex = context.previousSortIndexes[shot.id];
            return previousSortIndex === undefined
              ? shot
              : { ...shot, sort_index: previousSortIndex };
          })
          .sort((a, b) => (a.sort_index - b.sort_index) || a.id.localeCompare(b.id));
      });
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['shots', productionId] }),
        queryClient.invalidateQueries({ queryKey: ['production', productionId] })
      ]);
    }
  });
}
