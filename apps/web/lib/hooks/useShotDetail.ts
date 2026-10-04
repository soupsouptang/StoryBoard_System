import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Shot } from '@frameforge/types';
import { apiClient } from '@/lib/api-client';
import type { ShotFraming } from '@/lib/shot-framing';

export function useSaveShotDetail(productionId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, revision, changes, custom_values, image, framing }: {
      id: string; revision: number; changes: Partial<Shot>;
      custom_values: { field_id: string; field_revision: number; value: unknown }[]; image: File | null;
      framing?: ShotFraming | null;
    }) => {
      const body = new FormData();
      body.append('payload', JSON.stringify({ revision, changes, custom_values, ...(framing ? { framing } : {}) }));
      if (image) body.append('image', image);
      return apiClient<Shot>(`/api/v1/shots/${id}/detail`, { method: 'POST', body });
    },
    onSuccess: saved => client.setQueryData<Shot[]>(['shots', productionId], current => current?.map(shot => shot.id === saved.id ? saved : shot)),
    onSettled: () => Promise.all([
      ...['shots', 'production', 'custom-field-values', 'assets', 'project-version-state', 'project-versions'].map(key => client.invalidateQueries({ queryKey: [key, productionId] })),
      ...['asset-image', 'shot-preview', 'shot-framing', 'asset-presentation', 'project-history'].map(key => client.invalidateQueries({ queryKey: [key] }))
    ]),
  });
}
