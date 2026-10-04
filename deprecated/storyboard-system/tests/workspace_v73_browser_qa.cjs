/* V7.3 smoke/visual QA against a throwaway local database. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {spawn,execFileSync}=require('node:child_process'),{chromium}=require('playwright');
const {build}=require('esbuild');
const root=path.resolve(__dirname,'..'),temp=fs.mkdtempSync(path.join(root,'scratch','v73-qa-'));
const out=process.env.QA_OUTPUT_DIR?path.resolve(process.env.QA_OUTPUT_DIR):path.join(root,'qa-artifacts','v73');fs.mkdirSync(out,{recursive:true});
const python=process.env.QA_PYTHON||'C:/Users/Hatsune/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe';
const base='http://127.0.0.1:18797';
const server=spawn(python,['-u','server.py'],{cwd:root,windowsHide:true,env:{...process.env,PORT:'18797',STORYBOARD_BIND:'127.0.0.1',STORYBOARD_DATA_ROOT:temp,STORYBOARD_ADMIN_USER:'qa-admin',STORYBOARD_ADMIN_PASSWORD:'Isolated-QA-2026!'}});
let browser,logs='';server.stdout.on('data',d=>logs=(logs+d).slice(-5000));server.stderr.on('data',d=>logs=(logs+d).slice(-5000));
(async()=>{
  const sourceOutputs=process.env.QA_WORKSPACE_SOURCE==='1'
    ? (await build({absWorkingDir:root,entryPoints:['src/workspace/index.tsx'],bundle:true,write:false,format:'iife',target:'es2022',minify:true,legalComments:'none',define:{'process.env.NODE_ENV':'"production"'}})).outputFiles
    : null;
  const sourceStylePath=path.join(temp,'workspace-v73.css');
  if(sourceOutputs)execFileSync(process.execPath,[path.join(root,'node_modules','@tailwindcss','cli','dist','index.mjs'),'-i','src/workspace/theme.css','-o',sourceStylePath,'--minify'],{cwd:root,windowsHide:true});
  for(let n=0;n<80;n++){try{if((await fetch(base+'/healthz')).ok)break;}catch(_){}await new Promise(r=>setTimeout(r,150));}
  const edge=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync);
  browser=await chromium.launch({headless:true,...(edge?{executablePath:edge}:{})});
  const page=await browser.newPage({viewport:{width:1440,height:960}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  if(sourceOutputs){
    const script=sourceOutputs.find(file=>!file.path.endsWith('.css'));
    await page.route('**/workspace-v73.js*',route=>route.fulfill({status:200,contentType:'application/javascript',body:script.text}));
    await page.route('**/workspace-v73.css*',route=>route.fulfill({status:200,contentType:'text/css',body:fs.readFileSync(sourceStylePath,'utf8')}));
  }
  const session=await(await page.request.post(base+'/api/login',{data:{username:'qa-admin',password:'Isolated-QA-2026!'}})).json();
  const bundle=await(await page.request.post(base+'/api/projects',{headers:{'X-CSRF-Token':session.csrf},data:{name:'V7.3 visual fixture'}})).json();
  const searchShotTitle='Inspector search result fixture';
  const searchShotResponse=await page.request.post(`${base}/api/projects/${bundle.project.id}/shots`,{headers:{'X-CSRF-Token':session.csrf},data:{title:searchShotTitle}});
  assert.ok(searchShotResponse.ok(),`search fixture shot ${searchShotResponse.status()}`);
  const searchBundle=await searchShotResponse.json();
  const searchShotId=searchBundle.created_shot_id;
  const fixtureMedia=process.env.QA_MEDIA_DIR;
  if(fixtureMedia){
    for(const filename of fs.readdirSync(fixtureMedia).filter(name=>/\.jpg$/i.test(name)).slice(0,12)){
      const uploaded=await page.request.post(`${base}/api/projects/${bundle.project.id}/media?filename=${encodeURIComponent(filename.replace(/^[a-f\d-]{36}_/,''))}`,{headers:{'X-CSRF-Token':session.csrf,'Content-Type':'image/jpeg'},data:fs.readFileSync(path.join(fixtureMedia,filename))});
      assert.ok(uploaded.ok(),`fixture upload ${uploaded.status()}`);
    }
  }
  await page.goto(base);await page.waitForFunction(()=>globalThis.FrameForgeUI?.ready&&typeof state!=='undefined'&&state.session);
  await page.evaluate(id=>openProject(id),bundle.project.id);await page.waitForSelector('#workspaceToolbarV73');
  assert.deepEqual(await page.evaluate(()=>({
    partitions:{selection:!!state.selection,inspector:!!state.inspector,view:!!state.view},
    legacyFields:['activeShotId','selectedShotIds','selectionAnchorShotId','inspectorOpen','currentView'].filter(key=>Object.hasOwn(state,key))
  })),{partitions:{selection:true,inspector:true,view:true},legacyFields:[]},'selection, inspector, and view state use their owned partitions');
  assert.equal(await page.locator('#inspectorSlot').isVisible(),false,'opening a project does not open the inspector');
  const detailToggle=page.locator('#workspaceToolbarV73 .inspector-toggle');
  assert.equal(await detailToggle.getAttribute('aria-pressed'),'false');
  assert.equal((await detailToggle.innerText()).trim(),'详情','detail is one button without a separate on/off label');
  const detailIdleBorder=await detailToggle.evaluate(node=>getComputedStyle(node).borderColor);
  const detailIdleColor=await detailToggle.evaluate(node=>getComputedStyle(node).color);
  await detailToggle.click();
  assert.equal(await detailToggle.getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('#inspectorSlot').isVisible(),true);
  const detailActiveStyle=await detailToggle.evaluate(node=>({border:getComputedStyle(node).borderColor,color:getComputedStyle(node).color}));
  assert.ok(detailActiveStyle.border!==detailIdleBorder||detailActiveStyle.color!==detailIdleColor,'pressed detail button has visible active feedback');
  await page.screenshot({path:path.join(out,'inspector-toggle-on-1440.png')});
  await detailToggle.click();
  assert.equal(await detailToggle.getAttribute('aria-pressed'),'false');
  assert.equal(await page.locator('#inspectorSlot').isVisible(),false);
  await page.locator('.ff73-toolbar-root .ffui-segment').nth(1).click();
  const firstShot=page.locator('.shot-card[data-id]').first();
  if(await firstShot.count()){
    await firstShot.click();
    assert.equal(await page.locator('#inspectorSlot').isVisible(),false,'single card click only selects');
    await firstShot.dblclick();
    assert.equal(await page.locator('#inspectorSlot').isVisible(),true,'double click opens inspector');
    assert.equal(await detailToggle.getAttribute('aria-pressed'),'true','double click lights the same detail button');
    const firstShotNumber=await page.locator('#inspShotNumber').textContent();
    const nextCard=page.locator('.shot-card[data-id]').nth(1),nextCardId=await nextCard.getAttribute('data-id');
    await nextCard.click();
    assert.equal(await page.evaluate(()=>state.selection.activeShotId),nextCardId,'single card click changes selection');
    assert.equal(await page.locator('#inspShotNumber').textContent(),firstShotNumber,'single card click keeps the inspected shot');
    await detailToggle.click();
    assert.equal(await page.locator('#inspShotNumber').textContent(),`SHOT ${await nextCard.locator('.shot-number').textContent().then(value=>value.replace('SHOT ',''))}`,'explicit detail action inspects the newly selected card');
    await page.locator('.ff73-toolbar-root .ffui-segment').nth(3).click();
    assert.equal(await page.locator('#inspectorSlot').isVisible(),false,'switching views closes inspector');
    assert.equal(await detailToggle.getAttribute('aria-pressed'),'false','view switch clears the detail button state');
    const firstClip=page.locator('.timeline-clip[data-id]').first(),nextClip=page.locator('.timeline-clip[data-id]').nth(1);
    await firstClip.dblclick();
    const firstClipNumber=await page.locator('#inspShotNumber').textContent(),nextClipId=await nextClip.getAttribute('data-id');
    await nextClip.click();
    assert.equal(await page.evaluate(()=>state.selection.activeShotId),nextClipId,'single timeline click changes selection');
    assert.equal(await page.locator('#inspShotNumber').textContent(),firstClipNumber,'single timeline click keeps the inspected shot');
    await nextClip.dblclick();
    assert.notEqual(await page.locator('#inspShotNumber').textContent(),firstClipNumber,'timeline double click inspects its shot');
    await page.locator('.ff73-toolbar-root .ffui-segment').nth(1).click();
    const firstCard=page.locator('.shot-card[data-id]').first();
    await firstCard.click();
    assert.equal(await page.locator('#inspectorSlot').isVisible(),false,'selection in cards stays independent from inspector');
  }
  assert.equal(await page.locator('.ff73-toolbar-root').count(),1);
  assert.equal(await page.locator('.ff73-toolbar-root .ffui-segment').count(),4);
  for(const [index,name] of ['表格','卡片','视觉墙','时间线'].entries()){
    const control=page.locator('.ff73-toolbar-root .ffui-segment').nth(index);
    assert.equal(await control.getAttribute('aria-label'),name);await control.click();
    assert.equal(await control.getAttribute('data-state'),'on');
    await page.waitForTimeout(260);
    await page.screenshot({path:path.join(out,`${['table','cards','wall','timeline'][index]}-1440.png`),fullPage:false});
  }
  await page.locator('.ff73-toolbar-root .ffui-segment').first().click();
  await page.waitForTimeout(260);
  const firstTableRow=page.locator('#mainShotTable tbody tr[data-id]').first(),nextTableRow=page.locator('#mainShotTable tbody tr[data-id]').nth(1);
  await firstTableRow.click();
  await detailToggle.click();
  const tableInspectedNumber=await page.locator('#inspShotNumber').textContent();
  const nextTableId=await nextTableRow.getAttribute('data-id');
  await nextTableRow.click();
  assert.equal(await page.evaluate(()=>state.selection.activeShotId),nextTableId,'single table row click changes selection');
  assert.equal(await page.locator('#inspShotNumber').textContent(),tableInspectedNumber,'single table row click keeps the inspected shot');
  const globalSearch=page.locator('#globalSearchInput');
  await globalSearch.fill(searchShotTitle);
  const searchResult=page.locator('.search-result-item').filter({hasText:searchShotTitle}).first();
  await searchResult.waitFor({state:'visible'});
  assert.ok(await searchResult.evaluate(node=>{const r=node.getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return hit===node||node.contains(hit);}), 'search result is hit-testable above the project header');
  await searchResult.click();
  await page.waitForFunction(id=>state.selection.activeShotId===id,searchShotId);
  assert.equal(await page.locator('#inspShotNumber').textContent(),tableInspectedNumber,'single search-result click keeps the inspected shot');
  await detailToggle.click();
  assert.equal(await page.locator('#inspShotNumber').textContent(),`SHOT ${searchBundle.shots.find(shot=>shot.id===searchShotId).number}`,'search result inspector displays the matched shot');
  await page.locator('#inspCloseBtn').click();
  await page.waitForTimeout(200);
  await page.locator('.ff73-toolbar-root .ffui-segment').first().click();
  await page.waitForTimeout(260);
  // Exercise the real portal interaction, not merely the closed toolbar.
  await page.getByRole('button',{name:'筛选',exact:true}).click();
  await page.screenshot({path:path.join(out,'filter-open-debug.png')});
  await page.getByRole('combobox',{name:'制作方式',exact:true}).click();
  const option=page.getByRole('option').first();
  await option.waitFor({state:'visible'});
  const layers=await page.evaluate(()=>({
    header:getComputedStyle(document.querySelector('.shot-table thead')).zIndex,
    popover:getComputedStyle(document.querySelector('.ffui-popover')).zIndex,
    dropdown:getComputedStyle(document.querySelector('.ffui-menu')).zIndex,
    background:getComputedStyle(document.querySelector('.shot-table thead th')).backgroundColor
  }));
  assert.ok(Number(layers.dropdown)>Number(layers.popover)&&Number(layers.popover)>Number(layers.header));
  assert.notEqual(layers.background,'rgba(0, 0, 0, 0)');
  await option.click();
  await page.getByRole('button',{name:'关闭筛选镜头',exact:true}).click();
  await page.evaluate(()=>{globalThis.qaEditorCancelled=false;openRichShotEditor(state.bundle.shots[0],'description').then(()=>globalThis.qaEditorCancelled=true);});
  await page.locator('.rich-editor-surface').waitFor();
  await page.keyboard.press('Escape');
  await page.waitForFunction(()=>globalThis.qaEditorCancelled);
  assert.equal(await page.locator('.rich-editor-dialog').count(),0,'Escape must settle and remove the editor');
  const duration=page.locator('#mainShotTable .editable-cell[data-field="duration_seconds"]').first();
  await duration.dblclick();
  const input=duration.locator('.inline-cell-editor');await input.waitFor();
  await input.press('Escape');
  assert.equal(await duration.locator('.inline-cell-editor').count(),0);
  const metrics=await page.evaluate(()=>({ui:document.body.dataset.uiVersion,overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,header:getComputedStyle(document.querySelector('.global-header')).height,sidebar:getComputedStyle(document.documentElement).getPropertyValue('--sidebar-width').trim(),font:getComputedStyle(document.body).fontFamily,background:getComputedStyle(document.body).backgroundColor}));
  const sidebarWidth=Number.parseFloat(metrics.sidebar);
  assert.deepEqual(metrics.ui,'7.3');assert.equal(metrics.header,'48px');assert.ok(sidebarWidth>=184&&sidebarWidth<=200,`Expected persisted sidebar width in the 184–200px compact range, actual '${metrics.sidebar}'`);assert.match(metrics.font,/Satoshi/);assert.equal(metrics.background,'rgb(0, 0, 0)');assert.ok(metrics.overflow<=1,`desktop page overflow ${metrics.overflow}px`);
  for(const width of [320,374,375,390,768]){
    await page.setViewportSize({width,height:812});await page.waitForTimeout(100);
    if(width===320||width===375){
      await detailToggle.click();
      assert.equal(await detailToggle.getAttribute('aria-pressed'),'true');
      await page.waitForTimeout(320);
      const inspector=page.locator('#inspectorSlot'),close=page.locator('#inspCloseBtn');
      const geometry=await page.evaluate(()=>{
        const inspector=document.querySelector('#inspectorSlot'),close=document.querySelector('#inspCloseBtn'),r=inspector.getBoundingClientRect(),c=close.getBoundingClientRect();
        const hit=document.elementFromPoint(r.left+r.width/2,r.top+Math.min(r.height/2,innerHeight/2));
        const closeHit=document.elementFromPoint(c.left+c.width/2,c.top+c.height/2);
        return{inspector:{left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height,display:getComputedStyle(inspector).display,visibility:getComputedStyle(inspector).visibility,opacity:getComputedStyle(inspector).opacity,transform:getComputedStyle(inspector).transform},hit:!!hit&&(hit===inspector||inspector.contains(hit)),close:{left:c.left,top:c.top,right:c.right,bottom:c.bottom,width:c.width,height:c.height},closeHit:!!closeHit&&(closeHit===close||close.contains(closeHit)),focusedTrigger:document.activeElement===document.querySelector('#workspaceToolbarV73 .inspector-toggle')};
      });
      assert.ok(await inspector.isVisible(),`${width}px inspector is in the accessibility/layout tree`);
      assert.ok(geometry.inspector.left>=0&&geometry.inspector.right<=width+1&&geometry.inspector.top>=0&&geometry.inspector.bottom<=812+1,`${width}px inspector is inside viewport: ${JSON.stringify(geometry)}`);
      assert.ok(geometry.hit,`${width}px inspector center is not occluded: ${JSON.stringify(geometry)}`);
      assert.ok(geometry.close.width>=32&&geometry.close.height>=32&&geometry.closeHit,`${width}px close control is visible and hit-testable: ${JSON.stringify(geometry)}`);
      assert.ok(geometry.focusedTrigger,`${width}px opening detail leaves focus on its trigger: ${JSON.stringify(geometry)}`);
      await page.screenshot({path:path.join(out,`inspector-toggle-on-${width}.png`)});
      await close.focus();await close.press('Enter');
      assert.equal(await inspector.isVisible(),false,`${width}px focused close control closes the inspector`);
      assert.equal(await detailToggle.getAttribute('aria-pressed'),'false');
    }
    const mobileLayout=await page.evaluate(()=>{
      const rect=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return{top:r.top,bottom:r.bottom,height:r.height};};
      return{overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,project:rect('.project-context-header'),collaboration:rect('.project-collaboration-bar'),toolbar:rect('.workspace-toolbar'),toolbarContent:rect('.ff73-toolbar-content'),table:rect('.table-wrap'),thead:rect('.shot-table thead')};
    });
    assert.ok(mobileLayout.overflow<=1,`${width}px page overflow ${mobileLayout.overflow}px`);
    if(width<=375){
      assert.ok(mobileLayout.project.height<=60,`${width}px collaboration controls occupy a second project-header row: ${JSON.stringify(mobileLayout)}`);
      assert.ok(mobileLayout.collaboration.top>=mobileLayout.project.top&&mobileLayout.collaboration.bottom<=mobileLayout.project.bottom,`${width}px collaboration actions escape merged header: ${JSON.stringify(mobileLayout)}`);
    }
    assert.ok(mobileLayout.toolbar.bottom>=mobileLayout.toolbarContent.bottom-1,`${width}px toolbar content escapes shell: ${JSON.stringify(mobileLayout)}`);
    assert.ok(mobileLayout.table.top>=mobileLayout.toolbar.bottom-1,`${width}px table begins before toolbar ends: ${JSON.stringify(mobileLayout)}`);
    if(width<=375){
      const detail=await page.evaluate(()=>{
        const title=document.querySelector('#currentProjName'),actions=document.querySelector('.ff73-toolbar-actions'),table=document.querySelector('.table-wrap'),segments=document.querySelector('.ff73-toolbar-content > .ffui-segmented');
        const th=document.querySelector('.shot-table thead th'),td=document.querySelector('.shot-table tbody tr td');
        return{
          title:{text:title.textContent.trim(),whiteSpace:getComputedStyle(title).whiteSpace,textOverflow:getComputedStyle(title).textOverflow,overflow:getComputedStyle(title).overflow,maxWidth:getComputedStyle(title).maxWidth,scrollWidth:title.scrollWidth,clientWidth:title.clientWidth},
          actionScroll:{scrollWidth:actions.scrollWidth,clientWidth:actions.clientWidth,column:actions.querySelector('.inspector-toggle')?.nextElementSibling?.getBoundingClientRect().toJSON(),primary:actions.querySelector('.ffui-primary')?.getBoundingClientRect().toJSON(),more:actions.querySelector('[aria-label="更多工具"]')?.getBoundingClientRect().toJSON(),hint:getComputedStyle(actions.querySelector('[aria-label="更多工具"]'),'::after').content},
          segmentScroll:{scrollWidth:segments.scrollWidth,clientWidth:segments.clientWidth,overflowX:getComputedStyle(segments).overflowX,labels:[...segments.querySelectorAll('.ffui-segment')].map(button=>{const label=button.querySelector('span');return{text:label.textContent.trim(),whiteSpace:getComputedStyle(label).whiteSpace,lineHeight:parseFloat(getComputedStyle(label).lineHeight),scrollHeight:label.scrollHeight,button:button.getBoundingClientRect().toJSON()};})},
          tableScroll:{scrollWidth:table.scrollWidth,clientWidth:table.clientWidth,headLeft:th.getBoundingClientRect().left,cellLeft:td.getBoundingClientRect().left}
        };
      });
      assert.equal(detail.title.text,'V7.3 visual fixture','mobile project title remains readable');
      assert.equal(detail.title.whiteSpace,'nowrap','mobile project title stays on one line');
      assert.equal(detail.title.textOverflow,'ellipsis','long mobile project title truncates without shifting nearby controls');
      assert.ok(detail.actionScroll.scrollWidth>detail.actionScroll.clientWidth,'mobile action bar exposes horizontal scrolling');
      assert.ok(detail.actionScroll.column.width>=72,`mobile column action keeps its full label slot: ${JSON.stringify(detail.actionScroll.column)}`);
      assert.ok(detail.actionScroll.primary.left>=0&&detail.actionScroll.primary.right<=width,`primary add-shot action remains visible: ${JSON.stringify(detail.actionScroll.primary)}`);
      assert.ok(detail.actionScroll.more.left>=0&&detail.actionScroll.more.right<detail.actionScroll.primary.left+1,`secondary tools menu remains visible beside primary action: ${JSON.stringify(detail.actionScroll)}`);
      assert.ok(detail.actionScroll.primary.left-detail.actionScroll.more.right>=8,`secondary tools label has clear separation from add-shot action: ${JSON.stringify(detail.actionScroll)}`);
      assert.match(detail.actionScroll.hint,/更多工具/,`icon-only actions receive a visible text label: ${JSON.stringify(detail.actionScroll)}`);
      assert.ok(detail.segmentScroll.labels.every(item=>item.whiteSpace==='nowrap'&&item.scrollHeight<=item.lineHeight+1),`mobile view labels stay on one readable line: ${JSON.stringify(detail.segmentScroll)}`);
      if(width===320)assert.equal(detail.segmentScroll.overflowX,'auto','320px view switcher keeps all one-line labels reachable by horizontal swipe');
      assert.ok(detail.tableScroll.scrollWidth>detail.tableScroll.clientWidth,'shot table exposes horizontal scrolling');
      assert.ok(Math.abs(detail.tableScroll.headLeft-detail.tableScroll.cellLeft)<1,'table header and body columns begin on the same x coordinate');
      const sync=await page.evaluate(async()=>{
        const table=document.querySelector('.table-wrap'),actions=document.querySelector('.ff73-toolbar-actions');
        const cells=()=>{const a=document.querySelector('.shot-table thead th').getBoundingClientRect().left,b=document.querySelector('.shot-table tbody tr td').getBoundingClientRect().left;return a-b;};
        const before=cells();table.scrollLeft=120;actions.scrollLeft=actions.scrollWidth;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
        const after=cells(),primary=document.querySelector('.ff73-toolbar-actions .ffui-primary').getBoundingClientRect(),more=document.querySelector('.ff73-toolbar-actions [aria-label="更多工具"]').getBoundingClientRect();
        return{before,after,tableLeft:table.scrollLeft,actionLeft:actions.scrollLeft,primaryLeft:primary.left,primaryRight:primary.right,moreLeft:more.left,moreRight:more.right};
      });
      assert.ok(sync.tableLeft>0&&Math.abs(sync.after-sync.before)<1,`header and cells stay aligned while horizontally scrolling: ${JSON.stringify(sync)}`);
      assert.ok(sync.actionLeft>0&&sync.primaryLeft>=0&&sync.primaryRight<=375&&sync.moreLeft>=0&&sync.moreRight<sync.primaryLeft+1,`scrollable toolbar retains the tools menu and primary action: ${JSON.stringify(sync)}`);
      await page.evaluate(async()=>{document.querySelector('.table-wrap').scrollLeft=0;document.querySelector('.ff73-toolbar-actions').scrollLeft=0;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
      console.log(`${width}px mobile usability`,JSON.stringify({detail,sync}));
    }
    console.log(`${width}px layout`,JSON.stringify(mobileLayout));
    await page.screenshot({path:path.join(out,`table-${width}.png`),fullPage:false});
  }
  await page.setViewportSize({width:1440,height:960});
  for(const theme of ['dark','light']){
    await page.evaluate(value=>document.documentElement.dataset.theme=value,theme);
    for(let index=0;index<4;index++){
      await page.locator('.ff73-toolbar-root .ffui-segment').nth(index).click();
      await page.waitForTimeout(300);
      await page.screenshot({path:path.join(out,`${['table','cards','wall','timeline'][index]}-${theme}-1440.png`)});
    }
    const shell=await page.evaluate(()=>['.global-header','.sidebar','.project-context-header','.workspace-toolbar','.workspace-main'].map(selector=>({selector,color:getComputedStyle(document.querySelector(selector)).backgroundColor})));
    const expected=theme==='dark'?'rgb(0, 0, 0)':'rgb(255, 255, 255)';
    shell.forEach(item=>assert.equal(item.color,expected,`${theme}: ${item.selector} breaks canvas continuity`));
    for(const [label,slug] of [['情绪板','moodboard'],['灯光平面图','lighting'],['素材资产库','assets'],['旁白与对齐','voiceover'],['审片与版本','review'],['交付与导出','exports'],['制作概览','overview']]){
      await page.getByRole('button',{name:label,exact:true}).click();
      if(['moodboard','lighting'].includes(slug)){
        const board=page.locator(`.ff-boards[aria-label="${slug==='lighting'?'灯光平面图编辑器':'情绪板编辑器'}"]`);await board.waitFor();
        await page.waitForFunction(()=>!!creativeBoardsMount);
        await page.waitForFunction(()=>document.querySelector('.ff-boards [data-action="create-board"]')?.disabled===false);
        if(await board.locator('.ff-boards-empty-state').count()){
          await board.getByRole('button',{name:'创建第一张画板',exact:true}).click();
          const tileBtn = board.locator('.ff-boards-tile-card, .ff-boards-asset-grid button').first();
          if(await tileBtn.count()) await tileBtn.click();
          if(slug==='lighting'){
            for(const mode of ['2D','3D']){
              const control=board.getByRole('button',{name:mode,exact:true}); await control.click();
              assert.equal(await control.getAttribute('aria-pressed'),'true');
              assert.equal(await board.getAttribute('data-view-mode'),mode.toLowerCase());
            }
          }
          if(slug==='moodboard'&&fixtureMedia){
            for(let n=0;n<3;n++){
              await board.locator('.ff-boards-asset-grid button').nth(n).click();
              for(const [label,value] of [['宽度','240'],['高度','150'],['X',String(36+(n%2)*280)],['Y',String(240+Math.floor(n/2)*190)]]){
                const field=board.getByRole('spinbutton',{name:label,exact:true});await field.fill(value);await field.press('Tab');
              }
            }
          }
        }
      }
      await page.waitForTimeout(350);
      if(slug==='assets'&&fixtureMedia){
        await page.locator('.assets-v75-tile[data-media-state="loaded"]').first().waitFor();
        await page.getByRole('button',{name:'视频',exact:true}).click();
        assert.equal(await page.locator('.assets-v75-tile:visible').count(),0);
        await page.getByRole('button',{name:'全部素材',exact:true}).click();
        await page.getByRole('searchbox',{name:'搜索素材名称'}).fill('不存在的测试素材');
        assert.equal(await page.locator('.assets-v75-tile:visible').count(),0);
        await page.getByRole('searchbox',{name:'搜索素材名称'}).fill('');
        assert.equal(await page.locator('.assets-v75-tile:visible').count(),12);
      }
      await page.screenshot({path:path.join(out,`${slug}-${theme}-1440.png`)});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${slug} ${theme} overflows viewport`);
    }
    await page.getByRole('button',{name:'分镜工作台',exact:true}).click();
  }
  await page.setViewportSize({width:374,height:812});
  for(const theme of ['dark','light']){
    await page.evaluate(value=>document.documentElement.dataset.theme=value,theme);
    await page.locator('.ff73-toolbar-root .ffui-segment').first().click();
    await page.waitForTimeout(160);
    const touchTargets=await page.evaluate(()=>[...document.querySelectorAll('.ff73-toolbar-actions > .ffui-button,.ff73-toolbar-content > .ffui-segmented .ffui-segment')]
      .filter(node=>node.getClientRects().length)
      .map(node=>({label:node.getAttribute('aria-label')||node.textContent.trim(),rect:node.getBoundingClientRect().toJSON(),icon:node.querySelector('svg')?.getBoundingClientRect().toJSON(),text:node.querySelector('span:not(.inspector-toggle-status)')?.getBoundingClientRect().toJSON()})));
    for(const target of touchTargets){
      assert.ok(target.rect.height>=44,`${theme}: ${target.label} touch target is shorter than 44px: ${JSON.stringify(target.rect)}`);
      if(target.icon)assert.ok(Math.abs((target.icon.top+target.icon.height/2)-(target.rect.top+target.rect.height/2))<2,`${theme}: ${target.label} icon is not vertically centered: ${JSON.stringify(target)}`);
      if(target.text)assert.ok(Math.abs((target.text.top+target.text.height/2)-(target.rect.top+target.rect.height/2))<5,`${theme}: ${target.label} text is not vertically centered: ${JSON.stringify(target)}`);
    }
    await page.screenshot({path:path.join(out,`table-374-${theme}.png`)});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${theme}: 374px page overflow`);
    console.log(`374px ${theme} control alignment`,JSON.stringify({touchTargets}));
  }
  await page.getByRole('button',{name:'筛选',exact:true}).click();
  const select=page.getByRole('combobox',{name:'制作方式',exact:true});
  const arrow=await select.evaluate(node=>{
    const icon=node.querySelector('svg');const button=node.getBoundingClientRect();const rect=icon?.getBoundingClientRect();
    return{className:icon?.getAttribute('class'),button:button.toJSON(),icon:rect?.toJSON(),rightInset:rect?button.right-rect.right:null};
  });
  assert.match(arrow.className,/chevron-down/,'selects use the canonical downward chevron');
  assert.ok(Math.abs((arrow.icon.top+arrow.icon.height/2)-(arrow.button.top+arrow.button.height/2))<2,`select chevron is not vertically centered: ${JSON.stringify(arrow)}`);
  assert.ok(arrow.rightInset>=6&&arrow.rightInset<=14,`select chevron has inconsistent trailing alignment: ${JSON.stringify(arrow)}`);
  await select.click();
  const menu=page.locator('.ffui-menu').last();await menu.waitFor({state:'visible'});
  const popoverBounds=await page.locator('.ffui-popover').boundingBox();
  assert.ok(popoverBounds.x>=0&&popoverBounds.x+popoverBounds.width<=374&&popoverBounds.y>=0&&popoverBounds.y+popoverBounds.height<=812,`filter popover escapes 374px viewport: ${JSON.stringify(popoverBounds)}`);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'374px page overflow with filter open');
  assert.ok(await menu.getByRole('option').count()>1,'production method filter offers a real selection');
  await menu.getByRole('option').nth(1).click();
  const filterPopover=page.locator('.ffui-popover');
  await filterPopover.waitFor({state:'visible'});
  const filterButton=page.getByRole('button',{name:/^筛选/});
  assert.equal(await filterButton.getAttribute('data-active'),'true','selecting a method updates the real filter state');
  await page.screenshot({path:path.join(out,'filter-active-374-light.png')});
  await page.keyboard.press('Escape');
  await filterPopover.waitFor({state:'hidden'});
  await filterButton.click();
  await page.getByRole('button',{name:'清除筛选',exact:true}).click();
  await page.getByRole('button',{name:'关闭筛选镜头',exact:true}).click();
  assert.equal(await filterButton.getAttribute('data-active'),'false');
  const columnTrigger=page.locator('[data-frameforge-column-manager-trigger="canonical"]');
  await columnTrigger.click();
  const columnPanel=page.locator('#columnSettingsPopover:not(.hidden)');
  await columnPanel.waitFor();
  await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('#columnSettingsPopover')).opacity)>=0.99);
  const columnBounds=await columnPanel.boundingBox();
  assert.ok(columnBounds.x>=0&&columnBounds.x+columnBounds.width<=374&&columnBounds.y>=0&&columnBounds.y+columnBounds.height<=812,`column manager escapes 374px viewport: ${JSON.stringify(columnBounds)}`);
  await page.screenshot({path:path.join(out,'column-manager-374-light.png')});
  await page.keyboard.press('Escape');
  await columnPanel.waitFor({state:'hidden'});
  const titleHeader=page.locator('#mainShotTable th[data-column="title"]');
  await titleHeader.scrollIntoViewIfNeeded();
  await titleHeader.click({button:'right'});
  const contextMenu=page.locator('#tableContextMenu:not(.hidden)');
  await contextMenu.waitFor();
  await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('#tableContextMenu')).opacity)>=0.99);
  const headerMenuBounds=await contextMenu.boundingBox();
  assert.ok(headerMenuBounds.x>=0&&headerMenuBounds.x+headerMenuBounds.width<=374&&headerMenuBounds.y>=0&&headerMenuBounds.y+headerMenuBounds.height<=812,`header context menu escapes 374px viewport: ${JSON.stringify(headerMenuBounds)}`);
  await page.screenshot({path:path.join(out,'column-header-menu-374-light.png')});
  await page.keyboard.press('Escape');
  await contextMenu.waitFor({state:'hidden'});
  const titleCell=page.locator('#mainShotTable td[data-field="title"]').first();
  await titleCell.click({button:'right'});
  await contextMenu.waitFor();
  await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('#tableContextMenu')).opacity)>=0.99);
  const cellMenuBounds=await contextMenu.boundingBox();
  assert.ok(cellMenuBounds.x>=0&&cellMenuBounds.x+cellMenuBounds.width<=374&&cellMenuBounds.y>=0&&cellMenuBounds.y+cellMenuBounds.height<=812,`cell context menu escapes 374px viewport: ${JSON.stringify(cellMenuBounds)}`);
  await page.screenshot({path:path.join(out,'column-cell-menu-374-light.png')});
  await page.keyboard.press('Escape');
  await contextMenu.waitFor({state:'hidden'});
  for (const width of [1440, 320, 375]) {
    await page.setViewportSize({width,height:width===1440?960:812});
    const header=page.locator('#mainShotTable th[data-column="title"]');
    await header.evaluate(node=>node.scrollIntoView({behavior:'instant',block:'nearest',inline:'nearest'}));
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    await header.evaluate(node=>node.focus({preventScroll:true}));
    await page.keyboard.press('Shift+F10');
    await contextMenu.waitFor({state:'visible'});
    assert.ok(await contextMenu.locator('[role="menuitem"]:focus').count(),'keyboard header open focuses a menu item');
    const bounds=await contextMenu.boundingBox();
    assert.ok(bounds.x>=0&&bounds.x+bounds.width<=width&&bounds.y>=0&&bounds.y+bounds.height<=(width===1440?960:812),
      `keyboard context menu escapes ${width}px viewport: ${JSON.stringify(bounds)}`);
    assert.equal(await page.evaluate(({x,y})=>document.elementFromPoint(x,y)?.closest('#tableContextMenu')?.id,
      {x:bounds.x+bounds.width/2,y:bounds.y+bounds.height/2}),'tableContextMenu','menu center is hit-testable');
    await page.screenshot({path:path.join(out,`column-header-menu-${width}-keyboard.png`)});
    await page.keyboard.press('ArrowDown');
    assert.ok(await contextMenu.locator('[role="menuitem"]:focus').count(),'arrow key keeps focus in menu');
    await page.keyboard.press('Escape');
    await contextMenu.waitFor({state:'hidden'});
    assert.equal(await header.evaluate(node=>document.activeElement===node),true,'Escape restores keyboard header focus');

    const cell=page.locator('#mainShotTable td[data-field="lens"][tabindex]').first();
    await cell.evaluate(node=>node.scrollIntoView({behavior:'instant',block:'nearest',inline:'nearest'}));
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    await cell.evaluate(node=>node.focus({preventScroll:true}));
    await page.keyboard.press('Shift+F10');
    await contextMenu.waitFor({state:'visible'});
    await page.screenshot({path:path.join(out,`column-cell-menu-${width}-keyboard.png`)});
    await page.keyboard.press('Escape');
    await contextMenu.waitFor({state:'hidden'});
    assert.equal(await cell.evaluate(node=>document.activeElement===node),true,'Escape restores keyboard cell focus');

    await header.click({button:'right'});
    await contextMenu.waitFor({state:'visible'});
    await page.mouse.click(width-5,width===1440?955:807);
    await contextMenu.waitFor({state:'hidden'});
    await header.click({button:'right'});
    await contextMenu.waitFor({state:'visible'});
    await page.locator('#tableScrollWrap').evaluate(node=>{node.scrollLeft=node.scrollLeft>40?0:40;});
    await contextMenu.waitFor({state:'hidden'});
  }
  await page.setViewportSize({width:1440,height:960});
  const inspectedTarget=await page.evaluate(()=>({id:state.bundle.shots[1].id,number:state.bundle.shots[1].number}));
  await page.locator(`#mainShotTable tr[data-id="${inspectedTarget.id}"]`).click();
  await detailToggle.click();
  assert.equal(await page.locator('#inspShotNumber').textContent(),`SHOT ${inspectedTarget.number}`);
  await page.locator('#mainShotTable tbody tr[data-id]').nth(2).click();
  assert.equal(await page.locator('#inspShotNumber').textContent(),`SHOT ${inspectedTarget.number}`,'selection does not retarget inspector before delete');
  await page.locator('#inspTrashBtn').click();
  assert.match(await page.locator('#confirmActionMessage').textContent(),new RegExp(`SHOT ${inspectedTarget.number}`),'inspector delete targets its own shot');
  await page.locator('#confirmActionForm button[type="submit"]').click();
  await page.waitForFunction(id=>!state.bundle.shots.some(shot=>shot.id===id),inspectedTarget.id);
  assert.equal(await page.locator('#inspectorSlot').isVisible(),false,'deleting inspected shot closes inspector');
  assert.deepEqual(await page.evaluate(()=>state.inspector),{open:false,targetShotId:null},'deleted target leaves no stale inspector state');
  console.log('374px filter portal alignment',JSON.stringify({arrow,popoverBounds}));
  assert.deepEqual(errors,[]);console.log('PASS V7.3 React shell, four views, tokens, font, desktop/mobile overflow and screenshots');
})().catch(error=>{console.error(error);console.error(logs);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();server.kill();console.log('QA fixture:',temp);});
