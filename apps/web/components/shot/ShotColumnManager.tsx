'use client';

import React, { useState } from 'react';
import { useColumnCatalog, useSetBuiltinColumnState, useSetCustomFieldState, type CatalogColumn } from '@/lib/hooks/useCustomFields';
import {
  Button,
  Checkbox,
  Icons,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select, Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter
} from '@frameforge/ui';
import {
  SHOT_TABLE_COLUMN_LABELS,
  type ShotTableColumnKey,
  type ShotTableRowHeight
} from '@/lib/shot-table-presentation';

interface ShotColumnManagerProps {
  productionId: string;
  columnOrder: ShotTableColumnKey[];
  hiddenColumns: ShotTableColumnKey[];
  rowHeight: ShotTableRowHeight;
  columnLabels?: Record<string, string>;
  onVisibleChange: (column: ShotTableColumnKey, visible: boolean) => void;
  onMove: (column: ShotTableColumnKey, direction: -1 | 1) => void;
  onRowHeightChange: (value: ShotTableRowHeight) => void;
  onReset: () => void;
}

export function ShotColumnManager({
  productionId,
  columnOrder,
  hiddenColumns,
  rowHeight,
  columnLabels = SHOT_TABLE_COLUMN_LABELS,
  onVisibleChange,
  onMove,
  onRowHeightChange,
  onReset
}: ShotColumnManagerProps) {
  const catalog = useColumnCatalog(productionId);
  const builtinState = useSetBuiltinColumnState(productionId);
  const customState = useSetCustomFieldState(productionId);
  const [tab, setTab] = useState('builtin');
  const [pendingDelete, setPendingDelete] = useState<CatalogColumn | null>(null);
  const [error, setError] = useState('');
  const pending = builtinState.isPending || customState.isPending;
  const changeState = async (row: CatalogColumn, state: 'visible' | 'removed') => {
    setError('');
    try {
      if (row.catalog_key) await builtinState.mutateAsync({ column: row.catalog_key, state, revision: row.instance?.revision ?? 0 });
      else if (row.instance) await customState.mutateAsync({ id: row.instance.id, state, revision: row.instance.revision });
      setPendingDelete(null); await catalog.refetch();
    } catch (reason) { setError(reason instanceof Error ? reason.message : '修改失败，请重试。'); }
  };
  const rows = (catalog.data || []).filter(row => tab === 'trash' ? row.instance?.state === 'removed' : row.column_class === tab && row.instance?.state !== 'removed');
  return (
    <>
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 text-xs">
          <Icons.Columns3 className="h-3.5 w-3.5" />
          列管理
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="flex max-h-[var(--radix-popover-content-available-height)] w-[min(360px,calc(100vw-24px))] flex-col overflow-hidden p-0"
      >
        <div className="border-b border-border px-3 py-2.5">
          <div className="text-sm font-medium text-foreground">镜头表显示</div>
          <div className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
            镜号默认固定；开启“冻结列”后可点击表头冻结其他列。其余列可隐藏、调整顺序和宽度。可通过“保存视图”同步项目布局。
          </div>
        </div>

        <div className="flex gap-1 border-b p-2" role="tablist" aria-label="列类别">{[['builtin','内置列'],['preset','预设列'],['custom','自定义列'],['trash','回收站']].map(([key,label]) => <Button key={key} size="sm" variant={tab === key ? 'secondary' : 'ghost'} role="tab" aria-selected={tab === key} onClick={() => setTab(key)}>{label}</Button>)}</div>
        <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
          {catalog.isPending && <p role="status" className="p-3 text-sm">正在读取列目录…</p>}
          {(catalog.error || error) && <p role="alert" className="p-3 text-sm text-destructive">{error || String(catalog.error)}</p>}
          {!catalog.isPending && !rows.length && <p className="p-3 text-sm text-muted-foreground">此分类暂无列。</p>}
          {rows.map(row => {
            const column = row.catalog_key as ShotTableColumnKey | null;
            const key = row.instance?.column_key || column!;
            const index = column ? columnOrder.indexOf(column) : -1;
            const visible = row.instance?.state === 'visible' && (!column || !hiddenColumns.includes(column));
            return <div key={key} className="flex items-center gap-2 rounded-md px-2 py-2 hover:bg-accent/60">
              {column && row.instance && row.instance.state !== 'removed' && <Checkbox checked={visible} aria-label={`显示${row.label}`} onCheckedChange={checked => onVisibleChange(column, checked === true)} />}
              <span className="min-w-0 flex-1 truncate text-sm">{columnLabels[key] || row.label}{tab === 'trash' && <span className="ml-1 text-xs text-muted-foreground">{({ builtin: '内置', preset: '预设', custom: '自定义' })[row.column_class]}</span>}</span>
              {tab === 'trash' ? <Button size="sm" variant="outline" disabled={pending} onClick={() => void changeState(row, 'visible')}>恢复</Button> : !row.instance ? <Button size="sm" variant="outline" disabled={pending || row.binding_kind === 'pending'} title={row.binding_kind === 'pending' ? '字段映射合同待确认' : undefined} onClick={() => void changeState(row, 'visible')}>{row.binding_kind === 'pending' ? '待映射' : '添加'}</Button> : <>
                {index >= 0 && <><Button size="sm" variant="ghost" disabled={index === 0} aria-label={`上移${row.label}`} onClick={() => onMove(column!, -1)}>↑</Button><Button size="sm" variant="ghost" disabled={index === columnOrder.length - 1} aria-label={`下移${row.label}`} onClick={() => onMove(column!, 1)}>↓</Button></>}
                <Button size="sm" variant="ghost" disabled={pending} onClick={() => { setError(''); setPendingDelete(row); }}>删除</Button>
              </>}
            </div>;
          })}
        </div>

        <div className="shrink-0 space-y-2 border-t border-border p-3">
          <div className="grid grid-cols-[72px_minmax(0,1fr)] items-center gap-2">
            <span className="text-xs text-muted-foreground">表格行高</span>
            <Select
              label="表格行高"
              value={rowHeight}
              onChange={value => onRowHeightChange(value as ShotTableRowHeight)}
              options={[
                { value: 'compact', label: '紧凑' },
                { value: 'standard', label: '标准' },
                { value: 'comfortable', label: '舒适' },
                { value: 'auto', label: '自动' }
              ]}
              className="h-8 text-xs"
            />
          </div>
          <Button variant="ghost" size="sm" onClick={onReset} className="h-8 w-full text-xs">
            恢复默认列布局
          </Button>
        </div>
      </PopoverContent>
    </Popover>
    <Dialog open={Boolean(pendingDelete)} onOpenChange={open => { if (!open && !pending) setPendingDelete(null); }}><DialogContent className="max-w-md" onEscapeKeyDown={event => { event.preventDefault(); setPendingDelete(null); }}><DialogTitle>删除此列</DialogTitle><DialogDescription>确认将“{pendingDelete?.label}”移入回收站？数据保留，恢复后重新显示。{pendingDelete?.column_class === 'builtin' && '内置列不允许永久删除。'}</DialogDescription>{error && <p role="alert">{error}</p>}<DialogFooter><Button variant="outline" disabled={pending} onClick={() => setPendingDelete(null)}>取消</Button><Button variant="destructive" disabled={pending} onClick={() => pendingDelete && void changeState(pendingDelete, 'removed')}>{pending ? '删除中…' : '确认删除'}</Button></DialogFooter></DialogContent></Dialog>
    </>
  );
}
