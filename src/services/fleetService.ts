import type {
  Driver,
  DriverFields,
  DriverStatus,
  Vehicle,
  VehicleFields,
  VehicleStatus,
  VehicleType,
} from '@/types/fleet';
import type { RouteSummary } from '@/types/route';

/** Display helpers, filters, and form checks for Fleet & Asset Management. Data comes from the fleet API. */

export const PAGE_SIZE = 6;

export const VEHICLE_TYPE_LABEL: Record<VehicleType, string> = {
  modern: 'Modern PUV',
  traditional: 'Traditional',
  electric: 'Electric PUV',
};

export const VEHICLE_STATUS_LABEL: Record<VehicleStatus, string> = {
  active: 'Active Service',
  standby: 'Standby',
  maintenance: 'Maintenance',
  inactive: 'Inactive',
};

export const DRIVER_STATUS_LABEL: Record<DriverStatus, string> = {
  active: 'Active Dispatch',
  available: 'Available for Assignment',
  standby: 'Standby (Shop Duty)',
  leave: 'On Scheduled Leave',
};

/* ---------- routes ---------- */

export type RouteInfo = { id: string; code: string; name: string; km: number; stops: number };

export function toRouteInfo(routes: readonly RouteSummary[] | undefined): Map<string, RouteInfo> {
  return new Map(
    (routes ?? []).map((r) => [
      r.id,
      {
        id: r.id,
        code: r.code,
        name: r.name,
        km: r.roundtripKm,
        stops: r.directions.outbound.stops + r.directions.inbound.stops,
      },
    ]),
  );
}

/** "17B • IT Park ⇄ Carbon", falling back to the stored code if the route is gone. */
export function routeLabel(routes: ReadonlyMap<string, RouteInfo>, routeId: string | null, routeCode?: string | null) {
  if (!routeId) return 'Unassigned';
  const route = routes.get(routeId);
  return route ? `${route.code} • ${route.name}` : (routeCode ?? 'Unknown route');
}

/* ---------- dates ---------- */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-11-09" -> "Nov 09, 2026". */
export function formatDay(day: string | null | undefined) {
  if (!day) return 'Present';
  const [y, m, d] = day.split('-');
  return `${MONTHS[Number(m) - 1] ?? m} ${d}, ${y}`;
}

/** "2028-11" -> "Nov 2028". */
export function formatMonth(month: string) {
  const [y, m] = month.split('-');
  return `${MONTHS[Number(m) - 1] ?? m} ${y}`;
}

/** Today in local time, as "YYYY-MM-DD". */
export function todayIso() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export const isIsoDay = (value: string) => /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(value.trim());

export function licenseNote(driver: Driver) {
  return driver.licenseRenewalSoon
    ? `Renewal due • ${formatMonth(driver.licenseExpiry)}`
    : `Valid till ${formatMonth(driver.licenseExpiry)}`;
}

/* ---------- stats, filters, paging ---------- */

export type FleetStats = {
  vehicles: number;
  byType: Record<VehicleType, number>;
  maintenance: number;
  drivers: number;
  driversActive: number;
  driversOnLeave: number;
  pairings: number;
  /** Paired units over units in service, in percent. */
  efficiency: number;
  standbyDrivers: number;
};

export function getFleetStats(vehicles: readonly Vehicle[], drivers: readonly Driver[]): FleetStats {
  const byType: Record<VehicleType, number> = { modern: 0, traditional: 0, electric: 0 };
  vehicles.forEach((v) => (byType[v.type] += 1));
  const pairings = vehicles.filter((v) => v.status === 'active' && v.driverId).length;
  const inService = vehicles.filter((v) => v.status === 'active' || v.status === 'standby').length;
  return {
    vehicles: vehicles.length,
    byType,
    maintenance: vehicles.filter((v) => v.status === 'maintenance').length,
    drivers: drivers.length,
    driversActive: drivers.filter((d) => d.status === 'active').length,
    driversOnLeave: drivers.filter((d) => d.status === 'leave').length,
    pairings,
    efficiency: inService ? Math.round((pairings / inService) * 1000) / 10 : 0,
    standbyDrivers: drivers.filter((d) => d.status === 'available').length,
  };
}

export type VehicleFilters = {
  query: string;
  type: VehicleType | 'all';
  /** Route id, or 'all'. */
  route: string;
  status: VehicleStatus | 'all';
};

/** Search matches the unit code or plate; filters match exactly. */
export function filterVehicles(vehicles: readonly Vehicle[], f: VehicleFilters): Vehicle[] {
  const q = f.query.trim().toLowerCase();
  return vehicles.filter(
    (v) =>
      (f.type === 'all' || v.type === f.type) &&
      (f.route === 'all' || v.routeId === f.route) &&
      (f.status === 'all' || v.status === f.status) &&
      (!q || v.code.toLowerCase().includes(q) || v.plate.toLowerCase().includes(q)),
  );
}

export function filterDrivers(drivers: readonly Driver[], query: string, status: DriverStatus | 'all'): Driver[] {
  const q = query.trim().toLowerCase();
  return drivers.filter(
    (d) =>
      (status === 'all' || d.status === status) &&
      (!q || d.name.toLowerCase().includes(q) || d.driverNo.toLowerCase().includes(q) || d.phone.includes(q)),
  );
}

export function paginate<T>(items: readonly T[], page: number, size = PAGE_SIZE) {
  const pages = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(Math.max(1, page), pages);
  return { items: items.slice((current - 1) * size, current * size), page: current, pages };
}

/** Units that can take a driver: not in the shop or retired. */
export const assignableVehicles = (vehicles: readonly Vehicle[]) =>
  vehicles.filter((v) => v.status === 'active' || v.status === 'standby');

/** Drivers that can drive: not on leave. */
export const assignableDrivers = (drivers: readonly Driver[]) => drivers.filter((d) => d.status !== 'leave');

/* ---------- form checks (the server checks again) ---------- */

const same = (a: string, b: string) => a.trim().toUpperCase() === b.trim().toUpperCase();
const samePlate = (a: string, b: string) => same(a.replace('-', ''), b.replace('-', ''));

export function validateVehicle(
  input: VehicleFields,
  vehicles: readonly Vehicle[],
): Partial<Record<keyof VehicleFields, string>> {
  const errors: Partial<Record<keyof VehicleFields, string>> = {};
  if (!input.code.trim()) errors.code = 'Enter the unit code.';
  else if (!/^[A-Za-z0-9-]+$/.test(input.code.trim())) errors.code = 'Use letters, digits, and dashes only.';
  else if (vehicles.some((v) => same(v.code, input.code))) errors.code = `${input.code.trim()} is already registered.`;
  if (!input.plate.trim()) errors.plate = 'Enter the LTO plate number.';
  else if (!/^[A-Z]{3}-?\d{3,4}$/i.test(input.plate.trim())) errors.plate = 'Use the LTO format, e.g. GMD-1782.';
  else if (vehicles.some((v) => samePlate(v.plate, input.plate))) errors.plate = 'This plate is already registered.';
  if (!input.make.trim()) errors.make = 'Enter the make and model.';
  if (!input.specs.trim()) errors.specs = 'Enter the key specs, e.g. Euro IV Diesel.';
  if (!Number.isInteger(input.seats) || input.seats < 8 || input.seats > 40) errors.seats = 'Seats must be 8 to 40.';
  return errors;
}

export function validateDriver(
  input: DriverFields,
  drivers: readonly Driver[],
): Partial<Record<keyof DriverFields, string>> {
  const errors: Partial<Record<keyof DriverFields, string>> = {};
  if (!input.name.trim()) errors.name = 'Enter the operator’s full name.';
  if (!/^09\d{2}-?\d{3}-?\d{4}$/.test(input.phone.trim())) errors.phone = 'Use a PH mobile number, e.g. 0917-552-8901.';
  if (!input.licenseNo.trim()) errors.licenseNo = 'Enter the LTO professional license number.';
  else if (!/^[A-Za-z0-9-]+$/.test(input.licenseNo.trim())) errors.licenseNo = 'Use letters, digits, and dashes only.';
  else if (drivers.some((d) => same(d.licenseNo, input.licenseNo)))
    errors.licenseNo = 'This license is already on file.';
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(input.licenseExpiry.trim())) errors.licenseExpiry = 'Use YYYY-MM, e.g. 2029-10.';
  if (input.gcash?.trim() && !/^09\d{2}-?\d{3}-?\d{4}$/.test(input.gcash.trim()))
    errors.gcash = 'Use a PH mobile number, e.g. 0917-552-8901, or leave it empty.';
  return errors;
}
