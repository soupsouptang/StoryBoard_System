// R14 §9 Storyboard Workspace 多项核对
const { chromium } = require('playwright');
const BASE = process.env.FRAMEFORGE_QA_BASE || 'http://127.0.0.1:18799';

(async () => {
  const browser = await chromium.launch({ headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.setDefaultTimeout(20000);
  try {
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    if (await page.locator('#loginForm').isVisible().catch(() => false)) {
      await page.fill('[name=username]', 'admin');
      await page.fill('[name=password]', 'FrameForge2026!Admin');
      await page.click('#loginForm button[type=submit]');
    }
    await page.waitForSelector('#dashboardView:not(.hidden)');
    await page.click('#dashNewProjectBtn');
    await page.fill('#newProjForm [name=name]', 'qa-r14-s9-' + Date.now());
    await page.click('#newProjForm button[type=submit]');
    await page.waitForSelector('#mainShotTable');
    await page.waitForTimeout(2500);

    const r = await page.evaluate(() => {
      const cs = (el, p) => el ? getComputedStyle(el)[p] : null;
      const R = el => el ? getComputedStyle(el).borderTopLeftRadius : null;

      // 1) Search 是否单层外壳（input 自身不应再有 border）
      const search = document.querySelector('.global-search');
      const searchInput = document.querySelector('.global-search input');
      // 2) View segmented
      const seg = document.querySelector('.ffui-segmented');
      const segBtn = document.querySelector('.ffui-segment');
      // 3) 按钮圆角统一性（采样多个按钮的值集合）
      const radii = new Set();
      document.querySelectorAll('.btn, .ffui-button, .ffui-segment, .global-search').forEach(e => {
        const v = R(e); if (v && v !== '0px') radii.add(v);
      });
      // 4) checkbox 尺寸
      const cb = document.querySelector('.shot-select, input[type=checkbox]');
      // 5) 关键元素存在性
      const has = {
        sidebar: !!document.querySelector('#appSidebar .ff73-nav-item'),
        moduleHeader: !!document.querySelector('.project-context-header'),
        toolbar: !!document.querySelector('.workspace-toolbar'),
        table: !!document.querySelector('#mainShotTable'),
        inspector: !!document.querySelector('#inspectorSlot, .inspector'),
        dragHandle: !!document.querySelector('[data-column-drag], .column-drag-handle, th[draggable="true"]')
      };
      return {
        search: { exists: !!search, border: cs(search, 'borderTopWidth'), radius: R(search), inputBorder: cs(searchInput, 'borderTopWidth') },
        segmented: { exists: !!seg, h: seg ? Math.round(seg.getBoundingClientRect().height) : null, radius: R(seg), btnH: segBtn ? Math.round(segBtn.getBoundingClientRect().height) : null, btnRadius: R(segBtn) },
        radiiUsed: [...radii].sort(),
        checkbox: cb ? { w: Math.round(cb.getBoundingClientRect().width), h: Math.round(cb.getBoundingClientRect().height) } : null,
        has
      };
    });

    console.log('=== §9 Search（single shell）===');
    console.log('  外壳 border:', r.search.border, '| radius:', r.search.radius, '| input border:', r.search.inputBorder);
    console.log('  单层判定:', r.search.inputBorder === '0px' ? 'OK（input 无独立边框）' : 'DIFF（input 自带边框 → 双层）');
    console.log('=== §9 View Segmented ===');
    console.log('  容器高:', r.segmented.h, '| radius:', r.segmented.radius, '| 段高:', r.segmented.btnH, '| 段 radius:', r.segmented.btnRadius);
    console.log('=== 圆角一致性（采样）===');
    console.log('  出现的 radius 值:', JSON.stringify(r.radiiUsed));
    console.log('=== checkbox ===');
    console.log('  ', JSON.stringify(r.checkbox));
    console.log('=== 关键元素存在性 ===');
    console.log('  ', JSON.stringify(r.has));
  } catch (e) { console.error('ERR:', e.message); }
  finally { await browser.close(); }
})();
