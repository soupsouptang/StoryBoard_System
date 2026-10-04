'use client';
import { useEffect } from 'react';
import { Button, Icons } from '@frameforge/ui';
import { historyShortcut } from '@/lib/history-shortcuts';
import { useProjectCommandHistory } from '@/lib/hooks/useProjectCommandHistory';
import { ShotFeedbackDialog } from '@/components/shot/ShotFeedbackDialog';

export function ProjectHistoryControls({ productionId }: { productionId: string }) {
  const {data, pending, run, message, clearMessage} = useProjectCommandHistory(productionId);
  useEffect(()=>{
    const keydown=(event:KeyboardEvent)=>{const direction=historyShortcut(event); if(direction){event.preventDefault(); void run(direction);}};
    window.addEventListener('keydown',keydown);
    return ()=>window.removeEventListener('keydown',keydown);
  });
  const undoLabel=data?.undo_label, redoLabel=data?.redo_label;
  return <>
    <div role="group" aria-label="撤销和重做" className="flex shrink-0 items-center gap-1">
      <Button size="sm" variant="ghost" disabled={!data?.can_undo || pending} onClick={()=>void run('undo')} title={`撤销${undoLabel ? '：'+undoLabel : ''}（⌘Z / Ctrl+Z）`} aria-keyshortcuts="Meta+Z Control+Z"><Icons.Undo2 aria-hidden="true"/>撤销</Button>
      <Button size="sm" variant="ghost" disabled={!data?.can_redo || pending} onClick={()=>void run('redo')} title={`重做${redoLabel ? '：'+redoLabel : ''}（⌘⇧Z / Ctrl+Shift+Z / Ctrl+Y）`} aria-keyshortcuts="Meta+Shift+Z Control+Shift+Z Control+Y"><Icons.Undo2 aria-hidden="true" className="-scale-x-100"/>重做</Button>
    </div>
    <ShotFeedbackDialog message={message} onClose={clearMessage}/>
  </>;
}
