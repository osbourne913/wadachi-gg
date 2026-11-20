// Vertical bars on a shared zero baseline, for amounts over time.
// Used two ways: a handful of labeled columns (one per year), or a dense run of
// thin columns along a date axis (one per day) with a few axis ticks.

import type {CSSProperties} from 'react';
import {niceTicks} from './scale';
import {TipLayer, useTip} from './tip';

export interface ColumnItem {
  key: string;
  /** Printed under the column when the chart is not dense. */
  label: string;
  value: number;
  /** Name of the column in the tooltip, e.g. "2022年" or "11月11日". */
  title: string;
  accent?: boolean;
  /** Print the value above the column. Use for the one or two the title is about. */
  showValue?: boolean;
}

interface Props {
  items: ColumnItem[];
  format: (value: number) => string;
  /** Axis tick format; defaults to `format`. */
  tickFormat?: (value: number) => string;
  /** Dense mode: thin columns, no per-column labels, ticks from `xTicks`. */
  dense?: boolean;
  xTicks?: {index: number; label: string}[];
  /** Most gaps allowed between y-axis ticks. */
  maxIntervals?: number;
  height?: number;
  ariaLabel: string;
}

export function Columns({items, format, tickFormat, dense = false, xTicks, maxIntervals = 3, height = 168, ariaLabel}: Props) {
  const {rootRef, tip, bind} = useTip();
  const max = Math.max(0, ...items.map(i => i.value));
  const ticks = niceTicks(max, maxIntervals);
  const top = ticks[ticks.length - 1] || 1;
  const style = {'--plot-h': `${height}px`} as CSSProperties;
  const fmtTick = tickFormat ?? format;

  return (
    <div className="viz" ref={rootRef}>
      <div className="viz-cols" style={style} data-dense={dense} role="img" aria-label={ariaLabel}>
        <div className="viz-cols-yaxis" aria-hidden="true">
          {ticks.map(t => (
            <span className="viz-cols-ytick" key={t} style={{insetBlockEnd: `${(t / top) * 100}%`}}>
              {fmtTick(t)}
            </span>
          ))}
        </div>
        <div className="viz-cols-plot">
          {ticks.slice(1).map(t => (
            <span className="viz-cols-gridline" key={t} style={{insetBlockEnd: `${(t / top) * 100}%`}} />
          ))}
          {items.map(item => (
            <div
              className="viz-cols-slot"
              key={item.key}
              data-tone={item.accent ? 'accent' : 'context'}
              {...bind(item.key, format(item.value), item.title)}
              data-active={tip?.id === item.key}>
              {/* The value label hangs off the bar, so it can never squeeze the bar shorter. */}
              <span className="viz-cols-bar" style={{blockSize: `${(item.value / top) * 100}%`}}>
                {item.showValue && !dense ? <span className="viz-cols-cap">{format(item.value)}</span> : null}
              </span>
            </div>
          ))}
        </div>
        <div className="viz-cols-xaxis" aria-hidden="true">
          {dense
            ? (xTicks ?? []).map(t => (
                <span className="viz-cols-xtick" key={t.index} style={{insetInlineStart: `${(t.index / items.length) * 100}%`}}>
                  {t.label}
                </span>
              ))
            : items.map(item => (
                <span className="viz-cols-xlabel" key={item.key}>
                  {item.label}
                </span>
              ))}
        </div>
      </div>
      <TipLayer tip={tip} />
    </div>
  );
}
