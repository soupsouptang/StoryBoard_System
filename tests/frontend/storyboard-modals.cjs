const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const ts = require(path.join(root, 'node_modules/typescript'));
function evaluate(file, modules = {}, globals = {}) {
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: name => {
    if (!(name in modules)) throw new Error(`Unexpected dependency ${name}`);
    return modules[name];
  }, ...globals });
  return exports;
}
const timing = evaluate('packages/timecode/src/index.ts');
class ApiError extends Error { constructor(message, status) { super(message); this.status = status; } }
function harness(file, component, props, hooks, globals = {}) {
  const state = [];
  let index = 0;
  const react = {
    useState: initial => { const i = index++; if (!(i in state)) state[i] = initial; return [state[i], value => { state[i] = typeof value === 'function' ? value(state[i]) : value; }]; },
    useRef: initial => { const i = index++; if (!(i in state)) state[i] = { current: initial }; return state[i]; },
    useMemo: fn => fn()
  };
  const ui = new Proxy({}, { get: (_, name) => name === 'Icons' ? new Proxy({}, { get: (_, icon) => String(icon) }) : String(name) });
  const jsx = (type, props) => ({ type, props });
  const exports = evaluate(`apps/web/components/storyboard/${file}.tsx`, {
    react, 'react/jsx-runtime': { jsx, jsxs: jsx }, '@frameforge/ui': ui,
    '@frameforge/timecode': timing, '@/lib/api-client': { ApiError, apiClient: hooks.apiClient },
    '@/stores/useWorkspaceStore': { useWorkspaceStore: () => ({
      isNewShotModalOpen: true, isVOTimingModalOpen: true,
      setNewShotModalOpen: () => {}, setVOTimingModalOpen: () => {}
    }) },
    '@/lib/hooks/useProduction': hooks,
    '@tanstack/react-query': { useQueryClient: () => ({ invalidateQueries: async () => {} }) }
  }, globals);
  const render = () => { index = 0; return exports[component](props); };
  return { render, exports };
}
function nodes(tree) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return [tree, ...nodes(tree.props?.children)];
}
function find(tree, type, predicate = () => true) {
  const result = nodes(tree).find(node => node.type === type && predicate(node.props));
  assert.ok(result, `Missing ${type}`);
  return result.props;
}
const production = { id: 'production-synthetic', fps_num: 25, fps_den: 1, target_duration_frames: 200 };
(async () => {
  const created = [];
  const form = harness('NewShotModal', 'NewShotModal', {
    production, sequences: [{ id: 'unassigned' }], nextNumber: '003', existingNumbers: ['001', '099', 'custom-A']
  }, { useCreateShot: () => ({ mutateAsync: async request => created.push(request) }) });
  assert.equal(form.exports.nextAvailableShotNumber([]), '001');
  assert.equal(form.exports.nextAvailableShotNumber(['001', '099', 'custom-A']), '100');
  assert.equal(form.exports.nextAvailableShotNumber(['999']), '1000');
  assert.equal(form.exports.nextAvailableShotNumber(['9007199254740993']), '9007199254740994');
  find(form.render(), 'DialogContent').onOpenAutoFocus();
  let tree = form.render();
  assert.equal(find(tree, 'Input', p => p.maxLength === 64).value, '100');
  find(tree, 'Input', p => p.maxLength === 64).onChange({ target: { value: '   ' } });
  await find(form.render(), 'form').onSubmit({ preventDefault() {} });
  assert.equal(created.length, 0);
  find(form.render(), 'Input', p => p.maxLength === 64).onChange({ target: { value: '099' } });
  await find(form.render(), 'form').onSubmit({ preventDefault() {} });
  assert.equal(created.length, 0);
  find(form.render(), 'Input', p => p.maxLength === 64).onChange({ target: { value: '100' } });
  find(form.render(), 'Input', p => p.type === 'number').onChange({ target: { value: '-1' } });
  await find(form.render(), 'form').onSubmit({ preventDefault() {} });
  assert.equal(created.length, 0);
  find(form.render(), 'Input', p => p.type === 'number').onChange({ target: { value: '3' } });
  await find(form.render(), 'form').onSubmit({ preventDefault() {} });
  assert.equal(created.length, 1);
  assert.equal(created[0].sequence_id, null);
  assert.equal(created[0].duration_frames, 75);
  assert.equal(created[0].voice_over, '');

  const commits = [];
  class FileReader { readAsDataURL() { this.result = 'data:text/csv;base64,c3ludGhldGlj'; Promise.resolve().then(() => this.onload()); } }
  const importer = harness('ImportModal', 'ImportModal', { production, isOpen: true, onClose() {} }, {
    apiClient: async (url, request) => {
      if (url.endsWith('import-preview')) return { headers: ['画面', '自定义旁白'], mapping: { description: { col: 0, raw_header: '画面', confidence: 1 } }, raw_rows: [['视觉', '合成旁白'], ['', '']] };
      commits.push(request.json);
      return { ok: true, imported_count: 1 };
    }
  }, { FileReader });
  find(importer.render(), 'input').onChange({ target: { files: [{ name: 'synthetic.csv' }], value: '' } });
  await new Promise(resolve => setImmediate(resolve));
  find(importer.render(), 'Select', p => p.label === '对应旁白的表格列').onChange('1');
  find(importer.render(), 'Button', p => p.children === '下一步：预览样本').onClick();
  tree = importer.render();
  assert.ok(nodes(tree).some(node => node.type === 'td' && node.props.children === '合成旁白'));
  await find(tree, 'Button', p => p.children === '确认导入 1 个镜头').onClick();
  assert.equal(commits.length, 1);
  assert.equal(commits[0].mapping.voiceover.col, 1);
  assert.ok(nodes(importer.render()).some(node => node.props?.role === 'status' && node.props.children.includes(1)));
  assert.equal(nodes(importer.render()).filter(node => node.type === 'Button' && String(node.props.children).startsWith('确认导入')).length, 0);

  const patches = [];
  const shots = [
    { id: 'a', display_number: '001', voice_over: 'hello', duration_frames: 50, timing_locked: false, revision: 7 },
    { id: 'b', display_number: '002', voice_over: 'hello', duration_frames: 50, timing_locked: false, revision: 8 }
  ];
  const vo = harness('VOTimingModal', 'VOTimingModal', { production, shots }, {
    useUpdateShot: () => ({ mutateAsync: async request => { patches.push(request); if (request.id === 'b') throw new ApiError('conflict', 409); } })
  });
  await find(vo.render(), 'Button', p => p.children?.includes('应用计算结果到所有镜头')).onClick();
  assert.equal(patches[0].revision, 7);
  assert.equal(patches[1].revision, 8);
  assert.ok(nodes(vo.render()).some(node => node.props?.role === 'alert' && String(node.props.children).includes('已保存 1 个镜头；镜头 002 未保存')));
  const lockedPatches = [];
  const locked = harness('VOTimingModal', 'VOTimingModal', { production, shots: [{ ...shots[0], timing_locked: true }, shots[1]] }, {
    useUpdateShot: () => ({ mutateAsync: async request => lockedPatches.push(request) })
  });
  await find(locked.render(), 'Button', p => p.children?.includes('应用计算结果到所有镜头')).onClick();
  assert.equal(lockedPatches.length, 1);
  assert.equal(lockedPatches[0].id, 'b');
  console.log('PASS: synthetic NewShot validation/numbering, Import mapping/commit, VO revisions/partial conflict/lock protection. UI rendering not verified.');
})().catch(error => { console.error(error); process.exitCode = 1; });
