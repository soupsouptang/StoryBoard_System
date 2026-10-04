/* 定位 SHOT 003 行的灰色块元素 */
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.setDefaultTimeout(10000);
  await page.goto('http://127.0.0.1:18765/', { waitUntil: 'domcontentloaded' });
  await page.fill('[name=username]', 'qa-admin');
  await page.fill('[name=password]', 'QA-Password-Only-2026!');
  await page.click('#loginForm button[type=submit]');
  await page.waitForSelector('#dashboardView:not(.hidden)');
  await page.locator('#projectGrid .project-row').first().click();
  await page.waitForSelector('#mainShotTable');
  await page.waitForTimeout(800);

  const info = await page.evaluate(() => {
    // 灰块视觉位置约 (780, 275)
    const el = document.elementFromPoint(780, 275);
    if (!el) return 'no element';
    const chain = [];
    let node = el;
    while (node && node !== document.body && chain.length < 8) {
      const s = getComputedStyle(node);
      const r = node.getBoundingClientRect();
      chain.push({ tag: node.tagName, cls: (node.className || '').toString().slice(0, 70), bg: s.backgroundColor, border: s.borderTopWidth + ' ' + s.borderTopColor, radius: s.borderRadius, box: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }, html: node.tagName === 'TD' ? node.innerHTML.slice(0, 150) : undefined });
      node = node.parentElement;
    }
    return chain;
  });
  console.log(JSON.stringify(info, null, 1));
  await browser.close();
})().catch(e => { console.error(e.message); process.exitCode = 1; });
