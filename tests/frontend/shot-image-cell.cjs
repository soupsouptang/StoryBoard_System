// Run: node tests/frontend/shot-image-cell.cjs (no network or database)
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const requests = [];
const saves = [], state=[]; let cursor=0, asset=null;
const upload = { isPending: false, mutateAsync: request => { requests.push(request); return Promise.resolve(); } };
const jsx = (type, props) => ({ type, props });
const dependencies = {
  react: { useRef: () => ({ current: null }), useState: initial => {const i=cursor++;if(!(i in state))state[i]=initial;return [state[i],v=>{state[i]=v;}];} },
  'react/jsx-runtime': { jsx, jsxs: jsx },
  '@frameforge/ui': { Button: 'Button', Icons: { Image: 'Image' } },
  '@/lib/hooks/useProduction': { useUploadPanelImage: () => upload, useProduction:()=>({data:{aspect_ratio:'16:9'}}) },
  '@/lib/hooks/useShotDetail':{useSaveShotDetail:()=>({isPending:false,mutateAsync:req=>{saves.push(req);return Promise.resolve(shot);}})},
  './ShotPanelImage': { ShotPanelImage: 'ShotPanelImage', primaryPanelAssetId: () => asset },
  './ShotImagePreview': { ShotImagePreview: 'ShotImagePreview' }
};
const loaded = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('apps/web/components/shot/ShotImageCell.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX }
}).outputText, { module: loaded, exports: loaded.exports, require: name => dependencies[name] });
const shot = { id: 'synthetic', production_id: 'synthetic-project', revision: 7, display_number: '001' };
const file = { name: 'synthetic.png' };
function change(disabled) {
  cursor=0;
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
(async()=>{
  asset='existing';
  const render=()=>{cursor=0;return loaded.exports.ShotImageCell({shot});};
  let view=render();view.props.children[1].props.onClick({stopPropagation(){}});view=render();
  view.props.children[0].props.onChange({target:{files:[file],value:''}});view=render();
  assert.equal(requests.length,1,'Replacing in an open preview must not upload before Lock');
  assert.equal(view.props.children[2].props.file,file);
  view.props.children[2].props.onHistoryRestored();view=render();assert.equal(view.props.children[2].props.file,null,'Acknowledged Undo discards an unlocked replacement');
  view.props.children[0].props.onChange({target:{files:[file],value:''}});view=render();
  view.props.children[2].props.onClose();view=render();
  assert.equal(view.props.children[2].props.file,null,'Closing discards the staged replacement');
  assert.equal(saves.length,0);
  view.props.children[1].props.onClick({stopPropagation(){}});view=render();
  view.props.children[0].props.onChange({target:{files:[file],value:''}});view=render();
  const framing={source:null,transform:{scale:1,aspect_ratio:'16:9'}};
  await view.props.children[2].props.onLock(framing);
  assert.equal(saves.length,1);assert.equal(saves[0].image,file);assert.equal(saves[0].framing,framing);
  console.log('Shot image upload guards, replacement cancel and explicit Lock save passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
