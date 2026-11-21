// The image for sharing a report on X: 1200x630, drawn on a canvas in the
// browser. Nothing is sent anywhere; the person saves or shares the image.
//
// What it shows: login days and the span, a strip of weeks for every year (the
// same blues as the calendar), and a few records. Money and the Riot ID only
// appear when the person turns them on. Penalties, reports and Riot's artwork
// never appear.

import {num, spanText} from './format';
import type {Report} from './riot/types';
import {SITE} from '../site';

export const SHARE_WIDTH = 1200;
export const SHARE_HEIGHT = 630;

export interface ShareOptions {
  showRiotId: boolean;
  showSpend: boolean;
}

const DAY = 86400000;
const FONT = `Figtree, "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Noto Sans CJK JP", "Yu Gothic", Meiryo, sans-serif`;
const C = {
  bg: '#0e0f12',
  text: '#ffffff',
  sub: '#a9afba',
  faint: '#6b7280',
  empty: '#22252c',
  levels: ['#0f3c86', '#1d5fd6', '#3b8bff', '#cfe1ff'],
  accent: '#3b8bff',
};

/** True when the report has enough to draw. */
export function canShare(r: Report): boolean {
  return !!r.logins && r.logins.activeDays > 0 && r.logins.daily.counts.length > 0;
}

/** The text that goes with the image. */
export function shareText(r: Report, opts: ShareOptions): string {
  const l = r.logins;
  if (!l) {
    return '';
  }
  const lines = [`ログイン日数：${num(l.activeDays)}日（${ym(l.first)}〜）`];
  if (l.streak.days > 1) {
    lines.push(`最長連続：${num(l.streak.days)}日`);
  }
  if (opts.showSpend && r.spend && r.spend.total > 0) {
    lines.push(`課金合計：${moneyText(r.spend.total, r.spend.currency)}`);
  }
  lines.push('', '#Wadachigg');
  return lines.join('\n');
}

const ym = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}年${d.getMonth() + 1}月`;
};
const moneyText = (v: number, currency: string) => (currency === 'JPY' ? `${num(v)}円` : `${num(Math.round(v))} ${currency}`);

/** Logged days in each Monday-first week of each year; null for weeks wholly outside the record. */
function weeksByYear(r: Report): {year: number; days: number; weeks: (number | null)[]}[] {
  const l = r.logins!;
  const rows = new Map<number, (number | null)[]>();
  l.daily.counts.forEach((hours, i) => {
    const d = new Date(l.daily.start + i * DAY);
    const y = d.getFullYear();
    const jan1 = new Date(y, 0, 1);
    const offset = (jan1.getDay() + 6) % 7;
    const dayOfYear = Math.round((new Date(y, d.getMonth(), d.getDate()).getTime() - jan1.getTime()) / DAY);
    const w = Math.floor((offset + dayOfYear) / 7);
    let row = rows.get(y);
    if (!row) {
      row = new Array<number | null>(54).fill(null);
      rows.set(y, row);
    }
    row[w] = (row[w] ?? 0) + (hours > 0 ? 1 : 0);
  });
  return l.years.map(y => ({year: y.year, days: y.days, weeks: rows.get(y.year) ?? new Array(54).fill(null)}));
}

const MARK_W = 'M9 11h9.5l4.5 16 5.5-16h7l5.5 16 4.5-16H55l-10 27h-7.5L32 22.5 26.5 38H19z';
const MARK_T1 = 'M-2 66L9 66C19 54 31 47.5 47 45.5L47 41C27 42.5 10 51 -2 66z';
const MARK_T2 = 'M17 66L29 66C36 57.5 44 53 58 51.5L58 47C40 48 26 54 17 66z';

function drawMark(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 64, size / 64);
  const frame = new Path2D();
  frame.roundRect(0, 0, 64, 64, 14);
  ctx.fillStyle = '#16181d';
  ctx.fill(frame);
  ctx.clip(frame);
  ctx.fillStyle = '#ffffff';
  ctx.fill(new Path2D(MARK_W));
  ctx.fillStyle = C.accent;
  ctx.fill(new Path2D(MARK_T1));
  ctx.fill(new Path2D(MARK_T2));
  ctx.restore();
}

function font(size: number, weight = 400) {
  return `${weight} ${size}px ${FONT}`;
}

/** Draws text and returns its width. */
function text(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, color: string, weight = 400, align: CanvasTextAlign = 'left') {
  ctx.font = font(size, weight);
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(s, x, y);
  return ctx.measureText(s).width;
}

export async function drawShareImage(r: Report, opts: ShareOptions): Promise<HTMLCanvasElement> {
  await document.fonts?.ready;
  const l = r.logins!;
  const canvas = document.createElement('canvas');
  canvas.width = SHARE_WIDTH;
  canvas.height = SHARE_HEIGHT;
  const ctx = canvas.getContext('2d')!;
  ctx.textBaseline = 'alphabetic';

  // Background: near black with two soft tints, like the year cards.
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, SHARE_WIDTH, SHARE_HEIGHT);
  const tint = (x: number, y: number, radius: number, color: string) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, SHARE_WIDTH, SHARE_HEIGHT);
  };
  tint(0, 0, 700, 'rgba(1,113,227,0.30)');
  tint(SHARE_WIDTH, SHARE_HEIGHT, 650, 'rgba(107,30,253,0.22)');

  // Header: the mark and the name; the Riot ID on the right if asked for.
  drawMark(ctx, 56, 44, 40);
  text(ctx, SITE.name, 108, 74, 28, C.text, 700);
  if (opts.showRiotId && r.riotId) {
    text(ctx, r.riotId, SHARE_WIDTH - 56, 74, 24, C.sub, 600, 'right');
  }

  // Left: the headline number and the records.
  const left = 56;
  text(ctx, 'ログイン日数', left, 168, 26, C.sub, 600);
  const big = text(ctx, num(l.activeDays), left - 4, 290, 124, C.text, 800);
  text(ctx, '日', left + big + 8, 290, 44, C.sub, 700);
  text(ctx, `${ym(l.first)}〜${ym(l.last)}（${spanText(l.first, l.last)}）`, left, 336, 24, C.sub, 500);

  const best = l.years.reduce((a, y) => (y.days > a.days ? y : a), l.years[0]);
  const tag = r.story?.years.find(y => y.year === best.year)?.tag;
  const records: [string, string][] = [];
  if (l.streak.days > 1) {
    records.push(['最長連続', `${num(l.streak.days)}日`]);
  }
  records.push(['最多の年', `${best.year}年（${num(best.days)}日）${tag && tag !== `${best.year}年` ? ` ${tag}` : ''}`]);
  records.push(['深夜の割合', `${Math.round(l.nightShare * 100)}%`]);
  if (opts.showSpend && r.spend && r.spend.total > 0) {
    records.push(['課金合計', moneyText(r.spend.total, r.spend.currency)]);
  }
  records.slice(0, 4).forEach(([label, value], i) => {
    const y = 412 + i * 48;
    const w = text(ctx, `${label}：`, left, y, 26, C.sub, 500);
    text(ctx, value, left + w, y, 26, C.text, 700);
  });

  // Right: one track per year, most recent at the bottom. The track is as thick
  // as the week was busy: seven days of logins fill it, a week without any
  // narrows it to the thin line underneath.
  const rows = weeksByYear(r).slice(-12);
  const area = {x: 600, y: 118, w: 544, h: 400};
  const labelW = 62;
  const daysW = 80;
  const gridW = area.w - labelW - daysW - 8;
  const step = gridW / 53;
  const rowStep = Math.min(46, area.h / rows.length);
  const half = Math.min(15, rowStep / 2 - 4);
  const top = area.y + (area.h - rowStep * rows.length) / 2;
  rows.forEach((row, i) => {
    const mid = top + i * rowStep + rowStep / 2;
    const x0 = area.x + labelW;
    const isBest = row.year === best.year;
    ctx.textBaseline = 'middle';
    text(ctx, String(row.year), area.x, mid, 20, isBest ? C.text : C.sub, isBest ? 700 : 600);
    text(ctx, `${num(row.days)}日`, area.x + area.w, mid, 20, isBest ? C.text : C.sub, isBest ? 700 : 500, 'right');
    ctx.textBaseline = 'alphabetic';
    // Contiguous runs of weeks inside the record.
    const runs: {w: number; n: number}[][] = [];
    row.weeks.forEach((n, w) => {
      if (n === null) {
        return;
      }
      const last = runs[runs.length - 1];
      if (last && last[last.length - 1].w === w - 1) {
        last.push({w, n});
      } else {
        runs.push([{w, n}]);
      }
    });
    for (const run of runs) {
      const pts = run.map(p => ({x: x0 + p.w * step + step / 2, h: 1.2 + (p.n / 7) * (half - 1.2)}));
      // The thin line under the track: the weeks the record covers.
      ctx.strokeStyle = C.empty;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pts[0].x - step / 2, mid);
      ctx.lineTo(pts[pts.length - 1].x + step / 2, mid);
      ctx.stroke();
      // The track: a smooth band, symmetric about the line.
      const edge = (sign: 1 | -1, list: typeof pts) => {
        list.forEach((p, k) => {
          const y = mid - sign * p.h;
          if (k === 0) {
            ctx.lineTo(p.x, y);
            return;
          }
          const q = list[k - 1];
          const mx = (q.x + p.x) / 2;
          ctx.bezierCurveTo(mx, mid - sign * q.h, mx, y, p.x, y);
        });
      };
      ctx.beginPath();
      ctx.moveTo(pts[0].x - step / 2, mid);
      edge(1, pts);
      ctx.lineTo(pts[pts.length - 1].x + step / 2, mid);
      edge(-1, [...pts].reverse());
      ctx.closePath();
      ctx.fillStyle = isBest ? C.levels[3] : C.accent;
      ctx.globalAlpha = isBest ? 1 : 0.85;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  });
  // Key under the tracks.
  ctx.textBaseline = 'middle';
  text(ctx, '帯の太さ：週のログイン日数（最大7日）', area.x + labelW, top + rowStep * rows.length + 18, 17, C.faint, 500);
  ctx.textBaseline = 'alphabetic';

  // Footer: where to make one.
  text(ctx, new URL(SITE.url).host, left, SHARE_HEIGHT - 36, 20, C.faint, 500);
  text(ctx, 'データ請求ファイルから作成', SHARE_WIDTH - 56, SHARE_HEIGHT - 36, 20, C.faint, 500, 'right');
  return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png'));
}
