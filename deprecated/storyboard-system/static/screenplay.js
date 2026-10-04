/* Standalone, synchronous print document builder. No application state or DOM required. */
(function (root) {
  'use strict';
  const own = (o, k) => o != null && Object.prototype.hasOwnProperty.call(o, k);
  const scalar = v => typeof v === 'string' || (typeof v === 'number' && Number.isFinite(v)) ? String(v) : '';
  const escape = v => scalar(v).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
  const labels = Object.freeze({number:'Shot', scene:'Scene', script_scene_type:'INT./EXT.', script_time_of_day:'Time of day',
    title:'Title', chapter:'Chapter', description:'Description', action:'Action', script_character:'Character',
    script_parenthetical:'Parenthetical', dialogue:'Dialogue', voiceover:'Voiceover', transition:'Transition',
    duration:'Duration', tc:'Timecode', shot_size:'Shot size', lens:'Lens', movement:'Movement', angle:'Angle',
    composition:'Composition', performance:'Performance', director_notes:'Director notes', notes:'Notes',
    music:'Music', sound:'Sound', subtitle:'Subtitle', equipment:'Equipment', department:'Department'});
  const segmenter = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter('en', {granularity:'grapheme'}) : null;
  const graphemes = s => segmenter ? Array.from(segmenter.segment(s), x => x.segment) : Array.from(s);
  const normalize = s => s.replace(/\r\n?/g, '\n').replace(/\t/g, '    ');
  // Courier is 10 characters/inch at 12 pt. Wide/fallback glyphs reserve two cells.
  const width = s => /[\u1100-\u115f\u2329\u232a\u2e80-\ua4cf\uac00-\ud7af\uf900-\ufaff\ufe10-\ufe6f\uff01-\uff60\uffe0-\uffe6\p{Extended_Pictographic}]/u.test(s) || /[\u{20000}-\u{3ffff}]/u.test(s) ? 2 : 1;
  function tokens(plain, runs, caps = false) {
    const valid = Array.isArray(runs) && runs.every(r => r && typeof r.text === 'string') && runs.map(r => r.text).join('') === plain;
    const result = [];
    for (const run of valid ? runs : [{text:plain}]) {
      const value = normalize(caps ? run.text.toUpperCase() : run.text);
      for (const text of graphemes(value)) result.push({text, underline:run.underline === true, width:width(text)});
    }
    return result;
  }
  const plainTokens = s => tokens(s);
  const hasText = ts => ts.some(t => t.text.trim());
  // Soft breaks retain whitespace; hard breaks are explicit line boundaries. No truncation.
  function wrap(ts, columns) {
    const lines = []; let line = [], cells = 0;
    for (const token of ts) {
      if (token.text === '\n') { lines.push(line); line = []; cells = 0; continue; }
      if (cells + token.width > columns && line.length) {
        let split = -1;
        for (let i = line.length - 1; i >= 0; i--) if (/^\s$/u.test(line[i].text)) { split = i + 1; break; }
        if (split > 0) { lines.push(line.slice(0, split)); line = line.slice(split); }
        else { lines.push(line); line = []; }
        cells = line.reduce((sum, t) => sum + t.width, 0);
        if (cells + token.width > columns) { lines.push(line); line = []; cells = 0; }
      }
      line.push(token); cells += token.width;
    }
    lines.push(line);
    return lines;
  }
  function renderTokens(ts) {
    let html = '', chunk = '', under = false;
    const flush = () => { if (chunk) html += under ? `<u>${escape(chunk)}</u>` : escape(chunk); chunk = ''; };
    for (const t of ts) {
      if (under !== t.underline) { flush(); under = t.underline; }
      if (t.width === 2) { flush(); const glyph = `<span class="wide">${escape(t.text)}</span>`; html += under ? `<u>${glyph}</u>` : glyph; }
      else chunk += t.text;
    }
    flush(); return html;
  }
  function selection(fields) {
    if (!Array.isArray(fields)) return [];
    return [...new Set(fields.map(f => typeof f === 'string' ? f : f && f.key))].filter(k => typeof k === 'string' &&
      (own(labels, k) || /^custom:[A-Za-z0-9_-]+$/.test(k) && !['__proto__','prototype','constructor'].includes(k.slice(7))));
  }
  function value(shot, key, selected, caps = false) {
    if (!selected.has(key)) return [];
    const plain = key.startsWith('custom:') ? (own(shot.custom_fields, key.slice(7)) ? scalar(shot.custom_fields[key.slice(7)]) : '')
      : own(shot, key) ? scalar(shot[key]) : '';
    const runs = own(shot.rich_text_json, key) ? shot.rich_text_json[key] : undefined;
    return tokens(plain, runs, caps);
  }
  function slug(shot, selected) {
    const parts = ['script_scene_type','scene','script_time_of_day'].map(k => value(shot, k, selected, true));
    const result = [];
    parts.forEach((p, i) => { if (hasText(p)) { if (result.length) result.push(...plainTokens(i === 2 ? ' - ' : ' ')); result.push(...p); } });
    return result;
  }
  const measures = {scene:60, action:60, character:30, parenthetical:25, dialogue:35, transition:60};
  function scriptBlocks(shots, selected) {
    const blocks = [];
    const add = (type, ts, blank = false) => { if (hasText(ts) || blank) blocks.push({type, lines:wrap(ts, measures[type])}); };
    for (const shot of shots) {
      add('scene', slug(shot, selected));
      for (const key of ['description','action']) add('action', value(shot, key, selected));
      const cue = value(shot, 'script_character', selected, true);
      const paren = value(shot, 'script_parenthetical', selected);
      const dialogue = value(shot, 'dialogue', selected), vo = value(shot, 'voiceover', selected);
      if (hasText(cue) || hasText(paren) || hasText(dialogue) || hasText(vo)) {
        const voOnly = !hasText(dialogue) && hasText(vo);
        add('character', voOnly && hasText(cue) ? [...cue, ...plainTokens(' (VO)')] : cue, true);
        if (hasText(paren)) {
          const raw = paren.map(t => t.text).join('').trim();
          add('parenthetical', raw.startsWith('(') && raw.endsWith(')') ? paren : [...plainTokens('('), ...paren, ...plainTokens(')')]);
        }
        add('dialogue', dialogue);
        // The voiceover field contains speech. Only an actual speaker can receive a VO suffix.
        if (hasText(vo)) {
          if (hasText(dialogue)) add('character', hasText(cue) ? [...cue, ...plainTokens(' (VO)')] : [], true);
          add('dialogue', vo);
        }
      }
      add('transition', value(shot, 'transition', selected, true));
    }
    return blocks;
  }
  function scriptPages(blocks) {
    const pages = []; let page = [];
    const nextPage = () => { if (page.length) pages.push(page); page = []; };
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      // Keep short scene/cue/parenthetical blocks with the first two following content lines.
      let need = Math.min(block.lines.length, 2);
      if (['scene','character','parenthetical'].includes(block.type)) {
        need = block.lines.length;
        for (let j = i + 1; j < blocks.length; j++) {
          const following = blocks[j];
          need += 1 + (['character','parenthetical'].includes(following.type) ? following.lines.length : Math.min(2, following.lines.length));
          if (!['character','parenthetical'].includes(following.type)) break;
        }
      }
      if (page.length && page.length + 1 + Math.min(54, need) > 54) nextPage();
      if (page.length) page.push({type:'gap', tokens:[]});
      for (const line of block.lines) {
        if (page.length === 54) nextPage();
        page.push({type:block.type, tokens:line});
      }
    }
    nextPage();
    return pages.length ? pages : [[]];
  }
  function safeMedia(mediaMap, id) {
    if (typeof id !== 'string' && typeof id !== 'number') return '';
    const v = mediaMap && typeof mediaMap.get === 'function' ? mediaMap.get(id) : own(mediaMap, id) ? mediaMap[id] : '';
    if (typeof v !== 'string' || /[\u0000-\u0020\u007f\\]/.test(v)) return '';
    if (/^data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/i.test(v)) return v;
    if (/^\/(?!\/)/.test(v)) return v;
    // Absolute/blob URLs must belong to the caller's origin. No remote tracking images.
    try {
      const url = new URL(v);
      if (root.location && root.location.origin !== 'null' && url.origin === root.location.origin && /^(https?:|blob:)$/.test(url.protocol)) return v;
    } catch (_) { /* Invalid URL: leave the required frame blank. */ }
    return '';
  }
  function boardPages(shots, keys, mediaMap, includeImages) {
    const panels = [];
    for (const shot of shots) {
      const selected = new Set(keys), rows = [];
      for (const key of keys) {
        const ts = value(shot, key, selected);
        // Labels and values of unselected columns never enter the document.
        const label = own(labels, key) ? labels[key] : key.slice(7);
        const lines = wrap([...plainTokens(label + ': '), ...ts], 60);
        rows.push(...lines.map(line => ({key, tokens:line})));
      }
      const src = includeImages === true ? safeMedia(mediaMap, shot.id) : '';
      // Two fixed 4.25-inch panels per page, each with a 2-inch frame and 12 text lines.
      // Overflow becomes additional panels; its frame stays blank, without invented shot numbers.
      const count = Math.max(1, Math.ceil(rows.length / 12));
      for (let i = 0; i < count; i++) panels.push({src:i === 0 ? src : '', rows:rows.slice(i * 12, (i + 1) * 12)});
    }
    const pages = [];
    for (let i = 0; i < panels.length; i += 2) pages.push(panels.slice(i, i + 2));
    return pages.length ? pages : [[]];
  }
  const css = `
@page { size: 8.5in 11in; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body { background: #e7e7e7; color: #000; font-family: Courier, "Courier New", monospace; font-size: 12pt; font-weight: 400; font-style: normal; }
.toolbar { padding: 12px; font-family: sans-serif; }
.toolbar button { padding: 8px 16px; }
.page { position: relative; width: 8.5in; height: 11in; padding: 1in 1in 1in 1.5in; margin: 16px auto; background: #fff; break-after: page; page-break-after: always; }
.page:last-child { break-after: auto; page-break-after: auto; }
.page-number { position: absolute; right: 1in; top: .5in; line-height: 12pt; }
.line { height: 12pt; line-height: 12pt; white-space: pre; font-size: 12pt; font-weight: 400; font-style: normal; }
.wide { display: inline-block; width: .2in; text-align: left; }
.character { margin-left: 2in; width: 3in; }
.dialogue { margin-left: 1in; width: 3.5in; }
.parenthetical { margin-left: 1.5in; width: 2.5in; }
.transition { text-align: right; }
.cover-main { position: absolute; top: 4in; left: 1.5in; width: 6in; text-align: center; }
.cover-contact { position: absolute; bottom: 1in; right: 1in; width: 6in; text-align: right; }
.board-heading { height: .5in; line-height: 12pt; }
.panel { height: 4.25in; padding-top: .1in; }
.frame { width: 3.555in; height: 2in; border: .5pt solid #555; margin-bottom: .1in; }
.frame img { display: block; width: 100%; height: 100%; object-fit: contain; }
@media print { body { background: #fff; } .toolbar { display: none; } .page { margin: 0; } }
`;
  function lineHtml(type, ts, key) {
    return `<div class="line ${type}"${key ? ` data-field="${escape(key)}"` : ''}>${renderTokens(ts)}</div>`;
  }
  function section(content, kind, number) {
    return `<section class="page ${kind}"${number ? ` data-page="${number}"` : ''}>${number && (kind === 'board' || number > 1) ? `<div class="page-number">${number}.</div>` : ''}${content}</section>`;
  }
  function cover(project) {
    const get = k => own(project, k) ? scalar(project[k]) : '';
    const title = get('title') || get('name'), author = get('author'), contact = get('contact');
    if (![title, author, contact].some(s => s.trim())) return '';
    const titleLines = title.trim() ? wrap(tokens(title), 60) : [];
    const authorLines = author.trim() ? wrap(tokens(author), 60) : [];
    const main = [...titleLines, ...(titleLines.length && authorLines.length ? [[]] : []), ...authorLines];
    const contacts = contact.trim() ? wrap(tokens(contact), 60) : [];
    // Unusually long metadata flows onto additional unnumbered cover sheets, never clips.
    let html = '';
    while (main.length || contacts.length) {
      const central = main.splice(0, 18), lower = contacts.splice(0, 12);
      html += section(`<div class="cover-main">${central.map(ts => lineHtml('cover-text', ts)).join('')}</div><div class="cover-contact">${lower.map(ts => lineHtml('contact', ts)).join('')}</div>`, 'cover');
    }
    return html;
  }
  function build({project = {}, shots = [], fields, layout = 'screenplay', mediaMap, includeImages = false} = {}) {
    if (!['screenplay','us-board'].includes(layout)) throw new TypeError('Unknown screenplay export layout');
    project = project || {};
    shots = Array.isArray(shots) ? shots.filter(s => s && typeof s === 'object') : [];
    const keys = selection(fields);
    let body;
    if (layout === 'screenplay') {
      body = cover(project) + scriptPages(scriptBlocks(shots, new Set(keys))).map((lines, i) =>
        section(lines.map(l => lineHtml(l.type, l.tokens)).join(''), 'screenplay', i + 1)).join('');
    } else {
      body = boardPages(shots, keys, mediaMap, includeImages).map((panels, i) => section(
        '<div class="board-heading">US production storyboard</div>' + panels.map(panel => `<article class="panel"><div class="frame">${panel.src ? `<img src="${escape(panel.src)}" alt="" referrerpolicy="no-referrer">` : ''}</div>${panel.rows.map(row => lineHtml('board-text', row.tokens, row.key)).join('')}</article>`).join(''), 'board', i + 1)).join('');
    }
    const title = own(project, 'title') ? scalar(project.title) : own(project, 'name') ? scalar(project.name) : '';
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(title)}</title><style>${css}</style><script src="/static/print-preview.js" defer></script></head><body><div class="toolbar"><button type="button" id="printBtn">Print / Save as PDF</button></div>${body}</body></html>`;
  }
  root.FrameForgeScreenplay = Object.freeze({build});
})(globalThis);
