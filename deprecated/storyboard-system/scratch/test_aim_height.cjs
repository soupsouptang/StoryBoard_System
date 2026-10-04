// 验证：俯仰角(Aim Tilt)是否真正驱动 3D 光束方向 + 垂直向上/向下快捷按钮
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
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));

  // 读取运行时里光束锥体的实际旋转角（度）
  const beamRot = () => page.evaluate(() => {
    const rt = globalThis.__FF_GLB_RUNTIME__;
    if (!rt || !rt.equipmentMap || !rt.equipmentMap.size) return null;
    const out = [];
    rt.equipmentMap.forEach(entry => {
      let rotX = null, found = false;
      entry.group.traverse(o => {
        if (found) return;
        if (o.name === 'beam-volume') {
          // 旋转设在容器内的 cone mesh 上，不是容器本身
          const cone = o.children.find(c => c.isMesh);
          rotX = cone ? cone.rotation.x : o.rotation.x;
          found = true;
        }
      });
      out.push({ label: entry.label, rotXdeg: rotX == null ? null : Math.round(rotX * 180 / Math.PI * 10) / 10 });
    });
    return out;
  });

  try {
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    if (await page.locator('#loginForm').isVisible().catch(() => false)) {
      await page.fill('[name=username]', 'admin');
      await page.fill('[name=password]', 'FrameForge2026!Admin');
      await page.click('#loginForm button[type=submit]');
    }
    await page.waitForSelector('#dashboardView:not(.hidden)');
    await page.click('#dashNewProjectBtn');
    await page.fill('#newProjForm [name=name]', 'qa-aim-' + Date.now());
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
      const t = [...document.querySelectorAll('button,[role=button],.ff-tile-title')].find(n => /SkyPanel|菲涅尔|COB/i.test(n.textContent || '') && n.offsetParent);
      if (t) t.click();
    });
    await page.waitForTimeout(3000);
    console.log('默认(-45°) 光束旋转:', JSON.stringify(await beamRot()));
    await page.screenshot({ path: path.join(OUT, 'aim-00-default.png') });

    // 点“垂直向上 ↑”
    const clickedUp = await page.evaluate(() => {
      const b = [...document.querySelectorAll('.ff-boards button')].find(x => /垂直向上/.test(x.textContent || ''));
      if (b) { b.click(); return true; }
      return false;
    });
    await page.waitForTimeout(2500);
    console.log('点击垂直向上:', clickedUp, '→', JSON.stringify(await beamRot()));
    await page.screenshot({ path: path.join(OUT, 'aim-01-up.png') });

    // 点“垂直向下 ↓”
    const clickedDown = await page.evaluate(() => {
      const b = [...document.querySelectorAll('.ff-boards button')].find(x => /垂直向下/.test(x.textContent || ''));
      if (b) { b.click(); return true; }
      return false;
    });
    await page.waitForTimeout(2500);
    console.log('点击垂直向下:', clickedDown, '→', JSON.stringify(await beamRot()));
    await page.screenshot({ path: path.join(OUT, 'aim-02-down.png') });

    // 点“水平 →”（验证 0 不会被当成缺省）
    const clickedFlat = await page.evaluate(() => {
      const b = [...document.querySelectorAll('.ff-boards button')].find(x => /^水平/.test((x.textContent || '').trim()));
      if (b) { b.click(); return true; }
      return false;
    });
    await page.waitForTimeout(2500);
    console.log('点击水平:', clickedFlat, '→', JSON.stringify(await beamRot()));
    await page.screenshot({ path: path.join(OUT, 'aim-03-flat.png') });

    // 灯架高度快捷
    const clickedH = await page.evaluate(() => {
      const b = [...document.querySelectorAll('.ff-boards button')].find(x => /顶光 420/.test(x.textContent || ''));
      if (b) { b.click(); return true; }
      return false;
    });
    await page.waitForTimeout(2000);
    const zVal = await page.evaluate(() => {
      const inp = [...document.querySelectorAll('.ff-boards-inspector input')];
      const f = [...document.querySelectorAll('.ff-boards-inspector .ff-boards-field')]
        .find(x => /离地高度/.test(x.textContent || ''));
      return f ? f.querySelector('input')?.value : null;
    });
    console.log('点击顶光420:', clickedH, '离地高度值 =', zVal);
    await page.screenshot({ path: path.join(OUT, 'aim-04-height.png') });

  } catch (e) {
    console.error('ERR:', e.message);
  } finally {
    console.log('pageerrors:', errs.length ? [...new Set(errs)].join(' | ') : '(none)');
    await browser.close();
  }
})();
