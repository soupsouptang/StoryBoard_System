'use client';
import { useEffect, useRef, useState } from 'react';
import { useIsMutating, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/stores/authStore';

type History = { revision: number; can_undo: boolean; can_redo: boolean; undo_label: string | null; redo_label: string | null; undo_count: number; redo_count: number };

/** Shared client for the existing authoritative project history, including its CAS and pending guards. */
export function useProjectCommandHistory(productionId: string, enabled = true) {
  const client = useQueryClient();
  const userId = useAuthStore(state => state.user?.id);
  const key = ['project-history', productionId, userId];
  const [message, setMessage] = useState<string | null>(null);
  const executing = useRef(false);
  const pendingOperations = useIsMutating();
  const history = useQuery({ queryKey: key, queryFn: () => apiClient<History>(`/api/v1/productions/${productionId}/history`), enabled: enabled && !!userId, refetchOnWindowFocus: true });
  const mutation = useMutation({
    mutationFn: async (direction: 'undo' | 'redo') => {
      if (!history.data) throw new Error('操作历史尚未载入，请稍后再试。');
      return apiClient<History>(`/api/v1/productions/${productionId}/history/${direction}`, { method: 'POST', json: { revision: history.data.revision } });
    },
    onSuccess: data => { client.setQueryData(key, data); return client.invalidateQueries(); },
    onError: error => { setMessage(error instanceof ApiError ? error.message : '操作未完成，请重试。'); void client.invalidateQueries({ queryKey: key }); },
    onSettled: () => { executing.current = false; },
  });
  const run = async (direction: 'undo' | 'redo') => {
    if (!enabled || executing.current || pendingOperations > 0 || !(direction === 'undo' ? history.data?.can_undo : history.data?.can_redo)) return false;
    executing.current = true;
    setMessage(null);
    try { await mutation.mutateAsync(direction); return true; } catch { return false; }
  };
  useEffect(() => {
    if (!enabled) return;
    const refresh = () => { void client.invalidateQueries({ queryKey: ['project-history', productionId, userId] }); };
    window.addEventListener('frameforge:mutation', refresh);
    return () => window.removeEventListener('frameforge:mutation', refresh);
  }, [client, productionId, userId, enabled]);
  useEffect(() => { if (enabled && history.isError) setMessage('操作历史未能载入，请刷新页面后重试。'); }, [history.isError, enabled]);
  return { data: history.data, pending: pendingOperations > 0, run, message, clearMessage: () => setMessage(null) };
}
