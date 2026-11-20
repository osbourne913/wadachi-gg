// Real money (RP top-ups) and what the store log says was bought with it.

import {VStack} from '@astryxdesign/core/Layout';
import {MetadataList, MetadataListItem} from '@astryxdesign/core/MetadataList';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {Collapsible} from '@astryxdesign/core/Collapsible';
import {Text} from '@astryxdesign/core/Text';
import {pixel, proportional, type TableColumn} from '@astryxdesign/core/Table';
import {BarList} from '../charts/BarList';
import {Columns} from '../charts/Columns';
import {Treemap} from '../charts/Treemap';
import {ChampionDex} from '../charts/ChampionDex';
import {CHAMPIONS} from '../lib/riot/champions';
import {CHAMPION_ICONS} from '../lib/riot/championIcons';
import {dateLong, money, num, pct} from '../lib/format';
import type {SpendAnalysis, StoreAnalysis} from '../lib/riot/types';
import {CardGrid, ChartCard, DataTable, InfoCard, SectionHeading, type TableRowData} from './parts';

function cash(amount: number, currency: string): string {
  return currency === 'JPY' ? `${num(amount)}円` : money(amount, currency);
}

export function ByYear({spend}: {spend: SpendAnalysis}) {
  const top = spend.topYear;
  type R = TableRowData & {year: string; count: string; amount: string};
  const rows: R[] = spend.years.map(y => ({
    id: String(y.year),
    year: `${y.year}年`,
    count: `${y.count}回`,
    amount: cash(y.amount, spend.currency),
  }));
  const cols: TableColumn<R>[] = [
    {key: 'year', header: '年'},
    {key: 'count', header: 'チャージ'},
    {key: 'amount', header: '金額'},
  ];
  return (
    <ChartCard
      title={
        top && spend.years.length > 1
          ? `課金が最も多い年：${top.year}年（${cash(top.amount, spend.currency)}）`
          : `課金の合計：${cash(spend.total, spend.currency)}`
      }
      subtitle={`年ごとの課金額（${spend.currency === 'JPY' ? '円' : spend.currency}）。RPのチャージ${num(spend.count)}回、合計${cash(spend.total, spend.currency)}`}
      source={`RPのチャージ記録 ${num(spend.count)}件から集計`}
      table={{rows, columns: cols}}>
      <Columns
        items={spend.years.map(y => ({
          key: String(y.year),
          label: spend.years.length > 8 ? `'${String(y.year).slice(2)}` : String(y.year),
          value: y.amount,
          title: `${y.year}年 ・ ${y.count}回`,
          accent: y.year === top?.year,
          showValue: y.year === top?.year,
        }))}
        format={v => cash(v, spend.currency)}
        tickFormat={num}
        ariaLabel={`年ごとの課金額。最多は${top?.year}年。`}
      />
    </ChartCard>
  );
}

export function RpUse({store}: {store: StoreAnalysis}) {
  const first = store.rpSpentBy[0];
  type R = TableRowData & {label: string; count: string; amount: string; share: string};
  const rows: R[] = store.rpSpentBy.map(c => ({
    id: c.key,
    label: c.label,
    count: `${num(c.count)}件`,
    amount: `${num(c.amount)} RP`,
    share: pct(c.amount / store.rpSpent, 1),
  }));
  const cols: TableColumn<R>[] = [
    {key: 'label', header: '使い道', width: proportional(1, {minWidth: 120})},
    {key: 'count', header: '件数', width: pixel(64)},
    {key: 'amount', header: 'RP', width: pixel(96)},
    {key: 'share', header: '割合', width: pixel(64)},
  ];
  return (
    <ChartCard
      title={`RPの使い道1位：${first.label}（${pct(first.amount / store.rpSpent)}）`}
      subtitle={`RPの使い道。合計${num(store.rpSpent)} RP`}
      source="ストアの取引のうち、RPが減った記録を集計"
      table={{rows, columns: cols}}>
      <BarList
        items={store.rpSpentBy.map(c => ({key: c.key, label: c.label, value: c.amount, note: `${num(c.count)}件`}))}
        format={v => `${num(v)} RP`}
        total={store.rpSpent}
        ariaLabel={`RPの使い道。最多は${first.label}。`}
      />
    </ChartCard>
  );
}

const ROLES = [
  {key: 'Assassin', label: 'アサシン'},
  {key: 'Fighter', label: 'ファイター'},
  {key: 'Mage', label: 'メイジ'},
  {key: 'Marksman', label: 'マークスマン'},
  {key: 'Support', label: 'サポート'},
  {key: 'Tank', label: 'タンク'},
];

export function SkinChampions({store}: {store: StoreAnalysis}) {
  const [a, b] = store.skinChampions;
  const isTie = b != null && b.count === a.count;
  // Tiles for the top champions; the long tail would only be slivers.
  const shown = store.skinChampions.slice(0, 40);
  const byRole = new Map<string, number>();
  for (const c of store.skinChampions) {
    if (c.role) {
      byRole.set(c.role, (byRole.get(c.role) ?? 0) + c.count);
    }
  }
  const topRole = [...byRole.entries()].sort((x, y) => y[1] - x[1])[0];
  const topRoleLabel = ROLES.find(r => r.key === topRole?.[0])?.label;
  type R = TableRowData & {name: string; role: string; count: string};
  const rows: R[] = store.skinChampions.map(c => ({
    id: String(c.id),
    name: c.name,
    role: ROLES.find(r => r.key === c.role)?.label ?? '—',
    count: `${num(c.count)}件`,
  }));
  const cols: TableColumn<R>[] = [
    {key: 'name', header: 'チャンピオン', width: proportional(1, {minWidth: 140})},
    {key: 'role', header: 'ロール', width: pixel(112)},
    {key: 'count', header: '入手数', width: pixel(80)},
  ];
  return (
    <ChartCard
      title={isTie ? `スキン・クロマ：${num(store.skinTotal)}件` : `スキン最多：${a.name}（${num(a.count)}件）`}
      subtitle={`面積が入手数、色がロール。${num(store.skinChampionCount)}体で合計${num(store.skinTotal)}件${
        topRoleLabel ? `、ロール別の最多は${topRoleLabel}（${num(topRole[1])}件）` : ''
      }`}
      source={`上位${shown.length}体を表示。無料の入手を含む`}
      table={{rows, columns: cols}}>
      <Treemap
        items={shown.map(c => ({
          key: String(c.id),
          label: c.name,
          value: c.count,
          group: c.role ?? 'other',
          image: CHAMPION_ICONS[c.id],
        }))}
        groups={ROLES}
        format={v => `${num(v)}件`}
        height={360}
        ariaLabel={`チャンピオンごとのスキン・クロマ入手数。最多は${a.name}の${a.count}件。`}
      />
    </ChartCard>
  );
}

function Collection({store}: {store: StoreAnalysis}) {
  const counts = new Map(store.skinChampions.map(c => [c.id, c.count]));
  const entries = Object.entries(CHAMPIONS)
    .map(([id, [name]]) => ({id: Number(id), name, image: CHAMPION_ICONS[Number(id)], count: counts.get(Number(id)) ?? 0}))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ja'));
  const owned = entries.filter(e => e.count > 0).length;
  return (
    <ChartCard
      title={`スキンを持つチャンピオン：${num(owned)} / ${num(entries.length)}体`}
      subtitle="全チャンピオンを、スキン・クロマの多い順に並べています。数字は入手数、灰色はまだ持っていないチャンピオン">
      <ChampionDex entries={entries} ariaLabel={`${entries.length}体中${owned}体のスキン・クロマを所持。`} />
    </ChartCard>
  );
}

function Acquired({store}: {store: StoreAnalysis}) {
  // Past eight rows the tail carries no story; fold it.
  const head = store.acquired.slice(0, 8);
  const tail = store.acquired.slice(8);
  const items = head.map(c => ({key: c.key, label: c.label, value: c.count}));
  if (tail.length > 0) {
    items.push({key: '_other', label: `その他（${tail.length}種類）`, value: tail.reduce((a, c) => a + c.count, 0)});
  }
  const first = store.acquired[0];
  type R = TableRowData & {label: string; count: string; share: string};
  const rows: R[] = store.acquired.map(c => ({
    id: c.key,
    label: c.label,
    count: `${num(c.count)}件`,
    share: pct(c.count / store.acquiredTotal, 1),
  }));
  const cols: TableColumn<R>[] = [
    {key: 'label', header: '種類', width: proportional(1, {minWidth: 140})},
    {key: 'count', header: '件数', width: pixel(80)},
    {key: 'share', header: '割合', width: pixel(72)},
  ];
  return (
    <ChartCard
      title={`入手の内訳1位：${first.label}（${pct(first.count / store.acquiredTotal)}）`}
      subtitle="ストアの記録にある入手の内訳。無料の入手を含み、贈ったギフトとRPのチャージは除く"
      source={`ストアの取引 ${num(store.total)}件から集計`}
      table={{rows, columns: cols}}>
      <BarList
        items={items}
        format={v => `${num(v)}件`}
        total={store.acquiredTotal}
        ariaLabel={`入手したものの内訳。最多は${first.label}。`}
      />
    </ChartCard>
  );
}

function StoreFacts({store, spend}: {store: StoreAnalysis; spend: SpendAnalysis | null}) {
  const be = store.beSpentBy;
  return (
    <InfoCard title="ストアの数字" hint="残高は、いちばん新しい取引の時点のもの">
      <MetadataList columns="multi">
        <MetadataListItem label="RP">
          使った {num(store.rpSpent)} RP ・ 残り {store.rpBalance == null ? '—' : `${num(store.rpBalance)} RP`}
        </MetadataListItem>
        {spend?.pricePerRp ? (
          <MetadataListItem label="1 RPあたり">
            約{spend.pricePerRp.toFixed(2)}円（チャージ額 ÷ 受け取ったRP）
          </MetadataListItem>
        ) : null}
        <MetadataListItem label="ブルーエッセンス">
          使った {num(store.beSpent)} ・ 残り {store.beBalance == null ? '—' : num(store.beBalance)}
        </MetadataListItem>
        {be.length > 0 && store.beSpent > 0 ? (
          <MetadataListItem label="ブルーエッセンスの使い道">
            {be
              .filter(c => c.amount / store.beSpent >= 0.005)
              .map(c => `${c.label} ${pct(c.amount / store.beSpent)}`)
              .join('、')}
          </MetadataListItem>
        ) : null}
        <MetadataListItem label="入手したチャンピオン">
          {num(store.championsOwned)}体
          {store.championsUnknown === 0 && store.championsOwned === store.championsKnown ? '（全チャンピオン）' : ''}
        </MetadataListItem>
        <MetadataListItem label="ギフト">
          贈った {num(store.giftsSent)}件（{num(store.rpGiftSpent)} RP） ・ 受け取った {num(store.giftsReceived)}件
        </MetadataListItem>
      </MetadataList>
    </InfoCard>
  );
}

function Charges({spend}: {spend: SpendAnalysis}) {
  type R = TableRowData & {date: string; amount: string; method: string};
  const rows: R[] = [...spend.charges]
    .reverse()
    .map((c, i) => ({id: String(i), date: dateLong(c.t), amount: cash(c.amount, c.currency), method: c.method}));
  const cols: TableColumn<R>[] = [
    {key: 'date', header: '日付', width: pixel(140)},
    {key: 'amount', header: '金額', width: pixel(104)},
    {key: 'method', header: '支払い方法', width: proportional(1, {minWidth: 120})},
  ];
  return (
    <InfoCard
      title="RPチャージの一覧"
      hint={`${num(spend.count)}回 ・ 1回あたり平均${cash(spend.total / spend.count, spend.currency)} ・ 最高${cash(spend.largest, spend.currency)}`}>
      <Collapsible trigger={<Text type="label">{num(spend.count)}件を表示</Text>} defaultIsOpen={false}>
        <DataTable rows={rows} columns={cols} phoneRow={r => ({label: r.amount, description: r.method, end: r.date})} />
      </Collapsible>
    </InfoCard>
  );
}

export function SpendSection({spend, store}: {spend: SpendAnalysis | null; store: StoreAnalysis | null}) {
  const hint = [
    spend ? `RPチャージ ${num(spend.count)}件` : null,
    store ? `ストアの取引 ${num(store.total)}件` : null,
  ]
    .filter(Boolean)
    .join(' ・ ');
  return (
    <VStack gap={6}>
      <SectionHeading id="spend" title="課金とストア" hint={hint || undefined} />
      {spend || store ? (
        <VStack gap={3}>
          <CardGrid>
            {spend ? <ByYear spend={spend} /> : null}
            {store && store.rpSpent > 0 && store.rpSpentBy.length > 0 ? <RpUse store={store} /> : null}
          </CardGrid>
          {store && store.skinChampions.length > 0 ? <SkinChampions store={store} /> : null}
          {store && store.skinChampions.length > 0 ? <Collection store={store} /> : null}
          {store && store.acquired.length > 0 ? <Acquired store={store} /> : null}
          {store ? <StoreFacts store={store} spend={spend} /> : null}
          {spend ? <Charges spend={spend} /> : null}
        </VStack>
      ) : (
        <EmptyState
          isCompact
          title="課金とストアの記録がありません"
          description="このファイルにはLoLのストア取引とRPチャージの記録が入っていませんでした。"
        />
      )}
    </VStack>
  );
}
