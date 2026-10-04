// 2D 视图综合验证：位置错开 + 白底 + 图元尺寸 + 截图供人眼检查
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const BASE = process.env.FRAMEFORGE_QA_BASE || 'http://127.0.0.1:18799';
const OUT = path.join(__dirname, '../qa-artifacts/diag2d');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.setDefaultTimeout(20000);
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  try {
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    if (await page.locator('#loginForm').isVisible().catch(() => false)) {
      await page.fill('[name=username]', 'admin');
      await page.fill('[name=password]', 'FrameForge2026!Admin');
      await page.click('#loginForm button[type=submit]');
    }
    await page.waitForSelector('#dashboardView:not(.hidden)');
    await page.click('#dashNewProjectBtn');
    await page.fill('#newProjForm [name=name]', 'qa-v2d-' + Date.now());
    await page.click('#newProjForm button[type=submit]');
    await page.waitForSelector('#mainShotTable');
    await page.click('[data-nav-key="lighting"]');
    await page.waitForTimeout(2200);
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(x => /新建画板|创建/.test((x.textContent || '').trim()) && x.offsetParent);
      if (b) b.click();
    });
    await page.waitForTimeout(1200);
    // 加 6 个不同类别器材
    for (const t of ['ARRI SkyPanel X21', 'Aputure STORM 1200x', 'Nanlite Forza 500B II', 'ARRI Orbiter', 'Avenger C-Stand', '主演演员']) {
      await page.evaluate(n => {
        const b = [...document.querySelectorAll('.ff-boards-library-group button')].find(x => (x.textContent || '').includes(n) && x.offsetParent);
        if (b) b.click();
      }, t);
      await page.waitForTimeout(600);
    }
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('.ff-boards-view-modes button')].find(x => x.textContent.trim() === '2D');
      if (b) b.click();
    });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(OUT, 'final-2d.png') });

    const r = await page.evaluate(() => {
      const items = [...document.querySelectorAll('.ff-boards-item')].map(n => ({
        x: n.style.left, y: n.style.top,
        svgW: Math.round((n.querySelector('svg') || { getBoundingClientRect: () => ({ width: 0 }) }).getBoundingClientRect().width)
      }));
      const cv = document.querySelector('.ff-boards-canvas');
      return {
        zoomVar: cv ? cv.style.getPropertyValue('--ff-zoom') : null,
        count: items.length,
        items,
        uniquePositions: new Set(items.map(i => i.x + ',' + i.y)).size,
        webglCanvases: document.querySelectorAll('canvas.ff-lighting-webgl-canvas').length
      };
    });
    console.log('画布缩放变量 --ff-zoom:', r.zoomVar);
    console.log('图元数量:', r.count, '| 不重复位置数:', r.uniquePositions);
    console.log('图元屏幕尺寸(px):', r.items.map(i => i.svgW).join(', '));
    console.log('残留 WebGL 画布:', r.webglCanvases, '(2D 模式应为 0)');
    console.log('位置:', r.items.map(i => `${i.x}/${i.y}`).join('  '));
  } catch (e) { console.error('ERR:', e.message); }
  finally { console.log('errors:', errs.length ? [...new Set(errs)].slice(0, 4).join(' | ') : '(none)'); await browser.close(); }
})();
