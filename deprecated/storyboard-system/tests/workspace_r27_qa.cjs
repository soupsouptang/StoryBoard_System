const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const src = fs.readFileSync(require('node:path').join(__dirname, '../static/app.js'), 'utf8');
const extract = (a, b) => src.slice(src.indexOf(a), src.indexOf(b, src.indexOf(a)));
const c = { state: { undoStack: [], redoStack: [], bundle: { project: { id: 'p' }, shots: [] }, historyDeletedShots: new Map() }, structuredClone,
  COLLAB_SYNC_FIELDS: ['title'], queueMicrotask, toast() {}, markDirty() {}, renderProjectHeader() {}, renderCurrentView() {}, renderInspector() {}, getMediaUrl: id => `/media/${id}` };
vm.createContext(c);
vm.runInContext(extract('function cloneShots(', 'function setSaveStatus('), c);
vm.runInContext(extract('function getShotPrimaryMedia(', 'function shotCommentBadge('), c);
const prepareStart = src.indexOf('function prepareCollaborativeShots(');
vm.runInContext(src.slice(prepareStart, src.indexOf('\n}', prepareStart) + 2), c);
const old = { id: 's', title: 'old', panels: [{ id: 'p', media_id: 'before' }] };
const history = [structuredClone(old)];
history._after = [{ ...structuredClone(old), panels: [{ id: 'p', media_id: 'temporary' }] }];
const later = structuredClone(history._after);
later._after = [{ ...structuredClone(later[0]), title: 'later' }];
c.state.undoStack = [history, later];
c.resolveUploadHistory('temporary', { id: 'p', media_id: 'saved' });
assert.equal(history._after[0].panels[0].media_id, 'saved');
assert.equal(later[0].panels[0].media_id, 'saved');
c.state.bundle.shots = [{ ...structuredClone(later._after[0]), _syncBaseline: { panels: [{ id: 'p', media_id: 'saved' }] } }];
assert.equal(c.undoLastChange(), true); // later title edit first
assert.equal(c.undoLastChange(), true); // then uploaded media
assert.equal(c.state.bundle.shots[0].panels[0].media_id, 'before');
assert.ok(c.prepareCollaborativeShots(c.state.bundle)[0].changed_fields.includes('panels'), 'image undo must be included in the save patch');
c.redoLastChange();
assert.equal(c.state.bundle.shots[0].panels[0].media_id, 'saved');
assert.equal(c.getShotPrimaryMedia({ panels: [{ media_id: null }], assets: [{ id: 'historical' }] }), null);
assert.equal(c.getShotPrimaryMedia({ assets: [{ id: 'legacy' }] }), '/media/legacy');
const controls = new Map(); let reset;
for (const id of ['methodFilter', 'statusFilter', 'deptFilter', 'filterPopoverBtn', 'filterResultCount', 'clearShotFilters', 'globalSearchInput']) controls.set('#' + id, { dataset: {}, classList: { toggle() {}, add() {} }, addEventListener(_, fn) { reset = fn; } });
const f = { state: { filterMethod: 'ALL', filterStatus: 'Ready for Review', filterDept: 'ALL', searchQuery: '', bundle: { shots: [{ status: 'Ready for Review' }, { status: 'Draft' }] } },
  $: id => controls.get(id), PRODUCTION_METHODS: [['LIVE', '实拍']], STATUS_LABELS: { Draft: '草稿', 'Ready for Review': '已提审' }, STEP_DEPARTMENT_OPTIONS: [['Camera', '摄影']], escapeHtml: value => value,
  methodValues: () => [], renderCurrentView() {} };
vm.createContext(f);
vm.runInContext(extract('function syncFilterControls(', '// In-place Double-Click Editing'), f);
f.syncFilterControls();
assert.equal(controls.get('#filterPopoverBtn').textContent, '筛选 · 1');
assert.equal(controls.get('#statusFilter').value, 'Ready for Review');
assert.equal(controls.get('#filterResultCount').textContent, '1 / 2 镜头');
reset(); f.syncFilterControls();
assert.equal(controls.get('#filterResultCount').textContent, '2 / 2 镜头');
assert.equal(controls.get('#clearShotFilters').disabled, true);
console.log('PASS upload history resolves durable IDs across later edits, undo/redo, cleared media and filter sync/reset/count');
