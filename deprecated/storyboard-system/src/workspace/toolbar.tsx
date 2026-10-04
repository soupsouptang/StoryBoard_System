import { Button, Field, Icons, Input, IconButton, Menu, Popover, Segmented, Select, ToggleButton } from '@frameforge/ui';
import type { WorkspaceBridge } from './contracts';
import { useWorkspace } from './store';
import { PresenceBar } from './components/PresenceBar';

function Columns({bridge}: {bridge:WorkspaceBridge}) {
  return <Button data-frameforge-column-manager-trigger="canonical" aria-controls="columnSettingsPopover" aria-expanded="false" onClick={event=>bridge.action('columns',event.currentTarget)}><Icons.Columns3 size={16}/><span>列管理</span></Button>;
}
export function WorkspaceToolbar({bridge}: {bridge:WorkspaceBridge}) {
  const state=useWorkspace();
  const activeFilters=state.filters.filter(f=>f.value!=='ALL').length;
  return <div className="ff73-toolbar-content">
    <Segmented label="分镜视图" value={state.view} onChange={bridge.navigate} options={[
      {value:'table',label:'表格',icon:<Icons.Table2 size={14}/>},{value:'cards',label:'卡片',icon:<Icons.PanelsTopLeft size={14}/>},
      {value:'wall',label:'视觉墙',icon:<Icons.LayoutGrid size={14}/>},{value:'timeline',label:'时间线',icon:<Icons.GanttChart size={14}/>}
    ]}/>
    <div className="ff73-local-search"><Icons.Search size={14}/><Input type="search" aria-label="搜索当前分镜" placeholder="搜索当前分镜…" value={state.search} onChange={e=>bridge.search(e.target.value)}/></div>
    <span className="ff73-shot-count" aria-live="polite">{state.filtered===state.total?`${state.total} 镜头`:`${state.filtered} / ${state.total}`}</span>
    <PresenceBar/>
    <div className="ff73-toolbar-actions">
      <ToggleButton pressed={state.inspectorOpen} className="inspector-toggle" title={state.inspectorOpen?'收起镜头详情':'打开镜头详情'} onClick={()=>bridge.action('inspector')}><Icons.PanelRight size={15}/><span>详情</span></ToggleButton>
      <Columns bridge={bridge}/>
      <Popover label="筛选镜头" trigger={<Button data-active={activeFilters>0}><Icons.ListFilter size={14}/>筛选{activeFilters>0&&<span className="ff73-count">{activeFilters}</span>}</Button>}>
        {state.filters.map(filter=><Field key={filter.key} label={filter.label}><Select label={filter.label} value={filter.value} options={filter.options} onChange={value=>bridge.filter(filter.key,value)}/></Field>)}
        <div className="ff73-inline ff73-space-between"><span className="ffui-muted">{state.filtered} / {state.total} 镜头</span><Button onClick={()=>bridge.action('clearFilters')} disabled={!activeFilters&&!state.search}>清除筛选</Button></div>
      </Popover>
      <Button onClick={()=>bridge.action('import')}><Icons.Upload size={14}/><span>导入</span></Button>
      <Button onClick={()=>bridge.action('pdf')}><Icons.FileDown size={14}/><span>PDF</span></Button>
      <Button className="ff73-save-refresh" data-action="saveRefresh" title="保存当前修改并重新获取服务器最新版本" aria-busy={Boolean(state.saveRefreshBusy)} onClick={()=>bridge.action('saveRefresh')} disabled={state.saveRefreshBusy}><Icons.RefreshCw size={14} aria-hidden="true"/><span>{state.saveRefreshBusy?'同步中…':'保存并刷新'}</span></Button>
      <Popover label="显示设置" trigger={<IconButton label="显示设置"><Icons.SlidersHorizontal size={15}/></IconButton>}>
        <Field label="表格行高"><Select label="表格行高" value={state.rowHeight} onChange={value=>bridge.preference('rowHeight',value)} options={[{value:'compact',label:'紧凑'},{value:'standard',label:'标准'},{value:'comfortable',label:'舒适'},{value:'auto',label:'自动'}]}/></Field>
        <Field label="视觉效果"><Select label="视觉效果" value={state.effects} onChange={value=>bridge.preference('effects',value)} options={[{value:'full',label:'标准透明与动效'},{value:'reduced',label:'减少透明与动效'}]}/></Field>
        <Button onClick={()=>bridge.action('resetLayout')}>恢复面板默认尺寸</Button>
      </Popover>
      <Menu label="更多工具" trigger={<IconButton label="更多工具"><Icons.Ellipsis size={16}/></IconButton>} items={[
        {label:'自动计时',icon:<Icons.Timer size={14}/>,onSelect:()=>bridge.action('timing')},
        {label:'保存视图配置',icon:<Icons.Bookmark size={14}/>,onSelect:()=>bridge.action('saveView')},
        {label:'在当前镜头前插入',icon:<Icons.BetweenHorizontalStart size={14}/>,onSelect:()=>bridge.action('insert')},
        {label:'交付与导出',icon:<Icons.Download size={14}/>,onSelect:()=>bridge.navigate('deliverables')}
      ]}/>
      <Button variant="primary" onClick={()=>bridge.action('addShot')}><Icons.Plus size={15}/><span>新增镜头</span></Button>
    </div>
  </div>;
}
