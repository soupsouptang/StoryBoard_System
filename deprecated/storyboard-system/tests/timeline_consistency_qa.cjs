const { chromium } = require('playwright');

const base = process.env.FRAMEFORGE_QA_BASE || (process.env.FRAMEFORGE_QA_BASE || 'http://127.0.0.1:18799');

(async () => {
  const executablePath = process.env.CHROME_PATH || (process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : undefined);
  const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(12000);
  try {
    await page.goto(`${base}/`, { waitUntil: 'networkidle' });
    const user = process.env.QA_USER || 'admin';
    const pass = process.env.QA_PASS || 'FrameForge2026!Admin';
    await page.fill('[name=username]', user);
    await page.fill('[name=password]', pass);
    await page.click('#loginForm button[type=submit]');
    await page.waitForSelector('#dashboardView:not(.hidden)');
    await page.click('#dashNewProjectBtn');
    await page.fill('#newProjForm [name=name]', 'qa-timeline-consistency-qa');
    await page.selectOption('#newProjForm [name=fps]', '30');
    await page.fill('#newProjForm [name=target_seconds]', '300');
    await page.click('#newProjForm button[type=submit]');
    await page.waitForSelector('#mainShotTable');

    const firstDuration = page.locator('#mainShotTable td[data-field="duration_seconds"]').first();
    await firstDuration.dblclick();
    await firstDuration.locator('.inline-cell-editor').fill('5');
    await firstDuration.locator('.inline-cell-editor').press('Enter');
    await page.waitForTimeout(100);

    const secondTc = (await page.locator('#mainShotTable tbody tr').nth(1).locator('.timecode').textContent()).trim();
    const total = (await page.locator('#hudTotalDuration').textContent()).trim();
    const firstDurationText = (await page.locator('#mainShotTable td[data-field="duration_seconds"]').first().textContent()).trim();
    const activeEditors = await page.locator('.inline-cell-editor').count();
    if (secondTc !== '01:00:05:00' || total !== '00:17') {
      throw new Error(`duration/timecode mismatch: ${JSON.stringify({ firstDurationText, activeEditors, secondTc, total, expectedSecondTc: '01:00:05:00', expectedTotal: '00:17' })}`);
    }
    console.log(JSON.stringify({ pass: true, secondTc, total }));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
