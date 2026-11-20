// The quieter sections: other Riot games, account events, and the inventory of
// what the export contained.

import {HStack, VStack} from '@astryxdesign/core/Layout';
import {Text} from '@astryxdesign/core/Text';
import {Token} from '@astryxdesign/core/Token';
import {Collapsible} from '@astryxdesign/core/Collapsible';
import {MetadataList, MetadataListItem} from '@astryxdesign/core/MetadataList';
import {List, ListItem} from '@astryxdesign/core/List';
import {pixel, proportional, type TableColumn} from '@astryxdesign/core/Table';
import {SegBar} from '../charts/SegBar';
import {dateLong, monthLong, num, pct} from '../lib/format';
import {DAY_START_HOUR} from '../lib/time';
import type {AuditEvent, GameSummary, Report, Ticket} from '../lib/riot/types';
import {CardGrid, DataTable, InfoCard, SectionHeading, type TableRowData} from './parts';

// ---------- other games ----------

/** One game is one card: the games do not share a schema, so a table would be mostly empty cells. */
function GameCard({game}: {game: GameSummary}) {
  const wins = game.wins ?? 0;
  const losses = game.losses ?? 0;
  const hasRecord = game.wins != null && game.losses != null && wins + losses > 0;
  const period = game.period ? `${monthLong(game.period.from)}〜${monthLong(game.period.to)}` : '期間の記録なし';
  return (
    <InfoCard title={`${game.label}：${num(game.matches)}試合`} hint={period}>
      <VStack gap={5}>
        {hasRecord ? (
          <VStack gap={2}>
            <HStack hAlign="between" vAlign="center" gap={3} wrap="wrap">
              <Text type="body" hasTabularNumbers>
                {num(wins)}勝 {num(losses)}敗（勝率{pct(wins / (wins + losses))}）
              </Text>
              {game.recordScope ? (
                <Text type="supporting" color="secondary">
                  {game.recordScope}
                </Text>
              ) : null}
            </HStack>
            <SegBar a={wins} b={losses} ariaLabel={`${wins}勝${losses}敗`} />
          </VStack>
        ) : null}
        {game.modes.length > 0 || game.notes.length > 0 ? (
          <MetadataList label={{position: 'top'}}>
            {game.modes.length > 0 ? (
              <MetadataListItem label="モードの内訳">
                {game.modes
                  .slice(0, 5)
                  .map(m => `${m.label} ${num(m.count)}`)
                  .join(' ・ ')}
              </MetadataListItem>
            ) : null}
            {game.notes.length > 0 ? <MetadataListItem label="メモ">{game.notes.join(' ・ ')}</MetadataListItem> : null}
          </MetadataList>
        ) : null}
      </VStack>
    </InfoCard>
  );
}

export function GamesSection({games}: {games: GameSummary[]}) {
  return (
    <VStack gap={6}>
      <SectionHeading
        id="games"
        title="ほかのゲーム"
        hint={games.length > 0 ? `試合ごとの記録があるのは${num(games.length)}タイトル` : undefined}
      />
      {games.length > 0 ? (
        <CardGrid>
          {games.map(g => (
            <GameCard key={g.key} game={g} />
          ))}
        </CardGrid>
      ) : (
        <InfoCard
          title="LoL以外の試合記録：なし"
          hint="VALORANT、ワイルドリフト、レジェンド・オブ・ルーンテラ、2XKOの試合履歴は空でした"
        />
      )}
      <Text type="supporting" color="secondary">
        LoLの試合ごとの成績（勝敗やKDA）は、データ請求のファイルに入っていません。
      </Text>
    </VStack>
  );
}

// ---------- account ----------

function AuditCard({audit}: {audit: AuditEvent[]}) {
  const groups = new Map<string, {label: string; count: number; last: number; security: boolean}>();
  for (const e of audit) {
    const g = groups.get(e.code) ?? {label: e.label, count: 0, last: e.t, security: e.security};
    g.count += 1;
    g.last = Math.max(g.last, e.t);
    groups.set(e.code, g);
  }
  type R = TableRowData & {label: string; count: string; last: string};
  const rows: R[] = [...groups.entries()]
    .sort((a, b) => Number(b[1].security) - Number(a[1].security) || b[1].last - a[1].last)
    .map(([code, g]) => ({id: code, label: g.label, count: `${num(g.count)}回`, last: dateLong(g.last)}));
  const cols: TableColumn<R>[] = [
    {key: 'label', header: '操作', width: proportional(1, {minWidth: 140})},
    {key: 'count', header: '回数', width: pixel(64)},
    {key: 'last', header: '直近', width: pixel(144)},
  ];
  type L = TableRowData & {date: string; label: string; detail: string};
  const logRows: L[] = audit.map((e, i) => ({id: String(i), date: dateLong(e.t), label: e.label, detail: e.detail ?? '—'}));
  const logCols: TableColumn<L>[] = [
    {key: 'date', header: '日付', width: pixel(128)},
    {key: 'label', header: '操作', width: proportional(1, {minWidth: 140})},
    {key: 'detail', header: '詳細', width: proportional(1, {minWidth: 100})},
  ];
  const security = audit.filter(e => e.security).length;
  return (
    <InfoCard
      title={`アカウント操作：${num(audit.length)}件`}
      hint={
        security > 0
          ? `パスワードや連携など、設定にかかわる操作は${num(security)}件。身に覚えのない日付がないか確かめられます`
          : 'パスワードの変更や外部連携などの操作は記録されていません'
      }>
      <VStack gap={4}>
        <DataTable rows={rows} columns={cols} phoneRow={r => ({label: r.label, description: `直近 ${r.last}`, end: r.count})} />
        <Collapsible trigger={<Text type="label">日付順の一覧（{num(audit.length)}件）</Text>} defaultIsOpen={false}>
          <DataTable
            rows={logRows}
            columns={logCols}
            phoneRow={r => ({label: r.label, description: r.detail === '—' ? undefined : r.detail, end: r.date})}
          />
        </Collapsible>
      </VStack>
    </InfoCard>
  );
}

function TicketsCard({tickets}: {tickets: Ticket[]}) {
  return (
    <InfoCard
      title={`サポートへの問い合わせ：${tickets.length > 0 ? `${num(tickets.length)}件` : 'なし'}`}
      hint="件名と日付だけを表示しています。本文は表示しません">
      {tickets.length > 0 ? (
        <List hasDividers density="compact" edge="flush">
          {tickets.map(t => (
            <ListItem
              key={t.id}
              label={<Text type="body">{t.subject}</Text>}
              description={`${t.t ? dateLong(t.t) : '日付不明'} ・ やりとり ${num(t.comments)}件`}
              endContent={
                <Text type="supporting" color="secondary">
                  {t.status}
                </Text>
              }
            />
          ))}
        </List>
      ) : null}
    </InfoCard>
  );
}

export function AccountSection({audit, tickets}: {audit: AuditEvent[] | null; tickets: Ticket[] | null}) {
  if (!audit && !tickets) {
    return null;
  }
  return (
    <VStack gap={6}>
      <SectionHeading id="account" title="アカウントの記録" hint="設定の変更とサポートとのやりとり" />
      <CardGrid>
        {audit ? <AuditCard audit={audit} /> : null}
        {tickets ? <TicketsCard tickets={tickets} /> : null}
      </CardGrid>
    </VStack>
  );
}

// ---------- what the export contained ----------

export function DataSection({report}: {report: Report}) {
  const filled = report.inventory.filter(r => r.records > 0);
  const empty = report.inventory.filter(r => r.records === 0);
  type R = TableRowData & {group: string; label: string; records: string; period: string; personal: string};
  const toRow = (r: Report['inventory'][number], i: number): R => ({
    id: String(i),
    group: r.group,
    label: r.label,
    records: r.note ?? `${num(r.records)}件`,
    period: r.period
      ? dateLong(r.period.from) === dateLong(r.period.to)
        ? dateLong(r.period.from)
        : `${monthLong(r.period.from)}〜${monthLong(r.period.to)}`
      : '—',
    personal: r.personal.join('、') || '—',
  });
  const cols: TableColumn<R>[] = [
    {key: 'group', header: '分類', width: pixel(160)},
    {key: 'label', header: 'データ', width: pixel(176)},
    {key: 'records', header: '件数', width: pixel(136)},
    {key: 'period', header: '期間', width: pixel(184)},
    {key: 'personal', header: '含まれる個人情報', width: proportional(1, {minWidth: 140})},
  ];
  type E = TableRowData & {group: string; label: string; path: string};
  const emptyRows: E[] = empty.map((r, i) => ({id: String(i), group: r.group, label: r.label, path: r.path}));
  const emptyCols: TableColumn<E>[] = [
    {key: 'group', header: '分類', width: pixel(160)},
    {key: 'label', header: 'データ', width: pixel(176)},
    {key: 'path', header: 'ファイル', width: proportional(1, {minWidth: 240})},
  ];
  const tz = report.logins?.timeZone;

  return (
    <VStack gap={6}>
      <SectionHeading
        id="data"
        title="ファイルの中身"
        hint={`${num(report.fileCount)}ファイル ・ データあり ${num(filled.length)}種類 ・ 空 ${num(empty.length)}種類`}
      />
      <VStack gap={3}>
        <InfoCard
          title={`Riotから届いたデータ：${num(filled.length)}種類`}
          hint="どのデータが、いつからいつまで、何件あるか">
          <VStack gap={4}>
            {filled.length === 0 ? (
              <Text color="secondary">データの入ったファイルは見つかりませんでした。</Text>
            ) : (
              <DataTable
                rows={filled.map(toRow)}
                columns={cols}
                phoneRow={r => ({
                  label: `${r.group}：${r.label}`,
                  description: [r.period === '—' ? null : r.period, r.personal === '—' ? null : `個人情報：${r.personal}`]
                    .filter(Boolean)
                    .join(' ・ '),
                  end: r.records,
                })}
              />
            )}
            {empty.length > 0 ? (
              <Collapsible
                trigger={<Text type="label">中身が空だったデータ（{num(empty.length)}種類）</Text>}
                defaultIsOpen={false}>
                <DataTable
                  rows={emptyRows}
                  columns={emptyCols}
                  phoneRow={r => ({label: `${r.group}：${r.label}`, description: r.path})}
                />
              </Collapsible>
            ) : null}
          </VStack>
        </InfoCard>
        <CardGrid>
          <InfoCard title="このファイルに含まれる個人情報" hint="種類だけを挙げています。この画面には値を出しません">
            <VStack gap={4}>
              <HStack gap={2} wrap="wrap">
                {report.personalKinds.length > 0 ? (
                  report.personalKinds.map(k => <Token key={k} label={k} />)
                ) : (
                  <Text color="secondary">該当するデータは見つかりませんでした。</Text>
                )}
              </HStack>
              <Text type="supporting" color="secondary">
                生年月日、メールアドレス、電話番号、IPアドレス、問い合わせの本文は、読み込んでも画面に表示しません。zipを人に渡すときは、これらが入っていることに注意してください。
              </Text>
            </VStack>
          </InfoCard>
          <InfoCard title="集計のしかた">
            <MetadataList label={{position: 'top'}}>
              <MetadataListItem label="時刻">
                ファイルの時刻はUTCです。{tz ? `この端末のタイムゾーン（${tz}）` : 'この端末のタイムゾーン'}
                に直して集計しています。
              </MetadataListItem>
              <MetadataListItem label="1日の区切り">
                朝{DAY_START_HOUR}時。深夜0時〜{DAY_START_HOUR}時のログインは、前の日に数えます。
              </MetadataListItem>
              <MetadataListItem label="ログインした日">
                ログイン履歴に、ログインの開始（Login・Connected・Session Start）が1件以上ある日。
              </MetadataListItem>
              <MetadataListItem label="課金額">
                RPのチャージ記録にある金額の合計。RPやブルーエッセンスの消費は別に数えています。
              </MetadataListItem>
              <MetadataListItem label="チャンピオン名">
                Riotの公開データ（Data Dragon）の日本語名に対応させています。
              </MetadataListItem>
            </MetadataList>
          </InfoCard>
        </CardGrid>
      </VStack>
    </VStack>
  );
}
