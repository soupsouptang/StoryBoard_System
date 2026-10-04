// 验证 R11 §14 Design Token 生效
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const BASE = process.env.FRAMEFORGE_QA_BASE || 'http://127.0.0.1:18799';
const OUT = path.join(__dirname, '../qa-artifacts/r11-tokens');
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
    await page.waitForTimeout(1500);

    const tokens = await page.evaluate(() => {
      const cs = getComputedStyle(document.documentElement);
      const pick = k => cs.getPropertyValue(k).trim();
      return {
        space: [1, 2, 3, 4, 5, 6, 8].map(n => pick(`--space-${n}`)),
        radius: ['sm', 'md', 'lg', 'xl'].map(k => pick(`--radius-${k}`)),
        controlH: ['sm', 'md', 'lg'].map(k => pick(`--control-h-${k}`)),
        // 旧别名是否指向新体系
        alias: { compact: pick('--control-h-compact'), def: pick('--control-h-default'), radius: pick('--control-radius') }
      };
    });
    console.log('space   :', JSON.stringify(tokens.space));
    console.log('radius  :', JSON.stringify(tokens.radius));
    console.log('controlH:', JSON.stringify(tokens.controlH));
    console.log('别名解析:', JSON.stringify(tokens.alias));

    // 实际元素的圆角是否落在体系内
    const used = await page.evaluate(() => {
      const out = new Set();
      document.querySelectorAll('.btn, .btn-ghost-icon, .nav-item, .ff73-nav-item, input, select').forEach(e => {
        const r = getComputedStyle(e).borderTopLeftRadius;
        if (r && r !== '0px') out.add(r);
      });
      return [...out].sort();
    });
    console.log('实际控件圆角集合:', JSON.stringify(used));

    await page.screenshot({ path: path.join(OUT, 'hub-after-tokens.png') });
  } catch (e) { console.error('ERR:', e.message); }
  finally { console.log('errors:', errs.length ? [...new Set(errs)].slice(0, 4).join(' | ') : '(none)'); await browser.close(); }
})();
