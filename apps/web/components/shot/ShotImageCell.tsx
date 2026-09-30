'use client';

import { useRef, useState } from 'react';
import type { Shot } from '@frameforge/types';
import { Button, Icons } from '@frameforge/ui';
import { useUploadPanelImage } from '@/lib/hooks/useProduction';
import { ShotPanelImage } from './ShotPanelImage';

export function ShotImageCell({ shot }: { shot: Shot }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadPanelImage(shot.production_id);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-1">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        hidden
        tabIndex={-1}
        aria-label={`镜头 ${shot.display_number} 分镜画面文件`}
        onChange={event => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (!file) return;
          setError(null);
          void upload.mutateAsync({ shot, file }).catch(cause => {
            setError(cause instanceof Error ? cause.message : '上传失败');
          });
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={upload.isPending}
        aria-label={`${shot.panels?.some(panel => panel.asset_id) ? '更换' : '上传'}镜头 ${shot.display_number} 分镜画面`}
        title="上传或更换分镜画面"
        onClick={event => { event.stopPropagation(); inputRef.current?.click(); }}
        onDoubleClick={event => event.stopPropagation()}
        className="relative h-auto w-full overflow-hidden p-0"
      >
        <span className="relative block aspect-video w-full bg-muted">
          <ShotPanelImage shot={shot} className="absolute inset-0 h-full w-full object-cover">
            <span className="absolute inset-0 flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
              <Icons.Image className="h-4 w-4" aria-hidden="true" />
              {upload.isPending ? '上传中' : '16:9'}
            </span>
          </ShotPanelImage>
        </span>
      </Button>
      {error && <span role="alert" className="block text-[10px] text-destructive">{error}</span>}
    </div>
  );
}
