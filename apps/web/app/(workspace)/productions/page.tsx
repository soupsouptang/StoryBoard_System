'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/authStore';
import type { Production } from '@frameforge/types';
import { Badge, Button, Card, Field, Icons, Input, Select } from '@frameforge/ui';
import { ProjectCover } from '@/components/ProjectCover';

export default function ProductionsPage() {
  const router = useRouter();
  const { user, logout, locale, setLocale, theme, setTheme, t } = useAuthStore();

  const [productions, setProductions] = useState<Production[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // New production form
  const [name, setName] = useState('');
  const [templateType, setTemplateType] = useState('corporate');
  const [fps, setFps] = useState(25);
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [targetSeconds, setTargetSeconds] = useState(270);

  const fetchProductions = async () => {
    try {
      setLoading(true);
      const data = await apiClient<Production[]>('/api/v1/productions');
      setProductions(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductions();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const targetFrames = targetSeconds ? Math.round(targetSeconds * fps) : null;
      await apiClient<Production>('/api/v1/productions', {
        method: 'POST',
        json: {
          name,
          template_type: templateType,
          fps_num: fps,
          fps_den: 1,
          drop_frame: false,
          start_timecode_frames: Math.round(fps * 3600), // 01:00:00:00
          target_duration_frames: targetFrames,
          aspect_ratio: aspectRatio
        }
      });
      setShowModal(false);
      setName('');
      fetchProductions();
    } catch (err: any) {
      alert(err.message || '创建项目失败');
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Bar (50px) */}
      <header className="sticky top-0 z-30 flex h-[50px] items-center justify-between border-b border-border bg-card/90 px-6 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-accent text-accent-foreground border border-border">
            <Icons.Film />
          </div>
          <span className="font-bold text-sm tracking-tight text-foreground">{t('appName')}</span>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocale(locale === 'zh-CN' ? 'en-US' : 'zh-CN')}
          >
            {locale === 'zh-CN' ? 'EN' : '中'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? '☀' : '☾'}
          </Button>
          <div className="flex items-center gap-2 border-l border-border pl-4 text-muted-foreground">
            <span className="text-foreground font-medium">{user?.display_name || user?.email}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { logout(); router.push('/login'); }}
              className="text-muted-foreground hover:text-destructive"
            >
              退出
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">{t('productions')}</h2>
            <p className="text-xs text-muted-foreground">创建、打开和管理影视制作项目。</p>
          </div>
          <Button
            size="sm"
            onClick={() => setShowModal(true)}
          >
            <Icons.Plus />
            {t('newProduction')}
          </Button>
        </div>

        {loading ? (
          <div className="py-20 text-center text-xs font-mono text-muted-foreground">
            正在载入项目库...
          </div>
        ) : productions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-12 text-center">
            <p className="text-muted-foreground text-sm mb-4">暂无影视制作项目</p>
            <Button
              size="sm"
              onClick={() => setShowModal(true)}
            >
              {t('newProduction')}
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {productions.map(prod => (
              <Card
                key={prod.id}
                onClick={() => router.push(`/production/${prod.id}/shots`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    router.push(`/production/${prod.id}/shots`);
                  }
                }}
                className="group flex cursor-pointer items-center gap-4 p-4 transition hover:bg-accent/40"
              >
                <ProjectCover name={prod.name} />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <h3 className="truncate text-base font-bold tracking-tight text-foreground">{prod.name}</h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono text-muted-foreground">
                    <span className="uppercase">{prod.template_type}</span>
                    <span>{prod.fps_num} FPS</span>
                    <span>{prod.aspect_ratio}</span>
                    <span>{prod.shot_count ?? 0} SHOTS</span>
                  </div>
                </div>
                <span className="shrink-0 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">进入工作区 →</span>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* New Production Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
              <h3 className="text-sm font-bold text-foreground">{t('newProduction')}</h3>
              <Button variant="ghost" size="icon" aria-label="关闭" onClick={() => setShowModal(false)} className="text-muted-foreground">
                <Icons.X />
              </Button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <Field label="项目名称">
                <Input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="例如：品牌年度形象片"
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid min-w-0 gap-2 text-sm font-medium text-foreground">
                  <span>制作类型</span>
                  <Select
                    label="制作类型"
                    value={templateType}
                    onChange={setTemplateType}
                    options={[
                      { value: 'corporate', label: '企业宣传片 (Corporate)' },
                      { value: 'tvc', label: 'TVC 广告片 (TVC)' },
                      { value: 'film', label: '电影长片 (Film)' },
                      { value: 'documentary', label: '纪录片 (Documentary)' },
                      { value: 'motion_graphics', label: 'MG / 动效包装 (MG)' },
                      { value: 'vfx_3d', label: '3D / 视效制作 (VFX & 3D)' },
                      { value: 'custom', label: '自定义管线 (Custom)' }
                    ]}
                  />
                </div>
                <div className="grid min-w-0 gap-2 text-sm font-medium text-foreground">
                  <span>时码帧率 (FPS)</span>
                  <Select
                    label="时码帧率 (FPS)"
                    value={String(fps)}
                    onChange={value => setFps(Number(value))}
                    options={[
                      { value: '24', label: '24 FPS (电影标准)' },
                      { value: '25', label: '25 FPS (欧洲/国内广播)' },
                      { value: '30', label: '30 FPS (网络视频)' },
                      { value: '50', label: '50 FPS (高帧率电视)' },
                      { value: '60', label: '60 FPS (高帧率商业片)' }
                    ]}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid min-w-0 gap-2 text-sm font-medium text-foreground">
                  <span>画幅比例 (Aspect Ratio)</span>
                  <Select
                    label="画幅比例 (Aspect Ratio)"
                    value={aspectRatio}
                    onChange={setAspectRatio}
                    options={[
                      { value: '16:9', label: '16:9 (1920×1080 / 4K UHD)' },
                      { value: '2.39:1', label: '2.39:1 (宽银幕 Anamorphic)' },
                      { value: '9:16', label: '9:16 (竖屏社交媒体)' },
                      { value: '4:3', label: '4:3 (经典复古)' }
                    ]}
                  />
                </div>
                <Field label="目标时长 (秒)">
                  <Input
                    type="number"
                    value={targetSeconds}
                    onChange={e => setTargetSeconds(Number(e.target.value))}
                  />
                </Field>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-border">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setShowModal(false)}
                >
                  取消
                </Button>
                <Button
                  type="submit"
                >
                  创建项目
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}