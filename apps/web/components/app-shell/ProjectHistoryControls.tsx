'use client';
import { useEffect, useRef, useState } from 'react';
import { useIsMutating, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Icons } from '@frameforge/ui';
import { apiClient, ApiError } from '@/lib/api-client';
import { historyShortcut } from '@/lib/history-shortcuts';
import { useAuthStore } from '@/stores/authStore';
import { ShotFeedbackDialog } from '@/components/shot/ShotFeedbackDialog';

type History = { revision: number; can_undo: boolean; can_redo: boolean; undo_label: string | null; redo_label: string | null; undo_count: number; redo_count: number };

export function ProjectHistoryControls({ productionId }: { productionId: string }) {
  const client = useQueryClient();
  const userId = useAuthStore(state => state.user?.id);
  const key = ['project-history', productionId, userId];
  const [message, setMessage] = useState<string | null>(null);
  const executing = useRef(false);
  const pendingOperations = useIsMutating();
  const history = useQuery({queryKey:key, queryFn:()=>apiClient<History>(`/api/v1/productions/${productionId}/history`), enabled:!!userId, refetchOnWindowFocus:true});
  const mutation = useMutation({
    mutationFn: async (direction:'undo'|'redo') => {
      if (!history.data) throw new Error('操作历史尚未载入，请稍后再试。');
      return apiClient<History>(`/api/v1/productions/${productionId}/history/${direction}`, {method:'POST',json:{revision:history.data.revision}});
    },
    onSuccess: data => {client.setQueryData(key,data); void client.invalidateQueries();},
    onError: error => {setMessage(error instanceof ApiError ? error.message : '操作未完成，请重试。'); void client.invalidateQueries({queryKey:key});},
    onSettled:()=>{executing.current=false;}
  });
  const run = (direction:'undo'|'redo') => {
    if (executing.current || pendingOperations > 0 || !(direction === 'undo' ? history.data?.can_undo : history.data?.can_redo)) return;
    executing.current=true;
    mutation.mutate(direction);
  };
  useEffect(()=>{
    const refresh=()=>{void client.invalidateQueries({queryKey:['project-history',productionId,userId]});};
    window.addEventListener('frameforge:mutation',refresh);
    return ()=>window.removeEventListener('frameforge:mutation',refresh);
  },[client,productionId,userId]);
  useEffect(()=>{
    const keydown=(event:KeyboardEvent)=>{const direction=historyShortcut(event); if(direction){event.preventDefault(); run(direction);}};
    window.addEventListener('keydown',keydown);
    return ()=>window.removeEventListener('keydown',keydown);
  });
  useEffect(()=>{if(history.isError) setMessage('操作历史未能载入，请刷新页面后重试。');},[history.isError]);
  const undoLabel=history.data?.undo_label, redoLabel=history.data?.redo_label;
  return <>
    <div role="group" aria-label="撤销和重做" className="flex shrink-0 items-center gap-1">
      <Button size="sm" variant="ghost" disabled={!history.data?.can_undo || pendingOperations > 0} onClick={()=>run('undo')} title={`撤销${undoLabel ? '：'+undoLabel : ''}（⌘Z / Ctrl+Z）`} aria-keyshortcuts="Meta+Z Control+Z"><Icons.Undo2 aria-hidden="true"/>撤销</Button>
      <Button size="sm" variant="ghost" disabled={!history.data?.can_redo || pendingOperations > 0} onClick={()=>run('redo')} title={`重做${redoLabel ? '：'+redoLabel : ''}（⌘⇧Z / Ctrl+Shift+Z / Ctrl+Y）`} aria-keyshortcuts="Meta+Shift+Z Control+Shift+Z Control+Y"><Icons.Undo2 aria-hidden="true" className="-scale-x-100"/>重做</Button>
    </div>
    <ShotFeedbackDialog message={message} onClose={()=>setMessage(null)}/>
  </>;
}
