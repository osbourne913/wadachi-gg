// One tooltip per chart. Marks call bind(value, label) and get pointer handlers
// back. The value leads and the label follows, because the reader already knows
// which mark they are on and wants the number.

import {useCallback, useEffect, useLayoutEffect, useRef, useState} from 'react';
import type {PointerEvent as ReactPointerEvent} from 'react';

export interface TipState {
  /** Center of the mark, relative to the chart root. */
  x: number;
  /** Top and bottom edge of the mark, relative to the chart root. */
  top: number;
  bottom: number;
  value: string;
  label: string;
  /** Identifies the hovered mark so it can show a hover state. */
  id: string;
}

/**
 * False on phones and tablets. After a tap, a touch browser can report the
 * finger's last position as a mouse; without this check a tooltip would open
 * under it when the page scrolls.
 */
export function canHover(): boolean {
  return typeof matchMedia !== 'function' || matchMedia('(hover: hover)').matches;
}

export function useTip<T extends HTMLElement = HTMLDivElement>() {
  const rootRef = useRef<T>(null);
  const [tip, setTip] = useState<TipState | null>(null);

  const showAt = useCallback((el: Element, id: string, value: string, label: string) => {
    const root = rootRef.current;
    if (!root) {
      return;
    }
    const a = root.getBoundingClientRect();
    const b = el.getBoundingClientRect();
    setTip({x: b.left - a.left + b.width / 2, top: b.top - a.top, bottom: b.bottom - a.top, value, label, id});
  }, []);

  const hide = useCallback(() => setTip(null), []);

  // A tap keeps the tooltip open; the next tap elsewhere or a scroll closes it.
  useEffect(() => {
    if (!tip) {
      return;
    }
    const onDown = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (!target?.closest?.('[data-viz-mark]')) {
        setTip(null);
      }
    };
    const onScroll = () => setTip(null);
    document.addEventListener('pointerdown', onDown);
    window.addEventListener('scroll', onScroll, {passive: true, capture: true});
    return () => {
      document.removeEventListener('pointerdown', onDown);
      window.removeEventListener('scroll', onScroll, {capture: true});
    };
  }, [tip]);

  const bind = useCallback(
    (id: string, value: string, label: string) => ({
      'data-viz-mark': '',
      'data-active': undefined as string | undefined,
      onPointerEnter: (e: ReactPointerEvent) => {
        if (e.pointerType !== 'touch' && canHover()) {
          showAt(e.currentTarget, id, value, label);
        }
      },
      onPointerDown: (e: ReactPointerEvent) => showAt(e.currentTarget, id, value, label),
      onPointerLeave: (e: ReactPointerEvent) => {
        if (e.pointerType !== 'touch') {
          hide();
        }
      },
    }),
    [showAt, hide],
  );

  return {rootRef, tip, bind, showAt, hide};
}

export function TipLayer({tip}: {tip: TipState | null}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{left: number; top: number} | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    const root = el?.parentElement;
    if (!tip || !el || !root) {
      setPos(null);
      return;
    }
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const rootW = root.clientWidth;
    const left = Math.max(0, Math.min(rootW - w, tip.x - w / 2));
    // Above the mark when there is room in the viewport, otherwise below it.
    const rootTop = root.getBoundingClientRect().top;
    const above = tip.top - h - 8;
    const top = rootTop + above < 8 ? tip.bottom + 8 : above;
    setPos({left, top});
  }, [tip]);

  if (!tip) {
    return null;
  }
  return (
    <div
      ref={ref}
      className="viz-tip"
      role="status"
      style={{left: pos?.left ?? 0, top: pos?.top ?? 0, visibility: pos ? 'visible' : 'hidden'}}>
      <span className="viz-tip-value">{tip.value}</span>
      {tip.label}
    </div>
  );
}

/** Width of an element, updated as it resizes. */
export function useWidth<T extends HTMLElement>(fallback: number): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    setWidth(el.clientWidth);
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}
