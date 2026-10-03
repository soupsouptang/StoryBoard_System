import type { Shot } from '@frameforge/types';
import type { FilterState } from '@/stores/useWorkspaceStore';

// Both the view and project summary derive from the same filters, without storing totals.
export function filterShotsForView(
  shots: readonly Shot[], filters: FilterState, view: 'table' | 'storyboard',
  customValues?: Record<string, Record<string, unknown>>
): Shot[] {
  const query = view === 'table' ? filters.searchQuery.trim().toLowerCase() : filters.searchQuery.toLowerCase();
  return shots.filter(shot => {
    if (query) {
      const content = [shot.display_number, shot.name, shot.description, shot.voice_over, shot.owner_id];
      if (view === 'table') content.push(shot.department, shot.status, shot.primary_method);
      const builtInMatch = content.some(value => String(value || '').toLowerCase().includes(query));
      const customMatch = view === 'table' && Object.values(customValues?.[shot.id] || {})
        .some(value => String(value ?? '').toLowerCase().includes(query));
      if (!builtInMatch && !customMatch) return false;
    }
    if (filters.primaryMethod !== 'all' && (view === 'table'
      ? !shotMethodValues(shot).includes(filters.primaryMethod)
      : (shot.primary_method || '').toLowerCase() !== filters.primaryMethod.toLowerCase())) return false;
    if (filters.department !== 'all' && shot.department !== filters.department) return false;
    if (filters.status !== 'all' && (view === 'table' ? shot.status !== filters.status
      : (shot.status || '').toLowerCase() !== filters.status.toLowerCase())) return false;
    if (view === 'storyboard') {
      if (filters.sequenceId !== 'all' && (shot.sequence_id || 'unassigned') !== filters.sequenceId) return false;
      if (filters.timingLocked !== null && shot.timing_locked !== filters.timingLocked) return false;
      if (filters.vfxRequired !== null && shot.vfx_required !== filters.vfxRequired) return false;
    }
    return true;
  });
}

export function sumShotDurationFrames(shots: readonly Pick<Shot, 'duration_frames'>[]): number {
  return shots.reduce((total, shot) => total + shot.duration_frames, 0);
}

export function parseShotDuration(input: string, fps: number): number {
  const match = /^(\d+(?:\.\d+)?|\.\d+)\s*([fsmh]?)$/i.exec(input.trim());
  const value = match ? Number(match[1]) : NaN;
  const unit = match?.[2].toLowerCase() || 's';
  const frames = unit === 'f' ? value : Math.round(value * fps * (unit === 'h' ? 3600 : unit === 'm' ? 60 : 1));
  if (!Number.isFinite(fps) || fps <= 0 || !Number.isSafeInteger(frames) || frames < Math.max(1, Math.ceil(0.1 * fps))) {
    throw new Error('请输入有效时长：25或25s为秒，25f为帧数，2m为分钟，1h为小时；至少0.1秒。');
  }
  return frames;
}

export function shotMovementLabel(
  shot: Pick<Shot, 'camera_movement'>,
  fallback = '固定'
): string {
  const value = shot.camera_movement?.type;
  return typeof value === 'string' && value.trim() ? value : fallback;
}

// Matches the functional baseline: one Shot may belong to several method groups.
export function shotMethodValues(shot: Pick<Shot, 'primary_method' | 'secondary_methods'>): string[] {
  return [...new Set([shot.primary_method || 'live', ...(shot.secondary_methods || [])].filter(Boolean))];
}

export function groupShotsByMethod(shots: Shot[]): Map<string, Shot[]> {
  const groups = new Map<string, Shot[]>();
  for (const shot of shots) {
    for (const method of shotMethodValues(shot)) {
      const group = groups.get(method);
      if (group) group.push(shot);
      else groups.set(method, [shot]);
    }
  }
  return groups;
}
