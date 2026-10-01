import type { Shot } from '@frameforge/types';

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
