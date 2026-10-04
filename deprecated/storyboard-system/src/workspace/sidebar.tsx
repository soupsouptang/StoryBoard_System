import { Button, Checkbox, Field, Icons, Input, Popover } from '@frameforge/ui';
import type { ComponentType } from 'react';
import { useWorkspace } from './store';
import type { WorkspaceBridge } from './contracts';
const icons:Record<string,ComponentType<{size?:number}>>={table:Icons.Table2,lighting:Icons.LampDesk,moodboard:Icons.Palette,method:Icons.Layers,assets:Icons.Images,voiceover:Icons.AudioLines,review:Icons.MessageSquare,deliverables:Icons.Download,overview:Icons.ChartNoAxesCombined};
export function Sidebar({bridge}: {bridge:WorkspaceBridge}) {
  const state=useWorkspace();const prefs=state.sidebarPrefs;
  const groups=[...new Set(state.navigation.map(item=>item.group))];
  // R5 §5 稳定导航模型：未选项目（hub）时**不得隐藏模块**。
  // hub 态只是在最前追加「项目管理大厅」入口，其余分组照常渲染 ——
  // 模块需要项目上下文时由主区显示 Empty State，而不是让导航项消失。
  // R6：本组件只在 PROJECT_SELECTED 下挂载（Hub 态由 Layout 层直接不渲染 Sidebar），
  // 因此这里不再需要 hub 分支，模块顺序与分组保持稳定。
  return <nav className="ff73-navigation" aria-label="工作区导航">
    <div className="ff73-nav-scroll">{groups.map(group=>{
      const items=state.navigation.filter(item=>item.group===group&&!prefs.hidden.includes(item.key));
      return items.length>0&&<div key={group} className="ff73-nav-group"><span>{group}</span>{items.map(item=>{
        const Icon=icons[item.key]||Icons.File;const active=item.view===state.view||(item.view==='table'&&['cards','wall','timeline'].includes(state.view));
        const label=prefs.labels[item.key]||item.label;
        // data-nav-key / data-view 是端到端测试的稳定钩子：侧栏文案可被用户重命名，不能作为选择器。
        return <Button key={item.key} className="ff73-nav-item" data-nav-key={item.key} data-view={item.view} aria-label={label} title={label} aria-current={active?'page':undefined} onClick={()=>bridge.navigate(item.view)}><Icon size={16}/><span>{label}</span></Button>;
      })}</div>;
    })}</div>
    <div className="ff73-nav-footer">
      <Button className="ff73-nav-item" onClick={()=>bridge.action('projectSettings')}><Icons.Settings2 size={16}/><span>项目设置</span></Button>
      <Popover label="侧栏设置" className="ff73-sidebar-settings" trigger={<Button className="ff73-nav-item"><Icons.PanelLeft size={16}/><span>侧栏设置</span></Button>}>
        <p className="ffui-muted">调整名称和显示项。隐藏的入口可随时恢复。</p>
        {state.navigation.map(item=><div className="ff73-sidebar-setting" key={item.key}>
          <Checkbox label={`显示${item.label}`} checked={!prefs.hidden.includes(item.key)} onChange={checked=>bridge.sidebar({...prefs,hidden:checked?prefs.hidden.filter(k=>k!==item.key):[...prefs.hidden,item.key]})}/>
          <Field label={item.label}><Input aria-label={`重命名${item.label}`} maxLength={40} value={prefs.labels[item.key]??item.label} onChange={event=>bridge.sidebar({...prefs,labels:{...prefs.labels,[item.key]:event.target.value}})}/></Field>
        </div>)}<Button onClick={()=>bridge.sidebar({hidden:[],labels:{}})}>恢复默认</Button>
      </Popover>
    </div>
  </nav>;
}
