// Area by count, color by group. Squarified layout so tiles stay close to square
// and the names fit.

import {useMemo} from 'react';
import {TipLayer, useTip, useWidth} from './tip';

export interface TreemapItem {
  key: string;
  label: string;
  value: number;
  group: string;
  /** Picture that fills the tile, e.g. a champion icon. */
  image?: string;
}

interface Props {
  items: TreemapItem[];
  /** Group keys in legend order, with their labels. Colors follow this order. */
  groups: {key: string; label: string}[];
  format: (v: number) => string;
  ariaLabel: string;
  height?: number;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function worst(row: number[], side: number): number {
  const sum = row.reduce((a, v) => a + v, 0);
  const max = Math.max(...row);
  const min = Math.min(...row);
  return Math.max((side * side * max) / (sum * sum), (sum * sum) / (side * side * min));
}

/** Squarified treemap (Bruls, Huizing, van Wijk). Values must be sorted descending. */
function squarify(values: number[], box: Rect): Rect[] {
  const total = values.reduce((a, v) => a + v, 0);
  const scale = (box.w * box.h) / total;
  const areas = values.map(v => v * scale);
  const out: Rect[] = [];
  let rect = {...box};
  let i = 0;
  while (i < areas.length) {
    const side = Math.min(rect.w, rect.h);
    const row = [areas[i]];
    let j = i + 1;
    while (j < areas.length && worst([...row, areas[j]], side) <= worst(row, side)) {
      row.push(areas[j]);
      j += 1;
    }
    const sum = row.reduce((a, v) => a + v, 0);
    if (rect.w >= rect.h) {
      const w = sum / rect.h;
      let y = rect.y;
      for (const a of row) {
        const h = a / w;
        out.push({x: rect.x, y, w, h});
        y += h;
      }
      rect = {x: rect.x + w, y: rect.y, w: rect.w - w, h: rect.h};
    } else {
      const h = sum / rect.w;
      let x = rect.x;
      for (const a of row) {
        const w = a / h;
        out.push({x, y: rect.y, w, h});
        x += w;
      }
      rect = {x: rect.x, y: rect.y + h, w: rect.w, h: rect.h - h};
    }
    i = j;
  }
  return out;
}

export function Treemap({items, groups, format, ariaLabel, height = 300}: Props) {
  const {rootRef, tip, bind} = useTip();
  const [boxRef, width] = useWidth<HTMLDivElement>(600);
  const sorted = useMemo(() => [...items].sort((a, b) => b.value - a.value), [items]);
  const rects = useMemo(
    () => squarify(sorted.map(i => i.value), {x: 0, y: 0, w: Math.max(1, width), h: height}),
    [sorted, width, height],
  );
  const order = new Map(groups.map((g, i) => [g.key, i]));
  const present = groups.filter(g => sorted.some(i => i.group === g.key));

  return (
    <div className="viz viz-treemap-wrap" ref={rootRef}>
      <div className="viz-treemap" ref={boxRef} style={{height}} role="img" aria-label={ariaLabel}>
        {sorted.map((item, i) => {
          const r = rects[i];
          const big = r.w > 64 && r.h > 34;
          const mid = r.w > 40 && r.h > 20;
          return (
            <div
              key={item.key}
              {...bind(item.key, format(item.value), `${item.label} ・ ${groups.find(g => g.key === item.group)?.label ?? ''}`)}
              className="viz-treemap-tile"
              data-group={order.get(item.group) ?? 'other'}
              data-active={tip?.id === item.key}
              data-image={item.image ? 'true' : undefined}
              style={{
                left: r.x,
                top: r.y,
                width: r.w,
                height: r.h,
                backgroundImage: item.image ? `url(${item.image})` : undefined,
              }}>
              {mid ? <span className="viz-treemap-name">{item.label}</span> : null}
              {big ? <span className="viz-treemap-value">{format(item.value)}</span> : null}
            </div>
          );
        })}
      </div>
      <div className="viz-legend" aria-hidden="true">
        {present.map(g => (
          <span className="viz-legend-item" key={g.key}>
            <span className="viz-swatch viz-treemap-swatch" data-group={order.get(g.key)} />
            {g.label}
          </span>
        ))}
      </div>
      <TipLayer tip={tip} />
    </div>
  );
}
