const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ headless: true, executablePath: 'C://Program Files\\Google\\Chrome\\Application\\chrome.exe' });
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  p.setDefaultTimeout(12000);
  await p.goto('http://127.0.0.1:18765/', { waitUntil: 'networkidle' });
  await p.fill('[name=username]', 'qa-admin');
  await p.fill('[name=password]', 'QA-Password-Only-2026!');
  await p.click('#loginForm button[type=submit]');
  await p.waitForSelector('#dashboardView:not(.hidden)');
  await p.click('#dashNewProjectBtn');
  await p.fill('#newProjForm [name=name]', 'qa-probe');
  await p.click('#newProjForm button[type=submit]');
  await p.waitForSelector('#mainShotTable');
  const info = await p.evaluate(() => {
    const out = [];
    document.querySelectorAll('[data-workspace-view],[data-view]').forEach(el => {
      const r = el.getBoundingClientRect();
      out.push({ sel: el.dataset.workspaceView ? 'wsv:' + el.dataset.workspaceView : 'dv:' + el.dataset.view, cls: el.className.slice(0, 60), visible: !!(r.width && r.height), w: Math.round(r.width), h: Math.round(r.height), parent: el.parentElement?.className?.slice(0, 60) });
    });
    return out;
  });
  console.log(JSON.stringify(info, null, 1));
  await b.close();
})().catch(e => { console.error(e); process.exitCode = 1; });
