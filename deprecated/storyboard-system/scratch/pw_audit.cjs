const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERR: ' + e.message));

  await page.goto('http://127.0.0.1:18799/', { waitUntil: 'domcontentloaded' });

  // Login
  await page.waitForSelector('#loginUsername', { timeout: 20000 });
  await page.fill('#loginUsername', 'admin');
  await page.fill('#loginPassword', 'FrameForge2026!Admin');
  await page.click('#loginSubmitBtn');
  await page.waitForFunction(() => globalThis.FrameForgeLightingAssets && globalThis.FrameForgeLightingScene, { timeout: 20000 });

  // ---- CORE: run REAL shipped gate logic for branded presets ----
  const demo = await page.evaluate(() => {
    const LA = globalThis.FrameForgeLightingAssets;
    const LS = globalThis.FrameForgeLightingScene;
    const branded = ['arri_skypanel_x21','aputure_storm_1200x','nanlite_forza_300b_ii','nanlite_forza_500b_ii','arri_orbiter','arri_alexa_35','avenger_a2033f'];
    const out = [];
    for (const sub of branded) {
      let type = null;
      for (const t of Object.keys(LS.PRESETS)) if (LS.PRESETS[t][sub]) { type = t; break; }
      const props = LS.PRESETS[type][sub].props || {};
      const url = LA.getGLBUrl(type, sub);
      const before = LA.getAssetStatus(type, sub, props);
      // Simulate runtime GLB load success (loader calls this in lighting-render.js:1331)
      LA.registerVerifiedAsset(type, sub, { loaded: true, meshCount: 12, glbUrl: url });
      const after = LA.getAssetStatus(type, sub, props);
      out.push({ sub, type, zh: LS.PRESETS[type][sub].zh, mfr: props.manufacturer || null, glbUrl: url, statusBeforeLoad: before, statusAfterLoad: after });
    }
    // also sample a CC0 and a generic entry
    const cc0 = 'furniture/table';
    const generic = 'light/tungsten';
    const samples = [
      { key: cc0, before: LA.getAssetStatus('furniture','table',{}), url: LA.getGLBUrl('furniture','table') },
      { key: generic, before: LA.getAssetStatus('light','tungsten',{}), url: LA.getGLBUrl('light','tungsten') },
    ];
    return { branded: out, samples };
  });

  // ---- Try to open lighting board and capture palette DOM badges ----
  let palette = null, paletteErr = null;
  try {
    // open first project if on hub
    const proj = await page.$('.project-card, [data-project-id]');
    if (proj) { await proj.click(); await page.waitForTimeout(1500); }
    const navBtn = await page.$('[data-view="lighting"]');
    if (!navBtn) throw new Error('no lighting nav button found');
    await navBtn.click();
    await page.waitForTimeout(2500);
    await page.waitForSelector('.ff-tile-card', { timeout: 15000 });
    palette = await page.$$eval('.ff-tile-card', cards => cards.map(c => {
      const badge = c.querySelector('.ff-tile-badge');
      return {
        title: (c.querySelector('.ff-tile-title')?.textContent || '').trim(),
        subtitle: (c.querySelector('.ff-tile-subtitle')?.textContent || '').trim(),
        badge: badge ? badge.textContent.trim() : '',
        type: c.dataset.type, subtype: c.dataset.subtype
      };
    }));
  } catch (e) { paletteErr = String(e.message || e); }

  console.log('===== GATE DEMONSTRATION (real shipped code) =====');
  console.log(JSON.stringify(demo, null, 2));
  console.log('\n===== PALETTE DOM CAPTURE =====');
  console.log('paletteErr:', paletteErr);
  if (palette) console.log(JSON.stringify(palette, null, 2));
  console.log('\n===== CONSOLE ERRORS (first 10) =====');
  console.log(errors.slice(0,10).join('\n'));

  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
