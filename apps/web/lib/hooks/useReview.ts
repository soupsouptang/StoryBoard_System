import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface ReviewComment {
  id: string;
  production_id: string;
  shot_id: string | null;
  user_id: string | null;
  author_name: string;
  author_color: string;
  last_actor_id: string | null;
  last_actor_color: string;
  revision: number;
  event_seq: number;
  last_activity_seq: number;
  role: string;
  body: string;
  timecode: string;
  quote_field: string;
  quote_text: string;
  parent_id: string | null;
  is_resolved: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateReviewCommentInput {
  body: string;
  parent_id?: string | null;
  quote_field?: string;
  quote_text?: string;
}

export interface ReviewDecision {
  id: string;
  shot_id: string;
  version_id: string | null;
  previous_status: string;
  next_status: string;
  action_label: string;
  created_by: string | null;
  created_at: string;
}

export type ReviewAction = 'submit' | 'withdraw' | 'approve' | 'request_changes';

export function useReviewComments(shotId: string) {
  return useQuery({
    queryKey: ['review-comments', shotId],
    queryFn: () => apiClient<ReviewComment[]>(`/api/v1/shots/${shotId}/comments`),
    enabled: Boolean(shotId)
  });
}

export function useCreateReviewComment(shotId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateReviewCommentInput) =>
      apiClient<ReviewComment>(`/api/v1/shots/${shotId}/comments`, {
        method: 'POST',
        json: {
          body: input.body,
          parent_id: input.parent_id || null,
          quote_field: input.quote_field || '',
          quote_text: input.quote_text || ''
        }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review-comments', shotId] });
    }
  });
}

export function useUpdateReviewComment(shotId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body, revision }: { id: string; body: string; revision: number }) =>
      apiClient<ReviewComment>(`/api/v1/comments/${id}`, {
        method: 'PATCH',
        json: { body, revision }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review-comments', shotId] });
    }
  });
}

export function useResolveReviewComment(shotId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, resolved, revision }: { id: string; resolved: boolean; revision: number }) =>
      apiClient<ReviewComment>(`/api/v1/comments/${id}/resolve`, {
        method: 'POST',
        json: { resolved, revision }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review-comments', shotId] });
    }
  });
}

export function useDeleteReviewComment(shotId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, revision }: { id: string; revision: number }) =>
      apiClient<void>(`/api/v1/comments/${id}?revision=${revision}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review-comments', shotId] });
    }
  });
}

export function useReviewDecisions(shotId: string) {
  return useQuery({
    queryKey: ['review-decisions', shotId],
    queryFn: () => apiClient<ReviewDecision[]>(`/api/v1/shots/${shotId}/review-decisions`),
    enabled: Boolean(shotId)
  });
}

export function useApplyReviewDecision(productionId: string, shotId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      revision,
      action,
      versionId
    }: {
      revision: number;
      action: ReviewAction;
      versionId?: string | null;
    }) =>
      apiClient<{
        changed: boolean;
        shot_id: string;
        revision: number;
        status: string;
        decision: ReviewDecision | null;
      }>(`/api/v1/shots/${shotId}/review-decisions`, {
        method: 'POST',
        json: {
          revision,
          action,
          version_id: versionId || null
        }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shots', productionId] });
      queryClient.invalidateQueries({ queryKey: ['production', productionId] });
      queryClient.invalidateQueries({ queryKey: ['review-decisions', shotId] });
    }
  });
}
