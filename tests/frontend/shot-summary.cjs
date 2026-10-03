// Synthetic project/visible statistics, using the actual filter and header consumers.
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const load = (path, requires = {}) => {
  const mod = {exports:{}};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText,
    {module:mod,exports:mod.exports,require:name=>{assert.ok(name in requires, name);return requires[name];},React,Error});
  return mod.exports;
};
const React = {createElement:(type, props, ...children)=>({type,props:props||{},children:children.flat(Infinity)})};
const display = load('apps/web/lib/shot-display.ts');
const timecode = load('packages/timecode/src/index.ts');
const defaults = {searchQuery:'',sequenceId:'all',primaryMethod:'all',department:'all',status:'all',timingLocked:null,vfxRequired:null};
let filters = {...defaults}, route='/production/P/shots';
let shots = [
  {id:'A',display_number:'001',name:'街道',duration_frames:26,primary_method:'live',secondary_methods:['ae'],department:'camera',status:'draft',timing_locked:true,sequence_id:null,vfx_required:false},
  {id:'B',display_number:'002',name:'人物',duration_frames:75,primary_method:'ae',department:'vfx',status:'ready',timing_locked:false,sequence_id:'S',vfx_required:true}
];
const values = {A:{F:'只在自定义字段出现',Z:0}};
assert.equal(display.sumShotDurationFrames(shots),101);
assert.equal(timecode.framesToTimecode(101,25), '00:00:04:01');
assert.equal(display.sumShotDurationFrames([]),0);
assert.equal(timecode.timecodeToFrames(timecode.framesToTimecode(1800,30000/1001,true),30000/1001),1800,'Drop-frame display preserves total frames');
assert.equal(display.filterShotsForView(shots,{...defaults,primaryMethod:'ae'},'table').length,2,'Secondary methods participate once');
assert.equal(display.filterShotsForView(shots,{...defaults,primaryMethod:'ae'},'storyboard').length,1,'Card primary-only filter preserved');
assert.equal(display.filterShotsForView(shots,{...defaults,sequenceId:'unassigned'},'storyboard')[0].id,'A');
assert.equal(display.filterShotsForView(shots,{...defaults,timingLocked:true,vfxRequired:false},'storyboard')[0].id,'A');
assert.equal(display.filterShotsForView(shots,{...defaults,searchQuery:'只在自定义'},'table',values)[0].id,'A');
assert.equal(display.filterShotsForView(shots,{...defaults,searchQuery:'0'},'table',values).length,2);
assert.equal(display.filterShotsForView(shots,{...defaults,department:'vfx',status:'ready'},'table')[0].id,'B');
const {ProductionShotSummary} = load('apps/web/components/shot/ProductionShotSummary.tsx', {
  'next/navigation':{usePathname:()=>route},'@frameforge/timecode':timecode,
  '@/lib/hooks/useProduction':{useShots:()=>({data:shots})},
  '@/lib/hooks/useCustomFields':{useCustomFieldValues:()=>({data:{values}})},
  '@/lib/shot-display':display,'@/stores/useWorkspaceStore':{useWorkspaceStore:select=>select({filters})}
});
const text = node => node == null || node === false ? '' : typeof node === 'object' ? (node.children||[]).map(text).join('') : String(node);
const production={id:'P',fps_num:25,fps_den:1,drop_frame:false,aspect_ratio:'16:9',shot_count:900,total_duration_frames:900};
const render=()=>text(ProductionShotSummary({production}));
assert.match(render(),/2 镜头.*总时长 00:00:04:01.*显示有效镜头时长 00:00:04:01/,'Active cache wins over stale metadata');
filters={...defaults,searchQuery:'街道'};
assert.match(render(),/总时长 00:00:04:01.*显示有效镜头时长 00:00:01:01/);
filters={...defaults,searchQuery:'不存在'};
assert.match(render(),/总时长 00:00:04:01.*显示有效镜头时长 00:00:00:00/);
filters={...defaults};shots=[...shots,{id:'C',duration_frames:1}];
assert.match(render(),/3 镜头.*总时长 00:00:04:02/,'Added shot changes total');
shots=shots.map(s=>s.id==='A'?{...s,duration_frames:50}:s);
assert.match(render(),/总时长 00:00:05:01/,'Duration edit changes total');
shots=shots.filter(s=>s.id!=='B');
assert.match(render(),/2 镜头.*总时长 00:00:02:01/,'Removed active shot changes total');
shots=[];assert.match(render(),/0 镜头.*总时长 00:00:00:00/);
shots=undefined;assert.match(render(),/900 镜头.*总时长 00:00:36:00.*显示有效镜头时长 —/,'Loading uses authoritative project summary without inventing visible zero');
const {ShotViewNavigation} = load('apps/web/components/shot/ShotViewNavigation.tsx', {
  'next/link':'Link','@frameforge/ui':{Button:'Button',Icons:{Table2:'Table2',Columns3:'Columns3',LayoutGrid:'LayoutGrid',ListVideo:'ListVideo'}}
});
for (const count of [0,106,9999]) assert.ok(text(ShotViewNavigation({productionId:'P',active:'table',count,displayedCount:0})).includes('总共 '+count+' 镜头（其中显示 0 镜头）'));
console.log('Project and visible frame totals: existing view filters, cache updates, empty and loading passed.');
