'use client';

import Link from 'next/link';
import { Button, Icons } from '@frameforge/ui';

type ShotView = 'table' | 'cards' | 'wall' | 'timeline';

/** Product views share routes and the same shot state; these are not new data owners. */
export function ShotViewNavigation({ productionId, active, count, displayedCount = count, showCount = true }: {
  productionId: string;
  active: ShotView;
  count?: number;
  displayedCount?: number;
  showCount?: boolean;
}) {
  const base = `/production/${productionId}`;
  const views = [
    { key: 'table', label: '表格', href: `${base}/shots`, icon: Icons.Table2 },
    { key: 'cards', label: '卡片', href: `${base}/storyboard?view=cards`, icon: Icons.Columns3 },
    { key: 'wall', label: '视觉墙', href: `${base}/storyboard?view=wall`, icon: Icons.LayoutGrid },
    { key: 'timeline', label: '时间线', href: `${base}/timeline`, icon: Icons.ListVideo }
  ] as const;

  return (
    <nav aria-label="分镜视图" className={`flex min-w-0 items-center gap-1 ${showCount ? 'flex-wrap' : 'flex-nowrap shrink-0 [&_a]:h-9 [&_a]:text-sm'}`}>
      {views.map(view => (
        <Button key={view.key} asChild variant={active === view.key ? 'secondary' : 'ghost'} size="sm">
          <Link href={view.href} aria-current={active === view.key ? 'page' : undefined}>
            <view.icon aria-hidden="true" />{view.label}
          </Link>
        </Button>
      ))}
      {showCount && count != null && <span className="ml-2"><ShotCountSummary count={count} displayedCount={displayedCount ?? count} /></span>}
    </nav>
  );
}

/** The same live count can accompany the heading without duplicating the view tabs. */
export function ShotCountSummary({ count, displayedCount }: { count: number; displayedCount: number }) {
  return (
    <span aria-label="镜头数量统计" className="text-xs tabular-nums text-muted-foreground">
      <span className="inline-block whitespace-nowrap">总共 <span className="inline-block min-w-[4ch] text-right">{count}</span> 镜头</span>
      <span className="inline-block whitespace-nowrap">（其中显示 <span className="inline-block min-w-[4ch] text-right">{displayedCount}</span> 镜头）</span>
    </span>
  );
}
