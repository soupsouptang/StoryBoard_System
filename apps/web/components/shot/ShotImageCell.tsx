'use client';

import { useRef, useState } from 'react';
import type { Shot } from '@frameforge/types';
import { Button, Icons } from '@frameforge/ui';
import { useProduction, useUploadPanelImage } from '@/lib/hooks/useProduction';
import { useSaveShotDetail } from '@/lib/hooks/useShotDetail';
import { ShotPanelImage, primaryPanelAssetId } from './ShotPanelImage';
import { ShotImagePreview } from './ShotImagePreview';

export function ShotImageCell({ shot, disabled = false, preview = true }: { shot: Shot; disabled?: boolean; preview?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadPanelImage(shot.production_id);
  const save = useSaveShotDetail(shot.production_id);
  const {data:production} = useProduction(shot.production_id);
  const aspectRatio = production?.aspect_ratio || '16:9';
  const [previewOpen, setPreviewOpen] = useState(false);
  const [replacement, setReplacement] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-1" onClick={event => event.stopPropagation()} onDoubleClick={event => event.stopPropagation()}>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        hidden
        disabled={disabled || upload.isPending || save.isPending}
        tabIndex={-1}
        aria-label={`镜头 ${shot.display_number} 分镜画面文件`}
        onChange={event => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (!file || disabled || upload.isPending || save.isPending) return;
          setError(null);
          if (previewOpen) { setReplacement(file); return; }
          void upload.mutateAsync({ shot, file }).catch(cause => {
            setError(cause instanceof Error ? cause.message : '上传失败');
          });
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || upload.isPending}
        aria-label={`${primaryPanelAssetId(shot) ? (preview ? '预览' : '更换') : '上传'}镜头 ${shot.display_number} 分镜画面`}
        title={primaryPanelAssetId(shot) && preview ? "放大预览分镜画面" : "上传或更换分镜画面"}
        onClick={event => { event.stopPropagation(); if (primaryPanelAssetId(shot) && preview) setPreviewOpen(true); else inputRef.current?.click(); }}
        onDoubleClick={event => event.stopPropagation()}
        className="relative h-auto w-full overflow-hidden p-0"
      >
        <span className="relative block w-full bg-muted" style={{aspectRatio:aspectRatio.replace(':',' / ')}}>
          <ShotPanelImage shot={shot} className="absolute inset-0 h-full w-full object-cover">
            <span className="absolute inset-0 flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
              <Icons.Image className="h-4 w-4" aria-hidden="true" />
              {upload.isPending ? '上传中' : aspectRatio}
            </span>
          </ShotPanelImage>
        </span>
      </Button>
      {preview && <ShotImagePreview shot={shot} aspectRatio={aspectRatio} open={previewOpen} file={replacement}
        onClose={() => {setPreviewOpen(false); setReplacement(null);}} onReplace={() => inputRef.current?.click()}
        onLock={async framing => {const saved=await save.mutateAsync({id:shot.id,revision:shot.revision,changes:{},custom_values:[],image:replacement,framing}); setReplacement(null); return saved;}} disabled={disabled || upload.isPending || save.isPending} />}
      {error && <span role="alert" className="block text-[10px] text-destructive">{error}</span>}
    </div>
  );
}
