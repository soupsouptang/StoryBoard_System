/* 2.5D 拖动交互验证：拖动对象 → 检查世界坐标是否更新 */
const { chromium } = require('playwright');
const path = require('path');
const { Harness } = require('../tests/lib/qa-harness.cjs');
const OUT = path.join(__dirname, '..', 'qa-artifacts', 'pages');
const H = new Harness({ globalMs: 90000, stepMs: 15000, logPath: path.join(OUT, 'drag-test.log') }).start();

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
  await page.locator('[data-nav-key="lighting"]').first().click();
  await page.waitForTimeout(1500);

  // 读取拖动前的对象位置
  const before = await page.evaluate(() => {
    const b = window.__ffBoardsDebug?.()?.boards?.[0];
    return b ? b.items.map(i => ({ id: i.id, type: i.type, x: Math.round(i.x), y: Math.round(i.y), z: i.z })) : null;
  });
  H.say('BEFORE: ' + JSON.stringify(before));

  // 找到桌子（type=furniture 或 label=桌子）的 DOM 交互层并拖动
  const dragResult = await H.step('drag table', async () => {
    const info = await page.evaluate(() => {
      const nodes = [...document.querySelectorAll('.ff-boards-item')];
      const table = nodes.find(n => n.getAttribute('aria-label')?.includes('桌子'));
      if (!table) return null;
      const r = table.getBoundingClientRect();
      return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), w: Math.round(r.width), h: Math.round(r.height) };
    });
    if (!info) return 'no table node';
    H.say('table at: ' + JSON.stringify(info));
    // 向右下拖动 100px
    await page.mouse.move(info.x, info.y);
    await page.mouse.down();
    await page.mouse.move(info.x + 100, info.y + 60, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(800);
    return 'dragged';
  });
  H.say('drag result: ' + JSON.stringify(dragResult));

  // 读取拖动后的对象位置
  const after = await page.evaluate(() => {
    const b = window.__ffBoardsDebug?.()?.boards?.[0];
    return b ? b.items.map(i => ({ id: i.id, type: i.type, x: Math.round(i.x), y: Math.round(i.y), z: i.z })) : null;
  });
  H.say('AFTER: ' + JSON.stringify(after));

  // 检查桌子是否移动了
  if (before && after) {
    const beforeTable = before.find(i => i.type === 'furniture');
    const afterTable = after.find(i => i.type === 'furniture');
    if (beforeTable && afterTable) {
      const moved = Math.abs(afterTable.x - beforeTable.x) > 5 || Math.abs(afterTable.y - beforeTable.y) > 5;
      H.record('拖动后桌子世界坐标已更新', moved, { before: beforeTable, after: afterTable });
    } else {
      H.skip('拖动后桌子世界坐标已更新', '找不到桌子对象');
    }
  } else {
    H.skip('拖动后桌子世界坐标已更新', '无法读取 board 数据');
  }

  // 截图
  await page.screenshot({ path: path.join(OUT, '43-lighting-drag.png') });
  H.record('无 JS 报错', errors.length === 0, errors.slice(0, 3));
  await H.finish();
  await browser.close();
  process.exit(0);
})().catch(e => { H.say('ERROR ' + e.message); H._flush(); process.exit(1); });
