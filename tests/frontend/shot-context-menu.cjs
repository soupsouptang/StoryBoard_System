// Run: node tests/frontend/shot-context-menu.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const actions = [];
const primitive = ({ children, onSelect }) => {
  if (onSelect) actions.push({ label: renderToStaticMarkup(React.createElement('span', null, children)), onSelect });
  return React.createElement('div', null, children);
};
const ui = new Proxy({ Icons: new Proxy({}, { get: () => () => null }) }, { get: (target, key) => target[key] || primitive });
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../../apps/web/components/shot/ShotTableContextMenu.tsx'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }
}).outputText, {
  exports: exportsObject,
  require: name => name === '@frameforge/ui' ? ui : name.includes('useProduction')
    ? { useBulkTrashShots: () => ({ isPending: false }) }
    : name.includes('shot-table-presentation') ? { SHOT_TABLE_COLUMN_LABELS: { description: '画面内容与构图' } } : require(name)
});
const called = [];
const props = {
  commands: { canWrite: true, pending: false, clipboard: null, run: (...args) => called.push(args), copy: (...args) => called.push(args) }, canAutoTime: true, onSelectShot: id => called.push(id),
  productionId: 'synthetic', sortKey: 'default', sortDirection: 'asc', wrappedColumns: [],
  onOpenChange() {}, onOpenInspector: id => called.push(id), onClearSelection() {},
  onSort() {}, onClearSort() {}, onAutoFitColumn() {}, onHideColumn() {},
  onNewShot() {}, onOpenTrash() {}, onDeleteColumn: async column => called.push(column), onToggleWrap() {},
  columnLabels: { display_number: '镜号', description: '画面描述' }, canPasteColumn: true, columnPending: false,
  onInsertColumn: (...args) => called.push(args), onCopyColumn: (...args) => called.push(args), onPasteColumn: (...args) => called.push(args),
  onCopyCell: value => called.push(value), onCustomFieldState: (...args) => called.push(args)
};
const render = target => {
  actions.length = 0;
  return renderToStaticMarkup(React.createElement(exportsObject.ShotTableContextMenu, { ...props, target }));
};
let html = render({ kind: 'row', shotId: 's1', shotIds: ['s1'], displayNumber: '001', cellValue: '', cellLabel: '旁白' });
assert.match(html, /SHOT 001/);
assert.doesNotMatch(html, /编辑制作方式|编辑镜头/);
assert.match(html, /单条旁白自动计时/);
actions.find(action => action.label.includes('上插镜头')).onSelect();
assert.deepEqual(called.pop(), ['insert_before', 's1']);
html = render({ kind: 'row', shotId: 's1', shotIds: ['s1', 's2'], displayNumber: '001' });
assert.match(html, /选中 SHOT 001/);
assert.doesNotMatch(html, /复制此镜头/);
actions.find(action => action.label.includes('Ctrl/Cmd+C')).onSelect();
assert.deepEqual(called.pop(), [['s1','s2']]);
html = render({ kind: 'custom-column', columnKey: 'custom:shoot_date', fieldId: 'f1', revision: 4, label: '拍摄日' });
assert.doesNotMatch(html, /归档此列/);
actions.find(action => action.label.includes('后插列')).onSelect();
assert.deepEqual(called.pop(), ['custom:shoot_date', true]);
assert.match(html, /按内容自动列宽/);
assert.match(html, /新建镜头/);
assert.match(html, /删除此列/);
assert.doesNotMatch(html, /恢复镜头/);
html = render({ kind: 'column', column: 'description' });
assert.match(html, /开启文本换行/);
html = render({ kind: 'column', column: 'display_number' });
assert.doesNotMatch(html, /隐藏此列/);
assert.match(html, /删除此列/);
assert.doesNotMatch(html, /恢复镜头/);
console.log('Shot workspace menu branch/action check passed (primitive stubs; no visual QA).');
