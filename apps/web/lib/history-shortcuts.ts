/** Text inputs and local editors retain native/local undo ownership. */
export function historyShortcut(event: KeyboardEvent, localEditor = false): 'undo' | 'redo' | null {
  if (event.defaultPrevented || event.isComposing || event.repeat || event.altKey || !(event.metaKey || event.ctrlKey)) return null;
  const target = event.target instanceof Element ? event.target : null;
  if (target?.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"],[data-local-history]')) return null;
  if (!localEditor && typeof document !== 'undefined' && document.querySelector('[role="dialog"][data-state="open"]')) return null;
  if (typeof document !== 'undefined' && document.body.dataset.historyGesture) return null;
  const key = event.key.toLowerCase();
  if (key === 'z') return event.shiftKey ? 'redo' : 'undo';
  return key === 'y' && event.ctrlKey && !event.metaKey && !event.shiftKey ? 'redo' : null;
}
