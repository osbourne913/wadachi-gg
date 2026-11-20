// What is in the export: one row per data set, with record counts, the period
// covered, and which kinds of personal information it holds.

import {parseUtc} from '../time';
import type {ExportFile, InventoryRow, Period} from './types';

type Row = Record<string, unknown>;
const isObj = (v: unknown): v is Row => typeof v === 'object' && v !== null && !Array.isArray(v);
const norm = (p: string) => p.replace(/\\/g, '/').toLowerCase();

interface Def {
  suffix: string;
  group: string;
  label: string;
  dateKeys?: string[];
  personal?: string[];
  count?: (data: unknown) => number;
}

const sumValues = (data: unknown): number =>
  isObj(data)
    ? Object.values(data).reduce<number>((a, v): number => {
        if (typeof v === 'number') {
          return a + v;
        }
        if (isObj(v)) {
          return a + sumValues(v);
        }
        if (Array.isArray(v)) {
          return a + v.length;
        }
        return a;
      }, 0)
    : 0;

const G = {
  account: 'アカウント',
  lol: 'League of Legends',
  val: 'VALORANT',
  wr: 'ワイルドリフト',
  lor: 'レジェンド・オブ・ルーンテラ',
  tft: 'チームファイト タクティクス',
  xko: '2XKO',
  support: 'サポート',
  other: 'その他',
};

const DEFS: Def[] = [
  {
    suffix: 'riotaccount/account_info.json',
    group: G.account,
    label: 'アカウント情報',
    personal: ['生年月日', 'メールアドレス', 'ユーザー名'],
    count: d => (isObj(d) && Object.keys(d).length > 0 ? 1 : 0),
  },
  {
    suffix: 'riotaccount/atlas_login_event_uc.json',
    group: G.account,
    label: 'ログイン履歴',
    dateKeys: ['event_time_utc'],
    personal: ['IPアドレス'],
  },
  {
    suffix: 'riotaccount/account_audit_events_v1_uc.json',
    group: G.account,
    label: 'アカウント操作の記録（旧形式）',
    dateKeys: ['event_date'],
  },
  {
    suffix: 'riotaccount/account_audit_events_v2_uc.json',
    group: G.account,
    label: 'アカウント操作の記録',
    dateKeys: ['event_date'],
  },
  {suffix: 'penalties/penalty_history.json', group: G.account, label: 'ペナルティ履歴', dateKeys: ['date_issued']},
  {
    suffix: 'leagueoflegends/store_transactions_uc.json',
    group: G.lol,
    label: 'ストアの取引',
    dateKeys: ['created'],
    personal: ['IPアドレス'],
  },
  {
    suffix: 'leagueoflegends/rp_purchase_history_uc.json',
    group: G.lol,
    label: 'RPのチャージ',
    dateKeys: ['created'],
    personal: ['IPアドレス', '決済方法'],
  },
  {suffix: 'leagueoflegends/grouped_reports.json', group: G.lol, label: '通報の集計', count: sumValues},
  {
    suffix: 'leagueoflegends/summoner.json',
    group: G.lol,
    label: 'サモナー情報',
    count: d => (isObj(d) && Object.keys(d).length > 0 ? 1 : 0),
  },
  {
    suffix: 'leagueoflegends/clash.json',
    group: G.lol,
    label: 'Clashの登録情報',
    personal: ['電話番号（一部伏せ字）'],
    count: d => (isObj(d) && Object.keys(d).length > 0 ? 1 : 0),
  },
  {suffix: 'league/league_audio_transcripts_uc.json', group: G.lol, label: 'ボイスチャットの書き起こし'},
  {
    suffix: 'valorant/valorant_match_history_uc.json',
    group: G.val,
    label: '試合履歴',
    dateKeys: ['game_start_time_utc', 'game_end_time_utc'],
  },
  {suffix: 'valorant/valorant_purchase_event_uc.json', group: G.val, label: 'ゲーム内の購入', dateKeys: ['purchase_date']},
  {suffix: 'valorant/valorant_payment_event_uc.json', group: G.val, label: '課金'},
  {suffix: 'valorant/valorant_grouped_reports.json', group: G.val, label: '通報の集計', count: sumValues},
  {suffix: 'valorant/valorant_audio_transcripts_uc.json', group: G.val, label: 'ボイスチャットの書き起こし'},
  {
    suffix: 'wildrift/wildrift_match_history_uc.json',
    group: G.wr,
    label: '試合履歴',
    dateKeys: ['game_start_time_utc', 'game_end_time_utc'],
  },
  {suffix: 'wildrift/wildrift_inventory.json', group: G.wr, label: '所持アイテム', count: sumValues},
  {
    suffix: 'wildrift/wildrift_currency.json',
    group: G.wr,
    label: 'ゲーム内通貨',
    count: d => (isObj(d) ? Object.keys(d).length : 0),
  },
  {suffix: 'wildrift/wildrift_purchase_event_uc.json', group: G.wr, label: 'ゲーム内の購入', dateKeys: ['purchase_date']},
  {suffix: 'wildrift/wildrift_payment_event_uc.json', group: G.wr, label: '課金'},
  {
    suffix: 'legendsofruneterra/lor_match_history_uc.json',
    group: G.lor,
    label: '試合履歴',
    dateKeys: ['game_start_time_utc', 'game_end_time_utc'],
  },
  {suffix: 'legendsofruneterra/lor_payment_history_event_uc.json', group: G.lor, label: '課金'},
  {suffix: 'legendsofruneterra/lor_purchase_history_event_uc.json', group: G.lor, label: 'ゲーム内の購入'},
  {suffix: 'teamfighttactics/tft_grouped_reports.json', group: G.tft, label: '通報の集計', count: sumValues},
  {suffix: '2xko/2xko_chat_logs_uc.json', group: G.xko, label: 'チャットログ'},
  {suffix: '2xko/2xko_game_inventory_uc.json', group: G.xko, label: '所持アイテム'},
  {suffix: '2xko/2xko_game_match_history_uc.json', group: G.xko, label: '試合履歴'},
  {suffix: '2xko/2xko_mission_progression_uc.json', group: G.xko, label: 'ミッションの進行'},
  {suffix: '2xko/2xko_payment_history_uc.json', group: G.xko, label: '課金'},
  {suffix: '2xko/2xko_purchase_history_uc.json', group: G.xko, label: 'ゲーム内の購入'},
  {suffix: '2xko/2xko_reward_history_uc.json', group: G.xko, label: '報酬の履歴'},
  {suffix: '2xko/2xko_audio_transcripts_uc.json', group: G.xko, label: 'ボイスチャットの書き起こし'},
  {
    suffix: 'zendesk/zendesk_tickets.json',
    group: G.support,
    label: 'サポートへの問い合わせ',
    personal: ['問い合わせの本文'],
    count: d => (isObj(d) ? Object.keys(d).length : Array.isArray(d) ? d.length : 0),
  },
];

const GROUP_ORDER = Object.values(G);

function defaultCount(data: unknown): number {
  if (Array.isArray(data)) {
    return data.length;
  }
  if (isObj(data)) {
    return Object.keys(data).length;
  }
  return data === undefined || data === null ? 0 : 1;
}

function periodOf(data: unknown, keys: string[] | undefined): Period | null {
  if (!keys || !Array.isArray(data)) {
    return null;
  }
  let from = Infinity;
  let to = -Infinity;
  for (const r of data) {
    if (!isObj(r)) {
      continue;
    }
    for (const k of keys) {
      const t = parseUtc(r[k]);
      if (t != null) {
        from = Math.min(from, t);
        to = Math.max(to, t);
      }
    }
  }
  return Number.isFinite(from) ? {from, to} : null;
}

export function buildInventory(files: ExportFile[]): {
  rows: InventoryRow[];
  personalKinds: string[];
  emptyCount: number;
  period: Period | null;
} {
  const rows: InventoryRow[] = [];
  const personal = new Set<string>();
  let period: Period | null = null;
  const chat = {games: 0, messages: 0, from: Infinity, to: -Infinity, path: ''};

  for (const f of files) {
    const p = norm(f.path);
    if (!p.endsWith('.json')) {
      continue;
    }
    if (/\/chat_logs[^/]*\/[^/]+\/[^/]+\.json$/.test(`/${p}`)) {
      chat.games += 1;
      chat.path ||= f.path.split('/').slice(0, -1).join('/');
      if (isObj(f.data)) {
        const t = parseUtc(f.data.match_date_utc);
        if (t != null) {
          chat.from = Math.min(chat.from, t);
          chat.to = Math.max(chat.to, t);
        }
        if (isObj(f.data.chat_logs)) {
          for (const v of Object.values(f.data.chat_logs)) {
            chat.messages += Array.isArray(v) ? v.length : 0;
          }
        }
      }
      continue;
    }
    const def = DEFS.find(d => p.endsWith(d.suffix));
    const records = f.error ? 0 : (def?.count ?? defaultCount)(f.data);
    const range = periodOf(f.data, def?.dateKeys);
    if (range) {
      period = period ? {from: Math.min(period.from, range.from), to: Math.max(period.to, range.to)} : range;
    }
    if (records > 0) {
      def?.personal?.forEach(k => personal.add(k));
    }
    rows.push({
      group: def?.group ?? G.other,
      label: def?.label ?? f.path.split('/').pop() ?? f.path,
      path: f.path,
      records,
      period: range,
      personal: records > 0 ? (def?.personal ?? []) : [],
      note: f.error ? '読み込めませんでした' : null,
    });
  }

  if (chat.games > 0) {
    const range = Number.isFinite(chat.from) ? {from: chat.from, to: chat.to} : null;
    if (range) {
      period = period ? {from: Math.min(period.from, range.from), to: Math.max(period.to, range.to)} : range;
    }
    rows.push({
      group: G.lol,
      label: 'チャットログ',
      path: `${chat.path}/（${chat.games}ファイル）`,
      records: chat.games,
      period: range,
      personal: chat.messages > 0 ? ['チャットの発言'] : [],
      note: `${chat.games}試合・${chat.messages}発言`,
    });
    if (chat.messages > 0) {
      personal.add('チャットの発言');
    }
  }

  rows.sort((a, b) => {
    const ga = GROUP_ORDER.indexOf(a.group);
    const gb = GROUP_ORDER.indexOf(b.group);
    return ga - gb || b.records - a.records || a.label.localeCompare(b.label, 'ja');
  });

  return {
    rows,
    personalKinds: [...personal],
    emptyCount: rows.filter(r => r.records === 0).length,
    period,
  };
}
