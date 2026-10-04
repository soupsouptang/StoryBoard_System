/* 带超时保护的视觉度量探针：任何一步卡住都跳过并记下，绝不让整体挂死。 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'http://127.0.0.1:18765';
const OUT = path.join(__dirname, '..', 'qa-artifacts', 'review');
fs.mkdirSync(OUT, { recursive: true });

const step = async (label, fn, ms = 12000) => {
  try {
    return await Promise.race([
      fn(),
      new Promise((_, rej) => setTimeout(() => rej(new Error('STEP TIMEOUT')), ms)),
    ]);
  } catch (e) {
    console.log(`SKIP ${label}: ${e.message.slice(0, 80)}`);
    return { skipped: e.message.slice(0, 80) };
  }
};

const measureFn = () => {
  const box = el => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; };
  const rectsOverlap = (a, b) => !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
  const out = {};

  const th = document.querySelector('.shot-table thead th');
  const firstRow = document.querySelector('.shot-table tbody tr');
  if (th && firstRow) {
    const a = box(th), b = box(firstRow);
    const s = getComputedStyle(th);
    out.headerOverlap = { th: a, firstRow: b, overlap: rectsOverlap(a, b), position: s.position, top: s.top, zIndex: s.zIndex, bg: s.backgroundColor };
  } else out.headerOverlap = 'missing';

  const rows = document.querySelectorAll('.shot-table tbody tr').length;
  out.rowCount = rows;

  // 搜索框：输入框与父容器是否各画一层边框（双重外框）
  const input = document.querySelector('input#shotSearchInput, .search-box input, input[type=search], #globalSearch, .toolbar input[type=text]');
  if (input) {
    const p = input.parentElement;
    const cs = getComputedStyle(input), ps = p ? getComputedStyle(p) : null;
    out.search = {
      inputBox: box(input),
      input: { border: cs.borderTopWidth + ' ' + cs.borderTopColor, radius: cs.borderRadius, h: Math.round(input.getBoundingClientRect().height), padL: cs.paddingLeft },
      parent: p ? { cls: (p.className || '').toString().slice(0, 50), box: box(p), border: ps.borderTopWidth, radius: ps.borderRadius, h: Math.round(p.getBoundingClientRect().height) } : null,
      doubleBorder: !!(ps && parseFloat(ps.borderTopWidth) > 0 && parseFloat(cs.borderTopWidth) > 0),
    };
  } else out.search = 'missing';

  // 详情面板：可疑黑底 / 粗边框
  const insp = document.getElementById('inspectorScroll') || document.querySelector('.inspector');
  if (insp) {
    const suspects = [];
    insp.querySelectorAll('*').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return;
      const s = getComputedStyle(el);
      const m = s.backgroundColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
      const opaqueBlack = m && +m[1] < 30 && +m[2] < 30 && +m[3] < 30 && (m[4] === undefined || +m[4] > 0.9);
      const thick = parseFloat(s.borderTopWidth) >= 3 || parseFloat(s.borderLeftWidth) >= 3;
      if ((opaqueBlack || thick) && suspects.length < 15) {
        suspects.push({ tag: el.tagName, cls: (el.className || '').toString().slice(0, 45), text: (el.textContent || '').trim().slice(0, 18), bg: s.backgroundColor, bw: s.borderTopWidth });
      }
    });
    out.inspector = { rows: insp.querySelectorAll('.property-row').length, suspects };
  } else out.inspector = 'missing';

  // 锁定时长行
  const lockRow = [...document.querySelectorAll('.property-row')].find(r => /锁定/.test(r.textContent || ''));
  if (lockRow) {
    const s = getComputedStyle(lockRow);
    const inner = lockRow.querySelector('.property-value') || lockRow;
    const is = getComputedStyle(inner);
    out.lockRow = { bg: s.backgroundColor, border: s.borderTopWidth, valueBg: is.backgroundColor, valueBorder: is.borderTopWidth, text: (lockRow.textContent || '').trim().slice(0, 40), h: Math.round(lockRow.getBoundingClientRect().height) };
  } else out.lockRow = 'missing';

  return out;
};

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message.slice(0, 160)));

  const report = {};

  await step('login', async () => {
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await page.fill('[name=username]', 'qa-admin');
    await page.fill('[name=password]', 'QA-Password-Only-2026!');
    await page.click('#loginForm button[type=submit]');
    await page.waitForSelector('#dashboardView:not(.hidden)');
  });

  // 用已有项目，避免新建造数把时间耗光
  await step('open project', async () => {
    const first = page.locator('#projectGrid .project-row').first();
    if (await first.count()) { await first.click(); }
    else {
      await page.click('#dashNewProjectBtn');
      await page.fill('#newProjForm [name=name]', 'qa-probe-' + Date.now().toString(36));
      await page.click('#newProjForm button[type=submit]');
    }
    await page.waitForSelector('#mainShotTable', { timeout: 15000 });
    await page.waitForTimeout(800);
  }, 25000);

  report.table = await step('measure table', () => page.evaluate(measureFn));
  await step('shot table', () => page.screenshot({ path: path.join(OUT, '01-table.png') }));

  await step('open detail', async () => {
    await page.locator('#mainShotTable tbody tr').first().click();
    await page.waitForTimeout(900);
  });
  report.detail = await step('measure detail', () => page.evaluate(measureFn));
  await step('shot detail', () => page.screenshot({ path: path.join(OUT, '02-detail.png') }));

  report.pageErrors = errors;
  fs.writeFileSync(path.join(OUT, 'probe-report.json'), JSON.stringify(report, null, 1));
  console.log(JSON.stringify(report, null, 1));
  await browser.close();
})().catch(e => { console.error('PROBE FAILED', e.message); process.exitCode = 1; });
