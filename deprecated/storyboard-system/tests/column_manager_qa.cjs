const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const src = fs.readFileSync(require('node:path').join(__dirname, '../static/app.js'), 'utf8');
const slice = (a, b) => src.slice(src.indexOf(a), src.indexOf(b, src.indexOf(a)));
const nodes = new Map();
function node(id) {
  if (!nodes.has(id)) nodes.set(id, {
    dataset: {}, html: '', scrollTop: 0, textContent: '', listeners: {}, attrs: {},
    classList: { add() {}, toggle() {} },
    setAttribute(k, v) { this.attrs[k] = v; },
    addEventListener(k, fn) { this.listeners[k] = fn; },
    focus() { context.document.activeElement = this; },
    contains(el) { return [...nodes.values()].includes(el); },
    querySelector(s) { return node(s); }, querySelectorAll() { return []; },
    set innerHTML(value) { this.html = value; }, get innerHTML() { return this.html; }
  });
  return nodes.get(id);
}
let writes = 0, renders = 0;
const context = {
  state: { bundle: { project: { id: 'one' } }, tablePrefs: { hidden: ['description'], removed: ['custom:note'], widths: {} } },
  document: { activeElement: null }, $: node,
  tableColumnCatalogFields: () => ['select', 'title', 'description', 'custom:note', 'actions'],
  tableColumnLabel: f => ({ title: '标题', description: '画面描述', 'custom:note': '<客户备注>' }[f] || f),
  isColumnHidden: f => context.state.tablePrefs.hidden.includes(f),
  escapeHtml: s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;'),
  saveTablePrefs() { writes++; }, renderTableView() { renders++; }, toast() {}, autoFitTableColumns() {}
};
vm.createContext(context);
vm.runInContext(slice('function setColumnHidden(', 'function customFieldValue('), context);
vm.runInContext(slice('function columnManagerEntries(', 'function closeTableContextMenu('), context);
assert.equal(context.columnManagerEntries('', 'visible').length, 3);
assert.equal(context.columnManagerEntries('', 'hidden')[0].field, 'description');
assert.equal(context.columnManagerEntries('NOTE', 'removed')[0].field, 'custom:note');
assert.equal(context.columnManagerEntries('不存在', 'all').length, 0);
context.renderColumnSettingsPopover();
const popover = node('#columnSettingsPopover');
let stopped = 0;
const click = dataset => popover.onclick({ stopPropagation() { stopped++; }, target: { closest: selector => selector === '[data-column-scope]' ? null : { dataset } } });
click({ columnAction: 'hide', columnField: 'title' });
assert.ok(context.state.tablePrefs.hidden.includes('title'));
popover.dataset.scope = 'hidden'; context.renderColumnSettingsPopover();
assert.ok(node('.column-settings-list').innerHTML.includes('恢复显示'));
click({ columnAction: 'show', columnField: 'title' });
assert.ok(!context.state.tablePrefs.hidden.includes('title'));
assert.equal(popover.dataset.scope, 'hidden');
popover.dataset.scope = 'removed'; context.renderColumnSettingsPopover();
assert.ok(node('.column-settings-list').innerHTML.includes('&lt;客户备注&gt;'));
click({ columnAction: 'restore', columnField: 'custom:note' });
assert.equal(context.state.tablePrefs.removed.length, 0);
assert.ok(node('.column-settings-list').innerHTML.includes('没有已删除'));
node('#columnManagerSearch').listeners.input({ target: { value: '不存在' } });
assert.equal(popover.dataset.query, '不存在');
assert.ok(node('.column-settings-list').innerHTML.includes('没有匹配'));
context.state.bundle.project.id = 'two'; context.renderColumnSettingsPopover();
assert.equal(popover.dataset.query, ''); assert.equal(popover.dataset.scope, 'visible');
context.closeColumnSettings(true);
assert.equal(node('#columnSettingsBtn').attrs['aria-expanded'], 'false');
assert.equal(context.document.activeElement, node('#columnSettingsBtn'));
assert.equal(writes, 3); assert.equal(renders, 3);
assert.equal(stopped, 3);
console.log('PASS column grouping/search/escaping, hide/show/restore, project reset and close focus');
