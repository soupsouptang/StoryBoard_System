// Synthetic real consumer check: node tests/frontend/assets-library.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const slots = [];
let cursor = 0, tree, error = null, retried = 0;
const React = {
  createElement: (type, props, ...children) => ({ type, props: props || {}, children: children.flat(Infinity) }),
  useState(initial) {
    const index = cursor++;
    if (!(index in slots)) slots[index] = initial;
    return [slots[index], next => { slots[index] = next; }];
  }
};
const assets = Array.from({ length: 30 }, (_, index) => ({
  id: `asset-${index}`, filename: `real-${index}.png`, display_name: `Image ${index}`,
  mime_type: 'image/png', file_size: 4096, width: 640, height: 360,
  reference_shot_count: index ? 1 : 0, asset_type: 'storyboard', source_type: 'internal'
}));
assets.push({ id: 'video', filename: 'clip.mp4', display_name: 'Clip', mime_type: 'video/mp4', file_size: 1024, reference_shot_count: 0 });
const ui = Object.fromEntries(['Button', 'Card', 'Input', 'Dialog', 'DialogContent', 'DialogTitle', 'DialogDescription'].map(name => [name, name]));
ui.Icons = new Proxy({}, { get: (_, name) => name });
const dependencies = {
  react: React, 'next/link': 'Link', '@frameforge/ui': ui,
  'next/navigation': { useParams: () => ({ id: 'synthetic' }) },
  '@/lib/hooks/useAssets': { useAssets: () => ({ data: assets, error, refetch: () => { retried++; } }) },
  '@/components/asset/AssetImage': { AssetImage: 'AssetImage' }
};
const moduleObject = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('apps/web/app/(workspace)/production/[id]/assets/page.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React, esModuleInterop: true }
}).outputText, { module: moduleObject, exports: moduleObject.exports, require: name => dependencies[name] || require(name) });
function render() { cursor = 0; tree = moduleObject.exports.default(); }
function all(predicate, node = tree) {
  if (!node || typeof node !== 'object') return [];
  return [...(predicate(node) ? [node] : []), ...(node.children || []).flatMap(child => all(predicate, child ?? null))];
}
const cards = () => all(node => node.type === 'Card');
const button = label => all(node => node.type === 'Button' && node.children.includes(label))[0];
render();
assert.equal(cards().length, 31, 'Assets must not be limited to the first 24 Shots');
assert.equal(all(node => node.type === 'AssetImage').length, 30);
assert.equal(all(node => node.type === 'AssetImage')[0].props.assetId, 'asset-0');
assert.equal(all(node => node.type === 'Link')[0].props.href, '/production/synthetic/shots');
button('未使用').props.onClick(); render();
assert.equal(cards().length, 2);
button('视频').props.onClick(); render();
assert.equal(cards().length, 1);
assert.equal(all(node => node.type === 'AssetImage').length, 0, 'Video must not be sent to image preview');
button('全部素材').props.onClick(); render();
all(node => node.type === 'Input')[0].props.onChange({ target: { value: 'real-29.png' } }); render();
assert.equal(cards().length, 1);
all(node => node.type === 'button' && node.props['aria-label'] === '预览 real-29.png')[0].props.onClick(); render();
assert.equal(all(node => node.type === 'Dialog')[0].props.open, true);
assert.equal(all(node => node.type === 'DialogTitle')[0].children[0], 'real-29.png');
error = new Error('synthetic read failure'); render();
assert.equal(cards().length, 0);
assert.equal(all(node => node.props.role === 'alert').length, 1);
button('重试').props.onClick(); assert.equal(retried, 1);
console.log('Asset metadata, full list, filters, search, preview and error check passed (synthetic hooks).');
