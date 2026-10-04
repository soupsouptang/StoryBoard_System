// Synthetic consumer regression: node tests/frontend/shot-detail-card.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const slots = [], listeners = new Set();
let cursor = 0, effects = [], tree;
const React = {
  useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }]; },
  useRef(initial) { return slots[cursor++] ??= { current: initial }; },
  useEffect(effect, deps) { const i = cursor++, old = slots[i]; if (!old || deps.some((value,j) => !Object.is(value, old.deps[j]))) effects.push(() => { old?.cleanup?.(); slots[i] = { deps, cleanup: effect() }; }); }
};
React.useLayoutEffect = React.useEffect;
const jsx = (type, props) => ({type, props: props || {}});
function load(file, deps = {}) {
  const module = {exports:{}};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText,
    {Error,module,exports:module.exports,require: name => deps[name] || require(name),URL:{createObjectURL: () => 'blob:synthetic',revokeObjectURL: () => {}},requestAnimationFrame: () => {},document:{querySelector: () => null},window:{addEventListener: (_,fn) => listeners.add(fn),removeEventListener: (_,fn) => listeners.delete(fn)}}, {filename:file});
  return module.exports;
}
const store = load('apps/web/stores/useWorkspaceStore.ts').useWorkspaceStore;
const presentation = load('apps/web/lib/shot-table-presentation.ts');
const fieldsModule = load('apps/web/lib/shot-detail-fields.ts', {'./shot-table-presentation': presentation});
let calls = [], resolve, reject;
const mutation = {isPending:false,mutateAsync: request => {calls.push(request); mutation.isPending = true; return new Promise((yes,no) => {resolve = value => {mutation.isPending=false;yes(value);};reject = error => {mutation.isPending=false;no(error);};});}};
const ui = Object.fromEntries(['Button','Input','TextArea','Select','Checkbox','Dialog','DialogContent','DialogTitle','DialogDescription','DialogFooter'].map(name => [name,name]));
ui.Icons = new Proxy({}, {get: (_,key) => key});
const {ShotDetailCard} = load('apps/web/components/shot/ShotDetailCard.tsx', {
  react:React,'react/jsx-runtime':{jsx,jsxs:jsx},'@frameforge/ui':ui,
  '@/stores/useWorkspaceStore':{useWorkspaceStore:store},
  '@/lib/hooks/useProduction':{useDeleteShot: () => ({isPending:false})},
  '@/lib/hooks/useShotDetail':{useSaveShotDetail: () => mutation},
  '@/lib/shot-detail-fields':fieldsModule,
  '@/lib/media-resolver':{getMethodLabel:v => v,getStatusBadge:v => ({label:v})},
  '@/lib/shot-display':{parseShotDuration:value => {const match=/^(\d+)(f|s)?$/.exec(value);if(!match) throw Error('invalid');return Number(match[1])*(match[2]==='f'?1:25);}},
  './ShotPanelImage':{ShotPanelImage:'ShotPanelImage'},'./ShotFeedbackDialog':{ShotFeedbackDialog:'ShotFeedbackDialog'}
});
let shot = {id:'A',production_id:'P',display_number:'001',revision:1,name:'原标题',duration_frames:75,timing_locked:false,primary_method:'live',secondary_methods:[]};
const fields = fieldsModule.shotDetailFields(['name','duration_frames','primary_method','panel_image','custom','hidden'],['name','duration_frames','primary_method','panel_image','custom'], {name:'镜头标题',custom:'备注',hidden:'隐藏'}, [{id:'F',column_key:'custom',field_type:'textarea',revision:4},{id:'H',column_key:'hidden',field_type:'text',revision:1}]);
const props = () => ({shot,production:{id:'P',fps_num:25,fps_den:1},fields,customValues:{F:'原备注',H:'不可修改'},sequences:[],height:240,canWrite:true,onClose:store.getState().closeInspector});
function render() {cursor=0;effects=[];tree=ShotDetailCard(props());const pending=effects;pending.forEach(fn => fn());cursor=0;effects=[];tree=ShotDetailCard(props());}
function find(predicate,node=tree) {if(!node || typeof node!=='object') return; if(predicate(node))return node;for(const child of [node.props?.children].flat(Infinity)){if(!child || typeof child!=='object')continue;const match=find(predicate,child);if(match)return match;}}
const button = label => find(node => node.type==='Button' && [node.props.children].flat().includes(label));
const edit = (label,value) => {find(node => node.props.label===label && typeof node.type==='function').props.onChange(value);render();};
const feedback = () => find(node => node.type==='ShotFeedbackDialog');
async function flush() {await new Promise(yes => setImmediate(yes));render();}
(async () => {
  store.getState().openInspector('A');render();
  assert.ok(find(node => node.props.hidden && node.props.type==='file'));
  assert.equal(find(node => node.props['aria-label']==='隐藏'),undefined,'Hidden fields are read-only, not disabled editors');
  const allMethods = () => find(node => node.props['aria-label']==='辅助制作方式全选');
  const methodOptions = fields.find(field => field.key==='primary_method').options;
  const method = option => find(node => node.props['aria-label']===`辅助制作方式：${option}`);
  assert.equal(methodOptions.length,10);
  assert.equal(allMethods().props.checked,false);
  allMethods().props.onCheckedChange(true);render();
  assert.equal(allMethods().props.checked,true);
  methodOptions.forEach(option => assert.equal(method(option).props.checked,true));
  method(methodOptions[0]).props.onCheckedChange(false);render();
  assert.equal(allMethods().props.checked,'indeterminate','Partial selection reflects mixed state');
  allMethods().props.onCheckedChange(true);render();
  methodOptions.forEach(option => assert.equal(method(option).props.checked,true));
  allMethods().props.onCheckedChange(false);render();
  methodOptions.forEach(option => assert.equal(method(option).props.checked,false));
  assert.equal(allMethods().props.checked,false);
  assert.equal(calls.length,0,'Select all remains a local draft until explicit Save');
  edit('镜头标题','临时');edit('镜头标题','原标题');
  button('取消').props.onClick();assert.equal(store.getState().isInspectorOpen,false,'Changing then reverting is clean');
  store.getState().openInspector('A');render();edit('镜头标题','新标题');edit('备注','新备注');
  const file = {name:'synthetic.png',size:100};
  find(node => node.props.type==='file').props.onChange({target:{files:[file],value:''}});render();
  assert.equal(calls.length,0,'Selecting a detail image must remain local until Save');
  store.getState().setFilter('searchQuery','new search');render();
  assert.equal(store.getState().filters.searchQuery,'','Filtering must not unmount a dirty draft');
  assert.equal(find(node => node.type==='Dialog').props.open,true);
  button('返回编辑').props.onClick();render();
  button('保存').props.onClick();render();
  assert.equal(calls.length,1);assert.equal(calls[0].image,file);assert.equal(calls[0].revision,1);
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0].changes)),{name:'新标题'});
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0].custom_values)),[{field_id:'F',field_revision:4,value:'新备注'}]);
  reject(Error('409 conflict'));await flush();
  assert.equal(feedback().props.message,'409 conflict');
  assert.equal(find(node => node.props.label==='镜头标题').props.value,'新标题','Conflict retains the draft');
  feedback().props.onClose();render();button('保存').props.onClick();
  shot={...shot,name:'新标题',revision:2};resolve(shot);await flush();
  assert.equal(store.getState().isInspectorOpen,true,'Acknowledged save remains expanded');
  assert.equal(feedback().props.message,'保存成功');
  feedback().props.onClose();render();
  const count = calls.length;button('保存').props.onClick();await flush();
  assert.equal(calls.length,count,'Repeated no-op save emits no command');
  feedback().props.onClose();render();edit('镜头标题','放弃');
  const escape=()=>listeners.forEach(fn=>fn({key:'Escape',defaultPrevented:false,preventDefault(){}}));
  escape();render();assert.equal(store.getState().isInspectorOpen,true);
  find(node=>node.type==='DialogContent' && node.props.onEscapeKeyDown).props.onEscapeKeyDown({preventDefault(){}});
  assert.equal(store.getState().isInspectorOpen,false,'Second Esc discards and closes');
  console.log('Detail draft, staged image, atomic payload, conflict, no-op, filter guard and discard checks passed.');
})().catch(error => {console.error(error);process.exitCode=1;});
