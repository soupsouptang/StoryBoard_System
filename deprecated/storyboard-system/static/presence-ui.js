/* Shared, layout-independent multiplayer UI. No document content is replicated here. */
(() => {
  const fieldNames = {title:'镜头名称',chapter:'章节',scene:'场景',description:'画面描述',voiceover:'旁白',duration_seconds:'时长',lens:'焦段',shot_size:'景别',thumb:'分镜画面',panels:'分镜画面'};
  const color = value => /^#[0-9a-f]{6}$/i.test(value || '') ? value : '#9678c4';
  let config, people = [], selection = null, following = null, applying = false, lastFollow = '', frame = 0;
  let lastGood = Date.now(), connection = 'connected', recoveryTimer, popover;
  const layer = document.createElement('div');
  layer.className = 'multiplayer-layer';
  layer.setAttribute('aria-hidden','true');
  const nodes = new Map();
  function visibleRect(el) {
    if (!el?.getClientRects().length) return null;
    const rect=el.getBoundingClientRect();
    let left=Math.max(0,rect.left), top=Math.max(0,rect.top), right=Math.min(innerWidth,rect.right), bottom=Math.min(innerHeight,rect.bottom);
    for(let p=el.parentElement;p&&p!==document.body;p=p.parentElement) {
      const style=getComputedStyle(p), box=p.getBoundingClientRect();
      if(/auto|scroll|hidden|clip/.test(style.overflowX)){left=Math.max(left,box.left);right=Math.min(right,box.right);}
      if(/auto|scroll|hidden|clip/.test(style.overflowY)){top=Math.max(top,box.top);bottom=Math.min(bottom,box.bottom);}
    }
    return right>left&&bottom>top ? {left,top,width:right-left,height:bottom-top} : null;
  }
  function target(person, rowOnly=false) {
    const id=CSS.escape(person.shot_id || '');
    const field=CSS.escape(person.field || '');
    const selectors = rowOnly
      ? [`#mainShotTable tr[data-id="${id}"] .shot-number-cell`,`#mainShotTable tr[data-id="${id}"]`,`.shot-card[data-id="${id}"]`,`.wall-item[data-id="${id}"]`]
      : [`#mainShotTable td[data-shot-id="${id}"][data-field="${field}"]`];
    if (!rowOnly) selectors.push(`.shot-card[data-id="${id}"] [data-card-copy="${field}"]`, `.shot-card[data-id="${id}"] [data-field="${field}"]`, `.wall-item[data-id="${id}"] [data-field="${field}"]`);
    if (!rowOnly && person.field === 'voiceover') selectors.push(`.script-voiceover[data-rich-voiceover="${id}"]`);
    if(!rowOnly && config?.context().shotId===person.shot_id) selectors.push(`#inspectorSlot [data-field="${field}"]`);
    for(const selector of selectors){
      const el=[...document.querySelectorAll(selector)].find(item=>item.getClientRects().length&&(!rowOnly||visibleRect(item)));
      if(el)return el;
    }
    // A field can be temporarily absent while another view is rebuilding.
    // Keep the collaborator visible on the owning row/card instead of
    // dropping the presence frame entirely.
    if(!rowOnly){
      const fallback = [`#mainShotTable tr[data-id="${id}"]`, `.shot-card[data-id="${id}"]`, `.wall-item[data-id="${id}"]`];
      for(const selector of fallback){const el=[...document.querySelectorAll(selector)].find(item=>item.getClientRects().length);if(el)return el;}
    }
    return null;
  }
  function ensure(key, className) {
    let node=nodes.get(key);
    if(!node){node=document.createElement('div');node.className=className;layer.append(node);nodes.set(key,node);}
    return node;
  }
  function draw() {
    frame=0;
    if(!config)return;
    const context=config.context(), used=new Set(), groups=new Map(), rows=new Map();
    const active=connection==='offline'||document.hidden?[]:people.filter(p=>String(p.user_id)!==String(context.userId)&&p.status!=='idle'&&p.presence_state!=='idle');
    for(const person of active){
      if(!person.shot_id || person.presence_state !== 'editing' || !person.field)continue;
      const row=rows.get(person.shot_id)||[];row.push(person);rows.set(person.shot_id,row);
      if(person.field&&person.presence_state==='editing'){const key=person.shot_id+':'+person.field;const group=groups.get(key)||[];group.push(person);groups.set(key,group);}
    }
    for(const [key,members] of groups){
      members.sort((a,b)=>Number(b.presence_state==='editing')-Number(a.presence_state==='editing')||String(a.user_id).localeCompare(String(b.user_id)));
      const person=members[0], el=target(person), rect=visibleRect(el);if(!rect)continue;
      const node=ensure('cell:'+key,'multiplayer-cell');used.add('cell:'+key);
      const localEditing=el.matches('[contenteditable=true]')||el.querySelector('input,textarea,[contenteditable=true]');
      node.classList.toggle('local-editing',Boolean(localEditing));
      node.classList.add('is-present');
      node.style.cssText=`left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;--presence-color:${color(person.color)}`;
      const editing=members.filter(p=>p.presence_state==='editing');
      node.classList.toggle('is-editing', editing.length > 0);
      node.replaceChildren();
    }
    for(const [id,members]of rows){
      const rect=visibleRect(target(members[0],true));if(!rect)continue;
      const node=ensure('row:'+id,'multiplayer-row');used.add('row:'+id);
      node.style.left=`${Math.max(rect.left,rect.left+rect.width-66)}px`;node.style.top=`${rect.top}px`;node.replaceChildren();
      for(const person of members.slice(0,3)){const avatar=document.createElement('span');avatar.className='multiplayer-mini-avatar';avatar.style.setProperty('--presence-color',color(person.color));avatar.textContent=Array.from(person.display_name||'?')[0];node.append(avatar);}
      if(members.length>3){const more=document.createElement('span');more.className='multiplayer-mini-avatar';more.textContent=`+${members.length-3}`;node.append(more);}
    }
    for(const[key,node]of nodes)if(!used.has(key)){node.remove();nodes.delete(key);}
  }
  function schedule(){if(!frame)frame=requestAnimationFrame(draw);}
  async function waitForTarget(person,rowOnly=true,timeout=1500){
    const started=performance.now();
    while(performance.now()-started<timeout){
      const el=target(person,rowOnly);
      if(el)return el;
      await new Promise(resolve=>requestAnimationFrame(resolve));
    }
    return target(person,rowOnly);
  }
  function stopFollow(){following=null;lastFollow='';document.querySelector('.multiplayer-follow')?.remove();}
  async function locate(person, follow=false){
    if(!person)return;
    if(document.querySelector('.is-rich-editing,.inline-cell-editor,.property-inline-editor')){config.notice('请先结束当前编辑，再定位协作者');return;}
    applying=true;
    try{
      if(person.workspace!==config.context().view)await config.navigate(person.workspace);
      if(follow&&person.shot_id)config.select(person.shot_id);
      const el=await waitForTarget(person,true);
      if(el)el.scrollIntoView({block:'center',inline:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
      else if(!follow)config.notice('该协作者所在镜头不在当前视图中，可使用跟随');
    }finally{applying=false;}
  }
  function follow(person){
    stopFollow();following=person.user_id;
    const bar=document.createElement('div');bar.className='multiplayer-follow';
    const text=document.createElement('span');text.textContent=`正在跟随 ${person.display_name||'协作者'}`;
    const close=document.createElement('button');close.type='button';close.textContent='×';close.setAttribute('aria-label','退出跟随');close.onclick=stopFollow;
    bar.append(text,close);document.body.append(bar);locate(person,true);
  }
  function openMember(person, anchor){
    popover?.remove();popover=document.createElement('div');popover.className='multiplayer-member';popover.setAttribute('role','dialog');popover.setAttribute('aria-label','协作者位置');
    const name=document.createElement('strong');name.textContent=person.display_name||'协作者';
    const detail=document.createElement('p');detail.textContent=`${config.label(person)}${person.field?' · '+(fieldNames[person.field]||person.field):''}`;
    const jump=document.createElement('button');jump.type='button';jump.textContent='定位';jump.onclick=()=>{locate(person);popover.remove();};
    const followButton=document.createElement('button');followButton.type='button';followButton.textContent='跟随';followButton.onclick=()=>{follow(person);popover.remove();};
    popover.append(name,detail,jump,followButton);document.body.append(popover);
    const rect=anchor.getBoundingClientRect();popover.style.left=`${Math.max(8,Math.min(rect.right-220,innerWidth-228))}px`;popover.style.top=`${Math.min(rect.bottom+8,innerHeight-160)}px`;jump.focus();
  }
  function setConnection(ok){
    if(ok){lastGood=Date.now();if(connection==='connected')return;connection='connected';}
    else connection=!navigator.onLine||Date.now()-lastGood>12000?'offline':'reconnecting';
    let indicator=document.querySelector('.multiplayer-connection');
    if(!indicator){indicator=document.createElement('span');indicator.className='multiplayer-connection';indicator.setAttribute('role','status');document.querySelector('#presenceCluster')?.after(indicator);}
    indicator.textContent=connection==='offline'?'Offline':connection==='reconnecting'?'Reconnecting…':'Connected';
    clearTimeout(recoveryTimer);if(ok)recoveryTimer=setTimeout(()=>indicator.remove(),1800);
    if(connection==='offline'){document.querySelectorAll('.remote-presence-cursor').forEach(el=>el.classList.remove('is-visible'));stopFollow();}
    schedule();
  }
  window.FrameForgePresenceUI={
    install(options){
      if(config)return;config=options;document.body.append(layer);
      document.addEventListener('scroll',schedule,{capture:true,passive:true});window.addEventListener('resize',schedule);
      document.addEventListener('pointerdown',event=>{
        if(popover&&!popover.contains(event.target)&&!event.target.closest('#presenceCluster'))popover.remove();
        const cell=event.target.closest('[data-shot-id][data-field]');
        if(cell){selection={shotId:cell.dataset.shotId,field:cell.dataset.field};options.changed();}
      },true);
      document.addEventListener('click',event=>{const avatar=event.target.closest('#presenceCluster [data-presence-user]');if(avatar){const person=people.find(p=>String(p.user_id)===avatar.dataset.presenceUser);if(person&&person.user_id!==config.context().userId)openMember(person,avatar);}});
      document.addEventListener('keydown',event=>{if(event.key==='Escape'){stopFollow();popover?.remove();}if(['Enter',' '].includes(event.key)&&event.target.matches('#presenceCluster [data-presence-user]')){event.preventDefault();event.target.click();}});
      window.addEventListener('offline',()=>setConnection(false));window.addEventListener('online',()=>options.changed());
      document.addEventListener('visibilitychange',()=>{if(document.hidden){selection=null;stopFollow();}options.changed();schedule();});
    },
    update(next){people=next||[];schedule();
      document.querySelectorAll('#presenceCluster [data-presence-user]').forEach(el=>{el.tabIndex=0;el.setAttribute('role','button');const p=people.find(p=>String(p.user_id)===el.dataset.presenceUser);if(p)el.title=`${p.display_name||'协作者'} · ${config.label(p)}${p.field?' · '+(fieldNames[p.field]||p.field):''}`;});
      if(following&&!applying){const p=people.find(p=>p.user_id===following);if(!p){stopFollow();return;}const key=p.workspace+':'+p.shot_id;if(key!==lastFollow){lastFollow=key;locate(p,true);}}
    },
    selection:()=>selection,
    manual(clearSelection=false){if(!applying){if(clearSelection)selection=null;stopFollow();}},
    connection:setConnection,
    lockedBy(shotId,field){return people.find(p=>p.user_id!==config?.context().userId&&p.shot_id===shotId&&p.field===field&&p.presence_state==='editing'&&p.status!=='idle');}
  };
})();
