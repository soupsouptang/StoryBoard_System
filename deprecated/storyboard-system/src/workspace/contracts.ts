import type { Option } from '@frameforge/ui';

export type Column = {field:string; label:string; fixed:boolean; status:'visible'|'hidden'|'archived'};
export type NavigationItem = {key:string;view:string;group:string;label:string;icon:string};

export interface ShotItem {
  id: string;
  projectId: string;
  position: number;
  number: string;
  sortIndex: number;
  title: string;
  description: string;
  action: string;
  dialogue: string;
  voiceover: string;
  durationFrames: number;
  shotSize: string;
  lens: string;
  movement: string;
  status: string;
  revision: number;
  updatedAt: string;
  thumbnailUrl?: string;
  customFields?: Record<string, any>;
}

export interface PresenceUser {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  color: string;
  workspace: string;
  shotId?: string | null;
  field?: string | null;
  presenceState: 'idle' | 'viewing' | 'selected' | 'editing';
}

export interface InspectorState {
  open: boolean;
  shotId: string | null;
  mode: 'docked' | 'overlay';
  activeTab: 'details' | 'camera' | 'audio' | 'revisions' | 'ai';
}

export type Snapshot = {
  projectId:string; context:string; view:string; search:string; total:number; filtered:number;
  inspectorOpen:boolean; columns:Column[]; columnOrder:string[];
  filters:{key:string;label:string;value:string;options:Option[]}[];
  navigation:NavigationItem[]; sidebarPrefs:{hidden:string[];labels:Record<string,string>};
  rowHeight:string; effects:string; saveRefreshBusy?:boolean;
  // Extended state properties for React views
  shots?: ShotItem[];
  selectedShotIds?: string[];
  activeShotId?: string | null;
  inspector?: InspectorState;
  presenceUsers?: PresenceUser[];
};

export interface WorkspaceBridge {
  navigate:(view:string)=>void;
  action:(name:string,anchor?:HTMLElement|null)=>void;
  search:(value:string)=>void;
  filter:(key:string,value:string)=>void;
  column:(field:string,action:'hide'|'show'|'remove'|'restore')=>void;
  reorderColumns:(ids:string[])=>void;
  sidebar:(prefs:Snapshot['sidebarPrefs'])=>void;
  preference:(key:'rowHeight'|'effects',value:string)=>void;
  // Extended bridge methods for React workspace
  selectShot?:(id:string, multi?:boolean)=>void;
  openInspector?:(shotId:string, mode?:'docked'|'overlay')=>void;
  closeInspector?:()=>void;
  updateShot?:(shotId:string, updates:Partial<ShotItem>)=>void;
}
