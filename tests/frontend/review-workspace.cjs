// Synthetic component regression: node tests/frontend/review-workspace.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const slots = [];
let cursor = 0, effects = [], tree;
const React = {
  createElement: (type, props, ...children) => ({ type, props: props || {}, children: children.flat(Infinity) }),
  useState(initial) {
    const index = cursor++;
    if (!(index in slots)) slots[index] = initial;
    return [slots[index], next => { slots[index] = typeof next === 'function' ? next(slots[index]) : next; }];
  },
  useEffect(effect, deps) {
    const index = cursor++;
    if (!slots[index] || deps.some((value, i) => value !== slots[index][i])) {
      slots[index] = deps;
      effects.push(effect);
    }
  }
};
const ui = Object.fromEntries(['Badge', 'Button', 'Card', 'Dialog', 'DialogContent', 'DialogDescription', 'DialogFooter', 'DialogTitle', 'Input', 'Select', 'TextArea'].map(name => [name, name]));
ui.Icons = new Proxy({}, { get: (_, name) => name });
const shot = id => ({ id, display_number: id, name: id, duration_frames: 24, primary_method: 'LIVE', secondary_methods: ['AE'], status: 'draft', revision: 1, description: `description ${id}`, panels: [{ id: `panel-${id}` }] });
const a = shot('A'), b = shot('B');
let shots = [a, b], user = { id: 'editor', role: { permissions: { 'shot.write': true } } };
let pending = false, failure = false;
const created = [];
const inert = () => ({ isPending: false, mutateAsync: async () => {} });
const reviewHooks = Object.fromEntries(['useCreateReviewComment', 'useDeleteReviewComment', 'useResolveReviewComment', 'useUpdateReviewComment'].map(name => [name, inert]));
reviewHooks.useReviewComments = reviewHooks.useReviewDecisions = () => ({ data: [] });
const versionHooks = Object.fromEntries(['useAcceptShotVersion', 'useCreateShotBranch', 'useMergeShotVersion', 'useRestoreShotVersion'].map(name => [name, inert]));
versionHooks.useShotVersions = () => ({ data: [] });
versionHooks.useShotVersionCompare = () => ({});
versionHooks.useCreateShotVersion = id => ({ isPending: pending, mutateAsync: async args => {
  if (failure) throw new Error('synthetic snapshot failure');
  created.push({ id, args });
  return { id: 'v1' };
} });
const dependencies = {
  react: React, '@frameforge/ui': ui, 'next/navigation': { useParams: () => ({ id: 'synthetic' }) },
  '@/lib/hooks/useProduction': { useProduction: () => ({ data: { id: 'synthetic', fps_num: 24, fps_den: 1, start_timecode_frames: 86400 } }), useShots: () => ({ data: shots }) },
  '@/lib/hooks/useReview': reviewHooks, '@/lib/hooks/useVersions': versionHooks,
  '@/stores/authStore': { useAuthStore: () => ({ user }) },
  '@/components/shot/ShotPanelImage': { ShotPanelImage: 'ShotPanelImage' },
  '@/components/shot/StatusBadge': { StatusBadge: 'StatusBadge' },
  '@/components/shot/MethodBadge': { MethodBadge: 'MethodBadge' },
  '@/lib/shot-display': { shotMovementLabel: () => '固定' }
};
const moduleObject = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('apps/web/app/(workspace)/production/[id]/review/page.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true }
}).outputText, { module: moduleObject, exports: moduleObject.exports, require: name => dependencies[name] || require(name), Error });
function render() {
  cursor = 0; effects = []; tree = moduleObject.exports.default();
  effects.forEach(effect => effect());
  cursor = 0; effects = []; tree = moduleObject.exports.default();
}
function all(predicate, node = tree) {
  if (!node || typeof node !== 'object') return [];
  return [...(predicate(node) ? [node] : []), ...(node.children || []).flatMap(child => all(predicate, child ?? null))];
}
const submit = () => all(node => node.type === 'Button' && node.children.includes('提交修订'))[0];
const tick = () => new Promise(resolve => setImmediate(resolve));
(async () => {
  render();
  const queueB = all(node => node.type === 'button' && node.props.key === 'B')[0];
  queueB.props.onClick(); render();
  shots = [b, a]; render();
  assert.equal(all(node => node.props['aria-current'] === 'true')[0].props.key, 'B', 'Reorder must preserve selected entity');
  const center = all(node => node.type === 'section' && node.props['aria-label'] === '当前镜头画面与内容')[0];
  assert.equal(all(node => node.type === 'ShotPanelImage', center)[0].props.shot.id, 'B');
  assert.equal(all(node => node.type === 'ShotPanelImage', center)[0].props.shot.panels[0].id, 'panel-B');
  assert.equal(all(node => node.type === 'MethodBadge' && node.props.method === 'AE', center).length, 1);
  assert.equal(submit().props.disabled, false);
  submit().props.onClick(); await tick(); render();
  assert.equal(created[0].id, 'B');
  assert.equal(Object.keys(created[0].args).length, 0, 'Snapshot command must not fabricate Shot fields');
  assert.equal(all(node => node.props.id === 'review-versions').length, 1);
  assert.equal(all(node => node.props.id === 'review-comments').length, 0);
  pending = true; render();
  assert.equal(all(node => node.type === 'button' && node.props.key === 'A')[0].props.disabled, true);
  pending = false; user = { id: 'reader', role: { permissions: {} } }; render();
  assert.equal(submit().props.disabled, true);
  submit().props.onClick(); await tick();
  assert.equal(created.length, 1, 'Readonly actor must not dispatch a snapshot');
  user = { id: 'editor', role: { permissions: { 'shot.write': true } } }; failure = true; render();
  submit().props.onClick(); await tick(); render();
  assert.equal(all(node => node.props.role === 'alert')[0].children[0], 'synthetic snapshot failure');
  assert.equal(all(node => node.props['aria-current'] === 'true')[0].props.key, 'B');
  console.log('Review entity selection, media, snapshot and failure check passed (synthetic hooks; visual QA pending).');
})().catch(error => { console.error(error); process.exitCode = 1; });
