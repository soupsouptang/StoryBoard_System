// 验证 3D 轨道相机：视角预设 + 拖拽旋转 + 滚轮缩放
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const BASE = process.env.FRAMEFORGE_QA_BASE || 'http://127.0.0.1:18799';
const OUT = path.join(__dirname, '../qa-artifacts/camera3d');
fs.mkdirSync(OUT, { recursive: true });

const cam = page => page.evaluate(() => {
  const rt = globalThis.__FF_GLB_RUNTIME__;
  if (!rt || !rt.cameraPerspective) return null;
  const p = rt.cameraPerspective.position, o = rt.orbit;
  return {
    preset: rt.viewPreset,
    pos: [Math.round(p.x), Math.round(p.y), Math.round(p.z)],
    orbit: { theta: +(o.theta).toFixed(3), phi: +(o.phi).toFixed(3), radius: Math.round(o.radius) }
  };
});

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
    await page.fill('#newProjForm [name=name]', 'qa-cam3d-' + Date.now());
    await page.click('#newProjForm button[type=submit]');
    await page.waitForSelector('#mainShotTable');
    await page.click('[data-nav-key="lighting"]');
    await page.waitForTimeout(2200);
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(x => /新建画板|创建/.test((x.textContent || '').trim()) && x.offsetParent);
      if (b) b.click();
    });
    await page.waitForTimeout(1200);
    for (const t of ['ARRI SkyPanel X21', 'Aputure STORM 1200x', 'ARRI Orbiter', 'Avenger C-Stand']) {
      await page.evaluate(n => {
        const b = [...document.querySelectorAll('.ff-boards-library-group button')].find(x => (x.textContent || '').includes(n) && x.offsetParent);
        if (b) b.click();
      }, t);
      await page.waitForTimeout(600);
    }
    // 切 3D
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('.ff-boards-view-modes button')].find(x => x.textContent.trim() === '3D');
      if (b) b.click();
    });
    await page.waitForTimeout(3000);

    const camBtns = await page.evaluate(() =>
      [...document.querySelectorAll('.ff-boards-view-modes')].map(g => [...g.querySelectorAll('button')].map(b => b.textContent.trim())));
    console.log('工具栏按钮组:', JSON.stringify(camBtns));
    console.log('默认:', JSON.stringify(await cam(page)));
    await page.screenshot({ path: path.join(OUT, 'cam-3q.png') });

    for (const [label, file] of [['俯视', 'cam-top'], ['鸟瞰', 'cam-bird'], ['漫游', 'cam-walk']]) {
      await page.evaluate(t => {
        const b = [...document.querySelectorAll('.ff-boards-view-modes button')].find(x => x.textContent.trim() === t);
        if (b) b.click();
      }, label);
      await page.waitForTimeout(2200);
      console.log(`${label}:`, JSON.stringify(await cam(page)));
      await page.screenshot({ path: path.join(OUT, file + '.png') });
    }

    // 拖拽旋转
    const box = await page.evaluate(() => {
      const c = document.querySelector('canvas.ff-lighting-webgl-canvas');
      const vp = document.querySelector('.ff-boards-viewport');
      if (!c || !vp) return null;
      const r = c.getBoundingClientRect(), v = vp.getBoundingClientRect();
      // 画布(1600px)大于视口，必须取「交集」中心，否则鼠标落到视口外收不到事件
      const x1 = Math.max(r.x, v.x), y1 = Math.max(r.y, v.y);
      const x2 = Math.min(r.right, v.right), y2 = Math.min(r.bottom, v.bottom);
      return { x: (x1 + x2) / 2, y: (y1 + y2) / 2, w: x2 - x1, h: y2 - y1 };
    });
    console.log('测试点(画布∩视口):', JSON.stringify(box));
    if (box) {
      const before = await cam(page);
      await page.mouse.move(box.x, box.y);
      await page.mouse.down();
      await page.mouse.move(box.x + 180, box.y - 40, { steps: 12 });
      await page.mouse.up();
      await page.waitForTimeout(900);
      const after = await cam(page);
      console.log('拖拽前:', JSON.stringify(before.orbit));
      console.log('拖拽后:', JSON.stringify(after.orbit));
      console.log('theta 变化:', (after.orbit.theta - before.orbit.theta).toFixed(3), '（应非 0）');
      await page.screenshot({ path: path.join(OUT, 'cam-orbit.png') });

      // 滚轮缩放
      await page.mouse.wheel(0, -600);
      await page.waitForTimeout(800);
      const zoomed = await cam(page);
      console.log('滚轮后 radius:', before.orbit.radius, '->', zoomed.orbit.radius, '（应减小）');
    } else {
      console.log('未找到 WebGL 画布，拖拽测试跳过');
    }
  } catch (e) { console.error('ERR:', e.message); }
  finally { console.log('errors:', errs.length ? [...new Set(errs)].slice(0, 4).join(' | ') : '(none)'); await browser.close(); }
})();
