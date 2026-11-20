// One strip per series along a shared month axis; each month is shaded by how
// many days it had. Shows when something was played and for how long.

import {useCallback, useState} from 'react';
import type {PointerEvent as ReactPointerEvent} from 'react';
import {HeatLegend} from './HeatGrid';
import {levelOf} from './scale';
import {TipLayer, canHover, useTip} from './tip';

export interface StripRow {
  key: string;
  label: string;
  /** Days per month, aligned with `months`. */
  values: number[];
  /** Figure printed at the end of the row. */
  summary: string;
}

interface Props {
  rows: StripRow[];
  months: {year: number; month: number}[];
  unit: string;
  ariaLabel: string;
}

export function MonthStrip({rows, months, unit, ariaLabel}: Props) {
  const {rootRef, tip, showAt, hide} = useTip();
  const [active, setActive] = useState<string | null>(null);

  // The cells are a few pixels wide, so find the month under the pointer from
  // its x position rather than asking the reader to hit one.
  const onMove = useCallback(
    (row: StripRow, e: ReactPointerEvent<HTMLDivElement>) => {
      const track = e.currentTarget;
      const box = track.getBoundingClientRect();
      const index = Math.max(0, Math.min(months.length - 1, Math.floor(((e.clientX - box.left) / box.width) * months.length)));
      const cell = track.children[index];
      const m = months[index];
      if (!cell || !m) {
        return;
      }
      const id = `${row.key}:${index}`;
      setActive(id);
      showAt(cell, id, `${row.values[index]}${unit}`, `${row.label} ・ ${m.year}年${m.month + 1}月`);
    },
    [months, showAt, unit],
  );
  const onLeave = useCallback(
    (e: ReactPointerEvent) => {
      if (e.pointerType !== 'touch') {
        setActive(null);
        hide();
      }
    },
    [hide],
  );

  const yearTicks = months
    .map((m, index) => ({...m, index}))
    .filter(m => m.month === 0 || m.index === 0)
    // Skip a first tick that would collide with the next January.
    .filter((m, i, list) => !(i === 0 && list[1] && list[1].index - m.index < 6));
  // Thin the labels when years are packed tightly.
  const every = months.length > 96 ? 2 : 1;

  return (
    <div className="viz viz-strip" ref={rootRef}>
      <div className="viz-strip-rows" role="img" aria-label={ariaLabel}>
        {rows.map(row => (
          <Row key={row.key} row={row} active={tip ? active : null} onMove={onMove} onLeave={onLeave} />
        ))}
        <div className="viz-strip-axis" aria-hidden="true">
          {yearTicks.map((t, i) => (
            <span className="viz-strip-tick" key={t.index} style={{insetInlineStart: `${(t.index / months.length) * 100}%`}}>
              {i % every === 0 ? t.year : ''}
            </span>
          ))}
        </div>
      </div>
      <HeatLegend max={31} unit={unit} />
      <TipLayer tip={tip} />
    </div>
  );
}

function Row({
  row,
  active,
  onMove,
  onLeave,
}: {
  row: StripRow;
  active: string | null;
  onMove: (row: StripRow, e: ReactPointerEvent<HTMLDivElement>) => void;
  onLeave: (e: ReactPointerEvent) => void;
}) {
  return (
    <>
      <span className="viz-strip-label">{row.label}</span>
      <span className="viz-strip-sum">{row.summary}</span>
      <div
        className="viz-strip-track"
        data-viz-mark=""
        onPointerMove={e => {
          if (e.pointerType !== 'mouse' || canHover()) {
            onMove(row, e);
          }
        }}
        onPointerDown={e => onMove(row, e)}
        onPointerLeave={onLeave}>
        {row.values.map((v, i) => (
          <span className="viz-strip-cell" key={i} data-level={levelOf(v, 31)} data-active={active === `${row.key}:${i}`} />
        ))}
      </div>
    </>
  );
}
