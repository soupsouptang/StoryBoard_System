'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@frameforge/ui';
import { useAuthStore } from '@/stores/authStore';

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { status, user, token, restoreSession } = useAuthStore();

  useEffect(() => {
    if (status === 'anonymous') router.replace('/login');
  }, [status, router]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {status === 'authenticated' && user && token ? children : (
        <div role="status" className="flex min-h-screen items-center justify-center gap-3 text-sm text-muted-foreground">
          {status === 'error' ? <>
            <span>无法验证登录状态，请重试。</span>
            <Button variant="outline" onClick={() => void restoreSession()}>重试</Button>
          </> : <span>正在验证登录状态…</span>}
        </div>
      )}
    </div>
  );
}
