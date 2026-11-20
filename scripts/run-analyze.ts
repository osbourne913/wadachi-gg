// Runs the analysis over an extracted export directory and prints the numbers,
// so they can be compared with an independent calculation.
//   npx esbuild scripts/run-analyze.ts --bundle --platform=node --format=cjs --outfile=.cache/run-analyze.cjs && node .cache/run-analyze.cjs <export-dir>
import * as fs from 'node:fs';
import * as path from 'node:path';
import {analyze} from '../src/lib/riot/analyze';
import type {ExportFile} from '../src/lib/riot/types';
import {dateLong} from '../src/lib/format';

function walk(dir: string, base = dir): ExportFile[] {
  const out: ExportFile[] = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      out.push(...walk(full, base));
    } else {
      const rel = path.relative(base, full).split(path.sep).join('/');
      let data: unknown;
      let error: string | undefined;
      if (rel.toLowerCase().endsWith('.json')) {
        try {
          data = JSON.parse(fs.readFileSync(full, 'utf8'));
        } catch (e) {
          error = String(e);
        }
      }
      out.push({path: rel, size: stat.size, data, error});
    }
  }
  return out;
}

const files = walk(process.argv[2]);
const r = analyze(files);
const brief = process.argv.includes('--brief');

const l = r.logins!;
console.log('files', r.fileCount, 'json', r.jsonCount, 'empty', r.emptyCount, 'errors', r.errorCount);
console.log('period', r.period && [dateLong(r.period.from), dateLong(r.period.to)]);
console.log('riotId present', !!r.riotId, 'platform', r.platform);
console.log('--- logins');
console.log({
  totalEvents: l.totalEvents,
  startEvents: l.startEvents,
  activeDays: l.activeDays,
  spanDays: l.spanDays,
  tz: l.timeZone,
  first: dateLong(l.first),
  last: dateLong(l.last),
  topHour: l.topHour,
  nightShare: +l.nightShare.toFixed(4),
  peak: l.peak,
  weekHourMax: l.weekHourMax,
  streak: [l.streak.days, dateLong(l.streak.from), dateLong(l.streak.to)],
  gap: l.gap && [l.gap.days, dateLong(l.gap.from), dateLong(l.gap.to)],
  ipCount: l.ipCount,
  months: l.months.length,
});
console.log('years', l.years.map(y => `${y.year}:${y.days}${y.partial ? '*' : ''}`).join(' '));
if (!brief) {
  console.log('yearMonth');
  l.yearMonth.forEach((row, i) => console.log(l.years[i].year, row.map(v => (v === null ? ' .' : String(v).padStart(2))).join(' ')));
  console.log('weekHour (slot0=5時)');
  l.weekHour.forEach((row, i) => console.log('月火水木金土日'[i], row.map(v => String(v).padStart(3)).join(' ')));
}
console.log('games', l.games.map(g => `${g.label}: days=${g.days} months=${g.activeMonths} ${dateLong(g.first)}–${dateLong(g.last)}`));
console.log('others', l.others);
console.log('--- store');
const s = r.store!;
console.log({
  total: s.total,
  acquiredTotal: s.acquiredTotal,
  rpSpent: s.rpSpent,
  rpGiftSpent: s.rpGiftSpent,
  beSpent: s.beSpent,
  rpBalance: s.rpBalance,
  beBalance: s.beBalance,
  skinTotal: s.skinTotal,
  skinChampionCount: s.skinChampionCount,
  championsOwned: s.championsOwned,
  championsKnown: s.championsKnown,
  championsUnknown: s.championsUnknown,
  giftsSent: s.giftsSent,
  giftsReceived: s.giftsReceived,
  ipCount: s.ipCount,
});
console.log('acquired', s.acquired.map(c => `${c.label}=${c.count}`).join(', '));
console.log('rpSpentBy', s.rpSpentBy.map(c => `${c.label}=${c.amount}(${c.count})`).join(', '));
console.log('beSpentBy', s.beSpentBy.map(c => `${c.label}=${c.amount}(${c.count})`).join(', '));
console.log('skinChampions', s.skinChampions.slice(0, 10).map(c => `${c.name}=${c.count}`).join(', '));
console.log('--- spend');
const sp = r.spend!;
console.log({
  total: sp.total,
  count: sp.count,
  currency: sp.currency,
  largest: sp.largest,
  rpBought: sp.rpBought,
  pricePerRp: sp.pricePerRp && +sp.pricePerRp.toFixed(4),
  topYear: sp.topYear,
  methods: sp.methods,
});
console.log('years', sp.years.map(y => `${y.year}:${y.amount}(${y.count})`).join(' '));
console.log('--- chat');
const c = r.chat!;
console.log({
  games: c.games.length,
  talked: c.talkedGames,
  messages: c.messages,
  byPhase: c.byPhase,
  byTarget: c.byTarget,
  activeDates: c.activeDates,
  maxPerDay: [new Date(c.maxPerDay.date).toISOString().slice(0, 10), c.maxPerDay.games],
  window: [new Date(c.window.from).toISOString().slice(0, 10), new Date(c.window.to).toISOString().slice(0, 10)],
  otherMessages: c.otherMessages,
  failedFiles: c.failedFiles,
  phrases: c.phrases,
});
console.log('--- reports', r.reports);
console.log('--- penalties', r.penalties?.map(p => `${p.t && dateLong(p.t)} ${p.reason} / ${p.type} / ${p.sentence} / ${p.status}`));
console.log('--- games', JSON.stringify(r.games.map(g => ({...g, period: g.period && [dateLong(g.period.from), dateLong(g.period.to)]})), null, 1));
console.log('--- audit', r.audit?.length, r.audit?.slice(0, 4).map(a => `${dateLong(a.t)} ${a.label}${a.detail ? `（${a.detail}）` : ''}`));
console.log('--- tickets', r.tickets?.map(t => `${t.t && dateLong(t.t)} ${t.status} comments=${t.comments}`));
console.log('--- inventory rows', r.inventory.length, 'personal kinds', r.personalKinds);
if (!brief) {
  for (const row of r.inventory) {
    console.log(
      ' ',
      row.group.padEnd(14),
      row.label.padEnd(18),
      String(row.records).padStart(6),
      row.period ? `${dateLong(row.period.from)}–${dateLong(row.period.to)}` : '',
      row.personal.join('/'),
      row.note ?? '',
    );
  }
}
console.log('--- findings');
for (const f of r.findings) {
  console.log(` [${f.kind}] ${f.title}\n      ${f.detail}`);
}
