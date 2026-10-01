'use client';

import Link from 'next/link';
import { Button, Icons } from '@frameforge/ui';

type ShotView = 'table' | 'cards' | 'wall' | 'timeline';

/** Product views share routes and the same shot state; these are not new data owners. */
export function ShotViewNavigation({ productionId, active, count }: {
  productionId: string;
  active: ShotView;
  count?: number;
}) {
  const base = `/production/${productionId}`;
  const views = [
    { key: 'table', label: '表格', href: `${base}/shots`, icon: Icons.Table2 },
    { key: 'cards', label: '卡片', href: `${base}/storyboard?view=cards`, icon: Icons.Columns3 },
    { key: 'wall', label: '视觉墙', href: `${base}/storyboard?view=wall`, icon: Icons.LayoutGrid },
    { key: 'timeline', label: '时间线', href: `${base}/timeline`, icon: Icons.ListVideo }
  ] as const;

  return (
    <nav aria-label="分镜视图" className="flex shrink-0 items-center gap-1">
      {views.map(view => (
        <Button key={view.key} asChild variant={active === view.key ? 'secondary' : 'ghost'} size="sm">
          <Link href={view.href} aria-current={active === view.key ? 'page' : undefined}>
            <view.icon aria-hidden="true" />{view.label}
          </Link>
        </Button>
      ))}
      {count != null && <span className="ml-2 whitespace-nowrap text-xs tabular-nums text-muted-foreground">{count} 镜头</span>}
    </nav>
  );
}
