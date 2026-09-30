'use client';

import React, { useState } from 'react';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  Icons,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@frameforge/ui';
import {
  type SavedView,
  useCreateSavedView,
  useDeleteSavedView,
  useSavedViews,
  useUpdateSavedView
} from '@/lib/hooks/useSavedViews';
import { normalizeShotTablePresentationPreferences } from '@/lib/shot-table-presentation';

interface ShotSavedViewsProps {
  productionId: string;
  currentConfig: Record<string, unknown>;
  onApply: (config: Record<string, unknown>) => void;
}

export function ShotSavedViews({
  productionId,
  currentConfig,
  onApply
}: ShotSavedViewsProps) {
  const { data, isLoading, isError, refetch } = useSavedViews(productionId);
  const views = (data ?? []).filter(view => view.view_type === 'table');
  const createView = useCreateSavedView(productionId);
  const updateView = useUpdateSavedView(productionId);
  const deleteView = useDeleteSavedView(productionId);

  const [popoverOpen, setPopoverOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [viewName, setViewName] = useState('');
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SavedView | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const applyView = (view: SavedView) => {
    setActionError(null);
    onApply(view.config);
    setActiveViewId(view.id);
    setPopoverOpen(false);
  };

  const saveNewView = async () => {
    const name = viewName.trim();
    if (!name) return;

    setActionError(null);
    try {
      const saved = await createView.mutateAsync({
        name,
        viewType: 'table',
        isShared: true,
        config: currentConfig
      });
      setActiveViewId(saved.id);
      setViewName('');
      setCreateOpen(false);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : '保存视图失败');
    }
  };

  const overwriteView = async (view: SavedView) => {
    setActionError(null);
    try {
      const saved = await updateView.mutateAsync({
        id: view.id,
        revision: view.revision,
        config: currentConfig
      });
      setActiveViewId(saved.id);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : '覆盖保存视图失败');
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setActionError(null);
    try {
      const id = pendingDelete.id;
      await deleteView.mutateAsync(id);
      if (activeViewId === id) setActiveViewId(null);
      setPendingDelete(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : '删除保存视图失败');
    }
  };

  return (
    <>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 text-xs">
            <Icons.SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
            保存视图
            {views.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 min-w-5 justify-center px-1.5 text-[10px]">
                {views.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent align="end" className="w-[min(380px,calc(100vw-24px))] p-0">
          <div className="border-b border-border px-3 py-2.5">
            <div className="text-sm font-medium text-foreground">项目保存视图</div>
            <div className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
              保存列布局、筛选和排序；同一项目可在其他浏览器重新应用。
            </div>
          </div>

          <div className="max-h-[min(48vh,340px)] overflow-y-auto p-1.5">
            {isLoading ? (
              <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                正在加载保存视图...
              </div>
            ) : isError ? (
              <div role="alert" className="px-3 py-6 text-center text-xs text-destructive">
                加载保存视图失败。
                <Button variant="ghost" size="sm" onClick={() => void refetch()}>
                  重试
                </Button>
              </div>
            ) : views.length === 0 ? (
              <div className="rounded-md border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
                暂无保存视图。
              </div>
            ) : (
              views.map(view => {
                const active = activeViewId === view.id &&
                  JSON.stringify(currentConfig) === JSON.stringify({
                    ...view.config,
                    presentation: normalizeShotTablePresentationPreferences(view.config.presentation)
                  });
                return (
                  <div
                    key={view.id}
                    className={`group flex items-center gap-1 rounded-md px-1.5 py-1.5 ${
                      active ? 'bg-accent' : 'hover:bg-accent/60'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => applyView(view)}
                      className="min-w-0 flex-1 rounded-sm px-1.5 py-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                          {view.name}
                        </span>
                        {active && (
                          <Icons.Check className="h-3.5 w-3.5 shrink-0 text-foreground" aria-hidden="true" />
                        )}
                      </span>
                      <span className="mt-0.5 block text-[10px] text-muted-foreground">
                        {view.is_shared ? '项目共享' : '仅自己'} · rev {view.revision}
                      </span>
                    </button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      title="用当前布局覆盖"
                      aria-label={`用当前布局覆盖保存视图 ${view.name}`}
                      disabled={updateView.isPending}
                      onClick={() => void overwriteView(view)}
                    >
                      <Icons.RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                      title="删除保存视图"
                      aria-label={`删除保存视图 ${view.name}`}
                      disabled={deleteView.isPending}
                      onClick={() => {
                        setPopoverOpen(false);
                        setPendingDelete(view);
                      }}
                    >
                      <Icons.Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                  </div>
                );
              })
            )}
          </div>

          {actionError && (
            <div
              role="alert"
              className="mx-3 mb-2 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive"
            >
              {actionError}
            </div>
          )}

          <div className="border-t border-border p-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-full justify-start text-xs"
              onClick={() => {
                setActionError(null);
                setPopoverOpen(false);
                setCreateOpen(true);
              }}
            >
              <Icons.Plus className="h-3.5 w-3.5" aria-hidden="true" />
              将当前状态保存为新视图
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <Dialog
        open={createOpen}
        onOpenChange={open => {
          if (!open && !createView.isPending) {
            setCreateOpen(false);
            setViewName('');
            setActionError(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogTitle>保存当前视图</DialogTitle>
          <DialogDescription>
            保存当前镜头表的列布局、行高、筛选条件和排序。镜头数据本身不会被复制。
          </DialogDescription>

          <div className="space-y-2">
            <label htmlFor="saved-view-name" className="text-sm font-medium text-foreground">
              视图名称
            </label>
            <Input
              id="saved-view-name"
              value={viewName}
              onChange={event => setViewName(event.target.value)}
              placeholder="例如：导演审片"
              maxLength={80}
              autoFocus
              onKeyDown={event => {
                if (event.key === 'Enter' && viewName.trim() && !createView.isPending) {
                  event.preventDefault();
                  void saveNewView();
                }
              }}
            />
          </div>

          {actionError && (
            <div
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive"
            >
              {actionError}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              disabled={createView.isPending}
              onClick={() => {
                setCreateOpen(false);
                setViewName('');
                setActionError(null);
              }}
            >
              取消
            </Button>
            <Button
              disabled={!viewName.trim() || createView.isPending}
              onClick={() => void saveNewView()}
            >
              {createView.isPending ? '保存中…' : '保存视图'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(pendingDelete)}
        onOpenChange={open => {
          if (!open && !deleteView.isPending) {
            setPendingDelete(null);
            setActionError(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogTitle>删除保存视图</DialogTitle>
          <DialogDescription>
            {pendingDelete
              ? `确认删除“${pendingDelete.name}”？这只删除视图配置，不会删除任何镜头。`
              : ''}
          </DialogDescription>

          {actionError && (
            <div
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive"
            >
              {actionError}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              disabled={deleteView.isPending}
              onClick={() => {
                setPendingDelete(null);
                setActionError(null);
              }}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              disabled={deleteView.isPending}
              onClick={() => void confirmDelete()}
            >
              {deleteView.isPending ? '删除中…' : '删除视图'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
