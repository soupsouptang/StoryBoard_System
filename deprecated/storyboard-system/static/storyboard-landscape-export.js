/* A4 landscape storyboard sheet. Receives presentation data, never app state. */
((global) => {
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
  const value = (shot, key) => String(shot?.[key] ?? '').trim();
  const groups = [
    ['画面', [['画面描述', 'description'], ['动作', 'action'], ['构图', 'composition'], ['表演', 'performance']]],
    ['声音与文字', [['旁白', 'voiceover'], ['对白', 'dialogue'], ['字幕', 'subtitle'], ['音乐', 'music'], ['音效', 'sound']]],
    ['执行与备注', [['部门', 'department'], ['负责人', 'owner'], ['设备', 'equipment'], ['导演备注', 'director_notes'], ['备注', 'notes']]]
  ];

  function renderGroup(shot, available, title, entries) {
    const items = entries.filter(([, key]) => available.has(key) && value(shot, key));
    if (!items.length) return '';
    return `<section class="shot-group"><h3>${title}</h3>${items.map(([label, key]) =>
      `<div class="shot-field"><b>${label}</b><span>${escape(value(shot, key))}</span></div>`).join('')}</section>`;
  }

  function build({ project = {}, shots = [], mediaMap = new Map(), fields = [] } = {}) {
    const available = new Set(fields);
    const show = key => available.has(key);
    const generatedAt = new Date().toLocaleString('zh-CN');
    const rows = shots.map(shot => {
      const image = mediaMap.get(shot.id);
      const number = value(shot, 'number') || '—';
      const imageHtml = image
        ? `<img src="${escape(image)}" data-shot="${escape(number)}" alt="SHOT ${escape(number)} 分镜画面">`
        : '<span class="frame-placeholder">16:9 分镜图框</span>';
      const timing = [
        show('tc') && value(shot, 'tc_in') ? `TC ${value(shot, 'tc_in')}` : '',
        show('duration') && value(shot, 'duration_seconds') ? `${value(shot, 'duration_seconds')}s` : ''
      ].filter(Boolean).join(' · ');
      const details = [
        ['场景', 'scene'], ['景别', 'shot_size'], ['焦段', 'lens'],
        ['运镜', 'movement'], ['机位', 'angle'], ['执行方式', 'primary_method']
      ].filter(([, key]) => show(key) && value(shot, key))
        .map(([label, key]) => `<span><b>${label}</b> ${escape(value(shot, key))}</span>`).join('');
      const sections = groups.map(([title, entries]) => renderGroup(shot, available, title, entries)).filter(Boolean).join('');
      const long = groups.flatMap(([, entries]) => entries).reduce((length, [, key]) => length + (show(key) ? value(shot, key).length : 0), 0) > 700;
      return `<article class="shot-row${long ? ' shot-row-long' : ''}">
        <div class="shot-frame">${imageHtml}</div>
        <div class="shot-content">
          <div class="shot-heading"><strong>SHOT ${escape(number)}</strong>${timing ? `<span>${escape(timing)}</span>` : ''}</div>
          ${show('title') && value(shot, 'title') ? `<h2>${escape(value(shot, 'title'))}</h2>` : ''}
          ${details ? `<div class="shot-details">${details}</div>` : ''}
          ${sections ? `<div class="shot-groups">${sections}</div>` : ''}
        </div>
      </article>`;
    }).join('');

    return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>${escape(project.name || 'FRAMEFORGE')} — 横版画面分镜表</title>
      <style>
        @page { size: A4 landscape; margin: 9mm; }
        * { box-sizing: border-box; }
        body { margin: 0; color: #181a1d; background: #fff; font: 9pt/1.4 "Satoshi", "Sarasa Gothic SC", "Microsoft YaHei", sans-serif; }
        .print-toolbar { position: fixed; right: 9mm; top: 7mm; z-index: 2; }
        .print-toolbar button { border: 0; border-radius: 6px; padding: 8px 14px; background: #181a1d; color: #fff; font: inherit; cursor: pointer; }
        .print-toolbar button:disabled { opacity: .55; cursor: wait; }
        .doc-head { display: flex; justify-content: space-between; align-items: end; gap: 8mm; padding-bottom: 3mm; margin-bottom: 3mm; border-bottom: 1.5px solid #181a1d; }
        .doc-head h1 { margin: 0; font-size: 15pt; line-height: 1.25; overflow-wrap: anywhere; }
        .doc-meta { color: #5c6570; font-size: 8pt; white-space: nowrap; }
        .shot-row { display: grid; grid-template-columns: 76mm minmax(0, 1fr); gap: 5mm; min-height: 49mm; padding: 3mm 0; border-bottom: 1px solid #b8bec4; break-inside: avoid-page; page-break-inside: avoid; }
        .shot-row-long { display: block; break-inside: auto; page-break-inside: auto; }
        .shot-row-long .shot-frame { margin-bottom: 3mm; }
        .shot-frame { width: 76mm; aspect-ratio: 16 / 9; align-self: start; display: grid; place-items: center; overflow: hidden; border: 1px solid #8e969e; background: #fff; }
        .shot-frame img { display: block; width: 100%; height: 100%; object-fit: contain; }
        .frame-placeholder { color: #8e969e; font-size: 9pt; }
        .shot-content { min-width: 0; }
        .shot-heading { display: flex; align-items: baseline; gap: 5mm; font-variant-numeric: tabular-nums; }
        .shot-heading strong { font-size: 11pt; white-space: nowrap; }
        .shot-heading span { color: #5c6570; }
        h2 { margin: 1mm 0 0; font-size: 10pt; overflow-wrap: anywhere; }
        .shot-details { display: flex; flex-wrap: wrap; gap: 1mm 4mm; margin-top: 1mm; color: #4d5660; font-size: 8pt; }
        .shot-details b { font-weight: 600; color: #252a2f; }
        .shot-groups { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 2mm 5mm; margin-top: 2mm; }
        .shot-group { min-width: 0; break-inside: avoid; }
        .shot-group h3 { margin: 0 0 .5mm; color: #5c6570; font-size: 7.5pt; font-weight: 600; }
        .shot-field { display: grid; grid-template-columns: 12mm minmax(0, 1fr); gap: 1mm; margin-top: .5mm; white-space: pre-wrap; overflow-wrap: anywhere; }
        .shot-field b { font-weight: 600; }
        .shot-row-long .shot-groups { display: block; }
        .shot-row-long .shot-group { break-inside: auto; margin-top: 2mm; }
        @media print { .print-toolbar { display: none; } }
        @media screen { body { max-width: 297mm; margin: 14mm auto; padding: 9mm; box-shadow: 0 2px 18px #0002; } }
      </style><script src="/print-preview.js?v=20260909-r26" defer><\/script></head>
      <body><div class="print-toolbar"><button type="button" id="printBtn" disabled>准备打印...</button></div>
      <header class="doc-head"><h1>${escape(project.name || 'FRAMEFORGE')}</h1><div class="doc-meta">横版画面分镜表 · ${escape(String(project.aspect_ratio || '16:9'))} · ${escape(String(project.fps || 25))} fps · ${shots.length} 镜头 · ${escape(generatedAt)}</div></header>
      <main>${rows}</main></body></html>`;
  }

  global.FrameForgeLandscapeExport = Object.freeze({ build });
})(globalThis);
