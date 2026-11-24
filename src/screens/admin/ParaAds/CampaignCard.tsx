import { useState } from 'react';
import { Image, View } from 'react-native';

import { colors } from '@/constants/theme';
import type { Campaign } from '@packages/tanstack/query/paraAds';
import { AppText } from '@packages/ui/AppText';
import { Badge } from '@packages/ui/Badge';
import { Button } from '@packages/ui/Button';
import { Card } from '@packages/ui/Card';
import { ProgressBar } from '@packages/ui/ProgressBar';

import { CampaignDays } from './CampaignDays';
import {
  STATUS_LABEL,
  STATUS_TONE,
  countText,
  nextActions,
  pesoText,
  remainingMicro,
  scheduleText,
  shownStatus,
  spentShare,
  viewsLeft,
} from './paraAdsText';
import { styles } from './styles';

export type CampaignAction = 'activate' | 'pause' | 'topUp' | 'edit' | 'end';

type Props = {
  campaign: Campaign;
  /** Route codes it is limited to (empty = every route). */
  routeCodes: string[];
  /** Now (epoch ms), to show ads past their end date as Finished. */
  now: number;
  busy?: boolean;
  onAction: (action: CampaignAction, campaign: Campaign) => void;
};

const ACTION: Record<CampaignAction, { label: string; icon: 'play-arrow' | 'pause' | 'add-card' | 'edit' | 'stop' }> =
  {
    activate: { label: 'Activate', icon: 'play-arrow' },
    pause: { label: 'Pause', icon: 'pause' },
    topUp: { label: 'Top up', icon: 'add-card' },
    edit: { label: 'Edit', icon: 'edit' },
    end: { label: 'End', icon: 'stop' },
  };

/**
 * One Para Ad: photo, business, schedule, price per view, and the money left after every view (live), with the
 * actions its status allows.
 */
export function CampaignCard({ campaign: c, routeCodes, now, busy, onAction }: Props) {
  const left = viewsLeft(c);
  const status = shownStatus(c, now);
  const actions = nextActions(status);
  const [showDays, setShowDays] = useState(false);
  return (
    <Card style={styles.card} testID={`campaign-${c.id}`}>
      <View style={styles.cardHead}>
        <Image
          source={{ uri: c.imageUrl }}
          style={styles.thumb}
          resizeMode="cover"
          accessibilityLabel={`${c.businessName} ad photo`}
        />
        <View style={styles.cardTitle}>
          <View style={styles.titleRow}>
            <AppText variant="headlineLg" bold>
              {c.businessName}
            </AppText>
            <Badge label={STATUS_LABEL[status]} tone={STATUS_TONE[status]} pill />
          </View>
          <AppText variant="bodyMd">{c.headline}</AppText>
          <AppText variant="bodySm" color={colors.onSurfaceVariant}>
            {scheduleText(c)}
          </AppText>
          <AppText variant="bodySm" color={colors.onSurfaceVariant}>
            {routeCodes.length ? `Routes ${routeCodes.join(', ')}` : 'Every route'}
          </AppText>
        </View>
      </View>

      <View style={styles.totals}>
        <Total label="Price per view" value={pesoText(c.pricePerViewMicro)} />
        <Total label="Purchase amount" value={pesoText(c.budgetMicro)} />
        <Total label="Spent" value={pesoText(c.spentMicro)} />
        <Total
          label="Remaining"
          value={pesoText(remainingMicro(c))}
          note={`${countText(left)} ${left === 1 ? 'view' : 'views'} left`}
          strong
          testID={`campaign-${c.id}-remaining`}
        />
        <Total label="Views" value={countText(c.views)} testID={`campaign-${c.id}-views`} />
      </View>

      <View style={styles.progress}>
        <ProgressBar value={spentShare(c)} color={colors.brand} />
        <AppText variant="bodySm" color={colors.onSurfaceVariant}>
          {`${Math.round(spentShare(c) * 100)}% of the purchase used`}
        </AppText>
      </View>

      {showDays ? <CampaignDays campaignId={c.id} /> : null}

      <View style={styles.actions}>
        {actions.map((a) => (
          <Button
            key={a}
            label={ACTION[a].label}
            icon={ACTION[a].icon}
            variant={a === 'activate' || a === 'topUp' ? 'primary' : a === 'end' ? 'danger' : 'outline'}
            disabled={busy}
            onPress={() => onAction(a, c)}
            testID={`campaign-${c.id}-${a}`}
          />
        ))}
        <Button
          label={showDays ? 'Hide daily' : 'Daily views'}
          icon="calendar-month"
          variant="ghost"
          onPress={() => setShowDays((v) => !v)}
          testID={`campaign-${c.id}-days-toggle`}
        />
      </View>
    </Card>
  );
}

function Total({
  label,
  value,
  note,
  strong,
  testID,
}: {
  label: string;
  value: string;
  note?: string;
  strong?: boolean;
  testID?: string;
}) {
  return (
    <View style={[styles.total, strong && styles.totalStrong]} testID={testID}>
      <AppText variant="labelSm" uppercase color={colors.onSurfaceVariant}>
        {label}
      </AppText>
      <AppText variant="metricTabular">{value}</AppText>
      {note ? (
        <AppText variant="bodySm" color={colors.onSurfaceVariant}>
          {note}
        </AppText>
      ) : null}
    </View>
  );
}
