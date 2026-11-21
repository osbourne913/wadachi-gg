// The privacy policy and the terms of use. Plain reading pages: a narrow
// column, numbered sections, and the same footer as the rest of the site.

import type {ReactNode} from 'react';
import {Layout, LayoutContent, VStack} from '@astryxdesign/core/Layout';
import {Heading, Text} from '@astryxdesign/core/Text';
import {Link} from '@astryxdesign/core/Link';
import {SITE, type PageId} from '../site';
import {SiteFooter} from './Landing';

interface Section {
  title: string;
  body: ReactNode[];
}

function P({children}: {children: ReactNode}) {
  return (
    <Text type="body" display="block">
      {children}
    </Text>
  );
}

function Bullets({items}: {items: ReactNode[]}) {
  return (
    <ul className="legal-list">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

function Ext({href, children}: {href: string; children: ReactNode}) {
  return (
    <Link href={href} isExternalLink hasUnderline>
      {children}
    </Link>
  );
}

const PRIVACY: Section[] = [
  {
    title: '1. 基本の考え方',
    body: [
      <P key="a">
        {SITE.name}（以下「本サイト」）は、Riot Gamesのデータ請求で届いたファイルを、利用者のブラウザの中だけで読み込み、集計して表示します。読み込んだファイルの中身を、運営者を含む誰にも送信せず、どこにも保存しません。
      </P>,
    ],
  },
  {
    title: '2. 運営者が取得する情報',
    body: [
      <P key="a">運営者は、利用者の個人情報を取得しません。本サイトには次のものがありません。</P>,
      <Bullets
        key="b"
        items={['アカウント登録やログイン', '入力フォーム', 'Cookie', 'アクセス解析・広告のタグ', 'ブラウザの保存領域（localStorage など）への書き込み']}
      />,
    ],
  },
  {
    title: '3. 読み込んだファイルの扱い',
    body: [
      <Bullets
        key="a"
        items={[
          'ファイルは、利用者の端末のメモリの上で展開・集計します。タブを閉じるか、ページを読み込み直すと消えます。',
          'ファイルに含まれる生年月日、メールアドレス、電話番号、IPアドレス、サポートへの問い合わせの本文は、画面に表示しません（種類と件数だけを表示します）。',
          'チャットログは、利用者本人の発言だけを集計します。',
        ]}
      />,
    ],
  },
  {
    title: '4. 送信していないことの確かめ方',
    body: [
      <Bullets
        key="a"
        items={[
          'ページの設定（Content Security Policy の connect-src \'none\'）により、本サイトのプログラムはブラウザから外部への通信ができません。',
          'ページを開いたあとに通信を切って（機内モードなど）からファイルを読み込んでも、レポートが表示されます。',
          <>
            プログラムの全体は <Ext href={SITE.repoUrl}>GitHub</Ext> で公開しています。
          </>,
        ]}
      />,
    ],
  },
  {
    title: '5. 配信事業者が処理する情報',
    body: [
      <P key="a">
        本サイトは Cloudflare, Inc. のサービス（Cloudflare Pages）で配信しています。ページを開くと、通常のウェブサイトと同様に、IPアドレス、ブラウザの種類、アクセス日時などの通信の情報が Cloudflare で処理されます。この情報に、読み込んだファイルの中身は含まれません。取り扱いは{' '}
        <Ext href={SITE.cloudflarePrivacyUrl}>Cloudflare のプライバシーポリシー</Ext>
        に従います。
      </P>,
    ],
  },
  {
    title: '6. 画面を共有するとき',
    body: [
      <P key="a">
        レポートの画面には、Riot ID、課金額、ログインの日時、本人のチャットの発言などが表示されます。スクリーンショットを共有するときは、写っている内容を確かめてください。届いたzipそのものは、他人やAIサービスに渡さないことをおすすめします。
      </P>,
    ],
  },
  {
    title: '7. 外部サイトへのリンク',
    body: [<P key="a">本サイトからリンクしている Riot Games などの外部サイトでの情報の扱いは、各サイトの方針に従います。</P>],
  },
  {
    title: '8. 変更',
    body: [<P key="a">このポリシーを変更するときは、このページで告知します。</P>],
  },
  {
    title: '9. お問い合わせ',
    body: [
      <P key="a">
        <Ext href={SITE.issuesUrl}>GitHub の Issues</Ext>
        で受け付けています。Issues は誰でも読める場所です。データ請求のファイルやその中身、スクリーンショットは貼らないでください。
      </P>,
    ],
  },
];

const TERMS: Section[] = [
  {
    title: '1. 本サイトについて',
    body: [
      <P key="a">
        {SITE.name}（以下「本サイト」）は、個人が無料で提供するファンメイドのツールです。Riot Games, Inc. が公式に承認・提供するものではなく、Riot Games とは関係がありません。
      </P>,
      <P key="b">本サイトを利用した時点で、この規約に同意したものとみなします。</P>,
    ],
  },
  {
    title: '2. 表示内容',
    body: [
      <Bullets
        key="a"
        items={[
          '表示する数字や文章は、読み込んだファイルを決まったルールで集計した結果です。Riot Games の記録や判断を示すものではありません。',
          '集計の方法（1日を朝5時で区切る、など）やファイルの形式の変更によって、他の方法で数えた結果と違うことがあります。',
          '各年のコメントは、集計結果を決まったルールとひな形に当てはめて作っています。',
        ]}
      />,
    ],
  },
  {
    title: '3. 禁止事項',
    body: [
      <Bullets
        key="a"
        items={[
          '本人の同意なく、他人のデータ請求ファイルを読み込むこと',
          '本サイトの運営を妨げること、または本サイトを不正な目的に使うこと',
          '法令または Riot Games の規約に反すること',
        ]}
      />,
    ],
  },
  {
    title: '4. 免責',
    body: [
      <P key="a">
        本サイトは、現状のまま提供します。表示内容の正確さや、利用者の目的に合うことは保証しません。本サイトの利用によって生じた損害について、運営者は、運営者の故意または重大な過失による場合を除き、責任を負いません。
      </P>,
    ],
  },
  {
    title: '5. 権利',
    body: [
      <Bullets
        key="a"
        items={[
          <>
            本サイトのプログラムは MIT ライセンスで <Ext href={SITE.repoUrl}>GitHub</Ext> に公開しています。
          </>,
          'チャンピオンのアイコンなど Riot Games の素材の権利は、Riot Games, Inc. に帰属します。本サイトは Riot Games の「Legal Jibber Jabber」ポリシーに沿って、これらを利用しています。',
        ]}
      />,
    ],
  },
  {
    title: '6. 変更・停止',
    body: [
      <P key="a">
        運営者は、予告なく本サイトの内容を変更し、または提供を止めることがあります。Riot Games から求められた場合は、速やかに提供を止めます。この規約を変更するときは、このページで告知します。
      </P>,
    ],
  },
  {
    title: '7. 準拠法',
    body: [<P key="a">この規約は日本法に従って解釈します。</P>],
  },
];

const CONTENT: Record<PageId, {title: string; sections: Section[]}> = {
  privacy: {title: 'プライバシーポリシー', sections: PRIVACY},
  terms: {title: '利用規約', sections: TERMS},
};

export function LegalPage({page}: {page: PageId}) {
  const {title, sections} = CONTENT[page];
  return (
    <Layout
      height="auto"
      contentWidth={760}
      content={
        <LayoutContent padding={6} isScrollable={false}>
          <VStack gap={10}>
            <VStack gap={2}>
              <Heading level={1}>{title}</Heading>
              <Text type="supporting" color="secondary">
                {SITE.policyDate} 制定 ・ 運営：{SITE.operator}
              </Text>
            </VStack>
            <VStack gap={8} className="legal">
              {sections.map(s => (
                <VStack key={s.title} gap={3}>
                  <Heading level={2}>{s.title}</Heading>
                  {s.body}
                </VStack>
              ))}
            </VStack>
            <SiteFooter />
          </VStack>
        </LayoutContent>
      }
    />
  );
}
