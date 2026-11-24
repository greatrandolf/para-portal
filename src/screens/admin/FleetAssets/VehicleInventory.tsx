import { View } from 'react-native';

import { colors } from '@/constants/theme';
import { VEHICLE_TYPE_LABEL, paginate, routeLabel, type RouteInfo, type VehicleFilters } from '@/services/fleetService';
import type { Driver, Vehicle, VehicleStatus, VehicleType } from '@/types/fleet';
import { AppText } from '@packages/ui/AppText';
import { Badge } from '@packages/ui/Badge';
import { Button } from '@packages/ui/Button';
import { Card } from '@packages/ui/Card';
import { Icon } from '@packages/ui/Icon';
import { IconButton } from '@packages/ui/IconButton';
import { Select } from '@packages/ui/Select';
import { TextField } from '@packages/ui/TextField';

import { Cell, DriverCell, RouteChip, TableHead, VehicleStatusBadge, type Column } from './parts';
import { styles } from './styles';

const TYPE_OPTIONS = [
  { value: 'all', label: 'Type: All' },
  { value: 'modern', label: 'Modern PUV' },
  { value: 'traditional', label: 'Traditional' },
  { value: 'electric', label: 'Electric PUV' },
] as const satisfies readonly { value: VehicleType | 'all'; label: string }[];

const STATUS_OPTIONS = [
  { value: 'all', label: 'Status: All' },
  { value: 'active', label: 'Active Service' },
  { value: 'standby', label: 'Standby' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'inactive', label: 'Inactive' },
] as const satisfies readonly { value: VehicleStatus | 'all'; label: string }[];

const COLUMNS: readonly Column[] = [
  { key: 'code', label: 'Vehicle Code', flex: 1 },
  { key: 'plate', label: 'Plate Number', flex: 0.9 },
  { key: 'make', label: 'Make & Spec Type', flex: 2.2 },
  { key: 'route', label: 'Assigned Route', flex: 1.5 },
  { key: 'status', label: 'Operational Status', flex: 1.6 },
  { key: 'driver', label: 'Assigned Driver', flex: 2 },
  { key: 'actions', label: 'Actions', flex: 1, align: 'right' },
];

const TYPE_TONE = { modern: 'telemetry', traditional: 'brandSubtle', electric: 'successSubtle' } as const;

const DOT: Record<VehicleStatus, string> = {
  active: colors.telemetry,
  standby: colors.secondary,
  maintenance: colors.amberFare,
  inactive: colors.outline,
};

type Props = {
  vehicles: Vehicle[];
  total: number;
  drivers: ReadonlyMap<string, Driver>;
  routes: ReadonlyMap<string, RouteInfo>;
  filters: VehicleFilters;
  onFiltersChange: (f: VehicleFilters) => void;
  page: number;
  onPageChange: (page: number) => void;
  wide: boolean;
  /** Unit ids whose status change is waiting for the server. */
  pendingIds: ReadonlySet<string>;
  onAssign: (vehicleId: string) => void;
  onToggleMaintenance: (vehicle: Vehicle) => void;
  onView: (vehicle: Vehicle) => void;
};

export function VehicleInventory({
  vehicles,
  total,
  drivers,
  routes,
  filters,
  onFiltersChange,
  page,
  onPageChange,
  wide,
  pendingIds,
  onAssign,
  onToggleMaintenance,
  onView,
}: Props) {
  const view = paginate(vehicles, page);
  const set = (patch: Partial<VehicleFilters>) => {
    onFiltersChange({ ...filters, ...patch });
    onPageChange(1);
  };
  const stacked = !wide;
  const routeOptions = [
    { value: 'all', label: 'Route: All Lines' },
    ...[...routes.values()].map((r) => ({ value: r.id, label: `Route ${r.code} (${r.name})` })),
  ];

  return (
    <View style={styles.gapMd}>
      <Card style={[styles.toolbar, styles.layerTop]}>
        <TextField
          label="Search vehicles"
          placeholder="Vehicle code or plate, e.g. PARA-001"
          value={filters.query}
          onChangeText={(query) => set({ query })}
          autoCapitalize="characters"
          style={styles.search}
        />
        <Select
          options={TYPE_OPTIONS}
          value={filters.type}
          onChange={(type) => set({ type })}
          accessibilityLabel="Vehicle type"
          style={styles.filter}
        />
        <Select
          options={routeOptions}
          value={filters.route}
          onChange={(route) => set({ route })}
          accessibilityLabel="Route"
          style={styles.filter}
        />
        <Select
          options={STATUS_OPTIONS}
          value={filters.status}
          onChange={(status) => set({ status })}
          accessibilityLabel="Operational status"
          style={styles.filter}
        />
      </Card>

      <Card padding="none" style={styles.table}>
        {wide ? <TableHead columns={COLUMNS} /> : null}
        {view.items.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="directions-bus" size={28} color={colors.secondary} />
            <AppText variant="headlineSm" bold>
              {total === 0 ? 'No vehicles registered yet' : 'No vehicles match'}
            </AppText>
            <AppText variant="bodySm" color={colors.onSurfaceVariant}>
              {total === 0 ? 'Use Register Vehicle to onboard the first unit.' : 'Try another code, plate, or filter.'}
            </AppText>
          </View>
        ) : (
          view.items.map((v) => {
            const driver = v.driverId ? drivers.get(v.driverId) : undefined;
            const pending = pendingIds.has(v.id);
            const [code, plate, make, route, status, drv, actions] = COLUMNS;
            return (
              <View
                key={v.id}
                style={[styles.tr, stacked && styles.trStacked, v.status === 'inactive' && styles.trMuted]}
                testID={`vehicle-row-${v.code}`}>
                <Cell column={code} stacked={stacked}>
                  <View style={styles.rowXs}>
                    <View style={[styles.dot, { backgroundColor: DOT[v.status] }]} />
                    <AppText variant="labelLg" bold style={styles.mono}>
                      {v.code}
                    </AppText>
                  </View>
                </Cell>
                <Cell column={plate} stacked={stacked}>
                  <AppText variant="labelLg" bold color={colors.telemetryInk} style={styles.mono}>
                    {v.plate}
                  </AppText>
                </Cell>
                <Cell column={make} stacked={stacked}>
                  <View style={styles.rowWrapXs}>
                    <Badge label={VEHICLE_TYPE_LABEL[v.type]} tone={TYPE_TONE[v.type]} pill={false} />
                    <AppText variant="labelLg" bold>
                      {v.make}
                    </AppText>
                  </View>
                  <AppText variant="labelSm" color={colors.onSurfaceVariant}>
                    {v.seats} Seats • {v.specs}
                  </AppText>
                </Cell>
                <Cell column={route} stacked={stacked}>
                  <RouteChip label={routeLabel(routes, v.routeId, v.routeCode)} assigned={!!v.routeId} />
                </Cell>
                <Cell column={status} stacked={stacked}>
                  <VehicleStatusBadge status={v.status} note={v.statusNote ?? undefined} />
                </Cell>
                <Cell column={drv} stacked={stacked}>
                  {driver ? (
                    <DriverCell
                      name={driver.name}
                      sub={`${driver.driverNo}${v.status === 'maintenance' ? ' • Unit in Shop' : ''}`}
                      subColor={v.status === 'maintenance' ? colors.neonOrangeDeep : undefined}
                    />
                  ) : (
                    <AppText variant="labelMd" color={colors.onSurfaceVariant}>
                      {v.status === 'inactive' ? 'None' : 'Unassigned • Standby'}
                    </AppText>
                  )}
                </Cell>
                <Cell column={actions} stacked={stacked} style={styles.actions}>
                  {v.status === 'inactive' ? (
                    <IconButton
                      icon="visibility"
                      variant="card"
                      accessibilityLabel={`View ${v.code}`}
                      onPress={() => onView(v)}
                    />
                  ) : (
                    <>
                      <IconButton
                        icon={v.status === 'maintenance' ? 'build-circle' : 'build'}
                        variant="card"
                        color={v.status === 'maintenance' ? colors.neonOrangeDeep : colors.onSurfaceVariant}
                        accessibilityLabel={
                          v.status === 'maintenance' ? `Return ${v.code} to service` : `Send ${v.code} to maintenance`
                        }
                        onPress={pending ? undefined : () => onToggleMaintenance(v)}
                      />
                      {v.status === 'maintenance' ? null : driver ? (
                        <IconButton
                          icon="sync-alt"
                          variant="card"
                          color={colors.telemetryStrong}
                          accessibilityLabel={`Reassign ${v.code}`}
                          onPress={() => onAssign(v.id)}
                        />
                      ) : (
                        <Button label="Deploy" variant="primary" onPress={() => onAssign(v.id)} />
                      )}
                    </>
                  )}
                </Cell>
              </View>
            );
          })
        )}
        <View style={styles.tfoot}>
          <AppText variant="bodySm" color={colors.onSurfaceVariant}>
            Showing {view.items.length} of {vehicles.length}
            {vehicles.length === total ? '' : ` matching (${total} total)`} units in Cebu City South CCSTC
          </AppText>
          <View style={styles.rowSm}>
            <Button
              label="Prev"
              icon="arrow-back"
              variant="outline"
              disabled={view.page <= 1}
              onPress={() => onPageChange(view.page - 1)}
            />
            <AppText variant="labelLg" bold>
              Page {view.page} of {view.pages}
            </AppText>
            <Button
              label="Next"
              icon="arrow-forward"
              variant="outline"
              disabled={view.page >= view.pages}
              onPress={() => onPageChange(view.page + 1)}
            />
          </View>
        </View>
      </Card>
    </View>
  );
}
