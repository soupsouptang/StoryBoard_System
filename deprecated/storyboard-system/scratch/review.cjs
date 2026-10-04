/* 视觉与交互审阅：输出真实度量 + 截图，人工判读用，不是断言套件。 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.QA_BASE || 'http://127.0.0.1:18765';
const USER = 'qa-admin';
const PASS = 'QA-Password-Only-2026!';
const OUT = path.join(__dirname, '..', 'qa-artifacts', 'review');
fs.mkdirSync(OUT, { recursive: true });

const measure = () => {
  const box = el => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; };
  const cs = (el, props) => { const s = getComputedStyle(el); const o = {}; props.forEach(p => o[p] = s[p]); return o; };
  const rectsOverlap = (a, b) => !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
  const out = {};

  // NEW-09 表头与首行是否重叠
  const th = document.querySelector('.shot-table thead th');
  const firstRow = document.querySelector('.shot-table tbody tr');
  const wrap = document.getElementById('tableScrollWrap');
  if (th && firstRow) {
    const a = box(th), b = box(firstRow);
    out.headerOverlap = { th: a, firstRow: b, overlap: rectsOverlap(a, b), thStyle: cs(th, ['position', 'top', 'zIndex', 'backgroundColor']) };
  }
  out.scrollWrap = wrap ? { ...box(wrap), ...cs(wrap, ['overflowY', 'overflowX', 'height']) } : 'missing';

  // NEW-08 搜索框：图标与输入框是否双层边框 / 错位
  const search = document.querySelector('#shotSearchInput, .search-box input, input[type=search], #globalSearch');
  if (search) {
    const parent = search.closest('.search-box, .searchbar, .search-wrap, div');
    out.search = {
      input: box(search), inputStyle: cs(search, ['borderWidth', 'borderColor', 'borderRadius', 'height', 'paddingLeft']),
      parent: parent ? { cls: parent.className.slice(0, 60), ...box(parent), ...cs(parent, ['borderWidth', 'borderRadius', 'height']) } : null
    };
  } else out.search = 'missing';

  // NEW-10 详情面板：任何元素带可疑黑底/粗边框
  const inspector = document.getElementById('inspectorScroll') || document.querySelector('.inspector');
  if (inspector) {
    const suspects = [];
    inspector.querySelectorAll('*').forEach(el => {
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return;
      const bg = s.backgroundColor;
      const m = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
      const opaqueBlack = m && +m[1] < 30 && +m[2] < 30 && +m[3] < 30 && (m[4] === undefined || +m[4] > 0.9);
      const thickBorder = parseFloat(s.borderTopWidth) >= 3 || parseFloat(s.borderLeftWidth) >= 3;
      if (opaqueBlack || thickBorder) {
        suspects.push({ tag: el.tagName, cls: (el.className || '').toString().slice(0, 50), text: (el.textContent || '').trim().slice(0, 20), bg, borderWidth: s.borderTopWidth, borderColor: s.borderTopColor });
      }
    });
    out.inspectorSuspects = suspects.slice(0, 12);
  } else out.inspectorSuspects = 'missing';

  // NEW-14 旁白区域留白比例
  const vo = document.querySelector('#voiceoverView, .voiceover-panel, [data-voiceover]');
  if (vo) {
    const r = box(vo);
    const text = (vo.innerText || '').trim();
    out.voiceover = { ...r, textLen: text.length, fillRatio: text.length ? +(text.length / (r.w * r.h / 1000)).toFixed(3) : 0 };
  } else out.voiceover = 'missing';

  return out;
};

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message.slice(0, 200)));

  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.fill('[name=username]', USER);
  await page.fill('[name=password]', PASS);
  await page.click('#loginForm button[type=submit]');
  await page.waitForSelector('#dashboardView:not(.hidden)');

  const projName = 'Review-' + Date.now().toString(36);
  await page.click('#dashNewProjectBtn');
  await page.fill('#newProjForm [name=name]', projName);
  await page.click('#newProjForm button[type=submit]');
  await page.waitForSelector('#mainShotTable');

  // 造 12 行镜头，让表格能滚动
  const pid = await page.evaluate(async () => {
    const r = await fetch('/api/projects'); const j = await r.json();
    return (Array.isArray(j) ? j : j.projects || [])[0]?.id || null;
  });
  const csrf = await page.evaluate(() => (document.cookie.match(/(?:^|;\s*)ff_csrf=([^;]+)/) || [])[1] || '');
  await page.evaluate(async ({ pid, csrf }) => {
    for (let i = 0; i < 12; i++) {
      await fetch(`/api/projects/${pid}/shots`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        body: JSON.stringify({ number: `R${i + 1}`, title: `审阅镜头 ${i + 1}`, description: '用于视觉审阅的示例描述文本' })
      });
    }
  }, { pid, csrf });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('#mainShotTable');
  await page.waitForTimeout(600);

  const report = {};
  report.table = await page.evaluate(measure);
  await page.screenshot({ path: path.join(OUT, '01-table.png') });

  // 打开详情面板
  const row = page.locator('#mainShotTable tbody tr').first();
  await row.click();
  await page.waitForTimeout(600);
  report.detail = await page.evaluate(measure);
  await page.screenshot({ path: path.join(OUT, '02-detail.png') });

  // NEW-05 拖选多个字符
  await page.locator('#mainShotTable tbody tr').first().locator('td[data-field="description"]').dblclick();
  await page.waitForTimeout(500);
  const cellBox = await page.locator('#mainShotTable tbody tr').first().locator('td[data-field="description"]').boundingBox();
  if (cellBox) {
    await page.mouse.move(cellBox.x + 12, cellBox.y + cellBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(cellBox.x + Math.min(cellBox.width - 10, 160), cellBox.y + cellBox.height / 2, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(300);
  }
  report.selection = await page.evaluate(() => {
    const s = document.getSelection();
    return { text: (s?.toString() || '').slice(0, 60), len: (s?.toString() || '').length, collapsed: s ? s.isCollapsed : null };
  });
  await page.screenshot({ path: path.join(OUT, '03-drag-select.png') });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // 各页面截图
  const shots = [
    ['materials', '04-materials.png'],
    ['moodboard', '05-moodboard.png'],
    ['lighting', '06-lighting.png'],
    ['voiceover', '07-voiceover.png'],
  ];
  for (const [key, file] of shots) {
    const nav = page.locator(`[data-nav-key="${key}"]`);
    if (await nav.count()) {
      await nav.first().click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(OUT, file) });
      report[key] = await page.evaluate(measure);
    } else report[key] = 'nav missing';
  }

  report.pageErrors = errors;
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
  console.log(JSON.stringify(report, null, 1));
  console.log('SHOTS ->', OUT);
  await browser.close();
})().catch(e => { console.error('REVIEW FAILED', e); process.exitCode = 1; });
