'use client';

import React, { useState } from 'react';
import { Button, Icons, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@frameforge/ui';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

interface NavRailProps {
  productionId: string;
}

export function NavRail({ productionId }: NavRailProps) {
  const pathname = usePathname();
  const t = useAuthStore(s => s.t);
  const [collapsed, setCollapsed] = useState(true);

  const navItems = [
    {
      href: `/production/${productionId}/shots`,
      icon: Icons.Table2,
      label: '分镜制作',
      activeRoutes: ['shots', 'storyboard', 'timeline']
    },
    {
      href: `/production/${productionId}/methods`,
      icon: Icons.Layers,
      label: t('methodGroups')
    },
    {
      href: `/production/${productionId}/assets`,
      icon: Icons.Images,
      label: t('assets')
    },
    {
      href: `/production/${productionId}/review`,
      icon: Icons.MessageSquare,
      label: t('review')
    },
    {
      href: `/production/${productionId}/deliverables`,
      icon: Icons.FileDown,
      label: t('deliverables')
    },
    {
      href: `/production/${productionId}/overview`,
      icon: Icons.ChartNoAxesCombined,
      label: t('overview')
    },
    {
      href: `/production/${productionId}/settings`,
      icon: Icons.Settings,
      label: t('settings')
    }
  ];

  return (
    <nav
      aria-label="项目工作区导航"
      className={`relative z-20 flex h-[var(--ff-shell-mobile-nav-h)] w-full shrink-0 flex-row border-b border-border bg-background transition-[width] duration-[var(--ff-motion-normal)] motion-reduce:transition-none select-none after:pointer-events-none after:absolute after:right-0 after:top-0 after:h-[var(--ff-shell-mobile-nav-h)] after:w-7 after:bg-gradient-to-l after:from-background after:to-transparent after:backdrop-blur-[3px] md:h-auto md:flex-col md:border-b-0 md:border-r md:after:hidden ${
        collapsed
          ? 'md:w-[var(--ff-shell-nav-collapsed-w)]'
          : 'md:w-[var(--ff-shell-nav-expanded-w)]'
      }`}
    >
      {/* Navigation List */}
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto px-2 py-1 pr-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:block md:space-y-1 md:overflow-x-hidden md:overflow-y-auto md:px-2 md:py-4 md:pr-2">
        <TooltipProvider>{navItems.map(item => {
          const isActive = item.activeRoutes
            ? item.activeRoutes.some(route => pathname.startsWith(`/production/${productionId}/${route}`))
            : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>
                <Button asChild variant={isActive ? 'secondary' : 'ghost'} size="sm" className={`group justify-start md:w-full ${collapsed ? 'md:justify-center' : ''}`}>
                  <Link href={item.href} aria-label={item.label} aria-current={isActive ? 'page' : undefined}>
                    <Icon aria-hidden="true" className={`h-4 w-4 ${isActive ? 'text-accent-foreground' : 'text-muted-foreground group-hover:text-foreground'}`} />
                    <span className={`truncate leading-tight ${collapsed ? 'md:hidden' : ''}`}>{item.label}</span>
                  </Link>
                </Button>
              </TooltipTrigger>
              {collapsed && <TooltipContent side="right">{item.label}</TooltipContent>}
            </Tooltip>
          );
        })}</TooltipProvider>
      </div>

      {/* Collapse/Expand Toggle Footer */}
      <div className="hidden border-t border-border p-2 md:block">
        <Button variant="ghost" size="sm"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? '展开侧边栏' : '收起侧边栏'}
          className="flex w-full items-center justify-center gap-2 text-xs text-muted-foreground"
        >
          {collapsed ? <Icons.ChevronRight className="h-4 w-4" /> : <Icons.ChevronLeft className="h-4 w-4" />}
          {!collapsed && <span>收起侧边栏</span>}
        </Button>
      </div>
    </nav>
  );
}
