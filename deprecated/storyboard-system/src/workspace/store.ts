import { useSyncExternalStore } from 'react';
import type { InspectorState, PresenceUser, ShotItem, Snapshot } from './contracts';

let snapshot: Snapshot = {
  projectId: '',
  context: 'hub',
  view: 'table',
  search: '',
  total: 0,
  filtered: 0,
  inspectorOpen: false,
  columns: [],
  columnOrder: [],
  filters: [],
  navigation: [],
  sidebarPrefs: { hidden: [], labels: {} },
  rowHeight: 'standard',
  effects: 'full',
  saveRefreshBusy: false,
  shots: [],
  selectedShotIds: [],
  activeShotId: null,
  inspector: { open: false, shotId: null, mode: 'docked', activeTab: 'details' },
  presenceUsers: [],
};

const listeners = new Set<() => void>();

export function publish(next: Partial<Snapshot>) {
  snapshot = { ...snapshot, ...next };
  listeners.forEach(listener => listener());
}

export function setShots(shots: ShotItem[]) {
  publish({ shots, total: shots.length, filtered: shots.length });
}

/**
 * MIG-002 Invariant:
 * Selection != Inspector
 * Selecting a shot updates selectedShotIds and activeShotId ONLY.
 * It NEVER opens or alters the Inspector state implicitly.
 */
export function selectShot(shotId: string, multi: boolean = false) {
  let nextSelected: string[];
  if (multi) {
    nextSelected = snapshot.selectedShotIds?.includes(shotId)
      ? (snapshot.selectedShotIds || []).filter(id => id !== shotId)
      : [...(snapshot.selectedShotIds || []), shotId];
  } else {
    nextSelected = [shotId];
  }
  publish({
    selectedShotIds: nextSelected,
    activeShotId: shotId,
  });
}

export function openInspector(shotId: string, mode: 'docked' | 'overlay' = 'docked', tab: InspectorState['activeTab'] = 'details') {
  publish({
    inspectorOpen: true,
    inspector: {
      open: true,
      shotId,
      mode,
      activeTab: tab,
    },
  });
}

export function closeInspector() {
  publish({
    inspectorOpen: false,
    inspector: {
      open: false,
      shotId: null,
      mode: snapshot.inspector?.mode || 'docked',
      activeTab: snapshot.inspector?.activeTab || 'details',
    },
  });
}

export function setPresenceUsers(users: PresenceUser[]) {
  publish({ presenceUsers: users });
}

export function useWorkspace() {
  return useSyncExternalStore(
    listener => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => snapshot
  );
}

export function useShots() {
  const ws = useWorkspace();
  return ws.shots || [];
}

export function useSelection() {
  const ws = useWorkspace();
  return {
    selectedShotIds: ws.selectedShotIds || [],
    activeShotId: ws.activeShotId || null,
  };
}

export function useInspector() {
  const ws = useWorkspace();
  return ws.inspector || { open: false, shotId: null, mode: 'docked', activeTab: 'details' };
}

export function usePresence() {
  const ws = useWorkspace();
  return ws.presenceUsers || [];
}
