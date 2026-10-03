'use client';

import React, { useState } from 'react';
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle, Select } from '@frameforge/ui';
import { ShotFeedbackDialog } from '@/components/shot/ShotFeedbackDialog';
import type { Production } from '@frameforge/types';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useBulkTrashShots, useBulkUpdateShots } from '@/lib/hooks/useProduction';

interface BulkActionToolbarProps {
  production: Production;
  allShotIds: string[];
}

export function BulkActionToolbar({ production }: BulkActionToolbarProps) {
  const { selectedShotIds, clearSelection } = useWorkspaceStore();
  const bulkUpdate = useBulkUpdateShots(production.id);
  const bulkTrash = useBulkTrashShots(production.id);

  const [selectedMethod, setSelectedMethod] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [confirmingTrash, setConfirmingTrash] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (selectedShotIds.length === 0) return null;

  const isBusy = bulkUpdate.isPending || bulkTrash.isPending;


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
      className="flex w-full shrink-0 flex-wrap items-center gap-2 border-b border-border bg-muted/30 px-4 py-2.5 text-xs"
    >
      <div className="flex shrink-0 items-center gap-2 pr-3">
        <span className="flex h-5 w-7 items-center justify-center rounded-md bg-blue-500 px-1 font-mono tabular-nums text-[11px] font-bold text-white">
          {Math.min(selectedShotIds.length, 99)}
        </span>
        <span className="font-medium text-foreground">点击要修改的列标题或单元格</span>
      </div>

      <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto">
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

      <div className="ml-auto mr-6 flex flex-wrap items-center justify-end gap-2 border-l border-border pl-3">


          <Button
            variant="destructive"
            size="sm"
            disabled={isBusy}
            onClick={() => setConfirmingTrash(true)}
            aria-label={`删除 ${selectedShotIds.length} 个镜头`}
            className="flex h-9 w-[100px] shrink-0 items-center justify-center gap-0 bg-[#e11d48] text-sm tracking-normal hover:bg-[#be123c] dark:bg-[#e11d48] dark:hover:bg-[#be123c]"
          >
            {selectedShotIds.length === 1 ? '删除镜头' : <>删除<span className="inline-block w-[2ch] text-center tabular-nums">{selectedShotIds.length > 99 ? '···' : selectedShotIds.length}</span>镜</>}
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
          className="h-9 w-[100px] text-sm tracking-normal text-muted-foreground"
        >
          取消选择
        </Button>
      </div>

      <Dialog open={confirmingTrash} onOpenChange={setConfirmingTrash}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>删除镜头</DialogTitle>
          <DialogDescription>确认将所选 {selectedShotIds.length} 个镜头移入废纸篓？之后可恢复。</DialogDescription>
          {actionError && <p role="alert" className="text-sm text-destructive">{actionError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmingTrash(false)}>取消</Button>
            <Button variant="destructive" disabled={isBusy} onClick={() => void handleBulkTrash()}>{bulkTrash.isPending ? '处理中…' : '确认'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ShotFeedbackDialog message={confirmingTrash ? null : actionError} onClose={() => setActionError(null)} />
    </div>
  );
}
