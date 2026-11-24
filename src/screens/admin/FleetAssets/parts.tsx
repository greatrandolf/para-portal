import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '@/constants/theme';
import { DRIVER_STATUS_LABEL, VEHICLE_STATUS_LABEL } from '@/services/fleetService';
import type { DriverStatus, VehicleStatus } from '@/types/fleet';
import { AppText } from '@packages/ui/AppText';
import { Avatar } from '@packages/ui/Avatar';
import { Badge, type BadgeTone } from '@packages/ui/Badge';

import { styles } from './styles';

export type Column = { key: string; label: string; flex: number; align?: 'right' };

/** Header row, shown only when the table is wide enough for columns. */
export function TableHead({ columns }: { columns: readonly Column[] }) {
  return (
    <View style={styles.thead} accessibilityRole="header">
      {columns.map((c) => (
        <View key={c.key} style={[styles.cell, { flex: c.flex }]}>
          <AppText
            variant="labelSm"
            uppercase
            bold
            color={colors.onSurfaceVariant}
            align={c.align === 'right' ? 'right' : 'left'}>
            {c.label}
          </AppText>
        </View>
      ))}
    </View>
  );
}

/** A table cell: a flex column when wide, a "Label: value" line when stacked. */
export function Cell({
  column,
  stacked,
  children,
  style,
}: {
  column: Column;
  stacked: boolean;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  if (stacked) {
    return (
      <View style={styles.cellStacked}>
        <AppText variant="labelSm" uppercase color={colors.onSurfaceVariant} style={styles.cellLabel}>
          {column.label}
        </AppText>
        <View style={[styles.cellBody, style]}>{children}</View>
      </View>
    );
  }
  return <View style={[styles.cell, styles.gapXs, { flex: column.flex }, style]}>{children}</View>;
}

export function RouteChip({ label, assigned }: { label: string; assigned: boolean }) {
  return (
    <View style={[styles.routeChip, !assigned && styles.routeChipNone]}>
      <AppText variant="labelMd" bold={assigned} color={assigned ? colors.neonOrangeDeep : colors.onSurfaceVariant}>
        {label}
      </AppText>
    </View>
  );
}

export function DriverCell({ name, sub, subColor }: { name: string; sub: string; subColor?: string }) {
  return (
    <View style={styles.driver}>
      <Avatar name={name} size={32} />
      <View style={styles.shrink}>
        <AppText variant="labelLg" bold numberOfLines={1}>
          {name}
        </AppText>
        <AppText variant="labelSm" color={subColor ?? colors.onSurfaceVariant} numberOfLines={1}>
          {sub}
        </AppText>
      </View>
    </View>
  );
}

const VEHICLE_TONE: Record<VehicleStatus, BadgeTone> = {
  active: 'successSubtle',
  standby: 'telemetry',
  maintenance: 'warning',
  inactive: 'neutral',
};

export function VehicleStatusBadge({ status, note }: { status: VehicleStatus; note?: string }) {
  return (
    <Badge
      dot
      uppercase={false}
      tone={VEHICLE_TONE[status]}
      label={note ? `${VEHICLE_STATUS_LABEL[status]} (${note})` : VEHICLE_STATUS_LABEL[status]}
    />
  );
}

const DRIVER_TONE: Record<DriverStatus, BadgeTone> = {
  active: 'successSubtle',
  available: 'telemetry',
  standby: 'warning',
  leave: 'neutral',
};

export function DriverStatusBadge({ status }: { status: DriverStatus }) {
  return <Badge dot uppercase={false} tone={DRIVER_TONE[status]} label={DRIVER_STATUS_LABEL[status]} />;
}
