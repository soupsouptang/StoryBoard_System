// Synthetic regression check: node tests/frontend/shot_inspector_check.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const slots = [];
let cursor = 0;
let effects = [];
const keyListeners = new Set();
const React = {
  createElement: (type, props, ...children) => ({ type, props: props ?? {}, children: children.flat(Infinity) }),
  useState(initial) {
    const index = cursor++;
    if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
    return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }];
  },
  useRef(initial) {
    const index = cursor++;
    return slots[index] ??= { current: initial };
  },
  useLayoutEffect(effect, deps) {
    const index = cursor++;
    const old = slots[index];
    if (!old || deps.some((value, i) => !Object.is(value, old.deps[i]))) {
      effects.push(() => { old?.cleanup?.(); slots[index] = { deps, cleanup: effect() }; });
    }
  }
};
function load(file, dependencies) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true }
  }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require: name => dependencies[name] ?? require(name), window: { addEventListener: (type, handler) => keyListeners.add(handler), removeEventListener: (type, handler) => keyListeners.delete(handler) } }, { filename: file });
  return module.exports;
}
const { useWorkspaceStore: store } = load('apps/web/stores/useWorkspaceStore.ts', {});
class ApiError extends Error {}
let lastSave;
let resolveSave;
let rejectSave;
let deleteFails = false;
const deleted = [];
const ui = Object.fromEntries(['Button', 'Input', 'TextArea', 'Select', 'Checkbox', 'Dialog', 'DialogContent', 'DialogTitle', 'DialogDescription', 'DialogFooter'].map(name => [name, name]));
ui.Icons = new Proxy({}, { get: (_, key) => key });
const { ShotInspector } = load('apps/web/components/shot/ShotInspector.tsx', {
  react: React, '@frameforge/ui': ui,
  '@/lib/media-resolver': load('apps/web/lib/media-resolver.ts', {}),
  './ShotImageCell': { ShotImageCell: 'ShotImageCell' },
  '@frameforge/timecode': { framesToSeconds: () => 1, framesToTimecode: () => '00:00:01:00' },
  '@tanstack/react-query': { useQueryClient: () => ({ invalidateQueries: async () => {} }) },
  '@/lib/api-client': { ApiError }, '@/stores/useWorkspaceStore': { useWorkspaceStore: store },
  '@/lib/hooks/useProduction': {
    useUpdateShot: () => ({ mutateAsync: request => new Promise((resolve, reject) => { lastSave = request; resolveSave = resolve; rejectSave = reject; }) }),
    useDeleteShot: () => ({ mutateAsync: async id => { deleted.push(id); if (deleteFails) throw new Error('Synthetic delete failed'); } })
  }
});
const shot = id => ({ id, name: id, display_number: id, revision: 1, duration_frames: 24 });
const a = shot('A'); const b = shot('B');
let tree;
function render(current) {
  cursor = 0; effects = [];
  tree = ShotInspector({ shot: current, production: { id: 'synthetic', fps_num: 24, fps_den: 1 }, onClose: store.getState().closeInspector });
  const pending = effects; effects = []; pending.forEach(effect => effect());
  cursor = 0;
  tree = ShotInspector({ shot: current, production: { id: 'synthetic', fps_num: 24, fps_den: 1 }, onClose: store.getState().closeInspector });
}
function find(predicate, node = tree) {
  if (!node || typeof node !== 'object') return;
  if (predicate(node)) return node;
  for (const child of node.children ?? []) { const found = find(predicate, child); if (found) return found; }
}
const input = () => find(node => node.props.id === 'shot-name');
const button = label => find(node => node.type === 'Button' && node.children.includes(label));
const edit = value => input().props.onChange({ target: { value } });
(async () => {
  store.getState().openInspector('A'); render(a);
  assert.equal(find(node => node.type === 'ShotImageCell').props.shot.id, 'A');
  assert.equal(find(node => node.type === 'ShotImageCell').props.disabled, false);
  edit('submitted'); render(a);
  assert.equal(find(node => node.type === 'ShotImageCell').props.disabled, true, 'Dirty draft must be saved before uploading a new revision');
  const saveA = button('保存').props.onClick();
  render(a); edit('new while pending');
  store.getState().closeInspector(); render(a);
  assert.equal(button('放弃所有草稿并关闭').props.disabled, true, 'Cannot discard pending save');
  button('继续编辑').props.onClick(); render(a);
  store.getState().openInspector('B'); render(b); edit('B draft'); render(b);
  assert.equal(find(node => node.type === 'ShotImageCell').props.shot.id, 'B', 'Image upload target follows the Inspector target');
  resolveSave({ ...a, name: 'submitted', revision: 2 }); await saveA; render(b);
  assert.equal(input().props.value, 'B draft', 'A acknowledgement must not overwrite B');
  store.getState().openInspector('A'); render(a);
  assert.equal(input().props.value, 'new while pending', 'Pending edits must survive acknowledgement');
  const secondSave = button('保存').props.onClick();
  render(a); edit('submitted'); // Revert to pre-save snapshot while request is pending.
  resolveSave({ ...a, name: 'new while pending', revision: 3 }); await secondSave; render(a);
  assert.equal(input().props.value, 'submitted', 'Revert during pending must remain dirty');
  store.getState().openInspector('B'); render(b); edit('B'); render(b);
  const pressKey = key => keyListeners.forEach(handler => handler({ key, target: { closest: () => null }, preventDefault() {}, stopImmediatePropagation() {} }));
  pressKey('Escape'); render(b);
  assert.equal(store.getState().isInspectorOpen, true);
  assert.equal(find(node => node.type === 'Dialog').props.open, true);
  button('继续编辑').props.onClick(); render(b);
  pressKey('i'); render(b);
  assert.equal(store.getState().isInspectorOpen, true, 'I toggle must use close guard');
  assert.equal(find(node => node.type === 'Dialog').props.open, true);
  button('放弃所有草稿并关闭').props.onClick();
  assert.equal(store.getState().isInspectorOpen, false);
  store.getState().toggleInspector();
  assert.equal(store.getState().isInspectorOpen, false, 'No selection cannot open empty Inspector');
  store.getState().openInspector('A'); render(a);
  button('移至废纸篓 (Trash Shot)').props.onClick(); render(a);
  store.getState().openInspector('B'); render(b);
  assert.equal(button('确认移至废纸篓'), undefined, 'Delete confirmation must reset on target switch');
  button('移至废纸篓 (Trash Shot)').props.onClick(); render(b);
  deleteFails = true; await button('确认移至废纸篓').props.onClick(); render(b);
  assert.deepEqual(deleted, ['B']);
  assert.ok(find(node => node.props.role === 'alert'), 'Delete failure must be visible');
  edit('retry draft'); render(b);
  const failedSave = button('保存').props.onClick(); rejectSave(new Error('Synthetic save failed')); await failedSave; render(b);
  assert.equal(input().props.value, 'retry draft');
  deleteFails = false;
  const successfulDelete = button('确认移至废纸篓').props.onClick();
  store.getState().openInspector('A'); render(a); edit('A survives delete'); render(a);
  await successfulDelete; render(a);
  assert.equal(store.getState().inspectedShotId, 'A');
  assert.equal(input().props.value, 'A survives delete');
  button('管线与制作').props.onClick(); render(a);
  const auxiliaryAE = () => find(node => node.type === 'Checkbox' && node.props['aria-label'].startsWith('辅助制作方式：AE'));
  auxiliaryAE().props.onCheckedChange(true); render(a);
  assert.equal(auxiliaryAE().props.checked, true);
  const methodSave = button('保存').props.onClick();
  assert.equal(lastSave.id, 'A');
  assert.equal(JSON.stringify(lastSave.changes.secondary_methods), '["ae"]');
  const savedA = { ...a, name: 'A survives delete', secondary_methods: ['ae'], revision: 5 };
  resolveSave(savedA); await methodSave; render(savedA);
  button('画面与旁白').props.onClick(); render(savedA);
  const field = name => find(node => node.props.id === `shot-${name}`);
  field('dialogue').props.onChange({ target: { value: '合成对白' } }); render(savedA);
  field('subtitle').props.onChange({ target: { value: '合成字幕' } }); render(savedA);
  button('摄影与构图').props.onClick(); render(savedA);
  field('action').props.onChange({ target: { value: '向左走' } }); render(savedA);
  field('composition').props.onChange({ target: { value: '左侧三分线' } }); render(savedA);
  const detailSave = button('保存').props.onClick();
  assert.equal(lastSave.revision, 5);
  assert.deepEqual(JSON.parse(JSON.stringify(lastSave.changes)), {
    dialogue: '合成对白', subtitle: '合成字幕', action: '向左走', composition: '左侧三分线'
  }, 'Detail fields use the existing changed-fields command across section switches');
  rejectSave(new Error('Synthetic detail failure')); await detailSave; render(savedA);
  assert.equal(field('action').props.value, '向左走', 'Failed detail save retains its draft');
  button('画面与旁白').props.onClick(); render(savedA);
  assert.equal(field('dialogue').props.value, '合成对白');
  console.log('Inspector synthetic save/close/delete and secondary-method regression passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
