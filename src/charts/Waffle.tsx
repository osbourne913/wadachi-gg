// One square per item, in order. Good for "N out of 100" where each item is a
// thing the reader recognizes (here: one game).

import type {CSSProperties} from 'react';
import {TipLayer, useTip} from './tip';

export interface WaffleItem {
  key: string;
  on: boolean;
  /** Tooltip value, e.g. "発言 3回". */
  value: string;
  /** Tooltip label, e.g. "9月14日の試合". */
  label: string;
}

interface Props {
  items: WaffleItem[];
  perRow?: number;
  onLabel: string;
  offLabel: string;
  ariaLabel: string;
}

export function Waffle({items, perRow = 10, onLabel, offLabel, ariaLabel}: Props) {
  const {rootRef, tip, bind} = useTip();
  const on = items.filter(i => i.on).length;
  return (
    <div className="viz viz-waffle-wrap" ref={rootRef}>
      <div className="viz-waffle" style={{'--per-row': perRow} as CSSProperties} role="img" aria-label={ariaLabel}>
        {items.map(item => (
          <span
            className="viz-waffle-cell"
            key={item.key}
            data-tone={item.on ? 'accent' : 'context'}
            {...bind(item.key, item.value, item.label)}
            data-active={tip?.id === item.key}
          />
        ))}
      </div>
      <div className="viz-legend" aria-hidden="true">
        <span className="viz-legend-item">
          <span className="viz-swatch" data-tone="accent" />
          {onLabel} {on}
        </span>
        <span className="viz-legend-item">
          <span className="viz-swatch" data-tone="context" />
          {offLabel} {items.length - on}
        </span>
      </div>
      <TipLayer tip={tip} />
    </div>
  );
}
