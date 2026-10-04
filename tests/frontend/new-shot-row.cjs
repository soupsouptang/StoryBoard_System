// Synthetic new shot dialog lifecycle: node tests/frontend/new-shot-row.cjs
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
let cursor = 0, calls = [], slots = [], open = true;
const React = {
  createElement: (type, props, ...children) => ({type, props: props || {}, children: children.flat(Infinity)}),
  useState(initial) { const index = cursor++; if (!(index in slots)) slots[index] = initial; return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }]; }
};
const resolver = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('apps/web/lib/media-resolver.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, { module: resolver, exports: resolver.exports });
const ui = Object.fromEntries(['Button','Dialog','DialogContent','DialogDescription','DialogFooter','DialogHeader','DialogTitle','Field','Input','Select','TextArea'].map(name=>[name,name]));
ui.Icons = new Proxy({}, {get: (_,name)=>name});
const mod = {exports:{}};
const display = {exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('apps/web/lib/shot-display.ts','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText, {module:display,exports:display.exports,Error});
const parse = display.exports.parseShotDuration;
for (const [value, frames] of [['25',625],['25f',25],['25s',625],['1.5',38],['.5',13],['0.1',3],['2m',3000],['1h',90000],['1.5s',38],['1.5m',2250],['0.5h',45000],[' 2 M ',3000]]) assert.equal(parse(value,25),frames);
assert.equal(parse('1s',30000/1001),30);
assert.equal(parse('1',30000/1001),30);
for (const value of ['', '0', '-2s', '2.5f', '1e3', '2x', '25seconds', 'Infinity', '1h30m', '999999999999999999h']) assert.throws(()=>parse(value,25));
vm.runInNewContext(ts.transpileModule(fs.readFileSync('apps/web/components/storyboard/NewShotModal.tsx','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText, {
  module:mod,exports:mod.exports,Error,BigInt,
  require:name=>({'@/lib/media-resolver':resolver.exports,'react':React,'@frameforge/ui':ui,'@/lib/shot-display':display.exports,'@/stores/useWorkspaceStore':{useWorkspaceStore:()=>({isNewShotModalOpen:open,setNewShotModalOpen:value=>{open=value;}})},'@/lib/hooks/useProduction':{useCreateShot:()=>({isPending:false,mutateAsync:async value=>{calls.push(value);}})}}[name])
});
let tree;
const render=()=> {cursor=0;tree=mod.exports.NewShotModal({production:{id:'P',fps_num:24,fps_den:1},sequences:[],nextNumber:'002',existingNumbers:['001']});};
const find=(predicate,node=tree)=> {if (!node || typeof node !== 'object') return; if(predicate(node))return node;for(const child of node.children||[]){const match=find(predicate,child);if(match)return match;}};
const input=field=>find(node=>node.type==='Input' && (node.props['aria-label']||'').includes(field));
const set=(field,value)=>{input(field).props.onChange({target:{value}});render();};
const openDialog=()=>{open=true;render();find(node=>node.type==='DialogContent').props.onOpenAutoFocus();render();};
const escape=()=>find(node=>node.type==='DialogContent').props.onEscapeKeyDown({preventDefault(){}});
const submit=()=>find(node=>node.type==='form').props.onSubmit({preventDefault(){}});
(async()=>{
  openDialog(); assert.equal(input('镜号').props.value,'002'); assert.equal(input('镜号').props.readOnly,true);
  assert.equal(input('帧数').props.value,'3s');
  set('帧数','2m');set('分镜图框','16:9');
  escape(); assert.equal(open,false); assert.equal(calls.length,0,'Escape does not submit');
  openDialog();assert.equal(input('帧数').props.value,'3s');assert.equal(input('分镜图框').props.value,'','Cancelled inputs do not return');
  set('帧数','0');await submit(); assert.equal(calls.length,0,'Invalid duration rejected');
  set('帧数','2m');set('分镜图框','16:9');await submit();
  assert.equal(calls.length,1);assert.equal(calls[0].display_number,undefined);assert.equal(calls[0].duration_frames,2880);assert.equal(calls[0].panel_frame,'16:9');assert.equal(open,false);
  openDialog();set('帧数','25');await submit();
  assert.equal(calls.length,2);assert.equal(calls[1].duration_frames,600,'Bare number submits seconds converted at production fps');assert.equal(open,false);
  assert.equal(mod.exports.nextAvailableShotNumber(['001','010']), '011');
  console.log('Centered new shot: units, auto number, invalid input, Escape discards draft and explicit creation passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
