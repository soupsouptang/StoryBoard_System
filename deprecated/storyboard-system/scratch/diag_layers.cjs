// 诊断 2D 模式各层的真实背景色 + 尺寸，找出深色来源
const { chromium } = require('playwright');
const path = require('path');
const BASE = process.env.FRAMEFORGE_QA_BASE || 'http://127.0.0.1:18799';
const OUT = path.join(__dirname, '../qa-artifacts/diag2d');

(async () => {
  const browser = await chromium.launch({ headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
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
    await page.fill('#newProjForm [name=name]', 'qa-diag-' + Date.now());
    await page.click('#newProjForm button[type=submit]');
    await page.waitForSelector('#mainShotTable');
    await page.click('[data-nav-key="lighting"]');
    await page.waitForTimeout(2200);
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(x => /新建画板|创建/.test((x.textContent || '').trim()) && x.offsetParent);
      if (b) b.click();
    });
    await page.waitForTimeout(1200);
    for (const t of ['ARRI SkyPanel X21', 'Nanite Forza 500B II', 'ARRI Orbiter']) {
      await page.evaluate(n => {
        const b = [...document.querySelectorAll('.ff-boards-library-group button')].find(x => (x.textContent || '').includes(n) && x.offsetParent);
        if (b) b.click();
      }, t);
      await page.waitForTimeout(500);
    }
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('.ff-boards-view-modes button')].find(x => x.textContent.trim() === '2D');
      if (b) b.click();
    });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(OUT, 'diag-2d.png') });

    const info = await page.evaluate(() => {
      const out = [];
      const sel = ['.ff-boards', '.ff-boards-layout', '.ff-boards-workspace', '.ff-boards-viewport', '.ff-boards-stage', '.ff-boards-canvas'];
      sel.forEach(s => {
        const e = document.querySelector(s);
        if (!e) { out.push({ sel: s, missing: true }); return; }
        const cs = getComputedStyle(e);
        const r = e.getBoundingClientRect();
        out.push({
          sel: s,
          bg: cs.backgroundColor,
          bgImg: cs.backgroundImage === 'none' ? 'none' : cs.backgroundImage.slice(0, 46),
          rect: `${Math.round(r.width)}×${Math.round(r.height)}`,
          viewMode: e.dataset ? e.dataset.viewMode : undefined
        });
      });
      // 图元尺寸：查每个 item 的实际渲染尺寸
      const items = [...document.querySelectorAll('.ff-boards-item')].map(n => {
        const r = n.getBoundingClientRect();
        const p = n.querySelector('svg path');
        return { w: Math.round(r.width), h: Math.round(r.height), d: p ? p.getAttribute('d').slice(0, 18) : null };
      });
      return { layers: out, items };
    });
    console.log(JSON.stringify(info, null, 1));
  } catch (e) { console.error('ERR:', e.message); }
  finally { await browser.close(); }
})();
