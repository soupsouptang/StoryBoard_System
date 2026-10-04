// R6 验收：Hub 无 Sidebar / 项目态有 Sidebar / 返回 Hub 彻底卸载；出 4 张截图
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const BASE = process.env.FRAMEFORGE_QA_BASE || 'http://127.0.0.1:18799';
const OUT = path.join(__dirname, '../qa-artifacts/r6-hub');
fs.mkdirSync(OUT, { recursive: true });

const probe = page => page.evaluate(() => {
  const sb = document.querySelector('#appSidebar');
  const cs = sb ? getComputedStyle(sb) : null;
  const r = sb ? sb.getBoundingClientRect() : null;
  return {
    appContext: document.body.dataset.appContext || null,
    sidebarExists: !!sb,
    sidebarHidden: sb ? sb.hidden : null,
    sidebarDisplay: cs ? cs.display : null,
    sidebarWidth: r ? Math.round(r.width) : null,
    sidebarHasNodes: sb ? sb.children.length : null,
    sidebarReactMounted: !!document.querySelector('#appSidebar #workspaceSidebarV73'),
    navItemCount: document.querySelectorAll('#appSidebar .ff73-nav-item, #appSidebar .nav-item').length,
    // Header 关键元素位置（用于判断抖动）
    headerX: (() => { const h = document.querySelector('.topbar, header, .app-header'); return h ? Math.round(h.getBoundingClientRect().x) : null; })(),
    hasProjectSettings: !!document.querySelector('#appSidebar [data-nav-key], #appSidebar .ff73-nav-footer'),
    mainX: (() => { const m = document.querySelector('#mainWorkspace'); return m ? Math.round(m.getBoundingClientRect().x) : null; })()
  };
});

(async () => {
  const browser = await chromium.launch({ headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.setDefaultTimeout(20000);
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  try {
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    if (await page.locator('#loginForm').isVisible().catch(() => false)) {
      await page.fill('[name=username]', 'admin');
      await page.fill('[name=password]', 'FrameForge2026!Admin');
      await page.click('#loginForm button[type=submit]');
    }
    await page.waitForSelector('#dashboardView:not(.hidden)');
    await page.waitForTimeout(2000);

    console.log('=== [1] PROJECT_HUB ===');
    const hub = await probe(page);
    console.log(JSON.stringify(hub));
    await page.screenshot({ path: path.join(OUT, '1-project-hub.png') });

    // 进入 PROJECT_SELECTED：与已验证测试一致，新建项目
    await page.click('#dashNewProjectBtn');
    await page.fill('#newProjForm [name=name]', 'qa-r6-' + Date.now());
    await page.click('#newProjForm button[type=submit]');
    await page.waitForSelector('#mainShotTable');
    await page.waitForTimeout(2500);
    console.log('=== [2] PROJECT_SELECTED (table) ===');
    const proj = await probe(page);
    console.log(JSON.stringify(proj));
    await page.screenshot({ path: path.join(OUT, '2-project-workspace-table.png') });

    // 进灯光
    const nav = await page.$('[data-nav-key="lighting"]');
    if (nav) { await nav.click(); } else {
      await page.evaluate(() => { const b = [...document.querySelectorAll('#appSidebar button')].find(x => /灯光/.test(x.textContent)); if (b) b.click(); });
    }
    await page.waitForTimeout(3000);
    console.log('=== [3] workspace lighting ===');
    console.log(JSON.stringify(await probe(page)));
    await page.screenshot({ path: path.join(OUT, '3-project-workspace-lighting.png') });

    // 返回 Hub
    // 正确的返回入口是 Header 上的「返回项目大厅」
    await page.click('#backToListBtn');
    await page.waitForTimeout(3000);
    console.log('=== [4] BACK TO PROJECT_HUB ===');
    const back = await probe(page);
    console.log(JSON.stringify(back));
    await page.screenshot({ path: path.join(OUT, '4-back-to-project-hub.png') });

    console.log('\n=== R6 判定 ===');
    console.log('  首页无 Sidebar        :', hub.sidebarHidden === true && hub.navItemCount === 0);
    console.log('  首页无侧栏占位        :', hub.sidebarWidth === 0);
    console.log('  项目态 Sidebar 出现   :', proj.sidebarHidden === false && proj.navItemCount > 0);
    // 判定 React 挂载点是否卸载（剩余节点是 index.html 静态的宽度拖拽条，不计）
    console.log('  返回后 Sidebar 卸载   :', back.sidebarHidden === true && back.sidebarReactMounted === false);
    console.log('  mainWorkspace 左边界  : hub=%d proj=%d back=%d（应一致，Header 不抖）', hub.mainX, proj.mainX, back.mainX);
  } catch (e) { console.error('ERR:', e.message); }
  finally { console.log('errors:', errs.length ? [...new Set(errs)].slice(0, 4).join(' | ') : '(none)'); await browser.close(); }
})();
