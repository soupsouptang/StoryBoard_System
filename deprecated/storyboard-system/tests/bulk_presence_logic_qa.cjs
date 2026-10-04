const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(require('node:path').join(__dirname, '../static/app.js'), 'utf8');
const code = source.slice(source.indexOf('function bulkColumnField('), source.indexOf('function filterShots('));
function fixture(column, type='text') {
  const handlers={};
  const elements={bulkActionBar:{},bulkValue:{value:'updated',checked:false,addEventListener(){}}};
  const c = {state:{bundle:{project:{fps:25},shots:[{id:'a',title:'A',scene:'old'},{id:'b',title:'B',scene:'old'},{id:'c',title:'C',scene:'old'}]}, selectedShotIds:new Set(['a','b']),bulkColumn:column},
    COLLAB_SYNC_FIELDS:['title','scene','shot_size','lens','description'], SHOT_SIZE_LENS_RECOMMENDATIONS:{全景:'35mm'},
    customTableFields:()=>[{key:'flag',field_type:type,label:'Flag',options:['a','b']}], tableColumnLabel:x=>x,escapeHtml:String,
    $: selector => elements[selector.slice(1)] ||= {addEventListener:(event,fn)=>handlers[selector.slice(1)]=fn},
    $$:()=>[],recordHistory:()=>{},syncDerivedTimeline:()=>{},renderProjectHeader:()=>{},renderCurrentView:()=>{},toast:()=>{},deleteSelectedShots:()=>{},markDirty:()=>{c.state.dirty=true;}
  };
  vm.createContext(c);
  // 切片区间之外的依赖：applyShotFieldMutation 定义在 bulkColumnField 之前，
  // slice 取不到，必须从源码原样抽出注入，否则 vm 上下文里 undefined。
  const __dep = source.slice(source.indexOf('function applyShotFieldMutation('), source.indexOf('window.applyShotFieldMutation'));
  vm.runInContext(__dep + '\n' + code, c); c.renderBulkActionBar();
  return {c,elements,handlers};
}
(async()=>{
  let f=fixture('scene'); await f.handlers.bulkApplyBtn();
  assert.deepEqual(Array.from(f.c.state.bundle.shots,s=>s.scene),['updated','updated','old']);
  assert.deepEqual(Array.from(f.c.state.bundle.shots,s=>s.title),['A','B','C']);
  assert.equal(f.c.state.dirty,true);
  f.elements.bulkValue.value='draft not applied';
  const oldHandler = f.handlers.bulkApplyBtn;
  f.c.renderBulkActionBar();
  assert.equal(f.handlers.bulkApplyBtn,oldHandler,'unchanged redraw retains the editor');
  assert.equal(f.elements.bulkValue.value,'draft not applied');
  assert.ok(!f.elements.bulkActionBar.innerHTML.includes('id="bulkField"'));
  f=fixture('description'); f.elements.bulkValue.value=''; await f.handlers.bulkApplyBtn();
  assert.equal(f.c.state.bundle.shots[0].description,'');
  f=fixture('custom:flag','boolean'); await f.handlers.bulkApplyBtn();
  assert.equal(f.c.state.bundle.shots[0].custom_fields.flag,false);
  f=fixture('custom:flag','number'); f.elements.bulkValue.value='0'; await f.handlers.bulkApplyBtn();
  assert.equal(f.c.state.bundle.shots[0].custom_fields.flag,0);
  f=fixture('duration'); f.elements.bulkValue.value='2.5'; await f.handlers.bulkApplyBtn();
  assert.equal(f.c.state.bundle.shots[0].duration_frames,63);
  f=fixture('number'); assert.equal(f.c.bulkColumnField('number'),null); assert.ok(!f.elements.bulkActionBar.innerHTML.includes('id="bulkApplyBtn"'));
  f=fixture('shot_size'); f.elements.bulkValue.value='全景'; await f.handlers.bulkApplyBtn();
  assert.equal(f.c.state.bundle.shots[0].lens,'35mm');
  const p={state:{presenceProjectId:'p'},presenceAppliedSequence:0,renderPresence: x=>p.people=x};
  vm.createContext(p);
  vm.runInContext(source.slice(source.indexOf('function applyPresenceResponse('),source.indexOf('async function sendPresenceHeartbeat(')),p);
  p.applyPresenceResponse('p',2,['new']); p.applyPresenceResponse('p',1,['old']);
  assert.deepEqual(p.people,['new']); p.applyPresenceResponse('other',3,[]); assert.deepEqual(p.people,['new']);
  let moves=0;
  class Node {
    constructor(tag='span') { this.tag=tag; this.children=[]; this.dataset={}; this.attrs={}; this.style={setProperty(){}}; this.classList={toggle(){}}; }
    setAttribute(k,v){this.attrs[k]=v;} getAttribute(k){return this.attrs[k];}
    get lastElementChild(){return this.children.at(-1);}
    querySelector(s){return this.children.find(x=>s.includes('data-presence-more') ? x.dataset.presenceMore : s==='img' ? x.tag==='img' : s.endsWith('span') ? x.tag==='span' : s.endsWith('i') ? x.tag==='i' : false);}
    remove(){if(this.parent){this.parent.children=this.parent.children.filter(x=>x!==this);this.parent=null;}}
    insertBefore(n,b){moves++;n.remove();const i=this.children.indexOf(b);this.children.splice(i<0?this.children.length:i,0,n);n.parent=this;}
    appendChild(n){this.insertBefore(n,null);} append(n){this.appendChild(n);}
    replaceChildren(n){this.children=[];if(n)this.appendChild(n);}
  }
  const cluster=new Node('div');
  const dom={state:{session:{user_id:'a'},context:'project',currentView:'table'},APP_CONTEXT:{PROJECT:'project'},VIEW_TITLES:{},
    window:{innerWidth:1000},document:{createElement:t=>new Node(t)},safePresenceColor:x=>x,
    $:s=>s==='#presenceCluster'?cluster:null,$$:(s,n)=>n.children.filter(x=>x.dataset.presenceUser)};
  vm.createContext(dom);
  vm.runInContext(source.slice(source.indexOf('function renderPresence('),source.indexOf("  const layer = $('#remotePresenceLayer');",source.indexOf('function renderPresence(')))+'}',dom);
  const people=['a','b','c','d','e'].map(user_id=>({user_id,display_name:user_id,color:'#123456'}));
  dom.renderPresence(people); const before=moves; const nodes=[...cluster.children];
  dom.renderPresence([...people].reverse());
  assert.equal(moves,before,'unchanged participants must not move avatar or +N nodes');
  assert.deepEqual(cluster.children,nodes);
  console.log('PASS bulk selected-column scope, clear, boolean, number, duration, read-only column, lens linkage; stale presence rejection');
})().catch(e=>{console.error(e);process.exitCode=1;});
