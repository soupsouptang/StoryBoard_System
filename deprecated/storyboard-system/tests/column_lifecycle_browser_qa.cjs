const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const base = process.env.COLUMN_QA_URL;
  const browser = await chromium.launch({headless:true});
  try {
    const context = await browser.newContext({viewport:{width:1440,height:900}});
    await context.addInitScript(() => localStorage.setItem('frameforge-show-qa-projects','1'));
    const login = await context.request.post(`${base}/api/login`, {
      data:{username:'qa-admin',password:'FrameForge2026!QA'}
    });
    assert.equal(login.status(),200);
    const {csrf} = await login.json();
    const created = await context.request.post(`${base}/api/projects`, {
      headers:{'X-CSRF-Token':csrf}, data:{name:'Column Lifecycle QA'}
    });
    assert.equal(created.status(),201);
    const pid = (await created.json()).project.id;
    const staleView = await context.request.post(`${base}/api/projects/${pid}/saved-views`, {
      headers:{'X-CSRF-Token':csrf}, data:{name:'旧视图',view_type:'table',config:{table_prefs:{
        order:['description','title'], archived:['voiceover'], removed:['voiceover'], purged:['title']
      }}}
    });
    assert.equal(staleView.status(),201);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror',error=>errors.push(error.message));
    page.on('dialog',dialog=>dialog.accept());
    await page.goto(base);
    await page.locator('#projectGrid .project-row').filter({hasText:'Column Lifecycle QA'}).click();
    await page.locator('#mainShotTable td[data-field="description"]').first().waitFor();
    const trigger = page.locator('[data-frameforge-column-manager-trigger="canonical"]');
    await trigger.waitFor({timeout:5000});
    await trigger.click();
    const panel = page.locator('#columnSettingsPopover:not(.hidden)');
    await panel.waitFor();
    await page.waitForTimeout(220);
    const artifacts = path.join(__dirname,'../qa-artifacts/field-lifecycle');
    fs.mkdirSync(artifacts,{recursive:true});
    await page.screenshot({path:path.join(artifacts,'column-manager-1440.png')});
    await panel.getByRole('button',{name:/当前列/}).waitFor();
    await panel.locator('[data-column-action="archive"][data-column-field="description"]').click();
    await panel.locator('[data-column-scope="archived"][aria-pressed="true"]').waitFor();
    assert.equal(await page.locator('#mainShotTable td[data-field="description"]').count(),0);
    await panel.locator('[data-column-action="restore-archive"][data-column-field="description"]').click();
    await page.locator('#mainShotTable td[data-field="description"]').first().waitFor();
    await panel.locator('[data-column-action="archive"][data-column-field="description"]').click();
    await panel.locator('[data-column-scope="archived"][aria-pressed="true"]').waitFor();
    await panel.locator('[data-column-action="purge"][data-column-field="description"]').click();
    await page.locator('#confirmActionModal[open]').waitFor();
    await page.locator('#confirmActionModal').getByRole('button',{name:'确认'}).click();
    await page.waitForFunction(() => window.state.tablePrefs.purged?.includes('description'));
    // The real saved-view action must apply display options without replacing
    // the project lifecycle, even when its old config contains bogus tombstones.
    await page.keyboard.press('Escape');
    await page.getByRole('button',{name:'更多工具'}).click();
    await page.getByRole('menuitem',{name:'保存视图配置'}).click();
    await page.locator('#savedViewsList [data-apply-view]').filter({hasText:'旧视图'}).click();
    assert.equal(await page.locator('#mainShotTable th[data-column="description"]').count(),0);
    assert.ok(await page.locator('#mainShotTable th[data-column="title"]').count());
    assert.ok(await page.locator('#mainShotTable th[data-column="voiceover"]').count());
    await page.evaluate(pid => {
      for (const key of Object.keys(localStorage).filter(key=>key.startsWith(`frameforge-table-prefs:${pid}:`))) {
        localStorage.setItem(key,JSON.stringify({order:['description','title'],purged:['title'],archived:['voiceover'],removed:['voiceover']}));
      }
    },pid);
    await page.reload();
    await page.locator('#projectGrid .project-row').filter({hasText:'Column Lifecycle QA'}).click();
    await page.locator('#mainShotTable').waitFor();
    assert.equal(await page.locator('#mainShotTable td[data-field="description"]').count(),0);
    assert.ok(await page.locator('#mainShotTable th[data-column="title"]').count());
    assert.ok(await page.locator('#mainShotTable th[data-column="voiceover"]').count());
    await page.setViewportSize({width:1024,height:768});
    await trigger.click();
    await panel.waitFor();
    await page.waitForTimeout(220);
    const panelBox = await panel.boundingBox();
    assert.ok(panelBox.x>=0 && panelBox.x+panelBox.width<=1025);
    await page.screenshot({path:path.join(artifacts,'column-manager-1024.png')});
    await page.keyboard.press('Escape');
    await page.locator('#mainShotTable th[data-column="title"]').click({button:'right'});
    const menu = page.locator('#tableContextMenu:not(.hidden)');
    await menu.waitFor();
    await page.waitForTimeout(220);
    assert.ok(await menu.getByRole('menuitem').count());
    const headerMenuBox = await menu.boundingBox();
    assert.ok(headerMenuBox.x>=0 && headerMenuBox.x+headerMenuBox.width<=1025);
    await page.screenshot({path:path.join(artifacts,'column-header-menu-1024.png')});
    await page.keyboard.press('Escape');
    await page.locator('#mainShotTable td[data-field="title"]').first().click({button:'right'});
    await menu.waitFor();
    await page.waitForTimeout(220);
    assert.ok(await menu.getByRole('menuitem').count());
    const cellMenuBox = await menu.boundingBox();
    assert.ok(cellMenuBox.x>=0 && cellMenuBox.x+cellMenuBox.width<=1025);
    await page.screenshot({path:path.join(artifacts,'column-cell-menu-1024.png')});
    await page.keyboard.press('Escape');
    assert.equal(await menu.count(),0);
    const prefs = await (await context.request.get(`${base}/api/projects/${pid}/column-preferences`)).json();
    assert.ok(prefs.some(item=>item.column_key==='description' && item.permanently_deleted));
    assert.deepEqual(errors,[]);
    console.log('PASS real browser: archive/restore/purge, stale saved view/localStorage, reload, column manager and context menus at 1440/1024');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
