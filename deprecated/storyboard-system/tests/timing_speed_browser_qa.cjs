const { chromium } = require('playwright');
const assert = require('node:assert/strict');

const base = process.env.TIMING_QA_URL;
const shotId = process.env.TIMING_QA_SHOT_ID;

(async () => {
  assert.ok(base && shotId, 'isolated server URL and seeded shot id are required');
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    await context.addInitScript(() => localStorage.setItem('frameforge-show-qa-projects', '1'));
    const login = await context.request.post(`${base}/api/login`, { data: { username: 'qa-admin', password: 'FrameForge2026!QA' } });
    assert.equal(login.status(), 200, 'QA login should succeed');
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.locator('#projectGrid .project-row').filter({ hasText: 'Editor Actions QA' }).click();
    await page.locator(`#mainShotTable tbody tr[data-id="${shotId}"]`).waitFor();

    const shotRow = page.locator(`#mainShotTable tbody tr[data-id="${shotId}"]`);
    await shotRow.click({ button: 'right' });
    const timingAction = page.locator('#tableContextMenu [data-context-action="row-auto-timing"]');
    await timingAction.waitFor({ state: 'visible' });
    assert.equal(await timingAction.isDisabled(), false, 'narrated shot timing action should be enabled');
    await timingAction.click();
    await page.locator('#timingModal[open]').waitFor();

    const speed = page.locator('[data-timing-speed]');
    assert.equal(await speed.inputValue(), '1', 'new session starts at standard speed');
    const frames = page.locator('[data-timing-frames]');
    assert.equal(await frames.count(), 3, 'seed narration should split into three editable segments');
    const standardFrames = await frames.evaluateAll(inputs => inputs.map(input => Number(input.value)));
    await speed.selectOption('0.5');
    const slowFrames = await frames.evaluateAll(inputs => inputs.map(input => Number(input.value)));
    assert.ok(slowFrames[0] > standardFrames[0] && slowFrames[2] > standardFrames[2], `slow speed should lengthen automatic timing: ${JSON.stringify({ standardFrames, slowFrames })}`);

    await frames.nth(0).fill('81');
    const manuallyEditedFrames = await frames.nth(0).inputValue();
    await page.locator('.timing-lock').nth(1).click();
    const lockedFrames = await frames.nth(1).inputValue();
    await speed.selectOption('2');
    const fastFrames = await frames.evaluateAll(inputs => inputs.map(input => Number(input.value)));
    assert.equal(String(fastFrames[0]), manuallyEditedFrames, 'manual frame edit must survive speed change');
    assert.equal(String(fastFrames[1]), lockedFrames, 'locked frame count must survive speed change');
    assert.ok(fastFrames[2] < slowFrames[2], 'unmodified segment should shorten at faster speed');

    await page.locator('#applyTimingShotBtn').click();
    await page.locator('#timingModal').waitFor({ state: 'hidden' });
    const expectedDuration = fastFrames.reduce((sum, value) => sum + value, 0);
    assert.equal(await page.evaluate(id => state.bundle.shots.find(shot => shot.id === id).duration_frames, shotId), expectedDuration, 'apply should use the visible segment frame total');
    await page.evaluate(async () => {
      for (let tries = 0; tries < 3; tries++) {
        if (!state.dirty && !state.saveInFlight) return;
        await window.saveProject({ automatic: false });
        if (!state.dirty && !state.saveInFlight) return;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      throw new Error(`save did not settle: dirty=${state.dirty}, inFlight=${state.saveInFlight}`);
    });
    const savedBundle = await page.request.get(`${base}/api/projects/${await page.evaluate(() => state.bundle.project.id)}`);
    assert.equal(savedBundle.status(), 200);
    const savedShot = (await savedBundle.json()).shots.find(shot => shot.id === shotId);
    assert.equal(savedShot.duration_frames, expectedDuration, 'server should persist applied timing');

    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.locator('#projectGrid .project-row').filter({ hasText: 'Editor Actions QA' }).click();
    await page.locator(`#mainShotTable tbody tr[data-id="${shotId}"]`).waitFor();
    const reloaded = await page.evaluate(id => state.bundle.shots.find(shot => shot.id === id).duration_frames, shotId);
    assert.equal(reloaded, expectedDuration, 'project reload should retain the saved duration');

    const projectId = await page.evaluate(() => state.bundle.project.id);
    const [dialogueShotId, lockedShotId] = await page.evaluate(() => state.bundle.shots.slice(1, 3).map(shot => shot.id));
    const baseline = await page.evaluate(() => ({
      target: state.bundle.project.target_seconds,
      durations: Object.fromEntries(state.bundle.shots.map(shot => [shot.id, shot.duration_frames]))
    }));
    await page.locator('[data-nav-key="voiceover"]').click();
    await page.locator('#projectNarrationSpeed').waitFor({ state: 'visible' });
    const projectSpeed = page.locator('#projectNarrationSpeed');
    const autoTiming = page.locator('#scriptContainer [data-action="auto-timing"]');
    await projectSpeed.selectOption('0.5');
    let timingResponsePromise = page.waitForResponse(response => response.url().includes(`/api/projects/${projectId}/auto-timing`) && response.request().method() === 'POST');
    await autoTiming.click();
    const slowResponse = await timingResponsePromise;
    assert.equal(slowResponse.status(), 200);
    const slowBundle = await slowResponse.json();
    const slowShot = slowBundle.shots.find(shot => shot.id === shotId);
    const slowDialogue = slowBundle.shots.find(shot => shot.id === dialogueShotId);
    const slowLocked = slowBundle.shots.find(shot => shot.id === lockedShotId);
    assert.ok(slowShot.duration_frames > expectedDuration, 'project rate should lengthen narrated shot from its faster single-shot result');
    assert.ok(slowDialogue.duration_frames > 0, 'dialogue-only shot should be timed');
    assert.equal(slowLocked.duration_frames, baseline.durations[lockedShotId], 'locked shot duration must remain unchanged');
    assert.equal(slowBundle.project.target_seconds, baseline.target, 'timing must not change project target metadata');
    const slowProjectFrames = slowBundle.total_frames;

    await projectSpeed.selectOption('2');
    timingResponsePromise = page.waitForResponse(response => response.url().includes(`/api/projects/${projectId}/auto-timing`) && response.request().method() === 'POST');
    await autoTiming.click();
    const fastResponse = await timingResponsePromise;
    assert.equal(fastResponse.status(), 200);
    const fastBundle = await fastResponse.json();
    assert.ok(fastBundle.total_frames < slowProjectFrames, 'project total duration should shrink at faster speech rate');
    assert.equal(fastBundle.shots.find(shot => shot.id === lockedShotId).duration_frames, baseline.durations[lockedShotId]);
    const fastDialogue = fastBundle.shots.find(shot => shot.id === dialogueShotId);
    assert.ok(fastDialogue.duration_frames > 0 && fastDialogue.duration_frames < slowDialogue.duration_frames, 'dialogue-only shot should follow the selected speed');
    assert.equal(fastBundle.project.target_seconds, baseline.target);

    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.locator('#projectGrid .project-row').filter({ hasText: 'Editor Actions QA' }).click();
    await page.locator(`#mainShotTable tbody tr[data-id="${shotId}"]`).waitFor();
    const projectReload = await page.evaluate(() => ({
      target: state.bundle.project.target_seconds,
      frames: state.bundle.total_frames,
      durations: Object.fromEntries(state.bundle.shots.map(shot => [shot.id, shot.duration_frames]))
    }));
    assert.equal(projectReload.frames, fastBundle.total_frames, 'bulk calculation should remain saved after reload');
    assert.equal(projectReload.target, baseline.target, 'reload should retain the unchanged project target');
    assert.deepEqual(projectReload.durations, Object.fromEntries(fastBundle.shots.map(shot => [shot.id, shot.duration_frames])));
    assert.deepEqual(pageErrors, [], `browser should have no page errors: ${pageErrors.join('; ')}`);
    console.log(`PASS [isolated browser]: single speed ${JSON.stringify({ standardFrames, slowFrames, fastFrames })}; manual/locked retention; applied ${expectedDuration}f saved/reloaded; project 0.5×=${slowProjectFrames}f, 2×=${fastBundle.total_frames}f, dialogue timed, locked and target preserved.`);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
