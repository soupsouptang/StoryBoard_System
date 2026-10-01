'use client';

import React from 'react';
import {
  Button,
  Checkbox,
  Icons,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select
} from '@frameforge/ui';
import {
  SHOT_TABLE_COLUMN_LABELS,
  type ShotTableColumnKey,
  type ShotTableRowHeight
} from '@/lib/shot-table-presentation';

interface ShotColumnManagerProps {
  columnOrder: ShotTableColumnKey[];
  hiddenColumns: ShotTableColumnKey[];
  rowHeight: ShotTableRowHeight;
  onVisibleChange: (column: ShotTableColumnKey, visible: boolean) => void;
  onMove: (column: ShotTableColumnKey, direction: -1 | 1) => void;
  onRowHeightChange: (value: ShotTableRowHeight) => void;
  onReset: () => void;
}

export function ShotColumnManager({
  columnOrder,
  hiddenColumns,
  rowHeight,
  onVisibleChange,
  onMove,
  onRowHeightChange,
  onReset
}: ShotColumnManagerProps) {
  return (
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

        <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
          {columnOrder.map((column, index) => {
            const visible = !hiddenColumns.includes(column);
            return (
              <div
                key={column}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent/60"
              >
                <Checkbox
                  checked={visible}
                  onCheckedChange={checked => onVisibleChange(column, checked === true)}
                  aria-label={
                    visible
                      ? `隐藏${SHOT_TABLE_COLUMN_LABELS[column]}`
                      : `显示${SHOT_TABLE_COLUMN_LABELS[column]}`
                  }
                />
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                  {SHOT_TABLE_COLUMN_LABELS[column]}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={index === 0}
                  onClick={() => onMove(column, -1)}
                  className="h-7 px-2 text-[11px]"
                  aria-label={`上移${SHOT_TABLE_COLUMN_LABELS[column]}`}
                >
                  上移
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={index === columnOrder.length - 1}
                  onClick={() => onMove(column, 1)}
                  className="h-7 px-2 text-[11px]"
                  aria-label={`下移${SHOT_TABLE_COLUMN_LABELS[column]}`}
                >
                  下移
                </Button>
              </div>
            );
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
  );
}
