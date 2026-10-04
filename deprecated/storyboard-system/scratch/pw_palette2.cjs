const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERR: ' + e.message));
  await page.goto('http://127.0.0.1:18799/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#loginUsername', { timeout: 20000 });
  await page.fill('#loginUsername', 'admin');
  await page.fill('#loginPassword', 'FrameForge2026!Admin');
  await page.click('#loginSubmitBtn');
  await page.waitForFunction(() => globalThis.FrameForgeLightingAssets, { timeout: 20000 });

  // Create a project
  await page.waitForSelector('#dashNewProjectBtn', { timeout: 10000 });
  await page.click('#dashNewProjectBtn');
  await page.waitForSelector('#newProjForm', { timeout: 8000 });
  await page.fill('#newProjForm input[name="name"]', 'Audit Probe Project');
  await page.fill('#newProjForm input[name="target_seconds"]', '60');
  await page.fill('#newProjForm input[name="start_tc"]', '01:00:00:00');
  await page.click('#newProjForm button[type="submit"]');
  await page.waitForTimeout(2500);

  // Find lighting nav
  const hasNav = await page.$('[data-view="lighting"]');
  console.log('HAS_LIGHTING_NAV', !!hasNav);
  let palette = null, err = null;
  try {
    await page.waitForSelector('[data-view="lighting"]', { timeout: 10000 });
    await page.click('[data-view="lighting"]');
    await page.waitForFunction(() => { const b = document.querySelector('[data-action="create-board"]'); return b && !b.disabled; }, { timeout: 15000 });
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button[data-action="create-board"]'));
      const vis = btns.find(b => !b.disabled && b.offsetParent !== null) || btns.find(b => !b.disabled);
      if (vis) vis.click();
    });
    await page.waitForSelector('.ff-boards-tile-card', { timeout: 15000 });
    await page.waitForTimeout(2000);
    palette = await page.$$eval('.ff-boards-tile-card', cards => cards.map(c => {
      const badge = c.querySelector('.ff-tile-badge');
      return {
        title: (c.querySelector('.ff-tile-title')?.textContent || '').trim(),
        badge: badge ? badge.textContent.trim() : '',
        type: c.dataset.type, subtype: c.dataset.subtype
      };
    }));
  } catch (e) { err = String(e.message || e); }

  console.log('PALETTE_ERR', err);
  console.log('PALETTE', JSON.stringify(palette, null, 2));
  console.log('ERRORS', errors.slice(0,8).join(' | '));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
