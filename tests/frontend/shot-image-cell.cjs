// Run: node tests/frontend/shot-image-cell.cjs (no network or database)
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const requests = [];
const upload = { isPending: false, mutateAsync: request => { requests.push(request); return Promise.resolve(); } };
const jsx = (type, props) => ({ type, props });
const dependencies = {
  react: { useRef: () => ({ current: null }), useState: initial => [initial, () => {}] },
  'react/jsx-runtime': { jsx, jsxs: jsx },
  '@frameforge/ui': { Button: 'Button', Icons: { Image: 'Image' } },
  '@/lib/hooks/useProduction': { useUploadPanelImage: () => upload },
  './ShotPanelImage': { ShotPanelImage: 'ShotPanelImage' }
};
const loaded = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('apps/web/components/shot/ShotImageCell.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX }
}).outputText, { module: loaded, exports: loaded.exports, require: name => dependencies[name] });
const shot = { id: 'synthetic', production_id: 'synthetic-project', revision: 7, display_number: '001' };
const file = { name: 'synthetic.png' };
function change(disabled) {
  const tree = loaded.exports.ShotImageCell({ shot, disabled });
  const input = tree.props.children[0];
  const button = tree.props.children[1];
  assert.equal(input.props.disabled, disabled || upload.isPending);
  assert.equal(button.props.disabled, disabled || upload.isPending);
  const event = { target: { files: [file], value: 'synthetic.png' } };
  input.props.onChange(event);
  assert.equal(event.target.value, '');
}
change(true);
assert.equal(requests.length, 0, 'Disabled upload must not dispatch');
upload.isPending = true;
change(false);
assert.equal(requests.length, 0, 'Pending upload must not dispatch twice');
upload.isPending = false;
change(false);
assert.equal(requests.length, 1);
assert.equal(requests[0].shot, shot, 'Upload uses the current server revision and target');
assert.equal(requests[0].file, file);
console.log('Shot image upload target and disabled/pending guards passed.');
