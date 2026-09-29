'use client';

import React, { useState } from 'react';
import { Button, Icons } from '@frameforge/ui';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

interface NavRailProps {
  productionId: string;
}

export function NavRail({ productionId }: NavRailProps) {
  const pathname = usePathname();
  const t = useAuthStore(s => s.t);
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    {
      href: `/production/${productionId}/storyboard`,
      icon: Icons.Clapperboard,
      label: t('storyboard')
    },
    {
      href: `/production/${productionId}/shots`,
      icon: Icons.Table2,
      label: t('shotList')
    },
    {
      href: `/production/${productionId}/timeline`,
      icon: Icons.ListVideo,
      label: t('timeline')
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
      href: `/production/${productionId}/settings`,
      icon: Icons.Settings,
      label: t('settings')
    }
  ];

  return (
    <nav
      aria-label="项目工作区导航"
      className={`relative z-20 flex h-14 w-full shrink-0 flex-row border-b border-border bg-background transition-all duration-200 select-none after:pointer-events-none after:absolute after:right-0 after:top-0 after:h-14 after:w-7 after:bg-gradient-to-l after:from-background after:to-transparent md:h-auto md:flex-col md:border-b-0 md:border-r md:after:hidden ${
        collapsed ? 'md:w-16' : 'md:w-56'
      }`}
    >
      {/* Navigation List */}
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto px-2 py-1 pr-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:block md:space-y-1 md:overflow-x-hidden md:overflow-y-auto md:px-2 md:py-4 md:pr-2">
        {navItems.map(item => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2.5 text-xs transition md:gap-3 ${
                isActive
                  ? 'bg-accent text-accent-foreground font-bold shadow-md shadow-foreground/10'
                  : 'text-muted-foreground hover:bg-card hover:text-foreground'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-accent-foreground' : 'text-muted-foreground group-hover:text-foreground'}`} />

              <span className={`truncate leading-tight ${collapsed ? 'md:hidden' : ''}`}>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Collapse/Expand Toggle Footer */}
      <div className="hidden border-t border-border p-2 md:block">
        <Button variant="ghost" size="sm"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? '展开侧边栏' : '收起侧边栏'}
          className="flex w-full items-center justify-center gap-2 rounded-lg p-2 text-muted-foreground hover:bg-card hover:text-foreground transition text-xs"
        >
          {collapsed ? <Icons.ChevronRight className="h-4 w-4" /> : <Icons.ChevronLeft className="h-4 w-4" />}
          {!collapsed && <span>收起侧边栏</span>}
        </Button>
      </div>
    </nav>
  );
}
