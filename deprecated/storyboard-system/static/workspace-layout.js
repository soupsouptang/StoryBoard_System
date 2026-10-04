/* Persistent user-owned panel geometry; independent from project content. */
(() => {
  const storageKey = 'frameforge-layout-v1';
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(storageKey) || '{}') || {}; } catch (_) {}
  if (typeof saved !== 'object' || Array.isArray(saved)) saved = {};
  const root = document.documentElement;
  const sidebarButton = document.querySelector('#sidebarCollapseBtn');
  let transitionTimer;
  const collapseSidebar = (collapsed, animate = false) => {
    const apply = () => {
      document.body.classList.toggle('sidebar-collapsed', collapsed);
      sidebarButton?.setAttribute('aria-expanded', String(!collapsed));
      sidebarButton?.setAttribute('aria-label', collapsed ? '展开侧栏' : '收起侧栏');
      if (sidebarButton) sidebarButton.title = collapsed ? '展开侧栏' : '收起侧栏';
      try { localStorage.setItem('frameforge-sidebar-collapsed',String(collapsed)); } catch (_) {}
    };
    if (!animate) { apply(); return; }
    document.body.classList.add('workspace-panels-animating');
    requestAnimationFrame(() => requestAnimationFrame(apply));
    clearTimeout(transitionTimer);
    transitionTimer = setTimeout(() => document.body.classList.remove('workspace-panels-animating'), 300);
  };
  if(sidebarButton){let collapsed=false;try{collapsed=localStorage.getItem('frameforge-sidebar-collapsed')==='true';}catch(_){}collapseSidebar(collapsed);sidebarButton.addEventListener('click',()=>collapseSidebar(!document.body.classList.contains('sidebar-collapsed'),true));}
  const effects = document.querySelector('#workspaceEffects');
  if(effects){try{effects.value=localStorage.getItem('frameforge-effects')==='reduced'?'reduced':'full';}catch(_){}document.body.dataset.effects=effects.value;effects.addEventListener('change',()=>{document.body.dataset.effects=effects.value;try{localStorage.setItem('frameforge-effects',effects.value);}catch(_){}});}
  const resetters = new Map();
  const save = () => { try { localStorage.setItem(storageKey, JSON.stringify(saved)); } catch (_) {} };
  function bind(handle, container, key, variable, axis, min, max, fallback, unit = '%', reverse = false) {
    if (!handle || !container) return;
    let value = typeof saved[key] === 'number' && Number.isFinite(saved[key]) ? saved[key] : fallback;
    const apply = next => {
      value = Math.max(min, Math.min(max, next));
      root.style.setProperty(variable, value + unit);
      handle.setAttribute('aria-valuemin', min);
      handle.setAttribute('aria-valuemax', max);
      handle.setAttribute('aria-valuenow', Math.round(value));
      handle.setAttribute('aria-valuetext', Math.round(value) + (unit === '%' ? '%' : '像素'));
    };
    apply(value);
    handle.title = '拖动调整 · 方向键微调 · 双击恢复默认';
    let drag = null;
    const reset = () => {
      drag = null;
      root.classList.remove('is-resizing-workspace');
      apply(fallback);
      saved[key] = value;
    };
    resetters.set(key, reset);
    handle.addEventListener('pointerdown', event => {
      if (event.button !== 0 || window.innerWidth < 768) return;
      event.preventDefault(); event.stopPropagation();
      const rect = container.getBoundingClientRect();
      const size = axis === 'x' ? rect.width : rect.height;
      if (!size) return;
      const layoutSize = axis === 'x' ? container.offsetWidth : container.offsetHeight;
      drag = { id: event.pointerId, start: axis === 'x' ? event.clientX : event.clientY, value,
        factor: unit === '%' ? 100 / size : layoutSize / size };
      handle.setPointerCapture(event.pointerId);
      root.classList.add('is-resizing-workspace');
    });
    handle.addEventListener('pointermove', event => {
      if (!drag || event.pointerId !== drag.id) return;
      const delta = (axis === 'x' ? event.clientX : event.clientY) - drag.start;
      apply(drag.value + delta * drag.factor * (reverse ? -1 : 1));
    });
    const finish = event => {
      if (!drag || event.pointerId !== drag.id) return;
      if (event.type === 'pointercancel') apply(drag.value);
      drag = null;
      root.classList.remove('is-resizing-workspace');
      saved[key] = value; save();
    };
    handle.addEventListener('pointerup', finish);
    handle.addEventListener('pointercancel', finish);
    handle.addEventListener('lostpointercapture', finish);
    window.addEventListener('blur', finish);
    handle.addEventListener('dblclick', () => { reset(); save(); });
    handle.addEventListener('keydown', event => {
      const negative = axis === 'x' ? 'ArrowLeft' : 'ArrowUp';
      const positive = axis === 'x' ? 'ArrowRight' : 'ArrowDown';
      if (![negative, positive, 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const step = unit === '%' ? 2 : 12;
      apply(event.key === 'Home' ? min : event.key === 'End' ? max : value + (event.key === positive ? step : -step) * (reverse ? -1 : 1));
      saved[key] = value; save();
    });
  }
  bind(document.querySelector('#timelineWidthResize'), document.querySelector('.timeline-viewer-region'), 'media', '--timeline-media-width', 'x', 30, 80, 65);
  bind(document.querySelector('#timelineHeightResize'), document.querySelector('.timeline-page'), 'preview', '--timeline-preview-height', 'y', 25, 70, 48);
  // Dialogs use native resize grips; every standard dialog receives the same
  // explicit dimensions, so card-specific max-width rules cannot block resizing.
  document.querySelectorAll('dialog.standard-dialog').forEach(dialog => {
    const resetSize = () => {
      dialog.style.removeProperty('width'); dialog.style.removeProperty('height');
      delete saved[dialog.id];
    };
    resetters.set(dialog.id, resetSize);
    const head = dialog.querySelector('.dialog-head');
    if (head) {
      const resetButton = document.createElement('button');
      resetButton.type = 'button'; resetButton.className = 'btn-ghost-icon dialog-size-reset';
      resetButton.title = '恢复窗口默认尺寸'; resetButton.setAttribute('aria-label', '恢复窗口默认尺寸');
      resetButton.innerHTML = '<svg class="g-icon" aria-hidden="true"><use href="#icon-swap_horiz"></use></svg>';
      resetButton.addEventListener('click', () => { resetSize(); save(); });
      head.insertBefore(resetButton, head.querySelector('[data-close]'));
    }
    const observer = new ResizeObserver(() => {
      if (!dialog.open || !dialog.style.width) return;
      saved[dialog.id] = { width: dialog.style.width, height: dialog.style.height }; save();
    });
    observer.observe(dialog);
    const size = saved[dialog.id];
    if (size && /^\d+(\.\d+)?px$/.test(size.width)) {
      dialog.style.width = size.width;
      if (/^\d+(\.\d+)?px$/.test(size.height)) dialog.style.height = size.height;
    }
  });
  function addPanelGrip(panel, key, variable, reverse, min, max, fallback) {
    if (!panel || panel.querySelector(':scope > .panel-resize-grip')) return;
    const grip = document.createElement('div');
    grip.className = 'workspace-splitter panel-resize-grip' + (reverse ? ' on-left' : '');
    grip.tabIndex = 0; grip.setAttribute('role', 'separator'); grip.setAttribute('aria-orientation', 'vertical');
    grip.setAttribute('aria-label', reverse ? '调整详情栏宽度' : '调整导航栏宽度');
    panel.append(grip); bind(grip, panel, key, variable, 'x', min, max, fallback, 'px', reverse);
  }
  const panels = () => {
    addPanelGrip(document.querySelector('#appSidebar'), 'sidebar', '--sidebar-width', false, 160, 320, 200);
    addPanelGrip(document.querySelector('.shot-inspector'), 'inspector', '--inspector-width', true, 260, 600, 320);
  };
  panels();
  const sidebar = document.querySelector('#appSidebar');
  if (sidebar) new MutationObserver(panels).observe(sidebar, { childList: true });
  const inspector = document.querySelector('.shot-inspector');
  if (inspector) new MutationObserver(panels).observe(inspector, { childList: true });
  document.querySelector('#resetWorkspaceLayoutBtn')?.addEventListener('click', () => {
    // Geometry only: never reset column visibility, project data or filters.
    saved = {};
    collapseSidebar(false, true);
    resetters.forEach(reset => reset());
    document.querySelectorAll('.column-settings-popover, .sidebar-settings-popover, #filterPopover, .project-activity-panel').forEach(panel => {
      panel.style.removeProperty('width'); panel.style.removeProperty('height');
    });
    save();
    const status = document.querySelector('#workspaceLayoutStatus');
    if (status) status.textContent = '窗口与面板已恢复默认尺寸';
  });
})();
