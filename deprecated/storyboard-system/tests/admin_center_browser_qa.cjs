const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const base = process.env.ADMIN_CENTER_QA_URL;
const adminUser = process.env.ADMIN_CENTER_QA_USER || 'qa-admin';
const adminPassword = process.env.ADMIN_CENTER_QA_PASSWORD;

async function login(context, username, password) {
  const response = await context.request.post(`${base}/api/login`, { data: { username, password } });
  assert.equal(response.status(), 200, `${username} should be able to log in`);
  return response.json();
}

async function main() {
  assert.ok(base && adminPassword, 'isolated test server credentials are required');
  const browser = await chromium.launch({ headless: true });
  const errors = [];
  try {
    const adminContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await login(adminContext, adminUser, adminPassword);
    const adminPage = await adminContext.newPage();
    adminPage.on('pageerror', error => errors.push(error.message));
    await adminPage.goto(base);
    await adminPage.locator('#userAdminBtn').waitFor({ state: 'visible' });
    assert.equal(await adminPage.locator('#dbBackupBtn').count(), 0, 'legacy standalone backup entry should be removed');

    const username = `admin-center-${randomUUID().slice(0, 8)}`;
    const password = 'AdminCenterQA2026!';
    const registration = await adminContext.request.post(`${base}/api/register`, {
      data: { username, display_name: 'Admin Center QA', password }
    });
    assert.equal(registration.status(), 201, 'registration should create a pending account for the UI flow');

    await adminPage.locator('#userProfileBtn').click();
    await adminPage.locator('#userAdminModal[open]').waitFor();
    await adminPage.getByRole('heading', { name: '账户状态管理' }).waitFor();
    const pendingRow = adminPage.locator('.user-admin-row').filter({ hasText: username });
    await pendingRow.waitFor();
    assert.equal(await pendingRow.getAttribute('data-account-status'), 'PENDING');
    await pendingRow.getByRole('button', { name: '批准' }).click();
    await adminPage.locator('.user-admin-row[data-account-status="ACTIVE"]').filter({ hasText: username }).waitFor();

    const activeRow = adminPage.locator('.user-admin-row[data-account-status="ACTIVE"]').filter({ hasText: username });
    await activeRow.getByRole('button', { name: '停用' }).click();
    await adminPage.locator('#confirmActionModal[open]').getByRole('button', { name: '确认' }).click();
    await adminPage.locator('.user-admin-row[data-account-status="SUSPENDED"]').filter({ hasText: username }).waitFor();
    const suspendedRow = adminPage.locator('.user-admin-row[data-account-status="SUSPENDED"]').filter({ hasText: username });
    await suspendedRow.getByRole('button', { name: '恢复' }).click();
    await adminPage.locator('.user-admin-row[data-account-status="ACTIVE"]').filter({ hasText: username }).waitFor();

    await adminPage.locator('#adminProfileBtn').click();
    await adminPage.locator('#userAdminModal').waitFor({ state: 'hidden' });
    await adminPage.locator('#userProfileModal[open]').waitFor();
    await adminPage.locator('#userProfileModal [data-close="userProfileModal"]').first().click();
    await adminPage.locator('#userProfileModal').waitFor({ state: 'hidden' });

    await adminPage.locator('#userProfileBtn').click();
    await adminPage.locator('#userAdminModal[open]').waitFor();
    const downloadPath = path.join(os.tmpdir(), `frameforge-admin-center-${randomUUID()}.db`);
    try {
      const downloadEvent = adminPage.waitForEvent('download');
      await adminPage.locator('#adminBackupBtn').click();
      const download = await downloadEvent;
      assert.match(download.suggestedFilename(), /^frameforge_backup_\d{8}_\d{6}\.db$/);
      await download.saveAs(downloadPath);
      const backup = await fs.readFile(downloadPath);
      assert.ok(backup.subarray(0, 16).equals(Buffer.from('SQLite format 3\0')), 'admin backup should be a valid SQLite download');
    } finally {
      await fs.rm(downloadPath, { force: true });
    }

    const narrowAdmin = await browser.newContext({ viewport: { width: 374, height: 812 } });
    await login(narrowAdmin, adminUser, adminPassword);
    const narrowAdminPage = await narrowAdmin.newPage();
    await narrowAdminPage.goto(base);
    await narrowAdminPage.locator('#userAdminBtn').waitFor({ state: 'visible' });
    await narrowAdminPage.locator('#userAdminBtn').click();
    const modal = narrowAdminPage.locator('#userAdminModal[open]');
    await modal.waitFor();
    const geometry = await modal.evaluate(el => ({ width: el.getBoundingClientRect().width, viewport: document.documentElement.clientWidth }));
    assert.ok(geometry.width <= geometry.viewport, `admin center must fit a 374px viewport: ${JSON.stringify(geometry)}`);
    assert.equal(await narrowAdminPage.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true,
      'admin center must not create page-level horizontal overflow');

    const normalContext = await browser.newContext({ viewport: { width: 374, height: 812 } });
    await login(normalContext, username, password);
    const normalPage = await normalContext.newPage();
    normalPage.on('pageerror', error => errors.push(error.message));
    await normalPage.goto(base);
    await normalPage.locator('#userProfileBtn').waitFor({ state: 'visible' });
    assert.equal(await normalPage.locator('#userAdminBtn').isVisible(), false, 'ordinary user must not see admin center entry');
    assert.equal(await normalPage.locator('#userProfileBtn').getAttribute('aria-label'), '个人信息与偏好设置', 'ordinary users retain their profile entry');
    await normalPage.locator('#userProfileBtn').click();
    await normalPage.locator('#userProfileModal[open]').waitFor();
    assert.equal(await normalPage.locator('#userAdminModal').isVisible(), false);

    const adminUsersStatus = await normalPage.evaluate(async () => (await fetch('/api/admin/users', { credentials: 'same-origin' })).status);
    const backupStatus = await normalPage.evaluate(async () => (await fetch('/api/admin/backup', { credentials: 'same-origin' })).status);
    assert.equal(adminUsersStatus, 403, 'admin user listing remains backend protected');
    assert.equal(backupStatus, 403, 'database backup remains backend protected');
    assert.equal(await normalPage.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true,
      'ordinary account/profile view must fit a 374px viewport');
    assert.deepEqual(errors, [], 'admin and ordinary account flows should not raise page errors');

    await normalContext.close();
    await narrowAdmin.close();
    await adminContext.close();
    console.log('Admin center browser QA passed: approval, suspend/reactivate, profile, backup, ordinary-user 403s, and 374px layout.');
  } finally {
    await browser.close();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
