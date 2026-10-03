import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Shot } from '@frameforge/types';
import { apiClient } from '@/lib/api-client';

export function useSaveShotDetail(productionId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, revision, changes, custom_values, image }: {
      id: string; revision: number; changes: Partial<Shot>;
      custom_values: { field_id: string; field_revision: number; value: unknown }[]; image: File | null;
    }) => {
      const body = new FormData();
      body.append('payload', JSON.stringify({ revision, changes, custom_values }));
      if (image) body.append('image', image);
      return apiClient<Shot>(`/api/v1/shots/${id}/detail`, { method: 'POST', body });
    },
    onSuccess: saved => client.setQueryData<Shot[]>(['shots', productionId], current => current?.map(shot => shot.id === saved.id ? saved : shot)),
    onSettled: () => Promise.all(['shots', 'production', 'custom-field-values', 'assets'].map(key => client.invalidateQueries({ queryKey: [key, productionId] }))),
  });
}
