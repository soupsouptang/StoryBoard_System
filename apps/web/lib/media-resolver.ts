/**
 * Media & Thumbnail Resolver for FrameForge OS
 * Maps shots to real storyboard stills or generated aesthetic visual plates
 */

// Placeholders share a quiet surface; the production method is communicated by its label.
const NEUTRAL_METHOD_STYLE = {
  bg: 'from-muted via-card to-background',
  border: 'border-border',
  text: 'text-muted-foreground',
  glow: 'transparent'
};

export const METHOD_GRADIENTS: Record<string, typeof NEUTRAL_METHOD_STYLE> = {
  live: NEUTRAL_METHOD_STYLE,
  stock: NEUTRAL_METHOD_STYLE,
  client: NEUTRAL_METHOD_STYLE,
  ae: NEUTRAL_METHOD_STYLE,
  mg: NEUTRAL_METHOD_STYLE,
  three_d: NEUTRAL_METHOD_STYLE,
  vfx: NEUTRAL_METHOD_STYLE,
  archive: NEUTRAL_METHOD_STYLE,
  still: NEUTRAL_METHOD_STYLE,
  type: NEUTRAL_METHOD_STYLE
};

export function getMethodStyle(method: string) {
  const m = (method || 'live').toLowerCase();
  return METHOD_GRADIENTS[m] || METHOD_GRADIENTS.live;
}

export function getMethodLabel(method: string, locale: 'zh-CN' | 'en-US' = 'zh-CN'): string {
  const m = (method || 'live').toLowerCase();
  const dictZh: Record<string, string> = {
    live: '实拍镜头',
    stock: '商用素材',
    client: '客户提供',
    archive: '复用素材',
    still: '静帧画面',
    ae: 'AE效果',
    mg: 'MG动画',
    three_d: '三维制作',
    vfx: '视觉特效',
    type: '文字特效'
  };

  const dictEn: Record<string, string> = {
    live: 'LIVE SHOOT',
    stock: 'STOCK FOOTAGE',
    client: 'CLIENT ASSET',
    archive: 'ARCHIVE',
    still: 'STILL FRAME',
    ae: 'AE COMP',
    mg: 'MOTION GRAPHICS',
    three_d: '3D ANIMATION',
    vfx: 'VFX SHOT',
    type: 'TITLE CARD'
  };

  return (locale === 'zh-CN' ? dictZh[m] : dictEn[m]) || method.toUpperCase();
}

export function getStatusBadge(status: string) {
  switch (status) {
    case 'approved':
      return { label: '已审批', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' };
    case 'review':
      return { label: '待审片', bg: 'bg-muted text-muted-foreground border-border' };
    case 'changes_requested':
      return { label: '需修改', bg: 'bg-rose-500/10 text-rose-400 border-rose-500/30' };
    case 'in_progress':
      return { label: '制作中', bg: 'bg-sky-500/10 text-sky-400 border-sky-500/30' };
    case 'locked':
      return { label: '已锁定', bg: 'bg-purple-500/10 text-purple-400 border-purple-500/30' };
    default:
      return { label: '规划中', bg: 'bg-slate-500/10 text-slate-400 border-slate-700' };
  }
}
