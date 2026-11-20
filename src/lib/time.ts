// Time helpers. Riot's export writes timestamps in several shapes, all UTC:
//   "2020-02-01 13:43:37"            (login log, store log)
//   "2021-06-14 08:14:40.452"        (VALORANT purchases)
//   "2026-07-25T14:51:07Z"           (penalties)
//   "2020-04-30T13:09:40.493998+00:00" (Legends of Runeterra)
//   "2026-08-23"                     (chat log match date)
// Date.parse is unreliable for the space-separated form in Safari, so parse by hand.

const RE =
  /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?)?\s*(Z|[+-]\d{2}:?\d{2})?$/;

/** Parse a Riot export timestamp as UTC. Returns epoch milliseconds, or null. */
export function parseUtc(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    // Epoch seconds vs milliseconds.
    return value < 1e11 ? value * 1000 : value;
  }
  if (typeof value !== 'string') {
    return null;
  }
  const m = RE.exec(value.trim());
  if (!m) {
    return null;
  }
  const [, y, mo, d, h = '0', mi = '0', s = '0', frac = '0', tz] = m;
  const ms = Math.round(Number(`0.${frac}`) * 1000);
  let t = Date.UTC(+y, +mo - 1, +d, +h, +mi, +s, ms);
  if (tz && tz !== 'Z') {
    const sign = tz[0] === '-' ? -1 : 1;
    const digits = tz.slice(1).replace(':', '');
    const offset = (+digits.slice(0, 2) * 60 + +digits.slice(2, 4)) * 60000;
    t -= sign * offset;
  }
  return Number.isFinite(t) ? t : null;
}

/** A play day starts at 05:00 local time, so a 1 a.m. session counts for the night before. */
export const DAY_START_HOUR = 5;
const HOUR = 3600000;

export interface LocalParts {
  /** Days since 1970-01-01, counted on the local calendar. */
  day: number;
  year: number;
  /** 0-11 */
  month: number;
  date: number;
  /** 0 = Monday … 6 = Sunday */
  weekday: number;
  /** 0-23, wall clock */
  hour: number;
}

function partsOf(d: Date): Omit<LocalParts, 'hour'> {
  const year = d.getFullYear();
  const month = d.getMonth();
  const date = d.getDate();
  return {
    day: Math.round(Date.UTC(year, month, date) / 86400000),
    year,
    month,
    date,
    weekday: (d.getDay() + 6) % 7,
  };
}

/** Calendar parts of an instant in the viewer's time zone. */
export function localParts(ms: number): LocalParts {
  const d = new Date(ms);
  return {...partsOf(d), hour: d.getHours()};
}

/** Parts of the play day an instant belongs to (05:00 boundary); `hour` stays wall clock. */
export function playParts(ms: number): LocalParts {
  const d = new Date(ms);
  return {...partsOf(new Date(ms - DAY_START_HOUR * HOUR)), hour: d.getHours()};
}

/** Local-calendar day number -> a Date at local noon (safe for formatting). */
export function dayToDate(day: number): Date {
  const u = new Date(day * 86400000);
  return new Date(u.getUTCFullYear(), u.getUTCMonth(), u.getUTCDate(), 12);
}

export function viewerTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}
