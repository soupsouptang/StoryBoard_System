const { chromium } = require('playwright');
const assert = require('node:assert/strict');

const SERVER_URL = process.env.TEST_SERVER_URL || 'http://127.0.0.1:8765';

async function run() {
  console.log('[QA] Starting dual-browser collaboration reliability tests on', SERVER_URL);
  const browser = await chromium.launch({ headless: true });

  try {
    // Context 1: Peer 1
    const ctx1 = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    await ctx1.addInitScript(() => localStorage.setItem('frameforge-show-qa-projects', '1'));
    const login1 = await ctx1.request.post(SERVER_URL + '/api/login', {
      data: { username: 'peer1', password: 'FrameForge2026!QA' }
    });
    assert.equal(login1.status(), 200, 'Peer 1 login failed');
    const page1 = await ctx1.newPage();
    const errors1 = [];
    page1.on('pageerror', e => errors1.push(e.message));

    // Context 2: Peer 2
    const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    await ctx2.addInitScript(() => localStorage.setItem('frameforge-show-qa-projects', '1'));
    const login2 = await ctx2.request.post(SERVER_URL + '/api/login', {
      data: { username: 'peer2', password: 'FrameForge2026!QA' }
    });
    assert.equal(login2.status(), 200, 'Peer 2 login failed');
    const page2 = await ctx2.newPage();
    const errors2 = [];
    page2.on('pageerror', e => errors2.push(e.message));

    // Open project in both
    await page1.goto(SERVER_URL);
    const hubRow = page1.locator('#projectGrid .project-row').filter({hasText:'Editor Actions QA'});
    await hubRow.waitFor();
    const coverGeometry = await hubRow.evaluate(row => {
      const cover = row.querySelector('.project-cover');
      return {height:row.offsetHeight, width:row.clientWidth, coverWidth:cover.offsetWidth, coverHeight:cover.offsetHeight, monograms:row.querySelectorAll('.project-cover-monogram').length, wash:!!cover.querySelector('.project-cover-wash')};
    });
    assert.equal(coverGeometry.height,90,'restored compact project row height');
    assert.equal(coverGeometry.coverWidth,96,'restored compact project cover width');
    assert.equal(coverGeometry.coverHeight,56,'restored compact project cover height');
    assert.equal(coverGeometry.monograms,1,'project cover keeps its monogram fallback');
    assert.equal(coverGeometry.wash,true);
    await page1.locator('#projectGrid .project-row').filter({ hasText: 'Editor Actions QA' }).click();
    await page1.waitForSelector('#mainShotTable');

    await page2.goto(SERVER_URL);
    await page2.locator('#projectGrid .project-row').filter({ hasText: 'Editor Actions QA' }).click();
    await page2.waitForSelector('#mainShotTable');

    console.log('-> Both peers opened project successfully.');
    const inspectorToggle = page1.locator('#workspaceToolbarV73 .inspector-toggle');
    await inspectorToggle.waitFor({state:'visible'});
    if (await inspectorToggle.getAttribute('aria-pressed') === 'true') await inspectorToggle.click();
    assert.equal(await inspectorToggle.getAttribute('aria-pressed'),'false');
    await page1.locator('#workspaceToolbarV73 [data-action="saveRefresh"]').waitFor({state:'visible'});

    // ------------------------------------------------------------------------
    // CASE 1: In-typing Editor Draft Persistence (Plain Text)
    // ------------------------------------------------------------------------
    console.log('[Test 1] In-typing Editor Draft Persistence (Plain Text)...');
    const chapterCell1 = page1.locator('#mainShotTable td[data-field="chapter"]').first();
    await chapterCell1.dblclick();
    const input1 = chapterCell1.locator('input.inline-cell-editor');
    await input1.waitFor({ state: 'visible' });
    assert.equal(await inspectorToggle.getAttribute('aria-pressed'),'false','Double-click editing must not open inspector');
    await input1.fill('实时输入测试草稿');
    await page2.waitForFunction(() => document.querySelector('.multiplayer-cell.is-editing'));
    assert.equal(await page2.locator('.multiplayer-cell.is-editing').count(), 1, 'Only the edited field gets a presence outline');
    assert.equal(await page2.locator('.multiplayer-cell').evaluate(el => getComputedStyle(el).pointerEvents), 'none');
    assert.equal(await page2.locator('.multiplayer-cell').innerText(), '', 'No collaborator name on locked field');
    // Wait for 350ms draft debounce
    await page1.waitForTimeout(500);

    // Verify localStorage draft exists before blur or commit
    const draft1 = await page1.evaluate(() => {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('frameforge-editor-draft:') && k.includes('chapter')) {
          return JSON.parse(localStorage.getItem(k));
        }
      }
      return null;
    });
    assert.ok(draft1, 'Draft should exist in localStorage while editor is still open');
    assert.equal(draft1.text, '实时输入测试草稿', 'Draft text must match uncommitted input');
    console.log('  PASS: Plain text draft persisted to localStorage before commit.');

    // ------------------------------------------------------------------------
    // CASE 2: Active Editor Flush on Manual Save (Ctrl+S)
    // ------------------------------------------------------------------------
    console.log('[Test 2] Active Editor Flush on Manual Save (Ctrl+S)...');
    // Press Ctrl+S while input is still focused
    await page1.keyboard.press('Control+s');
    await page2.waitForFunction(() => !document.querySelector('.multiplayer-cell.is-editing'));
    await page1.waitForTimeout(700);

    // Verify input was committed and cell display updated
    const savedChapterText = await chapterCell1.locator('.cell-display').textContent();
    assert.equal(savedChapterText.trim(), '实时输入测试草稿');

    // Verify draft was acknowledged and cleared
    const draftAfterSave = await page1.evaluate(() => {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('frameforge-editor-draft:') && k.includes('chapter')) {
          return localStorage.getItem(k);
        }
      }
      return null;
    });
    assert.equal(draftAfterSave, null, 'Acknowledged draft should be removed after server save');
    console.log('  PASS: Ctrl+S flushed active editor and persisted text to server.');

    // ------------------------------------------------------------------------
    // CASE 3: In-typing Editor Draft Persistence (Rich Text)
    // ------------------------------------------------------------------------
    console.log('[Test 3] In-typing Editor Draft Persistence (Rich Text)...');
    const descCell1 = page1.locator('#mainShotTable td[data-field="description"]').first();
    await descCell1.dblclick();
    const richEditor1 = descCell1.locator('[contenteditable=true]');
    await richEditor1.waitFor({ state: 'visible' });
    await richEditor1.fill('富文本即时输入内容测试');
    // Wait for 350ms debounce
    await page1.waitForTimeout(500);

    const richDraft = await page1.evaluate(() => {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('frameforge-editor-draft:') && k.includes('description')) {
          return JSON.parse(localStorage.getItem(k));
        }
      }
      return null;
    });
    assert.ok(richDraft, 'Rich text draft must exist in localStorage while typing');
    assert.equal(richDraft.text, '富文本即时输入内容测试');
    assert.ok(Array.isArray(richDraft.runs), 'Rich text draft must preserve runs');
    console.log('  PASS: Rich text draft persisted with runs while typing.');

    // Commit rich text editor
    await richEditor1.press('Enter');
    await page1.waitForTimeout(300);

    // ------------------------------------------------------------------------
    // CASE 4: Soft Advisory Reservation & Contention
    // ------------------------------------------------------------------------
    console.log('[Test 4] Soft Advisory Reservation & Contention...');
    // Peer 1 opens chapter cell
    await chapterCell1.dblclick();
    await page1.waitForSelector('input.inline-cell-editor');
    await page1.waitForTimeout(400);

    // Peer 2 opens the same chapter cell
    const peer2Chapter = page2.locator('#mainShotTable td[data-field="chapter"]').first();
    await peer2Chapter.dblclick();
    const peer2Input = peer2Chapter.locator('input.inline-cell-editor');
    await peer2Input.waitFor({ state: 'visible' });
    await page2.waitForTimeout(400);

    // Check Peer 2's reservation state
    const peer2ReservationState = await peer2Chapter.getAttribute('data-reservation-state');
    assert.equal(peer2ReservationState, 'contended', 'Second editor must become contended, not rejected');

    // Verify Peer 2's editor was NOT closed and text entry is not blocked
    await peer2Input.fill('协作者二号的内容');
    const peer2Val = await peer2Input.inputValue();
    assert.equal(peer2Val, '协作者二号的内容', 'Contended editor must never drop user text or lock typing');

    // Verify styling token for contended uses var(--warning)
    const warningStyle = await page2.evaluate(() => {
      const el = document.querySelector('[data-reservation-state="contended"]');
      if (!el) return null;
      return window.getComputedStyle(el).borderColor;
    });
    assert.ok(warningStyle, 'Contended element must have computed warning border');
    console.log('  PASS: Soft reservation marks contended without closing editor or dropping text.');

    // Peer 1 closes editor (Escape)
    await chapterCell1.locator('input.inline-cell-editor').press('Escape');
    await page1.waitForTimeout(300);

    // Peer 2 closes editor
    await peer2Input.press('Escape');
    await page2.waitForTimeout(300);

    // ------------------------------------------------------------------------
    // CASE 5: Health Independence (Save Health vs Network Health vs Presence)
    // ------------------------------------------------------------------------
    console.log('[Test 5] Independent Health Tracking (Save Health vs Network vs Presence)...');
    // Inject a save failure on page1
    await page1.evaluate(() => {
      window.state.dirty = true;
      window.state.lastSaveError = new Error('模拟500服务错误');
      window.refreshSaveStatus();
    });

    const indicatorText = await page1.locator('#saveProjectBtn').textContent();
    assert.ok(indicatorText.includes('同步失败 · 本地已保留'), `Indicator must show save failure, got: ${indicatorText}`);

    // Trigger a presence heartbeat / network success
    await page1.evaluate(() => {
      window.noteNetworkSuccess();
      window.refreshSaveStatus();
    });

    const indicatorAfterPresence = await page1.locator('#saveProjectBtn').textContent();
    assert.ok(
      indicatorAfterPresence.includes('同步失败 · 本地已保留'),
      'Successful transport/presence must NOT erase persistent lastSaveError'
    );

    // Save project successfully to recover
    await page1.evaluate(async () => {
      await window.saveCurrentProjectManually();
    });
    await page1.waitForTimeout(400);

    const indicatorRecovered = await page1.locator('#saveProjectBtn').textContent();
    assert.ok(indicatorRecovered.includes('已同步'), `After successful save, status should be synced, got: ${indicatorRecovered}`);
    console.log('  PASS: Save health is independent from network and presence success.');

    // ------------------------------------------------------------------------
    // CASE 6: Save & Refresh Pipeline
    // ------------------------------------------------------------------------
    console.log('[Test 6] Save & Refresh Pipeline...');
    // Modify chapterCell on Peer 1
    await chapterCell1.dblclick();
    const inputCase6 = chapterCell1.locator('input.inline-cell-editor');
    await inputCase6.waitFor({ state: 'visible' });
    await inputCase6.fill('保存刷新测试验证');
    // Do NOT blur or commit! Leave editor open and active!

    // Click "保存并刷新" toolbar button
    const refreshBtn = page1.locator('[data-action="saveRefresh"], button:has-text("保存并刷新")').first();
    assert.ok(await refreshBtn.count() >= 1, 'Save & Refresh button must exist in toolbar');
    await refreshBtn.click();

    // Wait for save & refresh to complete
    await page1.waitForTimeout(800);

    // Verify active editor was safely flushed and saved
    const isDirtyAfterRefresh = await page1.evaluate(() => window.state.dirty);
    assert.equal(isDirtyAfterRefresh, false, 'Project must be saved and marked not dirty');

    const refreshedText = await chapterCell1.locator('.cell-display').textContent();
    assert.equal(refreshedText.trim(), '保存刷新测试验证', 'Active editor value must be flushed and preserved');
    console.log('  PASS: Save & Refresh flushes active editor and refreshes cleanly without page reload.');

    // ------------------------------------------------------------------------
    // CASE 7: Flush Before Leaving Project
    // ------------------------------------------------------------------------
    console.log('[Test 7] Flush Before Leaving Project...');
    // Open editor again
    await chapterCell1.dblclick();
    const inputLeave = chapterCell1.locator('input.inline-cell-editor');
    await inputLeave.waitFor({ state: 'visible' });
    await inputLeave.fill('离开前刷新测试');

    // Click Dashboard button or call showDashboard()
    const navigatedToHub = await page1.evaluate(() => window.showDashboard());
    assert.equal(navigatedToHub, true, 'Leaving a project should flush and navigate successfully');

    // Verify we are in Dashboard / Hub
    const isHub = await page1.evaluate(() => window.state.context === 'hub');
    assert.equal(isHub, true, 'Navigation to hub succeeded');

    // Re-open project and verify text was flushed and saved
    await page1.locator('#projectGrid .project-row').filter({ hasText: 'Editor Actions QA' }).click();
    await page1.waitForSelector('#mainShotTable');
    const finalChapterText = await page1.locator('#mainShotTable td[data-field="chapter"]').first().locator('.cell-display').textContent();
    assert.equal(finalChapterText.trim(), '离开前刷新测试', 'Text must be preserved when leaving project');
    console.log('  PASS: Flush before leaving preserved active editor content.');

    // ------------------------------------------------------------------------
    // CASE 8: Synthetic Composition / IME Flow
    // ------------------------------------------------------------------------
    console.log('[Test 8] Synthetic Composition / IME Flow...');
    const imeCell = page1.locator('#mainShotTable td[data-field="chapter"]').first();
    await imeCell.dblclick();
    const imeInput = imeCell.locator('input.inline-cell-editor');
    await imeInput.waitFor({ state: 'visible' });

    // Dispatch compositionstart
    await imeInput.evaluate(el => {
      el.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
      el.value = 'ce';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });

    const isComposingActive = await page1.evaluate(() => {
      const activeSessions = [...window.activeEditorRegistry?.values?.() || []];
      return activeSessions.some(s => s.composing);
    });
    assert.equal(isComposingActive, true, 'Active session must track compositionstate');

    // Dispatch compositionend with final characters
    await imeInput.evaluate(el => {
      el.value = '测试输入法合成';
      el.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });

    const isComposingEnded = await page1.evaluate(() => {
      const activeSessions = [...window.activeEditorRegistry?.values?.() || []];
      return activeSessions.some(s => s.composing);
    });
    assert.equal(isComposingEnded, false, 'Composition state must clear on compositionend');

    await imeInput.press('Enter');
    await page1.waitForTimeout(300);
    console.log('  PASS: Synthetic IME composition lifecycle verified.');

    // ------------------------------------------------------------------------
    // ------------------------------------------------------------------------
    // CASE LONG-01: Long-session Continuity (Wake & Continuity)
    // ------------------------------------------------------------------------
    console.log('[Test LONG-01] Long-session Continuity (Wake & Persistence)...');
    await page1.reload();
    await page1.locator('#projectGrid .project-row').filter({ hasText: 'Editor Actions QA' }).click();
    await page1.waitForSelector('#mainShotTable');

    // First edit & save
    const cellL1 = page1.locator('#mainShotTable td[data-field="chapter"]').first();
    await cellL1.dblclick();
    const inputL1 = cellL1.locator('input.inline-cell-editor');
    await inputL1.waitFor({ state: 'visible' });
    await inputL1.fill('长会话一阶段内容');
    await inputL1.press('Enter');
    await page1.evaluate(() => window.saveCurrentProjectManually());
    await page1.waitForTimeout(400);

    // Simulate timer suspension / wake recovery after long session
    await page1.evaluate(() => {
      window.triggerWakeRecovery({ reason: 'test-wake' });
    });
    await page1.waitForTimeout(300);

    // Second edit
    await cellL1.dblclick();
    const inputL2 = cellL1.locator('input.inline-cell-editor');
    await inputL2.waitFor({ state: 'visible' });
    await inputL2.fill('长会话二阶段内容');
    await inputL2.press('Enter');
    await page1.evaluate(() => window.saveCurrentProjectManually());
    await page1.waitForTimeout(500);

    const textL2 = await cellL1.locator('.cell-display').textContent();
    assert.equal(textL2.trim(), '长会话二阶段内容', 'Second edit after wake must persist');
    const diagL1 = await page1.evaluate(() => window.getCollabDiagnostics());
    assert.equal(diagL1.saveInFlight, false, 'saveInFlight must be false');
    assert.equal(diagL1.dirty, false, 'Project must be clean after second save');
    console.log('  PASS: LONG-01 Long-session continuity verified.');

    // ------------------------------------------------------------------------
    // CASE LONG-02: Stalled Request Timeout & saveInFlight Reset
    // ------------------------------------------------------------------------
    console.log('[Test LONG-02] Stalled Request Timeout & saveInFlight Reset...');
    // Intercept project PUT to stall
    let stalledRoute = null;
    await page1.route('**/api/projects/*/shots', async route => {
      if (route.request().method() === 'PUT') {
        stalledRoute = route;
        // Hold the route to simulate stalled network
        return;
      }
      return route.continue();
    });

    // Make an edit
    await cellL1.dblclick();
    const inputL3 = cellL1.locator('input.inline-cell-editor');
    await inputL3.waitFor({ state: 'visible' });
    await inputL3.fill('超时测试内容');
    await inputL3.press('Enter');

    // Trigger REAL saveProject() with a bounded 1500ms timeout
    const savePromise = page1.evaluate(async () => {
      return window.saveProject({ automatic: false, timeout: 1500 });
    });

    // While request is in flight, assert saveInFlight is true
    await page1.waitForTimeout(300);
    const inFlightDiag = await page1.evaluate(() => window.getCollabDiagnostics());
    assert.equal(inFlightDiag.saveInFlight, true, 'saveInFlight must be true while network request is pending');

    // Wait for the timeout rejection and saveProject to finish
    const saveResult = await savePromise;
    assert.equal(saveResult, false, 'saveProject must return false on timeout error');

    // Abort stalled route before unrouting so it does not leak to backend
    if (stalledRoute) {
      try { await stalledRoute.abort('timedout'); } catch (_) {}
      stalledRoute = null;
    }
    await page1.unroute('**/api/projects/*/shots');

    // Verify saveInFlight resets to false and local dirty remains
    const diagL2 = await page1.evaluate(() => window.getCollabDiagnostics());
    assert.equal(diagL2.saveInFlight, false, 'saveInFlight must reset to false after timeout abort');
    assert.equal(diagL2.dirty, true, 'Local dirty must be preserved on timeout');

    // Retry save now that route is unblocked
    const retryResult = await page1.evaluate(() => window.saveCurrentProjectManually());
    assert.equal(retryResult, true, 'Retry save after timeout must succeed');
    const diagL2Recovered = await page1.evaluate(() => window.getCollabDiagnostics());
    assert.equal(diagL2Recovered.saveInFlight, false, 'saveInFlight must be false');
    assert.equal(diagL2Recovered.dirty, false, 'Project must be clean after retry');
    console.log('  PASS: LONG-02 Stalled request timeout and recovery verified.');

    // ------------------------------------------------------------------------
    // CASE LONG-03: Zero-outbound Normalization (Direct P0 Bug Coverage)
    // ------------------------------------------------------------------------
    console.log('[Test LONG-03] Zero-outbound Normalization (Direct P0 Bug Coverage)...');
    // Force state.dirty=true while prepareCollaborativeShots returns 0 changed fields
    await page1.evaluate(() => {
      window.state.dirty = true;
      window.refreshSaveStatus();
    });

    const changedFieldCount = await page1.evaluate(() => {
      const shots = window.prepareCollaborativeShots(window.state.bundle);
      const changed = shots.filter(s => Array.isArray(s.changed_fields) && s.changed_fields.length > 0);
      return changed.length;
    });
    assert.equal(changedFieldCount, 0, 'Outbound changed-field count must be truly 0 before calling saveProject()');

    const saveZeroResult = await page1.evaluate(() => window.saveProject({ automatic: false }));
    assert.equal(saveZeroResult, true, 'Zero-outbound save must return true and normalize');

    const diagL3 = await page1.evaluate(() => window.getCollabDiagnostics());
    assert.equal(diagL3.saveInFlight, false, 'saveInFlight MUST NOT be left true on zero-outbound save');
    assert.equal(diagL3.dirty, false, 'dirty MUST be normalized to false');

    // Verify a subsequent actual edit saves normally without being blocked
    await cellL1.dblclick();
    const inputL4 = cellL1.locator('input.inline-cell-editor');
    await inputL4.waitFor({ state: 'visible' });
    await inputL4.fill('零变更修复后再次保存');
    await inputL4.press('Enter');

    const postSave = await page1.evaluate(() => window.saveCurrentProjectManually());
    assert.equal(postSave, true, 'Future save must succeed without deadlock');
    const diagL3Final = await page1.evaluate(() => window.getCollabDiagnostics());
    assert.equal(diagL3Final.saveInFlight, false);
    assert.equal(diagL3Final.dirty, false);
    console.log('  PASS: LONG-03 Zero-outbound normalization verified (P0 bug eliminated).');

    // ------------------------------------------------------------------------
    // CASE LONG-04: Visibility / Foreground Recovery
    // ------------------------------------------------------------------------
    console.log('[Test LONG-04] Visibility / Foreground Recovery...');
    await page1.evaluate(() => {
      window.__qaPageLoadedMarker = 12345;
    });

    let presenceRecovered = 0;
    let syncCheckCount = 0;
    const requestHandler = req => {
      const url = req.url();
      if (url.includes('/api/v1/presence/heartbeat') || url.includes('/presence')) {
        presenceRecovered++;
      }
      if (url.includes('/sync-state')) {
        syncCheckCount++;
      }
    };
    page1.on('request', requestHandler);

    // Simulate tab hiding
    await page1.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page1.waitForTimeout(200);

    // Simulate returning visible (foreground wake)
    await page1.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page1.waitForTimeout(800);

    page1.off('request', requestHandler);

    // Assert page was NOT reloaded
    const marker = await page1.evaluate(() => window.__qaPageLoadedMarker);
    assert.equal(marker, 12345, 'Page must not be reloaded during visibility recovery');

    // Assert presence recovery and sync check ran
    const diagL4 = await page1.evaluate(() => window.getCollabDiagnostics());
    assert.equal(diagL4.saveInFlight, false, 'Recovery must not deadlock saveInFlight');
    assert.ok(diagL4.wakeRecoveryCount >= 1, 'wakeRecoveryCount must be at least 1');
    assert.ok(presenceRecovered >= 1, 'Foreground recovery must cause presence recovery');
    assert.ok(syncCheckCount >= 1, 'Foreground recovery must cause project sync check');
    console.log('  PASS: LONG-04 Visibility recovery verified with actual network checks and no reload.');

    // Report final summary
    console.log('\n======================================================');
    console.log('COLLABORATION RELIABILITY FULL QA REPORT:');
    console.log('Synthetic IME: PASS');
    console.log('Windows IME Manual: NOT TESTED (headless test environment)');
    console.log('Multiplayer Soft Reservation: PASS');
    console.log('In-typing Editor Drafts: PASS');
    console.log('Draft Acknowledgement Cleanup: PASS');
    console.log('Active Editor Flush (Save & Refresh, Ctrl+S, Leave): PASS');
    console.log('Independent Health Separation: PASS');
    console.log('CASE LONG-01 (Long Session Continuity): PASS');
    console.log('CASE LONG-02 (Stalled Request Timeout & Abort): PASS');
    console.log('CASE LONG-03 (Zero-Outbound Normalization / P0 Deadlock Fix): PASS');
    console.log('CASE LONG-04 (Background / Visibility Recovery): PASS');
    console.log('Console Errors Peer 1:', errors1.length === 0 ? 'NONE' : errors1);
    console.log('Console Errors Peer 2:', errors2.length === 0 ? 'NONE' : errors2);
    console.log('======================================================\n');

    assert.equal(errors1.length, 0, `Peer 1 had console errors: ${errors1.join(', ')}`);
    assert.equal(errors2.length, 0, `Peer 2 had console errors: ${errors2.join(', ')}`);

    await ctx1.close();
    await ctx2.close();
    console.log('ALL TESTS PASSED SUCCESSFULLY!');
  } finally {
    await browser.close();
  }
}

run().catch(err => {
  console.error('QA FAILED:', err);
  process.exit(1);
});
