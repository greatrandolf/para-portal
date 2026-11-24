import { View } from 'react-native';

import { colors } from '@/constants/theme';
import { licenseNote } from '@/services/fleetService';
import type { Driver, DriverStatus, Vehicle } from '@/types/fleet';
import { AppText } from '@packages/ui/AppText';
import { Badge } from '@packages/ui/Badge';
import { Button } from '@packages/ui/Button';
import { Card } from '@packages/ui/Card';
import { Icon } from '@packages/ui/Icon';
import { IconButton } from '@packages/ui/IconButton';
import { Select } from '@packages/ui/Select';
import { TextField } from '@packages/ui/TextField';

import { Cell, DriverCell, DriverStatusBadge, TableHead, type Column } from './parts';
import { styles } from './styles';

const STATUS_OPTIONS = [
  { value: 'all', label: 'Status: All Operators' },
  { value: 'active', label: 'Active Dispatch' },
  { value: 'available', label: 'Available' },
  { value: 'standby', label: 'Standby (Shop Duty)' },
  { value: 'leave', label: 'On Scheduled Leave' },
] as const satisfies readonly { value: DriverStatus | 'all'; label: string }[];

const COLUMNS: readonly Column[] = [
  { key: 'id', label: 'Driver ID', flex: 0.9 },
  { key: 'name', label: 'Operator Full Name', flex: 2.1 },
  { key: 'phone', label: 'Contact Phone', flex: 1.1 },
  { key: 'license', label: 'LTO License & Validity', flex: 1.7 },
  { key: 'status', label: 'Account Status', flex: 1.6 },
  { key: 'unit', label: 'Assigned Unit', flex: 1 },
  { key: 'app', label: 'Driver App', flex: 1.3 },
  { key: 'shares', label: 'Coop Shareholding', flex: 1.2 },
  { key: 'actions', label: 'Actions', flex: 0.9, align: 'right' },
];

type Props = {
  drivers: Driver[];
  vehicles: ReadonlyMap<string, Vehicle>;
  total: number;
  query: string;
  onQueryChange: (q: string) => void;
  status: DriverStatus | 'all';
  onStatusChange: (s: DriverStatus | 'all') => void;
  wide: boolean;
  onAssign: (driverId: string) => void;
  onView: (driver: Driver) => void;
  onExport: () => void;
  onGiveAccess: (driver: Driver) => void;
  onRevokeAccess: (driver: Driver) => void;
  /** Driver whose access is being turned off. */
  revokingId?: string;
};

const APP_BADGE = {
  none: { label: 'No access', tone: 'neutral' },
  active: { label: 'App active', tone: 'telemetry' },
  disabled: { label: 'Turned off', tone: 'warning' },
} as const;

export function DriverAccounts({
  drivers,
  vehicles,
  total,
  query,
  onQueryChange,
  status,
  onStatusChange,
  wide,
  onAssign,
  onView,
  onExport,
  onGiveAccess,
  onRevokeAccess,
  revokingId,
}: Props) {
  const stacked = !wide;
  return (
    <View style={styles.gapMd}>
      <Card style={[styles.toolbar, styles.layerTop]}>
        <TextField
          label="Search drivers"
          placeholder="Name, driver no., or phone"
          value={query}
          onChangeText={onQueryChange}
          style={styles.search}
        />
        <Select
          options={STATUS_OPTIONS}
          value={status}
          onChange={onStatusChange}
          accessibilityLabel="Account status"
          style={styles.filter}
        />
        <Button label="LTFRB Endorsement Roster" icon="file-download" variant="outline" onPress={onExport} />
      </Card>

      <Card padding="none" style={styles.table}>
        {wide ? <TableHead columns={COLUMNS} /> : null}
        {drivers.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="badge" size={28} color={colors.secondary} />
            <AppText variant="headlineSm" bold>
              {total === 0 ? 'No driver accounts yet' : 'No drivers match'}
            </AppText>
          </View>
        ) : (
          drivers.map((d) => {
            const car = d.vehicleId ? vehicles.get(d.vehicleId) : undefined;
            const [id, name, phone, license, st, unit, app, shares, actions] = COLUMNS;
            const badge = APP_BADGE[d.appAccess];
            return (
              <View key={d.id} style={[styles.tr, stacked && styles.trStacked]} testID={`driver-row-${d.driverNo}`}>
                <Cell column={id} stacked={stacked}>
                  <AppText variant="labelLg" bold color={colors.telemetryInk} style={styles.mono}>
                    {d.driverNo}
                  </AppText>
                </Cell>
                <Cell column={name} stacked={stacked}>
                  <DriverCell name={d.name} sub={d.tenure} />
                </Cell>
                <Cell column={phone} stacked={stacked}>
                  <AppText variant="labelMd" style={styles.mono}>
                    {d.phone}
                  </AppText>
                </Cell>
                <Cell column={license} stacked={stacked}>
                  <AppText variant="labelMd" bold style={styles.mono}>
                    {d.licenseNo}
                  </AppText>
                  <AppText
                    variant="labelSm"
                    color={d.licenseRenewalSoon ? colors.neonOrangeDeep : colors.onSurfaceVariant}>
                    {licenseNote(d)}
                  </AppText>
                </Cell>
                <Cell column={st} stacked={stacked}>
                  <DriverStatusBadge status={d.status} />
                </Cell>
                <Cell column={unit} stacked={stacked}>
                  <AppText variant="labelLg" bold={!!car} color={car ? colors.onSurface : colors.outline}>
                    {car ? `${car.code}${car.status === 'maintenance' ? ' (Maint)' : ''}` : 'Unassigned'}
                  </AppText>
                </Cell>
                <Cell column={app} stacked={stacked} style={styles.appCell}>
                  <Badge label={badge.label} tone={badge.tone} />
                  <View style={styles.rowWrapXs}>
                    <Button
                      label={d.appAccess === 'active' ? 'New code' : 'Give access'}
                      icon="qr-code-2"
                      variant="outline"
                      onPress={() => onGiveAccess(d)}
                      testID={`give-access-${d.driverNo}`}
                    />
                    {d.appAccess === 'active' ? (
                      <Button
                        label="Turn off"
                        icon="block"
                        variant="danger"
                        loading={revokingId === d.id}
                        onPress={() => onRevokeAccess(d)}
                        testID={`revoke-access-${d.driverNo}`}
                      />
                    ) : null}
                  </View>
                </Cell>
                <Cell column={shares} stacked={stacked}>
                  <AppText variant="labelMd" color={colors.onSurfaceVariant}>
                    {d.shares} Shares ({d.shareNote})
                  </AppText>
                </Cell>
                <Cell column={actions} stacked={stacked} style={styles.actions}>
                  {d.status === 'available' ? (
                    <Button label="Assign" variant="primary" onPress={() => onAssign(d.id)} />
                  ) : (
                    <IconButton
                      icon="badge"
                      variant="card"
                      accessibilityLabel={`View ${d.name}`}
                      onPress={() => onView(d)}
                    />
                  )}
                </Cell>
              </View>
            );
          })
        )}
        <View style={styles.tfoot}>
          <AppText variant="bodySm" color={colors.onSurfaceVariant}>
            Showing {drivers.length} of {total} driver accounts
          </AppText>
        </View>
      </Card>
    </View>
  );
}
