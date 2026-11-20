// Reports and penalties. Shown as recorded, without judgment: a report is what
// another player filed, not a finding.

import {VStack} from '@astryxdesign/core/Layout';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {Text} from '@astryxdesign/core/Text';
import {pixel, proportional, type TableColumn} from '@astryxdesign/core/Table';
import {BarList} from '../charts/BarList';
import {dateLong, num} from '../lib/format';
import type {Penalty, ReportsAnalysis} from '../lib/riot/types';
import {ChartCard, DataTable, InfoCard, SectionHeading, type TableRowData} from './parts';

function Reports({reports}: {reports: ReportsAnalysis}) {
  if (reports.receivedTotal === 0) {
    return (
      <InfoCard title="通報された記録：なし" hint="LoLで他のプレイヤーから送られた通報の集計">
        <Text color="secondary">
          {reports.made ? `自分が送った通報は${num(reports.madeTotal)}件です。` : '自分が送った通報の記録は、ファイルにありません。'}
        </Text>
      </InfoCard>
    );
  }
  const top = reports.received[0];
  const second = reports.received[1];
  const isTie = second != null && second.count === top.count;
  type R = TableRowData & {label: string; code: string; count: string};
  const rows: R[] = reports.received.map(c => ({id: c.key, label: c.label, code: c.key, count: `${num(c.count)}件`}));
  const cols: TableColumn<R>[] = [
    {key: 'label', header: '内容', width: proportional(1, {minWidth: 120})},
    {key: 'code', header: 'ファイル上の表記', width: proportional(1, {minWidth: 160})},
    {key: 'count', header: '件数', width: pixel(72)},
  ];
  return (
    <ChartCard
      title={
        isTie
          ? `通報された記録：${num(reports.receivedTotal)}件`
          : `通報された記録：${num(reports.receivedTotal)}件（最多：${top.label}）`
      }
      subtitle="LoLで他のプレイヤーから送られた通報の、内容ごとの件数。時期の情報はファイルにありません"
      source={
        (reports.made ? `自分が送った通報は${num(reports.madeTotal)}件。` : '自分が送った通報の記録は、ファイルにありません。') +
        '通報は申告の件数で、違反と認められた件数ではありません。'
      }
      table={{rows, columns: cols}}>
      <BarList
        items={reports.received.map(c => ({key: c.key, label: c.label, value: c.count}))}
        format={v => `${num(v)}件`}
        total={reports.receivedTotal}
        emphasis={isTie ? 'all' : 'first'}
        ariaLabel={`通報された内容ごとの件数。最多は${top.label}の${top.count}件。`}
      />
    </ChartCard>
  );
}

function Penalties({penalties}: {penalties: Penalty[]}) {
  if (penalties.length === 0) {
    return (
      <InfoCard title="ペナルティ：なし">
        <Text color="secondary">penalties/penalty_history.json は空でした。</Text>
      </InfoCard>
    );
  }
  type R = TableRowData & {date: string; reason: string; type: string; sentence: string; status: string};
  const rows: R[] = penalties.map((p, i) => ({
    id: String(i),
    date: p.t ? dateLong(p.t) : '—',
    reason: p.reason,
    type: p.type,
    sentence: p.sentence,
    status: p.status,
  }));
  const cols: TableColumn<R>[] = [
    {key: 'date', header: '日付', width: pixel(152)},
    {key: 'reason', header: '理由', width: proportional(2, {minWidth: 180})},
    {key: 'type', header: '種類', width: proportional(1, {minWidth: 96})},
    {key: 'sentence', header: '解除の条件', width: proportional(1, {minWidth: 112})},
    {key: 'status', header: '状態', width: pixel(80)},
  ];
  const dated = penalties.filter(p => p.t != null);
  const active = penalties.filter(p => p.statusCode === 'ACTIVE').length;
  const range =
    dated.length > 1 ? `${dateLong(dated[dated.length - 1].t as number)}〜${dateLong(dated[0].t as number)}` : '';
  return (
    <InfoCard
      title={`ペナルティ：${num(penalties.length)}件（${active > 0 ? `有効 ${num(active)}件` : 'すべて終了'}）`}
      hint={[range, '表記はファイルの値を日本語にしたものです'].filter(Boolean).join(' ・ ')}>
      <DataTable
        rows={rows}
        columns={cols}
        phoneRow={r => ({
          label: r.reason,
          description: [r.date, r.type === '—' ? null : r.type, r.sentence].filter(Boolean).join(' ・ '),
          end: r.status,
        })}
      />
    </InfoCard>
  );
}

export function ConductSection({reports, penalties}: {reports: ReportsAnalysis | null; penalties: Penalty[] | null}) {
  return (
    <VStack gap={6}>
      <SectionHeading id="conduct" title="通報とペナルティ" hint="League of Legends" />
      {reports || penalties ? (
        <VStack gap={3}>
          {reports ? <Reports reports={reports} /> : null}
          {penalties ? <Penalties penalties={penalties} /> : null}
        </VStack>
      ) : (
        <EmptyState
          isCompact
          title="通報とペナルティの記録がありません"
          description="このファイルには該当するデータが入っていませんでした。"
        />
      )}
    </VStack>
  );
}
