const { chromium } = require('playwright');
const path = require('path');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({headless:true, executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  try {
    const page = await browser.newPage({viewport:{width:1200,height:800},reducedMotion:'reduce'});
    await page.setContent('<body data-ui-version="7.3"><div id="host" style="margin:100px;width:260px">测试文本</div></body>');
    for (const file of ['styles.css','workspace-ux.css','creative-boards.css','vendor/liquid-glass.css','apple-workspace.css','workspace-v73.css','workspace-v73-views.css','workspace-flow.css','workspace-flow-pages.css','workspace-assets-v75.css','workspace-editor-v75.css','field-system.css']) await page.addStyleTag({path:path.resolve('static',file)});
    await page.addScriptTag({path:path.resolve('static/rich-text.js')});
    await page.evaluate(() => {
      document.body.insertAdjacentHTML('beforeend','<section id="fields"><input aria-label="普通输入"><input class="ffui-input" aria-label="React 输入"><input class="inline-cell-editor" aria-label="表格输入"><textarea class="property-inline-editor" aria-label="侧栏输入"></textarea><select aria-label="选择"><option>选项</option></select><input readonly value="只读"><input disabled value="禁用"></section>');
    });
    for (const field of await page.locator('#fields :is(input,textarea,select):not([readonly],[disabled])').all()) {
      await field.focus();
      const style = await field.evaluate(el => { const s=getComputedStyle(el);return {radius:s.borderRadius,border:s.borderTopWidth,color:s.borderTopColor,primary:getComputedStyle(document.documentElement).getPropertyValue('--primary').trim(),resize:s.resize}; });
      assert.equal(style.radius,'10px');
      assert.equal(style.border,'2px');
      assert.equal(style.color,'rgb(53, 108, 200)');
      if (await field.evaluate(el => el.tagName === 'TEXTAREA')) assert.equal(style.resize,'none');
    }
    const open = () => page.evaluate(() => { window.result='pending'; FrameForgeRichText.inline({element:document.querySelector('#host'),text:'测试文本'}).then(v => window.result=v); });
    await open();
    const host = page.locator('#host');
    await host.fill('新的测试文字');
    const box = await host.boundingBox();
    const toolbar = await page.locator('.rich-float-toolbar').boundingBox();
    assert(toolbar.y >= box.y + box.height, 'toolbar below input');
    await page.mouse.move(box.x+13, box.y+15);
    await page.mouse.down();
    await page.mouse.move(box.x+100, box.y+15,{steps:12});
    await page.mouse.up();
    assert(await page.evaluate(() => getSelection().toString().length > 1), 'native drag selection');
    assert.equal(await host.evaluate(el => getComputedStyle(el).boxShadow),'none');
    assert.equal(await page.getByRole('button',{name:'保存',exact:true}).count(),0);
    await host.press('Enter');
    assert.equal(await page.evaluate(() => result.text),'新的测试文字');
    await open();
    await host.fill('取消的文字');
    await host.press('Escape');
    assert.equal(await page.evaluate(() => result),null);
    assert.equal(await page.locator('.rich-float-toolbar').count(),0);
    for (const width of [1440,1280,1024,768,375]) {
      await page.setViewportSize({width,height:800});
      await open();
      const floating = await page.locator('.rich-float-toolbar').boundingBox();
      assert(floating.x >= 0 && floating.x + floating.width <= width, 'toolbar within viewport');
      await host.press('Escape');
    }
    console.log('PASS: placement, native drag selection, no rail, auto-save, Escape, cleanup, five viewport widths');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });
