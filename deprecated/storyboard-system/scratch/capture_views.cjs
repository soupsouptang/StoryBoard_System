/* 补采四视图截图。React ToggleGroup 的 radio 是 tabindex=-1，
   Playwright 认为不可交互，改用 JS 原生 click 触发 React onChange。 */
const { chromium } = require('playwright');
const path = require('path');
const { Harness } = require('../tests/lib/qa-harness.cjs');

const OUT = path.join(__dirname, '..', 'qa-artifacts', 'pages');
const H = new Harness({ globalMs: 120000, stepMs: 15000, logPath: path.join(OUT, 'views.log') }).start();

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
  await page.waitForTimeout(900);

  for (const view of ['table', 'cards', 'wall', 'timeline']) {
    const r = await H.step('view ' + view, async () => {
      await page.evaluate(v => {
        const btn = document.querySelector(`[data-view="${v}"]`);
        if (btn) btn.click();
      }, view);
      await page.waitForTimeout(1400);
      await page.screenshot({ path: path.join(OUT, `20-view-${view}.png`) });
      return page.evaluate(() => {
        const active = document.querySelector('[data-view][data-state="active"]');
        const vis = [...document.querySelectorAll('.view-content, [id^="view"]')].filter(e => e.offsetWidth && e.offsetHeight).map(e => e.id || e.className.slice(0, 20));
        return { activeView: active?.dataset.view || null, visible: vis.slice(0, 4) };
      });
    });
    if (r.ok) H.say(`VIEW ${view} -> ${JSON.stringify(r.value)}`);
  }

  await H.finish();
  await browser.close();
  process.exit(0);
})().catch(e => { H.say('ERROR ' + e.message); H._flush(); process.exit(1); });
