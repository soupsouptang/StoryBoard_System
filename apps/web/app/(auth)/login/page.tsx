'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/authStore';
import { Button, Field, Icons, Input, Select } from '@frameforge/ui';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth, locale, setLocale, theme, setTheme, t } = useAuthStore();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [roleName, setRoleName] = useState('producer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'login') {
        const res = await apiClient<{ access_token: string; user: any }>('/api/v1/auth/login', {
          method: 'POST',
          json: { email, password }
        });
        setAuth(res.user, res.access_token);
        router.push('/productions');
      } else {
        const res = await apiClient<{ access_token: string; user: any }>('/api/v1/auth/register', {
          method: 'POST',
          json: { email, password, display_name: displayName, role_name: roleName }
        });
        setAuth(res.user, res.access_token);
        router.push('/productions');
      }
    } catch (err: any) {
      setError(err.message || '操作失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-6">
      {/* Top right utility controls */}
      <div className="absolute top-3 right-3 flex items-center gap-2 text-xs font-mono text-muted-foreground sm:top-6 sm:right-6 sm:gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setLocale(locale === 'zh-CN' ? 'en-US' : 'zh-CN')}
          aria-label={locale === 'zh-CN' ? 'Switch to English' : '切换为中文'}
          className="px-2.5 font-mono"
          title={locale === 'zh-CN' ? 'Switch to English' : '切换为简体中文'}
        >
          {locale === 'zh-CN' ? 'EN' : '中'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          className="px-2.5"
          title={theme === 'dark' ? '切换到亮色主题' : '切换到暗色主题'}
        >
          {theme === 'dark' ? <Icons.Sun className="h-4 w-4" /> : <Icons.Moon className="h-4 w-4" />}
        </Button>
      </div>

      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 shadow-2xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent border border-border text-accent-foreground">
            <Icons.Film />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-foreground">{t('appName')}</h1>
            <p className="text-xs text-muted-foreground">{t('appSub')}</p>
          </div>
        </div>

        {/* Mode switcher tabs */}
        <div className="mb-6 grid grid-cols-2 rounded border border-border bg-background p-1 text-xs">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setMode('login')}
            className={`w-full ${
              mode === 'login' ? 'bg-accent text-accent-foreground shadow' : 'text-muted-foreground'
            }`}
          >
            {t('loginBtn')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setMode('register')}
            className={`w-full ${
              mode === 'register' ? 'bg-accent text-accent-foreground shadow' : 'text-muted-foreground'
            }`}
          >
            {t('registerBtn')}
          </Button>
        </div>

        {error && (
          <div className="mb-4 rounded border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <Field label={t('email')}>
            <Input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="user@company.internal"
            />
          </Field>

          {mode === 'register' && (
            <>
              <Field label="姓名 / 制作代号">
                <Input
                  type="text"
                  autoComplete="name"
                  required
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="例如：王摄影 / 李剪辑"
                />
              </Field>
              <div className="grid min-w-0 gap-2 text-sm font-medium text-foreground">
                <span>管线职责角色</span>
                <Select
                  label="管线职责角色"
                  name="role_name"
                  value={roleName}
                  onChange={setRoleName}
                  options={[
                    { value: 'producer', label: 'Producer 制片管理' },
                    { value: 'director', label: 'Director 导演/分镜' },
                    { value: 'camera', label: 'Camera 摄影/实拍' },
                    { value: 'art', label: 'Art 美术/道具' },
                    { value: 'motion', label: 'Motion 包装/动态' },
                    { value: 'vfx', label: 'VFX 视效/合成' },
                    { value: 'editor', label: 'Editor 剪辑/DIT' },
                    { value: 'reviewer', label: 'Reviewer 审片审批' }
                  ]}
                />
              </div>
            </>
          )}

          <Field label={t('password')}>
            <Input
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </Field>

          <Button
            type="submit"
            variant="default"
            disabled={loading}
            className="mt-4 w-full"
          >
            {loading ? '处理中...' : mode === 'login' ? t('loginBtn') : t('registerBtn')}
          </Button>
        </form>

      </div>
    </div>
  );
}
