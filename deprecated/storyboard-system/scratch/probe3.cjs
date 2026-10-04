const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ headless: true, executablePath: 'C://Program Files\\Google\\Chrome\\Application\\chrome.exe' });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  p.setDefaultTimeout(12000);
  await p.goto('http://127.0.0.1:18765/', { waitUntil: 'networkidle' });
  await p.fill('[name=username]', 'qa-admin');
  await p.fill('[name=password]', 'QA-Password-Only-2026!');
  await p.click('#loginForm button[type=submit]');
  await p.waitForSelector('#dashboardView:not(.hidden)');
  await p.click('#dashNewProjectBtn');
  await p.fill('#newProjForm [name=name]', 'qa-probe3');
  await p.click('#newProjForm button[type=submit]');
  await p.waitForSelector('#mainShotTable');
  const snap = async label => {
    const info = await p.evaluate(() => {
      const vis = sel => { const el = document.querySelector(sel); if (!el) return 'missing'; const r = el.getBoundingClientRect(); return (r.width && r.height) ? 'visible' : 'hidden'; };
      return {
        sidebar: vis('#appSidebar'), sidebarV73: vis('#workspaceSidebarV73'),
        navKeys: document.querySelectorAll('[data-nav-key]').length,
        firstNavVisible: (() => { const el = document.querySelector('[data-nav-key]'); if (!el) return 'missing'; const r = el.getBoundingClientRect(); return (r.width && r.height) ? 'visible' : 'hidden'; })(),
        toolbar: vis('.workspace-toolbar'), toolbarV73: vis('#workspaceToolbarV73'),
        backBtn: vis('#backToListBtn'), breadcrumb: vis('#topBreadcrumb'), crumbView: vis('#crumbView'),
        header: vis('.global-header'),
        body: document.body.dataset.shotWorkspace + '/' + document.body.dataset.context,
        activeView: document.querySelector('.view-content:not(.hidden)')?.id || null
      };
    });
    console.log(label, JSON.stringify(info));
  };
  await snap('TABLE   ');
  await p.locator('[data-nav-key="lighting"]').click();
  await p.waitForTimeout(1200);
  await snap('LIGHTING');
  await b.close();
})().catch(e => { console.error(e); process.exitCode = 1; });
