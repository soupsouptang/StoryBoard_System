import * as React from 'react';
import { Button, IconButton, Icons } from '@frameforge/ui';

interface AIProposalDrawerProps {
  open: boolean;
  onClose: () => void;
  proposal: {
    id: string;
    capability: string;
    model: string;
    prompt_summary: string;
    changes: any[];
  } | null;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
}

export function AIProposalDrawer({ open, onClose, proposal, onAccept, onReject }: AIProposalDrawerProps) {
  if (!open || !proposal) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-surface border-l border-outline-variant/30 shadow-2xl z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-outline-variant/30">
        <div className="flex items-center gap-2">
          <Icons.LampDesk size={18} className="text-primary" />
          <h3 className="font-semibold text-sm text-on-surface">AI Proposal Review</h3>
        </div>
        <IconButton label="Close" onClick={onClose}>
          <Icons.EyeOff size={16} />
        </IconButton>
      </div>

      <div className="p-4 flex-1 overflow-y-auto space-y-4">
        <div className="bg-surface-container-low p-3 rounded-lg border border-outline-variant/20 text-xs space-y-1">
          <div className="font-medium text-on-surface">Capability: {proposal.capability}</div>
          <div className="text-on-surface-variant">Model: {proposal.model}</div>
          <div className="text-on-surface-variant">{proposal.prompt_summary}</div>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
            Proposed Changes ({proposal.changes.length})
          </h4>
          <div className="space-y-2">
            {proposal.changes.map((item, idx) => (
              <div key={idx} className="p-3 bg-surface-container rounded border border-outline-variant/30 text-xs space-y-1">
                <div className="font-semibold text-on-surface">
                  {item.title || `Item ${idx + 1}`}
                </div>
                {item.action && (
                  <p className="text-on-surface-variant line-clamp-2">{item.action}</p>
                )}
                {item.suggested_lens && (
                  <div className="text-primary text-[11px]">Lens: {item.suggested_lens}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-outline-variant/30 flex items-center justify-end gap-2 bg-surface-container-low">
        <Button variant="danger" onClick={() => onReject(proposal.id)}>
          Reject
        </Button>
        <Button variant="primary" onClick={() => onAccept(proposal.id)}>
          Accept & Commit
        </Button>
      </div>
    </div>
  );
}
