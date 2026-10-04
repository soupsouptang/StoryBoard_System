/* Motion contract QA; builds source in memory and uses no project data. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {build}=require('esbuild');
const {chromium}=require('playwright');

const root=path.resolve(__dirname,'..');
const out=path.join(root,'qa-artifacts','ui-motion');
const fixture=`
import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Button, MotionIcon, WorkspaceTransition, motionTokens} from '../../packages/ui/src/index.tsx';
function Fixture(){
  const [view,setView]=useState('a');
  const [iconState,setIconState]=useState('idle');
  return <main>
    <header id="shellHeader">FrameForge</header>
    <Button id="viewSwitch" onClick={()=>setView(current=>current==='a'?'b':'a')}>切换视图</Button>
    <Button id="iconSwitch" onClick={()=>setIconState(current=>current==='loading'?'success':'loading')}>切换状态</Button>
    <MotionIcon state={iconState} label="同步状态">★</MotionIcon>
    <WorkspaceTransition transitionKey={view} className="view-surface">
      <div data-view-id={view}><h1>视图 {view.toUpperCase()}</h1><Button>当前视图操作</Button></div>
    </WorkspaceTransition>
  </main>;
}
window.motionTokenSnapshot=motionTokens;
createRoot(document.getElementById('root')).render(<Fixture/>);
`;

(async()=>{
  const temp=fs.mkdtempSync(path.join(root,'scratch','ui-motion-source-'));
  const entry=path.join(temp,'fixture.tsx');
  let bundle;
  try{
    fs.writeFileSync(entry,fixture);
    bundle=await build({entryPoints:[entry],bundle:true,write:false,format:'iife',platform:'browser',target:'es2022',define:{'process.env.NODE_ENV':'"production"'}});
  }finally{
    fs.unlinkSync(entry);
    fs.rmdirSync(temp);
  }
  fs.mkdirSync(out,{recursive:true});
  const edge=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync);
  const browser=await chromium.launch({headless:true,...(edge?{executablePath:edge}:{})});
  try{
    const page=await browser.newPage({viewport:{width:375,height:740}});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.setContent('<!doctype html><html data-theme="dark"><body data-ui-version="7.3"><div id="root"></div></body></html>');
    await page.addStyleTag({path:path.join(root,'static','workspace-v73.css')});
    await page.addStyleTag({content:'body{margin:0}main{padding:16px}#shellHeader{height:44px}.view-surface{min-height:180px;padding:16px;background:var(--surface-1)}'});
    await page.addScriptTag({content:bundle.outputFiles[0].text});
    await page.locator('[data-view-id="a"]').waitFor();
    const tokens=await page.evaluate(()=>window.motionTokenSnapshot);
    assert.ok(tokens.duration.feedback>0&&tokens.duration.viewExit>0&&tokens.distance.view>0);
    await page.evaluate(()=>document.querySelector('#shellHeader').dataset.instance='stable');
    const icon=page.locator('[data-motion-state]');
    assert.equal(await icon.getAttribute('role'),'img');
    assert.equal(await icon.getAttribute('aria-label'),'同步状态');
    await page.locator('#iconSwitch').click();
    await page.waitForFunction(()=>document.querySelector('[data-motion-state]')?.dataset.motionState==='loading');
    await page.locator('#viewSwitch').click();
    const exiting=page.locator('[data-motion-presence="exiting"]');
    await exiting.waitFor({state:'visible'});
    assert.equal(await exiting.evaluate(node=>getComputedStyle(node).pointerEvents),'none','departing view must stop receiving input immediately');
    assert.equal(await exiting.getAttribute('aria-hidden'),'true');
    await page.locator('[data-view-id="b"]').waitFor();
    assert.equal(await page.locator('[data-view-id="a"]').count(),0);
    await page.locator('#viewSwitch').click();
    await page.locator('#viewSwitch').click();
    await page.waitForTimeout(500);
    assert.equal(await page.locator('[data-view-id="b"]').count(),1);
    assert.equal(await page.locator('[data-motion-presence="exiting"]').count(),0,'no invisible interactive view remains after rapid switches');
    assert.equal(await page.locator('#shellHeader').getAttribute('data-instance'),'stable','shared shell stays mounted');
    await page.locator('#iconSwitch').click();
    await page.waitForFunction(()=>document.querySelector('[data-motion-state]')?.dataset.motionState==='success');
    for(const width of [320,375,1024,1440]){
      await page.setViewportSize({width,height:900});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1),`${width}px motion surface overflows page`);
      if(width===375||width===1440)await page.screenshot({path:path.join(out,`motion-${width}-dark.png`)});
    }
    assert.deepEqual(errors,[]);
    console.log('PASS MotionIcon states and WorkspaceTransition exit lifecycle at 320/375/1024/1440px');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
