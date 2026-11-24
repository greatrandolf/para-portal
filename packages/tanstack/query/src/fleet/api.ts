import type { FunctionsClient } from '../client';
import type {
  Assignment,
  CreateAssignmentInput,
  CreateDriverInput,
  CreateVehicleInput,
  Driver,
  DriverActivation,
  EndAssignmentInput,
  Fleet,
  SetVehicleStatusInput,
  UpdateDriverInput,
  UpdateVehicleInput,
  Vehicle,
} from './types';

/** Typed wrappers around the para-backend fleet callables (admin only). */
export const fleetApi = (client: FunctionsClient) => ({
  list: (ownerUid: string | null, signal?: AbortSignal) =>
    client.call<Fleet>('fleetList', ownerUid ? { ownerUid } : {}, signal),

  createVehicle: async (input: CreateVehicleInput) =>
    (await client.call<{ vehicle: Vehicle }>('vehiclesCreate', input)).vehicle,
  updateVehicle: async (input: UpdateVehicleInput) =>
    (await client.call<{ vehicle: Vehicle }>('vehiclesUpdate', input)).vehicle,
  setVehicleStatus: async (input: SetVehicleStatusInput) =>
    (await client.call<{ vehicle: Vehicle }>('vehiclesSetStatus', input)).vehicle,
  removeVehicle: (vehicleId: string) => client.call<{ vehicleId: string }>('vehiclesDelete', { vehicleId }),

  createDriver: async (input: CreateDriverInput) =>
    (await client.call<{ driver: Driver }>('driversCreate', input)).driver,
  updateDriver: async (input: UpdateDriverInput) =>
    (await client.call<{ driver: Driver }>('driversUpdate', input)).driver,
  removeDriver: (driverId: string) => client.call<{ driverId: string }>('driversDelete', { driverId }),
  createDriverAccess: (driverId: string) => client.call<DriverActivation>('driverAccessCreate', { driverId }),
  revokeDriverAccess: (driverId: string) =>
    client.call<{ driverId: string; appAccess: string }>('driverAccessRevoke', { driverId }),

  createAssignment: async (input: CreateAssignmentInput) =>
    (await client.call<{ assignment: Assignment }>('assignmentsCreate', input)).assignment,
  endAssignment: async (input: EndAssignmentInput) =>
    (await client.call<{ assignment: Assignment }>('assignmentsEnd', input)).assignment,
});
