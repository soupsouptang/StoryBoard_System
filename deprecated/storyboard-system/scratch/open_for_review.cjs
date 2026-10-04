/* 打开一个真实可见的浏览器窗口，供人工实际操作审阅。保持运行直到关闭窗口。 */
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: false,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--force-device-scale-factor=1'],
  });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('[pageerror]', e.message.slice(0, 200)));
  page.on('console', m => { if (m.type() === 'error') console.log('[console.error]', m.text().slice(0, 200)); });

  await page.goto('http://127.0.0.1:18765/', { waitUntil: 'networkidle' });
  console.log('READY — 浏览器已打开，请登录：qa-admin / QA-Password-Only-2026!');

  // 保持进程存活，直到浏览器窗口被关闭
  await new Promise(resolve => {
    const timer = setInterval(() => {
      if (!browser.isConnected()) { clearInterval(timer); resolve(); }
    }, 1000);
    page.on('close', () => { clearInterval(timer); resolve(); });
  });
  console.log('CLOSED');
  await browser.close().catch(() => {});
})().catch(e => { console.error('OPEN FAILED', e.message); process.exitCode = 1; });
