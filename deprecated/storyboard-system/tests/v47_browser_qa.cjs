const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const base = process.env.FRAMEFORGE_QA_BASE || (process.env.FRAMEFORGE_QA_BASE || 'http://127.0.0.1:18799');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'qa-artifacts', 'v47');

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(12000);
  const consoleErrors = [];
  const failedRequests = [];
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('requestfailed', request => failedRequests.push(`${request.method()} ${request.url()} ${request.failure()?.errorText}`));

  try {
    await page.goto(`${base}/`, { waitUntil: 'networkidle' });
    await page.fill('[name=username]', 'qa-admin');
    await page.fill('[name=password]', 'QA-Password-Only-2026!');
    await page.click('#loginForm button[type=submit]');
    await page.waitForSelector('#dashboardView:not(.hidden)');

    await page.click('#dashNewProjectBtn');
    await page.fill('#newProjForm [name=name]', 'qa-v4-7-ui-qa');
    await page.fill('#newProjForm [name=target_seconds]', '30');
    await page.click('#newProjForm button[type=submit]');
    await page.waitForSelector('#projectWorkView:not(.hidden)');
    await page.waitForSelector('#mainShotTable');

    const initial = await page.evaluate(() => ({
      mode: document.body.dataset.uiMode,
      simplifiedActive: document.querySelector('[data-ui-mode-option="simplified"]')?.classList.contains('is-active'),
      professionalActive: document.querySelector('[data-ui-mode-option="professional"]')?.classList.contains('is-active'),
      headers: [...document.querySelectorAll('#mainShotTable th')].map(el => el.textContent.trim()),
      inspectorRight: (() => {
        const main = document.querySelector('#workspaceMain').getBoundingClientRect();
        const inspector = document.querySelector('#inspectorSlot').getBoundingClientRect();
        return inspector.left >= main.right - 2 && inspector.right <= innerWidth + 1;
      })(),
      bodyScroll: document.body.scrollHeight <= document.body.clientHeight + 1,
      bodyMetrics: { scrollHeight: document.body.scrollHeight, clientHeight: document.body.clientHeight, htmlScrollHeight: document.documentElement.scrollHeight, htmlClientHeight: document.documentElement.clientHeight },
      children: [...document.body.children].map(el => ({ id: el.id, cls: el.className, rect: (() => { const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, height: r.height }; })(), display: getComputedStyle(el).display }))
    }));
    if (initial.mode !== 'simplified' || !initial.simplifiedActive || initial.professionalActive) throw new Error('simplified mode is not the default active mode');
    for (const label of ['景别', '焦段', '运镜', '机位角度', '画面描述', '对应旁白']) {
      if (!initial.headers.includes(label)) throw new Error(`simplified table is missing ${label}`);
    }
    if (!initial.inspectorRight || !initial.bodyScroll) throw new Error(`desktop workspace shell or body scroll is invalid: ${JSON.stringify(initial)}`);
    await page.screenshot({ path: path.join(out, '01-simplified-1440.png'), fullPage: true });

    await page.click('[data-ui-mode-option="professional"]');
    await page.waitForFunction(() => document.body.dataset.uiMode === 'professional');
    const professional = await page.evaluate(() => ({
      active: document.querySelector('[data-ui-mode-option="professional"]')?.classList.contains('is-active'),
      departmentVisible: [...document.querySelectorAll('#mainShotTable th')].some(el => el.textContent.includes('责任部门')) && getComputedStyle(document.querySelector('#mainShotTable th.pro-only')).display !== 'none',
      inspectorHasPipeline: document.querySelector('#inspectorScroll')?.textContent.includes('制作管线'),
      selected: document.querySelector('#mainShotTable tr.is-selected')?.dataset.id,
      inspectorShot: document.querySelector('#inspShotNumber')?.textContent
    }));
    if (!professional.active || !professional.departmentVisible || !professional.inspectorHasPipeline) throw new Error('professional mode did not reveal advanced fields');
    if (!professional.selected || !professional.inspectorShot) throw new Error('mode switch changed the selected shot or inspector');
    await page.screenshot({ path: path.join(out, '02-professional-1440.png'), fullPage: true });

    await page.click('[data-ui-mode-option="simplified"]');
    await page.waitForFunction(() => document.body.dataset.uiMode === 'simplified');
    const backToSimple = await page.evaluate(() => ({
      hasCamera: ['景别', '焦段', '运镜', '机位角度'].every(label => document.querySelector('#mainShotTable')?.textContent.includes(label)),
      departmentHidden: [...document.querySelectorAll('#mainShotTable th.pro-only')].every(el => getComputedStyle(el).display === 'none'),
      inspectorVisible: !document.querySelector('#inspectorSlot')?.hidden
    }));
    if (!backToSimple.hasCamera || !backToSimple.departmentHidden || !backToSimple.inspectorVisible) throw new Error('return to simplified mode lost camera fields or inspector');

    const selectedBeforeClose = await page.locator('#mainShotTable tr.is-selected').getAttribute('data-id');
    const widthBeforeClose = await page.locator('#workspaceMain').evaluate(el => el.getBoundingClientRect().width);
    await page.click('#inspCloseBtn');
    const closed = await page.evaluate(() => ({
      inspectorHidden: document.querySelector('#inspectorSlot')?.hidden,
      selected: document.querySelector('#mainShotTable tr.is-selected')?.dataset.id,
      hasInspectorClass: document.querySelector('#workspaceContentGrid')?.classList.contains('has-inspector')
    }));
    const widthAfterClose = await page.locator('#workspaceMain').evaluate(el => el.getBoundingClientRect().width);
    if (!closed.inspectorHidden || closed.hasInspectorClass || closed.selected !== selectedBeforeClose || widthAfterClose <= widthBeforeClose) throw new Error('closing inspector did not preserve selection and expand main');

    await page.reload({ waitUntil: 'networkidle' });
    if (await page.locator('body').getAttribute('data-ui-mode') !== 'simplified') throw new Error('simplified mode persistence failed');
    await page.click('.project-row');
    await page.waitForSelector('#projectWorkView:not(.hidden)');
    await page.waitForSelector('#mainShotTable');

    await page.setViewportSize({ width: 1024, height: 800 });
    await page.click('#mainShotTable tbody tr');
    const tablet = await page.evaluate(() => {
      const rect = document.querySelector('#inspectorSlot').getBoundingClientRect();
      return { drawer: rect.right <= innerWidth + 1 && rect.top < innerHeight / 2, mainBelow: rect.top > document.querySelector('#workspaceMain').getBoundingClientRect().bottom };
    });
    if (!tablet.drawer || tablet.mainBelow) throw new Error('1024 inspector is not a right drawer');
    await page.screenshot({ path: path.join(out, '03-drawer-1024.png'), fullPage: true });

    await page.setViewportSize({ width: 375, height: 812 });
    const mobileBefore = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, viewport: innerWidth }));
    if (mobileBefore.width > mobileBefore.viewport + 1) throw new Error('mobile page overflows horizontally');
    await page.screenshot({ path: path.join(out, '04-mobile-375.png'), fullPage: true });

    const report = { initial, professional, backToSimple, closed, tablet, mobileBefore, consoleErrors, failedRequests };
    fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    if (consoleErrors.length || failedRequests.length) process.exitCode = 1;
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error.stack || error); process.exit(2); });
