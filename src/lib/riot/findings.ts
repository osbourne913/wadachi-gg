// The written summary: one sentence per finding, each with the numbers behind it.
// A finding is only produced when the data is large enough to say it.

import {WEEKDAYS, dateLong, money, num, pct, spanText} from '../format';
import type {Finding, Report} from './types';

const dateUtc = (ms: number) => {
  const d = new Date(ms);
  return `${d.getUTCMonth() + 1}月${d.getUTCDate()}日`;
};

export function buildFindings(r: Report): Finding[] {
  const out: Finding[] = [];
  const {logins, spend, store, chat} = r;

  if (logins && logins.activeDays >= 14) {
    const best = logins.years.reduce((a, b) => (b.days > a.days ? b : a));
    out.push({
      kind: 'calendar',
      title: `ログイン率：${pct(logins.activeDays / logins.spanDays)}（${spanText(logins.first, logins.last)}中）`,
      detail:
        `ログインした日は${num(logins.activeDays)}日。いちばん多い年は${best.year}年の${num(best.days)}日。` +
        `連続の最長は${num(logins.streak.days)}日（${dateLong(logins.streak.from)}〜${dateLong(logins.streak.to)}）。`,
      anchor: 'play',
    });
    out.push({
      kind: 'time',
      title: `最多の時間帯：${logins.topHour}時台`,
      detail:
        `ログインのあった時間帯のうち、22時〜翌2時が${pct(logins.nightShare)}。` +
        `最多は${WEEKDAYS[logins.peak.weekday]}曜の${logins.peak.hour}時台で${num(logins.peak.days)}日。`,
      anchor: 'play',
    });
  }

  if (spend && spend.count >= 1) {
    const top = spend.topYear;
    out.push({
      kind: 'money',
      title:
        top && spend.years.length >= 2
          ? `課金の合計：${money(spend.total, spend.currency)}（最多は${top.year}年）`
          : `課金の合計：${money(spend.total, spend.currency)}`,
      detail:
        `RPのチャージは${num(spend.count)}回、1回あたり平均${money(spend.total / spend.count, spend.currency)}。` +
        (top && spend.years.length >= 2 ? `${top.year}年は${money(top.amount, spend.currency)}。` : ''),
      anchor: 'spend',
    });
  }

  if (store && store.rpSpent > 0 && store.rpSpentBy.length >= 2) {
    const [first, second] = store.rpSpentBy;
    const gift = store.rpGiftSpent / store.rpSpent;
    out.push({
      kind: 'items',
      title: `RPの使い道1位：${first.label}（${pct(first.amount / store.rpSpent)}）`,
      detail:
        `使ったRPは合計${num(store.rpSpent)}。${second.label}が${pct(second.amount / store.rpSpent)}。` +
        (gift >= 0.01 ? `人へのギフトは${pct(gift)}。` : ''),
      anchor: 'spend',
    });
  }

  if (store && store.skinChampions.length >= 2 && store.skinChampions[0].count >= 3) {
    const [a, b] = store.skinChampions;
    if (a.count > b.count) {
      out.push({
        kind: 'items',
        title: `スキン最多：${a.name}（${num(a.count)}件）`,
        detail: `2番目は${b.name}の${num(b.count)}件。${num(store.skinChampionCount)}体のチャンピオンで合計${num(store.skinTotal)}件、無料で入手した分を含む。`,
        anchor: 'spend',
      });
    }
  }

  if (chat && chat.games.length >= 10) {
    const n = chat.games.length;
    out.push({
      kind: 'chat',
      title: `発言した試合：${num(chat.talkedGames)} / ${num(n)}試合`,
      detail:
        chat.messages > 0
          ? `発言は合計${num(chat.messages)}回。試合前${num(chat.byPhase.pre)}回、試合中${num(chat.byPhase.mid)}回、試合後${num(chat.byPhase.post)}回。`
          : 'この期間、チャットの発言は記録されていません。',
      anchor: 'recent',
    });
    if (chat.activeDates >= 2) {
      out.push({
        kind: 'games',
        title: `直近${num(n)}試合のプレイ日数：${num(chat.activeDates)}日`,
        detail: `遊んだ日は1日あたり平均${(n / chat.activeDates).toFixed(1)}試合。最多は${dateUtc(chat.maxPerDay.date)}の${num(chat.maxPerDay.games)}試合。`,
        anchor: 'recent',
      });
    }
  }

  return out;
}
