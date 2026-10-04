// 验证光束梯形化 + 房间轮廓
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const BASE = process.env.FRAMEFORGE_QA_BASE || 'http://127.0.0.1:18799';
const OUT = path.join(__dirname, '../qa-artifacts/vector-2d');
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
    await page.fill('#newProjForm [name=name]', 'qa-beam-' + Date.now());
    await page.click('#newProjForm button[type=submit]');
    await page.waitForSelector('#mainShotTable');
    await page.click('[data-nav-key="lighting"]');
    await page.waitForTimeout(2200);
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(x => /新建画板|创建/.test((x.textContent || '').trim()) && x.offsetParent);
      if (b) b.click();
    });
    await page.waitForTimeout(1500);
    // 必须切到 2D —— 风格规则都挂在 [data-view-mode="2d"] 下
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('.ff-boards-view-modes button')].find(x => x.textContent.trim() === '2D');
      if (b) b.click();
    });
    await page.waitForTimeout(1200);
    for (const t of ['ARRI SkyPanel X21', 'Aputure STORM 1200x', 'Nanlite Forza 500B II']) {
      await page.evaluate(n => {
        const b = [...document.querySelectorAll('.ff-boards-library-group button')]
          .find(x => (x.textContent || '').includes(n) && x.offsetParent);
        if (b) b.click();
      }, t);
      await page.waitForTimeout(900);
    }
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(OUT, '2d-beam-trapezoid.png') });

    const r = await page.evaluate(() => {
      const cones = [...document.querySelectorAll('.ff-boards-coverage path')];
      const cv = document.querySelector('.ff-boards-canvas');
      const after = cv ? getComputedStyle(cv) : null;
      return {
        beamCount: cones.length,
        beams: cones.map(c => c.getAttribute('d')),
        hasArc: cones.some(c => (c.getAttribute('d') || '').includes('A')),
        labelCount: [...document.querySelectorAll('.ff-boards-item-label')].map(l => l.textContent.trim()),
        roomOutline: after ? { shadow: after.boxShadow, radius: after.borderTopLeftRadius } : null
      };
    });
    console.log('光束数量:', r.beamCount);
    console.log('含圆弧(A):', r.hasArc, '（应为 false，梯形用 L 直线）');
    r.beams.forEach((b, i) => console.log(`  光束${i + 1}: ${b}`));
    console.log('房间轮廓:', JSON.stringify(r.roomOutline));
    console.log('标签:', JSON.stringify(r.labelCount));
  } catch (e) {
    console.error('ERR:', e.message);
  } finally {
    console.log('errors:', errs.length ? [...new Set(errs)].slice(0, 5).join(' | ') : '(none)');
    await browser.close();
  }
})();
