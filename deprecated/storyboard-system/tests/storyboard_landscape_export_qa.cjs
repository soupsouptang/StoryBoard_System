const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const context = { Date, Map };
vm.createContext(context);
vm.runInContext(fs.readFileSync('static/storyboard-landscape-export.js', 'utf8'), context);
const html = context.FrameForgeLandscapeExport.build({
  project: {name:'测试 <项目>', aspect_ratio:'16:9', fps:25},
  shots:[
    {id:'a',number:'001',tc_in:'01:00:00:00',duration_seconds:3,title:'港口',description:'巨轮与 <桥吊>',voiceover:'旁白一',shot_size:'大全景',movement:'推'},
    {id:'b',number:'002',description:'第二镜',dialogue:'对白二'}
  ],
  mediaMap:new Map([['a','data:image/png;base64,AAAA']]),
  fields:['number','tc','duration','title','description','voiceover','dialogue','shot_size','movement']
});
assert.match(html, /@page \{ size: A4 landscape/);
assert.match(html, /aspect-ratio: 16 \/ 9/);
assert.equal((html.match(/class="shot-row"/g)||[]).length, 2);
assert.match(html, /data:image\/png;base64,AAAA/);
assert.match(html, /16:9 分镜图框/);
assert.match(html, /巨轮与 &lt;桥吊&gt;/);
assert.doesNotMatch(html, /<桥吊>/);
assert.match(html, /对白二/);
assert.match(html, /声音与文字/);
assert.match(html, /class="shot-groups"/);
assert.doesNotMatch(html, /执行方式/);
assert.match(html, /print-preview\.js/);
const denseHtml = context.FrameForgeLandscapeExport.build({
  shots:[{id:'dense',number:'003',description:'长'.repeat(750),voiceover:'旁白',music:'配乐',equipment:'摄影机',director_notes:'导演备注'}],
  fields:['description','voiceover','music','equipment','director_notes']
});
assert.match(denseHtml, /shot-row-long/);
assert.match(denseHtml, /执行与备注/);
assert.match(denseHtml, /配乐/);
console.log('PASS landscape storyboard HTML, 16:9 frames, print size and escaped fields');
