'use client';

import { usePathname } from 'next/navigation';
import { framesToTimecode } from '@frameforge/timecode';
import type { Production } from '@frameforge/types';
import { useShots } from '@/lib/hooks/useProduction';
import { useCustomFieldValues } from '@/lib/hooks/useCustomFields';
import { filterShotsForView, sumShotDurationFrames } from '@/lib/shot-display';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';

/** Read-only projection of the existing query cache and each view's filter owner. */
export function ProductionShotSummary({ production }: { production: Production }) {
  const path = usePathname();
  const { data: shots } = useShots(production.id);
  const { data: customValues } = useCustomFieldValues(production.id);
  const filters = useWorkspaceStore(state => state.filters);
  const view = path.endsWith('/shots') ? 'table' : path.endsWith('/storyboard') ? 'storyboard' : null;
  const displayedShots = shots && (view ? filterShotsForView(shots, filters, view, customValues?.values) : shots);
  const fps = production.fps_num / (production.fps_den || 1);
  const total = shots ? sumShotDurationFrames(shots) : production.total_duration_frames;
  const format = (frames: number | undefined) => frames == null ? '—' : framesToTimecode(frames, fps, production.drop_frame);

  return <div className="flex min-w-0 flex-wrap items-center gap-x-1 text-xs tabular-nums text-muted-foreground">
    <span className="whitespace-nowrap">{shots?.length ?? production.shot_count ?? 0} 镜头 · {Number(fps.toFixed(3))} fps · {production.aspect_ratio}</span>
    <span aria-label="项目镜头时长统计" className="min-w-0">
      <span className="inline-block whitespace-nowrap"> · 总时长 {format(total)}</span>
      <span className="inline-block whitespace-nowrap">（显示有效镜头时长 {format(displayedShots && sumShotDurationFrames(displayedShots))}）</span>
    </span>
  </div>;
}
