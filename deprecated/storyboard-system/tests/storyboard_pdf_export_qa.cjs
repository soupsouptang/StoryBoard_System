const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const context = {Map, Date};
vm.createContext(context);
vm.runInContext(fs.readFileSync('static/storyboard-pdf-export.js', 'utf8'), context);
const shot = {id:'one', number:'001"', title:'<原始标题>', scene:'海港', description:'原始画面', voiceover:'旁白', duration_seconds:3};
const model = {project:{name:'<测试项目>', fps:25, aspect_ratio:'16:9'}, shots:[shot], includeImages:true,
  fields:['number','title','description','voiceover','methods','custom:cost']};
const rows = [{shot, values:{number:shot.number,title:shot.title,description:shot.description,
  voiceover:shot.voiceover,methods:'实拍','custom:cost':0},
  formatted:{title:'<strong>安全标题</strong>',description:'<em>富文本画面</em>',voiceover:'旁白'}}];
const labels = {number:'镜头',title:'标题',description:'画面描述',voiceover:'旁白',methods:'制作方式','custom:cost':'成本'};
const mediaMap = new Map([['one','data:image/png;base64,AAAA']]);
const build = layout => context.FrameForgePdfExport.build({layout,model,rows,labels,mediaMap});
const table = build('table');
assert.match(table, /<script src="\/print-preview\.js/);
assert.match(table, /@page\{size:A4 landscape/);
assert.match(table, /<strong>安全标题<\/strong>/);
assert.match(table, /<em>富文本画面<\/em>/);
assert.match(table, /<td>0<\/td>/);
assert.match(table, /data-shot="001&quot;"/);
assert.doesNotMatch(table, /<原始标题>|<测试项目>/);
const board = build('board');
assert.match(board, /<main class="board">/);
assert.match(board, /<em>富文本画面<\/em>/);
assert.match(board, /成本：<\/b>0/);
const detail = build('detail');
assert.match(detail, /<article class="detail">/);
assert.match(detail, /<strong>安全标题<\/strong>/);
assert.match(detail, /<em>富文本画面<\/em>/);
console.log('PASS PDF table, board and detail layout; print CSP script, rich text, custom field, image and escaping');
