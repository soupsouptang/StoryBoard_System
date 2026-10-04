// Standalone frontend contract tests: node tests/clipboard_logic_qa.cjs
// No server, DOM, dependencies or changes to the shared test runner required.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const source = fs.readFileSync(path.join(__dirname, '../static/app.js'), 'utf8');
const start = source.indexOf("const SHOT_CLIPBOARD_KEY =");
const end = source.indexOf('function mediaUploadIndicator(', start);
assert.ok(start >= 0 && end > start);
const code = source.slice(start, end);
const KEY = 'frameforge-shot-clipboard:v1';
const plain = value => JSON.parse(JSON.stringify(value));
const fixture = () => ({
  id: 's1', project_id: 'source', sequence_id: 'seq1', position: 8, number: '009', sort_index: 8,
  title: '镜头', chapter: '章', scene: '室内', panel_frame: 'A', description: '画面',
  action: '走', performance: '微笑', composition: '对称', director_notes: '逆光', notes: '备注',
  duration_frames: 0, locked: false, handles_head_frames: 8, handles_tail_frames: 12,
  shot_size: '近景', lens: '50mm', angle: '低', height: '1m', movement: '跟随', equipment: '轨道',
  sensor: 'FF', aperture: '2.8', shutter: '180', camera_fps: 23.976,
  voiceover: '旁白', dialogue: '对白', subtitle: '字幕', music: '音乐', sound: '脚步',
  primary_method: 'LIVE', secondary_methods: ['VFX'], department: 'Camera', owner: '甲', status: 'Draft',
  transition: '叠化', custom_fields: { nested: { list: [0, false, ''], id: 'business-id' } },
  method_data_json: { LIVE: { camera: 'A' } }, import_columns: { 任意列: '值' }, import_columns_json: '{"任意列":"值"}',
  panels: [{ id: 'panel1', shot_id: 's1', position: 0, label: 'A', duration_frames: 12, media_id: 'image1', drawing_json: { lines: [1, 2] }, notes: '图', created_at: 'old', _sync: true }],
  steps: [{ id: 'step1', shot_id: 's1', step_order: 1, sort_index: 0, name: '合成', type: 'TASK', input_asset: 'image1', output_asset: 'image2', department: 'VFX', owner: '乙', status: 'Pending', notes: '步骤', updated_at: 'old' }],
  assets: [{ id: 'image1', role: 'Storyboard', link_id: 'link1', project_id: 'source', stored_name: '/private/file', created_by: 'author' }],
  approval_version: 'v003', revision: 9, created_at: 'old', updated_at: 'old', is_deleted: 1,
  deleted_at: 'old', comments: ['private'], versions: ['private'], review_history: ['private'],
  tc_in: '00:00:00:00', duration_seconds: 0, _syncBaseline: { title: 'old' }, _mediaUploadState: 'pending'
});
async function setup(mode = 'copy') {
  const storage = new Map();
  const c = {
    state: { bundle: { project: { id: 'source' }, shots: [fixture(), { id: 's2', title: '第二条' }] }, selectedShotIds: new Set(['s2', 's1']), activeShotId: 's1', dirty: false, saveInFlight: false, changeVersion: 0 },
    structuredClone, setTimeout, requests: [], notices: [], renders: 0,
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) }
  };
  c.toast = (...args) => c.notices.push(args);
  c.renderProjectHeader = c.renderCurrentView = () => c.renders++;
  c.adoptServerBundle = bundle => { bundle.shots.forEach(s => { s._syncBaseline = { title: s.title }; }); return bundle; };
  c.saveProject = async () => { c.state.dirty = false; return true; };
  c.api = async (url, options) => {
    c.requests.push({ url, ...plain(options) });
    return { project: { id: 'target/a', updated_at: 'new' }, shots: [{ id: 'existing', title: 'original' }, ...options.json.shots.map((s, i) => ({ ...structuredClone(s), id: `new${i}` }))] };
  };
  vm.createContext(c); vm.runInContext(code, c);
  assert.equal(await c.copySelectedShots(mode), true);
  c.state.bundle = { project: { id: 'target/a' }, shots: [{ id: 'existing', title: 'original' }] };
  return c;
}
const clipboard = c => JSON.parse(c.localStorage.getItem(KEY));

test('all safe scalar/structured fields survive; row identities, audit and UI fields do not', async () => {
  const c = await setup();
  const original = fixture();
  const result = c.clipboardShotPayload(original);
  const excluded = ['id', 'project_id', 'sequence_id', 'position', 'number', 'sort_index', 'approval_version', 'revision', 'created_at', 'updated_at', 'is_deleted', 'deleted_at', 'comments', 'versions', 'review_history', 'tc_in', 'duration_seconds', '_syncBaseline', '_mediaUploadState'];
  for (const key of excluded) assert.equal(Object.hasOwn(result, key), false, key);
  for (const key of Object.keys(original).filter(key => !excluded.includes(key) && !['panels', 'steps', 'assets'].includes(key))) assert.deepEqual(plain(result[key]), plain(original[key]), key);
  assert.deepEqual(plain(result.panels), [{ position: 0, label: 'A', duration_frames: 12, media_id: 'image1', drawing_json: { lines: [1, 2] }, notes: '图' }]);
  assert.deepEqual(plain(result.steps), [{ step_order: 1, sort_index: 0, name: '合成', type: 'TASK', input_asset: 'image1', output_asset: 'image2', department: 'VFX', owner: '乙', status: 'Pending', notes: '步骤' }]);
  assert.deepEqual(plain(result.assets), [{ id: 'image1', role: 'Storyboard' }]);
  result.custom_fields.nested.list.push('changed'); result.panels[0].drawing_json.lines.push(3);
  assert.equal(original.custom_fields.nested.list.length, 3);
  assert.equal(original.panels[0].drawing_json.lines.length, 2);
  assert.deepEqual(plain(c.clipboardShotPayload({})), { panels: [], steps: [], assets: [] });
  assert.deepEqual(clipboard(c).source_ids, ['s1', 's2']);
});

for (const mode of ['copy', 'cut']) test(`${mode}: exactly one transaction with the five-field contract`, async () => {
  const c = await setup(mode), saved = c.localStorage.getItem(KEY);
  c.state.activeShotId = 'existing';
  assert.equal(await c.pasteShotClipboard(), true);
  assert.equal(c.requests.length, 1);
  assert.equal(c.requests[0].url, '/api/projects/target%2Fa/shots/paste');
  assert.equal(c.requests[0].method, 'POST');
  assert.deepEqual(c.requests[0].json, { source_project_id: 'source', source_ids: ['s1', 's2'], mode, shots: JSON.parse(saved).shots, position: 1 });
  assert.equal(c.localStorage.getItem(KEY), mode === 'cut' ? null : saved);
  assert.equal(c.state.bundle.shots.length, 3);
  assert.equal(c.state.lastServerUpdatedAt, 'new');
});

test('same-project cut also uses one transaction, with no individual deletes', async () => {
  const c = await setup('cut'); c.state.bundle.project.id = 'source';
  await c.pasteShotClipboard();
  assert.equal(c.requests.length, 1);
  assert.equal(c.requests[0].url, '/api/projects/source/shots/paste');
  assert.equal(c.requests[0].json.source_project_id, 'source');
});

test('failure leaves bundle and cut clipboard intact and releases the retry guard', async () => {
  const c = await setup('cut'), saved = c.localStorage.getItem(KEY), bundle = c.state.bundle, api = c.api;
  c.api = async () => { throw Error('transaction rejected'); };
  assert.equal(await c.pasteShotClipboard(), false);
  assert.equal(c.state.bundle, bundle); assert.equal(c.localStorage.getItem(KEY), saved);
  assert.equal(c.renders, 0);
  c.api = api; assert.equal(await c.pasteShotClipboard(), true);
});

test('pending transaction rejects repeated paste; navigation never adopts another project', async () => {
  const c = await setup('cut'), api = c.api;
  let finish;
  c.api = async (...args) => { const result = await api(...args); return new Promise(resolve => { finish = () => resolve(result); }); };
  const pending = c.pasteShotClipboard();
  await Promise.resolve();
  assert.equal(await c.pasteShotClipboard(), false);
  const other = { project: { id: 'elsewhere' }, shots: [] }; c.state.bundle = other;
  finish(); assert.equal(await pending, true);
  assert.equal(c.state.bundle, other); assert.equal(c.renders, 0);
  assert.equal(c.localStorage.getItem(KEY), null); assert.equal(c.requests.length, 1);
});

test('successful cut does not consume a newer clipboard', async () => {
  const c = await setup('cut'), api = c.api;
  c.api = async (...args) => { c.localStorage.setItem(KEY, 'new clipboard'); return api(...args); };
  assert.equal(await c.pasteShotClipboard(), true);
  assert.equal(c.localStorage.getItem(KEY), 'new clipboard');
});

test('dirty save must succeed before sending the transaction', async () => {
  const c = await setup(); c.state.dirty = true;
  c.saveProject = async () => false;
  assert.equal(await c.pasteShotClipboard(), false); assert.equal(c.requests.length, 0);
  c.saveProject = async () => { c.state.dirty = false; return true; };
  assert.equal(await c.pasteShotClipboard(), true); assert.equal(c.requests.length, 1);
});

test('in-flight edits survive while new shots and server baseline are adopted', async () => {
  const c = await setup(), api = c.api;
  c.api = async (...args) => {
    c.state.bundle.shots[0].title = 'typed during paste'; c.state.dirty = true; c.state.changeVersion++;
    return api(...args);
  };
  assert.equal(await c.pasteShotClipboard(), true);
  assert.equal(c.state.bundle.shots[0].title, 'typed during paste');
  assert.equal(c.state.bundle.shots[0]._syncBaseline.title, 'original');
  assert.equal(c.state.bundle.shots.length, 3); assert.equal(c.state.dirty, true);
});

test('malformed clipboard and unavailable storage never send requests', async () => {
  const c = await setup();
  const valid = clipboard(c);
  for (const value of [null, '{', JSON.stringify({ ...valid, mode: 'delete' }), JSON.stringify({ ...valid, shots: 'bad' }), JSON.stringify({ ...valid, shots: [null, {}] }), JSON.stringify({ ...valid, source_ids: ['s1', 's1'] }), JSON.stringify({ ...valid, source_ids: [] })]) {
    c.localStorage.setItem(KEY, value); assert.equal(await c.pasteShotClipboard(), false);
  }
  c.localStorage.getItem = () => { throw Error('storage denied'); };
  assert.equal(await c.pasteShotClipboard(), false); assert.equal(c.requests.length, 0);
  c.state.selectedShotIds = new Set(['existing']);
  c.localStorage.setItem = () => { throw Error('quota'); };
  assert.equal(await c.copySelectedShots(), false);
});

test('position follows the original active anchor after target save, with legacy zero fallback', async () => {
  for (const anchor of ['existing', 'missing', null]) {
    const c = await setup(); c.state.activeShotId = anchor; c.state.dirty = true;
    c.saveProject = async () => {
      c.state.bundle.shots.unshift({ id: 'inserted' });
      c.state.activeShotId = 'inserted'; c.state.dirty = false; return true;
    };
    assert.equal(await c.pasteShotClipboard(), true);
    assert.equal(c.requests[0].json.position, anchor === 'existing' ? 2 : 0);
  }
});

test('copy and cut flush source drafts then read saved rows using the original selected IDs', async () => {
  for (const mode of ['copy', 'cut']) {
    const c = await setup(); c.state.selectedShotIds = new Set(['existing']); c.state.dirty = true;
    c.state.bundle.shots[0].title = 'draft';
    let saves = 0;
    c.saveProject = async () => {
      saves++;
      c.state.bundle = { project: { id: 'target/a' }, shots: [{ id: 'other', title: 'not selected' }, { id: 'existing', title: 'saved merge', panels: [{ media_id: 'saved-image' }] }] };
      c.state.selectedShotIds = new Set(['other']); c.state.dirty = false; return true;
    };
    assert.equal(await c.copySelectedShots(mode), true); assert.equal(saves, 1);
    const saved = clipboard(c);
    assert.equal(saved.source_project_id, 'target/a'); assert.equal(saved.mode, mode);
    assert.deepEqual(saved.source_ids, ['existing']); assert.equal(saved.shots[0].title, 'saved merge');
    assert.equal(saved.shots[0].panels[0].media_id, 'saved-image');
  }
});

test('copy aborts safely on save failure, new edits, navigation or missing selected source and can retry', async () => {
  for (const scenario of ['failure', 'throw', 'dirty', 'navigation', 'missing', 'new-clipboard']) {
    const c = await setup(), old = c.localStorage.getItem(KEY);
    c.state.selectedShotIds = new Set(['existing']); c.state.dirty = true;
    c.saveProject = async () => {
      if (scenario === 'failure') return false;
      if (scenario === 'throw') throw Error('offline');
      c.state.dirty = scenario === 'dirty';
      if (scenario === 'navigation') c.state.bundle = { project: { id: 'elsewhere' }, shots: [{ id: 'existing' }] };
      if (scenario === 'missing') c.state.bundle.shots = [];
      if (scenario === 'new-clipboard') c.localStorage.setItem(KEY, 'newer');
      return true;
    };
    assert.equal(await c.copySelectedShots(), false, scenario);
    assert.equal(c.localStorage.getItem(KEY), scenario === 'new-clipboard' ? 'newer' : old);
    c.state.bundle = { project: { id: 'target/a' }, shots: [{ id: 'existing' }] }; c.state.dirty = false;
    assert.equal(await c.copySelectedShots(), true, `retry ${scenario}`);
  }
});

test('copy waits for an existing save; repeated copy and paste cannot consume stale clipboard', async () => {
  const c = await setup(), old = c.localStorage.getItem(KEY);
  c.state.selectedShotIds = new Set(['existing']); c.state.saveInFlight = true;
  c.setTimeout = callback => { c.state.bundle.shots[0].title = 'saved'; c.state.saveInFlight = false; callback(); };
  const pending = c.copySelectedShots();
  assert.equal(await c.copySelectedShots(), false);
  // Start a second deferred save to check paste independently of microtask order.
  assert.equal(await pending, true); assert.equal(clipboard(c).shots[0].title, 'saved');
  c.state.dirty = true;
  let finish;
  c.saveProject = () => new Promise(resolve => { finish = () => { c.state.dirty = false; resolve(true); }; });
  const copying = c.copySelectedShots();
  assert.equal(await c.pasteShotClipboard(), false); assert.equal(c.requests.length, 0);
  finish(); assert.equal(await copying, true);
  assert.notEqual(c.localStorage.getItem(KEY), old);
});

test('copy wait timeout, uploads and conflicts retain old clipboard and release the guard', async () => {
  for (const scenario of ['timeout', 'upload', 'conflict']) {
    const c = await setup(), old = c.localStorage.getItem(KEY);
    c.state.selectedShotIds = new Set(['existing']);
    if (scenario === 'timeout') {
      let now = 0; c.Date = { now: () => (now += 6000) }; c.state.saveInFlight = true;
    }
    if (scenario === 'upload') c.state.pendingUploads = 1;
    if (scenario === 'conflict') c.state.saveConflict = { projectId: 'target/a' };
    assert.equal(await c.copySelectedShots(), false); assert.equal(c.localStorage.getItem(KEY), old);
    c.state.saveInFlight = false; c.state.pendingUploads = 0; c.state.saveConflict = null;
    assert.equal(await c.copySelectedShots(), true);
  }
});
