// 抓真实保存失败：监听 creative-boards 相关请求的 payload / status / response body
const { chromium } = require('playwright');
const BASE = process.env.FRAMEFORGE_QA_BASE || 'http://127.0.0.1:18799';
const path = require('path');
const fs = require('fs');

(async () => {
  const executablePath = process.env.CHROME_PATH ||
    (process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : undefined);
  const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.setDefaultTimeout(20000);

  const log = { reqs: [], errors: [] };
  page.on('pageerror', e => log.errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') log.errors.push('CONSOLE: ' + m.text()); });

  const record = async (req, resp) => {
    const url = req.url();
    if (!/creative-boards|creative_boards/.test(url)) return;
    let post = null;
    try { post = req.postData(); } catch (e) { }
    let body = null;
    try { body = await resp.text(); } catch (e) { body = '<unreadable>'; }
    log.reqs.push({
      method: req.method(), url, status: resp.status(),
      postSize: post ? post.length : 0,
      post: post ? post.slice(0, 1800) : null,
      body: body ? body.slice(0, 900) : null
    });
  };
  page.on('requestfinished', async req => { try { await record(req, await req.response()); } catch (e) { } });
  page.on('response', async resp => { /* covered above */ });
  page.on('requestfailed', req => {
    if (/creative-boards/.test(req.url())) log.reqs.push({ method: req.method(), url: req.url(), failed: req.failure()?.errorText });
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
    const name = 'SaveFail ' + Date.now();
    await page.fill('#newProjForm [name=name]', name);
    await page.click('#newProjForm button[type=submit]');
    await page.waitForSelector('#mainShotTable');
    await page.click('[data-nav-key="lighting"]');
    await page.waitForTimeout(2200);
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(x => /新建画板|创建/.test((x.textContent || '').trim()) && x.offsetParent);
      if (b) b.click();
    });
    await page.waitForTimeout(2000);

    // add one fixture
    await page.evaluate(() => {
      const g = document.querySelector('.ff-boards-library-group');
      const b = g && g.querySelector('button:not([hidden])');
      if (b) b.click();
    });
    await page.waitForTimeout(2500);

    // status bar text
    const status = await page.evaluate(() => {
      const bar = document.querySelector('.ff-boards-status, .ff-boards-notice, [data-role="status"]');
      return [...document.querySelectorAll('.ff-boards button')].map(b => b.textContent.trim()).filter(t => /保存|重试|失败/.test(t));
    });
    console.log('save-related buttons:', JSON.stringify(status));

    // click save
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('.ff-boards button')].find(x => /保存|重试/.test((x.textContent || '').trim()) && x.offsetParent);
      if (b) b.click();
    });
    await page.waitForTimeout(3500);

    console.log('=== CAPTURED creative-boards TRAFFIC ===');
    console.log(JSON.stringify(log.reqs, null, 1));
    console.log('=== ERRORS ===');
    console.log(log.errors.length ? [...new Set(log.errors)].slice(0, 10).join('\n') : '(none)');

    const afterText = await page.evaluate(() => {
      const els = [...document.querySelectorAll('.ff-boards button, .ff-boards-notice')];
      return els.map(e => e.textContent.trim()).filter(t => /保存|失败|成功|重试/.test(t));
    });
    console.log('after save UI text:', JSON.stringify(afterText));

  } catch (e) {
    console.error('ERR:', e.message);
  } finally {
    await browser.close();
  }
})();
