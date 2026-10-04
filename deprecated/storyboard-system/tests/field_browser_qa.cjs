const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  try {
    const context = await browser.newContext({viewport:{width:1440,height:1000}});
    await context.addInitScript(() => localStorage.setItem('frameforge-show-qa-projects','1'));
    const login = await context.request.post(process.env.FIELD_QA_URL+'/api/login',{data:{username:'qa-admin',password:'FrameForge2026!QA'}});
    assert.equal(login.status(),200);
    const page = await context.newPage();
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(process.env.FIELD_QA_URL);
    await page.locator('#projectGrid .project-row').filter({hasText:'Editor Actions QA'}).click();
    await page.evaluate(async () => { document.querySelector('#customFieldsModal').showModal(); await renderProConfig(); });
    const customForm = page.locator('#customFieldForm');
    const createOptions = customForm.locator('.custom-options-field');
    assert.equal(await createOptions.isHidden(), true, 'text field hides option list');
    await customForm.locator('[name="field_type"]').selectOption('select');
    assert.equal(await createOptions.isVisible(), true, 'select field shows option list');
    await customForm.locator('[name="options"]').fill('待定, 已确认');
    await customForm.locator('[name="field_type"]').selectOption('text');
    assert.equal(await createOptions.isHidden(), true, 'switching to text hides option list');
    await customForm.locator('[name="label"]').fill('字段安全测试');
    await customForm.locator('[name="key"]').fill('field_safety_test');
    await customForm.locator('button[type="submit"]').click();
    const editField = page.locator('#customFieldsList .custom-field-row').filter({hasText:'字段安全测试'});
    await editField.waitFor();
    await editField.locator('[data-edit-field]').click();
    assert.equal(await page.locator('#customFieldEditForm [name="key"]').isEnabled(), true);
    assert.equal(await page.locator('#customFieldEditForm [name="key"]').evaluate(el=>el.readOnly), true, 'existing field key is read only');
    assert.equal(await page.locator('#customFieldEditForm .custom-options-field').isHidden(), true);
    await page.locator('#customFieldEditForm [name="field_type"]').selectOption('select');
    assert.equal(await page.locator('#customFieldEditForm .custom-options-field').isVisible(), true);
    await page.locator('#customFieldEditForm button[aria-label="关闭窗口"]').click();
    await page.locator('#customFieldsModal').evaluate(el=>el.close());
    const multilineResult = await page.evaluate(async () => {
      const promise = openFieldEditor('字段多行保存 QA', '第一行', true);
      const editor = document.querySelector('#fieldEditorInput');
      editor.focus();
      editor.setSelectionRange(editor.value.length, editor.value.length);
      editor.dispatchEvent(new KeyboardEvent('keydown', {key:'Enter',bubbles:true}));
      const remainsOpen = document.querySelector('#fieldEditorModal').open;
      editor.value += '\n第二行';
      editor.dispatchEvent(new KeyboardEvent('keydown', {key:'Enter',ctrlKey:true,bubbles:true}));
      return {remainsOpen, saved:await promise};
    });
    assert.equal(multilineResult.remainsOpen, true, 'plain Enter keeps multiline editor open');
    assert.equal(multilineResult.saved, '第一行\n第二行');
    const chapter = page.locator('#mainShotTable td[data-field="chapter"]').first();
    await chapter.dblclick();
    const input=chapter.locator('input');
    await input.fill('序章/数字化概念');
    const appearance=await input.evaluate(el=>{const s=getComputedStyle(el);return {radius:s.borderRadius,border:s.borderTopWidth,shadow:s.boxShadow};});
    if(appearance.radius!=='10px') console.log(await input.evaluate(el=>{const found=[];function walk(rules){for(const r of rules){if(r.cssRules)walk(r.cssRules);if(r.selectorText&&r.style?.borderRadius){try{if(el.matches(r.selectorText))found.push(r.cssText);}catch{}}}}for(const sheet of document.styleSheets)walk(sheet.cssRules);return found;}));
    assert.equal(appearance.radius,'10px');
    assert.equal(appearance.border,'2px');
    assert.equal(appearance.shadow,'none');
    await input.press('Enter');
    await chapter.dblclick();
    await chapter.locator('input').press('Escape');
    const inspector = page.locator('#inspectorSlot');
    await page.locator('.inspector-toggle:visible').click();
    await assert.equal(await inspector.isVisible(), true);
    await chapter.dblclick();
    assert.equal(await inspector.isVisible(), true, 'editing a cell preserves an open sidebar');
    await page.locator('#inspCloseBtn').click();
    assert.equal(await inspector.isVisible(), false, 'explicit close hides the sidebar');
    const description=page.locator('#mainShotTable td[data-field="description"]').first();
    await description.dblclick();
    const editor=description.locator('[contenteditable=true]');
    await editor.fill('长文本测试，中文内容应当自然换行。'.repeat(12));
    await editor.press('Enter');
    assert.equal(await page.locator('.rich-float-toolbar').count(),0);
    const peerContext=await browser.newContext({viewport:{width:1440,height:1000}});
    await peerContext.addInitScript(() => localStorage.setItem('frameforge-show-qa-projects','1'));
    const peerLogin=await peerContext.request.post(process.env.FIELD_QA_URL+'/api/login',{data:{username:'field-peer',password:'FrameForge2026!QA'}});
    assert.equal(peerLogin.status(),200);
    const peer=await peerContext.newPage();
    await peer.goto(process.env.FIELD_QA_URL);
    await peer.locator('#projectGrid .project-row').filter({hasText:'Editor Actions QA'}).click();
    const peerChapter=peer.locator('#mainShotTable td[data-field="chapter"]').first();
    await peerChapter.dblclick();
    const peerBox=await peerChapter.boundingBox();
    await peer.mouse.move(peerBox.x+15,peerBox.y+15);
    try {
      await page.waitForFunction(() => document.querySelector('.multiplayer-cell') && document.querySelector('.multiplayer-row'), null, { timeout: 8000 });
    } catch (error) {
      const local = await page.evaluate(() => ({
        view: state.view.current,
        activeShotId: state.selection.activeShotId,
        people: state.presence.map(({ user_id, shot_id, field, presence_state, workspace, status }) => ({ user_id, shot_id, field, presence_state, workspace, status })),
        cells: document.querySelectorAll('#mainShotTable td[data-field="chapter"]').length,
        layer: document.querySelector('.multiplayer-layer')?.innerHTML.slice(0, 300)
      }));
      const remote = await peer.evaluate(() => ({ view: state.view.current, selection: state.selection.activeShotId, field: FrameForgePresenceUI?.selection?.() }));
      throw new Error(`${error.message}; local=${JSON.stringify(local)}; remote=${JSON.stringify(remote)}`);
    }
    assert.equal(await page.locator('.remote-presence-cursor[data-presence-user="field-qa-peer"].is-visible').count(), 1, 'table cursor follows the table-relative pointer');
    assert.equal(await page.locator('.multiplayer-cell.is-editing').count(), 1, 'editing field has a live collaborator outline');
    console.log('PASS: two independent users, table-relative cursor, field outline and row avatar');
    await peerChapter.locator('input').press('Escape');
    await peerContext.close();
    for(const key of ['script','review','assets','lighting','moodboard']) {
      const nav=page.locator(`[data-nav-key="${key}"]`);
      if(await nav.count()) {
        await nav.first().click();
        const mismatches=await page.locator('input:not([type=checkbox],[type=radio],[type=range],[type=color],[type=hidden],[type=file]),textarea,select').evaluateAll(els=>els.filter(el=>el.getClientRects().length).map(el=>({label:el.getAttribute('aria-label')||el.name||el.className,radius:getComputedStyle(el).borderRadius,height:getComputedStyle(el).minHeight})).filter(s=>s.radius!=='10px'));
        console.log('Opened',key,'field exceptions',JSON.stringify(mismatches));
      }
    }
    assert.deepEqual(errors,[]);
    console.log('PASS: live table chapter typing/commit/Escape, rich long text, toolbar cleanup, navigation smoke');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
