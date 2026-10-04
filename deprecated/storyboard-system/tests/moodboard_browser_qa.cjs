const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');

(async () => {
  const browser = await chromium.launch({headless:true, executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  const captures = [];
  try {
    const context = await browser.newContext({viewport:{width:1600,height:1100}});
    await context.addInitScript(() => localStorage.setItem('frameforge-show-qa-projects','1'));
    const base = process.env.MOOD_QA_URL;
    const login = await context.request.post(base+'/api/login', {data:{username:'cb-admin',password:'Contract2026!'}});
    assert.equal(login.status(),200);
    const {csrf} = await login.json();
    const created = await context.request.post(base+'/api/projects', {headers:{'X-CSRF-Token':csrf},data:{name:'Moodboard Persistence QA'}});
    assert.equal(created.status(),201);
    const bundle = await created.json(), pid = bundle.project.id;
    const page = await context.newPage();
    const dialogs = [], errors = [], shotWrites = [];
    page.on('dialog', async dialog => {dialogs.push(dialog.message()); await dialog.dismiss();});
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => {
      if (request.method() === 'PUT' && request.url().endsWith(`/api/projects/${pid}/shots`)) shotWrites.push(request);
    });
    page.on('response', async response => {
      if(response.request().method()==='PUT' && response.url().endsWith('/creative-boards')) {
        captures.push({status:response.status(), payload:response.request().postDataJSON(), response:await response.json()});
      }
    });
    await page.goto(base);
    const projectRow = page.locator('#projectGrid .project-row').filter({hasText:'Moodboard Persistence QA'});
    await projectRow.waitFor();
    await projectRow.click();
    await page.locator('[data-nav-key="moodboard"]').first().click();
    await page.getByRole('button',{name:'创建第一张画板',exact:true}).click();
    await page.waitForTimeout(2000);
    assert.equal(captures.length,1);
    if(process.env.MOOD_QA_REPRO==='1') {
      assert.equal(captures[0].status,400);
      console.log(JSON.stringify(captures,null,2));
      return;
    }
    assert.equal(captures[0].status,200);
    assert.equal(captures[0].response.revision,captures[0].payload.revision+1);
    assert.match(await page.locator('.ff-boards-status').innerText(),/已保存|已同步/);
    assert.deepEqual(Object.keys(captures[0].payload.boards[0]).sort(),['height','id','items','kind','name','shot_ids','width']);
    await page.waitForTimeout(2000);
    assert.equal(captures.length,1,'no repeated PUT loop');

    const waitForSave = async before => {
      const started = Date.now();
      while (captures.length <= before && Date.now() - started < 12000) await page.waitForTimeout(150);
      assert.ok(captures.length > before, 'edit should trigger a creative-boards save');
      while (Date.now() - started < 10000 && !/已保存|已同步/.test(await page.locator('.ff-boards-status').innerText())) await page.waitForTimeout(150);
      assert.equal(captures.at(-1).status,200);
    };
    const add = async label => {
      const before = captures.length;
      await page.locator('.ff-boards-floating button').filter({hasText:label}).click();
      await waitForSave(before);
    };
    await add('便签');
    let before = captures.length;
    await page.getByLabel('便签内容').fill('Persisted visual direction');
    await page.getByLabel('便签内容').press('Tab');
    await waitForSave(before);
    assert.ok(captures.at(-1).payload.boards[0].items.some(item=>item.type==='note'&&item.text==='Persisted visual direction'));
    await add('色卡');
    await add('链接');
    const link = page.getByLabel('链接地址（http/https）');
    before = captures.length;
    await link.fill('https://example.com/frameforge-reference');
    await link.press('Tab');
    await waitForSave(before);
    assert.ok(captures.at(-1).payload.boards[0].items.some(item=>item.type==='link'&&item.url==='https://example.com/frameforge-reference'));

    const upload = page.getByLabel('上传图片并加入画板');
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/a5sAAAAASUVORK5CYII=','base64');
    before = captures.length;
    await upload.setInputFiles({name:'moodboard-reference.png',mimeType:'image/png',buffer:png});
    await waitForSave(before);
    assert.ok(captures.at(-1).payload.boards[0].items.some(item=>item.type==='image'&&item.asset_id));

    await page.locator('.ff-boards-utilities summary').click();
    await page.getByRole('button',{name:'重命名画板'}).click();
    const boardName = page.getByLabel('画板名称');
    before = captures.length;
    await boardName.fill('Moodboard persistence checked');
    await boardName.press('Tab');
    await waitForSave(before);
    assert.ok(captures.at(-1).payload.boards[0].name==='Moodboard persistence checked');
    await page.locator('[data-nav-key="table"]').first().click();
    await page.locator('[data-nav-key="moodboard"]').first().click();
    assert.equal(dialogs.length,0,'switching away from Moodboard should not show a save error dialog');
    await page.reload();
    await page.locator('#projectGrid .project-row').filter({hasText:'Moodboard Persistence QA'}).click();
    await page.locator('[data-nav-key="moodboard"]').first().click();
    await page.getByLabel('画板名称').waitFor();
    assert.equal(await page.getByLabel('画板名称').inputValue(),'Moodboard persistence checked');
    assert.ok(await page.locator('.ff-boards-item').count() >= 4,'note, color, link and image survive reload');
    const shortcutText = 'Ctrl+S preserves the focused board draft';
    await page.locator('.ff-boards-item').first().focus();
    const noteEditor = page.getByLabel('便签内容');
    await noteEditor.fill(shortcutText);
    await page.evaluate(() => {
      state.bundle.shots[0].title = 'Unrelated local Shot draft';
      markDirty();
      clearTimeout(state.autoSaveTimer);
      state.autoSaveTimer = null;
    });
    const boardWritesBeforeShortcut = captures.length;
    const shotWritesBeforeShortcut = shotWrites.length;
    const shortcutAck = page.waitForResponse(response => response.request().method() === 'PUT' &&
      response.url().endsWith(`/api/projects/${pid}/creative-boards`));
    await noteEditor.press('Control+s');
    assert.equal((await shortcutAck).status(), 200, 'Canvas shortcut should save the Board');
    await waitForSave(boardWritesBeforeShortcut);
    assert.equal(captures.length, boardWritesBeforeShortcut + 1, 'one Board PUT per shortcut');
    assert.equal(shotWrites.length, shotWritesBeforeShortcut, 'Canvas shortcut must not save an unrelated Shot');
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), '便签内容', 'shortcut retains editor focus');
    assert.ok(captures.at(-1).payload.boards[0].items.some(item => item.type === 'note' && item.text === shortcutText));
    assert.equal(await page.evaluate(() => saveCurrentProjectManually()), true);
    await page.reload();
    await page.locator('#projectGrid .project-row').filter({hasText:'Moodboard Persistence QA'}).click();
    await page.locator('[data-nav-key="moodboard"]').first().click();
    await page.locator('.ff-boards-item').first().focus();
    assert.equal(await page.getByLabel('便签内容').inputValue(), shortcutText, 'Ctrl+S text survives immediate reload');
    const boardWritesBeforeCanvasShortcut = captures.length;
    const shotWritesBeforeCanvasShortcut = shotWrites.length;
    await page.locator('.ff-boards-floating button').filter({hasText:'便签'}).click();
    await page.evaluate(() => {
      state.bundle.shots[0].title = 'Second unrelated Shot draft';
      markDirty();
      clearTimeout(state.autoSaveTimer);
      state.autoSaveTimer = null;
    });
    assert.equal(await page.evaluate(() => document.activeElement === document.body), true, 'canvas action may leave focus on body');
    await page.keyboard.press('Control+s');
    await waitForSave(boardWritesBeforeCanvasShortcut);
    assert.equal(captures.length, boardWritesBeforeCanvasShortcut + 1, 'body-focused Canvas shortcut saves once');
    assert.equal(shotWrites.length, shotWritesBeforeCanvasShortcut, 'body-focused Canvas shortcut does not save Shot');
    assert.equal(await page.evaluate(() => saveCurrentProjectManually()), true);
    await page.locator('[data-nav-key="table"]').first().click();
    await page.evaluate(() => {
      state.bundle.shots[0].title = 'Global Shot shortcut still saves';
      markDirty();
      clearTimeout(state.autoSaveTimer);
      state.autoSaveTimer = null;
    });
    const globalShotAck = page.waitForResponse(response => response.request().method() === 'PUT' &&
      response.url().endsWith(`/api/projects/${pid}/shots`));
    await page.keyboard.press('Control+s');
    assert.equal((await globalShotAck).status(), 200, 'global shortcut should still save a Shot outside Canvas');
    assert.equal(dialogs.length,0,'leaving and returning to Moodboard should not show a save error dialog');
    assert.deepEqual(errors,[],'Moodboard flow should not raise page errors');
    for (const {payload} of captures) for (const savedBoard of payload.boards) {
      assert.deepEqual(Object.keys(savedBoard).sort(),['height','id','items','kind','name','shot_ids','width']);
      assert.ok(!('schemaVersion' in savedBoard || 'version' in savedBoard || 'objects' in savedBoard || 'environment' in savedBoard || 'settings' in savedBoard));
    }
    console.log('PASS moodboard persistence, focused Ctrl+S Board save, and global Shot shortcut');
  } finally {
    if(process.env.MOOD_QA_REPORT) fs.writeFileSync(process.env.MOOD_QA_REPORT,JSON.stringify(captures,null,2));
    await browser.close();
  }
})().catch(error => {console.error(error);process.exitCode=1;});
