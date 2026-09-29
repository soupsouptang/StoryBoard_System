'use client';

import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Icons } from '@frameforge/ui';
import { apiClient } from '@/lib/api-client';

interface TrashShot {
  id: string;
  display_number: string;
  name: string | null;
  deleted_at: string;
}

interface ShotTrashModalProps {
  productionId: string;
  onClose: () => void;
}

export function ShotTrashModal({ productionId, onClose }: ShotTrashModalProps) {
  const queryClient = useQueryClient();
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [confirmingPurgeId, setConfirmingPurgeId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !actingOn) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [actingOn, onClose]);

  const { data: trashShots = [], isLoading } = useQuery<TrashShot[]>({
    queryKey: ['production', productionId, 'trash'],
    queryFn: () => apiClient(`/api/v1/productions/${productionId}/shots/trash`),
  });

  const refreshAfterTrashChange = () => {
    queryClient.invalidateQueries({ queryKey: ['production', productionId, 'trash'] });
    queryClient.invalidateQueries({ queryKey: ['shots', productionId] });
    queryClient.invalidateQueries({ queryKey: ['production', productionId] });
  };

  const restoreMutation = useMutation({
    mutationFn: (shotId: string) => apiClient(`/api/v1/shots/${shotId}/restore`, { method: 'POST' }),
    onSuccess: refreshAfterTrashChange
  });

  const purgeMutation = useMutation({
    mutationFn: (shotId: string) => apiClient(`/api/v1/shots/${shotId}/purge`, { method: 'DELETE' }),
    onSuccess: refreshAfterTrashChange
  });

  const handleRestore = async (shotId: string) => {
    setActingOn(shotId);
    setActionError(null);
    try {
      await restoreMutation.mutateAsync(shotId);
      setConfirmingPurgeId(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : '恢复镜头失败');
    } finally {
      setActingOn(null);
    }
  };

  const handlePurge = async (shotId: string) => {
    setActingOn(shotId);
    setActionError(null);
    try {
      await purgeMutation.mutateAsync(shotId);
      setConfirmingPurgeId(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : '彻底删除镜头失败');
    } finally {
      setActingOn(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="shot-trash-title"
        className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-2 text-foreground">
            <Icons.Trash2 className="h-5 w-5" />
            <h2 id="shot-trash-title" className="font-bold">镜头废纸篓</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="关闭镜头废纸篓">
            <Icons.X className="h-4 w-4" />
          </Button>
        </div>

        {actionError && (
          <div role="alert" className="mx-4 mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
            {actionError}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="py-12 text-center text-xs font-mono text-muted-foreground">正在加载废纸篓...</div>
          ) : trashShots.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              废纸篓是空的。<br />已删除的镜头可在此恢复；彻底删除后不可恢复。
            </div>
          ) : (
            <div className="space-y-2">
              {trashShots.map(shot => {
                const confirming = confirmingPurgeId === shot.id;
                const busy = actingOn === shot.id;
                return (
                  <div key={shot.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background p-3 text-sm">
                    <div className="min-w-0">
                      <div className="font-mono font-bold text-foreground">{shot.display_number}</div>
                      {shot.name && <div className="truncate text-xs text-foreground">{shot.name}</div>}
                      <div className="mt-1 text-xs text-muted-foreground">
                        删除时间: {new Date(shot.deleted_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      {confirming ? (
                        <>
                          <span className="self-center text-xs text-destructive">此操作不可逆</span>
                          <Button variant="destructive" size="sm" onClick={() => handlePurge(shot.id)} disabled={busy}>
                            确认彻底删除
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setConfirmingPurgeId(null)} disabled={busy}>
                            取消
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button variant="outline" size="sm" onClick={() => handleRestore(shot.id)} disabled={busy}>
                            <Icons.Undo2 className="mr-2 h-4 w-4" />
                            恢复
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => setConfirmingPurgeId(shot.id)} disabled={busy}>
                            彻底删除
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
