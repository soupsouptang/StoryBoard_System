const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../static');
(async()=>{
 const executablePath=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync);
 const browser=await chromium.launch({headless:true,executablePath});
 try {
  const page=await browser.newPage();
  await page.setContent('<html data-theme="dark"><body><div class="workspace-view-tabs"><button>表格</button></div><dialog class="standard-dialog rich-editor-dialog"><form class="rich-editor-form"><header class="dialog-head"><h2>编辑文本</h2></header><div class="rich-toolbar"><button>粗体</button><select><option>字号</option></select></div><div class="rich-editor-surface" contenteditable="true">Example text</div><footer><button class="btn btn-primary">保存</button></footer></form></dialog><div class="ff-boards"><input type="range"><input type="color"><input type="file"><select><option>附件</option></select></div></body></html>');
  for(const file of ['styles.css','workspace-ux.css','creative-boards.css','vendor/liquid-glass.css','apple-workspace.css']) await page.addStyleTag({content:fs.readFileSync(path.join(root,file),'utf8')});
  await page.addScriptTag({content:fs.readFileSync(path.join(root,'apple-workspace.js'),'utf8')});
  for(const theme of ['dark','light']) {
   await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
   const results=await page.evaluate(()=>{
    const s=getComputedStyle(document.documentElement),v=n=>s.getPropertyValue(n).trim();
    const rgb=h=>h.replace('#','').match(/../g).map(x=>parseInt(x,16));
    const lum=h=>rgb(h).map(c=>{c/=255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;}).reduce((a,c,i)=>a+c*[.2126,.7152,.0722][i],0);
    const contrast=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
    return {neutral:['--ux-canvas','--ux-navigation','--ux-surface','--ux-surface-low','--ux-surface-high'].every(n=>new Set(rgb(v(n))).size===1),
      ratios:['--ux-surface','--ux-surface-low','--ux-surface-high','--ux-selection'].flatMap(n=>['--ux-ink','--ux-muted'].map(t=>contrast(v(n),v(t)))),
      primary:contrast(v('--btn-primary-bg'),'#ffffff'),glass:document.querySelector('.workspace-view-tabs').classList.contains('liquid-glass')};
   });
   assert.ok(results.neutral,theme+' neutral surfaces');assert.ok(results.glass);
   const font=await page.locator('body').evaluate(e=>getComputedStyle(e).fontFamily);
   assert.ok(font.startsWith('Satoshi'),font);assert.ok(font.includes('Sarasa Gothic SC'),font);
   assert.ok(results.ratios.every(r=>r>=4.5),theme+' text contrast '+results.ratios);assert.ok(results.primary>=4.5);
  }
  await page.evaluate(()=>document.body.dataset.effects='reduced');
  assert.equal(await page.locator('.workspace-view-tabs').evaluate(e=>getComputedStyle(e).backdropFilter),'none');
  await page.setViewportSize({width:320,height:640});await page.locator('dialog').evaluate(e=>e.showModal());
  const overflow=await page.locator('dialog').evaluate(e=>({width:e.getBoundingClientRect().width,overflow:e.scrollWidth-e.clientWidth}));
  assert.ok(overflow.width<=320);assert.ok(overflow.overflow<=1,JSON.stringify(overflow));
  await page.locator('.rich-editor-surface').focus();
  assert.equal(await page.locator('.rich-editor-surface').evaluate(e=>getComputedStyle(e).outlineStyle),'solid');
  console.log('PASS neutral surfaces, light/dark text contrast >=4.5, blue button contrast, glass wiring, reduced transparency, 320px dialog overflow and focus');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
