// Shared scale helpers for the charts.

/** Four magnitude steps above zero. 0 = none, 1-4 = quarter of the maximum it falls in. */
export function levelOf(value: number | null, max: number): 0 | 1 | 2 | 3 | 4 | 'na' {
  if (value === null) {
    return 'na';
  }
  if (value <= 0 || max <= 0) {
    return 0;
  }
  return Math.min(4, Math.max(1, Math.ceil((value / max) * 4))) as 1 | 2 | 3 | 4;
}

/** Brightness of a day by the number of distinct hours with a login: none, 1, 2-3, 4-5, 6 or more. */
export function levelOfHours(hours: number): 0 | 1 | 2 | 3 | 4 {
  return hours <= 0 ? 0 : hours === 1 ? 1 : hours <= 3 ? 2 : hours <= 5 ? 3 : 4;
}
export const HOUR_LEVEL_LABELS = ['1時間帯', '2〜3', '4〜5', '6以上'] as const;

/** The integer range each step covers, e.g. max 31 -> 1-7, 8-15, 16-23, 24-31. Empty steps are dropped. */
export function levelRanges(max: number): {level: 1 | 2 | 3 | 4; from: number; to: number}[] {
  const out: {level: 1 | 2 | 3 | 4; from: number; to: number}[] = [];
  for (let k = 1; k <= 4; k++) {
    const from = Math.floor((max * (k - 1)) / 4) + 1;
    const to = Math.floor((max * k) / 4);
    if (to >= from) {
      out.push({level: k as 1 | 2 | 3 | 4, from, to});
    }
  }
  return out;
}

/**
 * Round axis ticks from zero: 0, 5,000, 10,000, 15,000. Picks the smallest round
 * step that needs no more than `maxIntervals` gaps. Counts get whole-number ticks.
 */
export function niceTicks(max: number, maxIntervals = 3): number[] {
  if (!(max > 0)) {
    return [0, 1];
  }
  const whole = Number.isInteger(max);
  let step = 1;
  outer: for (let exp = Math.floor(Math.log10(max)) - 2; exp < 40; exp++) {
    for (const base of [1, 2, 2.5, 5]) {
      const candidate = base * 10 ** exp;
      if (whole && !Number.isInteger(candidate)) {
        continue;
      }
      if (Math.ceil(max / candidate - 1e-9) <= maxIntervals) {
        step = candidate;
        break outer;
      }
    }
  }
  const count = Math.max(1, Math.ceil(max / step - 1e-9));
  return Array.from({length: count + 1}, (_, i) => Math.round(i * step * 1e6) / 1e6);
}
