'use client';

import React from 'react';
import { Button, Icons } from '@frameforge/ui';
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
    <header className="sticky top-0 z-30 flex h-[50px] shrink-0 items-center justify-between gap-2 border-b border-border bg-card/90 px-3 backdrop-blur sm:px-5">
      {/* Left: Brand & Breadcrumb */}
      <div className="flex min-w-0 items-center gap-3">
        <Link href="/productions" className="flex items-center gap-2.5 group">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-accent text-accent-foreground border border-border group-hover:border-ring transition shadow-sm">
            <Icons.Film className="h-4 w-4" />
          </div>
          <span className="font-bold text-sm tracking-tight text-foreground group-hover:text-foreground transition">
            {t('appName')}
          </span>
        </Link>

        {production && (
          <>
            <span className="hidden text-muted-foreground md:inline">/</span>
            <div className="hidden min-w-0 items-center gap-2 md:flex">
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-foreground border border-border uppercase">
                {production.code || 'PROD'}
              </span>
              <span className="text-xs font-bold text-foreground truncate max-w-sm">
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
          className="rounded border border-border bg-background px-2 py-1 font-mono text-foreground hover:border-ring hover:text-foreground transition"
          title={locale === 'zh-CN' ? 'Switch to English' : '切换为简体中文'}
          aria-label={locale === 'zh-CN' ? 'Switch to English' : '切换为简体中文'}
        >
          {locale === 'zh-CN' ? 'EN' : '中'}
        </Button>

        {/* Theme Toggle */}
        <Button variant="outline" size="sm"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="rounded border border-border bg-background px-2.5 py-1 text-foreground hover:border-ring hover:text-foreground transition"
          title={theme === 'dark' ? '切换到亮色主题' : '切换到暗色主题'}
          aria-label={theme === 'dark' ? '切换到亮色主题' : '切换到暗色主题'}
        >
          {theme === 'dark' ? <Icons.Sun className="h-4 w-4" /> : <Icons.Moon className="h-4 w-4" />}
        </Button>

        {/* User Menu */}
        <div className="flex items-center gap-1 border-l border-border pl-1 sm:gap-3 sm:pl-3">
          <div className="hidden items-center gap-1.5 sm:flex">
            <Icons.CircleUserRound className="h-4 w-4 text-muted-foreground" />
            <span className="text-foreground font-medium">{user?.display_name || user?.email || '制作管理员'}</span>
          </div>

          <Button variant="ghost" size="sm"
            onClick={() => {
              logout();
              router.push('/login');
            }}
            className="text-muted-foreground hover:text-destructive transition"
          >
            退出
          </Button>
        </div>
      </div>
    </header>
  );
}
