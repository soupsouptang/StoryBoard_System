'use client';

import React, { useMemo, useRef, useState } from 'react';
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Icons, Select } from '@frameforge/ui';
import { useQueryClient } from '@tanstack/react-query';
import type { Production } from '@frameforge/types';
import { apiClient } from '@/lib/api-client';

interface ImportModalProps {
  production: Production;
  isOpen: boolean;
  onClose: () => void;
}

type ImportImage = {row_index: number; filename: string; mime: string; data_base64: string};
type ImportMapping = Record<string, { col: number; raw_header: string; confidence: number; manual?: boolean }>;

const IMPORT_FIELDS = [
  ['number', '镜号'], ['name', '镜头标题'], ['description', '画面描述'],
  ['voiceover', '对应旁白'], ['duration', '时长（秒）'], ['duration_frames', '帧数'],
  ['shot_size', '景别'], ['lens_mm', '焦段'], ['movement', '机位/运镜'],
  ['camera_angle', '机位角度'], ['primary_method', '制作方式'],
  ['dialogue', '对白'], ['performance', '表演提示'], ['action', '动作'], ['panel_frame', '分镜图框'], ['status', '状态'],
  ['department', '责任部门'], ['owner_id', '负责人'], ['director_notes', '导演备注']
] as const;

export function ImportModal({ production, isOpen, onClose }: ImportModalProps) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fileName, setFileName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState<number | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ImportMapping>({});
  const [images, setImages] = useState<ImportImage[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const totalRows = rawRows.filter(row => row.some(cell => cell.trim())).length;
  const samplePreview = useMemo(() => rawRows.slice(0, 10).map(row =>
    Object.fromEntries(Object.entries(mapping).map(([field, info]) => [field, row[info.col] || '']))
  ), [rawRows, mapping]);

  const previewFile = async (selected: File) => {
    if (isLoading) return;
    setError(null);
    if (!/\.(xlsx|csv|docx|pdf|jpg|jpeg|png)$/i.test(selected.name)) {
      setError('支持 Excel（XLSX）、Word（DOCX）、PDF、JPG、PNG、CSV；旧版 XLS/DOC 请先另存为新版。');
      return;
    }
    if (selected.size > 40 * 1024 * 1024) { setError('文件不得超过 40 MB。'); return; }
    setIsLoading(true);
    setImportedCount(null);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('读取文件失败，请重新选择文件。'));
        reader.onabort = () => reject(new Error('文件读取已取消。'));
        reader.readAsDataURL(selected);
      });
      const res = await apiClient<{ headers: string[]; mapping: ImportMapping; raw_rows: string[][]; images: ImportImage[]; warnings: string[] }>(
        `/api/v1/productions/${production.id}/import-preview`, {
          method: 'POST', json: { filename: selected.name, file_base64: dataUrl.split(',')[1] }
        }
      );
      setFileName(selected.name);
      setHeaders(res.headers);
      setMapping(Object.fromEntries(Object.entries(res.mapping).filter(([field]) =>
        IMPORT_FIELDS.some(([key]) => key === field)
      )));
      setRawRows(res.raw_rows); setImages(res.images); setWarnings(res.warnings);
      setStep(2);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '解析表格失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    event.target.value = '';
    if (selected) void previewFile(selected);
  };

  const handleCommit = async () => {
    if (isLoading || importedCount !== null || !totalRows || !Object.keys(mapping).length) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiClient<{ ok: boolean; imported_count: number }>(
        `/api/v1/productions/${production.id}/import-commit`, {
          method: 'POST', json: { rows: rawRows, mapping, headers, images }
        }
      );
      if (!result.ok) throw new Error('导入未完成，请重试。');
      setImportedCount(result.imported_count);
      await queryClient.invalidateQueries({ queryKey: ['shots', production.id] });
      await queryClient.invalidateQueries({ queryKey: ['production', production.id] });
      for (const key of ['assets','custom-fields','custom-field-values']) await queryClient.invalidateQueries({ queryKey: [key, production.id] });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '导入入库失败');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => { if (!open && !isLoading) onClose(); }}>
      <DialogContent onEscapeKeyDown={event => { event.preventDefault(); onClose(); }} hideCloseButton={isLoading} className="flex h-[80dvh] max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl"
        onOpenAutoFocus={() => {
          if (importedCount !== null) {
            setStep(1);
            setMapping({});
            setRawRows([]);
            setImages([]);
            setWarnings([]);
            setFileName('');
            setImportedCount(null);
          }
          setError(null);
        }}
      >
        <DialogHeader className="shrink-0 border-b border-border p-6 pr-12">
          <DialogTitle className="flex items-center gap-2">
            <Icons.Table2 className="h-4 w-4" aria-hidden="true" />
            智能导入分镜制作表 (Smart Table Importer)
          </DialogTitle>
          <DialogDescription className="sr-only">上传分镜表，核对识别表头并预览确认导入。</DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex shrink-0 flex-wrap gap-y-2 border-b border-border bg-muted/40 px-4 py-2.5 sm:px-6 text-muted-foreground font-mono text-[11px]">
          <span className={`mr-4 ${step === 1 ? 'text-foreground font-bold' : ''}`}>1. 上传表格文件</span>
          <span className={`mr-4 ${step === 2 ? 'text-foreground font-bold' : ''}`}>2. 表头智能识别与核对</span>
          <span className={`${step === 3 ? 'text-foreground font-bold' : ''}`}>3. 数据预览与确认入库</span>
        </div>

        {images.length > 0 && <p className="px-6 py-2 text-xs text-muted-foreground">保留 {images.length} 张分镜图片；未映射列保留为导入原文。</p>}
          {warnings.map((warning,index) => <p key={index} role="status" className="px-6 py-2 text-xs text-muted-foreground">{warning}</p>)}
          {error && <p role="alert" className="shrink-0 px-4 pt-3 text-sm text-destructive sm:px-6">{error}</p>}
        {importedCount !== null && <p role="status" className="shrink-0 px-4 pt-3 text-sm sm:px-6">成功导入 {importedCount} 个分镜镜头。</p>}

        {/* Content Area */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          {step === 1 && (
            <div
              onDragOver={event => event.preventDefault()}
              onDrop={event => {
                event.preventDefault();
                const selected = event.dataTransfer.files[0];
                if (selected) void previewFile(selected);
              }}
              className="flex flex-col items-center justify-center min-h-full border-2 border-dashed border-border rounded-lg p-6 sm:p-12 text-center hover:border-ring transition">
              <Icons.FileDown className="h-12 w-12 text-foreground mb-4" />
              <h4 className="text-sm font-bold text-foreground mb-1">选择或拖放分镜制作表</h4>
              <p className="text-muted-foreground mb-6 max-w-sm leading-relaxed">
                支持 Excel（首个工作表）、Word 表格、PDF 与扫描 PDF、JPG/PNG、CSV。识别后核对字段映射，再预览确认导入。
              </p>
              <Button variant="default" size="sm" disabled={isLoading} onClick={() => inputRef.current?.click()}>
                浏览本地文件
              </Button>
              <input ref={inputRef} type="file" accept=".xlsx,.csv,.docx,.pdf,.jpg,.jpeg,.png" onChange={handleFileChange} hidden aria-label="分镜制作表文件" />
              {isLoading && <span className="mt-4 font-mono text-foreground">正在解析文档与识别文字…</span>}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-foreground">
                  文件: <span className="break-all font-mono text-foreground">{fileName}</span> (共识别 {totalRows} 行数据)
                </span>
                <span className="font-mono text-[11px] text-foreground">已匹配 {Object.keys(mapping).length} 个标准字段</span>
              </div>

              <div className="rounded-lg border border-border bg-background p-4 space-y-3">
                <div className="grid grid-cols-3 gap-2 font-mono text-[11px] text-muted-foreground border-b border-border pb-2">
                  <span>系统标准字段</span>
                  <span>识别表格表头</span>
                  <span className="text-right">匹配置信度</span>
                </div>

                {IMPORT_FIELDS.map(([field, label]) => {
                  const info = mapping[field];
                  return (
                    <div key={field} className="grid grid-cols-3 gap-2 items-center text-xs">
                      <span className="font-medium text-foreground">{label}</span>
                      <Select
                        label={`${label}的表格列`}
                        value={info ? String(info.col) : '__none__'}
                        disabled={isLoading || importedCount !== null}
                        options={[{ value: '__none__', label: '不映射（保留原文）' }, ...headers.map((header, index) => ({
                          value: String(index), label: `[${index + 1}列] ${header || '空表头'}`
                        }))]}
                        onChange={value => setMapping(current => {
                          const next = { ...current };
                          if (value === '__none__') delete next[field];
                          else next[field] = { col: Number(value), raw_header: headers[Number(value)], confidence: 1, manual: true };
                          return next;
                        })}
                      />
                      <span className="text-right font-mono text-muted-foreground">
                        {info?.manual ? '已手动核对' : info ? `${Math.round(info.confidence * 100)}%` : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h4 className="font-bold text-foreground">数据样本预览 (前 {samplePreview.length} 镜)</h4>
              <div className="overflow-x-auto border border-border rounded-lg">
                <table className="w-full text-left text-[11px] font-mono">
                  <thead className="bg-background border-b border-border text-muted-foreground">
                    <tr>
                      <th className="p-2">镜号</th>
                      <th className="p-2">制作方式</th>
                      <th className="p-2">画面描述</th>
                      <th className="p-2">对应旁白</th>
                      <th className="p-2">时长</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {samplePreview.map((row, idx) => (
                      <tr key={idx} className="hover:bg-muted/40">
                        <td className="p-2 font-bold text-foreground">{row.number || idx + 1}</td>
                        <td className="p-2 text-foreground">{row.primary_method || 'LIVE'}</td>
                        <td className="p-2 text-foreground font-sans truncate max-w-xs">{row.description || '—'}</td>
                        <td className="p-2 text-foreground font-sans truncate max-w-xs">{row.voiceover || '—'}</td>
                        <td className="p-2 text-muted-foreground">{row.duration || '3.0s'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="shrink-0 border-t border-border px-4 py-4 sm:justify-between sm:px-6">
          {step > 1 ? (
            <Button variant="outline" size="sm"
              onClick={() => setStep(step === 3 ? 2 : 1)}
              disabled={isLoading || importedCount !== null}
              className="font-medium"
            >
              上一步
            </Button>
          ) : <div />}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:gap-3">
            <Button variant="outline" size="sm"
              onClick={onClose}
              disabled={isLoading}
              className="font-medium"
            >
              {importedCount !== null ? '完成' : '取消'}
            </Button>

            {step === 2 && (
              <Button variant="default" size="sm"
                onClick={() => setStep(3)}
                disabled={!totalRows || !Object.keys(mapping).length}
                className="font-medium"
              >
                下一步：预览样本
              </Button>
            )}

            {step === 3 && importedCount === null && (
              <Button variant="default" size="sm"
                onClick={handleCommit}
                disabled={isLoading}
                className="font-medium"
              >
                {isLoading ? '正在导入…' : `确认导入 ${totalRows} 个镜头`}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
