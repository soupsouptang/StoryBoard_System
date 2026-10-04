// 运行时验证：7 个 replica preset 逐个加入，检查 GLB 加载与渲染，截图
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const BASE = process.env.FRAMEFORGE_QA_BASE || 'http://127.0.0.1:18799';
const OUT = path.join(__dirname, '../qa-artifacts/replica');
fs.mkdirSync(OUT, { recursive: true });

const TARGETS = [
  'ARRI SkyPanel X21', 'Aputure STORM 1200x', 'Nanlite Forza 300B II',
  'Nanlite Forza 500B II', 'ARRI Orbiter', 'ALEXA 35', 'Avenger C-Stand'
];

(async () => {
  const executablePath = process.env.CHROME_PATH ||
    (process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : undefined);
  const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.setDefaultTimeout(25000);
  const errs = [], fail4xx = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('response', r => { if (r.status() >= 400) fail4xx.push(`${r.status()} ${r.url().split('/').pop()}`); });

  try {
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    if (await page.locator('#loginForm').isVisible().catch(() => false)) {
      await page.fill('[name=username]', 'admin');
      await page.fill('[name=password]', 'FrameForge2026!Admin');
      await page.click('#loginForm button[type=submit]');
    }
    await page.waitForSelector('#dashboardView:not(.hidden)');
    await page.click('#dashNewProjectBtn');
    await page.fill('#newProjForm [name=name]', 'qa-replica-' + Date.now());
    await page.click('#newProjForm button[type=submit]');
    await page.waitForSelector('#mainShotTable');
    await page.click('[data-nav-key="lighting"]');
    await page.waitForTimeout(2200);
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(x => /新建画板|创建/.test((x.textContent || '').trim()) && x.offsetParent);
      if (b) b.click();
    });
    await page.waitForTimeout(1500);

    // 徽章检查
    const badges = await page.evaluate(() => {
      const out = [];
      document.querySelectorAll('.ff-boards-library-group').forEach(g => {
        g.querySelectorAll('button').forEach(b => {
          const t = b.textContent || '';
          const badge = b.querySelector('.ff-tile-badge');
          if (badge && /SkyPanel|STORM|Forza|Orbiter|ALEXA|Avenger/.test(t)) {
            out.push(t.trim().slice(0, 26) + '  →  ' + badge.textContent.trim());
          }
        });
      });
      return out;
    });
    console.log('=== 对象库徽章 ===');
    badges.forEach(b => console.log('  ' + b));

    // 逐个添加
    console.log('\n=== 逐个添加 ===');
    for (const name of TARGETS) {
      const ok = await page.evaluate(n => {
        const b = [...document.querySelectorAll('.ff-boards-library-group button')]
          .find(x => (x.textContent || '').includes(n) && x.offsetParent);
        if (b) { b.click(); return true; }
        return false;
      }, name);
      await page.waitForTimeout(1200);
      console.log(`  ${ok ? 'ADD ' : 'MISS'} ${name}`);
    }
    await page.waitForTimeout(4000);

    const hud = await page.evaluate(() => {
      const rt = globalThis.__FF_GLB_RUNTIME__;
      if (!rt) return null;
      const items = [];
      rt.equipmentMap.forEach(e => items.push({
        label: e.label, glbLoaded: e.glbLoaded, meshes: e.meshCount
      }));
      return { fixtures: rt.equipmentMap.size, glbs: rt.stats.loadedGlbs, meshes: rt.stats.totalMeshes, items };
    });
    console.log('\n=== HUD / 运行时 ===');
    console.log(JSON.stringify(hud, null, 1));
    await page.screenshot({ path: path.join(OUT, 'replica-all-25d.png') });

    // 切 3D
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('.ff-boards button')].find(x => (x.textContent || '').trim() === '3D');
      if (b) b.click();
    });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(OUT, 'replica-all-3d.png') });

  } catch (e) {
    console.error('ERR:', e.message);
  } finally {
    console.log('\npageerrors:', errs.length ? [...new Set(errs)].slice(0, 5).join(' | ') : '(none)');
    console.log('4xx/5xx:', fail4xx.length ? [...new Set(fail4xx)].slice(0, 8).join(' | ') : '(none)');
    await browser.close();
  }
})();
