const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const context = {URL, setTimeout, clearTimeout};
vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../static/creative-boards.js'),'utf8'),context);
const m = context.FrameForgeBoards.model;
const point = m.point({left:100,top:50,width:800,height:500},1600,1000,300,200);
assert.equal(point.x,400); assert.equal(point.y,300);
assert.equal(m.safeLink('javascript:alert(1)'),false);assert.equal(m.safeLink('https://example.com/a'),true);
assert.equal(m.safeLink('https://user:password@example.com'),false);
// 后端合同：只有灯光空间对象携带 z（离地高度），情绪板对象不得携带，否则 PUT 返回 400。
for(const type of ['note','color','link']) assert.equal('z' in m.newItem(type),false,`${type} 不应携带空间字段 z`);
for(const type of context.FrameForgeBoards.primitives) assert.ok('z' in m.newItem(type),`${type} 应携带 z`);
const light=m.newItem('light');m.setAttachment(light,'grid');assert.equal(light.beam_spread,40);
light.beam_custom=true;light.beam_spread=25;m.setAttachment(light,'umbrella');assert.equal(light.beam_spread,25);
// 光束轮廓：2026-09-18 起由「扇形」改为「梯形」（矢量插画风格，远端为直线收束边界）。
// 不变量：4 条直线段、无圆弧 A、光源端有宽度、远端宽度 ≥ 光源端（光锥扩散）。
const beam = m.conePath(light);
assert.match(beam, /^M0 -\d+(\.\d+)? L/, '梯形应从光源端上沿出发');
assert.equal((beam.match(/L/g) || []).length, 3, '梯形应为 4 顶点、3 条直线段');
assert.ok(!beam.includes('A'), '不应再使用扇形圆弧');
{
  const nums = beam.match(/-?\d+(\.\d+)?/g).map(Number);
  const srcW = Math.abs(nums[1]) * 2;              // M0 -w
  const endW = Math.abs(nums[4] - nums[6]);        // 远端两点 y 差
  assert.ok(endW >= srcW, `远端宽度(${endW})应不少于光源端(${srcW})`);
}
for(const type of ['table','chair','sofa','bed','cabinet','camera','actor','wall','door','window']) assert.ok(context.FrameForgeBoards.primitives.includes(type));
(async()=>{
  let saved={revision:0,boards:[]}, fail=false, pending=null;
  const api=async(path,options)=>{
    if(options.method==='GET')return structuredClone(saved);
    if(fail){const e=new Error('conflict');e.status=409;throw e;}
    if(pending)await pending;
    assert.equal(options.json.revision,saved.revision);
    saved={revision:saved.revision+1,boards:structuredClone(options.json.boards)};return structuredClone(saved);
  };
  const s=m.createSession('project',api);
  assert.equal(await s.flush(),true,'empty failed/loading view never traps navigation');
  await s.load();s.change(boards=>boards.push({...m.createLightingBoardRecord('Board'),id:'board',items:[light]}));
  assert.equal(await s.flush(),true);assert.equal(s.revision,1);
  s.travel(false);assert.equal(s.boards.length,0);s.travel(true);assert.equal(s.boards.length,1);
  await s.flush();
  let release;pending=new Promise(resolve=>release=resolve);
  s.change(boards=>boards[0].name='before');const writing=s.flush();
  s.change(boards=>boards[0].name='newer');release();assert.equal(await writing,false);
  pending=null;assert.equal(s.boards[0].name,'newer');await s.flush();assert.equal(saved.boards[0].name,'newer');
  fail=true;s.change(boards=>boards[0].name='conflicting draft');assert.equal(await s.flush(),false);assert.equal(s.conflict,true);
  assert.equal(s.boards[0].name,'conflicting draft');assert.equal(await s.load(),false);
  fail=false;await s.load(true);assert.equal(s.recovery.boards[0].name,'conflicting draft');assert.equal(s.boards[0].name,'newer');
  clearTimeout(s.timer);
  console.log('PASS canvas zoom geometry, assets, attachment presets, custom angle, undo/redo, save races, conflict draft and navigation');
})().catch(e=>{console.error(e);process.exitCode=1;});
