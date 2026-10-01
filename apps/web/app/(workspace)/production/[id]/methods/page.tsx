'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button, Card } from '@frameforge/ui';
import { useShots } from '@/lib/hooks/useProduction';
import { groupShotsByMethod, shotMethodValues } from '@/lib/shot-display';
import { getMethodLabel } from '@/lib/media-resolver';
import { useAuthStore } from '@/stores/authStore';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';

export default function MethodGroupsPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === 'string' ? params.id : '';
  const { data: shots = [], isLoading, error, refetch } = useShots(id);
  const locale = useAuthStore(state => state.locale);
  const { selectShot, resetFilters } = useWorkspaceStore();

  if (isLoading) return <div role="status" className="p-4 text-sm text-muted-foreground">正在加载制作方式分组…</div>;
  if (error) return <div role="alert" className="space-y-3 p-4"><p>制作方式分组加载失败。</p><Button onClick={() => void refetch()}>重试</Button></div>;

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-lg font-semibold">制作方式分组</h1>
      <p className="text-xs text-muted-foreground">主方式和辅助方式均参与分组，同一镜头可出现在多个组。</p>
      {shots.length === 0 ? <p className="text-sm text-muted-foreground">当前项目暂无镜头。</p> : (
        <div className="grid items-start gap-3 lg:grid-cols-2">
          {Array.from(groupShotsByMethod(shots), ([method, group]) => (
            <Card key={method} className="gap-0 overflow-hidden py-0">
              <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-3">
                <h2 className="text-sm font-semibold">{getMethodLabel(method, locale)}</h2>
                <span className="text-xs text-muted-foreground">{group.length} 镜头 · 含主/辅制作方式</span>
              </div>
              <div className="divide-y divide-border">
                {group.map(shot => (
                  <button key={shot.id} type="button" onClick={() => {
                    resetFilters();
                    selectShot(shot.id);
                    router.push(`/production/${id}/shots`);
                  }} className="flex w-full items-center gap-3 px-3 py-2 text-left text-xs outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
                    <span className="shrink-0 font-semibold">SHOT {shot.display_number}</span>
                    <span className="min-w-0 flex-1 truncate">{shot.name || '未命名镜头'}</span>
                    <span className="min-w-0 text-right text-muted-foreground">{shot.primary_method === method ? '主制作方式' : '辅助制作方式'} · {shotMethodValues(shot).map(value => getMethodLabel(value, locale)).join(' / ')}</span>
                  </button>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
