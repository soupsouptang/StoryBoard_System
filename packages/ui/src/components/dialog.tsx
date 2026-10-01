'use client';

import * as React from 'react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { X } from 'lucide-react';
import { cn } from '../lib/utils';
import { dialogReturnTarget, restoreDialogFocus } from '../lib/dialog-focus';
import { Button } from './button';

const DialogFocus = React.createContext<React.RefObject<HTMLElement | null> | null>(null);

export function Dialog(props: React.ComponentProps<typeof DialogPrimitive.Root>) {
  const lastStableFocus = React.useRef<HTMLElement | null>(null);
  React.useEffect(() => {
    const remember = () => {
      const active = document.activeElement;
      if (active instanceof HTMLElement && active.tagName !== 'BODY' && !active.closest('[role="dialog"], [role="menu"], [role="listbox"]')) lastStableFocus.current = active;
    };
    remember();
    document.addEventListener('focusin', remember);
    return () => document.removeEventListener('focusin', remember);
  }, []);
  return <DialogFocus.Provider value={lastStableFocus}><DialogPrimitive.Root data-slot="dialog" {...props} /></DialogFocus.Provider>;
}
export function DialogTrigger(props: React.ComponentProps<typeof DialogPrimitive.Trigger>) { return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />; }
export function DialogClose(props: React.ComponentProps<typeof DialogPrimitive.Close>) { return <DialogPrimitive.Close data-slot="dialog-close" {...props} />; }
export function DialogPortal(props: React.ComponentProps<typeof DialogPrimitive.Portal>) { return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />; }

export const DialogOverlay = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Overlay>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>>(
  function DialogOverlay({ className, ...props }, ref) {
    return <DialogPrimitive.Overlay ref={ref} data-slot="dialog-overlay" className={cn('fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0', className)} {...props} />;
  }
);
export type DialogContentProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  hideCloseButton?: boolean;
  showCloseButton?: boolean;
  closeLabel?: string;
};
export const DialogContent = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Content>, DialogContentProps>(
  function DialogContent({ className, children, hideCloseButton = false, showCloseButton = !hideCloseButton, closeLabel = '关闭', onOpenAutoFocus, onCloseAutoFocus, ...props }, ref) {
    const stableFocus = React.useContext(DialogFocus);
    const returnFocus = React.useRef<HTMLElement | null>(null);
    return <DialogPortal><DialogOverlay /><DialogPrimitive.Content ref={ref} data-slot="dialog-content" className={cn('fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border bg-background p-6 shadow-lg duration-200 outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 sm:max-w-lg', className)} {...props}
      onOpenAutoFocus={event => {
        const active = document.activeElement;
        returnFocus.current = dialogReturnTarget(active instanceof HTMLElement ? active : null, stableFocus?.current ?? null);
        onOpenAutoFocus?.(event);
      }}
      onCloseAutoFocus={event => restoreDialogFocus(event, returnFocus.current, onCloseAutoFocus)}>
      {children}
      {showCloseButton && <DialogPrimitive.Close data-slot="dialog-close" className="absolute top-4 right-4 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"><X aria-hidden="true" /><span className="sr-only">{closeLabel}</span></DialogPrimitive.Close>}
    </DialogPrimitive.Content></DialogPortal>;
  }
);
export function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) { return <div data-slot="dialog-header" className={cn('flex flex-col gap-2 text-center sm:text-left', className)} {...props} />; }
export function DialogFooter({ className, showCloseButton = false, closeLabel = '关闭', children, ...props }: React.ComponentProps<'div'> & { showCloseButton?: boolean; closeLabel?: string }) {
  return <div data-slot="dialog-footer" className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)} {...props}>{children}{showCloseButton && <DialogPrimitive.Close asChild><Button variant="outline">{closeLabel}</Button></DialogPrimitive.Close>}</div>;
}
export const DialogTitle = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Title>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>>(
  function DialogTitle({ className, ...props }, ref) { return <DialogPrimitive.Title ref={ref} data-slot="dialog-title" className={cn('text-lg leading-none font-semibold', className)} {...props} />; }
);
export const DialogDescription = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Description>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>>(
  function DialogDescription({ className, ...props }, ref) { return <DialogPrimitive.Description ref={ref} data-slot="dialog-description" className={cn('text-sm text-muted-foreground', className)} {...props} />; }
);
