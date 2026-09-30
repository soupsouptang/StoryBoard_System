'use client';

import React from 'react';
import { Badge, Button, Icons } from '@frameforge/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Production } from '@frameforge/types';
import { useAuthStore } from '@/stores/authStore';

interface TopBarProps {
  production?: Production | null;
}

export function TopBar({ production }: TopBarProps) {
  const router = useRouter();
  const { user, logout, locale, setLocale, theme, setTheme, t } = useAuthStore();

  return (
    <header className="sticky top-0 z-30 flex h-[var(--ff-shell-topbar-h)] shrink-0 items-center justify-between gap-2 border-b border-border bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-5">
      {/* Left: Brand & Breadcrumb */}
      <div className="flex min-w-0 items-center gap-3">
        <Link href="/productions" aria-label="FrameForge 首页" className="group flex shrink-0 items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-muted/50 text-foreground transition-colors group-hover:bg-accent">
            <Icons.Film className="h-4 w-4" aria-hidden="true" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-foreground max-[360px]:hidden">
            {t('appName')}
          </span>
        </Link>

        {production && (
          <>
            <span className="hidden text-muted-foreground sm:inline">/</span>
            <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
              <Badge variant="outline" className="hidden shrink-0 font-mono text-[10px] uppercase sm:inline-flex">
                {production.code || 'PROD'}
              </Badge>
              <span className="max-w-[clamp(3rem,24vw,9rem)] truncate text-xs font-semibold text-foreground sm:max-w-sm">
                {production.name}
              </span>
              <span className="text-[11px] font-mono text-muted-foreground hidden sm:inline">
                ({production.fps_num} FPS · {production.aspect_ratio})
              </span>
            </div>
          </>
        )}
      </div>

      {/* Right: Controls, Theme, i18n & User Profile */}
      <div className="flex shrink-0 items-center gap-1 text-xs sm:gap-3">
        {/* Presence stays disconnected until authenticated Redis-backed realtime is ready. */}

        {/* Locale Toggle */}
        <Button variant="outline" size="sm"
          onClick={() => setLocale(locale === 'zh-CN' ? 'en-US' : 'zh-CN')}
          className="font-mono"
          title={locale === 'zh-CN' ? 'Switch to English' : '切换为简体中文'}
          aria-label={locale === 'zh-CN' ? 'Switch to English' : '切换为简体中文'}
        >
          {locale === 'zh-CN' ? 'EN' : '中'}
        </Button>

        {/* Theme Toggle */}
        <Button variant="outline" size="sm"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title={theme === 'dark' ? '切换到亮色主题' : '切换到暗色主题'}
          aria-label={theme === 'dark' ? '切换到亮色主题' : '切换到暗色主题'}
        >
          {theme === 'dark' ? <Icons.Sun className="h-4 w-4" /> : <Icons.Moon className="h-4 w-4" />}
        </Button>

        {/* User Menu */}
        <div className="flex items-center gap-1 border-l border-border pl-1 sm:gap-3 sm:pl-3">
          <div className="hidden items-center gap-1.5 sm:flex">
            <Icons.CircleUserRound className="h-4 w-4 text-muted-foreground" />
            <span className="text-foreground font-medium">{user?.display_name || user?.email || ''}</span>
          </div>

          <Button variant="ghost" size="sm"
            onClick={() => {
              logout();
              router.replace('/login');
            }}
            className="text-muted-foreground hover:text-destructive"
          >
            退出
          </Button>
        </div>
      </div>
    </header>
  );
}
