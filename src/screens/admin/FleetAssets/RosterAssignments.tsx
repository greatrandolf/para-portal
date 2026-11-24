import { View } from 'react-native';

import { colors } from '@/constants/theme';
import {
  DRIVER_STATUS_LABEL,
  VEHICLE_STATUS_LABEL,
  VEHICLE_TYPE_LABEL,
  formatDay,
  isIsoDay,
  type RouteInfo,
} from '@/services/fleetService';
import { GPS_STALE_MS, useDriverPresence, useNow, type DriverPresence } from '@/hooks/useDriverPresence';
import type { Assignment, Driver, Vehicle } from '@/types/fleet';
import { AppText } from '@packages/ui/AppText';
import { Badge, type BadgeTone } from '@packages/ui/Badge';
import { Button } from '@packages/ui/Button';
import { Card } from '@packages/ui/Card';
import { Icon } from '@packages/ui/Icon';
import { Select } from '@packages/ui/Select';
import { TextField } from '@packages/ui/TextField';

import { Cell, DriverCell, TableHead, type Column } from './parts';
import { styles } from './styles';

export type AssignDraft = { vehicleId: string; driverId: string; routeId: string; start: string };

const NONE = '';

const timeOf = (ms: number) => new Date(ms).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });

/**
 * Assignment status with the driver's live duty and connection (driver app):
 * - the app's presence is offline (closed, killed, no signal, locked) → Disconnected;
 * - in service but no GPS fix for 90 s → No GPS Signal;
 * - not started yet (the driver has not tapped Start Tracking) → Assigned • Not Started;
 * - otherwise the duty status. Without presence yet (loading), the duty status alone.
 */
export function assignmentStatus(
  a: Pick<Assignment, 'state' | 'dutyStatus' | 'endedBy'>,
  presence?: DriverPresence,
  now = Date.now(),
): { label: string; tone: BadgeTone } {
  if (a.state === 'completed') {
    return { label: a.endedBy === 'driver' ? 'Completed (Shift Ended)' : 'Completed (Rotated)', tone: 'neutral' };
  }
  if (presence && !presence.online) {
    return {
      label: presence.since ? `Disconnected • since ${timeOf(presence.since)}` : 'Disconnected • App not open',
      tone: 'warning',
    };
  }
  if (a.dutyStatus === 'ready') return { label: 'Assigned • Not Started', tone: 'neutral' };
  if (a.dutyStatus === 'on_break') return { label: 'On Break • GPS Paused', tone: 'brandSubtle' };
  if (presence && (!presence.lastFixAt || now - presence.lastFixAt > GPS_STALE_MS)) {
    return { label: 'In Service • No GPS Signal', tone: 'warning' };
  }
  return { label: 'In Service • Live GPS', tone: 'successSubtle' };
}

const COLUMNS: readonly Column[] = [
  { key: 'unit', label: 'Vehicle Unit', flex: 1 },
  { key: 'driver', label: 'Assigned Driver', flex: 1.6 },
  { key: 'period', label: 'Deployment Period', flex: 1.5 },
  { key: 'status', label: 'Assignment Status', flex: 1.3 },
];

type Props = {
  draft: AssignDraft;
  onDraftChange: (d: AssignDraft) => void;
  /** Units and drivers that can be paired. */
  units: readonly Vehicle[];
  drivers: readonly Driver[];
  allDrivers: ReadonlyMap<string, Driver>;
  allVehicles: ReadonlyMap<string, Vehicle>;
  routes: ReadonlyMap<string, RouteInfo>;
  assignments: readonly Assignment[];
  /** The live (onSnapshot) connection is up: statuses update by themselves. */
  live?: boolean;
  submitting: boolean;
  serverError?: string;
  onConfirm: () => void;
  /** Id of the assignment being ended, if any. */
  endingId?: string;
  onEnd: (assignment: Assignment) => void;
  wide: boolean;
};

export function RosterAssignments({
  draft,
  onDraftChange,
  units,
  drivers,
  allDrivers,
  allVehicles,
  routes,
  assignments,
  live,
  submitting,
  serverError,
  onConfirm,
  endingId,
  onEnd,
  wide,
}: Props) {
  const unit = units.find((u) => u.id === draft.vehicleId);
  const driver = drivers.find((d) => d.id === draft.driverId);
  const route = routes.get(draft.routeId);
  const set = (patch: Partial<AssignDraft>) => onDraftChange({ ...draft, ...patch });

  // Warn when the pick replaces someone else's pairing.
  const unitTakenBy = unit?.driverId && unit.driverId !== draft.driverId ? allDrivers.get(unit.driverId) : undefined;
  const driverOnUnit =
    driver?.vehicleId && driver.vehicleId !== draft.vehicleId ? allVehicles.get(driver.vehicleId) : undefined;
  const dateOk = isIsoDay(draft.start);
  const ready = !!unit && !!driver && !!route && dateOk;
  const ongoingDrivers = assignments.filter((a) => a.state === 'ongoing').map((a) => a.driverId);
  const ongoing = ongoingDrivers.length;
  // Driver app connection (Realtime Database presence), live; re-checked every 15 s for a stale GPS fix.
  const presence = useDriverPresence(ongoingDrivers);
  const now = useNow();
  const stacked = !wide;

  return (
    <View style={[styles.roster, wide && styles.rosterWide]}>
      <Card elevated style={[styles.rosterForm, wide && styles.rosterFormWide, styles.layerTop]}>
        <View style={styles.rowBetween}>
          <AppText variant="headlineSm" bold style={styles.shrink}>
            New Vehicle-Driver Assignment
          </AppText>
          <Badge label="Dispatch 04" tone="brandSubtle" pill={false} />
        </View>
        <AppText variant="bodySm" color={colors.onSurfaceVariant}>
          Pair certified drivers with ready fleet units to issue the trip authorization. The driver starts live GPS from the app.
        </AppText>

        <View style={[styles.gapXs, { zIndex: 4 }]}>
          <AppText variant="labelMd" bold>
            Select Available Fleet Unit
          </AppText>
          <Select
            accessibilityLabel="Fleet unit"
            value={draft.vehicleId}
            onChange={(vehicleId) => {
              const picked = units.find((u) => u.id === vehicleId);
              set({
                vehicleId,
                routeId: picked?.routeId && routes.has(picked.routeId) ? picked.routeId : draft.routeId,
              });
            }}
            options={[
              { value: NONE, label: units.length ? 'Choose a unit…' : 'No units in service or standby' },
              ...units.map((u) => ({
                value: u.id,
                label: `${u.code} • ${u.plate} [${VEHICLE_TYPE_LABEL[u.type]} – ${u.driverId ? 'Paired' : VEHICLE_STATUS_LABEL[u.status]}]`,
              })),
            ]}
          />
        </View>

        <View style={[styles.gapXs, { zIndex: 3 }]}>
          <AppText variant="labelMd" bold>
            Select Certified Driver Account
          </AppText>
          <Select
            accessibilityLabel="Driver account"
            value={draft.driverId}
            onChange={(driverId) => set({ driverId })}
            options={[
              { value: NONE, label: drivers.length ? 'Choose a driver…' : 'No drivers available' },
              ...drivers.map((d) => {
                const on = d.vehicleId ? allVehicles.get(d.vehicleId) : undefined;
                return {
                  value: d.id,
                  label: `${d.driverNo} • ${d.name} [${on ? `On ${on.code}` : DRIVER_STATUS_LABEL[d.status]}]`,
                };
              }),
            ]}
          />
        </View>

        <View style={[styles.formRow, { zIndex: 2 }]}>
          <TextField
            label="Start Shift"
            value={draft.start}
            onChangeText={(start) => set({ start })}
            placeholder="YYYY-MM-DD"
            error={draft.start && !dateOk ? 'Use YYYY-MM-DD.' : undefined}
            style={styles.formHalf}
          />
          <View style={[styles.formHalf, styles.gapXs]}>
            <AppText variant="labelMd" bold>
              Target Route Corridor
            </AppText>
            <Select
              accessibilityLabel="Route corridor"
              value={draft.routeId}
              onChange={(routeId) => set({ routeId })}
              options={[
                { value: NONE, label: routes.size ? 'Choose a route…' : 'No active routes' },
                ...[...routes.values()].map((r) => ({ value: r.id, label: `Route ${r.code}` })),
              ]}
            />
          </View>
        </View>

        {route ? (
          <View style={styles.routeCard}>
            <Icon name="alt-route" size={22} color={colors.telemetryStrong} />
            <View style={[styles.shrink, styles.flex]}>
              <AppText variant="labelLg" bold>
                Route {route.code} ({route.name})
              </AppText>
              <AppText variant="labelSm" color={colors.onSurfaceVariant}>
                {route.km}km Loop • {route.stops} Active Waypoints
              </AppText>
            </View>
            <Badge label={`${route.code} Trunk`} tone="telemetry" pill={false} />
          </View>
        ) : null}

        {driver ? (
          <View style={styles.checks}>
            <Badge label="LTFRB CPC Validation OK" icon="verified" tone="successSubtle" uppercase={false} />
            <Badge
              label={driver.licenseRenewalSoon ? 'License Renewal Due' : 'License Valid'}
              icon={driver.licenseRenewalSoon ? 'warning' : 'check-circle'}
              tone={driver.licenseRenewalSoon ? 'warning' : 'successSubtle'}
              uppercase={false}
            />
          </View>
        ) : null}

        {unitTakenBy || driverOnUnit ? (
          <View style={styles.warning}>
            <Icon name="info-outline" size={18} color={colors.onErrorContainer} />
            <AppText variant="bodySm" color={colors.onErrorContainer} style={styles.shrink}>
              {unitTakenBy ? `${unit?.code} is with ${unitTakenBy.name}, who will be released. ` : ''}
              {driverOnUnit ? `${driver?.name} will leave ${driverOnUnit.code}, which goes to standby.` : ''}
            </AppText>
          </View>
        ) : null}

        {serverError ? (
          <View style={styles.warning}>
            <Icon name="error-outline" size={18} color={colors.onErrorContainer} />
            <AppText variant="bodySm" color={colors.onErrorContainer} style={styles.shrink}>
              {serverError}
            </AppText>
          </View>
        ) : null}

        <Button
          label="Confirm & Deploy Driver Assignment"
          icon="how-to-reg"
          variant="primary"
          size="lg"
          fullWidth
          loading={submitting}
          disabled={!ready || submitting}
          onPress={onConfirm}
          testID="confirm-assignment"
        />
      </Card>

      <Card padding="none" style={[styles.table, styles.rosterHistory]}>
        <View style={[styles.rowBetween, styles.historyHead]}>
          <View style={styles.shrink}>
            <AppText variant="headlineSm" bold>
              Assignment History & Audit Roster
            </AppText>
            <AppText variant="bodySm" color={colors.onSurfaceVariant}>
              Verified cooperative ledger records
            </AppText>
          </View>
          <View style={styles.rowWrapXs}>
            {live ? <Badge label="Live" dot tone="successSubtle" /> : null}
            <Badge label={`${ongoing} Active Rotations`} tone="telemetry" pill={false} />
          </View>
        </View>
        {wide ? <TableHead columns={COLUMNS} /> : null}
        {assignments.length === 0 ? (
          <View style={styles.empty}>
            <AppText variant="bodySm" color={colors.onSurfaceVariant}>
              No assignments yet.
            </AppText>
          </View>
        ) : null}
        {assignments.map((a) => {
          const [u, drv, period, st] = COLUMNS;
          return (
            <View
              key={a.id}
              style={[styles.tr, stacked && styles.trStacked]}
              testID={`assignment-${a.unitCode}-${a.driverNo}`}>
              <Cell column={u} stacked={stacked}>
                <AppText variant="labelLg" bold style={styles.mono}>
                  {a.unitCode}
                </AppText>
                <AppText variant="labelSm" color={colors.onSurfaceVariant}>
                  Plate: {a.plate} • {routes.get(a.routeId)?.code ?? a.routeCode}
                </AppText>
              </Cell>
              <Cell column={drv} stacked={stacked}>
                <DriverCell name={a.driverName} sub={a.driverNo} />
              </Cell>
              <Cell column={period} stacked={stacked}>
                <AppText variant="labelMd" bold>
                  {formatDay(a.start)} → {formatDay(a.end)}
                </AppText>
                <AppText variant="labelSm" color={colors.onSurfaceVariant}>
                  {a.note}
                </AppText>
              </Cell>
              <Cell column={st} stacked={stacked}>
                <View style={styles.rowWrapXs}>
                  <Badge
                    dot
                    uppercase={false}
                    {...assignmentStatus(a, presence.ready ? presence.presence.get(a.driverId) : undefined, now)}
                  />
                  {a.state === 'ongoing' ? (
                    <Button
                      label="End"
                      variant="ghost"
                      loading={endingId === a.id}
                      disabled={!!endingId}
                      onPress={() => onEnd(a)}
                    />
                  ) : null}
                </View>
              </Cell>
            </View>
          );
        })}
      </Card>
    </View>
  );
}
