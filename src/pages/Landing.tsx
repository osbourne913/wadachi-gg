// The entry page. Its frame is Astryx's centered-hero template: a centered
// headline, a short blurb and the call to action, resting on one wide picture.
// Here the call to action is the drop zone, and the picture is the product
// itself: two real charts drawn from sample data.

import {useState} from 'react';
import {HStack, Layout, LayoutContent, StackItem, VStack} from '@astryxdesign/core/Layout';
import {Grid} from '@astryxdesign/core/Grid';
import {Heading, Text} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {Card} from '@astryxdesign/core/Card';
import {CodeBlock} from '@astryxdesign/core/CodeBlock';
import {Icon, type IconType} from '@astryxdesign/core/Icon';
import {Link} from '@astryxdesign/core/Link';
import {Divider} from '@astryxdesign/core/Divider';
import {FileInput} from '@astryxdesign/core/FileInput';
import {List, ListItem} from '@astryxdesign/core/List';
import {Collapsible, CollapsibleGroup} from '@astryxdesign/core/Collapsible';
import {
  ArrowRight,
  CalendarDays,
  EyeOff,
  FolderSearch,
  LockKeyhole,
  MessageSquare,
  ShieldAlert,
  ShieldCheck,
  Store,
  Trash2,
  Unplug,
  Wallet,
  WifiOff,
} from 'lucide-react';
import {PAGES, SITE} from '../site';
import type {Report} from '../lib/riot/types';
import {StoryPreview} from '../sections/Story';
import {num} from '../lib/format';
import {CardGrid, SectionHeading, useIsPhone} from '../sections/parts';

/** A few rows of one raw file, to show what arrives from Riot. */
export interface RawExample {
  path: string;
  code: string;
  rows: number;
  shown: number;
}

interface Props {
  /** A report built from the synthetic sample, for the live preview. */
  preview: Report;
  /** The same sample as it looks in the file. */
  raw: RawExample | null;
  isBusy: boolean;
  error: string | null;
  onFiles: (files: File | File[]) => void;
  onClearError: () => void;
  onSample: () => void;
}

const STEPS: {title: string; body: string; link?: {label: string; href: string}}[] = [
  {
    title: 'Riotにデータを請求する',
    body: 'Riotサポートの「個人アカウントのデータと履歴のリクエスト」から申し込みます。処理に30日かかると案内されています。',
    link: {label: 'Riotサポートの案内を開く', href: SITE.requestGuideUrl},
  },
  {
    title: '届いたzipをそのまま置く',
    body: '解凍は要りません。解凍してしまった場合は、中の .json をまとめて選んでも読み込めます。',
  },
  {
    title: 'レポートを読む',
    body: '数秒で、図と文章のレポートになります。どの図も表に切り替えて、正確な数字を確かめられます。',
  },
];

const FEATURES: {icon: IconType; title: string; body: string}[] = [
  {
    icon: CalendarDays,
    title: '年表と遊んだ時間',
    body: '1年ずつの年表と、その年に起きたこと。何曜日の何時に遊んでいるか。',
  },
  {
    icon: Wallet,
    title: '課金',
    body: '年ごとの課金額と、RPチャージの一覧。合計がひと目で分かります。',
  },
  {
    icon: Store,
    title: 'ストア',
    body: 'RPとブルーエッセンスの使い道。スキンをいちばん持っているチャンピオン。',
  },
  {
    icon: MessageSquare,
    title: '直近の試合',
    body: '直近3か月（最大100試合）の、1日ごとの試合数とチャットの回数。',
  },
  {
    icon: ShieldAlert,
    title: '通報とペナルティ',
    body: '受けた通報の内訳と、ペナルティの履歴。記録されているままを表示します。',
  },
  {
    icon: FolderSearch,
    title: 'ファイルの中身',
    body: 'Riotがどんなデータを何件持っているか。個人情報がどこに入っているか。',
  },
];

const PROMISES: {icon: IconType; title: string; body: string}[] = [
  {
    icon: Unplug,
    title: 'ファイルを送信しません',
    body: '読み込みと集計は、すべてこの端末のブラウザの中で行います。ページを開いたあとは、通信を切っても動きます。',
  },
  {
    icon: Trash2,
    title: '保存しません',
    body: '読み込んだ内容はどこにも保存しません。ページを閉じるか読み込み直すと消えます。',
  },
  {
    icon: EyeOff,
    title: '個人情報は画面に出しません',
    body: '生年月日、メールアドレス、電話番号、IPアドレス、問い合わせの本文は、ファイルに入っていても表示しません。',
  },
  {
    icon: ShieldCheck,
    title: 'ログインは要りません',
    body: 'Riot IDやパスワードを入力する場面はありません。Riot Gamesの公式サービスではありません。',
  },
  {
    icon: WifiOff,
    title: '自分で確かめられます',
    body: 'ページを開いたあとに機内モードにしてからファイルを置いても、レポートが出ます。ページの設定で外部への通信を禁止していて、プログラムもGitHubで公開しています。',
  },
];

const FAQ: {id: string; q: string; a: string[]; link?: {label: string; href: string}}[] = [
  {
    id: 'stats',
    q: 'LoLの戦績（勝敗やKDA）は見られますか？',
    a: [
      '見られません。データ請求のファイルには、LoLの試合ごとの成績が入っていないためです。',
      'LoLについて入っているのは、ログイン、ストア、課金、通報、ペナルティと、直近の試合のチャットログです。VALORANT、ワイルドリフト、レジェンド・オブ・ルーンテラは、ファイルに試合ごとの記録があれば、試合数と勝敗を表示します。',
    ],
  },
  {
    id: 'get',
    q: 'ファイルはどこでもらえますか？',
    a: [
      'Riotサポートの「個人アカウントのデータと履歴のリクエスト」から申し込むと、準備ができたときにダウンロードのリンクが届きます。リンクは30日で切れるので、届いたら早めに保存してください。',
      '処理を待っているあいだにメールアドレスの変更やパスワードのリセットをすると、請求は自動で取り消されます。',
    ],
    link: {label: 'Riotサポートの案内を開く', href: SITE.requestGuideUrl},
  },
  {
    id: 'phone',
    q: 'スマホでも使えますか？',
    a: ['使えます。zipを「ファイル」アプリなどに保存してから、このページで選んでください。'],
  },
  {
    id: 'fail',
    q: '読み込めないときは？',
    a: [
      'Riotから届いたzipを、そのまま選んでいるか確かめてください。名前を変えただけなら読めますが、別の形式に圧縮し直したものは読めません。',
      '解凍済みの場合は、フォルダの中の .json をまとめて選ぶと読み込めます。',
    ],
  },
  {
    id: 'time',
    q: '時刻や日付は、どの基準ですか？',
    a: [
      'ファイルの時刻はUTCで記録されています。このページでは、お使いの端末のタイムゾーンに直して集計します。',
      '夜ふかしの分が翌日にずれないよう、1日は朝5時始まりで数えています。',
    ],
  },
  {
    id: 'ai',
    q: 'AIに渡して図にしてもらうのと、何が違いますか？',
    a: [
      'AIサービスに渡すと、ファイルはそのサービスのサーバーに送られ、会話と一緒に残ります。ファイルには生年月日やメールアドレス、IPアドレスも入っています。',
      'このページは、ファイルをどこにも送らずに、この端末の中だけで図にします。',
    ],
  },
  {
    id: 'official',
    q: 'Riot公式のサービスですか？',
    a: [`いいえ。${SITE.name}は個人が作っているファンメイドのツールで、Riot Gamesとは関係がありません。`],
  },
];

function Hero({isBusy, error, onFiles, onClearError, onSample}: Omit<Props, 'preview' | 'raw'>) {
  const [picked, setPicked] = useState<File | File[] | null>(null);
  return (
    <VStack gap={6} hAlign="center">
      <VStack gap={3} hAlign="center">
        <Heading level={1} type="display-2" justify="center" textWrap="balance">
          Riotから届いたファイルを、読める形に。
        </Heading>
        <Text type="body" color="secondary" justify="center" textWrap="balance">
          データ請求で届いたzipを置くだけ。ログイン、課金、ストア、直近の試合の記録を、図と文章のレポートにまとめます。
        </Text>
      </VStack>
      <VStack gap={3} hAlign="stretch" className="hero-drop">
        <FileInput
          mode="dropzone"
          label="Riotから届いたデータのファイル"
          isLabelHidden
          value={picked}
          onChange={files => {
            setPicked(files);
            if (files == null || (Array.isArray(files) && files.length === 0)) {
              onClearError();
            } else {
              onFiles(files);
            }
          }}
          accept=".zip,.json,application/zip,application/x-zip-compressed,application/json"
          isMultiple
          placeholder="zipをここに置くか、タップして選ぶ"
          isLoading={isBusy}
          status={error ? {type: 'error', message: error} : undefined}
          width="100%"
        />
        <HStack gap={2} vAlign="center" hAlign="center">
          <Icon icon={LockKeyhole} size="sm" color="secondary" />
          <Text type="supporting" color="secondary">
            ファイルはどこにも送信しません
          </Text>
        </HStack>
      </VStack>
      <HStack gap={3} wrap="wrap" hAlign="center">
        <Button
          label="サンプルで試す"
          variant="secondary"
          endContent={<Icon icon={ArrowRight} size="sm" color="inherit" />}
          onClick={onSample}
        />
        <Button label="ファイルのもらい方" variant="ghost" href="#how" />
      </HStack>
    </VStack>
  );
}

/**
 * The picture under the hero: the file as it arrives, next to the same file
 * read by this page. Both sides are drawn from the synthetic sample.
 */
function BeforeAfter({preview, raw, onSample}: {preview: Report; raw: RawExample | null; onSample: () => void}) {
  const isPhone = useIsPhone();
  if (!preview.logins) {
    return null;
  }
  return (
    <VStack gap={6}>
      <HStack hAlign="between" vAlign="center" gap={3} wrap="wrap">
        <VStack gap={1}>
          <Heading level={2}>届いたファイルが、こう読めます</Heading>
          <Text type="supporting" color="secondary">
            サンプルデータでの表示例（数字は架空です）
          </Text>
        </VStack>
        <Button
          label="サンプルの全体を見る"
          variant="ghost"
          endContent={<Icon icon={ArrowRight} size="sm" color="inherit" />}
          onClick={onSample}
        />
      </HStack>
      <CardGrid>
        {raw ? (
          <Card padding={5}>
            <VStack gap={6}>
              <VStack gap={1}>
                <Heading level={3} textWrap="balance">
                  届くファイル：{num(preview.fileCount)}個
                </Heading>
                <Text type="supporting" color="secondary">
                  ログイン履歴（{num(raw.rows)}行）の最初の{num(raw.shown)}行
                </Text>
              </VStack>
              <CodeBlock
                code={raw.code}
                language="json"
                title={raw.path}
                hasLanguageLabel={false}
                hasCopyButton={false}
                size="sm"
                width="100%"
                maxHeight={isPhone ? 232 : undefined}
              />
            </VStack>
          </Card>
        ) : null}
        <StoryPreview report={preview} />
      </CardGrid>
    </VStack>
  );
}

function Steps() {
  return (
    <VStack gap={6}>
      <SectionHeading id="how" title="使い方" hint="3ステップ" />
      <Grid columns={{minWidth: 240, repeat: 'fit'}} gap={3}>
        {STEPS.map((step, i) => (
          <Card key={step.title} padding={5}>
            <VStack gap={3}>
              <Text type="label" color="secondary">
                ステップ {i + 1}
              </Text>
              <VStack gap={1}>
                <Heading level={3}>{step.title}</Heading>
                <Text type="body" color="secondary">
                  {step.body}
                </Text>
              </VStack>
              {step.link ? (
                <Link href={step.link.href} isExternalLink isStandalone>
                  {step.link.label}
                </Link>
              ) : null}
            </VStack>
          </Card>
        ))}
      </Grid>
    </VStack>
  );
}

function Features() {
  return (
    <VStack gap={6}>
      <SectionHeading id="what" title="分かること" hint="ファイルに入っている記録から" />
      <Grid columns={{minWidth: 260, repeat: 'fit'}} columnGap={6} rowGap={6}>
        {FEATURES.map(f => (
          <HStack key={f.title} gap={3} vAlign="start">
            <Icon icon={f.icon} size="md" color="secondary" />
            <StackItem size="fill">
              <VStack gap={1}>
                <Heading level={4} accessibilityLevel={3}>
                  {f.title}
                </Heading>
                <Text type="body" color="secondary">
                  {f.body}
                </Text>
              </VStack>
            </StackItem>
          </HStack>
        ))}
      </Grid>
    </VStack>
  );
}

function Privacy() {
  return (
    <VStack gap={6}>
      <SectionHeading id="privacy" title="安全について" hint="個人情報の入ったファイルだから" />
      <Card padding={5}>
        <List hasDividers edge="flush">
          {PROMISES.map(p => (
            <ListItem
              key={p.title}
              align="start"
              startContent={<Icon icon={p.icon} size="md" color="secondary" />}
              label={
                <Text type="body" weight="semibold">
                  {p.title}
                </Text>
              }
              description={
                <Text type="body" color="secondary">
                  {p.body}
                </Text>
              }
            />
          ))}
        </List>
      </Card>
      <Link href="/privacy/" isStandalone>
        プライバシーポリシーを読む
      </Link>
    </VStack>
  );
}

function Faq() {
  return (
    <VStack gap={6}>
      <SectionHeading id="faq" title="よくある質問" />
      <CollapsibleGroup type="single" hasDividers defaultValue={FAQ[0].id}>
        {FAQ.map(item => (
          <Collapsible
            key={item.id}
            value={item.id}
            trigger={
              <Text type="body" weight="semibold">
                {item.q}
              </Text>
            }>
            <VStack gap={2}>
              {item.a.map(p => (
                <Text key={p} type="body" color="secondary">
                  {p}
                </Text>
              ))}
              {item.link ? (
                <Link href={item.link.href} isExternalLink isStandalone>
                  {item.link.label}
                </Link>
              ) : null}
            </VStack>
          </Collapsible>
        ))}
      </CollapsibleGroup>
    </VStack>
  );
}

export function SiteFooter() {
  return (
    <VStack gap={6}>
      <Divider />
      <VStack gap={2} className="measure">
        {/* The notice asked for by the Japanese edition of Riot's policy, word for word. */}
        <Text type="supporting" color="secondary">
          {SITE.name}
          は、ライアットゲームズが公式承認するものではなく、ライアットゲームズ又はリーグ・オブ・レジェンドの製作・管理に正式に関与したいかなる者の見解・意見に基づくものではありません。
        </Text>
        <Text type="supporting" color="secondary">
          リーグ・オブ・レジェンド及びライアットゲームズは、Riot Games, Inc.の商標又は登録商標です。リーグ・オブ・レジェンド © Riot
          Games, Inc.
        </Text>
        {/* The notice asked for by the English edition. */}
        <Text type="supporting" color="secondary">
          {SITE.name} was created under Riot Games&apos; &quot;Legal Jibber Jabber&quot; policy using assets owned by Riot
          Games. Riot Games does not endorse or sponsor this project.
        </Text>
        {/* The notice asked for by Riot's developer policies. */}
        <Text type="supporting" color="secondary">
          {SITE.name} isn&apos;t endorsed by Riot Games and doesn&apos;t reflect the views or opinions of Riot Games or anyone
          officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are
          trademarks or registered trademarks of Riot Games, Inc.
        </Text>
      </VStack>
      <HStack gap={5} wrap="wrap">
        {PAGES.map(p => (
          <Link key={p.id} href={`/${p.id}/`} type="supporting" color="secondary" hasUnderline>
            {p.label}
          </Link>
        ))}
        <Link href={SITE.repoUrl} isExternalLink type="supporting" color="secondary" hasUnderline>
          GitHub
        </Link>
        <Link href={SITE.legalUrl} isExternalLink type="supporting" color="secondary" hasUnderline>
          Riot Gamesの利用ポリシー
        </Link>
      </HStack>
    </VStack>
  );
}

export function Landing({preview, raw, isBusy, error, onFiles, onClearError, onSample}: Props) {
  return (
    <Layout
      height="auto"
      contentWidth={1100}
      content={
        <LayoutContent padding={6} isScrollable={false}>
          <VStack gap={10}>
            <Hero isBusy={isBusy} error={error} onFiles={onFiles} onClearError={onClearError} onSample={onSample} />
            <BeforeAfter preview={preview} raw={raw} onSample={onSample} />
            <Steps />
            <Features />
            <Privacy />
            <Faq />
            <SiteFooter />
          </VStack>
        </LayoutContent>
      }
    />
  );
}
