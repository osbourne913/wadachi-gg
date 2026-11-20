// Japanese number and date formatting used across the report.

const nf = new Intl.NumberFormat('ja-JP');

export function num(n: number): string {
  return nf.format(Math.round(n));
}

export function pct(ratio: number, digits = 0): string {
  if (!Number.isFinite(ratio)) {
    return '—';
  }
  return `${(ratio * 100).toFixed(digits)}%`;
}

/** 68,860円. Other currencies keep their code: 12.50 USD. */
export function money(amount: number, currency = 'JPY'): string {
  if (currency === 'JPY') {
    return `${num(amount)}円`;
  }
  const fixed = new Intl.NumberFormat('ja-JP', {minimumFractionDigits: 2, maximumFractionDigits: 2}).format(amount);
  return `${fixed} ${currency}`;
}

/** 2026年11月16日 */
export function dateLong(d: Date | number): string {
  const x = typeof d === 'number' ? new Date(d) : d;
  return `${x.getFullYear()}年${x.getMonth() + 1}月${x.getDate()}日`;
}

/** 2026/11/16 */
export function dateShort(d: Date | number): string {
  const x = typeof d === 'number' ? new Date(d) : d;
  return `${x.getFullYear()}/${String(x.getMonth() + 1).padStart(2, '0')}/${String(x.getDate()).padStart(2, '0')}`;
}

/** 2026年11月 */
export function monthLong(d: Date | number): string {
  const x = typeof d === 'number' ? new Date(d) : d;
  return `${x.getFullYear()}年${x.getMonth() + 1}月`;
}

/** 11/16 23:52 */
export function dateTimeShort(ms: number): string {
  const x = new Date(ms);
  return `${dateShort(x)} ${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}`;
}

/** 9年4か月 / 3か月 / 12日 */
export function spanText(fromMs: number, toMs: number): string {
  const a = new Date(fromMs);
  const b = new Date(toMs);
  let months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  if (b.getDate() < a.getDate()) {
    months -= 1;
  }
  if (months < 1) {
    const days = Math.max(1, Math.round((toMs - fromMs) / 86400000));
    return `${days}日`;
  }
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y === 0) {
    return `${m}か月`;
  }
  return m === 0 ? `${y}年` : `${y}年${m}か月`;
}

/** 5 -> "5時", 0 -> "0時" */
export function hourLabel(h: number): string {
  return `${h}時`;
}

export const WEEKDAYS = ['月', '火', '水', '木', '金', '土', '日'] as const;

/** "1時間12分" / "37分" */
export function minutesText(min: number): string {
  const m = Math.round(min);
  if (m < 60) {
    return `${m}分`;
  }
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r === 0 ? `${h}時間` : `${h}時間${r}分`;
}
