'use client';
import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';

/** A table spacer owns vertical flow; a sticky slot owns the visible content width. */
export function ShotDetailSlot({ viewport, children }: { viewport: RefObject<HTMLDivElement | null>; children: (height: number) => ReactNode }) {
  const slot = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 470 });
  useLayoutEffect(() => {
    const region = viewport.current, element = slot.current;
    if (!region || !element) return;
    const preceding = element.closest('tr')?.previousElementSibling;
    const measure = () => {
      const rowHeight = preceding?.getBoundingClientRect().height || 80;
      // Reserve four complete rows, including comfortable internal spacing.
      setSize({ width: region.clientWidth, height: Math.max(470, rowHeight * 4) });
    };
    measure();
    const observer = new ResizeObserver(measure); observer.observe(region);
    if (preceding) observer.observe(preceding);
    return () => observer.disconnect();
  }, [viewport]);
  useLayoutEffect(() => {
    const region = viewport.current, element = slot.current;
    if (!region || !element || !size.width) return;
    const frame = requestAnimationFrame(() => {
      const regionRect = region.getBoundingClientRect(), rect = element.getBoundingClientRect();
      if (rect.bottom > regionRect.bottom) region.scrollTop += rect.bottom - regionRect.bottom;
      // On short screens the content area borrows vertical space from its page
      // scroller rather than compressing the card to two rows.
      for (let parent = region.parentElement; parent; parent = parent.parentElement) {
        if (!['auto', 'scroll'].includes(getComputedStyle(parent).overflowY) || parent.scrollHeight <= parent.clientHeight) continue;
        const bottom = Math.min(parent.getBoundingClientRect().bottom, window.innerHeight);
        const gap = element.getBoundingClientRect().bottom - bottom;
        if (gap > 0) parent.scrollTop += gap;
      }
      // Do not use scrollIntoView: it can reset horizontal position.
    });
    return () => cancelAnimationFrame(frame);
  }, [size, viewport]);
  return <div ref={slot} data-detail-slot className="sticky left-0 z-20 box-border max-w-none" style={{ width: size.width || undefined }}>{children(size.height)}</div>;
}
