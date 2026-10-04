import * as React from 'react';
import { Icons } from '@frameforge/ui';
import { openInspector, selectShot, usePresence, useSelection, useShots } from '../store';
import type { ShotItem, WorkspaceBridge } from '../contracts';

export function ShotTableView({ bridge }: { bridge?: WorkspaceBridge | null }) {
  const shots = useShots();
  const { selectedShotIds } = useSelection();
  const presence = usePresence();

  // Map of (shotId, field) -> user editing it
  const editingLocks = React.useMemo(() => {
    const map = new Map<string, (typeof presence)[0]>();
    for (const u of presence) {
      if (u.presenceState === 'editing' && u.shotId && u.field) {
        map.set(`${u.shotId}:${u.field}`, u);
      }
    }
    return map;
  }, [presence]);

  if (shots.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-on-surface-variant">
        <Icons.Table2 size={36} className="opacity-40 mb-2" />
        <p className="text-sm">No shots in this project yet.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-surface" data-testid="shot-table-view">
      <table className="w-full border-collapse text-left text-xs font-normal">
        <thead className="sticky top-0 bg-surface-container-high border-b border-outline-variant/30 text-on-surface-variant font-medium z-10 select-none">
          <tr>
            <th className="py-2.5 px-3 w-12 text-center">#</th>
            <th className="py-2.5 px-3 w-40">Title</th>
            <th className="py-2.5 px-3">Action / Summary</th>
            <th className="py-2.5 px-3 w-64">Dialogue</th>
            <th className="py-2.5 px-3 w-24">Shot Size</th>
            <th className="py-2.5 px-3 w-28">Lens</th>
            <th className="py-2.5 px-3 w-20 text-right">Frames</th>
            <th className="py-2.5 px-3 w-24">Status</th>
            <th className="py-2.5 px-3 w-16 text-center">Rev</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/20">
          {shots.map((shot: ShotItem) => {
            const isSelected = selectedShotIds.includes(shot.id);
            const titleLock = editingLocks.get(`${shot.id}:title`);
            const dialogueLock = editingLocks.get(`${shot.id}:dialogue`);

            return (
              <tr
                key={shot.id}
                onClick={e => {
                  selectShot(shot.id, e.shiftKey || e.metaKey || e.ctrlKey);
                  bridge?.selectShot?.(shot.id, e.shiftKey || e.metaKey || e.ctrlKey);
                }}
                onDoubleClick={() => {
                  openInspector(shot.id, 'docked');
                  bridge?.openInspector?.(shot.id, 'docked');
                }}
                className={`transition-colors cursor-pointer select-none ${
                  isSelected
                    ? 'bg-primary-container/20 text-on-surface font-medium'
                    : 'hover:bg-surface-container-lowest text-on-surface'
                }`}
                data-shot-id={shot.id}
                data-selected={String(isSelected)}
              >
                <td className="py-2.5 px-3 text-center text-on-surface-variant font-mono">
                  {shot.number}
                </td>
                <td className="py-2.5 px-3 font-medium relative">
                  <div className="flex items-center gap-1.5">
                    <span>{shot.title || 'Untitled'}</span>
                    {titleLock && (
                      <span
                        className="inline-block w-2 h-2 rounded-full ring-1 ring-white"
                        style={{ backgroundColor: titleLock.color }}
                        title={`${titleLock.displayName} is editing`}
                      />
                    )}
                  </div>
                </td>
                <td className="py-2.5 px-3 text-on-surface-variant max-w-xs truncate">
                  {shot.action || '—'}
                </td>
                <td className="py-2.5 px-3 text-on-surface-variant max-w-xs truncate relative">
                  <div className="flex items-center gap-1.5">
                    <span>{shot.dialogue || '—'}</span>
                    {dialogueLock && (
                      <span
                        className="inline-block w-2 h-2 rounded-full ring-1 ring-white"
                        style={{ backgroundColor: dialogueLock.color }}
                        title={`${dialogueLock.displayName} is editing`}
                      />
                    )}
                  </div>
                </td>
                <td className="py-2.5 px-3 text-on-surface-variant">
                  <span className="px-1.5 py-0.5 rounded bg-surface-container text-[11px]">
                    {shot.shotSize || '全景'}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-on-surface-variant">{shot.lens || '—'}</td>
                <td className="py-2.5 px-3 text-right font-mono text-on-surface-variant">
                  {shot.durationFrames}
                </td>
                <td className="py-2.5 px-3">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-surface-container text-on-surface-variant">
                    {shot.status || 'Draft'}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-center font-mono text-on-surface-variant text-[11px]">
                  v{shot.revision}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
