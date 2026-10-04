const { chromium } = require('playwright');

const base = process.env.FRAMEFORGE_QA_BASE || 'http://127.0.0.1:18767';

(async () => {
  const executablePath = process.env.CHROME_PATH || (process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : undefined);
  const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(12000);
  try {
    await page.goto(`${base}/`, { waitUntil: 'networkidle' });
    await page.fill('[name=username]', 'qa-admin');
    await page.fill('[name=password]', 'QA-Password-Only-2026!');
    await page.click('#loginForm button[type=submit]');
    await page.waitForSelector('#dashboardView:not(.hidden)');
    await page.click('#dashNewProjectBtn');
    await page.fill('#newProjForm [name=name]', 'qa-table-preferences-qa');
    await page.fill('#newProjForm [name=target_seconds]', '30');
    await page.click('#newProjForm button[type=submit]');
    await page.waitForSelector('#mainShotTable');

    await page.locator('#mainShotTable th[data-column="number"]').click({ button: 'right' });
    await page.click('#tableContextMenu [data-context-action="column-settings"]');
    await page.click('[data-column-action="hide"][data-column-field="description"]');
    await page.waitForSelector('#mainShotTable th[data-column="description"].is-column-hidden');
    const hiddenWidth = await page.locator('#mainShotTable th[data-column="description"]').evaluate(el => Math.round(el.getBoundingClientRect().width));
    if (hiddenWidth > 35) throw new Error(`hidden column width ${hiddenWidth}`);
    await page.click('#mainShotTable th[data-column="description"] .column-hidden-toggle');
    await page.waitForSelector('#mainShotTable th[data-column="description"]:not(.is-column-hidden)');

    const descriptionHeader = page.locator('#mainShotTable th[data-column="description"]');
    const headerBox = await descriptionHeader.boundingBox();
    const contextX = headerBox.x + Math.min(80, headerBox.width / 2);
    const contextY = headerBox.y + headerBox.height / 2;
    await descriptionHeader.click({ button: 'right', position: { x: Math.min(80, headerBox.width / 2), y: headerBox.height / 2 } });
    await page.click('#tableContextMenu [data-context-action="column-settings"]');
    const popoverBox = await page.locator('#columnSettingsPopover:not(.hidden)').boundingBox();
    const viewport = page.viewportSize();
    const expectedLeft = Math.max(8, Math.min(contextX, viewport.width - popoverBox.width - 8));
    const expectedTop = Math.max(8, Math.min(contextY, viewport.height - popoverBox.height - 8));
    if (Math.abs(popoverBox.x - expectedLeft) > 2 || Math.abs(popoverBox.y - expectedTop) > 2) throw new Error(`context popover position ${JSON.stringify({ popoverBox, expectedLeft, expectedTop })}`);
    await page.press('body', 'Escape');

    const beforeOrder = await page.locator('#mainShotTable thead th').evaluateAll(nodes => nodes.map(node => node.dataset.column));
    const numberHeader = page.locator('#mainShotTable th[data-column="number"]');
    const titleHeader = page.locator('#mainShotTable th[data-column="title"]');
    await numberHeader.dragTo(titleHeader);
    const columnOrder = await page.locator('#mainShotTable thead th').evaluateAll(nodes => nodes.map(node => node.dataset.column));
    if (columnOrder.join('|') === beforeOrder.join('|')) throw new Error(`column order did not change: ${columnOrder.join(',')}`);

    await page.click('#mainShotTable th[data-column="title"] .column-label');
    await page.click('#columnSettingsPopover [data-column-sort="asc"]');
    await page.waitForSelector('#mainShotTable th[data-column="title"] .column-label');
    const sortHeader = await page.locator('#mainShotTable th[data-column="title"] .column-label').textContent();
    if (!sortHeader.includes('↑')) throw new Error(`sort marker missing: ${sortHeader}`);

    await page.dblclick('#mainShotTable td[data-field="title"]');
    await page.fill('.inline-cell-editor', '自动同步测试');
    await page.press('.inline-cell-editor', 'Enter');
    await page.waitForTimeout(1200);
    const syncStatus = (await page.locator('#saveProjectBtn').textContent()).trim();
    if (!syncStatus.includes('已同步')) throw new Error(`autosave status ${syncStatus}`);
    console.log(JSON.stringify({ pass: true, hiddenWidth, sortHeader, syncStatus }));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
