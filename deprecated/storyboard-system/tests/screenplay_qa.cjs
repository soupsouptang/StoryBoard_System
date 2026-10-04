/* Run: node tests/screenplay_qa.cjs [--browser]
 * --browser verifies real Chromium geometry and the resulting PDF page count in memory.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../static/screenplay.js'), 'utf8');
const context = {Intl, URL, location:{origin:'http://127.0.0.1:18795'}};
vm.runInNewContext(source, context);
const build = context.FrameForgeScreenplay.build;
let passed = 0;
function test(name, fn) { fn(); passed++; console.log(`PASS ${name}`); }
const decode = s => s.replace(/<[^>]*>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const lines = html => [...html.matchAll(/<div class="line ([^"]+)"[^>]*>(.*?)<\/div>/gs)].map(m => ({type:m[1], text:decode(m[2])}));
const pages = html => [...html.matchAll(/<section class="page ([^"]+)"[^>]*>(.*?)<\/section>/gs)].map(m => ({type:m[1], html:m[2]}));
const count = (html, pattern) => [...html.matchAll(pattern)].length;
const base = {project:{title:'Real title', author:'Real author', contact:'real@example.test'}, fields:['scene','script_scene_type','script_time_of_day','description','action','script_character','script_parenthetical','dialogue','voiceover','transition']};
const longSpeech = Array.from({length:1900}, (_, i) => `word${i}`).join(' ');
const longDoc = build({...base, shots:[{scene:'Room', script_scene_type:'INT.', script_time_of_day:'NIGHT', description:'An open door.', script_character:'ALEX', script_parenthetical:'quietly', dialogue:longSpeech, transition:'CUT TO:'}]});

test('standalone full document, static print button hook and deterministic output', () => {
  assert.match(longDoc, /^<!doctype html>/);
  assert.match(longDoc, /<button type="button" id="printBtn">/);
  assert.match(longDoc, /<script src="\/static\/print-preview.js" defer><\/script>/);
  assert.equal(build(), build());
  assert.equal(count(longDoc, /<script\b/g), 1);
  assert.throws(() => build({layout:'AFI-certified'}), /Unknown/);
});
test('escaping applies to metadata, text, runs, custom fields and image attributes', () => {
  const attack = '</title><script>alert("x")</script><img src=x onerror=alert(1)>&\'';
  const html = build({project:{title:attack, author:attack, contact:attack}, shots:[{action:attack, rich_text_json:{action:[{text:attack, underline:true}]}}], fields:['action']});
  assert.equal(count(html, /<script\b/g), 1);
  assert.equal(count(html, /<img\b/g), 0);
  assert.equal(lines(html).filter(l => l.type === 'action').map(l => l.text).join(''), attack);
  assert.ok(!html.includes('</title><script>alert'));
  const board = build({layout:'us-board', fields:['custom:note'], shots:[{id:'x', custom_fields:{note:attack}}], includeImages:true, mediaMap:{x:'/media/a"onerror="alert(1)'}});
  assert.match(board, /src="\/media\/a&quot;onerror=&quot;alert\(1\)"/);
  assert.equal(lines(board).map(l => l.text).join(''), 'note: ' + attack);
});
test('fields are a fail-closed allowlist; empty/null/omitted never reveal shot data', () => {
  const shot = {scene:'DELETED_SCENE', description:'DELETED_ACTION', dialogue:'DELETED_DIALOGUE', script_character:'DELETED_SPEAKER', id:'INTERNAL_ID', updated_at:'INTERNAL_DATE', rich_text_json:{dialogue:[{text:'STALE_RICH'}]}};
  for (const fields of [undefined, null, [], ['updated_at','id','rich_text_json','__proto__']]) {
    const html = build({shots:[shot], fields});
    assert.ok(!/DELETED_|INTERNAL_|STALE_RICH/.test(html));
    assert.equal(lines(html).length, 0);
  }
  assert.equal(lines(build({shots:[shot], fields:[{key:'dialogue'}, 'dialogue']})).filter(l => l.type === 'dialogue').map(l => l.text).join(''), shot.dialogue);
});
test('deleted scene components and speaker remain absent, dialogue retains blank cue', () => {
  const html = build({shots:[{scene:'Hidden room',script_scene_type:'INT.',script_time_of_day:'DAY',script_character:'Hidden speaker',dialogue:'Actual speech'}], fields:['dialogue']});
  assert.deepEqual(lines(html), [{type:'character',text:''},{type:'gap',text:''},{type:'dialogue',text:'Actual speech'}]);
  assert.ok(!/Hidden|INT\.|DAY|UNKNOWN|NARRATOR|CHARACTER #/.test(html));
  assert.equal(lines(build({shots:[{scene:'kitchen'}],fields:['scene']}))[0].text, 'KITCHEN');
});
test('actual scene components, character, parenthetical and transition format correctly', () => {
  const html = build({...base, shots:[{scene:'Kitchen', script_scene_type:'INT.', script_time_of_day:'day', script_character:'alex', script_parenthetical:'whispering', dialogue:'Hello.', transition:'cut to:'}]});
  const text = lines(html);
  assert.ok(text.some(l => l.type === 'scene' && l.text === 'INT. KITCHEN - DAY'));
  assert.ok(text.some(l => l.type === 'character' && l.text === 'ALEX'));
  assert.ok(text.some(l => l.type === 'parenthetical' && l.text === '(whispering)'));
  assert.ok(text.some(l => l.type === 'transition' && l.text === 'CUT TO:'));
});
test('long dialogue survives exactly and every screenplay page fits 54 line slots', () => {
  assert.equal(lines(longDoc).filter(l => l.type === 'dialogue').map(l => l.text).join(''), longSpeech);
  const script = pages(longDoc).filter(p => p.type === 'screenplay');
  assert.ok(script.length > 5);
  for (const page of script) assert.ok(lines(page.html).length <= 54);
  assert.ok(lines(longDoc).filter(l => l.type === 'dialogue').every(l => l.text.length <= 35));
});
test('cover and first screenplay page unnumbered; subsequent numbers start at 2', () => {
  const all = pages(longDoc);
  assert.equal(all[0].type, 'cover');
  assert.ok(!all[0].html.includes('page-number'));
  const script = all.filter(p => p.type === 'screenplay');
  script.forEach((page, i) => i ? assert.match(page.html, new RegExp(`class="page-number">${i+1}\\.`)) : assert.ok(!page.html.includes('page-number')));
  const empty = build({project:{owner:'NOT_AUTHOR',description:'NOT_CONTACT'}, shots:[]});
  assert.equal(pages(empty).length, 1);
  assert.ok(!empty.includes('NOT_'));
  assert.ok(!empty.includes('class="page cover"'));
});
test('short cues stay with their dialogue at page boundaries', () => {
  const html = build({fields:['action','script_character','script_parenthetical','dialogue'], shots:[{action:Array(50).fill('x').join('\n'),script_character:'ALEX',script_parenthetical:'quietly',dialogue:'One line.'}]});
  const all = pages(html);
  assert.equal(all.length, 2);
  assert.ok(!lines(all[0].html).some(l => l.type === 'character'));
  assert.ok(lines(all[1].html).some(l => l.type === 'character'));
  assert.ok(lines(all[1].html).some(l => l.type === 'dialogue'));
});
test('strict rich text preserves underline across pages and rejects stale rich text', () => {
  const plain = 'underlined '.repeat(400);
  const html = build({fields:['dialogue'], shots:[{dialogue:plain, rich_text_json:{dialogue:[{text:plain,underline:true,bold:true,italic:true,size:32,highlight:'pink'}]}}]});
  assert.equal(lines(html).filter(l => l.type === 'dialogue').map(l => l.text).join(''), plain);
  assert.ok(count(html, /<u>/g) > 50);
  assert.ok(!/font-weight:700|font-style:italic|font-size:32|<b>|<i>|background-color:/.test(html));
  const stale = build({fields:['action'], shots:[{action:'Current',rich_text_json:{action:[{text:'OLD SECRET',underline:true}]}}]});
  assert.ok(!stale.includes('OLD SECRET'));
  assert.equal(lines(stale)[0].text, 'Current');
});
test('optional RichText global is not required or trusted as raw HTML', () => {
  context.FrameForgeRichText = {html() {throw new Error('Should not require a DOM renderer');}};
  assert.equal(lines(build({fields:['action'],shots:[{action:'Safe'}]}))[0].text, 'Safe');
});
test('CJK, emoji, combining marks, hard breaks, tabs and long words preserve content', () => {
  const mixed = ('a ' + 'x'.repeat(33) + '中🙂e\u0301 家庭👨‍👩‍👧‍👦 ').repeat(120);
  const html = build({fields:['dialogue'],shots:[{dialogue:mixed}]});
  assert.equal(lines(html).filter(l => l.type === 'dialogue').map(l => l.text).join(''), mixed);
  for (const l of lines(html).filter(l => l.type === 'dialogue')) {
    const cells = Array.from(new Intl.Segmenter('en',{granularity:'grapheme'}).segment(l.text), x => /[中家庭\p{Extended_Pictographic}]/u.test(x.segment) ? 2 : 1).reduce((a,b) => a+b,0);
    assert.ok(cells <= 35, `overwide line: ${cells}`);
  }
  const hard = lines(build({fields:['action'], shots:[{action:'a\r\n\r\nb\tc\n'}]}));
  assert.deepEqual(hard.map(l => l.text), ['a','','b    c','']);
  const word = 'x'.repeat(10000);
  assert.equal(lines(build({fields:['action'],shots:[{action:word}]})).filter(l => l.type === 'action').map(l => l.text).join(''), word);
});
test('voiceover never invents a speaker and does not duplicate VO-only cues', () => {
  const html = build({fields:['voiceover'],shots:[{voiceover:'Real words'}]});
  assert.equal(lines(html).filter(l => l.type === 'character').map(l => l.text).join(''), '');
  assert.ok(!html.includes('(VO)'));
  const voiced = lines(build({fields:['voiceover','script_character'], shots:[{script_character:'Alex',voiceover:'Real words'}]}));
  assert.deepEqual(voiced.filter(l => l.type === 'character').map(l => l.text), ['ALEX (VO)']);
});
test('US board omits deleted/internal columns, preserves selected zero and blank values', () => {
  const html = build({layout:'us-board', fields:['number','duration','dialogue','id','updated_at'], shots:[{id:'SECRET_ID',number:0,duration:0,scene:'DELETED_SCENE',updated_at:'SECRET_DATE'}]});
  assert.ok(!/SECRET_|DELETED_|data-field="scene"/.test(html));
  assert.deepEqual(lines(html).map(l => l.text), ['Shot: 0','Duration: 0','Dialogue: ']);
  assert.match(html, /US production storyboard/);
  assert.ok(!/certified|certification|accepted/i.test(html));
});
const pixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=';
test('media requires explicit true and exact shot.id; screenplay never includes images', () => {
  const options = {layout:'us-board',shots:[{id:'a',number:1},{id:'b',number:2}],mediaMap:new Map([['a',pixel],[2,pixel]])};
  for (const includeImages of [undefined,false,1,'true']) assert.equal(count(build({...options,includeImages}), /<img\b/g),0);
  assert.equal(count(build({...options,includeImages:true}), /<img\b/g),1);
  assert.equal(count(build({...options,includeImages:true,layout:'screenplay'}), /<img\b/g),0);
  assert.equal(count(build({...options,includeImages:true,mediaMap:{a:pixel}}), /<img\b/g),1);
});
test('unsafe and remote image URLs produce blank frames', () => {
  for (const src of ['javascript:alert(1)','data:image/svg+xml,<svg/>','//evil.test/x','https://evil.test/x','/\\evil.test/x',' /media/x','file:///x']) {
    assert.equal(count(build({layout:'us-board',shots:[{id:'a'}],includeImages:true,mediaMap:{a:src}}),/<img\b/g),0,src);
  }
  for (const src of ['/media/a.png','http://127.0.0.1:18795/media/a.png','blob:http://127.0.0.1:18795/abc']) {
    assert.equal(count(build({layout:'us-board',shots:[{id:'a'}],includeImages:true,mediaMap:{a:src}}),/<img\b/g),1,src);
  }
});
test('long storyboard text continues in bounded panels with content retained', () => {
  const html = build({layout:'us-board',fields:['description'],shots:[{id:'a',description:longSpeech}],includeImages:true,mediaMap:{a:pixel}});
  assert.equal(lines(html).map(l => l.text).join(''), 'Description: ' + longSpeech);
  assert.ok(pages(html).length > 5);
  for (const p of pages(html)) assert.ok(lines(p.html).length <= 24);
  assert.equal(count(html,/<img\b/g),1);
});
test('metadata overflow continues on unnumbered cover sheets and inputs are immutable', () => {
  const title = 'Metadata '.repeat(500), contact = 'contact '.repeat(500);
  const options = {project:{title,author:'Writer',contact}, fields:['action'], shots:[{action:'Text'}]};
  const before = JSON.stringify(options), html = build(options);
  assert.equal(JSON.stringify(options), before);
  assert.equal(lines(html).filter(l => l.type === 'cover-text').map(l => l.text).join(''), title + 'Writer');
  assert.equal(lines(html).filter(l => l.type === 'contact').map(l => l.text).join(''), contact);
  for (const p of pages(html).filter(p => p.type === 'cover')) assert.ok(!p.html.includes('page-number'));
});

async function browserQA() {
  const {chromium} = require('playwright');
  let browser;
  const edge = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(p => fs.existsSync(p));
  browser = await chromium.launch({headless:true, ...(process.env.SCREENPLAY_BROWSER ? {executablePath:process.env.SCREENPLAY_BROWSER} : edge ? {executablePath:edge} : {})});
  try {
    const page = await browser.newPage();
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    const printScript = fs.readFileSync(path.join(__dirname,'../static/print-preview.js'),'utf8');
    let documentHTML = longDoc;
    await page.route('http://127.0.0.1:18795/**', route => route.fulfill({contentType:route.request().url().endsWith('/static/print-preview.js') ? 'application/javascript' : 'text/html', body:route.request().url().endsWith('/static/print-preview.js') ? printScript : documentHTML}));
    const specimens = [longDoc,
      build({fields:['dialogue'],shots:[{dialogue:('中🙂e\u0301 ' + 'x'.repeat(34)).repeat(300)}]}),
      build({layout:'us-board',fields:['description'],shots:[{description:longSpeech}]}),
      build({...base,shots:[]}),
      build({fields:['action'],shots:[{action:Array(108).fill('Exact full line').join('\n')} ]})];
    for (const html of specimens) {
      documentHTML = html;
      await page.goto('http://127.0.0.1:18795/preview');
      await page.emulateMedia({media:'print'});
      const geometry = await page.evaluate(() => {
        const problems = [];
        const pages = [...document.querySelectorAll('.page')];
        for (const p of pages) {
          const r = p.getBoundingClientRect();
          if (Math.abs(r.width - 816) > .1 || Math.abs(r.height - 1056) > .1) problems.push('non-Letter page');
          for (const line of p.querySelectorAll('.line')) {
            const box = line.getBoundingClientRect(), style = getComputedStyle(line);
            if (box.bottom > r.bottom - 96 + .2) problems.push('line crosses bottom margin');
            if (style.fontSize !== '16px' || style.fontWeight !== '400' || style.fontStyle !== 'normal') problems.push('non-strict font');
            const range = document.createRange(); range.selectNodeContents(line);
            for (const ink of range.getClientRects()) if (ink.right > r.right - 96 + .5 || ink.left < r.left + 144 - .5) problems.push('text crosses side margin');
          }
        }
        return {problems, count:pages.length, toolbar:getComputedStyle(document.querySelector('.toolbar')).display};
      });
      assert.deepEqual(geometry.problems, []);
      assert.equal(geometry.toolbar,'none');
      const pdf = await page.pdf({preferCSSPageSize:true,printBackground:true,displayHeaderFooter:false});
      const pdfPages = count(pdf.toString('latin1'), /\/Type\s*\/Page\b/g);
      assert.equal(pdfPages, geometry.count, 'PDF must contain exactly the explicit HTML pages, no extra blank pages');
    }
    await page.emulateMedia({media:'screen'});
    await page.evaluate(() => { window.print = () => { window.didPrint = true; }; });
    await page.locator('#printBtn').click();
    assert.equal(await page.evaluate(() => window.didPrint), true);
    assert.deepEqual(errors, []);
    passed++; console.log('PASS Chromium geometry, exact PDF page counts, same-origin preview print button');
  } finally { await browser.close(); }
}
(async () => { if (process.argv.includes('--browser')) await browserQA(); console.log(`PASS ${passed} screenplay export checks`); })().catch(e => { console.error(e); process.exitCode = 1; });
