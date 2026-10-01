'use client';

import { Badge, Button, Icons } from '@frameforge/ui';

import React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useProduction } from '@/lib/hooks/useProduction';
import { TopBar } from '@/components/app-shell/TopBar';
import { NavRail } from '@/components/app-shell/NavRail';

export default function ProductionLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === 'string' ? params.id : '';

  const { data: production, isLoading, error } = useProduction(id);

  if (isLoading) {
    return (
      <div className="flex h-screen h-[100dvh] w-screen flex-col bg-background">
        <TopBar />
        <div className="flex flex-1 items-center justify-center text-muted-foreground font-mono text-xs">
          <div className="flex items-center gap-3">
            <Icons.Film className="animate-spin h-5 w-5 text-foreground" />
            <span>正在载入数据...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !production) {
    return (
      <div className="flex h-screen h-[100dvh] w-screen flex-col bg-background">
        <TopBar />
        <div className="flex flex-1 flex-col items-center justify-center text-center p-8">
          <Icons.TriangleAlert className="h-12 w-12 text-destructive mb-3" />
          <h2 className="text-base font-bold text-foreground mb-2">未找到该项目</h2>
          <p className="text-xs text-muted-foreground mb-6 max-w-sm">
            该项目可能已被归档或删除，或者当前账号未获得访问权限。
          </p>
          <Button
            onClick={() => router.push('/productions')}
          >
            返回项目列表
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen h-[100dvh] w-screen flex-col overflow-hidden bg-background pb-[env(safe-area-inset-bottom)] select-none">
      {/* Top Header */}
      <TopBar production={production} />

      {/* Main Workspace Frame */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
        {/* Navigation Sidebar */}
        <NavRail productionId={production.id} />

        {/* Dynamic Route Content */}
        <main className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
          <div aria-label="项目信息" className="flex min-h-11 shrink-0 flex-wrap items-center justify-between gap-2 border-b px-4 py-1">
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              {production.code && <Badge variant="outline" className="shrink-0">{production.code}</Badge>}
              <h1 className="truncate text-sm font-semibold">{production.name}</h1>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{production.shot_count ?? 0} 镜头 · {Number((production.fps_num / (production.fps_den || 1)).toFixed(3))} fps · {production.aspect_ratio}</span>
            </div>
            <Button asChild variant="ghost" size="sm"><Link href={`/production/${production.id}/settings`}><Icons.Settings aria-hidden="true" />项目设置</Link></Button>
          </div>
          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
