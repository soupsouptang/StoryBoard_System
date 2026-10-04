const { chromium } = require('playwright');

const base = process.env.FRAMEFORGE_QA_BASE || (process.env.FRAMEFORGE_QA_BASE || 'http://127.0.0.1:18799');
(async () => {
const executablePath = process.env.CHROME_PATH || (process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : undefined);
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(12000);
const errors = [];
page.on('console', message => { if (message.type() === 'error') { errors.push(message.text()); console.error(`browser: ${message.text()}`); } });
try {
  await page.goto(`${base}/`, { waitUntil: 'networkidle' });
  await page.fill('[name=username]', 'qa-admin');
  await page.fill('[name=password]', 'QA-Password-Only-2026!');
  await page.click('#loginForm button[type=submit]');
  await page.waitForSelector('#dashboardView:not(.hidden)');
  await page.click('#dashNewProjectBtn');
  await page.fill('#newProjForm [name=name]', 'qa-v6-2-p0-qa');
  await page.fill('#newProjForm [name=target_seconds]', '30');
  await page.click('#newProjForm button[type=submit]');
  await page.waitForSelector('#mainShotTable');

  await page.click('#importExcelBtn');
  await page.setInputFiles('#importFileInput', { name: 'v62-import.csv', mimeType: 'text/csv', buffer: Buffer.from('镜号,镜头标题,画面描述,旁白,时长\nQA-001,导入验证,真实导入画面,导入旁白,2\n') });
  await page.waitForSelector('.mapping-combobox');
  await page.click('#importNextBtn');
  await page.click('#commitImportBtn');
  await page.waitForSelector('.import-complete');
  await page.click('#finishImportBtn');
  await page.waitForSelector('#mainShotTable');
  await page.fill('#globalSearchInput', '');
  await page.waitForTimeout(250);


  await page.fill('#globalSearchInput', '镜头 001');
  await page.waitForSelector('#searchResultPanel:not(.hidden) .search-result-item');
  await page.click('#searchResultPanel .search-result-item');
  await page.waitForTimeout(200);
  if (!await page.locator('#mainShotTable tr.is-selected').count()) throw new Error('search did not select a shot');

  const widthBefore = await page.locator('#mainShotTable th[data-column="description"]').evaluate(el => el.getBoundingClientRect().width);
  const handle = page.locator('#mainShotTable th[data-column="description"] .column-resize-handle');
  await handle.scrollIntoViewIfNeeded();
  const box = await handle.boundingBox();
  await page.mouse.move(box.x + 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 180, box.y + box.height / 2);
  await page.mouse.up();
  const widthAfter = await page.locator('#mainShotTable th[data-column="description"]').evaluate(el => el.getBoundingClientRect().width);
  if (widthAfter <= widthBefore) throw new Error('column resize did not change width');
  await page.selectOption('#rowHeightSelect', 'comfortable');
  if (await page.locator('#tableScrollWrap').getAttribute('data-row-height') !== 'comfortable') throw new Error('row height did not apply');

  await page.dblclick('#mainShotTable td[data-field="methods"]');
  await page.waitForSelector('.methods-popover');
  await page.check('.methods-popover input[value="MG"]');
  await page.click('.methods-popover [data-method-apply]');
  if (!(await page.locator('#mainShotTable td[data-field="methods"]').textContent()).includes('MG')) throw new Error('multi method did not apply');

  await page.click('[data-ui-mode-option="professional"]');
  await page.click('[data-action="add-panel"]');
  await page.waitForTimeout(250);
  if (await page.locator('.panel-row').count() < 2) throw new Error('panel was not added');
  await page.click('.panel-row:nth-child(2) [data-action="delete-panel"]');
  await page.click('#confirmActionForm button[type=submit]');
  await page.waitForTimeout(250);
  if (await page.locator('.panel-row').count() !== 1) throw new Error('panel was not deleted');

  await page.click('[data-action="add-step"]');
  await page.waitForTimeout(250);
  if (!await page.locator('.editable-step').count()) throw new Error('production step was not added');
  await page.click('.step-status');
  await page.click('.step-name', { clickCount: 2 });
  await page.fill('#fieldEditorInput', '剪辑检查');
  await page.click('#fieldEditorForm button[type=submit]');
  await page.click('.editable-step [data-step-field="type"]');
  await page.fill('#fieldEditorInput', 'QUALITY_CHECK');
  await page.click('#fieldEditorForm button[type=submit]');
  if (!(await page.locator('.editable-step [data-step-field="type"] b').first().textContent()).includes('QUALITY_CHECK')) throw new Error('production step business fields did not persist');

  await page.click('#backToListBtn');
  await page.waitForSelector('#dashboardView:not(.hidden)');
  const projectRowsBeforeDelete = await page.locator('.project-row').count();
  if (!projectRowsBeforeDelete) throw new Error('project hub did not show created project');
  await page.locator('.project-row-delete').first().click();
  await page.waitForSelector('#confirmActionModal[open]');
  await page.click('#confirmActionForm button[type=submit]');
  await page.waitForTimeout(250);
  if (await page.locator('.project-row').count() >= projectRowsBeforeDelete) throw new Error('project delete did not remove the project');

  if (errors.length) throw new Error(`console errors: ${errors.join(' | ')}`);
  console.log(JSON.stringify({ pass: true, search: true, resize: true, rowHeight: true, methods: true, panel: true, steps: true, projectDelete: true, consoleErrors: errors.length }));
} finally {
  await browser.close();
}
})().catch(error => { console.error(error); process.exitCode = 1; });
