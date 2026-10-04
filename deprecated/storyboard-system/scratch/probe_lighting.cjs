// 独立验证脚本：不依赖项目自证测试，直接探测 DOM + 运行时状态 + 截图
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE = process.env.FRAMEFORGE_QA_BASE || 'http://127.0.0.1:18799';
const OUT = path.join(__dirname, '../qa-artifacts/independent');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const executablePath = process.env.CHROME_PATH ||
    (process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : undefined);
  const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.setDefaultTimeout(15000);

  const consoleErrors = [];
  const netFails = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', e => consoleErrors.push('PAGEERROR: ' + e.message));
  page.on('response', r => { if (r.status() >= 400) netFails.push(`${r.status()} ${r.url()}`); });

  const shot = async n => { await page.screenshot({ path: path.join(OUT, n + '.png') }); console.log('shot:', n); };

  try {
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    if (await page.locator('#loginForm').isVisible().catch(() => false)) {
      await page.fill('[name=username]', process.env.QA_USER || 'admin');
      await page.fill('[name=password]', process.env.QA_PASS || 'FrameForge2026!Admin');
      await page.click('#loginForm button[type=submit]');
    }
    await page.waitForSelector('#dashboardView:not(.hidden)', { timeout: 20000 });

    // create project
    await page.click('#dashNewProjectBtn');
    await page.fill('#newProjForm [name=name]', 'qa-indep-probe-' + Date.now());
    await page.click('#newProjForm button[type=submit]');
    await page.waitForSelector('#workspaceView:not(.hidden),#mainShotTable', { timeout: 20000 });
    console.log('project opened');

    // dump nav candidates
    const navs = await page.evaluate(() => {
      const out = [];
      document.querySelectorAll('[data-nav-key],[data-view],[data-board-kind],[data-kind]').forEach(el => {
        out.push({ tag: el.tagName, cls: el.className.slice(0, 60), attrs: JSON.stringify({
          navKey: el.dataset.navKey, view: el.dataset.view, kind: el.dataset.kind, boardKind: el.dataset.boardKind
        }), text: (el.textContent || '').trim().slice(0, 24) });
      });
      return out.slice(0, 60);
    });
    console.log('--- NAV CANDIDATES ---');
    console.log(JSON.stringify(navs, null, 1));

    await shot('01-after-project');

    console.log('THREE loaded:', await page.evaluate(() => typeof globalThis.THREE));
    console.log('LightingScene mod:', await page.evaluate(() => typeof globalThis.FrameForgeLightingScene));
    console.log('LightingRender mod:', await page.evaluate(() => typeof globalThis.FrameForgeLightingRender));
    console.log('presets count:', await page.evaluate(() => {
      const m = globalThis.FrameForgeLightingScene;
      return m && m.PRESETS ? (Array.isArray(m.PRESETS) ? m.PRESETS.length : Object.keys(m.PRESETS).length) : 'n/a';
    }));

  } catch (e) {
    console.error('PROBE ERROR:', e.message);
    await shot('99-error');
  } finally {
    console.log('--- CONSOLE ERRORS ---');
    console.log(consoleErrors.length ? consoleErrors.slice(0, 20).join('\n') : '(none)');
    console.log('--- NETWORK >=400 ---');
    console.log(netFails.length ? [...new Set(netFails)].slice(0, 20).join('\n') : '(none)');
    await browser.close();
  }
})();
