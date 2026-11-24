/** Fleet shapes returned by the para-backend callables (see para-backend/docs/api.md). */

export type VehicleType = 'modern' | 'traditional' | 'electric';
export type VehicleStatus = 'active' | 'standby' | 'maintenance' | 'inactive';
export type DriverStatus = 'active' | 'available' | 'standby' | 'leave';
export type AssignmentState = 'ongoing' | 'completed';
/**
 * What the driver is doing on an assignment (driver app): `ready` until the driver taps Start Tracking; live GPS only
 * while `in_service`.
 */
export type DutyStatus = 'ready' | 'in_service' | 'on_break' | 'off_duty';
/** Driver app access: never given, active on a phone, or turned off. */
export type AppAccess = 'none' | 'active' | 'disabled';

export type VehicleFields = {
  /** Unit code, e.g. "PARA-001". Unique; stored upper case. */
  code: string;
  /** LTO plate, e.g. "GMD-1782". Unique. */
  plate: string;
  type: VehicleType;
  make: string;
  seats: number;
  /** Spec line, e.g. "Euro IV Diesel • GPS Transponder #092". */
  specs: string;
};

export type Vehicle = VehicleFields & {
  id: string;
  /** uid of the fleet account the unit belongs to. */
  ownerUid: string;
  routeId: string | null;
  /** Route code when the route was set (display fallback). */
  routeCode: string | null;
  status: VehicleStatus;
  statusNote: string | null;
  /** Driver document id while paired. */
  driverId: string | null;
  updatedAt: string | null;
};

export type DriverFields = {
  name: string;
  tenure: string;
  phone: string;
  licenseNo: string;
  /** "YYYY-MM": last month the license is valid. */
  licenseExpiry: string;
  shares?: number;
  shareNote: string;
  /** GCash number for payouts; empty means the phone number. */
  gcash?: string;
};

export type Driver = Required<DriverFields> & {
  id: string;
  ownerUid: string;
  /** Cooperative number, e.g. "DRV-0042". */
  driverNo: string;
  status: DriverStatus;
  vehicleId: string | null;
  appAccess: AppAccess;
  /** The license expires within 60 days. */
  licenseRenewalSoon: boolean;
  updatedAt: string | null;
};

export type Assignment = {
  id: string;
  ownerUid: string;
  vehicleId: string;
  unitCode: string;
  plate: string;
  driverId: string;
  driverNo: string;
  driverName: string;
  routeId: string;
  routeCode: string;
  /** "YYYY-MM-DD" */
  start: string;
  end: string | null;
  note: string;
  state: AssignmentState;
  /** Live from the driver app (Stop / Resume Tracking, End Shift). */
  dutyStatus: DutyStatus;
  /** Who ended it: the driver (End Shift) or the fleet; null while ongoing or for older records. */
  endedBy: 'driver' | 'fleet' | null;
  createdAt: string | null;
};

/** A fleet account (team member with the Fleet role). */
export type FleetOwner = { uid: string; name: string; email: string; status: 'active' | 'disabled' };

export type Fleet = {
  vehicles: Vehicle[];
  drivers: Driver[];
  assignments: Assignment[];
  /** Fleet accounts; only filled for admins (fleet users see just their own records). */
  owners: FleetOwner[];
};

/* ---------- mutation inputs ---------- */

export type CreateVehicleInput = {
  vehicle: VehicleFields;
  /** Required for admins: the fleet account that owns the unit. Fleet users always own what they add. */
  ownerUid?: string;
  routeId?: string | null;
  status?: 'standby' | 'inactive';
  statusNote?: string | null;
};

export type UpdateVehicleInput = { vehicleId: string; patch?: Partial<VehicleFields>; routeId?: string | null };

export type SetVehicleStatusInput = { vehicleId: string; status: VehicleStatus; statusNote?: string | null };

export type CreateDriverInput = { driver: DriverFields; ownerUid?: string };

export type UpdateDriverInput = { driverId: string; patch?: Partial<DriverFields>; status?: 'available' | 'leave' };

export type CreateAssignmentInput = {
  vehicleId: string;
  driverId: string;
  routeId: string;
  /** "YYYY-MM-DD"; defaults to today on the server. */
  start?: string;
  note?: string;
};

/** A one-time driver app activation code. Shown once as a QR code; it works once and expires. */
export type DriverActivation = {
  code: string;
  /** The QR code's content: `para://activate?code=…`, which opens the driver app. */
  link: string;
  expiresAt: string;
  driverName: string;
  driverNo: string;
};

export type EndAssignmentInput = { assignmentId: string; end?: string };
