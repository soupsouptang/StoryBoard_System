/* 快速探针：页面加载后各视图可见性 + JS 错误 */
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.setDefaultTimeout(8000);
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message.slice(0, 300)));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text().slice(0, 300)); });

  await page.goto('http://127.0.0.1:18765/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  const state = await page.evaluate(() => {
    const vis = id => { const el = document.getElementById(id); if (!el) return 'missing'; const r = el.getBoundingClientRect(); return (r.width && r.height) ? 'visible' : 'hidden'; };
    const scripts = [...document.querySelectorAll('script[src]')].map(s => s.getAttribute('src'));
    return {
      bootView: vis('bootView'), loginView: vis('loginView'), appView: vis('appView'), dashboardView: vis('dashboardView'), projectWorkView: vis('projectWorkView'),
      bodySurface: document.body.dataset.surface,
      hasLightingScene: typeof globalThis.FrameForgeLightingScene,
      hasLightingRender: typeof globalThis.FrameForgeLightingRender,
      hasRichText: typeof globalThis.FrameForgeRichText,
      hasBoards: typeof globalThis.FrameForgeBoards,
      scripts: scripts.filter(s => s.includes('lighting') || s.includes('rich-text') || s.includes('creative')),
    };
  });
  console.log(JSON.stringify(state, null, 1));
  console.log('ERRORS:', JSON.stringify(errors.slice(0, 5), null, 1));
  await browser.close();
})().catch(e => { console.error('PROBE FAILED', e.message); process.exitCode = 1; });
