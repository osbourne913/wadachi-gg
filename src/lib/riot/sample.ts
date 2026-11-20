// A made-up export in the same shape as a real Riot data request, so the page
// can be tried without a file. Every value here is generated; none of it comes
// from a real account.

import type {ExportFile} from './types';

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pad = (n: number) => String(n).padStart(2, '0');
const stamp = (ms: number) => {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
};
const dateOnly = (ms: number) => stamp(ms).slice(0, 10);

const DAY = 86400000;
const HOUR = 3600000;
const JST = 9 * HOUR;
const START = Date.UTC(2019, 2, 14);
const END = Date.UTC(2026, 9, 31);

export const SAMPLE_RIOT_ID = 'サンプル#DEMO';

export function makeSampleExport(): ExportFile[] {
  const r = rng(20261120);
  const pick = <T>(list: readonly T[]) => list[Math.floor(r() * list.length)];
  const between = (lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
  const files: ExportFile[] = [];
  const add = (path: string, data: unknown) => files.push({path, data, size: JSON.stringify(data).length});

  // ---- logins ----
  const ips = Array.from({length: 9}, (_, i) => `203.0.113.${10 + i * 7}`);
  const logins: Record<string, unknown>[] = [];
  // Seconds come from the minute itself, so adding them does not disturb the random sequence.
  const seconds = (ms: number) => ((Math.floor(ms / 60000) * 37) % 60) * 1000;
  const push = (ms: number, type: string, product: string) =>
    logins.push({event_time_utc: stamp(ms + seconds(ms)), event_type: type, ip_address: pick(ips), product});
  // Evening-heavy start hours (JST), with weekend afternoons.
  const weekdayHours = [19, 20, 20, 21, 21, 21, 22, 22, 22, 22, 23, 23, 23, 0, 0, 1];
  const weekendHours = [10, 13, 14, 15, 15, 16, 20, 21, 21, 22, 22, 23, 23, 0, 0, 1, 2];
  for (let day = START; day <= END; day += DAY) {
    const d = new Date(day + JST);
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth();
    const dow = d.getUTCDay();
    const weekend = dow === 0 || dow === 6;
    // Activity level by era, with two long breaks.
    let p = 0.52;
    if (y === 2019) p = 0.38;
    if (y === 2021) p = 0.74;
    if (y === 2022 && m <= 5) p = 0.66;
    if (y === 2023) p = 0.44;
    if (y === 2025) p = 0.58;
    if ((y === 2022 && (m === 8 || m === 9)) || (y === 2024 && m === 1)) p = 0.06;
    if (y === 2021 && m === 7) p = 0.97;
    if (weekend || dow === 5) p = Math.min(0.98, p + 0.16);
    if (r() > p) {
      continue;
    }
    const sessions = weekend ? between(1, 3) : between(1, 2);
    for (let s = 0; s < sessions; s++) {
      const hour = pick(weekend ? weekendHours : weekdayHours);
      // Hours 0-2 belong to the night that started on this calendar day.
      const startJst = day + (hour < 5 ? 24 + hour : hour) * HOUR + between(0, 59) * 60000;
      const t = startJst - JST;
      if (day >= Date.UTC(2023, 8, 19)) {
        push(t - 40000, 'Login', 'riot_client');
      }
      push(t, 'Login', 'League/TFT PC');
      push(t + between(25, 140) * 60000, 'Logout', 'League/TFT PC');
    }
    if (y === 2021 && m >= 3 && m <= 9 && r() < 0.34) {
      const t = day + between(20, 23) * HOUR - JST + between(0, 59) * 60000;
      push(t, 'Connected', 'VALORANT');
      push(t + between(30, 90) * 60000, 'Closed', 'VALORANT');
    }
    if (y === 2022 && m <= 2 && r() < 0.18) {
      push(day + between(20, 23) * HOUR - JST, 'Connected', 'VALORANT');
    }
    if (y === 2020 && m >= 3 && m <= 8 && r() < 0.2) {
      push(day + between(7, 9) * HOUR - JST, 'Login', 'TFTm');
    }
    if (((y === 2020 && m >= 10) || (y === 2021 && m <= 0)) && r() < 0.22) {
      push(day + between(12, 13) * HOUR - JST, 'Login', 'Wild Rift');
    }
    if (r() < 0.012) {
      push(day + 3 * HOUR, 'Authentication', 'rso-prod');
    }
  }
  logins.sort((a, b) => String(a.event_time_utc).localeCompare(String(b.event_time_utc)));
  add('riotAccount/atlas_login_event_uc.json', logins);

  // ---- store and RP top-ups ----
  const store: Record<string, unknown>[] = [];
  const charges: Record<string, unknown>[] = [];
  let rpBal = 0;
  let beBal = 6300;
  let txn = 0;
  const tx = (ms: number, type: string, item: string, rp = 0, be = 0) => {
    rpBal += rp;
    beBal += be;
    txn += 1;
    store.push({
      created: stamp(ms),
      id: `DEMO-${String(txn).padStart(6, '0')}`,
      ip_address: pick(ips),
      ip_balance: beBal,
      ip_delta: be,
      is_refunded: '0',
      item_id: item,
      rp_balance: rpBal,
      rp_delta: rp,
      type,
    });
  };
  const tiers: [number, number][] = [
    [610, 525],
    [1600, 1450],
    [3060, 2825],
    [5500, 5200],
  ];
  const favourites = [222, 103, 157, 81, 99, 412, 64, 236];
  const anyChampion = [1, 12, 16, 21, 22, 25, 37, 40, 43, 51, 53, 54, 55, 61, 63, 67, 86, 89, 92, 98, 104, 110, 117, 122, 143, 145, 202, 221, 235, 267, 350, 498, 517, 555, 777, 875, 887, 895];
  const skinOf = (champion: number) => `championsskin_${champion * 1000 + between(1, 28)}`;
  const owned = new Set<number>();
  for (let day = START + 3 * DAY; day <= END; day += DAY) {
    const y = new Date(day).getUTCFullYear();
    const t = day + between(11, 15) * HOUR + between(0, 3599) * 1000;
    // Free loot and event rewards.
    if (r() < 0.2) {
      tx(t, 'PURCHASE', `hextech_crafting_${pick([1, 3, 7, 7, 7, 7, 209, 369])}`);
    }
    if (r() < 0.05) {
      tx(t + 60000, 'PURCHASE', `summoner_icon_${between(900, 6200)}`);
    }
    if (r() < 0.04) {
      tx(t + 90000, 'PURCHASE', `emote_${between(1500, 5200)}`);
    }
    if (r() < 0.03) {
      tx(t + 120000, 'PURCHASE', skinOf(pick(anyChampion)));
    }
    if (r() < 0.012) {
      tx(t + 150000, 'PURCHASE', `wardskin_${between(10, 220)}`);
    }
    // Blue essence: earned quietly, spent on champions.
    beBal += between(0, 260);
    if (owned.size < 96 && beBal > 6300 && r() < 0.16) {
      const champion = pick([...anyChampion, ...favourites, between(2, 150)]);
      if (!owned.has(champion)) {
        owned.add(champion);
        tx(t + 200000, 'PURCHASE', `champions_${champion}`, 0, -pick([3150, 4800, 4800, 6300]));
      }
    }
    // Real-money top-ups, heavier in 2021 and 2024.
    const chargeRate = y === 2021 ? 0.012 : y === 2024 ? 0.011 : y === 2019 ? 0.002 : 0.0045;
    if (r() < chargeRate) {
      const [yen, rp] = pick(y >= 2023 ? tiers : tiers.slice(1));
      charges.push({
        amount: `${yen}.0`,
        created: stamp(t + 300000),
        currency_type: 'JPY',
        payment_type: 'softbank-creditcard',
        store_account_id: 1000001,
        transaction_id: `demo-${charges.length + 1}`,
        transaction_number: `DEMO${charges.length + 1}`,
        user_ip: pick(ips),
      });
      tx(t + 300000, 'USER_PURCHASED_RP', 'rp_1000', rp);
    }
    // Spend RP while there is some.
    if (rpBal >= 1350 && r() < 0.5) {
      const roll = r();
      if (roll < 0.62) {
        tx(t + 400000, 'PURCHASE', skinOf(pick(r() < 0.6 ? favourites.slice(0, 3) : favourites)), -pick([975, 1350, 1350, 1820]));
      } else if (roll < 0.86) {
        tx(t + 400000, 'PURCHASE', `bundles_${between(99900100, 99900900)}`, -Math.min(rpBal, pick([1650, 2400, 2650])));
      } else if (roll < 0.95) {
        tx(t + 400000, 'PURCHASE', `event_pass_${between(10, 60)}`, -1650);
      } else {
        const gift = skinOf(pick(anyChampion));
        tx(t + 400000, 'PURCHASED_GIFT', gift, -1350);
        tx(t + 400000, 'ITEM_TRANSFER_SENT', gift);
      }
    } else if (rpBal >= 125 && r() < 0.03) {
      tx(t + 500000, 'PURCHASE', 'hextech_crafting_3', -125);
    }
  }
  add('leagueoflegends/store_transactions_uc.json', store);
  add('leagueoflegends/rp_purchase_history_uc.json', charges);

  // ---- chat logs: the last 100 games ----
  const lines = ['gg', 'ty', 'ty', 'よろしく', 'よろしく', 'nice', 'mb', 'ごめん', 'ドラゴンいこう', 'gj', 'ok', 'バロンいける', 'wp'];
  const gameDates: number[] = [];
  for (let day = END; gameDates.length < 100; day -= DAY) {
    const dow = new Date(day).getUTCDay();
    if (r() < (dow === 5 || dow === 6 ? 0.8 : 0.42)) {
      const n = Math.min(100 - gameDates.length, dow === 6 ? between(3, 8) : between(1, 5));
      for (let i = 0; i < n; i++) {
        gameDates.push(day);
      }
    }
  }
  gameDates.reverse();
  gameDates.forEach((day, i) => {
    const id = 700100000 + i * 137 + between(0, 90);
    const start = day + 13 * HOUR + (i % 8) * 38 * 60000;
    const say = (n: number, offset: number) =>
      Array.from({length: n}, (_, k) => ({
        chat: pick(lines),
        riot_id: SAMPLE_RIOT_ID,
        sent_to: r() < 0.9 ? 'TEAM' : 'ALL',
        timestamp: start + offset + k * 41000,
      }));
    const talks = r() < 0.36;
    add(`leagueoflegends/chat_logs_v2_uc/successes/${id}.json`, {
      chat_logs: {
        in_game: talks ? say(between(0, 3), 9 * 60000) : [],
        post_game: talks && r() < 0.25 ? say(1, 31 * 60000) : [],
        pre_game: talks ? say(between(1, 2), 0) : [],
      },
      game_id: id,
      match_date_utc: dateOnly(day),
      platform_id: 'jp1',
      success: true,
      was_failure: false,
    });
  });

  // ---- conduct ----
  add('leagueoflegends/grouped_reports.json', {
    reports_made: null,
    reports_received: {NEGATIVE_ATTITUDE: 3, LEAVING_AFK: 2, VERBAL_ABUSE: 1},
  });
  add('penalties/penalty_history.json', [
    {
      date_issued: '2024-06-09T14:12:40Z',
      is_manual: false,
      restriction_reason: 'LEAVER_BUSTER',
      restriction_type: null,
      scope: 'LEAGUE_OF_LEGENDS',
      sentence: 'GAMES_PLAYED',
      status: 'LAPSED',
    },
  ]);

  // ---- other games ----
  const valorant: Record<string, unknown>[] = [];
  for (let i = 0; i < 64; i++) {
    const t = Date.UTC(2021, 3, 6) + between(0, 320) * DAY + between(11, 15) * HOUR;
    const practice = r() < 0.2;
    valorant.push({
      game_end_time_utc: stamp(t + between(practice ? 5 : 26, practice ? 14 : 44) * 60000),
      game_id: `demo-val-${i}`,
      game_mode: practice ? 'ShootingRange' : 'Matchmaking',
      game_outcome: practice ? 'Loss' : r() < 0.47 ? 'Win' : 'Loss',
      game_start_time_utc: stamp(t),
      game_type: practice ? 'Not Applicable' : r() < 0.84 ? 'Unrated' : 'Deathmatch',
      realm_id: 'ap',
    });
  }
  add('valorant/valorant_match_history_uc.json', valorant);
  const wildrift: Record<string, unknown>[] = [];
  for (let i = 0; i < 14; i++) {
    const t = Date.UTC(2020, 10, 2) + between(0, 80) * DAY + 3 * HOUR;
    const tutorial = i < 4;
    wildrift.push({
      account_level: tutorial ? 0 : between(3, 11),
      game_end_time_utc: stamp(t + between(4, 19) * 60000),
      game_id: `demo-wr-${i}`,
      game_mode: tutorial ? `Tutorial ${i + 1}` : "Summoner's Rift",
      game_outcome: tutorial ? 'Noncompetitive' : r() < 0.55 ? 'Victory' : 'Defeat',
      game_start_time_utc: stamp(t),
      game_type: tutorial ? 'AI' : 'Normal',
      player_rank: tutorial ? null : 'Iron III',
    });
  }
  add('wildrift/wildrift_match_history_uc.json', wildrift);
  add('wildrift/wildrift_inventory.json', {
    champions: ['Garen', 'Lux', 'Jinx', 'Ahri', 'Yasuo', 'Ashe', 'Annie', 'Master Yi'],
    skins: [{champion_name: 'Academy Ahri', skin_name: 'Ahri'}],
  });
  add('legendsofruneterra/lor_match_history_uc.json', []);
  add('valorant/valorant_payment_event_uc.json', []);
  add('2XKO/2xko_game_match_history_uc.json', []);

  // ---- account ----
  add('riotAccount/account_info.json', {
    date_of_birth: '2000-01-01',
    email: 'sample@example.com',
    game_name: 'サンプル',
    tagline: 'DEMO',
    username: 'sample_account',
  });
  add('leagueoflegends/summoner.json', {lol_platform: 'JP1', riot_id: SAMPLE_RIOT_ID});
  add('riotAccount/account_audit_events_v2_uc.json', [
    {description: 'delivered', event_date: '2019-03-14 10:02:11', event_type: 'EMAIL'},
    {description: 'password', event_date: '2021-02-03 12:40:09', event_type: 'USER_FIELD_CHANGED'},
    {description: null, event_date: '2021-02-03 12:40:10', event_type: 'PASSWORD_RESET'},
    {description: 'delivered', event_date: '2021-02-03 12:40:31', event_type: 'EMAIL'},
    {description: null, event_date: '2023-11-21 05:12:44', event_type: 'SUMMONER_MIGRATION'},
    {description: 'delivered', event_date: '2025-06-18 09:30:02', event_type: 'EMAIL'},
    {description: null, event_date: '2025-06-18 09:29:40', event_type: 'ANOMALOUS_ACTIVITY'},
  ]);
  add('zendesk/zendesk_tickets.json', {
    '900001': {
      comments: [
        {author: 'Player', comment: '（サンプル）', create_datetime: '2022-04-02 08:15:00'},
        {author: 'Agent', comment: '（サンプル）', create_datetime: '2022-04-03 02:40:00'},
      ],
      create_datetime: '2022-04-02 08:15:00',
      status: 'closed',
      subject: 'RPが反映されません',
      ticket_id: '900001',
    },
  });
  return files;
}
