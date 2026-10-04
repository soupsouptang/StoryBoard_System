/* 诊断脚本（走统一骨架）：表头滚动重叠 + 双击原位编辑。硬超时 150s。 */
const { chromium } = require('playwright');
const path = require('path');
const { Harness } = require('../tests/lib/qa-harness.cjs');

const OUT = path.join(__dirname, '..', 'qa-artifacts', 'review');
const H = new Harness({ globalMs: 150000, stepMs: 20000, logPath: path.join(OUT, 'diag.log') }).start();

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
  H.say('browser launched');
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.setDefaultTimeout(8000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message.slice(0, 160)));

  await H.step('login', async () => {
    await page.goto('http://127.0.0.1:18765/', { waitUntil: 'domcontentloaded' });
    await page.fill('[name=username]', 'qa-admin');
    await page.fill('[name=password]', 'QA-Password-Only-2026!');
    await page.click('#loginForm button[type=submit]');
    await page.waitForSelector('#dashboardView:not(.hidden)', { timeout: 10000 });
  });

  await H.step('open project', async () => {
    await page.locator('#projectGrid .project-row').first().click();
    await page.waitForSelector('#mainShotTable', { timeout: 15000 });
    await page.waitForTimeout(700);
  });

  await H.step('header stays above rows when scrolled', async () => {
    // 滚动时数据行必然从表头下方穿过（矩形相交是正常的）。
    // 真正的判据是层叠：表头区域内的点命中的应是表头元素，而不是数据行。
    await page.evaluate(() => { const w = document.getElementById('tableScrollWrap'); if (w) w.scrollTop = 400; });
    await page.waitForTimeout(350);
    const info = await page.evaluate(() => {
      const ths = [...document.querySelectorAll('.shot-table thead th')];
      const probes = [];
      ths.slice(0, 8).forEach((th, i) => {
        const b = th.getBoundingClientRect();
        if (b.width < 4 || b.height < 4) return;
        const x = Math.round(b.x + b.width / 2);
        const y = Math.round(b.y + b.height / 2);
        const hit = document.elementFromPoint(x, y);
        probes.push({ i, x, y, insideHeader: !!(hit && hit.closest('thead')), hitTag: hit?.tagName, hitCls: (hit?.className || '').toString().slice(0, 30) });
      });
      const bad = probes.filter(p => !p.insideHeader);
      const th0 = ths[0];
      const cs = th0 ? getComputedStyle(th0) : null;
      const head = th0?.closest('thead');
      return {
        probes: probes.length, leaked: bad.length, badSample: bad.slice(0, 4),
        th: cs ? { position: cs.position, top: cs.top, z: cs.zIndex, bg: cs.backgroundColor } : null,
        thead: head ? { position: getComputedStyle(head).position, z: getComputedStyle(head).zIndex, bg: getComputedStyle(head).backgroundColor } : null,
      };
    });
    H.record('滚动后表头压在数据行之上的层叠正确（命中测试）', info.leaked === 0, info);
  });

  await H.step('find cells with real text', async () => {
    const cells = await page.evaluate(() => {
      const out = [];
      document.querySelectorAll('#mainShotTable tbody tr').forEach((tr, i) => {
        const td = tr.querySelector('td[data-field="description"]');
        if (!td) return;
        const t = (td.textContent || '').trim();
        if (t && t !== '—' && t.length > 6 && out.length < 5) out.push({ row: i, len: t.length, text: t.slice(0, 30) });
      });
      return out;
    });
    H.say('CELLS ' + JSON.stringify(cells));
    if (!cells.length) { H.skip('dblclick real cell', 'no cell with text'); return; }

    const sel = `#mainShotTable tbody tr:nth-child(${cells[0].row + 1}) td[data-field="description"]`;
    const r = await H.step('dblclick real cell', async () => {
      await page.locator(sel).scrollIntoViewIfNeeded();
      await page.locator(sel).dblclick();
      await page.waitForTimeout(600);
      return page.evaluate(s => {
        const td = document.querySelector(s);
        const host = td?.querySelector('.cell-display') || td;
        return {
          tdEditing: !!td?.classList.contains('is-rich-editing'),
          tdCE: td?.getAttribute('contenteditable'),
          hostEditing: !!host?.classList?.contains('is-rich-editing'),
          hostCE: host?.getAttribute('contenteditable'),
          hostCls: (host?.className || '').toString().slice(0, 50),
          dialogOpen: document.querySelectorAll('.rich-editor-dialog[open]').length,
          toolbar: document.querySelectorAll('.rich-float-toolbar').length,
        };
      }, sel);
    });
    if (r.ok) H.record('双击有内容的单元格进入原位编辑', r.value.hostEditing && r.value.dialogOpen === 0, r.value);
  });

  H.record('无 JS 报错', errors.length === 0, errors.slice(0, 3));
  await H.finish();
  await browser.close();
  process.exit(0);
})().catch(e => { H.say('ERROR ' + e.message); H._flush(); process.exit(1); });
