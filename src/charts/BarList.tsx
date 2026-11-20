// Ranked horizontal bars: one row per part, largest first, on a shared baseline.
// One row can be the point of the chart (accent); the rest stay gray.

import type {CSSProperties} from 'react';
import {TipLayer, useTip} from './tip';

export interface BarItem {
  key: string;
  label: string;
  value: number;
  /** Small text after the value, e.g. "50件". */
  note?: string;
}

interface Props {
  items: BarItem[];
  format: (value: number) => string;
  /** 'first' highlights the top row; 'all' colors every row; a key highlights that row. */
  emphasis?: 'first' | 'all' | string;
  /** Denominator for the share shown in the tooltip. Omit to skip the share. */
  total?: number;
  ariaLabel: string;
}

export function BarList({items, format, emphasis = 'first', total, ariaLabel}: Props) {
  const {rootRef, tip, bind} = useTip();
  const max = Math.max(1, ...items.map(i => i.value));

  return (
    <div className="viz" ref={rootRef}>
      <div className="viz-bars" role="img" aria-label={ariaLabel}>
        {items.map((item, index) => {
          const accent = emphasis === 'all' || (emphasis === 'first' ? index === 0 : emphasis === item.key);
          const share = total && total > 0 ? `全体の${((item.value / total) * 100).toFixed(1)}%` : '';
          const label = [item.label, share, item.note].filter(Boolean).join(' ・ ');
          return (
            <div
              className="viz-bar-row"
              key={item.key}
              data-tone={accent ? 'accent' : 'context'}
              {...bind(item.key, format(item.value), label)}
              data-active={tip?.id === item.key}>
              <span className="viz-bar-label">{item.label}</span>
              <span className="viz-bar-track">
                <span className="viz-bar-fill" style={{inlineSize: `${(item.value / max) * 100}%`} as CSSProperties} />
              </span>
              <span className="viz-bar-value">
                {format(item.value)}
                {item.note ? <span className="viz-bar-note">{item.note}</span> : null}
              </span>
            </div>
          );
        })}
      </div>
      <TipLayer tip={tip} />
    </div>
  );
}
