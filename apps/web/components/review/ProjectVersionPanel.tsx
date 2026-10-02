'use client';

import { useState } from 'react';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Dialog, DialogContent, DialogDescription, DialogTitle, Input, Select, Textarea } from '@frameforge/ui';
import { ApiError } from '@/lib/api-client';
import { AssetImage } from '@/components/asset/AssetImage';
import { useAuthStore } from '@/stores/authStore';
import { useProjectCommitDetail, useProjectVersionCompare, useProjectVersionGraph, useProjectVersionMutations, useProjectVersionState, type ProjectChange, type ProjectDiffLine } from '@/lib/hooks/useProjectVersions';

const sectionLabels: Record<string, string> = { production: '项目', sequences: '篇章', scenes: '场景', shots: '镜头', panels: '分镜画面', steps: '制作步骤', columns: '列定义', values: '列值', assets: '素材', asset_versions: '素材版本', asset_links: '素材关联', asset_requests: '素材请求', media_presentations: '图片构图', comments: '批注', approvals: '审核', review_decisions: '审阅决定', views: '共享视图', row_layouts: '行高', column_preferences: '列显示设置', moodboard: '情绪板', lighting_boards: '灯光板' };
const short = (id: string | null) => id ? id.slice(0, 8) : '无';
function errorText(error: unknown) {
  if (error instanceof ApiError && error.status === 409) return '项目内容或分支已更新。草稿已保留，请检查最新记录后重新提交。';
  return error instanceof Error ? error.message : '操作失败，请重试';
}
function stableText(value: unknown): string {
  if (typeof value === 'string') return value;
  const sort = (item: unknown): unknown => Array.isArray(item) ? item.map(sort) : item && typeof item === 'object'
    ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, sort(v)])) : item;
  return JSON.stringify(sort(value ?? null), null, 2);
}
// Fold offsets follow the server's numbered context, preserving both sides' alignment.
function expandLines(change: ProjectChange): ProjectDiffLine[] {
  const before = stableText(change.before).split(/\r?\n/);
  const after = stableText(change.after).split(/\r?\n/);
  let left = 0, right = 0;
  return change.lines.flatMap(line => {
    if (line.kind === 'fold') {
      const rows = Array.from({ length: line.unchanged_lines ?? 0 }, (_, index) => ({ kind: 'equal' as const,
        left_line: left + index + 1, right_line: right + index + 1, before: before[left + index], after: after[right + index] }));
      left += rows.length; right += rows.length;
      return rows;
    }
    if (line.left_line != null) left = line.left_line;
    if (line.right_line != null) right = line.right_line;
    return [line];
  });
}
function ChangeDiff({ change, productionId }: { change: ProjectChange; productionId: string }) {
  const [expanded, setExpanded] = useState(false);
  const lines = expanded ? expandLines(change) : change.lines;
  if (change.section === 'media_presentations') {
    return <Card><CardHeader className="p-3"><CardTitle className="text-sm">图片构图</CardTitle></CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">{(['before', 'after'] as const).map(side => {
        const image = change[side] as { asset_id: string; source_version_id: string; owner_type: string; owner_id: string; revision: number } | null;
        return <div key={side} className="min-w-0 space-y-2"><p className="text-sm">{side === 'before' ? '修改前' : '修改后'}</p>
          <div className="flex min-h-40 items-center justify-center bg-black">{image
            ? <AssetImage assetId={image.asset_id} prodId={productionId} presentation={image} alt={side === 'before' ? '修改前画面' : '修改后画面'} className="max-h-96 max-w-full object-contain"><span className="text-sm text-white">正在读取画面…</span></AssetImage>
            : <span className="text-sm text-white">无画面</span>}</div></div>;
      })}</CardContent></Card>;
  }
  return <Card>
    <CardHeader className="p-3"><CardTitle className="text-sm">{change.section_label} · {change.label}</CardTitle><p className="break-all text-xs text-muted-foreground">{change.entity_id}</p></CardHeader>
    <CardContent className="overflow-x-auto p-0">
      <table className="w-full table-fixed text-xs"><thead><tr><th className="border p-2 text-left">之前（左）</th><th className="border p-2 text-left">之后（右）</th></tr></thead><tbody>
        {lines.map((line, index) => line.kind === 'fold' ? <tr key={index}><td colSpan={2} className="border text-center"><Button size="sm" variant="ghost" onClick={() => setExpanded(true)}>展开 {line.unchanged_lines} 行未修改内容</Button></td></tr> : <tr key={index}>
          <td className={`border p-2 align-top ${line.left_line != null && ['delete', 'replace'].includes(line.kind) ? 'bg-red-500/15 text-red-700 dark:text-red-300' : ''}`}><div className="flex gap-3"><span className="shrink-0 select-none text-muted-foreground">{line.left_line ?? ''}</span><pre className="min-w-0 whitespace-pre-wrap break-words font-mono">{line.left_line != null && line.kind !== 'equal' ? '− ' : ''}{line.before ?? ''}</pre></div></td>
          <td className={`border p-2 align-top ${line.right_line != null && ['insert', 'replace'].includes(line.kind) ? 'bg-green-500/15 text-green-700 dark:text-green-300' : ''}`}><div className="flex gap-3"><span className="shrink-0 select-none text-muted-foreground">{line.right_line ?? ''}</span><pre className="min-w-0 whitespace-pre-wrap break-words font-mono">{line.right_line != null && line.kind !== 'equal' ? '+ ' : ''}{line.after ?? ''}</pre></div></td>
        </tr>)}
      </tbody></table>
      {expanded && <Button size="sm" variant="ghost" onClick={() => setExpanded(false)}>折叠未修改内容</Button>}
    </CardContent>
  </Card>;
}

function VersionWorkspace({ productionId, shotId }: { productionId: string; shotId?: string }) {
  const state = useProjectVersionState(productionId);
  const graph = useProjectVersionGraph(productionId);
  const { commit, branch } = useProjectVersionMutations(productionId);
  const permissions = useAuthStore(store => store.user?.role?.permissions);
  const canWrite = Boolean(permissions?.['*'] || permissions?.['shot.write'] || permissions?.['production.write']);
  const [message, setMessage] = useState('');
  const [branchName, setBranchName] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('current');
  const [scope, setScope] = useState('project');
  const [notice, setNotice] = useState('');
  const commits = [...new Map((graph.data?.pages.flatMap(page => page.commits) ?? []).map(row => [row.id, row])).values()];
  const branches = graph.data?.pages[0]?.branches ?? [];
  const comparison = useProjectVersionCompare(productionId, from, to, scope === 'shot' ? shotId : undefined);
  const detail = useProjectCommitDetail(productionId, from || null);
  const options = commits.map(row => ({ value: row.id, label: `${short(row.id)} · ${row.message}` }));
  const pending = commit.isPending || branch.isPending;
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center gap-2"><Badge variant="outline">项目提交 · main</Badge><Button size="sm" variant="outline" disabled={graph.isFetching || state.isFetching} onClick={() => { void graph.refetch(); void state.refetch(); void comparison.refetch(); }}>刷新</Button></div>
    {(state.error || graph.error) && <p role="alert" className="text-sm text-destructive">{errorText(state.error || graph.error)}</p>}
    {state.isPending && <p role="status">读取当前项目…</p>}
    {state.data && <div className="space-y-2 text-sm"><p>提交整个项目；排除：{state.data.excluded_components.map(name => sectionLabels[name] ?? name).join('、') || '无'}。尚未纳入：{state.data.pending_components.map(name => sectionLabels[name] ?? name).join('、') || '无'}。</p><div className="flex flex-wrap gap-2">{Object.entries(state.data.sections).map(([name, count]) => <Badge key={name} variant="secondary">{sectionLabels[name] ?? name} {count}</Badge>)}</div></div>}
    <form className="space-y-2" onSubmit={async event => { event.preventDefault(); if (!canWrite || pending || !message.trim()) return; setNotice(''); try { const result = await commit.mutateAsync(message.trim()); setMessage(''); setFrom(result.commit.id); setNotice(result.unchanged ? '项目内容未变化，保留已有提交。' : '项目提交已保存。'); } catch { /* mutation error is displayed; retain draft */ } }}>
      <label className="grid gap-2 text-sm">提交说明<Textarea maxLength={2000} value={message} onChange={event => setMessage(event.target.value)} disabled={!canWrite || pending} /></label>
      <Button type="submit" disabled={!canWrite || pending || !message.trim() || !state.data || !graph.data}>{commit.isPending ? '检查并提交中…' : '提交整个项目到 main'}</Button>
      {!canWrite && <p className="text-sm text-muted-foreground">当前账号仅可查看项目版本。</p>}
    </form>
    <p role="status" className="text-sm">{notice}</p>
    {(commit.error || branch.error) && <p role="alert" className="text-sm text-destructive">{errorText(commit.error || branch.error)}</p>}
    <Card><CardHeader><CardTitle className="text-base">提交关系</CardTitle></CardHeader><CardContent className="space-y-3">
      <div className="flex flex-wrap gap-2">{branches.map(row => <Badge key={row.id} variant="outline">{row.name} → {short(row.head_id)} · r{row.revision}</Badge>)}</div>
      {graph.isPending ? <p>读取提交记录…</p> : !commits.length && !graph.error ? <p className="text-sm text-muted-foreground">尚无项目提交。保存第一个项目版本后可比较和创建分支。</p> : null}
      <ol className="space-y-3">{commits.map(row => <li key={row.id} className="border-l-2 border-border pl-3 text-sm"><Button variant="ghost" className="h-auto max-w-full whitespace-normal text-left" onClick={() => setFrom(row.id)} aria-pressed={from === row.id}>● {short(row.id)} · {row.message}</Button><p className="break-all text-xs text-muted-foreground">{row.branch_name} · {new Date(row.created_at).toLocaleString()} · 作者 {row.created_by ?? '未知'}</p><div className="flex flex-wrap gap-2 text-xs">父提交 → {row.parent_id ? <Button size="sm" variant="link" onClick={() => setFrom(row.parent_id!)}>{short(row.parent_id)}</Button> : '根提交'}{row.merge_parent_id && <>合并父提交 → <Button size="sm" variant="link" onClick={() => setFrom(row.merge_parent_id!)}>{short(row.merge_parent_id)}</Button></>}</div></li>)}</ol>
      {graph.hasNextPage && <Button variant="outline" disabled={graph.isFetchingNextPage} onClick={() => void graph.fetchNextPage()}>加载更早提交</Button>}
    </CardContent></Card>
    <div className="grid gap-3 md:grid-cols-3"><Select label="之前（左）" value={from} onChange={setFrom} options={[{ value: '', label: '选择提交' }, ...options, ...(from && !commits.some(row => row.id === from) ? [{ value: from, label: short(from) }] : [])]} /><Select label="之后（右）" value={to} onChange={setTo} options={[{ value: 'current', label: '当前项目' }, ...options]} /><Select label="比较范围" value={scope} onChange={setScope} options={[{ value: 'project', label: '整个项目' }, { value: 'shot', label: '当前镜头', disabled: !shotId }]} /></div>
    {from && <form className="flex flex-wrap items-end gap-2" onSubmit={async event => { event.preventDefault(); if (!canWrite || pending || !/^[a-zA-Z0-9][a-zA-Z0-9._/-]{0,63}$/.test(branchName)) return; setNotice(''); try { await branch.mutateAsync({ name: branchName, from_commit_id: from }); setBranchName(''); setNotice('分支已创建。'); } catch { /* retain branch draft */ } }}><label className="grid gap-2 text-sm">从 {short(from)} 创建分支<Input value={branchName} onChange={event => setBranchName(event.target.value)} maxLength={64} pattern="[a-zA-Z0-9][a-zA-Z0-9._/-]{0,63}" placeholder="例如 alternate-cut" disabled={!canWrite || pending} /></label><Button type="submit" variant="outline" disabled={!canWrite || pending || !/^[a-zA-Z0-9][a-zA-Z0-9._/-]{0,63}$/.test(branchName)}>创建分支</Button></form>}
    {detail.error && <p role="alert">{errorText(detail.error)}</p>}
    {detail.data && <p className="break-all text-xs text-muted-foreground">提交摘要 {detail.data.content_hash} · 内容清除修订 {detail.data.redaction_revision}</p>}
    {from === to && from && <p>请选择两个不同版本。</p>}
    {comparison.isFetching && <p role="status">比较中…</p>}
    {comparison.error && <p role="alert" className="text-destructive">{errorText(comparison.error)}</p>}
    {comparison.data && <div className="space-y-3"><p className="text-sm">{comparison.data.changed_count} 项字段变化 · {comparison.data.unchanged_entities} 个实体未修改</p>{comparison.data.changed_count === 0 && <p>所选范围没有变化。</p>}{comparison.data.changes.map((change, index) => <ChangeDiff key={`${comparison.data.from_hash}:${comparison.data.to_hash}:${scope}:${shotId}:${index}`} change={change} productionId={productionId} />)}</div>}
  </div>;
}

export function ProjectVersionPanel({ productionId, shotId }: { productionId: string; shotId?: string }) {
  const [open, setOpen] = useState(false);
  return <><Button variant="outline" size="sm" onClick={() => setOpen(true)}>项目版本 / 比较</Button><Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl"><DialogTitle>项目版本</DialogTitle><DialogDescription>保存项目提交、查看分支关系，比较历史提交与当前项目。可按当前镜头筛选变化。</DialogDescription><VersionWorkspace key={productionId} productionId={productionId} shotId={shotId} /></DialogContent></Dialog></>;
}
