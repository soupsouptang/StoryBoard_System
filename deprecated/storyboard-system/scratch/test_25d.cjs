/* 2.5D 渲染实测：进灯光图 → 创建画板 → 添加对象 → 截图 */
const { chromium } = require('playwright');
const path = require('path');
const { Harness } = require('../tests/lib/qa-harness.cjs');
const OUT = path.join(__dirname, '..', 'qa-artifacts', 'pages');
const H = new Harness({ globalMs: 120000, stepMs: 15000, logPath: path.join(OUT, 'v8-test.log') }).start();

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message.slice(0, 160)));

  await page.goto('http://127.0.0.1:18765/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#loginView:not(.hidden)', { timeout: 15000 });
  await page.fill('#loginView [name=username]', 'qa-admin');
  await page.fill('#loginView [name=password]', 'QA-Password-Only-2026!');
  await page.click('#loginForm button[type=submit]');
  await page.waitForSelector('#dashboardView:not(.hidden)', { timeout: 12000 });
  await page.locator('#projectGrid .project-row').first().click();
  await page.waitForSelector('#mainShotTable', { timeout: 15000 });
  await page.waitForTimeout(800);

  // 进灯光图
  await page.locator('[data-nav-key="lighting"]').first().click();
  await page.waitForTimeout(1500);

  // 创建画板（用 evaluate 触发，避免遮挡问题）
  const hasBoard = await page.evaluate(() => !!document.querySelector('.ff-boards-empty-state'));
  if (hasBoard) {
    H.say('creating board...');
    await page.evaluate(() => {
      const btns = [...document.querySelectorAll('[data-action="create-board"]')];
      const btn = btns.find(b => b.offsetWidth && b.offsetHeight) || btns[0];
      if (btn) btn.click();
    });
    await page.waitForTimeout(1500);
  } else {
    H.say('board exists');
  }

  // 添加几个对象（通过 palette 按钮）
  const added = await page.evaluate(() => {
    const palette = document.querySelector('.ff-boards-palette');
    if (!palette) return 'no palette';
    const btns = [...palette.querySelectorAll('button')];
    const added = [];
    // 添加：灯、摄影机、演员、桌子
    for (const label of ['灯具', '摄影机', '演员', '桌子']) {
      const btn = btns.find(b => b.textContent.includes(label));
      if (btn) { btn.click(); added.push(label); }
    }
    return added;
  });
  H.say('added: ' + JSON.stringify(added));
  await page.waitForTimeout(1200);

  // 确认 2.5D 模式
  const mode = await page.evaluate(() => document.querySelector('[data-view-mode]')?.dataset.viewMode || document.querySelector('.ff-boards')?.dataset.viewMode);
  H.say('view mode: ' + mode);

  // 截图
  await page.screenshot({ path: path.join(OUT, '40-lighting-25d.png') });
  H.say('screenshot saved');

  // 切到 2D 模式对比
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('.ff-boards-toolbar button')];
    const btn = btns.find(b => b.textContent === '2D');
    if (btn) btn.click();
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, '41-lighting-2d.png') });

  // 切回 2.5D
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('.ff-boards-toolbar button')];
    const btn = btns.find(b => b.textContent === '2.5D');
    if (btn) btn.click();
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, '42-lighting-25d-back.png') });

  H.record('无 JS 报错', errors.length === 0, errors.slice(0, 3));
  await H.finish();
  await browser.close();
  process.exit(0);
})().catch(e => { H.say('ERROR ' + e.message); H._flush(); process.exit(1); });
