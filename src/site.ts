// The words and addresses that identify the site live here, so renaming or
// moving it is a change in one place. build.mjs reads the same values for the
// page head (title, description, social card).

export const SITE = {
  name: 'Wadachi.gg',
  tagline: 'データ請求で届いたファイルを、年表と図で読む。',
  /** Where the site is served. Social cards need an absolute address. */
  url: 'https://wadachi-gg.pages.dev',
  repoUrl: 'https://github.com/osbourne913/wadachi-gg',
  issuesUrl: 'https://github.com/osbourne913/wadachi-gg/issues',
  /** Shown as the operator on the policy pages. */
  operator: 'Wadachi.gg 運営',
  requestGuideUrl: 'https://support.riotgames.com/ja-jp/riot/account/requesting-your-account-data',
  legalUrl: 'https://www.riotgames.com/ja/legal',
  cloudflarePrivacyUrl: 'https://www.cloudflare.com/ja-jp/privacypolicy/',
  /** The date the policies below took effect. */
  policyDate: '2026年11月21日',
} as const;

/** Section ids used for in-page navigation. */
export const LANDING_NAV = [
  {id: 'how', label: '使い方'},
  {id: 'what', label: '分かること'},
  {id: 'privacy', label: '安全について'},
  {id: 'faq', label: 'よくある質問'},
] as const;

export const REPORT_NAV = [
  {id: 'story', label: '年表'},
  {id: 'share', label: 'シェア'},
  {id: 'play', label: '遊んだ時間'},
  {id: 'spend', label: '課金とストア'},
  {id: 'recent', label: '直近の試合'},
  {id: 'conduct', label: '通報とペナルティ'},
  {id: 'data', label: 'ファイルの中身'},
] as const;

/** The pages besides the app itself. Each is served at /<id>/. */
export const PAGES = [
  {id: 'privacy', label: 'プライバシーポリシー'},
  {id: 'terms', label: '利用規約'},
] as const;
export type PageId = (typeof PAGES)[number]['id'];
