import { Pressable, TextInput, View } from 'react-native';

import { colors } from '@/constants/theme';
import { ROUTE_FILTERS, type RouteFilter } from '@/services/driverService';
import type { Driver, QueueStatus, QueueTab } from '@/types/driver';
import { AppText } from '@packages/ui/AppText';
import { Avatar } from '@packages/ui/Avatar';
import { Badge, type BadgeTone } from '@packages/ui/Badge';
import { Card } from '@packages/ui/Card';
import { Icon, type IconName } from '@packages/ui/Icon';
import { IconButton } from '@packages/ui/IconButton';
import { SegmentedControl } from '@packages/ui/SegmentedControl';
import { Select } from '@packages/ui/Select';
import type { PressState } from '@packages/ui/utils/pressState';

import { styles } from './styles';

export const STATUS_META: Record<QueueStatus, { label: string; tone: BadgeTone; icon: IconName; color: string }> = {
  ready: { label: 'Ready for Final Signoff', tone: 'success', icon: 'check-circle-outline', color: colors.tertiary },
  documents: { label: 'Documents Review', tone: 'neutral', icon: 'pending', color: colors.secondary },
  action: { label: 'Action Required', tone: 'warning', icon: 'warning-amber', color: colors.error },
  dispatched: { label: 'Active & Dispatched', tone: 'info', icon: 'sensors', color: colors.telemetryStrong },
  suspended: { label: 'Suspended', tone: 'warning', icon: 'block', color: colors.error },
};

type ControlsProps = {
  tab: QueueTab;
  onTabChange: (tab: QueueTab) => void;
  counts: Record<QueueTab, number>;
  query: string;
  onQueryChange: (query: string) => void;
  route: RouteFilter;
  onRouteChange: (route: RouteFilter) => void;
  onExport: () => void;
  stacked: boolean;
};

/** Tabs, search, corridor filter, and roster export. */
export function QueueControls({
  tab,
  onTabChange,
  counts,
  query,
  onQueryChange,
  route,
  onRouteChange,
  onExport,
  stacked,
}: ControlsProps) {
  return (
    <Card padding="sm" style={[styles.controls, stacked && styles.controlsStacked]}>
      <SegmentedControl
        variant="white"
        value={tab}
        onChange={onTabChange}
        segments={[
          { value: 'pending', label: 'Pending Approval', count: counts.pending },
          { value: 'active', label: 'Active Drivers', count: counts.active },
          { value: 'suspended', label: 'Suspended / Incomplete', count: counts.suspended },
        ]}
      />
      <View style={[styles.controlsRight, stacked && styles.controlsRightStacked]}>
        <View style={styles.search}>
          <Icon name="search" size={20} color={colors.onSurfaceVariant} />
          <TextInput
            value={query}
            onChangeText={onQueryChange}
            placeholder="Search name, DRV ID, or plate"
            placeholderTextColor={colors.secondary}
            accessibilityLabel="Search drivers"
            style={styles.searchInput}
            testID="driver-search"
          />
          {query ? (
            <IconButton
              icon="cancel"
              size={18}
              color={colors.onSurfaceVariant}
              accessibilityLabel="Clear search"
              onPress={() => onQueryChange('')}
            />
          ) : null}
        </View>
        <Select
          options={ROUTE_FILTERS}
          value={route}
          onChange={onRouteChange}
          accessibilityLabel="Corridor filter"
          style={styles.routeSelect}
        />
        <IconButton
          icon="file-download"
          accessibilityLabel="Download compliance roster"
          onPress={onExport}
          variant="card"
        />
      </View>
    </Card>
  );
}

type QueueListProps = {
  drivers: Driver[];
  total: number;
  selectedId: string | undefined;
  onSelect: (id: string) => void;
  approvedIds: ReadonlySet<string>;
};

export function QueueList({ drivers, total, selectedId, onSelect, approvedIds }: QueueListProps) {
  return (
    <View style={styles.queue}>
      <View style={styles.rowBetween}>
        <View style={styles.rowSm}>
          <AppText variant="headlineSm" bold>
            Queue Manifest
          </AppText>
          <Badge label="Nov 09, 2026" tone="neutral" pill={false} />
        </View>
        <AppText variant="labelSm" color={colors.onSurfaceVariant}>
          Sorted by: <AppText variant="labelSm">Urgency & Time</AppText>
        </AppText>
      </View>
      {drivers.length === 0 ? (
        <Card style={styles.emptyQueue}>
          <Icon name="person-search" size={32} color={colors.secondary} />
          <AppText variant="headlineSm" bold>
            No drivers match
          </AppText>
          <AppText variant="bodySm" color={colors.onSurfaceVariant} align="center">
            Try another name, DRV ID, or plate, or switch the corridor filter to All Franchised Routes.
          </AppText>
        </Card>
      ) : (
        drivers.map((driver, index) => (
          <QueueCard
            key={driver.id}
            driver={driver}
            position={index + 1}
            selected={driver.id === selectedId}
            approved={approvedIds.has(driver.id)}
            onPress={() => onSelect(driver.id)}
          />
        ))
      )}
      {drivers.length > 0 && total > drivers.length ? (
        <AppText variant="bodySm" color={colors.onSurfaceVariant} align="center">
          Showing {drivers.length} of {total} records
        </AppText>
      ) : null}
      <View style={styles.policy}>
        <Icon name="shield" size={20} color={colors.neonOrangeDeep} />
        <View style={styles.shrink}>
          <AppText variant="labelLg" bold>
            LTFRB Modernization Standard 2026
          </AppText>
          <AppText variant="bodySm" color={colors.onSurfaceVariant}>
            All cooperative drivers require dual biometric validation, GCash Transit micro-payout wallet pairing, and
            RTK GPS beacon verification prior to corridor dispatch.
          </AppText>
        </View>
      </View>
    </View>
  );
}

type QueueCardProps = { driver: Driver; position: number; selected: boolean; approved: boolean; onPress: () => void };

function QueueCard({ driver, position, selected, approved, onPress }: QueueCardProps) {
  const meta = approved ? STATUS_META.dispatched : STATUS_META[driver.status];
  const marker =
    driver.status === 'dispatched' || approved
      ? ({ icon: 'verified', tone: 'success' } as const)
      : selected && driver.tab === 'pending'
        ? ({ label: String(position), tone: 'brand' } as const)
        : undefined;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${driver.name}, ${driver.id}, ${meta.label}`}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ hovered }: PressState) => [
        styles.card,
        hovered && !selected && styles.cardHover,
        selected && styles.cardSelected,
      ]}>
      {selected ? <View style={styles.cardAccent} /> : null}
      <View style={styles.rowBetweenTop}>
        <View style={[styles.rowSm, styles.shrink]}>
          <Avatar name={driver.name} size={44} marker={marker} />
          <View style={styles.shrink}>
            <View style={styles.rowWrapXs}>
              <AppText variant="headlineSm" bold numberOfLines={1}>
                {driver.name}
              </AppText>
              {driver.nickname ? (
                <AppText variant="labelSm" color={colors.onSurfaceVariant}>
                  “{driver.nickname}”
                </AppText>
              ) : null}
            </View>
            <AppText variant="labelSm" color={colors.onSurfaceVariant}>
              <AppText variant="labelSm" color={selected ? colors.neonOrangeDeep : colors.onSurfaceVariant}>
                {driver.id}
              </AppText>
              {'  •  '}
              {driver.submitted}
            </AppText>
          </View>
        </View>
        <Badge label={approved ? 'Approved' : meta.label} tone={meta.tone} pill={false} uppercase={false} />
      </View>
      <View style={styles.vehicleRow}>
        <View style={[styles.rowSm, styles.shrink]}>
          <Badge label={driver.routeCode} tone="brand" pill={false} />
          <AppText variant="labelMd" color={colors.onSurface} numberOfLines={1} style={styles.shrink}>
            {driver.vehicle}
          </AppText>
        </View>
        <AppText variant="labelMd" bold>
          {driver.plate}
        </AppText>
      </View>
      <View style={styles.rowBetween}>
        <View style={[styles.rowXs, styles.shrink]}>
          <Icon name={meta.icon} size={14} color={meta.color} />
          <AppText variant="labelSm" color={meta.color} numberOfLines={1} style={styles.shrink}>
            {approved ? 'Smart ID issued • Cleared for dispatch' : driver.note}
          </AppText>
        </View>
        {selected && driver.tab === 'pending' && !approved ? (
          <View style={styles.rowXs}>
            <AppText variant="labelSm" color={colors.neonOrangeDeep}>
              Reviewing Now
            </AppText>
            <Icon name="arrow-forward" size={14} color={colors.neonOrangeDeep} />
          </View>
        ) : (
          <AppText variant="labelSm" color={colors.onSurfaceVariant}>
            {driver.queueLabel}
          </AppText>
        )}
      </View>
    </Pressable>
  );
}
