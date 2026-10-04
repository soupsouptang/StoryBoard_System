// 验证 2.5D 已移除：模式按钮只剩 2D/分屏/3D，且各模式可正常渲染
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const BASE = process.env.FRAMEFORGE_QA_BASE || 'http://127.0.0.1:18799';
const OUT = path.join(__dirname, '../qa-artifacts/no25d');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.setDefaultTimeout(20000);
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('response', r => { if (r.status() >= 400) errs.push(`${r.status()} ${r.url().split('/').pop()}`); });

  try {
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    if (await page.locator('#loginForm').isVisible().catch(() => false)) {
      await page.fill('[name=username]', 'admin');
      await page.fill('[name=password]', 'FrameForge2026!Admin');
      await page.click('#loginForm button[type=submit]');
    }
    await page.waitForSelector('#dashboardView:not(.hidden)');
    await page.click('#dashNewProjectBtn');
    await page.fill('#newProjForm [name=name]', 'qa-no25d-' + Date.now());
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
      const t = [...document.querySelectorAll('button')].find(n => /SkyPanel/i.test(n.textContent || '') && n.offsetParent);
      if (t) t.click();
    });
    await page.waitForTimeout(2500);

    const modes = await page.evaluate(() =>
      [...document.querySelectorAll('.ff-boards-view-modes button')].map(b => b.textContent.trim()));
    console.log('模式按钮:', JSON.stringify(modes));
    console.log('含 2.5D:', modes.some(m => /2\.5/i.test(m)));

    const cur = await page.evaluate(() => document.querySelector('.ff-boards')?.dataset?.viewMode);
    console.log('默认 viewMode =', cur);

    for (const m of ['2D', '分屏', '3D']) {
      const ok = await page.evaluate(label => {
        const b = [...document.querySelectorAll('.ff-boards-view-modes button')]
          .find(x => x.textContent.trim() === label);
        if (b) { b.click(); return true; }
        return false;
      }, m);
      await page.waitForTimeout(2600);
      const info = await page.evaluate(() => {
        const rt = globalThis.__FF_GLB_RUNTIME__;
        return {
          viewMode: document.querySelector('.ff-boards')?.dataset?.viewMode,
          canvases: document.querySelectorAll('.ff-boards canvas').length,
          fixtures: rt ? rt.equipmentMap.size : null
        };
      });
      console.log(`  ${m}: clicked=${ok} → ${JSON.stringify(info)}`);
      await page.screenshot({ path: path.join(OUT, `mode-${m.replace(/[^a-zA-Z0-9]/g, '')}.png`) });
    }
  } catch (e) {
    console.error('ERR:', e.message);
  } finally {
    console.log('errors:', errs.length ? [...new Set(errs)].slice(0, 6).join(' | ') : '(none)');
    await browser.close();
  }
})();
