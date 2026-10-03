import { create } from 'zustand';

export type StoryboardViewMode = 'grid' | 'wall' | 'table' | 'timeline';
export type CardSize = 'sm' | 'md' | 'lg';

export interface FilterState {
  searchQuery: string;
  sequenceId: string;
  primaryMethod: string;
  department: string;
  status: string;
  timingLocked: boolean | null;
  vfxRequired: boolean | null;
}

interface WorkspaceState {
  viewMode: StoryboardViewMode;
  cardSize: CardSize;
  groupBySequence: boolean;
  filters: FilterState;
  selectedShotIds: string[];
  lastSelectedId: string | null;
  inspectedShotId: string | null;
  isInspectorOpen: boolean;
  isVOTimingModalOpen: boolean;
  isNewShotModalOpen: boolean;
  isImportModalOpen: boolean;

  // Actions
  setViewMode: (mode: StoryboardViewMode) => void;
  setCardSize: (size: CardSize) => void;
  setGroupBySequence: (val: boolean) => void;
  setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  resetFilters: () => void;
  selectShot: (id: string, isShift?: boolean, isCtrlOrCmd?: boolean, allIds?: string[]) => void;
  selectAllShots: (allIds: string[]) => void;
  clearSelection: () => void;
  openInspector: (shotId: string) => void;
  inspectorCloseGuard: (() => boolean) | null;
  setInspectorCloseGuard: (guard: (() => boolean) | null) => void;
  closeInspector: () => void;
  toggleInspector: () => void;
  setVOTimingModalOpen: (open: boolean) => void;
  setNewShotModalOpen: (open: boolean) => void;
  setImportModalOpen: (open: boolean) => void;
}

const DEFAULT_FILTERS: FilterState = {
  searchQuery: '',
  sequenceId: 'all',
  primaryMethod: 'all',
  department: 'all',
  status: 'all',
  timingLocked: null,
  vfxRequired: null
};

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  viewMode: 'grid',
  cardSize: 'md',
  groupBySequence: true,
  filters: DEFAULT_FILTERS,
  selectedShotIds: [],
  lastSelectedId: null,
  inspectedShotId: null,
  isInspectorOpen: false,
  inspectorCloseGuard: null,
  isVOTimingModalOpen: false,
  isNewShotModalOpen: false,
  isImportModalOpen: false,

  setViewMode: viewMode => set({ viewMode }),
  setCardSize: cardSize => set({ cardSize }),
  setGroupBySequence: groupBySequence => set({ groupBySequence }),

  setFilter: (key, value) => {
    if (get().filters[key] === value) return;
    // Filtering can unmount the inspected row. Resolve its draft first.
    if (get().isInspectorOpen) {
      get().closeInspector();
      if (get().isInspectorOpen) return;
    }
    set(state => ({ filters: { ...state.filters, [key]: value } }));
  },

  resetFilters: () => {
    if (get().isInspectorOpen) {
      get().closeInspector();
      if (get().isInspectorOpen) return;
    }
    set({ filters: DEFAULT_FILTERS });
  },

  selectShot: (id, isShift = false, isCtrlOrCmd = false, allIds = []) => {
    const state = get();
    if (state.isInspectorOpen && state.inspectedShotId !== id) state.closeInspector();
    const { selectedShotIds, lastSelectedId } = get();

    if (isShift && lastSelectedId && allIds.length > 0) {
      const startIdx = allIds.indexOf(lastSelectedId);
      const endIdx = allIds.indexOf(id);
      if (startIdx !== -1 && endIdx !== -1) {
        const [low, high] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
        const range = allIds.slice(low, high + 1);
        const next = isCtrlOrCmd ? Array.from(new Set([...selectedShotIds, ...range])) : range;
        set({ selectedShotIds: next });
        return;
      }
    }

    if (isCtrlOrCmd) {
      const exists = selectedShotIds.includes(id);
      const next = exists
        ? selectedShotIds.filter(sId => sId !== id)
        : [...selectedShotIds, id];
      set({ selectedShotIds: next, lastSelectedId: id });
      return;
    }

    // Default single select
    set({ selectedShotIds: [id], lastSelectedId: id });
  },

  selectAllShots: allIds => set({ selectedShotIds: [...new Set(allIds)], lastSelectedId: allIds[0] ?? null }),
  clearSelection: () => set({ selectedShotIds: [], lastSelectedId: null }),

  openInspector: shotId => {
    const state = get();
    if (state.isInspectorOpen && state.inspectedShotId !== shotId) { state.closeInspector(); return; }
    set({ inspectedShotId: shotId, isInspectorOpen: true });
  },
  setInspectorCloseGuard: inspectorCloseGuard => set({ inspectorCloseGuard }),
  closeInspector: () => {
    if (get().inspectorCloseGuard?.() === false) return;
    set({ inspectedShotId: null, isInspectorOpen: false });
  },
  toggleInspector: () => {
    const state = get();
    if (state.isInspectorOpen) state.closeInspector();
    else if (state.selectedShotIds[0]) state.openInspector(state.selectedShotIds[0]);
  },

  setVOTimingModalOpen: isVOTimingModalOpen => set({ isVOTimingModalOpen }),
  setNewShotModalOpen: isNewShotModalOpen => set({ isNewShotModalOpen }),
  setImportModalOpen: isImportModalOpen => set({ isImportModalOpen })
}));
