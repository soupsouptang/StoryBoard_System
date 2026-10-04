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

  // Probe sidebar nav + project grid
  const probe = await page.evaluate(() => {
    const navs = Array.from(document.querySelectorAll('[data-view]')).map(n => ({ view: n.getAttribute('data-view'), text: n.textContent.trim() }));
    const grid = document.querySelector('#projectGrid');
    const projCards = grid ? grid.children.length : -1;
    return { navs, projCards, hasLightingNav: !!document.querySelector('[data-view="lighting"]') };
  });
  console.log('PROBE', JSON.stringify(probe));

  // Try opening a project
  let opened = false;
  try {
    const grid = await page.$('#projectGrid');
    if (grid) {
      const first = await grid.$('*');
      if (first) { await first.click(); opened = true; }
    }
    await page.waitForTimeout(2000);
  } catch (e) { errors.push('openProj: ' + e.message); }

  // Re-probe for lighting nav after project open
  let palette = null, err = null;
  try {
    await page.waitForSelector('[data-view="lighting"]', { timeout: 10000 });
    await page.click('[data-view="lighting"]');
    await page.waitForSelector('.ff-tile-card', { timeout: 15000 });
    await page.waitForTimeout(1500);
    palette = await page.$$eval('.ff-tile-card', cards => cards.map(c => {
      const badge = c.querySelector('.ff-tile-badge');
      return {
        title: (c.querySelector('.ff-tile-title')?.textContent || '').trim(),
        badge: badge ? badge.textContent.trim() : '',
        type: c.dataset.type, subtype: c.dataset.subtype
      };
    }));
  } catch (e) { err = String(e.message || e); }

  console.log('OPENED_PROJECT', opened);
  console.log('PALETTE_ERR', err);
  console.log('PALETTE', JSON.stringify(palette, null, 2));
  console.log('ERRORS', errors.slice(0,8).join(' | '));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
