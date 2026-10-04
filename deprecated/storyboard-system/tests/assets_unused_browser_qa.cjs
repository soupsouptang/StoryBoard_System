const {chromium} = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const base = process.env.ASSET_QA_URL;
  const pid = process.env.ASSET_QA_PROJECT_ID;
  const protectedId = process.env.ASSET_QA_PROTECTED_ID;
  const deletableId = process.env.ASSET_QA_DELETABLE_ID;
  const browser = await chromium.launch({headless:true});
  try {
    const context = await browser.newContext({viewport:{width:1440,height:900}});
    await context.addInitScript(() => localStorage.setItem('frameforge-show-qa-projects','1'));
    const login = await context.request.post(`${base}/api/login`, {
      data:{username:'asset-qa',password:'AssetCleanup2026!QA'}
    });
    assert.equal(login.status(),200);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base);
    await page.locator('#projectGrid .project-row').filter({hasText:'Asset cleanup '}).first().click();
    await page.waitForFunction(projectId => window.state.bundle?.project?.id === projectId, pid);
    await page.locator('[data-nav-key="assets"]').first().click();
    const button = page.locator('[data-assets-clean-unused]');
    await page.waitForFunction(() => document.querySelector('[data-assets-clean-unused]')?.textContent.includes('清理未使用素材'));
    assert.equal(await button.isDisabled(),false);
    assert.match(await button.innerText(),/清理未使用素材\s*1/);
    await page.locator('[data-assets-kind="unused"]').click();
    const visible = page.locator('.assets-v75-tile:visible');
    assert.equal(await visible.count(),1);
    assert.equal(await visible.first().getAttribute('data-asset-id'),deletableId);
    await page.locator('[data-assets-kind="all"]').click();
    const protectedTile = page.locator(`.assets-v75-tile[data-asset-id="${protectedId}"]`);
    assert.doesNotMatch(await protectedTile.innerText(),/未使用/);
    await button.click();
    const dialog = page.locator('#confirmActionModal[open]');
    await dialog.waitFor();
    assert.match(await dialog.innerText(),/1 个素材/);
    await dialog.getByRole('button',{name:'确认'}).click();
    await page.waitForFunction(() => document.querySelector('[data-assets-clean-unused]')?.disabled);
    const bundle = await (await context.request.get(`${base}/api/projects/${pid}`)).json();
    assert.deepEqual(bundle.assets.map(asset => asset.id),[protectedId]);
    assert.deepEqual(errors,[]);
    console.log('PASS real browser: exact unused count/filter, cleanup confirmation, protected asset retained');
  } finally {
    await browser.close();
  }
})().catch(error => {console.error(error);process.exitCode=1;});
