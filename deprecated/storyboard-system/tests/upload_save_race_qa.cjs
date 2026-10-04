const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const src = fs.readFileSync(require('node:path').join(__dirname, '../static/app.js'), 'utf8');
const part = (a,b) => src.slice(src.indexOf(a), src.indexOf(b, src.indexOf(a)));
async function check(fail = false, flush = true) {
  let change, finish, rejectUpload, requests = 0;
  const scheduled = [];
  const shot = { id: 's', title: 'old', panels: [{ id: 'panel', media_id: 'old' }], _syncBaseline: { panels: [{ id: 'panel', media_id: 'old' }] } };
  const c = { state: { bundle: { project: { id: 'p' }, shots: [shot] }, pendingUploads: 0, undoStack: [], redoStack: [], mediaCache: new Map() },
    _uploadTargetShotId: 's', _uploadTargetAssetId: 'old',
    _fileInput: { value: 'file', addEventListener(_, fn) { change = fn; } },
    URL: { createObjectURL: () => 'blob:preview', revokeObjectURL() {} }, URLSearchParams,
    structuredClone, queueMicrotask, flushProjectBeforeLeaving: async () => flush,
    renderCurrentView() {}, toast() {}, compressImage: async file => file,
    cacheMediaBlob: async () => {}, scheduleAutoSave: delay => scheduled.push(delay),
    api: () => { requests++; return new Promise((resolve, reject) => { finish = resolve; rejectUpload = reject; }); }
  };
  vm.createContext(c);
  vm.runInContext(part('function cloneShots(', 'function applyHistorySnapshot('), c);
  vm.runInContext(part('async function saveProject(', "$('#undoBtn')"), c);
  vm.runInContext(part("_fileInput.addEventListener('change'", '// --------------------------------------------------------------------------\n// 14.'), c);
  const task = change({ target: { files: [{ name: 'a.png', type: 'image/png' }] } });
  await new Promise(resolve => setImmediate(resolve));
  if (!flush) { await task; assert.equal(requests, 0); assert.equal(c.state.pendingUploads, 0); return; }
  assert.equal(c.state.pendingUploads, 1);
  shot.title = 'edited during upload'; c.state.dirty = true;
  assert.equal(await c.saveProject({ automatic: true }), false);
  assert.equal(requests, 1, 'no save containing a temporary ID');
  if (fail) rejectUpload(new Error('offline'));
  else finish({ id: 'durable', panel: { id: 'panel', media_id: 'durable' } });
  await task;
  assert.equal(shot.title, 'edited during upload');
  assert.equal(shot.panels[0].media_id, fail ? 'old' : 'durable');
  assert.equal(c.state.pendingUploads, 0);
  assert.ok(scheduled.includes(0), 'resume dirty edits after either result');
  if (!fail) assert.equal(shot._syncBaseline.panels[0].media_id, 'durable');
  else assert.equal(c.state.undoStack.length, 0);
}
(async () => { await check(); await check(true); await check(false, false); console.log('PASS upload/save interlock, success/failure preserve edits, resume save, failed pre-save aborts upload'); })().catch(e => { console.error(e); process.exitCode = 1; });
