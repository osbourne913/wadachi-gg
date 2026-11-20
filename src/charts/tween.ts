// Eases a set of numbers toward new targets, for figures that change as the
// reader scrolls. Readers who ask for reduced motion get the new values at once.

import {useEffect, useRef, useState} from 'react';

const prefersReducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function useTweened(target: number[], ms = 450): number[] {
  const [value, setValue] = useState(target);
  const current = useRef(target);
  const key = target.join(',');

  useEffect(() => {
    const from = current.current;
    if (from.length !== target.length || ms <= 0 || prefersReducedMotion()) {
      current.current = target;
      setValue(target);
      return;
    }
    if (from.every((v, i) => v === target[i])) {
      return;
    }
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      const eased = 1 - (1 - p) ** 3;
      const next = p >= 1 ? target : target.map((t, i) => from[i] + (t - from[i]) * eased);
      current.current = next;
      setValue(next);
      if (p < 1) {
        frame = requestAnimationFrame(tick);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // `key` stands for the contents of `target`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ms]);

  return value;
}
