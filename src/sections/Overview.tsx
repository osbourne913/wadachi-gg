// The written findings: short facts that link to the chart behind each one.
// They sit in the side rail on wide screens.

import {useState} from 'react';
import {HStack, StackItem, VStack} from '@astryxdesign/core/Layout';
import {Heading, Text} from '@astryxdesign/core/Text';
import {ClickableCard} from '@astryxdesign/core/ClickableCard';
import {Button} from '@astryxdesign/core/Button';
import {Icon} from '@astryxdesign/core/Icon';
import {CalendarDays, Clock, Gamepad2, Gem, MessageSquare, Wallet} from 'lucide-react';
import type {Finding, FindingKind} from '../lib/riot/types';
import {SectionHeading} from './parts';

const KIND_ICON: Record<FindingKind, typeof Clock> = {
  calendar: CalendarDays,
  time: Clock,
  money: Wallet,
  items: Gem,
  chat: MessageSquare,
  games: Gamepad2,
};

function FindingCard({finding}: {finding: Finding}) {
  return (
    <ClickableCard label={`${finding.title}。該当の図へ移動`} href={`#${finding.anchor}`} padding={5}>
      <HStack gap={3} vAlign="start">
        <Icon icon={KIND_ICON[finding.kind]} color="secondary" size="md" />
        <StackItem size="fill">
          <VStack gap={1}>
            <Heading level={4} accessibilityLevel={3}>
              {finding.title}
            </Heading>
            <Text type="body" color="secondary">
              {finding.detail}
            </Text>
          </VStack>
        </StackItem>
      </HStack>
    </ClickableCard>
  );
}

/** The written summary. `limit` folds the list on narrow screens. */
export function Findings({findings, limit}: {findings: Finding[]; limit?: number}) {
  const [open, setOpen] = useState(false);
  if (findings.length === 0) {
    return null;
  }
  const shown = limit && !open ? findings.slice(0, limit) : findings;
  const hidden = findings.length - shown.length;
  return (
    <VStack gap={6}>
      <SectionHeading title="読み取れたこと" hint="数字から言えることだけ" />
      <VStack gap={2}>
        {shown.map(f => (
          <FindingCard key={f.title} finding={f} />
        ))}
        {hidden > 0 ? (
          <HStack>
            <Button label={`残り${hidden}件を表示`} variant="ghost" onClick={() => setOpen(true)} />
          </HStack>
        ) : null}
      </VStack>
    </VStack>
  );
}
