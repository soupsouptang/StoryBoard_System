const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const c={};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../static/rich-text.js'),'utf8'),c);
const r=c.FrameForgeRichText;
let runs=r.apply([{text:'abcd'}],1,3,'bold',true);
assert.equal(runs.length,3);assert.equal(runs[1].text,'bc');assert.equal(runs[1].bold,true);
runs=r.apply(runs,2,4,'underline',true);
assert.equal(runs.map(x=>x.text).join(''),'abcd');assert.ok(r.html(runs,'abcd').includes('text-decoration:underline'));
assert.equal(r.normalize(runs,'new text')[0].text,'new text');
assert.ok(!r.html([{text:'<script>',bold:true,url:'javascript:x',size:999,highlight:'red'}],'<script>').includes('<script>'));
assert.ok(!r.html([{text:'x',bold:true,italic:true,size:24,highlight:'pink',underline:true}],'x',true).includes('font-weight'));
assert.ok(r.html([{text:'x',underline:true}],'x',true).includes('underline'));
assert.equal(r.apply(runs,0,4,'clear').length,1);
const app=fs.readFileSync(path.join(__dirname,'../static/app.js'),'utf8');
// push 参数顺序允许变化，只要求 rich_text_json 被注册进协同同步字段
assert.match(app,/COLLAB_SYNC_FIELDS\.push\([^)]*'rich_text_json'/);
assert.match(app,/shot\.rich_text_json/);
console.log('PASS structured formatting selection, merging, plain-text fallback, escaping, strict screenplay marks and history field registration');
