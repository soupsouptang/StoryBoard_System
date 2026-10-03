// Synthetic real-consumer check: node tests/frontend/bulk-controls.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const slots = [];
let cursor = 0;
let selectedShotIds = ['shot-A', 'shot-C'];
let updatePromise = Promise.resolve();
let updatePending = false;
let updateCalls = [];
let trashCalls = [];
let clearCalls = 0;
const React = {
  createElement: (type, props, ...children) => ({ type, props: props || {}, children: children.flat(Infinity) }),
  useState(initial) {
    const index = cursor++;
    if (!(index in slots)) slots[index] = initial;
    return [slots[index], next => { slots[index] = next; }];
  }
};
const ui = Object.fromEntries(['Button','Select','Dialog','DialogContent','DialogTitle','DialogDescription','DialogFooter'].map(name=>[name,name]));
ui.Icons = new Proxy({}, { get: (_, name) => name });
const dependencies = {
  react: React,
  '@frameforge/ui': ui,
  '@frameforge/types': {},
  '@/stores/useWorkspaceStore': {
    useWorkspaceStore: () => ({
      get selectedShotIds() { return selectedShotIds; },
      clearSelection: () => { clearCalls++; selectedShotIds = []; },
      selectAllShots: ids => { selectedShotIds = [...ids]; }
    })
  },
  '@/components/shot/ShotFeedbackDialog': {ShotFeedbackDialog: 'ShotFeedbackDialog'},
  '@/lib/hooks/useProduction': {
    useBulkUpdateShots: () => ({
      get isPending() { return updatePending; },
      mutateAsync: args => { updateCalls.push(args); return updatePromise; }
    }),
    useBulkTrashShots: () => ({
      isPending: false,
      mutateAsync: ids => { trashCalls.push(ids); return Promise.resolve(); }
    })
  }
};
const moduleObject = { exports: {} };
const source = fs.readFileSync('apps/web/components/storyboard/BulkActionToolbar.tsx', 'utf8');
vm.runInNewContext(ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React, esModuleInterop: true }
}).outputText, {
  module: moduleObject,
  exports: moduleObject.exports,
  Error,
  require: name => dependencies[name] || require(name)
});

const production = { id: 'production-1' };
const allShotIds = ['shot-A', 'shot-B', 'shot-C'];
let tree;
function render() {
  cursor = 0;
  tree = moduleObject.exports.BulkActionToolbar({ production, allShotIds });
}
function all(predicate, node = tree) {
  if (!node || typeof node !== 'object') return [];
  return [...(predicate(node) ? [node] : []), ...(node.children || []).flatMap(child => all(predicate, child ?? null))];
}
const selects = () => all(node => node.type === 'Select');
const select = label => selects().find(node => node.props.label === label);
const buttons = () => all(node => node.type === 'Button');
const button = label => buttons().find(node => node.children.includes(label));
const textIncludes = (value, node = tree) => {
  if (node == null) return false;
  if (typeof node === 'string') return node.includes(value);
  if (typeof node !== 'object') return false;
  return (node.children || []).some(child => textIncludes(value, child));
};
const flush = () => new Promise(resolve => setImmediate(resolve));
const plain = value => JSON.parse(JSON.stringify(value));
const text = node => node == null ? '' : typeof node === 'object' ? (node.children || []).map(text).join('') : String(node);

async function main() {
  render();
  assert.equal(selects().length, 3);
  assert.match(tree.props.className, /shrink-0.*flex-wrap.*border-b.*bg-muted\/30/);
  assert.ok(!tree.props.className.includes('fixed'));
  assert.ok(selects().every(node => node.props.className === 'w-[170px] min-w-0'));
  assert.deepEqual(plain(select('批量设置制作方式').props.options.map(({ value }) => value)), ['', 'live', 'stock', 'client', 'archive', 'still', 'ae', 'mg', 'three_d', 'vfx', 'type']);
  assert.deepEqual(plain(select('批量设置制作状态').props.options.map(({ value }) => value)), ['', 'draft', 'in_progress', 'review', 'changes_requested', 'approved', 'locked']);
  assert.deepEqual(plain(select('批量设置责任部门').props.options.map(({ value }) => value)), ['', 'camera', 'director', 'production', 'art', 'stock', 'editorial', 'motion', 'three_d', 'vfx', 'sound', 'color']);

  for (const count of [1, 9, 10, 99, 100]) {
    selectedShotIds = Array.from({ length: count }, (_, i) => `shot-${i}`);
    render();
    const deletion = buttons().find(node => node.props['aria-label'] === `删除 ${count} 个镜头`);
    assert.ok(deletion);
    assert.match(deletion.props.className, /h-9 w-\[100px\]/);
    assert.equal(text(deletion), count === 1 ? '删除镜头' : `删除${count > 99 ? '···' : count}镜`);
    assert.match(button('取消选择').props.className, /h-9 w-\[100px\]/);
    if (count > 1) assert.ok(all(node => node.type === 'span' && node.props.className.includes('w-[2ch]'), deletion).length === 1);
    assert.ok(!textIncludes('个镜头已选'));
  }
  selectedShotIds = ['shot-A', 'shot-C'];
  render();

  select('批量设置制作方式').props.onChange('ae');
  await flush();
  assert.deepEqual(plain(updateCalls[0]), { shotIds: ['shot-A', 'shot-C'], updates: { primary_method: 'ae' } });
  assert.deepEqual(selectedShotIds, ['shot-A', 'shot-C'], 'successful field update must preserve shot selection');

  let resolvePending;
  updatePending = true;
  updatePromise = new Promise(resolve => { resolvePending = resolve; });
  render();
  select('批量设置制作状态').props.onChange('review');
  render();
  assert.ok(selects().every(node => node.props.disabled), 'all selects disable during a pending update');
  resolvePending();
  await flush();
  updatePending = false;
  updatePromise = Promise.resolve();
  assert.deepEqual(plain(updateCalls[1]), { shotIds: ['shot-A', 'shot-C'], updates: { status: 'review' } });

  updatePromise = Promise.reject(new Error('synthetic update failure'));
  render();
  select('批量设置责任部门').props.onChange('color');
  await flush();
  render();
  assert.deepEqual(selectedShotIds, ['shot-A', 'shot-C'], 'failed update must preserve shot selection');
  assert.equal(all(node => node.type === 'ShotFeedbackDialog')[0].props.message, 'synthetic update failure');
  all(node => node.type === 'ShotFeedbackDialog')[0].props.onClose();render();
  assert.equal(all(node => node.type === 'ShotFeedbackDialog')[0].props.message, null);
  updatePromise = Promise.resolve();

  button('取消选择').props.onClick();
  render();
  assert.deepEqual(selectedShotIds, [], 'cancel selection clears selected shot IDs');
  assert.equal(clearCalls, 1);
  selectedShotIds = ['shot-A', 'shot-C'];
  render();

  buttons().find(node => node.props['aria-label'] === '删除 2 个镜头').props.onClick();
  render();
  assert.equal(all(node => node.type === 'Dialog')[0].props.open, true);
  assert.equal(trashCalls.length, 0, 'opening confirmation does not delete');
  all(node => node.type === 'Dialog')[0].props.onOpenChange(false);
  render();
  assert.equal(all(node => node.type === 'Dialog')[0].props.open, false);
  assert.equal(trashCalls.length, 0, 'Escape dismissal does not delete');
  buttons().find(node => node.props['aria-label'] === '删除 2 个镜头').props.onClick();
  render();
  button('确认').props.onClick();
  await flush();
  render();
  assert.deepEqual(plain(trashCalls), [['shot-A', 'shot-C']]);
  assert.deepEqual(selectedShotIds, [], 'confirmed trash clears selection');
  console.log('Bulk selects, commands, pending state, errors, selection and two-step trash check passed (synthetic hooks).');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
