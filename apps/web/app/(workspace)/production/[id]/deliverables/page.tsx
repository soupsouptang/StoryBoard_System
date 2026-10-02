'use client';

import { Button, Card, Icons } from '@frameforge/ui';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useProduction } from '@/lib/hooks/useProduction';
import { apiDownload } from '@/lib/api-client';

export default function DeliverablesPage() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : '';

  const { data: production } = useProduction(id);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!production) return null;

  const exportFormats = [
    {
      id: 'csv',
      title: '分镜制作表（CSV）',
      desc: '包含完整制作字段、景别、运镜、时码及旁白的 UTF-8 表格，兼容 Excel。'
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

  const handleExport = async (formatId: string) => {
    if (!supportedFormats.has(formatId) || downloading) return;
    setError(null);
    setDownloading(formatId);
    try {
      const ext = formatId === 'csv' ? 'csv' : formatId;
      const safeTitle = production.name.replace(/[\\/:*?"<>|\x00-\x1f]/g, '_').trim() || '分镜工程';
      const fallbackFilename = `${safeTitle}.${ext}`;
      const { blob, filename } = await apiDownload(
        `/api/v1/productions/${encodeURIComponent(id)}/export/${formatId}`,
        fallbackFilename
      );
      const url = URL.createObjectURL(blob);
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
                  <h3 className="text-sm font-bold text-foreground">{fmt.title}</h3>
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
