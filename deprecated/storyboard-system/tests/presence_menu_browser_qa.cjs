const { chromium } = require('playwright');
const assert = require('node:assert/strict');

const SERVER_URL = process.env.PRESENCE_QA_URL || process.env.TEST_SERVER_URL || 'http://127.0.0.1:8765';

async function waitFor(page, predicate, message, timeout = 6000) {
  await page.waitForFunction(predicate, undefined, { timeout });
  return message;
}

async function loginContext(browser, username) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce'
  });
  await context.addInitScript(() => localStorage.setItem('frameforge-show-qa-projects', '1'));
  const login = await context.request.post(`${SERVER_URL}/api/login`, {
    data: { username, password: 'FrameForge2026!QA' }
  });
  assert.equal(login.status(), 200, `${username} login failed`);
  const page = await context.newPage();
  await page.goto(SERVER_URL, { waitUntil: 'domcontentloaded' });
  await page.locator('#projectGrid .project-row').filter({ hasText: 'Editor Actions QA' }).click();
  await page.locator('#mainShotTable').waitFor();
  return { context, page };
}

async function sendCursor(page, x, y) {
  await page.evaluate(async ({ x, y }) => {
    const { project, csrf } = {
      project: window.state.presenceProjectId || window.state.bundle?.project?.id,
      csrf: window.state.csrf
    };
    const response = await fetch('/api/v1/presence/heartbeat', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
      body: JSON.stringify({
        production_id: project,
        workspace: 'table',
        module: 'table-scroll',
        shot_id: window.state.selection.activeShotId,
        presence_state: 'viewing',
        cursor: { x, y, visible: true }
      })
    });
    if (!response.ok) throw new Error(`presence heartbeat failed: ${response.status}`);
  }, { x, y });
}

async function assertCursorY(page, message, tolerance = 2) {
  const geometry = await page.locator('.remote-presence-cursor[data-presence-user="collab-peer-2"]').evaluate(cursor => {
    const host = document.querySelector('#tableScrollWrap');
    const person = window.state.presence.find(item => item.user_id === 'collab-peer-2');
    const hostRect = host.getBoundingClientRect();
    const cursorRect = cursor.getBoundingClientRect();
    const scaleY = host.clientHeight ? hostRect.height / host.clientHeight : 1;
    const contentHeight = Math.max(host.clientHeight, host.scrollHeight);
    const expectedTop = hostRect.top + (host.clientTop + Number(person.cursor_y) * contentHeight - host.scrollTop) * scaleY;
    return {
      actualTop: cursorRect.top,
      expectedTop,
      delta: cursorRect.top - expectedTop,
      cursorY: Number(person.cursor_y),
      scrollTop: host.scrollTop,
      scrollHeight: host.scrollHeight,
      hostTop: hostRect.top,
      scaleY
    };
  });
  assert.ok(Math.abs(geometry.delta) <= tolerance, `${message}: cursor viewport y must match normalized content coordinate within ${tolerance}px: ${JSON.stringify(geometry)}`);
  return geometry;
}

async function run() {
  console.log('[QA] Browser behavior: presence cursor and project more menu on', SERVER_URL);
  const browser = await chromium.launch({ headless: true });
  const peer1 = await loginContext(browser, 'peer1');
  const peer2 = await loginContext(browser, 'peer2');
  const { page: page1 } = peer1;
  const { page: page2 } = peer2;

  try {
    // Menu: visible, within the viewport, and actually clickable through its
    // rendered button rather than by inspecting source text.
    const more = page1.locator('#projectMoreBtn');
    const menu = page1.locator('#projectQuickMenu');
    await more.click();
    await menu.waitFor({ state: 'visible' });
    const menuGeometry = await menu.evaluate(el => {
      const rect = el.getBoundingClientRect();
      const button = el.querySelector('[data-project-quick]');
      const buttonRect = button.getBoundingClientRect();
      const hit = document.elementFromPoint(buttonRect.left + buttonRect.width / 2, buttonRect.top + buttonRect.height / 2);
      return {
        rect: { top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left },
        buttonVisible: buttonRect.width > 0 && buttonRect.height > 0,
        hitInsideMenu: hit === button || button.contains(hit),
        hit: hit ? { tag: hit.tagName, id: hit.id, className: hit.className, text: hit.textContent.trim().slice(0, 40), outer: hit.outerHTML.slice(0, 180) } : null,
        computedDisplay: getComputedStyle(el).display
      };
    });
    assert.notEqual(menuGeometry.computedDisplay, 'none', 'more menu must render');
    assert.ok(menuGeometry.buttonVisible, 'more menu action must have a rendered hit target');
    assert.ok(menuGeometry.hitInsideMenu, `more menu action must be clickable at its rendered point: ${JSON.stringify(menuGeometry)}`);
    await menu.locator('[data-project-quick="settings"]').click();
    await page1.locator('#projectSettingsModal[open]').waitFor();
    await page1.locator('#projectSettingsModal').evaluate(dialog => dialog.close());
    console.log('  PASS [Playwright browser]: more menu visible and settings action clickable.');

    await more.click();
    await menu.waitFor({ state: 'visible' });
    await page1.keyboard.press('Escape');
    await menu.waitFor({ state: 'hidden' });
    assert.equal(await more.getAttribute('aria-expanded'), 'false', 'Escape must close more menu');

    await more.click();
    await menu.waitFor({ state: 'visible' });
    await page1.mouse.click(12, 180);
    await menu.waitFor({ state: 'hidden' });
    assert.equal(await more.getAttribute('aria-expanded'), 'false', 'outside pointerdown must close more menu');
    console.log('  PASS [Playwright browser]: Escape and outside pointer close the menu.');

    // Give the actual table host a nested scrollable surface. The cursor is
    // then driven by real presence heartbeats and observed in the rendered DOM.
    const scrollMetrics = await page1.evaluate(() => {
      const host = document.querySelector('#tableScrollWrap');
      if (!host) throw new Error('table scroll host not found');
      const filler = document.createElement('div');
      filler.id = 'qa-presence-scroll-filler';
      filler.setAttribute('aria-hidden', 'true');
      filler.style.cssText = 'height:2400px;width:1px;pointer-events:none;';
      host.append(filler);
      host.scrollTop = 180;
      host.dispatchEvent(new Event('scroll'));
      return { width: host.scrollWidth, height: host.scrollHeight, clientWidth: host.clientWidth, clientHeight: host.clientHeight, scrollTop: host.scrollTop };
    });
    assert.ok(scrollMetrics.height > scrollMetrics.clientHeight, 'QA surface must exercise nested vertical scrolling');

    await sendCursor(page2, 0.25, 0.10);
    await waitFor(page1, () => document.querySelector('.remote-presence-cursor[data-presence-user="collab-peer-2"].is-visible'), 'first remote cursor');
    const firstCursor = await page1.locator('.remote-presence-cursor[data-presence-user="collab-peer-2"]').evaluate(cursor => {
      const host = document.querySelector('#tableScrollWrap');
      const rect = cursor.getBoundingClientRect();
      const hostRect = host.getBoundingClientRect();
      return {
        transform: cursor.style.transform,
        parentClass: cursor.parentElement?.className || '',
        rootCount: document.querySelectorAll('#remotePresenceLayer > .remote-presence-cursor').length,
        top: rect.top,
        bottom: rect.bottom,
        hostTop: hostRect.top,
        hostBottom: hostRect.bottom
      };
    });
    assert.match(firstCursor.parentClass, /remote-presence-host-layer/);
    assert.equal(firstCursor.rootCount, 0, 'positioned cursor must be reparented out of the root layer');
    assert.ok(firstCursor.top >= firstCursor.hostTop - 1 && firstCursor.bottom <= firstCursor.hostBottom + 1, `first cursor must stay inside scroll host: ${JSON.stringify(firstCursor)}`);

    await sendCursor(page2, 0.65, 0.15);
    await page1.waitForFunction(oldTransform => {
      const cursor = document.querySelector('.remote-presence-cursor[data-presence-user="collab-peer-2"]');
      return cursor?.style.transform && cursor.style.transform !== oldTransform;
    }, firstCursor.transform, { timeout: 6000 });
    const secondTransform = await page1.locator('.remote-presence-cursor[data-presence-user="collab-peer-2"]').evaluate(cursor => cursor.style.transform);
    assert.notEqual(secondTransform, firstCursor.transform, 'same cursor must update after reparenting');
    const secondGeometry = await assertCursorY(page1, 'reparented cursor after second heartbeat');
    console.log(`  PASS [Playwright browser]: reparented cursor y matched normalized position (${secondGeometry.delta.toFixed(2)}px error).`);
    console.log('  PASS [Playwright browser]: same remote cursor updated twice after reparenting.');

    // Move the normalized point into the visible portion at the bottom scroll
    // boundary and verify the rendered cursor remains clipped to the host.
    const bottomMetrics = await page1.evaluate(() => {
      const host = document.querySelector('#tableScrollWrap');
      host.scrollTop = host.scrollHeight - host.clientHeight;
      host.dispatchEvent(new Event('scroll'));
      return { height: host.scrollHeight, clientHeight: host.clientHeight, scrollTop: host.scrollTop };
    });
    const bottomY = (bottomMetrics.scrollTop + Math.max(20, bottomMetrics.clientHeight - 48)) / bottomMetrics.height;
    await sendCursor(page2, 0.20, bottomY);
    try {
      await waitFor(page1, () => document.querySelector('.remote-presence-cursor[data-presence-user="collab-peer-2"].is-visible'), 'bottom-boundary cursor');
    } catch (error) {
      const diagnostics = await page1.evaluate(() => {
        const host = document.querySelector('#tableScrollWrap');
        const person = window.state.presence.find(item => item.user_id === 'collab-peer-2');
        const cursor = document.querySelector('.remote-presence-cursor[data-presence-user="collab-peer-2"]');
        return { person, currentView: window.state.view.current, context: window.state.context, host: host && { scrollTop: host.scrollTop, scrollHeight: host.scrollHeight, clientHeight: host.clientHeight }, className: cursor?.className, transform: cursor?.style.transform };
      });
      throw new Error(`${error.message}; bottomY=${bottomY}; diagnostics=${JSON.stringify(diagnostics)}`);
    }
    const bottomCursor = await page1.locator('.remote-presence-cursor[data-presence-user="collab-peer-2"]').evaluate(cursor => {
      const rect = cursor.getBoundingClientRect();
      const hostRect = document.querySelector('#tableScrollWrap').getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom, hostTop: hostRect.top, hostBottom: hostRect.bottom };
    });
    assert.ok(bottomCursor.top >= bottomCursor.hostTop - 1, 'nested scroll cursor must not escape above host');
    assert.ok(bottomCursor.bottom <= bottomCursor.hostBottom + 1, 'nested scroll cursor must not escape below host');
    const bottomGeometry = await assertCursorY(page1, 'cursor after nested host scroll changed');
    console.log(`  PASS [Playwright browser]: nested scroll cursor stayed clipped and y matched (${bottomGeometry.delta.toFixed(2)}px error).`);

    // The table is intentionally scrolled to its lower boundary; dispatch the
    // real DOM click in the browser so the test does not depend on Playwright
    // auto-scrolling the toolbar through the nested surface.
    await page1.locator('#workspaceToolbarV73').getByRole('radio',{name:'卡片',exact:true}).click();
    await page1.waitForFunction(() => window.state.view.current === 'cards');
    await page1.waitForTimeout(100);
    assert.equal(await page1.locator('.remote-presence-cursor.is-visible').count(), 0, 'switching view must hide old-view cursor');
    console.log('  PASS [Playwright browser]: same-project view switch left no visible cursor residue.');
    console.log('ALL TARGETED PRESENCE/MENU BROWSER TESTS PASSED.');
  } finally {
    await peer1.context.close();
    await peer2.context.close();
    await browser.close();
  }
}

run().catch(error => {
  console.error('QA FAILED:', error);
  process.exit(1);
});
