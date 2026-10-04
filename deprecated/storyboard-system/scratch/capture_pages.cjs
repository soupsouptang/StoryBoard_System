/* 全页面/全控件截图采集（带硬超时）。产出截图供视觉审查，不产断言。 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { Harness } = require('../tests/lib/qa-harness.cjs');

const OUT = path.join(__dirname, '..', 'qa-artifacts', 'pages');
fs.mkdirSync(OUT, { recursive: true });
const H = new Harness({ globalMs: 220000, stepMs: 18000, logPath: path.join(OUT, 'capture.log') }).start();

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.setDefaultTimeout(8000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message.slice(0, 140)));

  const shot = async (name) => {
    await H.step('shot ' + name, async () => {
      await page.waitForTimeout(700);
      await page.screenshot({ path: path.join(OUT, `${name}.png`) });
    }, 12000);
  };

  // 1. 登录页
  await H.step('goto login', async () => {
    await page.goto('http://127.0.0.1:18765/', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#loginView:not(.hidden)', { timeout: 10000 });
  });
  await shot('01-login');

  // 2. 登录后 → 项目大厅
  await H.step('login', async () => {
    await page.fill('[name=username]', 'qa-admin');
    await page.fill('[name=password]', 'QA-Password-Only-2026!');
    await page.click('#loginForm button[type=submit]');
    await page.waitForSelector('#dashboardView:not(.hidden)', { timeout: 12000 });
  });
  await shot('02-dashboard');

  // 3. 进入项目
  await H.step('open project', async () => {
    await page.locator('#projectGrid .project-row').first().click();
    await page.waitForSelector('#mainShotTable', { timeout: 15000 });
    await page.waitForTimeout(800);
  });
  await shot('03-shotlist');

  // 4. 打开详情面板
  await H.step('open inspector', async () => {
    await page.locator('#mainShotTable tbody tr').nth(5).click();
    await page.waitForTimeout(900);
  });
  await shot('04-inspector');

  // 5. 原位编辑态（工具条可见）
  await H.step('inline edit', async () => {
    const sel = `#mainShotTable tbody tr:nth-child(7) td[data-field="description"]`;
    await page.locator(sel).scrollIntoViewIfNeeded();
    await page.locator(sel).dblclick();
    await page.waitForTimeout(500);
    await page.keyboard.press('Control+a');
    await page.waitForTimeout(400);
  });
  await shot('05-inline-editing');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);

  // 6. 横纵同时滚动的表头状态
  await H.step('scroll both axes', async () => {
    await page.evaluate(() => {
      const w = document.getElementById('tableScrollWrap');
      if (w) { w.scrollTop = 500; w.scrollLeft = 900; }
    });
    await page.waitForTimeout(500);
  });
  await shot('06-table-scrolled-both');

  const probeHeader = async (label) => page.evaluate(() => {
    const ths = [...document.querySelectorAll('.shot-table thead th')];
    let probes = 0, leaked = 0;
    const bad = [];
    ths.forEach((th, i) => {
      const b = th.getBoundingClientRect();
      if (b.width < 4 || b.height < 4) return;
      const x = Math.round(b.x + b.width / 2), y = Math.round(b.y + b.height / 2);
      if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) return;
      probes++;
      const hit = document.elementFromPoint(x, y);
      if (!(hit && hit.closest('thead'))) { leaked++; bad.push({ i, hitCls: (hit?.className || '').toString().slice(0, 30) }); }
    });
    return { probes, leaked, bad: bad.slice(0, 3) };
  });
  const headerCheck = await H.step('header check', () => probeHeader());
  if (headerCheck.ok) H.record('横纵滚动后表头仍压在数据行之上', headerCheck.value.leaked === 0, headerCheck.value);

  // 7. 四视图切换
  const views = await page.evaluate(() => [...document.querySelectorAll('[data-view]')].map(b => ({ key: b.dataset.view, label: (b.textContent || '').trim().slice(0, 12), visible: !!(b.offsetWidth && b.offsetHeight) })));
  H.say('VIEWS ' + JSON.stringify(views));
  const seen = new Set();
  for (const v of views.filter(v => v.visible)) {
    if (seen.has(v.key)) continue;
    seen.add(v.key);
    const r = await H.step('view ' + v.key, async () => {
      await page.locator(`[data-view="${v.key}"]`).first().click();
      await page.waitForTimeout(1100);
    }, 12000);
    if (r.ok) await shot(`07-view-${v.key}`);
  }

  // 8. 遍历侧栏所有导航页面
  const navs = await page.evaluate(() => [...document.querySelectorAll('[data-nav-key]')].map(b => ({ key: b.dataset.navKey, label: (b.textContent || '').trim().slice(0, 12), visible: !!(b.offsetWidth && b.offsetHeight) })));
  H.say('NAVS ' + JSON.stringify(navs));
  let n = 8;
  for (const item of navs.filter(x => x.visible)) {
    const r = await H.step('nav ' + item.key, async () => {
      await page.locator(`[data-nav-key="${item.key}"]`).first().click();
      await page.waitForTimeout(1300);
    }, 14000);
    if (r.ok) await shot(`${String(n++).padStart(2, '0')}-nav-${item.key}`);
  }

  H.record('采集过程无 JS 报错', errors.length === 0, errors.slice(0, 4));
  await H.finish();
  H.say('SCREENSHOTS -> ' + OUT);
  await browser.close();
  process.exit(0);
})().catch(e => { H.say('ERROR ' + e.message); H._flush(); process.exit(1); });
