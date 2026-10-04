// 门禁取证：截取灯光素材面板，确认不再出现伪造的 DIGITAL TWIN
const { chromium } = require('playwright');
const path = require('path');
const BASE = process.env.FRAMEFORGE_QA_BASE || 'http://127.0.0.1:18799';
const OUT = path.join(__dirname, '../qa-artifacts/independent');

(async () => {
  const executablePath = process.env.CHROME_PATH ||
    (process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : undefined);
  const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.setDefaultTimeout(20000);
  try {
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    if (await page.locator('#loginForm').isVisible().catch(() => false)) {
      await page.fill('[name=username]', 'admin');
      await page.fill('[name=password]', 'FrameForge2026!Admin');
      await page.click('#loginForm button[type=submit]');
    }
    await page.waitForSelector('#dashboardView:not(.hidden)');
    await page.click('#dashNewProjectBtn');
    await page.fill('#newProjForm [name=name]', 'qa-gate-' + Date.now());
    await page.click('#newProjForm button[type=submit]');
    await page.waitForSelector('#mainShotTable');
    await page.click('[data-nav-key="lighting"]');
    await page.waitForTimeout(2500);
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(x => /新建画板|创建/.test((x.textContent || '').trim()) && x.offsetParent);
      if (b) b.click();
    });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(OUT, 'gate-asset-library.png') });
    // add SkyPanel then check HUD
    await page.evaluate(() => {
      const t = [...document.querySelectorAll('button,[role=button],.card,li')].find(n => /SkyPanel/i.test(n.textContent || '') && n.offsetParent);
      if (t) t.click();
    });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(OUT, 'gate-after-add.png') });
    console.log('badges:', await page.evaluate(() => [...document.querySelectorAll('.ff-tile-badge')].map(b => b.textContent.trim())));
    console.log('HUD:', await page.evaluate(() => document.querySelector('.ff-glb-debug-hud')?.textContent.trim().replace(/\s+/g, ' ')));
  } catch (e) {
    console.error('ERR:', e.message);
  } finally {
    await browser.close();
  }
})();
