// The opening of the report: the record told one year at a time.
//
// Wide screens get scrollytelling: the year card stays in place while the notes
// for each year scroll past, and the card follows the note being read. Narrow
// screens get one card per year, down the page. Either way the card is always
// drawn on a dark surface, like a game's results screen, and holds everything
// needed to be read on its own.
//
// The notes come from lib/riot/story.ts: fixed rules and fixed sentences, all
// counted in the browser.

import {useEffect, useRef, useState} from 'react';
import {HStack, VStack} from '@astryxdesign/core/Layout';
import {Heading, Text} from '@astryxdesign/core/Text';
import {Card} from '@astryxdesign/core/Card';
import {Token} from '@astryxdesign/core/Token';
import {Icon} from '@astryxdesign/core/Icon';
import {Theme} from '@astryxdesign/core/theme';
import {useMediaQuery} from '@astryxdesign/core/hooks';
import {ArrowDown} from 'lucide-react';
import {theme} from '#theme';
import {ChampionDex} from '../charts/ChampionDex';
import {HourRidge} from '../charts/HourRidge';
import {YearCalendar} from '../charts/YearCalendar';
import {useTweened} from '../charts/tween';
import {num, spanText} from '../lib/format';
import {CHAMPION_ICONS} from '../lib/riot/championIcons';
import type {LoginAnalysis, Report, Story} from '../lib/riot/types';
import {useIsPhone} from './parts';

/** Short labels for how this account plays, read straight off the numbers. */
export function playStyle(l: LoginAnalysis): string[] {
  const out: string[] = [];
  const total = l.hourTotals.reduce((a, v) => a + v, 0) || 1;
  const share = (hours: number[]) => hours.reduce((a, h) => a + l.hourTotals[h], 0) / total;
  if (l.nightShare >= 0.4) {
    out.push('夜型');
  } else if (share([5, 6, 7, 8, 9]) >= 0.25) {
    out.push('朝型');
  } else if (share([12, 13, 14, 15, 16, 17]) >= 0.35) {
    out.push('昼型');
  } else {
    out.push('夕方〜夜型');
  }
  const byDay = l.weekHour.map(row => row.reduce((a, v) => a + v, 0));
  const all = byDay.reduce((a, v) => a + v, 0) || 1;
  const weekend = (byDay[5] + byDay[6]) / all;
  if (weekend >= 0.4) {
    out.push('週末型');
  } else if (weekend <= 0.24) {
    out.push('平日型');
  }
  const rate = l.activeDays / l.spanDays;
  out.push(rate >= 0.6 ? 'ほぼ毎日' : rate >= 0.35 ? '常連' : 'マイペース');
  return out;
}

/** The figure and its unit, kept apart so the unit can be set smaller. */
function moneyParts(amount: number, currency: string): [string, string] {
  if (currency === 'JPY') {
    return [num(amount), '円'];
  }
  return [new Intl.NumberFormat('ja-JP', {minimumFractionDigits: 2, maximumFractionDigits: 2}).format(amount), ` ${currency}`];
}

// ---------- the year card ----------

interface TileProps {
  label: string;
  value: string;
  unit: string;
  /** The same measure for every year, oldest first; null where there is no data. */
  values: (number | null)[];
  active: number;
  firstYear: number;
  lastYear: number;
}

/** One figure for the year, over small bars that place the year among the others. */
function StatTile({label, value, unit, values, active, firstYear, lastYear}: TileProps) {
  const max = Math.max(1e-9, ...values.map(v => v ?? 0));
  return (
    <div className="story-tile">
      <span className="story-tile-label">{label}</span>
      <span className="story-figure">
        {value}
        {unit ? <small>{unit}</small> : null}
      </span>
      {values.length > 1 ? (
        <div aria-hidden="true" className="story-mini-wrap" style={{inlineSize: `min(100%, ${values.length * 18}px)`}}>
          <div className="story-mini">
            {values.map((v, i) => (
              <span
                key={i}
                className="story-mini-bar"
                data-active={i === active}
                data-na={v === null}
                style={v === null ? undefined : {blockSize: `${v > 0 ? Math.max(8, (v / max) * 100) : 0}%`}}
              />
            ))}
          </div>
          <div className="story-mini-axis">
            <span>{firstYear}</span>
            <span>{lastYear}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

interface CardProps {
  story: Story;
  logins: LoginAnalysis;
  index: number;
  /** stage: the fixed card of the wide layout. feed: one of the cards down the page. preview: the sample on the entry page. */
  variant: 'stage' | 'feed' | 'preview';
  /** False holds the figures and the calendar back; turning true plays them in. */
  play?: boolean;
  hasLegend?: boolean;
  /** How much the fixed card gives up to fit a short window. */
  density?: 'full' | 'compact' | 'tight';
}

export function YearCard({story, logins, index, variant, play = true, hasLegend = true, density = 'full'}: CardProps) {
  const isPhone = useIsPhone();
  const isStage = variant === 'stage';
  const isDense = density !== 'full';
  const y = story.years[index];
  const before = index > 0 ? story.years[index - 1] : null;
  const years = story.years;
  const shown = useTweened(play ? [y.days, y.cumulative, (y.nightShare ?? 0) * 100, y.spend ?? 0, y.skins?.total ?? 0] : [0, 0, 0, 0, 0]);
  const span = {firstYear: years[0].year, lastYear: years[years.length - 1].year, active: index};

  const tiles: TileProps[] = [
    {...span, label: 'ログイン日数', value: num(shown[0]), unit: '日', values: years.map(v => v.days)},
    {
      ...span,
      label: '深夜の割合',
      value: y.nightShare === null ? '—' : String(Math.round(shown[2])),
      unit: y.nightShare === null ? '' : '%',
      values: years.map(v => v.nightShare),
    },
  ];
  if (story.currency) {
    const [value, unit] = moneyParts(shown[3], story.currency);
    tiles.push({...span, label: '課金', value, unit, values: years.map(v => v.spend)});
  }

  const top = y.skins?.top ?? [];
  const more = (y.skins?.champions ?? 0) - top.length;
  const skins = y.skins ? (
    <VStack gap={2}>
      <Text type="label" color="secondary">
        スキン入手：{num(shown[4])}件
      </Text>
      <div className="story-skins">
        {top.length > 0 ? (
          <div style={{inlineSize: top.length * 40 + (top.length - 1) * 6, maxInlineSize: '100%'}}>
            <ChampionDex
              size={40}
              entries={top.map(t => ({id: t.id, name: t.name, image: CHAMPION_ICONS[t.id], count: t.count}))}
              ariaLabel={`${y.year}年に入手したスキンのチャンピオン：${top.map(t => `${t.name}${t.count}件`).join('、')}`}
            />
          </div>
        ) : null}
        {more > 0 ? (
          <Text type="supporting" color="secondary">
            ほか{num(more)}体
          </Text>
        ) : null}
      </div>
    </VStack>
  ) : null;

  const YearTag = isStage ? 'p' : 'h3';
  return (
    <Theme theme={theme} mode="dark">
      <Card padding={isPhone || isDense ? 5 : 6} className="hl-card story-card" data-variant={variant} data-density={density}>
        <VStack gap={isDense ? 4 : 5}>
          <div className="story-head" data-stacked={isPhone}>
            <YearTag className="story-year" key={y.year}>
              {y.year}
              <small>年</small>
            </YearTag>
            <span className="story-head-tag story-swap" key={`${y.year}-tag`}>
              <Token label={y.tag} size="lg" />
            </span>
            <span className="story-total">
              通算<b>{num(shown[1])}</b>日
            </span>
          </div>

          <div className="viz story-tiles" style={{gridTemplateColumns: `repeat(${tiles.length}, minmax(0, 1fr))`}}>
            {tiles.map(t => (
              <StatTile key={t.label} {...t} />
            ))}
          </div>

          <YearCalendar
            year={y.year}
            start={logins.daily.start}
            counts={logins.daily.counts}
            marks={y.marks}
            reserveLanes={isStage ? 2 : 0}
            maxStep={isDense ? 15 : 18}
            play={play}
            hasLegend={hasLegend}
            ariaLabel={`${y.year}年の毎日のログイン。ログインした日は${num(y.days)}日。`}
          />

          {isStage && density === 'tight' ? (
            skins
          ) : isStage ? (
            <div className="story-extra">
              <VStack gap={2}>
                <Text type="label" color="secondary">
                  ログインの時間帯
                </Text>
                <HourRidge
                  hours={y.hours}
                  previous={before && before.nightShare !== null ? before.hours : null}
                  height={isDense ? 76 : 104}
                  ariaLabel={`${y.year}年の、時間帯ごとのログインの分布。`}
                />
              </VStack>
              {skins}
            </div>
          ) : (
            <>
              {y.lines.length > 0 ? (
                <ul className="story-lines">
                  {y.lines.map(line => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              ) : null}
              {skins}
            </>
          )}
        </VStack>
      </Card>
    </Theme>
  );
}

// ---------- wide: scrollytelling ----------

/** The step being read: the last one whose top has passed 60% of the way down the window. */
function useActiveStep(count: number) {
  const steps = useRef<(HTMLElement | null)[]>([]);
  const [active, setActive] = useState(0);
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const line = window.innerHeight * 0.6;
      let next = 0;
      steps.current.slice(0, count).forEach((el, i) => {
        if (el && el.getBoundingClientRect().top <= line) {
          next = i;
        }
      });
      setActive(next);
    };
    const onScroll = () => {
      if (!frame) {
        frame = requestAnimationFrame(measure);
      }
    };
    measure();
    window.addEventListener('scroll', onScroll, {passive: true});
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [count]);
  return {active, steps};
}

function Scrolly({story, logins}: {story: Story; logins: LoginAnalysis}) {
  const {active, steps} = useActiveStep(story.years.length);
  // The card must fit under the navigation bar without scrolling, so a short window gets a tighter card.
  const isShort = useMediaQuery('(max-height: 760px)');
  const isShorter = useMediaQuery('(max-height: 660px)');
  return (
    <div className="story-scrolly">
      <ol className="story-steps">
        {story.years.map((y, i) => (
          <li
            key={y.year}
            ref={el => {
              steps.current[i] = el;
            }}
            className="story-step"
            data-active={i === active}>
            <Heading level={3}>{y.year}年</Heading>
            {y.lines.map(line => (
              <Text key={line} type="body" size="lg" display="block">
                {line}
              </Text>
            ))}
          </li>
        ))}
      </ol>
      <div className="story-stage">
        <YearCard
          story={story}
          logins={logins}
          index={active}
          variant="stage"
          density={isShorter ? 'tight' : isShort ? 'compact' : 'full'}
        />
      </div>
    </div>
  );
}

// ---------- narrow: one card per year ----------

/** True once the element has come into view. */
function useSeen<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) {
      return;
    }
    const io = new IntersectionObserver(
      entries => {
        if (entries.some(e => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      {rootMargin: '0px 0px -12% 0px'},
    );
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);
  return [ref, seen] as const;
}

function FeedCard(props: Omit<CardProps, 'variant' | 'play'>) {
  const [ref, seen] = useSeen<HTMLDivElement>();
  return (
    <div ref={ref}>
      <YearCard {...props} variant="feed" play={seen} />
    </div>
  );
}

// ---------- the section ----------

function StoryBody({story, logins}: {story: Story; logins: LoginAnalysis}) {
  // The fixed card needs room beside the notes and a window tall enough to hold it.
  const isTight = useMediaQuery('(max-width: 1024px), (max-height: 580px)');
  const isFeed = isTight || story.years.length < 2;
  return (
    <VStack gap={8}>
      <HStack gap={5} vAlign="end" hAlign="between" wrap="wrap">
        <h2 id="story" className="anchor story-hero">
          <span className="story-hero-label">
            ログインした日{logins.spanDays > 1 ? ` ・ ${spanText(logins.first, logins.last)}のうち` : ''}
          </span>
          <span className="hl-number">
            {num(logins.activeDays)}
            <small>日</small>
          </span>
        </h2>
        <VStack gap={3}>
          <HStack gap={2} wrap="wrap">
            {playStyle(logins).map(t => (
              <Token key={t} label={t} size="lg" />
            ))}
          </HStack>
          {isFeed ? null : (
            <HStack gap={1} vAlign="center">
              <Icon icon={ArrowDown} size="sm" color="secondary" />
              <Text type="supporting" color="secondary">
                スクロールで1年ずつ進みます
              </Text>
            </HStack>
          )}
        </VStack>
      </HStack>

      {isFeed ? (
        <VStack gap={4} className="story-feed">
          {story.years.map((y, i) => (
            <FeedCard key={y.year} story={story} logins={logins} index={i} hasLegend={i === 0} />
          ))}
        </VStack>
      ) : (
        <Scrolly story={story} logins={logins} />
      )}

      <Text type="supporting" color="secondary" display="block" className="measure">
        深夜は22時〜翌2時。1日は朝5時に切り替わる数え方です。各年のコメントは、数えた結果を決まったルールに当てはめて、この画面の中で作っています。
      </Text>
    </VStack>
  );
}

export function StorySection({report}: {report: Report}) {
  if (!report.story || !report.logins) {
    return null;
  }
  return <StoryBody story={report.story} logins={report.logins} />;
}

/** One card for the entry page: the sample's busiest year. */
export function StoryPreview({report}: {report: Report}) {
  const story = report.story;
  if (!story || !report.logins) {
    return null;
  }
  const best = story.years.reduce((a, y, i) => (y.days > story.years[a].days ? i : a), 0);
  return <YearCard story={story} logins={report.logins} index={best} variant="preview" />;
}
