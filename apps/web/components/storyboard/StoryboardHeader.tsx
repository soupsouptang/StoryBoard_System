'use client';

import React, { useState } from 'react';
import {
  Button, Checkbox, Icons, Input, Popover, PopoverContent, PopoverTrigger, Select
} from '@frameforge/ui';
import type { Production, Sequence, Shot } from '@frameforge/types';
import { framesToSeconds, framesToTimecode } from '@frameforge/timecode';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { ShotViewNavigation } from '@/components/shot/ShotViewNavigation';

interface StoryboardHeaderProps {
  production: Production;
  sequences: Sequence[];
  shots: Shot[];
  filteredShots: Shot[];
  activeView?: 'cards' | 'wall';
}

export function StoryboardHeader({
  production, sequences, shots, filteredShots, activeView = 'cards'
}: StoryboardHeaderProps) {
  const [showDisplaySettings, setShowDisplaySettings] = useState(false);
  const {
    cardSize, setCardSize, groupBySequence, setGroupBySequence,
    filters, setFilter, resetFilters, setImportModalOpen,
    setVOTimingModalOpen, setNewShotModalOpen
  } = useWorkspaceStore();
  const fps = production.fps_num / (production.fps_den || 1);
  const totalFrames = filteredShots.reduce((sum, shot) => sum + shot.duration_frames, 0);
  const filterCount = [
    Boolean(filters.searchQuery.trim()), filters.sequenceId !== 'all',
    filters.primaryMethod !== 'all', filters.department !== 'all',
    filters.status !== 'all', filters.timingLocked !== null, filters.vfxRequired !== null
  ].filter(Boolean).length;
  const departments = [...new Set(shots.map(shot => shot.department).filter(Boolean))];
  const booleanOptions = [
    { value: 'all', label: '全部' }, { value: 'true', label: '是' }, { value: 'false', label: '否' }
  ];

  return (
    <header className="z-10 shrink-0 border-b border-border bg-background">
      <div className="flex items-center justify-between gap-4 px-4 py-3">
        <div className="min-w-0">
          <ShotViewNavigation productionId={production.id} active={activeView} count={shots.length} />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" onClick={() => setImportModalOpen(true)}>
            <Icons.Table2 />导入分镜表
          </Button>
          <Button variant="outline" onClick={() => setVOTimingModalOpen(true)}>
            <Icons.Clock3 />自动计时
          </Button>
          <Button onClick={() => setNewShotModalOpen(true)}>
            <Icons.Plus />新建镜头
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-border px-4 py-3">
        <div className="w-80 max-w-full">
          <Input
            type="search"
            value={filters.searchQuery}
            onChange={event => setFilter('searchQuery', event.target.value)}
            placeholder="搜索镜号、标题、描述、旁白、负责人"
            aria-label="搜索镜头"
          />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">
              <Icons.Filter />筛选{filterCount > 0 ? ' · ' + filterCount : ''}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80 space-y-4">
            <h2 className="text-sm font-semibold">镜头筛选</h2>
            <label className="grid gap-2 text-sm">
              篇章
              <Select label="篇章" value={filters.sequenceId}
                onChange={value => setFilter('sequenceId', value)}
                options={[{ value: 'all', label: '所有篇章' }, ...sequences.map(sequence => ({
                  value: sequence.id, label: sequence.name
                }))]} />
            </label>
            <label className="grid gap-2 text-sm">
              主制作方式
              <Select label="主制作方式" value={filters.primaryMethod}
                onChange={value => setFilter('primaryMethod', value)}
                options={[
                  { value: 'all', label: '所有制作方式' },
                  { value: 'live', label: '实拍 · LIVE' },
                  { value: 'stock', label: '购买素材 · STOCK' },
                  { value: 'client', label: '客户素材 · CLIENT' },
                  { value: 'archive', label: '历史资料 · ARCHIVE' },
                  { value: 'ae', label: 'AE 合成' }, { value: 'mg', label: '动效 · MG' },
                  { value: 'three_d', label: '3D 三维' }, { value: 'vfx', label: '视效 · VFX' },
                  { value: 'type', label: '字卡 · TYPE' }, { value: 'custom', label: '自定义' }
                ]} />
            </label>
            <label className="grid gap-2 text-sm">
              制作状态
              <Select label="制作状态" value={filters.status}
                onChange={value => setFilter('status', value)}
                options={[
                  { value: 'all', label: '所有状态' }, { value: 'draft', label: '草稿' },
                  { value: 'ready', label: '已就绪' }, { value: 'scheduled', label: '已排期' },
                  { value: 'in_progress', label: '制作中' }, { value: 'review', label: '待审片' },
                  { value: 'changes_requested', label: '需修改' }, { value: 'approved', label: '已批准' },
                  { value: 'locked', label: '已锁定' }, { value: 'cancelled', label: '已取消' }
                ]} />
            </label>
            <label className="grid gap-2 text-sm">
              部门
              <Select label="部门" value={filters.department}
                onChange={value => setFilter('department', value)}
                options={[{ value: 'all', label: '所有部门' }, ...departments.map(department => ({
                  value: department!, label: department!
                }))]} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-2 text-sm">
                时长锁定
                <Select label="时长锁定" value={filters.timingLocked === null ? 'all' : String(filters.timingLocked)}
                  onChange={value => setFilter('timingLocked', value === 'all' ? null : value === 'true')}
                  options={booleanOptions} />
              </label>
              <label className="grid gap-2 text-sm">
                需要 VFX
                <Select label="需要 VFX" value={filters.vfxRequired === null ? 'all' : String(filters.vfxRequired)}
                  onChange={value => setFilter('vfxRequired', value === 'all' ? null : value === 'true')}
                  options={booleanOptions} />
              </label>
            </div>
            <Button variant="outline" onClick={resetFilters} disabled={filterCount === 0}>
              <Icons.X />重置筛选
            </Button>
          </PopoverContent>
        </Popover>

        <Button variant="outline" aria-expanded={showDisplaySettings}
          aria-controls="storyboard-display-settings"
          onClick={() => setShowDisplaySettings(value => !value)}>
          <Icons.SlidersHorizontal />显示设置
        </Button>
        <div className="ml-auto flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span>{filteredShots.length} / {shots.length} 镜头</span>
          <span className="font-mono tabular-nums">{framesToSeconds(totalFrames, fps).toFixed(1)}s · {totalFrames}f</span>
          <span className="font-mono tabular-nums">{framesToTimecode(totalFrames, fps, production.drop_frame)}</span>
        </div>
      </div>

      {showDisplaySettings && (
        <div id="storyboard-display-settings" className="flex items-center gap-6 border-t border-border px-4 py-3">
          <label className="flex items-center gap-3 text-sm">
            {activeView === 'wall' ? '缩略图大小' : '卡片大小'}
            <div className="w-40">
              <Select label="卡片或缩略图大小" value={cardSize}
                onChange={value => {
                  if (value === 'sm' || value === 'md' || value === 'lg') setCardSize(value);
                }}
                options={[{ value: 'sm', label: '小' }, { value: 'md', label: '中' }, { value: 'lg', label: '大' }]} />
            </div>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={groupBySequence} disabled={activeView === 'wall'}
              onCheckedChange={checked => setGroupBySequence(checked === true)} />
            卡片按篇章分组
          </label>
        </div>
      )}
    </header>
  );
}