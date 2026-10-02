'use client';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Shot } from '@frameforge/types';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/authStore';

type Clipboard = { kind: 'frameforge-shots'; version: 1; productionId: string; cut: boolean; sources: { id: string; revision: number }[] };
export function useShotCommands(productionId: string, shots: Shot[]) {
  const queryClient = useQueryClient();
  const user = useAuthStore(state => state.user);
  const permissions = user?.role?.permissions || {};
  const canWrite = Boolean(permissions['*'] || permissions['shot.write']);
  const [clipboard, setClipboard] = useState<Clipboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ordered = [...shots].sort((a,b) => (a.sort_index-b.sort_index) || a.id.localeCompare(b.id));
  const refreshClipboard = async () => {
    try {
      const value = JSON.parse(await navigator.clipboard.readText());
      const decoded = value?.kind === 'frameforge-shots' && value.version === 1 && value.productionId === productionId && typeof value.cut === 'boolean' && Array.isArray(value.sources) && value.sources.length > 0 && value.sources.length <= 1000 && value.sources.every((s: {id?: unknown; revision?: unknown}) => typeof s?.id === 'string' && typeof s.revision === 'number' && Number.isSafeInteger(s.revision)) ? value : null;
      setClipboard(decoded); return decoded;
    } catch { setClipboard(null); return null; }
  };
  const copy = async (ids: string[], cut = false) => {
    setError(null);
    const value: Clipboard = { kind: 'frameforge-shots', version: 1, productionId, cut, sources: ordered.filter(s => ids.includes(s.id)).map(s => ({id:s.id, revision:s.revision})) };
    try { await navigator.clipboard.writeText(JSON.stringify(value)); setClipboard(value); }
    catch { setError('无法访问剪贴板，请允许浏览器使用剪贴板后重试。'); }
  };
  const mutation = useMutation({
    mutationFn: async ({action, targetId, ids = [], clip = clipboard}: {action: string; targetId: string; ids?: string[]; clip?: Clipboard | null}) => {
      if (!canWrite) throw new Error('当前账号没有修改镜头的权限。');
      if (action === 'auto_timing') {
        const shot = ordered.find(s => s.id === targetId);
        if (!shot) throw new Error('请刷新镜头数据。');
        return apiClient(`/api/v1/shots/${targetId}/auto-timing`, { method: 'POST', json: { revision: shot.revision } });
      }
      if (action === 'paste' && (!clip || clip.productionId !== productionId)) throw new Error('剪贴板没有当前项目的镜头。');
      const revisions = Object.fromEntries(ordered.map(s => [s.id, s.revision]));
      if (action === 'paste') for (const source of clip!.sources) revisions[source.id] = source.revision;
      const result = await apiClient(`/api/v1/shots/${targetId}/relative-command`, { method: 'POST', json: {
        action: action === 'paste' && clip!.cut ? 'cut_paste' : action,
        base_order: ordered.map(s => s.id), revisions,
        source_ids: action === 'paste' ? clip!.sources.map(s => s.id) : ids
      } });
      if (action === 'paste' && clip!.cut) {
        // Consume the move intent only after the server acknowledges placement.
        setClipboard(null); await navigator.clipboard.writeText('').catch(() => {});
      }
      return result;
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['shots', productionId] });
      await queryClient.invalidateQueries({ queryKey: ['production', productionId] });
      await queryClient.invalidateQueries({ queryKey: ['custom-field-values', productionId] });
    }
  });
  const run = (action: string, targetId: string, ids?: string[], clip?: Clipboard | null) => {
    setError(null);
    mutation.mutate({action,targetId,ids,clip}, {onError:cause => setError(cause instanceof Error ? cause.message : '镜头操作失败，原数据已保留。')});
  };
  const paste = async (targetId: string) => { const clip = await refreshClipboard(); run('paste', targetId, undefined, clip); };
  return {paste, canWrite, clipboard, refreshClipboard, copy, run, pending:mutation.isPending, error};
}
