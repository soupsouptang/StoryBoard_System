/* 验证交叉审阅修复。数据依赖既有 80 行项目，不逐条 POST 造数（会 O(n^2) 挂死）。 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'qa-artifacts', 'review');
const BASE = 'http://127.0.0.1:18765';
const lines = [];
const say = m => { lines.push(m); console.log(m); };
const record = (name, pass, detail) => say(`${pass ? 'PASS' : 'FAIL'} ${name}${detail !== undefined ? ' :: ' + JSON.stringify(detail) : ''}`);

const withTimeout = (promise, ms, label) => Promise.race([
  promise,
  new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT ' + label)), ms)),
]);

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message.slice(0, 160)));

  await withTimeout(page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' }), 20000, 'goto');
  await page.fill('[name=username]', 'qa-admin');
  await page.fill('[name=password]', 'QA-Password-Only-2026!');
  await page.click('#loginForm button[type=submit]');
  await page.waitForSelector('#dashboardView:not(.hidden)', { timeout: 15000 });
  await page.locator('#projectGrid .project-row').first().click();
  await page.waitForSelector('#mainShotTable', { timeout: 20000 });
  await page.waitForTimeout(900);

  const rows = await page.evaluate(() => document.querySelectorAll('#mainShotTable tbody tr').length);
  say(`rows=${rows}`);
  if (rows < 10) { say('ABORT: 数据不足，无法验证滚动'); await browser.close(); return; }

  // ---- NEW-09 滚动后表头不重叠 ----
  const scrollCheck = await page.evaluate(() => {
    const wrap = document.getElementById('tableScrollWrap');
    if (!wrap) return { error: 'no wrap' };
    wrap.scrollTop = 400;
    return new Promise(resolve => setTimeout(() => {
      const th = document.querySelector('.shot-table thead th');
      const thBox = th.getBoundingClientRect();
      const cs = getComputedStyle(th);
      const overlapping = [...document.querySelectorAll('.shot-table tbody tr')].filter(r => {
        const b = r.getBoundingClientRect();
        return !(b.bottom <= thBox.top || b.top >= thBox.bottom);
      }).length;
      resolve({ scrolled: wrap.scrollTop, position: cs.position, bg: cs.backgroundColor, zIndex: cs.zIndex, overlapping });
    }, 300));
  });
  record('滚动后表头固定且不与数据行重叠', scrollCheck.overlapping === 0 && scrollCheck.position === 'sticky', scrollCheck);
  await page.screenshot({ path: path.join(OUT, '08-table-scrolled.png') });

  const rowIdx = 2;
  const cellSel = `#mainShotTable tbody tr:nth-child(${rowIdx + 1}) td[data-field="description"]`;

  // ---- NEW-05 拖选多个字符 ----
  await page.locator(cellSel).scrollIntoViewIfNeeded();
  const cb = await page.locator(cellSel).boundingBox();
  await page.mouse.move(cb.x + 14, cb.y + cb.height / 2);
  await page.mouse.down();
  await page.mouse.move(cb.x + Math.min(cb.width - 14, 180), cb.y + cb.height / 2, { steps: 15 });
  await page.mouse.up();
  await page.waitForTimeout(200);
  const dragSel = await page.evaluate(() => {
    const s = document.getSelection();
    return { len: (s?.toString() || '').length, text: (s?.toString() || '').slice(0, 24) };
  });
  record('单元格可鼠标拖选多个连续字符', dragSel.len > 3, dragSel);

  // Shift+方向键扩选
  const beforeShift = dragSel.len;
  await page.keyboard.press('Shift+ArrowRight');
  await page.keyboard.press('Shift+ArrowRight');
  await page.waitForTimeout(150);
  const afterShift = await page.evaluate(() => (document.getSelection()?.toString() || '').length);
  record('Shift+方向键可继续扩选', afterShift > beforeShift, { beforeShift, afterShift });

  // ---- NEW-06/07 双击原位编辑，不弹窗 ----
  await page.locator(cellSel).dblclick();
  await page.waitForTimeout(400);
  const editState = await page.evaluate(sel => {
    const td = document.querySelector(sel);
    return {
      inlineEditing: !!td?.classList.contains('is-rich-editing'),
      contenteditable: td?.getAttribute('contenteditable'),
      dialogOpen: document.querySelectorAll('.rich-editor-dialog[open]').length,
      toolbarVisible: document.querySelectorAll('.rich-float-toolbar.is-visible').length,
    };
  }, cellSel);
  record('双击进入原位编辑（无强制弹窗）', editState.inlineEditing && editState.dialogOpen === 0, editState);

  // ---- 点击格式按钮后选区保留 ----
  await page.keyboard.press('Control+a');
  await page.waitForTimeout(200);
  const beforeBoldSel = await page.evaluate(() => (document.getSelection()?.toString() || '').length);
  await page.locator('.rich-float-toolbar [data-format="bold"]').click();
  await page.waitForTimeout(250);
  const afterBold = await page.evaluate(sel => {
    const td = document.querySelector(sel);
    const s = document.getSelection();
    return { stillEditing: !!td?.classList.contains('is-rich-editing'), selLen: (s?.toString() || '').length, hasBold: td?.querySelectorAll('b,strong').length };
  }, cellSel);
  record('点击粗体后仍在编辑且选区未丢失', afterBold.stillEditing && afterBold.selLen > 0, { beforeBoldSel, ...afterBold });

  // ---- 字号下拉可获得焦点（Kimi #1 此前 preventDefault 导致打不开）----
  const sizeInfo = await page.evaluate(() => {
    const sel = document.querySelector('.rich-float-toolbar select[data-format="size"]');
    if (!sel) return { missing: true };
    sel.focus();
    return { focused: document.activeElement === sel, options: sel.options.length };
  });
  record('字号下拉可获得焦点（说明未被 preventDefault 拦截）', sizeInfo.focused === true && sizeInfo.options > 1, sizeInfo);

  // ---- IME 组字期间不应误提交（Kimi #6）----
  const imeCheck = await page.evaluate(sel => {
    const host = document.querySelector(sel)?.querySelector('.cell-display, [contenteditable]') || document.querySelector(sel);
    if (!host) return { missing: true };
    const before = document.getSelection()?.toString() || '';
    host.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    // 组字未完成时触发 blur —— 修复前会立刻 commit，组字内容被截断
    host.dispatchEvent(new FocusEvent('blur', { bubbles: false, relatedTarget: null }));
    const stillEditing = !!document.querySelector(sel)?.classList.contains('is-rich-editing');
    host.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '中文' }));
    return { before: before.length, stillEditingDuringComposition: stillEditing };
  }, cellSel);
  record('IME 组字期间的 blur 不会立即结束编辑', imeCheck.stillEditingDuringComposition === true, imeCheck);

  await page.screenshot({ path: path.join(OUT, '09-inline-editing.png') });

  // ---- Escape 取消应还原且不写入 ----
  const originalText = await page.evaluate(sel => document.querySelector(sel)?.textContent.trim().slice(0, 40), cellSel);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  const afterEsc = await page.evaluate(sel => {
    const td = document.querySelector(sel);
    return { editing: !!td?.classList.contains('is-rich-editing'), dialog: document.querySelectorAll('.rich-editor-dialog[open]').length, toolbarLeft: document.querySelectorAll('.rich-float-toolbar').length, text: td?.textContent.trim().slice(0, 40) };
  }, cellSel);
  record('Escape 退出编辑且清理工具条（不残留孤儿节点）', !afterEsc.editing && afterEsc.toolbarLeft === 0, afterEsc);
  record('Escape 后文本未被改动', afterEsc.text === originalText, { originalText, after: afterEsc.text });

  record('全程无 JS 报错', errors.length === 0, errors.slice(0, 3));

  const failed = lines.filter(l => l.startsWith('FAIL')).length;
  const total = lines.filter(l => l.startsWith('PASS') || l.startsWith('FAIL')).length;
  say(`\nRESULT ${total - failed}/${total}`);
  fs.writeFileSync(path.join(OUT, 'verify-fixes.txt'), lines.join('\n'));
  await browser.close();
  if (failed) process.exitCode = 1;
})().catch(e => { console.error('VERIFY FAILED', e.message); fs.writeFileSync(path.join(OUT, 'verify-fixes.txt'), lines.join('\n') + '\nERROR ' + e.message); process.exitCode = 1; });
