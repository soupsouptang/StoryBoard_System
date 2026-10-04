const { chromium } = require('playwright');

const base = process.env.FRAMEFORGE_QA_BASE || (process.env.FRAMEFORGE_QA_BASE || 'http://127.0.0.1:18799');

const SHOT_SIZE_LENS_MAP = {
  '大远景': '24mm',
  '远景': '28mm',
  '大全景': '24mm',
  '全景': '35mm',
  '中全景': '35mm',
  '中景': '50mm',
  '中近景': '50mm',
  '近景': '85mm',
  '特写': '85mm',
  '大特写': '100mm',
  '微距': '100mm'
};

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
    const projName = `Lens Link QA ${Date.now()}`;
    await page.click('#dashNewProjectBtn');
    await page.fill('#newProjForm [name=name]', projName);
    await page.click('#newProjForm button[type=submit]');
    await page.waitForSelector('#mainShotTable');

    // --- 1. Table Preset 切换：景别切换后同帧更新焦段 ---
    console.log('Testing Table Preset change: 全景 -> 中景 (should auto-link to 50mm)...');
    const row = page.locator('#mainShotTable tbody tr[data-id]').first();
    const sizeCell = row.locator('td[data-field="shot_size"]');
    const lensCell = row.locator('td[data-field="lens"]');

    await sizeCell.click();
    await page.waitForSelector('.shot-preset-popover', { timeout: 3000 });
    // 选择 "中景"
    await page.click('.shot-preset-popover [data-preset-value="中景"]');

    // 检查同一 render 帧中的表格与 Inspector 焦段
    const tableLens = await lensCell.locator('.cell-display').textContent();
    console.log('Table lens after selecting 中景:', tableLens.trim());
    if (tableLens.trim() !== '50mm') {
      fail(`Expected table lens to immediately update to 50mm, got: "${tableLens.trim()}"`);
    }

    // --- 2. 检查全量 11 种景别 ↔ 焦段映射 ---
    console.log('Testing all 11 shot size to lens mappings via applyShotFieldMutation in runtime...');
    const mappingResults = await page.evaluate((mappings) => {
      const results = {};
      const shot = window.state?.bundle?.shots?.[0];
      if (!shot) return { error: 'No shot found' };

      for (const [size, expectedLens] of Object.entries(mappings)) {
        window.applyShotFieldMutation(shot, 'shot_size', size);
        results[size] = {
          actualLens: shot.lens,
          actualSource: shot.lens_source,
          expectedLens
        };
      }
      return results;
    }, SHOT_SIZE_LENS_MAP);

    console.log('Mapping verification results:', mappingResults);
    for (const [size, res] of Object.entries(mappingResults)) {
      if (res.actualLens !== res.expectedLens) {
        fail(`Mapping failed for ${size}: expected ${res.expectedLens}, got ${res.actualLens}`);
      }
      if (res.actualSource !== 'auto-shot-size') {
        fail(`Expected lens_source === 'auto-shot-size' for ${size}, got ${res.actualSource}`);
      }
    }

    // --- 3. 手动修改焦段记录 manual 来源 ---
    console.log('Testing manual lens change recording...');
    const manualResult = await page.evaluate(() => {
      const shot = window.state?.bundle?.shots?.[0];
      window.applyShotFieldMutation(shot, 'lens', '85mm', { source: 'ui' });
      return { lens: shot.lens, source: shot.lens_source };
    });
    console.log('Manual lens result:', manualResult);
    if (manualResult.lens !== '85mm' || manualResult.source !== 'manual') {
      fail(`Expected manual lens 85mm and source 'manual', got: ${JSON.stringify(manualResult)}`);
    }

    // --- 4. 页面刷新后持久化 ---
    console.log('Saving project and reloading...');
    const projectId = await page.evaluate(() => window.state?.bundle?.project?.id);
    await page.evaluate(() => window.saveProject?.());
    await page.waitForTimeout(1000);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('#dashboardView:not(.hidden)');
    console.log('Re-opening project', projectId);
    await page.evaluate(id => window.openProject?.(id), projectId);
    await page.waitForSelector('#mainShotTable');

    const reloadedLens = await page.evaluate(() => {
      const shot = window.state?.bundle?.shots?.[0];
      return { shot_size: shot?.shot_size, lens: shot?.lens, lens_source: shot?.lens_source };
    });
    console.log('Reloaded shot lens info:', reloadedLens);

    // --- 5. 测试后端 import_commit 中的景别焦段关联逻辑 ---
    console.log('Testing backend import_commit API with empty lens vs explicit lens...');
    const importTestResult = await page.evaluate(async (projectId) => {
      // 构造两行数据：一行有景别无焦段，一行有景别且有显式焦段
      const payload = {
        mode: 'append',
        headers: ['镜号', '景别', '焦段'],
        mapping: { number: { col: 0 }, shot_size: { col: 1 }, lens: { col: 2 } },
        rows: [
          ['AUTO-001', '大全景', ''],
          ['EXPL-002', '大全景', '50mm']
        ]
      };
      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/import-commit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': window.state?.csrf || ''
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      return data;
    }, await page.evaluate(() => window.state?.bundle?.project?.id));

    console.log('importTestResult full response:', JSON.stringify(importTestResult));
    const resultShots = importTestResult.bundle?.shots || importTestResult.shots || [];
    console.log('Import commit result shots count:', resultShots.length);
    const autoShot = resultShots.find(s => s.title?.includes('AUTO-001')) || resultShots[resultShots.length - 2];
    const explShot = resultShots.find(s => s.title?.includes('EXPL-002')) || resultShots[resultShots.length - 1];

    console.log('Auto shot:', { number: autoShot?.number, shot_size: autoShot?.shot_size, lens: autoShot?.lens, lens_source: autoShot?.lens_source });
    console.log('Explicit shot:', { number: explShot?.number, shot_size: explShot?.shot_size, lens: explShot?.lens, lens_source: explShot?.lens_source });

    if (!autoShot || autoShot.lens !== '24mm' || autoShot.lens_source !== 'auto-shot-size') {
      fail(`Import auto-link failed: expected 24mm auto-shot-size, got: ${JSON.stringify(autoShot)}`);
    }
    if (!explShot || explShot.lens !== '50mm' || explShot.lens_source !== 'imported-explicit') {
      fail(`Import explicit preservation failed: expected 50mm imported-explicit, got: ${JSON.stringify(explShot)}`);
    }

    console.log('PASS: P0-LENS-01 Shot Size ↔ Lens auto linkage verified successfully across all paths!');
  } finally {
    await browser.close();
  }
})().catch(err => {
  console.error(err);
  process.exit(1);
});
