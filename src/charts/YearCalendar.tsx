// One year as a calendar: a column per week, a row per weekday, a cell per day.
// A brighter cell is a day with logins in more hours of the day. Days outside
// the record are hollow, so "no login" and "no data" never look alike. Notes on
// the year (a round-number day, a streak, a gap) sit in a lane above the grid.

import {useMemo} from 'react';
import type {CSSProperties, PointerEvent as ReactPointerEvent} from 'react';
import {WEEKDAYS} from '../lib/format';
import {HOUR_LEVEL_LABELS, levelOfHours} from './scale';
import {TipLayer, canHover, useTip, useWidth} from './tip';

export interface CalendarMark {
  kind: 'point' | 'streak' | 'gap';
  /** Epoch ms at local noon of the first and last day. */
  from: number;
  to: number;
  label: string;
}

interface Props {
  year: number;
  /** Epoch ms of the first recorded day, at local noon. */
  start: number;
  /** Distinct login hours per day, from the first recorded day on. */
  counts: number[];
  marks: CalendarMark[];
  ariaLabel: string;
  /** Rows kept free above the grid even when no note needs them, so the height does not jump between years. */
  reserveLanes?: number;
  /** False holds the cells back; turning true plays the entrance. */
  play?: boolean;
  hasLegend?: boolean;
  /** Largest size of a day, gap included, in px. */
  maxStep?: number;
}

const DAY = 86400000;
const GUTTER = 18;
const LANE = 16;
const MAX_LANES = 2;
const LABEL_SIZE = 11;
/** Below this width the year is split into two half-year rows so the cells stay readable. */
const TWO_ROWS_BELOW = 460;

const noon = (y: number, m: number, d: number) => new Date(y, m, d, 12).getTime();
/** Rough width of a label: full-width characters take one em, the rest about 0.6. */
const textWidth = (s: string) => [...s].reduce((w, ch) => w + (ch.charCodeAt(0) < 256 ? 0.6 : 1), 0) * LABEL_SIZE;

interface Note {
  label: string;
  kind: CalendarMark['kind'];
  /** Where the note points. */
  anchor: number;
  x0: number;
  width: number;
  row: number;
}

export function YearCalendar({year, start, counts, marks, ariaLabel, reserveLanes = 0, play = true, hasLegend = true, maxStep = 18}: Props) {
  const [ref, width] = useWidth<HTMLDivElement>(560);
  const {rootRef, tip, showAt, hide} = useTip();

  const cal = useMemo(() => {
    const jan1 = noon(year, 0, 1);
    const days = Math.round((noon(year + 1, 0, 1) - jan1) / DAY);
    /** Rows run Monday to Sunday. */
    const offset = (new Date(jan1).getDay() + 6) % 7;
    const first = Math.round((jan1 - start) / DAY);
    const hours = Array.from({length: days}, (_, d) => {
      const i = first + d;
      return i >= 0 && i < counts.length ? counts[i] : null;
    });
    const dayOf = (t: number) => Math.round((noon(new Date(t).getFullYear(), new Date(t).getMonth(), new Date(t).getDate()) - jan1) / DAY);
    return {
      days,
      offset,
      hours,
      weeks: Math.ceil((offset + days) / 7),
      monthWeeks: Array.from({length: 12}, (_, m) => Math.floor((offset + Math.round((noon(year, m, 1) - jan1) / DAY)) / 7)),
      hasOutside: hours.some(h => h === null),
      // Notes clipped to this year, as day-of-year ranges.
      spans: marks
        .map(m => ({mark: m, a: dayOf(m.from), b: dayOf(m.to)}))
        .filter(s => s.b >= 0 && s.a < days)
        .map(s => ({...s, a: Math.max(0, s.a), b: Math.min(days - 1, s.b)})),
    };
  }, [year, start, counts, marks]);

  const blocks = width < TWO_ROWS_BELOW ? 2 : 1;
  const perBlock = Math.ceil(cal.weeks / blocks);
  const step = Math.max(4, Math.min(maxStep, (width - GUTTER) / perBlock));
  const gap = step >= 8 ? 2 : 1;
  const cell = step - gap;
  const inner = GUTTER + perBlock * step - gap;
  const weekOf = (d: number) => Math.floor((cal.offset + d) / 7);
  const rowOf = (d: number) => (cal.offset + d) % 7;

  // Split in two, a half-year with nothing recorded in it is left out: the first
  // year of a record should not open on a row of empty outlines.
  const halves = Array.from({length: blocks}, (_, b) => ({w0: b * perBlock, w1: Math.min(cal.weeks, (b + 1) * perBlock)})).filter(
    ({w0, w1}) => blocks === 1 || cal.hours.slice(Math.max(0, w0 * 7 - cal.offset), w1 * 7 - cal.offset).some(h => h !== null),
  );

  let y = 0;
  const layout = halves.map(({w0, w1}, b) => {
    const x = (week: number) => GUTTER + (week - w0) * step;

    // A note is written in the row where it begins; a span that runs on is still drawn in the next.
    const segments = cal.spans
      .map(s => ({...s, wa: weekOf(s.a), wb: weekOf(s.b)}))
      .filter(s => s.wa < w1 && s.wb >= w0)
      .map(s => ({...s, sa: Math.max(s.wa, w0), sb: Math.min(s.wb, w1 - 1), owns: s.wa >= w0 || b === 0}));
    const notes: Note[] = [];
    const ends: number[] = [];
    for (const s of segments.filter(s => s.owns).sort((p, q) => p.sa - q.sa)) {
      const w = textWidth(s.mark.label);
      const anchor = s.mark.kind === 'point' ? x(s.sa) + cell / 2 : (x(s.sa) + x(s.sb) + cell) / 2;
      const x0 = Math.max(0, Math.min(inner - w, anchor - w / 2));
      let row = ends.findIndex(end => x0 >= end + 6);
      if (row < 0) {
        row = Math.min(ends.length, MAX_LANES - 1);
      }
      ends[row] = x0 + w;
      notes.push({label: s.mark.label, kind: s.mark.kind, anchor, x0, width: w, row});
    }
    const lanes = Math.max(reserveLanes, ends.length);
    const top = y;
    const laneBottom = top + lanes * LANE;
    const gridTop = laneBottom + (lanes > 0 ? 7 : 0);
    const gridBottom = gridTop + 7 * step - gap;

    // Month names under the first week of each month. A row that opens mid-month names that month too.
    const months = cal.monthWeeks.map((week, m) => ({m, week})).filter(mo => mo.week >= w0 && mo.week < w1);
    if (months.length === 0 || months[0].week - w0 >= 3) {
      const firstDay = Math.max(0, w0 * 7 - cal.offset);
      months.unshift({m: new Date(noon(year, 0, 1) + firstDay * DAY).getMonth(), week: w0});
    }
    y = gridBottom + 18 + (b < halves.length - 1 ? 6 : 0);
    return {w0, w1, x, segments, notes, laneBottom, gridTop, gridBottom, months};
  });
  const height = y;

  const date = (d: number) => new Date(noon(year, 0, 1) + d * DAY);
  const onPoint = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (e.type === 'pointermove' && (e.pointerType === 'touch' || !canHover())) {
      return;
    }
    const el = (e.target as Element).closest?.('[data-d]');
    if (!el) {
      hide();
      return;
    }
    const d = Number(el.getAttribute('data-d'));
    const h = cal.hours[d];
    const when = date(d);
    showAt(
      el,
      String(d),
      h === null ? '記録の範囲外' : h > 0 ? `${h}時間帯にログイン` : 'ログインなし',
      `${when.getFullYear()}年${when.getMonth() + 1}月${when.getDate()}日（${WEEKDAYS[rowOf(d)]}）`,
    );
  };
  const active = tip ? Number(tip.id) : null;

  return (
    <div className="viz viz-cal" ref={rootRef}>
      <div ref={ref}>
        <svg
          width={width}
          height={height}
          className="viz-cal-svg"
          role="img"
          aria-label={ariaLabel}
          data-viz-mark=""
          onPointerMove={onPoint}
          onPointerDown={onPoint}
          onPointerLeave={e => {
            if (e.pointerType !== 'touch') {
              hide();
            }
          }}>
          {layout.map(bl => (
            <g key={bl.w0}>
              {[0, 2, 4, 6].map(row => (
                <text key={row} className="viz-cal-axis" x={0} y={bl.gridTop + row * step + cell / 2} dominantBaseline="central">
                  {WEEKDAYS[row]}
                </text>
              ))}
              {bl.months.map((mo, i) => {
                const mx = bl.x(mo.week);
                const next = bl.months[i + 1];
                // Drop a name that would run into the next one.
                if (next && bl.x(next.week) - mx < 26) {
                  return null;
                }
                const atEnd = mx > inner - 26;
                return (
                  <text key={mo.m} className="viz-cal-axis" x={atEnd ? inner : mx} y={bl.gridBottom + 13} textAnchor={atEnd ? 'end' : 'start'}>
                    {mo.m + 1}月
                  </text>
                );
              })}
              <g className="viz-cal-weeks" data-play={play}>
                {Array.from({length: bl.w1 - bl.w0}, (_, k) => {
                  const week = bl.w0 + k;
                  const from = Math.max(0, week * 7 - cal.offset);
                  const to = Math.min(cal.days - 1, week * 7 - cal.offset + 6);
                  return (
                    <g key={`${year}-${week}`} className="viz-cal-week" style={{'--w': k} as CSSProperties}>
                      {Array.from({length: to - from + 1}, (_, n) => {
                        const d = from + n;
                        const h = cal.hours[d];
                        return (
                          <rect
                            key={d}
                            className="viz-cal-cell"
                            data-d={d}
                            data-level={h === null ? 'na' : levelOfHours(h)}
                            x={bl.x(week) + (h === null ? 0.5 : 0)}
                            y={bl.gridTop + rowOf(d) * step + (h === null ? 0.5 : 0)}
                            width={cell - (h === null ? 1 : 0)}
                            height={cell - (h === null ? 1 : 0)}
                            rx={Math.min(3, cell / 4)}
                          />
                        );
                      })}
                    </g>
                  );
                })}
              </g>
              <g className="viz-cal-notes" data-play={play} key={`notes-${year}`}>
                {bl.segments.map((s, i) =>
                  s.mark.kind === 'point' ? (
                    <rect
                      key={i}
                      className="viz-cal-ring"
                      x={bl.x(s.sa) - 1.5}
                      y={bl.gridTop + rowOf(s.a) * step - 1.5}
                      width={cell + 3}
                      height={cell + 3}
                      rx={Math.min(4, cell / 3)}
                    />
                  ) : (
                    <line key={i} className="viz-cal-span" x1={bl.x(s.sa) + 1} x2={bl.x(s.sb) + cell - 1} y1={bl.laneBottom + 2} y2={bl.laneBottom + 2} />
                  ),
                )}
                {bl.notes.map((n, i) => {
                  const textBottom = bl.laneBottom - n.row * LANE - 3;
                  const seg = bl.segments.find(s => s.mark.label === n.label && s.owns);
                  // A point note is tied to its cell by a thin line; a span note sits on its bar.
                  const tickTo = n.kind === 'point' && seg ? bl.gridTop + rowOf(seg.a) * step - 2 : bl.laneBottom;
                  return (
                    <g key={i}>
                      {n.kind === 'point' || n.row > 0 ? <line className="viz-cal-tick" x1={n.anchor} x2={n.anchor} y1={textBottom + 2} y2={tickTo} /> : null}
                      <text className="viz-cal-note" x={n.x0 + n.width / 2} y={textBottom - 2} textAnchor="middle">
                        {n.label}
                      </text>
                    </g>
                  );
                })}
              </g>
              {active !== null && weekOf(active) >= bl.w0 && weekOf(active) < bl.w1 ? (
                <rect
                  className="viz-cal-cursor"
                  x={bl.x(weekOf(active)) - 1}
                  y={bl.gridTop + rowOf(active) * step - 1}
                  width={cell + 2}
                  height={cell + 2}
                  rx={Math.min(4, cell / 3)}
                />
              ) : null}
            </g>
          ))}
        </svg>
      </div>
      {hasLegend ? (
        <div className="viz-legend viz-cal-legend" aria-hidden="true">
          <span className="viz-legend-item">
            <span className="viz-swatch" data-level="0" />
            ログインなし
          </span>
          {HOUR_LEVEL_LABELS.map((label, i) => (
            <span className="viz-legend-item" key={label}>
              <span className="viz-swatch" data-level={i + 1} />
              {label}
            </span>
          ))}
          {cal.hasOutside ? (
            <span className="viz-legend-item">
              <span className="viz-swatch" data-level="na" />
              記録の範囲外
            </span>
          ) : null}
        </div>
      ) : null}
      <TipLayer tip={tip} />
    </div>
  );
}
