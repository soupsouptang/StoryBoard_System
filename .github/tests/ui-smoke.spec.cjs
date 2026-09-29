const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const widths=[{width:1440,height:1000},{width:1024,height:900},{width:768,height:900},{width:375,height:812},{width:320,height:700}];
const out=path.resolve(__dirname,'../../.artifacts/ui/screens'); fs.mkdirSync(out,{recursive:true});
async function noOverflow(page){const m=await page.evaluate(()=>({s:document.documentElement.scrollWidth,w:window.innerWidth}));expect(m.s,JSON.stringify(m)).toBeLessThanOrEqual(m.w+1);}
for(const viewport of widths){
  test(`login responsive ${viewport.width}`,async({page})=>{
    await page.setViewportSize(viewport); await page.goto('/login',{waitUntil:'networkidle'});
    await expect(page.getByRole('heading').first()).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible(); await expect(page.locator('input[type="password"]')).toBeVisible();
    await noOverflow(page); await page.screenshot({path:path.join(out,`login-${viewport.width}.png`),fullPage:true});
  });
  test(`production hub/dialog responsive ${viewport.width}`,async({page})=>{
    await page.route('http://localhost:8000/api/v1/productions',async route=>{
      if(route.request().method()==='GET') return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify([{id:'qa-production',name:'Golden Baseline QA',code:'QA',template_type:'film',fps_num:25,fps_den:1,drop_frame:false,start_timecode_frames:90000,target_duration_frames:4500,aspect_ratio:'16:9',width:1920,height:1080,status:'active',shot_count:12}])});
      return route.fulfill({status:501,contentType:'application/json',body:'{"error":{"message":"not used"}}'});
    });
    await page.setViewportSize(viewport); await page.goto('/productions',{waitUntil:'networkidle'});
    await expect(page.getByText('Golden Baseline QA')).toBeVisible(); await noOverflow(page);
    await page.getByRole('button',{name:/新建|New/i}).first().click(); await expect(page.getByRole('dialog')).toBeVisible(); await noOverflow(page);
    await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toBeHidden();
    await page.screenshot({path:path.join(out,`productions-${viewport.width}.png`),fullPage:true});
  });
}
