import * as React from 'react';
import { Button, Field, IconButton, Icons, Input, TextArea } from '@frameforge/ui';
import { closeInspector, useInspector, useShots } from '../store';
import type { ShotItem, WorkspaceBridge } from '../contracts';

export function ShotInspector({ bridge }: { bridge?: WorkspaceBridge | null }) {
  const inspector = useInspector();
  const shots = useShots();
  const [activeTab, setActiveTab] = React.useState<'details' | 'camera' | 'audio'>('details');

  const shot = shots.find(s => s.id === inspector.shotId);

  // Keyboard shortcut to close inspector on Esc
  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && inspector.open) {
        closeInspector();
        bridge?.closeInspector?.();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [inspector.open, bridge]);

  if (!inspector.open || !shot) return null;

  return (
    <aside
      className={`ff73-inspector-panel ${
        inspector.mode === 'overlay' ? 'ff73-inspector-overlay' : 'ff73-inspector-docked'
      } flex flex-col h-full bg-surface border-l border-outline-variant/30 w-80 shrink-0 z-30 transition-all`}
      data-testid="shot-inspector"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-outline-variant/30">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm text-on-surface">Shot {shot.number}</span>
          <span className="text-xs px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant font-medium">
            rev {shot.revision}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <IconButton
            label="Close Inspector (Esc)"
            onClick={() => {
              closeInspector();
              bridge?.closeInspector?.();
            }}
          >
            <Icons.EyeOff size={16} />
          </IconButton>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-outline-variant/30 bg-surface-container-low px-2 pt-1 gap-1 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('details')}
          className={`px-3 py-1.5 rounded-t font-medium transition-colors ${
            activeTab === 'details'
              ? 'bg-surface text-primary border-b-2 border-primary'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Details
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('camera')}
          className={`px-3 py-1.5 rounded-t font-medium transition-colors ${
            activeTab === 'camera'
              ? 'bg-surface text-primary border-b-2 border-primary'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Camera
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('audio')}
          className={`px-3 py-1.5 rounded-t font-medium transition-colors ${
            activeTab === 'audio'
              ? 'bg-surface text-primary border-b-2 border-primary'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Audio
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'details' && (
          <div className="space-y-3">
            <Field label="Title">
              <Input
                value={shot.title || ''}
                readOnly
                placeholder="Shot title..."
              />
            </Field>
            <Field label="Action / Visual Summary">
              <TextArea
                rows={3}
                value={shot.action || ''}
                readOnly
                placeholder="Action description..."
              />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Shot Size">
                <Input value={shot.shotSize || '全景'} readOnly />
              </Field>
              <Field label="Duration (Frames)">
                <Input value={String(shot.durationFrames || 75)} readOnly />
              </Field>
            </div>
            <Field label="Status">
              <Input value={shot.status || 'Draft'} readOnly />
            </Field>
          </div>
        )}

        {activeTab === 'camera' && (
          <div className="space-y-3">
            <Field label="Lens">
              <Input value={shot.lens || ''} readOnly placeholder="e.g. 35mm Prime" />
            </Field>
            <Field label="Camera Movement">
              <Input value={shot.movement || '固定'} readOnly placeholder="e.g. 摇镜头 / 升降" />
            </Field>
          </div>
        )}

        {activeTab === 'audio' && (
          <div className="space-y-3">
            <Field label="Dialogue">
              <TextArea
                rows={3}
                value={shot.dialogue || ''}
                readOnly
                placeholder="Dialogue..."
              />
            </Field>
            <Field label="Voiceover">
              <TextArea
                rows={2}
                value={shot.voiceover || ''}
                readOnly
                placeholder="Voiceover..."
              />
            </Field>
          </div>
        )}
      </div>
    </aside>
  );
}
