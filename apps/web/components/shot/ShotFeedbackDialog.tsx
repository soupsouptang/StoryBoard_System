'use client';

import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@frameforge/ui';

/** Operation feedback uses the same centered, focus-managed dialog as other shot cards. */
export function ShotFeedbackDialog({ message, onClose }: { message: string | null; onClose: () => void }) {
  return <Dialog open={Boolean(message)} onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent className="sm:max-w-md">
      <DialogTitle>提示</DialogTitle>
      <DialogDescription className="break-words text-sm leading-relaxed">{message}</DialogDescription>
      <DialogFooter><Button size="sm" onClick={onClose}>知道了</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}
