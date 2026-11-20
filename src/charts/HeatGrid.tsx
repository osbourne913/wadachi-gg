// A grid of cells where color says "how much": one hue, four steps.
// Rows and columns are whatever the caller passes, so the same component draws
// year x month, weekday x hour, and hour x weekday on a narrow screen.

import type {CSSProperties} from 'react';
import {levelOf, levelRanges} from './scale';
import {TipLayer, useTip} from './tip';

export interface HeatRow {
  key: string;
  label: string;
  /** null marks a cell outside the recorded range. */
  cells: (number | null)[];
  /** Optional figure at the end of the row, e.g. the yearly total. */
  end?: string;
}

export interface HeatCol {
  key: string;
  /** Axis label; empty string keeps the column but prints nothing. */
  label: string;
}

interface Props {
  rows: HeatRow[];
  cols: HeatCol[];
  /** Value that maps to the darkest step. */
  max: number;
  unit: string;
  /** Name of a cell for the tooltip, e.g. "金曜 23時台". */
  describe: (row: HeatRow, colIndex: number) => string;
  endHeader?: string;
  ariaLabel: string;
  cellHeight?: number;
  /** Show the "outside the record" swatch in the legend. */
  hasGaps?: boolean;
}

export function HeatLegend({max, unit, hasGaps}: {max: number; unit: string; hasGaps?: boolean}) {
  return (
    <div className="viz-legend" aria-hidden="true">
      <span className="viz-legend-item">
        <span className="viz-swatch" data-level="0" />0{unit}
      </span>
      {levelRanges(max).map(r => (
        <span className="viz-legend-item" key={r.level}>
          <span className="viz-swatch" data-level={r.level} />
          {r.from === r.to ? r.from : `${r.from}–${r.to}`}
          {unit}
        </span>
      ))}
      {hasGaps ? (
        <span className="viz-legend-item">
          <span className="viz-swatch" data-level="na" />
          記録の範囲外
        </span>
      ) : null}
    </div>
  );
}

export function HeatGrid({rows, cols, max, unit, describe, endHeader, ariaLabel, cellHeight = 24, hasGaps}: Props) {
  const {rootRef, tip, bind} = useTip();
  const hasEnd = rows.some(r => r.end !== undefined);
  const style = {'--cols': cols.length, '--cell-h': `${cellHeight}px`} as CSSProperties;

  return (
    <div className="viz viz-heat" ref={rootRef}>
      <div className="viz-heat-grid" style={style} data-end={hasEnd} role="img" aria-label={ariaLabel}>
        <span />
        {cols.map(c => (
          <span className="viz-heat-col" key={c.key}>
            {c.label}
          </span>
        ))}
        {hasEnd ? (
          <span className="viz-heat-end" data-head="true">
            {endHeader}
          </span>
        ) : null}
        {rows.map(row => (
          <Row key={row.key} row={row} max={max} unit={unit} describe={describe} bind={bind} activeId={tip?.id} hasEnd={hasEnd} />
        ))}
      </div>
      <HeatLegend max={max} unit={unit} hasGaps={hasGaps} />
      <TipLayer tip={tip} />
    </div>
  );
}

function Row({
  row,
  max,
  unit,
  describe,
  bind,
  activeId,
  hasEnd,
}: {
  row: HeatRow;
  max: number;
  unit: string;
  describe: Props['describe'];
  bind: ReturnType<typeof useTip>['bind'];
  activeId: string | undefined;
  hasEnd: boolean;
}) {
  return (
    <>
      <span className="viz-heat-row">{row.label}</span>
      {row.cells.map((v, i) => {
        const id = `${row.key}:${i}`;
        const level = levelOf(v, max);
        if (v === null) {
          return <span className="viz-cell" data-level="na" key={id} />;
        }
        return (
          <span
            className="viz-cell"
            data-level={level}
            key={id}
            {...bind(id, `${v}${unit}`, describe(row, i))}
            data-active={activeId === id}
          />
        );
      })}
      {hasEnd ? <span className="viz-heat-end">{row.end}</span> : null}
    </>
  );
}
