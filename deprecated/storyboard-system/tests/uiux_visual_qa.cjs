const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const stage = process.env.UIUX_QA_STAGE || 'current';
const out = path.join(root, 'qa-artifacts', `uiux-${stage}`);
const dataRoot = path.join(root, '.qa-data', `uiux-${stage}`);
const base = 'http://127.0.0.1:18768';
const largeXlsxPath = process.env.FRAMEFORGE_LARGE_XLSX || '';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function waitForServer() {
  for (let index = 0; index < 60; index += 1) {
    try {
      const response = await fetch(`${base}/api/session`);
      if (response.ok) return;
    } catch (_) {}
    await sleep(100);
  }
  throw new Error('UIUX QA server did not start');
}

async function layoutSnapshot(page, name) {
  await page.waitForTimeout(180);
  await page.screenshot({ path: path.join(out, `${name}.png`), fullPage: true });
  return page.evaluate(() => {
    const visible = element => {
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && box.width > 0 && box.height > 0;
    };
    const overlap = selector => {
      const boxes = [...document.querySelectorAll(selector)].filter(visible).map(element => ({
        id: element.id || element.getAttribute('aria-label') || element.textContent.trim().slice(0, 24),
        box: element.getBoundingClientRect()
      }));
      const pairs = [];
      boxes.forEach((item, index) => boxes.slice(index + 1).forEach(other => {
        const a = item.box;
        const b = other.box;
        const x = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (x > 2 && y > 2) pairs.push(`${item.id} <> ${other.id}`);
      }));
      return pairs;
    };
    const iconOffsets = [...document.querySelectorAll('.btn-ghost-icon .g-icon')].filter(visible).map(icon => {
      const parent = icon.parentElement.getBoundingClientRect();
      const box = icon.getBoundingClientRect();
      return {
        id: icon.parentElement.id || icon.parentElement.getAttribute('aria-label') || icon.parentElement.title,
        dx: Math.round(((box.left + box.right) / 2 - (parent.left + parent.right) / 2) * 10) / 10,
        dy: Math.round(((box.top + box.bottom) / 2 - (parent.top + parent.bottom) / 2) * 10) / 10
      };
    });
    const unnamedButtons = [...document.querySelectorAll('button')].filter(visible).filter(button => {
      const name = button.getAttribute('aria-label') || button.textContent.trim() || button.title;
      return !name;
    }).length;
    return {
      viewport: [window.innerWidth, window.innerHeight],
      documentOverflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      toolbarOverlaps: overlap('.toolbar-right > :not(.hidden)'),
      actionOverlaps: overlap('.sub-header-right > :not(.hidden)'),
      topbarOverlaps: overlap('.topbar-right > :not(.hidden)'),
      headerOverlaps: overlap('.global-header > *'),
      iconOffsets,
      unnamedButtons,
      mainCount: document.querySelectorAll('main').length,
      skipLink: Boolean(document.querySelector('a[href="#mainWorkspace"]')),
      toolbarHeight: Math.round(document.querySelector('.workspace-toolbar')?.getBoundingClientRect().height || 0)
    };
  });
}

async function auditDialogContainment(page, ids, label, screenshotId = '') {
  const results = [];
  for (const id of ids) {
    await page.evaluate(dialogId => {
      document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
      const dialog = document.getElementById(dialogId);
      if (!dialog) throw new Error(`Missing dialog: ${dialogId}`);
      dialog.showModal();
    }, id);
    await page.waitForTimeout(70);
    const metrics = await page.locator(`#${id}`).evaluate(dialog => {
      const card = dialog.querySelector(':scope > .dialog-card');
      const dialogBox = dialog.getBoundingClientRect();
      const cardBox = card?.getBoundingClientRect();
      const tolerance = 2;
      const withinViewport = box => Boolean(box)
        && box.left >= -tolerance
        && box.right <= window.innerWidth + tolerance
        && box.top >= -tolerance
        && box.bottom <= window.innerHeight + tolerance;
      return {
        id: dialog.id,
        dialogWithinViewport: withinViewport(dialogBox),
        cardWithinViewport: withinViewport(cardBox),
        dialogOverflowX: dialog.scrollWidth > dialog.clientWidth + 1,
        cardOverflowX: Boolean(card && card.scrollWidth > card.clientWidth + 1),
        dialogWidth: Math.round(dialogBox.width),
        cardWidth: Math.round(cardBox?.width || 0),
        viewport: [window.innerWidth, window.innerHeight]
      };
    });
    results.push(metrics);
    if (id === screenshotId) await page.screenshot({ path: path.join(out, `${label}-${id}.png`) });
    await page.evaluate(dialogId => document.getElementById(dialogId)?.close(), id);
  }
  return results;
}

(async () => {
  fs.rmSync(dataRoot, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  fs.mkdirSync(dataRoot, { recursive: true });
  const server = spawn('py', ['-3', '-c', 'import server; server.run_server(18768)'], {
    cwd: root,
    env: {
      ...process.env,
      STORYBOARD_DATA_ROOT: dataRoot,
      STORYBOARD_ADMIN_USER: 'qa-admin',
      STORYBOARD_ADMIN_PASSWORD: 'QA-Password-Only-2026!'
    },
    stdio: 'pipe',
    windowsHide: true
  });
  let browser;
  const errors = [];
  const failedRequests = [];
  try {
    await waitForServer();
    browser = await chromium.launch({
      headless: true,
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.setDefaultTimeout(12000);
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('requestfailed', request => failedRequests.push(`${request.method()} ${request.url()} ${request.failure()?.errorText}`));
    await page.route('**/qa-slow-image.png', async route => {
      await sleep(500);
      await route.fulfill({ status: 200, contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64') });
    });

    await page.goto(`${base}/`, { waitUntil: 'networkidle' });
    const login = await layoutSnapshot(page, '01-login-1440');
    await page.setViewportSize({ width: 375, height: 812 });
    await page.click('#openRegisterBtn');
    await page.waitForSelector('#registerModal[open]');
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(out, '01b-register-375.png'), fullPage: true });
    const registerDialog = await page.locator('#registerForm').evaluate(form => {
      const box = form.getBoundingClientRect();
      const controls = [...form.querySelectorAll('input')].map(input => {
        const rect = input.getBoundingClientRect();
        return { inViewport: rect.left >= 0 && rect.right <= window.innerWidth + 1 && rect.top >= 0 && rect.bottom <= window.innerHeight + 1, width: rect.width, height: rect.height };
      });
      return { inViewport: box.left >= 0 && box.right <= window.innerWidth + 1 && box.top >= 0 && box.bottom <= window.innerHeight + 1, controls };
    });
    await page.locator('[data-close="registerModal"]').first().click();
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.fill('[name=username]', 'qa-admin');
    await page.fill('[name=password]', 'QA-Password-Only-2026!');
    await page.click('#loginForm button[type=submit]');
    await page.waitForSelector('#dashboardView:not(.hidden)');
    const dashboard = await layoutSnapshot(page, '02-dashboard-1440');
    await page.evaluate(() => {
      const host = document.createElement('div');
      host.id = 'qaMediaHost';
      host.style.cssText = 'position:fixed;left:24px;bottom:24px;width:240px;aspect-ratio:16/9;z-index:2000';
      host.innerHTML = '<img src="/qa-slow-image.png" alt="加载状态测试" style="width:100%;height:100%;object-fit:cover">';
      document.body.appendChild(host);
    });
    await page.waitForSelector('#qaMediaHost .media-load-indicator');
    const imageLoadingFeedbackVisible = await page.locator('#qaMediaHost').evaluate(host => host.classList.contains('is-media-loading') && Boolean(host.querySelector('.media-load-spinner')));
    await page.screenshot({ path: path.join(out, '02b-image-loading-feedback.png') });
    await page.waitForSelector('#qaMediaHost img.is-media-loaded');
    await page.locator('#qaMediaHost').evaluate(host => host.remove());

    await page.click('#dashNewProjectBtn');
    await page.fill('#newProjForm [name=name]', 'qa-uiux');
    await page.fill('#newProjForm [name=target_seconds]', '90');
    await page.click('#newProjForm button[type=submit]');
    await page.waitForSelector('#mainShotTable');
    const desktop = await layoutSnapshot(page, '03-table-1440');

    const dialogIds = [
      'insertShotModal', 'registerModal', 'userAdminModal', 'pdfExportModal',
      'newProjModal', 'shareDialogModal', 'proConfigModal', 'customFieldsModal',
      'customFieldEditModal', 'fieldEditorModal', 'confirmActionModal', 'timingModal'
    ];
    const dialogAuditDesktop = await auditDialogContainment(page, dialogIds, '03a-dialog-1440', 'proConfigModal');
    await page.evaluate(() => {
      const testButton = document.createElement('button');
      testButton.id = 'qaCursorBusy';
      testButton.type = 'button';
      testButton.textContent = '光标状态测试';
      testButton.style.cssText = 'position:fixed;left:24px;top:64px;width:140px;height:40px;z-index:10000';
      document.body.appendChild(testButton);
      const testText = document.createElement('textarea');
      testText.id = 'qaCursorText';
      testText.style.cssText = 'position:fixed;left:24px;top:112px;width:140px;height:40px;z-index:10000';
      document.body.appendChild(testText);
      const disabled = document.createElement('button');
      disabled.id = 'qaCursorDisabled';
      disabled.disabled = true;
      disabled.style.cssText = 'position:fixed;left:24px;top:160px;width:140px;height:40px;z-index:10000';
      document.body.appendChild(disabled);
    });
    const cursorRoles = await page.evaluate(() => ({
      defaultCursor: getComputedStyle(document.body).cursor,
      pointerCursor: getComputedStyle(document.getElementById('qaCursorBusy')).cursor,
      textCursor: getComputedStyle(document.getElementById('qaCursorText')).cursor,
      disabledCursor: getComputedStyle(document.getElementById('qaCursorDisabled')).cursor
    }));
    await page.locator('#qaCursorBusy').evaluate(button => button.classList.add('is-loading'));
    await page.mouse.move(60, 80);
    await page.waitForTimeout(120);
    const cursorLoading = await page.evaluate(() => ({
      targetCursor: getComputedStyle(document.getElementById('qaCursorBusy')).cursor
    }));
    await page.screenshot({ path: path.join(out, '03b-cursor-loading.png') });
    await page.evaluate(() => ['qaCursorBusy', 'qaCursorText', 'qaCursorDisabled'].forEach(id => document.getElementById(id)?.remove()));
    await page.evaluate(() => {
      renderPresence([{
        user_id: 'qa-remote-director',
        display_name: 'Cammy Hogg',
        workspace: 'table',
        module: 'table-scroll',
        cursor_x: 0.42,
        cursor_y: 0.28,
        cursor_visible: true,
        color: '#F20AAE',
        status: 'online'
      }]);
    });
    await page.waitForTimeout(160);
    const presenceUi = await page.evaluate(() => {
      const avatar = document.querySelector('#presenceCluster .presence-avatar');
      const cursor = document.querySelector('.remote-presence-cursor.is-visible');
      const cursorBox = cursor?.getBoundingClientRect();
      const host = document.getElementById('tableScrollWrap');
      const workspaceBox = host?.getBoundingClientRect();
      const layerBox = cursor?.parentElement?.getBoundingClientRect();
      const cursorStyle = cursor ? getComputedStyle(cursor) : null;
      return {
        avatarVisible: Boolean(avatar && getComputedStyle(avatar).display !== 'none'),
        cursorVisible: Boolean(cursor && cursorStyle?.opacity === '1' && cursorStyle?.visibility === 'visible'),
        label: cursor?.querySelector('span')?.textContent || '',
        color: cursor?.style.getPropertyValue('--presence-color') || '',
        cursorPoint: cursorBox ? [Math.round(cursorBox.left), Math.round(cursorBox.top)] : null,
        expectedPoint: workspaceBox && layerBox ? [Math.round(layerBox.left + Math.max(workspaceBox.width, host.scrollWidth) * 0.42 - host.scrollLeft), Math.round(layerBox.top + Math.max(workspaceBox.height, host.scrollHeight) * 0.28 - host.scrollTop)] : null,
        hostMetrics: host ? {left:workspaceBox.left,layerLeft:layerBox?.left,scrollWidth:host.scrollWidth,clientWidth:host.clientWidth,scrollLeft:host.scrollLeft} : null,
        cursorTransform: cursor?.style.transform || '',
        layerTransform: cursor?.parentElement?.style.transform || '',
        opacity: cursorStyle?.opacity || '',
        visibility: cursorStyle?.visibility || '',
        openDialogs: document.querySelectorAll('dialog[open]').length
      };
    });
    if (presenceUi.cursorPoint) {
      await page.screenshot({ path: path.join(out, '03c-collaboration-presence-detail.png'), clip: { x: Math.max(0, presenceUi.cursorPoint[0] - 12), y: Math.max(0, presenceUi.cursorPoint[1] - 12), width: 190, height: 82 } });
    }
    await page.screenshot({ path: path.join(out, '03c-collaboration-presence.png') });
    await page.evaluate(() => renderPresence([]));

    await page.setViewportSize({ width: 1024, height: 900 });
    const tablet = await layoutSnapshot(page, '04-table-1024');
    await page.setViewportSize({ width: 768, height: 1024 });
    const narrowTablet = await layoutSnapshot(page, '05-table-768');
    await page.setViewportSize({ width: 375, height: 812 });
    const mobile = await layoutSnapshot(page, '06-table-375');
    const dialogAuditMobile = await auditDialogContainment(page, dialogIds, '06a-dialog-375', 'proConfigModal');

    const csvRows = Array.from({ length: 15 }, (_, index) => {
      const number = String(index + 6).padStart(3, '0');
      return `${number},窄屏导入镜头 ${number},用于构造分享长页并验证滚动,回归旁白 ${number},3,LIVE`;
    });
    const csv = Buffer.from(`镜号,标题,画面描述,旁白,时长,制作方式,制片批次\n${csvRows.map(row => `${row},回归批次`).join('\n')}\n`, 'utf8');
    await page.locator('#importFileInput').setInputFiles({ name: 'uiux-long-page.csv', mimeType: 'text/csv', buffer: csv });
    await page.waitForSelector('#importModal[open] .import-mapping-grid');
    await page.locator('#importCustomColumns [data-add-import-custom]').filter({hasText:'制片批次'}).click();
    const customImportColumnCount = await page.locator('#importCustomColumns .import-custom-column').count();
    const importFooter = await page.locator('#importModal .dialog-foot').evaluate(footer => {
      const visible = element => {
        const style = getComputedStyle(element);
        const box = element.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && box.width > 0 && box.height > 0;
      };
      const footerBox = footer.getBoundingClientRect();
      const buttons = [...footer.querySelectorAll('button')].filter(visible).map(button => {
        const box = button.getBoundingClientRect();
        return {
          id: button.id || button.textContent.trim(),
          inViewport: box.top >= 0 && box.left >= 0 && box.bottom <= window.innerHeight + 1 && box.right <= window.innerWidth + 1
        };
      });
      return {
        footerInViewport: footerBox.top >= 0 && footerBox.left >= 0 && footerBox.bottom <= window.innerHeight + 1 && footerBox.right <= window.innerWidth + 1,
        buttons,
        buttonsVisible: buttons.length > 0 && buttons.every(button => button.inViewport)
      };
    });
    await page.screenshot({ path: path.join(out, '07-import-modal-375.png'), fullPage: true });
    await page.locator('#importNextBtn').click();
    const importCommitResponse = page.waitForResponse(response => response.url().includes('/import-commit') && response.request().method() === 'POST');
    await page.locator('#commitImportBtn').click();
    const importResult = await (await importCommitResponse).json();
    await page.waitForSelector('#finishImportBtn:not(.hidden)');
    await page.locator('#finishImportBtn').click();

    await page.setViewportSize({ width: 1440, height: 1000 });
    let largeImportResult = null;
    if (largeXlsxPath && fs.existsSync(largeXlsxPath)) {
      page.setDefaultTimeout(180000);
      await page.locator('#importFileInput').setInputFiles(largeXlsxPath);
      await page.waitForSelector('#importModal[open] .import-mapping-grid');
      const largePreviewImageCount = await page.locator('#importPreviewTable .import-preview-images img').count();
      if (largePreviewImageCount < 1) throw new Error('Large XLSX preview did not render embedded images');
      const previewImage = page.locator('#importPreviewTable .import-preview-images img').first();
      await previewImage.scrollIntoViewIfNeeded();
      await page.waitForTimeout(900);
      const largePreviewImageInfo = await previewImage.evaluate(image => ({ complete: image.complete, naturalWidth: image.naturalWidth, src: image.currentSrc || image.src }));
      const largePreviewImageLoaded = largePreviewImageInfo.complete && largePreviewImageInfo.naturalWidth > 0;
      if (!largePreviewImageLoaded) throw new Error(`Large XLSX preview image did not load: ${JSON.stringify(largePreviewImageInfo)}`);
      await page.locator('input[name="importMode"][value="replace"]').check();
      await page.locator('#importNextBtn').click();
      const commitRequest = page.waitForRequest(request => request.url().includes('/import-commit') && request.method() === 'POST');
      const commitResponse = page.waitForResponse(response => response.url().includes('/import-commit') && response.request().method() === 'POST');
      await page.locator('#commitImportBtn').click();
      await page.waitForSelector('#confirmActionModal[open]');
      await page.locator('#confirmActionForm button[type="submit"]').click();
      const request = await commitRequest;
      const response = await commitResponse;
      const result = await response.json();
      largeImportResult = {
        requestBytes: request.postDataBuffer()?.length || 0,
        imported: result.imported,
        imagesImported: result.images_imported,
        beforeCount: result.before_count,
        afterCount: result.after_count,
        mode: result.mode,
        previewImageCount: largePreviewImageCount,
        previewImageLoaded: largePreviewImageLoaded
      };
      if (largeImportResult.requestBytes > 256 * 1024) throw new Error(`Large XLSX commit body regressed to ${largeImportResult.requestBytes} bytes`);
      if (result.mode !== 'replace' || result.after_count !== result.imported || result.images_imported < 1) throw new Error(`Large XLSX replace verification failed: ${JSON.stringify(largeImportResult)}`);
      await page.waitForSelector('#finishImportBtn:not(.hidden)');
      await page.locator('#finishImportBtn').click();
      await page.waitForSelector('#mainShotTable .shot-thumb img');
      page.setDefaultTimeout(12000);
    }
    await page.locator('#mainShotTable th[data-column="description"]').click({ button: 'right' });
    await page.waitForSelector('#tableContextMenu:not(.hidden) [data-context-action="column-autofit"]');
    await page.waitForTimeout(180);
    await page.screenshot({ path: path.join(out, '08a-column-context-menu.png') });
    const headerContextMenu = await page.locator('#tableContextMenu').innerText();
    await page.locator('[data-context-action="column-add-custom"]').click();
    await page.waitForSelector('#customFieldsModal[open]');
    await page.screenshot({ path: path.join(out, '08aa-custom-fields-dialog.png') });
    await page.locator('[data-close="customFieldsModal"]').first().click();
    await page.locator('[data-frameforge-column-manager-trigger="canonical"]').click();
    await page.waitForSelector('#columnSettingsPopover:not(.hidden)');
    const columnSettingsPosition = await page.locator('#columnSettingsPopover').evaluate(element => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, inViewport: rect.left >= 8 && rect.top >= 8 && rect.right <= innerWidth - 8 && rect.bottom <= innerHeight - 8 };
    });
    if (!columnSettingsPosition.inViewport) throw new Error(`column settings popover out of viewport: ${JSON.stringify(columnSettingsPosition)}`);
    await page.screenshot({ path: path.join(out, '08-column-settings-keyboard.png'), fullPage: true });
    await page.keyboard.press('Escape');
    const popoverClosedByEscape = await page.locator('#columnSettingsPopover').evaluate(element => element.classList.contains('hidden'));
    await page.locator('#mainShotTable tbody tr[data-id]').first().click({ button: 'right' });
    await page.waitForSelector('#tableContextMenu:not(.hidden) [data-context-action="row-insert-before"]');
    const rowContextMenu = await page.locator('#tableContextMenu').innerText();
    await page.locator('[data-context-action="row-insert-before"]').click();
    await page.waitForSelector('#insertShotModal[open]');
    await page.screenshot({ path: path.join(out, '08b-insert-shot-dialog.png'), fullPage: true });
    const insertDialogStyled = await page.locator('#insertShotModal').evaluate(dialog => {
      const radios = [...dialog.querySelectorAll('input[type=radio]')];
      const cards = [...dialog.querySelectorAll('.insert-position-options label')];
      return radios.every(input => getComputedStyle(input).opacity === '0') && cards.every(card => card.getBoundingClientRect().height >= 50);
    });
    await page.locator('[data-close="insertShotModal"]').first().click();
    await page.locator('#mainShotTable th[data-column="description"]').focus();
    await page.keyboard.press('Shift+F10');
    await page.waitForSelector('#tableContextMenu:not(.hidden) [data-context-action="column-autofit"]');
    const keyboardContextMenu = await page.locator('#tableContextMenu').evaluate(menu => document.activeElement?.getAttribute('role') === 'menuitem' && !menu.classList.contains('hidden'));
    await page.keyboard.press('Escape');

    const resizeHeader = page.locator('#mainShotTable th[data-column="description"]');
    await resizeHeader.scrollIntoViewIfNeeded();
    const resizeBefore = await resizeHeader.evaluate(header => header.getBoundingClientRect().width);
    const resizeHandleBox = await resizeHeader.locator('.column-resize-handle').boundingBox();
    await page.mouse.move(resizeHandleBox.x + resizeHandleBox.width / 2, resizeHandleBox.y + resizeHandleBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(resizeHandleBox.x + resizeHandleBox.width / 2 + 82, resizeHandleBox.y + resizeHandleBox.height / 2, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(120);
    const resizeAfter = await resizeHeader.evaluate(header => header.getBoundingClientRect().width);
    const resizeArtifacts = await page.locator('.column-resize-guide, .column-resize-hud').count();
    const columnResizeResponsive = resizeAfter >= resizeBefore + 60 && resizeArtifacts === 0;

    let presetCell = page.locator('#mainShotTable tbody tr[data-id] td[data-field="shot_size"]').first();
    await presetCell.click();
    await page.waitForSelector('.shot-preset-popover');
    const presetOptionCount = await page.locator('.shot-preset-popover [data-preset-value]').count();
    await page.locator('.shot-preset-popover [data-preset-value="特写"]').click();
    presetCell = page.locator('#mainShotTable tbody tr[data-id] td[data-field="shot_size"]').first();
    const presetSingleValue = (await presetCell.innerText()).trim();
    await presetCell.click();
    await page.fill('.shot-preset-popover input[name="customValue"]', '超广角建立镜头');
    await page.locator('.shot-preset-popover .preset-custom-form button[type="submit"]').click();
    presetCell = page.locator('#mainShotTable tbody tr[data-id] td[data-field="shot_size"]').first();
    const presetCustomValue = (await presetCell.innerText()).trim();
    const presetSingleAndCustom = presetOptionCount >= 8 && presetSingleValue.includes('特写') && presetCustomValue.includes('超广角建立镜头');

    await page.evaluate(() => {
      // This visual fixture starts with empty shots; timing is only available
      // when the selected shot actually has narration.
      state.bundle.shots[0].voiceover = '用于单镜自动计时的隔离验收旁白。';
      renderCurrentView();
    });
    const narratedRow = page.locator('#mainShotTable tbody tr[data-id]').first();
    await narratedRow.click({ button: 'right' });
    await page.waitForSelector('#tableContextMenu:not(.hidden) [data-context-action="row-auto-timing"]');
    const singleTimingMenuItem = page.locator('#tableContextMenu [data-context-action="row-auto-timing"]');
    const singleTimingEnabled = !(await singleTimingMenuItem.isDisabled());
    await singleTimingMenuItem.click();
    await page.waitForSelector('#timingModal[open]');
    const singleTimingSegments = await page.locator('#timingWorkspace .timing-segment-row').count();
    await page.locator('#timingModal [data-close="timingModal"]').first().click();
    const singleTimingInContextMenu = singleTimingEnabled && singleTimingSegments > 0;

    const reviewShotId = await page.evaluate(() => state.selection.activeShotId);
    await page.evaluate(() => { const review = document.getElementById('reviewContainer'); review.dataset.reviewTab = 'versions'; navigateToView(VIEW.REVIEW); });
    await page.waitForSelector('#createVersionBtn');
    const versionResponse = page.waitForResponse(response => response.url().includes(`/api/shots/${reviewShotId}/versions`) && response.request().method() === 'POST');
    await page.locator('#createVersionBtn').click();
    await versionResponse;
    await page.waitForSelector('.version-item');
    await page.evaluate(async shotId => {
      const shot = state.bundle.shots.find(item => item.id === shotId);
      shot.description = `${shot.description || ''}\nAFTER QA 审阅修改`;
      markDirty();
      await saveProject();
      document.getElementById('reviewContainer').dataset.reviewTab = 'comments';
      renderReviewView();
    }, reviewShotId);
    await page.fill('#commentForm textarea[name="text"]', 'QA 悬浮批注：调整画面节奏');
    const commentResponse = page.waitForResponse(response => response.url().includes(`/api/shots/${reviewShotId}/comments`) && response.request().method() === 'POST');
    await page.locator('#commentForm button[type="submit"]').click();
    await commentResponse;
    await page.waitForSelector('.review-viewer .word-comment-pin');
    const reviewCommentPin = page.locator('.review-viewer .word-comment-pin').last();
    await reviewCommentPin.hover();
    await page.waitForTimeout(180);
    const hoverCommentVisible = await reviewCommentPin.locator('.word-comment-tooltip').evaluate(tooltip => getComputedStyle(tooltip).visibility === 'visible' && Number(getComputedStyle(tooltip).opacity) > .9);
    await page.locator('[data-review-tab="compare"]').click();
    await page.waitForSelector('.review-before-after');
    const wordReviewMarks = await page.locator('.word-review-copy del, .word-review-copy ins').count();
    const beforeAfterReview = wordReviewMarks >= 2 && await page.locator('.review-version-pane.is-before').isVisible() && await page.locator('.review-version-pane.is-after').isVisible();
    await page.screenshot({ path: path.join(out, '08c-word-review-before-after.png'), fullPage: true });
    await page.evaluate(shotId => { navigateToView(VIEW.TABLE); selectShot(shotId, {openInspector:true}); }, reviewShotId);
    await page.waitForSelector('.inspector-version-compare');
    const inspectorReviewSummary = await page.locator('.inspector-version-compare').isVisible() && await page.locator('.inspector-review-section .word-comment-pin').count() > 0;

    await page.locator('#mainShotTable tbody tr[data-id]').nth(1).evaluate(row => row.scrollIntoView({block:'center',inline:'nearest'}));
    await page.locator('#tableScrollWrap').evaluate(host => { host.scrollLeft = 0; host.dispatchEvent(new Event('scroll')); });
    const beforeReorder = await page.locator('#mainShotTable tbody tr[data-id]').evaluateAll(rows => rows.slice(0, 2).map(row => row.dataset.id));
    const targetRowBox = await page.locator('#mainShotTable tbody tr[data-id]').nth(1).boundingBox();
    const reorderHandle = await page.locator('#mainShotTable tbody tr[data-id]').first().locator('[data-shot-drag-handle]').boundingBox();
    await page.mouse.move(reorderHandle.x + reorderHandle.width / 2, reorderHandle.y + reorderHandle.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(120);
    await page.mouse.move(targetRowBox.x + 64, targetRowBox.y + targetRowBox.height - 3, {steps:10});
    const duringReorder = await page.evaluate(({x,y}) => ({
      hit:document.elementFromPoint(x,y)?.outerHTML.slice(0,220),
      reordering:document.body.classList.contains('is-reordering'),
      target:document.querySelector('#mainShotTable tbody tr[data-id]:nth-child(2)')?.className
    }),{x:targetRowBox.x+64,y:targetRowBox.y+targetRowBox.height-3});
    await page.mouse.up();
    try {
      await page.waitForFunction(firstId => document.querySelector('#mainShotTable tbody tr[data-id]')?.dataset.id !== firstId, beforeReorder[0], {timeout:4000});
    } catch (error) {
      const diagnostics = await page.evaluate(() => ({
        sort:state.tablePrefs.sort, dirty:state.dirty, saveInFlight:state.saveInFlight,
        selected:[...state.selection.selectedShotIds],
        order:[...document.querySelectorAll('#mainShotTable tbody tr[data-id]')].slice(0,3).map(row=>row.dataset.id),
        indicators:document.querySelectorAll('.drop-before,.drop-after,.is-reordering').length,
        toast:document.querySelector('.toast')?.textContent
      }));
      throw new Error(`${error.message}; during=${JSON.stringify(duringReorder)}; reorder=${JSON.stringify(diagnostics)}`);
    }
    const afterReorder = await page.locator('#mainShotTable tbody tr[data-id]').evaluateAll(rows => rows.slice(0, 2).map(row => row.dataset.id));
    const shotReorderWorks = beforeReorder.length === 2 && afterReorder[0] === beforeReorder[1] && afterReorder[1] === beforeReorder[0];

    const crossViewMenus = {};
    for (const [view, selector] of [['cards', '.shot-card[data-context-shot-id]'], ['wall', '.wall-item[data-context-shot-id]'], ['timeline', '.timeline-clip[data-context-shot-id]']]) {
      await page.locator(`[data-view="${view}"]`).click();
      await page.waitForSelector(selector);
      await page.locator(selector).first().click({ button: 'right' });
      await page.waitForSelector('#tableContextMenu:not(.hidden) [data-context-action="row-duplicate"]');
      crossViewMenus[view] = (await page.locator('#tableContextMenu').innerText()).includes('删除此镜头');
      await page.locator('#tableContextMenu [data-context-action]').first().focus();
      await page.keyboard.press('Escape');
    }

    await page.locator('#projectShareBtn').click();
    await page.locator('#genShareBtn').click();
    await page.waitForSelector('#shareUrlInput');
    const shareUrl = await page.locator('#shareUrlInput').inputValue();
    const share = await browser.newPage({ viewport: { width: 1440, height: 700 } });
    share.setDefaultTimeout(12000);
    share.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    share.on('requestfailed', request => failedRequests.push(`${request.method()} ${request.url()} ${request.failure()?.errorText}`));
    await share.goto(new URL(shareUrl, base).href, { waitUntil: 'networkidle' });
    await share.waitForSelector('#shareCardsGrid .shot-card');
    await share.screenshot({ path: path.join(out, '09-share-long-page-1440.png'), fullPage: true });
    const shareLongPage = await share.evaluate(async () => {
      const scrollingElement = document.scrollingElement;
      const initialTop = scrollingElement.scrollTop;
      const maxScrollTop = scrollingElement.scrollHeight - scrollingElement.clientHeight;
      window.scrollTo(0, maxScrollTop);
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return {
        cardCount: document.querySelectorAll('#shareCardsGrid .shot-card').length,
        pagination: document.querySelector('#sharePagination')?.textContent || '',
        clientHeight: scrollingElement.clientHeight,
        scrollHeight: scrollingElement.scrollHeight,
        maxScrollTop,
        finalTop: scrollingElement.scrollTop,
        scrollable: maxScrollTop > 0 && scrollingElement.scrollTop > initialTop
      };
    });
    await share.screenshot({ path: path.join(out, '10-share-long-page-bottom-1440.png') });
    await share.close();
    await page.locator('[data-close=shareDialogModal]').click();

    const narrowButtonOverlaps = [narrowTablet, mobile].flatMap(view => [
      ...view.topbarOverlaps,
      ...view.actionOverlaps,
      ...view.toolbarOverlaps
    ]);
    const regression = {
      shareLongPageScrollable: importResult.imported === csvRows.length && shareLongPage.cardCount === 9 && /第 1 \/ 3 页/.test(shareLongPage.pagination) && shareLongPage.scrollable,
      importFooterButtonsVisible: importFooter.footerInViewport && importFooter.buttonsVisible,
      narrowButtonsDoNotOverlap: narrowButtonOverlaps.length === 0,
      registerDialogFits: registerDialog.inViewport && registerDialog.controls.every(control => control.inViewport && control.width > 200 && control.height >= 36),
      customImportColumnVisible: customImportColumnCount === 1,
      contextMenusAvailable: headerContextMenu.includes('按内容自动列宽') && rowContextMenu.includes('删除此镜头'),
      shotReorderWorks,
      crossViewContextMenus: Object.values(crossViewMenus).every(Boolean),
      columnResizeResponsive,
      presetSingleAndCustom,
      singleTimingInContextMenu,
      beforeAfterReview,
      hoverCommentVisible,
      inspectorReviewSummary,
      insertDialogStyled,
      keyboardContextMenu
      ,imageLoadingFeedbackVisible,
      dialogContainment: [...dialogAuditDesktop, ...dialogAuditMobile].every(item => item.dialogWithinViewport && item.cardWithinViewport && !item.dialogOverflowX && !item.cardOverflowX),
      notionCursorRoles: cursorRoles.defaultCursor.includes('/cursors/default.svg')
        && cursorRoles.pointerCursor.includes('/cursors/pointer.svg')
        && cursorRoles.textCursor.includes('/cursors/text.svg')
        && cursorRoles.disabledCursor.includes('/cursors/not-allowed.svg'),
      customBusyCursor: cursorLoading.targetCursor.includes('/cursors/loading.svg'),
      figmaPresenceUi: presenceUi.avatarVisible
        && presenceUi.cursorVisible
        && presenceUi.label === 'Cammy Hogg'
        && presenceUi.color === '#F20AAE'
        && presenceUi.cursorPoint?.every((value, index) => Math.abs(value - presenceUi.expectedPoint[index]) <= 2),
    };
    if (largeXlsxPath) regression.largeXlsxStagedReplace = Boolean(largeImportResult && largeImportResult.requestBytes < 256 * 1024 && largeImportResult.mode === 'replace' && largeImportResult.afterCount === largeImportResult.imported && largeImportResult.previewImageCount > 0 && largeImportResult.previewImageLoaded);
    const regressionFailures = Object.entries(regression).filter(([, passed]) => !passed).map(([name]) => name);
    const report = {
      stage,
      errors,
      failedRequests,
      popoverClosedByEscape,
      regression,
      regressionFailures,
      importResult: { imported: importResult.imported, expected: csvRows.length },
      largeImportResult,
      importFooter,
      dialogAuditDesktop,
      dialogAuditMobile,
      cursorRoles,
      cursorLoading,
      presenceUi,
      reviewQa: { reviewShotId, wordReviewMarks, hoverCommentVisible, beforeAfterReview, inspectorReviewSummary },
      columnResize: { before: resizeBefore, after: resizeAfter, artifacts: resizeArtifacts },
      presetQa: { optionCount: presetOptionCount, single: presetSingleValue, custom: presetCustomValue },
      singleTimingQa: { enabled: singleTimingEnabled, segments: singleTimingSegments },
      shotReorder: { beforeReorder, afterReorder },
      crossViewMenus,
      shareLongPage,
      narrowButtonOverlaps,
      login,
      dashboard,
      desktop,
      tablet,
      narrowTablet,
      mobile
    };
    fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    if (regressionFailures.length) throw new Error(`UIUX regression assertions failed: ${regressionFailures.join(', ')}`);
    if (process.env.STRICT_UIUX === '1') {
      const views = [login, dashboard, desktop, tablet, narrowTablet, mobile];
      const badLayout = views.some(view => view.documentOverflowX || view.toolbarOverlaps.length || view.actionOverlaps.length || view.topbarOverlaps.length || view.headerOverlaps.length || view.unnamedButtons);
      const badIcons = views.some(view => view.iconOffsets.some(icon => Math.abs(icon.dx) > 1.5 || Math.abs(icon.dy) > 1.5));
      if (errors.length || failedRequests.length || badLayout || badIcons || !popoverClosedByEscape || !desktop.skipLink) process.exitCode = 1;
    }
  } finally {
    await browser?.close();
    server.kill();
  }
})().catch(error => { console.error(error); process.exit(2); });
