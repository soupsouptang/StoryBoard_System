import * as React from 'react';
import { Checkbox as Check, Dialog, DropdownMenu, Popover as Pop, Select as Choice, ToggleGroup, Tooltip } from 'radix-ui';
import { Check as CheckIcon, ChevronDown, X, GripVertical, Table2, PanelsTopLeft,
  LayoutGrid, GanttChart, Search, PanelRight, Columns3, EyeOff, Trash2, Plus,
  ListFilter, Upload, FileDown, SlidersHorizontal, Ellipsis, Timer, Bookmark,
  BetweenHorizontalStart, Download, Folder, LampDesk, Palette, Layers, Images,
  AudioLines, MessageSquare, ChartNoAxesCombined, File, Settings2, PanelLeft, RefreshCw } from 'lucide-react';
import { DndContext, PointerSensor, KeyboardSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, sortableKeyboardCoordinates, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
export { Toaster, toast } from 'sonner';
export { Command } from 'cmdk';
export { motion, AnimatePresence, useReducedMotion } from 'motion/react';
export { motionTokens, MotionIcon, WorkspaceTransition } from './motion';
export type { MotionState } from './motion';
// Floating controls keep their own state unless open is supplied. Controlled
// callers must update open from onOpenChange; Radix retains focus and dismissal.
export type OverlayOpenState = {open?:boolean; onOpenChange?:(open:boolean)=>void};
const floatingPlacement = {align:'end' as const, collisionPadding:12};
export const Icons = { Table2, PanelsTopLeft, LayoutGrid, GanttChart, Search,
  PanelRight, Columns3, EyeOff, Trash2, Plus, ListFilter, Upload, FileDown,
  SlidersHorizontal, Ellipsis, Timer, Bookmark, BetweenHorizontalStart, Download,
  Folder, LampDesk, Palette, Layers, Images, AudioLines, MessageSquare,
  ChartNoAxesCombined, File, Settings2, PanelLeft, RefreshCw };

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' };
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button({variant='ghost', className='', type='button', ...props}, ref) {
  return <button ref={ref} type={type} className={`ffui-button ffui-${variant} ${className}`} {...props}/>;
});
export const ToggleButton = React.forwardRef<HTMLButtonElement, ButtonProps & {pressed:boolean}>(function ToggleButton({pressed, className='', ...props}, ref) {
  return <Button ref={ref} className={`ffui-toggle-button ${className}`} aria-pressed={pressed} data-state={pressed?'on':'off'} {...props}/>;
});
export function UIProvider({children}: React.PropsWithChildren) { return <Tooltip.Provider delayDuration={450}>{children}</Tooltip.Provider>; }
export const IconButton = React.forwardRef<HTMLButtonElement, ButtonProps & {label:string}>(function IconButton({label, children, ...props}, ref) {
  return <Tooltip.Root><Tooltip.Trigger asChild><Button {...props} ref={ref} aria-label={label} className={`ffui-icon-button ${props.className || ''}`}>{children}</Button></Tooltip.Trigger>
    <Tooltip.Portal><Tooltip.Content className="ffui-tooltip" sideOffset={6}>{label}</Tooltip.Content></Tooltip.Portal></Tooltip.Root>;
});
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({className='', ...props}, ref) {
  return <input ref={ref} className={`ffui-input ${className}`} {...props}/>;
});
export const TextArea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function TextArea({className='', ...props}, ref) {
  return <textarea ref={ref} className={`ffui-textarea ${className}`} {...props}/>;
});
export function Field({label, children}: React.PropsWithChildren<{label:string}>) { return <label className="ffui-field"><span>{label}</span>{children}</label>; }
export type Option = { value:string; label:string; disabled?:boolean };
export function Select({label, value, options, onChange, disabled}: {label:string; value:string; options:Option[]; onChange:(value:string)=>void; disabled?:boolean}) {
  return <Choice.Root value={value} onValueChange={onChange} disabled={disabled}>
    <Choice.Trigger className="ffui-select" aria-label={label}><Choice.Value/><Choice.Icon><ChevronDown size={14}/></Choice.Icon></Choice.Trigger>
    <Choice.Portal><Choice.Content className="ffui-menu" position="popper" sideOffset={5} collisionPadding={12}>
      <Choice.Viewport>{options.map(option=><Choice.Item className="ffui-option" value={option.value} key={option.value} disabled={option.disabled}>
        <Choice.ItemText>{option.label}</Choice.ItemText><Choice.ItemIndicator><CheckIcon size={14}/></Choice.ItemIndicator>
      </Choice.Item>)}</Choice.Viewport>
    </Choice.Content></Choice.Portal>
  </Choice.Root>;
}
export function Segmented({label, value, options, onChange}: {label:string; value:string; options:(Option & {icon?:React.ReactNode})[]; onChange:(value:string)=>void}) {
  return <ToggleGroup.Root className="ffui-segmented" type="single" value={value} onValueChange={next=>{if(next)onChange(next);}} aria-label={label}>
    {/* data-view 是给端到端测试用的稳定钩子；旧 DOM 视图切换按钮被 React 外壳刻意隐藏，
        没有它回归脚本只能依赖 aria-label 文案。 */}
    {options.map(option=><ToggleGroup.Item key={option.value} value={option.value} data-view={option.value} aria-label={option.label} disabled={option.disabled} className="ffui-segment">{option.icon}<span>{option.label}</span></ToggleGroup.Item>)}
  </ToggleGroup.Root>;
}
export function Checkbox({label, checked, onChange, disabled}: {label:string; checked:boolean; onChange:(checked:boolean)=>void; disabled?:boolean}) {
  return <Check.Root className="ffui-checkbox" aria-label={label} checked={checked} onCheckedChange={value=>onChange(value===true)} disabled={disabled}><Check.Indicator><CheckIcon size={12}/></Check.Indicator></Check.Root>;
}
const OverlayCloseButton = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & {label:string; size?:number}>(function OverlayCloseButton({label, size=14, className='', ...props}, ref) {
  return <Button {...props} ref={ref} className={`ffui-icon-button ${className}`} aria-label={`关闭${label}`}><X size={size}/></Button>;
});
export function Popover({label, trigger, children, className='', open, onOpenChange}: React.PropsWithChildren<{label:string; trigger:React.ReactNode; className?:string} & OverlayOpenState>) {
  return <Pop.Root open={open} onOpenChange={onOpenChange}><Pop.Trigger asChild>{trigger}</Pop.Trigger><Pop.Portal>
    <Pop.Content aria-label={label} className={`ffui-popover ${className}`} {...floatingPlacement} sideOffset={8}>
      <div className="ffui-popover-head"><strong>{label}</strong><Pop.Close asChild><OverlayCloseButton label={label}/></Pop.Close></div>{children}
    </Pop.Content></Pop.Portal></Pop.Root>;
}
export type MenuAction = {id?:string; label:string; onSelect:()=>void; disabled?:boolean; danger?:boolean; icon?:React.ReactNode};
// Toolbar menus are non-modal: outside pointer input dismisses them, while
// Radix retains Escape, keyboard navigation and trigger focus restoration.
export function Menu({label, trigger, items, open, onOpenChange}: {label:string; trigger:React.ReactNode; items:MenuAction[]} & OverlayOpenState) {
  return <DropdownMenu.Root modal={false} open={open} onOpenChange={onOpenChange}><DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger><DropdownMenu.Portal>
    <DropdownMenu.Content aria-label={label} className="ffui-menu" {...floatingPlacement} sideOffset={6}>
      {items.map((item,index)=><DropdownMenu.Item key={item.id??`${item.label}:${index}`} className={`ffui-option ${item.danger?'ffui-danger-text':''}`} disabled={item.disabled} onSelect={item.onSelect}>{item.icon}{item.label}</DropdownMenu.Item>)}
    </DropdownMenu.Content></DropdownMenu.Portal></DropdownMenu.Root>;
}
// Pass trigger for automatic focus restoration; programmatic callers own that
// step when they intentionally open a modal without a visible trigger.
export function Modal({title, description, open, onOpenChange, trigger, children}: React.PropsWithChildren<{title:string;description:string;open:boolean;onOpenChange:(open:boolean)=>void;trigger?:React.ReactNode}>) {
  return <Dialog.Root open={open} onOpenChange={onOpenChange}>{trigger&&<Dialog.Trigger asChild>{trigger}</Dialog.Trigger>}<Dialog.Portal><Dialog.Overlay className="ffui-overlay"/><Dialog.Content className="ffui-dialog">
    <div className="ffui-popover-head"><Dialog.Title>{title}</Dialog.Title><Dialog.Close asChild><OverlayCloseButton label={title} size={16}/></Dialog.Close></div>
    <Dialog.Description className="ffui-muted">{description}</Dialog.Description>{children}
  </Dialog.Content></Dialog.Portal></Dialog.Root>;
}
function SortableItem({id, label, children}: React.PropsWithChildren<{id:string;label:string}>) {
  const {attributes,listeners,setNodeRef,transform,transition,isDragging}=useSortable({id});
  return <div ref={setNodeRef} className="ffui-sortable-row" style={{transform:CSS.Transform.toString(transform),transition,opacity:isDragging?.4:1}}>
    <Button {...attributes} {...listeners} aria-label={`调整${label}顺序`} className="ffui-drag-handle"><GripVertical size={14}/></Button>{children}
  </div>;
}
export function SortableList<T extends {id:string;label:string}>({items,onReorder,render}: {items:T[];onReorder:(ids:string[])=>void;render:(item:T)=>React.ReactNode}) {
  const sensors=useSensors(useSensor(PointerSensor,{activationConstraint:{distance:5}}),useSensor(KeyboardSensor,{coordinateGetter:sortableKeyboardCoordinates}));
  return <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={({active,over})=>{
    if(!over || active.id===over.id)return;
    const ids=items.map(item=>item.id);onReorder(arrayMove(ids,ids.indexOf(String(active.id)),ids.indexOf(String(over.id))));
  }}><SortableContext items={items.map(item=>item.id)} strategy={verticalListSortingStrategy}>{items.map(item=><SortableItem id={item.id} label={item.label} key={item.id}>{render(item)}</SortableItem>)}</SortableContext></DndContext>;
}
