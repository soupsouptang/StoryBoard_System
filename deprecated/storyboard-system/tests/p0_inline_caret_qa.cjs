const { chromium } = require('playwright');

const base = process.env.FRAMEFORGE_QA_BASE || (process.env.FRAMEFORGE_QA_BASE || 'http://127.0.0.1:18799');

(async () => {
  const executablePath = process.env.CHROME_PATH || (process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : undefined);
  const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(15000);
  const fail = msg => { console.error('FAIL:', msg); throw new Error(msg); };

  try {
    console.log('Navigating to', base);
    await page.goto(`${base}/`, { waitUntil: 'networkidle' });
    const user = process.env.QA_USER || 'admin';
    const pass = process.env.QA_PASS || 'FrameForge2026!Admin';

    if (await page.locator('#loginForm').isVisible()) {
      await page.fill('[name=username]', user);
      await page.fill('[name=password]', pass);
      await page.click('#loginForm button[type=submit]');
    }

    await page.waitForSelector('#dashboardView:not(.hidden)');
    const projName = `Caret QA ${Date.now()}`;
    await page.click('#dashNewProjectBtn');
    await page.fill('#newProjForm [name=name]', projName);
    await page.click('#newProjForm button[type=submit]');
    await page.waitForSelector('#mainShotTable');

    // 找到场景单元格
    const sceneCell = page.locator('#mainShotTable td[data-field="scene"]').first();
    await sceneCell.waitFor();

    console.log('Double clicking scene cell at position { x: 80, y: 16 }...');
    await sceneCell.dblclick({ position: { x: 80, y: 16 } });

    // 检查 Caret 状态
    const caret = await page.evaluate(() => {
      const host = document.querySelector(
        '#mainShotTable td[data-field="scene"] .cell-display[contenteditable="true"]'
      );
      const sel = document.getSelection();

      return {
        editable: host?.getAttribute('contenteditable'),
        activeInside: !!host && host.contains(document.activeElement),
        rangeCount: sel?.rangeCount || 0,
        collapsed: sel?.rangeCount ? sel.getRangeAt(0).collapsed : false,
        inside: sel?.rangeCount ? host?.contains(sel.getRangeAt(0).startContainer) : false,
        caretColor: host ? getComputedStyle(host).caretColor : '',
        display: host ? getComputedStyle(host).display : ''
      };
    });

    console.log('Caret evaluation result:', caret);

    if (caret.editable !== 'true') fail(`Expected editable === "true", got: ${caret.editable}`);
    if (caret.rangeCount !== 1) fail(`Expected rangeCount === 1, got: ${caret.rangeCount}`);
    if (caret.collapsed !== true) fail(`Expected selection to be collapsed (caret visible, not word selected), got collapsed: ${caret.collapsed}`);
    if (caret.inside !== true) fail(`Expected selection to be inside host element, got inside: ${caret.inside}`);
    if (caret.display === 'flex') fail(`Expected display !== "flex", got: ${caret.display}`);
    if (!caret.caretColor || caret.caretColor === 'transparent' || caret.caretColor.includes('rgba(0, 0, 0, 0)')) {
      fail(`Expected visible caretColor, got: ${caret.caretColor}`);
    }

    console.log('P0-EDIT-01 Caret check PASSED. Now typing test text...');
    const testText = '天津港外海测试地点';
    await page.keyboard.type(testText);
    await page.keyboard.press('Enter');

    // 等待提交并离开编辑态
    await page.waitForFunction(() => {
      const host = document.querySelector('#mainShotTable td[data-field="scene"] .cell-display');
      return host && host.getAttribute('contenteditable') !== 'true';
    });

    const projectId = await page.evaluate(() => window.state?.bundle?.project?.id);
    await page.evaluate(() => window.saveProject?.());
    await page.waitForTimeout(1000);

    // 验证页面刷新后持久化
    console.log('Reloading page to verify persistence...');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('#dashboardView:not(.hidden)');
    console.log('Re-opening project', projectId);
    await page.evaluate(id => window.openProject?.(id), projectId);
    await page.waitForSelector('#mainShotTable');

    const persisted = await page.evaluate(() => {
      const host = document.querySelector('#mainShotTable td[data-field="scene"] .cell-display');
      return host?.textContent?.trim() || '';
    });

    console.log('Persisted text:', persisted);
    if (!persisted.includes(testText)) {
      fail(`Expected persisted text to include "${testText}", but got: "${persisted}"`);
    }

    console.log('PASS: P0-EDIT-01 Caret and Persistence verified successfully!');
  } finally {
    await browser.close();
  }
})().catch(err => {
  console.error(err);
  process.exit(1);
});
