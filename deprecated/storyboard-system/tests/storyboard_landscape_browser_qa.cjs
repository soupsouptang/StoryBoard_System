const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const base = process.env.LANDSCAPE_QA_URL;
  const browser = await chromium.launch({headless:true});
  try {
    const context = await browser.newContext({viewport:{width:1440,height:900}});
    await context.addInitScript(() => localStorage.setItem('frameforge-show-qa-projects','1'));
    const login = await context.request.post(`${base}/api/login`, {
      data:{username:'qa-admin',password:'FrameForge2026!QA'}
    });
    assert.equal(login.status(),200);
    const {csrf} = await login.json();
    const created = await context.request.post(`${base}/api/projects`, {
      headers:{'X-CSRF-Token':csrf}, data:{name:'Landscape Export QA'}
    });
    assert.equal(created.status(),201);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(base);
    await page.locator('#projectGrid .project-row').filter({hasText:'Landscape Export QA'}).click();
    await page.locator('#mainShotTable').waitFor();
    const count = await page.locator('#mainShotTable tbody tr[data-id]').count();
    await page.evaluate(() => {
      window.state.bundle.shots[0].description = '港口清晨的第一镜';
      window.state.bundle.shots[0].voiceover = '画面对应旁白';
    });
    await page.locator('#workspaceToolbarV73 button').filter({hasText:/^PDF$/}).first().click();
    const modal = page.locator('#pdfExportModal[open]');
    await modal.waitFor();
    await modal.getByRole('radio',{name:/^分镜表$/}).click();
    const tableReady = page.waitForEvent('popup');
    await page.locator('#openPdfDocumentBtn').click();
    const tablePreview = await tableReady;
    await tablePreview.locator('table tbody tr').first().waitFor();
    assert.equal(await tablePreview.locator('table tbody tr').count(), count);
    assert.match(await tablePreview.locator('table tbody').textContent(), /港口清晨的第一镜/);
    await tablePreview.locator('#printBtn:not([disabled])').waitFor();
    await tablePreview.close();
    await page.locator('#workspaceToolbarV73 button').filter({hasText:/^PDF$/}).first().click();
    await modal.waitFor();
    await modal.getByRole('radio',{name:/横版画面分镜表/}).click();
    assert.equal(await page.locator('#pdfLayoutHiddenInput').inputValue(),'landscape-board');
    assert.equal(await page.locator('#pdfFieldScopeRow').isHidden(),true);
    const popupReady = page.waitForEvent('popup');
    await page.locator('#openPdfDocumentBtn').click();
    const popup = await popupReady;
    await popup.locator('.shot-row').first().waitFor();
    assert.equal(await popup.locator('.shot-row').count(),count);
    assert.equal(await popup.locator('.shot-frame').count(),count);
    assert.equal(await popup.locator('.frame-placeholder').count(),count);
    assert.match(await popup.locator('.shot-row').first().textContent(),/港口清晨的第一镜/);
    assert.match(await popup.locator('.shot-row').first().textContent(),/画面对应旁白/);
    const css = await popup.locator('style').first().textContent();
    assert.match(css,/@page \{ size: A4 landscape/);
    assert.match(css,/aspect-ratio: 16 \/ 9/);
    await popup.locator('#printBtn:not([disabled])').waitFor();
    const artifactDir = path.join(__dirname,'..','qa-artifacts','landscape');
    fs.mkdirSync(artifactDir,{recursive:true});
    await popup.screenshot({path:path.join(artifactDir,'storyboard-preview.png'),fullPage:false});
    const pdf = await popup.pdf({preferCSSPageSize:true,printBackground:true});
    assert.equal(pdf.subarray(0,4).toString(),'%PDF');
    fs.writeFileSync(path.join(artifactDir,'storyboard-preview.pdf'),pdf);
    await popup.close();
    await page.locator('#workspaceToolbarV73 button').filter({hasText:/^PDF$/}).first().click();
    await modal.waitFor();
    const wordDownloadReady = page.waitForEvent('download');
    await page.locator('#downloadWordDocumentBtn').click();
    const wordDownload = await wordDownloadReady;
    assert.match(wordDownload.suggestedFilename(),/\.docx$/);
    const wordPath = path.join(artifactDir,'storyboard-export.docx');
    await wordDownload.saveAs(wordPath);
    const docx = fs.readFileSync(wordPath);
    assert.equal(docx.subarray(0,4).toString('binary'),'PK\x03\x04');
    assert.ok(docx.includes(Buffer.from('word/document.xml')));
    assert.ok(docx.includes(Buffer.from('港口清晨的第一镜')));
    assert.ok(docx.includes(Buffer.from('画面对应旁白')));
    assert.equal(await modal.isVisible(),false);
    const denseHtml = await page.evaluate(() => globalThis.FrameForgeLandscapeExport.build({
      project:{name:'多类别长文本验收'},
      shots:[{id:'dense',number:'999',description:'长文本'.repeat(1500) + ' 末尾验收标记',
        action:'演员向画面右侧移动', voiceover:'旁白', dialogue:'对白', music:'配乐',
        equipment:'摄影机', director_notes:'导演备注'}],
      fields:['description','action','voiceover','dialogue','music','equipment','director_notes']
    }));
    const densePage = await context.newPage();
    await densePage.goto(base);
    await densePage.setContent(denseHtml);
    assert.equal(await densePage.locator('.shot-group').count(),3);
    assert.match(await densePage.locator('.shot-row').textContent(),/末尾验收标记/);
    fs.writeFileSync(path.join(artifactDir,'storyboard-dense.pdf'),
      await densePage.pdf({preferCSSPageSize:true,printBackground:true}));
    await densePage.close();
    await page.setViewportSize({width:320,height:812});
    await page.locator('#workspaceToolbarV73 button').filter({hasText:/^PDF$/}).first().click();
    await modal.waitFor();
    const modalRect = await modal.evaluate(element => element.getBoundingClientRect().toJSON());
    assert.ok(modalRect.width <= 320 && modalRect.left >= 0 && modalRect.right <= 320,
      `landscape export dialog must fit 320px viewport: ${JSON.stringify(modalRect)}`);
    const wordHit = await page.locator('#downloadWordDocumentBtn').evaluate(element => {
      element.scrollIntoView({block:'nearest'});
      const box = element.getBoundingClientRect();
      const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
      return {rect:box.toJSON(), clickable:element.contains(hit), viewport:innerWidth};
    });
    assert.ok(wordHit.clickable && wordHit.rect.left >= 0 && wordHit.rect.right <= wordHit.viewport,
      `Word action must be visible and clickable on narrow viewport: ${JSON.stringify(wordHit)}`);
    await page.screenshot({path:path.join(artifactDir,'storyboard-export-dialog-320.png')});
    await page.setViewportSize({width:374,height:812});
    await page.screenshot({path:path.join(artifactDir,'storyboard-export-dialog-374.png')});
    await modal.getByRole('radio',{name:/横版画面分镜表/}).click();
    assert.equal(await page.locator('#pdfLayoutHiddenInput').inputValue(),'landscape-board');
    assert.deepEqual(errors,[]);
    console.log(`PASS landscape storyboard export preview: ${count} shots, A4 landscape, 16:9 frames`);
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
