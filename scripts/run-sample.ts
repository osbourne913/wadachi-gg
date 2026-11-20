// Node check: the synthetic sample goes through the same analysis as a real export.
import {analyze, looksLikeRiotExport} from '../src/lib/riot/analyze';
import {makeSampleExport} from '../src/lib/riot/sample';

const files = makeSampleExport();
console.log('files', files.length, 'riot?', looksLikeRiotExport(files));
const r = analyze(files, {isSample: true});
const brief = {
  riotId: r.riotId,
  platform: r.platform,
  fileCount: r.fileCount,
  period: r.period && [new Date(r.period.from).toISOString(), new Date(r.period.to).toISOString()],
  logins: r.logins && {
    total: r.logins.totalEvents,
    start: r.logins.startEvents,
    activeDays: r.logins.activeDays,
    spanDays: r.logins.spanDays,
    years: r.logins.years,
    peak: r.logins.peak,
    max: r.logins.weekHourMax,
    night: r.logins.nightShare,
    topHour: r.logins.topHour,
    streak: r.logins.streak.days,
    gap: r.logins.gap?.days,
    games: r.logins.games.map(g => [g.label, g.days, g.activeMonths]),
    ip: r.logins.ipCount,
  },
  store: r.store && {
    total: r.store.total,
    acquired: r.store.acquired.map(c => [c.label, c.count]),
    rpSpent: r.store.rpSpent,
    rpBy: r.store.rpSpentBy.map(c => [c.label, c.amount, c.count]),
    beSpent: r.store.beSpent,
    bal: [r.store.rpBalance, r.store.beBalance],
    skins: r.store.skinTotal,
    skinChamps: r.store.skinChampions.slice(0, 6).map(c => [c.name, c.count]),
    champs: [r.store.championsOwned, r.store.championsKnown, r.store.championsUnknown],
    gifts: [r.store.giftsSent, r.store.giftsReceived],
  },
  spend: r.spend && {
    total: r.spend.total,
    count: r.spend.count,
    years: r.spend.years,
    top: r.spend.topYear,
    largest: r.spend.largest,
    rpBought: r.spend.rpBought,
    perRp: r.spend.pricePerRp,
    methods: r.spend.methods,
  },
  chat: r.chat && {
    games: r.chat.games.length,
    talked: r.chat.talkedGames,
    messages: r.chat.messages,
    phase: r.chat.byPhase,
    target: r.chat.byTarget,
    phrases: r.chat.phrases,
    active: r.chat.activeDates,
    max: r.chat.maxPerDay,
    other: r.chat.otherMessages,
  },
  reports: r.reports,
  penalties: r.penalties,
  games: r.games,
  audit: r.audit?.length,
  tickets: r.tickets,
  personal: r.personalKinds,
  inventory: r.inventory.map(i => [i.group, i.label, i.records, i.note]),
  findings: r.findings,
};
console.log(JSON.stringify(brief, null, 1));
