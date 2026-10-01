'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { Button, Card } from '@frameforge/ui';
import { useShots } from '@/lib/hooks/useProduction';
import { groupShotsByMethod } from '@/lib/shot-display';

export default function ProductionOverviewPage() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : '';
  const { data: shots = [], isLoading, error, refetch } = useShots(id);
  const groups = groupShotsByMethod(shots);
  if (isLoading) return <div role="status" className="p-4 text-sm text-muted-foreground">正在加载制作概览…</div>;
  if (error) return <div role="alert" className="space-y-3 p-4"><p>制作概览加载失败。</p><Button onClick={() => void refetch()}>重试</Button></div>;
  const metrics = [
    ['总镜头数', shots.length],
    ['LIVE 实拍镜头', groups.get('live')?.length || 0],
    ['STOCK 素材采购', groups.get('stock')?.length || 0],
    ['后期与特效制作', (groups.get('ae')?.length || 0) + (groups.get('vfx')?.length || 0)]
  ];
  return (
    <div className="space-y-4 p-4">
      <h1 className="text-lg font-semibold">制作概览</h1>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([label, value]) => <Card key={label} className="gap-1 p-4">
          <span className="text-2xl font-semibold tabular-nums">{value}</span>
          <h2 className="text-xs text-muted-foreground">{label}</h2>
        </Card>)}
      </div>
      <p className="text-xs text-muted-foreground">主方式与辅助方式均参与统计；后期与特效按 AE 和 VFX 的制作任务数相加，同一镜头可同时计入两项。</p>
    </div>
  );
}
