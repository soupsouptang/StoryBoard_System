// Synthetic rendered read model: node tests/frontend/production-overview.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
function load(file, dependencies = {}) {
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }
  }).outputText, { module, exports: module.exports, require: name => dependencies[name] || require(name) });
  return module.exports;
}
let shots = [
  { id: 'A', primary_method: 'live', secondary_methods: ['ae', 'ae'] },
  { id: 'B', primary_method: 'stock', secondary_methods: [] },
  { id: 'C', primary_method: 'ae', secondary_methods: ['vfx'] }
];
let error = null;
const metrics = [];
const Page = load('apps/web/app/(workspace)/production/[id]/overview/page.tsx', {
  'next/navigation': { useParams: () => ({ id: 'synthetic' }) },
  '@frameforge/ui': { Button: 'button', Card: ({ children }) => { metrics.push(children); return React.createElement('section', null, children); } },
  '@/lib/hooks/useProduction': { useShots: () => ({ data: shots, error, refetch() {} }) },
  '@/lib/shot-display': load('apps/web/lib/shot-display.ts')
}).default;
function render() { metrics.length = 0; return renderToStaticMarkup(React.createElement(Page)); }
render();
assert.deepEqual(metrics.map(children => [children[1].props.children, children[0].props.children]), [
  ['总镜头数', 3], ['LIVE 实拍镜头', 1], ['STOCK 素材采购', 1], ['后期与特效制作', 3]
]);
shots = []; render();
assert.deepEqual(metrics.map(children => children[0].props.children), [0, 0, 0, 0]);
error = new Error('synthetic');
assert.match(render(), /role="alert"/);
assert.equal(metrics.length, 0, 'Failed data must not appear as zero metrics');
console.log('Overview primary/secondary counts, empty state and error check passed.');
