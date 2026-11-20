// The most recent games, from the chat-log files: Riot includes one file per
// game for roughly the last three months (up to 100 games), with a date and the
// player's own messages.

import {HStack, VStack} from '@astryxdesign/core/Layout';
import {MetadataList, MetadataListItem} from '@astryxdesign/core/MetadataList';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {Collapsible} from '@astryxdesign/core/Collapsible';
import {Text} from '@astryxdesign/core/Text';
import {Token} from '@astryxdesign/core/Token';
import {pixel, proportional, type TableColumn} from '@astryxdesign/core/Table';
import {Columns} from '../charts/Columns';
import {Waffle} from '../charts/Waffle';
import {dateTimeShort, num} from '../lib/format';
import type {ChatAnalysis} from '../lib/riot/types';
import {CardGrid, ChartCard, DataTable, InfoCard, SectionHeading, type TableRowData} from './parts';

const DAY = 86400000;
// Match dates are UTC calendar dates; print them as written.
const utcDay = (ms: number) => {
  const d = new Date(ms);
  return `${d.getUTCMonth() + 1}月${d.getUTCDate()}日`;
};
const utcFull = (ms: number) => {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}年${d.getUTCMonth() + 1}月${d.getUTCDate()}日`;
};

const PHASE_LABEL = {pre: '試合前', mid: '試合中', post: '試合後'} as const;

function GamesPerDay({chat}: {chat: ChatAnalysis}) {
  const n = chat.games.length;
  const byDate = new Map(chat.byDate.map(d => [d.date, d]));
  const days: {date: number; games: number}[] = [];
  for (let t = chat.window.from; t <= chat.window.to; t += DAY) {
    days.push({date: t, games: byDate.get(t)?.games ?? 0});
  }
  const xTicks = days
    .map((d, index) => ({index, d: new Date(d.date)}))
    .filter(({index, d}) => index === 0 || d.getUTCDate() === 1)
    .filter((t, i, list) => !(i === 0 && list[1] && list[1].index - t.index < 8))
    .map(({index, d}) => ({index, label: `${d.getUTCMonth() + 1}月`}));

  type R = TableRowData & {date: string; games: string; talked: string};
  const rows: R[] = chat.byDate.map(d => ({
    id: String(d.date),
    date: utcFull(d.date),
    games: `${d.games}試合`,
    talked: `${d.talked}試合`,
  }));
  const cols: TableColumn<R>[] = [
    {key: 'date', header: '日付'},
    {key: 'games', header: '試合数'},
    {key: 'talked', header: '発言した試合'},
  ];

  return (
    <ChartCard
      title={`直近${num(n)}試合のプレイ日数：${num(chat.activeDates)}日`}
      subtitle={`1日ごとの試合数。${utcFull(chat.window.from)}〜${utcFull(chat.window.to)}。日付はRiotの記録（UTC）のまま`}
      source={`いちばん多い日は${utcDay(chat.maxPerDay.date)}の${chat.maxPerDay.games}試合 ・ 遊んだ日は平均${(n / chat.activeDates).toFixed(1)}試合`}
      table={{rows, columns: cols}}>
      <Columns
        dense
        items={days.map(d => ({
          key: String(d.date),
          label: '',
          value: d.games,
          title: utcDay(d.date),
          accent: true,
        }))}
        format={v => `${v}試合`}
        tickFormat={v => String(v)}
        maxIntervals={4}
        xTicks={xTicks}
        height={200}
        ariaLabel={`1日ごとの試合数。${chat.activeDates}日で${n}試合。`}
      />
    </ChartCard>
  );
}

export function Talked({chat}: {chat: ChatAnalysis}) {
  const n = chat.games.length;
  return (
    <ChartCard
      title={`発言した試合：${num(chat.talkedGames)} / ${num(n)}試合`}
      subtitle="1マスが1試合。左上から古い順に並べています"
      source={
        chat.otherMessages > 0
          ? `ほかのプレイヤーの発言 ${num(chat.otherMessages)}件は数えていません`
          : 'ファイルに入っているのは自分の発言だけです'
      }>
      <Waffle
        items={chat.games.map(g => ({
          key: g.id,
          on: g.total > 0,
          value: g.total > 0 ? `発言 ${g.total}回` : '発言なし',
          label: `${utcDay(g.date)}の試合`,
        }))}
        onLabel="発言あり"
        offLabel="発言なし"
        ariaLabel={`${n}試合のうち${chat.talkedGames}試合で発言。`}
      />
    </ChartCard>
  );
}

function Messages({chat}: {chat: ChatAnalysis}) {
  type R = TableRowData & {time: string; phase: string; to: string; text: string};
  const rows: R[] = chat.log.map((m, i) => ({
    id: String(i),
    time: dateTimeShort(m.t),
    phase: PHASE_LABEL[m.phase],
    to: m.to,
    text: m.text,
  }));
  const cols: TableColumn<R>[] = [
    {key: 'time', header: '日時', width: pixel(128)},
    {key: 'phase', header: '場面', width: pixel(72)},
    {key: 'to', header: '宛先', width: pixel(72)},
    {key: 'text', header: '発言', width: proportional(1, {minWidth: 160})},
  ];
  return (
    <InfoCard
      title={`発言回数：${num(chat.messages)}回`}
      hint="この画面の中だけで表示しています。どこにも送信しません">
      <VStack gap={5}>
        <MetadataList columns="multi">
          <MetadataListItem label="場面">
            試合前 {num(chat.byPhase.pre)} ・ 試合中 {num(chat.byPhase.mid)} ・ 試合後 {num(chat.byPhase.post)}
          </MetadataListItem>
          <MetadataListItem label="宛先">
            {chat.byTarget.map(t => `${t.label} ${num(t.count)}`).join(' ・ ')}
          </MetadataListItem>
        </MetadataList>
        {chat.phrases.length > 0 ? (
          <VStack gap={2}>
            <Text type="label" color="secondary">
              2回以上使った言葉
            </Text>
            <HStack gap={2} wrap="wrap">
              {chat.phrases.map(p => (
                <Token key={p.text} label={`${p.text} ×${p.count}`} />
              ))}
            </HStack>
          </VStack>
        ) : null}
        <Collapsible trigger={<Text type="label">発言の一覧（{num(chat.messages)}件）</Text>} defaultIsOpen={false}>
          <DataTable
            rows={rows}
            columns={cols}
            phoneRow={r => ({label: r.text, description: `${r.time} ・ ${r.phase} ・ ${r.to}`})}
          />
        </Collapsible>
      </VStack>
    </InfoCard>
  );
}

export function RecentSection({chat}: {chat: ChatAnalysis | null}) {
  return (
    <VStack gap={6}>
      <SectionHeading
        id="recent"
        title="直近の試合"
        hint={chat ? `チャットログ ${num(chat.games.length)}試合分` : undefined}
      />
      {chat ? (
        <VStack gap={3}>
          <CardGrid>
            <GamesPerDay chat={chat} />
            <Talked chat={chat} />
          </CardGrid>
          {chat.messages > 0 ? <Messages chat={chat} /> : null}
        </VStack>
      ) : (
        <EmptyState
          isCompact
          title="チャットログがありません"
          description="このファイルにはLoLのチャットログが入っていませんでした。直近3か月に試合がないと入りません。"
        />
      )}
    </VStack>
  );
}
