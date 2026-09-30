'use client';

import { Icons } from '@frameforge/ui';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

export default function HomePage() {
  const router = useRouter();
  const status = useAuthStore(s => s.status);

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/productions');
    } else if (status === 'anonymous') {
      router.replace('/login');
    }
  }, [status, router]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background text-muted-foreground">
      <div className="flex items-center gap-3">
        <Icons.Film className="animate-spin" />
        <span className="font-mono text-xs uppercase tracking-wider">Loading FrameForge OS...</span>
      </div>
    </div>
  );
}
