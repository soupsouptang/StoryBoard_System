'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, Input, Icons, Dialog, DialogContent, DialogTitle, DialogDescription, Select } from '@frameforge/ui';
import { useAssets, useAssetMutation, assetError, assetPath, type AssetLibraryItem, type AssetReferences } from '@/lib/hooks/useAssets';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/authStore';
import { AssetImage } from '@/components/asset/AssetImage';
import { ImageCropDialog } from '@/components/asset/ImageCropDialog';

const TABS = [
  { key: 'all', label: '全部素材' }, { key: 'unused', label: '未使用' },
  { key: 'image', label: '图片' }, { key: 'video', label: '视频' }, { key: 'other', label: '其他文件' }
] as const;
const bytes = (value: number) => value < 1024 ? `${value} B` : value < 1024 * 1024 ? `${(value / 1024).toFixed(1)} KB` : `${(value / 1024 / 1024).toFixed(1)} MB`;
type Upload = { key: string; file: File; url: string; status: 'ready' | 'uploading' | 'failed' | 'saved'; error?: string };

export default function AssetsPage() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : '';
  const permissions = useAuthStore(s => s.user?.role?.permissions);
  const canWrite = Boolean(permissions?.['*'] || permissions?.['production.write'] || permissions?.['asset.write']);
  const [state, setState] = useState<'active' | 'trashed'>('active');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const { data: assets = [], isLoading, error, refetch } = useAssets(id, { state });
  const mutation = useAssetMutation(id);
  const [tab, setTab] = useState<typeof TABS[number]['key']>('all');
  const [preview, setPreview] = useState<AssetLibraryItem | null>(null);
  const [cropAsset, setCropAsset] = useState<AssetLibraryItem | null>(null);
  const [edit, setEdit] = useState<{ asset: AssetLibraryItem; name: string; category: string } | null>(null);
  const [deleting, setDeleting] = useState<AssetLibraryItem | null>(null);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [uploads, setUploads] = useState<Upload[]>([]);
  const uploadMutation = useAssetMutation(id);
  const urls = useRef(new Set<string>());
  const alive = useRef(true);
  const uploadBusy = useRef(false);
  const cancelledUploads = useRef(new Set<string>());
  const dialogFocus = useRef<{ preview?: HTMLElement; edit?: HTMLElement; delete?: HTMLElement }>({});
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => { alive.current = true; const owned = urls.current; return () => { alive.current = false; owned.forEach(url => URL.revokeObjectURL(url)); owned.clear(); }; }, []);
  const selected = preview ? assets.find(a => a.id === preview.id) || preview : null;
  const referenceAsset = deleting || selected;
  const references = useQuery({ queryKey: ['asset-references', id, referenceAsset?.id, referenceAsset?.revision],
    enabled: Boolean(referenceAsset), queryFn: ({ signal }) => apiClient<AssetReferences>(`${assetPath(id, referenceAsset!.id)}/references`, { signal }) });
  const matchesTab = (asset: AssetLibraryItem, key: typeof tab) => key === 'all' ||
    (key === 'unused' ? asset.reference_shot_count === 0 : key === 'other' ? !/^(image|video)\//.test(asset.mime_type) : asset.mime_type.startsWith(`${key}/`));
  const categories = [...new Set(assets.map(a => a.category).filter(Boolean))].sort();
  const filtered = assets.filter(a => matchesTab(a, tab) && (!category || a.category === category) &&
    `${a.filename} ${a.display_name} ${a.category}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  function removeUpload(item: Upload) {
    cancelledUploads.current.add(item.key);
    URL.revokeObjectURL(item.url); urls.current.delete(item.url); setUploads(items => items.filter(u => u.key !== item.key));
  }
  function addFiles(files: FileList | null) {
    if (!files) return;
    const added = Array.from(files).map(file => {
      const url = URL.createObjectURL(file); urls.current.add(url);
      return { key: crypto.randomUUID(), file, url, status: 'ready' as const };
    });
    setUploads(items => [...items, ...added]);
  }
  async function upload(items: Upload[]) {
    if (uploadBusy.current || !canWrite) return;
    uploadBusy.current = true;
    try {
      for (const item of items) {
        if (!alive.current) break;
        if (cancelledUploads.current.has(item.key)) continue;
        setUploads(current => current.map(u => u.key === item.key ? { ...u, status: 'uploading', error: '' } : u));
        try {
          if (!item.file.type.startsWith('image/')) throw new Error('请选择图片文件。');
          await uploadMutation.mutateAsync({ kind: 'upload', file: item.file });
          if (alive.current) setUploads(current => current.map(u => u.key === item.key ? { ...u, status: 'saved' } : u));
        } catch (reason) {
          if (alive.current) setUploads(current => current.map(u => u.key === item.key ? { ...u, status: 'failed', error: assetError(reason) } : u));
        }
      }
    } finally { uploadBusy.current = false; }
  }
  async function act(kind: 'delete' | 'restore' | 'update', asset: AssetLibraryItem) {
    setActionError(''); setNotice('');
    try {
      if (kind === 'update' && edit) await mutation.mutateAsync({ kind, assetId: asset.id, revision: asset.revision, display_name: edit.name.trim(), category: edit.category.trim() });
      else if (kind !== 'update') await mutation.mutateAsync({ kind, assetId: asset.id, revision: asset.revision });
      setNotice(kind === 'delete' ? '素材已移入回收站。' : kind === 'restore' ? '素材已恢复。' : '素材信息已保存。');
      setEdit(null); setDeleting(null); if (kind === 'delete') setPreview(null);
    } catch (reason) { setActionError(assetError(reason)); }
  }
  async function refreshDraft() {
    const fresh = await refetch();
    if (fresh.error) { setActionError(assetError(fresh.error)); return; }
    const target = edit?.asset || deleting;
    const current = fresh.data?.find(a => a.id === target?.id);
    if (!current) { setActionError('素材已被删除，请关闭对话框并刷新。'); return; }
    if (edit) setEdit(d => d ? { ...d, asset: current } : d);
    if (deleting) setDeleting(current);
    setActionError('已读取最新版本，请检查后重试。');
  }
  const actions = (asset: AssetLibraryItem) => <div className="flex flex-wrap gap-1">
    {state === 'trashed' ? <Button size="sm" variant="outline" disabled={!canWrite || mutation.isPending} onClick={() => void act('restore', asset)}>恢复</Button> : <>
      <Button size="sm" variant="ghost" disabled={!canWrite || mutation.isPending} onClick={event => { dialogFocus.current.edit = event.currentTarget; setActionError(''); setEdit({ asset, name: asset.display_name || asset.filename, category: asset.category || '' }); }}>改名 / 分类</Button>
      {asset.mime_type.startsWith('image/') && <Button size="sm" variant="ghost" disabled={!canWrite || mutation.isPending} onClick={() => setCropAsset(asset)}>裁剪 / 重框选</Button>}
      <Button size="sm" variant="ghost" disabled={!canWrite || mutation.isPending} onClick={event => { dialogFocus.current.delete = event.currentTarget; setActionError(''); setDeleting(asset); }}>删除</Button>
    </>}
  </div>;
  const image = (asset: AssetLibraryItem, thumbnail = false) => <AssetImage assetId={asset.id} prodId={id} revision={asset.revision} thumbnail={thumbnail && asset.has_thumbnail} alt={asset.display_name || asset.filename} className="h-full max-h-[55vh] w-full object-contain"><span className="text-xs text-muted-foreground">预览不可用</span></AssetImage>;
  const referenceDetails = <div className="space-y-2 text-xs">
    {references.isPending ? <p role="status">正在读取引用…</p> : references.error ? <div role="alert">{assetError(references.error)} <Button variant="outline" size="sm" onClick={() => void references.refetch()}>重试</Button></div> : <>
      <p>{references.data?.reference_shot_count || 0} 个活动镜头引用，{references.data?.retained_commit_ids.length || 0} 个历史工程版本保留此素材。</p>
      <div className="max-h-36 space-y-1 overflow-y-auto">{references.data?.references.map((r, index) => <p key={`${r.component_id}:${index}`}><Link className="underline" href={`/production/${id}/shots?shot=${encodeURIComponent(r.shot_id)}`}>镜头 {r.display_number || r.shot_id}</Link> · {({ panel: '分镜画面', link: '素材关联', step: '制作步骤' } as Record<string, string>)[r.component] || r.component}{r.is_deleted ? ' · 已删除引用' : ''}</p>)}</div>
    </>}
  </div>;
  return <div className="space-y-4 p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-lg font-semibold">素材资产 <span className="ml-2 text-xs font-normal text-muted-foreground">{isLoading || error ? '—' : `${assets.length} 个素材`}</span></h1>
      <div className="flex flex-wrap gap-2"><input ref={fileInput} type="file" accept="image/*" multiple className="hidden" aria-label="选择上传图片" onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />
        <Button disabled={!canWrite} onClick={() => fileInput.current?.click()}><Icons.Plus className="mr-2 h-4 w-4" />上传图片</Button>
        <Link href={`/production/${id}/shots`} className="inline-flex h-9 items-center rounded-md border border-input px-3 text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">上传/替换分镜画面</Link></div>
    </div>
    {!canWrite && <p className="text-xs text-muted-foreground">当前账号可查看素材，管理操作需要编辑权限。</p>}
    {notice && <p role="status" className="text-sm">{notice}</p>}
    {actionError && !edit && !deleting && <p role="alert" className="text-sm text-destructive">{actionError}</p>}
    {uploads.length > 0 && <section className="space-y-3 rounded-lg border p-3" aria-label="图片上传队列">
      <div className="flex flex-wrap items-center gap-2"><p className="text-sm">{uploads.filter(u => u.status === 'saved').length} / {uploads.length} 已上传</p><Button size="sm" disabled={!canWrite || uploadMutation.isPending || !uploads.some(u => u.status === 'ready' || u.status === 'failed')} onClick={() => void upload(uploads.filter(u => u.status === 'ready' || u.status === 'failed'))}>上传待处理图片</Button></div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{uploads.map(u => <div key={u.key} className="min-w-0 space-y-1"><div className="flex aspect-video items-center justify-center rounded-md bg-black"><img src={u.url} alt={u.file.name} className="h-full w-full object-contain" /></div><p className="truncate text-xs">{u.file.name}</p><p role="status" className="text-xs">{({ ready: '待上传', uploading: '正在上传并处理…', failed: '上传失败', saved: '服务器已保存' })[u.status]}</p>{u.error && <p role="alert" className="text-xs text-destructive">{u.error}</p>}<div className="flex gap-1">{u.status === 'failed' && <Button size="sm" variant="outline" disabled={uploadMutation.isPending || !canWrite} onClick={() => void upload([u])}>重试</Button>}<Button size="sm" variant="ghost" disabled={u.status === 'uploading'} onClick={() => removeUpload(u)}>{u.status === 'saved' ? '收起' : '取消待上传'}</Button></div></div>)}</div>
    </section>}
    <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
      <div role="group" aria-label="素材状态" className="flex gap-1"><Button size="sm" aria-pressed={state === 'active'} variant={state === 'active' ? 'secondary' : 'ghost'} onClick={() => { setState('active'); setCategory(''); }}>素材库</Button><Button size="sm" aria-pressed={state === 'trashed'} variant={state === 'trashed' ? 'secondary' : 'ghost'} onClick={() => { setState('trashed'); setCategory(''); }}>回收站</Button></div>
      <div role="group" aria-label="素材类型" className="flex flex-wrap gap-1">{TABS.map(item => <Button key={item.key} variant={tab === item.key ? 'secondary' : 'ghost'} size="sm" aria-pressed={tab === item.key} onClick={() => setTab(item.key)}>{item.label}{!isLoading && !error && <span className="ml-1 text-xs text-muted-foreground">{assets.filter(a => matchesTab(a, item.key)).length}</span>}</Button>)}</div>
      <div className="w-40"><Select label="筛选素材分类" value={category} options={[{ value: '', label: '全部分类' }, ...categories.map(c => ({ value: c, label: c }))]} onChange={setCategory} /></div>
      <Input aria-label="搜索素材" placeholder="搜索素材名称…" value={search} onChange={e => setSearch(e.target.value)} className="w-full sm:w-64" />
      <Button size="sm" variant="ghost" onClick={() => void refetch()}>刷新</Button>
    </div>
    {isLoading ? <p role="status" className="text-sm text-muted-foreground">正在加载素材…</p> : error ? <div role="alert" className="space-y-2"><p>{assetError(error)}</p><Button onClick={() => void refetch()}>重试</Button></div> : filtered.length === 0 ? <p className="text-sm text-muted-foreground">{assets.length ? '没有匹配的素材。' : state === 'trashed' ? '回收站暂无素材。' : '当前项目暂无素材。'}</p> :
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">{filtered.map(asset => <Card key={asset.id} className="gap-0 overflow-hidden border-0 bg-transparent py-0 shadow-none">
        <button type="button" onClick={event => { dialogFocus.current.preview = event.currentTarget; setPreview(asset); }} aria-label={`预览 ${asset.display_name || asset.filename}`} className="flex aspect-video w-full items-center justify-center overflow-hidden rounded-md bg-black outline-none focus-visible:ring-2 focus-visible:ring-ring">{asset.mime_type.startsWith('image/') ? image(asset, true) : <Icons.FileDown className="h-6 w-6 text-muted-foreground" />}</button>
        <div className="space-y-1 pt-2 text-xs"><p className="truncate font-medium" title={asset.display_name}>{asset.display_name || asset.filename}</p><p className="truncate text-muted-foreground" title={asset.filename}>{asset.filename}</p><p className="text-muted-foreground">{asset.category || '未分类'} · {asset.reference_shot_count} 个镜头引用 · {bytes(asset.file_size)}</p>{asset.width && asset.height && <p className="text-muted-foreground">{asset.width} × {asset.height}</p>}{actions(asset)}</div>
      </Card>)}</div>}
    <Dialog open={Boolean(selected)} onOpenChange={open => { if (!open) setPreview(null); }}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl" onCloseAutoFocus={event => { event.preventDefault(); if (dialogFocus.current.preview?.isConnected) dialogFocus.current.preview.focus(); }}><DialogTitle>{selected?.display_name || selected?.filename || '素材预览'}</DialogTitle><DialogDescription>{selected ? `${selected.mime_type} · ${bytes(selected.file_size)} · ${selected.filename}` : ''}</DialogDescription>
      {selected && <>{selected.mime_type.startsWith('image/') ? <div className="flex min-h-40 items-center justify-center rounded-md bg-black">{image(selected)}</div> : <p className="text-sm text-muted-foreground">此文件类型暂不支持预览。</p>}<dl className="grid grid-cols-2 gap-2 text-xs"><dt>分类</dt><dd>{selected.category || '未分类'}</dd><dt>尺寸</dt><dd>{selected.width && selected.height ? `${selected.width} × ${selected.height}` : '未记录；裁剪时读取原图尺寸'}</dd><dt>权利状态</dt><dd>{selected.rights_status || '未提供'}</dd><dt>更新时间</dt><dd>{selected.updated_at ? new Date(selected.updated_at).toLocaleString('zh-CN') : '未提供'}</dd></dl>{referenceDetails}{actions(selected)}</>}
    </DialogContent></Dialog>
    <Dialog open={Boolean(edit)} onOpenChange={open => { if (!open && !mutation.isPending) setEdit(null); }}><DialogContent onEscapeKeyDown={event => { event.preventDefault(); setEdit(null); }} onCloseAutoFocus={event => { event.preventDefault(); if (dialogFocus.current.edit?.isConnected) dialogFocus.current.edit.focus(); }}><DialogTitle>重命名与分类</DialogTitle><DialogDescription>名称和分类应用于此素材的所有引用。</DialogDescription>{edit && <>
      <label className="space-y-1 text-sm">素材名称<Input value={edit.name} maxLength={255} disabled={mutation.isPending} onChange={e => setEdit({ ...edit, name: e.target.value })} /></label><label className="space-y-1 text-sm">分类<Input value={edit.category} maxLength={64} placeholder="例如：人物、场景、参考" disabled={mutation.isPending} onChange={e => setEdit({ ...edit, category: e.target.value })} /></label>
      {actionError && <div role="alert" className="space-y-2 text-sm text-destructive"><p>{actionError}</p><Button variant="outline" disabled={mutation.isPending} onClick={() => void refreshDraft()}>读取最新版本，保留草稿</Button></div>}
      <div className="flex justify-end gap-2"><Button variant="outline" disabled={mutation.isPending} onClick={() => setEdit(null)}>取消</Button><Button disabled={!canWrite || mutation.isPending || !edit.name.trim()} onClick={() => void act('update', edit.asset)}>{mutation.isPending ? '正在保存…' : '保存'}</Button></div></>}
    </DialogContent></Dialog>
    <Dialog open={Boolean(deleting)} onOpenChange={open => { if (!open && !mutation.isPending) setDeleting(null); }}><DialogContent onEscapeKeyDown={event => { event.preventDefault(); setDeleting(null); }} onCloseAutoFocus={event => { event.preventDefault(); if (dialogFocus.current.delete?.isConnected) dialogFocus.current.delete.focus(); }}><DialogTitle>删除素材「{deleting?.display_name || deleting?.filename}」？</DialogTitle><DialogDescription>移入回收站后可恢复；原始图片与历史工程版本保留。活动镜头仍在使用的素材需要先移除关联。</DialogDescription>{referenceDetails}{actionError && <div role="alert" className="space-y-2 text-sm text-destructive"><p>{actionError}</p><Button variant="outline" disabled={mutation.isPending} onClick={() => void refreshDraft()}>读取最新版本</Button></div>}<div className="flex justify-end gap-2"><Button variant="outline" disabled={mutation.isPending} onClick={() => setDeleting(null)}>取消</Button><Button variant="destructive" disabled={!canWrite || mutation.isPending || references.isPending || Boolean(references.error) || Boolean(references.data?.reference_shot_count)} onClick={() => deleting && void act('delete', deleting)}>{mutation.isPending ? '正在删除…' : '移入回收站'}</Button></div></DialogContent></Dialog>
    {cropAsset && <ImageCropDialog productionId={id} asset={cropAsset} open onOpenChange={open => { if (!open) setCropAsset(null); }} />}
  </div>;
}
