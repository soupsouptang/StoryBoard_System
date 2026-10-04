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
    const projName = `Selection QA ${Date.now()}`;
    await page.click('#dashNewProjectBtn');
    await page.fill('#newProjForm [name=name]', projName);
    await page.click('#newProjForm button[type=submit]');
    await page.waitForSelector('#mainShotTable');

    // 添加足够的镜头用于测试（至少4个镜头）
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.createShotAt?.());
      await page.waitForTimeout(300);
    }

    const row = i => page.locator('#mainShotTable tbody tr[data-id]').nth(i);
    const count = await page.locator('#mainShotTable tbody tr[data-id]').count();
    if (count < 4) fail(`Expected at least 4 rows, found ${count}`);

    const shotIds = await page.evaluate(() => {
      return [...document.querySelectorAll('#mainShotTable tbody tr[data-id]')].map(tr => tr.dataset.id);
    });
    console.log('Test Shot IDs:', shotIds);

    const getSelectionState = async () => {
      return await page.evaluate(() => ({
        activeShotId: window.state?.activeShotId || null,
        selectedShotIds: [...(window.state?.selectedShotIds || [])],
        bulkBarVisible: !document.querySelector('#bulkActionBar')?.hidden,
        activeClassCount: document.querySelectorAll('#mainShotTable tbody tr.is-active-shot').length,
        singleClassCount: document.querySelectorAll('#mainShotTable tbody tr.is-selected-shot').length,
        multiClassCount: document.querySelectorAll('#mainShotTable tbody tr.is-multi-selected').length,
      }));
    };

    // Case A: click SHOT 001 -> selectedShotIds = [001], activeShotId = 001
    console.log('Testing Case A: click SHOT 001...');
    await row(0).locator('.shot-number').click();
    let s = await getSelectionState();
    console.log('Case A result:', s);
    if (s.activeShotId !== shotIds[0]) fail(`Case A: expected activeShotId ${shotIds[0]}, got ${s.activeShotId}`);
    if (s.selectedShotIds.length !== 1 || s.selectedShotIds[0] !== shotIds[0]) {
      fail(`Case A: expected selectedShotIds [${shotIds[0]}], got ${JSON.stringify(s.selectedShotIds)}`);
    }
    if (s.bulkBarVisible) fail('Case A: bulk bar should be hidden for single selection');
    if (s.singleClassCount !== 1) fail(`Case A: expected exactly 1 is-selected-shot row, got ${s.singleClassCount}`);
    if (s.multiClassCount !== 0) fail(`Case A: expected 0 is-multi-selected rows, got ${s.multiClassCount}`);

    // Case B: click SHOT 002 -> selectedShotIds = [002], activeShotId = 002, 001 cleared
    console.log('Testing Case B: click SHOT 002...');
    await row(1).locator('.shot-number').click();
    s = await getSelectionState();
    console.log('Case B result:', s);
    if (s.activeShotId !== shotIds[1]) fail(`Case B: expected activeShotId ${shotIds[1]}, got ${s.activeShotId}`);
    if (s.selectedShotIds.length !== 1 || s.selectedShotIds[0] !== shotIds[1]) {
      fail(`Case B: expected selectedShotIds [${shotIds[1]}], got ${JSON.stringify(s.selectedShotIds)}`);
    }
    if (s.bulkBarVisible) fail('Case B: bulk bar should be hidden');

    // Case C: Ctrl click SHOT 004 -> selected = [002, 004]
    console.log('Testing Case C: Ctrl click SHOT 004...');
    await row(3).locator('.shot-number').click({ modifiers: ['Control'] });
    s = await getSelectionState();
    console.log('Case C result:', s);
    if (s.selectedShotIds.length !== 2 || !s.selectedShotIds.includes(shotIds[1]) || !s.selectedShotIds.includes(shotIds[3])) {
      fail(`Case C: expected selectedShotIds to contain [${shotIds[1]}, ${shotIds[3]}], got ${JSON.stringify(s.selectedShotIds)}`);
    }
    if (!s.bulkBarVisible) fail('Case C: bulk bar should be visible for 2 selected shots');
    if (s.multiClassCount !== 2) fail(`Case C: expected 2 is-multi-selected rows, got ${s.multiClassCount}`);

    // Case D: Click SHOT 001 then Shift click SHOT 003 -> range [001, 002, 003]
    console.log('Testing Case D: Shift click range...');
    await row(0).locator('.shot-number').click();
    await row(2).locator('.shot-number').click({ modifiers: ['Shift'] });
    s = await getSelectionState();
    console.log('Case D result:', s);
    if (s.selectedShotIds.length !== 3) fail(`Case D: expected 3 selected shots, got ${s.selectedShotIds.length}`);
    if (!s.selectedShotIds.includes(shotIds[0]) || !s.selectedShotIds.includes(shotIds[1]) || !s.selectedShotIds.includes(shotIds[2])) {
      fail(`Case D: expected range to contain 0, 1, 2, got ${JSON.stringify(s.selectedShotIds)}`);
    }

    // Case E: single selected shot -> double click scene -> inline editor, NOT bulk editor
    console.log('Testing Case E: single selected shot double click...');
    await row(0).locator('.shot-number').click(); // single select 001
    await page.waitForTimeout(300);
    await row(0).locator('td[data-field="scene"]').dblclick({ position: { x: 40, y: 16 } });
    await page.waitForTimeout(300);
    const debugE = await page.evaluate(() => {
      const display = document.querySelector('#mainShotTable tr[data-id] td[data-field="scene"] .cell-display');
      const activeEl = document.activeElement;
      return {
        hasCell: !!document.querySelector('#mainShotTable tr[data-id] td[data-field="scene"]'),
        hasDisplay: !!display,
        contenteditable: display?.getAttribute('contenteditable'),
        isEditingClass: display?.closest('td')?.classList.contains('is-editing'),
        bulkHidden: document.querySelector('#bulkActionBar')?.hidden,
        activeTag: activeEl?.tagName,
        activeClass: activeEl?.className,
        selectedSize: window.state?.selectedShotIds?.size,
        selectedList: [...(window.state?.selectedShotIds || [])]
      };
    });
    console.log('Case E debug info:', debugE);
    const isInlineEditing = debugE.contenteditable === 'true' && debugE.bulkHidden === true;
    console.log('Case E isInlineEditing:', isInlineEditing);
    if (!isInlineEditing) fail('Case E: Expected inline editor and bulk bar hidden');
    await page.keyboard.press('Escape'); // cancel edit
    await page.waitForTimeout(300);

    // Case F: multi selected -> double click a member -> bulk editing
    console.log('Testing Case F: multi selected double click member...');
    await row(0).locator('.shot-number').click();
    await row(1).locator('.shot-number').click({ modifiers: ['Control'] }); // 2 selected
    await row(1).locator('td[data-field="description"]').dblclick();
    await page.waitForTimeout(300);
    s = await getSelectionState();
    console.log('Case F bulkBarVisible:', s.bulkBarVisible);
    if (!s.bulkBarVisible) fail('Case F: Expected bulk editor bar visible on multi-selection member double click');

    // Case G: click 景别 preset cell on another row -> selection moves to that row, old multi cleared
    console.log('Testing Case G: click preset cell on row 3...');
    const presetCell = row(2).locator('td[data-field="shot_size"]');
    await presetCell.click();
    await page.waitForSelector('.shot-preset-popover', { timeout: 3000 });
    s = await getSelectionState();
    console.log('Case G result:', s);
    if (s.activeShotId !== shotIds[2]) fail(`Case G: expected activeShotId ${shotIds[2]}, got ${s.activeShotId}`);
    if (s.selectedShotIds.length !== 1 || s.selectedShotIds[0] !== shotIds[2]) {
      fail(`Case G: expected single selection of row 3, got ${JSON.stringify(s.selectedShotIds)}`);
    }
    if (s.bulkBarVisible) fail('Case G: bulk bar should be hidden');

    // Close preset popover
    await page.keyboard.press('Escape');

    console.log('PASS: P0-SEL-01 Selection Model QA verified successfully (Cases A - G)!');
  } finally {
    await browser.close();
  }
})().catch(err => {
  console.error(err);
  process.exit(1);
});
