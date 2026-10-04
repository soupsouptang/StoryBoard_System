const { chromium } = require('playwright');
const assert = require('node:assert/strict');

const base = process.env.SHOT_DUP_QA_URL;
const shotId = process.env.SHOT_DUP_QA_SHOT_ID;
const dialogue = '角色台词应随镜头副本保留。';

(async () => {
  assert.ok(base && shotId, 'isolated server URL and source shot id are required');
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    await context.addInitScript(() => localStorage.setItem('frameforge-show-qa-projects', '1'));
    const login = await context.request.post(`${base}/api/login`, { data: { username: 'qa-admin', password: 'FrameForge2026!QA' } });
    assert.equal(login.status(), 200);
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.locator('#projectGrid .project-row').filter({ hasText: 'Editor Actions QA' }).click();
    const sourceRow = page.locator(`#mainShotTable tbody tr[data-id="${shotId}"]`);
    await sourceRow.waitFor();
    await sourceRow.click({ button: 'right' });
    const duplicate = page.locator('#tableContextMenu [data-context-action="row-duplicate"]');
    await duplicate.waitFor({ state: 'visible' });
    const countBefore = await page.evaluate(() => state.bundle.shots.length);
    const projectId = await page.evaluate(() => state.bundle.project.id);
    const createRequestPromise = page.waitForRequest(request => request.url().includes(`/api/projects/${projectId}/shots`) && request.method() === 'POST');
    const createResponsePromise = page.waitForResponse(response => response.url().includes(`/api/projects/${projectId}/shots`) && response.request().method() === 'POST');
    await duplicate.click();
    const createRequest = await createRequestPromise;
    const createResponse = await createResponsePromise;
    assert.equal(createResponse.status(), 201);
    const payload = createRequest.postDataJSON();
    assert.equal(payload.dialogue, dialogue, 'row duplicate should send dialogue in create payload');
    const result = await createResponse.json();
    const clone = result.shots.find(shot => shot.id === result.created_shot_id);
    assert.ok(clone, 'created shot should be returned by the server');
    assert.equal(clone.dialogue, dialogue, 'server should persist the duplicate dialogue');
    assert.equal(clone.voiceover, '原镜头旁白');
    assert.equal(result.shots.length, countBefore + 1);
    await page.waitForFunction(id => state.bundle.shots.some(shot => shot.id === id), clone.id);

    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.locator('#projectGrid .project-row').filter({ hasText: 'Editor Actions QA' }).click();
    await page.locator(`#mainShotTable tbody tr[data-id="${clone.id}"]`).waitFor();
    const reloadedDialogue = await page.evaluate(id => state.bundle.shots.find(shot => shot.id === id).dialogue, clone.id);
    assert.equal(reloadedDialogue, dialogue, 'dialogue should survive reopening the project');

    const insertAnchor = page.locator('#mainShotTable tbody tr[data-id]').first();
    const anchorId = await insertAnchor.getAttribute('data-id');
    await insertAnchor.click({ button: 'right' });
    await page.locator('#tableContextMenu [data-context-action="row-insert-after"]').click();
    await page.locator('#insertShotModal[open]').waitFor();
    await page.locator('#insertShotForm input[name="title"]').fill('插入位置 QA');
    await page.locator('#insertShotForm input[name="insertDirection"][value="after"]').check();
    const insertRequestPromise = page.waitForRequest(request => request.url().includes(`/api/projects/${projectId}/shots`) && request.method() === 'POST');
    const insertResponsePromise = page.waitForResponse(response => response.url().includes(`/api/projects/${projectId}/shots`) && response.request().method() === 'POST');
    await page.locator('#insertShotForm button[type="submit"]').click();
    const insertRequest = await insertRequestPromise;
    const insertResponse = await insertResponsePromise;
    assert.equal(insertResponse.status(), 201);
    assert.equal(insertRequest.postDataJSON().position, 1, 'insert-after should send the position following its anchor');
    const insertBundle = await insertResponse.json();
    const insertedId = insertBundle.created_shot_id;
    assert.ok(insertedId);
    assert.equal(insertBundle.shots[1].id, insertedId, 'server should place the new shot after the selected anchor');
    await page.waitForFunction(id => state.activeShotId === id, insertedId);
    assert.deepEqual(await page.locator('#mainShotTable tbody tr[data-id]').evaluateAll(rows => rows.slice(0, 3).map(row => row.dataset.id)), [anchorId, insertedId, ...insertBundle.shots.slice(2, 3).map(shot => shot.id)]);

    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.locator('#projectGrid .project-row').filter({ hasText: 'Editor Actions QA' }).click();
    await page.locator(`#mainShotTable tbody tr[data-id="${insertedId}"]`).waitFor();
    const insertedOrder = await page.locator('#mainShotTable tbody tr[data-id]').evaluateAll(rows => rows.slice(0, 3).map(row => row.dataset.id));
    assert.equal(insertedOrder[1], insertedId, 'middle insertion should survive project reload');

    assert.deepEqual(pageErrors, []);

    const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    await mobileContext.addInitScript(() => localStorage.setItem('frameforge-show-qa-projects', '1'));
    const mobileLogin = await mobileContext.request.post(`${base}/api/login`, { data: { username: 'qa-admin', password: 'FrameForge2026!QA' } });
    assert.equal(mobileLogin.status(), 200);
    const mobile = await mobileContext.newPage();
    mobile.setDefaultTimeout(6000);
    await mobile.goto(base, { waitUntil: 'domcontentloaded' });
    const mobileProjectRow = mobile.locator('#projectGrid .project-row').filter({ hasText: 'Editor Actions QA' });
    const mobileProjectId = await mobileProjectRow.locator('[data-action="edit-project"]').getAttribute('data-project-id');
    await mobile.evaluate(id => openProject(id), mobileProjectId);
    const rows = mobile.locator('#mainShotTable tbody tr[data-id]');
    await rows.first().waitFor();
    const beforeOrder = await rows.evaluateAll(items => items.slice(0, 2).map(row => row.dataset.id));
    const handleBox = await rows.first().locator('[data-shot-drag-handle]').boundingBox();
    const targetBox = await rows.nth(1).boundingBox();
    assert.ok(handleBox && targetBox, 'mobile drag source and target should be visible');
    const touch = await mobile.context().newCDPSession(mobile);
    const startX = handleBox.x + handleBox.width / 2;
    const startY = handleBox.y + handleBox.height / 2;
    const endX = targetBox.x + Math.max(36, Math.min(targetBox.width - 8, startX - targetBox.x));
    const endY = targetBox.y + targetBox.height - 2;
    const reorderResponsePromise = mobile.waitForResponse(response => response.url().includes(`/api/projects/${mobileProjectId}/shots/reorder`) && response.request().method() === 'POST');
    await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: startX, y: startY, id: 3 }] });
    await mobile.waitForTimeout(380);
    await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: endX, y: endY, id: 3 }] });
    await mobile.waitForTimeout(80);
    await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    const reorderResponse = await reorderResponsePromise;
    assert.equal(reorderResponse.status(), 200, 'touch reorder should commit successfully');
    await mobile.waitForFunction(previous => {
      const current = [...document.querySelectorAll('#mainShotTable tbody tr[data-id]')].slice(0, 2).map(row => row.dataset.id);
      return current[0] !== previous[0];
    }, beforeOrder);
    const afterOrder = await rows.evaluateAll(items => items.slice(0, 2).map(row => row.dataset.id));
    assert.deepEqual(afterOrder, [beforeOrder[1], beforeOrder[0]], 'touch reorder should place the first row after the second');
    await mobile.reload({ waitUntil: 'domcontentloaded' });
    await mobile.evaluate(id => openProject(id), mobileProjectId);
    await mobile.locator(`#mainShotTable tbody tr[data-id="${beforeOrder[1]}"]`).waitFor();
    const persistedOrder = await mobile.locator('#mainShotTable tbody tr[data-id]').evaluateAll(items => items.slice(0, 2).map(row => row.dataset.id));
    assert.deepEqual(persistedOrder, afterOrder, 'touch reorder should survive project reload');
    await mobileContext.close();
    console.log('PASS [isolated browser]: duplicate preserves dialogue through reload; mobile long-press reorder commits and survives reload.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
