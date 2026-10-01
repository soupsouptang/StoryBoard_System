/** Return controlled dialogs to the opener, including dialogs launched from transient menus. */
export function dialogReturnTarget(active: HTMLElement | null, stable: HTMLElement | null) {
  return active && active.tagName !== 'BODY' && !active.closest('[role="menu"], [role="listbox"]') ? active : stable;
}

export function restoreDialogFocus(event: Event, target: HTMLElement | null, onCloseAutoFocus?: (event: Event) => void) {
  onCloseAutoFocus?.(event);
  if (event.defaultPrevented || !target?.isConnected) return;
  event.preventDefault();
  target.focus({ preventScroll: true });
}
