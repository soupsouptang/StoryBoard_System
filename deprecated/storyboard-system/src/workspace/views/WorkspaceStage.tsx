import * as React from 'react';
import { useWorkspace } from '../store';
import { ShotTableView } from './ShotTableView';
import { ShotCardView } from './ShotCardView';
import { TimelineView } from './TimelineView';
import { ShotInspector } from '../components/ShotInspector';
import type { WorkspaceBridge } from '../contracts';

export function WorkspaceStage({ bridge }: { bridge?: WorkspaceBridge | null }) {
  const ws = useWorkspace();

  return (
    <div className="ff73-workspace-stage flex-1 flex overflow-hidden relative" data-testid="workspace-stage">
      {/* Primary Workspace View Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {ws.view === 'table' && <ShotTableView bridge={bridge} />}
        {(ws.view === 'cards' || ws.view === 'wall') && <ShotCardView bridge={bridge} />}
        {ws.view === 'timeline' && <TimelineView bridge={bridge} />}
      </div>

      {/* Docked / Overlay Inspector */}
      <ShotInspector bridge={bridge} />
    </div>
  );
}
