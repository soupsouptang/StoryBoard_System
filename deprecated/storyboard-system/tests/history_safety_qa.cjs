const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync(require('node:path').join(__dirname,'../static/app.js'),'utf8');
function setup(shots){
 const c={state:{bundle:{project:{id:'p'},shots},historyDeletedShots:new Map()},structuredClone,COLLAB_SYNC_FIELDS:['title','description','number','is_deleted']};
 for(const n of ['markDirty','renderProjectHeader','renderCurrentView','renderInspector'])c[n]=()=>{};
 vm.createContext(c);
 vm.runInContext(src.slice(src.indexOf('function applyHistorySnapshot('),src.indexOf('function undoLastChange(')),c);return c;
}
const old={id:'a',title:'old',description:'original'};
let before=[structuredClone(old)];before._after=[{...old,title:'mine'}];
let c=setup([{...old,title:'mine',description:'remote'},{id:'b',title:'remote new'}]);
assert.equal(c.applyHistorySnapshot(before),true);assert.equal(c.state.bundle.shots[0].title,'old');assert.equal(c.state.bundle.shots[0].description,'remote');assert.equal(c.state.bundle.shots[1].id,'b');assert.equal(c.state.historyDeletedShots.size,0);
c=setup([{...old,title:'remote newer'}]);assert.equal(c.applyHistorySnapshot(before),false);assert.equal(c.state.bundle.shots[0].title,'remote newer');
before=[{...old,panels:[{id:'panel',media_id:'old-image'}]}];before._after=[{...old,panels:[{id:'panel',media_id:'new-image'}]}];
c=setup(structuredClone(before._after));assert.equal(c.applyHistorySnapshot(before),true);assert.equal(c.state.bundle.shots[0].panels[0].media_id,'old-image');
before=[{id:'a'},{id:'b'}];before._after=[{id:'b'},{id:'a'}];
c=setup([{id:'b'},{id:'a'},{id:'c'}]);assert.equal(c.applyHistorySnapshot(before),false);assert.equal(c.state.historyOrder,undefined);
c=setup([{id:'b'},{id:'a'}]);assert.equal(c.applyHistorySnapshot(before),true);assert.deepEqual(Array.from(c.state.historyOrder.shotIds),['a','b']);
// flushProjectBeforeLeaving 引用的 ACTIVE_EDIT_SELECTOR 定义在切片区间之外；
// vm 脚本里的 const 不挂到 context 对象，必须作为 context 属性注入，否则函数内引用会 ReferenceError。
const __aes=(src.match(/const ACTIVE_EDIT_SELECTOR\s*=\s*'([^']+)'/)||[])[1]||'';
const leaving={state:{bundle:{project:{id:'p'}},dirty:true,pendingUploads:0},document:{activeElement:{blur(){}},querySelector:()=>null},shotReorderInFlight:false,saveProject:async()=>false,toast(){},setTimeout,ACTIVE_EDIT_SELECTOR:__aes};
vm.createContext(leaving);vm.runInContext('let creativeBoardsMount = null;'+src.slice(src.indexOf('async function flushCreativeBoards('),src.indexOf('function renderCreativeBoards('))+src.slice(src.indexOf('async function flushProjectBeforeLeaving('),src.indexOf('async function showDashboard(')),leaving);
(async()=>{assert.equal(await leaving.flushProjectBeforeLeaving(),false);assert.equal(leaving.state.bundle.project.id,'p');leaving.saveProject=async()=>{leaving.state.dirty=false;return true;};assert.equal(await leaving.flushProjectBeforeLeaving(),true);console.log('PASS history local-only inverse, remote additions/fields/order preserved, image undo, navigation save gate');})().catch(e=>{console.error(e);process.exitCode=1;});
