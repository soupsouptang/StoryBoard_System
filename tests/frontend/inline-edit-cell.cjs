// Synthetic component check: node tests/frontend/inline-edit-cell.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const slots = [];
let cursor = 0;
let effects = [];
const React = {
  createElement: (type, props, ...children) => ({ type, props: props ?? {}, children: children.flat(Infinity) }),
  useState(initial) {
    const index = cursor++;
    if (!(index in slots)) slots[index] = initial;
    return [slots[index], value => { slots[index] = value; }];
  },
  useRef(initial) { return slots[cursor++] ??= { current: initial }; },
  useEffect(effect, deps) {
    const index = cursor++;
    if (!slots[index] || deps.some((value, i) => !Object.is(value, slots[index][i]))) {
      slots[index] = deps;
      effects.push(effect);
    }
  }
};
class ApiError extends Error {
  constructor(status) { super('Synthetic conflict'); this.status = status; }
}
const requests = [];
let resolveSave;
let rejectSave;
const dependencies = {
  react: React, '@frameforge/ui': { Button: 'Button', Input: 'Input' },
  '@/lib/api-client': { ApiError },
  '@/lib/hooks/useProduction': { useUpdateShot: () => ({
    mutateAsync: request => new Promise((resolve, reject) => {
      requests.push(request); resolveSave = resolve; rejectSave = reject;
    })
  }) }
};
const moduleStub = { exports: {} };
const code = ts.transpileModule(fs.readFileSync('apps/web/components/shot/InlineEditCell.tsx', 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true }
}).outputText;
vm.runInNewContext(code, { module: moduleStub, exports: moduleStub.exports, Error, require: name => dependencies[name] }, { filename: 'InlineEditCell.tsx' });
const props = { productionId: 'synthetic', shot: { id: 'shot-1', revision: 1 }, field: 'description', value: '', placeholder: '双击输入画面描述' };
let tree;
function render() {
  cursor = 0; effects = [];
  tree = moduleStub.exports.InlineEditCell(props);
  effects.forEach(effect => effect());
  cursor = 0;
  tree = moduleStub.exports.InlineEditCell(props);
}
function find(predicate, node = tree) {
  if (!node || typeof node !== 'object') return;
  if (predicate(node)) return node;
  for (const child of node.children ?? []) { const found = find(predicate, child); if (found) return found; }
}
const input = () => find(node => node.type === 'Input');
const button = label => find(node => node.type === 'Button' && node.children.includes(label));
const key = (key, nativeEvent = {}) => input().props.onKeyDown({ key, nativeEvent, stopPropagation() {}, preventDefault() {} });
const settle = async () => { await new Promise(resolve => setImmediate(resolve)); render(); };
(async () => {
  render();
  assert.equal(tree.children[0].children[0].children[0], props.placeholder, 'Empty values retain the editing hint');
  props.value = 0; render();
  assert.equal(tree.children[0].children[0], 0, 'Numeric zero is a value');
  props.value = ''; render();
  tree.props.onDoubleClick({ stopPropagation() {} }); render();
  assert.equal(input().props['aria-label'], props.placeholder);
  let stopped = false;
  tree.props.onDoubleClick({ stopPropagation() { stopped = true; } });
  assert.ok(stopped, 'Double-clicking an active editor cannot open its parent Inspector');
  input().props.onChange({ target: { value: '合成草稿' } }); render();
  input().props.onCompositionStart(); key('Enter');
  input().props.onCompositionEnd(); key('Enter', { keyCode: 229 });
  assert.equal(requests.length, 0, 'IME confirmation cannot submit');
  key('Enter'); input().props.onBlur();
  assert.equal(requests.length, 1, 'Enter followed by blur submits once before a render');
  assert.equal(requests[0].revision, 1);
  rejectSave({}); await settle();
  assert.equal(input().props.value, '合成草稿');
  assert.ok(find(node => node.type === 'p' && node.children.includes('保存失败，请重试')));
  input().props.onBlur(); assert.equal(requests.length, 1, 'Failure requires an explicit retry');
  button('重试保存').props.onClick();
  rejectSave(new ApiError(409)); await settle();
  assert.equal(button('重试保存'), undefined, 'Conflict waits for a refreshed revision');
  key('Enter'); assert.equal(requests.length, 2);
  props.shot = { ...props.shot, revision: 2 }; render();
  assert.equal(input().props.value, '合成草稿', 'Refresh retains the draft');
  button('重试保存').props.onClick();
  assert.equal(requests[2].revision, 2);
  resolveSave({}); await settle();
  assert.equal(input(), undefined, 'Only server acknowledgement ends editing');
  tree.props.onDoubleClick({ stopPropagation() {} }); render();
  input().props.onChange({ target: { value: '待放弃' } }); render();
  key('Enter'); rejectSave(new Error('Synthetic failure')); await settle();
  button('放弃输入').props.onClick(); render();
  assert.equal(input(), undefined);
  tree.props.onDoubleClick({ stopPropagation() {} }); render();
  input().props.onChange({ target: { value: 'Esc 丢弃草稿' } }); render();
  const staleInput = input(); const requestCount = requests.length;
  key('Escape'); staleInput.props.onBlur(); render();
  assert.equal(requests.length, requestCount, 'Escape then blur cannot save the discarded input');
  assert.equal(input(), undefined);
  console.log('Inline cell draft, conflict, IME, event propagation and single-submit checks passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
