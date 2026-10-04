/* Enhance dynamically-created chrome without wrapping, cloning or remounting
 * controls. No remote assets, DOM sampling, render loop or pointer listeners. */
(() => {
  const chrome = '.global-header, .sidebar, .workspace-view-tabs, .bulk-action-bar, .column-settings-popover, .sidebar-settings-popover, #filterPopover, .project-activity-panel, .project-quick-menu, .toolbar-secondary-actions, .search-result-panel, .context-menu, .ff-boards-toolbar';
  function decorate(root) {
    if (!(root instanceof Element)) return;
    if (root.matches(chrome)) root.classList.add('liquid-glass');
    root.querySelectorAll(chrome).forEach(el => el.classList.add('liquid-glass'));
  }
  decorate(document.body);
  new MutationObserver(records => {
    for (const record of records) for (const node of record.addedNodes) decorate(node);
  }).observe(document.body, {childList: true, subtree: true});
})();
