import { createRoot } from 'react-dom/client';
import { UIProvider } from '@frameforge/ui';
import { WorkspaceToolbar } from './toolbar';
import { Sidebar } from './sidebar';
import { publish } from './store';
import type { Snapshot, WorkspaceBridge } from './contracts';

const horizontalScrollSelector='.ff73-toolbar-actions,.table-wrap,.ff73-toolbar-content > .ffui-segmented';
const observedScrollTargets=new WeakSet<HTMLElement>();
let horizontalScrollResizeObserver:ResizeObserver|null=null;

function updateHorizontalScrollEdges(target:HTMLElement){
  const maxScroll=Math.max(0,target.scrollWidth-target.clientWidth);
  const canScroll=maxScroll>2;
  target.dataset.horizontalScrollable=String(canScroll);
  target.style.setProperty('--ff73-fade-left',canScroll&&target.scrollLeft>2?'18px':'0px');
  target.style.setProperty('--ff73-fade-right',canScroll&&target.scrollLeft<maxScroll-2?'18px':'0px');
  target.style.setProperty('--ff73-fade-safe-right',target.matches('.ff73-toolbar-actions')&&canScroll&&target.scrollLeft<maxScroll-2?'202px':'0px');
}

function observeHorizontalScrollEdges(root:ParentNode=document){
  const targets:HTMLElement[]=[];
  if(root instanceof HTMLElement&&root.matches(horizontalScrollSelector))targets.push(root);
  root.querySelectorAll<HTMLElement>(horizontalScrollSelector).forEach(target=>targets.push(target));
  targets.forEach(target=>{
    updateHorizontalScrollEdges(target);
    if(observedScrollTargets.has(target))return;
    observedScrollTargets.add(target);
    target.addEventListener('scroll',()=>updateHorizontalScrollEdges(target),{passive:true});
    horizontalScrollResizeObserver??=new ResizeObserver(entries=>entries.forEach(entry=>updateHorizontalScrollEdges(entry.target as HTMLElement)));
    horizontalScrollResizeObserver.observe(target);
  });
}

const workspaceUI={
  ready:false,
  bridge:null as WorkspaceBridge|null,
  sidebarMounted:false,
  mount(bridge:WorkspaceBridge){
    if(this.ready)return;
    const toolbar=document.querySelector('.workspace-toolbar');const sidebar=document.querySelector('#appSidebar');
    if(!toolbar||!sidebar)return;
    this.bridge=bridge;
    const toolbarRoot=document.createElement('div');toolbarRoot.id='workspaceToolbarV73';toolbarRoot.className='ff73-toolbar-root';
    // The compatibility nodes keep existing command handlers alive during migration.
    // They are not a second UI and cannot receive focus.
    toolbar.querySelectorAll<HTMLElement>(':scope > .toolbar-left, :scope > .toolbar-right').forEach(node=>{node.hidden=true;node.inert=true;});
    toolbar.prepend(toolbarRoot);
    createRoot(toolbarRoot).render(<UIProvider><WorkspaceToolbar bridge={bridge}/></UIProvider>);
    document.body.dataset.uiVersion='7.3';this.ready=true;
    observeHorizontalScrollEdges();
    const scrollTargetObserver=new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(node=>{
      if(node instanceof HTMLElement)observeHorizontalScrollEdges(node);
    })));
    [toolbar,document.querySelector('#workspaceMain')].forEach(root=>root&&scrollTargetObserver.observe(root,{childList:true,subtree:true}));
    window.addEventListener('resize',()=>observeHorizontalScrollEdges(),{passive:true});
    this.syncSidebar(false);
  },
  /**
   * R6：Layout 层按顶层 App Context 直接分支，而不是在同一个 Sidebar 里隐藏模块。
   *   PROJECT_HUB      → 不渲染 Workspace Sidebar，整块侧栏容器从布局移除（真实卸载，非 CSS 伪装）
   *   PROJECT_SELECTED → 挂载完整 Workspace Sidebar，模块顺序保持稳定
   */
  syncSidebar(show:boolean){
    const sidebar=document.querySelector<HTMLElement>('#appSidebar');
    if(!sidebar||!this.bridge)return;
    // 以真实 DOM 是否挂载为准，而不是标志位 —— 否则首次 Hub 态
    // （false === false）会被短路掉，导致侧栏从未被隐藏。
    const isMounted=!!sidebar.querySelector('#workspaceSidebarV73');
    if(show===isMounted){
      sidebar.hidden=!show;                       // 幂等校正，保证占位状态正确
      document.body.dataset.appContext=show?'project':'hub';
      this.sidebarMounted=show;
      return;
    }
    if(show){
      const root=document.createElement('div');root.id='workspaceSidebarV73';
      sidebar.replaceChildren(root);
      createRoot(root).render(<UIProvider><Sidebar bridge={this.bridge}/></UIProvider>);
      sidebar.hidden=false;
    }else{
      // 卸载 React 树并移除布局占位，避免出现空白 Sidebar
      sidebar.replaceChildren();
      sidebar.hidden=true;
    }
    this.sidebarMounted=show;
    document.body.dataset.appContext=show?'project':'hub';
  },
  update(snapshot:Snapshot){
    document.body.dataset.shotWorkspace=String(['table','cards','wall','timeline'].includes(snapshot.view)&&snapshot.context==='project');
    this.syncSidebar(snapshot.context==='project');
    publish(snapshot);
  }
};
Object.assign(globalThis,{FrameForgeUI:workspaceUI});
