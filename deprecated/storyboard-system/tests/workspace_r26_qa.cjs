const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const src = fs.readFileSync(path.join(__dirname, '../static/app.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '../static/index.html'), 'utf8');
const slice = (start, end) => src.slice(src.indexOf(start), src.indexOf(end, src.indexOf(start)));
const fn = name => {
  const match = src.match(new RegExp(`function ${name}\\([^]*?\\n}`));
  assert.ok(match, name);
  return match[0];
};

async function timing() {
  let resolveRequest;
  const c = { state: { bundle: { project: { id: 'p' }, shots: [{ id: 'a', voiceover: 'text', duration_frames: 25, title: 'old', _syncBaseline: { duration_frames: 25 } }] }, selection: { activeShotId: 'a' }, narrationSpeed: 1, pendingUploads: 0, undoStack: [], redoStack: [], historyDeletedShots: new Map() },
    structuredClone, queueMicrotask, COLLAB_SYNC_FIELDS: ['title', 'duration_frames'],
    $: () => null, toast() {}, flushProjectBeforeLeaving: async () => true,
    normalizeNarrationSpeed: value => Number(value) || 1,
    api: () => new Promise(resolve => { resolveRequest = resolve; }),
    markDirty() {}, renderProjectHeader() {}, renderCurrentView() {}, renderInspector() {} };
  vm.createContext(c);
  for (const name of ['cloneShots', 'recordHistory', 'applyHistorySnapshot', 'undoLastChange', 'redoLastChange']) {
    vm.runInContext(fn(name), c);
  }
  vm.runInContext(slice('async function runProjectAutoTiming(', "$('#autoTimingActionBtn')?.addEventListener"), c);
  const task = c.runProjectAutoTiming();
  await new Promise(resolve => setImmediate(resolve));
  c.state.bundle.shots[0].title = 'concurrent edit';
  resolveRequest({ shots: [{ id: 'a', duration_frames: 100 }] });
  await task;
  assert.equal(c.state.bundle.shots[0].duration_frames, 100);
  assert.equal(c.state.bundle.shots[0].title, 'concurrent edit');
  assert.equal(c.undoLastChange(), true);
  assert.equal(c.state.bundle.shots[0].duration_frames, 25);
  assert.equal(c.state.bundle.shots[0].title, 'concurrent edit');
  c.redoLastChange();
  assert.equal(c.state.bundle.shots[0].duration_frames, 100);
}

function filter() {
  let listener, frame, positioned, focused = false;
  const anchor = { setAttribute() {} };
  let hidden = true;
  const popover = { classList: { contains: () => hidden, toggle: (_, value) => { hidden = value; } }, querySelector: () => ({ focus() { focused = true; } }) };
  const c = { $: id => id === '#filterPopoverBtn' ? { addEventListener: (_, fn) => { listener = fn; } } : popover,
    closeColumnSettings() {}, setToolbarTools() {},
    requestAnimationFrame: fn => { frame = fn; }, positionPopoverNear: a => { positioned = a; } };
  vm.createContext(c);
  vm.runInContext(slice("$('#filterPopoverBtn')?.addEventListener", "$('#methodFilter')?.addEventListener"), c);
  const event = { currentTarget: anchor, stopPropagation() {} };
  listener(event);
  event.currentTarget = null; // Browser clears this after event dispatch.
  frame();
  assert.equal(positioned, anchor);
  assert.equal(focused, true);
}

async function media() {
  let active = 0, peak = 0, progress = [];
  const c = { Map, Promise, Array, AbortController, clearTimeout, URL,
    location: {origin:'http://localhost'},
    setTimeout: (fn) => setTimeout(fn, 25),
    FileReader: class { readAsDataURL() { this.result = 'data:image/png;base64,ok'; queueMicrotask(() => this.onload()); } },
    Image: class { set src(_) { queueMicrotask(() => this.onload()); } },
    fetch: async url => {
      if (url.endsWith('/hang')) return new Promise(() => {});
      active++; peak = Math.max(peak, active);
      await new Promise(resolve => setTimeout(resolve, 1)); active--;
      return { ok: true, blob: async () => ({ type: 'image/png' }) };
    } };
  vm.createContext(c);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../static/storyboard-document-media.js'), 'utf8'), c);
  const shots = Array.from({ length: 14 }, (_, i) => ({ id: String(i), number: String(i), url: i === 13 ? 'hang' : `ok-${i}` }));
  const result = await c.FrameForgeDocumentMedia.create(shot => shot.url).preflight(shots, (done) => progress.push(done));
  assert.equal(result.mediaMap.size, 13);
  assert.equal(result.failures.length, 1);
  assert.match(result.failures[0].reason, /超时/);
  assert.ok(peak > 1 && peak <= 6);
  assert.equal(progress.at(-1), 14);
}

(async () => {
  filter(); await timing(); await media();
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  assert.equal(new Set(ids).size, ids.length, 'HTML ids must be unique');
  assert.ok(!html.includes('两项是独立复选项'));
  assert.ok(!/id="columnSettingsBtn"[^>]*context-fallback/.test(html));
  const share = slice("$('#genShareBtn')?.addEventListener", "$('#revokeShareBtn')?.addEventListener");
  assert.match(share, /\['thumb'\]/);
  assert.match(share, /await flushProjectBeforeLeaving/);
  assert.match(fs.readFileSync(path.join(__dirname, '../static/storyboard-pdf-export.js'), 'utf8'), /script src="\/print-preview\.js/);
  assert.ok(!src.includes('onclick="window.print()"'));
  const printButton = { addEventListener(_, fn) { this.click = fn; } };
  let printed = false;
  const preview = { document: { getElementById: () => printButton, querySelectorAll: () => [] }, window: { print() { printed = true; } }, setTimeout, clearTimeout };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../static/print-preview.js'), 'utf8'), preview);
  assert.equal(printButton.disabled, false);
  printButton.click(); assert.equal(printed, true);
  console.log('PASS timing undo/redo and concurrent edits; filter event lifetime; media concurrency/timeouts/progress; UI IDs and share image scope');
})().catch(error => { console.error(error); process.exitCode = 1; });
