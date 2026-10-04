// 诊断：为什么 .ff-boards[data-view-mode="2d"] .ff-boards-canvas 不匹配
const { chromium } = require('playwright');
const BASE = process.env.FRAMEFORGE_QA_BASE || 'http://127.0.0.1:18799';

(async () => {
  const browser = await chromium.launch({ headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
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
    await page.fill('#newProjForm [name=name]', 'qa-diag2-' + Date.now());
    await page.click('#newProjForm button[type=submit]');
    await page.waitForSelector('#mainShotTable');
    await page.click('[data-nav-key="lighting"]');
    await page.waitForTimeout(2200);
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(x => /新建画板|创建/.test((x.textContent || '').trim()) && x.offsetParent);
      if (b) b.click();
    });
    await page.waitForTimeout(1500);
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('.ff-boards-view-modes button')].find(x => x.textContent.trim() === '2D');
      if (b) b.click();
    });
    await page.waitForTimeout(1500);

    const d = await page.evaluate(() => {
      const roots = [...document.querySelectorAll('.ff-boards')];
      const cvs = [...document.querySelectorAll('.ff-boards-canvas')];
      return {
        boardRoots: roots.map(r => ({ cls: r.className, viewMode: r.dataset.viewMode, attr: r.getAttribute('data-view-mode') })),
        canvases: cvs.map(c => {
          const chain = [];
          let p = c.parentElement;
          while (p && chain.length < 8) { chain.push(p.className || p.tagName); p = p.parentElement; }
          return { cls: c.className, radius: getComputedStyle(c).borderTopLeftRadius, shadow: getComputedStyle(c).boxShadow.slice(0, 40), chain };
        }),
        matchDesc: document.querySelectorAll('.ff-boards[data-view-mode="2d"] .ff-boards-canvas').length,
        matchAny: document.querySelectorAll('[data-view-mode="2d"] .ff-boards-canvas').length
      };
    });
    console.log(JSON.stringify(d, null, 1));
  } catch (e) { console.error('ERR:', e.message); }
  finally { await browser.close(); }
})();
