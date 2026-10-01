// Synthetic draft lifecycle: node tests/frontend/new-shot-row.cjs
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
let cursor = 0, effects = [], calls = [], done = 0, slots = [], storage = new Map();
const React = {
  createElement: (type, props, ...children) => ({type, props: props || {}, children: children.flat(Infinity)}),
  useState(initial) { const index = cursor++; if (!(index in slots)) slots[index] = initial; return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }]; },
  useRef(initial) { return slots[cursor++] ??= {current: initial}; },
  useEffect(effect, deps) { const index = cursor++; if (!slots[index] || deps.some((v,i) => !Object.is(v,slots[index][i]))) { slots[index] = deps; effects.push(effect); } }
};
const mod = {exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('apps/web/components/shot/NewShotRow.tsx','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText, {
  module:mod,exports:mod.exports,Error,
  localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)},
  require:name=>({'react':React,'@frameforge/ui':{Button:'Button',Input:'Input'},'@/components/storyboard/NewShotModal':{nextAvailableShotNumber:()=> '002'},'@/lib/hooks/useProduction':{useCreateShot:()=>({isPending:false,mutateAsync:async value=>{calls.push(value);}})}}[name])
});
let tree;
const render=()=> {cursor=0;effects=[];tree=mod.exports.NewShotRow({production:{id:'P',fps_num:24,fps_den:1},shots:[{display_number:'001'}],columns:['duration_frames','name'],customColumnCount:0,onDone:()=>done++});effects.forEach(effect=>effect());};
const find=(predicate,node=tree)=> {if (!node || typeof node !== 'object') return; if(predicate(node))return node;for(const child of node.children||[]){const match=find(predicate,child);if(match)return match;}};
const input=field=>find(node=>node.type==='Input' && node.props['aria-label'].includes(field));
const set=(field,value)=>{input(field).props.onChange({target:{value}});render();};
(async()=>{
  render(); input('镜号').props.onFocus(); set('镜号','999');
  const stale=input('镜号'); stale.props.onKeyDown({key:'Escape',stopPropagation(){},preventDefault(){},currentTarget:{blur:()=>stale.props.onBlur()}}); render();
  assert.equal(input('镜号').props.value,'');assert.equal(calls.length,0);
  input('镜号').props.onFocus();set('镜号','001');set('帧数','72');input('帧数').props.onBlur();await Promise.resolve();assert.equal(calls.length,0,'Duplicate mirror rejected');
  set('镜号','002');set('帧数','0');input('帧数').props.onBlur();await Promise.resolve();assert.equal(calls.length,0,'Invalid duration rejected');
  set('帧数','72');input('帧数').props.onBlur();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(calls.length,1);assert.equal(calls[0].display_number,'002');assert.equal(calls[0].duration_frames,72);assert.equal(done,1);assert.equal(storage.size,0);
  console.log('Incomplete/invalid draft, Escape cancellation and acknowledged creation passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
