/* Isolated component browser regression. No production or backend access. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const root=path.resolve(__dirname,'..');
(async()=>{
 const executablePath=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Google/Chrome/Application/chrome.exe'].find(fs.existsSync);
 const browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{})});
 try {
 const page=await browser.newPage({viewport:{width:1500,height:1000}}),errors=[];
 const cdp=await page.context().newCDPSession(page);
 page.on('pageerror',e=>errors.push(e.message));
 await page.setContent('<div id="mount"></div>');
 await page.addStyleTag({path:path.join(root,'static/creative-boards.css')});
 for(const file of ['vendor/three-bundle.js','lighting-scene.js','lighting-render.js','creative-board-navigation.js','creative-boards.js']) await page.addScriptTag({path:path.join(root,'static',file)});
 await page.evaluate(()=>{
  window.fixture={revision:1,boards:[{id:'plan',kind:'lighting',name:'Test plan',width:1600,height:1000,shot_ids:[],items:[{id:'lamp',type:'light',x:700,y:400,z:200,width:100,height:100,rotation:0,label:'Test lamp',intensity:80,temperature:5600}]}]};
  window.cleanup=FrameForgeBoards.mount(document.querySelector('#mount'),{projectId:'isolated-canvas',kind:'lighting',api:async(_url,options)=>{
   if(options.method==='PUT')fixture={...options.json,revision:fixture.revision+1};
   return structuredClone(fixture);
  }});
 });
 await page.waitForFunction(()=>window.__FF_GLB_RUNTIME__?.renderer);
 const glbLifecycle=await page.evaluate(async()=>{
  const runtime=window.__FF_GLB_RUNTIME__, originalLoader=THREE.GLTFLoader, url='qa-flaky-glb';
  let attempts=0;
  THREE.GLTFLoader=class {
   load(_url,onSuccess,_progress,onError){
    attempts++;
    queueMicrotask(()=>attempts===1?onError(new Error('transient load failure')):onSuccess({scene:new THREE.Group()}));
   }
  };
  const load=()=>new Promise(resolve=>runtime.loadGLB(url,()=>resolve('loaded'),()=>resolve('failed')));
  try {
   const first=await load(),pendingAfterFailure=runtime.loadingPromises.has(url);
   const second=await load();
   return {first,second,attempts,pendingAfterFailure,pendingAfterSuccess:runtime.loadingPromises.has(url),cached:runtime.gltfCache.has(url)};
  } finally { THREE.GLTFLoader=originalLoader; }
 });
 assert.deepEqual(glbLifecycle,{first:'failed',second:'loaded',attempts:2,pendingAfterFailure:false,pendingAfterSuccess:false,cached:true},'settled GLB loads release their in-flight entry and failed loads can retry');
 assert.ok(await page.evaluate(()=>{
  const runtime=window.__FF_GLB_RUNTIME__;
  return FrameForgeLightingRender.reconcileWebGLRuntime(runtime,runtime.container,fixture.boards[0],runtime.options,null)===runtime;
 }),'the runtime owner reuses a connected instance for the same board and viewport');
 // Actual mesh picking, not a synthetic onSelect callback.
 const meshPoint=()=>page.evaluate(()=>{
  const r=__FF_GLB_RUNTIME__, entry=r.equipmentMap.get('lamp');
  r.scene.updateMatrixWorld(true);r.cameraPerspective.updateMatrixWorld();
  let mesh;entry.procedural.traverse(node=>{if(node.isMesh&&!mesh)mesh=node;});
  const p=new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3()).project(r.cameraPerspective);
  const b=r.canvas.getBoundingClientRect();return{x:b.left+(p.x+1)*b.width/2,y:b.top+(1-p.y)*b.height/2};
 });
 const point=await meshPoint();
 await page.mouse.click(point.x,point.y);
 await page.waitForFunction(()=>__FF_GLB_RUNTIME__.selectedId==='lamp');
 assert.equal(await page.getByLabel('标签',{exact:true}).inputValue(),'Test lamp');
 await page.locator('[data-tool="move"]').click();
 const before=await page.evaluate(()=>cleanup.getDraft().boards[0].items[0].x);
 await page.mouse.move(point.x,point.y);await page.mouse.down();await page.mouse.move(point.x+75,point.y+25,{steps:8});await page.mouse.up();
 const after=await page.evaluate(()=>cleanup.getDraft().boards[0].items[0].x);
 assert.notEqual(after,before,'3D move commits scene data');
 await page.getByRole('button',{name:'撤销',exact:true}).click();
 assert.equal(await page.evaluate(()=>cleanup.getDraft().boards[0].items[0].x),before,'3D move undo');
 await page.locator('[data-tool="rotate"]').click();
 const rotatedPoint=await meshPoint();
 await page.mouse.move(rotatedPoint.x,rotatedPoint.y);await page.mouse.down();await page.mouse.move(rotatedPoint.x+60,rotatedPoint.y,{steps:6});await page.mouse.up();
 assert.equal(await page.evaluate(()=>cleanup.getDraft().boards[0].items[0].rotation),30,'3D rotation commits');
 const cancelPoint=await meshPoint();
 await page.mouse.move(cancelPoint.x,cancelPoint.y);await page.mouse.down();await page.mouse.move(cancelPoint.x+60,cancelPoint.y,{steps:6});await page.keyboard.press('Escape');await page.mouse.up();
 assert.equal(await page.evaluate(()=>cleanup.getDraft().boards[0].items[0].rotation),30,'Escape cancels transform');
 await page.evaluate(()=>{window.__FF_PRE_SPLIT_RUNTIME__=__FF_GLB_RUNTIME__;});
 await page.getByRole('button',{name:'分屏',exact:true}).click();
 await page.waitForFunction(()=>window.__FF_GLB_RUNTIME__?.renderer&&document.querySelector('.ff-boards-split-right')?.contains(__FF_GLB_RUNTIME__.canvas));
 assert.ok(await page.evaluate(()=>__FF_PRE_SPLIT_RUNTIME__.disposed),'entering split view disposes the previous 3D runtime');
 assert.equal(await page.evaluate(()=>__FF_GLB_RUNTIME__.mode),'3d','split view uses one 3D viewport on its right side');
 await page.evaluate(()=>{window.__FF_SPLIT_RUNTIME__=__FF_GLB_RUNTIME__;});
 await page.getByRole('button',{name:'3D',exact:true}).click();
 await page.waitForFunction(()=>window.__FF_GLB_RUNTIME__?.renderer&&document.querySelector('.ff-boards-canvas')?.contains(__FF_GLB_RUNTIME__.canvas));
 assert.ok(await page.evaluate(()=>__FF_SPLIT_RUNTIME__.disposed),'leaving split view disposes its right-side runtime');
 await page.getByRole('button',{name:'2D',exact:true}).click();
 await page.setViewportSize({width:390,height:844});
 await page.getByRole('button',{name:'适合窗口',exact:true}).first().click();
 const plan=page.locator('.ff-boards-canvas');
 await page.locator('.ff-boards-item[data-item-id="lamp"]').click();
 const outerHandlePoint=selector=>page.locator(selector).evaluate(handle=>{
  const r=handle.getBoundingClientRect();
  for(let y=Math.floor(r.top-14);y<=Math.ceil(r.bottom+14);y+=2)for(let x=Math.floor(r.left-14);x<=Math.ceil(r.right+14);x+=2){
   if(x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom)continue;
   if(document.elementFromPoint(x,y)===handle)return{x,y};
  }
  return null;
 });
 for(const selector of ['.ff-boards-rotate','.ff-boards-resize']){
  const handle=page.locator(`.ff-boards-item[data-item-id="lamp"] ${selector}`);
  const screenTarget=await handle.evaluate(el=>Number.parseFloat(getComputedStyle(el,'::before').width)*new DOMMatrix(el.closest('.ff-boards-canvas').style.transform).a);
  assert.ok(Math.abs(screenTarget-44)<1,`${selector} keeps a 44px target at the current board zoom`);
  assert.ok(await outerHandlePoint(`.ff-boards-item[data-item-id="lamp"] ${selector}`),`${selector} can be hit outside its visible bounds`);
 }
 const resizePoint=await outerHandlePoint('.ff-boards-item[data-item-id="lamp"] .ff-boards-resize');
 const widthBeforeResize=await page.evaluate(()=>cleanup.getDraft().boards[0].items[0].width);
 await page.mouse.move(resizePoint.x,resizePoint.y);await page.mouse.down();await page.mouse.move(resizePoint.x+24,resizePoint.y,{steps:4});await page.mouse.up();
 assert.notEqual(await page.evaluate(()=>cleanup.getDraft().boards[0].items[0].width),widthBeforeResize,'expanded resize hit area resizes from its transparent edge');
 const rotatePoint=await outerHandlePoint('.ff-boards-item[data-item-id="lamp"] .ff-boards-rotate');
 const rotationBeforeTouch=await page.evaluate(()=>cleanup.getDraft().boards[0].items[0].rotation);
 await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:rotatePoint.x,y:rotatePoint.y,id:5}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:rotatePoint.x+24,y:rotatePoint.y+18,id:5}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});
 assert.notEqual(await page.evaluate(()=>cleanup.getDraft().boards[0].items[0].rotation),rotationBeforeTouch,'expanded rotate hit area rotates from its transparent edge');
 const notePage=await browser.newPage({viewport:{width:390,height:844}});
 await notePage.setContent('<div id="mount"></div>');
 await notePage.addStyleTag({path:path.join(root,'static/creative-boards.css')});
 await notePage.addScriptTag({path:path.join(root,'static/creative-board-navigation.js')});
 await notePage.addScriptTag({path:path.join(root,'static/creative-boards.js')});
 await notePage.evaluate(()=>{
  window.noteFixture={revision:1,boards:[{id:'notes',kind:'moodboard',name:'Notes',width:1000,height:700,items:[{id:'note',type:'note',x:200,y:200,width:160,height:100,label:'Note',text:'Touch target regression'}]}]};
  FrameForgeBoards.mount(document.querySelector('#mount'),{projectId:'isolated-note-target',kind:'moodboard',api:async()=>structuredClone(noteFixture)});
 });
 await notePage.locator('.ff-boards-item[data-item-id="note"]').click();
 for(const selector of ['.ff-boards-rotate','.ff-boards-resize']){
  const result=await notePage.locator(`.ff-boards-item[data-item-id="note"] ${selector}`).evaluate(handle=>{
   const r=handle.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
    const points=handle.matches('.ff-boards-rotate')?[[cx-20,r.top-20],[cx,r.top-20],[cx+20,r.top-20]]:[[cx-20,cy],[cx+20,cy],[cx,cy-20],[cx,cy+20]];
    return {screenTarget:Number.parseFloat(getComputedStyle(handle,'::before').width)*new DOMMatrix(handle.closest('.ff-boards-canvas').style.transform).a,
    points:points.map(([x,y])=>({x,y,hit:document.elementFromPoint(x,y)===handle,insideHandle:x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom}))};
  });
  assert.ok(Math.abs(result.screenTarget-44)<1,`${selector} keeps a 44px target on the 390px note board`);
  assert.ok(result.points.every(point=>point.hit&&!point.insideHandle),`${selector} exposes the full expanded target around clipped note content`);
 }
 await notePage.close();
 await page.setViewportSize({width:1500,height:1000});
 const scale=()=>plan.evaluate(e=>new DOMMatrix(getComputedStyle(e).transform).a);
 const initial=await scale();
 const box=await plan.boundingBox();await page.mouse.move(box.x+100,box.y+100);await page.mouse.wheel(0,-150);
 await page.waitForFunction(old=>new DOMMatrix(getComputedStyle(document.querySelector('.ff-boards-canvas')).transform).a>old,initial);
 await plan.focus();await page.keyboard.press('-');assert.ok(await scale()<initial*1.36,'keyboard zoom out');
 await page.keyboard.press('0');assert.ok(await scale()<1,'fit board');
 const pathData=await page.locator('.ff-boards-item[data-item-id="lamp"] svg path').first().getAttribute('d');
 assert.ok(pathData.startsWith('M40 20'),'lamp uses floor plan, not side silhouette');
 await plan.focus();for(let n=0;n<4;n++)await page.keyboard.press('+');
 const viewport=page.locator('.ff-boards-viewport');
 await viewport.evaluate(e=>{e.scrollLeft=180;e.scrollTop=140;});
 const startScroll=await viewport.evaluate(e=>e.scrollLeft);
 const port=await viewport.boundingBox();await plan.focus();await page.keyboard.down('Space');
 await page.mouse.move(port.x+180,port.y+180);await page.mouse.down();await page.mouse.move(port.x+130,port.y+140,{steps:5});await page.mouse.up();await page.keyboard.up('Space');
 assert.ok(await viewport.evaluate(e=>e.scrollLeft)>startScroll,'Space drag pans without moving objects');
 const out=path.join(root,'qa-artifacts','canvas-interaction');fs.mkdirSync(out,{recursive:true});
 await page.screenshot({path:path.join(out,'lighting-2d.png')});
 await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});
 await page.getByRole('button',{name:'3D',exact:true}).click();
 await page.locator('.ff-boards-floating').getByRole('button',{name:'平移',exact:true}).click();
 const webgl=page.locator('.ff-lighting-webgl-canvas');
 const webglBox=await webgl.boundingBox(),wx=webglBox.x+webglBox.width/2,wy=webglBox.y+webglBox.height/2;
 const radiusBefore=await page.evaluate(()=>__FF_GLB_RUNTIME__.orbit.radius);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:wx-40,y:wy,id:3},{x:wx+40,y:wy,id:4}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:wx-70,y:wy,id:3},{x:wx+70,y:wy,id:4}]});
 await page.waitForFunction(old=>__FF_GLB_RUNTIME__.orbit.radius<old*.8,radiusBefore,{timeout:6000});
 assert.ok(await page.evaluate(()=>__FF_GLB_RUNTIME__.orbit.radius)<radiusBefore,'two-finger pinch zooms 3D camera');
 const targetBefore=await page.evaluate(()=>({x:__FF_GLB_RUNTIME__.orbit.tx,z:__FF_GLB_RUNTIME__.orbit.tz}));
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:wx-40,y:wy+25,id:3},{x:wx+100,y:wy+25,id:4}]});
 await page.waitForTimeout(100);
 const targetAfter=await page.evaluate(()=>({x:__FF_GLB_RUNTIME__.orbit.tx,z:__FF_GLB_RUNTIME__.orbit.tz}));
 assert.notDeepEqual(targetAfter,targetBefore,'two-finger midpoint movement pans 3D camera');
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});
  await page.setViewportSize({width:390,height:844});
  const orbitBeforeModeSwitch=await page.evaluate(()=>({...__FF_GLB_RUNTIME__.orbit}));
  await page.getByRole('button',{name:'2D',exact:true}).click();
  assert.equal(await page.evaluate(()=>window.__FF_GLB_RUNTIME__),null,'switching to mobile 2D disposes the detached WebGL runtime');
  await page.locator('.ff-boards-floating').getByRole('button',{name:'选择',exact:true}).click();
  await page.locator('.ff-boards-item[data-item-id="lamp"]').click();
  assert.equal(await page.locator('.ff-boards-item[data-item-id="lamp"]').getAttribute('aria-pressed'),'true','2D item remains selectable after switching from 3D');
  // Verify a real one-finger touch drag in mobile 2D, plus undo. Mouse-driven
  // desktop transforms and touch handle hit tests do not cover this path.
  const mobileItemBox=await page.locator('.ff-boards-item[data-item-id="lamp"]').boundingBox();
  const mobileItemStart={x:mobileItemBox.x+mobileItemBox.width/2,y:mobileItemBox.y+mobileItemBox.height/2};
  const itemXBeforeMobileDrag=await page.evaluate(()=>cleanup.getDraft().boards[0].items[0].x);
  await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...mobileItemStart,id:11}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:mobileItemStart.x+32,y:mobileItemStart.y+12,id:11}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});
  const itemXAfterMobileDrag=await page.evaluate(()=>cleanup.getDraft().boards[0].items[0].x);
  assert.notEqual(itemXAfterMobileDrag,itemXBeforeMobileDrag,'one-finger touch moves selected items in mobile 2D');
  await page.getByRole('button',{name:'撤销',exact:true}).click();
  assert.equal(await page.evaluate(()=>cleanup.getDraft().boards[0].items[0].x),itemXBeforeMobileDrag,'mobile 2D touch move participates in undo history');
  const draftBeforeFlush=await page.evaluate(()=>cleanup.getDraft());
  assert.ok(await page.evaluate(()=>cleanup.flush()),'2D/3D edits flush successfully');
  const savedDraft=await page.evaluate(()=>structuredClone(fixture));
  assert.deepEqual(savedDraft.boards[0].items[0],draftBeforeFlush.boards[0].items[0],'save API receives the latest canvas object data');
  await page.getByRole('button',{name:'3D',exact:true}).click();
  await page.waitForFunction(()=>window.__FF_GLB_RUNTIME__?.renderer&&__FF_GLB_RUNTIME__.canvas.isConnected);
  const orbitAfterModeSwitch=await page.evaluate(()=>({...__FF_GLB_RUNTIME__.orbit}));
  for(const key of ['theta','phi','radius','tx','ty','tz'])assert.ok(Math.abs(orbitAfterModeSwitch[key]-orbitBeforeModeSwitch[key])<1e-6,`3D ${key} survives 2D round trip`);
  await page.evaluate(()=>__FF_GLB_RUNTIME__.syncScene(fixture.boards[0],{selectedId:null}));
  const mobilePick=await meshPoint();
  await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:mobilePick.x,y:mobilePick.y,id:9}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.waitForFunction(()=>__FF_GLB_RUNTIME__.selectedId==='lamp');
  await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});
  const reloadPage=await browser.newPage({viewport:{width:390,height:844}});
  await reloadPage.setContent('<div id="mount"></div>');
  await reloadPage.addStyleTag({path:path.join(root,'static/creative-boards.css')});
  for(const file of ['vendor/three-bundle.js','lighting-scene.js','lighting-render.js','creative-board-navigation.js','creative-boards.js'])await reloadPage.addScriptTag({path:path.join(root,'static',file)});
  await reloadPage.evaluate(data=>{
   window.fixture=data;
   window.cleanup=FrameForgeBoards.mount(document.querySelector('#mount'),{projectId:'isolated-canvas-reload',kind:'lighting',api:async()=>structuredClone(fixture)});
  },savedDraft);
  await reloadPage.locator('.ff-boards-item[data-item-id="lamp"]').waitFor();
  assert.equal(await reloadPage.evaluate(()=>cleanup.getDraft().boards[0].items[0].x),savedDraft.boards[0].items[0].x,'saved 3D object data reloads in a fresh browser runtime');
  await reloadPage.evaluate(()=>cleanup());
  await reloadPage.close();
  await page.evaluate(()=>cleanup());
 assert.equal(await page.evaluate(()=>window.__FF_GLB_RUNTIME__),null,'runtime disposed on exit');
 await page.evaluate(()=>{
  const data={revision:1,boards:[{id:'mood',kind:'moodboard',name:'Mood test',width:1600,height:1000,shot_ids:[],items:[{id:'note',type:'note',x:300,y:200,width:180,height:120,rotation:0,text:'Test',color:'#fff2b3',label:'Note'}]}]};
  window.cleanup=FrameForgeBoards.mount(document.querySelector('#mount'),{projectId:'isolated-mood',kind:'moodboard',api:async()=>structuredClone(data)});
 });
 await page.locator('[data-item-id="note"]').waitFor();
 await page.getByRole('button',{name:'适合窗口',exact:true}).click();
 const moodBefore=await scale();const moodBox=await plan.boundingBox();
 await page.mouse.move(moodBox.x+120,moodBox.y+100);await page.mouse.wheel(0,-120);
 await page.waitForFunction(old=>new DOMMatrix(getComputedStyle(document.querySelector('.ff-boards-canvas')).transform).a>old,moodBefore);
 await plan.focus();await page.keyboard.press('0');assert.ok(await scale()<1,'moodboard fit');
 assert.equal(await page.evaluate(()=>cleanup.getDraft().boards[0].items[0].x),300,'zoom never changes moodboard data');
 // Browser-generated two-pointer touch sequence: pinch should zoom and a
 // midpoint shift should pan the 2D plan instead of selecting an object.
 const touchBox=await plan.boundingBox(),tx=touchBox.x+touchBox.width/2,ty=touchBox.y+touchBox.height/2;
 const touchViewport=page.locator('.ff-boards-viewport');
 const touchStartZoom=await scale();
 await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:tx-45,y:ty,id:1},{x:tx+45,y:ty,id:2}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:tx-75,y:ty,id:1},{x:tx+75,y:ty,id:2}]});
 await page.waitForFunction(old=>new DOMMatrix(getComputedStyle(document.querySelector('.ff-boards-canvas')).transform).a>old*1.2,touchStartZoom);
 const touchZoom=await scale();
 const touchScroll=await touchViewport.evaluate(e=>e.scrollLeft);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:tx-45,y:ty,id:1},{x:tx+105,y:ty,id:2}]});
 await page.waitForFunction(old=>document.querySelector('.ff-boards-viewport').scrollLeft!==old,touchScroll);
 assert.ok(touchZoom>touchStartZoom,'two-finger pinch zooms 2D board');
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await page.evaluate(()=>cleanup());
 // Isolated 1024px desktop-layout acceptance: the fixture reserves the same
 // 208px navigation rail as the app so the canvas/sidebar get realistic width.
 const layoutPage=await browser.newPage({viewport:{width:1024,height:900}}),layoutErrors=[];
 layoutPage.on('pageerror',e=>layoutErrors.push(e.message));
 await layoutPage.setContent('<div id="mount" style="margin-left:208px;width:calc(100% - 208px)"></div>');
 await layoutPage.addStyleTag({path:path.join(root,'static/creative-boards.css')});
 for(const file of ['vendor/three-bundle.js','lighting-scene.js','lighting-render.js','creative-board-navigation.js','creative-boards.js'])await layoutPage.addScriptTag({path:path.join(root,'static',file)});
 await layoutPage.evaluate(()=>{
  window.fixture={revision:1,boards:[{id:'plan',kind:'lighting',name:'Test plan',width:1600,height:1000,shot_ids:[],items:[]}]};
  window.cleanup=FrameForgeBoards.mount(document.querySelector('#mount'),{projectId:'isolated-layout-1024',kind:'lighting',api:async()=>structuredClone(fixture)});
 });
 await layoutPage.waitForFunction(()=>window.__FF_GLB_RUNTIME__?.renderer);
 await layoutPage.getByRole('button',{name:'2D',exact:true}).click();
 const libraryLayout=await layoutPage.evaluate(()=>{
  const sidebar=document.querySelector('.ff-boards-sidebar'),workspace=document.querySelector('.ff-boards-workspace');
  const card=document.querySelector('.ff-boards-tile-card'),title=card?.querySelector('.ff-tile-title');
  return {sidebar:sidebar?.getBoundingClientRect().toJSON(),workspace:workspace?.getBoundingClientRect().toJSON(),card:card?.getBoundingClientRect().toJSON(),title:title?{text:title.textContent,clientWidth:title.clientWidth,scrollWidth:title.scrollWidth}:null};
 });
 assert.ok(libraryLayout.card&&libraryLayout.title,'lighting equipment cards render at 1024px');
 assert.ok(libraryLayout.card.right<=libraryLayout.sidebar.right+1,'equipment cards remain inside the sidebar at 1024px');
 assert.ok(libraryLayout.workspace.left>=libraryLayout.sidebar.right-1,'2D workspace starts after the equipment sidebar');
 assert.ok(libraryLayout.title.scrollWidth<=libraryLayout.title.clientWidth,`first equipment title is not clipped at 1024px: ${JSON.stringify(libraryLayout.title)}`);
 fs.mkdirSync(path.join(root,'qa-artifacts'),{recursive:true});
 await layoutPage.screenshot({path:path.join(root,'qa-artifacts','canvas-layout-1024-2d.png')});
 await layoutPage.getByRole('button',{name:'3D',exact:true}).click();
 assert.ok(await layoutPage.locator('.ff-lighting-webgl-canvas').isVisible(),'3D canvas remains visible at 1024px');
 const layout3d=await layoutPage.evaluate(()=>({sidebar:document.querySelector('.ff-boards-sidebar').getBoundingClientRect().toJSON(),workspace:document.querySelector('.ff-boards-workspace').getBoundingClientRect().toJSON()}));
 assert.ok(layout3d.workspace.left>=layout3d.sidebar.right-1,'3D canvas remains beside, not over, the equipment sidebar');
 await layoutPage.screenshot({path:path.join(root,'qa-artifacts','canvas-layout-1024-3d.png')});
 await layoutPage.evaluate(()=>cleanup());
 assert.deepEqual(layoutErrors,[]);
 await layoutPage.close();
 const fallbackPage=await browser.newPage({viewport:{width:1280,height:800}});
 await fallbackPage.setContent('<div id="mount"></div>');
 await fallbackPage.addStyleTag({path:path.join(root,'static/creative-boards.css')});
 await fallbackPage.addScriptTag({path:path.join(root,'static/vendor/three-bundle.js')});
 await fallbackPage.evaluate(()=>{THREE.WebGLRenderer=class {constructor(){throw new Error('WebGL unavailable in this isolated fixture');}};});
 for(const file of ['lighting-scene.js','lighting-render.js','creative-board-navigation.js','creative-boards.js'])await fallbackPage.addScriptTag({path:path.join(root,'static',file)});
 await fallbackPage.evaluate(()=>{
  window.fixture={revision:1,boards:[{id:'fallback',kind:'lighting',name:'Fallback',width:1600,height:1000,shot_ids:[],items:[]}]};
  window.cleanup=FrameForgeBoards.mount(document.querySelector('#mount'),{projectId:'isolated-webgl-fallback',kind:'lighting',api:async()=>structuredClone(fixture)});
 });
 await fallbackPage.locator('.ff-boards-25d-canvas:not(.ff-lighting-webgl-canvas)').waitFor();
 assert.equal(await fallbackPage.locator('.ff-lighting-webgl-canvas').count(),0,'failed WebGL canvas is released before the projected fallback renders');
 assert.equal(await fallbackPage.evaluate(()=>window.__FF_GLB_RUNTIME__),null,'failed WebGL runtime releases its global owner');
 await fallbackPage.evaluate(()=>cleanup());
 await fallbackPage.close();
 const lifecyclePage=await browser.newPage({viewport:{width:1280,height:800}});
 await lifecyclePage.setContent('<div id="mount"></div>');
 await lifecyclePage.addStyleTag({path:path.join(root,'static/creative-boards.css')});
 for(const file of ['vendor/three-bundle.js','lighting-scene.js','lighting-render.js','creative-board-navigation.js','creative-boards.js'])await lifecyclePage.addScriptTag({path:path.join(root,'static',file)});
 await lifecyclePage.evaluate(()=>{
  window.fixture={revision:1,boards:[{id:'split-race',kind:'lighting',name:'Split race',width:1600,height:1000,shot_ids:[],items:[]}]};
  window.cleanup=FrameForgeBoards.mount(document.querySelector('#mount'),{projectId:'isolated-split-cleanup-race',kind:'lighting',api:async()=>structuredClone(fixture)});
 });
 await lifecyclePage.waitForFunction(()=>window.__FF_GLB_RUNTIME__?.renderer);
 await lifecyclePage.evaluate(()=>{
  [...document.querySelectorAll('button')].find(button=>button.textContent.trim()==='分屏').click();
  [...document.querySelectorAll('button')].find(button=>button.textContent.trim()==='3D').click();
 });
 await lifecyclePage.evaluate(()=>new Promise(requestAnimationFrame));
 assert.ok(await lifecyclePage.evaluate(()=>__FF_GLB_RUNTIME__?.mode==='3d'&&__FF_GLB_RUNTIME__.canvas.isConnected&&!document.querySelector('.ff-boards-split-wrap')),'a pending split frame is cancelled when switching back to 3D');
 await lifecyclePage.evaluate(()=>{
  [...document.querySelectorAll('button')].find(button=>button.textContent.trim()==='分屏').click();
  cleanup();
 });
 await lifecyclePage.evaluate(()=>new Promise(requestAnimationFrame));
 assert.equal(await lifecyclePage.evaluate(()=>window.__FF_GLB_RUNTIME__),null,'a pending split render cannot create an orphan WebGL runtime after unmount');
 assert.equal(await lifecyclePage.locator('.ff-lighting-webgl-canvas').count(),0,'unmount leaves no detached split WebGL canvas');
 await lifecyclePage.close();
 assert.deepEqual(errors,[]);
 console.log('PASS isolated browser: 3D pick/move/rotate/cancel/undo and touch pan/zoom; runtime reuse/split/fallback; 2D/moodboard zoom/fit/pan; 44px mobile handles including clipped note cards; plan symbol; cleanup');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
