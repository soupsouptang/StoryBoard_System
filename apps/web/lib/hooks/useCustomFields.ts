import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiClient } from '@/lib/api-client';

export type CustomFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'boolean'
  | 'date'
  | 'url'
  | 'select'
  | 'multiselect'
  | 'json';

export type CustomFieldState = 'visible' | 'hidden' | 'removed';

export interface CustomFieldDefinition {
  id: string;
  production_id: string;
  key: string;
  column_key: string;
  label: string;
  description: string;
  field_type: CustomFieldType;
  group_name: string;
  options: string[];
  required: boolean;
  default_value: unknown;
  sort_index: number;
  state: CustomFieldState;
  permanently_deleted: boolean;
  column_class: 'builtin' | 'preset' | 'custom';
  origin: 'builtin' | 'preset' | 'custom' | 'import';
  position: number;
  width_px: number | null;
  wrap_text: boolean;
  revision: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomFieldValueMatrix {
  values: Record<string, Record<string, unknown>>;
}

export interface BuiltinColumnState { column_key: string; state: CustomFieldState; revision: number }
export interface ColumnPlacement { revision: number; config: Record<string, unknown>; reference: string; after: boolean; columns?: string[] }
export interface CatalogColumn {
  catalog_key: string | null; label: string; column_class: 'builtin' | 'preset' | 'custom';
  binding_kind: string; field_type: string; instance: CustomFieldDefinition | null;
}
export function useColumnCatalog(productionId: string) {
  return useQuery({ queryKey: ['column-catalog', productionId], enabled: Boolean(productionId),
    queryFn: () => apiClient<CatalogColumn[]>(`/api/v1/productions/${productionId}/column-catalog`) });
}
export function useBuiltinColumnStates(productionId: string) {
  return useQuery({ queryKey: ['column-preferences', productionId], enabled: Boolean(productionId),
    queryFn: () => apiClient<BuiltinColumnState[]>(`/api/v1/productions/${productionId}/column-preferences`) });
}
export function useSetBuiltinColumnState(productionId: string) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (input: { column: string; state: 'visible' | 'removed'; revision: number }) =>
    apiClient<BuiltinColumnState>(`/api/v1/productions/${productionId}/column-preferences/${input.column}/state`, { method: 'PATCH', json: { state: input.state, revision: input.revision } }),
    onSuccess: saved => queryClient.setQueryData<BuiltinColumnState[]>(['column-preferences', productionId], current => [...(current || []).filter(row => row.column_key !== saved.column_key), saved]),
    onSettled: () => Promise.all(['column-preferences', 'column-catalog'].map(key => queryClient.invalidateQueries({ queryKey: [key, productionId] }))) });
}

export function useInsertCustomFields(productionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { fields: { label: string; field_type: CustomFieldType; options?: string[] }[]; restore: Record<string, number>; restore_columns?: Record<string, number>; placement?: ColumnPlacement }) =>
      apiClient<CustomFieldDefinition[]>(`/api/v1/productions/${productionId}/custom-fields/insert`, { method: 'POST', json: input }),
    onSuccess: saved => queryClient.setQueryData<CustomFieldDefinition[]>(['custom-fields', productionId], current =>
      [...(current || []).filter(field => !saved.some(item => item.id === field.id)), ...saved]),
    onSettled: () => Promise.all(['custom-fields', 'column-preferences', 'column-catalog', 'workspace-layout'].map(key => queryClient.invalidateQueries({ queryKey: [key, productionId] })))
  });
}

export function useCopyColumn(productionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { source: string; label: string; field_revision?: number; shot_revisions: Record<string, number>; width_px: number; wrap_text: boolean; existing_labels: string[]; placement?: ColumnPlacement }) =>
      apiClient<{ field: CustomFieldDefinition; shot_revisions: Record<string, number> }>(`/api/v1/productions/${productionId}/custom-fields/copy-column`, { method: 'POST', json: input }),
    onSuccess: saved => queryClient.setQueryData<CustomFieldDefinition[]>(['custom-fields', productionId], current => [...(current || []), saved.field]),
    onSettled: async () => {
      await Promise.all(['custom-fields', 'custom-field-values', 'shots', 'column-catalog', 'workspace-layout'].map(key => queryClient.invalidateQueries({ queryKey: [key, productionId] })));
    }
  });
}

export interface UpdateCustomFieldInput {
  id: string;
  revision: number;
  label?: string;
  fieldType?: CustomFieldType;
  description?: string;
  groupName?: string;
  options?: string[];
  required?: boolean;
  defaultValue?: unknown;
  defaultValueSet?: boolean;
}

export function useCustomFields(productionId: string) {
  return useQuery({
    queryKey: ['custom-fields', productionId],
    queryFn: () =>
      apiClient<CustomFieldDefinition[]>(
        `/api/v1/productions/${productionId}/custom-fields`
      ),
    enabled: Boolean(productionId)
  });
}

export function useCustomFieldValues(productionId: string) {
  return useQuery({
    queryKey: ['custom-field-values', productionId],
    queryFn: () =>
      apiClient<CustomFieldValueMatrix>(
        `/api/v1/productions/${productionId}/custom-field-values`
      ),
    enabled: Boolean(productionId)
  });
}

export function useCreateCustomField(productionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      label: string;
      key?: string;
      fieldType: CustomFieldType;
      options?: string[];
    }) =>
      apiClient<CustomFieldDefinition>(
        `/api/v1/productions/${productionId}/custom-fields`,
        {
          method: 'POST',
          json: {
            label: input.label,
            ...(input.key ? { key: input.key } : {}),
            field_type: input.fieldType,
            options: input.options || []
          }
        }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-fields', productionId] });
      queryClient.invalidateQueries({ queryKey: ['column-catalog', productionId] });
    }
  });
}

export function useUpdateCustomField(productionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      revision,
      label,
      fieldType,
      description,
      groupName,
      options,
      required,
      defaultValue,
      defaultValueSet
    }: UpdateCustomFieldInput) =>
      apiClient<CustomFieldDefinition>(
        `/api/v1/productions/${productionId}/custom-fields/${id}`,
        {
          method: 'PATCH',
          json: {
            revision,
            ...(label !== undefined ? { label } : {}),
            ...(fieldType !== undefined ? { field_type: fieldType } : {}),
            ...(description !== undefined ? { description } : {}),
            ...(groupName !== undefined ? { group_name: groupName } : {}),
            ...(options !== undefined ? { options } : {}),
            ...(required !== undefined ? { required } : {}),
            ...(defaultValueSet
              ? { default_value: defaultValue ?? null, default_value_set: true }
              : {})
          }
        }
      ),
    onSuccess: saved => {
      queryClient.setQueryData<CustomFieldDefinition[]>(
        ['custom-fields', productionId],
        current => current?.map(field => (field.id === saved.id ? saved : field)) ?? [saved]
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-fields', productionId] });
      queryClient.invalidateQueries({ queryKey: ['column-catalog', productionId] });
    }
  });
}

export function useSetCustomFieldState(productionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      revision,
      state
    }: {
      id: string;
      revision: number;
      state: CustomFieldState;
    }) =>
      apiClient<CustomFieldDefinition>(
        `/api/v1/productions/${productionId}/custom-fields/${id}/state`,
        {
          method: 'PATCH',
          json: { revision, state }
        }
      ),
    onSuccess: saved => {
      queryClient.setQueryData<CustomFieldDefinition[]>(
        ['custom-fields', productionId],
        current => current?.map(field => (field.id === saved.id ? saved : field)) ?? [saved]
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-fields', productionId] });
      queryClient.invalidateQueries({ queryKey: ['column-catalog', productionId] });
    }
  });
}

export function usePurgeCustomField(productionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, revision }: { id: string; revision: number }) =>
      apiClient<{ ok: boolean; purged: boolean }>(
        `/api/v1/productions/${productionId}/custom-fields/${id}/purge`,
        {
          method: 'POST',
          json: { revision }
        }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-fields', productionId] });
      queryClient.invalidateQueries({ queryKey: ['column-catalog', productionId] });
      queryClient.invalidateQueries({ queryKey: ['custom-field-values', productionId] });
      queryClient.invalidateQueries({ queryKey: ['saved-views', productionId] });
    }
  });
}

export function usePatchCustomFieldValue(productionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      shotId,
      fieldId,
      revision,
      value
    }: {
      shotId: string;
      fieldId: string;
      revision: number;
      value: unknown;
    }) =>
      apiClient<{
        changed: boolean;
        shot_id: string;
        field_id: string;
        value: unknown;
        revision: number;
      }>(`/api/v1/shots/${shotId}/custom-fields/${fieldId}`, {
        method: 'PATCH',
        json: { revision, value }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shots', productionId] });
      queryClient.invalidateQueries({ queryKey: ['custom-field-values', productionId] });
    },
    onError: error => {
      if (
        error instanceof ApiError &&
        (error.status === 409 || error.code === 'CUSTOM_FIELD_REVISION_CONFLICT')
      ) {
        queryClient.invalidateQueries({ queryKey: ['shots', productionId] });
      }
    }
  });
}
