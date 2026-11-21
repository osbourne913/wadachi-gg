// The report. It opens with the story (one year at a time, full width) and then
// follows Astryx's dashboard-scorecard template: a column of sections with an
// end rail that holds the written findings. Below 1024px the rail folds into the
// top of the column, as in the template.

import {HStack, Layout, LayoutContent, LayoutHeader, LayoutPanel, VStack} from '@astryxdesign/core/Layout';
import {useMediaQuery} from '@astryxdesign/core/hooks';
import {Heading, Text} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {Icon} from '@astryxdesign/core/Icon';
import {Banner} from '@astryxdesign/core/Banner';
import {FolderOpen} from 'lucide-react';
import {dateLong, num} from '../lib/format';
import type {Report} from '../lib/riot/types';
import {Findings} from '../sections/Overview';
import {StorySection} from '../sections/Story';
import {ShareSection} from '../sections/Share';
import {PlaySection} from '../sections/Play';
import {SpendSection} from '../sections/Spend';
import {RecentSection} from '../sections/Recent';
import {ConductSection} from '../sections/Conduct';
import {AccountSection, DataSection, GamesSection} from '../sections/More';
import {SiteFooter} from './Landing';

const STACKED = {minHeight: 'auto'} as const;

interface Props {
  report: Report;
  /** Leave the report and go back to the entry page. */
  onReset: () => void;
}

function subtitle(report: Report): string {
  const parts: string[] = [];
  if (report.period) {
    const from = dateLong(report.period.from);
    const to = dateLong(report.period.to);
    parts.push(from === to ? from : `${from}〜${to}`);
  }
  parts.push(`${num(report.fileCount)}ファイル`);
  if (report.platform) {
    parts.push(report.platform);
  }
  return parts.join(' ・ ');
}

export function ReportPage({report, onReset}: Props) {
  // The rail needs about 400px of its own; below that the charts would be
  // squeezed, so the findings move inline.
  const isNarrow = useMediaQuery('(max-width: 1024px)');
  const title = report.riotId ? `${report.riotId} のデータ` : 'あなたのデータ';

  const header = (
    <LayoutHeader padding={6} hasDivider>
      <VStack gap={4}>
        <HStack gap={3} vAlign="center" hAlign="between" wrap="wrap">
          <VStack gap={1}>
            <Heading level={1}>{title}</Heading>
            <Text type="body" color="secondary">
              {subtitle(report)}
            </Text>
          </VStack>
          <Button label="別のファイルを読む" variant="secondary" icon={<Icon icon={FolderOpen} size="sm" />} onClick={onReset} />
        </HStack>
        {report.isSample ? (
          <Banner
            status="info"
            title="サンプルデータを表示しています"
            description="数字はすべて架空のものです。自分のファイルを読み込むと、同じ形のレポートになります。"
            collapsible={false}
          />
        ) : null}
        {report.errorCount > 0 ? (
          <Banner
            status="warning"
            title={`${num(report.errorCount)}個のファイルを読めませんでした`}
            description="JSONとして読めなかったファイルは、集計から外しています。"
            collapsible={false}
          />
        ) : null}
      </VStack>
    </LayoutHeader>
  );
  const sections = (
    <LayoutContent padding={6} isScrollable={false}>
      <VStack gap={10}>
        {isNarrow ? <Findings findings={report.findings} limit={3} /> : null}
        <PlaySection logins={report.logins} />
        <SpendSection spend={report.spend} store={report.store} />
        <RecentSection chat={report.chat} />
        <ConductSection reports={report.reports} penalties={report.penalties} />
        <GamesSection games={report.games} />
        <AccountSection audit={report.audit} tickets={report.tickets} />
        <DataSection report={report} />
        <SiteFooter />
      </VStack>
    </LayoutContent>
  );
  const rail =
    isNarrow || report.findings.length === 0 ? undefined : (
      <LayoutPanel width={400} padding={6} hasDivider isScrollable={false} role="complementary" label="読み取れたこと">
        <VStack className="rail-sticky">
          <Findings findings={report.findings} />
        </VStack>
      </LayoutPanel>
    );

  if (!report.story) {
    return <Layout height="auto" contentWidth={1440} header={header} content={sections} end={rail} />;
  }
  // Two layouts, one under the other. On its own a layout is at least as tall as
  // the page; stacked, each takes only the height of what it holds.
  return (
    <>
      <Layout
        height="auto"
        contentWidth={1440}
        style={STACKED}
        header={header}
        content={
          <LayoutContent padding={6} isScrollable={false}>
            <VStack gap={10}>
              <StorySection report={report} />
              <ShareSection report={report} />
            </VStack>
          </LayoutContent>
        }
      />
      <Layout height="auto" contentWidth={1440} style={STACKED} content={sections} end={rail} />
    </>
  );
}
