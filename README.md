# Wadachi.gg

Wadachi（轍・わだち）は、通ったあとに残る跡のこと。

Riot Games のデータ請求で届いた zip を置くと、ログインの年表、課金、ストア、直近の試合を、図と文章のレポートにするサイトです。

**ファイルはブラウザの中だけで読み、どこにも送信しません。** サーバーはページを配るだけで、読み込んだ内容を受け取る仕組みがありません。

Wadachi.gg は Riot Games の公式サービスではありません（下の「Riot Games のポリシー」）。

## 送信していないことの確かめ方

- **ネットを切って試す**: ページを開いたあとに機内モードなどで通信を切り、それから zip を置いてもレポートが出ます。
- **ページの設定**: `index.html` と `public/_headers` の Content Security Policy で `connect-src 'none'` を指定しています。ページのプログラムは、ブラウザから外部への通信を一切できません。
- **コード**: 外部と通信する処理（`fetch`、`XMLHttpRequest`、`WebSocket` など）はありません。ブラウザの保存領域（`localStorage` など）も Cookie も使いません。

## 表示しないもの

生年月日、メールアドレス、電話番号、IPアドレス、サポートへの問い合わせの本文は、ファイルに入っていても画面に出しません（種類と件数だけを「ファイルの中身」に出します）。チャットログは本人の発言だけを集計します。

## 動かす

Node.js 22 以上が必要です。

```
npm install
npm run build       # dist/ に出力（静的ファイルのみ）
npm run serve       # http://localhost:4173 で dist/ を表示
npm run typecheck   # 型チェック
npm run story -- --sample   # 年表のコメントをサンプルで出力
```

## 公開（Cloudflare Pages）

GitHub のリポジトリを Cloudflare Pages につなぎ、次のように設定します。

| 項目 | 値 |
| --- | --- |
| Framework preset | None |
| Build command | `npm run build` |
| Build output directory | `dist` |
| 環境変数 | `NODE_VERSION` = `22` |

`public/_headers` のセキュリティヘッダー（CSP など）は、Cloudflare Pages がそのまま付けます。公開先の URL が変わったら `src/site.ts` の `SITE.url` を直してください（OGP の画像の URL に使います）。

## 構成

| 場所 | 役割 |
| --- | --- |
| `src/site.ts` | サイト名、URL、リンク、ナビゲーションの項目 |
| `src/App.tsx` | 画面の枠（Astryx の shell-top-nav テンプレート）と、入口／レポート／ポリシーの切り替え |
| `src/pages/Landing.tsx` | 入口ページ（centered-hero テンプレート）とフッター |
| `src/pages/Report.tsx` | レポート。上に年表、その下に各セクションと「読み取れたこと」（dashboard-scorecard テンプレート） |
| `src/pages/Legal.tsx` | プライバシーポリシーと利用規約（`/privacy/`、`/terms/`） |
| `src/sections/Story.tsx` | 年表。広い画面は年のカードを固定してコメントを流し、狭い画面は1年＝1枚のカードを縦に並べる |
| `src/sections/` | レポートの各セクション。図の題名は「項目：値」の形 |
| `src/charts/` | 図の部品。色は Astryx のデータ用トークンだけを使う |
| `src/lib/readExport.ts` | zip／JSON の読み込み（展開後の大きさに上限あり） |
| `src/lib/riot/analyze.ts` | 集計。画面は集計結果（`Report`）だけを読む |
| `src/lib/riot/story.ts` | 年表のコメント（下の「年表のコメント」） |
| `src/lib/riot/sample.ts` | サンプル表示用の架空データ |
| `public/` | アイコン、OGP 画像、`_headers`、`robots.txt` |
| `build.mjs` | ビルド。各ページの `<head>` を `src/site.ts` から埋める |
| `scripts/` | 確認用のスクリプト（下） |

## 年表のコメント

AI は使っていません。ブラウザの中で数えた結果を、`src/lib/riot/story.ts` のルールに当てはめています。

1. 年ごとに「出来事の候補」を集めます（記録の開始、100日目と500日ごとの節目、歴代最多・最少、30日以上の空白、最長の連続ログイン、初めての課金と直後の購入、新しく始めたゲーム、深夜の割合の変化、スキン入手の偏り など）。候補には重みがあります。
2. 同じ話題は1つにまとめ、重みの順に上位2つ（重みが大きければ3つ目も）を選びます。
3. いちばん重い候補の短い名前が、その年のタグ（「全盛期」「初課金」など）になります。

ペナルティや通報は年表に出しません。1日は朝5時で区切り、深夜は22時〜翌2時です。

## 確認用のスクリプト

Playwright が必要です（`npm i -D playwright && npx playwright install chromium`）。

```
npm run serve &
node scripts/site-check.mjs http://localhost:4173/ <zip>        # 全ページ、CSP違反、通信を切った状態での動作、ヘッダー
node scripts/story-check.mjs dist/index.html <出力先>            # 年表の動き
node scripts/check.mjs dist/index.html <出力先>                  # ナビ、ツールチップ、表への切り替え
node scripts/edge.mjs dist/index.html <出力先> <zip>...          # 変わったファイルで落ちないか
node scripts/shot.mjs dist/index.html <接頭辞> --w=1280,390 --full
node scripts/og.mjs http://localhost:4173/                       # OGP 画像を作り直す
```

データ請求の zip や、そこから取り出したファイルはコミットしないでください（`.gitignore` で `*.zip` を除外しています）。

## デザイン

- デザインシステム: [Astryx](https://www.npmjs.com/package/@astryxdesign/core)、テーマは neutral。
- 画面の色は無彩色だけにして、色は図のデータ（青1色＋灰色、注記だけオレンジ）に使う。
- ライト／ダークは閲覧環境に合わせ、右上のボタンでその場だけ切り替えられる。
- 文字は Figtree（英数字のみ、ビルド時に埋め込み）と、端末の日本語ゴシック。

## Riot Games のポリシー

Wadachi.gg は Riot Games の「Legal Jibber Jabber」ポリシーに沿ったファンメイドのプロジェクトです。無料で、広告もありません。

Wadachi.gg was created under Riot Games' "Legal Jibber Jabber" policy using assets owned by Riot Games. Riot Games does not endorse or sponsor this project.

Wadachi.gg isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc.

- サイト名・ドメイン・タグに Riot Games の商標は使っていません。ロゴも使っていません。
- チャンピオンのアイコン（`src/lib/riot/championIcons.ts`）は Data Dragon の画像で、権利は Riot Games, Inc. にあります。MIT ライセンスの対象外です。

## ライセンス

ソースコードは [MIT](LICENSE)。Riot Games の素材と Figtree フォント（SIL OFL 1.1）は対象外です。
