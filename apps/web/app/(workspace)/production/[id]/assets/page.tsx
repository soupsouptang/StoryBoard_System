'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button, Card, Input, Icons, Dialog, DialogContent, DialogTitle, DialogDescription } from '@frameforge/ui';
import { useAssets } from '@/lib/hooks/useAssets';
import { AssetImage } from '@/components/asset/AssetImage';

const TABS = [
  { key: 'all', label: '全部素材' }, { key: 'unused', label: '未使用' },
  { key: 'image', label: '图片' }, { key: 'video', label: '视频' }, { key: 'other', label: '其他文件' }
] as const;

export default function AssetsPage() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : '';
  const { data: assets = [], isLoading, error, refetch } = useAssets(id);
  const [tab, setTab] = useState<typeof TABS[number]['key']>('all');
  const [search, setSearch] = useState('');
  const [previewId, setPreviewId] = useState<string | null>(null);
  const selected = assets.find(asset => asset.id === previewId);
  const matchesTab = (asset: typeof assets[number], key: typeof tab) => key === 'all' ||
    (key === 'unused' ? asset.reference_shot_count === 0 :
      key === 'other' ? !/^(image|video)\//.test(asset.mime_type) : asset.mime_type.startsWith(`${key}/`));
  const filtered = assets.filter(asset => matchesTab(asset, tab) &&
    `${asset.filename} ${asset.display_name}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const bytes = (value: number) => value < 1024 ? `${value} B` : value < 1024 * 1024 ? `${(value / 1024).toFixed(1)} KB` : `${(value / 1024 / 1024).toFixed(1)} MB`;

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">素材资产 <span className="ml-2 text-xs font-normal text-muted-foreground">{isLoading || error ? '—' : `${assets.length} 个素材`}</span></h1>
        <Link href={`/production/${id}/shots`} className="inline-flex h-9 items-center gap-2 rounded-md border border-input px-3 text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Icons.Images className="h-4 w-4" aria-hidden="true" />上传/替换分镜画面</Link>
      </div>
      <p className="text-xs text-muted-foreground">分镜画面可在镜头制作表上传或替换。独立素材上传与清理暂未开放。</p>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div role="group" aria-label="素材分类" className="flex flex-wrap gap-1">
          {TABS.map(item => <Button key={item.key} variant={tab === item.key ? 'secondary' : 'ghost'} size="sm" aria-pressed={tab === item.key} onClick={() => setTab(item.key)}>
            {item.label}{!isLoading && !error && <span className="ml-1 text-xs text-muted-foreground">{assets.filter(asset => matchesTab(asset, item.key)).length}</span>}
          </Button>)}
        </div>
        <Input aria-label="搜索素材" placeholder="搜索素材名称…" value={search} onChange={event => setSearch(event.target.value)} className="w-full sm:w-64" />
      </div>
      {isLoading ? <p role="status" className="text-sm text-muted-foreground">正在加载素材…</p> : error ? (
        <div role="alert" className="space-y-2"><p>素材加载失败。</p><Button onClick={() => void refetch()}>重试</Button></div>
      ) : filtered.length === 0 ? <p className="text-sm text-muted-foreground">{assets.length ? '没有匹配的素材。' : '当前项目暂无素材。'}</p> : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {filtered.map(asset => <Card key={asset.id} className="gap-0 overflow-hidden border-0 bg-transparent py-0 shadow-none">
            <button type="button" onClick={() => setPreviewId(asset.id)} aria-label={`预览 ${asset.filename}`} className="flex aspect-video w-full items-center justify-center overflow-hidden rounded-md bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {asset.mime_type.startsWith('image/') ? <AssetImage assetId={asset.id} alt={asset.filename} className="h-full w-full object-contain"><span className="text-xs text-muted-foreground">预览不可用</span></AssetImage> : <Icons.FileDown className="h-6 w-6 text-muted-foreground" aria-hidden="true" />}
            </button>
            <div className="space-y-1 pt-2 text-xs">
              <p className="truncate font-medium" title={asset.filename}>{asset.filename}</p>
              <p className="text-muted-foreground">{asset.mime_type} · {asset.reference_shot_count} 个镜头引用 · {bytes(asset.file_size)}</p>
              {asset.width && asset.height && <p className="text-muted-foreground">{asset.width} × {asset.height}</p>}
            </div>
          </Card>)}
        </div>
      )}
      <Dialog open={Boolean(selected)} onOpenChange={open => { if (!open) setPreviewId(null); }}>
        <DialogContent className="max-w-3xl">
          <DialogTitle>{selected?.filename || '素材预览'}</DialogTitle>
          <DialogDescription>{selected ? `${selected.mime_type} · ${bytes(selected.file_size)} · ${selected.reference_shot_count} 个镜头引用` : ''}</DialogDescription>
          {selected && <>
            {selected.mime_type.startsWith('image/') ? <div className="flex max-h-[60vh] min-h-40 items-center justify-center overflow-hidden rounded-md bg-muted"><AssetImage assetId={selected.id} alt={selected.filename} className="max-h-[60vh] max-w-full object-contain"><p className="text-sm text-muted-foreground">无法预览此图片，文件信息仍可查看。</p></AssetImage></div> : <p className="text-sm text-muted-foreground">此文件类型暂不支持预览。</p>}
            <dl className="grid grid-cols-2 gap-2 text-xs">
              <dt className="text-muted-foreground">素材类型</dt><dd>{selected.asset_type}</dd>
              <dt className="text-muted-foreground">来源</dt><dd>{selected.source_type}</dd>
              <dt className="text-muted-foreground">权利状态</dt><dd>{selected.rights_status || '未提供'}</dd>
            </dl>
          </>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
