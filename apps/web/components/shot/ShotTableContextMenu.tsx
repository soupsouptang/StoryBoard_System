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
import { useBulkTrashShots } from '@/lib/hooks/useProduction';
import {
  SHOT_TABLE_COLUMN_LABELS,
  type ShotTableColumnKey
} from '@/lib/shot-table-presentation';

export type ShotTableContextColumnKey =
  | 'display_number'
  | 'primary_method'
  | ShotTableColumnKey;

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
  target: ShotTableContextTarget | null;
  sortKey: string;
  sortDirection: 'asc' | 'desc';
  onOpenChange: (open: boolean) => void;
  onOpenInspector: (shotId: string) => void;
  onClearSelection: () => void;
  onCopyCell: (value: string) => void;
  onOpenTrash: () => void;
  onNewShot: () => void;
  onCustomFieldState: (id: string, revision: number, state: 'hidden' | 'removed') => void;
  wrappedColumns: ShotTableColumnKey[];
  onToggleWrap: (column: ShotTableColumnKey) => void;
  onSort: (column: ShotTableContextColumnKey, direction: 'asc' | 'desc') => void;
  onClearSort: () => void;
  onAutoFitColumn: (column: ShotTableColumnKey) => void;
  onHideColumn: (column: ShotTableColumnKey) => void;
}

const FIXED_COLUMN_LABELS: Record<'display_number' | 'primary_method', string> = {
  display_number: '镜号',
  primary_method: '制作方式'
};

function columnLabel(column: ShotTableContextColumnKey) {
  if (column === 'display_number' || column === 'primary_method') {
    return FIXED_COLUMN_LABELS[column];
  }
  return SHOT_TABLE_COLUMN_LABELS[column];
}

function isManagedColumn(
  column: ShotTableContextColumnKey
): column is ShotTableColumnKey {
  return column !== 'display_number' && column !== 'primary_method';
}

export function ShotTableContextMenu({
  productionId,
  target,
  sortKey,
  sortDirection,
  onOpenChange,
  onOpenInspector,
  onClearSelection,
  onCopyCell,
  onOpenTrash,
  onNewShot,
  onCustomFieldState,
  wrappedColumns,
  onToggleWrap,
  onSort,
  onClearSort,
  onAutoFitColumn,
  onHideColumn
}: ShotTableContextMenuProps) {
  const bulkTrash = useBulkTrashShots(productionId);
  const [pendingTrash, setPendingTrash] = useState<{
    shotIds: string[];
    label: string;
  } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const restoreFocusOnCloseRef = useRef(true);

  useEffect(() => {
    if (target?.returnFocus) {
      returnFocusRef.current = target.returnFocus;
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
          {target?.kind === 'column' && (
            <>
              <DropdownMenuLabel>
                列属性 · {columnLabel(target.column)}
              </DropdownMenuLabel>
              <DropdownMenuItem
                onSelect={() => onSort(target.column, 'asc')}
              >
                <span className="mr-2 w-4 text-center">↑</span>
                升序排序
                {sortKey === target.column && sortDirection === 'asc' && (
                  <Icons.Check className="ml-auto h-4 w-4" />
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => onSort(target.column, 'desc')}
              >
                <span className="mr-2 w-4 text-center">↓</span>
                降序排序
                {sortKey === target.column && sortDirection === 'desc' && (
                  <Icons.Check className="ml-auto h-4 w-4" />
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={sortKey !== target.column}
                onSelect={onClearSort}
              >
                <Icons.X className="mr-2 h-4 w-4" />
                清除排序
              </DropdownMenuItem>

              {isManagedColumn(target.column) && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => onAutoFitColumn(target.column as ShotTableColumnKey)}
                  >
                    <Icons.ArrowUpDown className="mr-2 h-4 w-4 rotate-90" />
                    按内容自动列宽
                  </DropdownMenuItem>
                  {['description', 'panel_frame', 'voice_over', 'camera_movement'].includes(target.column) && (
                    <DropdownMenuItem onSelect={() => onToggleWrap(target.column as ShotTableColumnKey)}>
                      {wrappedColumns.includes(target.column as ShotTableColumnKey) ? '关闭文本换行' : '开启文本换行'}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onSelect={() => onHideColumn(target.column as ShotTableColumnKey)}
                  >
                    <Icons.Columns3 className="mr-2 h-4 w-4" />
                    隐藏此列
                  </DropdownMenuItem>
                </>
              )}
            </>
          )}

          {target?.kind === 'custom-column' && (
            <>
              <DropdownMenuLabel>列属性 · {target.label}</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => onCustomFieldState(target.fieldId, target.revision, 'hidden')}>
                隐藏此列（可恢复）
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onCustomFieldState(target.fieldId, target.revision, 'removed')}>
                归档此列（可恢复）
              </DropdownMenuItem>
            </>
          )}

          {target?.kind === 'row' && (
            <>
              <DropdownMenuLabel>
                {target.shotIds.length > 1
                  ? '已选 ' + target.shotIds.length + ' 个镜头'
                  : 'SHOT ' + target.displayNumber + (target.name ? ' · ' + target.name : '')}
              </DropdownMenuLabel>

              {target.shotIds.length === 1 && (
                <DropdownMenuItem
                  onSelect={() => onOpenInspector(target.shotId)}
                >
                  <Icons.PanelRightOpen className="mr-2 h-4 w-4" />
                  编辑镜头 / 制作方式
                  <DropdownMenuShortcut>Enter</DropdownMenuShortcut>
                </DropdownMenuItem>
              )}

              {target.cellValue !== undefined && (
                <DropdownMenuItem onSelect={() => onCopyCell(target.cellValue!)}>
                  <Icons.Copy className="mr-2 h-4 w-4" />
                  复制{target.cellLabel || '单元格'}文本
                </DropdownMenuItem>
              )}

              {target.shotIds.length > 1 && (
                <DropdownMenuItem onSelect={onClearSelection}>
                  <Icons.X className="mr-2 h-4 w-4" />
                  清除多选
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={() =>
                  requestTrash(
                    target.shotIds,
                    target.shotIds.length > 1
                      ? target.shotIds.length + ' 个镜头'
                      : 'SHOT ' + target.displayNumber
                  )
                }
              >
                <Icons.Trash2 className="mr-2 h-4 w-4" />
                {target.shotIds.length > 1
                  ? '将已选 ' + target.shotIds.length + ' 个镜头移入废纸篓…'
                  : '移入废纸篓…'}
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={onNewShot}>
            <Icons.Plus className="mr-2 h-4 w-4" />新建镜头…
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onOpenTrash}>
            <Icons.Trash2 className="mr-2 h-4 w-4" />打开废纸篓 / 恢复镜头…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
