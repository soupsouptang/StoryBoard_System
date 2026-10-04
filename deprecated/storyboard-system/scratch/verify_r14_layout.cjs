// R14 §7 布局尺寸全项复验（build 后）
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const BASE = process.env.FRAMEFORGE_QA_BASE || 'http://127.0.0.1:18799';
const OUT = path.join(__dirname, '../qa-artifacts/r14-layout');
fs.mkdirSync(OUT, { recursive: true });

const SPEC = {
  'Global Header': ['.global-header', 48],
  'Module Header': ['.project-context-header', 44],
  'Toolbar': ['.workspace-toolbar', 40],
  'Sidebar Row': ['.ff73-nav-item', 36],
  'Table Header': ['#mainShotTable thead th', 36],
  'Table Row': ['#mainShotTable tbody tr', 44],
  'Toolbar Control': ['.ff73-toolbar-root .ffui-button', 32],
};

(async () => {
  const browser = await chromium.launch({ headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.setDefaultTimeout(25000);
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
    await page.fill('#newProjForm [name=name]', 'qa-r14-verify-' + Date.now());
    await page.click('#newProjForm button[type=submit]');
    await page.waitForSelector('#mainShotTable');
    await page.waitForTimeout(3000);

    const measured = await page.evaluate(spec => {
      const out = {};
      for (const k in spec) {
        const e = document.querySelector(spec[k][0]);
        out[k] = e ? Math.round(e.getBoundingClientRect().height) : null;
      }
      return out;
    }, SPEC);

    let pass = 0;
    console.log('层                    实测 / 规格   结果');
    console.log('-'.repeat(46));
    for (const k in SPEC) {
      const want = SPEC[k][1], got = measured[k];
      const ok = got === want;
      if (ok) pass++;
      console.log(`${k.padEnd(20)} ${String(got).padStart(4)} / ${String(want).padEnd(4)}   ${ok ? 'OK' : 'DIFF'}`);
    }
    console.log('-'.repeat(46));
    console.log(`符合 ${pass}/${Object.keys(SPEC).length}`);

    await page.screenshot({ path: path.join(OUT, 'r14-layout-verified.png') });
  } catch (e) { console.error('ERR:', e.message); }
  finally { console.log('errors:', errs.length ? [...new Set(errs)].slice(0, 3).join(' | ') : '(none)'); await browser.close(); }
})();
