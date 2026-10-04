const { chromium } = require('playwright');

const base = process.env.FRAMEFORGE_QA_BASE || (process.env.FRAMEFORGE_QA_BASE || 'http://127.0.0.1:18799');

(async () => {
  const executablePath = process.env.CHROME_PATH || (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : undefined);
  const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  const page = await browser.newPage({ viewport: { width: 3000, height: 1500 } });
  page.setDefaultTimeout(12000);
  try {
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.fill('[name=username]', process.env.QA_USER || 'qa-admin');
    await page.fill('[name=password]', process.env.QA_PASS || 'FrameForge2026!QA');
    await page.click('#loginForm button[type=submit]');
    await page.waitForSelector('#dashboardView:not(.hidden)');
    await page.click('#dashNewProjectBtn');
    await page.fill('#newProjForm [name=name]', 'qa-review-version-qa');
    await page.click('#newProjForm button[type=submit]');
    await page.waitForSelector('#mainShotTable');
    await page.click('.ff73-nav-item[data-view="review"]');
    await page.waitForSelector('#reviewContainer .review-workspace');

    const bodyZoom = await page.evaluate(() => getComputedStyle(document.body).zoom);
    if (!Number.isFinite(Number(bodyZoom)) || Number(bodyZoom) <= 0) throw new Error(`invalid workspace scale: ${bodyZoom}`);

    const decisionLabels = await page.locator('.review-decision button').allTextContents();
    const expectedLabels = ['提交修订'];
    if (JSON.stringify(decisionLabels.map(text => text.trim())) !== JSON.stringify(expectedLabels)) {
      throw new Error(`review actions mismatch: ${JSON.stringify({ decisionLabels, expectedLabels })}`);
    }

    const mediaBox = await page.locator('.review-viewer-media').boundingBox();
    if (!mediaBox || mediaBox.width <= 0 || mediaBox.height <= 0) {
      throw new Error(`review media layout mismatch: ${JSON.stringify(mediaBox)}`);
    }

    await page.fill('#commentForm textarea[name="text"]', '评论按钮样式检查');
    await page.click('#commentForm button[type=submit]');
    await page.waitForSelector('.comment-item:not(.is-syncing) .comment-edit');
    const editStyle = await page.locator('.comment-edit').first().evaluate(el => {
      const style = getComputedStyle(el);
      return { display: style.display, background: style.backgroundColor, height: el.getBoundingClientRect().height };
    });
    if (!['flex', 'inline-flex'].includes(editStyle.display) || editStyle.background !== 'rgba(0, 0, 0, 0)' || editStyle.height > 38) {
      throw new Error(`comment edit rendered as native box: ${JSON.stringify(editStyle)}`);
    }

    await page.evaluate(async () => {
      const pid = state.bundle.project.id;
      const shot = state.bundle.shots.find(item => item.id === state.selection.activeShotId);
      await api(`/api/projects/${pid}/custom-fields`, { method: 'POST', json: {
        key: 'review_probe', label: 'Review Probe', field_type: 'text'
      } });
      await api(`/api/projects/${pid}/shots`, { method: 'PUT', json: { shots: [{
        id: shot.id, base_revision: shot.revision, changed_fields: ['custom_fields'],
        custom_fields: { review_probe: 'retained' }
      }] } });
      state.bundle = adoptServerBundle(await api(`/api/projects/${pid}`));
      renderReviewView();
    });

    // Exercise the rendered Review action, not the route in isolation.
    const reviewShot = await page.evaluate(() => {
      const shot = state.bundle.shots.find(item => item.id === state.selection.activeShotId);
      return { id: shot.id, projectId: state.bundle.project.id, revision: shot.revision };
    });
    const reviewWrite = page.waitForRequest(request =>
      request.method() === 'PUT' && request.url().endsWith(`/api/shots/${reviewShot.id}`));
    await page.click('[data-review-status="Ready for Review"]');
    const reviewRequest = await reviewWrite;
    const reviewPayload = reviewRequest.postDataJSON();
    if (reviewPayload.version_id !== null || reviewPayload.base_revision !== reviewShot.revision ||
        JSON.stringify(reviewPayload.changed_fields) !== JSON.stringify(['status'])) {
      throw new Error(`Review did not send a field-aware status command: ${JSON.stringify(reviewPayload)}`);
    }
    await page.waitForFunction(() => state.bundle.shots.find(item => item.id === state.selection.activeShotId)?.status === 'Ready for Review');
    const afterReviewFields = await page.evaluate(() =>
      prepareCollaborativeShots(state.bundle).find(item => item.id === state.selection.activeShotId)?.changed_fields);
    if (afterReviewFields.includes('panels') || afterReviewFields.includes('custom_fields')) {
      throw new Error(`partial Review ACK dirtied associated Shot fields: ${JSON.stringify(afterReviewFields)}`);
    }
    for (const status of ['Draft', 'Ready for Review']) {
      const nextAck = page.waitForResponse(response => response.request().method() === 'PUT' &&
        response.url().endsWith(`/api/shots/${reviewShot.id}`));
      await page.click(`[data-review-status="${status}"]`);
      const response = await nextAck;
      if (response.status() !== 200) throw new Error(`back-to-back Review status failed: HTTP ${response.status()}`);
      await page.waitForFunction(expected => state.bundle.shots.find(item => item.id === state.selection.activeShotId)?.status === expected, status);
    }
    const beforeTableStatus = await page.evaluate(() => {
      const shot = state.bundle.shots.find(item => item.id === state.selection.activeShotId);
      return { revision: shot.revision, baseRevision: shot._syncBaseline?.revision,
        status: shot.status, baseStatus: shot._syncBaseline?.status,
        dirty: state.dirty, fields: prepareCollaborativeShots(state.bundle).find(item => item.id === shot.id)?.changed_fields };
    });
    const tableStatusSave = page.waitForResponse(response => response.request().method() === 'PUT' &&
      response.url().endsWith(`/api/projects/${reviewShot.projectId}/shots`));
    await page.evaluate(() => {
      const shot = state.bundle.shots.find(item => item.id === state.selection.activeShotId);
      shot.status = 'Draft';
      markDirty();
    });
    const tableStatusResponse = await tableStatusSave;
    if (tableStatusResponse.status() !== 200) {
      throw new Error(`Review ACK caused a false status conflict in bulk save: HTTP ${tableStatusResponse.status()}; ${JSON.stringify(beforeTableStatus)}`);
    }
    await page.waitForFunction(() => state.bundle.shots.find(item => item.id === state.selection.activeShotId)?.status === 'Draft' && !state.dirty);
    const resumeReview = page.waitForResponse(response => response.request().method() === 'PUT' &&
      response.url().endsWith(`/api/shots/${reviewShot.id}`));
    await page.click('[data-review-status="Ready for Review"]');
    if ((await resumeReview).status() !== 200) throw new Error('Review did not resume after bulk status save');
    await page.waitForFunction(() => state.bundle.shots.find(item => item.id === state.selection.activeShotId)?.status === 'Ready for Review');

    // A Review command must not race an unsaved Shot draft. The bulk save
    // acknowledges the title first; the status command uses that revision.
    await page.evaluate(() => {
      const shot = state.bundle.shots.find(item => item.id === state.selection.activeShotId);
      shot.title = 'Review draft survives';
      markDirty();
    });
    const bulkWrite = page.waitForResponse(response => response.request().method() === 'PUT' &&
      response.url().endsWith(`/api/projects/${reviewShot.projectId}/shots`));
    const withdrawWrite = page.waitForRequest(request => request.method() === 'PUT' &&
      request.url().endsWith(`/api/shots/${reviewShot.id}`));
    await page.click('[data-review-status="Draft"]');
    const bulkResponse = await bulkWrite;
    const savedShot = (await bulkResponse.json()).shots.find(shot => shot.id === reviewShot.id);
    const withdrawPayload = (await withdrawWrite).postDataJSON();
    if (withdrawPayload.base_revision !== savedShot.revision ||
        JSON.stringify(withdrawPayload.changed_fields) !== JSON.stringify(['status'])) {
      throw new Error(`Review raced an unsaved Shot draft: ${JSON.stringify({ withdrawPayload, savedRevision: savedShot.revision })}`);
    }
    await page.waitForFunction(() => state.bundle.shots.find(item => item.id === state.selection.activeShotId)?.status === 'Draft');
    const persistedDraft = await page.evaluate(async () => {
      const bundle = await api(`/api/projects/${state.bundle.project.id}`);
      return bundle.shots.find(item => item.id === state.selection.activeShotId);
    });
    if (persistedDraft.title !== 'Review draft survives' || persistedDraft.status !== 'Draft') {
      throw new Error(`Review lost the unsaved draft: ${JSON.stringify(persistedDraft)}`);
    }

    // A concurrent status edit must produce 409 and show the server status.
    await page.evaluate(async id => {
      await api(`/api/shots/${id}`, { method: 'PUT', json: { status: 'Approved' } });
    }, reviewShot.id);
    const conflictWrite = page.waitForResponse(response => response.status() === 409 &&
      response.request().method() === 'PUT' && response.url().endsWith(`/api/shots/${reviewShot.id}`));
    await page.click('[data-review-status="Ready for Review"]');
    await conflictWrite;
    await page.waitForFunction(() => {
      const shot = state.bundle.shots.find(item => item.id === state.selection.activeShotId);
      return shot?.status === 'Approved' &&
        document.querySelector('#reviewContainer')?.dataset.reviewFeedback?.includes('冲突');
    });

    // Restore a Draft baseline for the independent version and ACK race checks.
    await page.evaluate(async id => {
      await api('/api/shots/' + id, { method: 'PUT', json: { status: 'Draft' } });
      state.bundle = adoptServerBundle(await api('/api/projects/' + state.bundle.project.id));
      renderReviewView();
    }, reviewShot.id);
    await page.click('[data-review-tab="versions"]');
    await page.click('#createVersionBtn');
    await page.waitForSelector('.version-item');
    const original = await page.evaluate(() => {
      const shot = state.bundle.shots.find(item => item.id === state.selection.activeShotId);
      return { id: shot.id, title: shot.title };
    });
    await page.evaluate(async ({ id }) => {
      await api(`/api/shots/${id}`, { method: 'PUT', json: { title: '回滚测试后的标题' } });
      state.bundle = await api(`/api/projects/${state.bundle.project.id}`);
      renderReviewView();
    }, original);
    await page.click('[data-review-tab="compare"]');
    await page.click('[data-restore-review-version]');
    await page.waitForTimeout(1000);
    const restored = await page.evaluate(() => state.bundle.shots.find(item => item.id === state.selection.activeShotId).title);
    if (restored !== original.title) throw new Error(`version restore mismatch: ${JSON.stringify({ original, restored })}`);

    // Hold the status request while another client changes title and this
    // client edits title. The status ACK must not advance title's base revision.
    const race = await page.evaluate(() => {
      const shot = state.bundle.shots.find(item => item.id === state.selection.activeShotId);
      return { id: shot.id, projectId: state.bundle.project.id,
        status: shot.status === 'Draft' ? 'Ready for Review' : 'Draft' };
    });
    let releaseStatus;
    let statusEntered;
    const statusGate = new Promise(resolve => { releaseStatus = resolve; });
    const statusEnteredGate = new Promise(resolve => { statusEntered = resolve; });
    await page.route(`**/api/shots/${race.id}`, async route => {
      const body = route.request().postDataJSON();
      if (route.request().method() === 'PUT' && body?.status === race.status) {
        statusEntered();
        await statusGate;
      }
      await route.continue();
    });
    const statusAck = page.waitForResponse(response => response.request().method() === 'PUT' &&
      response.url().endsWith(`/api/shots/${race.id}`) && response.status() === 200);
    await page.click(`[data-review-status="${race.status}"]`);
    await statusEnteredGate;
    await page.evaluate(async id => {
      await api(`/api/shots/${id}`, { method: 'PUT', json: {
        title: 'Remote title during Review', changed_fields: ['title']
      } });
      const shot = state.bundle.shots.find(item => item.id === id);
      shot.title = 'Local title during Review';
      markDirty();
    }, race.id);
    releaseStatus();
    await statusAck;
    const raceBulk = await page.waitForResponse(response => response.request().method() === 'PUT' &&
      response.url().endsWith(`/api/projects/${race.projectId}/shots`));
    if (raceBulk.status() !== 409) {
      throw new Error(`status ACK let stale local title overwrite remote title: HTTP ${raceBulk.status()}`);
    }
    const remoteAfterRace = await page.evaluate(async projectId => {
      const bundle = await api(`/api/projects/${projectId}`);
      return bundle.shots.find(item => item.id === state.selection.activeShotId).title;
    }, race.projectId);
    if (remoteAfterRace !== 'Remote title during Review') {
      throw new Error(`remote title was overwritten after status ACK: ${remoteAfterRace}`);
    }
    console.log(JSON.stringify({ pass: true, bodyZoom, decisionLabels, mediaBox, editStyle, restored }));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
