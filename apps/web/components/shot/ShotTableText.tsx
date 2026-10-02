'use client';

import { useEffect, useRef, useState } from 'react';
import { shotTableTextLines } from '@/lib/shot-table-presentation';

/** Display only: keep the source value intact for editing and commands. */
export function ShotTableText({ text, maxLines, className = '' }: { text: string; maxLines?: number; className?: string }) {
  const element = useRef<HTMLSpanElement>(null);
  const [lines, setLines] = useState(() => shotTableTextLines(text, maxLines || 1));
  useEffect(() => {
    const node = element.current;
    if (!node) return;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const update = () => {
      const style = getComputedStyle(node);
      if (context) {
        context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        context.letterSpacing = style.letterSpacing;
      }
      const limit = maxLines || Number(style.getPropertyValue('--shot-text-lines')) || 2;
      const next = shotTableTextLines(text, limit, node.clientWidth, value => context?.measureText(value).width || 0);
      setLines(previous => previous.join('\n') === next.join('\n') ? previous : next);
    };
    const observer = new ResizeObserver(update);
    observer.observe(node); update();
    void document.fonts.ready.then(() => { if (node.isConnected) update(); });
    return () => observer.disconnect();
  }, [text, maxLines]);
  return <span ref={element} title={text} aria-label={text} className={`block min-w-0 whitespace-pre ${className}`}>{lines.join('\n')}</span>;
}
