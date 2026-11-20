// Japanese labels for the codes that appear in Riot's export. Anything not listed
// falls back to the raw code, so an unknown value is shown rather than hidden.

function lookup(table: Record<string, string>, code: string | null | undefined, fallback?: string): string {
  if (code == null || code === '') {
    return fallback ?? '—';
  }
  return table[code] ?? code;
}

// ---------- Login log: product ----------

export interface ProductInfo {
  label: string;
  /** A game the player launches, as opposed to a launcher or a sign-in service. */
  isGame: boolean;
}

const PRODUCTS: Record<string, ProductInfo> = {
  'League/TFT PC': {label: 'LoL・TFT（PC）', isGame: true},
  lol: {label: 'LoL・TFT（PC）', isGame: true},
  VALORANT: {label: 'VALORANT', isGame: true},
  TFTm: {label: 'TFT（モバイル）', isGame: true},
  'Wild Rift': {label: 'ワイルドリフト', isGame: true},
  'Legends of Runeterra': {label: 'レジェンド・オブ・ルーンテラ', isGame: true},
  '2XKO': {label: '2XKO', isGame: true},
  riot_client: {label: 'Riot Client（ランチャー）', isGame: false},
  'rso-prod': {label: 'Webサインイン', isGame: false},
  'rso-authenticator-prod': {label: '認証アプリ・2段階認証', isGame: false},
};

export function productInfo(code: string | null | undefined): ProductInfo {
  if (code == null || code === '') {
    return {label: '不明', isGame: false};
  }
  return PRODUCTS[code] ?? {label: code, isGame: false};
}

/** Event types that mean "a session began", across the different products. */
export const LOGIN_START_EVENTS = new Set(['Login', 'Connected', 'Session Start']);

// ---------- Store log ----------

const STORE_CATEGORIES: Record<string, string> = {
  hextech_crafting: 'ヘクステック（宝箱・鍵など）',
  championsskin: 'スキン・クロマ',
  summoner_icon: 'サモナーアイコン',
  champions: 'チャンピオン',
  emote: 'エモート',
  bundles: 'バンドル',
  runes: 'ルーン（旧仕様）',
  wardskin: 'ワードスキン',
  boosts: 'ブースト',
  rp: 'RP',
  rp_gift: 'RPのギフト',
  event_pass: 'イベントパス',
  achievement_title: '称号',
  companion: 'リトルレジェンド',
  currency: 'ゲーム内通貨',
  progression: '進行アイテム',
  tft_map_skin: 'TFTアリーナ',
  tft_damage_skin: 'TFTブーム',
  spellbook: 'スペルブック',
  statstone: 'エターナル',
  skin_augment: 'スキン拡張',
  regalia: 'レガリア',
};

export function storeCategoryLabel(key: string): string {
  return lookup(STORE_CATEGORIES, key);
}

/** "championsskin_84013" -> "championsskin" */
export function storeCategoryOf(itemId: string): string {
  const key = itemId.replace(/_\d+$/, '');
  return key === '' ? itemId : key;
}

/** Purchases made for someone else. */
export const STORE_OUTGOING = new Set([
  'PURCHASED_GIFT',
  'PURCHASED_MYSTERY_GIFT',
  'ITEM_TRANSFER_SENT',
  'RP_TRANSFER_SENT',
]);
/** RP top-ups. */
export const STORE_TOPUP = new Set(['USER_PURCHASED_RP', 'USER_PURCHASED_RP_GIFT']);

const PAYMENT_TYPES: Record<string, string> = {
  'softbank-creditcard': 'クレジットカード',
  SB_PrepaidCard: 'プリペイドカード',
  paypal: 'PayPal',
  creditcard: 'クレジットカード',
  prepaidcard: 'プリペイドカード',
};

export function paymentLabel(code: string | null | undefined): string {
  return lookup(PAYMENT_TYPES, code);
}

// ---------- Reports and penalties ----------

const REPORT_CATEGORIES: Record<string, string> = {
  ASSISTING_ENEMY_TEAM: '敵チームへの加担',
  BOTTING: 'ボット・不正ツール',
  LEAVING_AFK: '放置・途中抜け',
  RANK_MANIPULATION: 'ランク操作',
  VERBAL_ABUSE: '暴言',
  NEGATIVE_ATTITUDE: '否定的な態度',
  HATE_SPEECH: 'ヘイトスピーチ',
  CHEATING: 'チート',
  INAPPROPRIATE_NAME: '不適切な名前',
  THIRD_PARTY_TOOLS: '外部ツール',
  DISRUPTIVE_GAMEPLAY: '迷惑なプレイ',
  THREATS: '脅迫',
  INTENTIONAL_FEEDING: '故意のデス',
  SPAM: 'スパム',
};

export function reportCategoryLabel(code: string): string {
  return lookup(REPORT_CATEGORIES, code);
}

const PENALTY_REASONS: Record<string, string> = {
  LEAVER_BUSTER: '放置・途中抜け（リーバーバスター）',
  HONOR_RESTRICTION: '名誉レベルの制限',
  CHAT_ABUSE: 'チャットでの違反',
  INTENTIONAL_FEEDING: '故意のデス',
  CHEATING: 'チート',
  RANKED_RESTRICTION: 'ランク戦の制限',
  INAPPROPRIATE_NAME: '不適切な名前',
};
const PENALTY_STATUS: Record<string, string> = {
  LAPSED: '終了',
  ACTIVE: '有効',
  EXPIRED: '期限切れ',
  REVOKED: '取り消し',
  PENDING: '保留',
};
const PENALTY_SENTENCE: Record<string, string> = {
  PERMANENT: '期限の定めなし',
  GAMES_PLAYED: '試合数で解除',
  TIME: '期間で解除',
  TIMED: '期間で解除',
};
const PENALTY_SCOPE: Record<string, string> = {
  LEAGUE_OF_LEGENDS: 'LoL',
  VALORANT: 'VALORANT',
  TEAMFIGHT_TACTICS: 'TFT',
  WILD_RIFT: 'ワイルドリフト',
  LEGENDS_OF_RUNETERRA: 'LoR',
  RIOT: 'アカウント全体',
};
const PENALTY_TYPE: Record<string, string> = {
  REPUTATION_LIMIT: '名誉の上限',
  TEXT_CHAT_RESTRICTION: 'テキストチャット制限',
  VOICE_CHAT_RESTRICTION: 'ボイスチャット制限',
  QUEUE_RESTRICTION: 'キュー制限',
  RANKED_RESTRICTION: 'ランク戦の制限',
  GAME_BAN: 'ゲームBAN',
  TIME_BAN: '期間BAN',
  PERMANENT_BAN: '永久BAN',
};

export const penaltyReasonLabel = (c: string | null | undefined) => lookup(PENALTY_REASONS, c);
export const penaltyStatusLabel = (c: string | null | undefined) => lookup(PENALTY_STATUS, c);
export const penaltySentenceLabel = (c: string | null | undefined) => lookup(PENALTY_SENTENCE, c);
export const penaltyScopeLabel = (c: string | null | undefined) => lookup(PENALTY_SCOPE, c);
export const penaltyTypeLabel = (c: string | null | undefined) => lookup(PENALTY_TYPE, c, '—');

// ---------- Account audit events ----------

const AUDIT_EVENTS: Record<string, string> = {
  PASSWORD_CHANGED: 'パスワードを変更',
  PASSWORD_RESET: 'パスワードをリセット',
  EMAIL_VALIDATION_REQUESTED: 'メールアドレスの確認を依頼',
  SEND_VALIDATION_EMAIL: '確認メールを送信',
  EMAIL: 'Riotからメールを送信',
  USER_FIELD_CHANGED: 'アカウント情報を変更',
  SUMMONER_MIGRATION: 'サモナー名をRiot IDへ移行',
  FEDERATED_IDENTITY_CREATED: '外部アカウントと連携',
  FEDERATED_IDENTITY_REMOVED: '外部アカウントの連携を解除',
  ANOMALOUS_ACTIVITY: '通常と異なる操作を検知',
  MFA_ENABLED: '2段階認証を有効化',
  MFA_DISABLED: '2段階認証を無効化',
  EMAIL_CHANGED: 'メールアドレスを変更',
  USERNAME_CHANGED: 'ユーザー名を変更',
  GAME_NAME_CHANGED: 'Riot IDを変更',
};
const AUDIT_FIELDS: Record<string, string> = {
  password: 'パスワード',
  username: 'ユーザー名',
  email: 'メールアドレス',
  delivered: '配信済み',
  'password updated': 'パスワード更新',
  'active verified phone number': '電話番号を確認済み',
};

export function auditLabel(code: string): string {
  return lookup(AUDIT_EVENTS, code);
}
export function auditDetailLabel(detail: string | null | undefined): string | null {
  if (!detail) {
    return null;
  }
  const known = AUDIT_FIELDS[detail];
  if (known) {
    return known;
  }
  // Riot's internal notes (table names, migration ids) mean nothing to a reader.
  return /[_>]|->/.test(detail) || detail.length > 40 ? null : detail;
}
/** Events worth a second look when reviewing account security. */
export const AUDIT_SECURITY = new Set([
  'PASSWORD_CHANGED',
  'PASSWORD_RESET',
  'USER_FIELD_CHANGED',
  'ANOMALOUS_ACTIVITY',
  'FEDERATED_IDENTITY_CREATED',
  'FEDERATED_IDENTITY_REMOVED',
  'MFA_ENABLED',
  'MFA_DISABLED',
  'EMAIL_CHANGED',
  'USERNAME_CHANGED',
]);

// ---------- Support tickets ----------

const TICKET_STATUS: Record<string, string> = {
  open: '対応中',
  closed: '完了',
  solved: '解決済み',
  pending: '返信待ち',
  new: '新規',
  hold: '保留',
};
export const ticketStatusLabel = (c: string | null | undefined) => lookup(TICKET_STATUS, c);
