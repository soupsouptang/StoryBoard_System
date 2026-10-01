export function insertShotGroup(order: string[], selectedIds: string[], targetId: string, after: boolean): string[] {
  const selected = new Set(selectedIds);
  if (selected.has(targetId) || !order.includes(targetId)) return order;
  const moving = order.filter(id => selected.has(id));
  const remaining = order.filter(id => !selected.has(id));
  if (!moving.length) return order;
  const insertion = remaining.indexOf(targetId) + (after ? 1 : 0);
  return [...remaining.slice(0, insertion), ...moving, ...remaining.slice(insertion)];
}

// Copy decoded pixels from the page; previews do not request the asset again.
function cachedCanvas(image: HTMLImageElement) {
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth || image.clientWidth || 160;
  canvas.height = image.naturalHeight || image.clientHeight || 90;
  canvas.className = image.className;
  if (image.complete && image.naturalWidth) canvas.getContext('2d')?.drawImage(image, 0, 0);
  return canvas;
}

export function createShotDragGhost(source: HTMLTableRowElement, ids: string[], x: number, y: number) {
  const ghost = document.createElement('div');
  ghost.setAttribute('aria-hidden', 'true');
  Object.assign(ghost.style, { position: 'fixed', pointerEvents: 'none', zIndex: '80' });
  const rect = source.getBoundingClientRect();
  if (ids.length === 1) {
    const table = document.createElement('table');
    table.className = source.closest('table')!.className;
    table.style.width = `${rect.width}px`;
    const copy = source.cloneNode(true) as HTMLTableRowElement;
    copy.removeAttribute('data-shot-id'); copy.removeAttribute('tabindex');
    Array.from(source.cells).forEach((cell, index) => {
      copy.cells[index].style.width = `${cell.getBoundingClientRect().width}px`;
      copy.cells[index].style.position = 'static';
    });
    const originals = Array.from(source.querySelectorAll('img'));
    copy.querySelectorAll('img').forEach((image, index) => image.replaceWith(cachedCanvas(originals[index])));
    table.createTBody().append(copy); ghost.append(table);
    ghost.style.background = 'var(--card)'; ghost.style.opacity = '0.85';
  } else {
    Object.assign(ghost.style, { width: '160px', height: '90px' });
    ids.slice(0, 4).reverse().forEach((id, reverseIndex, cards) => {
      const index = cards.length - reverseIndex - 1;
      const card = document.createElement('div');
      Object.assign(card.style, { position: 'absolute', inset: '0', overflow: 'hidden', border: '1px solid #60a5fa', borderRadius: '9px', background: 'var(--card)', transform: `translate(${index * 5}px,${-index * 5}px) rotate(${index * 3}deg)`, boxShadow: '0 3px 12px #0008' });
      const image = Array.from(document.querySelectorAll<HTMLTableRowElement>('tr[data-shot-id]')).find(row => row.dataset.shotId === id)?.querySelector('img');
      if (image) { const canvas = cachedCanvas(image); Object.assign(canvas.style, { position: 'static', width: '100%', height: '100%', objectFit: 'cover' }); card.append(canvas); }
      ghost.append(card);
    });
    const badge = document.createElement('span');
    badge.textContent = String(Math.min(ids.length, 99));
    Object.assign(badge.style, { position: 'absolute', right: '-10px', top: '-18px', width: '28px', height: '28px', display: 'grid', placeItems: 'center', borderRadius: '50%', background: '#3b82f6', color: 'white', fontWeight: 'bold', fontVariantNumeric: 'tabular-nums', border: '2px solid var(--background)' });
    ghost.append(badge);
  }
  document.body.append(ghost);
  return { element: ghost, offsetX: ids.length > 1 ? 80 : x - rect.left, offsetY: ids.length > 1 ? 45 : y - rect.top };
}
