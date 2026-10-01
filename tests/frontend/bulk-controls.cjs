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
const ui = { Button: 'Button', Select: 'Select' };
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

async function main() {
  render();
  assert.equal(selects().length, 3);
  assert.match(tree.props.className, /shrink-0.*flex-wrap.*border-b.*bg-muted\/30/);
  assert.ok(!tree.props.className.includes('fixed'));
  assert.ok(selects().every(node => node.props.className === 'w-[170px] min-w-0'));
  assert.deepEqual(plain(select('批量设置制作方式').props.options.map(({ value }) => value)), ['', 'live', 'stock', 'client', 'archive', 'still', 'ae', 'mg', 'three_d', 'vfx', 'type']);
  assert.deepEqual(plain(select('批量设置制作状态').props.options.map(({ value }) => value)), ['', 'draft', 'in_progress', 'review', 'changes_requested', 'approved', 'locked']);
  assert.deepEqual(plain(select('批量设置责任部门').props.options.map(({ value }) => value)), ['', 'camera', 'director', 'production', 'art', 'stock', 'editorial', 'motion', 'three_d', 'vfx', 'sound', 'color']);

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
  assert.equal(all(node => node.props.role === 'alert').length, 1);
  assert.ok(textIncludes('synthetic update failure'));
  updatePromise = Promise.resolve();

  button('取消选择').props.onClick();
  render();
  assert.deepEqual(selectedShotIds, [], 'cancel selection clears selected shot IDs');
  assert.equal(clearCalls, 1);
  selectedShotIds = ['shot-A', 'shot-C'];
  render();

  button('移入废纸篓').props.onClick();
  render();
  assert.ok(textIncludes('确认移入废纸篓？'));
  button('取消').props.onClick();
  render();
  assert.ok(!textIncludes('确认移入废纸篓？'));
  button('移入废纸篓').props.onClick();
  render();
  button('确认').props.onClick();
  await flush();
  render();
  assert.deepEqual(plain(trashCalls), [['shot-A', 'shot-C']]);
  assert.deepEqual(selectedShotIds, [], 'confirmed trash clears selection');
  console.log('Bulk selects, commands, pending state, errors, selection and two-step trash check passed (synthetic hooks).');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
