// Run: node tests/frontend/asset-image.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const slots = [], requests = [], revoked = [];
let cursor = 0, effects = [];
const React = {
  useState(initial) {
    const index = cursor++;
    if (!(index in slots)) slots[index] = initial;
    return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }];
  },
  useEffect(effect, deps) {
    const index = cursor++;
    const previous = slots[index];
    if (!previous || deps.some((value, i) => value !== previous.deps[i])) effects.push(() => {
      previous?.cleanup?.(); slots[index] = { deps, cleanup: effect() };
    });
  }
};
const jsx = (type, props) => ({ type, props });
const dependencies = {
  react: React, 'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'fragment' },
  '@/lib/api-client': { apiImageBlob: (id, signal) => new Promise((resolve, reject) => { requests.push({ id, signal, resolve, reject }); }) }
};
const moduleObject = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('apps/web/components/asset/AssetImage.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX }
}).outputText, { module: moduleObject, exports: moduleObject.exports, require: name => dependencies[name], AbortController,
  URL: { createObjectURL: blob => `blob:${blob}`, revokeObjectURL: url => revoked.push(url) } });
function render(assetId, flush = true) {
  cursor = 0; effects = [];
  const tree = moduleObject.exports.AssetImage({ assetId, alt: assetId || '', children: 'fallback' });
  if (flush) effects.forEach(effect => effect());
  return tree;
}
const tick = () => new Promise(resolve => setImmediate(resolve));
(async () => {
  render('A'); requests[0].resolve('A'); await tick();
  assert.equal(render('A').props.src, 'blob:A');
  assert.equal(render('B', false).type, 'fragment', 'New asset must not briefly render the previous image');
  render('B'); assert.equal(requests[0].signal.aborted, true); assert.deepEqual(revoked, ['blob:A']);
  requests[1].resolve('B'); await tick();
  const imageB = render('B'); assert.equal(imageB.props.src, 'blob:B');
  imageB.props.onError(); assert.equal(render('B').type, 'fragment');
  render('C'); render('D');
  assert.equal(requests[2].signal.aborted, true);
  requests[2].resolve('C'); requests[3].reject(new Error('synthetic failure')); await tick();
  assert.equal(render('D').type, 'fragment', 'Aborted completion must not replace the new asset');
  render(null); assert.equal(requests[3].signal.aborted, true);
  assert.deepEqual(revoked, ['blob:A', 'blob:B']);
  console.log('Authenticated image switching, cancellation, URL cleanup and failure check passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
