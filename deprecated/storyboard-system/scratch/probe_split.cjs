// 分屏专项探测：runtime 状态 + 画布几何
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const BASE = process.env.FRAMEFORGE_QA_BASE || 'http://127.0.0.1:18799';
const OUT = path.join(__dirname, '../qa-artifacts/independent');

(async () => {
  const executablePath = process.env.CHROME_PATH ||
    (process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : undefined);
  const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.setDefaultTimeout(20000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  try {
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    if (await page.locator('#loginForm').isVisible().catch(() => false)) {
      await page.fill('[name=username]', 'admin');
      await page.fill('[name=password]', 'FrameForge2026!Admin');
      await page.click('#loginForm button[type=submit]');
    }
    await page.waitForSelector('#dashboardView:not(.hidden)');
    await page.click('#dashNewProjectBtn');
    await page.fill('#newProjForm [name=name]', 'qa-split-probe-' + Date.now());
    await page.click('#newProjForm button[type=submit]');
    await page.waitForSelector('#mainShotTable');
    await page.click('[data-nav-key="lighting"]');
    await page.waitForTimeout(2000);
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(x => /新建画板|新建|创建/.test((x.textContent || '').trim()) && x.offsetParent);
      if (b) b.click();
    });
    await page.waitForTimeout(1000);
    await page.evaluate(() => {
      const t = [...document.querySelectorAll('button,[role=button],.card,li')].find(n => /SkyPanel/i.test(n.textContent || '') && n.offsetParent);
      if (t) t.click();
    });
    await page.waitForTimeout(2000);
    // switch to split
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('.ff-boards button')].find(x => (x.textContent || '').trim() === '分屏');
      if (b) b.click();
    });
    await page.waitForTimeout(3000);
    const info = await page.evaluate(() => {
      const rt = globalThis.__FF_GLB_RUNTIME__;
      const canvases = [...document.querySelectorAll('.ff-boards canvas')].map(c => {
        const r = c.getBoundingClientRect();
        return { cls: c.className.slice(0, 50), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), connected: c.isConnected };
      });
      return {
        hasRuntime: !!rt,
        mode: rt?.mode,
        rendererSize: rt?.renderer ? (() => { const s = new globalThis.THREE.Vector2(); rt.renderer.getSize(s); return { w: s.x, h: s.y }; })() : null,
        canvasClient: rt?.canvas ? { cw: rt.canvas.clientWidth, ch: rt.canvas.clientHeight } : null,
        containerClient: rt?.container ? { cw: rt.container.clientWidth, ch: rt.container.clientHeight, cls: rt.container.className?.slice?.(0, 40) } : null,
        stats: rt?.stats,
        equipment: rt?.equipmentMap?.size,
        canvases,
        splitWrap: !!document.querySelector('.ff-boards-split-wrap'),
        leftPanelW: document.querySelector('.ff-boards-split-left')?.clientWidth,
        rightPanelW: document.querySelector('.ff-boards-split-right')?.clientWidth
      };
    });
    console.log(JSON.stringify(info, null, 1));
    await page.screenshot({ path: path.join(OUT, 'split-debug.png') });
  } catch (e) {
    console.error('ERR:', e.message);
  } finally {
    console.log('pageerrors:', errors.join(' | ') || '(none)');
    await browser.close();
  }
})();
