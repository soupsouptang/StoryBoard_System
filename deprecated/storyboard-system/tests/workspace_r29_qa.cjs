const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const src = fs.readFileSync(require('node:path').join(__dirname, '../static/app.js'), 'utf8');
const part = (a,b) => src.slice(src.indexOf(a), src.indexOf(b,src.indexOf(a)));
async function settings() {
  let submitHandler, finish;
  const button = { disabled: false };
  const form = { dataset: { projectId: 'p' }, querySelector: () => button };
  const shots = [{ id: 's', title: 'local' }];
  const c = { state: { bundle: { project: { id: 'p', name: 'old' }, shots }, projects: [{id: 'p'}] },
    $: id => id === '#projectSettingsForm' ? { addEventListener: (_, fn) => submitHandler=fn } : { close() {} },
    FormData: class { *[Symbol.iterator]() { yield ['name','new']; yield ['fps','25']; yield ['target_seconds','30']; } },
    flushProjectBeforeLeaving: async () => true,
    api: () => new Promise(resolve => finish=resolve), syncDerivedTimeline() {}, renderProjectHeader() {}, renderCurrentView() {}, renderInspector() {}, renderProjectsGrid() {}, toast() {} };
  vm.createContext(c);
  vm.runInContext(part("$('#projectSettingsForm')?.addEventListener", "document.addEventListener('pointerdown', event => {\n  if (!event.target.closest('.project-collaboration-bar'))"), c);
  const task = submitHandler({preventDefault(){},currentTarget:form});
  await new Promise(resolve=>setImmediate(resolve));
  shots[0].title = 'edit while request pending';
  finish({project:{id:'p',name:'new'},shots:[{id:'s',title:'stale'}]});
  await task;
  assert.equal(c.state.bundle.shots, shots);
  assert.equal(shots[0].title,'edit while request pending');
  assert.equal(c.state.bundle.project.name,'new');
  assert.equal(button.disabled,false);
}
async function restore() {
  const c={state:{bundle:{project:{id:'p'},shots:[{id:'a',title:'new local'},{id:'c'}]},undoStack:[],redoStack:[],historyDeletedShots:new Map()}, structuredClone, queueMicrotask, COLLAB_SYNC_FIELDS:['title'], adoptServerBundle: structuredClone, markDirty(){}, renderProjectHeader(){},renderCurrentView(){},renderInspector(){},toast(){}};
  vm.createContext(c);
  vm.runInContext(part('function cloneShots(', 'function setSaveStatus('),c);
  vm.runInContext(part('function mergeRestoredShots(', 'async function openShotTrash('),c);
  const remote={project:{id:'p'},shots:[{id:'a',title:'stale'},{id:'b',title:'restored'},{id:'c'},{id:'foreign'}]};
  assert.equal(c.mergeRestoredShots(remote,['b']),true);
  await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(Array.from(c.state.bundle.shots,s=>s.id),['a','b','c']);
  assert.equal(c.state.bundle.shots[0].title,'new local');
  assert.equal(c.undoLastChange(),true);
  assert.deepEqual(Array.from(c.state.bundle.shots,s=>s.id),['a','c']);
  assert.equal(c.state.historyDeletedShots.has('b'),true);
  assert.equal(c.mergeRestoredShots({...remote,project:{id:'other'}},['b']),false);
}
(async()=>{await settings();await restore();console.log('PASS project settings preserve pending shot edits; scoped trash restore preserves edits/order and supports undo');})().catch(e=>{console.error(e);process.exitCode=1;});
