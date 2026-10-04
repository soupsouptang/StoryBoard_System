const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Production functions, isolated from app startup, networking and browser UI.
const source = fs.readFileSync(path.join(__dirname, '../static/app.js'), 'utf8');
const fn = name => {
  const match = source.match(new RegExp(`function ${name}\\([^]*?\\n}`));
  assert.ok(match, name);
  return match[0];
};
function harness() {
  const timers = new Map(), storage = new Map(), requests = [];
  let timerId = 0;
  const c = {
    state: { view: { current: 'table' }, bundle: { project: { id: 'a', name: 'Test' }, shots: [], custom_fields: [{ key: 'cost', label: 'Cost' }], column_preferences: [] }, tablePrefs: { widths: {}, hidden: [], archived: [], purged: [], order: [], wrap: {} } },
    VIEW: { TABLE: 'table' },
    localStorage: { getItem: k => storage.get(k), setItem: (k, v) => storage.set(k, v) },
    window: { setTimeout: cb => { timers.set(++timerId, cb); return timerId; } },
    clearTimeout: id => timers.delete(id), $: () => null, toast: () => {}, renderCurrentView() {}, renderInspector() {},
    api: (url, options) => new Promise((resolve, reject) => requests.push({ url, options, resolve, reject })),
    escapeHtml: value => String(value).replace(/[&<>"']/g, x => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[x])),
    methodValues: () => [], methodLabel: x => x, STATUS_LABELS: {}
  };
  vm.createContext(c);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../static/rich-text.js'), 'utf8'), c);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../static/storyboard-pdf-export.js'), 'utf8'), c);
  for (const name of ['TABLE_COLUMNS', 'TABLE_COLUMN_LABELS', 'SCRIPT_COLUMNS', 'RICH_TEXT_FIELDS', 'PDF_FIELD_FALLBACK', 'PDF_FIELD_LABELS']) {
    vm.runInContext(source.match(new RegExp(`const ${name} = [^]*?;`))[0], c);
  }
  vm.runInContext('const columnPreferenceWrites = new Map();', c);
  vm.runInContext(fn('formattedShotField'), c);
  for (const name of ['customTableFields', 'importedTableFields', 'archivedColumnSet', 'purgedColumnSet', 'isColumnArchived', 'isColumnPurged', 'tableColumnCatalogFields', 'tableColumnFields', 'currentColumnOrder', 'tableColumnLabel', 'isColumnHidden', 'isColumnWrapped', 'setColumnHidden', 'setColumnArchived', 'tablePrefsKey', 'columnPreferencePayload', 'queueColumnPreferenceSync', 'tablePresentationPrefs', 'applyColumnLifecycleProjection', 'loadTablePrefs', 'saveTablePrefs', 'customFieldValue', 'pdfFieldOptions', 'presentationFieldKey', 'visiblePresentationFields', 'buildPresentationExportModel', 'pdfFieldLabel', 'pdfJsonValue', 'pdfFieldValue', 'buildPdfDocument']) vm.runInContext(fn(name), c);
  return { c, requests, run: code => vm.runInContext(code, c), fire: () => { const callbacks = [...timers.values()]; timers.clear(); return callbacks.map(cb => cb()); } };
}

test('default/custom hide, archive and restore survive redraw and stale remote state', () => {
  for (const field of ['description', 'custom:cost']) {
    const h = harness(); h.c.field = field;
    h.c.state.bundle.column_preferences = [{ column_key: field, state: 'visible' }];
    h.run('setColumnHidden(field, true); loadTablePrefs()');
    assert.ok(h.c.state.tablePrefs.hidden.includes(field));
    h.run('setColumnArchived(field, true)');
    h.c.state.bundle.column_preferences = [{ column_key: field, state: 'visible' }];
    h.run('loadTablePrefs()');
    assert.ok(h.c.state.tablePrefs.archived.includes(field));
    h.run('setColumnArchived(field, false); loadTablePrefs()');
    assert.ok(!h.c.state.tablePrefs.archived.includes(field));
    assert.ok(!h.c.state.tablePrefs.hidden.includes(field));
  }
});

test('writes serialize; older response cannot overwrite later edit', async () => {
  const h = harness(); h.run("setColumnHidden('title', true)");
  const [done] = h.fire();
  h.run("setColumnArchived('title', true)"); h.fire();
  assert.equal(h.requests.length, 1);
  h.requests[0].resolve(h.requests[0].options.json.preferences);
  // The production async function runs in another VM realm; drain its
  // promise continuations before asserting the next serialized request.
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.requests.length, 2);
  h.run('loadTablePrefs()');
  assert.ok(h.c.state.tablePrefs.archived.includes('title'));
  h.requests[1].resolve(h.requests[1].options.json.preferences); await done;
  h.run('loadTablePrefs()');
  assert.ok(h.c.state.tablePrefs.archived.includes('title'));
});

test('project switch cannot redirect queued write or contaminate new bundle', async () => {
  const h = harness(); h.run("setColumnHidden('title', true)");
  h.c.state.bundle = { project: { id: 'b' }, custom_fields: [], column_preferences: [] };
  const [done] = h.fire();
  assert.equal(h.requests[0].url, '/api/projects/a/column-preferences');
  h.requests[0].resolve(h.requests[0].options.json.preferences); await done;
  assert.deepEqual(h.c.state.bundle.column_preferences, []);
});

test('failed write preserves preference and next edit retries', async () => {
  const h = harness(); h.run("setColumnHidden('description', true)");
  const [failed] = h.fire(); h.requests[0].reject(new Error('offline')); await failed;
  h.c.state.bundle.column_preferences = [{ column_key: 'description', state: 'visible' }];
  h.run('loadTablePrefs()');
  assert.ok(h.c.state.tablePrefs.hidden.includes('description'));
  h.run("setColumnHidden('title', true)"); const [done] = h.fire();
  const payload = h.requests[1].options.json.preferences;
  assert.equal(payload.find(x => x.column_key === 'description').state, 'hidden');
  h.requests[1].resolve(payload); await done;
});

test('wrap defaults persist and remote false/null clear stale wrap/width', () => {
  const h = harness();
  assert.equal(h.run("columnPreferencePayload().find(x => x.column_key === 'description').wrap_text"), true);
  h.c.localStorage.setItem('frameforge-table-prefs:a:table', JSON.stringify({ widths: { title: 200 }, wrap: { title: true } }));
  h.c.state.bundle.column_preferences = [{ column_key: 'title', state: 'visible', width_px: null, wrap_text: false }];
  h.run('loadTablePrefs()');
  assert.equal(h.c.state.tablePrefs.wrap.title, false);
  assert.equal(h.c.state.tablePrefs.widths.title, undefined);
});

test('archived default/custom column does not shift cell identities or hide adjacent content', () => {
  for (const removed of ['title', 'custom:cost']) {
    const h = harness(), fields = Array.from(h.run('tableColumnCatalogFields()'));
    const node = field => ({ dataset: { column: field }, content: field, classList: { add() {} }, setAttribute() {}, remove() { this.removed = true; } });
    const headers = fields.map(node), cells = fields.map(field => ({ ...node(field), dataset: {} }));
    h.c.table = { querySelectorAll(selector) {
      if (['thead th[data-column]', 'th[data-column]'].includes(selector)) return headers;
      if (selector === 'tbody tr') return [{ cells }];
      if (selector === '[data-column]') return [...headers, ...cells];
      throw new Error(selector);
    } };
    h.c.state.tablePrefs.archived = [removed]; h.c.state.tablePrefs.hidden = ['lens'];
    const render = fn('renderTableView'), start = render.indexOf('  const columnFields ='), end = render.indexOf('  reorderTableColumns(table,', start);
    assert.ok(start >= 0 && end > start); h.run(render.slice(start, end));
    assert.deepEqual(cells.filter(x => !x.removed).map(x => x.content), fields.filter(x => ![removed, 'lens'].includes(x)));
    for (const cell of cells) assert.equal(cell.dataset.column, cell.content);
  }
});

test('table PDF embeds images and placeholders, escapes attributes, respects hidden/archived image column', () => {
  const h = harness(); h.c.state.bundle.shots = [{ id: 'one', number: '001"' }, { id: 'two', number: '002' }];
  const code = "buildPdfDocument('table', new Map([['one', 'data:image/png;base64,AAAA']]), ['number'])";
  const html = h.run(code);
  assert.match(html, /<img src="data:image\/png;base64,AAAA"/);
  assert.match(html, /data-shot="001&quot;"/); assert.match(html, /暂无图片/);
  assert.equal((html.match(/<tr>/g) || []).length, 3);
  h.c.state.tablePrefs.hidden = ['thumb']; assert.doesNotMatch(h.run(code), /<img src=/);
  h.c.state.tablePrefs.hidden = []; h.c.state.tablePrefs.archived = ['thumb']; assert.doesNotMatch(h.run(code), /<img src=/);
});

test('all fields includes hidden/custom fields while explicit selection and share defaults stay scoped', () => {
  const h = harness(); h.c.state.tablePrefs.hidden = ['description', 'custom:cost']; h.c.state.tablePrefs.archived = ['lens'];
  h.c.state.bundle.shots = [{ id: 'one', description: 'HIDDEN_COPY', lens: 'REMOVED_LENS', custom_fields: { cost: 0 } }];
  const all = h.run("buildPdfDocument('table', new Map(), null)");
  assert.match(all, /HIDDEN_COPY/); assert.match(all, /<th>Cost<\/th>/); assert.match(all, /<td>0<\/td>/); assert.doesNotMatch(all, /REMOVED_LENS/);
  assert.doesNotMatch(h.run("buildPdfDocument('table', new Map(), ['number'])"), /HIDDEN_COPY|<th>Cost<\/th>/);
  assert.ok(!h.run('visiblePresentationFields()').includes('description'));
  assert.ok(!h.run('buildPresentationExportModel().fields').includes('custom:cost'));
});

test('permanently deleted columns leave no catalog or presentation preferences', () => {
  const h = harness();
  h.c.state.bundle.column_preferences = [
    { column_key: 'title', state: 'removed', permanently_deleted: true },
    { column_key: 'custom:cost', state: 'removed', permanently_deleted: true }
  ];
  h.c.state.tablePrefs = {
    ...h.c.state.tablePrefs,
    archived: ['title', 'custom:cost'], hidden: ['title'], order: ['title', 'custom:cost'],
    widths: { title: 200 }, wrap: { title: true }, sort: { field: 'title', direction: 'asc' }
  };
  h.run('applyColumnLifecycleProjection()');
  assert.deepEqual(h.c.state.tablePrefs.archived, []);
  assert.deepEqual(h.c.state.tablePrefs.hidden, []);
  assert.deepEqual(h.c.state.tablePrefs.order, []);
  assert.equal(h.c.state.tablePrefs.widths.title, undefined);
  assert.equal(h.c.state.tablePrefs.wrap.title, undefined);
  assert.equal(h.c.state.tablePrefs.sort, null);
  for (const field of ['title', 'custom:cost']) {
    h.c.field = field;
    assert.equal(h.run('tableColumnCatalogFields().includes(field)'), false);
    assert.equal(h.run('pdfFieldOptions().includes(field)'), false);
  }
});
