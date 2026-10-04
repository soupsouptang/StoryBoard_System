/* Progressive enhancement for every native textarea, without replacing fields
 * or touching value/change/submit handlers. */
(() => {
  const widths = new WeakMap();
  const pending = new Set();
  let frame = 0;
  function grow(field) {
    if (!(field instanceof HTMLTextAreaElement) || !field.isConnected || !field.getClientRects().length) return;
    const style = getComputedStyle(field);
    field.style.height = 'auto';
    const border = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
    field.style.height = `${Math.max(parseFloat(style.minHeight) || 88, field.scrollHeight + border)}px`;
  }
  function schedule(field) {
    pending.add(field);
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      for (const field of pending) grow(field);
      pending.clear();
    });
  }
  const observer = new ResizeObserver(entries => {
    for (const {target, contentRect} of entries) {
      if (widths.get(target) === contentRect.width) continue;
      widths.set(target, contentRect.width);
      schedule(target);
    }
  });
  function register(root) {
    if (!(root instanceof Element)) return;
    const fields = root.matches('textarea') ? [root] : root.querySelectorAll('textarea');
    for (const field of fields) { observer.observe(field); schedule(field); }
  }
  function unregister(root) {
    if (!(root instanceof Element)) return;
    for (const field of root.matches('textarea') ? [root] : root.querySelectorAll('textarea')) {
      observer.unobserve(field); pending.delete(field);
    }
  }
  document.addEventListener('input', event => { if (event.target.matches('textarea')) schedule(event.target); }, true);
  document.addEventListener('focusin', event => { if (event.target.matches('textarea')) schedule(event.target); }, true);
  register(document.body);
  new MutationObserver(records => {
    for (const record of records) {
      for (const node of record.removedNodes) unregister(node);
      for (const node of record.addedNodes) register(node);
    }
  }).observe(document.body, {childList:true,subtree:true});
  window.FrameForgeFields = {resize: schedule};
})();
