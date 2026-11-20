// Shapes produced by the analysis. Everything the UI shows comes from a Report;
// no component reads the raw export.

/** One file from the export zip. */
export interface ExportFile {
  /** Path inside the zip, forward slashes. */
  path: string;
  /** Uncompressed size in bytes. */
  size: number;
  /** Parsed JSON, or undefined when the file is not JSON or failed to parse. */
  data: unknown;
  /** Set when a .json file could not be parsed. */
  error?: string;
}

export interface Counted {
  key: string;
  label: string;
  count: number;
}

export interface Amounted extends Counted {
  amount: number;
}

export interface Period {
  from: number;
  to: number;
}

// ---------- Logins ----------

export interface ProductActivity {
  key: string;
  label: string;
  /** Start events for this product. */
  events: number;
  days: number;
  first: number;
  last: number;
  activeMonths: number;
  /** Play days per month, aligned to LoginAnalysis.months. */
  monthly: number[];
}

export interface LoginAnalysis {
  /** Every row in the login log. */
  totalEvents: number;
  /** Rows that mark the start of a session. */
  startEvents: number;
  first: number;
  last: number;
  timeZone: string;
  activeDays: number;
  spanDays: number;
  years: {year: number; days: number; partial: boolean}[];
  /** [yearIndex][month 0-11] = play days, or null outside the recorded range. */
  yearMonth: (number | null)[][];
  /** [weekday Mon-Sun][slot], slot 0 = 05:00 … slot 23 = 04:00. Value = play days with a login in that hour. */
  weekHour: number[][];
  weekHourMax: number;
  peak: {weekday: number; hour: number; days: number};
  /** Share of login hours that fall between 22:00 and 02:00. */
  nightShare: number;
  topHour: number;
  streak: {days: number; from: number; to: number};
  gap: {days: number; from: number; to: number} | null;
  /** Month axis for products: [{year, month}] from first to last login. */
  months: {year: number; month: number}[];
  games: ProductActivity[];
  others: Counted[];
  ipCount: number;
  /** Every calendar day from the first to the last play day; value = distinct login hours that day (0 = none). */
  daily: {start: number; counts: number[]};
  /** Login hours by wall-clock hour 0-23 (distinct day-hours). */
  hourTotals: number[];
  /** The same, one row per entry of `years`. */
  hoursByYear: number[][];
}

// ---------- Store ----------

export interface RpCharge {
  t: number;
  amount: number;
  currency: string;
  method: string;
}

export interface StoreAnalysis {
  total: number;
  first: number;
  last: number;
  /** Things acquired for the account itself, by category. Excludes RP top-ups and gifts sent. */
  acquired: Counted[];
  acquiredTotal: number;
  rpSpent: number;
  rpSpentBy: Amounted[];
  rpGiftSpent: number;
  beSpent: number;
  beSpentBy: Amounted[];
  rpBalance: number | null;
  beBalance: number | null;
  skinChampions: {id: number; name: string; count: number; role: string | null}[];
  /** Every skin or chroma acquired, oldest first: when, for which champion, and the RP it cost (negative when paid). */
  skinLog: {t: number; id: number; rp: number}[];
  skinChampionCount: number;
  skinTotal: number;
  championsOwned: number;
  championsKnown: number;
  championsUnknown: number;
  giftsSent: number;
  giftsReceived: number;
  ipCount: number;
}

export interface SpendAnalysis {
  charges: RpCharge[];
  currency: string;
  /** Other currencies present, if the account paid in more than one. */
  otherCurrencies: string[];
  total: number;
  count: number;
  first: number;
  last: number;
  years: {year: number; amount: number; count: number}[];
  topYear: {year: number; amount: number} | null;
  largest: number;
  rpBought: number | null;
  pricePerRp: number | null;
  methods: Counted[];
}

// ---------- Chat ----------

export interface ChatGame {
  id: string;
  /** UTC date of the match, as epoch ms at UTC midnight. */
  date: number;
  pre: number;
  mid: number;
  post: number;
  total: number;
}

export interface ChatMessage {
  t: number;
  gameId: string;
  phase: 'pre' | 'mid' | 'post';
  to: string;
  text: string;
}

export interface ChatAnalysis {
  games: ChatGame[];
  window: Period;
  talkedGames: number;
  messages: number;
  byPhase: {pre: number; mid: number; post: number};
  byTarget: Counted[];
  phrases: {text: string; count: number}[];
  /** Games per UTC date, only dates with at least one game. */
  byDate: {date: number; games: number; talked: number}[];
  activeDates: number;
  maxPerDay: {date: number; games: number};
  /** The player's own messages, newest first. */
  log: ChatMessage[];
  /** Messages written by other players, if the export contains any. Never shown. */
  otherMessages: number;
  failedFiles: number;
}

// ---------- Conduct ----------

export interface ReportsAnalysis {
  received: Counted[];
  receivedTotal: number;
  /** null when the file says nothing about reports made. */
  made: Counted[] | null;
  madeTotal: number;
}

export interface Penalty {
  t: number | null;
  reason: string;
  reasonCode: string;
  type: string;
  scope: string;
  sentence: string;
  sentenceCode: string;
  status: string;
  statusCode: string;
  manual: boolean | null;
}

// ---------- Other games ----------

export interface GameSummary {
  key: string;
  label: string;
  matches: number;
  period: Period | null;
  wins: number | null;
  losses: number | null;
  /** What the win/loss count covers, e.g. "アンレート". */
  recordScope: string | null;
  modes: Counted[];
  notes: string[];
}

// ---------- Account ----------

export interface AuditEvent {
  t: number;
  code: string;
  label: string;
  detail: string | null;
  security: boolean;
}

export interface Ticket {
  id: string;
  t: number | null;
  status: string;
  subject: string;
  comments: number;
}

export interface InventoryRow {
  group: string;
  label: string;
  path: string;
  records: number;
  period: Period | null;
  personal: string[];
  note: string | null;
}

// ---------- Story ----------

/** A note on a year's calendar. `from` and `to` are epoch ms at local noon of the first and last day. */
export interface StoryMark {
  kind: 'point' | 'streak' | 'gap';
  from: number;
  to: number;
  label: string;
}

export interface StoryYear {
  year: number;
  /** The record does not cover the whole year. */
  partial: boolean;
  days: number;
  /** Login days from the start of the record to the end of this year. */
  cumulative: number;
  /** Share of login hours between 22:00 and 02:00; null when the year has too few to say. */
  nightShare: number | null;
  /** Login hours by wall-clock hour 0-23. */
  hours: number[];
  /** Charges in this year, in Story.currency; null when the export has no charge history. */
  spend: number | null;
  /** Skins and chromas acquired in this year; null when the export has no store log. */
  skins: {total: number; champions: number; top: {id: number; name: string; count: number}[]} | null;
  /** A few words naming the year. */
  tag: string;
  /** What happened, one line each. */
  lines: string[];
  marks: StoryMark[];
}

export interface Story {
  years: StoryYear[];
  currency: string | null;
}

export type FindingKind = 'time' | 'money' | 'chat' | 'items' | 'calendar' | 'games';

export interface Finding {
  kind: FindingKind;
  title: string;
  detail: string;
  /** Section id to jump to. */
  anchor: string;
}

export interface Report {
  isSample: boolean;
  riotId: string | null;
  platform: string | null;
  fileCount: number;
  jsonCount: number;
  emptyCount: number;
  errorCount: number;
  /** Earliest and latest timestamp found anywhere in the export. */
  period: Period | null;
  logins: LoginAnalysis | null;
  store: StoreAnalysis | null;
  spend: SpendAnalysis | null;
  chat: ChatAnalysis | null;
  reports: ReportsAnalysis | null;
  penalties: Penalty[] | null;
  games: GameSummary[];
  audit: AuditEvent[] | null;
  tickets: Ticket[] | null;
  inventory: InventoryRow[];
  personalKinds: string[];
  findings: Finding[];
  story: Story | null;
}
