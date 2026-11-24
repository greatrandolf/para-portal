import type { ReactNode } from 'react';
import { View } from 'react-native';

import { colors } from '@/constants/theme';
import type { FleetStats } from '@/services/fleetService';
import { AppText } from '@packages/ui/AppText';
import { Badge } from '@packages/ui/Badge';
import { Button } from '@packages/ui/Button';
import { Card } from '@packages/ui/Card';
import { Icon, type IconName } from '@packages/ui/Icon';
import { IconButton } from '@packages/ui/IconButton';

import { styles } from './styles';

type HeaderProps = {
  /** False while an admin views every fleet account: new records need one account picked. */
  canAdd: boolean;
  onRegisterVehicle: () => void;
  onAddDriver: () => void;
  onAssign: () => void;
  onExport: () => void;
};

export function FleetHeader({ canAdd, onRegisterVehicle, onAddDriver, onAssign, onExport }: HeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.headerText}>
        <View style={styles.eyebrow}>
          <Badge label="Fleet Operations Matrix" tone="brandSubtle" pill={false} />
          <AppText variant="labelSm" uppercase bold color={colors.telemetryStrong}>
            CCSTC South Terminal 04
          </AppText>
        </View>
        <AppText variant="displaySm" bold accessibilityRole="header">
          Fleet & Asset Management
        </AppText>
        <AppText variant="bodyMd" color={colors.onSurfaceVariant}>
          Cebu City South CCSTC Central Depot • Integrated Vehicle Records, Driver Accounts & Roster Assignments
        </AppText>
      </View>
      <View style={styles.headerActions}>
        <Button
          label="Register Vehicle"
          icon="directions-bus"
          iconColor={colors.brand}
          variant="outline"
          disabled={!canAdd}
          onPress={onRegisterVehicle}
          testID="register-vehicle"
        />
        <Button
          label="Add Driver Account"
          icon="person-add"
          iconColor={colors.telemetryStrong}
          variant="outline"
          disabled={!canAdd}
          onPress={onAddDriver}
          testID="add-driver"
        />
        <Button label="Assign Driver to Unit" icon="sync-alt" variant="primary" onPress={onAssign} testID="assign" />
        <IconButton icon="file-download" variant="card" accessibilityLabel="Export fleet records" onPress={onExport} />
      </View>
    </View>
  );
}

function StatCard({
  label,
  icon,
  tint,
  value,
  valueColor,
  caption,
  captionColor,
  children,
}: {
  label: string;
  icon: IconName;
  tint: string;
  value: number;
  valueColor?: string;
  caption: string;
  captionColor?: string;
  children: ReactNode;
}) {
  return (
    <Card elevated style={styles.stat}>
      <View style={styles.statTop}>
        <AppText variant="labelMd" uppercase bold color={colors.onSurfaceVariant} style={styles.shrink}>
          {label}
        </AppText>
        <View style={[styles.statIcon, { backgroundColor: colors.surfaceContainerLow }]}>
          <Icon name={icon} size={20} color={tint} />
        </View>
      </View>
      <View style={styles.statValue}>
        <AppText variant="metricDisplay" bold color={valueColor}>
          {value}
        </AppText>
        <AppText variant="labelMd" bold color={captionColor ?? colors.onSurfaceVariant}>
          {caption}
        </AppText>
      </View>
      <View style={styles.statFoot}>{children}</View>
    </Card>
  );
}

const Foot = ({ text, color }: { text: string; color?: string }) => (
  <AppText variant="labelMd" color={color ?? colors.onSurface}>
    {text}
  </AppText>
);
const Sep = () => <AppText color={colors.outline}>•</AppText>;

export function FleetStatsRow({ stats, onAssignNow }: { stats: FleetStats; onAssignNow: () => void }) {
  return (
    <View style={styles.stats}>
      <StatCard
        label="Registered Vehicles"
        icon="airport-shuttle"
        tint={colors.brand}
        value={stats.vehicles}
        caption="Total Fleet">
        <Foot text={`${stats.byType.modern} Modern`} />
        <Sep />
        <Foot text={`${stats.byType.traditional} Traditional`} />
        <Sep />
        <Foot text={`${stats.byType.electric} Electric`} />
        <Sep />
        <Foot text={`${stats.maintenance} Maint`} color={colors.neonOrangeDeep} />
      </StatCard>
      <StatCard
        label="Certified Drivers"
        icon="badge"
        tint={colors.telemetryStrong}
        value={stats.drivers}
        caption="LTFRB Valid"
        captionColor={colors.tertiary}>
        <Foot text={`${stats.driversActive} Active Shifts`} color={colors.telemetryStrong} />
        <Sep />
        <Foot text={`${stats.driversOnLeave} On Leave`} />
      </StatCard>
      <StatCard
        label="Active Pairings"
        icon="commute"
        tint={colors.brand}
        value={stats.pairings}
        valueColor={colors.brand}
        caption={`${stats.efficiency}% Efficiency`}
        captionColor={colors.tertiary}>
        <Foot text="Dispatched & Live" />
        <Sep />
        <Foot text="10Hz Telemetry" color={colors.telemetryStrong} />
      </StatCard>
      <StatCard
        label="Standby & Rotation"
        icon="schedule"
        tint={colors.amberFare}
        value={stats.standbyDrivers}
        valueColor={colors.neonOrangeDeep}
        caption="Drivers In Queue">
        <Foot text="Awaiting Unit Assign" color={colors.neonOrangeDeep} />
        <Button label="Assign Now" icon="arrow-forward" variant="ghost" onPress={onAssignNow} />
      </StatCard>
    </View>
  );
}
