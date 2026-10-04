// Exercise the shared project history client: CAS, duplicate guards, ACK and failure retention.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
let slots=[],cursor=0,pending=0,enabled=true,requests=[],invalidations=[],resolve,reject,queryOptions;
let data={revision:17,can_undo:true,can_redo:false};
class ApiError extends Error {}
const react={useRef(initial){const i=cursor++;return slots[i]??={current:initial};},useState(initial){const i=cursor++;if(!(i in slots))slots[i]=initial;return[slots[i],next=>slots[i]=next];},useEffect(){}};
const client={setQueryData(key,value){assert.deepEqual(JSON.parse(JSON.stringify(key)),['project-history','P','U']);data=value;},async invalidateQueries(options){invalidations.push(options);}};
const deps={react,'@/stores/authStore':{useAuthStore:fn=>fn({user:{id:'U'}})},'@/lib/api-client':{ApiError,apiClient:(path,options)=>{requests.push({path,options});return new Promise((yes,no)=>{resolve=yes;reject=no;});}},'@tanstack/react-query':{useIsMutating:()=>pending,useQueryClient:()=>client,useQuery:options=>{queryOptions=options;return{data};},useMutation:options=>({async mutateAsync(direction){try{const next=await options.mutationFn(direction);await options.onSuccess(next);return next;}catch(error){options.onError(error);throw error;}finally{options.onSettled();}}})}};
const moduleValue={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('apps/web/lib/hooks/useProjectCommandHistory.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module:moduleValue,exports:moduleValue.exports,require:n=>deps[n],Error,window:{addEventListener(){},removeEventListener(){}}});
function render(){cursor=0;return moduleValue.exports.useProjectCommandHistory('P',enabled);}
(async()=>{
 let hook=render();assert.equal(queryOptions.enabled,true);assert.equal(await hook.run('redo'),false);assert.equal(requests.length,0);
 pending=1;hook=render();assert.equal(await hook.run('undo'),false);pending=0;
 enabled=false;hook=render();assert.equal(queryOptions.enabled,false);assert.equal(await hook.run('undo'),false);enabled=true;
 hook=render();const first=hook.run('undo');assert.equal(await hook.run('undo'),false,'Duplicate dispatch is blocked before rerender');assert.equal(requests.length,1);assert.equal(requests[0].path,'/api/v1/productions/P/history/undo');assert.equal(requests[0].options.json.revision,17);
 resolve({revision:18,can_undo:false,can_redo:true});assert.equal(await first,true);assert.ok(invalidations.length);hook=render();assert.equal(hook.data.revision,18);
 const failure=hook.run('redo');reject(new ApiError('409 conflict'));assert.equal(await failure,false);hook=render();assert.equal(hook.message,'409 conflict');assert.equal(hook.data.revision,18,'Failure cannot advance the confirmed cursor');
 const retry=hook.run('redo');assert.equal(requests[2].options.json.revision,18);resolve({revision:19,can_undo:true,can_redo:false});assert.equal(await retry,true);hook=render();assert.equal(hook.message,null);
 console.log('Shared history CAS, ACK, duplicate/pending/disabled guards and failure recovery passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
