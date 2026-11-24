import type { ReactNode } from 'react';
import { View } from 'react-native';

import { colors } from '@/constants/theme';
import type { ComplianceStats } from '@/types/driver';
import { formatCountdown } from '@/utils/format';
import { AppText } from '@packages/ui/AppText';
import { Badge } from '@packages/ui/Badge';
import { Card } from '@packages/ui/Card';
import { Icon, type IconName } from '@packages/ui/Icon';
import { IconButton } from '@packages/ui/IconButton';
import { ProgressBar } from '@packages/ui/ProgressBar';

import { styles } from './styles';

type BannerProps = { secondsLeft: number; onRefresh: () => void };

/** "Compliance Clearance Session" header with the audit sweep countdown. */
export function ComplianceBanner({ secondsLeft, onRefresh }: BannerProps) {
  return (
    <Card style={styles.banner}>
      <View style={[styles.rowMd, styles.shrink]}>
        <View style={styles.bannerIcon}>
          <Icon name="verified-user" size={24} color={colors.onPrimary} />
        </View>
        <View style={styles.shrink}>
          <View style={styles.rowWrap}>
            <AppText variant="headlineSm" bold>
              Compliance Clearance Session #2026-Q4
            </AppText>
            <Badge label="LTFRB Verified Sync" tone="verified" pill={false} />
          </View>
          <AppText variant="bodySm" color={colors.onSurfaceVariant}>
            Cebu City South CCSTC Central Depot • Real-time Cooperative Dispatch Authorization Desk
          </AppText>
        </View>
      </View>
      <View style={styles.rowSm}>
        <AppText variant="labelSm" uppercase color={colors.onSurfaceVariant}>
          Next Audit Sweep:
        </AppText>
        <Badge label={formatCountdown(secondsLeft)} tone="brandSubtle" pill={false} uppercase={false} />
        <IconButton icon="refresh" accessibilityLabel="Run audit sweep now" onPress={onRefresh} variant="card" />
      </View>
    </Card>
  );
}

type StatTileProps = {
  title: string;
  icon: IconName;
  accent?: boolean;
  titleColor?: string;
  children: ReactNode;
};

function StatTile({ title, icon, accent, titleColor = colors.onSurfaceVariant, children }: StatTileProps) {
  return (
    <Card style={[styles.stat, accent && styles.statAccent]}>
      <View style={styles.rowBetween}>
        <AppText variant="labelSm" uppercase color={titleColor} style={styles.shrink}>
          {title}
        </AppText>
        <View style={[styles.statIcon, accent && styles.statIconAccent]}>
          <Icon name={icon} size={18} color={accent ? colors.primaryContainer : colors.secondary} />
        </View>
      </View>
      {children}
    </Card>
  );
}

/** Four KPI tiles: enrolled, pending, on duty, compliance rate. */
export function StatsStrip({ stats, columns }: { stats: ComplianceStats; columns: 1 | 2 | 4 }) {
  return (
    <View style={[styles.statGrid, columns > 1 && styles.statGridWrap]}>
      <View style={[styles.statCell, columns === 2 && styles.statCellHalf, columns === 4 && styles.statCellQuarter]}>
        <StatTile title="Total Enrolled Drivers" icon="group">
          <View style={styles.statValueRow}>
            <AppText variant="displayLg">{stats.totalEnrolled}</AppText>
            <AppText variant="labelSm" color={colors.telemetryStrong}>
              All Signatures Valid
            </AppText>
          </View>
          <View style={styles.rowBetween}>
            <AppText variant="bodySm" color={colors.onSurfaceVariant}>
              Coop Share Verified
            </AppText>
            <AppText variant="labelMd" bold color={colors.onSurfaceVariant}>
              {stats.shareVerified}/{stats.totalEnrolled}
            </AppText>
          </View>
        </StatTile>
      </View>
      <View style={[styles.statCell, columns === 2 && styles.statCellHalf, columns === 4 && styles.statCellQuarter]}>
        <StatTile title="Pending Approvals" icon="pending-actions" accent titleColor={colors.neonOrangeDeep}>
          <View style={styles.statValueRow}>
            <View style={styles.rowXs}>
              <AppText variant="displayLg" color={colors.neonOrangeDeep}>
                {stats.pending}
              </AppText>
              <View style={styles.pendingDot} />
            </View>
            <Badge label="Action Required" tone="brandSubtle" pill={false} />
          </View>
          <View style={styles.rowBetween}>
            <AppText variant="bodySm" color={colors.onSurfaceVariant}>
              Oldest in Queue
            </AppText>
            <AppText variant="labelMd" bold color={colors.neonOrangeDeep}>
              {stats.oldestPending}
            </AppText>
          </View>
        </StatTile>
      </View>
      <View style={[styles.statCell, columns === 2 && styles.statCellHalf, columns === 4 && styles.statCellQuarter]}>
        <OnDutyTile stats={stats} />
      </View>
      <View style={[styles.statCell, columns === 2 && styles.statCellHalf, columns === 4 && styles.statCellQuarter]}>
        <ComplianceTile rate={stats.complianceRate} />
      </View>
    </View>
  );
}

export function OnDutyTile({ stats }: { stats: ComplianceStats }) {
  return (
    <StatTile title="Active On Duty" icon="commute" titleColor={colors.telemetryStrong}>
      <View style={styles.statValueRow}>
        <AppText variant="displayLg">{stats.activeOnDuty}</AppText>
        <View style={styles.rowXs}>
          <View style={[styles.dot, { backgroundColor: colors.telemetry }]} />
          <AppText variant="labelSm" color={colors.telemetryStrong}>
            100% RTK Link
          </AppText>
        </View>
      </View>
      <View style={styles.rowBetween}>
        <AppText variant="bodySm" color={colors.onSurfaceVariant} style={styles.shrink}>
          Across {stats.corridors} Franchised Corridors
        </AppText>
        <AppText variant="labelMd" bold color={colors.onSurfaceVariant}>
          {stats.onRoute17B} on 17B
        </AppText>
      </View>
    </StatTile>
  );
}

export function ComplianceTile({ rate }: { rate: number }) {
  return (
    <StatTile title="Compliance Rate" icon="verified">
      <View style={styles.statValueRow}>
        <AppText variant="displayLg">{rate}%</AppText>
        <Badge label="LTFRB + SSS" tone="telemetry" pill={false} />
      </View>
      <ProgressBar value={rate / 100} height={8} />
    </StatTile>
  );
}
