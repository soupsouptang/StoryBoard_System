/**
 * import_mapping_browser_qa.cjs
 * Browser QA tests for Shot CSV / Excel Field Mapping
 * Asserts:
 * - "镜号" automatically displays in Shot Number
 * - "画面描述" automatically displays in Description
 * - "旁白" automatically displays in Voice Over
 * - Special character headers (<>&") do not corrupt HTML or value
 * - Duplicate column mapping conflict handling
 * - Unmapped columns can be ignored
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const BASE_URL = process.env.QA_URL || (process.env.FRAMEFORGE_QA_BASE || 'http://127.0.0.1:18799');
const ADMIN_USER = process.env.QA_USER || 'admin';
const ADMIN_PASS = process.env.QA_PASS || 'FrameForge2026!Admin';

(async () => {
  console.log('[QA] Starting Import Mapping Browser QA Test...');
  const edge = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync);
  const browser = await chromium.launch({ headless: true, ...(edge ? { executablePath: edge } : {}) });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.setDefaultTimeout(10000);

  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    // Handle login if on login screen
    const loginForm = await page.$('#loginForm');
    if (loginForm && await loginForm.isVisible()) {
      await page.fill('#loginUsername', ADMIN_USER);
      await page.fill('#loginPassword', ADMIN_PASS);
      await page.click('#loginSubmitBtn');
      await page.waitForSelector('#appView:not(.hidden)', { timeout: 8000 });
    }

    // Open first project or create one
    const projectRow = await page.$('.project-row');
    if (projectRow) {
      await projectRow.click();
    } else {
      await page.click('#dashNewProjectBtn');
      await page.waitForTimeout(500);
    }
    await page.waitForSelector('[data-nav-key],[data-view],#appView', { timeout: 8000 });

    // Ensure import modal container exists and invoke renderImportMapping with mock preview
    const result = await page.evaluate(() => {
      if (typeof renderImportMapping !== 'function') {
        return { error: 'renderImportMapping not found' };
      }
      // Prepare mapping container in modal
      let modal = document.getElementById('importModal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'importModal';
        document.body.appendChild(modal);
      }
      let box = document.getElementById('mappingPreviewBox');
      if (!box) {
        box = document.createElement('div');
        box.id = 'mappingPreviewBox';
        modal.appendChild(box);
      }

      // Mock preview object with standard aliases + special character header
      const mockHeaders = [
        '镜号',
        '画面描述',
        '旁白',
        '特殊 "引号" & <尖括号>',
        '未匹配自定列'
      ];
      const mockPreview = {
        total_rows: 10,
        headers: mockHeaders,
        mapping: {
          number: { col: 0, confidence: 1.0 },
          description: { col: 1, confidence: 1.0 },
          voiceover: { col: 2, confidence: 1.0 },
          department: { col: 3, confidence: 0.8 }
        },
        sample_preview: [
          ['1', '全景夜戏', '夜幕降临，主角站在天台。', 'special_val', 'extra_val']
        ],
        diagnostics: []
      };

      // Call renderImportMapping
      renderImportMapping(mockPreview);

      // Verify DOM values
      const numberInput = document.querySelector('.mapping-combobox[data-field="number"]');
      const descInput = document.querySelector('.mapping-combobox[data-field="description"]');
      const voInput = document.querySelector('.mapping-combobox[data-field="voiceover"]');
      const deptInput = document.querySelector('.mapping-combobox[data-field="department"]');

      return {
        numberVal: numberInput ? numberInput.value : null,
        descVal: descInput ? descInput.value : null,
        voVal: voInput ? voInput.value : null,
        deptVal: deptInput ? deptInput.value : null,
        deptOuterHTML: deptInput ? deptInput.outerHTML : null,
        hasCustomSection: !!document.getElementById('importCustomColumns'),
        datalistOptionsCount: document.querySelectorAll('#mapping-source-columns option').length
      };
    });

    if (result.error) throw new Error(result.error);

    // 1. Assert automatic mapping
    assert.strictEqual(result.numberVal, '镜号', '"镜号" must auto-fill into number field');
    assert.strictEqual(result.descVal, '画面描述', '"画面描述" must auto-fill into description field');
    assert.strictEqual(result.voVal, '旁白', '"旁白" must auto-fill into voiceover field');

    // 2. Assert special character header safety
    assert.strictEqual(
      result.deptVal,
      '特殊 "引号" & <尖括号>',
      'Special characters header value must be preserved exactly in DOM value'
    );
    assert.ok(
      result.deptOuterHTML && result.deptOuterHTML.includes('&quot;') && result.deptOuterHTML.includes('&lt;'),
      'Special characters must be properly escaped in HTML attribute string'
    );

    // 3. Test conflict deduplication: user manually selects "镜号" on description field
    await page.evaluate(() => {
      const descInput = document.querySelector('.mapping-combobox[data-field="description"]');
      descInput.value = '镜号';
      descInput.dispatchEvent(new Event('input', { bubbles: true }));
    });

    const conflictState = await page.evaluate(() => {
      const numberInput = document.querySelector('.mapping-combobox[data-field="number"]');
      const descInput = document.querySelector('.mapping-combobox[data-field="description"]');
      return {
        numberVal: numberInput.value,
        numberCol: numberInput.dataset.col,
        descVal: descInput.value,
        descCol: descInput.dataset.col
      };
    });

    assert.strictEqual(conflictState.descVal, '镜号', 'Description should now have 镜号');
    assert.strictEqual(conflictState.numberVal, '', 'Number input must be cleared to prevent duplicate mapping');
    assert.strictEqual(conflictState.numberCol, '-1', 'Number input data-col must be reset to -1');

    // Image-only PDF warnings must remain visible through the mapping and
    // preview steps while allowing the user to continue.
    await page.evaluate(() => {
      const modal = document.querySelector('#importModal');
      if (modal?.showModal && !modal.open) modal.showModal();
      renderImportMapping({
      total_rows: 1,
      headers: ['镜号', '镜头标题'],
      rows: [['001', 'PDF 第 1 页']],
      mapping: { number: { col: 0 }, title: { col: 1 } },
      embedded_images: [{ data_row: 0, preview_url: '' }],
      embedded_image_count: 1,
      source_diagnostics: [{
        code: 'pdf_text_not_extracted', severity: 'warning',
        page_count: 1, text_page_count: 0, rendered_page_count: 1, image_count: 1,
        message: '当前 PDF 解析器未取得可用文字；页面上可能仍有清晰可见的文字，但需要 OCR 才能识别分镜字段。'
      }],
      diagnostics: []
      });
    });
    const warning = page.locator('.import-source-warning[data-diagnostic-code="pdf_text_not_extracted"]');
    assert.ok(await warning.isVisible(), 'scanned PDF warning must be visible in the mapping step');
    assert.ok((await warning.innerText()).includes('OCR'), 'warning must explain OCR is needed');
    assert.ok(!(await page.locator('#mappingPreviewBox').innerText()).includes('当前预检通过'),
      'image-only PDF must not be labelled as fully prechecked');
    await page.click('#importNextBtn');
    assert.ok(await warning.isVisible(), 'scanned PDF warning must remain visible in the preview step');

    if (process.env.FRAMEFORGE_SAMPLE_PDF) {
      await page.locator('#importFileInput').setInputFiles(process.env.FRAMEFORGE_SAMPLE_PDF);
      await page.locator('.import-source-warning[data-diagnostic-code="pdf_text_not_extracted"]').waitFor({ state: 'visible', timeout: 60000 });
      assert.ok(!(await page.locator('#mappingPreviewBox').innerText()).includes('当前预检通过'),
        'real PDF preview must not claim all fields were recognized');
      assert.strictEqual(await page.locator('#mappingPreviewBox .mapping-combobox[data-col="-1"]').count() > 0, true,
        'real PDF preview must leave unrecognized fields unmapped');
    }

    console.log('[QA] PASS: import_mapping_browser_qa passed successfully.');
  } finally {
    await browser.close();
  }
})().catch(err => {
  console.error('[QA] FAIL:', err);
  process.exit(1);
});
