import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface SavedView {
  id: string;
  production_id: string;
  name: string;
  view_type: 'table' | 'grid' | 'wall' | 'timeline' | string;
  is_shared: boolean;
  created_by: string | null;
  config: Record<string, unknown>;
  revision: number;
  created_at: string;
  updated_at: string;
}

export interface SavedViewCreateInput {
  name: string;
  viewType?: 'table' | 'grid' | 'wall' | 'timeline';
  isShared?: boolean;
  config: Record<string, unknown>;
}

export interface SavedViewUpdateInput {
  id: string;
  revision: number;
  name?: string;
  isShared?: boolean;
  config?: Record<string, unknown>;
}

export function useSavedViews(productionId: string) {
  return useQuery({
    queryKey: ['saved-views', productionId],
    queryFn: () =>
      apiClient<SavedView[]>(`/api/v1/productions/${productionId}/saved-views`),
    enabled: Boolean(productionId)
  });
}

export function useCreateSavedView(productionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      name,
      viewType = 'table',
      isShared = true,
      config
    }: SavedViewCreateInput) =>
      apiClient<SavedView>(`/api/v1/productions/${productionId}/saved-views`, {
        method: 'POST',
        json: {
          name,
          view_type: viewType,
          is_shared: isShared,
          config
        }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-views', productionId] });
    }
  });
}

export function useUpdateSavedView(productionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      revision,
      name,
      isShared,
      config
    }: SavedViewUpdateInput) =>
      apiClient<SavedView>(
        `/api/v1/productions/${productionId}/saved-views/${id}`,
        {
          method: 'PATCH',
          json: {
            revision,
            ...(name !== undefined ? { name } : {}),
            ...(isShared !== undefined ? { is_shared: isShared } : {}),
            ...(config !== undefined ? { config } : {})
          }
        }
      ),
    onSuccess: saved => {
      queryClient.setQueryData<SavedView[]>(
        ['saved-views', productionId],
        current => current?.map(view => (view.id === saved.id ? saved : view)) ?? [saved]
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-views', productionId] });
    }
  });
}

export function useDeleteSavedView(productionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient<void>(`/api/v1/productions/${productionId}/saved-views/${id}`, {
        method: 'DELETE'
      }),
    onSuccess: (_, id) => {
      queryClient.setQueryData<SavedView[]>(
        ['saved-views', productionId],
        current => current?.filter(view => view.id !== id) ?? []
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-views', productionId] });
    }
  });
}
