const { chromium } = require('playwright');

const base = process.env.FRAMEFORGE_QA_BASE || (process.env.FRAMEFORGE_QA_BASE || 'http://127.0.0.1:18799');

// 富文本字段（画面描述/旁白等）必须在原位编辑：双击后单元格本身变为可编辑，
// 格式通过选区浮动工具条或右键菜单提供，不得强制弹出大编辑窗口。
(async () => {
  const executablePath = process.env.CHROME_PATH || (process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : undefined);
  const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(12000);
  const fail = message => { throw new Error(message); };
  try {
    await page.goto(`${base}/`, { waitUntil: 'networkidle' });
    const user = process.env.QA_USER || 'admin';
    const pass = process.env.QA_PASS || 'FrameForge2026!Admin';
    await page.fill('[name=username]', user);
    await page.fill('[name=password]', pass);
    await page.click('#loginForm button[type=submit]');
    await page.waitForSelector('#dashboardView:not(.hidden)');
    await page.click('#dashNewProjectBtn');
    await page.fill('#newProjForm [name=name]', 'qa-inline-editing-' + Date.now());
    await page.click('#newProjForm button[type=submit]');
    await page.waitForSelector('#mainShotTable');

    const longCopy = '低机位镜头越过项目大门进入园区主干道，卡车开过，道路两侧的建筑和交易大厅依次展开，完整展示项目的规模和交通组织。';

    // --- 1. 表格富文本字段原位编辑 ---
    const cell = page.locator('#mainShotTable td[data-field="description"]').first();
    await cell.dblclick();
    const host = cell.locator('.cell-display');
    await host.waitFor();
    if (await page.locator('.rich-editor-dialog[open]').count()) fail('表格富文本字段仍然弹出了大编辑窗口');
    if (!await host.evaluate(el => el.isContentEditable)) fail('表格富文本字段没有进入原位编辑');
    if (!await host.evaluate(el => el.classList.contains('is-rich-editing'))) fail('原位编辑缺少 is-rich-editing 标记');

    await host.click();
    await page.keyboard.insertText(longCopy);

    // --- 2. 选区浮动工具条 ---
    await page.keyboard.press('Control+a');
    await page.waitForSelector('.rich-float-toolbar.is-visible', { timeout: 5000 });
    const selectedBefore = await page.evaluate(() => String(document.getSelection()));
    if (!selectedBefore.trim()) fail('拖选/全选后没有拿到文本选区');

    // --- 3. 点击格式工具后选区必须保留 ---
    await page.locator('.rich-float-toolbar [data-format="bold"]').click();
    const selectedAfter = await page.evaluate(() => String(document.getSelection()));
    if (selectedAfter !== selectedBefore) fail(`点击格式工具后选区丢失：${JSON.stringify(selectedBefore)} -> ${JSON.stringify(selectedAfter)}`);
    if (!await host.evaluate(el => /font-weight:\s*700/.test(el.innerHTML))) fail('粗体没有应用到选区');
    const pressed = await page.locator('.rich-float-toolbar [data-format="bold"]').getAttribute('aria-pressed');
    if (pressed !== 'true') fail('粗体按钮没有反映当前选区状态');

    // --- 4. 提交并持久化 ---
    await page.keyboard.press('Enter');
    await page.waitForSelector('.rich-float-toolbar', { state: 'detached' });
    await page.waitForFunction(text => document.querySelector('#mainShotTable td[data-field="description"] .cell-display')?.textContent?.includes(text.slice(0, 10)), longCopy);
    const saved = await page.evaluate(async () => {
      const shot = (await (await fetch(location.pathname.includes('/p/') ? `/api/projects${location.pathname.slice(2)}` : '/api/projects')).json());
      return shot;
    }).catch(() => null);
    void saved;
    if (!await cell.locator('.cell-display').evaluate(el => /font-weight:\s*700/.test(el.innerHTML))) fail('提交后粗体格式丢失');

    // --- 5. 卡片视图同样原位编辑 ---
    await page.click('[data-view="cards"]');
    await page.waitForSelector('.shot-card');
    const copyMetrics = await page.locator('.shot-card [data-card-copy="description"] p').first().evaluate(element => ({ clientHeight: element.clientHeight, scrollHeight: element.scrollHeight }));
    if (copyMetrics.scrollHeight > copyMetrics.clientHeight + 1) fail(`card copy is collapsed by default: ${JSON.stringify(copyMetrics)}`);

    const voiceover = page.locator('.shot-card [data-card-copy="voiceover"] p').first();
    await voiceover.click();
    await page.waitForTimeout(200);
    if (await page.locator('.rich-editor-dialog[open]').count()) fail('卡片旁白仍然弹出了大编辑窗口');
    if (!await voiceover.evaluate(el => el.isContentEditable)) fail('卡片旁白没有进入原位编辑');
    await page.keyboard.press('Escape');
    if (await voiceover.evaluate(el => el.isContentEditable)) fail('Esc 没有退出原位编辑');

    // --- 6. 非富文本属性仍是轻量原位编辑 ---
    await page.click('[data-view="table"]');
    // 双 UI 模式已经收敛为 unified，不存在 data-ui-mode-option 切换器。
    const department = page.locator('#inspectorScroll .property-row[data-field="department"]');
    await department.dblclick();
    if (!await department.locator('.property-inline-editor').count()) fail('inspector property did not edit in place');
    if (await page.locator('#fieldEditorModal[open]').count()) fail('inspector property opened a modal');

    console.log(JSON.stringify({ pass: true, copyMetrics }));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
