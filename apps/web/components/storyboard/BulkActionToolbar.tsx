'use client';

import React, { useState } from 'react';
import { Button, Icons, Select } from '@frameforge/ui';
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
      className="flex w-full shrink-0 flex-wrap items-center gap-2 border-b bg-muted/30 px-3 py-2.5 text-xs md:px-4"
    >
      <div className="flex shrink-0 items-center gap-2 border-r border-border pr-3">
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 font-mono text-[11px] font-bold text-accent-foreground">
          {selectedShotIds.length}
        </span>
        <span className="font-medium text-foreground">个镜头已选</span>
      </div>

      <div className="flex min-w-[240px] flex-1 flex-wrap items-center gap-2">
        <Select
          label="批量设置制作方式"
          value={selectedMethod}
          disabled={isBusy}
          onChange={value => {
            setSelectedMethod(value);
            if (value) void applyBulkUpdate({ primary_method: value }, () => setSelectedMethod(''));
          }}
          options={[
            { value: '', label: '制作方式…' },
            { value: 'live', label: '实拍 (LIVE)' },
            { value: 'stock', label: '购买素材 (STOCK)' },
            { value: 'client', label: '客户素材 (CLIENT)' },
            { value: 'archive', label: '历史资料 (ARCHIVE)' },
            { value: 'still', label: '静帧 (STILL)' },
            { value: 'ae', label: 'AE 合成' },
            { value: 'mg', label: '动效 (MG)' },
            { value: 'three_d', label: '3D 三维' },
            { value: 'vfx', label: '视效 (VFX)' },
            { value: 'type', label: '文字字卡' },
          ]}
          className="w-[170px] min-w-0"
        />

        <Select
          label="批量设置制作状态"
          value={selectedStatus}
          disabled={isBusy}
          onChange={value => {
            setSelectedStatus(value);
            if (value) void applyBulkUpdate({ status: value }, () => setSelectedStatus(''));
          }}
          options={[
            { value: '', label: '制作状态…' },
            { value: 'draft', label: '规划中 (Draft)' },
            { value: 'in_progress', label: '制作中 (In Progress)' },
            { value: 'review', label: '待审片 (Review)' },
            { value: 'changes_requested', label: '需修改' },
            { value: 'approved', label: '已审批' },
            { value: 'locked', label: '已锁定' },
          ]}
          className="w-[170px] min-w-0"
        />

        <Select
          label="批量设置责任部门"
          value={selectedDept}
          disabled={isBusy}
          onChange={value => {
            setSelectedDept(value);
            if (value) void applyBulkUpdate({ department: value }, () => setSelectedDept(''));
          }}
          options={[
            { value: '', label: '责任部门…' },
            { value: 'camera', label: '摄影组' },
            { value: 'director', label: '导演组' },
            { value: 'production', label: '制片组' },
            { value: 'art', label: '美术组' },
            { value: 'stock', label: '素材组' },
            { value: 'editorial', label: '剪辑组' },
            { value: 'motion', label: '动效组' },
            { value: 'three_d', label: '三维组' },
            { value: 'vfx', label: '视效组' },
            { value: 'sound', label: '声音组' },
            { value: 'color', label: '调色组' },
          ]}
          className="w-[170px] min-w-0"
        />
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
