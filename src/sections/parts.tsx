// Shared pieces of the report page. The frame, gaps and paddings follow Astryx's
// dashboard-scorecard template: sections are VStack gap={6} under a heading row,
// tiles and charts are Card padding={5}, chart cards sit in a two-up grid.

import {useState, type ReactNode} from 'react';
import {HStack, StackItem, VStack} from '@astryxdesign/core/Layout';
import {Grid} from '@astryxdesign/core/Grid';
import {Heading, Text} from '@astryxdesign/core/Text';
import {Card} from '@astryxdesign/core/Card';
import {SegmentedControl, SegmentedControlItem} from '@astryxdesign/core/SegmentedControl';
import {useMediaQuery} from '@astryxdesign/core/hooks';
import {List, ListItem} from '@astryxdesign/core/List';
import {Table, type TableColumn} from '@astryxdesign/core/Table';

export type TableRowData = Record<string, unknown> & {id: string};

/** True on phone-width screens, where grids give way to a single column. */
export function useIsPhone(): boolean {
  return useMediaQuery('(max-width: 700px)');
}

export function SectionHeading({id, title, hint}: {id?: string; title: string; hint?: string}) {
  return (
    <HStack hAlign="between" vAlign="center" gap={3} wrap="wrap">
      <Heading level={2} id={id} className="anchor">
        {title}
      </Heading>
      {hint ? (
        <Text type="supporting" color="secondary">
          {hint}
        </Text>
      ) : null}
    </HStack>
  );
}

/**
 * The two-up grid for chart cards (the template's trend grid). On a phone the
 * cards simply stack, so a card can never be wider than the screen.
 */
export function CardGrid({children}: {children: ReactNode}) {
  const isPhone = useIsPhone();
  if (isPhone) {
    return <VStack gap={3}>{children}</VStack>;
  }
  return (
    <Grid columns={{minWidth: 330, max: 2, repeat: 'fit'}} gap={3}>
      {children}
    </Grid>
  );
}

/** How one table row reads as a list row on a phone. */
export interface PhoneRow {
  label: string;
  description?: string;
  end?: string;
}

interface DataTableProps<T extends TableRowData> {
  rows: T[];
  columns: TableColumn<T>[];
  /**
   * On a phone, a table with many columns would have to scroll sideways. Give
   * this to stack each row instead: the page grows down, not across.
   */
  phoneRow?: (row: T) => PhoneRow;
}

export function DataTable<T extends TableRowData>({rows, columns, phoneRow}: DataTableProps<T>) {
  const isPhone = useIsPhone();
  if (isPhone && phoneRow) {
    return (
      <List hasDividers density="compact" edge="flush">
        {rows.map(row => {
          const item = phoneRow(row);
          return (
            <ListItem
              key={row.id}
              align="start"
              label={<Text type="body">{item.label}</Text>}
              description={item.description}
              endContent={
                item.end ? (
                  <Text type="supporting" color="secondary">
                    {item.end}
                  </Text>
                ) : undefined
              }
            />
          );
        })}
      </List>
    );
  }
  // The table brings its own sideways scroll region for when the columns do not fit.
  return <Table<T> data={rows} columns={columns} idKey="id" density="compact" dividers="rows" verticalAlign="top" />;
}

interface ChartCardProps<T extends TableRowData> {
  /** The conclusion, as a sentence. */
  title: string;
  /** What is plotted, in what unit, over what period. */
  subtitle?: string;
  /** Where the numbers come from. */
  source?: string;
  /** The same numbers as a table, for readers who want exact values. */
  table?: {rows: T[]; columns: TableColumn<T>[]};
  children: ReactNode;
}

/** A chart with its conclusion as the title, and a table view of the same numbers. */
export function ChartCard<T extends TableRowData>({title, subtitle, source, table, children}: ChartCardProps<T>) {
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const isPhone = useIsPhone();
  return (
    <Card padding={5}>
      <VStack gap={6}>
        <HStack hAlign="between" vAlign="start" gap={3}>
          <StackItem size="fill">
            <VStack gap={1}>
              <Heading level={3} textWrap="balance">
                {title}
              </Heading>
              {subtitle ? (
                <Text type="supporting" color="secondary">
                  {subtitle}
                </Text>
              ) : null}
            </VStack>
          </StackItem>
          {table ? (
            <StackItem>
              <SegmentedControl
                label={`「${title}」の表示`}
                size={isPhone ? 'md' : 'sm'}
                value={view}
                onChange={value => setView(value === 'table' ? 'table' : 'chart')}>
                <SegmentedControlItem label="図" value="chart" />
                <SegmentedControlItem label="表" value="table" />
              </SegmentedControl>
            </StackItem>
          ) : null}
        </HStack>
        {view === 'table' && table ? <DataTable rows={table.rows} columns={table.columns} /> : children}
        {source ? (
          <Text type="supporting" color="secondary">
            {source}
          </Text>
        ) : null}
      </VStack>
    </Card>
  );
}

/** A card with a plain heading, for lists and tables that are not charts. */
export function InfoCard({title, hint, children}: {title: string; hint?: string; children?: ReactNode}) {
  return (
    <Card padding={5}>
      <VStack gap={6}>
        <VStack gap={1}>
          <Heading level={3} textWrap="balance">
            {title}
          </Heading>
          {hint ? (
            <Text type="supporting" color="secondary">
              {hint}
            </Text>
          ) : null}
        </VStack>
        {children}
      </VStack>
    </Card>
  );
}
