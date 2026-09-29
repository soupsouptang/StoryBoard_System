'use client';

import React, { useState } from 'react';
import { Button, Icons, NativeSelect } from '@frameforge/ui';
import type { Production } from '@frameforge/types';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useBulkTrashShots, useBulkUpdateShots } from '@/lib/hooks/useProduction';

interface BulkActionToolbarProps {
  production: Production;
  allShotIds: string[];
}

export function BulkActionToolbar({ production, allShotIds }: BulkActionToolbarProps) {
  const { selectedShotIds, clearSelection, selectAllShots } = useWorkspaceStore();
  const bulkUpdate = useBulkUpdateShots(production.id);
  const bulkTrash = useBulkTrashShots(production.id);

  const [selectedMethod, setSelectedMethod] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [confirmingTrash, setConfirmingTrash] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (selectedShotIds.length === 0) return null;

  const isBusy = bulkUpdate.isPending || bulkTrash.isPending;
  const allCurrentResultsSelected =
    allShotIds.length > 0 && allShotIds.every(id => selectedShotIds.includes(id));

  const applyBulkUpdate = async (
    updates: Record<string, unknown>,
    reset: () => void
  ) => {
    setActionError(null);
    try {
      await bulkUpdate.mutateAsync({ shotIds: selectedShotIds, updates });
      reset();
    } catch (error) {
      reset();
      setActionError(error instanceof Error ? error.message : '批量修改失败，请刷新后重试');
    }
  };

  const handleBulkTrash = async () => {
    setActionError(null);
    try {
      await bulkTrash.mutateAsync(selectedShotIds);
      setConfirmingTrash(false);
      clearSelection();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : '批量移入废纸篓失败，请刷新后重试');
    }
  };

  return (
    <div
      role="toolbar"
      aria-label="镜头批量操作"
      className="fixed bottom-[calc(env(safe-area-inset-bottom)+0.5rem)] left-1/2 z-40 flex w-[calc(100vw-1rem)] max-w-5xl -translate-x-1/2 flex-wrap items-center gap-2 rounded-xl border border-ring/40 bg-card/95 px-3 py-2.5 text-xs shadow-2xl backdrop-blur-md md:px-4"
    >
      <div className="flex shrink-0 items-center gap-2 border-r border-border pr-3">
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 font-mono text-[11px] font-bold text-accent-foreground">
          {selectedShotIds.length}
        </span>
        <span className="font-medium text-foreground">个镜头已选</span>
      </div>

      <div className="flex min-w-[240px] flex-1 flex-wrap items-center gap-2">
        <NativeSelect
          aria-label="批量设置制作方式"
          value={selectedMethod}
          disabled={isBusy}
          onChange={e => {
            const value = e.target.value;
            setSelectedMethod(value);
            if (value) void applyBulkUpdate({ primary_method: value }, () => setSelectedMethod(''));
          }}
          className="h-8 min-w-[155px] flex-1 cursor-pointer md:flex-none"
        >
          <option value="">制作方式…</option>
          <option value="live">实拍 (LIVE)</option>
          <option value="stock">购买素材 (STOCK)</option>
          <option value="client">客户素材 (CLIENT)</option>
          <option value="archive">历史资料 (ARCHIVE)</option>
          <option value="still">静帧 (STILL)</option>
          <option value="ae">AE 合成</option>
          <option value="mg">动效 (MG)</option>
          <option value="three_d">3D 三维</option>
          <option value="vfx">视效 (VFX)</option>
          <option value="type">文字字卡</option>
        </NativeSelect>

        <NativeSelect
          aria-label="批量设置制作状态"
          value={selectedStatus}
          disabled={isBusy}
          onChange={e => {
            const value = e.target.value;
            setSelectedStatus(value);
            if (value) void applyBulkUpdate({ status: value }, () => setSelectedStatus(''));
          }}
          className="h-8 min-w-[155px] flex-1 cursor-pointer md:flex-none"
        >
          <option value="">制作状态…</option>
          <option value="draft">规划中 (Draft)</option>
          <option value="in_progress">制作中 (In Progress)</option>
          <option value="review">待审片 (Review)</option>
          <option value="changes_requested">需修改</option>
          <option value="approved">已审批</option>
          <option value="locked">已锁定</option>
        </NativeSelect>

        <NativeSelect
          aria-label="批量设置责任部门"
          value={selectedDept}
          disabled={isBusy}
          onChange={e => {
            const value = e.target.value;
            setSelectedDept(value);
            if (value) void applyBulkUpdate({ department: value }, () => setSelectedDept(''));
          }}
          className="h-8 min-w-[155px] flex-1 cursor-pointer md:flex-none"
        >
          <option value="">责任部门…</option>
          <option value="camera">摄影组</option>
          <option value="director">导演组</option>
          <option value="production">制片组</option>
          <option value="art">美术组</option>
          <option value="stock">素材组</option>
          <option value="editorial">剪辑组</option>
          <option value="motion">动效组</option>
          <option value="three_d">三维组</option>
          <option value="vfx">视效组</option>
          <option value="sound">声音组</option>
          <option value="color">调色组</option>
        </NativeSelect>
      </div>

      <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5 border-l border-border pl-3">
        <Button
          variant="ghost"
          size="sm"
          disabled={isBusy || allCurrentResultsSelected || allShotIds.length === 0}
          onClick={() => selectAllShots(allShotIds)}
          className="h-8 text-xs"
        >
          全选当前结果
        </Button>

        <Button
          variant="ghost"
          size="sm"
          disabled={isBusy}
          onClick={() => {
            setConfirmingTrash(false);
            setActionError(null);
            clearSelection();
          }}
          className="h-8 text-xs text-muted-foreground"
        >
          取消选择
        </Button>

        {confirmingTrash ? (
          <>
            <span className="px-1 text-[11px] text-destructive">确认移入废纸篓？</span>
            <Button
              variant="destructive"
              size="sm"
              disabled={isBusy}
              onClick={() => void handleBulkTrash()}
              className="h-8 text-xs"
            >
              {bulkTrash.isPending ? '处理中…' : '确认'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={isBusy}
              onClick={() => setConfirmingTrash(false)}
              className="h-8 text-xs"
            >
              取消
            </Button>
          </>
        ) : (
          <Button
            variant="destructive"
            size="sm"
            disabled={isBusy}
            onClick={() => setConfirmingTrash(true)}
            className="flex h-8 items-center gap-1.5 text-xs"
          >
            <Icons.Trash2 className="h-3.5 w-3.5" />
            移入废纸篓
          </Button>
        )}
      </div>

      {actionError && (
        <div role="alert" className="flex basis-full items-start gap-2 border-t border-border pt-2 text-[11px] text-destructive">
          <Icons.AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0 flex-1">{actionError}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActionError(null)}
            className="h-6 px-2 text-[11px] text-destructive"
          >
            关闭
          </Button>
        </div>
      )}
    </div>
  );
}
