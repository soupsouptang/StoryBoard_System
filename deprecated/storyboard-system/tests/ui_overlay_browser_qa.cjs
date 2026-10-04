/* Shared overlay contract QA; bundles source in memory and uses no project data. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {build}=require('esbuild');
const {chromium}=require('playwright');

const root=path.resolve(__dirname,'..');
const out=path.join(root,'qa-artifacts','ui-overlays');
const fixture=`
import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Button, Menu, Modal, Popover, UIProvider} from '../../packages/ui/src/index.tsx';
function Fixture(){
  const [open,setOpen]=useState(false);
  const [dialogOpen,setDialogOpen]=useState(false);
  const items=[
    {id:'run',label:'执行',onSelect:()=>window.selected.push('run')},
    {id:'disabled',label:'禁用',disabled:true,onSelect:()=>window.selected.push('disabled')},
    {id:'duplicate-a',label:'重复',onSelect:()=>window.selected.push('duplicate-a')},
    {id:'duplicate-b',label:'重复',onSelect:()=>window.selected.push('duplicate-b')}
  ];
  return <UIProvider><div className="fixture">
    <button id="outside" type="button">页面空白处</button>
    <div className="fixture-actions">
      <Menu label="测试工具" trigger={<Button id="controlledMenu">更多工具</Button>} items={items} open={open} onOpenChange={next=>{window.menuStates.push(next);setOpen(next);}}/>
      <Menu label="自由工具" trigger={<Button id="uncontrolledMenu">自由菜单</Button>} items={[{id:'free',label:'自由操作',onSelect:()=>window.selected.push('free')}]}/>
      <Popover label="设置" trigger={<Button id="popoverTrigger">设置</Button>}><p>浮层内容</p></Popover>
      <Modal title="测试弹窗" description="测试关闭与焦点" open={dialogOpen} onOpenChange={setDialogOpen} trigger={<Button id="modalTrigger">打开弹窗</Button>}><p>弹窗内容</p></Modal>
    </div>
  </div></UIProvider>;
}
window.selected=[];window.menuStates=[];
createRoot(document.getElementById('root')).render(<Fixture/>);
`;

(async()=>{
  const temp=fs.mkdtempSync(path.join(root,'scratch','ui-overlay-source-'));
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
    const page=await browser.newPage({viewport:{width:374,height:740}});
    page.on('pageerror',error=>{throw error;});
    await page.setContent('<!doctype html><html data-theme="dark"><body data-ui-version="7.3"><div id="root"></div></body></html>');
    await page.addStyleTag({path:path.join(root,'static','workspace-v73.css')});
    await page.addStyleTag({content:'.fixture{height:100dvh}.fixture-actions{position:fixed;right:10px;top:60px;display:flex;flex-direction:column;align-items:flex-end;gap:8px}#outside{position:absolute;left:10px;top:300px}'});
    await page.addScriptTag({content:bundle.outputFiles[0].text});
    const controlled=page.locator('#controlledMenu');
    await controlled.click();
    const menu=page.getByRole('menu',{name:'测试工具'});
    await menu.waitFor({state:'visible'});
    assert.equal(await controlled.getAttribute('aria-expanded'),'true');
    assert.equal(await menu.getByRole('menuitem',{name:'重复'}).count(),2,'equal labels must remain separate actions');
    assert.equal(await menu.getByRole('menuitem',{name:'禁用'}).getAttribute('aria-disabled'),'true');
    const bounds=await menu.boundingBox();
    assert.ok(bounds.x>=0&&bounds.x+bounds.width<=374&&bounds.y>=0&&bounds.y+bounds.height<=740,`menu escapes mobile viewport: ${JSON.stringify(bounds)}`);
    await page.screenshot({path:path.join(out,'menu-374-dark.png')});
    await page.keyboard.press('Escape');
    await menu.waitFor({state:'hidden'});
    assert.equal(await controlled.getAttribute('aria-expanded'),'false');
    await page.waitForFunction(()=>document.activeElement?.id==='controlledMenu');
    assert.equal(await controlled.evaluate(node=>document.activeElement===node),true,'Escape returns focus to menu trigger');
    await controlled.click();
    await page.mouse.click(20,310);
    await menu.waitFor({state:'hidden'});
    await controlled.click();
    await menu.getByRole('menuitem',{name:'重复'}).nth(1).click();
    await menu.waitFor({state:'hidden'});
    assert.deepEqual(await page.evaluate(()=>window.selected),['duplicate-b']);
    assert.deepEqual(await page.evaluate(()=>window.menuStates),[true,false,true,false,true,false]);
    await page.locator('#uncontrolledMenu').click();
    const freeMenu=page.getByRole('menu',{name:'自由工具'});
    await freeMenu.waitFor({state:'visible'});
    await page.keyboard.press('Escape');
    await freeMenu.waitFor({state:'hidden'});
    await page.locator('#popoverTrigger').click();
    const popover=page.getByRole('dialog',{name:'设置'});
    await popover.waitFor({state:'visible'});
    const popoverBounds=await popover.boundingBox();
    assert.ok(popoverBounds.x>=0&&popoverBounds.x+popoverBounds.width<=374,'popover placement differs from menu collision rules');
    await page.screenshot({path:path.join(out,'popover-374-dark.png')});
    await page.keyboard.press('Escape');
    await popover.waitFor({state:'hidden'});
    await page.locator('#popoverTrigger').click();
    await popover.waitFor({state:'visible'});
    await page.getByRole('button',{name:'关闭设置',exact:true}).click();
    await popover.waitFor({state:'hidden'});
    await page.locator('#modalTrigger').click();
    const dialog=page.getByRole('dialog',{name:'测试弹窗'});
    await dialog.waitFor({state:'visible'});
    await page.screenshot({path:path.join(out,'modal-374-dark.png')});
    await page.getByRole('button',{name:'关闭测试弹窗',exact:true}).click();
    await dialog.waitFor({state:'hidden'});
    await page.waitForFunction(()=>document.activeElement?.id==='modalTrigger');
    await page.evaluate(()=>document.documentElement.dataset.theme='light');
    await controlled.click();
    await menu.waitFor({state:'visible'});
    await page.screenshot({path:path.join(out,'menu-374-light.png')});
    await page.keyboard.press('Escape');
    await menu.waitFor({state:'hidden'});
    await page.setViewportSize({width:1440,height:900});
    await controlled.click();
    await menu.waitFor({state:'visible'});
    await page.screenshot({path:path.join(out,'menu-1440-light.png')});
    await page.keyboard.press('Escape');
    await menu.waitFor({state:'hidden'});
    console.log('PASS shared Menu/Popover/Modal lifecycle, dismissal, focus, disabled item and 374px/1440px collision');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
