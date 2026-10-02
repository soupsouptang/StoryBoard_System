'use client';

import { Button, Card, Icons, Checkbox, Input, Select } from '@frameforge/ui';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useProduction } from '@/lib/hooks/useProduction';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient, apiDownload } from '@/lib/api-client';
import { useAuthStore } from '@/stores/authStore';
type ExportTemplate = { id: string; name: string; revision: number; field_ids: string[]; fields: string[] };

export default function DeliverablesPage() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : '';

  const { data: production } = useProduction(id);
  const [downloading, setDownloading] = useState<string | null>(null);
  const fields = useQuery({ queryKey: ['export-fields', id], enabled: Boolean(id), queryFn: () => apiClient<{ column_id: string | null; key: string; label: string; column_class: 'builtin' | 'preset' | 'custom' }[]>(`/api/v1/productions/${id}/export/fields`) });
  const [selected, setSelected] = useState<string[] | null>(null);
  const templates = useQuery({ queryKey: ['export-templates', id], enabled: Boolean(id), queryFn: () => apiClient<ExportTemplate[]>(`/api/v1/productions/${id}/export/templates`) });
  const [template, setTemplate] = useState<ExportTemplate | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateNotice, setTemplateNotice] = useState('');
  const permissions = useAuthStore(state => state.user?.role?.permissions);
  const canSaveTemplate = Boolean(permissions?.['*'] || permissions?.['production.write'] || permissions?.['export.create']);
  const saveTemplate = useMutation({ mutationFn: (field_ids: string[]) => apiClient<ExportTemplate>(`/api/v1/productions/${id}/export/templates${template ? '/' + template.id : ''}`, {
    method: template ? 'PATCH' : 'POST', json: { name: templateName, field_ids, ...(template ? { revision: template.revision } : {}) } }),
    onSuccess: saved => { setTemplate(saved); setTemplateName(saved.name); setTemplateNotice('模板已保存。'); void templates.refetch(); },
    onError: cause => { setError(cause instanceof Error ? cause.message : '模板保存失败，所选字段已保留。'); void templates.refetch(); } });

  const [search, setSearch] = useState('');
  const [preview, setPreview] = useState<{ url: string; page: number; pages: number } | null>(null);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview.url); }, [preview]);
  const chosen = (selected ?? fields.data?.map(field => field.key) ?? []).filter(key => fields.data?.some(field => field.key === key));
  const [error, setError] = useState<string | null>(null);
  const fieldSelection = chosen.join(',');
  useEffect(() => setPreview(null), [id, fieldSelection]);

  if (!production) return null;

  const exportFormats = [
    {
      id: 'csv',
      title: '分镜制作表（CSV）',
      desc: '导出所选文字字段的 UTF-8 表格，兼容 Excel；CSV 不包含图片。'
    },
    { id: 'xlsx', title: '分镜制作表（Excel）', desc: '导出真实 XLSX 表格，保留镜头字段、自定义列及分镜图片。' },
    { id: 'docx', title: '分镜制作表（Word）', desc: '导出可编辑 DOCX 表格，包含镜头信息及分镜图片。' },
    {
      id: 'edl',
      title: '时间线交换表（CMX 3600 EDL）',
      desc: '导出用于 DaVinci Resolve / Premiere Pro 的高精度镜头剪辑时码表。'
    },
    {
      id: 'otio',
      title: '开放时间线（OpenTimelineIO）',
      desc: '导出全行业标准 OpenTimelineIO 剪辑序列与分镜元数据。'
    },
    {
      id: 'srt',
      title: '旁白字幕（SRT）',
      desc: '根据镜头精准时码对齐导出的旁白与解说词字幕。'
    },
    {
      id: 'pdf',
      title: '分镜图版（PDF）',
      desc: '按镜头分页导出 PDF，包含分镜图片与制作字段。'
    }
  ];

  const supportedFormats = new Set(['csv', 'edl', 'otio', 'srt', 'xlsx', 'docx', 'pdf']);

  const handleExport = async (formatId: string, showPreview = false, page = 0) => {
    if (!supportedFormats.has(formatId) || downloading) return;
    if (!['edl','otio','srt'].includes(formatId) && !chosen.length) { setError('请先选择导出字段。'); return; }
    setError(null);
    setDownloading(formatId);
    try {
      const ext = formatId === 'csv' ? 'csv' : formatId;
      const safeTitle = production.name.replace(/[\\/:*?"<>|\x00-\x1f]/g, '_').trim() || '分镜工程';
      const fallbackFilename = `${safeTitle}.${ext}`;
      const { blob, filename, pageCount } = await apiDownload(
        `/api/v1/productions/${encodeURIComponent(id)}/export/${formatId}${['edl','otio','srt'].includes(formatId) ? '' : `?${new URLSearchParams({ fields: chosen.join(','), preview: String(showPreview), page: String(page) })}`}`,
        fallbackFilename
      );
      const url = URL.createObjectURL(blob);
      if (showPreview) { setPreview({ url, page, pages: pageCount }); return; }
      try {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
      } finally {
        setTimeout(() => URL.revokeObjectURL(url), 0);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '导出失败，请重试');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-5xl flex-col space-y-8 overflow-y-auto p-4 sm:p-8">
      <div>
        <h1 className="text-lg font-bold text-foreground">交付导出</h1>
        <p className="text-xs text-muted-foreground">选择导出工业级制作与剪辑格式。</p>
      </div>

      {error && <div role="alert" className="rounded border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">{error}</div>}

      <Card className="space-y-4 p-4">
        <h2 className="text-base font-medium">导出字段</h2>
        <div className="flex flex-wrap items-end gap-2"><Select label="交付模板" value={template?.id || 'new'} options={[{ value: 'new', label: '新模板' }, ...(templates.data || []).map(row => ({ value: row.id, label: row.name }))]} onChange={value => { const row = templates.data?.find(item => item.id === value) || null; setTemplate(row); setTemplateName(row?.name || ''); setTemplateNotice(''); if (row) setSelected(row.fields); }} disabled={saveTemplate.isPending} /><Input aria-label="交付模板名称" placeholder="模板名称" maxLength={80} value={templateName} onChange={event => setTemplateName(event.target.value)} disabled={saveTemplate.isPending} /><Button variant="outline" disabled={!canSaveTemplate || !templateName.trim() || !chosen.length || saveTemplate.isPending || downloading !== null} onClick={() => { setError(null); setTemplateNotice(''); saveTemplate.mutate(chosen.map(key => fields.data?.find(field => field.key === key)?.column_id).filter((identity): identity is string => Boolean(identity))); }}>{saveTemplate.isPending ? '保存中…' : '保存模板'}</Button></div>
        {templateNotice && <p role="status" className="text-sm">{templateNotice}</p>}
        {templates.error && <p role="alert">模板读取失败 <Button variant="outline" onClick={() => void templates.refetch()}>重试</Button></p>}
        <Input aria-label="搜索导出字段" placeholder="搜索字段…" value={search} onChange={event => setSearch(event.target.value)} />
        {fields.isPending && <p role="status">正在读取可导出字段…</p>}
        {fields.error && <p role="alert">字段读取失败 <Button variant="outline" onClick={() => void fields.refetch()}>重试</Button></p>}
        {(['builtin','preset','custom'] as const).map(group => {
          const all = fields.data?.filter(field => field.column_class === group) || [];
          const visible = all.filter(field => field.label.includes(search));
          return <fieldset key={group} className="space-y-2"><legend className="mb-2 text-sm font-medium">{({ builtin: '内置列', preset: '预设列', custom: '自定义列' })[group]}</legend>
            <Button variant="ghost" size="sm" disabled={!all.length || saveTemplate.isPending || downloading !== null} onClick={() => setSelected(all.every(field => chosen.includes(field.key)) ? chosen.filter(key => !all.some(field => field.key === key)) : [...new Set([...chosen,...all.map(field => field.key)])])}>{all.length && all.every(field => chosen.includes(field.key)) ? '全部取消' : '分组全选'}</Button>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{visible.map(field => <label key={field.key} className="flex items-center gap-2 text-sm"><Checkbox checked={chosen.includes(field.key)} disabled={saveTemplate.isPending || downloading !== null} onCheckedChange={checked => setSelected(checked ? [...chosen,field.key] : chosen.filter(key => key !== field.key))} />{field.label}</label>)}</div>
          </fieldset>;
        })}
        <Button variant="outline" disabled={!chosen.length || downloading !== null} onClick={() => void handleExport('pdf', true)}>预览 PDF</Button>
        {preview && <div className="space-y-2"><div className="flex flex-wrap items-center gap-2"><Button variant="ghost" onClick={() => setPreview(null)}>关闭预览</Button><Button variant="outline" disabled={preview.page === 0 || downloading !== null} onClick={() => void handleExport('pdf', true, preview.page - 1)}>上一页</Button><span className="text-sm">第 {preview.page + 1} / {preview.pages} 页</span><Button variant="outline" disabled={preview.page + 1 >= preview.pages || downloading !== null} onClick={() => void handleExport('pdf', true, preview.page + 1)}>下一页</Button></div><img alt={`PDF 预览第 ${preview.page + 1} 页`} src={preview.url} className="max-h-[70vh] max-w-full border object-contain" /></div>}
      </Card>
      <div className="grid grid-cols-1 gap-4">
        {exportFormats.map(fmt => {
          const isSupported = supportedFormats.has(fmt.id);
          return (
            <Card
              key={fmt.id}
              className="flex flex-col items-start justify-between gap-3 p-5 transition hover:border-ring sm:flex-row sm:items-center"
            >
              <div className="space-y-1 max-w-xl">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-bold text-foreground">{fmt.title}</h3>{['edl','otio','srt'].includes(fmt.id) && <span className="text-xs text-muted-foreground">协议字段为格式必需</span>}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{fmt.desc}</p>
              </div>

              <Button
                onClick={() => handleExport(fmt.id)}
                disabled={!isSupported || downloading !== null}
                className="w-full sm:w-auto"
              >
                <Icons.Download className="h-4 w-4" />
                {!isSupported ? '迁移中' : downloading === fmt.id ? '正在导出…' : '立即导出'}
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
