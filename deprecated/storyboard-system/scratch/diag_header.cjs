/* 诊断：滚动后哪些行与表头几何相交、它们的层叠属性；以及双击为何没进入原位编辑 */
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.setDefaultTimeout(12000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message.slice(0, 200)));
  page.on('console', m => { if (m.type() === 'error') errors.push('C:' + m.text().slice(0, 160)); });

  await page.goto('http://127.0.0.1:18765/', { waitUntil: 'domcontentloaded' });
  await page.fill('[name=username]', 'qa-admin');
  await page.fill('[name=password]', 'QA-Password-Only-2026!');
  await page.click('#loginForm button[type=submit]');
  await page.waitForSelector('#dashboardView:not(.hidden)');
  await page.locator('#projectGrid .project-row').first().click();
  await page.waitForSelector('#mainShotTable');
  await page.waitForTimeout(900);

  // ---- 表头重叠诊断 ----
  const overlap = await page.evaluate(() => {
    const wrap = document.getElementById('tableScrollWrap');
    wrap.scrollTop = 400;
    return new Promise(resolve => setTimeout(() => {
      const th = document.querySelector('.shot-table thead th');
      const thBox = th.getBoundingClientRect();
      const thead = th.closest('thead');
      const csTh = getComputedStyle(th);
      const csThead = getComputedStyle(thead);
      const rows = [...document.querySelectorAll('.shot-table tbody tr')].map((r, i) => {
        const b = r.getBoundingClientRect();
        const hit = !(b.bottom <= thBox.top || b.top >= thBox.bottom);
        const cs = getComputedStyle(r);
        return hit ? { i, y: Math.round(b.y), h: Math.round(b.h || b.height), pos: cs.position, z: cs.zIndex, cls: r.className.slice(0, 40) } : null;
      }).filter(Boolean);
      return {
        thBox: { x: Math.round(thBox.x), y: Math.round(thBox.y), w: Math.round(thBox.width), h: Math.round(thBox.height) },
        th: { position: csTh.position, top: csTh.top, z: csTh.zIndex, bg: csTh.backgroundColor },
        thead: { position: csThead.position, top: csThead.top, z: csThead.zIndex, bg: csThead.backgroundColor },
        wrapBox: (() => { const b = wrap.getBoundingClientRect(); return { y: Math.round(b.y), h: Math.round(b.height) }; })(),
        scrollTop: wrap.scrollTop,
        hits: rows,
      };
    }, 300));
  });
  console.log('=== HEADER OVERLAP ===');
  console.log(JSON.stringify(overlap, null, 1));

  // ---- 找有真实内容的 description 单元格 ----
  const cells = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('#mainShotTable tbody tr').forEach((tr, i) => {
      const td = tr.querySelector('td[data-field="description"]');
      if (!td) return;
      const txt = (td.textContent || '').trim();
      if (txt && txt !== '—' && txt.length > 6 && out.length < 5) {
        out.push({ row: i, len: txt.length, text: txt.slice(0, 40), hasDisplay: !!td.querySelector('.cell-display'), displayCls: td.querySelector('.cell-display')?.className.slice(0, 40) });
      }
    });
    return out;
  });
  console.log('=== CELLS WITH TEXT ===');
  console.log(JSON.stringify(cells, null, 1));

  // ---- 双击有内容的单元格，看是否进入原位编辑 ----
  if (cells.length) {
    const sel = `#mainShotTable tbody tr:nth-child(${cells[0].row + 1}) td[data-field="description"]`;
    await page.locator(sel).scrollIntoViewIfNeeded();
    await page.locator(sel).dblclick();
    await page.waitForTimeout(600);
    const state = await page.evaluate(s => {
      const td = document.querySelector(s);
      const host = td?.querySelector('.cell-display') || td;
      return {
        tdEditing: td?.classList.contains('is-rich-editing'),
        tdCE: td?.getAttribute('contenteditable'),
        hostEditing: host?.classList?.contains('is-rich-editing'),
        hostCE: host?.getAttribute('contenteditable'),
        hostCls: (host?.className || '').toString().slice(0, 60),
        dialogOpen: document.querySelectorAll('.rich-editor-dialog[open]').length,
        toolbar: document.querySelectorAll('.rich-float-toolbar').length,
        toolbarVisible: document.querySelectorAll('.rich-float-toolbar.is-visible').length,
        tdHTML: td?.innerHTML.slice(0, 160),
      };
    }, sel);
    console.log('=== DBLCLICK ON REAL TEXT ===');
    console.log(JSON.stringify(state, null, 1));
  }

  console.log('=== ERRORS ===');
  console.log(JSON.stringify(errors.slice(0, 6), null, 1));
  await browser.close();
})().catch(e => { console.error('DIAG FAILED', e.message); process.exitCode = 1; });
