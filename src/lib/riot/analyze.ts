// Turns the files of a Riot data-request export into a Report.
// Pure functions: no DOM, no network. Runs the same in the browser and in Node.

import {DAY_START_HOUR, dayToDate, parseUtc, playParts, viewerTimeZone} from '../time';
import {CHAMPIONS, CHAMPION_ROLES} from './champions';
import {buildStory} from './story';
import * as L from './labels';
import {buildFindings} from './findings';
import {buildInventory} from './inventory';
import type {
  Amounted,
  AuditEvent,
  ChatAnalysis,
  ChatGame,
  ChatMessage,
  Counted,
  ExportFile,
  GameSummary,
  LoginAnalysis,
  Penalty,
  Period,
  ProductActivity,
  Report,
  ReportsAnalysis,
  RpCharge,
  SpendAnalysis,
  StoreAnalysis,
  Ticket,
} from './types';

// ---------- small helpers ----------

export type Row = Record<string, unknown>;

export const isObj = (v: unknown): v is Row => typeof v === 'object' && v !== null && !Array.isArray(v);
export const rowsOf = (v: unknown): Row[] => (Array.isArray(v) ? v.filter(isObj) : []);
export const str = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : null);
export const numOf = (v: unknown): number | null => {
  if (typeof v === 'number' && Number.isFinite(v)) {
    return v;
  }
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) {
    return Number(v);
  }
  return null;
};

export const normPath = (p: string) => p.replace(/\\/g, '/').toLowerCase();

export function findFile(files: ExportFile[], suffix: string): ExportFile | undefined {
  const s = suffix.toLowerCase();
  return files.find(f => normPath(f.path).endsWith(s));
}

function bump(map: Map<string, number>, key: string, by = 1) {
  map.set(key, (map.get(key) ?? 0) + by);
}

function counted(map: Map<string, number>, label: (key: string) => string): Counted[] {
  return [...map.entries()]
    .map(([key, count]) => ({key, label: label(key), count}))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'ja'));
}

function amounted(amounts: Map<string, number>, counts: Map<string, number>, label: (key: string) => string): Amounted[] {
  return [...amounts.entries()]
    .map(([key, amount]) => ({key, label: label(key), amount, count: counts.get(key) ?? 0}))
    .sort((a, b) => b.amount - a.amount);
}

function widen(period: Period | null, t: number | null): Period | null {
  if (t == null) {
    return period;
  }
  if (!period) {
    return {from: t, to: t};
  }
  return {from: Math.min(period.from, t), to: Math.max(period.to, t)};
}

// ---------- logins ----------

export function analyzeLogins(file: ExportFile | undefined): LoginAnalysis | null {
  const rows = rowsOf(file?.data);
  interface Ev {
    t: number;
    type: string;
    product: string | null;
  }
  const all: Ev[] = [];
  const ips = new Set<string>();
  for (const r of rows) {
    const t = parseUtc(r.event_time_utc ?? r.event_time ?? r.created);
    if (t == null) {
      continue;
    }
    all.push({t, type: str(r.event_type) ?? '', product: str(r.product)});
    const ip = str(r.ip_address);
    if (ip) {
      ips.add(ip);
    }
  }
  if (all.length === 0) {
    return null;
  }
  let starts = all.filter(e => L.LOGIN_START_EVENTS.has(e.type));
  if (starts.length === 0) {
    starts = all;
  }
  starts.sort((a, b) => a.t - b.t);

  const daySet = new Set<number>();
  const dayHour = new Set<number>();
  const weekHour: number[][] = Array.from({length: 7}, () => new Array<number>(24).fill(0));
  interface Acc {
    key: string;
    label: string;
    events: number;
    days: Set<number>;
    first: number;
    last: number;
  }
  const games = new Map<string, Acc>();

  for (const e of starts) {
    const p = playParts(e.t);
    daySet.add(p.day);
    const cell = p.day * 24 + p.hour;
    if (!dayHour.has(cell)) {
      dayHour.add(cell);
      weekHour[p.weekday][(p.hour - DAY_START_HOUR + 24) % 24] += 1;
    }
    const info = L.productInfo(e.product);
    if (info.isGame) {
      let acc = games.get(info.label);
      if (!acc) {
        acc = {key: info.label, label: info.label, events: 0, days: new Set(), first: e.t, last: e.t};
        games.set(info.label, acc);
      }
      acc.events += 1;
      acc.days.add(p.day);
      acc.last = e.t;
    }
  }

  const days = [...daySet].sort((a, b) => a - b);
  const firstDay = dayToDate(days[0]);
  const lastDay = dayToDate(days[days.length - 1]);
  const y0 = firstDay.getFullYear();
  const y1 = lastDay.getFullYear();
  const m0 = firstDay.getMonth();
  const m1 = lastDay.getMonth();

  // Year x month grid.
  const yearMonth: (number | null)[][] = [];
  for (let y = y0; y <= y1; y++) {
    yearMonth.push(
      Array.from({length: 12}, (_, m) => {
        const before = y === y0 && m < m0;
        const after = y === y1 && m > m1;
        return before || after ? null : 0;
      }),
    );
  }
  const monthIndexOfDay = (day: number) => {
    const d = dayToDate(day);
    return {y: d.getFullYear(), m: d.getMonth()};
  };
  for (const day of days) {
    const {y, m} = monthIndexOfDay(day);
    const row = yearMonth[y - y0];
    row[m] = (row[m] ?? 0) + 1;
  }
  const years = yearMonth.map((row, i) => ({
    year: y0 + i,
    days: row.reduce<number>((a, v) => a + (v ?? 0), 0),
    partial: row.some(v => v === null),
  }));

  // Weekday x hour.
  let weekHourMax = 0;
  let peak = {weekday: 0, hour: DAY_START_HOUR, days: 0};
  const slotTotals = new Array<number>(24).fill(0);
  weekHour.forEach((row, wd) =>
    row.forEach((v, slot) => {
      slotTotals[slot] += v;
      if (v > weekHourMax) {
        weekHourMax = v;
        peak = {weekday: wd, hour: (slot + DAY_START_HOUR) % 24, days: v};
      }
    }),
  );
  const totalCells = slotTotals.reduce((a, v) => a + v, 0);
  const slotOf = (hour: number) => (hour - DAY_START_HOUR + 24) % 24;
  const night = [22, 23, 0, 1].reduce((a, h) => a + slotTotals[slotOf(h)], 0);
  const topSlot = slotTotals.indexOf(Math.max(...slotTotals));

  // Longest streak and longest quiet stretch.
  let streak = {days: 1, from: days[0], to: days[0]};
  let runStart = days[0];
  let gap: {days: number; from: number; to: number} | null = null;
  for (let i = 1; i < days.length; i++) {
    const step = days[i] - days[i - 1];
    if (step === 1) {
      const len = days[i] - runStart + 1;
      if (len > streak.days) {
        streak = {days: len, from: runStart, to: days[i]};
      }
    } else {
      runStart = days[i];
      const empty = step - 1;
      if (!gap || empty > gap.days) {
        gap = {days: empty, from: days[i - 1] + 1, to: days[i] - 1};
      }
    }
  }

  // Month axis and per-game activity.
  const months: {year: number; month: number}[] = [];
  for (let y = y0, m = m0; y < y1 || (y === y1 && m <= m1); ) {
    months.push({year: y, month: m});
    m += 1;
    if (m === 12) {
      m = 0;
      y += 1;
    }
  }
  const monthPos = (y: number, m: number) => (y - y0) * 12 + (m - m0);
  const gameList: ProductActivity[] = [...games.values()]
    .map(acc => {
      const monthly = new Array<number>(months.length).fill(0);
      for (const day of acc.days) {
        const {y, m} = monthIndexOfDay(day);
        const pos = monthPos(y, m);
        if (pos >= 0 && pos < monthly.length) {
          monthly[pos] += 1;
        }
      }
      return {
        key: acc.key,
        label: acc.label,
        events: acc.events,
        days: acc.days.size,
        first: acc.first,
        last: acc.last,
        activeMonths: monthly.filter(v => v > 0).length,
        monthly,
      };
    })
    .sort((a, b) => b.days - a.days);

  const otherCounts = new Map<string, number>();
  for (const e of all) {
    const info = L.productInfo(e.product);
    if (!info.isGame) {
      bump(otherCounts, info.label);
    }
  }

  return {
    totalEvents: all.length,
    startEvents: starts.length,
    first: starts[0].t,
    last: starts[starts.length - 1].t,
    timeZone: viewerTimeZone(),
    activeDays: days.length,
    spanDays: days[days.length - 1] - days[0] + 1,
    years,
    yearMonth,
    weekHour,
    weekHourMax,
    peak,
    nightShare: totalCells ? night / totalCells : 0,
    topHour: (topSlot + DAY_START_HOUR) % 24,
    streak: {days: streak.days, from: dayToDate(streak.from).getTime(), to: dayToDate(streak.to).getTime()},
    gap: gap ? {days: gap.days, from: dayToDate(gap.from).getTime(), to: dayToDate(gap.to).getTime()} : null,
    months,
    games: gameList,
    others: counted(otherCounts, k => k),
    ipCount: ips.size,
    daily: (() => {
      const counts = new Array<number>(days[days.length - 1] - days[0] + 1).fill(0);
      for (const cell of dayHour) {
        const i = Math.floor(cell / 24) - days[0];
        if (i >= 0 && i < counts.length) {
          counts[i] += 1;
        }
      }
      return {start: dayToDate(days[0]).getTime(), counts};
    })(),
    hourTotals: Array.from({length: 24}, (_, h) => slotTotals[slotOf(h)]),
    hoursByYear: (() => {
      const rows = years.map(() => new Array<number>(24).fill(0));
      for (const cell of dayHour) {
        const day = Math.floor(cell / 24);
        const row = rows[dayToDate(day).getFullYear() - y0];
        if (row) {
          row[cell - day * 24] += 1;
        }
      }
      return rows;
    })(),
  };
}

// ---------- store ----------

export function analyzeStore(file: ExportFile | undefined): StoreAnalysis | null {
  const rows = rowsOf(file?.data);
  if (rows.length === 0) {
    return null;
  }
  const acquired = new Map<string, number>();
  const rpAmt = new Map<string, number>();
  const rpCnt = new Map<string, number>();
  const beAmt = new Map<string, number>();
  const beCnt = new Map<string, number>();
  const skins = new Map<number, number>();
  const skinLog: {t: number; id: number; rp: number}[] = [];
  const champs = new Set<number>();
  const ips = new Set<string>();
  let first = Infinity;
  let last = -Infinity;
  let latest: {t: number; rp: number | null; be: number | null} | null = null;
  let rpSpent = 0;
  let rpGiftSpent = 0;
  let beSpent = 0;
  let giftsSent = 0;
  let giftsReceived = 0;
  let skinTotal = 0;
  let total = 0;

  for (const r of rows) {
    const item = str(r.item_id);
    if (!item) {
      continue;
    }
    total += 1;
    const type = str(r.type) ?? '';
    const t = parseUtc(r.created);
    const rp = numOf(r.rp_delta) ?? 0;
    const be = numOf(r.ip_delta) ?? 0;
    const cat = L.storeCategoryOf(item);
    const outgoing = L.STORE_OUTGOING.has(type);
    const topup = L.STORE_TOPUP.has(type);
    const ip = str(r.ip_address);
    if (ip) {
      ips.add(ip);
    }
    if (t != null) {
      first = Math.min(first, t);
      last = Math.max(last, t);
      if (!latest || t >= latest.t) {
        latest = {t, rp: numOf(r.rp_balance), be: numOf(r.ip_balance)};
      }
    }
    if (type === 'ITEM_TRANSFER_SENT' || type === 'RP_TRANSFER_SENT') {
      giftsSent += 1;
    }
    if (type === 'ITEM_TRANSFER_RECEIVED') {
      giftsReceived += 1;
    }
    if (!outgoing && !topup) {
      bump(acquired, cat);
      const id = Number(item.slice(item.lastIndexOf('_') + 1));
      if (cat === 'championsskin' && Number.isFinite(id)) {
        const champion = Math.floor(id / 1000);
        skins.set(champion, (skins.get(champion) ?? 0) + 1);
        skinTotal += 1;
        if (t != null) {
          skinLog.push({t, id: champion, rp});
        }
      }
      if (cat === 'champions' && Number.isFinite(id)) {
        champs.add(id);
      }
    }
    if (rp < 0) {
      const key = type === 'RP_TRANSFER_SENT' ? 'rp_gift' : cat;
      bump(rpAmt, key, -rp);
      bump(rpCnt, key);
      rpSpent += -rp;
      if (outgoing) {
        rpGiftSpent += -rp;
      }
    }
    if (be < 0) {
      bump(beAmt, cat, -be);
      bump(beCnt, cat);
      beSpent += -be;
    }
  }
  if (total === 0) {
    return null;
  }

  const skinChampions = [...skins.entries()]
    .map(([id, count]) => ({
      id: Number(id),
      name: CHAMPIONS[Number(id)]?.[0] ?? `ID ${id}`,
      count,
      role: CHAMPION_ROLES[Number(id)] ?? null,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ja'));
  let known = 0;
  for (const id of champs) {
    if (CHAMPIONS[id]) {
      known += 1;
    }
  }
  const acquiredList = counted(acquired, L.storeCategoryLabel);

  return {
    total,
    first: Number.isFinite(first) ? first : 0,
    last: Number.isFinite(last) ? last : 0,
    acquired: acquiredList,
    acquiredTotal: acquiredList.reduce((a, c) => a + c.count, 0),
    rpSpent,
    rpSpentBy: amounted(rpAmt, rpCnt, L.storeCategoryLabel),
    rpGiftSpent,
    beSpent,
    beSpentBy: amounted(beAmt, beCnt, L.storeCategoryLabel),
    rpBalance: latest?.rp ?? null,
    beBalance: latest?.be ?? null,
    skinChampions,
    skinLog: skinLog.sort((a, b) => a.t - b.t),
    skinChampionCount: skinChampions.length,
    skinTotal,
    championsOwned: champs.size,
    championsKnown: Object.keys(CHAMPIONS).length,
    championsUnknown: champs.size - known,
    giftsSent,
    giftsReceived,
    ipCount: ips.size,
  };
}

// ---------- real-money spend (RP top-ups) ----------

export function analyzeSpend(file: ExportFile | undefined, storeFile: ExportFile | undefined): SpendAnalysis | null {
  const rows = rowsOf(file?.data);
  const byCurrency = new Map<string, RpCharge[]>();
  for (const r of rows) {
    const t = parseUtc(r.created);
    const amount = numOf(r.amount);
    if (t == null || amount == null) {
      continue;
    }
    const currency = str(r.currency_type) ?? 'JPY';
    const list = byCurrency.get(currency) ?? [];
    list.push({t, amount, currency, method: L.paymentLabel(str(r.payment_type))});
    byCurrency.set(currency, list);
  }
  if (byCurrency.size === 0) {
    return null;
  }
  // Report the currency with the most charges; name the rest.
  const ranked = [...byCurrency.entries()].sort((a, b) => b[1].length - a[1].length);
  const [currency, charges] = ranked[0];
  charges.sort((a, b) => a.t - b.t);

  const yearMap = new Map<number, {amount: number; count: number}>();
  const methods = new Map<string, number>();
  let total = 0;
  let largest = 0;
  for (const c of charges) {
    const y = new Date(c.t).getFullYear();
    const cur = yearMap.get(y) ?? {amount: 0, count: 0};
    cur.amount += c.amount;
    cur.count += 1;
    yearMap.set(y, cur);
    bump(methods, c.method);
    total += c.amount;
    largest = Math.max(largest, c.amount);
  }
  const firstYear = new Date(charges[0].t).getFullYear();
  const lastYear = new Date(charges[charges.length - 1].t).getFullYear();
  const years: {year: number; amount: number; count: number}[] = [];
  for (let y = firstYear; y <= lastYear; y++) {
    years.push({year: y, ...(yearMap.get(y) ?? {amount: 0, count: 0})});
  }
  const topYear = years.reduce<{year: number; amount: number} | null>(
    (best, y) => (!best || y.amount > best.amount ? {year: y.year, amount: y.amount} : best),
    null,
  );

  // RP received for those charges, from the store log.
  let rpBought = 0;
  for (const r of rowsOf(storeFile?.data)) {
    if (L.STORE_TOPUP.has(str(r.type) ?? '')) {
      rpBought += Math.max(0, numOf(r.rp_delta) ?? 0);
    }
  }
  const single = ranked.length === 1;

  return {
    charges,
    currency,
    otherCurrencies: ranked.slice(1).map(([c]) => c),
    total,
    count: charges.length,
    first: charges[0].t,
    last: charges[charges.length - 1].t,
    years,
    topYear,
    largest,
    rpBought: rpBought > 0 ? rpBought : null,
    pricePerRp: single && rpBought > 0 ? total / rpBought : null,
    methods: counted(methods, k => k),
  };
}

// ---------- chat ----------

const PHASES: {key: string; phase: ChatMessage['phase']}[] = [
  {key: 'pre_game', phase: 'pre'},
  {key: 'in_game', phase: 'mid'},
  {key: 'post_game', phase: 'post'},
];

function targetLabel(code: string): string {
  if (code === 'TEAM') {
    return 'チーム';
  }
  if (code === 'ALL') {
    return '全体';
  }
  if (code.startsWith('PARTY')) {
    return 'パーティー';
  }
  return code;
}

export function analyzeChat(files: ExportFile[], riotId: string | null): ChatAnalysis | null {
  const chatFiles = files.filter(f => /\/chat_logs[^/]*\/[^/]+\/[^/]+\.json$/.test(normPath(`/${f.path}`)));
  if (chatFiles.length === 0) {
    return null;
  }
  const games: ChatGame[] = [];
  const log: ChatMessage[] = [];
  const targets = new Map<string, number>();
  const phrases = new Map<string, {text: string; count: number}>();
  const byPhase = {pre: 0, mid: 0, post: 0};
  let otherMessages = 0;
  let failedFiles = 0;
  const me = riotId?.toLowerCase() ?? null;

  for (const f of chatFiles) {
    if (!isObj(f.data)) {
      failedFiles += 1;
      continue;
    }
    const d = f.data;
    if (d.was_failure === true || d.success === false) {
      failedFiles += 1;
    }
    const id = String(d.game_id ?? f.path.split('/').pop()?.replace(/\.json$/, '') ?? '');
    const date = parseUtc(d.match_date_utc);
    const logs = isObj(d.chat_logs) ? d.chat_logs : {};
    const game: ChatGame = {id, date: date ?? 0, pre: 0, mid: 0, post: 0, total: 0};
    for (const {key, phase} of PHASES) {
      for (const m of rowsOf(logs[key])) {
        const author = str(m.riot_id)?.toLowerCase() ?? null;
        if (me && author && author !== me) {
          otherMessages += 1;
          continue;
        }
        const text = str(m.chat) ?? '';
        const t = parseUtc(m.timestamp) ?? date ?? 0;
        const to = str(m.sent_to) ?? '';
        game[phase] += 1;
        game.total += 1;
        byPhase[phase] += 1;
        bump(targets, targetLabel(to));
        log.push({t, gameId: id, phase, to: targetLabel(to), text});
        const norm = text.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
        if (norm) {
          const cur = phrases.get(norm) ?? {text: norm, count: 0};
          cur.count += 1;
          phrases.set(norm, cur);
        }
      }
    }
    if (date != null) {
      games.push(game);
    }
  }
  if (games.length === 0) {
    return null;
  }
  games.sort((a, b) => a.date - b.date || a.id.localeCompare(b.id, 'en', {numeric: true}));
  log.sort((a, b) => b.t - a.t);

  const dateMap = new Map<number, {games: number; talked: number}>();
  for (const g of games) {
    const cur = dateMap.get(g.date) ?? {games: 0, talked: 0};
    cur.games += 1;
    cur.talked += g.total > 0 ? 1 : 0;
    dateMap.set(g.date, cur);
  }
  const byDate = [...dateMap.entries()].map(([date, v]) => ({date, ...v})).sort((a, b) => a.date - b.date);
  const maxPerDay = byDate.reduce((best, d) => (d.games > best.games ? {date: d.date, games: d.games} : best), {
    date: byDate[0].date,
    games: 0,
  });

  return {
    games,
    window: {from: games[0].date, to: games[games.length - 1].date},
    talkedGames: games.filter(g => g.total > 0).length,
    messages: log.length,
    byPhase,
    byTarget: counted(targets, k => k),
    phrases: [...phrases.values()]
      .filter(p => p.count >= 2)
      .sort((a, b) => b.count - a.count || a.text.localeCompare(b.text, 'ja'))
      .slice(0, 8),
    byDate,
    activeDates: byDate.length,
    maxPerDay,
    log,
    otherMessages,
    failedFiles,
  };
}

// ---------- reports and penalties ----------

function reportCounts(value: unknown): Counted[] | null {
  if (!isObj(value)) {
    return null;
  }
  const map = new Map<string, number>();
  for (const [k, v] of Object.entries(value)) {
    const n = numOf(v);
    if (n != null && n > 0) {
      map.set(k, n);
    }
  }
  return counted(map, L.reportCategoryLabel);
}

export function analyzeReports(file: ExportFile | undefined): ReportsAnalysis | null {
  if (!isObj(file?.data)) {
    return null;
  }
  const received = reportCounts(file.data.reports_received) ?? [];
  const made = reportCounts(file.data.reports_made);
  return {
    received,
    receivedTotal: received.reduce((a, c) => a + c.count, 0),
    made,
    madeTotal: made ? made.reduce((a, c) => a + c.count, 0) : 0,
  };
}

export function analyzePenalties(file: ExportFile | undefined): Penalty[] | null {
  if (!file || !Array.isArray(file.data)) {
    return null;
  }
  return rowsOf(file.data)
    .map(r => {
      const reasonCode = str(r.restriction_reason) ?? '';
      const sentenceCode = str(r.sentence) ?? '';
      const statusCode = str(r.status) ?? '';
      return {
        t: parseUtc(r.date_issued),
        reason: L.penaltyReasonLabel(reasonCode),
        reasonCode,
        type: L.penaltyTypeLabel(str(r.restriction_type)),
        scope: L.penaltyScopeLabel(str(r.scope)),
        sentence: L.penaltySentenceLabel(sentenceCode),
        sentenceCode,
        status: L.penaltyStatusLabel(statusCode),
        statusCode,
        manual: typeof r.is_manual === 'boolean' ? r.is_manual : null,
      };
    })
    .sort((a, b) => (b.t ?? 0) - (a.t ?? 0));
}

// ---------- other games ----------

function periodOf(rows: Row[], key: string): Period | null {
  let p: Period | null = null;
  for (const r of rows) {
    p = widen(p, parseUtc(r[key]));
  }
  return p;
}

function modeCounts(rows: Row[], pick: (r: Row) => string | null): Counted[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const k = pick(r);
    if (k) {
      bump(map, k);
    }
  }
  return counted(map, k => k);
}

const VALORANT_TYPES: Record<string, string> = {
  Unrated: 'アンレート',
  Competitive: 'コンペティティブ',
  Swiftplay: 'スイフトプレイ',
  Deathmatch: 'デスマッチ',
  'Spike Rush': 'スパイクラッシュ',
  Ggteam: 'エスカレーション',
  Onefa: 'レプリケーション',
  Premier: 'Premier',
  'Team Deathmatch': 'チームデスマッチ',
};
const VALORANT_MODES: Record<string, string> = {
  ShootingRange: '射撃場',
  'Custom Game': 'カスタムゲーム',
  'New Player Experience': 'チュートリアル',
};
const VALORANT_RANKED = new Set(['Unrated', 'Competitive', 'Swiftplay', 'Premier']);
const WILDRIFT_TYPES: Record<string, string> = {
  Normal: 'ノーマル',
  Ranked: 'ランク',
  AI: 'AI戦',
  'Co-op vs. AI': 'AI戦（協力）',
  ARAM: 'ARAM',
  Custom: 'カスタム',
};
const LOR_MODES: Record<string, string> = {
  Constructed: '構築戦',
  Expeditions: 'エクスペディション',
  'Path of Champions': 'チャンピオンの道',
  Labs: 'ラボ',
};

export function analyzeGames(files: ExportFile[]): GameSummary[] {
  const out: GameSummary[] = [];

  // VALORANT
  const val = rowsOf(findFile(files, 'valorant/valorant_match_history_uc.json')?.data);
  if (val.length > 0) {
    const queued = val.filter(r => str(r.game_mode) === 'Matchmaking');
    const ranked = queued.filter(r => VALORANT_RANKED.has(str(r.game_type) ?? ''));
    const wins = ranked.filter(r => str(r.game_outcome) === 'Win').length;
    const losses = ranked.filter(r => str(r.game_outcome) === 'Loss').length;
    let minutes = 0;
    for (const r of queued) {
      const a = parseUtc(r.game_start_time_utc);
      const b = parseUtc(r.game_end_time_utc);
      if (a != null && b != null && b > a && b - a < 4 * 3600000) {
        minutes += (b - a) / 60000;
      }
    }
    const scopeTypes = [...new Set(ranked.map(r => VALORANT_TYPES[str(r.game_type) ?? ''] ?? str(r.game_type) ?? ''))];
    const notes: string[] = [];
    if (minutes > 0) {
      notes.push(`対戦の合計 約${Math.round(minutes / 60)}時間`);
    }
    const practice = val.length - queued.length;
    if (practice > 0) {
      notes.push(`射撃場・カスタムなど ${practice}件は対戦に数えていません`);
    }
    out.push({
      key: 'valorant',
      label: 'VALORANT',
      matches: queued.length,
      period: periodOf(val, 'game_start_time_utc'),
      wins: ranked.length ? wins : null,
      losses: ranked.length ? losses : null,
      recordScope: ranked.length ? scopeTypes.join('・') : null,
      modes: modeCounts(val, r => {
        const mode = str(r.game_mode) ?? '';
        if (mode !== 'Matchmaking') {
          return VALORANT_MODES[mode] ?? mode;
        }
        const type = str(r.game_type) ?? '';
        return VALORANT_TYPES[type] ?? type;
      }),
      notes,
    });
  }

  // Wild Rift
  const wr = rowsOf(findFile(files, 'wildrift/wildrift_match_history_uc.json')?.data);
  if (wr.length > 0) {
    const real = wr.filter(r => !/^tutorial/i.test(str(r.game_mode) ?? ''));
    const decided = real.filter(r => ['Victory', 'Defeat'].includes(str(r.game_outcome) ?? ''));
    const notes: string[] = [];
    const tutorials = wr.length - real.length;
    if (tutorials > 0) {
      notes.push(`チュートリアル ${tutorials}件を除く`);
    }
    const inv = findFile(files, 'wildrift/wildrift_inventory.json')?.data;
    if (isObj(inv)) {
      const champs = Array.isArray(inv.champions) ? inv.champions.length : 0;
      const skins = Array.isArray(inv.skins) ? inv.skins.length : 0;
      if (champs || skins) {
        notes.push(`所持: チャンピオン ${champs}体・スキン ${skins}着`);
      }
    }
    const ranks = [...new Set(wr.map(r => str(r.player_rank)).filter((v): v is string => !!v))];
    if (ranks.length) {
      notes.push(`ランク: ${ranks.join('、')}`);
    }
    out.push({
      key: 'wildrift',
      label: 'ワイルドリフト',
      matches: real.length,
      period: periodOf(wr, 'game_start_time_utc'),
      wins: decided.length ? decided.filter(r => str(r.game_outcome) === 'Victory').length : null,
      losses: decided.length ? decided.filter(r => str(r.game_outcome) === 'Defeat').length : null,
      recordScope: decided.length ? '勝敗がついた試合' : null,
      modes: modeCounts(real, r => {
        const type = str(r.game_type);
        return type ? (WILDRIFT_TYPES[type] ?? type) : null;
      }),
      notes,
    });
  }

  // Legends of Runeterra
  const lor = rowsOf(findFile(files, 'legendsofruneterra/lor_match_history_uc.json')?.data);
  if (lor.length > 0) {
    const tutorials = lor.filter(r => /^tutorial/i.test(str(r.game_mode) ?? '')).length;
    const vsAi = lor.filter(r => str(r.game_type) === 'AI').length;
    const notes: string[] = [];
    if (vsAi === lor.length) {
      notes.push('すべてAI戦');
    } else if (vsAi > 0) {
      notes.push(`AI戦 ${vsAi}件を含む`);
    }
    if (tutorials > 0) {
      notes.push(`うちチュートリアル ${tutorials}件`);
    }
    out.push({
      key: 'lor',
      label: 'レジェンド・オブ・ルーンテラ',
      matches: lor.length,
      period: periodOf(lor, 'game_start_time_utc'),
      wins: lor.filter(r => str(r.game_outcome) === 'Victory').length,
      losses: lor.filter(r => str(r.game_outcome) === 'Defeat').length,
      recordScope: 'すべての対戦',
      modes: modeCounts(lor, r => {
        const mode = str(r.game_mode);
        if (!mode) {
          return null;
        }
        return /^tutorial/i.test(mode) ? 'チュートリアル' : (LOR_MODES[mode] ?? mode);
      }),
      notes,
    });
  }

  // 2XKO
  const xko = rowsOf(findFile(files, '2xko/2xko_game_match_history_uc.json')?.data);
  if (xko.length > 0) {
    out.push({
      key: '2xko',
      label: '2XKO',
      matches: xko.length,
      period: periodOf(xko, 'game_start_time_utc'),
      wins: null,
      losses: null,
      recordScope: null,
      modes: [],
      notes: [],
    });
  }
  return out;
}

// ---------- account ----------

export function analyzeAudit(files: ExportFile[]): AuditEvent[] | null {
  const v1 = findFile(files, 'riotaccount/account_audit_events_v1_uc.json');
  const v2 = findFile(files, 'riotaccount/account_audit_events_v2_uc.json');
  if (!v1 && !v2) {
    return null;
  }
  const events: AuditEvent[] = [];
  for (const r of rowsOf(v1?.data)) {
    const t = parseUtc(r.event_date);
    const code = str(r.action);
    if (t != null && code) {
      events.push({t, code, label: L.auditLabel(code), detail: null, security: L.AUDIT_SECURITY.has(code)});
    }
  }
  for (const r of rowsOf(v2?.data)) {
    const t = parseUtc(r.event_date);
    const code = str(r.event_type);
    if (t != null && code) {
      events.push({
        t,
        code,
        label: L.auditLabel(code),
        detail: L.auditDetailLabel(str(r.description)),
        security: L.AUDIT_SECURITY.has(code),
      });
    }
  }
  return events.sort((a, b) => b.t - a.t);
}

export function analyzeTickets(file: ExportFile | undefined): Ticket[] | null {
  if (!file || file.data === undefined) {
    return null;
  }
  const list = isObj(file.data) ? Object.values(file.data) : Array.isArray(file.data) ? file.data : [];
  return list
    .filter(isObj)
    .map(tk => ({
      id: String(tk.ticket_id ?? ''),
      t: parseUtc(tk.create_datetime),
      status: L.ticketStatusLabel(str(tk.status)),
      subject: str(tk.subject) ?? '（件名なし）',
      comments: Array.isArray(tk.comments) ? tk.comments.length : 0,
    }))
    .sort((a, b) => (b.t ?? 0) - (a.t ?? 0));
}

function readIdentity(files: ExportFile[]): {riotId: string | null; platform: string | null} {
  const info = findFile(files, 'riotaccount/account_info.json')?.data;
  const summoner = findFile(files, 'leagueoflegends/summoner.json')?.data;
  let riotId: string | null = null;
  if (isObj(summoner)) {
    riotId = str(summoner.riot_id);
  }
  if (!riotId && isObj(info)) {
    const name = str(info.game_name);
    const tag = str(info.tagline);
    riotId = name ? (tag ? `${name}#${tag}` : name) : null;
  }
  return {riotId, platform: isObj(summoner) ? str(summoner.lol_platform) : null};
}

// ---------- entry point ----------

/** True when the files look like a Riot data-request export. */
export function looksLikeRiotExport(files: ExportFile[]): boolean {
  const markers = [
    'riotaccount/',
    'leagueoflegends/',
    'valorant/',
    'wildrift/',
    'legendsofruneterra/',
    'atlas_login_event',
    'store_transactions',
  ];
  return files.some(f => markers.some(m => normPath(f.path).includes(m)));
}

export function analyze(files: ExportFile[], options: {isSample?: boolean} = {}): Report {
  const {riotId, platform} = readIdentity(files);
  const storeFile = findFile(files, 'leagueoflegends/store_transactions_uc.json');

  const logins = analyzeLogins(findFile(files, 'riotaccount/atlas_login_event_uc.json'));
  const store = analyzeStore(storeFile);
  const spend = analyzeSpend(findFile(files, 'leagueoflegends/rp_purchase_history_uc.json'), storeFile);
  const chat = analyzeChat(files, riotId);
  const reports = analyzeReports(findFile(files, 'leagueoflegends/grouped_reports.json'));
  const penalties = analyzePenalties(findFile(files, 'penalties/penalty_history.json'));
  const games = analyzeGames(files);
  const audit = analyzeAudit(files);
  const tickets = analyzeTickets(findFile(files, 'zendesk/zendesk_tickets.json'));
  const {rows: inventory, personalKinds, emptyCount, period} = buildInventory(files);

  const jsonFiles = files.filter(f => normPath(f.path).endsWith('.json'));
  const report: Report = {
    isSample: options.isSample ?? false,
    riotId,
    platform,
    fileCount: files.length,
    jsonCount: jsonFiles.length,
    emptyCount,
    errorCount: files.filter(f => f.error).length,
    period,
    logins,
    store,
    spend,
    chat,
    reports,
    penalties,
    games,
    audit,
    tickets,
    inventory,
    personalKinds,
    findings: [],
    story: null,
  };
  report.findings = buildFindings(report);
  report.story = buildStory(report);
  return report;
}
