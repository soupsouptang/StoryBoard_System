// Synthetic component check: node tests/frontend/storyboard-handoff.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const slots = [];
let cursor = 0;
const React = {
  createElement: (type, props, ...children) => ({ type, props: props ?? {}, children: children.flat(Infinity) }),
  useState(initial) {
    const index = cursor++;
    if (!(index in slots)) slots[index] = initial;
    return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }];
  }
};
const Button = 'Button';
const Icons = { Search: 'Search', GripVertical: 'GripVertical' };
let workspace = {
  selectedShotIds: [], groupBySequence: false, cardSize: 'md',
  filters: { searchQuery: '', sequenceId: 'all', primaryMethod: 'all', department: 'all', status: 'all', timingLocked: null, vfxRequired: null }
};
const mutations = [];
let failNext = false;
const dependencies = {
  react: React,
  'react/jsx-runtime': { jsx: (type, props, key) => React.createElement(type, { ...props, key }, props?.children), jsxs: (type, props, key) => React.createElement(type, { ...props, key }, props?.children), Fragment: 'Fragment' },
  '@frameforge/ui': { Icons, Button },
  '@frameforge/timecode': { framesToSeconds: frames => frames / 24 },
  '@/stores/useWorkspaceStore': { useWorkspaceStore: () => workspace },
  '@/lib/hooks/useProduction': { useReorderShots: () => ({
    isPending: false,
    mutateAsync: async ids => {
      mutations.push(ids);
      if (failNext) { failNext = false; throw new Error('Synthetic reorder failure'); }
      return {};
    }
  }) },
  './ShotCard': { ShotCard: 'ShotCard' },
  'next/link': { __esModule: true, default: 'Link' }
};
function load(path, namedExport) {
  const moduleStub = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true
    }
  }).outputText;
  vm.runInNewContext(code, {
    module: moduleStub, exports: moduleStub.exports,
    require: name => dependencies[name], Error, Boolean, Set, Map
  }, { filename: path });
  return moduleStub.exports[namedExport];
}
const StoryboardGrid = load('apps/web/components/storyboard/StoryboardGrid.tsx', 'StoryboardGrid');
const ShotViewNavigation = load('apps/web/components/shot/ShotViewNavigation.tsx', 'ShotViewNavigation');
const shots = [
  { id: 'a', sort_index: 1000, duration_frames: 24, sequence_id: 'seq' },
  { id: 'b', sort_index: 2000, duration_frames: 48, sequence_id: 'seq' },
  { id: 'c', sort_index: 3000, duration_frames: 72, sequence_id: 'seq' }
];
const props = { production: { id: 'prod', fps_num: 24, fps_den: 1 }, sequences: [], shots, allShots: shots,
  onSelectShot() {}, onInspectShot() {} };
function renderGrid(overrides = {}) {
  cursor = 0;
  return StoryboardGrid({ ...props, ...overrides });
}
function findAll(predicate, node, result = []) {
  if (!node || typeof node !== 'object') return result;
  if (predicate(node)) result.push(node);
  for (const child of node.children ?? []) findAll(predicate, child, result);
  return result;
}
const flush = () => new Promise(resolve => setImmediate(resolve));
(async () => {
  let tree = renderGrid();
  const cards = findAll(node => node.type === 'ShotCard', tree);
  assert.equal(cards.length, 3);
  await cards[1].props.onMove(-1);
  assert.deepEqual(Array.from(mutations[0]), ['b', 'a', 'c'], 'Keyboard reorder submits the complete ordered ID list');

  const blockedCases = [
    ['grouped', { groupBySequence: true }],
    ['search filter', { filters: { ...workspace.filters, searchQuery: 'a' } }],
    ['method filter', { filters: { ...workspace.filters, primaryMethod: 'live' } }],
    ['department filter', { filters: { ...workspace.filters, department: 'camera' } }],
    ['status filter', { filters: { ...workspace.filters, status: 'review' } }],
    ['timing filter', { filters: { ...workspace.filters, timingLocked: true } }],
    ['vfx filter', { filters: { ...workspace.filters, vfxRequired: true } }],
    ['missing complete list', { allShots: undefined }],
    ['incomplete visible list', { shots: shots.slice(0, 2) }]
  ];
  for (const [label, override] of blockedCases) {
    workspace = { ...workspace, groupBySequence: false, filters: { ...workspace.filters,
      searchQuery: '', sequenceId: 'all', primaryMethod: 'all', department: 'all', status: 'all', timingLocked: null, vfxRequired: null } };
    if (override.groupBySequence !== undefined) workspace.groupBySequence = override.groupBySequence;
    if (override.filters) workspace.filters = override.filters;
    tree = renderGrid(override);
    const card = findAll(node => node.type === 'ShotCard', tree)[0];
    assert.equal(card.props.canReorder, false, `${label} disables reordering`);
    const before = mutations.length;
    await card.props.onMove(1);
    assert.equal(mutations.length, before, `${label} sends no mutation`);
  }

  workspace = { ...workspace, groupBySequence: false, filters: {
    searchQuery: '', sequenceId: 'all', primaryMethod: 'all', department: 'all', status: 'all', timingLocked: null, vfxRequired: null
  } };
  failNext = true;
  tree = renderGrid();
  await findAll(node => node.type === 'ShotCard', tree)[0].props.onMove(1);
  tree = renderGrid();
  assert.ok(findAll(node => node.type === 'p' && node.props.role === 'alert' && node.children.includes('Synthetic reorder failure'), tree).length,
    'Mutation failure is shown accessibly');

  const nav = ShotViewNavigation({ productionId: 'prod-1', active: 'wall', count: 3 });
  const links = findAll(node => node.type === 'Link', nav);
  assert.deepEqual(links.map(link => link.props.href), [
    '/production/prod-1/shots', '/production/prod-1/storyboard?view=cards',
    '/production/prod-1/storyboard?view=wall', '/production/prod-1/timeline'
  ]);
  assert.deepEqual(links.map(link => link.props['aria-current']), [undefined, undefined, 'page', undefined]);
  console.log('Storyboard reorder gates, complete-order request, failure alert, and view navigation checks passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
