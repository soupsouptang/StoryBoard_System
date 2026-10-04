/* 快速验证：只截旁白页面 */
const { chromium } = require('playwright');
const path = require('path');
const { Harness } = require('../tests/lib/qa-harness.cjs');
const OUT = path.join(__dirname, '..', 'qa-artifacts', 'pages');
const H = new Harness({ globalMs: 90000, stepMs: 15000, logPath: path.join(OUT, 'reshot.log') }).start();

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.setDefaultTimeout(8000);
  await page.goto('http://127.0.0.1:18765/', { waitUntil: 'domcontentloaded' });
  await page.fill('[name=username]', 'qa-admin');
  await page.fill('[name=password]', 'QA-Password-Only-2026!');
  await page.click('#loginForm button[type=submit]');
  await page.waitForSelector('#dashboardView:not(.hidden)', { timeout: 12000 });
  await page.locator('#projectGrid .project-row').first().click();
  await page.waitForSelector('#mainShotTable', { timeout: 15000 });
  await page.waitForTimeout(800);
  await page.locator('[data-nav-key="assets"]').first().click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT, '31-assets-fixed.png') });
  await page.locator('[data-nav-key="lighting"]').first().click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT, '32-lighting-fixed.png') });
  await page.locator('[data-nav-key="moodboard"]').first().click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT, '33-moodboard-fixed.png') });
  H.say('done');
  await H.finish();
  await browser.close();
  process.exit(0);
})().catch(e => { H.say('ERROR ' + e.message); H._flush(); process.exit(1); });
