import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';

import { colors } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useLiveAssignments } from '@/hooks/useLiveAssignments';
import { useToast } from '@/hooks/useToast';
import {
  assignableDrivers,
  assignableVehicles,
  filterDrivers,
  filterVehicles,
  formatDay,
  getFleetStats,
  routeLabel,
  toRouteInfo,
  todayIso,
  type VehicleFilters,
} from '@/services/fleetService';
import type { Assignment, Driver, DriverStatus, Vehicle } from '@/types/fleet';
import {
  useCreateAssignment,
  useCreateDriver,
  useCreateDriverAccess,
  useCreateVehicle,
  useEndAssignment,
  useFleet,
  useRevokeDriverAccess,
  useSetVehicleStatus,
} from '@packages/tanstack/query/fleet';
import { useRoutes } from '@packages/tanstack/query/routes';
import { useBreakpoint } from '@packages/responsive/useBreakpoint';
import { AppText } from '@packages/ui/AppText';
import { Button } from '@packages/ui/Button';
import { Card } from '@packages/ui/Card';
import { Dialog } from '@packages/ui/Dialog';
import { Icon } from '@packages/ui/Icon';
import { SegmentedControl } from '@packages/ui/SegmentedControl';
import { Toast } from '@packages/ui/Toast';

import { DriverAccessDialog } from './DriverAccessDialog';
import { DriverAccounts } from './DriverAccounts';
import { ALL_ACCOUNTS, FleetAccountPicker } from './FleetAccountPicker';
import { AddDriverDialog, RegisterVehicleDialog } from './FleetDialogs';
import { FleetHeader, FleetStatsRow } from './FleetOverview';
import { RosterAssignments, type AssignDraft } from './RosterAssignments';
import { VehicleInventory } from './VehicleInventory';
import { styles } from './styles';

type Tab = 'vehicles' | 'drivers' | 'roster';

const NO_FILTERS: VehicleFilters = { query: '', type: 'all', route: 'all', status: 'all' };
const emptyDraft = (): AssignDraft => ({ vehicleId: '', driverId: '', routeId: '', start: todayIso() });

/** Stitch "Fleet & Asset Management": vehicle inventory, driver accounts, and roster assignments (fleet API). */
export function FleetAssetsScreen() {
  const auth = useAuth();
  // Admins see every fleet account (with a picker); fleet users only ever get their own records.
  const seesAll = auth.can('fleet:all');
  const [account, setAccount] = useState(ALL_ACCOUNTS);
  const ownerUid = seesAll && account !== ALL_ACCOUNTS ? account : null;
  const fleet = useFleet(ownerUid);
  // Driver duty (on break, in service) and new or ended assignments show without a refresh.
  const live = useLiveAssignments(ownerUid, seesAll);
  const routesQuery = useRoutes();
  const createVehicle = useCreateVehicle();
  const createDriver = useCreateDriver();
  const createAssignment = useCreateAssignment();
  const endAssignment = useEndAssignment();
  const setStatus = useSetVehicleStatus();
  const createAccess = useCreateDriverAccess();
  const revokeAccess = useRevokeDriverAccess();
  const [accessFor, setAccessFor] = useState<Driver>();
  const [confirmRevoke, setConfirmRevoke] = useState<Driver>();

  const [tab, setTab] = useState<Tab>('vehicles');
  const [filters, setFilters] = useState(NO_FILTERS);
  const [page, setPage] = useState(1);
  const [driverQuery, setDriverQuery] = useState('');
  const [driverStatus, setDriverStatus] = useState<DriverStatus | 'all'>('all');
  const [draft, setDraft] = useState<AssignDraft>(emptyDraft);
  const [dialog, setDialog] = useState<'vehicle' | 'driver'>();
  const { toast, show, dismiss } = useToast();
  const { isPhone, atLeastLg, atLeastXl } = useBreakpoint();

  const vehicles = useMemo(() => fleet.data?.vehicles ?? [], [fleet.data]);
  const drivers = useMemo(() => fleet.data?.drivers ?? [], [fleet.data]);
  const assignments = fleet.data?.assignments ?? [];
  const owners = useMemo(() => fleet.data?.owners ?? [], [fleet.data]);
  const pickedOwner = owners.find((o) => o.uid === ownerUid);
  const canAdd = !seesAll || pickedOwner?.status === 'active';
  const routes = useMemo(() => toRouteInfo(routesQuery.data), [routesQuery.data]);
  const vehicleById = useMemo(() => new Map(vehicles.map((v) => [v.id, v])), [vehicles]);
  const driverById = useMemo(() => new Map(drivers.map((d) => [d.id, d])), [drivers]);
  const stats = useMemo(() => getFleetStats(vehicles, drivers), [vehicles, drivers]);
  const visibleVehicles = useMemo(() => filterVehicles(vehicles, filters), [vehicles, filters]);
  const visibleDrivers = useMemo(
    () => filterDrivers(drivers, driverQuery, driverStatus),
    [drivers, driverQuery, driverStatus],
  );
  // A driver and a unit can only be paired within one fleet account.
  const pairOwner = (vehicleById.get(draft.vehicleId) ?? driverById.get(draft.driverId))?.ownerUid;
  const rosterUnits = useMemo(
    () => assignableVehicles(vehicles).filter((v) => !pairOwner || v.ownerUid === pairOwner),
    [vehicles, pairOwner],
  );
  const rosterDrivers = useMemo(
    () => assignableDrivers(drivers).filter((d) => !pairOwner || d.ownerUid === pairOwner),
    [drivers, pairOwner],
  );
  const pendingStatusIds = useMemo(
    () => new Set(setStatus.isPending && setStatus.variables ? [setStatus.variables.vehicleId] : []),
    [setStatus.isPending, setStatus.variables],
  );

  /** Opens the roster form, optionally with a unit or a driver already picked. */
  const openAssign = (pick: Partial<AssignDraft> = {}) => {
    const unit = pick.vehicleId ? vehicleById.get(pick.vehicleId) : undefined;
    const routeId = unit?.routeId && routes.has(unit.routeId) ? unit.routeId : undefined;
    createAssignment.reset();
    setDraft((d) => ({ ...d, ...pick, ...(routeId ? { routeId } : {}) }));
    setTab('roster');
  };

  const confirmAssignment = () => {
    const unit = vehicleById.get(draft.vehicleId);
    const driver = driverById.get(draft.driverId);
    if (!unit || !driver || !draft.routeId) return;
    createAssignment.mutate(
      { vehicleId: unit.id, driverId: driver.id, routeId: draft.routeId, start: draft.start.trim() },
      {
        onSuccess: (a) => {
          setDraft(emptyDraft());
          show({
            title: 'Driver assignment deployed',
            message: `${driver.name} is now on ${unit.code} (${unit.plate}), Route ${routeLabel(routes, a.routeId, a.routeCode)}, from ${formatDay(a.start)}.`,
            icon: 'how-to-reg',
          });
        },
      },
    );
  };

  const handleEnd = (a: Assignment) =>
    endAssignment.mutate(
      { assignmentId: a.id },
      {
        onSuccess: () =>
          show({
            title: 'Assignment ended',
            message: `${a.driverName} is off ${a.unitCode}; both are free for a new pairing.`,
            icon: 'sync-alt',
            tone: 'info',
          }),
        onError: (error) =>
          show({ title: 'Could not end assignment', message: error.message, icon: 'error', tone: 'danger' }),
      },
    );

  const handleToggleMaintenance = (unit: Vehicle) => {
    const toShop = unit.status !== 'maintenance';
    setStatus.mutate(
      toShop
        ? { vehicleId: unit.id, status: 'maintenance', statusNote: 'Scheduled Inspection' }
        : { vehicleId: unit.id, status: unit.driverId ? 'active' : 'standby', statusNote: null },
      {
        onSuccess: () =>
          show(
            toShop
              ? {
                  title: `${unit.code} sent to maintenance`,
                  message: unit.driverId ? 'Its driver is on shop-duty standby until the unit returns.' : undefined,
                  icon: 'build-circle',
                  tone: 'info',
                }
              : {
                  title: `${unit.code} back in service`,
                  message: 'The unit left the shop.',
                  icon: 'build',
                  tone: 'info',
                },
          ),
        onError: (error) =>
          show({ title: `Could not update ${unit.code}`, message: error.message, icon: 'error', tone: 'danger' }),
      },
    );
  };

  const giveAccess = (driver: Driver) => {
    setAccessFor(driver);
    createAccess.reset();
    createAccess.mutate(driver.id);
  };

  const turnOffAccess = (driver: Driver) =>
    revokeAccess.mutate(driver.id, {
      onSuccess: () => {
        setConfirmRevoke(undefined);
        show({
          title: `App access turned off for ${driver.name}`,
          message: 'Their phone was signed out. Give access again to issue a new code.',
          icon: 'block',
          tone: 'info',
        });
      },
      onError: (error) => {
        setConfirmRevoke(undefined);
        show({ title: 'Could not turn off access', message: error.message, icon: 'error', tone: 'danger' });
      },
    });

  const exportToast = (what: string) =>
    show({
      title: `${what} export queued`,
      message: 'CSV export is not connected yet.',
      icon: 'file-download',
      tone: 'info',
    });

  let body;
  if (fleet.isLoading) {
    body = (
      <View style={styles.empty}>
        <ActivityIndicator color={colors.primaryContainer} />
        <AppText variant="bodySm" color={colors.onSurfaceVariant}>
          Loading fleet records…
        </AppText>
      </View>
    );
  } else if (fleet.error) {
    body = (
      <Card style={styles.empty}>
        <Icon name="cloud-off" size={28} color={colors.error} />
        <AppText variant="headlineSm" bold>
          Fleet records could not be loaded
        </AppText>
        <AppText variant="bodySm" color={colors.onSurfaceVariant}>
          {fleet.error.message}
        </AppText>
        <Button label="Try again" icon="refresh" loading={fleet.isFetching} onPress={() => void fleet.refetch()} />
      </Card>
    );
  } else {
    body = (
      <>
        <FleetStatsRow
          stats={stats}
          onAssignNow={() => openAssign({ driverId: drivers.find((d) => d.status === 'available')?.id ?? '' })}
        />
        <SegmentedControl
          style={styles.tabs}
          value={tab}
          onChange={setTab}
          segments={[
            { value: 'vehicles', label: 'Vehicle Inventory', count: stats.vehicles },
            { value: 'drivers', label: 'Driver Accounts', count: stats.drivers },
            { value: 'roster', label: 'Roster & Assignments', count: stats.pairings },
          ]}
        />
        {tab === 'vehicles' ? (
          <VehicleInventory
            vehicles={visibleVehicles}
            total={vehicles.length}
            drivers={driverById}
            routes={routes}
            filters={filters}
            onFiltersChange={setFilters}
            page={page}
            onPageChange={setPage}
            wide={atLeastXl}
            pendingIds={pendingStatusIds}
            onAssign={(vehicleId) => openAssign({ vehicleId })}
            onToggleMaintenance={handleToggleMaintenance}
            onView={(v) =>
              show({
                title: `${v.code} • ${v.plate}`,
                message: `${v.make}, ${v.seats} seats. ${v.statusNote ?? 'Inactive'}.`,
                icon: 'visibility',
                tone: 'info',
              })
            }
          />
        ) : tab === 'drivers' ? (
          <DriverAccounts
            drivers={visibleDrivers}
            vehicles={vehicleById}
            total={drivers.length}
            query={driverQuery}
            onQueryChange={setDriverQuery}
            status={driverStatus}
            onStatusChange={setDriverStatus}
            wide={atLeastXl}
            onAssign={(driverId) => openAssign({ driverId })}
            onView={(d) =>
              show({
                title: `${d.name} • ${d.driverNo}`,
                message: `License ${d.licenseNo}. ${d.shares} shares (${d.shareNote}).`,
                icon: 'badge',
                tone: 'info',
              })
            }
            onExport={() => exportToast('LTFRB endorsement roster')}
            onGiveAccess={giveAccess}
            onRevokeAccess={setConfirmRevoke}
            revokingId={revokeAccess.isPending ? revokeAccess.variables : undefined}
          />
        ) : (
          <RosterAssignments
            draft={draft}
            onDraftChange={setDraft}
            units={rosterUnits}
            drivers={rosterDrivers}
            allDrivers={driverById}
            allVehicles={vehicleById}
            routes={routes}
            assignments={assignments}
            live={live}
            submitting={createAssignment.isPending}
            serverError={createAssignment.error?.message}
            onConfirm={confirmAssignment}
            endingId={endAssignment.isPending ? endAssignment.variables?.assignmentId : undefined}
            onEnd={handleEnd}
            wide={atLeastLg}
          />
        )}
      </>
    );
  }

  return (
    <View style={styles.flex}>
      <ScrollView
        contentContainerStyle={[styles.page, isPhone && styles.pagePhone]}
        keyboardShouldPersistTaps="handled">
        <FleetHeader
          canAdd={canAdd}
          onRegisterVehicle={() => {
            createVehicle.reset();
            setDialog('vehicle');
          }}
          onAddDriver={() => {
            createDriver.reset();
            setDialog('driver');
          }}
          onAssign={() => openAssign()}
          onExport={() => exportToast('Fleet records')}
        />
        {seesAll && fleet.data ? (
          <FleetAccountPicker
            owners={owners}
            value={account}
            onChange={(next) => {
              setAccount(next);
              setPage(1);
              setDraft(emptyDraft());
            }}
          />
        ) : null}
        {body}
      </ScrollView>

      {dialog === 'vehicle' ? (
        <RegisterVehicleDialog
          vehicles={vehicles}
          routes={routes}
          submitting={createVehicle.isPending}
          serverError={createVehicle.error?.message}
          onClose={() => setDialog(undefined)}
          onSave={(input) =>
            createVehicle.mutate(
              { ...input, ownerUid: ownerUid ?? undefined },
              {
                onSuccess: (v) => {
                  setDialog(undefined);
                  setFilters(NO_FILTERS);
                  setPage(1);
                  setTab('vehicles');
                  show({
                    title: 'Unit onboarded',
                    message: `${v.code} (${v.plate}) was added to the fleet.`,
                    icon: 'directions-bus',
                  });
                },
              },
            )
          }
        />
      ) : null}
      {dialog === 'driver' ? (
        <AddDriverDialog
          drivers={drivers}
          submitting={createDriver.isPending}
          serverError={createDriver.error?.message}
          onClose={() => setDialog(undefined)}
          onSave={(input) =>
            createDriver.mutate(
              { driver: input, ownerUid: ownerUid ?? undefined },
              {
                onSuccess: (d) => {
                  setDialog(undefined);
                  setDriverQuery('');
                  setDriverStatus('all');
                  setTab('drivers');
                  show({
                    title: 'Driver account created',
                    message: `${d.name} (${d.driverNo}) is available for assignment.`,
                    icon: 'person-add',
                  });
                },
              },
            )
          }
        />
      ) : null}
      {accessFor ? (
        <DriverAccessDialog
          driver={driverById.get(accessFor.id) ?? accessFor}
          activation={createAccess.data}
          loading={createAccess.isPending}
          error={createAccess.error?.message}
          onNewCode={() => giveAccess(accessFor)}
          onClose={() => {
            setAccessFor(undefined);
            createAccess.reset();
          }}
        />
      ) : null}
      {confirmRevoke ? (
        <Dialog
          visible
          title={`Turn off app access for ${confirmRevoke.name}?`}
          subtitle="Their phone is signed out right away and unused codes stop working. You can give access again later."
          onClose={() => setConfirmRevoke(undefined)}
          width={460}
          footer={
            <View style={styles.dialogFooter}>
              <Button label="Cancel" variant="ghost" onPress={() => setConfirmRevoke(undefined)} />
              <Button
                label="Turn off access"
                icon="block"
                variant="primary"
                loading={revokeAccess.isPending}
                onPress={() => turnOffAccess(confirmRevoke)}
                testID="confirm-revoke-access"
              />
            </View>
          }>
          <AppText variant="bodyMd">{confirmRevoke.driverNo}</AppText>
        </Dialog>
      ) : null}
      <Toast toast={toast} onDismiss={dismiss} />
    </View>
  );
}
