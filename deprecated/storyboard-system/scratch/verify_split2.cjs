// 验证分屏：右栏是否被双重切割、FOV 是否自适应
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const BASE = process.env.FRAMEFORGE_QA_BASE || 'http://127.0.0.1:18799';
const OUT = path.join(__dirname, '../qa-artifacts/split');
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
    await page.fill('#newProjForm [name=name]', 'qa-split-' + Date.now());
    await page.click('#newProjForm button[type=submit]');
    await page.waitForSelector('#mainShotTable');
    await page.click('[data-nav-key="lighting"]');
    await page.waitForTimeout(2200);
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(x => /新建画板|创建/.test((x.textContent || '').trim()) && x.offsetParent);
      if (b) b.click();
    });
    await page.waitForTimeout(1200);
    for (const t of ['ARRI SkyPanel X21', 'Aputure STORM 1200x', 'ARRI Orbiter']) {
      await page.evaluate(n => {
        const b = [...document.querySelectorAll('.ff-boards-library-group button')].find(x => (x.textContent || '').includes(n) && x.offsetParent);
        if (b) b.click();
      }, t);
      await page.waitForTimeout(500);
    }
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('.ff-boards-view-modes button')].find(x => x.textContent.trim() === '分屏');
      if (b) b.click();
    });
    await page.waitForTimeout(3200);
    await page.screenshot({ path: path.join(OUT, 'split-fixed.png') });

    const r = await page.evaluate(() => {
      const rt = globalThis.__FF_GLB_RUNTIME__;
      const right = document.querySelector('.ff-boards-split-right');
      const cv = document.querySelector('canvas.ff-lighting-webgl-canvas');
      return {
        runtimeMode: rt ? rt.mode : null,
        rightPanelW: right ? right.clientWidth : null,
        canvasW: cv ? Math.round(cv.getBoundingClientRect().width) : null,
        camAspect: rt && rt.cameraPerspective ? +rt.cameraPerspective.aspect.toFixed(3) : null,
        camFov: rt && rt.cameraPerspective ? Math.round(rt.cameraPerspective.fov) : null,
        fixtures: rt ? rt.equipmentMap.size : null
      };
    });
    console.log('runtime.mode =', r.runtimeMode, '(应为 3d，不再是 split)');
    console.log('右栏宽 =', r.rightPanelW, '| webgl canvas 宽 =', r.canvasW, '(应接近右栏宽，不是其一半)');
    console.log('相机 aspect =', r.camAspect, '| fov =', r.camFov, '°(竖长视口应 > 50)');
    console.log('器材数 =', r.fixtures);
  } catch (e) { console.error('ERR:', e.message); }
  finally { console.log('errors:', errs.length ? [...new Set(errs)].slice(0, 4).join(' | ') : '(none)'); await browser.close(); }
})();
