const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ headless: true, executablePath: 'C://Program Files\\Google\\Chrome\\Application\\chrome.exe' });
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  p.setDefaultTimeout(12000);
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
  p.on('pageerror', e => errs.push('PAGEERROR ' + e.message.slice(0, 200)));
  await p.goto('http://127.0.0.1:18765/', { waitUntil: 'networkidle' });
  await p.fill('[name=username]', 'qa-admin');
  await p.fill('[name=password]', 'QA-Password-Only-2026!');
  await p.click('#loginForm button[type=submit]');
  await p.waitForSelector('#dashboardView:not(.hidden)');
  await p.click('#dashNewProjectBtn');
  await p.fill('#newProjForm [name=name]', 'qa-probe2');
  await p.click('#newProjForm button[type=submit]');
  await p.waitForSelector('#mainShotTable');
  const info = await p.evaluate(() => {
    const desc = el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return { w: Math.round(r.width), h: Math.round(r.height), display: cs.display, visibility: cs.visibility, cls: (el.className || '').toString().slice(0, 70) }; };
    const q = s => [...document.querySelectorAll(s)].map(desc);
    const tabs = document.getElementById('workspaceViewTabs');
    let node = tabs, chain = [];
    while (node && node !== document.body) { chain.push(desc(node)); node = node.parentElement; }
    return {
      toolbars: q('.workspace-toolbar'),
      ff73: q('.ff73-toolbar-root'),
      tabsChain: chain,
      bodyUiVersion: document.body.dataset.uiVersion,
      bodyData: JSON.stringify(document.body.dataset),
      hasV73: !!document.querySelector('script[src*="workspace-v73"]'),
      scripts: [...document.querySelectorAll('script[src]')].map(s => s.getAttribute('src')),
    };
  });
  console.log(JSON.stringify(info, null, 1));
  console.log('CONSOLE ERRORS:', JSON.stringify(errs, null, 1));
  await b.close();
})().catch(e => { console.error(e); process.exitCode = 1; });
