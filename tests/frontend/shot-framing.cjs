const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const loaded={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('apps/web/lib/shot-framing.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{module:loaded,exports:loaded.exports,require:()=>({})});
const {projectFrameRatio,fullFrame,panFraming,zoomFraming}=loaded.exports;
assert.equal(projectFrameRatio('2.35:1').value,'47:20');
assert.equal(projectFrameRatio('16:9').ratio,16/9);
for(const ratio of ['16:9','2.35:1','9:16']){
 const frame=fullFrame(ratio,1920,1080),c=frame.crop;
 assert.ok(c.x>=0&&c.y>=0&&c.x+c.width<=1&&c.y+c.height<=1);
 assert.ok(Math.abs((1920*c.width)/(1080*c.height)-projectFrameRatio(ratio).ratio)<1e-9);
 const pan=panFraming(frame,40,-20,400,225);
 const zoom=zoomFraming(pan,2);
 assert.ok(Math.abs(pan.translation_x*pan.scale-zoom.translation_x*zoom.scale)<1e-9,'Zoom preserves the image center after panning');
 assert.equal(zoomFraming(frame,0).scale,.5);
 assert.equal(zoomFraming(frame,100).scale,3);
 assert.equal(fullFrame(ratio,1920,1080).translation_x,0);
}
assert.throws(()=>projectFrameRatio('custom'));
assert.throws(()=>projectFrameRatio('0:1'));
console.log('Project frame ratios, cover, pan coordinates, centered zoom and limits passed.');
