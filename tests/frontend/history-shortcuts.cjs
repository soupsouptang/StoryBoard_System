// Exercise actual dispatch policy: app commands must not steal editor history.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
class Element {constructor(selector=''){this.selector=selector;} closest(){return !!this.selector;}}
let dialog=false;
const document={body:{dataset:{}},querySelector:()=>dialog};
const mod={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('apps/web/lib/history-shortcuts.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module:mod,exports:mod.exports,Element,document});
const shortcut=mod.exports.historyShortcut;
const event={key:'z',target:new Element(),ctrlKey:true,metaKey:false,shiftKey:false,altKey:false,defaultPrevented:false,isComposing:false,repeat:false};
assert.equal(shortcut(event),'undo');
assert.equal(shortcut({...event,ctrlKey:false,metaKey:true}),'undo');
assert.equal(shortcut({...event,shiftKey:true}),'redo');
assert.equal(shortcut({...event,key:'y'}),'redo');
assert.equal(shortcut({...event,key:'y',ctrlKey:false,metaKey:true}),null);
for(const flag of ['isComposing','repeat','defaultPrevented','altKey'])assert.equal(shortcut({...event,[flag]:true}),null);
for(const selector of ['input','textarea','contenteditable','select','local-editor'])assert.equal(shortcut({...event,target:new Element(selector)}),null);
dialog=true;assert.equal(shortcut(event),null);assert.equal(shortcut(event,true),'undo');assert.equal(shortcut({...event,key:'y'},true),'redo');dialog=false;
document.body.dataset.historyGesture='resize';assert.equal(shortcut(event),null);
console.log('History keyboard policy passed: both platforms, native editor ownership, overlays and gestures.');
