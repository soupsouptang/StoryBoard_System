'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
  Icons
} from '@frameforge/ui';
import type { useShotCommands } from '@/lib/hooks/useShotCommands';
import { useBulkTrashShots } from '@/lib/hooks/useProduction';
import {
  SHOT_TABLE_COLUMN_LABELS,
  type ShotTableColumnKey
} from '@/lib/shot-table-presentation';

export type ShotTableContextColumnKey =
  | 'display_number'
  | 'primary_method'
  | ShotTableColumnKey
  | `custom:${string}`;

export type ShotTableContextTarget =
  | {
      kind: 'column';
      x: number;
      y: number;
      returnFocus: HTMLElement | null;
      column: ShotTableContextColumnKey;
    }
  | {
      kind: 'custom-column';
      x: number;
      y: number;
      returnFocus: HTMLElement | null;
      columnKey: `custom:${string}`;
      fieldId: string;
      revision: number;
      label: string;
    }
  | {
      kind: 'row';
      x: number;
      y: number;
      returnFocus: HTMLElement | null;
      shotId: string;
      shotIds: string[];
      displayNumber: string;
      name?: string | null;
      cellValue?: string;
      cellLabel?: string;
    };

interface ShotTableContextMenuProps {
  productionId: string;
  commands: ReturnType<typeof useShotCommands>;
  canAutoTime: boolean;
  onSelectShot: (id: string) => void;
  target: ShotTableContextTarget | null;
  sortKey: string;
  sortDirection: 'asc' | 'desc';
  onOpenChange: (open: boolean) => void;
  onOpenInspector: (shotId: string) => void;
  onClearSelection: () => void;
  onCopyCell: (value: string) => void;
  onOpenTrash: () => void;
  onNewShot: () => void;
  columnLabels: Record<string, string>;
  canPasteColumn: boolean;
  columnPending: boolean;
  onInsertColumn: (column: string, after: boolean) => void;
  onCopyColumn: (column: string, cut: boolean) => void;
  onPasteColumn: (column: string) => void;
  wrappedColumns: ShotTableColumnKey[];
  onToggleWrap: (column: ShotTableColumnKey) => void;
  onSort: (column: ShotTableContextColumnKey, direction: 'asc' | 'desc') => void;
  onClearSort: () => void;
  onAutoFitColumn: (column: string) => void;
  onHideColumn: (column: string) => void;
  onDeleteColumn: (column: string) => Promise<void>;
}

export function ShotTableContextMenu({
  productionId,
  commands, canAutoTime, onSelectShot,
  target,
  sortKey,
  sortDirection,
  onOpenChange,
  onOpenInspector,
  onClearSelection,
  onCopyCell,
  onOpenTrash,
  onNewShot,
  columnLabels, canPasteColumn, columnPending, onInsertColumn, onCopyColumn, onPasteColumn,
  wrappedColumns,
  onToggleWrap,
  onSort,
  onClearSort,
  onAutoFitColumn,
  onHideColumn, onDeleteColumn
}: ShotTableContextMenuProps) {
  const column = target?.kind === 'column' ? target.column : target?.kind === 'custom-column' ? target.columnKey : null;
  const label = column ? columnLabels[column] || (target?.kind === 'custom-column' ? target.label : SHOT_TABLE_COLUMN_LABELS[column as ShotTableColumnKey]) || '镜号' : '';
  const bulkTrash = useBulkTrashShots(productionId);
  const [pendingTrash, setPendingTrash] = useState<{
    shotIds: string[];
    label: string;
  } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingColumn, setPendingColumn] = useState<{ column: string; label: string } | null>(null);
  const [deletingColumn, setDeletingColumn] = useState(false);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const returnRegionRef = useRef<HTMLElement | null>(null);
  const restoreFocusOnCloseRef = useRef(true);

  useEffect(() => {
    if (target?.returnFocus) {
      returnFocusRef.current = target.returnFocus;
      returnRegionRef.current = target.returnFocus.closest<HTMLElement>('[role="region"]');
    }
  }, [target]);

  const requestTrash = (shotIds: string[], label: string) => {
    setActionError(null);
    setPendingTrash({ shotIds, label });
  };

  const confirmTrash = async () => {
    if (!pendingTrash || bulkTrash.isPending) return;
    setActionError(null);
    try {
      await bulkTrash.mutateAsync(pendingTrash.shotIds);
      setPendingTrash(null);
      onClearSelection();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : '移入废纸篓失败，请刷新后重试'
      );
    }
  };

  return (
    <>
      <DropdownMenu
        modal={false}
        open={Boolean(target)}
        onOpenChange={open => onOpenChange(open)}
      >
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            className="fixed z-[-1] h-px w-px opacity-0"
            style={{
              left: target?.x ?? 0,
              top: target?.y ?? 0,
              pointerEvents: 'none'
            }}
          />
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="start"
          side="bottom"
          sideOffset={2}
          className="max-h-[var(--radix-dropdown-menu-content-available-height)] min-w-64 overflow-y-auto"
          onPointerDownOutside={() => {
            restoreFocusOnCloseRef.current = false;
          }}
          onFocusOutside={() => {
            restoreFocusOnCloseRef.current = false;
          }}
          onCloseAutoFocus={event => {
            event.preventDefault();
            if (restoreFocusOnCloseRef.current) {
              returnFocusRef.current?.focus({ preventScroll: true });
            }
            restoreFocusOnCloseRef.current = true;
          }}
        >
          {column && <>
            <DropdownMenuLabel>列属性 · {label}</DropdownMenuLabel>
            <DropdownMenuItem onSelect={() => onSort(column as ShotTableContextColumnKey, 'asc')}><span className="mr-2 w-4 text-center">↑</span>升序排序{sortKey === column && sortDirection === 'asc' && <Icons.Check className="ml-auto h-4 w-4" />}</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onSort(column as ShotTableContextColumnKey, 'desc')}><span className="mr-2 w-4 text-center">↓</span>降序排序{sortKey === column && sortDirection === 'desc' && <Icons.Check className="ml-auto h-4 w-4" />}</DropdownMenuItem>
            <DropdownMenuItem disabled={sortKey !== column} onSelect={onClearSort}><Icons.X className="mr-2 h-4 w-4" />清除排序</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={!commands.canWrite || columnPending} onSelect={() => onInsertColumn(column, false)}><span className="mr-2 w-4 text-center">←</span>前插列</DropdownMenuItem>
            <DropdownMenuItem disabled={!commands.canWrite || columnPending} onSelect={() => onInsertColumn(column, true)}><span className="mr-2 w-4 text-center">→</span>后插列</DropdownMenuItem>
            <DropdownMenuItem disabled={columnPending} onSelect={() => onCopyColumn(column, false)}><Icons.Copy className="mr-2 h-4 w-4" />复制<DropdownMenuShortcut>Ctrl/Cmd+C</DropdownMenuShortcut></DropdownMenuItem>
            <DropdownMenuItem disabled={!commands.canWrite || columnPending} onSelect={() => onCopyColumn(column, true)}><Icons.Scissors className="mr-2 h-4 w-4" />剪切<DropdownMenuShortcut>Ctrl/Cmd+X</DropdownMenuShortcut></DropdownMenuItem>
            <DropdownMenuItem disabled={!commands.canWrite || columnPending || !canPasteColumn} onSelect={() => onPasteColumn(column)}><Icons.ClipboardPaste className="mr-2 h-4 w-4" />向后粘贴<DropdownMenuShortcut>Ctrl/Cmd+V</DropdownMenuShortcut></DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onAutoFitColumn(column)}><Icons.ArrowUpDown className="mr-2 h-4 w-4 rotate-90" />按内容自动列宽</DropdownMenuItem>
            {['description', 'voice_over', 'camera_movement'].includes(column) && <DropdownMenuItem onSelect={() => onToggleWrap(column as ShotTableColumnKey)}>{wrappedColumns.includes(column as ShotTableColumnKey) ? '关闭文本换行' : '开启文本换行'}</DropdownMenuItem>}
            {column !== 'display_number' && <DropdownMenuItem onSelect={() => onHideColumn(column)}><Icons.Columns3 className="mr-2 h-4 w-4" />隐藏此列</DropdownMenuItem>}
          </>}

          {target?.kind === 'row' && (
            <>
              <DropdownMenuLabel>
                <span className="block text-xs text-muted-foreground">镜头操作</span>
                SHOT {target.displayNumber}{target.name ? ' · ' + target.name : ''}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => onSelectShot(target.shotId)}><Icons.Check className="mr-2 h-4 w-4" />选中 SHOT {target.displayNumber}</DropdownMenuItem>
              <DropdownMenuItem disabled={!canAutoTime || !commands.canWrite || commands.pending} onSelect={() => commands.run('auto_timing', target.shotId)}><Icons.Clock3 className="mr-2 h-4 w-4" />单条旁白自动计时</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled={!commands.canWrite || commands.pending} onSelect={() => commands.run('insert_before', target.shotId)}><span className="mr-2 w-4 text-center">↑</span>上插镜头</DropdownMenuItem>
              <DropdownMenuItem disabled={!commands.canWrite || commands.pending} onSelect={() => commands.run('insert_after', target.shotId)}><span className="mr-2 w-4 text-center">↓</span>下插镜头</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void commands.copy(target.shotIds)}><Icons.Copy className="mr-2 h-4 w-4" />复制<DropdownMenuShortcut>Ctrl/Cmd+C</DropdownMenuShortcut></DropdownMenuItem>
              <DropdownMenuItem disabled={!commands.canWrite || commands.pending} onSelect={() => void commands.copy(target.shotIds, true)}><Icons.Scissors className="mr-2 h-4 w-4" />剪切<DropdownMenuShortcut>Ctrl/Cmd+X</DropdownMenuShortcut></DropdownMenuItem>
              <DropdownMenuItem disabled={!commands.canWrite || commands.pending || !commands.clipboard || (commands.clipboard.cut && commands.clipboard.sources.some(source => source.id === target.shotId))} onSelect={() => void commands.paste(target.shotId)}><Icons.ClipboardPaste className="mr-2 h-4 w-4" />向下粘贴<DropdownMenuShortcut>Ctrl/Cmd+V</DropdownMenuShortcut></DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled={!commands.canWrite || commands.pending} className="text-destructive focus:text-destructive" onSelect={() => requestTrash(target.shotIds, target.shotIds.length > 1 ? target.shotIds.length + ' 个镜头' : 'SHOT ' + target.displayNumber)}>
                <Icons.Trash2 className="mr-2 h-4 w-4" />{target.shotIds.length > 1 ? '删除所选镜头' : '删除此镜头'}
              </DropdownMenuItem>
            </>
          )}
          {target?.kind !== 'row' && <>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={!commands.canWrite} onSelect={onNewShot}><Icons.Plus className="mr-2 h-4 w-4" />新建镜头…</DropdownMenuItem>
            {column && <DropdownMenuItem disabled={!commands.canWrite || columnPending} className="text-destructive focus:text-destructive"
              onSelect={() => { setActionError(null); setPendingColumn({ column, label }); }}><Icons.Trash2 className="mr-2 h-4 w-4" />删除此列</DropdownMenuItem>}
          </>}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={Boolean(pendingColumn)} onOpenChange={open => { if (!open && !deletingColumn) { setPendingColumn(null); setActionError(null); } }}>
        <DialogContent className="max-w-md" onEscapeKeyDown={event => { if (deletingColumn) event.preventDefault(); }}
          onInteractOutside={event => { if (deletingColumn) event.preventDefault(); }}
          onCloseAutoFocus={event => { event.preventDefault(); (returnFocusRef.current?.isConnected ? returnFocusRef.current : returnRegionRef.current)?.focus({ preventScroll: true }); }}>
          <DialogTitle>删除此列</DialogTitle>
          <DialogDescription>确认将“{pendingColumn?.label}”移入回收站？列数据保留，可从列管理恢复。内置列不能永久删除。</DialogDescription>
          {actionError && <p role="alert" className="text-sm text-destructive">{actionError}</p>}
          <DialogFooter><Button variant="outline" disabled={deletingColumn} onClick={() => { setPendingColumn(null); setActionError(null); }}>取消</Button>
            <Button variant="destructive" disabled={deletingColumn} onClick={async () => {
              if (!pendingColumn || deletingColumn) return;
              setDeletingColumn(true); setActionError(null);
              try { await onDeleteColumn(pendingColumn.column); setPendingColumn(null); }
              catch (error) { setActionError(error instanceof Error ? error.message : '删除失败，原列已保留。'); }
              finally { setDeletingColumn(false); }
            }}>{deletingColumn ? '删除中…' : '确认删除'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(pendingTrash)}
        onOpenChange={open => {
          if (!open && !bulkTrash.isPending) {
            setPendingTrash(null);
            setActionError(null);
          }
        }}
      >
        <DialogContent
          className="max-w-md"
          onCloseAutoFocus={event => {
            event.preventDefault();
            returnFocusRef.current?.focus({ preventScroll: true });
          }}
          onEscapeKeyDown={event => {
            if (bulkTrash.isPending) event.preventDefault();
          }}
          onInteractOutside={event => {
            if (bulkTrash.isPending) event.preventDefault();
          }}
        >
          <DialogTitle>移入废纸篓</DialogTitle>
          <DialogDescription>
            {pendingTrash
              ? '确认将 ' + pendingTrash.label + ' 移入废纸篓？之后仍可从镜头废纸篓恢复。'
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
              disabled={bulkTrash.isPending}
              onClick={() => {
                setPendingTrash(null);
                setActionError(null);
              }}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              disabled={bulkTrash.isPending}
              onClick={() => void confirmTrash()}
            >
              {bulkTrash.isPending ? '处理中…' : '确认移入废纸篓'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
