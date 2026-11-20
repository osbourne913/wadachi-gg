// When the account was played: by weekday and hour, and which Riot game in
// which period. (The years themselves are told by the story at the top.)

import {useMemo} from 'react';
import {VStack} from '@astryxdesign/core/Layout';
import {MetadataList, MetadataListItem} from '@astryxdesign/core/MetadataList';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {pixel, proportional, type TableColumn} from '@astryxdesign/core/Table';
import {HeatGrid, type HeatCol, type HeatRow} from '../charts/HeatGrid';
import {MonthStrip} from '../charts/MonthStrip';
import {useWidth} from '../charts/tip';
import {WEEKDAYS, dateLong, num, pct} from '../lib/format';
import {DAY_START_HOUR} from '../lib/time';
import type {LoginAnalysis} from '../lib/riot/types';
import {ChartCard, InfoCard, SectionHeading, type TableRowData} from './parts';

const hourOfSlot = (slot: number) => (slot + DAY_START_HOUR) % 24;

export function WeekHour({logins}: {logins: LoginAnalysis}) {
  const [ref, width] = useWidth<HTMLDivElement>(480);
  const narrow = width < 430;
  const slots = Array.from({length: 24}, (_, s) => s);

  const {rows, cols} = useMemo(() => {
    if (narrow) {
      // Phones: hours run down the page, weekdays across.
      return {
        rows: slots.map<HeatRow>(s => ({
          key: `h${s}`,
          label: `${hourOfSlot(s)}時`,
          cells: WEEKDAYS.map((_, wd) => logins.weekHour[wd][s]),
        })),
        cols: WEEKDAYS.map<HeatCol>(d => ({key: d, label: d})),
      };
    }
    return {
      rows: WEEKDAYS.map<HeatRow>((d, wd) => ({key: d, label: d, cells: logins.weekHour[wd]})),
      cols: slots.map<HeatCol>(s => ({key: `h${s}`, label: s % 3 === 0 ? `${hourOfSlot(s)}時` : ''})),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [narrow, logins]);

  type R = TableRowData & {hour: string};
  const tableRows: R[] = slots.map(s => {
    const row: R = {id: `h${s}`, hour: `${hourOfSlot(s)}時台`};
    WEEKDAYS.forEach((d, wd) => {
      row[d] = String(logins.weekHour[wd][s]);
    });
    return row;
  });
  const tableCols: TableColumn<R>[] = [
    {key: 'hour', header: '時間帯', width: pixel(88)},
    ...WEEKDAYS.map(d => ({key: d, header: d, width: proportional(1, {minWidth: 44})})),
  ];

  // With only a few days on record, any pattern is noise: say so instead of naming one.
  const title =
    logins.activeDays < 14
      ? `時間帯の傾向：判定には記録不足（${num(logins.activeDays)}日分）`
      : `ピーク：${WEEKDAYS[logins.peak.weekday]}曜 ${logins.peak.hour}時台（22時〜翌2時が${pct(logins.nightShare)}）`;

  return (
    <ChartCard
      title={title}
      subtitle={`曜日と時間帯ごとの、ログインした日数。1日は朝${DAY_START_HOUR}時始まりで、深夜の分は前の日の行に入れています`}
      source={`時刻は${logins.timeZone}に直して集計`}
      table={{rows: tableRows, columns: tableCols}}>
      <div ref={ref}>
        <HeatGrid
          rows={rows}
          cols={cols}
          max={logins.weekHourMax}
          unit="日"
          cellHeight={narrow ? 16 : 24}
          describe={(row, i) =>
            narrow ? `${WEEKDAYS[i]}曜 ${row.label}台` : `${row.label}曜 ${hourOfSlot(i)}時台`
          }
          ariaLabel={`曜日と時間帯ごとのログイン日数。最多は${WEEKDAYS[logins.peak.weekday]}曜の${logins.peak.hour}時台で${logins.peak.days}日。`}
        />
      </div>
    </ChartCard>
  );
}

function GamesOverTime({logins}: {logins: LoginAnalysis}) {
  const games = logins.games;
  if (games.length === 0) {
    return null;
  }
  const second = games[1];
  type R = TableRowData & {game: string; first: string; last: string; days: string; months: string};
  const tableRows: R[] = games.map(g => ({
    id: g.key,
    game: g.label,
    first: dateLong(g.first),
    last: dateLong(g.last),
    days: `${num(g.days)}日`,
    months: `${num(g.activeMonths)}か月`,
  }));
  const tableCols: TableColumn<R>[] = [
    {key: 'game', header: 'ゲーム', width: proportional(1, {minWidth: 140})},
    {key: 'first', header: '最初の記録', width: pixel(136)},
    {key: 'last', header: '最後の記録', width: pixel(136)},
    {key: 'days', header: 'ログインした日', width: pixel(120)},
    {key: 'months', header: '記録のある月', width: pixel(112)},
  ];
  return (
    <ChartCard
      title={
        second
          ? `${games[0].label}以外で最長：${second.label}（${num(second.activeMonths)}か月）`
          : `${games[0].label}の記録：${num(games[0].activeMonths)}か月分`
      }
      subtitle="ゲームごとの、月あたりのログイン日数"
      source="ログイン履歴の product ごとに集計"
      table={{rows: tableRows, columns: tableCols}}>
      <MonthStrip
        rows={games.map(g => ({key: g.key, label: g.label, values: g.monthly, summary: `${num(g.days)}日`}))}
        months={logins.months}
        unit="日"
        ariaLabel="ゲームごとの、月あたりのログイン日数"
      />
    </ChartCard>
  );
}

function Records({logins}: {logins: LoginAnalysis}) {
  return (
    <InfoCard title="ログインの記録" hint="ログイン履歴から読み取れる日付と数">
      <MetadataList columns="multi">
        <MetadataListItem label="最初の記録">{dateLong(logins.first)}</MetadataListItem>
        <MetadataListItem label="最後の記録">{dateLong(logins.last)}</MetadataListItem>
        <MetadataListItem label="ログインした日">
          {num(logins.activeDays)}日（期間中の{pct(logins.activeDays / logins.spanDays)}）
        </MetadataListItem>
        <MetadataListItem label="連続の最長">
          {num(logins.streak.days)}日（{dateLong(logins.streak.from)}〜{dateLong(logins.streak.to)}）
        </MetadataListItem>
        {logins.gap ? (
          <MetadataListItem label="いちばん長く空いた期間">
            {num(logins.gap.days)}日（{dateLong(logins.gap.from)}〜{dateLong(logins.gap.to)}）
          </MetadataListItem>
        ) : null}
        <MetadataListItem label="記録されている接続元">
          IPアドレス {num(logins.ipCount)}種類（中身は表示しません）
        </MetadataListItem>
      </MetadataList>
    </InfoCard>
  );
}

export function PlaySection({logins}: {logins: LoginAnalysis | null}) {
  return (
    <VStack gap={6}>
      <SectionHeading
        id="play"
        title="遊んだ時間"
        hint={logins ? `ログイン履歴 ${num(logins.totalEvents)}件` : undefined}
      />
      {logins ? (
        <VStack gap={3}>
          <GamesOverTime logins={logins} />
          <WeekHour logins={logins} />
          <Records logins={logins} />
        </VStack>
      ) : (
        <EmptyState
          isCompact
          title="ログイン履歴がありません"
          description="このファイルには riotAccount/atlas_login_event_uc.json が入っていませんでした。"
        />
      )}
    </VStack>
  );
}
