// The shape of a year's day: how the logins spread over the 24 hours, drawn as
// one smooth hill from 6 a.m. to 5 a.m. so that late nights sit together on the
// right. The year before is a thin dashed line behind it.

import {useMemo} from 'react';
import {useWidth} from './tip';
import {useTweened} from './tween';

interface Props {
  /** Login hours by wall-clock hour 0-23. */
  hours: number[];
  previous: number[] | null;
  ariaLabel: string;
  height?: number;
}

/** 6, 7, … 23, 0, … 5 */
const ORDER = Array.from({length: 24}, (_, i) => (i + 6) % 24);
const TICKS = [6, 12, 18, 0];

function shares(hours: number[]): number[] {
  const sum = hours.reduce((a, v) => a + v, 0);
  return ORDER.map(h => (sum > 0 ? (hours[h] ?? 0) / sum : 0));
}

/** A curve through the points with flat tangents, so it never overshoots a value. */
function curve(points: [number, number][]): string {
  return points
    .map((p, i) => {
      if (i === 0) {
        return `M${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
      }
      const q = points[i - 1];
      const mid = ((q[0] + p[0]) / 2).toFixed(1);
      return `C${mid} ${q[1].toFixed(1)} ${mid} ${p[1].toFixed(1)} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
    })
    .join(' ');
}

export function HourRidge({hours, previous, ariaLabel, height = 104}: Props) {
  const [ref, width] = useWidth<HTMLDivElement>(280);
  const target = useMemo(() => shares(hours), [hours]);
  const before = useMemo(() => (previous ? shares(previous) : null), [previous]);
  const now = useTweened(target);

  const top = 16;
  const base = height - 18;
  const max = Math.max(0.01, ...target, ...(before ?? []));
  const x = (i: number) => 2 + (i / 23) * Math.max(1, width - 4);
  const y = (v: number) => base - (v / max) * (base - top);
  const line = curve(now.map((v, i) => [x(i), y(v)]));
  // 22:00 to 02:00 are positions 16 to 19 on this axis.
  const nightFrom = x(15.5);
  const nightTo = x(19.5);

  return (
    <div className="viz viz-ridge" ref={ref}>
      <svg width={width} height={height} role="img" aria-label={ariaLabel} className="viz-ridge-svg">
        <rect className="viz-ridge-night" x={nightFrom} y={top - 12} width={nightTo - nightFrom} height={base - top + 12} rx={3} />
        <text className="viz-ridge-tick" x={(nightFrom + nightTo) / 2} y={top - 2} textAnchor="middle">
          深夜
        </text>
        <line className="viz-ridge-base" x1={x(0)} x2={x(23)} y1={base} y2={base} />
        {before ? <path className="viz-ridge-before" d={curve(before.map((v, i) => [x(i), y(v)]))} /> : null}
        <path className="viz-ridge-area" d={`${line} L${x(23).toFixed(1)} ${base} L${x(0).toFixed(1)} ${base} Z`} />
        <path className="viz-ridge-line" d={line} />
        {TICKS.map(h => {
          const i = ORDER.indexOf(h);
          return (
            <text key={h} className="viz-ridge-tick" x={x(i)} y={height - 4} textAnchor={i === 0 ? 'start' : 'middle'}>
              {h}時
            </text>
          );
        })}
      </svg>
      <div className="viz-legend" aria-hidden="true">
        <span className="viz-legend-item">
          <span className="viz-swatch viz-ridge-swatch" />
          この年
        </span>
        {before ? (
          <span className="viz-legend-item">
            <span className="viz-ridge-dash" />
            前の年
          </span>
        ) : null}
      </div>
    </div>
  );
}
