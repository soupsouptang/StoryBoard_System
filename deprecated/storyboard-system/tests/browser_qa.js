const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const out = path.resolve(__dirname, '..', 'qa-artifacts');
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(10000);
  const consoleErrors = [];
  const failed = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('requestfailed', r => failed.push(`${r.method()} ${r.url()} ${r.failure()?.errorText}`));
  await page.goto('http://127.0.0.1:18765/', { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(out, '01-login-desktop.png'), fullPage: true });
  await page.fill('[name=username]', 'qa-admin');
  await page.fill('[name=password]', 'QA-Password-Only-2026!');
  await page.click('#loginForm button[type=submit]');
  await page.waitForSelector('#dashboard:not(.hidden)');
  await page.click('#newProjectBtn');
  await page.fill('#projectForm [name=name]', '浏览器 QA · TVC');
  await page.selectOption('#projectForm [name=production_type]', 'tvc');
  await page.fill('#projectForm [name=target_seconds]', '30');
  await page.click('#projectForm button.primary');
  await page.waitForSelector('#workspace:not(.hidden)');
  await page.click('#addShotBtn');
  await page.waitForSelector('.shot-card');
  await page.fill('.shot-card [data-key=description]', '产品在黑色镜面上旋转，硬光扫过金属边缘。');
  await page.fill('.shot-card [data-key=voiceover]', '每一次突破，都来自对细节的坚持。');
  await page.click('#autoTimingBtn');
  await page.click('#applyTimingBtn');
  await page.click('#saveBtn');
  await page.waitForTimeout(350);
  await page.screenshot({ path: path.join(out, '02-workspace-desktop.png'), fullPage: true });
  await page.click('[data-mode=table]');
  await page.screenshot({ path: path.join(out, '03-table-desktop.png'), fullPage: true });
  const mobile = await browser.newPage({ viewport: { width: 375, height: 812 } });
  await mobile.goto('http://127.0.0.1:18765/', { waitUntil: 'networkidle' });
  await mobile.screenshot({ path: path.join(out, '04-login-mobile.png'), fullPage: true });
  const report = {
    consoleErrors,
    failedRequests: failed,
    projectTitle: await page.textContent('#projectName'),
    shotCount: await page.textContent('#shotCount'),
    totalDuration: await page.textContent('#totalDuration'),
    screenshots: fs.readdirSync(out).filter(x => x.endsWith('.png'))
  };
  fs.writeFileSync(path.join(out, 'browser-qa.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  if (consoleErrors.length || failed.length) process.exitCode = 1;
})().catch(err => {
  console.error(err);
  try { fs.mkdirSync(path.resolve(__dirname, '..', 'qa-artifacts'), { recursive: true }); fs.writeFileSync(path.resolve(__dirname, '..', 'qa-artifacts', 'browser-qa-error.txt'), String(err.stack || err)); } catch {}
  process.exit(2);
});
