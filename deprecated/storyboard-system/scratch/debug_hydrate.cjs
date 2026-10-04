// 调试：确认载入后前端内存里的 board 结构与 hydrate 是否生效
const { chromium } = require('playwright');
const BASE = process.env.FRAMEFORGE_QA_BASE || 'http://127.0.0.1:18799';

(async () => {
  const executablePath = process.env.CHROME_PATH ||
    (process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : undefined);
  const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.setDefaultTimeout(20000);
  const logs = [];
  page.on('console', m => logs.push(m.type() + ': ' + m.text()));
  page.on('pageerror', e => logs.push('PAGEERROR: ' + e.message));

  try {
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    if (await page.locator('#loginForm').isVisible().catch(() => false)) {
      await page.fill('[name=username]', 'admin');
      await page.fill('[name=password]', 'FrameForge2026!Admin');
      await page.click('#loginForm button[type=submit]');
    }
    await page.waitForSelector('#dashboardView:not(.hidden)');
    await page.click('#dashNewProjectBtn');
    await page.fill('#newProjForm [name=name]', 'qa-hyd-' + Date.now());
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
      const g = document.querySelector('.ff-boards-library-group');
      const b = g && g.querySelector('button:not([hidden])');
      if (b) b.click();
    });
    await page.waitForTimeout(2500);

    console.log('modules present:', await page.evaluate(() => ({
      scene: typeof globalThis.FrameForgeLightingScene,
      demote: typeof globalThis.FrameForgeLightingScene?.demoteItem,
      render: typeof globalThis.FrameForgeLightingRender
    })));

    await page.evaluate(() => {
      const b = [...document.querySelectorAll('.ff-boards button')].find(x => /保存|重试/.test((x.textContent || '').trim()) && x.offsetParent);
      if (b) b.click();
    });
    await page.waitForTimeout(3000);

    console.log('status text:', await page.evaluate(() =>
      [...document.querySelectorAll('.ff-boards button, .ff-boards-status, .ff-boards-notice')]
        .map(e => e.textContent.trim()).filter(t => /保存|失败|重试|已/.test(t))));

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    // 直接从仪表盘点开最近项目
    await page.evaluate(() => {
      const el = document.querySelector('#projectsList li, .project-row, .project-card');
      if (el) { const b = el.querySelector('button,a'); (b || el).click(); }
    });
    await page.waitForTimeout(2500);
    await page.click('[data-nav-key="lighting"]').catch(() => {});
    await page.waitForTimeout(3000);

    // 直接问服务端这份 board 长什么样
    const apiBoards = await page.evaluate(async () => {
      const pid = location.hash.match(/[0-9a-f-]{8,}/)?.[0];
      if (!pid) return 'no pid in hash: ' + location.hash;
      const r = await fetch('/api/projects/' + pid + '/creative-boards', { credentials: 'same-origin' });
      const d = await r.json();
      return d.boards.map(b => ({ kind: b.kind, nItems: (b.items || []).length, nObjects: (b.objects || []).length }));
    });
    console.log('server boards:', JSON.stringify(apiBoards));
    console.log('DOM item nodes:', await page.evaluate(() => document.querySelectorAll('.ff-boards-item').length));
    console.log('canvas count :', await page.evaluate(() => document.querySelectorAll('.ff-boards canvas').length));
    console.log('empty state  :', await page.evaluate(() => !!document.querySelector('.ff-boards-empty-state')));
  } catch (e) {
    console.error('ERR:', e.message);
  } finally {
    console.log('--- console ---');
    console.log(logs.slice(-15).join('\n') || '(none)');
    await browser.close();
  }
})();
