/* Standalone PDF preview renderer. All presentation fields are prepared by app.js. */
(() => {
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  })[character]);
function build({ layout, model, rows, labels, mediaMap = new Map() }) {
  if (layout === 'landscape-board') {
    if (!globalThis.FrameForgeLandscapeExport?.build) throw new Error('横版分镜表模块未加载');
    return globalThis.FrameForgeLandscapeExport.build({
      project: model.project,
      shots: model.shots,
      mediaMap,
      // This is a fixed storyboard sheet: table column visibility must not
      // silently remove dialogue or other production notes from the export.
      fields: ['tc', 'duration', 'title', 'scene', 'shot_size', 'lens', 'movement', 'angle',
        'primary_method', 'description', 'action', 'composition', 'performance',
        'voiceover', 'dialogue', 'subtitle', 'music', 'sound', 'department', 'owner',
        'equipment', 'director_notes', 'notes']
    });
  }
  if (layout === 'screenplay' || layout === 'us-board') return FrameForgeScreenplay.build({...model, layout, mediaMap});
  const project = model.project;
  const shots = model.shots;
  const layoutTitle = { table: '分镜表', board: '九宫格', detail: '单镜详细' }[layout] || '分镜表';
  const generatedAt = new Date().toLocaleString('zh-CN');
  const selectedFields = model.fields;
  const has = (f) => selectedFields.includes(f);

  const printOverrides = layout === 'table' ? '<style>@page{size:A4 landscape;margin:8mm}table{table-layout:fixed;width:100%;font-size:7pt}th,td{padding:3px 2px;overflow-wrap:anywhere;word-break:break-word}th{font-size:7pt}td{line-height:1.25}</style>' : '';
  // A same-origin external script works under the app's strict CSP, including
  // about:blank previews which inherit that policy. Never relax script-src.
  const script = printOverrides + '<script src="/print-preview.js?v=20260909-r26" defer><\/script>';

  const head = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>${escapeHtml(project.name || 'FRAMEFORGE')} — ${layoutTitle}</title><style>
    @page { margin: 12mm; size: A4; } * { box-sizing: border-box; } body { margin: 0; color: #151617; font: 10pt/1.45 "Satoshi", "Sarasa Gothic SC", sans-serif; background: #fff; }
    .toolbar { position: fixed; right: 12mm; top: 8mm; z-index: 2; } .toolbar button { border: 0; border-radius: 6px; background: #151617; color: #fff; padding: 8px 14px; font: inherit; font-weight: 500; cursor: pointer; } .toolbar button:disabled { opacity: 0.5; cursor: not-allowed; }
    .doc-header { border-bottom: 2px solid #151617; padding-bottom: 5mm; margin-bottom: 6mm; } h1 { font-size: 18pt; margin: 0; font-weight: 700; } .meta { color: #526075; margin-top: 2mm; font-variant-numeric: tabular-nums; } table { width: 100%; border-collapse: collapse; } th { background: #fff; text-align: left; font-size: 8.5pt; font-weight: 500; border-bottom: 1px solid #151617; } th, td { border: none; border-bottom: 1px solid rgba(0,0,0,0.1); padding: 6px 4px; vertical-align: top; } tr { break-inside: avoid; } thead { display: table-header-group; }
    .board { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6mm; } .board-card { break-inside: avoid; min-height: 70mm; overflow: hidden; } .board-image { display: grid; place-items: center; aspect-ratio: 16 / 9; background: #f8f9fa; color: #526075; overflow: hidden; } .board-image img { width: 100%; height: 100%; object-fit: contain; } .board-body { padding: 3mm 0; } .shot-label { color: #151617; font-weight: 700; } .shot-title { font-size: 11pt; font-weight: 700; margin: 1mm 0; }
    .detail { break-after: page; border-bottom: 1px solid #151617; padding-bottom: 7mm; margin-bottom: 7mm; } .detail:last-child { break-after: auto; border-bottom: none; } .detail-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 6mm; } .detail-image { display: grid; place-items: center; aspect-ratio: 16 / 9; background: #f8f9fa; color: #526075; overflow: hidden; } .detail-image img { width: 100%; height: 100%; object-fit: cover; } .detail dl { display: grid; grid-template-columns: 72px 1fr; gap: 2mm 4mm; margin: 0; } .detail dt { color: #526075; } .detail dd { margin: 0; font-variant-numeric: tabular-nums; white-space: pre-wrap; overflow-wrap: anywhere; } .shot-extra { break-inside: avoid; margin-top: 5mm; } .shot-extra h3 { font-size: 10pt; margin: 0 0 2mm; } .shot-extra pre { margin: 0; padding: 3mm; background: #f8f9fa; border: 1px solid rgba(0,0,0,0.1); white-space: pre-wrap; overflow-wrap: anywhere; font: 7pt/1.35 ui-monospace, SFMono-Regular, Menlo, monospace; }
    @media print { .toolbar { display: none; } } @media screen { body { max-width: 210mm; margin: 16mm auto; box-shadow: 0 2px 18px #0002; padding: 12mm; } }
  </style>${script}</head><body><div class="toolbar"><button type="button" id="printBtn" disabled>准备打印...</button></div><header class="doc-header"><h1>${escapeHtml(project.name || '')}</h1><div class="meta">${layoutTitle} · ${escapeHtml(project.aspect_ratio || '16:9')} · ${escapeHtml(String(project.fps || 25))} fps · ${shots.length} 镜头 · ${escapeHtml(generatedAt)}</div></header>`;

  if (layout === 'board') {
    return head + `<main class="board">${rows.map(({shot, values, formatted}) => {
      const media = mediaMap.get(shot.id) || '';
      const bodyParts = [
        has('number') ? `<div class="shot-label">SHOT ${escapeHtml(shot.number)}${has('duration') ? ` · ${escapeHtml(String(shot.duration_seconds || ''))}s` : ''}</div>` : '',
        has('title') && shot.title ? `<div class="shot-title">${formatted.title}</div>` : '',
        has('scene') && shot.scene ? `<div class="meta">${formatted.scene}</div>` : '',
        has('description') && shot.description ? `<div>${formatted.description}</div>` : '',
        has('voiceover') && shot.voiceover ? `<div class="meta" style="color:#526075">${formatted.voiceover}</div>` : '',
        (has('shot_size') || has('lens') || has('movement')) ? `<div class="meta">${escapeHtml([has('shot_size') && shot.shot_size, has('lens') && shot.lens, has('movement') && shot.movement].filter(Boolean).join(' · '))}</div>` : '',
        has('methods') ? `<div class="meta">${escapeHtml(String(values.methods || ''))}</div>` : '',
        has('notes') && shot.notes ? `<div class="meta" style="color:#526075">${escapeHtml(shot.notes)}</div>` : '',
        ...selectedFields.filter(field => !['number', 'duration', 'title', 'scene', 'description', 'voiceover', 'shot_size', 'lens', 'movement', 'methods', 'notes'].includes(field) && String(values[field] ?? '') !== '').map(field => `<div class="meta"><b>${escapeHtml(labels[field])}：</b>${escapeHtml(String(values[field]))}</div>`),
      ].filter(Boolean).join('');
      return `<article class="board-card"><div class="board-image">${media ? `<img src="${escapeHtml(media)}" data-shot="${escapeHtml(shot.number)}" alt="SHOT ${escapeHtml(shot.number)}">` : `<span class="empty">暂无图片<br>SHOT ${escapeHtml(shot.number)}</span>`}</div><div class="board-body">${bodyParts}</div></article>`;
    }).join('')}</main></body></html>`;
  }

  if (layout === 'detail') {
    return head + `<main>${rows.map(({shot, values, formatted}) => {
      const media = mediaMap.get(shot.id) || '';
      const dlParts = [
        has('tc') ? `<dt>TC IN</dt><dd>${escapeHtml(shot.tc_in || '')}</dd><dt>TC OUT</dt><dd>${escapeHtml(shot.tc_out || '')}</dd>` : '',
        has('duration') ? `<dt>时长</dt><dd>${escapeHtml(String(shot.duration_seconds || ''))}s / ${escapeHtml(String(shot.duration_frames || ''))}f</dd>` : '',
        has('scene') && shot.scene ? `<dt>场景</dt><dd>${formatted.scene}</dd>` : '',
        has('shot_size') ? `<dt>景别</dt><dd>${escapeHtml(shot.shot_size || '')}</dd>` : '',
        has('movement') ? `<dt>运镜</dt><dd>${escapeHtml(shot.movement || '')}</dd>` : '',
        has('angle') && shot.angle ? `<dt>机位</dt><dd>${escapeHtml(shot.angle)}</dd>` : '',
        has('methods') ? `<dt>方式</dt><dd>${escapeHtml(String(values.methods || ''))}</dd>` : '',
        has('description') ? `<dt>画面</dt><dd>${formatted.description}</dd>` : '',
        has('voiceover') ? `<dt>旁白</dt><dd>${formatted.voiceover}</dd>` : '',
        has('notes') && shot.notes ? `<dt>备注</dt><dd>${escapeHtml(shot.notes)}</dd>` : '',
        ...selectedFields.filter(field => !['tc', 'duration', 'scene', 'shot_size', 'movement', 'angle', 'methods', 'description', 'voiceover', 'notes'].includes(field)).map(field => `<dt>${escapeHtml(labels[field])}</dt><dd>${escapeHtml(String(values[field] || '—'))}</dd>`),
      ].filter(Boolean).join('');
      const shotLabel = has('number') ? `<div class="shot-label">SHOT ${escapeHtml(shot.number)}</div>` : '';
      const shotTitle = has('title') && shot.title ? `<h2>${formatted.title}</h2>` : '';
      return `<article class="detail">${shotLabel}${shotTitle}<div class="detail-grid"><div class="detail-image">${media ? `<img src="${escapeHtml(media)}" data-shot="${escapeHtml(shot.number)}" alt="SHOT ${escapeHtml(shot.number)}">` : `<span class="empty">暂无图片<br>SHOT ${escapeHtml(shot.number)}</span>`}</div><dl>${dlParts}</dl></div></article>`;
    }).join('')}</main></body></html>`;
  }

  // Table layout
  const headers = (model.includeImages ? '<th style="width:32mm">分镜画面</th>' : '')
    + selectedFields.map(field => `<th>${escapeHtml(labels[field])}</th>`).join('');
  const tableRows = rows.map(({shot, values, formatted}) => {
    const media = mediaMap.get(shot.id);
    const imageCell = model.includeImages ? `<td>${media
      ? `<img src="${escapeHtml(media)}" data-shot="${escapeHtml(shot.number)}" alt="SHOT ${escapeHtml(shot.number)}" style="display:block;width:100%;height:auto;max-height:40mm;object-fit:contain">`
      : '<span class="empty">暂无图片</span>'}</td>` : '';
    const cells = selectedFields.map(field => `<td>${formatted[field] !== undefined ? formatted[field] : escapeHtml(String(values[field] ?? ''))}</td>`).join('');
    return `<tr>${imageCell}${cells}</tr>`;
  }).join('');
  return head + `<table><thead><tr>${headers}</tr></thead><tbody>${tableRows}</tbody></table></body></html>`;
}

  globalThis.FrameForgePdfExport = Object.freeze({ build });
})();
